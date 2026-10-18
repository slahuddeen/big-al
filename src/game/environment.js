// ==================== ENVIRONMENT RULES ====================
// Shared between the game rules and the renderer: where morning mist lies,
// which areas have drinkable water, how thirsty the ground makes you and how
// sheltered a place is to sleep.
import { hashInts } from '../three/lowpoly.js';

// Marshes and lakes steam through the night and early morning; the forests and crags at dawn
const SWAMP = new Set(['marsh', 'hotspring', 'riverbank']);
const MISTY = new Set(['galleryforest', 'oldgrowth', 'denseforest', 'river', 'lake', 'floodplain', 'crags', 'forest']);
export const mistAmount = (terrain, phase, cellId = 0) => {
    if (SWAMP.has(terrain)) return phase === 0 || phase === 4 ? 1 : phase === 3 ? 0.6 : terrain === 'hotspring' ? 0.5 : 0.25;
    if (MISTY.has(terrain)) {
        const some = (hashInts(Number(cellId) || 0, 77) % 100) < (terrain === 'crags' || terrain === 'galleryforest' ? 80 : 45);
        if (!some) return 0;
        return phase === 0 ? 1 : phase === 4 ? 0.7 : 0;
    }
    return 0;
};
export const isMisty = (terrain, phase, cellId) => mistAmount(terrain, phase, cellId) >= 0.7;

// Areas you can drink from (standing on them or next to them)
export const WATER_SOURCES = new Set(['river', 'stream', 'lake', 'waterhole', 'marsh', 'riverbank', 'floodplain']);

// Hydration lost per move, by terrain
const THIRST = {
    ashflat: 1.8, lavafield: 2.2, mudpot: 2, basalt: 1.3, crags: 1.3, boulderfield: 1.2, scrubland: 1.2,
    meadow: 1.05, fernprairie: 1, hills: 1.15, sauropodgrounds: 1.1,
    denseforest: 0.75, oldgrowth: 0.7, galleryforest: 0.6, forest: 0.8, ginkgogrove: 0.85, marsh: 0.4, hotspring: 0.6,
    riverbank: 0.5, river: 0.2, stream: 0.3, lake: 0.2, waterhole: 0.5, floodplain: 0.6
};
export const thirstFactor = (terrain) => THIRST[terrain] ?? 1;

// How safe and restful a place is to sleep (heal multiplier, ambush risk multiplier)
const SHELTER = {
    denseforest: [1.35, 0.5], oldgrowth: [1.35, 0.55], deadfall: [1.4, 0.45], galleryforest: [1.3, 0.6],
    forest: [1.25, 0.65], ginkgogrove: [1.15, 0.75], boulderfield: [1.25, 0.55], basalt: [1.2, 0.6], crags: [1.15, 0.6], nest: [1.3, 0.8],
    marsh: [1.1, 0.9], hotspring: [1.5, 0.9], ashflat: [0.8, 1.2], sauropodgrounds: [0.8, 1.5], waterhole: [0.9, 1.4], riverbank: [0.95, 1.3]
};
export const shelterOf = (terrain) => SHELTER[terrain] ?? [1, 1];

// How sheltered from the cold a place is (0 bare and windswept .. 1 warm)
const WARMTH = {
    hotspring: 1, oldgrowth: 0.75, denseforest: 0.7, forest: 0.65, galleryforest: 0.6, deadfall: 0.6, nest: 0.6,
    ginkgogrove: 0.45, openwoods: 0.4, boulderfield: 0.45, basalt: 0.4, lavafield: 0.6, hills: 0.3, crags: 0.2,
    ashflat: 0.1, meadow: 0.2, fernprairie: 0.25, scrubland: 0.3, floodplain: 0.15, riverbank: 0.15, sauropodgrounds: 0.15,
    lake: 0, river: 0, stream: 0.1, marsh: 0.2, waterhole: 0.15
};
export const warmthOf = (terrain) => WARMTH[terrain] ?? 0.3;
