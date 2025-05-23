// src/hooks/systems/useHuntingSystem.ts

import { useCallback } from 'react';
import { GameState } from '../../types';
import { habitats } from '../../utils/terrain';
import { perkDefinitions } from '../../utils/gameData';
import { weatherEffects } from '../../utils/weather';

export const useHuntingSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    growthSystem: any, // Growth system dependency
    injurySystem?: any, // Injury system dependency (we'll add this later)
    uiSystem?: any // UI system dependency
) => {

    // Calculate hunting success chance
    const calculateHuntingSuccess = useCallback((creature: any) => {
        const creatureInfo = creature.info;
        const hexKey = `${gameState.playerPosition.q},${gameState.playerPosition.r}`;
        const terrainType = gameState.map[hexKey]?.type || 'plains';
        const habitat = habitats[terrainType];

        // Base success chance from dinosaur species
        let baseChance = 0.5;
        const selectedDinosaur = gameState.selectedDinosaur;
        if (selectedDinosaur?.baseStats?.hunting) {
            baseChance = selectedDinosaur.baseStats.hunting / 10;
        }

        // Adjust for creature difficulty
        const creatureDifficulty = (creatureInfo.agility + creatureInfo.fierceness) / 200;
        baseChance -= creatureDifficulty;

        // Size advantage/disadvantage
        const playerSize = growthSystem.getStageCapabilities().canHuntSize;
        const sizeAdvantage = playerSize - creatureInfo.size;
        baseChance += sizeAdvantage * 0.15;

        // Terrain hunting modifier
        baseChance *= habitat?.huntingModifier || 1.0;

        // Energy level affects hunting (tired hunters are less effective)
        const energyFactor = gameState.energy / 100;
        baseChance *= energyFactor;

        // Hunger desperation bonus
        const hungerFactor = 1 + ((100 - gameState.hunger) / 200);
        baseChance *= hungerFactor;

        // Stealth level bonus
        baseChance += (gameState.stealthLevel || 0) / 200;

        // Weather effects
        const currentWeather = weatherEffects[gameState.weather];
        if (gameState.weather === 'rainy') {
            baseChance *= 0.85; // Rain makes hunting harder
        } else if (gameState.weather === 'cloudy') {
            baseChance *= 1.1; // Cloudy weather helps hide predator
        }

        // Time of day effects
        if (gameState.timeOfDay === 'night') {
            const hasNightVision = gameState.perks.includes('night_vision');
            baseChance *= hasNightVision ? 1.2 : 0.7;
        }

        // Apply perk effects
        gameState.perks.forEach(perk => {
            const effect = perkDefinitions[perk]?.effect();
            if (!effect) return;

            // Ambush bonus in good cover
            if (effect.ambushBonus && (habitat?.ambushValue || 0) > 0.5) {
                baseChance += effect.ambushBonus;
            }

            // Water hunting bonus for aquatic prey
            if (effect.waterHunting &&
                ['lake', 'riverbank', 'marsh'].includes(terrainType) &&
                creatureInfo.category === 'aquatic') {
                baseChance += effect.waterHunting;
            }

            // Pack hunting bonus (random chance activation)
            if (effect.packHunting && Math.random() < effect.packHunting) {
                baseChance += 0.3;
                addHuntingEvent("Another Allosaurus joined your hunt!", "positive");
            }
        });

        // Apply injury penalties
        gameState.injuries.forEach(injury => {
            if (injury.effect.huntingPenalty) {
                baseChance *= (1 - injury.effect.huntingPenalty);
            }
        });

        // Ensure chance stays within reasonable bounds
        return Math.min(0.95, Math.max(0.05, baseChance));
    }, [gameState, growthSystem]);

    // Stealth approach mechanics
    const approachStealthily = useCallback((creatureId: string) => {
        const hexKey = `${gameState.playerPosition.q},${gameState.playerPosition.r}`;
        const creature = gameState.map[hexKey]?.creatures.find(c => c.id === creatureId);
        if (!creature) return 0;

        const terrainType = gameState.map[hexKey]?.type || 'plains';
        const habitat = habitats[terrainType];

        // Base stealth from terrain
        let stealthBase = (habitat?.ambushValue || 0) * 50;

        // Size affects stealth (smaller = stealthier)
        const capabilities = growthSystem.getStageCapabilities();
        stealthBase += Math.max(0, (4 - gameState.growthStage) * 10);

        // Time of day affects stealth
        if (gameState.timeOfDay === 'night') {
            stealthBase += 20;
        }

        // Weather affects stealth
        if (gameState.weather === 'rainy') {
            stealthBase += 10; // Rain masks sound
        } else if (gameState.weather === 'cloudy') {
            stealthBase += 5; // Overcast helps hide
        }

        // Apply stealth perks
        gameState.perks.forEach(perk => {
            const effect = perkDefinitions[perk]?.effect();
            if (effect?.ambushBonus) {
                stealthBase += 15;
            }
        });

        // Random factor
        const stealthRoll = Math.random() * 30;
        const finalStealth = Math.min(100, Math.max(0, stealthBase + stealthRoll));

        // Use energy for stalking
        setGameState(prev => ({
            ...prev,
            stealthLevel: finalStealth,
            energy: Math.max(0, prev.energy - 10)
        }));

        // Show stealth message
        let message = "You move quietly, trying not to alert your prey.";
        if (finalStealth > 70) {
            message = "You approach silently, the prey doesn't notice you...";
        } else if (finalStealth < 40) {
            message = "The prey seems alert to your presence!";
        }

        setHuntingMessage(message);
        return finalStealth;
    }, [gameState, growthSystem, setGameState]);

    // Main hunting function
    const hunt = useCallback((attemptHunt: boolean) => {
        const creature = gameState.selectedCreature;
        if (!creature) return;

        // Clear creature selection
        setGameState(prev => ({ ...prev, selectedCreature: null }));

        if (!attemptHunt) {
            setHuntingMessage(`You decided not to hunt the ${creature.info.name}.`);
            return;
        }

        // Calculate success
        const successChance = calculateHuntingSuccess(creature);
        const huntSuccessful = Math.random() < successChance;

        if (huntSuccessful) {
            handleSuccessfulHunt(creature, successChance);
        } else {
            handleFailedHunt(creature, successChance);
        }

        // Remove creature from map (it either died or fled)
        removeCreatureFromMap(creature);

        // Reset stealth level
        setGameState(prev => ({ ...prev, stealthLevel: 0 }));

    }, [gameState.selectedCreature, calculateHuntingSuccess, setGameState]);

    // Handle successful hunt
    const handleSuccessfulHunt = useCallback((creature: any, successChance: number) => {
        const creatureInfo = creature.info;

        // Calculate nutrition value with perk bonuses
        let nutritionValue = creatureInfo.nutrition;

        gameState.perks.forEach(perk => {
            const effect = perkDefinitions[perk]?.effect();
            if (effect?.nutritionBonus) {
                nutritionValue *= (1 + effect.nutritionBonus);
            }
        });

        // Update hunger and score
        setGameState(prev => ({
            ...prev,
            hunger: Math.min(100, prev.hunger + nutritionValue),
            score: prev.score + (nutritionValue * 2)
        }));

        // Add weight through growth system (this automatically checks for growth!)
        const newWeight = growthSystem.addWeight(nutritionValue);

        // Show success message
        setHuntingMessage(
            `You successfully caught the ${creatureInfo.name}! +${Math.floor(nutritionValue)} nutrition`
        );

        // Add to health events
        addHuntingEvent(
            `You successfully hunted a ${creatureInfo.name} and gained nutrition.`,
            "positive"
        );

        // Chance for hunting experience (could award perks or skills)
        if (Math.random() < 0.1) {
            addHuntingEvent("Your hunting skills have improved!", "positive");
            // Could add hunting experience points here
        }

        // Schedule creature respawn
        setTimeout(() => {
            spawnReplacementCreature(creature.type);
        }, 5000);

    }, [gameState.perks, growthSystem, setGameState]);

    // Handle failed hunt
    const handleFailedHunt = useCallback((creature: any, successChance: number) => {
        const creatureInfo = creature.info;

        // Energy cost for failed hunt
        const energyCost = 15 + (creatureInfo.fierceness / 10);

        setGameState(prev => ({
            ...prev,
            energy: Math.max(0, prev.energy - energyCost)
        }));

        // Show failure message
        setHuntingMessage(
            `The ${creatureInfo.name} escaped! You lost ${Math.floor(energyCost)} energy from the exertion.`
        );

        // Add to health events
        addHuntingEvent(
            `You attempted to hunt a ${creatureInfo.name} but it escaped.`,
            "neutral"
        );

        // Chance of injury from failed hunt (especially with dangerous prey)
        const injuryChance = Math.max(0.05, (creatureInfo.fierceness / 200) - (successChance / 2));

        if (Math.random() < injuryChance) {
            // Apply minor injury
            if (injurySystem?.addInjury) {
                const possibleInjuries = ['sprained_claw', 'minor_cut'];
                const injury = possibleInjuries[Math.floor(Math.random() * possibleInjuries.length)];
                injurySystem.addInjury(injury);
            }

            addHuntingEvent("You were injured during the failed hunt attempt.", "negative");
        }

        // Creature becomes more wary (affects future hunts)
        // Could implement creature memory system here

    }, [gameState, setGameState, injurySystem]);

    // Remove creature from map after hunt
    const removeCreatureFromMap = useCallback((creature: any) => {
        const hexKey = `${gameState.playerPosition.q},${gameState.playerPosition.r}`;
        const newMap = { ...gameState.map };

        if (newMap[hexKey]) {
            const creatureIndex = newMap[hexKey].creatures.findIndex(c => c.id === creature.id);
            if (creatureIndex !== -1) {
                newMap[hexKey].creatures.splice(creatureIndex, 1);
                setGameState(prev => ({ ...prev, map: newMap }));
            }
        }
    }, [gameState.map, gameState.playerPosition, setGameState]);

    // Spawn replacement creature elsewhere
    const spawnReplacementCreature = useCallback((creatureType: string) => {
        // This would typically call the creature system
        console.log(`Spawning replacement ${creatureType} elsewhere on map`);
        // creatureSystem?.spawnCreature(creatureType);
    }, []);

    // Get hunting difficulty description for UI
    const getHuntingDifficulty = useCallback((creature: any) => {
        const successChance = calculateHuntingSuccess(creature);

        if (successChance >= 0.8) return { level: "Very Easy", color: "text-green-400" };
        if (successChance >= 0.6) return { level: "Easy", color: "text-green-300" };
        if (successChance >= 0.4) return { level: "Moderate", color: "text-yellow-400" };
        if (successChance >= 0.2) return { level: "Hard", color: "text-orange-400" };
        return { level: "Very Hard", color: "text-red-400" };
    }, [calculateHuntingSuccess]);

    // Utility functions
    const setHuntingMessage = useCallback((message: string) => {
        setGameState(prev => ({ ...prev, currentMessage: message }));
    }, [setGameState]);

    const addHuntingEvent = useCallback((message: string, type: 'positive' | 'negative' | 'neutral') => {
        const newEvent = {
            message,
            type,
            turn: gameState.turnCount,
            timestamp: Date.now()
        };

        setGameState(prev => ({
            ...prev,
            healthEvents: [newEvent, ...prev.healthEvents]
        }));
    }, [gameState.turnCount, setGameState]);

    // Check if player can hunt a specific creature
    const canHuntCreature = useCallback((creature: any) => {
        const creatureInfo = creature.info;
        const capabilities = growthSystem.getStageCapabilities();

        return {
            canHunt: creatureInfo.minGrowthToHunt <= gameState.growthStage,
            tooSmall: creatureInfo.minGrowthToHunt > gameState.growthStage,
            reason: creatureInfo.minGrowthToHunt > gameState.growthStage
                ? `You need to reach ${growthSystem.getGrowthStages()[creatureInfo.minGrowthToHunt - 1]?.name || 'larger size'} to hunt this creature`
                : null
        };
    }, [gameState.growthStage, growthSystem]);

    // Return hunting system API
    return {
        // Core hunting functions
        hunt,
        calculateHuntingSuccess,
        approachStealthily,

        // Utility functions
        canHuntCreature,
        getHuntingDifficulty,

        // For other systems
        handleSuccessfulHunt,
        handleFailedHunt,
    };
};