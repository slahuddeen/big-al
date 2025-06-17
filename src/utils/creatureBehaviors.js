// ==================== ENHANCED CREATURE BEHAVIOR SYSTEM ====================
import { getHexNeighbors, hexDistance } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA } from '../data/species.js';

// Behavior execution frequency
export const BEHAVIOR_TICK_CHANCE = 0.7; // 70% chance per turn to execute behavior

// Enhanced creature behavioral AI system
export const executeCreatureBehavior = (creature, currentHex, gameState, dispatch) => {
    if (Math.random() > BEHAVIOR_TICK_CHANCE) return; // Skip this turn

    const speciesData = SPECIES_DATA[creature.species];
    if (!speciesData) return;

    const playerPos = gameState.player;
    const playerDistance = hexDistance(currentHex, playerPos);

    switch (speciesData.behaviorType) {
        case 'pack_predator':
            return handlePackPredator(creature, currentHex, gameState, playerDistance, dispatch);

        case 'ambush_predator':
            return handleAmbushPredator(creature, currentHex, gameState, playerDistance, dispatch);

        case 'territorial':
            return handleTerritorial(creature, currentHex, gameState, playerDistance, dispatch);

        case 'herbivore':
        case 'dangerous_herbivore':
        case 'giant_herbivore':
            return handleHerbivore(creature, currentHex, gameState, playerDistance, dispatch);

        case 'aerial_predator':
            return handleAerialPredator(creature, currentHex, gameState, playerDistance, dispatch);

        case 'rival_predator':
        case 'apex_predator':
            return handleRivalPredator(creature, currentHex, gameState, playerDistance, dispatch);

        case 'skittish':
            return handleSkittish(creature, currentHex, gameState, playerDistance, dispatch);

        case 'defensive':
            return handleDefensive(creature, currentHex, gameState, playerDistance, dispatch);

        case 'passive':
        default:
            return handlePassive(creature, currentHex, gameState, playerDistance, dispatch);
    }
};

// Pack predators hunt in groups and are aggressive
const handlePackPredator = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];

    // Count pack members in nearby hexes
    const packSize = countPackMembers(creature.species, currentHex, gameState);

    if (playerDistance <= 2) {
        // Pack behavior: more aggressive with pack support
        const aggressionModifier = Math.min(3, packSize * 0.5);
        const attackChance = (speciesData.aggression || 0.5) + aggressionModifier;

        if (playerDistance === 1 && Math.random() < attackChance) {
            // Attack the player
            return {
                action: 'attack_player',
                message: `The ${creature.species} ${packSize > 1 ? 'and its pack' : ''} attacks!`,
                damage: Math.round(speciesData.danger * creature.size * (1 + packSize * 0.2))
            };
        } else if (playerDistance === 2 && Math.random() < 0.6) {
            // Move closer to player
            return moveTowardsPlayer(creature, currentHex, gameState);
        }
    }

    // Hunt smaller creatures or roam
    if (Math.random() < 0.3) {
        return huntPrey(creature, currentHex, gameState);
    }

    return roamRandomly(creature, currentHex, gameState);
};

// Ambush predators wait and strike
const handleAmbushPredator = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];

    // Crocodiles and similar - stay near water, ambush when close
    if (playerDistance === 1) {
        const ambushChance = (speciesData.aggression || 0.5) * 1.5; // Higher ambush chance
        if (Math.random() < ambushChance) {
            return {
                action: 'ambush_attack',
                message: `The ${creature.species} erupts from its hiding spot!`,
                damage: Math.round(speciesData.danger * creature.size * 1.4) // Ambush bonus
            };
        }
    }

    // Stay near water or preferred terrain
    if (Math.random() < 0.8) {
        return stayNearPreferredTerrain(creature, currentHex, gameState, ['river', 'marsh', 'waterhole', 'lake']);
    }

    return { action: 'wait' }; // Ambush predators often wait
};

// Territorial creatures defend their area
const handleTerritorial = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];

    if (playerDistance <= 2) {
        // Territorial warning first, then attack
        if (playerDistance === 2 && Math.random() < 0.5) {
            return {
                action: 'warning',
                message: `The ${creature.species} hisses and displays aggressively!`
            };
        } else if (playerDistance === 1 && Math.random() < (speciesData.aggression || 0.3) + 0.3) {
            return {
                action: 'territorial_attack',
                message: `The ${creature.species} defends its territory fiercely!`,
                damage: Math.round(speciesData.danger * creature.size * 1.2)
            };
        }
    }

    // Patrol territory or mark it
    if (Math.random() < 0.4) {
        return patrolTerritory(creature, currentHex, gameState);
    }

    return { action: 'patrol' };
};

// Herbivores flee, migrate, or defend when cornered
const handleHerbivore = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];
    const isDangerous = speciesData.behaviorType === 'dangerous_herbivore';
    const isGiant = speciesData.behaviorType === 'giant_herbivore';

    if (playerDistance <= 2) {
        if (isDangerous && playerDistance === 1 && Math.random() < 0.6) {
            // Dangerous herbivores fight back
            return {
                action: 'defensive_attack',
                message: `The ${creature.species} lashes out in self-defense!`,
                damage: Math.round(speciesData.danger * creature.size * 0.8)
            };
        } else if (!isGiant && Math.random() < 0.7) {
            // Small herbivores flee
            return fleeFromPlayer(creature, currentHex, gameState);
        } else if (isGiant && Math.random() < 0.3) {
            // Giants might just ignore or casually swat
            return {
                action: 'casual_defense',
                message: `The massive ${creature.species} casually swings its tail!`,
                damage: Math.round(speciesData.danger * creature.size * 0.5)
            };
        }
    }

    // Herbivore behaviors: graze, migrate to better food
    if (Math.random() < 0.4) {
        return migrateToFood(creature, currentHex, gameState);
    }

    return { action: 'graze' };
};

// Aerial predators swoop and soar
const handleAerialPredator = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];

    if (playerDistance <= 2 && Math.random() < (speciesData.aggression || 0.4)) {
        if (playerDistance === 1) {
            return {
                action: 'aerial_attack',
                message: `The ${creature.species} swoops down with talons extended!`,
                damage: Math.round(speciesData.danger * creature.size * 1.1)
            };
        } else {
            // Aerial mobility - can strike from range 2
            return {
                action: 'swoop_attack',
                message: `The ${creature.species} dives from above!`,
                damage: Math.round(speciesData.danger * creature.size * 0.9)
            };
        }
    }

    // Fly to high ground or hunt from above
    if (Math.random() < 0.5) {
        return soarToHighGround(creature, currentHex, gameState);
    }

    return huntFromAbove(creature, currentHex, gameState);
};

// Rival predators are competitive and aggressive
const handleRivalPredator = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];
    const isApex = speciesData.behaviorType === 'apex_predator';

    if (playerDistance <= 2) {
        const baseAggression = speciesData.aggression || 0.5;
        const sizeThreat = creature.size * speciesData.danger;
        const playerThreat = gameState.weight * gameState.level;

        // More aggressive if they outclass the player
        const aggressionModifier = sizeThreat > playerThreat ? 0.3 : -0.1;

        if (Math.random() < baseAggression + aggressionModifier) {
            return {
                action: 'rival_attack',
                message: `The ${creature.species} sees you as competition and attacks!`,
                damage: Math.round(speciesData.danger * creature.size * (isApex ? 1.5 : 1.2))
            };
        } else if (playerDistance === 2 && sizeThreat > playerThreat) {
            // Intimidation display
            return {
                action: 'intimidate',
                message: `The ${creature.species} roars menacingly and bares its teeth!`
            };
        }
    }

    // Hunt competitors or patrol hunting grounds
    if (Math.random() < 0.3) {
        return huntCompetitors(creature, currentHex, gameState);
    }

    return patrolHuntingGrounds(creature, currentHex, gameState);
};

// Skittish creatures flee easily
const handleSkittish = (creature, currentHex, gameState, playerDistance, dispatch) => {
    if (playerDistance <= 3) {
        // Very likely to flee when player is nearby
        if (Math.random() < 0.8) {
            return fleeFromPlayer(creature, currentHex, gameState);
        }
    }

    // Nervous roaming
    if (Math.random() < 0.6) {
        return nervousMovement(creature, currentHex, gameState);
    }

    return { action: 'hide' };
};

// Defensive creatures protect themselves but don't actively hunt
const handleDefensive = (creature, currentHex, gameState, playerDistance, dispatch) => {
    const speciesData = SPECIES_DATA[creature.species];

    if (playerDistance === 1 && Math.random() < 0.5) {
        return {
            action: 'defensive_strike',
            message: `The ${creature.species} strikes defensively!`,
            damage: Math.round(speciesData.danger * creature.size * 0.7)
        };
    } else if (playerDistance <= 2 && Math.random() < 0.3) {
        return {
            action: 'defensive_posture',
            message: `The ${creature.species} adopts a threatening defensive stance!`
        };
    }

    // Cautious movement
    return cautiousMovement(creature, currentHex, gameState);
};

// Passive creatures just roam and avoid danger
const handlePassive = (creature, currentHex, gameState, playerDistance, dispatch) => {
    if (playerDistance <= 2 && Math.random() < 0.4) {
        return fleeFromPlayer(creature, currentHex, gameState);
    }

    return roamRandomly(creature, currentHex, gameState);
};

// HELPER BEHAVIOR FUNCTIONS

const countPackMembers = (species, centerHex, gameState) => {
    let count = 1; // Self
    const neighbors = getHexNeighbors(centerHex);

    for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const creatures = gameState.creatures.get(neighborKey) || [];
        count += creatures.filter(c => c.species === species).length;
    }

    return count;
};

const moveTowardsPlayer = (creature, currentHex, gameState) => {
    const playerPos = gameState.player;
    const neighbors = getHexNeighbors(currentHex);

    // Find neighbor closest to player
    let bestHex = null;
    let bestDistance = Infinity;

    for (const neighbor of neighbors) {
        const distance = hexDistance(neighbor, playerPos);
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const neighborHex = gameState.hexes.get(neighborKey);

        if (neighborHex && TERRAIN_TYPES[neighborHex.terrain].passable && distance < bestDistance) {
            bestDistance = distance;
            bestHex = neighbor;
        }
    }

    if (bestHex) {
        return {
            action: 'move',
            target: bestHex,
            message: `The ${creature.species} stalks closer!`
        };
    }

    return { action: 'wait' };
};

const fleeFromPlayer = (creature, currentHex, gameState) => {
    const playerPos = gameState.player;
    const neighbors = getHexNeighbors(currentHex);

    // Find neighbor farthest from player
    let bestHex = null;
    let bestDistance = -1;

    for (const neighbor of neighbors) {
        const distance = hexDistance(neighbor, playerPos);
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const neighborHex = gameState.hexes.get(neighborKey);

        if (neighborHex && TERRAIN_TYPES[neighborHex.terrain].passable && distance > bestDistance) {
            bestDistance = distance;
            bestHex = neighbor;
        }
    }

    if (bestHex) {
        return {
            action: 'flee',
            target: bestHex,
            message: `The ${creature.species} flees!`
        };
    }

    return { action: 'cower' };
};

const roamRandomly = (creature, currentHex, gameState) => {
    const neighbors = getHexNeighbors(currentHex);
    const validMoves = neighbors.filter(neighbor => {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const neighborHex = gameState.hexes.get(neighborKey);
        return neighborHex && TERRAIN_TYPES[neighborHex.terrain].passable;
    });

    if (validMoves.length > 0 && Math.random() < 0.4) {
        const target = validMoves[Math.floor(Math.random() * validMoves.length)];
        return {
            action: 'roam',
            target: target
        };
    }

    return { action: 'rest' };
};

const stayNearPreferredTerrain = (creature, currentHex, gameState, preferredTerrains) => {
    const neighbors = getHexNeighbors(currentHex);
    const preferredMoves = neighbors.filter(neighbor => {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const neighborHex = gameState.hexes.get(neighborKey);
        return neighborHex &&
            TERRAIN_TYPES[neighborHex.terrain].passable &&
            preferredTerrains.includes(neighborHex.terrain);
    });

    if (preferredMoves.length > 0) {
        const target = preferredMoves[Math.floor(Math.random() * preferredMoves.length)];
        return {
            action: 'move_to_preferred',
            target: target
        };
    }

    return { action: 'wait' };
};

const migrateToFood = (creature, currentHex, gameState) => {
    // Herbivores prefer forest edges, plains, and savannas for food
    const foodTerrains = ['plains', 'savanna', 'openwoods', 'riverbank'];
    return stayNearPreferredTerrain(creature, currentHex, gameState, foodTerrains);
};

const soarToHighGround = (creature, currentHex, gameState) => {
    const highTerrains = ['hills', 'mountains', 'mesa', 'rocky'];
    return stayNearPreferredTerrain(creature, currentHex, gameState, highTerrains);
};

const huntFromAbove = (creature, currentHex, gameState) => {
    // Look for prey in nearby hexes
    const neighbors = getHexNeighbors(currentHex);
    for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const creatures = gameState.creatures.get(neighborKey) || [];
        const prey = creatures.find(c => {
            const preyData = SPECIES_DATA[c.species];
            return preyData && preyData.behaviorType === 'passive' &&
                preyData.weight < SPECIES_DATA[creature.species].weight;
        });

        if (prey) {
            return {
                action: 'hunt_from_above',
                target: neighbor,
                message: `The ${creature.species} spots prey from above!`
            };
        }
    }

    return roamRandomly(creature, currentHex, gameState);
};

const huntPrey = (creature, currentHex, gameState) => {
    // Similar to huntFromAbove but for ground predators
    return huntFromAbove(creature, currentHex, gameState);
};

const huntCompetitors = (creature, currentHex, gameState) => {
    // Look for smaller predators to drive away
    const neighbors = getHexNeighbors(currentHex);
    for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        const creatures = gameState.creatures.get(neighborKey) || [];
        const competitor = creatures.find(c => {
            const compData = SPECIES_DATA[c.species];
            return compData &&
                ['pack_predator', 'rival_predator'].includes(compData.behaviorType) &&
                compData.weight < SPECIES_DATA[creature.species].weight;
        });

        if (competitor) {
            return {
                action: 'chase_competitor',
                target: neighbor,
                message: `The ${creature.species} drives away competition!`
            };
        }
    }

    return roamRandomly(creature, currentHex, gameState);
};

const patrolTerritory = (creature, currentHex, gameState) => {
    // Move in a pattern around the current area
    return roamRandomly(creature, currentHex, gameState);
};

const patrolHuntingGrounds = (creature, currentHex, gameState) => {
    // Similar to patrol territory but looking for hunting opportunities
    return patrolTerritory(creature, currentHex, gameState);
};

const nervousMovement = (creature, currentHex, gameState) => {
    // Quick, erratic movements
    if (Math.random() < 0.7) {
        return roamRandomly(creature, currentHex, gameState);
    }
    return { action: 'nervous_wait' };
};

const cautiousMovement = (creature, currentHex, gameState) => {
    // Slow, careful movement
    if (Math.random() < 0.3) {
        return roamRandomly(creature, currentHex, gameState);
    }
    return { action: 'cautious_wait' };
};

// Export behavior types for reference
export const BEHAVIOR_TYPES = {
    PASSIVE: 'passive',
    SKITTISH: 'skittish',
    DEFENSIVE: 'defensive',
    PACK_PREDATOR: 'pack_predator',
    TERRITORIAL: 'territorial',
    HERBIVORE: 'herbivore',
    AERIAL_PREDATOR: 'aerial_predator',
    RIVAL_PREDATOR: 'rival_predator',
    AMBUSH_PREDATOR: 'ambush_predator',
    APEX_PREDATOR: 'apex_predator',
    DANGEROUS_HERBIVORE: 'dangerous_herbivore',
    GIANT_HERBIVORE: 'giant_herbivore'
};