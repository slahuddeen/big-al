// ==================== ENHANCED COMBAT SYSTEM WITH IMPROVED HATCHLING SCALING ====================
import { BEHAVIOR_RANDOMNESS } from '../game/gameConstants.js';

const HATCHLING_WEIGHT = 1; // kg - Big Al's hatching weight

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
    const safeValue = Math.max(0.001, safeNumber(value, 0.001));
    return Math.log10(safeValue);
};

// `random` adds the combat dice roll; previews pass false so the odds shown don't flicker
export const calculateFiercenessRatio = (playerWeight, playerFitness, speciesData, speciesSize, packSize = 1, random = true) => {
    // Validate inputs
    const safePlayerWeight = safeNumber(playerWeight, 1); // hatchling baseline (1kg)
    const safePlayerFitness = safeNumber(playerFitness, 100);
    const safeSpeciesSize = safeNumber(speciesSize, 1);
    const safePackSize = Math.max(1, safeNumber(packSize, 1));

    // Validate species data
    const safeDanger = safeNumber(speciesData?.danger, 0);

    const chance = random ? safeNumber((Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1, 1) : 1;
    const playerFierceness = safePlayerWeight * (safeLog10(Math.max(1, safePlayerFitness)) / 2);
    const speciesDanger = safeDanger * (safeSpeciesSize / safePackSize) * chance;

    const ratio = speciesDanger / Math.max(1, playerFierceness);
    return safeNumber(ratio, 0.1);
};

export const calculateAgilityRatio = (playerWeight, speciesData, random = true) => {
    // Validate inputs
    const safePlayerWeight = safeNumber(playerWeight, 1); // hatchling baseline (1kg)

    // Validate species data
    const safeDifficulty = safeNumber(speciesData?.difficulty, 0.5);
    const safeSpeciesWeight = safeNumber(speciesData?.weight, 1);

    const chance = random ? safeNumber((Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1, 1) : 1;

    // Agility falls off with size, starting from the 1kg hatchling
    const logWeight = safeLog10(safePlayerWeight) - safeLog10(HATCHLING_WEIGHT);
    const normalizedLogWeight = Math.max(0, Math.min(10, logWeight));

    // Agility curve - hatchlings are very agile
    const rawPlayerAgility = 1 - Math.pow((normalizedLogWeight / 4.5), 1.6); // Slightly gentler curve
    const playerAgility = Math.max(0.02, Math.min(1, rawPlayerAgility));

    // Enhanced size penalty system - relative to the hatchling
    let sizePenalty = 1;
    const sizeRatio = safeSpeciesWeight / safePlayerWeight;

    if (sizeRatio < 0.0005) { // Absolutely tiny prey vs a hatchling  
        sizePenalty = 4; // Still hard but not impossible
    } else if (sizeRatio < 0.005) { // Very small prey like dragonflies
        sizePenalty = 2.5; // Reasonable challenge for hatchling
    } else if (sizeRatio < 0.05) { // Small but appropriate prey
        sizePenalty = 1.2; // Slightly harder
    }

    const agilityRatio = (safeDifficulty * chance * sizePenalty) / playerAgility;
    return safeNumber(agilityRatio, 0.1);
};

export const calculateInjuries = (fiercenessRatio) => {
    const safeFiercenessRatio = safeNumber(fiercenessRatio, 0.1);
    const injuries = safeFiercenessRatio * 35; // Slightly reduced base damage
    return safeNumber(injuries, 1);
};

// Enhanced success chance calculation with better hatchling scaling
export const calculateSuccessChance = (playerWeight, playerFitness, speciesData, creatureSize) => {
    try {
        // Validate all inputs first
        const safePlayerWeight = safeNumber(playerWeight, 1); // hatchling baseline (1kg)
        const safePlayerFitness = safeNumber(playerFitness, 100);
        const safeCreatureSize = safeNumber(creatureSize, 1);

        if (!speciesData) {
            console.warn("Missing species data, using default success chance");
            return 50;
        }

        const fiercenessRatio = calculateFiercenessRatio(safePlayerWeight, safePlayerFitness, speciesData, safeCreatureSize, 1, false);
        const agilityRatio = calculateAgilityRatio(safePlayerWeight, speciesData, false);

        // Validate calculated ratios
        const safeFiercenessRatio = safeNumber(fiercenessRatio, 0.5);
        const safeAgilityRatio = safeNumber(agilityRatio, 0.5);

        let successChance;

        // Enhanced success chance calculation
        if (safeFiercenessRatio >= 1) {
            // Too fierce - you'll likely get hurt
            successChance = Math.max(8, 35 - (safeFiercenessRatio * 12)); // Slightly more forgiving
        } else if (safeAgilityRatio >= 1) {
            // You can overpower it but might not catch it
            successChance = Math.max(25, 85 - (safeAgilityRatio * 20)); // Better base chance
        } else {
            // You should both overpower and catch it
            successChance = Math.max(75, 96 - (safeFiercenessRatio * 8) - (safeAgilityRatio * 8)); // Higher success for appropriate prey
        }

        // Special bonus for tiny prey vs hatchling (appropriate prey size)
        const preyWeight = (speciesData.weight || 1) * safeCreatureSize;
        const sizeRatio = preyWeight / safePlayerWeight;

        if (safePlayerWeight <= 2.0 && sizeRatio >= 0.001 && sizeRatio <= 0.1) {
            successChance += 15; // Bonus for hunting appropriately-sized prey as hatchling
        }

        // Ensure success chance is within valid bounds
        const finalSuccessChance = Math.max(5, Math.min(95, safeNumber(successChance, 50)));

        return Math.round(finalSuccessChance);
    } catch (error) {
        console.error("Error calculating success chance:", error);
        return 50; // Safe fallback
    }
};

// Enhanced energy gain calculation with much better hatchling scaling
export const calculateEnergyGain = (speciesData, creatureSize, playerWeight, playerLevel) => {
    try {
        // Validate inputs
        const safeCreatureSize = safeNumber(creatureSize, 1);
        const safePlayerWeight = safeNumber(playerWeight, 1); // hatchling baseline (1kg)
        const safePlayerLevel = Math.max(1, Math.min(4, safeNumber(playerLevel, 1)));

        if (!speciesData) {
            console.warn("Missing species data for energy calculation");
            return 5;
        }

        const safeNutrition = safeNumber(speciesData.nutrition, 1);
        const safeSpeciesWeight = safeNumber(speciesData.weight, 1);

        const baseNutrition = safeNutrition * safeCreatureSize;

        // Smaller predators extract more from each meal
        // Smaller predators are MORE efficient at extracting energy from appropriate prey
        const efficiencyMultiplier = Math.max(0.2, Math.pow(HATCHLING_WEIGHT / Math.max(HATCHLING_WEIGHT, safePlayerWeight), 0.25)); // Much gentler scaling

        // Enhanced prey suitability calculation
        const preyWeight = safeSpeciesWeight * safeCreatureSize;
        const sizeRatio = preyWeight / safePlayerWeight;

        let satisfactionMultiplier = 1.0;

        // ENHANCED: Better scaling for hatchling-appropriate prey
        if (safePlayerLevel === 1) { // Special hatchling rules
            if (sizeRatio >= 0.002 && sizeRatio <= 0.1) {
                satisfactionMultiplier = 2.5; // Big bonus for appropriately-sized prey!
            } else if (sizeRatio >= 0.0005 && sizeRatio < 0.002) {
                satisfactionMultiplier = 1.8; // Good for tiny prey like dragonflies
            } else if (sizeRatio < 0.0005) {
                satisfactionMultiplier = 0.8; // Dust mites territory
            } else {
                satisfactionMultiplier = 0.6; // Too big for hatchling
            }
        } else {
            // Original scaling for larger dinosaurs
            if (sizeRatio < 0.001) satisfactionMultiplier = 0.1;
            else if (sizeRatio < 0.01) satisfactionMultiplier = 0.3;
            else if (sizeRatio < 0.1) satisfactionMultiplier = 0.7;
        }

        // ENHANCED: Species-specific nutrition bonuses for hatchlings
        let speciesBonus = 1.0;
        if (safePlayerLevel === 1) {
            const speciesName = Object.keys(SPECIES_DATA).find(name =>
                SPECIES_DATA[name] === speciesData
            );

            if (['Dragonfly', 'Cricket', 'Centipede'].includes(speciesName)) {
                speciesBonus = 1.8; // These are perfect hatchling food!
            } else if (['Mammal', 'Scorpion'].includes(speciesName)) {
                speciesBonus = 1.4; // Good secondary prey
            }
        }

        // Calculate final energy gain with all enhancements
        const energyGain = baseNutrition * efficiencyMultiplier * satisfactionMultiplier * speciesBonus * 18; // Increased base multiplier

        return Math.max(1, Math.round(safeNumber(energyGain, 5)));
    } catch (error) {
        console.error("Error calculating energy gain:", error);
        return 5; // Safe fallback
    }
};

// Chance an animal bolts before you can close in
export const escapeChance = (speciesName, speciesData, creatureSize, playerWeight, playerLevel) => {
    const escapeBaseChance = {
        Dragonfly: 0.2, Cricket: 0.15, Centipede: 0.05, Mammal: 0.1, Scorpion: 0.08, Frog: 0.12, Lizard: 0.15,
        Mesadactylus: 0.25, Harpactognathus: 0.18, Kepodactylus: 0.08, Compsognathus: 0.12, Coelurus: 0.15, Hesperornithoides: 0.18
    };
    let baseEscape = escapeBaseChance[speciesName] || 0.08;
    const sizeRatio = (speciesData.weight * creatureSize) / playerWeight;
    if (sizeRatio < 0.01) baseEscape += 0.15;
    else if (sizeRatio < 0.1) baseEscape += 0.08;
    if (playerLevel === 1) baseEscape += 0.1;
    return Math.min(0.5, baseEscape);
};

// Deterministic odds for the encounter cards, matching ATTACK_CREATURE.
// mods: [fierceness, agility, escape] multipliers for the attack style.
export const previewAttack = (state, creature, mods = [1, 1, 1], style = 'normal') => {
    const sd = SPECIES_DATA[creature.species];
    if (!sd) return { success: 0, fierceness: 9, agility: 9, energyGain: 0 };
    const woundMul = creature.wounded ? Math.max(0.15, (creature.health ?? 100) / 100) : 1;
    const fierceness = calculateFiercenessRatio(state.weight, state.fitness, sd, creature.size, 1, false) * mods[0] * woundMul;
    const agility = calculateAgilityRatio(state.weight, sd, false) * mods[1] * (creature.wounded ? 0.6 : 1);
    const energyGain = calculateEnergyGain(sd, creature.size, state.weight, state.level);
    let success;
    if (style === 'hatchet') {
        success = fierceness >= 2.5 ? 8 : Math.max(15, Math.min(92, 100 - agility * 45));
    } else {
        if (fierceness >= 1) success = Math.max(8, 35 - fierceness * 12);
        else if (agility >= 1) success = Math.max(25, 85 - agility * 20);
        else success = Math.max(75, 96 - fierceness * 8 - agility * 8);
        const sizeRatio = (sd.weight * creature.size) / state.weight;
        if (state.weight <= 2.0 && sizeRatio >= 0.001 && sizeRatio <= 0.1) success += 15;
        success *= 1 - escapeChance(creature.species, sd, creature.size, state.weight, state.level) * mods[2] * 0.6;
    }
    return { success: Math.round(Math.max(5, Math.min(96, success))), fierceness, agility, energyGain };
};

// Enhanced debug function
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

    // Enhanced prey suitability info
    const preyWeight = (speciesData.weight || 1) * creatureSize;
    const sizeRatio = preyWeight / playerWeight;
    console.log("Prey Weight:", preyWeight, "kg");
    console.log("Size Ratio:", sizeRatio);
    console.log("Prey Suitability:", sizeRatio >= 0.002 && sizeRatio <= 0.1 ? "Perfect for hatchling!" : "Suboptimal size");

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

// Export species data reference for the bonus calculations
import { SPECIES_DATA } from '../data/species.js';