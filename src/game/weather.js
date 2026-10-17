// ==================== SEASONS & WEATHER ====================
// The Kem Kem rivers had a strongly seasonal climate: a wet season when the rivers
// flood out over the plains, and a long dry season when small waters dry up, fish
// are trapped in shrinking pools and every animal crowds round the main channels. Everything here is a pure function of the world
// seed and the turn, so the rules and the renderer always agree.
import { hashInts } from '../three/lowpoly.js';

export const SEASON_LENGTH = 20; // turns (four days)

export const seasonOf = (turn) => {
    const index = Math.floor(turn / SEASON_LENGTH);
    const progress = (turn % SEASON_LENGTH) / SEASON_LENGTH;
    const name = index % 2 === 0 ? 'wet' : 'dry';
    return { name, index, progress, turnsLeft: SEASON_LENGTH - (turn % SEASON_LENGTH) };
};

const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// 0 = lush green, 1 = parched straw. The land browns through the dry season
// and greens up quickly once the rains return.
export const drynessAt = (turn) => {
    const s = seasonOf(turn);
    if (s.name === 'dry') return smooth(0, 0.45, s.progress);
    return s.index === 0 ? 0 : 1 - smooth(0, 0.3, s.progress); // the game starts green
};

// Late in the dry season the small waters (streams, waterholes, floodplain pools, marsh) dry up
export const isDrought = (turn) => {
    const s = seasonOf(turn);
    return s.name === 'dry' && s.progress >= 0.45;
};
export const DRIES_UP = new Set(['stream', 'waterhole', 'floodplain', 'marsh']);

const rnd = (seed, turn, salt) => (hashInts(seed | 0, turn | 0, salt) % 10000) / 10000;

// Weather for one turn: 'clear' | 'cloudy' | 'rain' | 'storm'
export const weatherAt = (seed, turn) => {
    if (turn < 4) return 'clear'; // a calm first morning for a new hatchling
    const s = seasonOf(turn);
    // weather comes in spells: decide per pair of turns
    const r = rnd(seed, Math.floor(turn / 2), 17);
    if (s.name === 'wet') {
        if (r < 0.14) return 'storm';
        if (r < 0.5) return 'rain';
        if (r < 0.75) return 'cloudy';
        return 'clear';
    }
    if (r < 0.05 && s.progress < 0.3) return 'rain';
    if (r < 0.2) return 'cloudy';
    return 'clear';
};

// Wind: a direction (radians, world xz) that veers slowly, and a strength 0..1
export const windAt = (seed, turn) => {
    const w = weatherAt(seed, turn);
    const base = (rnd(seed, 0, 5) * Math.PI * 2) + Math.sin(turn * 0.35 + rnd(seed, 1, 6) * 6) * 0.9;
    const gust = rnd(seed, turn, 9);
    const strength = { clear: 0.25, cloudy: 0.45, rain: 0.65, storm: 1 }[w] + (seasonOf(turn).name === 'dry' ? 0.15 : 0) + gust * 0.1;
    return { angle: base, strength: Math.min(1, strength) };
};

export const isRaining = (seed, turn) => {
    const w = weatherAt(seed, turn);
    return w === 'rain' || w === 'storm';
};

// Spawn multiplier for a species on a terrain in this season
const WATER_PLACES = new Set(['river', 'riverbank', 'lake', 'waterhole', 'stream', 'galleryforest', 'beach', 'mangrove']);
const OPEN = new Set(['plains', 'fernprairie', 'savanna', 'floodplain', 'scrubland']);
const WET_LOVERS = new Set(['Frog', 'Dragonfly', 'Cricket', 'Centipede', 'Hamadachelys', 'Fish', 'Calamopleurus']);
const GIANTS = new Set(['Rebbachisaurus', 'Aegyptosaurus', 'Paralititan']);
export const seasonSpawnFactor = (terrain, species, turn) => {
    const s = seasonOf(turn);
    if (s.name === 'wet') {
        if (WET_LOVERS.has(species)) return 1.4;
        if (OPEN.has(terrain)) return 1.25; // herds out on the green plains
        return 1;
    }
    // dry: everything crowds round the water, the open country empties
    const drought = isDrought(turn);
    // lungfish sit out the drought buried in the mud of the drying pools
    if (species === 'Lungfish' && DRIES_UP.has(terrain)) return drought ? 3 : 1.6;
    // fish trapped in the shrinking pools: easy pickings, if you can beat the crocodiles to them
    if (species === 'Fish' && (terrain === 'waterhole' || terrain === 'lake')) return drought ? 2.2 : 1.5;
    if (DRIES_UP.has(terrain) && drought) return WET_LOVERS.has(species) ? 0.15 : 0.5;
    if (WATER_PLACES.has(terrain)) return drought ? 1.9 : 1.5;
    if (GIANTS.has(species) && terrain === 'sauropodgrounds') return 1.3; // the herds are migrating
    if (OPEN.has(terrain)) return drought ? 0.45 : 0.7;
    if (WET_LOVERS.has(species)) return 0.6;
    return 0.9;
};
