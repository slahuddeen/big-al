// ==================== ENHANCED GAME STATE WITH CREATURE BEHAVIORS ====================
import { distanceToPlayer } from '../world/cellGraph.js';
import { getWorld } from '../world/worldGen.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries, calculateEnergyGain } from '../utils/combatUtils.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { executeCreatureBehavior } from '../utils/creatureBehaviors.js';
import {
    MAX_WEIGHT,
    HEALING_RATE,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS
} from './gameConstants.js';

// Big Al level system (hatchlings start at 1kg)
export const LEVEL_NAMES = ['', 'hatchling', 'juvenile', 'sub-adult', 'adult'];
// FIXED: the adult threshold used to be 2200kg while MAX_WEIGHT is 2100kg, so adulthood was unreachable
export const LEVEL_WEIGHTS = [0, 15, 600, 1800, MAX_WEIGHT];

// Enhanced prey size categories for better scaling with updated pterosaurs
export const PREY_SIZE_CATEGORIES = {
    'tiny': ['Dragonfly', 'Centipede', 'Cricket', 'Scorpion', 'Katydid'],
    'small': ['Frog', 'Lizard', 'Mammal', 'Fish', 'Sphenodontian', 'Mesadactylus', 'Turtle', 'Snake', 'Rhamphorhynchus'],
    'medium': ['Dryosaurus', 'Othnielia', 'Harpactognathus', 'Injured Pterosaur', 'Compsognathus', 'Coelurus', 'Hesperornithoides'],
    'large': ['Ornitholestes', 'Juvenile Allosaurus', 'Crocodile', 'Camptosaurus', 'Kepodactylus', 'Kentrosaurus', 'Tuojiangosaurus'],
    'huge': ['Stegosaurus', 'Male Allosaurus', 'Female Allosaurus', 'Ceratosaurus', 'Torvosaurus', 'Diplodocus', 'Brachiosaurus', 'Camarasaurus', 'Saurophaganax']
};

// Enhanced behavior log size limit and max creatures per hex
const MAX_BEHAVIOR_LOG_SIZE = 15;
const MAX_CREATURES_PER_HEX = 5; // Maximum 5 creatures per hex tile
const MAX_AMBIENT_CREATURES = 40; // cap for creatures populated around the player
const AMBIENT_RESPAWN_TURNS = 8; // a hex in sight is re-rolled for wildlife at most this often
const CREATURE_CULL_DISTANCE = 7; // creatures this many cells from the player are forgotten
const CARCASS_DECAY_TURNS = 15;

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ENHANCED size-based spawn multipliers - MORE VARIETY FOR EARLY GAME!
const getPreySizeMultiplier = (playerLevel, playerWeight, speciesName) => {
    let category = 'medium';
    for (const [cat, species] of Object.entries(PREY_SIZE_CATEGORIES)) {
        if (species.includes(speciesName)) {
            category = cat;
            break;
        }
    }

    // ENHANCED multipliers - much more variety for hatchlings!
    const multipliers = {
        1: { tiny: 4.0, small: 3.5, medium: 2.0, large: 0.8, huge: 0.15 }, // Hatchling - variety of prey including medium!
        2: { tiny: 2.5, small: 4.0, medium: 3.0, large: 1.5, huge: 0.3 },  // Juvenile - good variety
        3: { tiny: 0.6, small: 2.5, medium: 3.5, large: 3.0, huge: 1.8 },   // Sub-adult - shifting up
        4: { tiny: 0.1, small: 0.8, medium: 2.5, large: 4.0, huge: 4.5 }   // Adult - big prey focus
    };

    let multiplier = multipliers[playerLevel][category];

    // MUCH more lenient size scaling - hatchlings can hunt surprisingly large prey!
    if (category === 'tiny' && playerWeight > 2.0) { // Only reduce above 2kg
        multiplier *= Math.max(0.3, 1 / (playerWeight / 50)); // Much gentler
    } else if (category === 'small' && playerWeight > 10.0) { // Only reduce above 10kg
        multiplier *= Math.max(0.4, 1 / (playerWeight / 200)); // Gentler
    } else if (category === 'medium' && playerWeight < 2) { // Small bonus for hatchlings hunting medium prey
        multiplier *= 1.5; // 50% bonus - brave little hunters!
    }

    return multiplier;
};

// Roll which creatures appear on a hex of the given terrain
const rollSpawns = (terrain, state, { chanceScale = 1, max = MAX_CREATURES_PER_HEX, existing = 0 } = {}) => {
    const speciesDistribution = HABITAT_SPECIES[terrain] || {};
    const spawned = [];
    let spawnAttempts = 0;
    const maxSpawnAttempts = 10; // Prevent infinite loops

    for (const species of Object.keys(speciesDistribution)) {
        if (existing + spawned.length >= max || spawnAttempts >= maxSpawnAttempts) break;
        spawnAttempts++;

        // Enhanced size-based multiplier
        let encounterChance = speciesDistribution[species] * getPreySizeMultiplier(state.level, state.weight, species) * chanceScale;

        // Enhanced danger scaling for small predators
        if (state.level <= 2 && ['Male Allosaurus', 'Female Allosaurus', 'Stegosaurus', 'Torvosaurus', 'Saurophaganax'].includes(species)) {
            encounterChance *= 0.05; // Much lower chance of apex predators
        }

        if (Math.random() < encounterChance) {
            const speciesData = SPECIES_DATA[species];
            const minAge = speciesData.minimumAge || 0.1;
            spawned.push({
                id: uid(species),
                species,
                size: minAge + (1 - minAge) * Math.random(),
                behavior: 'neutral',
                spawnTurn: state.moveNumber,
                lastBehaviorTurn: state.moveNumber, // Track when behavior was last executed
                lastSeenTurn: state.moveNumber,
                health: 100,
                status: 'normal',
                energy: 100
            });
        }
    }
    return spawned;
};

export const initialGameState = {
    player: null, // key of the cell Big Al stands on
    cells: new Map(), // key -> { key, x, z, terrain, level, neighbors, discovered, visited, visible, inRange, inSight }
    worldSeed: null,
    selectedHex: null,
    hoveredHex: null,

    // Hatchling starting stats.
    // FIXED: hatchlings used to start at 300g, but metabolism treats anything under 1kg as 1kg,
    // so a new hatchling burned ~13% of its body weight per step.
    level: 1,
    weight: 1.0,
    energy: 100,
    fitness: 100,
    score: 0,
    moveNumber: 0,

    // Creatures system
    creatures: new Map(),
    creatureBehaviorLog: [], // Track creature actions (each entry has an id for the 3D view)
    carcasses: new Map(), // hexKey -> [{ id, species, size, turn }]
    populatedAt: new Map(), // hexKey -> turn the hex was last rolled for ambient wildlife
    lastPlayerAction: null, // { id, type, creatureId, outcome } - drives 3D attack animations

    mapGenerated: false,

    // Notifications and events
    notifications: [],
    currentThought: "You crack out of your egg... those bugs look delicious!",

    // Game state
    gamePhase: 'exploring',
    gameOver: false,
    deathReason: null,
};

// Helper function to check if a creature should attempt escape - REDUCED ESCAPE CHANCES
const attemptCreatureEscape = (speciesName, speciesData, creatureSize, playerWeight, playerLevel) => {
    // REDUCED escape chances - more catchable prey!
    const escapeBaseChance = {
        'Dragonfly': 0.2,
        'Cricket': 0.15,
        'Centipede': 0.05,
        'Mammal': 0.1,
        'Scorpion': 0.08,
        'Frog': 0.12,
        'Lizard': 0.15,
        'Mesadactylus': 0.25,
        'Harpactognathus': 0.18,
        'Kepodactylus': 0.08,
        'Compsognathus': 0.12,
        'Coelurus': 0.15,
        'Hesperornithoides': 0.18,
    };

    let baseEscape = escapeBaseChance[speciesName] || 0.08; // Lower default

    // REDUCED size penalties - less harsh on hatchlings
    const sizeRatio = (speciesData.weight * creatureSize) / playerWeight;
    if (sizeRatio < 0.01) {
        baseEscape += 0.15;
    } else if (sizeRatio < 0.1) {
        baseEscape += 0.08;
    }

    // REDUCED hatchling penalty - they're still predators!
    if (playerLevel === 1) {
        baseEscape += 0.1;
    }

    return Math.random() < Math.min(0.5, baseEscape);
};

// Helper function to add notifications with limits
const addNotification = (notifications, newNotification) => {
    const notification = {
        id: uid('n'),
        timestamp: Date.now(),
        ...newNotification
    };

    const updatedNotifications = [...notifications, notification];

    if (updatedNotifications.length > MAX_NOTIFICATIONS) {
        return updatedNotifications.slice(-MAX_NOTIFICATIONS);
    }

    return updatedNotifications;
};

// Check if player should level up (can skip several levels after a huge meal)
const checkLevelUp = (weight, currentLevel) => {
    let level = currentLevel;
    while (level < LEVEL_WEIGHTS.length - 1 && weight >= LEVEL_WEIGHTS[level]) level++;
    return level;
};

// Level-up messages, shared by moving, hunting and scavenging
const applyGrowth = (level, weight, notifications) => {
    const newLevel = checkLevelUp(weight, level);
    if (newLevel <= level) return { level, notifications };
    let n = addNotification(notifications, {
        type: 'success',
        message: `🎉 Congratulations! You've grown into a ${LEVEL_NAMES[newLevel]}! 🎉`
    });
    const advice = {
        2: "🎖️ Independence achieved! Bugs are getting less satisfying - hunt lizards and frogs!",
        3: "💪 Sub-adult power! Small prey won't cut it anymore - target medium creatures!",
        4: "👑 Apex predator! Only large prey will sustain your massive frame now!"
    };
    if (advice[newLevel]) n = addNotification(n, { type: 'success', message: advice[newLevel] });
    return { level: newLevel, notifications: n };
};

// Feeding: shared by hunting and scavenging
const feed = (state, energyGain, preySize, weightFactor = 1) => {
    const newEnergy = Math.min(100, state.energy + energyGain);
    if (newEnergy >= 90 && energyGain > 8) {
        const weightGain = (energyGain * 0.015) * Math.pow(preySize, 0.8) * weightFactor;
        return {
            energy: 100,
            weight: Math.min(MAX_WEIGHT, state.weight + weightGain),
            score: state.score + Math.round(weightGain * 150),
            weightGain
        };
    }
    return { energy: newEnergy, weight: state.weight, score: state.score + Math.round(energyGain * 1.5), weightGain: 0 };
};

const removeCreature = (creaturesMap, hexKey, creatureId) => {
    const list = (creaturesMap.get(hexKey) || []).filter((c) => c.id !== creatureId);
    const out = new Map(creaturesMap);
    if (list.length > 0) out.set(hexKey, list);
    else out.delete(hexKey);
    return out;
};

const ATTACK_ACTIONS = new Set([
    'attack_player', 'ambush_attack', 'territorial_attack', 'defensive_attack', 'aerial_attack',
    'swoop_attack', 'rival_attack', 'casual_defense', 'defensive_strike'
]);
const MOVE_ACTIONS = new Set(['move', 'flee', 'roam', 'move_to_preferred', 'hunt_from_above', 'chase_competitor']);
const DISPLAY_ACTIONS = new Set(['warning', 'intimidate', 'defensive_posture']);

// ENHANCED: Process creature behaviors.
// FIXED: this used to mutate the previous state inside the reducer: creature
// objects (so React StrictMode's double-invocation put creatures on cooldown)
// and the per-hex arrays (a creature moving into a hex not yet processed was
// pushed onto that array and then acted a second time in the same tick).
// The new map is now rebuilt from scratch.
const processCreatureBehaviors = (gameState) => {
    const placements = [];
    const killed = new Set();
    const carcasses = new Map(gameState.carcasses || []);
    const behaviorLog = [];

    for (const [hexKey, creatures] of gameState.creatures.entries()) {
        const hex = hexKey;

        for (const original of creatures) {
            if (killed.has(original.id)) continue;
            const creature = { ...original };
            let destKey = hexKey;
            try {
                const behavior = executeCreatureBehavior(creature, hex, gameState);
                if (behavior) {
                    if (ATTACK_ACTIONS.has(behavior.action)) {
                        if (distanceToPlayer(gameState, hex) <= 1) {
                            behaviorLog.push({
                                id: uid('log'), type: 'creature_attack', creature: creature.species, creatureId: creature.id,
                                hexKey, message: behavior.message, damage: behavior.damage
                            });
                        }
                    } else if (MOVE_ACTIONS.has(behavior.action) && behavior.target) {
                        const targetKey = behavior.target;
                        const targetHex = gameState.cells.get(targetKey);
                        if (targetHex && TERRAIN_TYPES[targetHex.terrain].passable) {
                            destKey = targetKey;
                            if (behavior.message) {
                                behaviorLog.push({
                                    id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id,
                                    hexKey: targetKey, message: behavior.message, near: distanceToPlayer(gameState, targetKey) <= 1
                                });
                            }
                            // NEW: predators that swoop on prey can actually catch it
                            if (behavior.action === 'hunt_from_above' && behavior.preyId && !killed.has(behavior.preyId) && Math.random() < 0.5) {
                                const prey = (gameState.creatures.get(targetKey) || []).find((c) => c.id === behavior.preyId);
                                if (prey) {
                                    killed.add(prey.id);
                                    const list = [...(carcasses.get(targetKey) || []), { id: uid('carcass'), species: prey.species, size: prey.size, turn: gameState.moveNumber }];
                                    carcasses.set(targetKey, list.slice(-3));
                                    behaviorLog.push({
                                        id: uid('log'), type: 'creature_hunt', creature: creature.species, creatureId: creature.id, victimId: prey.id,
                                        hexKey: targetKey, message: `The ${creature.species} catches a ${prey.species}!`,
                                        near: distanceToPlayer(gameState, targetKey) <= 2
                                    });
                                }
                            }
                        }
                    } else if (DISPLAY_ACTIONS.has(behavior.action)) {
                        if (distanceToPlayer(gameState, hex) <= 2) {
                            behaviorLog.push({
                                id: uid('log'), type: 'creature_display', creature: creature.species, creatureId: creature.id,
                                hexKey, message: behavior.message
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing creature behavior:', error);
            }
            placements.push({ creature, key: destKey, origin: hexKey });
        }
    }

    const newCreatures = new Map();
    for (const p of placements) {
        if (killed.has(p.creature.id)) continue;
        let key = p.key;
        if (key !== p.origin && (newCreatures.get(key) || []).length >= MAX_CREATURES_PER_HEX) key = p.origin;
        const list = newCreatures.get(key) || [];
        list.push(p.creature);
        newCreatures.set(key, list);
    }

    return { creatures: newCreatures, behaviorLog, carcasses };
};

// ENHANCED: Apply creature behavior results to game state
const applyCreatureBehaviorResults = (gameState, behaviorLog) => {
    let newState = { ...gameState };
    let newNotifications = [...gameState.notifications];

    for (const log of behaviorLog) {
        switch (log.type) {
            case 'creature_attack': {
                // Creature attacked player
                const damage = Math.round(log.damage * 0.5); // Reduce creature attack damage
                newState.fitness = Math.max(0, newState.fitness - damage);
                newState.energy = Math.max(0, newState.energy - 8);

                newNotifications = addNotification(newNotifications, {
                    type: 'combat',
                    message: `${log.message} You take ${damage} damage!`
                });

                // Check for death
                if (newState.fitness <= 0 && !newState.gameOver) {
                    newState.gameOver = true;
                    newState.gamePhase = 'dead';
                    newState.deathReason = 'combat';
                    newState.currentThought = `The ${log.creature} proved too dangerous...`;
                }
                break;
            }

            case 'creature_movement':
                // FIXED: used to measure distance from the map origin instead of the creature
                if (log.near) {
                    newNotifications = addNotification(newNotifications, { type: 'warning', message: log.message });
                }
                break;

            case 'creature_hunt':
                if (log.near) {
                    newNotifications = addNotification(newNotifications, { type: 'info', message: `${log.message} Something to scavenge...` });
                    newState.currentThought = "You smell fresh carrion nearby...";
                }
                break;

            case 'creature_display':
                newNotifications = addNotification(newNotifications, { type: 'warning', message: log.message });
                break;

            default:
                break;
        }
    }

    newState.notifications = newNotifications;
    return newState;
};

const withBehaviors = (state, behaviorResult) => {
    const behaviorState = applyCreatureBehaviorResults(state, behaviorResult.behaviorLog);
    const combinedBehaviorLog = [...(state.creatureBehaviorLog || []), ...behaviorResult.behaviorLog];
    return {
        ...behaviorState,
        creatures: behaviorResult.creatures,
        carcasses: behaviorResult.carcasses,
        creatureBehaviorLog: combinedBehaviorLog.slice(-MAX_BEHAVIOR_LOG_SIZE)
    };
};

export const gameReducer = (state, action) => {
    switch (action.type) {
        // Build the Voronoi world for this seed and hatch Big Al in the nest
        case 'GENERATE_WORLD': {
            const seed = action.seed ?? Math.floor(Math.random() * 1e9);
            const world = getWorld(seed);
            const cells = new Map();
            for (const c of world.cells) {
                cells.set(c.key, {
                    key: c.key, x: c.x, z: c.z, terrain: c.terrain, level: c.level, neighbors: c.neighbors,
                    visited: false, visible: false, discovered: false, inRange: false, inSight: false
                });
            }
            return { ...state, worldSeed: seed, cells, player: world.spawnKey, mapGenerated: true };
        }

        case 'MOVE_PLAYER': {
            const { target } = action; // cell key

            if (state.gameOver || !state.cells.get(state.player)?.neighbors.includes(target)) return state;

            const targetHex = state.cells.get(target);
            if (!targetHex) return state;

            const terrain = TERRAIN_TYPES[targetHex.terrain];

            // Check for quicksand - instant death!
            if (targetHex.terrain === 'quicksand') {
                return {
                    ...state,
                    player: target,
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

            // Check weight restrictions for deep rivers - hatchlings are too small!
            if (terrain.minWeight > 0 && state.weight < terrain.minWeight) {
                return {
                    ...state,
                    player: target,
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

            // Movement costs scale with size (capped for large dinosaurs)
            const sizeMultiplier = Math.max(0.4, Math.min(2.0, Math.pow(state.weight / 150, 0.4)));
            const energyCost = Math.round(terrain.energyCost * sizeMultiplier);

            const newEnergy = Math.max(0, state.energy - energyCost);
            let newFitness = state.fitness;

            // Weight loss from metabolism
            const metabolismRate = 0.0008 + (0.04 / Math.max(1, Math.pow(state.weight, 0.5)));
            const newWeight = Math.max(0.5, state.weight - metabolismRate); // Minimum 500g
            let newNotifications = [...state.notifications];

            // Terrain-based fitness loss
            if (terrain.fitnessRisk > 0 && Math.random() < terrain.fitnessRisk) {
                const damage = Math.round(12 * Math.max(0.5, state.weight / 100));
                newFitness = Math.max(0, state.fitness - damage);
                newNotifications = addNotification(newNotifications, {
                    type: 'injury',
                    message: `Moving through ${terrain.name} caused injury! -${damage} fitness`
                });
            }

            // Natural healing
            newFitness = Math.min(100, newFitness + HEALING_RATE);

            const growth = applyGrowth(state.level, newWeight, newNotifications);
            const newLevel = growth.level;
            newNotifications = growth.notifications;

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

            // Carcasses rot away
            const carcasses = new Map();
            for (const [key, list] of state.carcasses || []) {
                const fresh = list.filter((c) => state.moveNumber + 1 - c.turn <= CARCASS_DECAY_TURNS);
                if (fresh.length) carcasses.set(key, fresh);
            }

            // ENHANCED: Process creature behaviors with the player at the new position
            const movedState = {
                ...state,
                player: target,
                moveNumber: state.moveNumber + 1,
                level: newLevel,
                energy: newEnergy,
                fitness: newFitness,
                weight: newWeight,
                carcasses,
                notifications: newNotifications
            };
            const behaviorState = withBehaviors(movedState, processCreatureBehaviors(movedState));

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
                selectedHex: null,
                currentThought: behaviorState.gameOver ? behaviorState.currentThought : newThought
            };
        }

        case 'UPDATE_VISIBILITY': {
            if (!state.player) return state;
            const newHexes = calculateVisibility(state.player, state.cells, state.worldSeed);

            // ENHANCED: Update lastSeenTurn for creatures in currently visible cells
            const newCreatures = new Map(state.creatures);
            for (const [hexKey, creatures] of newCreatures.entries()) {
                const hex = newHexes.get(hexKey);
                if (hex && hex.inSight) {
                    newCreatures.set(hexKey, creatures.map(creature => ({ ...creature, lastSeenTurn: state.moveNumber })));
                }
            }

            return { ...state, cells: newHexes, creatures: newCreatures };
        }

        case 'SPAWN_CREATURES': {
            if (state.gameOver) return state;

            const playerKey = state.player;
            const playerHex = state.cells.get(playerKey);
            if (!playerHex) return state;

            const currentCreatures = state.creatures.get(playerKey) || [];
            if (currentCreatures.length >= MAX_CREATURES_PER_HEX) return state;

            const spawned = rollSpawns(playerHex.terrain, state, { existing: currentCreatures.length });
            if (spawned.length === 0) return state;

            const newCreaturesMap = new Map(state.creatures);
            newCreaturesMap.set(playerKey, [...currentCreatures, ...spawned]);
            return { ...state, creatures: newCreaturesMap };
        }

        // NEW: fill the cells you can see with wildlife so the world feels alive,
        // and forget creatures that are far behind you.
        case 'POPULATE_NEARBY': {
            if (state.gameOver) return state;
            const playerKey = state.player;
            const newCreatures = new Map();
            let total = 0;
            for (const [key, list] of state.creatures) {
                if (distanceToPlayer(state, key) > CREATURE_CULL_DISTANCE) continue;
                newCreatures.set(key, list);
                total += list.length;
            }
            const populatedAt = new Map(state.populatedAt || []);
            for (const [key, hex] of state.cells) {
                if (total >= MAX_AMBIENT_CREATURES) break;
                if (!hex.inSight || key === playerKey) continue;
                if ((newCreatures.get(key) || []).length > 0) continue;
                const last = populatedAt.get(key);
                if (last !== undefined && state.moveNumber - last < AMBIENT_RESPAWN_TURNS) continue;
                populatedAt.set(key, state.moveNumber);
                const spawned = rollSpawns(hex.terrain, state, { chanceScale: 0.4, max: 2 });
                if (spawned.length) {
                    newCreatures.set(key, spawned);
                    total += spawned.length;
                }
            }
            return { ...state, creatures: newCreatures, populatedAt };
        }

        case 'ATTACK_CREATURE': {
            const { creatureId } = action;
            if (state.gameOver) return state;

            const playerKey = state.player;
            const creatures = state.creatures.get(playerKey) || [];
            const targetCreature = creatures.find(c => c.id === creatureId);
            if (!targetCreature) return state;

            const speciesData = SPECIES_DATA[targetCreature.species];
            let newState = { ...state, creatures: removeCreature(state.creatures, playerKey, creatureId) };
            let newNotifications = [...state.notifications];
            const combatLog = [];
            let outcome;

            // Check if creature escapes before combat!
            if (attemptCreatureEscape(targetCreature.species, speciesData, targetCreature.size, state.weight, state.level)) {
                outcome = 'escape';
                combatLog.push(`The ${targetCreature.species} darts away before you can catch it!`);
                newState.energy = Math.max(0, state.energy - 4); // Small energy cost for failed hunt
                newState.currentThought = "Too slow! Need to be more careful hunting.";
            } else {
                const fiercenessRatio = calculateFiercenessRatio(state.weight, state.fitness, speciesData, targetCreature.size);
                const agilityRatio = calculateAgilityRatio(state.weight, speciesData);

                if (fiercenessRatio < 1 && agilityRatio < 1) {
                    // Successfully caught and killed
                    outcome = 'kill';
                    combatLog.push(`You successfully hunt the ${targetCreature.species}!`);

                    const injuryAmount = calculateInjuries(fiercenessRatio);
                    if (injuryAmount > 3) {
                        newState.fitness = Math.max(0, state.fitness - injuryAmount);
                        combatLog.push(`The struggle causes minor injuries (-${Math.round(injuryAmount)} fitness)`);
                    }

                    const energyGain = calculateEnergyGain(speciesData, targetCreature.size, state.weight, state.level);
                    const fed = feed(state, energyGain, targetCreature.size);
                    newState.energy = fed.energy;
                    newState.weight = fed.weight;
                    newState.score = fed.score;

                    if (fed.weightGain > 0) {
                        combatLog.push(`You devour the ${targetCreature.species}! (+${Math.round(fed.weightGain * 1000)}g weight, full energy)`);
                    } else if (energyGain < 3) {
                        combatLog.push(`You eat the ${targetCreature.species}, but it's barely a snack (+${Math.round(energyGain)} energy)`);
                    } else if (energyGain < 10) {
                        combatLog.push(`You eat the ${targetCreature.species} (+${Math.round(energyGain)} energy)`);
                    } else if (energyGain < 20) {
                        combatLog.push(`You enjoy the ${targetCreature.species}! (+${Math.round(energyGain)} energy)`);
                    } else {
                        combatLog.push(`You feast on the ${targetCreature.species}! (+${Math.round(energyGain)} energy)`);
                    }

                    const growth = applyGrowth(state.level, newState.weight, newNotifications);
                    newState.level = growth.level;
                    newNotifications = growth.notifications;
                } else if (fiercenessRatio < 1) {
                    outcome = 'escape';
                    combatLog.push(`The ${targetCreature.species} escapes your clumsy attack!`);
                    newState.energy = Math.max(0, state.energy - 5);
                } else {
                    // Dangerous combat - enhanced penalties for small dinosaurs
                    outcome = 'hurt';
                    const injuries = calculateInjuries(fiercenessRatio) * (state.level <= 2 ? 1.8 : 1);
                    newState.fitness = Math.max(0, state.fitness - injuries);
                    newState.energy = Math.max(0, state.energy - 12);
                    combatLog.push(`The ${targetCreature.species} ${speciesData.injury}!`);
                    combatLog.push(`You take ${Math.round(injuries)} damage!`);

                    if (newState.fitness <= 0) {
                        newState.gameOver = true;
                        newState.gamePhase = 'dead';
                        newState.deathReason = 'combat';
                    }
                }
                newState.currentThought = combatLog[0] || "The hunt continues...";
                if (newState.gameOver) {
                    newState.currentThought = state.level === 1 ?
                        `The ${targetCreature.species} was too dangerous for a small hatchling...` :
                        `The ${targetCreature.species} proved too powerful...`;
                }
            }

            newState.notifications = addNotification(newNotifications, {
                type: 'combat',
                message: combatLog.join(' ')
            });
            newState.lastPlayerAction = { id: uid('act'), type: 'attack', creatureId, outcome };
            return newState;
        }

        // NEW: eat what other predators left behind
        case 'SCAVENGE': {
            if (state.gameOver) return state;
            const playerKey = state.player;
            const list = (state.carcasses || new Map()).get(playerKey) || [];
            const carcass = list.find((c) => c.id === action.carcassId);
            if (!carcass) return state;

            const speciesData = SPECIES_DATA[carcass.species];
            const freshness = Math.max(0.3, 1 - (state.moveNumber - carcass.turn) / CARCASS_DECAY_TURNS);
            const energyGain = Math.max(2, Math.round(calculateEnergyGain(speciesData, carcass.size, state.weight, state.level) * 0.6 * freshness));
            const fed = feed(state, energyGain, carcass.size, 0.7);
            const growth = applyGrowth(state.level, fed.weight, state.notifications);

            const carcasses = new Map(state.carcasses);
            const rest = list.filter((c) => c.id !== carcass.id);
            if (rest.length) carcasses.set(playerKey, rest);
            else carcasses.delete(playerKey);

            return {
                ...state,
                carcasses,
                energy: fed.energy,
                weight: fed.weight,
                score: fed.score,
                level: growth.level,
                notifications: addNotification(growth.notifications, {
                    type: 'success',
                    message: `You scavenge the ${carcass.species} carcass (+${energyGain} energy${fed.weightGain > 0 ? `, +${Math.round(fed.weightGain * 1000)}g` : ''})`
                }),
                currentThought: freshness > 0.6 ? "Still warm. Free food is the best food." : "A bit ripe... but food is food.",
                lastPlayerAction: { id: uid('act'), type: 'scavenge', carcassId: carcass.id }
            };
        }

        // Dev helper (window.spawnCreature in development builds)
        case 'DEBUG_SPAWN': {
            const key = action.hexKey || state.player;
            if (!SPECIES_DATA[action.species]) return state;
            const c = {
                id: uid(action.species), species: action.species, size: action.size ?? 1, behavior: 'neutral',
                spawnTurn: state.moveNumber, lastBehaviorTurn: state.moveNumber, lastSeenTurn: state.moveNumber,
                health: 100, status: 'normal', energy: 100
            };
            const creatures = new Map(state.creatures);
            creatures.set(key, [...(creatures.get(key) || []), c]);
            return { ...state, creatures };
        }

        case 'PROCESS_CREATURE_BEHAVIORS': {
            if (state.gameOver) return state;
            return withBehaviors(state, processCreatureBehaviors(state));
        }

        case 'DISMISS_NOTIFICATION': {
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.id)
            };
        }

        case 'AUTO_DISMISS_NOTIFICATIONS': {
            const now = Date.now();
            const kept = state.notifications.filter(n => (now - n.timestamp) < NOTIFICATION_AUTO_DISMISS_TIME);
            // Avoid re-rendering every second when nothing expired
            return kept.length === state.notifications.length ? state : { ...state, notifications: kept };
        }

        case 'RESTART_GAME': {
            return {
                ...initialGameState,
                cells: new Map(),
                creatures: new Map(),
                carcasses: new Map(),
                populatedAt: new Map()
            };
        }

        case 'SELECT_HEX': {
            return { ...state, selectedHex: action.hex };
        }

        case 'HOVER_HEX': {
            return { ...state, hoveredHex: action.hex };
        }

        case 'CLEAR_HOVER': {
            return state.hoveredHex ? { ...state, hoveredHex: null } : state;
        }

        default:
            return state;
    }
};
