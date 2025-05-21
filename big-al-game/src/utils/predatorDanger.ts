// utils/predatorDanger.ts
import { hexDistance } from './hexGrid';

export interface PredatorEncounterContext {
    creatureInfo: any;
    creatureId: string;
    creatureType: string;
    playerGrowthStage: number;
    playerFitness: number;
    playerEnergy: number;
    playerPerks: string[];
    isMotherNearby: boolean;
    terrainType: string;
    map: any;
    hexKey: string;
    timeOfDay: string;
    weather: string;
}

export interface EncounterResult {
    message: string;
    damage: number;
    escaped: boolean;
    injuryType: string | null;
    healthEventType: 'positive' | 'negative' | 'neutral';
    healthEventMessage: string;
    removeCreature: boolean;
    gameOver: boolean;
}

export interface ThreatLevel {
    level: number; // 1-5
    name: string;
    description: string;
    color: string;
}

export const ThreatLevels: Record<number, ThreatLevel> = {
    1: {
        level: 1,
        name: "Minimal",
        description: "Not threatening to you",
        color: "green-500"
    },
    2: {
        level: 2,
        name: "Low",
        description: "Could inflict minor injuries",
        color: "yellow-500"
    },
    3: {
        level: 3,
        name: "Moderate",
        description: "Dangerous, approach with caution",
        color: "orange-500"
    },
    4: {
        level: 4,
        name: "High",
        description: "Very dangerous, avoid if possible",
        color: "red-500"
    },
    5: {
        level: 5,
        name: "Extreme",
        description: "Deadly, do not approach",
        color: "purple-500"
    }
};

// Calculate relative threat level of a predator to the player
export const calculateThreatLevel = (
    creatureInfo: any,
    playerGrowthStage: number,
    isMotherNearby: boolean
): number => {
    if (isMotherNearby && playerGrowthStage === 1) {
        // Mother's protection reduces threat
        return Math.max(1, creatureInfo.dangerLevel - 2);
    }

    // Base threat is the danger level of the creature
    let threatLevel = creatureInfo.dangerLevel;

    // Adjust for relative size/growth stage
    const sizeDifference = creatureInfo.size - playerGrowthStage;

    if (sizeDifference > 1) {
        // Much larger than player - increase threat
        threatLevel += 1;
    } else if (sizeDifference < -1) {
        // Much smaller than player - decrease threat
        threatLevel -= 1;
    }

    // Ensure threat level is within bounds
    return Math.max(1, Math.min(5, threatLevel));
};

// Handle predator encounter logic
export const handlePredatorEncounter = (context: PredatorEncounterContext): EncounterResult => {
    const {
        creatureInfo,
        creatureId,
        creatureType,
        playerGrowthStage,
        playerFitness,
        playerEnergy,
        playerPerks,
        isMotherNearby,
        terrainType,
        map,
        hexKey,
        timeOfDay,
        weather
    } = context;

    // Initialize result
    const result: EncounterResult = {
        message: "",
        damage: 0,
        escaped: false,
        injuryType: null,
        healthEventType: 'neutral',
        healthEventMessage: "",
        removeCreature: false,
        gameOver: false
    };

    // Check for mother's protection
    if (isMotherNearby && playerGrowthStage === 1) {
        result.message = `Your mother protects you from the ${creatureInfo.name}!`;
        result.healthEventMessage = `Your mother scared away a dangerous ${creatureInfo.name}.`;
        result.healthEventType = 'positive';
        result.removeCreature = true;
        return result;
    }

    // Calculate escape chance
    const escapeChance = calculateEscapeChance(context);

    // See if player escapes
    if (Math.random() < escapeChance) {
        result.message = `You quickly move away from the ${creatureInfo.name} before it notices you!`;
        result.escaped = true;
        result.healthEventMessage = `You successfully avoided an encounter with a ${creatureInfo.name}.`;
        return result;
    }

    // If not escaped, it's an attack
    // Calculate attack severity
    const { damage, injuryType } = calculateAttackDamage(context);

    result.damage = damage;
    result.injuryType = injuryType;

    // Set message
    if (damage > 20) {
        // Severe attack
        result.message = `A ${creatureInfo.name} viciously attacks you! You lose ${damage} fitness.`;
        result.healthEventType = 'negative';
        result.healthEventMessage = `You were severely injured in an attack by a ${creatureInfo.name}.`;
    } else if (damage > 10) {
        // Moderate attack
        result.message = `A ${creatureInfo.name} attacks you! You lose ${damage} fitness.`;
        result.healthEventType = 'negative';
        result.healthEventMessage = `You were attacked by a ${creatureInfo.name} and took damage.`;
    } else {
        // Minor attack
        result.message = `A ${creatureInfo.name} lunges at you! You lose ${damage} fitness.`;
        result.healthEventType = 'negative';
        result.healthEventMessage = `You received minor injuries from a ${creatureInfo.name}.`;
    }

    // Check if this attack would be fatal
    if (playerFitness - damage <= 0) {
        result.gameOver = true;
        result.message = `Game Over! You were killed by a ${creatureInfo.name}.`;
    } else {
        // Move the predator away after attack
        result.removeCreature = true;
    }

    return result;
};

// Calculate chance of escaping from predator
const calculateEscapeChance = (context: PredatorEncounterContext): number => {
    const {
        creatureInfo,
        playerGrowthStage,
        playerPerks,
        playerEnergy,
        terrainType,
        timeOfDay
    } = context;

    // Base escape chance depends on energy level (tired dinosaurs can't run as fast)
    let escapeChance = playerEnergy / 200; // 0-0.5 base chance

    // Adjustments for player growth vs creature
    const growthAdvantage = playerGrowthStage - creatureInfo.size;
    escapeChance += growthAdvantage * 0.1; // +/- 0.1 per size difference

    // Adjustments for agility difference
    const playerAgility = 70 - (playerGrowthStage * 5); // Smaller dinosaurs are more agile
    const agilityDifference = playerAgility - creatureInfo.agility;
    escapeChance += agilityDifference * 0.002; // Small adjustment based on agility

    // Terrain bonuses
    if (terrainType === 'forest' || terrainType === 'marsh') {
        escapeChance += 0.15; // Easier to hide in dense foliage
    } else if (terrainType === 'cliff' || terrainType === 'rocky') {
        escapeChance += 0.1; // Can climb to safety
    }

    // Night time bonus if player has night vision perk
    if (timeOfDay === 'night' && playerPerks.includes('night_vision')) {
        escapeChance += 0.2; // Better night vision than predators
    } else if (timeOfDay === 'night') {
        escapeChance -= 0.1; // Harder to see where to run at night
    }

    // Swift runner perk bonus
    if (playerPerks.includes('swift_runner')) {
        escapeChance += 0.15;
    }

    // Ensure chance is between 10% and 90%
    return Math.max(0.1, Math.min(0.9, escapeChance));
};

// Calculate damage from a predator attack
const calculateAttackDamage = (context: PredatorEncounterContext): { damage: number, injuryType: string | null } => {
    const {
        creatureInfo,
        playerGrowthStage,
        playerPerks,
        weather
    } = context;

    // Base damage based on creature fierceness
    let damage = Math.floor(creatureInfo.fierceness / 10);

    // Adjust based on size difference
    const sizeDifference = creatureInfo.size - playerGrowthStage;
    damage = Math.max(1, Math.floor(damage * (1 + sizeDifference * 0.3)));

    // Reduce damage if player has thick hide perk
    if (playerPerks.includes('thick_hide')) {
        damage = Math.floor(damage * 0.75);
    }

    // Weather effects
    if (weather === 'rainy') {
        damage = Math.floor(damage * 1.1); // Slippery conditions make it harder to dodge
    }

    // Determine if injury occurs (more likely with higher damage)
    let injuryType: string | null = null;
    const injuryChance = Math.min(0.8, damage / 30); // Up to 80% chance for severe attacks

    if (Math.random() < injuryChance) {
        // Select injury type based on attack severity
        if (damage > 15) {
            // Severe injury
            const severeInjuries = ['broken_rib', 'internal_bleeding'];
            injuryType = severeInjuries[Math.floor(Math.random() * severeInjuries.length)];
        } else if (damage > 8) {
            // Moderate injury
            const moderateInjuries = ['leg_wound', 'infection'];
            injuryType = moderateInjuries[Math.floor(Math.random() * moderateInjuries.length)];
        } else {
            // Minor injury
            const minorInjuries = ['sprained_claw', 'concussion'];
            injuryType = minorInjuries[Math.floor(Math.random() * minorInjuries.length)];
        }
    }

    return { damage, injuryType };
};

// Detect nearby predators to warn player
export const detectNearbyPredators = (
    map: any,
    playerPosition: { q: number, r: number },
    playerGrowthStage: number,
    detectionRange: number = 3
): Array<{ distance: number, creature: any, threatLevel: number }> => {
    const nearbyPredators = [];

    // Search map within detection range
    Object.entries(map).forEach(([key, hex]: [string, any]) => {
        const [q, r] = key.split(',').map(Number);
        const distance = hexDistance(q, r, playerPosition.q, playerPosition.r);

        // If within detection range and has creatures
        if (distance <= detectionRange && hex.creatures && hex.creatures.length > 0) {
            // Check each creature
            hex.creatures.forEach((creature: any) => {
                const creatureInfo = creature.type ? creatureTypes[creature.type] : null;

                // If it's a predator that's dangerous to the player
                if (creatureInfo &&
                    creatureInfo.dangerLevel >= 3 &&
                    playerGrowthStage <= creatureInfo.maxGrowthToHide) {

                    // Calculate threat level (without mother - actual protection will be checked during encounter)
                    const threatLevel = calculateThreatLevel(creatureInfo, playerGrowthStage, false);

                    nearbyPredators.push({
                        distance,
                        creature: {
                            ...creature,
                            info: creatureInfo
                        },
                        threatLevel
                    });
                }
            });
        }
    });

    // Sort by distance (closest first)
    return nearbyPredators.sort((a, b) => a.distance - b.distance);
};

// Create a predator warning message
export const createPredatorWarning = (predators: Array<{ distance: number, creature: any, threatLevel: number }>): string | null => {
    if (predators.length === 0) return null;

    // Get highest threat predator
    const highestThreat = [...predators].sort((a, b) => b.threatLevel - a.threatLevel)[0];

    // Create appropriate warning based on distance and threat
    if (highestThreat.distance <= 1) {
        return `DANGER! A ${highestThreat.creature.info.name} is right next to you!`;
    } else if (highestThreat.distance <= 2) {
        return `Warning: A ${highestThreat.creature.info.name} is very close!`;
    } else {
        return `You sense a ${highestThreat.creature.info.name} nearby.`;
    }
};

// Imported from other file to avoid circular references
const creatureTypes: Record<string, any> = {};