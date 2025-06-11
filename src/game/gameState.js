// ==================== GAME STATE ====================
import { hexDistance, getHexNeighbors } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries } from '../utils/combatUtils.js';
import { generateTerrainFeatures, generateTerrain } from '../utils/terrainGeneration.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import {
    MAX_WEIGHT,
    HEALING_RATE,
    ENERGY_PER_BODYWEIGHT,
    ROAMING_RATE,
    MAX_CREATURES_PER_HEX,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS
} from './gameConstants.js';

export const initialGameState = {
    player: { q: 0, r: 0 },
    hexes: new Map(),
    selectedHex: null,
    hoveredHex: null,

    // Player stats
    level: 3,
    weight: 45.2,
    energy: 75,
    fitness: 85,
    score: 1250,
    moveNumber: 0,

    // Creatures system
    creatures: new Map(),

    // Linear features for advanced terrain generation
    linearFeatures: [],
    mapGenerated: false,

    // Notifications and events
    notifications: [],
    currentThought: "You smell carrion nearby...",

    // Game state
    gamePhase: 'exploring',
    gameOver: false,
    deathReason: null,
};

// Helper function to add notifications with limits
const addNotification = (notifications, newNotification) => {
    const notification = {
        id: Date.now(),
        timestamp: Date.now(),
        ...newNotification
    };

    const updatedNotifications = [...notifications, notification];

    // Keep only the latest MAX_NOTIFICATIONS
    if (updatedNotifications.length > MAX_NOTIFICATIONS) {
        return updatedNotifications.slice(-MAX_NOTIFICATIONS);
    }

    return updatedNotifications;
};

export const gameReducer = (state, action) => {
    switch (action.type) {
        case 'GENERATE_TERRAIN_FEATURES': {
            const features = generateTerrainFeatures(state.player.q, state.player.r, 15);
            return { ...state, linearFeatures: features, mapGenerated: true };
        }

        case 'MOVE_PLAYER': {
            const { target } = action;
            const distance = hexDistance(state.player, target);

            if (distance > 1 || state.gameOver) return state;

            const targetHex = state.hexes.get(`${target.q},${target.r}`);
            if (!targetHex) return state;

            const terrain = TERRAIN_TYPES[targetHex.terrain];

            if (!terrain.passable) return state;

            // Check weight restrictions
            if (terrain.minWeight > 0 && state.weight < terrain.minWeight) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: terrain.name === 'River' ? 'drowned' : 'sank',
                    currentThought: terrain.name === 'River' ?
                        "The current sweeps you away..." :
                        "You sink into the quicksand...",
                    notifications: addNotification(state.notifications, {
                        type: 'death',
                        message: terrain.name === 'River' ?
                            "You tried to cross the river but the current was too strong!" :
                            "The quicksand pulled you down into its depths!"
                    })
                };
            }

            // Calculate movement costs
            const energyCost = terrain.energyCost;
            let newEnergy = Math.max(0, state.energy - energyCost);
            let newFitness = state.fitness;
            let newWeight = Math.max(0.1, state.weight - 0.05);
            let newNotifications = [...state.notifications];

            // Terrain-based fitness loss
            if (terrain.fitnessRisk > 0 && Math.random() < terrain.fitnessRisk) {
                const damage = 15;
                newFitness = Math.max(0, state.fitness - damage);
                newNotifications = addNotification(newNotifications, {
                    type: 'injury',
                    message: `Moving through ${terrain.name} caused injury! -${damage} fitness`
                });
            }

            // Natural healing
            newFitness = Math.min(100, newFitness + HEALING_RATE);

            // Check for death conditions
            if (newEnergy <= 0) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: 'starved',
                    currentThought: "Your body finally gives in to exhaustion...",
                    notifications: addNotification(newNotifications, {
                        type: 'death',
                        message: "You collapse from exhaustion and starvation!"
                    })
                };
            }

            if (newFitness <= 0) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: 'injuries',
                    currentThought: "Your wounds prove too severe...",
                    notifications: addNotification(newNotifications, {
                        type: 'death',
                        message: "Your accumulated injuries prove fatal!"
                    })
                };
            }

            // Move creatures around
            const newCreatures = new Map(state.creatures);
            for (const [hexKey, creatures] of state.creatures.entries()) {
                const updatedCreatures = creatures.filter(creature => {
                    if (Math.random() < ROAMING_RATE) {
                        return false;
                    }
                    return true;
                });
                if (updatedCreatures.length > 0) {
                    newCreatures.set(hexKey, updatedCreatures);
                } else {
                    newCreatures.delete(hexKey);
                }
            }

            return {
                ...state,
                player: { q: target.q, r: target.r },
                energy: newEnergy,
                fitness: newFitness,
                weight: newWeight,
                moveNumber: state.moveNumber + 1,
                selectedHex: null,
                hoveredHex: null,
                creatures: newCreatures,
                notifications: newNotifications,
                currentThought: THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]
            };
        }

        case 'GENERATE_HEX': {
            const { q, r } = action;
            const key = `${q},${r}`;

            if (state.hexes.has(key)) return state;

            const terrain = generateTerrain(q, r, state.hexes, state.linearFeatures);

            const newHex = {
                q, r, terrain,
                visited: false,
                visible: false,
                inRange: false
            };

            const newHexes = new Map(state.hexes);
            newHexes.set(key, newHex);

            return { ...state, hexes: newHexes };
        }

        case 'UPDATE_VISIBILITY': {
            const newHexes = calculateVisibility(state.player, state.hexes);
            return { ...state, hexes: newHexes };
        }

        case 'SPAWN_CREATURES': {
            if (state.gameOver) return state;

            const playerKey = `${state.player.q},${state.player.r}`;
            const playerHex = state.hexes.get(playerKey);

            if (!playerHex) return state;

            const speciesDistribution = HABITAT_SPECIES[playerHex.terrain] || {};
            const speciesNames = Object.keys(speciesDistribution);
            const currentCreatures = state.creatures.get(playerKey) || [];

            if (speciesNames.length > 0 && currentCreatures.length < MAX_CREATURES_PER_HEX) {
                const newCreatures = [...currentCreatures];

                for (const species of speciesNames) {
                    if (newCreatures.length >= MAX_CREATURES_PER_HEX) break;

                    const encounterChance = speciesDistribution[species];
                    if (Math.random() < encounterChance) {
                        const speciesData = SPECIES_DATA[species];
                        const minAge = speciesData.minimumAge || 0.1;
                        const creature = {
                            id: `${species}-${Date.now()}-${Math.random()}`,
                            species,
                            size: minAge + (1 - minAge) * Math.random(),
                            behavior: 'neutral',
                            spawnTurn: state.moveNumber
                        };
                        newCreatures.push(creature);
                    }
                }

                const newCreaturesMap = new Map(state.creatures);
                if (newCreatures.length > 0) {
                    newCreaturesMap.set(playerKey, newCreatures);
                }

                return { ...state, creatures: newCreaturesMap };
            }

            return state;
        }

        case 'ATTACK_CREATURE': {
            const { creatureId } = action;
            if (state.gameOver) return state;

            const playerKey = `${state.player.q},${state.player.r}`;
            const creatures = state.creatures.get(playerKey) || [];
            const targetCreature = creatures.find(c => c.id === creatureId);

            if (!targetCreature) return state;

            const speciesData = SPECIES_DATA[targetCreature.species];
            const fiercenessRatio = calculateFiercenessRatio(state.weight, state.fitness, speciesData, targetCreature.size);
            const agilityRatio = calculateAgilityRatio(state.weight, speciesData);

            let newState = { ...state };
            let newNotifications = [...state.notifications];
            let combatLog = [];

            // Original Big Al combat logic: Fierceness check THEN agility check
            if (fiercenessRatio < 1) {
                // Player is stronger than the creature
                if (agilityRatio < 1) {
                    // Successfully caught and killed
                    combatLog.push(`You attack the ${targetCreature.species}!`);

                    // Check for struggle injuries
                    const injuryAmount = calculateInjuries(fiercenessRatio);
                    if (injuryAmount > 10) {
                        newState.fitness = Math.max(0, state.fitness - injuryAmount);
                        combatLog.push(`There is a struggle and you are injured (-${Math.round(injuryAmount)} fitness)`);
                    }

                    // Remove the killed creature
                    const updatedCreatures = creatures.filter(c => c.id !== creatureId);
                    const newCreaturesMap = new Map(state.creatures);
                    if (updatedCreatures.length > 0) {
                        newCreaturesMap.set(playerKey, updatedCreatures);
                    } else {
                        newCreaturesMap.delete(playerKey);
                    }
                    newState.creatures = newCreaturesMap;

                    // Original Big Al eating system
                    const nutritionValue = speciesData.nutrition * targetCreature.size;
                    const energyValue = (nutritionValue / state.weight) * 100 * ENERGY_PER_BODYWEIGHT;

                    if (energyValue > (100 - state.energy)) {
                        // Excess energy becomes weight
                        const energySurplus = energyValue - (100 - state.energy);
                        const weightValue = 0.01 * energySurplus / ENERGY_PER_BODYWEIGHT * state.weight;
                        newState.weight = Math.min(MAX_WEIGHT, state.weight + weightValue);
                        newState.energy = 100;
                        newState.score = state.score + Math.round(ENERGY_PER_BODYWEIGHT * weightValue / state.weight * 10);
                        combatLog.push(`You kill and eat the ${targetCreature.species} (+${Math.round(weightValue * 1000)}g weight)`);
                    } else {
                        newState.energy = Math.min(100, state.energy + energyValue);
                        combatLog.push(`You kill and eat the ${targetCreature.species} (+${Math.round(energyValue)} energy)`);
                    }

                } else {
                    // Prey was too fast and escaped
                    combatLog.push(`The ${targetCreature.species} was too fast for you - it escaped before you could kill it!`);
                    newState.energy = Math.max(0, state.energy - 6);

                    // Remove escaped creature
                    const updatedCreatures = creatures.filter(c => c.id !== creatureId);
                    const newCreaturesMap = new Map(state.creatures);
                    if (updatedCreatures.length > 0) {
                        newCreaturesMap.set(playerKey, updatedCreatures);
                    } else {
                        newCreaturesMap.delete(playerKey);
                    }
                    newState.creatures = newCreaturesMap;
                }
            } else {
                // Creature is stronger - player loses the fight
                const injuries = calculateInjuries(fiercenessRatio);
                newState.fitness = Math.max(0, state.fitness - injuries);
                newState.energy = Math.max(0, state.energy - 10);
                combatLog.push(`The ${targetCreature.species} ${speciesData.injury}!`);
                combatLog.push(`You take ${Math.round(injuries)} damage and are driven away!`);

                // Creature disappears after driving you off
                const updatedCreatures = creatures.filter(c => c.id !== creatureId);
                const newCreaturesMap = new Map(state.creatures);
                if (updatedCreatures.length > 0) {
                    newCreaturesMap.set(playerKey, updatedCreatures);
                } else {
                    newCreaturesMap.delete(playerKey);
                }
                newState.creatures = newCreaturesMap;

                if (newState.fitness <= 0) {
                    newState.gameOver = true;
                    newState.gamePhase = 'dead';
                    newState.deathReason = 'combat';
                    newState.currentThought = `The ${targetCreature.species} proved too powerful...`;
                }
            }

            // Add combat notification
            newNotifications = addNotification(newNotifications, {
                type: 'combat',
                message: combatLog.join(' ')
            });

            newState.notifications = newNotifications;
            newState.currentThought = combatLog[0] || "The battle rages...";

            return newState;
        }

        case 'DISMISS_NOTIFICATION': {
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.id)
            };
        }

        case 'AUTO_DISMISS_NOTIFICATIONS': {
            const now = Date.now();
            return {
                ...state,
                notifications: state.notifications.filter(n =>
                    (now - n.timestamp) < NOTIFICATION_AUTO_DISMISS_TIME
                )
            };
        }

        case 'RESTART_GAME': {
            return {
                ...initialGameState,
                hexes: new Map()
            };
        }

        case 'SELECT_HEX': {
            return { ...state, selectedHex: action.hex };
        }

        case 'HOVER_HEX': {
            return { ...state, hoveredHex: action.hex };
        }

        case 'CLEAR_HOVER': {
            return { ...state, hoveredHex: null };
        }

        default:
            return state;
    }
};