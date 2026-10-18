// ==================== SEASONS, WEATHER & ERUPTIONS ====================
// The Jehol had a temperate climate with warm summers and cold winters (an average
// of about 10 degrees C over the year), and the basin was ringed by active volcanoes.
// Everything here is a pure function of the world seed and the turn, so the rules
// and the renderer always agree.
import { hashInts } from '../three/lowpoly.js';

export const SEASON_LENGTH = 20; // turns (four days)

export const seasonOf = (turn) => {
    const index = Math.floor(turn / SEASON_LENGTH);
    const progress = (turn % SEASON_LENGTH) / SEASON_LENGTH;
    const name = index % 2 === 0 ? 'summer' : 'winter';
    return { name, index, progress, turnsLeft: SEASON_LENGTH - (turn % SEASON_LENGTH) };
};

const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// 0 = summer green, 1 = autumn gold: the leaves turn at the end of summer
export const drynessAt = (turn) => {
    const s = seasonOf(turn);
    if (s.name === 'summer') return smooth(0.65, 1, s.progress);
    return 1 - smooth(0.0, 0.4, s.progress) * 0.5; // bare and brown through the winter
};

// 0..1 snow cover: it settles in the first days of winter and melts at the end
export const snowAt = (turn) => {
    const s = seasonOf(turn);
    if (s.name !== 'winter') return 0;
    return smooth(0.08, 0.35, s.progress) * (1 - smooth(0.85, 1, s.progress));
};

// Deep winter: ponds and streams freeze over
export const isFrozen = (turn) => {
    const s = seasonOf(turn);
    return s.name === 'winter' && s.progress >= 0.3 && s.progress < 0.9;
};
export const FREEZES = new Set(['stream', 'waterhole', 'marsh', 'floodplain']);
// (the game rules call this the drought; here it is the freeze)
export const isDrought = isFrozen;
export const DRIES_UP = FREEZES;

const rnd = (seed, turn, salt) => (hashInts(seed | 0, turn | 0, salt) % 10000) / 10000;

// Weather for one turn: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'blizzard'
export const weatherAt = (seed, turn) => {
    if (turn < 4) return 'clear'; // a calm first morning for a new hatchling
    const s = seasonOf(turn);
    // weather comes in spells: decide per pair of turns
    const r = rnd(seed, Math.floor(turn / 2), 17);
    if (s.name === 'summer') {
        if (r < 0.08) return 'storm';
        if (r < 0.3) return 'rain';
        if (r < 0.55) return 'cloudy';
        return 'clear';
    }
    if (r < 0.1) return 'blizzard';
    if (r < 0.38) return 'snow';
    if (r < 0.65) return 'cloudy';
    return 'clear';
};

// Wind: a direction (radians, world xz) that veers slowly, and a strength 0..1
export const windAt = (seed, turn) => {
    const w = weatherAt(seed, turn);
    const base = (rnd(seed, 0, 5) * Math.PI * 2) + Math.sin(turn * 0.35 + rnd(seed, 1, 6) * 6) * 0.9;
    const gust = rnd(seed, turn, 9);
    const strength = { clear: 0.25, cloudy: 0.45, rain: 0.6, storm: 1, snow: 0.45, blizzard: 1 }[w] + (seasonOf(turn).name === 'winter' ? 0.1 : 0) + gust * 0.1;
    return { angle: base, strength: Math.min(1, strength) };
};

export const isRaining = (seed, turn) => {
    const w = weatherAt(seed, turn);
    return w === 'rain' || w === 'storm';
};
export const isSnowing = (seed, turn) => {
    const w = weatherAt(seed, turn);
    return w === 'snow' || w === 'blizzard';
};

// ---------- eruptions ----------
// A volcano at the edge of the basin erupts every so often. A turn of rumbling,
// then ash falls for a few turns; on the second turn of the ash fall, gas pours
// down into the low ground around the lakes and kills what is there.
const ERUPTION_EVERY = 34;
export const eruptionAt = (seed, turn) => {
    if (turn < 18) return { phase: 'none', strength: 0 };
    const cycle = Math.floor((turn - 18) / ERUPTION_EVERY);
    const start = 18 + cycle * ERUPTION_EVERY + Math.floor(rnd(seed, cycle, 41) * 14);
    const k = turn - start;
    if (k === 0) return { phase: 'rumble', strength: 0.3, start };
    if (k >= 1 && k <= 3) return { phase: 'ashfall', strength: k === 2 ? 1 : 0.7, gas: k === 2, start };
    if (k === 4) return { phase: 'clearing', strength: 0.3, start };
    return { phase: 'none', strength: 0, start };
};
export const isAshfall = (seed, turn) => eruptionAt(seed, turn).phase === 'ashfall';

// Spawn multiplier for a species on a terrain in this season
const OPEN = new Set(['meadow', 'fernprairie', 'floodplain', 'scrubland', 'ashflat']);
const BUGS = new Set(['Mayfly', 'Lacewing', 'Cricket', 'Frog', 'Salamander']);
const HIBERNATORS = new Set(['Frog', 'Salamander', 'Manchurochelys', 'Monjurosuchus', 'Xianglong', 'Hyphalosaurus']);
export const seasonSpawnFactor = (terrain, species, turn) => {
    const s = seasonOf(turn);
    if (s.name === 'summer') {
        if (BUGS.has(species)) return 1.4;
        if (OPEN.has(terrain)) return 1.2; // herds out in the glades and meadows
        return 1;
    }
    // winter: insects and cold-blooded animals vanish, the herds shelter in the forests
    const deep = isFrozen(turn);
    if (BUGS.has(species)) return terrain === 'hotspring' ? 0.8 : deep ? 0.04 : 0.25;
    if (HIBERNATORS.has(species)) return terrain === 'hotspring' ? 1 : deep ? 0.1 : 0.4;
    if (terrain === 'hotspring') return 1.6; // everything comes to the warm water
    if (OPEN.has(terrain)) return deep ? 0.5 : 0.7;
    if (['forest', 'oldgrowth', 'denseforest', 'galleryforest'].includes(terrain)) return 1.3;
    return 0.9;
};
