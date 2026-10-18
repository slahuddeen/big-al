// ==================== 3D VORONOI CELL TERRAIN ====================
// Builds one chunky low-poly "terrace" per Voronoi cell: a bevelled prism with
// strata walls, a top whose edge colours blend into the neighbouring biomes,
// and a per-cell randomised layout of plants, rocks and clutter. Rivers, dry
// channels and migration trails are drawn from the smooth spline pieces the
// world generator stored on each cell; waterfalls appear where water drops to
// a lower terrace.
import * as THREE from 'three';
import { MeshBuilder, loft, blob, cone, limb, slab, rngFor, vary, shade, mix, col } from './lowpoly.js';
import { levelHeight } from '../world/worldGen.js';
import { createNoise2D } from '../world/noise.js';

// world-space noise so ground patches flow across cell borders
const patchNoise = createNoise2D(911);
const detailNoise = createNoise2D(3571);
const bumpNoise = createNoise2D(1777);

const BASE_Y = -1.8;
const BEVEL = 0.06;
const BEVEL_H = 0.045;

// ---------- palettes ----------
// Muted mineral colours, as in blue-green landscape painting: malachite greens,
// azurite-tinged rock, ochre earth and pale ash
const DIRT = '#6e604e';
const ROCK = '#6a6c6c';
const SAND_SIDE = '#a89a7a';
const STYLE = {
    meadow: { top: ['#b4b47a', '#a8aa70', '#c0bf86'], lip: '#8a8a5a' },
    fernprairie: { top: ['#8aa46a', '#7e9862', '#96b076'], lip: '#68804e' },
    floodplain: { top: ['#94a678', '#889a6e', '#a0b282'], lip: '#728258' },
    scrubland: { top: ['#a8a274', '#9c966a', '#b4ae80'], lip: '#827c56' },
    sauropodgrounds: { top: ['#b4a27a', '#a89670', '#c0ae86'], lip: '#8a7a5a' },
    ashflat: { top: ['#bcb8ae', '#b0aca2', '#c8c4ba'], lip: '#8e8a82', side: '#8a8680' },
    forest: { top: ['#5f7a5c', '#566f54', '#688462'], lip: '#465c44' },
    oldgrowth: { top: ['#4e6a52', '#46604a', '#58745a'], lip: '#3a5040' },
    ginkgogrove: { top: ['#9aa86a', '#8e9c62', '#a6b476'], lip: '#76824e' },
    denseforest: { top: ['#567252', '#4e684a', '#607c5a'], lip: '#40563e' },
    galleryforest: { top: ['#5c7a62', '#54705a', '#66846a'], lip: '#465e4c' },
    openwoods: { top: ['#96a070', '#8a9468', '#a2ac7a'], lip: '#727c54' },
    deadforest: { top: ['#9a948a', '#8e887e', '#a6a096'], lip: '#76706a' },
    deadfall: { top: ['#7e7a5a', '#747052', '#888464'], lip: '#5e5a44' },
    hills: { top: ['#7e9270', '#728666', '#8a9e7a'], lip: '#5e7056', side: '#6e7062' },
    crags: { top: ['#7a8e7a', '#6e826e', '#869a86'], lip: '#5a6a5e', side: '#6a6e70' },
    basalt: { top: ['#5e6062', '#545658', '#686a6c'], lip: '#46484a', side: '#4a4c50' },
    boulderfield: { top: ['#a49e92', '#989286', '#b0aa9e'], lip: '#827c72', side: '#867e74' },
    lavafield: { top: ['#3e3a38', '#36322f', '#46423f'], lip: '#2a2624', side: '#302c2a' },
    volcanic: { top: ['#4a403c', '#40363a', '#544a46'], lip: '#3a302c', side: '#3a302c' },
    mountains: { top: ['#8e9296', '#828688', '#9a9ea2'], lip: '#6e7276', side: '#6a6e72' },
    mudpot: { top: ['#a89a82', '#9c8e78', '#b4a68e'], lip: '#867864', side: '#7e7060' },
    hotspring: { top: ['#c8c4b4', '#bcb8a8', '#d4d0c0'], lip: '#9a968a', side: '#8e8a80' },
    river: { top: ['#8e9e78', '#849470', '#98a882'], lip: '#6e7c5c' },
    stream: { top: ['#b4ac8a', '#a8a080', '#c0b896'], lip: '#8e8668', side: SAND_SIDE },
    riverbank: { top: ['#c2b48e', '#b6a884', '#cec09a'], lip: '#9a8c6c', side: SAND_SIDE },
    marsh: { top: ['#6e8262', '#66785a', '#788c6a'], lip: '#526248' },
    waterhole: { top: ['#a0a07c', '#969672', '#aaaa86'], lip: '#7e7e5e' },
    lake: { top: ['#b0a888', '#a49c7e', '#bcb494'], lip: '#8e8668', side: SAND_SIDE },
    nest: { top: ['#a8906a', '#9c8462', '#b49c74'], lip: '#806a4c', side: '#7a6448' }
};
const styleOf = (t) => STYLE[t] || STYLE.meadow;

// Patch colours mixed into each biome's ground: [dark/worn patch, lush/light patch]
const PATCHES = {
    meadow: ['#94946a', '#cccc92'], fernprairie: ['#6e8656', '#a6be86'], ashflat: ['#9e9a92', '#d6d2c8'],
    forest: ['#4c6448', '#7a9472'], oldgrowth: ['#3e5642', '#6a826c'], ginkgogrove: ['#808c56', '#b4c086'],
    crags: ['#606e62', '#94a494'], basalt: ['#4a4c4e', '#78797a'], riverbank: ['#a89c7a', '#dcd0ac'], hotspring: ['#b8b4a4', '#ecead8']
};
// How bumpy the ground is (world units)
const RELIEF = {
    hills: 0.045, crags: 0.05, basalt: 0.03, boulderfield: 0.035, ashflat: 0.012, mountains: 0.03,
    marsh: 0.006, floodplain: 0.008, riverbank: 0.006, waterhole: 0, lake: 0, nest: 0, mudpot: 0, hotspring: 0,
    river: 0.008, stream: 0.008, volcanic: 0.02, lavafield: 0.015
};

// ---------- heights ----------
export const cellSurfaceY = (cell) => {
    const y = levelHeight(cell.level);
    if (cell.terrain === 'lake') return y - 0.3;
    if (cell.terrain === 'crags') return y + 0.35;
    return y;
};
export const cellWaterY = (cell) => {
    if (cell.terrain === 'lake') return levelHeight(cell.level) - 0.07;
    return null;
};
// where creatures stand / swim
export const cellStandY = (cell) => cellWaterY(cell) ?? cellSurfaceY(cell);

// ---------- polygon helpers (local coordinates around the cell centre) ----------
const polyArea = (poly) => {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x0, z0] = poly[i];
        const [x1, z1] = poly[(i + 1) % poly.length];
        a += x0 * z1 - x1 * z0;
    }
    return a / 2;
};
const insetPoly = (poly, d) => poly.map(([x, z]) => {
    const len = Math.hypot(x, z) || 1;
    return [x - (x / len) * d, z - (z / len) * d];
});
// signed distance inside a convex polygon (positive inside)
const insideDist = (poly, sign, x, z) => {
    let m = Infinity;
    for (let i = 0; i < poly.length; i++) {
        const [ax, az] = poly[i];
        const [bx, bz] = poly[(i + 1) % poly.length];
        const ex = bx - ax;
        const ez = bz - az;
        const len = Math.hypot(ex, ez) || 1;
        const d = (sign * (ex * (z - az) - ez * (x - ax))) / len;
        m = Math.min(m, d);
    }
    return m;
};

// ---------- flora & clutter ----------
const withSway = (mb, baseY, height, fn) => {
    mb.swayFn = (v) => Math.max(0, Math.min(1, (v.y - baseY) / height)) ** 1.5;
    fn();
    mb.swayFn = null;
};

const trunk = (mb, x, z, y, h, r, color, rand, lean = 0.04) => {
    const lx = (rand() - 0.5) * lean;
    const lz = (rand() - 0.5) * lean;
    loft(mb, [
        { p: [x, y - 0.03, z], r: r * 1.45 },
        { p: [x + lx * 0.2, y + h * 0.08, z + lz * 0.2], r: r * 1.05 },
        { p: [x + lx * 0.6, y + h * 0.55, z + lz * 0.6], r: r * 0.8 },
        { p: [x + lx, y + h, z + lz], r: r * 0.5 }
    ], { sides: 5, color, ridgeColor: shade(color, 1.15), rand, jitter: 0.15 });
    return [x + lx, y + h, z + lz];
};

const conifer = (mb, x, z, y, h, rand, opts = {}) => {
    const dark = opts.dark;
    const greens = opts.greens || (dark ? ['#244a3c', '#2a5442', '#305c48', '#36664e'] : ['#2e5a44', '#34644a', '#3c6e50', '#447856']);
    const top = trunk(mb, x, z, y, h * 0.45, 0.028 * h * 2, '#5a4434', rand);
    withSway(mb, y, h, () => {
        const tiers = opts.tiers ?? (h > 0.8 ? 4 : 3);
        for (let i = 0; i < tiers; i++) {
            const by = y + h * (0.2 + (i * 0.68) / tiers);
            const r = h * (0.32 - (i * 0.2) / tiers);
            const c = vary(greens[Math.min(greens.length - 1, i)], rand, 0.06);
            // drooping skirt then the cone above it
            cone(mb, [top[0], by, top[2]], [top[0], by + h * 0.36, top[2]], r, c, { sides: 7, jitter: 0.3, rand, rot: rand() * 6, baseColor: shade(c, 0.6) });
        }
        cone(mb, [top[0], y + h * 0.86, top[2]], [top[0], y + h * 1.08, top[2]], h * 0.07, greens[greens.length - 1], { sides: 5, rand });
    });
};

const araucaria = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.85, 0.03 * h * 1.5, '#7a4e2c', rand, 0.06);
    withSway(mb, y, h, () => {
        // whorls of horizontal branches tipped with tufts, flat-topped crown
        const whorls = 3;
        for (let i = 0; i < whorls; i++) {
            const wy = y + h * (0.55 + i * 0.12);
            const n = 5;
            const len = h * (0.28 - i * 0.06);
            for (let k = 0; k < n; k++) {
                const a = (k / n) * Math.PI * 2 + i * 0.6 + rand() * 0.3;
                const ex = top[0] + Math.cos(a) * len;
                const ez = top[2] + Math.sin(a) * len;
                limb(mb, [top[0], wy, top[2]], [ex, wy + len * 0.15, ez], 0.012, 0.007, '#6a4428', { sides: 3 });
                blob(mb, [ex, wy + len * 0.2, ez], len * 0.32, vary('#2c5844', rand, 0.08), { scale: [1.2, 0.55, 1.2], jitter: 0.35, rand });
            }
        }
        blob(mb, [top[0], y + h * 0.96, top[2]], h * 0.2, '#32604a', { scale: [1.5, 0.4, 1.5], jitter: 0.3, rand });
    });
};

const ginkgo = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.55, 0.045 * h, '#6e4a2c', rand, 0.1);
    for (let i = 0; i < 2; i++) {
        const a = rand() * Math.PI * 2;
        limb(mb, [top[0], top[1] - h * 0.08, top[2]], [top[0] + Math.cos(a) * h * 0.18, top[1] + h * 0.12, top[2] + Math.sin(a) * h * 0.18], 0.02, 0.01, '#6e4a2c', { sides: 4 });
    }
    withSway(mb, y, h, () => {
        const greens = ['#8aa850', '#7c9c48', '#96b25a', '#a4bc62'];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rand();
            const r = i === 0 ? 0 : h * 0.16;
            blob(mb, [top[0] + Math.cos(a) * r, top[1] + h * (0.12 + rand() * 0.14), top[2] + Math.sin(a) * r], h * (0.17 + rand() * 0.06), greens[i % 4], {
                jitter: 0.45, rand, colorFn: (ly) => (ly > 0.35 ? shade(greens[i % 4], 1.12) : greens[i % 4])
            });
        }
    });
};

const cycad = (mb, x, z, y, h, rand, frondColor = '#4f9a33') => {
    const top = new THREE.Vector3(x, y + h * 0.35, z);
    loft(mb, [{ p: [x, y - 0.01, z], r: 0.11 * h }, { p: [x, y + h * 0.18, z], r: 0.12 * h }, { p: top, r: 0.08 * h }],
        { sides: 6, color: '#7a5a34', stripes: { every: 2, offset: 1, color: '#634826' }, rand, jitter: 0.2 });
    blob(mb, [x, top.y + h * 0.06, z], h * 0.07, '#d88a2a', { scale: [1, 1.5, 1], rand, jitter: 0.2 }); // central cone
    withSway(mb, y, h, () => {
        const fronds = 8;
        for (let i = 0; i < fronds; i++) {
            const a = (i / fronds) * Math.PI * 2 + rand() * 0.4;
            const len = h * (0.55 + rand() * 0.25);
            const dx = Math.cos(a);
            const dz = Math.sin(a);
            const c = vary(frondColor, rand, 0.08);
            // two-segment drooping frond with a darker underside
            const p0 = top;
            const p1 = new THREE.Vector3(x + dx * len * 0.45, top.y + h * 0.22, z + dz * len * 0.45);
            const p2 = new THREE.Vector3(x + dx * len, top.y - h * 0.02, z + dz * len);
            const w1 = h * 0.1;
            const px = -dz;
            const pz = dx;
            mb.tri(p0, [p1.x + px * w1, p1.y, p1.z + pz * w1], [p1.x - px * w1, p1.y, p1.z - pz * w1], c, [0, 1, 0], true);
            mb.tri([p1.x + px * w1, p1.y, p1.z + pz * w1], p2, [p1.x - px * w1, p1.y, p1.z - pz * w1], shade(c, 0.9), [0, 1, 0], true);
        }
    });
};

const fern = (mb, x, z, y, s, rand, color = '#5a8a4a') => {
    withSway(mb, y, s, () => {
        const n = 6 + Math.floor(rand() * 4);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand() * 0.5;
            const len = s * (0.75 + rand() * 0.45);
            const dx = Math.cos(a);
            const dz = Math.sin(a);
            const c = vary(color, rand, 0.1);
            const pts = [[x, y, z], [x + dx * len * 0.35, y + s * 0.5, z + dz * len * 0.35], [x + dx * len * 0.7, y + s * 0.45, z + dz * len * 0.7], [x + dx * len, y + s * 0.1, z + dz * len]];
            const widths = [0, s * 0.13, s * 0.1, 0];
            for (let k = 0; k < 3; k++) {
                const [ax, ay, az] = pts[k];
                const [bx, by, bz] = pts[k + 1];
                const wa = widths[k];
                const wb = widths[k + 1];
                mb.quad([ax - dz * wa, ay, az + dx * wa], [bx - dz * wb, by, bz + dx * wb], [bx + dz * wb, by, bz - dx * wb], [ax + dz * wa, ay, az - dx * wa], k % 2 ? shade(c, 0.9) : c, [0, 1, 0], true);
            }
        }
    });
};

const tuft = (mb, x, z, y, s, rand, color = '#a7c24a') => {
    withSway(mb, y, s, () => {
        for (let i = 0; i < 5; i++) {
            const a = rand() * Math.PI * 2;
            const lean = 0.35 * s;
            const bx = x + Math.cos(a) * s * 0.15;
            const bz = z + Math.sin(a) * s * 0.15;
            const w = s * 0.07;
            mb.tri(
                [bx - Math.sin(a) * w, y, bz + Math.cos(a) * w],
                [bx + Math.sin(a) * w, y, bz - Math.cos(a) * w],
                [bx + Math.cos(a) * lean, y + s * (0.7 + rand() * 0.5), bz + Math.sin(a) * lean],
                vary(color, rand, 0.12),
                [Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3], true
            );
        }
    });
};

const horsetails = (mb, x, z, y, s, rand) => {
    withSway(mb, y, s, () => {
        const n = 5 + Math.floor(rand() * 5);
        for (let i = 0; i < n; i++) {
            const bx = x + (rand() - 0.5) * s * 0.6;
            const bz = z + (rand() - 0.5) * s * 0.6;
            const h = s * (0.7 + rand() * 0.7);
            const lx = (rand() - 0.5) * 0.08;
            const lz = (rand() - 0.5) * 0.08;
            loft(mb, [
                { p: [bx, y, bz], r: 0.016 },
                { p: [bx + lx * 0.33, y + h * 0.33, bz + lz * 0.33], r: 0.015, color: '#3f6a22' },
                { p: [bx + lx * 0.66, y + h * 0.66, bz + lz * 0.66], r: 0.013, color: '#3f6a22' },
                { p: [bx + lx, y + h, bz + lz], r: 0.01 }
            ], { sides: 4, color: '#6f9a36', tipEnd: 0.035 });
        }
    });
};

const bush = (mb, x, z, y, s, rand, color = '#5f9a34') => {
    withSway(mb, y, s * 1.4, () => {
        blob(mb, [x, y + s * 0.35, z], s * 0.5, color, { scale: [1.1, 0.75, 1], jitter: 0.45, rand, flatBottom: -0.5, colorFn: (ly) => (ly > 0.3 ? shade(color, 1.12) : color) });
        blob(mb, [x + s * 0.28, y + s * 0.28, z + s * 0.1], s * 0.34, shade(color, 1.1), { jitter: 0.45, rand, flatBottom: -0.5 });
        blob(mb, [x - s * 0.2, y + s * 0.25, z - s * 0.2], s * 0.3, shade(color, 0.92), { jitter: 0.45, rand, flatBottom: -0.5 });
    });
};

const rock = (mb, x, z, y, s, rand, color = '#8a857c', moss = null) => {
    blob(mb, [x, y + s * 0.22, z], s * 0.5, color, {
        scale: [1.1, 0.72, 0.95], jitter: 0.45, rand, flatBottom: -0.55, rotY: rand() * 6,
        colorFn: (ly) => (ly > 0.45 && moss ? moss : ly > 0.25 ? shade(color, 1.12) : color)
    });
};

const pebbles = (mb, x, z, y, rand, n = 4, color = '#9a948a') => {
    for (let i = 0; i < n; i++) {
        blob(mb, [x + (rand() - 0.5) * 0.3, y + 0.01, z + (rand() - 0.5) * 0.3], 0.025 + rand() * 0.02, color, { jitter: 0.4, rand, scale: [1.2, 0.6, 1], faceVary: 0.1 });
    }
};

const log = (mb, x, z, y, len, r, rand, color = '#6a4a2c') => {
    const a = rand() * Math.PI;
    const dx = Math.cos(a) * len / 2;
    const dz = Math.sin(a) * len / 2;
    loft(mb, [{ p: [x - dx, y + r * 0.8, z - dz], r }, { p: [x, y + r * 0.85, z], r: r * 0.95 }, { p: [x + dx, y + r * 0.8, z + dz], r: r * 0.85 }],
        { sides: 6, color, ridgeColor: shade(color, 1.2), rand, jitter: 0.15 });
    // pale cut end + a broken branch stub + moss
    blob(mb, [x - dx, y + r * 0.8, z - dz], r * 0.75, '#c8a878', { scale: [0.4, 1, 1], rotY: a, rand, jitter: 0.1 });
    limb(mb, [x + dx * 0.3, y + r * 1.4, z + dz * 0.3], [x + dx * 0.4, y + r * 3, z + dz * 0.4 + 0.05], r * 0.3, r * 0.15, color, { sides: 4 });
    blob(mb, [x + dx * 0.1, y + r * 1.55, z + dz * 0.1], r * 0.55, '#5a8a2a', { scale: [1.5, 0.35, 1], rand, jitter: 0.3 });
};

const mushrooms = (mb, x, z, y, rand) => {
    for (let i = 0; i < 3; i++) {
        const mx = x + (rand() - 0.5) * 0.12;
        const mz = z + (rand() - 0.5) * 0.12;
        const h = 0.03 + rand() * 0.04;
        limb(mb, [mx, y, mz], [mx, y + h, mz], 0.008, 0.007, '#efe4cc', { sides: 4 });
        blob(mb, [mx, y + h, mz], 0.022, i % 2 ? '#d0703a' : '#e8c070', { scale: [1.3, 0.6, 1.3], jitter: 0.1, rand });
    }
};

const bones = (mb, x, z, y, rand) => {
    // weathered sauropod bones: a femur and a vertebra
    const a = rand() * Math.PI;
    const dx = Math.cos(a) * 0.18;
    const dz = Math.sin(a) * 0.18;
    limb(mb, [x - dx, y + 0.03, z - dz], [x + dx, y + 0.03, z + dz], 0.025, 0.022, '#ece2c8', { sides: 5 });
    blob(mb, [x - dx, y + 0.035, z - dz], 0.045, '#e4d8bc', { rand, jitter: 0.2 });
    blob(mb, [x + dx, y + 0.035, z + dz], 0.04, '#e4d8bc', { rand, jitter: 0.2 });
    blob(mb, [x + 0.1, y + 0.03, z - 0.12], 0.05, '#ddd0b0', { scale: [1, 0.6, 1.4], rand, jitter: 0.3 });
};

const deadTree = (mb, x, z, y, h, rand) => {
    const c = '#5d4b3d';
    const top = trunk(mb, x, z, y, h, 0.04, c, rand, 0.12);
    for (let i = 0; i < 3; i++) {
        const by = y + h * (0.35 + i * 0.18);
        const a = rand() * Math.PI * 2;
        const len = h * (0.3 - i * 0.05);
        limb(mb, [x, by, z], [x + Math.cos(a) * len, by + len * 0.6, z + Math.sin(a) * len], 0.018, 0.006, shade(c, 0.9), { sides: 4 });
    }
    void top;
};

// a few small early flowers on short stems
const flowers = (mb, x, z, y, rand, color) => {
    for (let i = 0; i < 4; i++) {
        const fx = x + (rand() - 0.5) * 0.14;
        const fz = z + (rand() - 0.5) * 0.14;
        const h = 0.04 + rand() * 0.05;
        limb(mb, [fx, y, fz], [fx, y + h, fz], 0.005, 0.004, '#6a8a44', { sides: 3 });
        blob(mb, [fx, y + h, fz], 0.016, vary(color, rand, 0.05), { scale: [1.3, 0.45, 1.3], jitter: 0.2, rand });
    }
};

const stump = (mb, x, z, y, h, rand) => {
    trunk(mb, x, z, y, h, 0.05, '#4a4038', rand, 0.04);
    blob(mb, [x, y + h, z], 0.035, '#2e2824', { scale: [1, 0.4, 1], rand, jitter: 0.3 });
};

// a stepped volcanic pillar with a pine or two on its flat top
const crag = (mb, x, z, y, h, r, rand) => {
    const secs = [];
    const steps = 5;
    let px = x;
    let pz = z;
    for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const step = k % 2 ? 0.88 : 1;
        px += (rand() - 0.5) * 0.03;
        pz += (rand() - 0.5) * 0.03;
        const c = t > 0.9 ? '#5e7458' : t > 0.5 ? '#7c7e7c' : '#686a6c';
        secs.push({ p: [px, y - 0.02 + h * t, pz], r: r * (1.25 - t * 0.45) * step, color: c });
    }
    loft(mb, secs, { sides: 7, jitter: 0.35, rand, capStart: false, rot: rand() * 6 });
    conifer(mb, px + (rand() - 0.5) * r * 0.5, pz + (rand() - 0.5) * r * 0.5, y + h - 0.02, 0.32 + rand() * 0.15, rand, { dark: true, tiers: 3 });
    if (rand() < 0.4) blob(mb, [px, y + h * 0.55, pz + r], r * 0.4, '#4e6a48', { scale: [1.2, 0.5, 0.6], rand, jitter: 0.3 });
};

const treeFern = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.7, 0.03, '#4a3624', rand, 0.1);
    withSway(mb, y, h, () => fern(mb, top[0], top[2], top[1], h * 0.5, rand, '#3e8a2c'));
};

const galleryTree = (mb, x, z, y, h, rand, lean = [0, 0]) => {
    const tx = x + lean[0] * h;
    const tz = z + lean[1] * h;
    loft(mb, [
        { p: [x, y - 0.03, z], r: 0.05 * h },
        { p: [x + lean[0] * h * 0.25, y + h * 0.25, z + lean[1] * h * 0.25], r: 0.034 * h },
        { p: [x + lean[0] * h * 0.65, y + h * 0.55, z + lean[1] * h * 0.65], r: 0.028 * h },
        { p: [tx, y + h * 0.78, tz], r: 0.02 * h }
    ], { sides: 5, color: '#5e4630', ridgeColor: '#76583a', rand, jitter: 0.15 });
    for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        limb(mb, [x, y + h * 0.1, z], [x + Math.cos(a) * h * 0.13, y - 0.01, z + Math.sin(a) * h * 0.13], 0.02 * h, 0.008 * h, '#5a4230', { sides: 4 });
    }
    withSway(mb, y, h, () => {
        const greens = ['#2c6428', '#33702e', '#3d7c34', '#4a8a3a'];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rand() * 0.6;
            const r = i === 0 ? 0 : h * (0.16 + rand() * 0.08);
            const cy = y + h * (0.8 + rand() * 0.12) + (i === 0 ? h * 0.08 : 0);
            const c = greens[Math.floor(rand() * greens.length)];
            blob(mb, [tx + Math.cos(a) * r, cy, tz + Math.sin(a) * r], h * (0.15 + rand() * 0.06), c, {
                scale: [1.25, 0.6, 1.25], jitter: 0.4, rand, colorFn: (ly) => (ly > 0.3 ? shade(c, 1.18) : shade(c, 0.85))
            });
        }
        // vines hanging from the crown
        for (let i = 0; i < 4; i++) {
            const a = rand() * Math.PI * 2;
            const r = h * (0.12 + rand() * 0.14);
            const vx = tx + Math.cos(a) * r;
            const vz = tz + Math.sin(a) * r;
            const top = y + h * 0.78;
            limb(mb, [vx, top, vz], [vx + (rand() - 0.5) * 0.04, top - h * (0.25 + rand() * 0.3), vz + (rand() - 0.5) * 0.04], 0.006, 0.004, '#4a6a2a', { sides: 3 });
        }
    });
};

// ---------- ground clutter (litter, moss, footprints, cracks) ----------
const flake = (mb, x, z, y, s, color, rand) => {
    const a = rand() * Math.PI * 2;
    mb.tri([x + Math.cos(a) * s, y, z + Math.sin(a) * s], [x + Math.cos(a + 2.3) * s * 0.6, y, z + Math.sin(a + 2.3) * s * 0.6], [x + Math.cos(a + 3.9) * s * 0.7, y, z + Math.sin(a + 3.9) * s * 0.7], color, [0, 1, 0], true);
};
const theropodPrint = (mb, x, z, y, s, a, color) => {
    for (const da of [-0.5, 0, 0.5]) {
        const ax = Math.cos(a + da);
        const az = Math.sin(a + da);
        const px = -az;
        const pz = ax;
        const len = s * (da === 0 ? 1.15 : 0.9);
        mb.tri([x + px * s * 0.12, y, z + pz * s * 0.12], [x + ax * len, y, z + az * len], [x - px * s * 0.12, y, z - pz * s * 0.12], color, [0, 1, 0], true);
    }
};
const roundPrint = (mb, x, z, y, r, rand) => {
    const pts = [];
    for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        pts.push([x + Math.cos(a) * r * (0.85 + rand() * 0.25), y, z + Math.sin(a) * r * (0.85 + rand() * 0.25)]);
    }
    for (let k = 0; k < 7; k++) {
        mb.tri([x, y, z], pts[k], pts[(k + 1) % 7], '#6a5a34', [0, 1, 0], true);
        const o = pts[k];
        const o2 = pts[(k + 1) % 7];
        mb.quad(o, o2, [x + (o2[0] - x) * 1.25, y, z + (o2[2] - z) * 1.25], [x + (o[0] - x) * 1.25, y, z + (o[2] - z) * 1.25], '#a8985a', [0, 1, 0], true);
    }
};
const dung = (mb, x, z, y, rand) => {
    for (let i = 0; i < 3; i++) blob(mb, [x + (rand() - 0.5) * 0.06, y + 0.012, z + (rand() - 0.5) * 0.06], 0.022 + rand() * 0.01, '#5a4a2a', { scale: [1.2, 0.7, 1], rand, jitter: 0.3 });
};
const cracks = (mb, x, z, y, s, rand, color) => {
    let px = x;
    let pz = z;
    let a = rand() * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
        a += (rand() - 0.5) * 1.4;
        const nx = px + Math.cos(a) * s * 0.3;
        const nz = pz + Math.sin(a) * s * 0.3;
        const w = s * 0.018;
        mb.quad([px - Math.sin(a) * w, y, pz + Math.cos(a) * w], [nx - Math.sin(a) * w, y, nz + Math.cos(a) * w], [nx + Math.sin(a) * w, y, nz - Math.cos(a) * w], [px + Math.sin(a) * w, y, pz - Math.cos(a) * w], color, [0, 1, 0], true);
        px = nx;
        pz = nz;
    }
};

const FOREST_FLOOR = new Set(['forest', 'denseforest', 'oldgrowth', 'galleryforest', 'openwoods', 'ginkgogrove', 'deadfall']);
const OPEN_GROUND = new Set(['meadow', 'fernprairie', 'scrubland', 'floodplain', 'hills']);
const groundDetail = (terrain, D) => {
    const { g, rand, y, scatter } = D;
    const lift = y + 0.026;
    if (FOREST_FLOOR.has(terrain)) {
        // needle and leaf litter, moss
        const litter = terrain === 'ginkgogrove' ? ['#c8b040', '#a89030', '#8a7a2a'] : ['#6a5228', '#7a6030', '#5a4a26', '#8a6a34'];
        for (const [x, z] of scatter(16, { minR: 0, margin: 0.08, minDist: 0.06, keepCentre: false, register: false })) flake(g, x, z, lift, 0.035 + rand() * 0.03, litter[Math.floor(rand() * litter.length)], rand);
        for (const [x, z] of scatter(2, { minR: 0.25, minDist: 0.3, register: false })) disc(g, x, z, lift - 0.004, 0.09 + rand() * 0.06, rand() > 0.5 ? '#3e7a2a' : '#4a8a30', 7, rand);
    } else if (OPEN_GROUND.has(terrain)) {
        for (const [x, z] of scatter(6, { minR: 0, margin: 0.08, minDist: 0.08, keepCentre: false, register: false })) flake(g, x, z, lift, 0.03 + rand() * 0.02, rand() > 0.5 ? '#c0b060' : '#8a9a3a', rand);
        if (rand() < 0.35) {
            // a line of theropod tracks crossing the cell
            const a = rand() * Math.PI * 2;
            for (let k = -2; k <= 2; k++) theropodPrint(g, Math.cos(a) * k * 0.18 + Math.sin(a) * (k % 2) * 0.05, Math.sin(a) * k * 0.18 - Math.cos(a) * (k % 2) * 0.05, lift, 0.05, a, '#6a5e30');
        }
    }
    if (terrain === 'sauropodgrounds') {
        for (const [x, z] of scatter(7, { minR: 0, margin: 0.1, minDist: 0.18, keepCentre: false, register: false })) roundPrint(g, x, z, lift, 0.06 + rand() * 0.025, rand);
        for (const [x, z] of scatter(2, { minR: 0.3, minDist: 0.3, register: false })) dung(g, x, z, y, rand);
    }
    if (['ashflat', 'lavafield'].includes(terrain) || (terrain === 'floodplain' && rand() < 0.5)) {
        const c = terrain === 'lavafield' ? '#1e1a1a' : terrain === 'floodplain' ? '#5a6a2a' : '#8a867c';
        for (const [x, z] of scatter(4, { minR: 0.1, minDist: 0.2, keepCentre: false, register: false })) cracks(g, x, z, lift, 0.5, rand, c);
    }
    if (['marsh', 'riverbank', 'waterhole'].includes(terrain)) {
        for (const [x, z] of scatter(3, { minR: 0.3, minDist: 0.2, register: false })) disc(g, x, z, lift - 0.006, 0.07 + rand() * 0.05, '#5a7a2a', 6, rand);
    }
};

// ---------- ribbons (rivers / trails / dry channels) ----------
const ribbonFrame = (pts) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    return { ...p, nx: -dz, nz: dx, dx, dz };
});

// three-vertex-wide ribbon so foam/flow attributes interpolate across the width
const waterRibbon = (mb, pts, y, widthMul, colorC, colorE, kind, sOffset = 0) => {
    const F = ribbonFrame(pts);
    for (let i = 0; i < F.length - 1; i++) {
        const A = F[i];
        const B = F[i + 1];
        const L = (P) => [P.x + P.nx * P.w * widthMul * 0.5, y, P.z + P.nz * P.w * widthMul * 0.5];
        const R = (P) => [P.x - P.nx * P.w * widthMul * 0.5, y, P.z - P.nz * P.w * widthMul * 0.5];
        const C = (P) => [P.x, y, P.z];
        const wd = (P, e) => [P.s + sOffset, e * 0.85, kind];
        mb.triV(L(A), L(B), C(B), [colorE, colorE, colorC], [wd(A, 1), wd(B, 1), wd(B, 0)], [0, 1, 0], true);
        mb.triV(L(A), C(B), C(A), [colorE, colorC, colorC], [wd(A, 1), wd(B, 0), wd(A, 0)], [0, 1, 0], true);
        mb.triV(C(A), C(B), R(B), [colorC, colorC, colorE], [wd(A, 0), wd(B, 0), wd(B, 1)], [0, 1, 0], true);
        mb.triV(C(A), R(B), R(A), [colorC, colorE, colorE], [wd(A, 0), wd(B, 1), wd(A, 1)], [0, 1, 0], true);
    }
};

const flatRibbon = (mb, pts, y, widthMul, color, rand) => {
    const F = ribbonFrame(pts);
    for (let i = 0; i < F.length - 1; i++) {
        const A = F[i];
        const B = F[i + 1];
        const wa = A.w * widthMul * 0.5;
        const wb = B.w * widthMul * 0.5;
        mb.quad([A.x + A.nx * wa, y, A.z + A.nz * wa], [B.x + B.nx * wb, y, B.z + B.nz * wb], [B.x - B.nx * wb, y, B.z - B.nz * wb], [A.x - A.nx * wa, y, A.z - A.nz * wa],
            rand ? vary(color, rand, 0.03) : color, [0, 1, 0], true);
    }
};

const disc = (mb, x, z, y, r, color, sides = 7, rand = null) => {
    const pts = [];
    for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const rr = rand ? r * (0.8 + rand() * 0.35) : r;
        pts.push(new THREE.Vector3(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr));
    }
    const c = new THREE.Vector3(x, y, z);
    for (let k = 0; k < sides; k++) mb.tri(c, pts[k], pts[(k + 1) % sides], rand ? vary(color, rand, 0.03) : color, [0, 1, 0], true);
};

const waterDisc = (mb, x, z, y, r, colorC, colorE, rand, sides = 9) => {
    const pts = [];
    for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const rr = r * (0.8 + rand() * 0.35);
        pts.push([x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]);
    }
    for (let k = 0; k < sides; k++) {
        mb.triV([x, y, z], pts[k], pts[(k + 1) % sides], [colorC, colorE, colorE], [[0, 0, 0], [0, 1, 0], [0, 1, 0]], [0, 1, 0], true);
    }
};

// ==================== MAIN BUILDER ====================
// cell: world cell { x, z, poly, edges, level, terrain, waterways }
// world: for neighbour lookups (may be null in the gallery)
export const buildCell = (cell, world, { detail = true } = {}) => {
    const terrain = cell.terrain;
    const style = styleOf(terrain);
    const rand = rngFor(cell.id ?? 0, Math.round(cell.x * 10), Math.round(cell.z * 10));
    const y = cellSurfaceY(cell);
    const g = new MeshBuilder();
    const w = new MeshBuilder(true);
    const l = new MeshBuilder();
    const smoke = [];
    const pools = [];
    const cx = cell.x;
    const cz = cell.z;
    const poly = cell.poly.map(([x, z]) => [x - cx, z - cz]);
    const sign = Math.sign(polyArea(poly)) || 1;
    const outer = poly;
    const inner = insetPoly(poly, BEVEL);
    const neighbour = (i) => (world && cell.edges[i].n !== null ? world.cells[cell.edges[i].n] : null);

    // per-cell variation: a hue/brightness drift and a layout variant
    const hueShift = (rand() - 0.5) * 0.05;
    const lightShift = (rand() - 0.5) * 0.08;
    const tint = (c) => col(c).offsetHSL(hueShift, 0, lightShift);
    const topCols = style.top.map(tint);
    const variant = rand();
    const density = 0.7 + rand() * 0.6;

    // ---------- walls ----------
    const side = style.side ?? DIRT;
    const wallTop = y - BEVEL_H;
    const bands = [
        { to: Math.min(wallTop, y - 0.5), color: shade(side, 0.68) },
        { to: Math.min(wallTop, y - 0.17), color: shade(side, 0.85) },
        { to: wallTop, color: tint(style.lip) }
    ];
    let yA = BASE_Y;
    const centre3 = new THREE.Vector3(0, (BASE_Y + y) / 2, 0);
    for (const band of bands) {
        const yB = band.to;
        if (yB <= yA) continue;
        for (let i = 0; i < outer.length; i++) {
            const j = (i + 1) % outer.length;
            g.quad([outer[i][0], yA, outer[i][1]], [outer[j][0], yA, outer[j][1]], [outer[j][0], yB, outer[j][1]], [outer[i][0], yB, outer[i][1]], band.color, centre3);
        }
        yA = yB;
    }
    if (terrain === 'mesa' || terrain === 'badlands') {
        const stripes = ['#b0552c', '#d07a40', '#a44a28', '#c86a36', '#e09a58'];
        for (let k = 0; k < 6; k++) {
            const ya = y - 0.12 - k * 0.14;
            if (ya - 0.06 < BASE_Y) break;
            for (let i = 0; i < outer.length; i++) {
                const j = (i + 1) % outer.length;
                const f = 1.004;
                g.quad([outer[i][0] * f, ya - 0.07, outer[i][1] * f], [outer[j][0] * f, ya - 0.07, outer[j][1] * f], [outer[j][0] * f, ya, outer[j][1] * f], [outer[i][0] * f, ya, outer[i][1] * f], stripes[k % 5], centre3);
            }
        }
    }

    // ---------- bevel ----------
    for (let i = 0; i < outer.length; i++) {
        const j = (i + 1) % outer.length;
        g.quad([outer[i][0], wallTop, outer[i][1]], [outer[j][0], wallTop, outer[j][1]], [inner[j][0], y, inner[j][1]], [inner[i][0], y, inner[i][1]], tint(style.lip), centre3);
    }

    // ---------- waterways in local coordinates (rivers, dry channels, trails) ----------
    const localWays = (cell.waterways || []).map((ww) => ({ ...ww, pts: ww.pts.map((p) => ({ ...p, x: p.x - cx, z: p.z - cz })) }));
    const onWater = (x, z) => localWays.some((ww) => ww.kind !== 'trail' && ww.pts.some((p) => Math.hypot(p.x - x, p.z - z) < p.w * 0.9 + 0.12));
    const nearWay = (x, z) => localWays.some((ww) => ww.pts.some((p) => Math.hypot(p.x - x, p.z - z) < p.w * 1.1 + 0.2));

    // ---------- top surface: noise patches + gentle relief, edges blended toward neighbouring biomes ----------
    const neighbourColour = (i) => {
        const n = neighbour(i);
        if (!n || n.terrain === 'mountains' || Math.abs(n.level - cell.level) > 1) return null;
        return col(styleOf(n.terrain).top[0]);
    };
    const patch = PATCHES[terrain];
    const patchDark = patch ? tint(patch[0]) : shade(topCols[0], 0.85);
    const patchLight = patch ? tint(patch[1]) : shade(topCols[0], 1.12);
    const relief = (RELIEF[terrain] ?? 0.018) * (detail ? 1 : 0.6);
    const groundColour = (x, z, cc) => {
        const wx = cx + x;
        const wz = cz + z;
        const n = patchNoise(wx * 0.55, wz * 0.55) + patchNoise(wx * 1.3 + 5, wz * 1.3 - 3) * 0.5;
        const out = cc.clone();
        if (n < -0.18) out.lerp(patchDark, Math.min(0.75, (-n - 0.18) * 1.6));
        else if (n > 0.18) out.lerp(patchLight, Math.min(0.7, (n - 0.18) * 1.5));
        const d = detailNoise(wx * 3.2, wz * 3.2);
        return out.offsetHSL(0, 0, d * 0.035);
    };
    const groundY = (x, z, edge = false) => {
        if (edge || relief === 0 || nearWay(x, z)) return y;
        const wx = cx + x;
        const wz = cz + z;
        return y + Math.max(0, bumpNoise(wx * 1.15, wz * 1.15) * 0.6 + bumpNoise(wx * 2.7, wz * 2.7) * 0.4 + 0.15) * relief;
    };
    const base = topCols[0];
    const ring = [];
    for (let i = 0; i < inner.length; i++) {
        const j = (i + 1) % inner.length;
        const prevN = neighbourColour((i - 1 + inner.length) % inner.length);
        const thisN = neighbourColour(i);
        let cc = groundColour(inner[i][0], inner[i][1], vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.03));
        const blends = [prevN, thisN].filter(Boolean);
        if (blends.length) cc = cc.lerp(blends.reduce((a, b) => a.clone().lerp(b, 0.5)), 0.3);
        ring.push({ p: inner[i], c: cc });
        const mp = [(inner[i][0] + inner[j][0]) / 2, (inner[i][1] + inner[j][1]) / 2];
        let mc = groundColour(mp[0], mp[1], vary(base, rand, 0.03));
        if (thisN) mc = mc.lerp(thisN, 0.38);
        ring.push({ p: mp, c: mc });
    }
    // concentric rings toward the centre, each a little bumpy
    const rings = [ring.map((r) => ({ ...r, y }))];
    for (const k of [0.76, 0.52, 0.28]) {
        rings.push(ring.map((r) => {
            const p = [r.p[0] * k, r.p[1] * k];
            return { p, y: groundY(p[0], p[1]), c: groundColour(p[0], p[1], vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.035)) };
        }));
    }
    const centreC = groundColour(0, 0, vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.03));
    const centreY = groundY(0, 0);
    const V = (r) => [r.p[0], r.y, r.p[1]];
    for (let ri = 0; ri < rings.length - 1; ri++) {
        const A = rings[ri];
        const B = rings[ri + 1];
        for (let i = 0; i < A.length; i++) {
            const j = (i + 1) % A.length;
            g.triV(V(B[i]), V(A[i]), V(A[j]), [B[i].c, A[i].c, A[j].c], null, [0, 1, 0], true);
            g.triV(V(B[i]), V(A[j]), V(B[j]), [B[i].c, A[j].c, B[j].c], null, [0, 1, 0], true);
        }
    }
    const last = rings[rings.length - 1];
    for (let i = 0; i < last.length; i++) {
        const j = (i + 1) % last.length;
        g.triV([0, centreY, 0], V(last[i]), V(last[j]), [centreC, last[i].c, last[j].c], null, [0, 1, 0], true);
    }

    // ---------- placement helpers ----------
    const maxR = Math.max(...inner.map(([x, z]) => Math.hypot(x, z)));
    const placed = [];
    const scatter = (count, { minR = 0.42, margin = 0.1, minDist = 0.22, keepCentre = true, register = true } = {}) => {
        const out = [];
        let tries = 0;
        const n = Math.max(0, Math.round(count));
        while (out.length < n && tries < n * 40 + 20) {
            tries++;
            const a = rand() * Math.PI * 2;
            const r = Math.sqrt(rand()) * maxR;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            if (keepCentre && r < minR) continue;
            if (insideDist(inner, sign, x, z) < margin) continue;
            if (onWater(x, z)) continue;
            if ([...(register ? placed : []), ...out].some((p) => Math.hypot(p[0] - x, p[1] - z) < minDist)) continue;
            out.push([x, z]);
        }
        if (register) placed.push(...out);
        return out;
    };
    const many = (n) => (detail ? n * density : n * density * 0.35);
    const small = (n) => (detail ? n * density : 0);

    // ---------- waterways (rivers, dry channels, trails) ----------
    const isWaterCell = terrain === 'lake';
    if (!isWaterCell) {
        for (const ww of localWays) {
            if (ww.kind === 'river') {
                // same water as the lakes: deep centre, lighter shallows
                const deep = '#3f7c7a';
                const light = '#8cc2b2';
                const wide = terrain === 'river' ? 1.3 : 1.1;
                flatRibbon(g, ww.pts, y + 0.006, 1.75 * wide, '#6e5a30', rand); // muddy banks
                flatRibbon(g, ww.pts, y + 0.009, 1.3 * wide, '#8a7a4a', null);
                waterRibbon(w, ww.pts, y + 0.022, wide, deep, light, 1);
                const first = ww.pts[0];
                if (ww.start) {
                    // spring: a small pool among mossy stones
                    waterDisc(w, first.x, first.z, y + 0.024, 0.16, '#3f8480', '#9acabc', rand);
                    for (let k = 0; k < 4; k++) {
                        const a = (k / 4) * Math.PI * 2 + rand();
                        rock(g, first.x + Math.cos(a) * 0.2, first.z + Math.sin(a) * 0.2, y, 0.1, rand, '#7a766c', '#5a8a2a');
                    }
                }
                pools.push(...ww.pts.filter((_, i) => i % 3 === 1).map((p) => ({ x: p.x, z: p.z, r: Math.max(0.05, p.w * 0.35), y: y + 0.022 })));
                // waterfall where the water drops to a lower terrace / into a lake
                if (world && ww.exitTo !== undefined && ww.exitTo !== null && !ww.end) {
                    const next = world.cells[ww.exitTo];
                    const nextY = (cellWaterY(next) ?? cellSurfaceY(next) + 0.022);
                    const top = y + 0.022;
                    if (nextY < top - 0.05) {
                        const F = ribbonFrame(ww.pts);
                        const P = F[F.length - 1];
                        const hw = P.w * 0.5;
                        const a = [P.x + P.nx * hw, top, P.z + P.nz * hw];
                        const b = [P.x - P.nx * hw, top, P.z - P.nz * hw];
                        const fx = P.dx * 0.06;
                        const fz = P.dz * 0.06;
                        const c = [b[0] + fx, nextY, b[2] + fz];
                        const d = [a[0] + fx, nextY, a[2] + fz];
                        w.triV(a, b, c, ['#b8dcd2', '#b8dcd2', '#f4f2ea'], [[0, 0.3, 2], [0, 0.3, 2], [0, 1, 2]], [P.dx, 0.3, P.dz], true);
                        w.triV(a, c, d, ['#b8dcd2', '#f4f2ea', '#f4f2ea'], [[0, 0.3, 2], [0, 1, 2], [0, 1, 2]], [P.dx, 0.3, P.dz], true);
                        // rocks framing the fall
                        rock(g, a[0] + P.nx * 0.08, a[2] + P.nz * 0.08, y - 0.05, 0.14, rand, '#6f6a62', '#4f7a2a');
                        rock(g, b[0] - P.nx * 0.08, b[2] - P.nz * 0.08, y - 0.05, 0.12, rand, '#6f6a62', '#4f7a2a');
                    }
                }
                // churning foam where a waterfall lands in this cell
                if (world && ww.enterFrom !== undefined && ww.enterFrom >= 0) {
                    const prev = world.cells[ww.enterFrom];
                    if (prev && cellSurfaceY(prev) > y + 0.05 && prev.terrain !== 'lake') {
                        const p0 = ww.pts[0];
                        waterDisc(w, p0.x, p0.z, y + 0.026, p0.w * 0.7, '#e8f6ff', '#ffffff', rand, 8);
                    }
                }
            } else if (ww.kind === 'dry') {
                flatRibbon(g, ww.pts, y + 0.006, 1.6, '#b49a6c', rand);
                flatRibbon(g, ww.pts, y + 0.01, 1.0, '#d8c39a', null);
                for (let i = 2; i < ww.pts.length - 1; i += 3) {
                    const p = ww.pts[i];
                    if (rand() < 0.5) g.quad([p.x - 0.05, y + 0.013, p.z], [p.x + 0.04, y + 0.013, p.z + 0.06], [p.x + 0.045, y + 0.013, p.z + 0.05], [p.x - 0.045, y + 0.013, p.z - 0.01], '#8a7050', [0, 1, 0], true);
                    if (rand() < 0.3) pebbles(g, p.x, p.z, y, rand, 2, '#a59c8c');
                }
            } else if (ww.kind === 'trail') {
                flatRibbon(g, ww.pts, y + 0.004, 1.5, '#9a8a4c', rand);
                flatRibbon(g, ww.pts, y + 0.007, 0.9, '#8a7a42', null);
                const F = ribbonFrame(ww.pts);
                for (let i = 1; i < F.length; i += 3) {
                    const p = F[i];
                    const sideOff = (i % 2 ? 1 : -1) * 0.13;
                    disc(g, p.x + p.nx * sideOff, p.z + p.nz * sideOff, y + 0.011, 0.07, '#5e4e2c', 7, rand);
                }
            }
        }
    }

    // ---------- open water cells ----------
    if (isWaterCell) {
        const wy = cellWaterY(cell);
        // jade water, paler celadon in the shallows
        const deepC = '#376e72';
        const shoreC = '#86b8aa';
        const wpoly = poly.map(([x, z]) => [x * 1.004, z * 1.004]);
        const shoreEdge = wpoly.map((_, i) => {
            const n = neighbour(i);
            return n ? (n.terrain !== 'lake' ? 1 : 0) : 0;
        });
        for (let i = 0; i < wpoly.length; i++) {
            const j = (i + 1) % wpoly.length;
            const ei = Math.max(shoreEdge[i], shoreEdge[(i - 1 + wpoly.length) % wpoly.length]);
            const ej = Math.max(shoreEdge[j], shoreEdge[i]);
            const m = [(wpoly[i][0] + wpoly[j][0]) / 2, (wpoly[i][1] + wpoly[j][1]) / 2];
            const mi = [wpoly[i][0] * 0.5, wpoly[i][1] * 0.5];
            const mj = [wpoly[j][0] * 0.5, wpoly[j][1] * 0.5];
            const em = shoreEdge[i];
            const cOf = (e) => (e ? shoreC : deepC);
            // centre fan + outer ring (so foam stays at the shore)
            w.triV([0, wy, 0], [mi[0], wy, mi[1]], [mj[0], wy, mj[1]], [deepC, deepC, deepC], [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 1, 0], true);
            w.triV([mi[0], wy, mi[1]], [wpoly[i][0], wy, wpoly[i][1]], [m[0], wy, m[1]], [deepC, cOf(ei), cOf(em)], [[0, 0, 0], [0, ei, 0], [0, em, 0]], [0, 1, 0], true);
            w.triV([mi[0], wy, mi[1]], [m[0], wy, m[1]], [mj[0], wy, mj[1]], [deepC, cOf(em), deepC], [[0, 0, 0], [0, em, 0], [0, 0, 0]], [0, 1, 0], true);
            w.triV([mj[0], wy, mj[1]], [m[0], wy, m[1]], [wpoly[j][0], wy, wpoly[j][1]], [deepC, cOf(em), cOf(ej)], [[0, 0, 0], [0, em, 0], [0, ej, 0]], [0, 1, 0], true);
            // water skirt on the world border / against land so the volume reads
            const n = neighbour(i);
            if (!n || shoreEdge[i]) {
                const lowY = Math.max(y, wy - 0.6);
                w.triV([wpoly[i][0], wy, wpoly[i][1]], [wpoly[j][0], wy, wpoly[j][1]], [wpoly[j][0], lowY, wpoly[j][1]], [deepC, deepC, '#24484a'], null, [wpoly[i][0] + wpoly[j][0], 0, wpoly[i][1] + wpoly[j][1]], true);
                w.triV([wpoly[i][0], wy, wpoly[i][1]], [wpoly[j][0], lowY, wpoly[j][1]], [wpoly[i][0], lowY, wpoly[i][1]], [deepC, '#24484a', '#24484a'], null, [wpoly[i][0] + wpoly[j][0], 0, wpoly[i][1] + wpoly[j][1]], true);
            }
        }
        pools.push({ x: 0, z: 0, r: Math.max(0.2, cell.inradius ? cell.inradius * 0.75 : 0.6), y: wy });
        // underwater detail
        for (const [x, z] of scatter(many(3), { minR: 0.1, margin: 0.15, minDist: 0.3, keepCentre: false })) {
            rock(g, x, z, y, 0.16, rand, '#7a7468', '#4a7a3a');
        }
        if (terrain === 'lake' && detail) for (const [x, z] of scatter(2, { minR: 0.5, margin: 0.06, minDist: 0.3 })) horsetails(g, x, z, y, 0.42, rand);
    }

    // ---------- biome decoration ----------
    // direction (local) toward the nearest river or lake next door, for trees that lean over the water
    let waterDir = null;
    if (world) {
        let best = Infinity;
        for (const nid of cell.neighborIds || []) {
            const n = world.cells[nid];
            if (!n || !['river', 'stream', 'lake'].includes(n.terrain)) continue;
            const d = Math.hypot(n.x - cx, n.z - cz);
            if (d < best) {
                best = d;
                waterDir = [(n.x - cx) / d, (n.z - cz) / d];
            }
        }
        const own = localWays.find((ww) => ww.kind === 'river');
        if (!waterDir && own) waterDir = 'own';
    }
    const gallerySide = world && (cell.neighborIds || []).some((nid) => ['galleryforest', 'forest', 'oldgrowth', 'denseforest'].includes(world.cells[nid]?.terrain));
    const D = { g, w, l, rand, y, variant, density, scatter, many, small, waterDir, localWays, gallerySide, detail };
    if (detail && !isWaterCell) groundDetail(terrain, D);
    decorate(terrain, D, cell, smoke, pools);

    return {
        ground: g.build(),
        water: w.isEmpty() ? null : w.build(),
        lava: l.isEmpty() ? null : l.build(),
        surfaceY: y,
        waterY: cellWaterY(cell),
        smoke,
        pools,
        localPoly: poly,
        inradius: cell.inradius ?? 0.8
    };
};

const decorate = (terrain, D, cell, smoke, pools) => {
    const { g, w, l, rand, y, variant, scatter, many, small } = D;
    const each = (pts, fn) => pts.forEach(([x, z], i) => fn(x, z, i));
    switch (terrain) {
        case 'meadow':
            // ferns and grasses with a scatter of small, early flowers
            each(scatter(small(10), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.14, rand, rand() > 0.5 ? '#a8b45a' : '#94a852'));
            each(scatter(many(3), { minR: 0.35, minDist: 0.3 }), (x, z) => fern(g, x, z, y, 0.18, rand, '#6a9450'));
            each(scatter(many(4), { minR: 0.2, minDist: 0.22 }), (x, z, i) => flowers(g, x, z, y, rand, ['#f2ecd8', '#e8c860', '#d89aa0'][i % 3]));
            if (variant > 0.8) each(scatter(1, { minR: 0.55 }), (x, z) => ginkgo(g, x, z, y, 0.7, rand));
            break;
        case 'hotspring': {
            // terraced pools of turquoise water inside white sinter rims, an orange ring of bacteria at the edge, steam
            const n = 2 + Math.floor(variant * 2);
            each(scatter(n, { minR: 0.05, minDist: 0.45, keepCentre: false }), (x, z, i) => {
                const r = 0.2 + rand() * 0.12;
                disc(g, x, z, y + 0.004, r * 1.45, '#ece8da', 9, rand);
                disc(g, x, z, y + 0.008, r * 1.15, '#c89a58', 9, rand);
                // knobbly sinter lumps around the rim
                for (let k = 0; k < 7; k++) {
                    const a = (k / 7) * Math.PI * 2 + rand() * 0.5;
                    blob(g, [x + Math.cos(a) * r * 1.2, y + 0.01, z + Math.sin(a) * r * 1.2], 0.03 + rand() * 0.025, '#f2efe4', { scale: [1.3, 0.5, 1.3], jitter: 0.3, rand });
                }
                waterDisc(w, x, z, y + 0.03, r, '#2f8e98', '#8ad4c8', rand, 10);
                pools.push({ x, z, r: r * 0.7, y: y + 0.03 });
                if (i < 2) smoke.push(new THREE.Vector3(x, y + 0.06, z));
            });
            each(scatter(many(3), { minR: 0.6, minDist: 0.3 }), (x, z) => rock(g, x, z, y, 0.12, rand, '#b8b2a2'));
            each(scatter(small(3), { minR: 0.65 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#7a9a5a'));
            break;
        }
        case 'ashflat':
            // grey ash drifts, a few charred stumps, the first green shoots coming back
            each(scatter(many(5), { minR: 0.1, minDist: 0.3, keepCentre: false }), (x, z) => disc(g, x, z, y + 0.004, 0.14 + rand() * 0.12, rand() > 0.5 ? '#c4c0b6' : '#a8a49c', 7, rand));
            each(scatter(many(2), { minR: 0.4, minDist: 0.4 }), (x, z) => stump(g, x, z, y, 0.12 + rand() * 0.14, rand));
            each(scatter(small(4), { minR: 0.2, minDist: 0.18 }), (x, z) => tuft(g, x, z, y, 0.08, rand, '#8aa462'));
            if (variant > 0.75) each(scatter(1, { minR: 0.5 }), (x, z) => deadTree(g, x, z, y, 0.45, rand));
            break;
        case 'crags':
            // steep stepped pillars of old volcanic rock with pines clinging to the tops
            each(scatter(many(variant > 0.5 ? 3 : 2), { minR: 0.45, minDist: 0.42 }), (x, z) => crag(g, x, z, y, 0.6 + rand() * 0.7, 0.15 + rand() * 0.07, rand));
            each(scatter(small(3), { minR: 0.25 }), (x, z) => rock(g, x, z, y, 0.12, rand, '#7a7c7a', '#5a7a52'));
            each(scatter(small(2), { minR: 0.3 }), (x, z) => conifer(g, x, z, y, 0.4, rand, { dark: true }));
            break;
        case 'basalt': {
            // a cluster of six-sided columns stepping down from one side of the cell
            const side = rand() * Math.PI * 2;
            const sx = Math.cos(side);
            const sz = Math.sin(side);
            const R = 0.085;
            for (let q = -5; q <= 5; q++) {
                for (let r = -5; r <= 5; r++) {
                    const x = (q + r * 0.5) * R * 1.75;
                    const z = r * R * 1.52;
                    const along = x * sx + z * sz;
                    if (Math.hypot(x, z) > 0.75 || along < 0.12) continue;
                    if (rand() < 0.12) continue;
                    const h = 0.05 + along * 0.55 + rand() * 0.12;
                    const c = vary('#55585c', rand, 0.06);
                    loft(g, [{ p: [x, y - 0.02, z], r: R, color: shade(c, 0.8) }, { p: [x, y + h, z], r: R * 0.96, color: c }], { sides: 6, rot: 0, rand, jitter: 0.04, capStart: false });
                    if (rand() < 0.15) disc(g, x, z, y + h + 0.004, R * 0.7, '#6a8a5a', 6, rand);
                }
            }
            each(scatter(small(3), { minR: 0.3 }), (x, z) => pebbles(g, x, z, y, rand, 3, '#5e6064'));
            break;
        }
        case 'mudpot': {
            // grey boiling mud: concentric rings, bubbles, steam, and nothing growing near it
            const rings = ['#8a8070', '#a69a88', '#7a7062', '#9a8e7c', '#6e665a'];
            rings.forEach((c, i) => disc(g, 0.02, -0.02, y + 0.003 + i * 0.002, 0.62 - i * 0.12, c, 11, null));
            for (let i = 0; i < 6; i++) {
                const a = rand() * Math.PI * 2;
                const r = rand() * 0.4;
                blob(g, [Math.cos(a) * r, y + 0.014, Math.sin(a) * r], 0.025 + rand() * 0.03, '#b4aa98', { scale: [1, 0.55, 1], jitter: 0.15, rand });
            }
            smoke.push(new THREE.Vector3(0.02, y + 0.05, -0.02));
            each(scatter(2, { minR: 0.72 }), (x, z) => deadTree(g, x, z, y, 0.35, rand));
            if (variant > 0.5) each(scatter(1, { minR: 0.5 }), (x, z) => bones(g, x, z, y, rand));
            break;
        }
        case 'nest': {
            // a Yutyrannus nest: a mound of earth and rotting plants that warms the eggs as it composts
            blob(g, [0, y - 0.02, 0], 0.56, '#6a5638', {
                detail: 1, scale: [1, 0.34, 1], jitter: 0.12, rand, flatBottom: 0,
                colorFn: (ly, rr) => (ly > 0.7 ? '#8a7450' : rr() > 0.7 ? '#76804a' : '#7e6846')
            });
            for (let i = 0; i < 9; i++) {
                const a = (i / 9) * Math.PI * 2 + rand() * 0.3;
                flake(g, Math.cos(a) * 0.38, Math.sin(a) * 0.38, y + 0.1, 0.06, i % 2 ? '#7a6a3a' : '#5a6a30', rand);
            }
            // long eggs laid in pairs in a ring, half buried
            for (let i = 0; i < 8; i++) {
                const a = (Math.floor(i / 2) / 4) * Math.PI * 2 + (i % 2) * 0.62;
                const ex = Math.cos(a) * 0.2;
                const ez = Math.sin(a) * 0.2;
                blob(g, [ex, y + 0.16, ez], 0.045, '#ece2cc', {
                    detail: 1, jitter: 0.03, scale: [0.8, 0.8, 1.45], rotY: -a, rand, colorFn: (ly, rr) => (rr() > 0.85 ? '#cbbc98' : '#ece2cc'), faceVary: 0.02
                });
            }
            each(scatter(many(3), { minR: 0.68 }), (x, z) => fern(g, x, z, y, 0.2, rand, '#5a8a4a'));
            each(scatter(small(3), { minR: 0.65 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#94a456'));
            break;
        }
        case 'fernprairie':
            each(scatter(many(9), { minR: 0.2, minDist: 0.2 }), (x, z, i) => fern(g, x, z, y, 0.18 + rand() * 0.12, rand, i % 3 ? '#4f9a30' : '#62a83a'));
            if (variant > 0.6) each(scatter(many(1), { minR: 0.55 }), (x, z) => cycad(g, x, z, y, 0.45, rand));
            each(scatter(small(4), { minR: 0.15, minDist: 0.12 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#9cc84a'));
            break;
        case 'scrubland':
            each(scatter(many(5), { minR: 0.35, minDist: 0.28 }), (x, z) => bush(g, x, z, y, 0.22 + rand() * 0.12, rand, rand() > 0.5 ? '#5f9a34' : '#79a83c'));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.12, rand));
            break;
        case 'floodplain':
            each(scatter(small(10), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.15, rand, '#7cc040'));
            each(scatter(many(2), { minR: 0.45 }), (x, z) => horsetails(g, x, z, y, 0.28, rand));
            each(scatter(many(variant > 0.5 ? 2 : 1), { minR: 0.4 }), (x, z) => {
                disc(g, x, z, y + 0.004, 0.18, '#6a7a3a', 7, rand);
                waterDisc(w, x, z, y + 0.016, 0.12, '#4a8a86', '#9ccabe', rand, 7);
                pools.push({ x, z, r: 0.08, y: y + 0.016 });
            });
            break;
        case 'sauropodgrounds':
            each(scatter(small(4), { minR: 0.5, minDist: 0.2 }), (x, z) => tuft(g, x, z, y, 0.14, rand, '#b5b04e'));
            each(scatter(many(1), { minR: 0.6 }), (x, z) => (variant > 0.5 ? cycad(g, x, z, y, 0.4, rand) : bones(g, x, z, y, rand)));
            break;
        case 'galleryforest': {
            // tall broad-crowned trees leaning out toward the water, vines, ferns and horsetails below
            const wd = Array.isArray(D.waterDir) ? D.waterDir : null;
            const pts = scatter(many(6), { minR: 0.36, minDist: 0.34 });
            each(pts, (x, z, i) => {
                const facing = wd ? x * wd[0] + z * wd[1] : 0;
                const lean = wd && facing > -0.1 ? [wd[0] * (0.12 + rand() * 0.12), wd[1] * (0.12 + rand() * 0.12)] : [(rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08];
                if (i % 3 === 2) treeFern(g, x, z, y, 0.6 + rand() * 0.25, rand);
                else galleryTree(g, x, z, y, 1.05 + rand() * 0.4, rand, lean);
            });
            each(scatter(small(5), { minR: 0.2, minDist: 0.18 }), (x, z) => fern(g, x, z, y, 0.22, rand, '#2f7a2c'));
            const wetSide = wd ? scatter(small(3), { minR: 0.5, minDist: 0.2 }).filter(([x, z]) => x * wd[0] + z * wd[1] > 0.2) : [];
            each(wetSide, (x, z) => horsetails(g, x, z, y, 0.3, rand));
            if (variant > 0.55) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y, 0.6, 0.06, rand, '#4a3a22'));
            if (detail(D) && variant < 0.4) each(scatter(1, { minR: 0.3 }), (x, z) => mushrooms(g, x, z, y, rand));
            break;
        }
        case 'forest': {
            const pts = scatter(many(5), { minR: 0.42, minDist: 0.32 });
            each(pts, (x, z, i) => {
                if (i === 0 && variant > 0.4) araucaria(g, x, z, y, 1.05 + rand() * 0.3, rand);
                else conifer(g, x, z, y, 0.75 + rand() * 0.35, rand);
            });
            each(scatter(small(4), { minR: 0.25, minDist: 0.2 }), (x, z) => fern(g, x, z, y, 0.18, rand));
            if (variant > 0.75) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y, 0.5, 0.05, rand));
            if (detail(D) && variant < 0.25) each(scatter(1, { minR: 0.3 }), (x, z) => mushrooms(g, x, z, y, rand));
            break;
        }
        case 'denseforest': {
            // fern brake: a head-high sea of Weichselia fronds with the odd conifer standing out of it
            each(scatter(many(14), { minR: 0.18, minDist: 0.17 }), (x, z, i) => fern(g, x, z, y, 0.32 + rand() * 0.16, rand, i % 3 ? '#4f8a3e' : '#62984a'));
            each(scatter(many(2), { minR: 0.45, minDist: 0.4 }), (x, z, i) => (i === 0 && variant > 0.4 ? conifer(g, x, z, y, 0.9 + rand() * 0.3, rand, { dark: true }) : treeFern(g, x, z, y, 0.62, rand)));
            break;
        }
        case 'oldgrowth':
            each(scatter(many(5), { minR: 0.42, minDist: 0.4 }), (x, z) => araucaria(g, x, z, y, 1.4 + rand() * 0.5, rand));
            each(scatter(small(5), { minR: 0.2, minDist: 0.2 }), (x, z) => fern(g, x, z, y, 0.22, rand, '#3a7a2a'));
            each(scatter(many(1), { minR: 0.35 }), (x, z) => log(g, x, z, y, 0.7, 0.07, rand, '#5a3e24'));
            if (variant > 0.5) each(scatter(1, { minR: 0.3 }), (x, z) => mushrooms(g, x, z, y, rand));
            break;
        case 'openwoods': {
            const pts = scatter(many(3), { minR: 0.45, minDist: 0.45 });
            each(pts, (x, z, i) => (i === 0 ? ginkgo(g, x, z, y, 0.75 + rand() * 0.2, rand) : i === 1 ? cycad(g, x, z, y, 0.5, rand) : conifer(g, x, z, y, 0.6, rand)));
            each(scatter(small(5), { minR: 0.2, minDist: 0.18 }), (x, z) => fern(g, x, z, y, 0.16, rand, '#6aaa3a'));
            break;
        }
        case 'ginkgogrove':
            each(scatter(many(4), { minR: 0.44, minDist: 0.45 }), (x, z) => ginkgo(g, x, z, y, 0.8 + rand() * 0.3, rand));
            each(scatter(small(6), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#9ac84a'));
            if (variant > 0.7) each(scatter(1, { minR: 0.4 }), (x, z) => mushrooms(g, x, z, y, rand));
            break;
        case 'deadforest':
            each(scatter(many(4), { minR: 0.4, minDist: 0.3 }), (x, z) => deadTree(g, x, z, y, 0.6 + rand() * 0.3, rand));
            each(scatter(many(1), { minR: 0.4 }), (x, z) => log(g, x, z, y, 0.5, 0.045, rand, '#5a4838'));
            each(scatter(small(4), { minR: 0.1, keepCentre: false }), (x, z) => disc(g, x, z, y + 0.004, 0.12, '#5a5048', 6, rand));
            break;
        case 'deadfall':
            each(scatter(many(3), { minR: 0.3, minDist: 0.35 }), (x, z) => log(g, x, z, y, 0.6 + rand() * 0.3, 0.06 + rand() * 0.02, rand));
            each(scatter(many(2), { minR: 0.5, minDist: 0.4 }), (x, z) => conifer(g, x, z, y, 0.7, rand));
            each(scatter(small(4), { minR: 0.2 }), (x, z) => fern(g, x, z, y, 0.18, rand));
            each(scatter(small(2), { minR: 0.2 }), (x, z) => mushrooms(g, x, z, y, rand));
            break;
        case 'river':
        case 'stream':
            each(scatter(many(3), { minR: 0.35, minDist: 0.25 }), (x, z, i) => (i % 2 ? horsetails(g, x, z, y, 0.26, rand) : rock(g, x, z, y, 0.12, rand, '#8a857c', '#6a9a34')));
            each(scatter(small(4), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.13, rand, '#8ab840'));
            if (D.gallerySide) {
                // the gallery forest spills down to the water and leans over it
                const way = D.localWays.find((ww) => ww.kind === 'river');
                each(scatter(many(2), { minR: 0.45, minDist: 0.4 }), (x, z) => {
                    let lean = [0, 0];
                    if (way) {
                        const near = way.pts.reduce((a, p) => (Math.hypot(p.x - x, p.z - z) < Math.hypot(a.x - x, a.z - z) ? p : a));
                        const d = Math.hypot(near.x - x, near.z - z) || 1;
                        lean = [((near.x - x) / d) * 0.2, ((near.z - z) / d) * 0.2];
                    }
                    galleryTree(g, x, z, y, 0.95 + rand() * 0.3, rand, lean);
                });
            } else if (variant > 0.6) each(scatter(1, { minR: 0.5 }), (x, z) => (variant > 0.8 ? ginkgo(g, x, z, y, 0.7, rand) : conifer(g, x, z, y, 0.7, rand)));
            break;
        case 'riverbank': {
            // sandbar: pale sand ribbed by the current, a backwater pool, driftwood and a few horsetails
            const [px, pz] = [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4];
            disc(g, px, pz, y + 0.004, 0.3, '#c4a86a', 8, rand);
            waterDisc(w, px, pz, y + 0.016, 0.2, '#4a8a86', '#a0ccc0', rand);
            pools.push({ x: px, z: pz, r: 0.13, y: y + 0.016 });
            each(scatter(small(5), { minR: 0.35, minDist: 0.2 }), (x, z) => {
                const a = rand() * Math.PI;
                flatRibbon(g, [{ x: x - Math.cos(a) * 0.12, z: z - Math.sin(a) * 0.12, w: 0.025 }, { x: x + Math.cos(a) * 0.12, z: z + Math.sin(a) * 0.12, w: 0.025 }], y + 0.004, 1, '#d6be86', rand);
            });
            if (variant > 0.4) each(scatter(1, { minR: 0.45 }), (x, z) => log(g, x, z, y, 0.55, 0.05, rand, '#a8906a'));
            each(scatter(many(2), { minR: 0.55, minDist: 0.25 }), (x, z) => horsetails(g, x, z, y, 0.26, rand));
            break;
        }
        case 'marsh':
            each(scatter(3 + Math.floor(variant * 2), { minR: 0.1, minDist: 0.42, keepCentre: false }), (x, z) => {
                disc(g, x, z, y + 0.004, 0.32, '#4a5a2a', 8, rand);
                waterDisc(w, x, z, y + 0.018, 0.25, '#3e7a6e', '#7ab4a0', rand);
                pools.push({ x, z, r: 0.17, y: y + 0.018 });
            });
            each(scatter(many(6), { minR: 0.35, minDist: 0.22 }), (x, z) => horsetails(g, x, z, y, 0.34, rand));
            each(scatter(many(1), { minR: 0.55 }), (x, z) => cycad(g, x, z, y, 0.5, rand, '#4a8a30'));
            if (variant > 0.6) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y - 0.02, 0.5, 0.05, rand, '#4a3a24'));
            break;
        case 'waterhole': {
            disc(g, 0.05, 0.02, y + 0.004, 0.62, '#7a6438', 10, rand);
            waterDisc(w, 0.05, 0.02, y + 0.02, 0.48, '#3a7a78', '#8cc0b2', rand, 11);
            pools.push({ x: 0.05, z: 0.02, r: 0.34, y: y + 0.02 });
            each(scatter(many(3), { minR: 0.72, minDist: 0.3 }), (x, z, i) => (i % 2 ? cycad(g, x, z, y, 0.45, rand) : rock(g, x, z, y, 0.15, rand, '#8a857c', '#6a9a34')));
            each(scatter(small(3), { minR: 0.68 }), (x, z) => tuft(g, x, z, y, 0.14, rand));
            if (variant > 0.6) each(scatter(1, { minR: 0.7 }), (x, z) => bones(g, x, z, y, rand));
            break;
        }
        case 'boulderfield':
            each(scatter(many(6), { minR: 0.35, minDist: 0.28 }), (x, z) => rock(g, x, z, y, 0.22 + rand() * 0.25, rand, rand() > 0.5 ? '#8f9a92' : '#7c867f', '#a8b46a'));
            each(scatter(small(4), { minR: 0.2 }), (x, z) => pebbles(g, x, z, y, rand, 3, '#9aa49c'));
            break;
        case 'hills':
            each(scatter(2, { minR: 0.5, minDist: 0.6 }), (x, z) => blob(g, [x, y - 0.02, z], 0.45, '#7ab040', {
                detail: 1, scale: [1, 0.55, 1], jitter: 0.15, rand, flatBottom: 0, colorFn: (ly) => (ly > 0.6 ? '#95c552' : ly > 0.3 ? '#83b847' : '#6e9e3a')
            }));
            each(scatter(small(3), { minR: 0.3 }), (x, z) => tuft(g, x, z, y, 0.13, rand, '#9cc24a'));
            if (variant > 0.5) each(scatter(1, { minR: 0.4 }), (x, z) => conifer(g, x, z, y, 0.55, rand));
            break;
        case 'mountains': {
            const peak = (px, pz, h, rad) => {
                const secs = [];
                const steps = 6;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const c = t > 0.68 ? '#f2f4f7' : t > 0.52 ? '#c9ccd0' : t > 0.25 ? '#7a7670' : '#5f5b55';
                    secs.push({ p: [px + (rand() - 0.5) * 0.06 * t, y - 0.02 + h * t, pz + (rand() - 0.5) * 0.06 * t], r: rad * (1 - t * 0.92), color: c });
                }
                loft(g, secs, { sides: 7, jitter: 0.5, rand, tipEnd: h * 0.08, capStart: false, rot: rand() });
            };
            peak(0.05, 0.05, 1.7 + rand() * 0.6, 0.85);
            peak(-0.45 + rand() * 0.2, 0.3, 0.9 + rand() * 0.4, 0.42);
            if (variant > 0.5) peak(0.4, -0.35, 0.8 + rand() * 0.3, 0.35);
            each(scatter(many(2), { minR: 0.72 }), (x, z) => conifer(g, x, z, y, 0.35, rand, { dark: true }));
            break;
        }
        case 'volcanic': {
            const H = 1.3;
            loft(g, [
                { p: [0, y - 0.02, 0], r: 0.9, color: '#4a2a22' },
                { p: [0, y + H * 0.4, 0], r: 0.64, color: '#3d2420' },
                { p: [0, y + H * 0.8, 0], r: 0.44, color: '#33201d' },
                { p: [0, y + H, 0], r: 0.35, color: '#2a1a18' }
            ], { sides: 9, jitter: 0.35, rand, capStart: false });
            disc(l, 0, 0, y + H + 0.012, 0.31, '#ff7a1a', 8);
            disc(l, 0, 0, y + H + 0.018, 0.17, '#ffd25a', 6);
            for (let i = 0; i < 3; i++) {
                const a = rand() * Math.PI * 2;
                for (let k = 0; k < 4; k++) {
                    const t0 = k / 4;
                    const t1 = (k + 1) / 4;
                    const r0 = 0.35 + t0 * 0.52;
                    const r1 = 0.35 + t1 * 0.52;
                    const px = -Math.sin(a) * 0.05;
                    const pz = Math.cos(a) * 0.05;
                    l.quad([Math.cos(a) * r0 + px, y + H * (1 - t0) + 0.03, Math.sin(a) * r0 + pz], [Math.cos(a) * r1 + px, y + H * (1 - t1) + 0.03, Math.sin(a) * r1 + pz],
                        [Math.cos(a) * r1 - px, y + H * (1 - t1) + 0.03, Math.sin(a) * r1 - pz], [Math.cos(a) * r0 - px, y + H * (1 - t0) + 0.03, Math.sin(a) * r0 - pz],
                        k < 2 ? '#ff8a24' : '#e0501a', [Math.cos(a), 1.2, Math.sin(a)], true);
                }
            }
            smoke.push(new THREE.Vector3(0, y + H + 0.1, 0));
            break;
        }
        case 'lavafield':
            for (let i = 0; i < 5; i++) {
                let x = (rand() - 0.5) * 1.1;
                let z = (rand() - 0.5) * 1.1;
                for (let k = 0; k < 3; k++) {
                    const nx = Math.max(-0.7, Math.min(0.7, x + (rand() - 0.5) * 0.5));
                    const nz = Math.max(-0.7, Math.min(0.7, z + (rand() - 0.5) * 0.5));
                    flatRibbon(l, [{ x, z, w: 0.08 }, { x: nx, z: nz, w: 0.06 }], y + 0.006, 1, rand() > 0.5 ? '#ff6a1a' : '#ff9a2a', null);
                    x = nx;
                    z = nz;
                }
            }
            disc(l, 0.2, -0.2, y + 0.007, 0.15, '#ff7a1a', 7, rand);
            each(scatter(many(4), { minR: 0.3, minDist: 0.2 }), (x, z) => rock(g, x, z, y, 0.16, rand, '#2d2828'));
            if (rand() < 0.5) smoke.push(new THREE.Vector3(0.2, y + 0.05, -0.2));
            break;
        default:
            break;
    }
};

// helper so decorate() can ask whether this is a detailed build
const detail = (D) => D.small(1) > 0;

// Cell outline ring for hover / move markers (local coordinates)
export const buildOutline = (localPoly, width = 0.07) => {
    const mb = new MeshBuilder();
    const outer = insetPoly(localPoly, 0.05);
    const inner = insetPoly(localPoly, 0.05 + width);
    for (let i = 0; i < outer.length; i++) {
        const j = (i + 1) % outer.length;
        mb.quad([outer[i][0], 0, outer[i][1]], [outer[j][0], 0, outer[j][1]], [inner[j][0], 0, inner[j][1]], [inner[i][0], 0, inner[i][1]], '#ffffff', [0, 1, 0], true);
    }
    return mb.build();
};

// Random point inside a cell polygon (local coordinates), away from the centre
export const randomPointInCell = (localPoly, rand, minR = 0.3, margin = 0.15) => {
    const sign = Math.sign(polyArea(localPoly)) || 1;
    const maxR = Math.max(...localPoly.map(([x, z]) => Math.hypot(x, z)));
    for (let t = 0; t < 40; t++) {
        const a = rand() * Math.PI * 2;
        const r = minR + Math.sqrt(rand()) * (maxR - minR);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (insideDist(localPoly, sign, x, z) >= margin) return [x, z];
    }
    return [0, 0];
};

export { mix };
