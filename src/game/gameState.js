// ==================== ENHANCED GAME STATE WITH SIZE-BASED PREY SCALING ====================
import { hexDistance, getHexNeighbors } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries, calculateEnergyGain } from '../utils/combatUtils.js';
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

// NEW: Prey size categories for scaling
export const PREY_SIZE_CATEGORIES = {
    'tiny': ['Dragonfly', 'Centipede', 'Beetle', 'Cricket', 'Worm'],
    'small': ['Scorpion', 'Frog', 'Lizard'],
    'medium': ['Sphenodontian', 'Dryosaurus', 'Othnielia', 'Pterosaur', 'Injured Pterosaur'],
    'large': ['Ornitholestes', 'Juvenile Allosaurus', 'Crocodile'],
    'huge': ['Stegosaurus', 'Male Allosaurus', 'Female Allosaurus']
};

// NEW: Calculate size-based spawn multipliers
const getPreySizeMultiplier = (playerLevel, playerWeight, speciesName) => {
    let category = 'medium';
    for (const [cat, species] of Object.entries(PREY_SIZE_CATEGORIES)) {
        if (species.includes(speciesName)) {
            category = cat;
            break;
        }
    }

    // Base multipliers based on player size
    const multipliers = {
        1: { tiny: 4.0, small: 1.5, medium: 0.3, large: 0.1, huge: 0.02 }, // Hatchling
        2: { tiny: 2.0, small: 2.0, medium: 1.0, large: 0.4, huge: 0.1 },  // Juvenile  
        3: { tiny: 0.5, small: 1.5, medium: 2.0, large: 1.5, huge: 0.5 },  // Sub-adult
        4: { tiny: 0.1, small: 0.5, medium: 1.5, large: 2.0, huge: 1.5 }   // Adult
    };

    // Further reduce tiny prey for heavier dinosaurs
    let multiplier = multipliers[playerLevel][category];

    if (category === 'tiny' && playerWeight > 50) {
        multiplier *= Math.max(0.05, 1 / (playerWeight / 10)); // Dramatic reduction
    } else if (category === 'small' && playerWeight > 200) {
        multiplier *= Math.max(0.2, 1 / (playerWeight / 50));
    }

    return multiplier;
};

// NOTE: calculateEnergyGain is imported from combatUtils.js - using the safe version with NaN protection

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
            const features = generateTerrainFeatures(state.player.q, state.player.r, 6);
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

            // ENHANCED: Movement costs scale more dramatically with size
            const baseEnergyCost = terrain.energyCost;
            // Larger dinosaurs use more energy per move (realistic metabolism)
            const sizeMultiplier = Math.max(0.3, Math.pow(state.weight / 100, 0.7));
            const energyCost = Math.round(baseEnergyCost * sizeMultiplier);

            let newEnergy = Math.max(0, state.energy - energyCost);
            let newFitness = state.fitness;

            // ENHANCED: Weight loss scales more realistically
            // Larger dinosaurs lose weight slower per move but need more food
            const metabolismRate = 0.001 + (0.05 / Math.max(1, Math.pow(state.weight, 0.5)));
            let newWeight = Math.max(0.1, state.weight - metabolismRate);
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

                // Special level-up bonuses with hunting advice
                if (newLevel === 2) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "🎖️ You're now independent! Tiny bugs won't satisfy you much anymore - hunt lizards and frogs!"
                    });
                } else if (newLevel === 3) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "💪 Sub-adult power! Small prey is becoming scarce - target medium creatures!"
                    });
                } else if (newLevel === 4) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "👑 Apex predator! Only large prey will sustain you now - but you're powerful enough to take it!"
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
                    currentThought: state.level === 1 ?
                        "Your tiny body finally gives in to hunger..." :
                        "Even your massive body cannot survive without food...",
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
                    "Those tiny insects aren't as satisfying anymore...",
                    "The world seems a bit less threatening now..."
                ];
                newThought = juvenileThoughts[Math.floor(Math.random() * juvenileThoughts.length)];
            } else if (newLevel >= 3) {
                const largeThoughts = [
                    "Small prey barely registers as a snack...",
                    "You need substantial meals to survive now...",
                    "Your size demands bigger, more dangerous prey...",
                    "The hunt for worthy prey continues..."
                ];
                newThought = largeThoughts[Math.floor(Math.random() * largeThoughts.length)];
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

            const speciesDistribution = HABITAT_SPECIES[playerHex.terrain] || {};
            const speciesNames = Object.keys(speciesDistribution);
            const currentCreatures = state.creatures.get(playerKey) || [];

            if (speciesNames.length > 0) {
                const newCreatures = [...currentCreatures];

                for (const species of speciesNames) {
                    let baseEncounterChance = speciesDistribution[species];

                    // ENHANCED: Apply size-based multiplier
                    const sizeMultiplier = getPreySizeMultiplier(state.level, state.weight, species);
                    let encounterChance = baseEncounterChance * sizeMultiplier;

                    // Additional danger scaling for very small predators
                    if (state.level <= 2 && ['Male Allosaurus', 'Female Allosaurus', 'Stegosaurus'].includes(species)) {
                        encounterChance *= 0.1; // Much lower chance of apex predators
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
                        combatLog.push(`The struggle injures you (-${Math.round(injuryAmount)} fitness)`);
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

                    // ENHANCED: New energy system - realistic energy gain using safe function
                    const energyGain = calculateEnergyGain(speciesData, targetCreature.size, state.weight, state.level);
                    const newEnergy = Math.min(100, state.energy + energyGain);

                    // Weight gain only if energy is nearly full (representing proper nutrition)
                    if (newEnergy >= 95 && energyGain > 10) {
                        const weightGain = (energyGain * 0.01) * Math.pow(targetCreature.size, 0.8);
                        newState.weight = Math.min(MAX_WEIGHT, state.weight + weightGain);
                        newState.energy = 100;
                        newState.score = state.score + Math.round(weightGain * 100);

                        combatLog.push(`You devour the ${targetCreature.species}! (+${Math.round(weightGain * 1000)}g weight, full energy)`);
                    } else {
                        newState.energy = newEnergy;
                        newState.score = state.score + Math.round(energyGain);

                        // Give feedback about energy gain based on prey size
                        if (energyGain < 5) {
                            combatLog.push(`You eat the ${targetCreature.species}, but it barely satisfies you (+${Math.round(energyGain)} energy)`);
                        } else if (energyGain < 15) {
                            combatLog.push(`You eat the ${targetCreature.species} (+${Math.round(energyGain)} energy)`);
                        } else {
                            combatLog.push(`You feast on the ${targetCreature.species}! (+${Math.round(energyGain)} energy)`);
                        }
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
                // Much more dangerous for small dinosaurs!
                const injuries = calculateInjuries(fiercenessRatio) * (state.level <= 2 ? 2 : 1); // Double damage for small dinosaurs
                newState.fitness = Math.max(0, state.fitness - injuries);
                newState.energy = Math.max(0, state.energy - 15);
                combatLog.push(`The ${targetCreature.species} ${speciesData.injury}!`);
                combatLog.push(`You take ${Math.round(injuries)} damage!`);

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