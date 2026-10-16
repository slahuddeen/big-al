// ==================== ENVIRONMENT RULES ====================
// Shared between the game rules and the renderer: where morning mist lies,
// which areas have drinkable water, how thirsty the ground makes you and how
// sheltered a place is to sleep.
import { hashInts } from '../three/lowpoly.js';

// Swamps are misty through the night and early morning; some forests only at dawn
const SWAMP = new Set(['marsh', 'riverbank']);
const MISTY_FOREST = new Set(['galleryforest', 'jungle', 'denseforest', 'oldgrowth', 'forest', 'floodplain']);
export const mistAmount = (terrain, phase, cellId = 0) => {
    if (SWAMP.has(terrain)) return phase === 0 || phase === 4 ? 1 : phase === 3 ? 0.6 : 0.25;
    if (MISTY_FOREST.has(terrain)) {
        const some = (hashInts(Number(cellId) || 0, 77) % 100) < (terrain === 'galleryforest' || terrain === 'jungle' ? 80 : 45);
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
    desert: 2.4, badlands: 2, mesa: 1.8, lavafield: 2.2, quicksand: 2, dryriverbed: 1.6, steppe: 1.4,
    savanna: 1.35, fernsavanna: 1.3, termitemounds: 1.3, rocky: 1.2, boulderfield: 1.2, beach: 1.3,
    denseforest: 0.75, oldgrowth: 0.75, jungle: 0.6, galleryforest: 0.6, forest: 0.8, marsh: 0.4,
    riverbank: 0.5, river: 0.3, stream: 0.3, lake: 0.3, waterhole: 0.5, floodplain: 0.6
};
export const thirstFactor = (terrain) => THIRST[terrain] ?? 1;

// How safe and restful a place is to sleep (heal multiplier, ambush risk multiplier)
const SHELTER = {
    denseforest: [1.35, 0.5], oldgrowth: [1.35, 0.55], jungle: [1.25, 0.6], deadfall: [1.4, 0.45], galleryforest: [1.3, 0.6],
    forest: [1.25, 0.65], youngforest: [1.2, 0.7], boulderfield: [1.25, 0.55], rocky: [1.1, 0.7], nest: [1.3, 0.8],
    marsh: [1.1, 0.9], desert: [0.8, 1.1], sauropodgrounds: [0.8, 1.5], waterhole: [0.9, 1.4], riverbank: [0.95, 1.3]
};
export const shelterOf = (terrain) => SHELTER[terrain] ?? [1, 1];
