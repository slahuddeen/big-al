// src/hooks/systems/useGrowthSystem.ts

import { useCallback } from 'react';
import { GameState } from '../../types';
import { growthStages } from '../../utils/gameData';

export const useGrowthSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    creatureSystem?: any // We'll add this dependency later
) => {

    // Check if player has reached a new growth stage
    const checkGrowthStage = useCallback((currentWeight?: number) => {
        const weightToCheck = currentWeight || gameState.weight;

        // Check each growth stage from highest to lowest
        for (let i = growthStages.length - 1; i >= 0; i--) {
            const stage = growthStages[i];
            const newStage = i + 1;

            // If we've reached this weight requirement and it's higher than current stage
            if (weightToCheck >= stage.weightRequired && newStage > gameState.growthStage) {
                handleGrowthTransition(newStage, stage);
                break;
            }
        }
    }, [gameState.weight, gameState.growthStage]);

    // Handle the actual growth transition
    const handleGrowthTransition = useCallback((newStage: number, stageInfo: any) => {
        console.log(`🦕 Growing to stage ${newStage}: ${stageInfo.name}`);

        // Update growth stage
        setGameState(prev => ({
            ...prev,
            growthStage: newStage,
            score: prev.score + 100, // Growth bonus score
            availablePerks: prev.availablePerks + 1 // Award a perk point
        }));

        // Special transitions
        handleSpecialGrowthEvents(newStage, stageInfo);

        // Add growth event to health log
        addGrowthEvent(`You've grown to the ${stageInfo.name} stage!`, "positive");

        // Show growth message
        showGrowthMessage(newStage, stageInfo);

    }, [setGameState]);

    // Handle special events that happen at certain growth stages
    const handleSpecialGrowthEvents = useCallback((newStage: number, stageInfo: any) => {
        // Becoming juvenile (stage 2) - mother leaves
        if (newStage === 2 && gameState.growthStage === 1) {
            setTimeout(() => {
                if (creatureSystem?.removeMotherFromMap) {
                    creatureSystem.removeMotherFromMap();
                }
                showGrowthMessage(newStage, stageInfo, "Your mother has left you to fend for yourself.");
            }, 2000); // Delay mother leaving message
        }

        // Becoming subadult (stage 3) - can claim territory
        if (newStage === 3) {
            addGrowthEvent("You're now large enough to claim territory!", "positive");
        }

        // Becoming adult (stage 4) - full grown
        if (newStage === 4) {
            addGrowthEvent("You've reached full maturity as an apex predator!", "positive");
        }
    }, [gameState.growthStage, creatureSystem]);

    // Add weight (from eating, hunting success)
    const addWeight = useCallback((amount: number) => {
        const newWeight = Math.min(1000, gameState.weight + amount); // Cap at 1000

        setGameState(prev => ({
            ...prev,
            weight: newWeight
        }));

        // Check if this weight gain triggered a growth stage change
        checkGrowthStage(newWeight);

        return newWeight;
    }, [gameState.weight, checkGrowthStage, setGameState]);

    // Get current growth stage info
    const getCurrentStageInfo = useCallback(() => {
        return growthStages[gameState.growthStage - 1] || growthStages[0];
    }, [gameState.growthStage]);

    // Get next growth stage info (for progress bars)
    const getNextStageInfo = useCallback(() => {
        return growthStages[gameState.growthStage] || null;
    }, [gameState.growthStage]);

    // Calculate growth progress as percentage
    const getGrowthProgress = useCallback(() => {
        const currentStage = getCurrentStageInfo();
        const nextStage = getNextStageInfo();

        if (!nextStage) {
            return 100; // Fully grown
        }

        const progress = (gameState.weight / nextStage.weightRequired) * 100;
        return Math.min(100, Math.max(0, progress));
    }, [gameState.weight, getCurrentStageInfo, getNextStageInfo]);

    // Get growth stage capabilities
    const getStageCapabilities = useCallback((stage?: number) => {
        const checkStage = stage || gameState.growthStage;

        return {
            canHuntSize: Math.floor(checkStage / 2) + 1, // What size creatures can hunt
            canClaimTerritory: checkStage >= 3,
            hasMotherProtection: checkStage === 1,
            maxMovement: 15 + (checkStage * 5), // Movement range increases with size
            stealthPenalty: checkStage * 0.1, // Larger = less stealthy
            intimidationBonus: checkStage * 0.2, // Larger = more intimidating
        };
    }, [gameState.growthStage]);

    // Check if player can hunt a specific creature size
    const canHuntCreatureSize = useCallback((creatureSize: number) => {
        const capabilities = getStageCapabilities();
        return capabilities.canHuntSize >= creatureSize;
    }, [getStageCapabilities]);

    // Get size description for UI
    const getSizeDescription = useCallback(() => {
        const stage = getCurrentStageInfo();
        const capabilities = getStageCapabilities();

        return {
            name: stage.name,
            description: stage.description,
            length: `${2 + gameState.growthStage * 2} meters`, // Rough length estimate
            weight: `${gameState.weight} kg`,
            capabilities: capabilities
        };
    }, [getCurrentStageInfo, getStageCapabilities, gameState.growthStage, gameState.weight]);

    // Helper functions for other systems
    const showGrowthMessage = useCallback((stage: number, stageInfo: any, customMessage?: string) => {
        const message = customMessage ||
            `You have grown into a ${stageInfo.name}! ${stageInfo.description}`;

        // This would typically call the UI system
        console.log(`📢 Growth Message: ${message}`);

        // You can integrate with your existing message system here
        // For example: uiSystem.setMessage(message);
    }, []);

    const addGrowthEvent = useCallback((message: string, type: 'positive' | 'negative' | 'neutral') => {
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

    // Force a growth stage (for testing/cheats)
    const forceGrowthStage = useCallback((targetStage: number) => {
        if (targetStage >= 1 && targetStage <= growthStages.length) {
            const stageInfo = growthStages[targetStage - 1];
            handleGrowthTransition(targetStage, stageInfo);
        }
    }, [handleGrowthTransition]);

    // Return the growth system API
    return {
        // Core growth functions
        checkGrowthStage,
        addWeight,

        // Growth stage info
        getCurrentStageInfo,
        getNextStageInfo,
        getGrowthProgress,
        getSizeDescription,

        // Capabilities
        getStageCapabilities,
        canHuntCreatureSize,

        // Constants (for UI components)
        getGrowthStages: () => growthStages,

        // Utilities
        forceGrowthStage, // For testing
    };
};