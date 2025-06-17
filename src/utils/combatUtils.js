// ==================== FIXED COMBAT SYSTEM WITH NaN PREVENTION ====================
import { BEHAVIOR_RANDOMNESS } from '../game/gameConstants.js';

// Helper function to ensure valid numbers
const safeNumber = (value, fallback = 1) => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        console.warn(`Invalid number detected: ${value}, using fallback: ${fallback}`);
        return fallback;
    }
    return value;
};

// Helper function for safe logarithm calculations
const safeLog10 = (value) => {
    const safeValue = Math.max(0.001, safeNumber(value, 0.001)); // Minimum value to prevent -Infinity
    return Math.log10(safeValue);
};

export const calculateFiercenessRatio = (playerWeight, playerFitness, speciesData, speciesSize, packSize = 1) => {
    // Validate inputs
    const safePlayerWeight = safeNumber(playerWeight, 0.2);
    const safePlayerFitness = safeNumber(playerFitness, 100);
    const safeSpeciesSize = safeNumber(speciesSize, 1);
    const safePackSize = Math.max(1, safeNumber(packSize, 1));

    // Validate species data
    const safeDanger = safeNumber(speciesData?.danger, 0);

    const chance = safeNumber((Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1, 1);
    const playerFierceness = safePlayerWeight * (safeLog10(Math.max(1, safePlayerFitness)) / 2);
    const speciesDanger = safeDanger * (safeSpeciesSize / safePackSize) * chance;

    const ratio = speciesDanger / Math.max(1, playerFierceness);
    return safeNumber(ratio, 0.1);
};

export const calculateAgilityRatio = (playerWeight, speciesData) => {
    // Validate inputs
    const safePlayerWeight = safeNumber(playerWeight, 0.2);

    // Validate species data
    const safeDifficulty = safeNumber(speciesData?.difficulty, 0.5);
    const safeSpeciesWeight = safeNumber(speciesData?.weight, 1);

    const chance = safeNumber((Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1, 1);

    // Safe agility calculation with bounds checking
    const logWeight = safeLog10(safePlayerWeight) - safeLog10(0.2); // Start from hatchling weight
    const normalizedLogWeight = Math.max(0, Math.min(10, logWeight)); // Clamp to reasonable bounds

    // More dramatic agility loss curve - bigger dinosaurs are much clumsier
    const rawPlayerAgility = 1 - Math.pow((normalizedLogWeight / 4), 1.8);
    const playerAgility = Math.max(0.01, Math.min(1, rawPlayerAgility)); // Ensure valid range

    // Additional penalty for very large dinosaurs when hunting small, quick prey
    let sizePenalty = 1;
    const sizeRatio = safeSpeciesWeight / safePlayerWeight;

    if (sizeRatio < 0.001) { // Huge predator vs tiny prey
        sizePenalty = 5; // 5x harder to catch
    } else if (sizeRatio < 0.01) {
        sizePenalty = 3; // 3x harder to catch
    } else if (sizeRatio < 0.1) {
        sizePenalty = 1.5; // Somewhat harder
    }

    const agilityRatio = (safeDifficulty * chance * sizePenalty) / playerAgility;
    return safeNumber(agilityRatio, 0.1);
};

export const calculateInjuries = (fiercenessRatio) => {
    const safeFiercenessRatio = safeNumber(fiercenessRatio, 0.1);
    const injuries = safeFiercenessRatio * 40; // Something 2.5x as fierce can kill you
    return safeNumber(injuries, 1);
};

// Enhanced success chance calculation with proper error handling
export const calculateSuccessChance = (playerWeight, playerFitness, speciesData, creatureSize) => {
    try {
        // Validate all inputs first
        const safePlayerWeight = safeNumber(playerWeight, 0.2);
        const safePlayerFitness = safeNumber(playerFitness, 100);
        const safeCreatureSize = safeNumber(creatureSize, 1);

        if (!speciesData) {
            console.warn("Missing species data, using default success chance");
            return 50;
        }

        const fiercenessRatio = calculateFiercenessRatio(safePlayerWeight, safePlayerFitness, speciesData, safeCreatureSize);
        const agilityRatio = calculateAgilityRatio(safePlayerWeight, speciesData);

        // Validate calculated ratios
        const safeFiercenessRatio = safeNumber(fiercenessRatio, 0.5);
        const safeAgilityRatio = safeNumber(agilityRatio, 0.5);

        let successChance;

        // Success chance calculation with enhanced realism
        if (safeFiercenessRatio >= 1) {
            // Too fierce - you'll likely get hurt
            successChance = Math.max(5, 30 - (safeFiercenessRatio * 15));
        } else if (safeAgilityRatio >= 1) {
            // You can overpower it but might not catch it
            successChance = Math.max(20, 80 - (safeAgilityRatio * 25));
        } else {
            // You should both overpower and catch it
            successChance = Math.max(70, 95 - (safeFiercenessRatio * 10) - (safeAgilityRatio * 10));
        }

        // Ensure success chance is within valid bounds
        const finalSuccessChance = Math.max(1, Math.min(99, safeNumber(successChance, 50)));

        return Math.round(finalSuccessChance);
    } catch (error) {
        console.error("Error calculating success chance:", error);
        return 50; // Safe fallback
    }
};

// Enhanced energy gain calculation with validation
export const calculateEnergyGain = (speciesData, creatureSize, playerWeight, playerLevel) => {
    try {
        // Validate inputs
        const safeCreatureSize = safeNumber(creatureSize, 1);
        const safePlayerWeight = safeNumber(playerWeight, 0.2);
        const safePlayerLevel = Math.max(1, Math.min(4, safeNumber(playerLevel, 1)));

        if (!speciesData) {
            console.warn("Missing species data for energy calculation");
            return 5;
        }

        const safeNutrition = safeNumber(speciesData.nutrition, 1);
        const safeSpeciesWeight = safeNumber(speciesData.weight, 1);

        const baseNutrition = safeNutrition * safeCreatureSize;

        // Energy efficiency decreases as you get bigger (bigger dinos need more food for same energy)
        const efficiencyMultiplier = Math.max(0.1, Math.pow(0.2 / Math.max(0.2, safePlayerWeight), 0.3));

        // Small prey becomes less satisfying for big predators
        const preyWeight = safeSpeciesWeight * safeCreatureSize;
        const sizeRatio = preyWeight / safePlayerWeight;

        let satisfactionMultiplier = 1.0;
        if (sizeRatio < 0.001) satisfactionMultiplier = 0.1; // Tiny prey for huge predator
        else if (sizeRatio < 0.01) satisfactionMultiplier = 0.3;
        else if (sizeRatio < 0.1) satisfactionMultiplier = 0.7;

        // Calculate final energy gain (not as percentage, but as absolute amount)
        const energyGain = baseNutrition * efficiencyMultiplier * satisfactionMultiplier * 15;

        return Math.max(1, Math.round(safeNumber(energyGain, 5))); // Minimum 1 energy
    } catch (error) {
        console.error("Error calculating energy gain:", error);
        return 5; // Safe fallback
    }
};

// Debug function to validate combat calculations
export const debugCombatCalculations = (playerWeight, playerFitness, speciesData, creatureSize) => {
    console.group("🔧 Combat Debug");
    console.log("Player Weight:", playerWeight);
    console.log("Player Fitness:", playerFitness);
    console.log("Species Data:", speciesData);
    console.log("Creature Size:", creatureSize);

    const fiercenessRatio = calculateFiercenessRatio(playerWeight, playerFitness, speciesData, creatureSize);
    const agilityRatio = calculateAgilityRatio(playerWeight, speciesData);
    const successChance = calculateSuccessChance(playerWeight, playerFitness, speciesData, creatureSize);
    const energyGain = calculateEnergyGain(speciesData, creatureSize, playerWeight, 1);

    console.log("Fierceness Ratio:", fiercenessRatio);
    console.log("Agility Ratio:", agilityRatio);
    console.log("Success Chance:", successChance);
    console.log("Energy Gain:", energyGain);

    // Check for any NaN values
    const values = { fiercenessRatio, agilityRatio, successChance, energyGain };
    for (const [key, value] of Object.entries(values)) {
        if (isNaN(value) || !isFinite(value)) {
            console.error(`❌ NaN detected in ${key}:`, value);
        } else {
            console.log(`✅ ${key} is valid:`, value);
        }
    }

    console.groupEnd();
};