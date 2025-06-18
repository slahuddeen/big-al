// ==================== ENHANCED GAME STATE WITH CREATURE BEHAVIORS ====================
import { hexDistance, getHexNeighbors } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries, calculateEnergyGain } from '../utils/combatUtils.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { generateTerrainFeatures, generateTerrain, applyEcologicalPostProcessing } from '../utils/terrainGeneration.js';
import { executeCreatureBehavior } from '../utils/creatureBehaviors.js'; // Import the new behavior system
import {
    MAX_WEIGHT,
    HEALING_RATE,
    ENERGY_PER_BODYWEIGHT,
    ROAMING_RATE,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS
} from './gameConstants.js';

// Enhanced Big Al level system with adjusted thresholds for 300g start
export const LEVEL_NAMES = ['', 'hatchling', 'juvenile', 'sub-adult', 'adult'];
export const LEVEL_WEIGHTS = [0, 15, 600, 2200, 2700]; // Adjusted thresholds for 300g start

// Enhanced prey size categories for better scaling (worms and beetles removed)
export const PREY_SIZE_CATEGORIES = {
    'tiny': ['Dragonfly', 'Centipede', 'Cricket', 'Scorpion'],
    'small': ['Frog', 'Lizard', 'Mammal', 'Fish', 'Sphenodontian'],
    'medium': ['Dryosaurus', 'Othnielia', 'Pterosaur', 'Injured Pterosaur', 'Compsognathus', 'Coelurus', 'Hesperornithoides'],
    'large': ['Ornitholestes', 'Juvenile Allosaurus', 'Crocodile', 'Camptosaurus'],
    'huge': ['Stegosaurus', 'Male Allosaurus', 'Female Allosaurus', 'Ceratosaurus', 'Torvosaurus', 'Diplodocus', 'Brachiosaurus']
};

// Enhanced behavior log size limit and max creatures per hex
const MAX_BEHAVIOR_LOG_SIZE = 15;
const MAX_CREATURES_PER_HEX = 5; // Maximum 5 creatures per hex tile

// Enhanced size-based spawn multipliers with better hatchling focus
const getPreySizeMultiplier = (playerLevel, playerWeight, speciesName) => {
    let category = 'medium';
    for (const [cat, species] of Object.entries(PREY_SIZE_CATEGORIES)) {
        if (species.includes(speciesName)) {
            category = cat;
            break;
        }
    }

    // Enhanced multipliers - tiny prey is MUCH more common for hatchlings
    const multipliers = {
        1: { tiny: 6.0, small: 2.0, medium: 0.2, large: 0.05, huge: 0.01 }, // Hatchling - loves tiny prey
        2: { tiny: 3.0, small: 3.0, medium: 1.2, large: 0.3, huge: 0.08 },  // Juvenile  
        3: { tiny: 0.4, small: 1.8, medium: 2.5, large: 2.0, huge: 1.0 },   // Sub-adult
        4: { tiny: 0.08, small: 0.3, medium: 2.0, large: 3.0, huge: 3.5 }   // Adult
    };

    let multiplier = multipliers[playerLevel][category];

    // Less harsh reduction for tiny prey at 300g - they should still be viable
    if (category === 'tiny' && playerWeight > 1.0) { // Only start reducing above 1kg
        multiplier *= Math.max(0.1, 1 / (playerWeight / 20)); // Gentler reduction
    } else if (category === 'small' && playerWeight > 5.0) {
        multiplier *= Math.max(0.15, 1 / (playerWeight / 100));
    }

    return multiplier;
};

export const initialGameState = {
    player: { q: 0, r: 0 },
    hexes: new Map(),
    selectedHex: null,
    hoveredHex: null,

    // Enhanced hatchling starting stats - 300g baby!
    level: 1,
    weight: 0.3, // 300 grams - proper hatchling size!
    energy: 100,
    fitness: 100,
    score: 0,
    moveNumber: 0,

    decision: '',
    levelData: '',

    // Creatures system
    creatures: new Map(),
    creatureBehaviorLog: [], // New: Track creature actions

    // Linear features for advanced terrain generation
    linearFeatures: [],
    mapGenerated: false,

    // Notifications and events
    notifications: [],
    currentThought: "You are a tiny hatchling... but those bugs look delicious!",

    // Game state
    gamePhase: 'exploring',
    gameOver: false,
    deathReason: null,
};

// Helper function to check if a creature should attempt escape
const attemptCreatureEscape = (speciesData, creatureSize, playerWeight, playerLevel) => {
    // Escape chances based on creature agility and size difference
    const escapeBaseChance = {
        'Dragonfly': 0.4,    // Very hard to catch
        'Cricket': 0.25,     // Quick hoppers
        'Centipede': 0.1,    // Slower ground dwellers
        'Mammal': 0.2,       // Quick and nervous
        'Scorpion': 0.15,    // Defensive but not super fast
        'Frog': 0.2,         // Can leap away
        'Lizard': 0.25,      // Quick but not as agile as bugs
    };

    const speciesName = Object.keys(SPECIES_DATA).find(name =>
        SPECIES_DATA[name] === speciesData
    );

    let baseEscape = escapeBaseChance[speciesName] || 0.1;

    // Higher escape chance for tiny creatures vs bigger predators
    const sizeRatio = (speciesData.weight * creatureSize) / playerWeight;
    if (sizeRatio < 0.01) {
        baseEscape += 0.3; // Much higher escape chance for tiny prey
    } else if (sizeRatio < 0.1) {
        baseEscape += 0.15;
    }

    // Hatchlings are clumsy hunters
    if (playerLevel === 1) {
        baseEscape += 0.2; // 20% higher escape chance against hatchlings
    }

    return Math.random() < Math.min(0.7, baseEscape); // Cap at 70% escape chance
};

// Helper function to add notifications with limits
const addNotification = (notifications, newNotification) => {
    const notification = {
        id: Date.now(),
        timestamp: Date.now(),
        ...newNotification
    };

    const updatedNotifications = [...notifications, notification];

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

// ENHANCED: Process creature behaviors with improved logging and cooldowns
const processCreatureBehaviors = (gameState, dispatch) => {
    const newCreatures = new Map(gameState.creatures);
    const behaviorLog = [];
    let behaviorCount = 0;
    let successfulBehaviors = 0;

    // Process all creatures on the map
    for (const [hexKey, creatures] of gameState.creatures.entries()) {
        const [q, r] = hexKey.split(',').map(Number);
        const hex = { q, r };
        const updatedCreatures = [];

        for (const creature of creatures) {
            behaviorCount++;
            try {
                const behavior = executeCreatureBehavior(creature, hex, gameState, dispatch);

                if (behavior) {
                    successfulBehaviors++;

                    // Add debug logging in development
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`🦖 ${creature.species} executed: ${behavior.action}`);
                    }

                    switch (behavior.action) {
                        case 'attack_player':
                        case 'ambush_attack':
                        case 'territorial_attack':
                        case 'defensive_attack':
                        case 'aerial_attack':
                        case 'swoop_attack':
                        case 'rival_attack':
                        case 'casual_defense':
                        case 'defensive_strike':
                            // Creature attacks player
                            if (hexDistance(hex, gameState.player) <= 1) {
                                behaviorLog.push({
                                    type: 'creature_attack',
                                    creature: creature.species,
                                    message: behavior.message,
                                    damage: behavior.damage
                                });
                            }
                            updatedCreatures.push(creature);
                            break;

                        case 'move':
                        case 'flee':
                        case 'roam':
                        case 'move_to_preferred':
                        case 'hunt_from_above':
                        case 'chase_competitor':
                            // Move creature to new hex
                            if (behavior.target) {
                                const targetKey = `${behavior.target.q},${behavior.target.r}`;
                                const targetHex = gameState.hexes.get(targetKey);
                                const targetCreatures = newCreatures.get(targetKey) || [];

                                // FIXED: Check if target hex has room for more creatures
                                if (targetHex && TERRAIN_TYPES[targetHex.terrain].passable && targetCreatures.length < MAX_CREATURES_PER_HEX) {
                                    // Remove from current hex (will be added to target hex)
                                    targetCreatures.push(creature);
                                    newCreatures.set(targetKey, targetCreatures);

                                    if (behavior.message) {
                                        behaviorLog.push({
                                            type: 'creature_movement',
                                            creature: creature.species,
                                            message: behavior.message
                                        });
                                    }
                                } else {
                                    // Can't move (no room or impassable), stay in place
                                    updatedCreatures.push(creature);
                                }
                            } else {
                                updatedCreatures.push(creature);
                            }
                            break;

                        case 'warning':
                        case 'intimidate':
                        case 'defensive_posture':
                            // Display message
                            if (hexDistance(hex, gameState.player) <= 2) {
                                behaviorLog.push({
                                    type: 'creature_display',
                                    creature: creature.species,
                                    message: behavior.message
                                });
                            }
                            updatedCreatures.push(creature);
                            break;

                        default:
                            // Default: creature stays in place
                            updatedCreatures.push(creature);
                            break;
                    }
                } else {
                    // No behavior executed, creature stays
                    updatedCreatures.push(creature);
                }
            } catch (error) {
                console.error('Error processing creature behavior:', error);
                updatedCreatures.push(creature); // Keep creature if behavior fails
            }
        }

        // Update creatures in current hex
        if (updatedCreatures.length > 0) {
            newCreatures.set(hexKey, updatedCreatures);
        } else {
            newCreatures.delete(hexKey);
        }
    }

    // Log behavior statistics in development
    if (process.env.NODE_ENV === 'development' && behaviorCount > 0) {
        console.log(`🧠 Creature AI: ${successfulBehaviors}/${behaviorCount} behaviors executed`);
    }

    return { creatures: newCreatures, behaviorLog };
};

// ENHANCED: Apply creature behavior results to game state
const applyCreatureBehaviorResults = (gameState, behaviorLog) => {
    let newState = { ...gameState };
    let newNotifications = [...gameState.notifications];

    for (const log of behaviorLog) {
        switch (log.type) {
            case 'creature_attack':
                // Creature attacked player
                const damage = Math.round(log.damage * 0.5); // Reduce creature attack damage
                newState.fitness = Math.max(0, newState.fitness - damage);
                newState.energy = Math.max(0, newState.energy - 8);

                newNotifications = addNotification(newNotifications, {
                    type: 'combat',
                    message: `${log.message} You take ${damage} damage!`
                });

                // Check for death
                if (newState.fitness <= 0) {
                    newState.gameOver = true;
                    newState.gamePhase = 'dead';
                    newState.deathReason = 'combat';
                    newState.currentThought = `The ${log.creature} proved too dangerous...`;
                }
                break;

            case 'creature_movement':
                // Only show movement notifications for important events
                if (hexDistance({ q: 0, r: 0 }, gameState.player) <= 2) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'warning',
                        message: log.message
                    });
                }
                break;

            case 'creature_display':
                // Show threatening displays
                newNotifications = addNotification(newNotifications, {
                    type: 'warning',
                    message: log.message
                });
                break;
        }
    }

    newState.notifications = newNotifications;
    return newState;
};

export const gameReducer = (state, action) => {
    switch (action.type) {
        case 'GENERATE_TERRAIN_FEATURES': {
            const features = generateTerrainFeatures(state.player.q, state.player.r, 2);
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

            // Check weight restrictions for rivers - 300g hatchlings still too small!
            if (terrain.minWeight > 0 && state.weight < terrain.minWeight) {
                return {
                    ...state,
                    gameOver: true,
                    gamePhase: 'dead',
                    deathReason: terrain.name === 'River' ? 'drowned' : 'sank',
                    currentThought: terrain.name === 'River' ?
                        "The current sweeps your small body away..." :
                        "You sink into the terrain...",
                    notifications: addNotification(state.notifications, {
                        type: 'death',
                        message: terrain.name === 'River' ?
                            "You tried to cross the river but you're still too small! The current swept you away!" :
                            "The terrain proved too dangerous for your size!"
                    })
                };
            }

            // Enhanced movement costs - scale better with 300g baseline
            const baseEnergyCost = terrain.energyCost;
            // Cap energy scaling for large dinosaurs
            const sizeMultiplier = Math.max(0.4, Math.min(2.0, Math.pow(state.weight / 150, 0.4))); const energyCost = Math.round(baseEnergyCost * sizeMultiplier);

            let newEnergy = Math.max(0, state.energy - energyCost);
            let newFitness = state.fitness;

            // Enhanced weight loss - adjusted for 300g start
            const metabolismRate = 0.0008 + (0.04 / Math.max(1, Math.pow(state.weight, 0.5)));
            let newWeight = Math.max(0.15, state.weight - metabolismRate); // Minimum 150g
            let newNotifications = [...state.notifications];

            // Terrain-based fitness loss
            if (terrain.fitnessRisk > 0 && Math.random() < terrain.fitnessRisk) {
                const damage = Math.round(12 * Math.max(0.5, state.weight / 100)); // Scale damage appropriately
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

                // Enhanced level-up advice
                if (newLevel === 2) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "🎖️ Independence achieved! Bugs are getting less satisfying - hunt lizards and frogs!"
                    });
                } else if (newLevel === 3) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "💪 Sub-adult power! Small prey won't cut it anymore - target medium creatures!"
                    });
                } else if (newLevel === 4) {
                    newNotifications = addNotification(newNotifications, {
                        type: 'success',
                        message: "👑 Apex predator! Only large prey will sustain your massive frame now!"
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

            // ENHANCED: Process creature behaviors first
            const behaviorResult = processCreatureBehaviors({
                ...state,
                player: { q: target.q, r: target.r },
                moveNumber: state.moveNumber + 1
            });

            // Apply behavior results
            let behaviorState = applyCreatureBehaviorResults(state, behaviorResult.behaviorLog);

            // FIXED: Limit behavior log size to prevent memory issues
            const combinedBehaviorLog = [...(state.creatureBehaviorLog || []), ...behaviorResult.behaviorLog];
            const limitedBehaviorLog = combinedBehaviorLog.slice(-MAX_BEHAVIOR_LOG_SIZE);

            // Generate appropriate thought for new level and size
            let newThought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
            if (newLevel === 1) {
                const hatchlingThoughts = [
                    "Those dragonflies look tasty but so fast!",
                    "Maybe I can catch that centipede...",
                    "Everything is so big, but I can hunt bugs!",
                    "Need to find more insects to grow bigger...",
                    "Those beetles look perfect for my size!"
                ];
                newThought = hatchlingThoughts[Math.floor(Math.random() * hatchlingThoughts.length)];
            } else if (newLevel === 2) {
                const juvenileThoughts = [
                    "Bugs aren't as filling as they used to be...",
                    "Time to hunt some lizards and frogs!",
                    "I'm getting stronger, but still need to be careful...",
                    "Those tiny insects barely register anymore..."
                ];
                newThought = juvenileThoughts[Math.floor(Math.random() * juvenileThoughts.length)];
            }

            return {
                ...behaviorState,
                player: { q: target.q, r: target.r },
                level: newLevel,
                energy: newEnergy,
                fitness: newFitness,
                weight: newWeight,
                moveNumber: state.moveNumber + 1,
                selectedHex: null,
                hoveredHex: null,
                creatures: behaviorResult.creatures,
                creatureBehaviorLog: limitedBehaviorLog, // Use limited log
                notifications: behaviorState.notifications,
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

            // ENHANCED: Update lastSeenTurn for creatures in currently visible hexes
            const newCreatures = new Map(state.creatures);
            for (const [hexKey, creatures] of newCreatures.entries()) {
                const [q, r] = hexKey.split(',').map(Number);
                const hex = newHexes.get(hexKey);

                if (hex && hex.visible && hex.inRange) {
                    // Update lastSeenTurn for all creatures in visible hexes
                    const updatedCreatures = creatures.map(creature => ({
                        ...creature,
                        lastSeenTurn: state.moveNumber
                    }));
                    newCreatures.set(hexKey, updatedCreatures);
                }
            }

            return { ...state, hexes: newHexes, creatures: newCreatures };
        }

        case 'SPAWN_CREATURES': {
            if (state.gameOver) return state;

            const playerKey = `${state.player.q},${state.player.r}`;
            const playerHex = state.hexes.get(playerKey);

            if (!playerHex) return state;

            const speciesDistribution = HABITAT_SPECIES[playerHex.terrain] || {};
            const speciesNames = Object.keys(speciesDistribution);
            const currentCreatures = state.creatures.get(playerKey) || [];

            // FIXED: Check if we've already reached the maximum creatures per hex
            if (currentCreatures.length >= MAX_CREATURES_PER_HEX) {
                return state; // No more spawning if at max capacity
            }

            if (speciesNames.length > 0) {
                const newCreatures = [...currentCreatures];
                let spawnAttempts = 0;
                const maxSpawnAttempts = 10; // Prevent infinite loops

                for (const species of speciesNames) {
                    // FIXED: Stop spawning if we reach the creature limit
                    if (newCreatures.length >= MAX_CREATURES_PER_HEX) {
                        break;
                    }

                    // Prevent too many spawn attempts
                    if (spawnAttempts >= maxSpawnAttempts) {
                        break;
                    }
                    spawnAttempts++;

                    let baseEncounterChance = speciesDistribution[species];

                    // Enhanced size-based multiplier
                    const sizeMultiplier = getPreySizeMultiplier(state.level, state.weight, species);
                    let encounterChance = baseEncounterChance * sizeMultiplier;

                    // Enhanced danger scaling for small predators
                    if (state.level <= 2 && ['Male Allosaurus', 'Female Allosaurus', 'Stegosaurus', 'Torvosaurus'].includes(species)) {
                        encounterChance *= 0.05; // Much lower chance of apex predators
                    }

                    if (Math.random() < encounterChance) {
                        const speciesData = SPECIES_DATA[species];
                        const minAge = speciesData.minimumAge || 0.1;
                        const creature = {
                            id: `${species}-${Date.now()}-${Math.random()}`,
                            species,
                            size: minAge + (1 - minAge) * Math.random(),
                            behavior: 'neutral',
                            spawnTurn: state.moveNumber,
                            lastBehaviorTurn: state.moveNumber, // Track when behavior was last executed
                            lastSeenTurn: state.moveNumber, // ADDED: Track when creature was last seen by player
                            // ENHANCED: Add status tracking
                            health: 100,
                            status: 'normal', // normal, injured, fleeing, aggressive
                            energy: 100
                        };
                        newCreatures.push(creature);

                        // FIXED: Stop if we reach the limit
                        if (newCreatures.length >= MAX_CREATURES_PER_HEX) {
                            break;
                        }
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

            let newState = { ...state };
            let newNotifications = [...state.notifications];
            let combatLog = [];

            // NEW: Check if creature escapes before combat!
            if (attemptCreatureEscape(speciesData, targetCreature.size, state.weight, state.level)) {
                combatLog.push(`The ${targetCreature.species} darts away before you can catch it!`);

                // Remove the escaped creature and use some energy
                const updatedCreatures = creatures.filter(c => c.id !== creatureId);
                const newCreaturesMap = new Map(state.creatures);
                if (updatedCreatures.length > 0) {
                    newCreaturesMap.set(playerKey, updatedCreatures);
                } else {
                    newCreaturesMap.delete(playerKey);
                }

                newState.creatures = newCreaturesMap;
                newState.energy = Math.max(0, state.energy - 4); // Small energy cost for failed hunt

                newNotifications = addNotification(newNotifications, {
                    type: 'warning',
                    message: combatLog[0]
                });

                newState.notifications = newNotifications;
                newState.currentThought = "Too slow! Need to be more careful hunting.";

                return newState;
            }

            // If creature didn't escape, proceed with normal combat
            const fiercenessRatio = calculateFiercenessRatio(state.weight, state.fitness, speciesData, targetCreature.size);
            const agilityRatio = calculateAgilityRatio(state.weight, speciesData);

            // Enhanced combat system
            if (fiercenessRatio < 1) {
                if (agilityRatio < 1) {
                    // Successfully caught and killed
                    combatLog.push(`You successfully hunt the ${targetCreature.species}!`);

                    const injuryAmount = calculateInjuries(fiercenessRatio);
                    if (injuryAmount > 3) { // Lower threshold for smaller dinosaurs
                        newState.fitness = Math.max(0, state.fitness - injuryAmount);
                        combatLog.push(`The struggle causes minor injuries (-${Math.round(injuryAmount)} fitness)`);
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

                    // Enhanced energy system with better scaling for 300g hatchling
                    const energyGain = calculateEnergyGain(speciesData, targetCreature.size, state.weight, state.level);
                    const newEnergy = Math.min(100, state.energy + energyGain);

                    // Weight gain when well-fed - better scaling for hatchling
                    if (newEnergy >= 90 && energyGain > 8) { // Lower threshold for meaningful meals
                        const weightGain = (energyGain * 0.015) * Math.pow(targetCreature.size, 0.8); // Better scaling
                        newState.weight = Math.min(MAX_WEIGHT, state.weight + weightGain);
                        newState.energy = 100;
                        newState.score = state.score + Math.round(weightGain * 150);

                        combatLog.push(`You devour the ${targetCreature.species}! (+${Math.round(weightGain * 1000)}g weight, full energy)`);
                    } else {
                        newState.energy = newEnergy;
                        newState.score = state.score + Math.round(energyGain * 1.5);

                        // Enhanced feedback about energy gain
                        if (energyGain < 3) {
                            combatLog.push(`You eat the ${targetCreature.species}, but it's barely a snack (+${Math.round(energyGain)} energy)`);
                        } else if (energyGain < 10) {
                            combatLog.push(`You eat the ${targetCreature.species} (+${Math.round(energyGain)} energy)`);
                        } else if (energyGain < 20) {
                            combatLog.push(`You enjoy the ${targetCreature.species}! (+${Math.round(energyGain)} energy)`);
                        } else {
                            combatLog.push(`You feast on the ${targetCreature.species}! (+${Math.round(energyGain)} energy)`);
                        }
                    }

                } else {
                    combatLog.push(`The ${targetCreature.species} escapes your clumsy attack!`);
                    newState.energy = Math.max(0, state.energy - 5);

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
                // Dangerous combat - enhanced penalties for small dinosaurs
                const injuries = calculateInjuries(fiercenessRatio) * (state.level <= 2 ? 1.8 : 1);
                newState.fitness = Math.max(0, state.fitness - injuries);
                newState.energy = Math.max(0, state.energy - 12);
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
                        `The ${targetCreature.species} was too dangerous for a small hatchling...` :
                        `The ${targetCreature.species} proved too powerful...`;
                }
            }

            newNotifications = addNotification(newNotifications, {
                type: 'combat',
                message: combatLog.join(' ')
            });

            newState.notifications = newNotifications;
            newState.currentThought = combatLog[0] || "The hunt continues...";

            return newState;
        }

        // FIXED: Make PROCESS_CREATURE_BEHAVIORS functional
        case 'PROCESS_CREATURE_BEHAVIORS': {
            if (state.gameOver) return state;

            const behaviorResult = processCreatureBehaviors(state);
            const behaviorState = applyCreatureBehaviorResults(state, behaviorResult.behaviorLog);

            // Limit behavior log here too
            const combinedBehaviorLog = [...(state.creatureBehaviorLog || []), ...behaviorResult.behaviorLog];
            const limitedBehaviorLog = combinedBehaviorLog.slice(-MAX_BEHAVIOR_LOG_SIZE);

            return {
                ...behaviorState,
                creatures: behaviorResult.creatures,
                creatureBehaviorLog: limitedBehaviorLog
            };
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