// ==================== ORIGINAL BIG AL COMBAT SYSTEM ====================
import { BEHAVIOR_RANDOMNESS } from '../game/gameConstants.js';

export const calculateFiercenessRatio = (playerWeight, playerFitness, speciesData, speciesSize, packSize = 1) => {
    const chance = (Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1;
    const playerFierceness = playerWeight * (Math.log10(Math.max(1, playerFitness)) / 2);
    const speciesDanger = speciesData.danger * (speciesSize / packSize) * chance;

    return speciesDanger / Math.max(1, playerFierceness);
};

export const calculateAgilityRatio = (playerWeight, speciesData) => {
    const chance = (Math.random() * 2 - 1) * BEHAVIOR_RANDOMNESS + 1;
    const logWeight = Math.log10(playerWeight) - Math.log10(0.2);
    const playerAgility = 1 - Math.pow((logWeight / 5), 2);
    const agilityRatio = speciesData.difficulty * chance / Math.max(0.1, playerAgility);

    return agilityRatio;
};

export const calculateInjuries = (fiercenessRatio) => {
    return fiercenessRatio * 40; // Something 2.5x as fierce can kill you
};