// ==================== GROWTH ABILITIES ====================
// Big Al learns new tricks as he grows. Active abilities sit on the action bar
// (with cooldowns in turns); attack abilities appear as alternative attacks on
// the encounter cards; passives are always on once unlocked.
import { TERRAIN_TYPES } from '../data/terrain.js';

export const ABILITIES = {
    hide: {
        id: 'hide', name: 'Submerge', level: 1, kind: 'action', cooldown: 1, energy: 0,
        desc: 'Sink into the water until only your eyes show, or freeze in thick cover while you are small. Land hunters lose you easily in deep water; crocodiles and fish do not. Once you are a sub-adult you can only hide in the water.'
    },
    sniff: {
        id: 'sniff', name: 'Sniff', level: 1, kind: 'action', cooldown: 3, energy: 1, hotkey: 'F',
        desc: 'Smell the wind and feel the water. Reveals animals, carcasses and blood within 4 areas, even out of sight.'
    },
    pounce: {
        id: 'pounce', name: 'Snap', level: 1, kind: 'attack', cooldown: 0,
        desc: 'A quick sideways snap of the snout. Much easier to catch fish and small, fast prey, but riskier against anything that fights back.'
    },
    dash: {
        id: 'dash', name: 'Dash', level: 2, kind: 'toggle', cooldown: 4, energy: 6, hotkey: 'X',
        desc: 'Your next move is a burst: a lunge on land or a surge of the tail in the water. Nothing can strike you as you go.'
    },
    ambush: {
        id: 'ambush', name: 'Water Ambush', level: 3, kind: 'attack', cooldown: 3,
        desc: 'Strike from the water or from cover. Prey drinking at the edge rarely sees it coming.'
    },
    roar: {
        id: 'roar', name: 'Sail Display', level: 3, kind: 'action', cooldown: 5, energy: 4, hotkey: 'R',
        desc: 'Turn side-on and flush your sail. Drives off smaller predators and skittish animals, and clears scavengers off a carcass.'
    },
    hatchet: {
        id: 'hatchet', name: 'Thumb Claw', level: 4, kind: 'attack', cooldown: 2,
        desc: 'Rake a big animal with your huge thumb claws and let it bleed. It flees and weakens every turn. Follow the blood.'
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
    { id: 'fisher', level: 1, name: 'Fish Catcher', desc: 'Your snout is built for fish: they rarely slip away from you.' },
    { id: 'legs', level: 2, name: 'Paddle Tail', desc: 'Swimming costs 40% less energy.' },
    { id: 'hide', level: 3, name: 'Thick Hide', desc: 'You take 20% less damage.' },
    { id: 'apex', level: 4, name: 'River King', desc: 'Smaller predators keep their distance instead of attacking.' }
];

export const hasPassive = (state, id) => PASSIVES.some((p) => p.id === id && state.level >= p.level && (!p.maxLevel || state.level <= p.maxLevel));

export const abilityUnlocked = (state, id) => state.level >= (ABILITIES[id]?.level ?? 99) && state.level <= (ABILITIES[id]?.maxLevel ?? 99);

export const cooldownLeft = (state, id) => Math.max(0, (state.cooldowns?.[id] ?? 0) - state.moveNumber);

export const abilityReady = (state, id) => abilityUnlocked(state, id) && cooldownLeft(state, id) === 0 &&
    state.energy > (ABILITIES[id].energy || 0);

// Terrain that hides a stalking predator: thick vegetation, and for a spinosaur, water
const COVER = new Set(['denseforest', 'jungle', 'forest', 'galleryforest', 'deadfall', 'marsh', 'mangrove', 'fernprairie', 'openwoods', 'river', 'lake', 'stream']);
export const inCover = (state, misty = false) => {
    const here = state.cells.get(state.player);
    if (!here) return false;
    return misty || COVER.has(here.terrain) || TERRAIN_TYPES[here.terrain]?.visibility === 1;
};
