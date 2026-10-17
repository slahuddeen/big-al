// ==================== GAME STATE ====================
import { distanceToPlayer, bfsDistances } from '../world/cellGraph.js';
import { getWorld } from '../world/worldGen.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA, HABITAT_SPECIES, GROUP_SIZE, CHASERS, FLYERS, AQUATIC, SEMI_AQUATIC, CROCODILES, activityFactor } from '../data/species.js';
import { biteDamage, boltChance, fightBackChance, standsGround, packPower, preyMass, STYLE_MODS } from './combat.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateInjuries, calculateEnergyGain, escapeChance as attemptCreatureEscape } from '../utils/combatUtils.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { executeCreatureBehavior } from '../utils/creatureBehaviors.js';
import { ABILITIES, ATTACK_MODS, hasPassive, abilityReady, inCover } from './abilities.js';
import { isMisty, WATER_SOURCES, thirstFactor, shelterOf } from './environment.js';
import { generatePois, POI_TYPES } from './pois.js';
import { GOALS } from './goals.js';
import { DIETS, factsOf } from '../data/speciesFacts.js';
import { seasonOf, isDrought, DRIES_UP, isRaining, weatherAt, seasonSpawnFactor } from './weather.js';
import {
    MAX_WEIGHT,
    HEALING_RATE,
    MAX_NOTIFICATIONS,
    NOTIFICATION_AUTO_DISMISS_TIME,
    THOUGHTS,
    getTimeOfDay
} from './gameConstants.js';

// Growth stages: a 1kg hatchling grows into a seven-tonne river giant
export const LEVEL_NAMES = ['', 'hatchling', 'juvenile', 'sub-adult', 'adult'];
export const LEVEL_WEIGHTS = [0, 20, 500, 2500, MAX_WEIGHT];

export const PREY_SIZE_CATEGORIES = {
    'tiny': ['Dragonfly', 'Centipede', 'Cricket', 'Scorpion'],
    'small': ['Frog', 'Lizard', 'Fish', 'Lapparentophis', 'Hamadachelys', 'Leptostomia', 'Araripesuchus', 'Afrotapejara', 'Enantiornithine', 'Simoliophis', 'Pachyrhachis'],
    'medium': ['Noasaurid', 'Lungfish', 'Calamopleurus', 'Bawitius', 'Tribodus', 'Siroccopteryx', 'Injured Pterosaur', 'Alanqa', 'Dromaeosaur', 'Obaichthys'],
    'large': ['Iguanodont', 'Young Spinosaurus', 'River Plesiosaur', 'Mawsonia', 'Laganosuchus', 'Elosuchus', 'Rugops', 'Deltadromeus', 'Kaprosuchus'],
    'huge': ['Onchopristis', 'Aegisuchus', 'Sauroniops', 'Bahariasaurus', 'Carcharodontosaurus', 'Spinosaurus', 'Rebbachisaurus', 'Aegyptosaurus', 'Paralititan']
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
const MOVE_ACTIONS = new Set(['move', 'flee', 'roam', 'move_to_preferred', 'hunt_from_above', 'hunt_prey', 'chase_competitor']);
const DISPLAY_ACTIONS = new Set(['warning', 'intimidate', 'defensive_posture']);

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const phaseOf = (state) => getTimeOfDay(state.moveNumber).turnInCycle;
const passable = (state, key) => {
    const c = state.cells.get(key);
    return !!c && TERRAIN_TYPES[c.terrain].passable && c.terrain !== 'quicksand';
};

// ---------- water ----------
// Fish need water; land animals will not follow you into the deep channels and
// lakes, so for a spinosaur the river is a refuge as well as a larder
export const WATERY = new Set(['river', 'stream', 'lake', 'waterhole', 'marsh', 'mangrove', 'sea']);
export const DEEP = new Set(['river', 'lake']);
// fish also live in the pools of the floodplain and the tidal flats
const FISH_WATERS = new Set(['river', 'stream', 'lake', 'waterhole', 'marsh', 'mangrove', 'floodplain', 'beach']);
export const inWater = (state) => WATERY.has(state.cells.get(state.player)?.terrain);
export const inDeepWater = (state) => DEEP.has(state.cells.get(state.player)?.terrain);
export const canEnter = (state, key, c) => {
    const t = state.cells.get(key)?.terrain;
    if (!t || !passable(state, key)) return false;
    if (AQUATIC.has(c.species)) return FISH_WATERS.has(t);
    if (FLYERS.has(c.species) || SEMI_AQUATIC.has(c.species)) return true;
    return !DEEP.has(t);
};
const fromLand = (c) => !AQUATIC.has(c.species) && !SEMI_AQUATIC.has(c.species) && !FLYERS.has(c.species);

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

// ---------- weather helpers ----------
export const raining = (state) => state.worldSeed !== null && isRaining(state.worldSeed, state.moveNumber);
export const weatherNow = (state) => (state.worldSeed !== null ? weatherAt(state.worldSeed, state.moveNumber) : 'clear');
// Can you drink here? Small waters dry up in the drought; in the rain there are puddles everywhere
export const drinkableAt = (state, key) => {
    const t = state.cells.get(key)?.terrain;
    if (!WATER_SOURCES.has(t)) return false;
    return !(DRIES_UP.has(t) && isDrought(state.moveNumber));
};
export const canDrink = (state) => {
    const here = state.cells.get(state.player);
    if (!here) return false;
    return raining(state) || [state.player, ...here.neighbors].some((k) => drinkableAt(state, k));
};

// How well a small dinosaur can hide here (0..1)
const COVER_SCORE = {
    river: 0.9, lake: 0.9, mangrove: 0.85, marsh: 0.8, stream: 0.55, waterhole: 0.5,
    deadfall: 0.9, denseforest: 0.85, jungle: 0.85, oldgrowth: 0.75, galleryforest: 0.75, forest: 0.7, youngforest: 0.7,
    marsh: 0.7, fernprairie: 0.65, boulderfield: 0.65, katydidmeadow: 0.55, forestedge: 0.55, scrubland: 0.55,
    openwoods: 0.5, ginkgogrove: 0.5, rocky: 0.45, riverbank: 0.45, termitemounds: 0.4, deadforest: 0.35, nest: 0.35, hills: 0.3,
    desert: 0.1, beach: 0.1, sauropodgrounds: 0.15
};
// Too big to hide on land from the sub-adult stage, but you can always sink into the water
export const canHideHere = (state) => state.level <= 2 || inWater(state);
export const hideChance = (state, creature = null) => {
    const here = state.cells.get(state.player);
    let p = COVER_SCORE[here?.terrain] ?? 0.2;
    // under water only the eyes and nostrils show, whatever your size; on land a juvenile is harder to tuck away
    if (!inWater(state)) p *= state.level === 1 ? 1 : 0.7;
    else if (creature && !fromLand(creature)) p *= 0.6; // crocodiles and fish see you fine down there
    if (raining(state)) p *= 1.25;
    if (playerMisty(state)) p *= 1.2;
    if (creature?.engaged) p *= 0.65; // much harder once it has its eye on you
    return Math.max(0.05, Math.min(0.95, p));
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
        2: { tiny: 1.2, small: 4.0, medium: 3.0, large: 1.5, huge: 0.3 },
        3: { tiny: 0.12, small: 1.4, medium: 3.5, large: 3.0, huge: 1.8 },
        4: { tiny: 0.01, small: 0.3, medium: 2.5, large: 4.0, huge: 4.5 }
    };
    let multiplier = multipliers[playerLevel][category];
    if (category === 'tiny' && playerWeight > 2.0) multiplier *= Math.max(0.3, 1 / (playerWeight / 50));
    else if (category === 'small' && playerWeight > 10.0) multiplier *= Math.max(0.4, 1 / (playerWeight / 200));
    else if (category === 'medium' && playerWeight < 2) multiplier *= 1.5;
    return multiplier;
};

const GIANTS = new Set(['Rebbachisaurus', 'Aegyptosaurus', 'Paralititan']);
const makeCreature = (species, state, size, extra = {}) => {
    const sd = SPECIES_DATA[species];
    const minAge = sd.minimumAge || 0.1;
    // grown sauropods are grown: their young come separately with the herd
    const adultSize = GIANTS.has(species) ? 0.55 + Math.random() * 0.45 : minAge + (1 - minAge) * Math.random();
    return {
        id: uid(species), species,
        size: size ?? adultSize,
        behavior: 'neutral', spawnTurn: state.moveNumber, lastBehaviorTurn: state.moveNumber, lastSeenTurn: state.moveNumber,
        health: 100, status: 'normal', energy: 100, ...extra
    };
};

// A grown sauropod fills half an area on its own: at most two per area
export const MAX_GIANTS_PER_CELL = 2;
export const isBigGiant = (c) => GIANTS.has(c.species) && (c.size ?? 1) > 0.3;
// How much room a grown giant takes up: a Paralititan, one of the largest animals that
// ever lived, fills an area on its own; two of the others fit side by side
const GIANT_LOAD = { Paralititan: 2 };
export const giantLoad = (c) => (isBigGiant(c) ? GIANT_LOAD[c.species] ?? 1 : 0);
const countGiants = (list) => (list || []).reduce((sum, c) => sum + giantLoad(c), 0);

const countFlyers = (creatures) => [...creatures.values()].flat().filter((c) => FLYERS.has(c.species)).length;

// Roll which creatures appear on a cell of the given terrain. Herds and packs arrive together.
const rollSpawns = (terrain, state, { chanceScale = 1, max = MAX_CREATURES_PER_HEX, existing = 0, key = null, flyerBudget = 2, giantsHere = 0 } = {}) => {
    const dist = { ...(HABITAT_SPECIES[terrain] || {}) };
    const poi = key ? state.pois?.get(key) : null;
    if (poi?.type === 'sauropodcarcass' && poi.portions > 0) {
        // a fallen giant draws in every predator around
        Object.assign(dist, { Carcharodontosaurus: 0.15, Sauroniops: 0.1, Bahariasaurus: 0.1, Rugops: 0.15, Deltadromeus: 0.12, Noasaurid: 0.25, Alanqa: 0.2, Araripesuchus: 0.2 });
    }
    const phase = phaseOf(state);
    const spawned = [];
    let attempts = 0;
    let flyers = flyerBudget;
    for (const species of Object.keys(dist).sort(() => Math.random() - 0.5)) {
        if (existing + spawned.length >= max || attempts >= 10) break;
        attempts++;
        if (FLYERS.has(species) && flyers <= 0) continue;
        let chance = dist[species] * getPreySizeMultiplier(state.level, state.weight, species) * chanceScale * activityFactor(species, phase) * seasonSpawnFactor(terrain, species, state.moveNumber);
        if (state.level <= 2 && ['Carcharodontosaurus', 'Sauroniops', 'Bahariasaurus', 'Spinosaurus', 'Aegisuchus', 'Onchopristis'].includes(species)) chance *= 0.05;
        if (GIANTS.has(species) && terrain === 'sauropodgrounds') chance = Math.max(chance, dist[species] * chanceScale); // herds are always on the move here
        if (Math.random() >= chance) continue;
        const [gMin, gMax] = GROUP_SIZE[species] || [1, 1];
        let n = Math.min(max - existing - spawned.length, gMin + Math.floor(Math.random() * (gMax - gMin + 1)));
        if (FLYERS.has(species)) n = Math.min(n, flyers);
        if (n <= 0) continue;
        if (FLYERS.has(species)) flyers -= n;
        const herd = uid('herd');
        // every herd in the basin migrates the same way along the routes
        const heading = GIANTS.has(species) ? (state.migration ?? Math.random() * Math.PI * 2) : Math.random() * Math.PI * 2;
        if (GIANTS.has(species)) {
            // two grown animals at most per area; the young walk among them
            const load = GIANT_LOAD[species] ?? 1;
            const adults = Math.min(Math.floor((MAX_GIANTS_PER_CELL - giantsHere - countGiants(spawned)) / load), 1 + Math.floor(Math.random() * 2));
            if (adults <= 0) continue;
            // a calf or two walk among the adults (only one beside a Paralititan)
            const young = Math.min(max - existing - spawned.length - adults, Math.floor(Math.random() * (load > 1 ? 2 : 3)));
            for (let i = 0; i < adults; i++) spawned.push(makeCreature(species, state, undefined, { herd, heading }));
            for (let i = 0; i < young; i++) spawned.push(makeCreature(species, state, 0.01 + Math.random() * 0.07, { herd, heading }));
            continue;
        }
        spawned.push(makeCreature(species, state, undefined, { herd, heading }));
        for (let i = 1; i < n; i++) {
            // herds bring their young along (a young sauropod is tiny next to its parents)
            const young = species === 'Iguanodont' && Math.random() < 0.5;
            spawned.push(makeCreature(species, state, young ? 0.15 + Math.random() * 0.25 : undefined, { herd, heading }));
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
    stats: { kills: 0, scavenged: 0, sleeps: 0, distance: 0, drinks: 0, biggestKill: 0, openKills: 0, visited: {} },
    pack: [], // hunting companions: [{ id, name, weight, health }]
    goals: {}, // goal id -> turn completed

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
        2: 'Bugs are getting less satisfying. You can swim the big river now: fish, turtles and lungfish wait there.',
        3: 'Small fish will not keep you going now. Hunt the big fish, crocodiles and the odd iguanodont.',
        4: 'You are the river king. Sawfish, giant coelacanths and even titanosaurs are prey now. Watch for Carcharodontosaurus.'
    };
    if (learned.length || advice[newLevel]) {
        n = addNotification(n, { type: 'levelup', message: `${learned.length ? `New abilities: ${learned.join(', ')}. ` : ''}${advice[newLevel] || ''}` });
    }
    return { level: newLevel, notifications: n };
};

// A spinosaur grows to more than three times an allosaur's weight, so it puts weight on faster
const GROWTH_SCALE = 3;

// Feeding: shared by hunting and scavenging
const feed = (state, energyGain, preySize, weightFactor = 1) => {
    const newEnergy = Math.min(100, state.energy + energyGain);
    if (newEnergy >= 90 && energyGain > 8) {
        const weightGain = (energyGain * 0.015) * Math.pow(preySize, 0.8) * weightFactor * GROWTH_SCALE;
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
const escapeCell = (state, fromKey, occupancy, creature = null) => {
    let best = null;
    let bestD = -1;
    for (const n of state.cells.get(fromKey)?.neighbors || []) {
        if (!passable(state, n) || (occupancy.get(n) || 0) >= MAX_CREATURES_PER_HEX) continue;
        if (creature && !canEnter(state, n, creature)) continue;
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
    if (creature.lostUntil !== undefined && creature.lostUntil >= state.moveNumber) return 0; // it lost you
    if (state.hiddenAt === state.moveNumber) p *= 0.25;
    if (inWater(state) && fromLand(creature)) p *= inDeepWater(state) ? 0.3 : 0.6; // low in the water you are hard to spot from the bank
    if (raining(state)) p *= weatherNow(state) === 'storm' ? 0.5 : 0.65; // rain hides your scent
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

// Damage an animal does when it strikes back in a fight (for the encounter cards)
export const counterDamage = (state, c) => attackDamage(state, c, (SPECIES_DATA[c.species]?.danger ?? 1) * (c.size ?? 1));

// ==================== CREATURE TURN ====================
// Animals act on their own; attacks only land from Big Al's own area, so an
// aggressive animal next door charges in first. Hunters may keep chasing you
// for a few turns, packs gang up, and sauropod herds walk their migration routes.
const headingFor = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 3600;
    return (h / 3600) * Math.PI * 2;
};

const processCreatureBehaviors = (gameState, opts = {}) => {
    const placements = [];
    const killed = new Set();
    const attacked = new Set();
    let carcasses = new Map(gameState.carcasses || []);
    const blood = new Map(gameState.blood || []);
    const behaviorLog = [];
    const occupancy = new Map();
    const giants = new Map();
    for (const [k, list] of gameState.creatures) {
        occupancy.set(k, list.length);
        giants.set(k, countGiants(list));
    }
    const player = gameState.player;
    const pf = playerFierceness(gameState);
    const turn = gameState.moveNumber;
    const move = (from, to, c = null) => {
        occupancy.set(from, (occupancy.get(from) || 1) - 1);
        occupancy.set(to, (occupancy.get(to) || 0) + 1);
        if (c && isBigGiant(c)) {
            giants.set(from, Math.max(0, (giants.get(from) || 0) - giantLoad(c)));
            giants.set(to, (giants.get(to) || 0) + giantLoad(c));
        }
    };
    const roomAt = (key, c = null) => (occupancy.get(key) || 0) < MAX_CREATURES_PER_HEX && (!c || canEnter(gameState, key, c)) && (!c || !isBigGiant(c) || (giants.get(key) || 0) + giantLoad(c) <= MAX_GIANTS_PER_CELL);
    const pushAttack = (creature, key, charged, message, raw) => {
        attacked.add(creature.id);
        creature.engaged = true;
        if (CHASERS[creature.species]) creature.chasing = 3;
        if (opts.evading) {
            behaviorLog.push({ id: uid('log'), type: 'creature_miss', creature: creature.species, creatureId: creature.id, hexKey: key, charged, message: `The ${creature.species} lunges, but you're already gone!` });
        } else {
            behaviorLog.push({ id: uid('log'), type: 'creature_attack', creature: creature.species, creatureId: creature.id, hexKey: key, charged, message, damage: attackDamage(gameState, creature, raw) });
        }
    };
    const rallies = new Set(); // pack species that have started an attack this turn
    const displaced = new Map(); // animals driven off by a rival: id -> cell

    for (const [hexKey, creatures] of gameState.creatures.entries()) {
        for (const original of creatures) {
            if (killed.has(original.id)) continue;
            const creature = { ...original };
            let destKey = hexKey;
            const sd = SPECIES_DATA[creature.species] || {};
            try {
                // wounded animals bleed, weaken and try to get away
                if (creature.wounded) {
                    creature.health = (creature.health ?? 100) - (creature.bleed ?? 12);
                    blood.set(hexKey, turn);
                    if (creature.health <= 0) {
                        killed.add(creature.id);
                        carcasses = addCarcass(carcasses, hexKey, { species: creature.species, size: creature.size, turn, portions: Math.max(2, Math.min(8, Math.round(preyMass(creature) / Math.max(1, gameState.weight)))) });
                        behaviorLog.push({ id: uid('log'), type: 'creature_died', creature: creature.species, creatureId: creature.id, hexKey, mass: preyMass(creature), byPlayer: !!creature.woundedByPlayer, message: `The wounded ${creature.species} collapses.`, near: distanceToPlayer(gameState, hexKey) <= 4 });
                        continue;
                    }
                    if (hexKey !== player || Math.random() < 0.6) {
                        if (Math.random() < 0.75) {
                            const to = escapeCell(gameState, hexKey, occupancy, creature);
                            if (to && roomAt(to, creature)) {
                                destKey = to;
                                move(hexKey, to, creature);
                                blood.set(to, turn);
                                behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, message: `The wounded ${creature.species} staggers away, leaving a trail of blood.`, near: false });
                            }
                        }
                        placements.push({ creature, key: destKey, origin: hexKey });
                        continue;
                    }
                }

                // hunters on your trail keep coming
                if (creature.chasing > 0 && !gameState.gameOver) {
                    const dist = distanceToPlayer(gameState, hexKey);
                    creature.chasing -= 1;
                    const loseTrail = opts.evading || (inCover(gameState, playerMisty(gameState)) && Math.random() < 0.3) || (raining(gameState) && Math.random() < 0.35) || dist > 3 || (creature.lostUntil ?? -1) >= turn || (fromLand(creature) && inDeepWater(gameState));
                    if (loseTrail) {
                        creature.chasing = 0;
                        if (dist <= 3) behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey, message: `The ${creature.species} loses your trail.`, near: true });
                    } else if (creature.lastChaseTurn !== turn || dist === 0) {
                        creature.lastChaseTurn = turn;
                        let at = hexKey;
                        const steps = Math.random() < (CHASERS[creature.species] || 0.5) ? 2 : 1;
                        for (let i = 0; i < steps && at !== player; i++) {
                            const to = towardPlayer(gameState, at);
                            if (!to || !roomAt(to, creature)) break;
                            move(at, to, creature);
                            at = to;
                        }
                        destKey = at;
                        if (at === player && Math.random() < noticeChance(gameState, creature, opts) + 0.25) {
                            pushAttack(creature, player, hexKey !== player, `The ${creature.species} runs you down!`, (sd.danger || 1) * creature.size * 1.1);
                            if (sd.behaviorType === 'pack_predator') rallies.add(creature.species);
                        } else if (at !== hexKey) {
                            behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: at, chasing: true, message: `The ${creature.species} is chasing you!`, near: true });
                        }
                        placements.push({ creature, key: destKey, origin: hexKey });
                        continue;
                    }
                }

                // sauropod herds walk the migration routes
                if (sd.behaviorType === 'giant_herbivore' && !creature.engaged && gameState.cells.get(hexKey)?.terrain === 'sauropodgrounds' && creature.lastMigrateTurn !== turn) {
                    creature.lastMigrateTurn = turn;
                    const heading = creature.heading ?? headingFor(creature.herd || creature.id);
                    if ((turn + Math.floor(heading * 10)) % 2 === 0) {
                        const here = gameState.cells.get(hexKey);
                        let best = null;
                        let bestDot = 0.1;
                        for (const n of here.neighbors) {
                            const c = gameState.cells.get(n);
                            if (!c || c.terrain !== 'sauropodgrounds') continue;
                            const dx = c.x - here.x;
                            const dz = c.z - here.z;
                            const dot = (dx * Math.cos(heading) + dz * Math.sin(heading)) / Math.hypot(dx, dz);
                            if (dot > bestDot) {
                                bestDot = dot;
                                best = n;
                            }
                        }
                        if (best && roomAt(best, creature)) {
                            destKey = best;
                            move(hexKey, best, creature);
                        } else if (!best) {
                            creature.heading = heading + Math.PI; // end of the trail: turn back
                        }
                        placements.push({ creature, key: destKey, origin: hexKey });
                        continue;
                    }
                }

                const behavior = executeCreatureBehavior(creature, hexKey, gameState);
                if (behavior) {
                    if (ATTACK_ACTIONS.has(behavior.action)) {
                        const dist = distanceToPlayer(gameState, hexKey);
                        const threat = creatureThreat(creature);
                        const isPredator = PREDATOR_TYPES.has(sd.behaviorType);
                        if (gameState.gameOver || dist > 2) {
                            // nothing to do
                        } else if (threat < pf * 0.25 || (hasPassive(gameState, 'apex') && isPredator && threat < pf * 0.6)) {
                            // Big Al is far too big to pick a fight with: it backs off instead
                            const to = escapeCell(gameState, hexKey, occupancy, creature);
                            if (to && roomAt(to, creature)) {
                                destKey = to;
                                move(hexKey, to, creature);
                                if (dist <= 1) behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, message: `The ${creature.species} thinks better of it and slinks away.`, near: false });
                            }
                        } else if (dist === 2) {
                            // too far to strike: close the distance
                            const to = towardPlayer(gameState, hexKey);
                            if (to && roomAt(to, creature)) {
                                destKey = to;
                                move(hexKey, to, creature);
                                if (CHASERS[creature.species] && threat > pf * 0.5) creature.chasing = 3;
                                behaviorLog.push({ id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id, hexKey: to, chasing: !!creature.chasing, message: `The ${creature.species} is stalking you!`, near: true });
                            }
                        } else if (Math.random() < noticeChance(gameState, creature, opts)) {
                            let canStrike = true;
                            if (dist === 1) {
                                // charge into Big Al's area to attack
                                if (roomAt(player, creature)) {
                                    destKey = player;
                                    move(hexKey, player, creature);
                                } else canStrike = false;
                            }
                            if (canStrike) {
                                pushAttack(creature, destKey, dist === 1, dist === 1 ? `The ${creature.species} charges in! ${behavior.message}` : behavior.message, behavior.damage || 1);
                                if (sd.behaviorType === 'pack_predator') rallies.add(creature.species);
                            }
                        }
                    } else if (MOVE_ACTIONS.has(behavior.action) && behavior.target) {
                        const targetKey = behavior.target;
                        if (passable(gameState, targetKey) && roomAt(targetKey, creature)) {
                            destKey = targetKey;
                            move(hexKey, targetKey, creature);
                            if (behavior.message) {
                                behaviorLog.push({
                                    id: uid('log'), type: 'creature_movement', creature: creature.species, creatureId: creature.id,
                                    hexKey: targetKey, message: behavior.message, near: distanceToPlayer(gameState, targetKey) <= 1
                                });
                            }
                        }
                        // predators that catch prey (from the air or on the ground)
                        if (['hunt_from_above', 'hunt_prey'].includes(behavior.action) && behavior.preyId && !killed.has(behavior.preyId) && Math.random() < 0.5) {
                            const prey = (gameState.creatures.get(targetKey) || []).find((c) => c.id === behavior.preyId);
                            if (prey) {
                                killed.add(prey.id);
                                carcasses = addCarcass(carcasses, targetKey, { species: prey.species, size: prey.size, turn });
                                behaviorLog.push({
                                    id: uid('log'), type: 'creature_hunt', creature: creature.species, creatureId: creature.id, victimId: prey.id,
                                    hexKey: targetKey, message: `The ${creature.species} catches a ${prey.species}!`,
                                    near: distanceToPlayer(gameState, targetKey) <= 2
                                });
                            }
                        }
                        // a bigger predator drives a smaller one off
                        if (behavior.action === 'chase_competitor' && behavior.rivalId) {
                            const rival = (gameState.creatures.get(targetKey) || []).find((c) => c.id === behavior.rivalId);
                            if (rival) {
                                const to = escapeCell(gameState, targetKey, occupancy);
                                if (to) {
                                    displaced.set(rival.id, to);
                                    move(targetKey, to);
                                    behaviorLog.push({ id: uid('log'), type: 'creature_display', creature: creature.species, creatureId: creature.id, hexKey: targetKey, message: behavior.message, quiet: distanceToPlayer(gameState, targetKey) > 1 });
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

    // pack hunters attack together: the rest of the pack piles in
    for (const p of placements) {
        const c = p.creature;
        if (!rallies.has(c.species) || attacked.has(c.id) || killed.has(c.id) || c.wounded) continue;
        if (distanceToPlayer(gameState, p.key) > 1 || (p.key !== player && !roomAt(player, c))) continue;
        if (p.key !== player) {
            move(p.key, player, c);
            p.key = player;
        }
        pushAttack(c, player, p.origin !== player, `The ${c.species} pack closes in!`, (SPECIES_DATA[c.species].danger || 1) * c.size * 0.9);
    }

    const newCreatures = new Map();
    for (const p of placements) {
        if (killed.has(p.creature.id)) continue;
        let key = p.key;
        if (displaced.has(p.creature.id) && key === p.origin) key = displaced.get(p.creature.id);
        const list = newCreatures.get(key) || [];
        list.push(p.creature);
        newCreatures.set(key, list);
    }
    return { creatures: newCreatures, behaviorLog, carcasses, blood };
};

const killPlayer = (state, reason, thought) => ({
    ...state, gameOver: true, gamePhase: 'dead', deathReason: reason, currentThought: thought
});

const PACK_NAMES = ['Scar', 'Ember', 'Ridge', 'Quill', 'Talon', 'Ash', 'Fern', 'Flint', 'Rust', 'Sable'];
const OPEN_COUNTRY = new Set(['plains', 'fernprairie', 'katydidmeadow', 'fernsavanna', 'savanna', 'steppe', 'scrubland', 'floodplain', 'sauropodgrounds', 'termitemounds', 'hills']);

// Bookkeeping for a kill (journal, stats used by the goals)
const recordKill = (state, species, mass) => {
    const entry = state.journal.species[species] || { firstTurn: state.moveNumber, kills: 0 };
    const here = state.cells.get(state.player)?.terrain;
    return {
        ...state,
        journal: { ...state.journal, species: { ...state.journal.species, [species]: { ...entry, kills: entry.kills + 1 } } },
        stats: {
            ...state.stats,
            kills: state.stats.kills + 1,
            biggestKill: Math.max(state.stats.biggestKill || 0, mass),
            openKills: (state.stats.openKills || 0) + (OPEN_COUNTRY.has(here) ? 1 : 0)
        }
    };
};

// Some blows land on a hunting companion instead of Big Al
const hitCompanion = (state, damage, creature) => {
    if (!state.pack?.length || Math.random() > 0.35) return null;
    const i = Math.floor(Math.random() * state.pack.length);
    const m = state.pack[i];
    const dmg = Math.round(damage * Math.min(2, Math.max(0.4, state.weight / Math.max(1, m.weight))));
    const health = m.health - dmg;
    const pack = health <= 0 ? state.pack.filter((_, k) => k !== i) : state.pack.map((p, k) => (k === i ? { ...p, health } : p));
    return {
        pack,
        message: health <= 0 ? `The ${creature} kills ${m.name}!` : `${m.name} takes the ${creature}'s blow. -${dmg}`,
        died: health <= 0
    };
};

const applyCreatureBehaviorResults = (gameState, behaviorLog) => {
    let newState = { ...gameState };
    let newNotifications = [...gameState.notifications];
    for (const log of behaviorLog) {
        switch (log.type) {
            case 'creature_attack': {
                const shield = hitCompanion(newState, log.damage, log.creature);
                if (shield) {
                    newState.pack = shield.pack;
                    newNotifications = addNotification(newNotifications, { type: shield.died ? 'death' : 'combat', message: shield.message });
                    break;
                }
                newState.fitness = Math.max(0, newState.fitness - log.damage);
                newState.energy = Math.max(0, newState.energy - 4);
                if (log.message) newNotifications = addNotification(newNotifications, { type: 'combat', message: `${log.message} -${log.damage} health` });
                if (newState.fitness <= 0 && !newState.gameOver) {
                    newState = killPlayer(newState, 'combat', `The ${log.creature} proved too dangerous...`);
                }
                break;
            }
            case 'creature_miss':
                newNotifications = addNotification(newNotifications, { type: 'success', message: log.message });
                break;
            case 'creature_movement':
                if (log.near) newNotifications = addNotification(newNotifications, { type: log.chasing ? 'combat' : 'warning', message: log.message });
                break;
            case 'creature_hunt':
                if (log.near) {
                    newNotifications = addNotification(newNotifications, { type: 'info', message: `${log.message} Something to scavenge...` });
                    newState.currentThought = 'You smell fresh carrion nearby...';
                }
                break;
            case 'creature_died':
                if (log.byPlayer) newState = recordKill(newState, log.creature, log.mass || 1);
                if (log.near || log.byPlayer) {
                    newNotifications = addNotification(newNotifications, { type: 'success', message: `${log.message} A feast awaits.` });
                    newState.currentThought = 'The blood trail ends here. Time to eat.';
                }
                break;
            case 'creature_display':
                if (!log.quiet) newNotifications = addNotification(newNotifications, { type: 'warning', message: log.message });
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
    const season = seasonOf(state.moveNumber).name;
    let hydration = Math.max(0, state.hydration - 2.2 * thirstFactor(terrain) * thirstMul * (season === 'dry' ? 1.35 : 0.8));
    if (['river', 'lake'].includes(terrain) || (terrain === 'stream' && !isDrought(state.moveNumber))) hydration = Math.min(100, hydration + 30);
    if (state.worldSeed !== null && isRaining(state.worldSeed, state.moveNumber)) hydration = Math.min(100, hydration + 8);
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
        const t = ['Those dragonflies look tasty but so fast!', 'Little fish flicker in the shallows...', 'Everything is so big. Stay near the water.', 'The big river is too strong for me yet.'];
        return t[Math.floor(Math.random() * t.length)];
    }
    if (state.level === 2) {
        const t = ["Bugs aren't as filling as they used to be...", 'The river is full of fish. Time to swim.', 'On land I am slow. In the water I am fast.'];
        return t[Math.floor(Math.random() * t.length)];
    }
    return THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
};

const DENSE = new Set(['denseforest', 'oldgrowth', 'jungle', 'galleryforest', 'deadfall', 'youngforest', 'forest']);
export const crampedIn = (state, terrain) => state.level >= 3 && DENSE.has(terrain);

// Companions walk with Big Al, heal slowly and grow alongside him; a starving pack breaks up
const followPack = (state, energy) => (state.pack || [])
    .filter(() => energy > 15 || Math.random() > 0.15)
    .map((m) => ({ ...m, weight: Math.max(m.weight, state.weight * 0.7), health: Math.min(100, m.health + 3) }));

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
                notifications = addNotification(notifications, { type: 'discovery', message: `New species spotted: ${c.species}${DIETS[factsOf(c.species)?.diet] ? `, a ${DIETS[factsOf(c.species).diet].label.toLowerCase()} (${DIETS[factsOf(c.species).diet].note})` : ''}`, species: c.species });
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
    // seasons and weather turning
    if (state.mapGenerated && !state.gameOver && prev.moveNumber !== state.moveNumber && state.worldSeed !== null) {
        const a = seasonOf(prev.moveNumber);
        const b = seasonOf(state.moveNumber);
        const say = (type, message) => { state = { ...state, notifications: addNotification(state.notifications, { type, message }) }; };
        if (a.name !== b.name) say('weather', b.name === 'wet' ? 'The rains have come. The basin turns green and the herds spread out across the plains.' : 'The dry season begins. Water will get scarce; animals will gather at the rivers.');
        else if (!isDrought(prev.moveNumber) && isDrought(state.moveNumber)) say('weather', 'Drought. Streams, waterholes and marshes are drying up.');
        const wa = weatherAt(state.worldSeed, prev.moveNumber);
        const wb = weatherAt(state.worldSeed, state.moveNumber);
        if (wa !== wb && wb === 'storm') say('weather', 'A storm rolls in. Rain hides your scent.');
        else if (wa !== wb && wb === 'rain' && wa !== 'storm') say('weather', 'It starts to rain. Your scent washes away.');
    }
    // goals
    if (state.mapGenerated && !state.gameOver && (prev.stats !== state.stats || prev.level !== state.level || prev.pack !== state.pack || prev.journal !== state.journal)) {
        for (const g of GOALS) {
            if (state.goals?.[g.id] !== undefined || g.level > state.level || !g.check(state)) continue;
            state = {
                ...state,
                goals: { ...(state.goals || {}), [g.id]: state.moveNumber },
                score: state.score + g.reward,
                notifications: addNotification(state.notifications, { type: 'levelup', message: `Goal complete: ${g.text} (+${g.reward})` })
            };
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
            return { ...state, worldSeed: seed, cells, player: world.spawnKey, mapGenerated: true, pois: generatePois(world), migration: ((seed * 9301 + 49297) % 233280) / 233280 * Math.PI * 2 };
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
                const river = targetHex.terrain === 'river';
                return {
                    ...killPlayer(state, river ? 'drowned' : 'sank', river ? 'The current sweeps your small body away...' : 'You sink into the terrain...'),
                    player: target,
                    notifications: addNotification(state.notifications, {
                        type: 'death', message: river ? "You swam out into the great river, but you are still too small. The current swept you away!" : 'The terrain proved too dangerous for your size!'
                    })
                };
            }

            const dashing = state.dashArmed;
            const sizeMultiplier = Math.max(0.4, Math.min(2.0, Math.pow(state.weight / 150, 0.4)));
            // a big body and a sail crash through thick woods
            const cramped = crampedIn(state, targetHex.terrain);
            // a spinosaur swims well and walks badly: water gets cheaper as you grow, land dearer
            const water = WATERY.has(targetHex.terrain);
            const swimMul = water ? (hasPassive(state, 'legs') ? 0.6 : 0.85) : 1 + Math.max(0, state.level - 2) * 0.08;
            const energyCost = Math.round(terrain.energyCost * sizeMultiplier * swimMul * (cramped ? 1 + 0.35 * (state.level - 2) : 1)) + (dashing ? ABILITIES.dash.energy : 0);
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
                stats: { ...state.stats, distance: state.stats.distance + 1, visited: { ...(state.stats.visited || {}), [targetHex.terrain]: true } },
                pack: followPack(state, timed.energy),
                lastPlayerAction: dashing ? { id: uid('act'), type: 'dash' } : state.lastPlayerAction
            };
            if ((state.pack || []).length > movedState.pack.length) {
                const gone = state.pack.find((m) => !movedState.pack.some((k) => k.id === m.id));
                movedState.notifications = addNotification(movedState.notifications, { type: 'warning', message: `${gone.name} is hungry and wanders off to hunt alone.` });
            }
            const behaviorState = withBehaviors(movedState, processCreatureBehaviors(movedState, { evading: dashing }));
            return {
                ...behaviorState,
                selectedHex: null,
                currentThought: behaviorState.gameOver ? behaviorState.currentThought
                    : cramped && Math.random() < 0.5 ? 'Your sail snags in the branches. The open rivers suit you better now.' : contextualThought(behaviorState)
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
            const sources = [state.player, ...here.neighbors].filter((k) => drinkableAt(state, k));
            if (!sources.length && !raining(state)) return state;
            let next = {
                ...state,
                hydration: 100,
                stats: { ...state.stats, drinks: (state.stats.drinks || 0) + 1 },
                lastPlayerAction: { id: uid('act'), type: 'drink' },
                currentThought: 'Cool water. Much better.'
            };
            // crocodiles wait at the water's edge
            for (const key of sources) {
                const croc = (state.creatures.get(key) || []).find((c) => CROCODILES.has(c.species) && creatureThreat(c) > playerFierceness(state) * 0.3);
                if (croc && Math.random() < 0.4) {
                    const damage = attackDamage(state, croc, SPECIES_DATA[croc.species].danger * croc.size * 1.4);
                    next = {
                        ...next,
                        fitness: Math.max(0, state.fitness - damage),
                        notifications: addNotification(state.notifications, { type: 'combat', message: `A ${croc.species} bursts from the water as you drink! -${damage} health` }),
                        creatureBehaviorLog: [...state.creatureBehaviorLog, { id: uid('log'), type: 'creature_attack', creature: croc.species, creatureId: croc.id, hexKey: key, message: '', damage }].slice(-MAX_BEHAVIOR_LOG_SIZE)
                    };
                    if (next.fitness <= 0) return killPlayer(next, 'combat', `The ${croc.species} drags you under...`);
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
                for (const [key, d] of bfsDistances(state.cells, state.player, raining(state) ? 2 : 4)) {
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
            if (weatherNow(state) === 'storm') rangeBonus -= 1;
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
            const spawned = rollSpawns(playerHex.terrain, state, { existing: current.length, key: playerKey, flyerBudget: Math.max(0, 3 - countFlyers(state.creatures)), giantsHere: countGiants(current) });
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
            let flyerBudget = Math.max(0, 4 - countFlyers(newCreatures)); // keep the sky from filling up
            for (const [key, hex] of state.cells) {
                if (total >= MAX_AMBIENT_CREATURES) break;
                if (!hex.inSight || key === playerKey) continue;
                if ((newCreatures.get(key) || []).length > 0) continue;
                const last = populatedAt.get(key);
                if (last !== undefined && state.moveNumber - last < AMBIENT_RESPAWN_TURNS) continue;
                populatedAt.set(key, state.moveNumber);
                const spawned = rollSpawns(hex.terrain, state, { chanceScale: 0.4, max: hex.terrain === 'sauropodgrounds' ? 5 : 3, key, flyerBudget: Math.min(1, flyerBudget), giantsHere: countGiants(state.creatures.get(key)) });
                flyerBudget -= spawned.filter((c) => FLYERS.has(c.species)).length;
                if (spawned.length) {
                    newCreatures.set(key, spawned);
                    total += spawned.length;
                }
            }
            return { ...state, creatures: newCreatures, populatedAt };
        }

        // One round of a fight. Small prey dies in one bite; big animals have
        // health that you wear down over several rounds while they fight back.
        case 'ATTACK_CREATURE': {
            const { creatureId } = action;
            const style = action.style || 'normal';
            if (state.gameOver) return state;
            if (style !== 'normal' && (!abilityReady(state, style) || ABILITIES[style].kind !== 'attack')) return state;
            if (style === 'ambush' && !inCover(state, playerMisty(state))) return state;

            const playerKey = state.player;
            const here = state.creatures.get(playerKey) || [];
            const target = here.find((c) => c.id === creatureId);
            if (!target) return state;
            const sd = SPECIES_DATA[target.species];
            const mass = preyMass(target);
            if (style === 'hatchet' && !hatchetTarget(state, target)) return state;
            // an ambush only works on something that hasn't seen you yet
            if (style === 'ambush' && target.engaged) return state;

            // a young sauropod in its herd is guarded: the adults close ranks
            const guards = here.filter((c) => c.species === target.species && isBigGiant(c));
            if (GIANTS.has(target.species) && !isBigGiant(target) && guards.length && Math.random() < 0.75) {
                let blocked = { ...state, energy: Math.max(0, state.energy - 6), cooldowns: style !== 'normal' ? setCooldown(state, style) : state.cooldowns };
                const g = guards[Math.floor(Math.random() * guards.length)];
                const dmg = attackDamage(state, g, SPECIES_DATA[g.species].danger * g.size * 0.8);
                const shield = hitCompanion(blocked, dmg, g.species);
                let msg;
                if (shield) {
                    blocked.pack = shield.pack;
                    msg = `The adults close ranks around the calf. ${shield.message}`;
                } else {
                    blocked.fitness = Math.max(0, state.fitness - dmg);
                    msg = `The adults close ranks around the calf and a tail lashes out. -${dmg} health`;
                }
                blocked = {
                    ...blocked,
                    notifications: addNotification(state.notifications, { type: 'combat', message: msg }),
                    currentThought: 'Not while the herd protects it. Split them up first.',
                    lastPlayerAction: { id: uid('act'), type: 'attack', style, creatureId: g.id, outcome: 'blocked' }
                };
                return blocked.fitness <= 0 ? killPlayer(blocked, 'combat', `The ${g.species} herd protected its young...`) : blocked;
            }

            let newState = { ...state, creatures: removeCreature(state.creatures, playerKey, creatureId) };
            if (style !== 'normal') newState.cooldowns = setCooldown(state, style);
            let notifications = state.notifications;
            const log = [];
            let outcome;
            let creatureAfter = null;
            const occupancy = () => new Map([...newState.creatures].map(([k, l]) => [k, l.length]));
            const strikeBack = (mult, verb) => {
                const shield = hitCompanion(newState, attackDamage(state, target, sd.danger * target.size * mult), target.species);
                if (shield) {
                    newState.pack = shield.pack;
                    log.push(shield.message);
                    return;
                }
                const dmg = attackDamage(state, target, sd.danger * target.size * mult);
                newState.fitness = Math.max(0, (newState.fitness ?? state.fitness) - dmg);
                log.push(`It ${verb || sd.injury}. -${dmg} health`);
            };

            if (Math.random() < boltChance(state, target, style)) {
                // it gets away before you reach it, into the next area
                outcome = 'escape';
                const to = escapeCell(state, playerKey, occupancy());
                if (to) newState.creatures = placeCreature(newState.creatures, to, { ...target, lastBehaviorTurn: state.moveNumber });
                log.push(`The ${target.species} bolts before you can reach it!`);
                newState.energy = Math.max(0, state.energy - 4);
                newState.currentThought = 'Too slow! It ran into the next area.';
            } else {
                const bite = biteDamage(state, target, style, packPower(state));
                const health = (target.health ?? 100) - bite;
                newState.energy = Math.max(0, state.energy - (mass > state.weight * 0.3 ? 5 : 1));
                const helpers = (state.pack || []).length;
                if (health <= 0) {
                    outcome = 'kill';
                    log.push(`${style === 'ambush' ? 'From cover, you' : style === 'pounce' ? 'You pounce and' : 'You'} bring down the ${target.species}${helpers ? ' with your pack' : ''}!`);
                    // the pack eats too
                    const energyGain = calculateEnergyGain(sd, target.size, state.weight, state.level) / (1 + helpers * 0.35);
                    const fed = feed({ ...state, energy: newState.energy }, energyGain, target.size);
                    newState.energy = fed.energy;
                    newState.weight = fed.weight;
                    newState.score = fed.score + Math.round(Math.min(400, mass / Math.max(0.01, state.weight) * 25));
                    log.push(fed.weightGain > 0 ? `+${fed.weightGain >= 1 ? `${fed.weightGain.toFixed(1)}kg` : `${Math.round(fed.weightGain * 1000)}g`}, full belly.` : `+${Math.round(energyGain)} energy.`);
                    if (helpers) newState.pack = state.pack.map((m) => ({ ...m, health: Math.min(100, m.health + 25) }));
                    // big kills leave leftovers to come back to
                    const hungerRoom = Math.max(1, 100 - state.energy);
                    if (mass > state.weight * 0.5 && energyGain > hungerRoom * 1.6) {
                        const portions = Math.min(8, Math.floor(energyGain / (hungerRoom * 1.6)));
                        newState.carcasses = addCarcass(state.carcasses, playerKey, { species: target.species, size: target.size, turn: state.moveNumber, portions });
                        log.push('You cannot finish it all: leftovers remain.');
                    }
                    const growth = applyGrowth(state.level, newState.weight, notifications);
                    newState.level = growth.level;
                    notifications = growth.notifications;
                    newState = recordKill(newState, target.species, mass);
                } else {
                    // it survives the bite
                    const share = Math.round(Math.min(100, (bite / (target.health ?? 100)) * 100));
                    creatureAfter = { ...target, health, engaged: true, lastBehaviorTurn: state.moveNumber };
                    if (style === 'hatchet') {
                        creatureAfter = { ...creatureAfter, wounded: true, bleed: 12, woundedByPlayer: true };
                        log.push(`Your hatchet bite opens a deep wound in the ${target.species}.`);
                    } else {
                        log.push(`You bite the ${target.species}${helpers ? ' as your pack closes in' : ''}. (${share}% of its strength)`);
                        // deep bites keep bleeding
                        if (bite > 25 && health < 60) creatureAfter = { ...creatureAfter, wounded: true, bleed: creatureAfter.bleed ?? 5, woundedByPlayer: true };
                    }
                    outcome = 'hit';
                    if (Math.random() < fightBackChance(target.species) * STYLE_MODS[style].counter) {
                        strikeBack(1, null);
                        outcome = 'hit_back';
                    }
                    // hurt animals that aren't fighters run for it
                    const runs = (!standsGround(target.species) && health < 45) || style === 'hatchet';
                    let to = null;
                    if (runs && Math.random() < 0.8) to = escapeCell(state, playerKey, occupancy());
                    if (to) {
                        newState.creatures = placeCreature(newState.creatures, to, creatureAfter);
                        log.push(creatureAfter.wounded ? 'It flees, bleeding.' : 'It runs for it!');
                        newState.blood = new Map(state.blood).set(playerKey, state.moveNumber).set(to, state.moveNumber);
                        outcome = outcome === 'hit_back' ? 'hit_back' : 'flee';
                    } else {
                        newState.creatures = placeCreature(newState.creatures, playerKey, creatureAfter);
                    }
                    // the rest of a herd defends its own
                    for (const ally of here) {
                        if (ally.id === target.id || ally.species !== target.species || !['giant_herbivore', 'dangerous_herbivore', 'herbivore'].includes(sd.behaviorType)) continue;
                        if (preyMass(ally) < mass || Math.random() > 0.45) continue;
                        strikeBack(sd.behaviorType === 'herbivore' ? 0.5 : 1, `herd-mate ${SPECIES_DATA[ally.species].injury}`);
                        break;
                    }
                    newState.currentThought = health < 30 ? 'It is weakening. Keep at it.' : outcome === 'hit_back' ? 'It fights back hard.' : 'First blood.';
                }
            }
            if (!newState.currentThought || newState.currentThought === state.currentThought) newState.currentThought = log[0];
            if (newState.fitness <= 0) {
                newState = killPlayer(newState, 'combat', state.level === 1 ? `The ${target.species} was too dangerous for a small hatchling...` : `The ${target.species} proved too powerful...`);
            }
            newState.notifications = addNotification(notifications, { type: outcome === 'kill' ? 'success' : outcome === 'escape' || outcome === 'hit_back' ? 'combat' : 'info', message: log.join(' ') });
            newState.lastPlayerAction = { id: uid('act'), type: 'attack', style, creatureId, outcome };
            return newState;
        }

        // Freeze in cover and hope whatever is hunting you walks past
        case 'HIDE': {
            if (state.gameOver || !abilityReady(state, 'hide') || !canHideHere(state)) return state;
            const pf = playerFierceness(state);
            const near = new Set([state.player, ...state.cells.get(state.player).neighbors]);
            let creatures = state.creatures;
            const log = [];
            const lost = [];
            const found = [];
            for (const [key, list] of state.creatures) {
                if (!near.has(key)) continue;
                for (const c of list) {
                    const hunter = PREDATOR_TYPES.has(SPECIES_DATA[c.species]?.behaviorType) && creatureThreat(c) > pf * 0.25;
                    if (!hunter && !c.chasing) continue;
                    if (key !== state.player && !c.chasing && !c.engaged) continue;
                    if (Math.random() < hideChance(state, c)) {
                        // it loses you and wanders off
                        let updated = { ...c, chasing: 0, engaged: false, lostUntil: state.moveNumber + 2 };
                        creatures = removeCreature(creatures, key, c.id);
                        let to = key;
                        if (key === state.player) to = escapeCell(state, key, new Map([...creatures].map(([k, l]) => [k, l.length])), c) || key;
                        creatures = placeCreature(creatures, to, updated);
                        lost.push(c.species);
                    } else {
                        found.push(c);
                    }
                }
            }
            let next = {
                ...state,
                creatures,
                hiddenAt: state.moveNumber,
                cooldowns: setCooldown(state, 'hide'),
                lastPlayerAction: { id: uid('act'), type: 'hide', outcome: found.length ? 'found' : 'hidden' }
            };
            const terrainName = TERRAIN_TYPES[state.cells.get(state.player).terrain].name.toLowerCase();
            if (found.length) {
                // it sees through the cover: it attacks
                const c = found[0];
                const dmg = attackDamage(state, c, SPECIES_DATA[c.species].danger * c.size);
                next.fitness = Math.max(0, state.fitness - dmg);
                next.notifications = addNotification(state.notifications, { type: 'combat', message: `${lost.length ? `The ${lost[0]} passes by, but the` : 'The'} ${c.species} finds you anyway! -${dmg} health` });
                next.currentThought = 'Found! Run or fight.';
                next.creatureBehaviorLog = [...state.creatureBehaviorLog, { id: uid('log'), type: 'creature_attack', creature: c.species, creatureId: c.id, hexKey: state.player, charged: false, message: '', damage: dmg }].slice(-MAX_BEHAVIOR_LOG_SIZE);
                if (next.fitness <= 0) return killPlayer(next, 'combat', `The ${c.species} sniffed you out...`);
            } else if (lost.length) {
                next.notifications = addNotification(state.notifications, { type: 'success', message: `${inWater(state) ? `You sink into the ${terrainName} until only your eyes show.` : `You freeze in the ${terrainName}.`} The ${[...new Set(lost)].join(' and the ')} ${lost.length > 1 ? 'lose' : 'loses'} your trail.` });
                next.currentThought = 'Still... perfectly still...';
                next.stats = { ...state.stats, hidden: (state.stats.hidden || 0) + 1 };
            } else {
                next.notifications = addNotification(state.notifications, { type: 'info', message: inWater(state) ? `You slide under the surface of the ${terrainName}. Nothing on the bank will see you easily this turn.` : `You crouch low in the ${terrainName}. Nothing will see you easily this turn.` });
                next.currentThought = 'Small and still. Invisible.';
            }
            return next;
        }

        // Charge a sauropod herd to try and cut a youngster off from the adults
        case 'HARASS': {
            if (state.gameOver || state.level < 2) return state;
            const here = state.creatures.get(state.player) || [];
            const adults = here.filter(isBigGiant);
            const young = here.filter((c) => GIANTS.has(c.species) && !isBigGiant(c));
            if (!adults.length || !young.length) return state;
            const pack = (state.pack || []).length;
            const tries = adults[0].harried || 0;
            const chance = Math.min(0.85, 0.18 + pack * 0.18 + (state.level - 2) * 0.12 + tries * 0.15 + (raining(state) ? 0.05 : 0));
            let next = { ...state, energy: Math.max(0, state.energy - 8), lastPlayerAction: { id: uid('act'), type: 'harass' } };
            let notifications = state.notifications;
            // the adults swing their tails at you
            for (const a of adults) {
                if (Math.random() > 0.4) continue;
                const dmg = attackDamage(state, a, SPECIES_DATA[a.species].danger * a.size * 0.7);
                const shield = hitCompanion(next, dmg, a.species);
                if (shield) {
                    next.pack = shield.pack;
                    notifications = addNotification(notifications, { type: 'combat', message: shield.message });
                } else {
                    next.fitness = Math.max(0, (next.fitness ?? state.fitness) - dmg);
                    notifications = addNotification(notifications, { type: 'combat', message: `A ${a.species} tail whips past you. -${dmg} health` });
                }
            }
            if (next.fitness <= 0) return killPlayer({ ...next, notifications }, 'combat', 'A sauropod tail is a terrible thing...');
            let creatures = state.creatures;
            if (Math.random() < chance) {
                // the herd panics down the trail; the smallest calf is left behind
                const calf = young.slice().sort((a, b) => a.size - b.size)[0];
                const herdHere = here.filter((c) => GIANTS.has(c.species) && c.id !== calf.id);
                const cell = state.cells.get(state.player);
                const heading = adults[0].heading ?? 0;
                const ahead = cell.neighbors
                    .filter((n) => passable(state, n))
                    .map((n) => {
                        const c = state.cells.get(n);
                        return { n, d: ((c.x - cell.x) * Math.cos(heading) + (c.z - cell.z) * Math.sin(heading)) / Math.hypot(c.x - cell.x, c.z - cell.z) + (c.terrain === 'sauropodgrounds' ? 0.5 : 0) };
                    })
                    .sort((a, b) => b.d - a.d)
                    .map((x) => x.n);
                for (const c of herdHere) {
                    // down the trail, spilling into the next best area if that one is already full of giants
                    const to = ahead.find((n) => (creatures.get(n) || []).length < MAX_CREATURES_PER_HEX && (!isBigGiant(c) || countGiants(creatures.get(n)) + giantLoad(c) <= MAX_GIANTS_PER_CELL));
                    creatures = removeCreature(creatures, state.player, c.id);
                    creatures = placeCreature(creatures, to || state.player, { ...c, harried: 0, lastMigrateTurn: state.moveNumber });
                }
                creatures = removeCreature(creatures, state.player, calf.id);
                creatures = placeCreature(creatures, state.player, { ...calf, herd: null, separated: true, engaged: false, lastBehaviorTurn: state.moveNumber });
                next.stats = { ...state.stats, separated: (state.stats.separated || 0) + 1 };
                notifications = addNotification(notifications, { type: 'success', message: `The herd thunders off down the trail. A ${calf.species} calf is left behind!` });
                next.currentThought = 'Now. Before the adults come back.';
                next.lastPlayerAction = { ...next.lastPlayerAction, outcome: 'split', calfId: calf.id };
            } else {
                creatures = removeCreature(creatures, state.player, adults[0].id);
                creatures = placeCreature(creatures, state.player, { ...adults[0], harried: tries + 1 });
                notifications = addNotification(notifications, { type: 'warning', message: `The herd closes ranks around its young.${pack ? '' : ' A pack would help.'} Keep at it.` });
                next.currentThought = 'They are tiring. Again.';
                next.lastPlayerAction = { ...next.lastPlayerAction, outcome: 'held' };
            }
            return { ...next, creatures, notifications };
        }

        // Fish alongside a young spinosaur, a clutch-mate
        case 'INVITE': {
            if (state.gameOver || state.level < 2 || (state.pack || []).length >= 2) return state;
            const here = state.creatures.get(state.player) || [];
            const c = here.find((x) => x.id === action.creatureId && x.species === 'Young Spinosaurus');
            if (!c || c.engaged) return state;
            let next = { ...state, creatures: removeCreature(state.creatures, state.player, c.id) };
            const ratio = preyMass(c) / state.weight;
            const accept = 0.45 + (ratio > 0.4 && ratio < 2.5 ? 0.25 : 0) + (state.energy > 60 ? 0.1 : 0);
            if (Math.random() < accept) {
                const used = new Set((state.pack || []).map((m) => m.name));
                const name = PACK_NAMES.find((n) => !used.has(n) && Math.random() < 0.5) || PACK_NAMES.find((n) => !used.has(n)) || 'Sibling';
                next.pack = [...(state.pack || []), { id: c.id, name, weight: Math.max(preyMass(c), state.weight * 0.7), health: 100, joined: state.moveNumber }];
                next.notifications = addNotification(state.notifications, { type: 'levelup', message: `The young spinosaur falls in beside you. ${name} fishes with you now.` });
                next.currentThought = 'Two sets of jaws in the shallows.';
                next.lastPlayerAction = { id: uid('act'), type: 'recruit', creatureId: c.id };
            } else {
                const to = escapeCell(state, state.player, new Map([...next.creatures].map(([k, l]) => [k, l.length])));
                if (to) next.creatures = placeCreature(next.creatures, to, { ...c, lastBehaviorTurn: state.moveNumber });
                next.notifications = addNotification(state.notifications, { type: 'warning', message: 'The young spinosaur snaps at you and slides off into the water.' });
                next.currentThought = 'Not today, then.';
            }
            return next;
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

        // Dev helper (window.setStats in development builds), e.g. { level: 4, weight: 2000 }
        case 'DEBUG_SET':
            return { ...state, ...action.patch };

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
                stats: { kills: 0, scavenged: 0, sleeps: 0, distance: 0, drinks: 0, biggestKill: 0, openKills: 0, visited: {} },
                pack: [],
                goals: {}
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
