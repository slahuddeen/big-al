﻿// ==================== UPDATED GAME STATE WITH SIMPLIFIED HATCHLING PROGRESSION ====================
import { hexDistance, getHexNeighbors } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries } from '../utils/combatUtils.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { generateTerrainFeatures, generateTerrain, applyEcologicalPostProcessing } from '../utils/terrainGeneration.js';
import {
    MAX_WEIGHT,
    HEALING_RATE,
    ENERGY_PER_BODYWEIGHT,
    ROAMING_RATE,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS
} from './gameConstants.js';

// Original Big Al level system
export const LEVEL_NAMES = ['', 'hatchling', 'juvenile', 'sub-adult', 'adult'];
export const LEVEL_WEIGHTS = [0, 10, 500, 2000, 2500]; // kg thresholds for each level

export const initialGameState = {
    player: { q: 0, r: 0 },
    hexes: new Map(),
    selectedHex: null,
    hoveredHex: null,

    // Hatchling starting stats - much more challenging!
    level: 1, // Start as hatchling
    weight: 0.2, // 200 grams - tiny baby dinosaur!
    energy: 100, // Full energy to start
    fitness: 100, // Perfect health as newborn
    score: 0, // No score yet
    moveNumber: 0,

    // Decision system from original (for level progression)
    decision: '', // Player decisions for different levels
    levelData: '', // Additional data for current level

    // Creatures system
    creatures: new Map(),

    // Linear features for advanced terrain generation
    linearFeatures: [],
    mapGenerated: false,

    // Notifications and events
    notifications: [],
    currentThought: "You are just a tiny hatchling... everything seems so big!",

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

// Check if player should level up
const checkLevelUp = (weight, currentLevel) => {
    if (currentLevel < LEVEL_WEIGHTS.length - 1 && weight > LEVEL_WEIGHTS[currentLevel]) {
        return currentLevel + 1;
    }
    return currentLevel;
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

            // Check for quicksand - instant death!
            if (targetHex.terrain === 'quicksand') {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: 'sank',
                    currentThought: "You step into the quicksand and sink rapidly...",
                    notifications: addNotification(state.notifications, {
                        type: 'death',
                        message: "You stepped into quicksand and were pulled down into its depths!"
                    })
                };
            }

            if (!terrain.passable) return state;

            // Check weight restrictions for rivers - hatchlings are too small!
            if (terrain.minWeight > 0 && state.weight < terrain.minWeight) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: terrain.name === 'River' ? 'drowned' : 'sank',
                    currentThought: terrain.name === 'River' ?
                        "The current sweeps your tiny body away..." :
                        "You sink into the quicksand...",
                    notifications: addNotification(state.notifications, {
                        type: 'death',
                        message: terrain.name === 'River' ?
                            "You tried to cross the river but you're too small! The current swept you away!" :
                            "The quicksand pulled you down into its depths!"
                    })
                };
            }

            // Movement costs scale with size - smaller dinosaurs lose less energy per move but also less weight
            const baseEnergyCost = terrain.energyCost;
            const sizeMultiplier = Math.max(0.3, state.weight / 100); // Smaller dinos use less energy
            const energyCost = Math.round(baseEnergyCost * sizeMultiplier);

            let newEnergy = Math.max(0, state.energy - energyCost);
            let newFitness = state.fitness;

            // Weight loss scales with size - smaller dinos lose weight faster relatively
            const weightLossRate = 0.001 + (0.1 / Math.max(1, state.weight)); // Higher rate for smaller dinos
            let newWeight = Math.max(0.1, state.weight - weightLossRate);
            let newNotifications = [...state.notifications];

            // Terrain-based fitness loss
            if (terrain.fitnessRisk > 0 && Math.random() < terrain.fitnessRisk) {
                const damage = Math.round(15 * (state.weight / 50)); // Scale damage with size
                newFitness = Math.max(0, state.fitness - damage);
                newNotifications = addNotification(newNotifications, {
                    type: 'injury',
                    message: `Moving through ${terrain.name} caused injury! -${damage} fitness`
                });
            }

            // Natural healing
            newFitness = Math.min(100, newFitness + HEALING_RATE);

            // Check for level progression
            const newLevel = checkLevelUp(newWeight, state.level);
            let levelUpNotification = null;

            if (newLevel > state.level) {
                levelUpNotification = {
                    type: 'success',
                    message: `🎉 Congratulations! You've grown into a ${LEVEL_NAMES[newLevel]}! 🎉`
                };
                newNotifications = addNotification(newNotifications, levelUpNotification);

                // Special level-up bonuses
                if (newLevel === 2) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "🎖️ You're now independent! You can hunt bigger prey safely."
                    });
                } else if (newLevel === 3) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "💪 Sub-adult power! Most smaller creatures flee from you now."
                    });
                } else if (newLevel === 4) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "👑 Apex predator achieved! You rule the Jurassic world!"
                    });
                }
            }

            // Check for death conditions
            if (newEnergy <= 0) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: 'starved',
                    currentThought: "Your tiny body finally gives in to hunger...",
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
                    currentThought: "Your wounds prove too severe for such a small body...",
                    notifications: addNotification(newNotifications, {
                        type: 'death',
                        message: "Your injuries prove fatal!"
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

            // Generate appropriate thought for new level
            let newThought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
            if (newLevel === 1) {
                const hatchlingThoughts = [
                    "Everything looks so big and scary...",
                    "Maybe that tiny bug looks tasty?",
                    "You need to find small prey to survive...",
                    "Your stomach rumbles - you need food!",
                    "Those bigger dinosaurs look terrifying..."
                ];
                newThought = hatchlingThoughts[Math.floor(Math.random() * hatchlingThoughts.length)];
            } else if (newLevel === 2) {
                const juvenileThoughts = [
                    "You're getting stronger, but still need to be careful...",
                    "Medium-sized prey might be within reach now...",
                    "You feel more confident, but not invincible...",
                    "The world seems a bit less threatening now..."
                ];
                newThought = juvenileThoughts[Math.floor(Math.random() * juvenileThoughts.length)];
            }

            return {
                ...state,
                player: { q: target.q, r: target.r },
                level: newLevel,
                energy: newEnergy,
                fitness: newFitness,
                weight: newWeight,
                moveNumber: state.moveNumber + 1,
                selectedHex: null,
                hoveredHex: null,
                creatures: newCreatures,
                notifications: newNotifications,
                currentThought: newThought
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
                discovered: false,
                inRange: false
            };

            const newHexes = new Map(state.hexes);
            newHexes.set(key, newHex);

            const processedHexes = applyEcologicalPostProcessing(newHexes, state.linearFeatures);

            return { ...state, hexes: processedHexes };
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

            // Increase creature spawn rates for hatchlings to give more hunting opportunities
            // But scale based on level - hatchlings get more small creatures
            let spawnRateMultiplier = 1.0;
            if (state.level === 1) {
                spawnRateMultiplier = 2.0; // Double spawn rate for hatchlings
            } else if (state.level === 2) {
                spawnRateMultiplier = 1.5; // More creatures for juveniles too
            }

            const speciesDistribution = HABITAT_SPECIES[playerHex.terrain] || {};
            const speciesNames = Object.keys(speciesDistribution);
            const currentCreatures = state.creatures.get(playerKey) || [];

            if (speciesNames.length > 0) {
                const newCreatures = [...currentCreatures];

                for (const species of speciesNames) {
                    let encounterChance = speciesDistribution[species] * spawnRateMultiplier;

                    // Extra boost for tiny creatures when you're a hatchling
                    if (state.level === 1 && ['Dragonfly', 'Centipede', 'Scorpion'].includes(species)) {
                        encounterChance *= 3.0; // Triple chance for smallest prey
                    }

                    // Reduce chance of very dangerous creatures for small players
                    if (state.level <= 2 && ['Male Allosaurus', 'Female Allosaurus', 'Stegosaurus'].includes(species)) {
                        encounterChance *= 0.2; // Much lower chance of apex predators
                    }

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

            // Combat is much more dangerous for hatchlings!
            if (fiercenessRatio < 1) {
                if (agilityRatio < 1) {
                    // Successfully caught and killed
                    combatLog.push(`You attack the ${targetCreature.species}!`);

                    const injuryAmount = calculateInjuries(fiercenessRatio);
                    if (injuryAmount > 5) { // Lower threshold for hatchlings
                        newState.fitness = Math.max(0, state.fitness - injuryAmount);
                        combatLog.push(`The struggle injures your small body (-${Math.round(injuryAmount)} fitness)`);
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

                    // Eating system - small amounts of food are very significant for hatchlings
                    const nutritionValue = speciesData.nutrition * targetCreature.size;
                    const energyValue = (nutritionValue / Math.max(0.1, state.weight)) * 100 * ENERGY_PER_BODYWEIGHT;

                    if (energyValue > (100 - state.energy)) {
                        const energySurplus = energyValue - (100 - state.energy);
                        const weightValue = 0.01 * energySurplus / ENERGY_PER_BODYWEIGHT * state.weight;
                        newState.weight = Math.min(MAX_WEIGHT, state.weight + weightValue);
                        newState.energy = 100;
                        newState.score = state.score + Math.round(ENERGY_PER_BODYWEIGHT * weightValue / state.weight * 10);

                        if (state.level === 1 && weightValue > 0.001) {
                            combatLog.push(`You devour the ${targetCreature.species}! (+${Math.round(weightValue * 1000)}g - every gram counts!)`);
                        } else {
                            combatLog.push(`You kill and eat the ${targetCreature.species} (+${Math.round(weightValue * 1000)}g weight)`);
                        }
                    } else {
                        newState.energy = Math.min(100, state.energy + energyValue);
                        combatLog.push(`You kill and eat the ${targetCreature.species} (+${Math.round(energyValue)} energy)`);
                    }

                } else {
                    combatLog.push(`The ${targetCreature.species} was too fast - it escaped!`);
                    newState.energy = Math.max(0, state.energy - 6);

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
                // Much more dangerous for hatchlings!
                const injuries = calculateInjuries(fiercenessRatio) * (state.level <= 2 ? 2 : 1); // Double damage for small dinosaurs
                newState.fitness = Math.max(0, state.fitness - injuries);
                newState.energy = Math.max(0, state.energy - 15);
                combatLog.push(`The ${targetCreature.species} ${speciesData.injury}!`);
                combatLog.push(`Your small body takes ${Math.round(injuries)} damage!`);

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
                    newState.currentThought = state.level === 1 ?
                        `The ${targetCreature.species} was too much for a tiny hatchling...` :
                        `The ${targetCreature.species} proved too powerful...`;
                }
            }

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