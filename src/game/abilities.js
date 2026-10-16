// ==================== GROWTH ABILITIES ====================
// Big Al learns new tricks as he grows. Active abilities sit on the action bar
// (with cooldowns in turns); attack abilities appear as alternative attacks on
// the encounter cards; passives are always on once unlocked.
import { TERRAIN_TYPES } from '../data/terrain.js';

export const ABILITIES = {
    sniff: {
        id: 'sniff', name: 'Sniff', level: 1, kind: 'action', cooldown: 3, energy: 1, hotkey: 'F',
        desc: 'Read the wind. Reveals animals, carcasses and blood within 4 areas, even out of sight.'
    },
    pounce: {
        id: 'pounce', name: 'Pounce', level: 1, kind: 'attack', cooldown: 0,
        desc: 'A quick leap. Much easier to catch small, fast prey, but you take more risk against anything that fights back.'
    },
    dash: {
        id: 'dash', name: 'Dash', level: 2, kind: 'toggle', cooldown: 4, energy: 6, hotkey: 'X',
        desc: 'Your next move is a sprint: nothing can strike you as you go, so you can break away from a fight.'
    },
    ambush: {
        id: 'ambush', name: 'Ambush', level: 3, kind: 'attack', cooldown: 3,
        desc: 'Strike from cover (forest, ferns, marsh or mist). Prey rarely sees it coming.'
    },
    roar: {
        id: 'roar', name: 'Roar', level: 3, kind: 'action', cooldown: 5, energy: 4, hotkey: 'R',
        desc: 'Drive off smaller predators and skittish animals around you. Also clears scavengers off a carcass.'
    },
    hatchet: {
        id: 'hatchet', name: 'Hatchet Bite', level: 4, kind: 'attack', cooldown: 2,
        desc: 'Slash a big animal with your upper jaw and let it bleed. It flees and weakens every turn. Follow the blood.'
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
    { id: 'legs', level: 2, name: 'Long Legs', desc: 'Walking costs 15% less energy.' },
    { id: 'hide', level: 3, name: 'Thick Hide', desc: 'You take 20% less damage.' },
    { id: 'apex', level: 4, name: 'Apex Presence', desc: 'Smaller predators keep their distance instead of attacking.' }
];

export const hasPassive = (state, id) => PASSIVES.some((p) => p.id === id && state.level >= p.level && (!p.maxLevel || state.level <= p.maxLevel));

export const abilityUnlocked = (state, id) => state.level >= (ABILITIES[id]?.level ?? 99);

export const cooldownLeft = (state, id) => Math.max(0, (state.cooldowns?.[id] ?? 0) - state.moveNumber);

export const abilityReady = (state, id) => abilityUnlocked(state, id) && cooldownLeft(state, id) === 0 &&
    state.energy > (ABILITIES[id].energy || 0);

// Terrain that hides a stalking predator
const COVER = new Set(['denseforest', 'oldgrowth', 'jungle', 'forest', 'youngforest', 'galleryforest', 'deadfall', 'marsh', 'fernprairie', 'forestedge', 'openwoods', 'ginkgogrove']);
export const inCover = (state, misty = false) => {
    const here = state.cells.get(state.player);
    if (!here) return false;
    return misty || COVER.has(here.terrain) || TERRAIN_TYPES[here.terrain]?.visibility === 1;
};
