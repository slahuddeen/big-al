// hooks/systems/useCreatureSystem.ts
import { useCallback } from 'react';
import { GameState, HexCoord, Creature } from '../../types';
import { creatureTypes } from '../../utils/creatures';
import { hexDistance } from '../../utils/hexGrid';
import { handlePredatorEncounter, PredatorEncounterContext } from '../../utils/predatorDanger';

export const useCreatureSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    mapSystem: any // We'll type this properly later
) => {

    // Place a specific creature type in suitable habitat
    const placeCreatureInHabitat = useCallback((type: string, count: number = 1) => {
        const creatureInfo = creatureTypes[type];
        if (!creatureInfo) return;

        const map = { ...gameState.map };
        const suitableHabitats = creatureInfo.habitat;

        for (let i = 0; i < count; i++) {
            const suitableHexes = Object.values(map).filter(hex =>
                suitableHabitats.includes(hex.type) &&
                hex.type !== 'nest' &&
                hexDistance(0, 0, hex.q, hex.r) > 2 // Not too close to nest
            );

            if (suitableHexes.length > 0) {
                const randomHex = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];
                const key = `${randomHex.q},${randomHex.r}`;

                map[key].creatures.push({
                    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    type
                });
            }
        }

        mapSystem.updateMap(map);
    }, [gameState.map, mapSystem]);

    // Place all creatures with realistic distribution
    const placeAllCreatures = useCallback(() => {
        const map = { ...gameState.map };

        // Place mother at nest
        const nestKey = `0,0`;
        map[nestKey].creatures.push({
            id: 'mother',
            type: 'mothersaur'
        });

        // Creature spawn configurations
        const creatureSpawns = [
            // Tiny creatures (hatchling food)
            { type: 'centipede', count: 8 },
            { type: 'lizard', count: 10 },
            { type: 'dragonfly', count: 8 },
            { type: 'dino_eggs', count: 5 },
            { type: 'mammal', count: 6 },

            // Small dinosaurs (juvenile food)
            { type: 'dryosaurus', count: 6 },
            { type: 'ornitholestes', count: 4 },
            { type: 'compsognathus', count: 5 },
            { type: 'pterosaur', count: 3 },

            // Medium creatures
            { type: 'crocodilian', count: 3 },

            // Large creatures (adult food and threats)
            { type: 'stegosaurus', count: 3 },
            { type: 'diplodocus', count: 2 },
            { type: 'brachiosaurus', count: 1 },
            { type: 'allosaurus', count: 2 },
            { type: 'ceratosaurus', count: 2 },

            // Aquatic creatures
            { type: 'fish', count: 12 }
        ];

        // Place each creature type
        creatureSpawns.forEach(({ type, count }) => {
            const creatureInfo = creatureTypes[type];
            if (!creatureInfo) return;

            const suitableHabitats = creatureInfo.habitat;

            for (let i = 0; i < count; i++) {
                const suitableHexes = Object.values(map).filter(hex =>
                    suitableHabitats.includes(hex.type) &&
                    hex.type !== 'nest' &&
                    hexDistance(0, 0, hex.q, hex.r) > 2
                );

                if (suitableHexes.length > 0) {
                    const randomHex = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];
                    const key = `${randomHex.q},${randomHex.r}`;

                    map[key].creatures.push({
                        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        type
                    });
                }
            }
        });

        mapSystem.updateMap(map);
    }, [gameState.map, mapSystem]);

    // Handle creature encounters when player moves
    const handleEncounters = useCallback((position: HexCoord) => {
        const key = `${position.q},${position.r}`;
        const hex = gameState.map[key];

        if (!hex || hex.creatures.length === 0) return;

        const creature = hex.creatures[0];
        const creatureInfo = creatureTypes[creature.type];
        if (!creatureInfo) return;

        const map = { ...gameState.map };

        // Handle different types of encounters
        if (creature.type === 'mothersaur') {
            // Mother provides protection and healing
            setGameState(prev => ({
                ...prev,
                fitness: Math.min(100, prev.fitness + 5)
            }));

            addHealthEvent("Your mother's presence helped you recover some strength.", "positive");

        } else if (creatureInfo.nutrition > 0 && creatureInfo.minGrowthToHunt <= gameState.growthStage) {
            // Potential prey - show hunting interface
            setGameState(prev => ({
                ...prev,
                selectedCreature: { ...creature, info: creatureInfo }
            }));
            // UI system will handle showing creature details

        } else if (creatureInfo.nutrition > 0 && creatureInfo.minGrowthToHunt > gameState.growthStage) {
            // Too small to hunt
            setMessage(`You spotted a ${creatureInfo.name} but you're too small to hunt it. You need to grow larger!`);

        } else if (creatureInfo.dangerLevel >= 3 && gameState.growthStage < creatureInfo.maxGrowthToHide) {
            // Dangerous predator encounter
            const isMotherNearby = hexDistance(
                position.q, position.r,
                gameState.motherPosition.q, gameState.motherPosition.r
            ) <= 1;

            const encounterContext: PredatorEncounterContext = {
                creatureInfo,
                creatureId: creature.id,
                creatureType: creature.type,
                playerGrowthStage: gameState.growthStage,
                playerFitness: gameState.fitness,
                playerEnergy: gameState.energy,
                playerPerks: gameState.perks,
                isMotherNearby,
                terrainType: hex.type,
                map,
                hexKey: key,
                timeOfDay: gameState.timeOfDay,
                weather: gameState.weather
            };

            const result = handlePredatorEncounter(encounterContext);

            // Apply encounter results
            if (result.damage > 0) {
                setGameState(prev => ({
                    ...prev,
                    fitness: Math.max(0, prev.fitness - result.damage)
                }));
            }

            setMessage(result.message);

            if (result.injuryType) {
                // Injury system will handle this
            }

            addHealthEvent(result.healthEventMessage, result.healthEventType);

            if (result.removeCreature) {
                const creatureIndex = map[key].creatures.findIndex(c => c.id === creature.id);
                if (creatureIndex !== -1) {
                    map[key].creatures.splice(creatureIndex, 1);
                    // Relocate creature elsewhere
                    spawnCreature(creature.type);
                }
            }

            if (result.gameOver) {
                setGameState(prev => ({ ...prev, gameOver: true }));
            }

            mapSystem.updateMap(map);
        }
    }, [gameState, mapSystem, setGameState]);

    // Spawn a new creature of given type somewhere suitable
    const spawnCreature = useCallback((type: string) => {
        const creatureInfo = creatureTypes[type];
        if (!creatureInfo) return;

        const map = { ...gameState.map };
        const suitableHabitats = creatureInfo.habitat;

        // Find suitable locations far from player
        const suitableHexes = Object.entries(map).filter(([hexKey, hex]) => {
            if (!suitableHabitats.includes(hex.type)) return false;
            const [q, r] = hexKey.split(',').map(Number);
            return hexDistance(gameState.playerPosition.q, gameState.playerPosition.r, q, r) > 5;
        });

        if (suitableHexes.length > 0) {
            const [randomKey] = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];

            map[randomKey].creatures.push({
                id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type
            });

            mapSystem.updateMap(map);
        }
    }, [gameState.map, gameState.playerPosition, mapSystem]);

    // Move mother toward player (for protection of hatchlings)
    const moveMotherTowardPlayer = useCallback(() => {
        const distanceToPlayer = hexDistance(
            gameState.motherPosition.q, gameState.motherPosition.r,
            gameState.playerPosition.q, gameState.playerPosition.r
        );

        if (distanceToPlayer <= 1) return; // Already close enough

        const map = { ...gameState.map };
        // Implementation of mother movement logic...
        // (This would include pathfinding toward player)

        mapSystem.updateMap(map);
    }, [gameState.motherPosition, gameState.playerPosition, gameState.map, mapSystem]);

    // Remove mother when player becomes juvenile
    const removeMotherFromMap = useCallback(() => {
        const map = { ...gameState.map };

        Object.entries(map).forEach(([key, hex]) => {
            const motherIndex = hex.creatures.findIndex(c => c.type === 'mothersaur');
            if (motherIndex !== -1) {
                hex.creatures.splice(motherIndex, 1);
            }
        });

        mapSystem.updateMap(map);
        setMessage("Your mother has left. You are now on your own as a juvenile Allosaurus.");
        addHealthEvent("Your mother has left you to fend for yourself as you're now a juvenile.", "neutral");
    }, [gameState.map, mapSystem]);

    // Get creatures at specific position
    const getCreaturesAt = useCallback((position: HexCoord): Creature[] => {
        const key = `${position.q},${position.r}`;
        return gameState.map[key]?.creatures || [];
    }, [gameState.map]);

    // Helper functions (these would typically be imported from UI system)
    const setMessage = (message: string) => {
        // This would call the UI system
        console.log(message);
    };

    const addHealthEvent = (message: string, type: 'positive' | 'negative' | 'neutral') => {
        // This would call the health event system
        console.log(`Health event: ${message} (${type})`);
    };

    return {
        // Placement functions
        placeAllCreatures,
        placeCreatureInHabitat,
        spawnCreature,

        // Encounter functions
        handleEncounters,

        // Mother functions
        moveMotherTowardPlayer,
        removeMotherFromMap,

        // Query functions
        getCreaturesAt,
    };
};