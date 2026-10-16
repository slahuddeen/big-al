// ==================== GAME STATE ====================
import { distanceToPlayer, bfsDistances } from '../world/cellGraph.js';
import { getWorld } from '../world/worldGen.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES, GROUP_SIZE, activityFactor } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries, calculateEnergyGain, escapeChance as attemptCreatureEscape } from '../utils/combatUtils.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { executeCreatureBehavior } from '../utils/creatureBehaviors.js';
import { ABILITIES, ATTACK_MODS, hasPassive, abilityReady, inCover } from './abilities.js';
import { isMisty, WATER_SOURCES, thirstFactor, shelterOf } from './environment.js';
import { generatePois, POI_TYPES } from './pois.js';
import {
    MAX_WEIGHT,
    HEALING_RATE,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS,
    getTimeOfDay
} from './gameConstants.js';

// Big Al level system (hatchlings start at 1kg)
export const LEVEL_NAMES = ['', 'hatchling', 'juvenile', 'sub-adult', 'adult'];
// FIXED: the adult threshold used to be 2200kg while MAX_WEIGHT is 2100kg, so adulthood was unreachable
export const LEVEL_WEIGHTS = [0, 15, 600, 1800, MAX_WEIGHT];

export const PREY_SIZE_CATEGORIES = {
    'tiny': ['Dragonfly', 'Centipede', 'Cricket', 'Scorpion', 'Katydid'],
    'small': ['Frog', 'Lizard', 'Mammal', 'Fish', 'Sphenodontian', 'Mesadactylus', 'Turtle', 'Snake', 'Rhamphorhynchus'],
    'medium': ['Dryosaurus', 'Othnielia', 'Harpactognathus', 'Injured Pterosaur', 'Compsognathus', 'Coelurus', 'Hesperornithoides'],
    'large': ['Ornitholestes', 'Stokesosaurus', 'Juvenile Allosaurus', 'Crocodile', 'Camptosaurus', 'Kepodactylus', 'Kentrosaurus', 'Tuojiangosaurus'],
    'huge': ['Stegosaurus', 'Male Allosaurus', 'Female Allosaurus', 'Ceratosaurus', 'Torvosaurus', 'Diplodocus', 'Brachiosaurus', 'Camarasaurus', 'Saurophaganax']
};

const MAX_BEHAVIOR_LOG_SIZE = 15;
const MAX_CREATURES_PER_HEX = 5;
const MAX_AMBIENT_CREATURES = 44; // cap for creatures populated around the player
const AMBIENT_RESPAWN_TURNS = 8; // a cell in sight is re-rolled for wildlife at most this often
const CREATURE_CULL_DISTANCE = 7; // creatures this many cells from the player are forgotten
const CARCASS_DECAY_TURNS = 15;
const SCENT_TURNS = 3;
const BLOOD_TURNS = 10;
const MAX_EVENT_LOG = 40;

const PREDATOR_TYPES = new Set(['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'aerial_predator', 'territorial']);
const ATTACK_ACTIONS = new Set([
    'attack_player', 'ambush_attack', 'territorial_attack', 'defensive_attack', 'aerial_attack',
    'swoop_attack', 'rival_attack', 'casual_defense', 'defensive_strike'
]);
const MOVE_ACTIONS = new Set(['move', 'flee', 'roam', 'move_to_preferred', 'hunt_from_above', 'chase_competitor']);
const DISPLAY_ACTIONS = new Set(['warning', 'intimidate', 'defensive_posture']);

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const phaseOf = (state) => getTimeOfDay(state.moveNumber).turnInCycle;
const passable = (state, key) => {
    const c = state.cells.get(key);
    return !!c && TERRAIN_TYPES[c.terrain].passable && c.terrain !== 'quicksand';
};

// How fierce Big Al is (same measure the combat maths uses)
export const playerFierceness = (state) => Math.max(1, state.weight * (Math.log10(Math.max(1, state.fitness)) / 2));
// How dangerous a creature is right now (wounded animals are weaker)
export const creatureThreat = (c) => {
    const sd = SPECIES_DATA[c.species];
    return (sd?.danger ?? 0) * (c.size ?? 1) * (c.wounded ? Math.max(0.15, (c.health ?? 100) / 100) : 1);
};
// Only animals that could hurt you stop you sleeping; bugs and lizards don't count
export const sleepBlockers = (state) => {
    const pf = playerFierceness(state);
    return (state.creatures.get(state.player) || []).filter((c) => creatureThreat(c) > pf * 0.15 || PREDATOR_TYPES.has(SPECIES_DATA[c.species]?.behaviorType) && creatureThreat(c) > pf * 0.05);
};

// Hatchet bites are for animals at least a good fraction of Big Al's size
export const hatchetTarget = (state, c) => (SPECIES_DATA[c.species]?.weight ?? 0) * (c.size ?? 1) >= state.weight * 0.4;
export const playerMisty = (state) => {
    const here = state.cells.get(state.player);
    return !!here && isMisty(here.terrain, phaseOf(state), here.key);
};

// ---------- spawning ----------
const getPreySizeMultiplier = (playerLevel, playerWeight, speciesName) => {
    let category = 'medium';
    for (const [cat, species] of Object.entries(PREY_SIZE_CATEGORIES)) {
        if (species.includes(speciesName)) {
            category = cat;
            break;
        }
    }
    const multipliers = {
        1: { tiny: 4.0, small: 3.5, medium: 2.0, large: 0.8, huge: 0.15 },
        2: { tiny: 2.5, small: 4.0, medium: 3.0, large: 1.5, huge: 0.3 },
        3: { tiny: 0.6, small: 2.5, medium: 3.5, large: 3.0, huge: 1.8 },
        4: { tiny: 0.1, small: 0.8, medium: 2.5, large: 4.0, huge: 4.5 }
    };
    let multiplier = multipliers[playerLevel][category];
    if (category === 'tiny' && playerWeight > 2.0) multiplier *= Math.max(0.3, 1 / (playerWeight / 50));
    else if (category === 'small' && playerWeight > 10.0) multiplier *= Math.max(0.4, 1 / (playerWeight / 200));
    else if (category === 'medium' && playerWeight < 2) multiplier *= 1.5;
    return multiplier;
};

const makeCreature = (species, state, size) => {
    const sd = SPECIES_DATA[species];
    const minAge = sd.minimumAge || 0.1;
    return {
        id: uid(species), species,
        size: size ?? minAge + (1 - minAge) * Math.random(),
        behavior: 'neutral', spawnTurn: state.moveNumber, lastBehaviorTurn: state.moveNumber, lastSeenTurn: state.moveNumber,
        health: 100, status: 'normal', energy: 100
    };
};

// Roll which creatures appear on a cell of the given terrain. Herds and packs arrive together.
const rollSpawns = (terrain, state, { chanceScale = 1, max = MAX_CREATURES_PER_HEX, existing = 0, key = null } = {}) => {
    const dist = { ...(HABITAT_SPECIES[terrain] || {}) };
    const poi = key ? state.pois?.get(key) : null;
    if (poi?.type === 'sauropodcarcass' && poi.portions > 0) {
        // a fallen giant draws in every predator around
        Object.assign(dist, { Ceratosaurus: 0.15, Torvosaurus: 0.1, 'Male Allosaurus': 0.12, 'Female Allosaurus': 0.1, Stokesosaurus: 0.12, Compsognathus: 0.3, Harpactognathus: 0.2 });
    }
    const phase = phaseOf(state);
    const spawned = [];
    let attempts = 0;
    for (const species of Object.keys(dist).sort(() => Math.random() - 0.5)) {
        if (existing + spawned.length >= max || attempts >= 10) break;
        attempts++;
        let chance = dist[species] * getPreySizeMultiplier(state.level, state.weight, species) * chanceScale * activityFactor(species, phase);
        if (state.level <= 2 && ['Male Allosaurus', 'Female Allosaurus', 'Stegosaurus', 'Torvosaurus', 'Saurophaganax'].includes(species)) chance *= 0.05;
        if (Math.random() >= chance) continue;
        const [gMin, gMax] = GROUP_SIZE[species] || [1, 1];
        const n = Math.min(max - existing - spawned.length, gMin + Math.floor(Math.random() * (gMax - gMin + 1)));
        const adult = makeCreature(species, state);
        spawned.push(adult);
        for (let i = 1; i < n; i++) {
            // herds bring their young along
            const young = ['Diplodocus', 'Camarasaurus', 'Brachiosaurus', 'Stegosaurus'].includes(species) && Math.random() < 0.6;
            spawned.push(makeCreature(species, state, young ? 0.15 + Math.random() * 0.25 : undefined));
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

    level: 1,
    weight: 1.0,
    energy: 100,
    fitness: 100,
    hydration: 100,
    score: 0,
    moveNumber: 0,

    // Abilities
    cooldowns: {}, // ability id -> turn it is ready again
    dashArmed: false,

    // Creatures and the traces they leave
    creatures: new Map(),
    creatureBehaviorLog: [],
    carcasses: new Map(), // key -> [{ id, species, size, turn, portions }]
    blood: new Map(), // key -> turn a wounded animal bled here
    scent: [], // [{ key, kind: 'creature'|'carcass'|'blood', species, turn }]
    populatedAt: new Map(),
    lastPlayerAction: null, // drives 3D animations

    // Exploration
    pois: new Map(), // key -> point of interest
    journal: { species: {}, biomes: {}, landmarks: {} },
    stats: { kills: 0, scavenged: 0, sleeps: 0, distance: 0 },

    mapGenerated: false,

    notifications: [],
    eventLog: [],
    currentThought: "You crack out of your egg... those bugs look delicious!",

    gamePhase: 'exploring',
    gameOver: false,
    deathReason: null
};

const addNotification = (notifications, newNotification) => {
    const notification = { id: uid('n'), timestamp: Date.now(), ...newNotification };
    const updated = [...notifications, notification];
    return updated.length > MAX_NOTIFICATIONS ? updated.slice(-MAX_NOTIFICATIONS) : updated;
};

const checkLevelUp = (weight, currentLevel) => {
    let level = currentLevel;
    while (level < LEVEL_WEIGHTS.length - 1 && weight >= LEVEL_WEIGHTS[level]) level++;
    return level;
};

// Level-up messages, shared by moving, hunting and scavenging
const applyGrowth = (level, weight, notifications) => {
    const newLevel = checkLevelUp(weight, level);
    if (newLevel <= level) return { level, notifications };
    let n = addNotification(notifications, { type: 'levelup', message: `You've grown into a ${LEVEL_NAMES[newLevel]}!` });
    const learned = Object.values(ABILITIES).filter((a) => a.level > level && a.level <= newLevel).map((a) => a.name);
    const advice = {
        2: 'Bugs are getting less satisfying. Hunt lizards, mammals and small dinosaurs.',
        3: 'Small prey will not keep you going now. Go after ornithopods.',
        4: 'You are an apex predator. Only big prey will sustain you.'
    };
    if (learned.length || advice[newLevel]) {
        n = addNotification(n, { type: 'levelup', message: `${learned.length ? `New abilities: ${learned.join(', ')}. ` : ''}${advice[newLevel] || ''}` });
    }
    return { level: newLevel, notifications: n };
};

// Feeding: shared by hunting and scavenging
const feed = (state, energyGain, preySize, weightFactor = 1) => {
    const newEnergy = Math.min(100, state.energy + energyGain);
    if (newEnergy >= 90 && energyGain > 8) {
        const weightGain = (energyGain * 0.015) * Math.pow(preySize, 0.8) * weightFactor;
        return { energy: 100, weight: Math.min(MAX_WEIGHT, state.weight + weightGain), score: state.score + Math.round(weightGain * 150), weightGain };
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

const placeCreature = (creaturesMap, hexKey, creature) => {
    const out = new Map(creaturesMap);
    out.set(hexKey, [...(out.get(hexKey) || []), creature]);
    return out;
};

const addCarcass = (carcasses, key, carcass) => {
    const out = new Map(carcasses);
    out.set(key, [...(out.get(key) || []), { id: uid('carcass'), portions: 1, ...carcass }].slice(-3));
    return out;
};

// Neighbouring cell that gets a creature furthest from Big Al
const escapeCell = (state, fromKey, occupancy) => {
    let best = null;
    let bestD = -1;
    for (const n of state.cells.get(fromKey)?.neighbors || []) {
        if (!passable(state, n) || (occupancy.get(n) || 0) >= MAX_CREATURES_PER_HEX) continue;
        const d = distanceToPlayer(state, n) + Math.random() * 0.5;
        if (d > bestD) {
            bestD = d;
            best = n;
        }
    }
    return best;
};

const towardPlayer = (state, fromKey) => {
    let best = null;
    let bestD = Infinity;
    for (const n of state.cells.get(fromKey)?.neighbors || []) {
        if (!passable(state, n)) continue;
        const d = distanceToPlayer(state, n);
        if (d < bestD) {
            bestD = d;
            best = n;
        }
    }
    return best;
};

// Chance a creature that means to attack has actually spotted Big Al
const noticeChance = (state, creature, opts = {}) => {
    const sd = SPECIES_DATA[creature.species] || {};
    let p = 1;
    if (opts.asleep) p *= 0.7;
    if (inCover(state)) p *= 0.8;
    if (playerMisty(state)) p *= 0.6;
    if (hasPassive(state, 'tiny') && (sd.weight || 1) * (creature.size || 1) > state.weight * 100) p *= 0.45;
    return p;
};

// Damage from an attack: big animals are deadly to small ones, but between
// equals a fight is survivable
const attackDamage = (state, creature, rawDamage) => {
    const threat = Math.max(0.01, creatureThreat(creature));
    const mult = rawDamage / Math.max(0.01, (SPECIES_DATA[creature.species]?.danger ?? 1) * (creature.size ?? 1));
    const absolute = rawDamage * 0.5 * (creature.wounded ? (creature.health ?? 100) / 100 : 1);
    const relative = 40 * Math.pow(threat / playerFierceness(state), 0.7) * mult;
    let dmg = Math.min(absolute, relative);
    if (hasPassive(state, 'hide')) dmg *= 0.8;
    return Math.max(1, Math.round(dmg));
};

// ==================== CREATURE TURN ====================
// Animals act on their own; attacks only land from Big Al's own area, so an
// aggressive animal next door charges in first.
const processCreatureBehaviors = (gameState, opts = {}) => {
    const placements = [];
    const killed = new Set();
    let carcasses = new Map(gameState.carcasses || []);
    const blood = new Map(gameState.blood || []);
    const behaviorLog = [];
    const occupancy = new Map();
    for (const [k, list] of gameState.creatures) occupancy.set(k, list.length);
    const player = gameState.player;
    const pf = playerFierceness(gameState);
    const move = (from, to) => {
        occupancy.set(from, (occupancy.get(from) || 1) - 1);
        occupancy.set(to, (occupancy.get(to) || 0) + 1);
    };

    for (const [hexKey, creatures] of gameState.creatures.entries()) {
        for (const original of creatures) {
            if (killed.has(original.id)) continue;
            const creature = { ...original };
            let destKey = hexKey;
            try {
                // wounded animals bleed, weaken and try to get away
                if (creature.wounded) {
                    creature.health = (creature.health ?? 100) - 12;
                    blood.set(hexKey, gameState.moveNumber);
                    if (creature.health <= 0) {
                        killed.add(creature.id);
                        carcasses = addCarcass(carcasses, hexKey, { species: creature.species, size: creature.size, turn: gameState.moveNumber, portions: 4 });
                        behaviorLog.push({ id: uid('log'), type: 'creature_died', creature: creature.species, creatureId: creature.id, hexKey, message: `The wounded ${creature.species} collapses.`, near: distanceToPlayer(gameState, hexKey) <= 4 });
                        continue;
                    }
                    if (Math.random() < 0.75) {
                        const to = escapeCell(gameState, hexKey, occupancy);
                        if (to) {
                            destKey = to;
                            move(hexKey, to);
                            blood.set(to, gameState.moveNumber);
                            behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, message: `The wounded ${creature.species} staggers away, leaving a trail of blood.`, near: false });
                        }
                    }
                    placements.push({ creature, key: destKey, origin: hexKey });
                    continue;
                }

                const behavior = executeCreatureBehavior(creature, hexKey, gameState);
                if (behavior) {
                    if (ATTACK_ACTIONS.has(behavior.action)) {
                        const dist = distanceToPlayer(gameState, hexKey);
                        const threat = creatureThreat(creature);
                        const isPredator = PREDATOR_TYPES.has(SPECIES_DATA[creature.species]?.behaviorType);
                        if (gameState.gameOver || dist > 2) {
                            // nothing to do
                        } else if (hasPassive(gameState, 'apex') && isPredator && threat < pf * 0.6) {
                            // Big Al outclasses it: it backs off instead
                            const to = escapeCell(gameState, hexKey, occupancy);
                            if (to) {
                                destKey = to;
                                move(hexKey, to);
                                behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, message: `The ${creature.species} thinks better of it and slinks away.`, near: true });
                            }
                        } else if (dist === 2) {
                            // too far to strike: close the distance
                            const to = towardPlayer(gameState, hexKey);
                            if (to && (occupancy.get(to) || 0) < MAX_CREATURES_PER_HEX) {
                                destKey = to;
                                move(hexKey, to);
                                behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, message: `The ${creature.species} is stalking you!`, near: true });
                            }
                        } else if (Math.random() < noticeChance(gameState, creature, opts)) {
                            let canStrike = true;
                            if (dist === 1) {
                                // charge into Big Al's area to attack
                                if ((occupancy.get(player) || 0) < MAX_CREATURES_PER_HEX) {
                                    destKey = player;
                                    move(hexKey, player);
                                } else canStrike = false;
                            }
                            if (canStrike) {
                                if (opts.evading) {
                                    behaviorLog.push({ id: uid('log'), type: 'creature_miss', creature: creature.species, creatureId: creature.id, hexKey: destKey, charged: dist === 1, message: `The ${creature.species} lunges, but you're already gone!` });
                                } else {
                                    behaviorLog.push({
                                        id: uid('log'), type: 'creature_attack', creature: creature.species, creatureId: creature.id, hexKey: destKey, charged: dist === 1,
                                        message: dist === 1 ? `The ${creature.species} charges in! ${behavior.message}` : behavior.message,
                                        damage: attackDamage(gameState, creature, behavior.damage || 1)
                                    });
                                }
                            }
                        }
                    } else if (MOVE_ACTIONS.has(behavior.action) && behavior.target) {
                        const targetKey = behavior.target;
                        if (passable(gameState, targetKey) && (occupancy.get(targetKey) || 0) < MAX_CREATURES_PER_HEX) {
                            destKey = targetKey;
                            move(hexKey, targetKey);
                            if (behavior.message) {
                                behaviorLog.push({
                                    id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id,
                                    hexKey: targetKey, message: behavior.message, near: distanceToPlayer(gameState, targetKey) <= 1
                                });
                            }
                            // predators that swoop on prey can actually catch it
                            if (behavior.action === 'hunt_from_above' && behavior.preyId && !killed.has(behavior.preyId) && Math.random() < 0.5) {
                                const prey = (gameState.creatures.get(targetKey) || []).find((c) => c.id === behavior.preyId);
                                if (prey) {
                                    killed.add(prey.id);
                                    carcasses = addCarcass(carcasses, targetKey, { species: prey.species, size: prey.size, turn: gameState.moveNumber });
                                    behaviorLog.push({
                                        id: uid('log'), type: 'creature_hunt', creature: creature.species, creatureId: creature.id, victimId: prey.id,
                                        hexKey: targetKey, message: `The ${creature.species} catches a ${prey.species}!`,
                                        near: distanceToPlayer(gameState, targetKey) <= 2
                                    });
                                }
                            }
                        }
                    } else if (DISPLAY_ACTIONS.has(behavior.action)) {
                        if (distanceToPlayer(gameState, hexKey) <= 2) {
                            behaviorLog.push({ id: uid('log'), type: 'creature_display', creature: creature.species, creatureId: creature.id, hexKey, message: behavior.message });
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
        const list = newCreatures.get(p.key) || [];
        list.push(p.creature);
        newCreatures.set(p.key, list);
    }
    return { creatures: newCreatures, behaviorLog, carcasses, blood };
};

const killPlayer = (state, reason, thought) => ({
    ...state, gameOver: true, gamePhase: 'dead', deathReason: reason, currentThought: thought
});

const applyCreatureBehaviorResults = (gameState, behaviorLog) => {
    let newState = { ...gameState };
    let newNotifications = [...gameState.notifications];
    for (const log of behaviorLog) {
        switch (log.type) {
            case 'creature_attack': {
                newState.fitness = Math.max(0, newState.fitness - log.damage);
                newState.energy = Math.max(0, newState.energy - 4);
                newNotifications = addNotification(newNotifications, { type: 'combat', message: `${log.message} -${log.damage} health` });
                if (newState.fitness <= 0 && !newState.gameOver) {
                    newState = killPlayer(newState, 'combat', `The ${log.creature} proved too dangerous...`);
                }
                break;
            }
            case 'creature_miss':
                newNotifications = addNotification(newNotifications, { type: 'success', message: log.message });
                break;
            case 'creature_movement':
                if (log.near) newNotifications = addNotification(newNotifications, { type: 'warning', message: log.message });
                break;
            case 'creature_hunt':
                if (log.near) {
                    newNotifications = addNotification(newNotifications, { type: 'info', message: `${log.message} Something to scavenge...` });
                    newState.currentThought = 'You smell fresh carrion nearby...';
                }
                break;
            case 'creature_died':
                if (log.near) {
                    newNotifications = addNotification(newNotifications, { type: 'success', message: `${log.message} A feast awaits.` });
                    newState.currentThought = 'The blood trail ends here. Time to eat.';
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
        blood: behaviorResult.blood,
        creatureBehaviorLog: combinedBehaviorLog.slice(-MAX_BEHAVIOR_LOG_SIZE)
    };
};

// Things that rot, dry up or blow away as time passes
const ageTraces = (state, turn) => {
    const carcasses = new Map();
    for (const [key, list] of state.carcasses || []) {
        const fresh = list.filter((c) => turn - c.turn <= CARCASS_DECAY_TURNS * (c.portions > 1 ? 1.6 : 1));
        if (fresh.length) carcasses.set(key, fresh);
    }
    const blood = new Map();
    for (const [key, t] of state.blood || []) if (turn - t <= BLOOD_TURNS) blood.set(key, t);
    const scent = (state.scent || []).filter((s) => turn - s.turn <= SCENT_TURNS);
    return { carcasses, blood, scent };
};

// Hunger, thirst and healing for one turn of time passing
const passTime = (state, { energyCost, terrain, heal = HEALING_RATE, thirstMul = 1 }) => {
    let notifications = state.notifications;
    const metabolismRate = 0.0008 + (0.04 / Math.max(1, Math.pow(state.weight, 0.5)));
    const weight = Math.max(0.5, state.weight - metabolismRate);
    const energy = Math.max(0, state.energy - energyCost);
    let hydration = Math.max(0, state.hydration - 2.2 * thirstFactor(terrain) * thirstMul);
    if (['river', 'stream', 'lake'].includes(terrain)) hydration = Math.min(100, hydration + 30);
    let fitness = state.fitness;
    if (hydration <= 0) {
        fitness = Math.max(0, fitness - 6);
        notifications = addNotification(notifications, { type: 'injury', message: 'You are parched. Find water soon! -6 health' });
    } else if (hydration > 15 && energy > 10) {
        fitness = Math.min(100, fitness + heal);
    }
    return { weight, energy, hydration, fitness, notifications };
};

const contextualThought = (state) => {
    const here = state.cells.get(state.player);
    const phase = phaseOf(state);
    if (state.hydration < 25) return 'Your throat is dry. You need water.';
    if (state.energy < 25) return 'Your stomach aches. You need to eat, and soon.';
    if (state.fitness < 35) return 'Every step hurts. Somewhere safe to sleep would help.';
    if (here && playerMisty(state)) return 'Mist hangs low. You can barely see, but nothing can see you either.';
    if (phase === 3) return 'Night falls. Things move in the dark.';
    if (state.level === 1) {
        const t = ['Those dragonflies look tasty but so fast!', 'Maybe I can catch that centipede...', 'Everything is so big, but I can hunt bugs!', 'Need to find more insects to grow bigger...'];
        return t[Math.floor(Math.random() * t.length)];
    }
    if (state.level === 2) {
        const t = ["Bugs aren't as filling as they used to be...", 'Time to hunt some lizards and mammals!', "I'm getting stronger, but still need to be careful..."];
        return t[Math.floor(Math.random() * t.length)];
    }
    return THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
};

const setCooldown = (state, id) => ({ ...state.cooldowns, [id]: state.moveNumber + ABILITIES[id].cooldown });

// ==================== EXPLORATION BOOKKEEPING ====================
// Runs after every action: records species, habitats and landmarks Big Al has
// seen, and keeps the event log in step with the notifications.
const recordDiscoveries = (prev, next) => {
    let state = next;
    if (state.mapGenerated && (prev.cells !== state.cells || prev.creatures !== state.creatures)) {
        const journal = state.journal;
        let species = journal.species;
        let biomes = journal.biomes;
        let landmarks = journal.landmarks;
        let notifications = state.notifications;
        let score = state.score;
        const quiet = state.moveNumber === 0;
        for (const [key, list] of state.creatures) {
            if (!state.cells.get(key)?.inSight) continue;
            for (const c of list) {
                if (species[c.species]) continue;
                species = { ...species, [c.species]: { firstTurn: state.moveNumber, kills: 0 } };
                score += 20;
                notifications = addNotification(notifications, { type: 'discovery', message: `New species spotted: ${c.species}`, species: c.species });
            }
        }
        if (prev.cells !== state.cells) {
            for (const cell of state.cells.values()) {
                if (!cell.inSight) continue;
                if (!biomes[cell.terrain]) {
                    biomes = { ...biomes, [cell.terrain]: { firstTurn: state.moveNumber } };
                    if (!quiet) {
                        score += 10;
                        notifications = addNotification(notifications, { type: 'discovery', message: `New habitat: ${TERRAIN_TYPES[cell.terrain].name}` });
                    }
                }
                const poi = state.pois.get(cell.key);
                if (poi && !landmarks[poi.id]) {
                    landmarks = { ...landmarks, [poi.id]: { type: poi.type, key: poi.key, firstTurn: state.moveNumber } };
                    score += 30;
                    notifications = addNotification(notifications, { type: 'discovery', message: `Discovered: ${POI_TYPES[poi.type].name}` });
                }
            }
        }
        if (species !== journal.species || biomes !== journal.biomes || landmarks !== journal.landmarks) {
            state = { ...state, journal: { species, biomes, landmarks }, notifications, score };
        }
    }
    if (state.notifications !== prev.notifications) {
        const seen = new Set(prev.notifications.map((n) => n.id));
        const fresh = state.notifications.filter((n) => !seen.has(n.id) && !(state.eventLog || []).some((e) => e.id === n.id));
        if (fresh.length) {
            state = { ...state, eventLog: [...(state.eventLog || []), ...fresh.map((n) => ({ ...n, turn: state.moveNumber }))].slice(-MAX_EVENT_LOG) };
        }
    }
    return state;
};

// ==================== REDUCER ====================
const coreReducer = (state, action) => {
    switch (action.type) {
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
            return { ...state, worldSeed: seed, cells, player: world.spawnKey, mapGenerated: true, pois: generatePois(world) };
        }

        case 'MOVE_PLAYER': {
            const { target } = action;
            if (state.gameOver || !state.cells.get(state.player)?.neighbors.includes(target)) return state;
            const targetHex = state.cells.get(target);
            if (!targetHex) return state;
            const terrain = TERRAIN_TYPES[targetHex.terrain];

            if (targetHex.terrain === 'quicksand') {
                return {
                    ...killPlayer(state, 'sank', 'You step into the quicksand and sink rapidly...'),
                    player: target,
                    notifications: addNotification(state.notifications, { type: 'death', message: 'You stepped into quicksand and were pulled down into its depths!' })
                };
            }
            if (!terrain.passable) return state;
            if (terrain.minWeight > 0 && state.weight < terrain.minWeight) {
                const river = terrain.name === 'River';
                return {
                    ...killPlayer(state, river ? 'drowned' : 'sank', river ? 'The current sweeps your small body away...' : 'You sink into the terrain...'),
                    player: target,
                    notifications: addNotification(state.notifications, {
                        type: 'death', message: river ? "You tried to cross the river but you're still too small! The current swept you away!" : 'The terrain proved too dangerous for your size!'
                    })
                };
            }

            const dashing = state.dashArmed;
            const sizeMultiplier = Math.max(0.4, Math.min(2.0, Math.pow(state.weight / 150, 0.4)));
            const energyCost = Math.round(terrain.energyCost * sizeMultiplier * (hasPassive(state, 'legs') ? 0.85 : 1)) + (dashing ? ABILITIES.dash.energy : 0);
            const timed = passTime(state, { energyCost, terrain: targetHex.terrain });
            let { fitness, notifications } = timed;

            if (terrain.fitnessRisk > 0 && Math.random() < terrain.fitnessRisk) {
                const damage = Math.round(12 * Math.max(0.5, Math.min(2, state.weight / 100)));
                fitness = Math.max(0, fitness - damage);
                notifications = addNotification(notifications, { type: 'injury', message: `Moving through ${terrain.name} hurt you! -${damage} health` });
            }
            const growth = applyGrowth(state.level, timed.weight, notifications);
            notifications = growth.notifications;

            if (timed.energy <= 0) {
                return {
                    ...killPlayer(state, 'starved', state.level === 1 ? 'Your tiny body finally gives in to hunger...' : 'Even your massive body cannot survive without food...'),
                    notifications: addNotification(notifications, { type: 'death', message: 'You collapse from exhaustion and starvation!' })
                };
            }
            if (fitness <= 0) {
                const thirst = timed.hydration <= 0;
                return {
                    ...killPlayer(state, thirst ? 'dehydrated' : 'injuries', thirst ? 'The heat takes the last of your strength...' : 'Your wounds prove too severe...'),
                    notifications: addNotification(notifications, { type: 'death', message: thirst ? 'You died of thirst.' : 'Your injuries prove fatal!' })
                };
            }

            const traces = ageTraces(state, state.moveNumber + 1);
            const movedState = {
                ...state,
                ...traces,
                player: target,
                moveNumber: state.moveNumber + 1,
                level: growth.level,
                energy: timed.energy,
                fitness,
                weight: timed.weight,
                hydration: timed.hydration,
                notifications,
                dashArmed: false,
                cooldowns: dashing ? setCooldown(state, 'dash') : state.cooldowns,
                stats: { ...state.stats, distance: state.stats.distance + 1 },
                lastPlayerAction: dashing ? { id: uid('act'), type: 'dash' } : state.lastPlayerAction
            };
            const behaviorState = withBehaviors(movedState, processCreatureBehaviors(movedState, { evading: dashing }));
            return {
                ...behaviorState,
                selectedHex: null,
                currentThought: behaviorState.gameOver ? behaviorState.currentThought : contextualThought(behaviorState)
            };
        }

        // Curl up and sleep through one part of the day to heal
        case 'SLEEP': {
            if (state.gameOver) return state;
            const here = state.cells.get(state.player);
            const blockers = sleepBlockers(state);
            if (blockers.length) {
                return { ...state, notifications: addNotification(state.notifications, { type: 'warning', message: `Not safe to sleep with a ${blockers[0].species} right here.` }) };
            }
            const phase = phaseOf(state);
            const [shelterHeal, shelterRisk] = shelterOf(here.terrain);
            const wallow = state.pois.get(state.player)?.type === 'wallow';
            const night = phase >= 3;
            const timed = passTime(state, {
                energyCost: 3,
                terrain: here.terrain,
                heal: 14 * shelterHeal * (night ? 1.3 : 1) * (wallow ? 2 : 1),
                thirstMul: 1.2
            });
            const healed = Math.round(timed.fitness - state.fitness);
            let notifications = addNotification(timed.notifications, {
                type: 'rest', message: `You sleep through the ${getTimeOfDay(state.moveNumber).phaseName.toLowerCase()}${wallow ? ' in the cool mud' : ''}. ${healed > 0 ? `+${healed} health` : state.fitness >= 100 ? 'You wake rested.' : 'You are too hungry or thirsty to heal.'}`
            });
            let slept = {
                ...state,
                ...ageTraces(state, state.moveNumber + 1),
                moveNumber: state.moveNumber + 1,
                energy: timed.energy,
                fitness: timed.fitness,
                weight: timed.weight,
                hydration: timed.hydration,
                notifications,
                stats: { ...state.stats, sleeps: state.stats.sleeps + 1 },
                lastPlayerAction: { id: uid('act'), type: 'sleep' }
            };
            // a predator nearby may find you asleep
            const pf = playerFierceness(state);
            const lurking = [];
            for (const [key, d] of bfsDistances(state.cells, state.player, 2)) {
                if (d === 0) continue;
                for (const c of state.creatures.get(key) || []) {
                    const t = SPECIES_DATA[c.species]?.behaviorType;
                    if (PREDATOR_TYPES.has(t) && creatureThreat(c) > pf * 0.3) lurking.push({ c, key });
                }
            }
            const risk = Math.min(0.6, 0.12 * lurking.length * shelterRisk * (night ? 1.25 : 1));
            if (lurking.length && Math.random() < risk) {
                const { c, key } = lurking[Math.floor(Math.random() * lurking.length)];
                const sd = SPECIES_DATA[c.species];
                const damage = attackDamage(state, c, sd.danger * c.size * 1.2);
                const creatures = placeCreature(removeCreature(state.creatures, key, c.id), state.player, { ...c, lastBehaviorTurn: slept.moveNumber });
                const fitness = Math.max(0, slept.fitness - damage);
                notifications = addNotification(slept.notifications, { type: 'combat', message: `You wake to teeth! A ${c.species} found you asleep. -${damage} health` });
                slept = {
                    ...slept, creatures, fitness, notifications,
                    creatureBehaviorLog: [...slept.creatureBehaviorLog, { id: uid('log'), type: 'creature_attack', creature: c.species, creatureId: c.id, hexKey: state.player, charged: true, message: '', damage }].slice(-MAX_BEHAVIOR_LOG_SIZE)
                };
                if (fitness <= 0) return killPlayer(slept, 'combat', `The ${c.species} found you asleep...`);
                return { ...slept, currentThought: 'Never sleep where hunters can smell you.' };
            }
            const after = withBehaviors(slept, processCreatureBehaviors(slept, { asleep: true }));
            if (after.gameOver) return after;
            if (after.fitness <= 0) return killPlayer(after, timed.hydration <= 0 ? 'dehydrated' : 'injuries', 'You never wake up...');
            return { ...after, currentThought: wallow ? 'The mud is cool on your wounds.' : night ? 'You doze through the dark hours.' : 'A short nap in the warm sun.' };
        }

        case 'DRINK': {
            if (state.gameOver) return state;
            const here = state.cells.get(state.player);
            const sources = [state.player, ...here.neighbors].filter((k) => WATER_SOURCES.has(state.cells.get(k)?.terrain));
            if (!sources.length) return state;
            let next = {
                ...state,
                hydration: 100,
                lastPlayerAction: { id: uid('act'), type: 'drink' },
                currentThought: 'Cool water. Much better.'
            };
            // crocodiles wait at the water's edge
            for (const key of sources) {
                const croc = (state.creatures.get(key) || []).find((c) => c.species === 'Crocodile');
                if (croc && Math.random() < 0.4) {
                    const damage = attackDamage(state, croc, SPECIES_DATA.Crocodile.danger * croc.size * 1.4);
                    next = {
                        ...next,
                        fitness: Math.max(0, state.fitness - damage),
                        notifications: addNotification(state.notifications, { type: 'combat', message: `A crocodile bursts from the water as you drink! -${damage} health` }),
                        creatureBehaviorLog: [...state.creatureBehaviorLog, { id: uid('log'), type: 'creature_attack', creature: 'Crocodile', creatureId: croc.id, hexKey: key, message: '', damage }].slice(-MAX_BEHAVIOR_LOG_SIZE)
                    };
                    if (next.fitness <= 0) return killPlayer(next, 'combat', 'The crocodile drags you under...');
                    break;
                }
            }
            return next;
        }

        case 'USE_ABILITY': {
            if (state.gameOver) return state;
            const id = action.ability;
            if (id === 'dash') {
                if (state.dashArmed) return { ...state, dashArmed: false };
                if (!abilityReady(state, 'dash')) return state;
                return { ...state, dashArmed: true, currentThought: 'Muscles tense. Ready to run.' };
            }
            if (!abilityReady(state, id)) return state;
            const def = ABILITIES[id];
            const base = { ...state, energy: Math.max(0, state.energy - (def.energy || 0)), cooldowns: setCooldown(state, id), lastPlayerAction: { id: uid('act'), type: id } };

            if (id === 'sniff') {
                const scent = [];
                for (const [key, d] of bfsDistances(state.cells, state.player, 4)) {
                    if (d === 0) continue;
                    const cell = state.cells.get(key);
                    for (const c of state.creatures.get(key) || []) scent.push({ key, kind: 'creature', species: c.species, turn: state.moveNumber, hidden: !cell.inSight });
                    for (const c of state.carcasses.get(key) || []) scent.push({ key, kind: 'carcass', species: c.species, turn: state.moveNumber, hidden: !cell.inSight });
                    if (state.blood.has(key)) scent.push({ key, kind: 'blood', turn: state.moveNumber, hidden: !cell.inSight });
                    const poi = state.pois.get(key);
                    if (poi && (poi.type === 'sauropodcarcass' || poi.type === 'eggs') && (poi.portions ?? 1) > 0) scent.push({ key, kind: 'carcass', species: poi.type === 'eggs' ? 'Eggs' : poi.species, turn: state.moveNumber, hidden: !cell.inSight });
                }
                const hidden = scent.filter((s) => s.hidden);
                const kinds = [...new Set(hidden.filter((s) => s.species).map((s) => s.species))];
                return {
                    ...base,
                    scent,
                    notifications: addNotification(state.notifications, {
                        type: 'info',
                        message: hidden.length ? `You catch the scent of ${kinds.slice(0, 3).join(', ') || 'blood'}${kinds.length > 3 ? ' and more' : ''} nearby.` : 'You sniff the air. Nothing hidden nearby.'
                    }),
                    currentThought: hidden.length ? 'The wind tells you things your eyes cannot.' : 'Only ferns and dust on the wind.'
                };
            }

            if (id === 'roar') {
                const pf = playerFierceness(state);
                let creatures = state.creatures;
                const occupancy = new Map([...creatures].map(([k, l]) => [k, l.length]));
                const log = [];
                const scared = [];
                for (const [key, d] of bfsDistances(state.cells, state.player, 1)) {
                    for (const c of state.creatures.get(key) || []) {
                        const sd = SPECIES_DATA[c.species];
                        if (!sd || creatureThreat(c) >= pf * 0.8 || sd.behaviorType === 'giant_herbivore') continue;
                        const to = escapeCell(state, key, occupancy);
                        creatures = removeCreature(creatures, key, c.id);
                        occupancy.set(key, (occupancy.get(key) || 1) - 1);
                        if (to && to !== state.player) {
                            creatures = placeCreature(creatures, to, c);
                            occupancy.set(to, (occupancy.get(to) || 0) + 1);
                        }
                        scared.push(c.species);
                        if (d === 0) log.push({ id: uid('log'), type: 'creature_flee', creatureId: c.id, creature: c.species, hexKey: key });
                    }
                }
                return {
                    ...base,
                    creatures,
                    creatureBehaviorLog: [...state.creatureBehaviorLog, ...log].slice(-MAX_BEHAVIOR_LOG_SIZE),
                    notifications: addNotification(state.notifications, {
                        type: 'info', message: scared.length ? `Your roar scatters ${scared.length} animal${scared.length > 1 ? 's' : ''}.` : 'You roar. Nothing nearby is impressed.'
                    }),
                    currentThought: scared.length ? 'They know who rules here now.' : 'Your roar echoes across the basin.'
                };
            }
            return state;
        }

        case 'UPDATE_VISIBILITY': {
            if (!state.player) return state;
            const phase = phaseOf(state);
            const here = state.cells.get(state.player);
            let rangeBonus = 0;
            if (state.pois.get(state.player)?.type === 'lookout') rangeBonus += 2;
            if (phase === 3 || phase === 4) rangeBonus -= 1;
            if (here && isMisty(here.terrain, phase, here.key)) rangeBonus -= 1;
            const newHexes = calculateVisibility(state.player, state.cells, state.worldSeed, { rangeBonus });
            const newCreatures = new Map(state.creatures);
            for (const [hexKey, creatures] of newCreatures.entries()) {
                const hex = newHexes.get(hexKey);
                if (hex && hex.inSight) newCreatures.set(hexKey, creatures.map((creature) => ({ ...creature, lastSeenTurn: state.moveNumber })));
            }
            return { ...state, cells: newHexes, creatures: newCreatures };
        }

        case 'SPAWN_CREATURES': {
            if (state.gameOver) return state;
            const playerKey = state.player;
            const playerHex = state.cells.get(playerKey);
            if (!playerHex) return state;
            const current = state.creatures.get(playerKey) || [];
            if (current.length >= MAX_CREATURES_PER_HEX) return state;
            const spawned = rollSpawns(playerHex.terrain, state, { existing: current.length, key: playerKey });
            if (spawned.length === 0) return state;
            const newCreaturesMap = new Map(state.creatures);
            newCreaturesMap.set(playerKey, [...current, ...spawned]);
            return { ...state, creatures: newCreaturesMap };
        }

        // Fill the cells you can see with wildlife and forget creatures far behind you
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
                const spawned = rollSpawns(hex.terrain, state, { chanceScale: 0.4, max: 3, key });
                if (spawned.length) {
                    newCreatures.set(key, spawned);
                    total += spawned.length;
                }
            }
            return { ...state, creatures: newCreatures, populatedAt };
        }

        case 'ATTACK_CREATURE': {
            const { creatureId } = action;
            const style = action.style || 'normal';
            if (state.gameOver) return state;
            if (style !== 'normal' && (!abilityReady(state, style) || ABILITIES[style].kind !== 'attack')) return state;
            if (style === 'ambush' && !inCover(state, playerMisty(state))) return state;

            const playerKey = state.player;
            const targetCreature = (state.creatures.get(playerKey) || []).find((c) => c.id === creatureId);
            if (!targetCreature) return state;
            const speciesData = SPECIES_DATA[targetCreature.species];
            const preyWeight = speciesData.weight * targetCreature.size;
            if (style === 'hatchet' && !hatchetTarget(state, targetCreature)) return state;
            let newState = { ...state, creatures: removeCreature(state.creatures, playerKey, creatureId) };
            if (style !== 'normal') newState.cooldowns = setCooldown(state, style);
            let notifications = state.notifications;
            const combatLog = [];
            let outcome;

            // modifiers from the attack style and the prey's condition
            const mods = ATTACK_MODS[style];
            const woundMul = targetCreature.wounded ? Math.max(0.15, (targetCreature.health ?? 100) / 100) : 1;
            const fiercenessRatio = calculateFiercenessRatio(state.weight, state.fitness, speciesData, targetCreature.size) * mods[0] * woundMul;
            const agilityRatio = calculateAgilityRatio(state.weight, speciesData) * mods[1] * (targetCreature.wounded ? 0.6 : 1);
            const escapeChance = attemptCreatureEscape(targetCreature.species, speciesData, targetCreature.size, state.weight, state.level) * mods[2];
            const flee = () => {
                // it bolts into a neighbouring area: you can give chase
                const occupancy = new Map([...newState.creatures].map(([k, l]) => [k, l.length]));
                const to = escapeCell(state, playerKey, occupancy);
                if (to) newState.creatures = placeCreature(newState.creatures, to, { ...targetCreature, lastBehaviorTurn: state.moveNumber });
            };

            if (style === 'hatchet' && agilityRatio < 1.3 && fiercenessRatio < 2.5) {
                // slash and let it bleed
                outcome = 'wound';
                const health = (targetCreature.health ?? 100) - (38 + Math.random() * 18);
                const occupancy = new Map([...newState.creatures].map(([k, l]) => [k, l.length]));
                const to = escapeCell(state, playerKey, occupancy) || playerKey;
                newState.creatures = placeCreature(newState.creatures, to, { ...targetCreature, wounded: true, health, lastBehaviorTurn: state.moveNumber });
                newState.blood = new Map(state.blood).set(playerKey, state.moveNumber).set(to, state.moveNumber);
                combatLog.push(`Your hatchet bite opens a deep wound in the ${targetCreature.species}. It flees, bleeding heavily.`);
                if (Math.random() < 0.35) {
                    const injury = Math.round(calculateInjuries(fiercenessRatio * 0.6) * (hasPassive(state, 'hide') ? 0.8 : 1));
                    newState.fitness = Math.max(0, state.fitness - injury);
                    combatLog.push(`It ${speciesData.injury} as it goes. -${injury} health`);
                }
                newState.energy = Math.max(0, state.energy - 6);
                newState.currentThought = 'Now follow the blood. It will not get far.';
            } else if (style !== 'hatchet' && Math.random() < escapeChance) {
                outcome = 'escape';
                flee();
                combatLog.push(`The ${targetCreature.species} darts away before you can catch it!`);
                newState.energy = Math.max(0, state.energy - 4);
                newState.currentThought = 'Too slow! It ran into the next area.';
            } else if (style !== 'hatchet' && fiercenessRatio < 1 && agilityRatio < 1) {
                outcome = 'kill';
                combatLog.push(`${style === 'ambush' ? 'From cover, you' : style === 'pounce' ? 'You pounce and' : 'You'} take the ${targetCreature.species}!`);
                const injuryAmount = calculateInjuries(fiercenessRatio);
                if (injuryAmount > 3) {
                    newState.fitness = Math.max(0, state.fitness - injuryAmount);
                    combatLog.push(`The struggle hurts you. -${Math.round(injuryAmount)} health`);
                }
                const energyGain = calculateEnergyGain(speciesData, targetCreature.size, state.weight, state.level);
                const fed = feed(state, energyGain, targetCreature.size);
                newState.energy = fed.energy;
                newState.weight = fed.weight;
                newState.score = fed.score;
                if (fed.weightGain > 0) combatLog.push(`+${fed.weightGain >= 1 ? `${fed.weightGain.toFixed(1)}kg` : `${Math.round(fed.weightGain * 1000)}g`}, full belly.`);
                else combatLog.push(`+${Math.round(energyGain)} energy.`);
                // big kills leave leftovers to come back to
                const hungerRoom = Math.max(1, 100 - state.energy);
                if (preyWeight > state.weight * 0.5 && energyGain > hungerRoom * 1.6) {
                    const portions = Math.min(5, Math.floor(energyGain / (hungerRoom * 1.6)));
                    newState.carcasses = addCarcass(state.carcasses, playerKey, { species: targetCreature.species, size: targetCreature.size, turn: state.moveNumber, portions });
                    combatLog.push('You cannot finish it all: leftovers remain.');
                }
                const growth = applyGrowth(state.level, newState.weight, notifications);
                newState.level = growth.level;
                notifications = growth.notifications;
                newState.stats = { ...state.stats, kills: state.stats.kills + 1 };
                const entry = state.journal.species[targetCreature.species] || { firstTurn: state.moveNumber, kills: 0 };
                newState.journal = { ...state.journal, species: { ...state.journal.species, [targetCreature.species]: { ...entry, kills: entry.kills + 1 } } };
            } else if (style !== 'hatchet' && fiercenessRatio < 1) {
                outcome = 'escape';
                flee();
                combatLog.push(`The ${targetCreature.species} escapes your clumsy attack!`);
                newState.energy = Math.max(0, state.energy - 5);
            } else {
                // it fights back and stands its ground
                outcome = 'hurt';
                newState.creatures = placeCreature(newState.creatures, playerKey, { ...targetCreature, lastBehaviorTurn: state.moveNumber });
                const injuries = Math.round(calculateInjuries(fiercenessRatio) * (state.level <= 2 ? 1.8 : 1) * (hasPassive(state, 'hide') ? 0.8 : 1));
                newState.fitness = Math.max(0, state.fitness - injuries);
                newState.energy = Math.max(0, state.energy - 12);
                combatLog.push(`The ${targetCreature.species} ${speciesData.injury}! -${injuries} health`);
            }
            if (!newState.currentThought || newState.currentThought === state.currentThought) newState.currentThought = combatLog[0];
            if (newState.fitness <= 0) {
                newState = killPlayer(newState, 'combat', state.level === 1 ? `The ${targetCreature.species} was too dangerous for a small hatchling...` : `The ${targetCreature.species} proved too powerful...`);
            }
            newState.notifications = addNotification(notifications, { type: outcome === 'kill' || outcome === 'wound' ? 'success' : 'combat', message: combatLog.join(' ') });
            newState.lastPlayerAction = { id: uid('act'), type: 'attack', style, creatureId, outcome };
            return newState;
        }

        // Eat what other predators (or Big Al) left behind
        case 'SCAVENGE': {
            if (state.gameOver) return state;
            const playerKey = state.player;
            const list = (state.carcasses || new Map()).get(playerKey) || [];
            const carcass = list.find((c) => c.id === action.carcassId);
            if (!carcass) return state;
            const speciesData = SPECIES_DATA[carcass.species];
            const freshness = Math.max(0.3, 1 - (state.moveNumber - carcass.turn) / CARCASS_DECAY_TURNS);
            const energyGain = Math.max(2, Math.round(calculateEnergyGain(speciesData, carcass.size, state.weight, state.level) * 0.6 * freshness / Math.sqrt(carcass.portions || 1)));
            const fed = feed(state, energyGain, carcass.size, 0.7);
            const growth = applyGrowth(state.level, fed.weight, state.notifications);
            const carcasses = new Map(state.carcasses);
            const rest = list.map((c) => (c.id === carcass.id ? { ...c, portions: (c.portions || 1) - 1 } : c)).filter((c) => c.portions > 0);
            if (rest.length) carcasses.set(playerKey, rest);
            else carcasses.delete(playerKey);
            return {
                ...state,
                carcasses,
                energy: fed.energy,
                weight: fed.weight,
                score: fed.score,
                level: growth.level,
                stats: { ...state.stats, scavenged: state.stats.scavenged + 1 },
                notifications: addNotification(growth.notifications, {
                    type: 'success', message: `You feed on the ${carcass.species} carcass (+${energyGain} energy${fed.weightGain > 0 ? `, +${fed.weightGain >= 1 ? `${fed.weightGain.toFixed(1)}kg` : `${Math.round(fed.weightGain * 1000)}g`}` : ''})`
                }),
                currentThought: freshness > 0.6 ? 'Still warm. Free food is the best food.' : 'A bit ripe... but food is food.',
                lastPlayerAction: { id: uid('act'), type: 'scavenge', carcassId: carcass.id }
            };
        }

        // Points of interest you can use (eggs, fallen sauropods)
        case 'USE_POI': {
            if (state.gameOver) return state;
            const poi = state.pois.get(state.player);
            if (!poi || !(poi.portions > 0)) return state;
            const pois = new Map(state.pois).set(poi.key, { ...poi, portions: poi.portions - 1 });
            let energyGain;
            let message;
            let weightFactor = 0.8;
            if (poi.type === 'eggs') {
                energyGain = Math.round(Math.max(3, 34 / Math.pow(Math.max(1, state.weight), 0.35)));
                message = `You crack an egg and gulp it down (+${energyGain} energy)`;
                weightFactor = 1.2;
            } else if (poi.type === 'sauropodcarcass') {
                energyGain = Math.round(Math.min(70, 30 + state.level * 9));
                message = `You tear into the ${poi.species} carcass (+${energyGain} energy)`;
            } else return state;
            const fed = feed(state, energyGain, poi.type === 'eggs' ? 0.4 : 1.5, weightFactor);
            const growth = applyGrowth(state.level, fed.weight, state.notifications);
            return {
                ...state,
                pois,
                energy: fed.energy,
                weight: fed.weight,
                score: fed.score,
                level: growth.level,
                notifications: addNotification(growth.notifications, { type: 'success', message: `${message}${fed.weightGain > 0 ? `, +${fed.weightGain >= 1 ? `${fed.weightGain.toFixed(1)}kg` : `${Math.round(fed.weightGain * 1000)}g`}` : ''}` }),
                currentThought: poi.type === 'eggs' ? 'Rich and warm. More, please.' : 'More meat than you could ever finish.',
                lastPlayerAction: { id: uid('act'), type: 'scavenge' }
            };
        }

        // Dev helper (window.teleport in development builds)
        case 'DEBUG_TELEPORT': {
            if (!state.cells.has(action.key)) return state;
            return { ...state, player: action.key, moveNumber: action.turn ?? state.moveNumber };
        }

        case 'DEBUG_SPAWN': {
            const key = action.hexKey || state.player;
            if (!SPECIES_DATA[action.species]) return state;
            return { ...state, creatures: placeCreature(state.creatures, key, makeCreature(action.species, state, action.size ?? 1)) };
        }

        case 'PROCESS_CREATURE_BEHAVIORS': {
            if (state.gameOver) return state;
            return withBehaviors(state, processCreatureBehaviors(state));
        }

        case 'DISMISS_NOTIFICATION':
            return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };

        case 'AUTO_DISMISS_NOTIFICATIONS': {
            const now = Date.now();
            const kept = state.notifications.filter((n) => (now - n.timestamp) < NOTIFICATION_AUTO_DISMISS_TIME);
            return kept.length === state.notifications.length ? state : { ...state, notifications: kept };
        }

        case 'RESTART_GAME':
            return {
                ...initialGameState,
                cells: new Map(),
                creatures: new Map(),
                carcasses: new Map(),
                blood: new Map(),
                populatedAt: new Map(),
                pois: new Map(),
                journal: { species: {}, biomes: {}, landmarks: {} },
                stats: { kills: 0, scavenged: 0, sleeps: 0, distance: 0 }
            };

        case 'SELECT_HEX':
            return { ...state, selectedHex: action.hex };

        case 'HOVER_HEX':
            return { ...state, hoveredHex: action.hex };

        case 'CLEAR_HOVER':
            return state.hoveredHex ? { ...state, hoveredHex: null } : state;

        default:
            return state;
    }
};

export const gameReducer = (state, action) => {
    const next = coreReducer(state, action);
    if (next === state) return state;
    return recordDiscoveries(state, next);
};
