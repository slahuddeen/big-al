// ==================== GROWTH ABILITIES ====================
// A young Yutyrannus learns new tricks as it grows. Active abilities sit on the action bar
// (with cooldowns in turns); attack abilities appear as alternative attacks on
// the encounter cards; passives are always on once unlocked.
import { TERRAIN_TYPES } from '../data/terrain.js';

export const ABILITIES = {
    hide: {
        id: 'hide', name: 'Hide', level: 1, maxLevel: 2, kind: 'action', cooldown: 1, energy: 0,
        desc: 'Freeze in thick cover: ferns, fallen trunks, horsetails or deep shade. Hunters may walk straight past. In snow your tracks give you away, unless a blizzard is blowing.'
    },
    sniff: {
        id: 'sniff', name: 'Sniff', level: 1, kind: 'action', cooldown: 3, energy: 1, hotkey: 'F',
        desc: 'Smell the wind. Reveals animals, carcasses and blood within 4 areas, even out of sight.'
    },
    pounce: {
        id: 'pounce', name: 'Pounce', level: 1, kind: 'attack', cooldown: 0,
        desc: 'A leaping strike. Much easier to catch small, fast prey, but riskier against anything that fights back.'
    },
    dash: {
        id: 'dash', name: 'Dash', level: 2, kind: 'toggle', cooldown: 4, energy: 6, hotkey: 'X',
        desc: 'Your next move is a sprint on your long young legs. Nothing can strike you as you go.'
    },
    ambush: {
        id: 'ambush', name: 'Ambush', level: 2, kind: 'attack', cooldown: 3,
        desc: 'Strike from cover or mist. Prey that has not seen you rarely gets away.'
    },
    roar: {
        id: 'roar', name: 'Crest Display', level: 3, kind: 'action', cooldown: 5, energy: 4, hotkey: 'R',
        desc: 'Fluff up your filaments, flush your red crest and roar. Drives off smaller predators and skittish animals, and clears scavengers off a carcass.'
    },
    hatchet: {
        id: 'hatchet', name: 'Slashing Bite', level: 4, kind: 'attack', cooldown: 2,
        desc: 'A deep slicing bite into a big animal. It flees and bleeds every turn. Follow the blood.'
    }
};

// Attack styles scale [fierceness, agility, chance to bolt] of the target
export const ATTACK_MODS = {
    normal: [1, 1, 1],
    pounce: [1.15, 0.6, 0.6],
    ambush: [0.85, 0.45, 0.3],
    hatchet: [0.5, 0.7, 0.5]
};

export const PASSIVES = [
    { id: 'tiny', level: 1, maxLevel: 1, name: 'Small and Quiet', desc: 'Big predators often overlook something as small as you.' },
    { id: 'down', level: 1, name: 'Warm Down', desc: 'Your fluffy coat keeps the cold out. Cold costs you less energy as you grow.' },
    { id: 'legs', level: 2, name: 'Long Legs', desc: 'Young tyrannosaurs are lanky and fast. Moving costs less energy.' },
    { id: 'hide', level: 3, name: 'Thick Coat', desc: 'Long filaments and thick skin: you take 20% less damage.' },
    { id: 'apex', level: 4, name: 'Feathered Tyrant', desc: 'Smaller predators keep their distance instead of attacking.' }
];

export const hasPassive = (state, id) => PASSIVES.some((p) => p.id === id && state.level >= p.level && (!p.maxLevel || state.level <= p.maxLevel));

export const abilityUnlocked = (state, id) => state.level >= (ABILITIES[id]?.level ?? 99) && state.level <= (ABILITIES[id]?.maxLevel ?? 99);

export const cooldownLeft = (state, id) => Math.max(0, (state.cooldowns?.[id] ?? 0) - state.moveNumber);

export const abilityReady = (state, id) => abilityUnlocked(state, id) && cooldownLeft(state, id) === 0 &&
    state.energy > (ABILITIES[id].energy || 0);

// Terrain that hides a stalking predator: thick vegetation, deep shade and reeds
const COVER = new Set(['denseforest', 'oldgrowth', 'forest', 'galleryforest', 'deadfall', 'marsh', 'fernprairie', 'openwoods', 'ginkgogrove', 'boulderfield', 'basalt']);
export const inCover = (state, misty = false) => {
    const here = state.cells.get(state.player);
    if (!here) return false;
    return misty || COVER.has(here.terrain) || TERRAIN_TYPES[here.terrain]?.visibility === 1;
};
