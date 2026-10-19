// ==================== 3D VORONOI CELL TERRAIN ====================
// Builds one chunky low-poly "terrace" per Voronoi cell: a bevelled prism with
// strata walls, a top whose edge colours blend into the neighbouring biomes,
// and a per-cell randomised layout of plants, rocks and clutter. Rivers, dry
// channels and migration trails are drawn from the smooth spline pieces the
// world generator stored on each cell; waterfalls appear where water drops to
// a lower terrace.
import * as THREE from 'three';
import { MeshBuilder, loft, blob, cone, limb, slab, rngFor, vary, shade, mix, col } from './lowpoly.js';
import { levelHeight, SEA_WATER_Y, SEA_FLOOR_Y } from '../world/worldGen.js';
import { createNoise2D } from '../world/noise.js';

// world-space noise so ground patches flow across cell borders
const patchNoise = createNoise2D(911);
const detailNoise = createNoise2D(3571);
const bumpNoise = createNoise2D(1777);

const BASE_Y = -1.8;
const BEVEL = 0.06;
const BEVEL_H = 0.045;

// ---------- palettes ----------
const DIRT = '#7a5232';
const ROCK = '#6f6a64';
const SAND_SIDE = '#c9a560';
const STYLE = {
    plains: { top: ['#c9b866', '#bdae5c', '#d4c272'], lip: '#9a8a48' },
    fernprairie: { top: ['#9cb85a', '#8fac52', '#a8c266'], lip: '#728a40' },
    savanna: { top: ['#dcb868', '#d0ab5c', '#e6c47a'], lip: '#b08a48' },
    scrubland: { top: ['#a8ac5a', '#9ca052', '#b4b866'], lip: '#7e823e' },
    floodplain: { top: ['#a8b866', '#9cad5c', '#b4c272'], lip: '#7e8a48' },
    sauropodgrounds: { top: ['#c8a868', '#bc9c5e', '#d4b474'], lip: '#9a7a48' },
    forest: { top: ['#6f9450', '#668a4a', '#7a9e5a'], lip: '#52703c' },
    denseforest: { top: ['#5a8a46', '#527f40', '#64944e'], lip: '#42683a' },
    jungle: { top: ['#4f8a4a', '#477f42', '#5a9452'], lip: '#3a683a' },
    openwoods: { top: ['#a2a85c', '#969c54', '#aeb466'], lip: '#787e44' },
    galleryforest: { top: ['#6a945a', '#628a52', '#749e62'], lip: '#4e7044' },
    deadfall: { top: ['#8a8a54', '#80804c', '#94945e'], lip: '#686840' },
    hills: { top: ['#c88a58', '#bc7e4e', '#d49664'], lip: '#9a6040', side: '#a8603e' },
    rocky: { top: ['#bfa27a', '#b39670', '#c9ad86'], lip: '#94785a', side: '#9a7e5e' },
    boulderfield: { top: ['#b8a888', '#ac9c7e', '#c2b294'], lip: '#8e7e64', side: '#8a7a62' },
    mountains: { top: ['#b88a64', '#a87c5a', '#c4966e'], lip: '#8a6448', side: '#94684a' },
    desert: { top: ['#eac078', '#e0b46c', '#f0cc88'], lip: '#c8965a', side: '#c8925a' },
    badlands: { top: ['#d4845a', '#c87850', '#de9466'], lip: '#a85e3e', side: '#b8684a' },
    mesa: { top: ['#d89a62', '#cc8e58', '#e2a670'], lip: '#b06e44', side: '#b8703e' },
    quicksand: { top: ['#b8a070', '#ad9566', '#c4ac7c'], lip: '#8e7a50', side: SAND_SIDE },
    river: { top: ['#9cb066', '#92a65e', '#a6ba70'], lip: '#76884a' },
    stream: { top: ['#d8c48a', '#ceba80', '#e2ce96'], lip: '#b09a66', side: SAND_SIDE },
    dryriverbed: { top: ['#dcc494', '#d0b888', '#e6cea0'], lip: '#b49c70', side: '#a88e64' },
    riverbank: { top: ['#e6cf92', '#dcc486', '#eed89e'], lip: '#c0a66c', side: SAND_SIDE },
    marsh: { top: ['#6f8a4a', '#668044', '#789452'], lip: '#52683a' },
    mangrove: { top: ['#6a7a52', '#62724c', '#74845a'], lip: '#4e5c3e' },
    waterhole: { top: ['#b0a870', '#a69e66', '#bab27a'], lip: '#8a8254' },
    lake: { top: ['#c8b07a', '#bca470', '#d4bc86'], lip: '#a08a5e', side: SAND_SIDE },
    sea: { top: ['#d8c48a', '#ccb87e', '#e2cf96'], lip: '#b8a46e', side: SAND_SIDE },
    beach: { top: ['#a89a78', '#9e9070', '#b2a482'], lip: '#857a5e', side: '#8a7c5e' },
    nest: { top: ['#e2c68a', '#d8bc80', '#ead096'], lip: '#b89c64', side: SAND_SIDE }
};
const styleOf = (t) => STYLE[t] || STYLE.plains;

// Patch colours mixed into each biome's ground: [dark/worn patch, lush/light patch]
const PATCHES = {
    plains: ['#a89a50', '#d8cc80'], fernprairie: ['#7e9a46', '#b8cc76'], savanna: ['#c09a54', '#eed48a'],
    scrubland: ['#8a8e48', '#c0c47a'], floodplain: ['#8a9a50', '#c4d080'], sauropodgrounds: ['#a88a54', '#dcc088'],
    forest: ['#5a6e3a', '#86aa62'], denseforest: ['#466e38', '#74a05a'], jungle: ['#3e6a38', '#68a05a'],
    openwoods: ['#868a4a', '#bcc272'], galleryforest: ['#506e40', '#80a86a'], deadfall: ['#6e6e42', '#a2a26a'],
    hills: ['#a86a44', '#e0a474'], rocky: ['#9a8262', '#d8bc94'], boulderfield: ['#988a70', '#d0c2a4'],
    desert: ['#d0a462', '#f8dca0'], badlands: ['#b4643e', '#e8a478'], mesa: ['#b8784a', '#eab284'],
    marsh: ['#52683a', '#86a05a'], mangrove: ['#4e5c3e', '#7e8e62'], riverbank: ['#c4aa70', '#f6e4b0'], river: ['#7e9050', '#b4c47c'],
    stream: ['#bca46c', '#eedcaa'], waterhole: ['#8e8656', '#c4bc86'], dryriverbed: ['#bca476', '#eedcb0'],
    beach: ['#8a7e60', '#c4b690'], nest: ['#c8aa70', '#f4e2b0']
};
// How bumpy the ground is (world units)
const RELIEF = {
    hills: 0.045, rocky: 0.035, boulderfield: 0.035, desert: 0.035, badlands: 0.03, mesa: 0.02, mountains: 0.03,
    marsh: 0.006, floodplain: 0.008, riverbank: 0.006, waterhole: 0, lake: 0, sea: 0, nest: 0, quicksand: 0, beach: 0.012,
    river: 0.008, stream: 0.008, volcanic: 0.02, lavafield: 0.012
};

// ---------- heights ----------
export const cellSurfaceY = (cell) => {
    if (cell.terrain === 'sea') return SEA_FLOOR_Y;
    const y = levelHeight(cell.level);
    if (cell.terrain === 'lake') return y - 0.3;
    if (cell.terrain === 'mesa') return y + 0.6;
    return y;
};
export const cellWaterY = (cell) => {
    if (cell.terrain === 'sea') return SEA_WATER_Y;
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
    const greens = opts.greens || (dark ? ['#2c6230', '#326c36', '#38763c', '#3f8042'] : ['#2f6b2c', '#367a33', '#3f8838', '#46913d']);
    const top = trunk(mb, x, z, y, h * 0.45, 0.028 * h * 2, '#6b4426', rand);
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
                blob(mb, [ex, wy + len * 0.2, ez], len * 0.32, vary('#2f6a35', rand, 0.08), { scale: [1.2, 0.55, 1.2], jitter: 0.35, rand });
            }
        }
        blob(mb, [top[0], y + h * 0.96, top[2]], h * 0.2, '#357a3b', { scale: [1.5, 0.4, 1.5], jitter: 0.3, rand });
    });
};

const ginkgo = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.55, 0.045 * h, '#6e4a2c', rand, 0.1);
    for (let i = 0; i < 2; i++) {
        const a = rand() * Math.PI * 2;
        limb(mb, [top[0], top[1] - h * 0.08, top[2]], [top[0] + Math.cos(a) * h * 0.18, top[1] + h * 0.12, top[2] + Math.sin(a) * h * 0.18], 0.02, 0.01, '#6e4a2c', { sides: 4 });
    }
    withSway(mb, y, h, () => {
        const greens = ['#7dbb44', '#6fae3a', '#8ac44c', '#9acd52'];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rand();
            const r = i === 0 ? 0 : h * 0.16;
            blob(mb, [top[0] + Math.cos(a) * r, top[1] + h * (0.12 + rand() * 0.14), top[2] + Math.sin(a) * r], h * (0.17 + rand() * 0.06), greens[i % 4], {
                jitter: 0.45, rand, colorFn: (ly) => (ly > 0.35 ? shade(greens[i % 4], 1.12) : greens[i % 4])
            });
        }
    });
};

const umbrellaTree = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.72, 0.04 * h, '#6a4528', rand, 0.12);
    withSway(mb, y, h, () => {
        blob(mb, [top[0], top[1] + h * 0.05, top[2]], h * 0.42, '#5d8e2e', { scale: [1, 0.24, 1], jitter: 0.3, rand });
        blob(mb, [top[0], top[1] + h * 0.15, top[2]], h * 0.3, '#6fa036', { scale: [1, 0.26, 1], jitter: 0.3, rand });
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

const fern = (mb, x, z, y, s, rand, color = '#5aa23a') => {
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

const treeFern = (mb, x, z, y, h, rand) => {
    const top = trunk(mb, x, z, y, h * 0.7, 0.03, '#4a3624', rand, 0.1);
    withSway(mb, y, h, () => fern(mb, top[0], top[2], top[1], h * 0.5, rand, '#3e8a2c'));
};

const termiteMound = (mb, x, z, y, h, rand) => {
    const secs = [];
    for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        secs.push({ p: [x + (rand() - 0.5) * 0.02, y - 0.01 + h * t, z + (rand() - 0.5) * 0.02], r: h * 0.32 * (1 - t * 0.75), color: t > 0.6 ? '#c46a3a' : '#a85630' });
    }
    loft(mb, secs, { sides: 7, jitter: 0.35, rand, capStart: false, tipEnd: h * 0.12 });
    for (let i = 0; i < 2; i++) {
        const a = rand() * Math.PI * 2;
        const sx = x + Math.cos(a) * h * 0.25;
        const sz = z + Math.sin(a) * h * 0.25;
        loft(mb, [{ p: [sx, y, sz], r: h * 0.12 }, { p: [sx, y + h * 0.5, sz], r: h * 0.05 }], { sides: 6, color: '#b25e34', capStart: false, tipEnd: h * 0.06, rand, jitter: 0.3 });
    }
};

// Broad-crowned riverside tree: leaning trunk, buttress roots, layered canopy and hanging vines
// Mangrove: a dark rounded crown on a short trunk, standing on arching stilt roots
const mangroveTree = (mb, x, z, y, h, rand) => {
    const base = y + h * 0.32;
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand() * 0.5;
        const r = h * (0.24 + rand() * 0.1);
        const mid = [x + Math.cos(a) * r * 0.75, base + h * 0.04, z + Math.sin(a) * r * 0.75];
        limb(mb, [x + Math.cos(a) * 0.02, base, z + Math.sin(a) * 0.02], mid, 0.016 * h, 0.012 * h, '#6a5238', { sides: 4 });
        limb(mb, mid, [x + Math.cos(a) * r, y - 0.03, z + Math.sin(a) * r], 0.012 * h, 0.009 * h, '#5e4832', { sides: 4 });
    }
    limb(mb, [x, base - 0.02, z], [x + (rand() - 0.5) * 0.05, y + h * 0.7, z + (rand() - 0.5) * 0.05], 0.03 * h, 0.018 * h, '#6a5238', { sides: 5 });
    withSway(mb, y, h, () => {
        const greens = ['#3e6a44', '#46744a', '#507e52', '#5a8a58'];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rand();
            const r = i === 0 ? 0 : h * (0.14 + rand() * 0.08);
            const c = greens[Math.floor(rand() * greens.length)];
            blob(mb, [x + Math.cos(a) * r, y + h * (0.78 + rand() * 0.1), z + Math.sin(a) * r], h * (0.17 + rand() * 0.05), c, {
                scale: [1.3, 0.62, 1.3], jitter: 0.35, rand, colorFn: (ly) => (ly > 0.3 ? shade(c, 1.2) : shade(c, 0.8))
            });
        }
    });
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

const FOREST_FLOOR = new Set(['forest', 'denseforest', 'oldgrowth', 'jungle', 'youngforest', 'galleryforest', 'openwoods', 'ginkgogrove', 'forestedge', 'deadfall']);
const OPEN_GROUND = new Set(['plains', 'fernprairie', 'katydidmeadow', 'fernsavanna', 'savanna', 'steppe', 'scrubland', 'floodplain', 'hills', 'termitemounds']);
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
    if (['desert', 'badlands', 'dryriverbed', 'quicksand'].includes(terrain) || (terrain === 'floodplain' && rand() < 0.5)) {
        const c = terrain === 'badlands' ? '#9a4a22' : terrain === 'floodplain' ? '#5a6a2a' : '#a88a52';
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
        if (!n || n.terrain === 'sea' || n.terrain === 'mountains' || Math.abs(n.level - cell.level) > 1) return null;
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
    const isWaterCell = terrain === 'sea' || terrain === 'lake';
    if (!isWaterCell) {
        for (const ww of localWays) {
            if (ww.kind === 'river') {
                // same water as the lakes: deep centre, lighter shallows
                const deep = '#2a8cc4';
                const light = '#5ccbe6';
                const wide = terrain === 'river' ? 1.3 : 1.1;
                flatRibbon(g, ww.pts, y + 0.006, 1.75 * wide, '#6e5a30', rand); // muddy banks
                flatRibbon(g, ww.pts, y + 0.009, 1.3 * wide, '#8a7a4a', null);
                waterRibbon(w, ww.pts, y + 0.022, wide, deep, light, 1);
                const first = ww.pts[0];
                if (ww.start) {
                    // spring: a small pool among mossy stones
                    waterDisc(w, first.x, first.z, y + 0.024, 0.16, '#3a9ad0', '#7ad0ee', rand);
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
                        w.triV(a, b, c, ['#8fd8f2', '#8fd8f2', '#ffffff'], [[0, 0.3, 2], [0, 0.3, 2], [0, 1, 2]], [P.dx, 0.3, P.dz], true);
                        w.triV(a, c, d, ['#8fd8f2', '#ffffff', '#ffffff'], [[0, 0.3, 2], [0, 1, 2], [0, 1, 2]], [P.dx, 0.3, P.dz], true);
                        // rocks framing the fall
                        rock(g, a[0] + P.nx * 0.08, a[2] + P.nz * 0.08, y - 0.05, 0.14, rand, '#6f6a62', '#4f7a2a');
                        rock(g, b[0] - P.nx * 0.08, b[2] - P.nz * 0.08, y - 0.05, 0.12, rand, '#6f6a62', '#4f7a2a');
                    }
                }
                // churning foam where a waterfall lands in this cell
                if (world && ww.enterFrom !== undefined && ww.enterFrom >= 0) {
                    const prev = world.cells[ww.enterFrom];
                    if (prev && cellSurfaceY(prev) > y + 0.05 && !['sea', 'lake'].includes(prev.terrain)) {
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
        const deepC = terrain === 'sea' ? '#1e6aa8' : '#2a8cc4';
        const shoreC = terrain === 'sea' ? '#4cc0d8' : '#5ccbe6';
        const wpoly = poly.map(([x, z]) => [x * 1.004, z * 1.004]);
        const shoreEdge = wpoly.map((_, i) => {
            const n = neighbour(i);
            return n ? (n.terrain !== 'sea' && n.terrain !== 'lake' ? 1 : 0) : 0;
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
                w.triV([wpoly[i][0], wy, wpoly[i][1]], [wpoly[j][0], wy, wpoly[j][1]], [wpoly[j][0], lowY, wpoly[j][1]], [deepC, deepC, '#16507e'], null, [wpoly[i][0] + wpoly[j][0], 0, wpoly[i][1] + wpoly[j][1]], true);
                w.triV([wpoly[i][0], wy, wpoly[i][1]], [wpoly[j][0], lowY, wpoly[j][1]], [wpoly[i][0], lowY, wpoly[i][1]], [deepC, '#16507e', '#16507e'], null, [wpoly[i][0] + wpoly[j][0], 0, wpoly[i][1] + wpoly[j][1]], true);
            }
        }
        pools.push({ x: 0, z: 0, r: Math.max(0.2, cell.inradius ? cell.inradius * 0.75 : 0.6), y: wy });
        // underwater detail
        for (const [x, z] of scatter(many(3), { minR: 0.1, margin: 0.15, minDist: 0.3, keepCentre: false })) {
            if (terrain === 'sea') rock(g, x, z, y, 0.2 + rand() * 0.15, rand, '#8a8070', '#3a7a5a');
            else rock(g, x, z, y, 0.16, rand, '#7a7468', '#4a7a3a');
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
    const gallerySide = world && (cell.neighborIds || []).some((nid) => ['galleryforest', 'forest', 'jungle', 'denseforest'].includes(world.cells[nid]?.terrain));
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
        case 'plains':
            each(scatter(small(9), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.15, rand, '#b4c44a'));
            each(scatter(many(variant < 0.4 ? 2 : 1), { minR: 0.5 }), (x, z) => (variant < 0.4 ? fern(g, x, z, y, 0.2, rand) : rock(g, x, z, y, 0.13, rand, '#9a948a', '#8aa040')));
            if (variant > 0.85) each(scatter(1, { minR: 0.55 }), (x, z) => bones(g, x, z, y, rand));
            break;
        case 'fernprairie':
            each(scatter(many(9), { minR: 0.2, minDist: 0.2 }), (x, z, i) => fern(g, x, z, y, 0.18 + rand() * 0.12, rand, i % 3 ? '#4f9a30' : '#62a83a'));
            if (variant > 0.6) each(scatter(many(1), { minR: 0.55 }), (x, z) => cycad(g, x, z, y, 0.45, rand));
            each(scatter(small(4), { minR: 0.15, minDist: 0.12 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#9cc84a'));
            break;
        case 'katydidmeadow':
            each(scatter(many(variant < 0.5 ? 4 : 3), { minR: 0.48, minDist: 0.4 }), (x, z) => cycad(g, x, z, y, 0.45 + rand() * 0.25, rand, '#3f8a2c'));
            each(scatter(small(8), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.16, rand, '#6aaa3a'));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => fern(g, x, z, y, 0.16, rand, '#4a9030'));
            break;
        case 'fernsavanna':
            each(scatter(many(8), { minR: 0.2, minDist: 0.2 }), (x, z) => fern(g, x, z, y, 0.17 + rand() * 0.08, rand, rand() > 0.5 ? '#7aa83a' : '#6a9a30'));
            if (variant > 0.5) each(scatter(1, { minR: 0.55 }), (x, z) => umbrellaTree(g, x, z, y, 0.8, rand));
            each(scatter(small(3), { minR: 0.3 }), (x, z) => rock(g, x, z, y, 0.08, rand, '#c09a68'));
            break;
        case 'savanna':
            each(scatter(many(1 + Math.floor(variant * 2.5)), { minR: 0.5, minDist: 0.6 }), (x, z) => umbrellaTree(g, x, z, y, 0.8 + rand() * 0.25, rand));
            each(scatter(small(8), { minR: 0.2, minDist: 0.15 }), (x, z) => tuft(g, x, z, y, 0.16, rand, '#e0c050'));
            break;
        case 'steppe':
            each(scatter(small(12), { minR: 0.1, minDist: 0.12, keepCentre: false }), (x, z) => tuft(g, x, z, y, 0.1, rand, rand() > 0.5 ? '#b8cc52' : '#a8bc48'));
            each(scatter(many(2), { minR: 0.4 }), (x, z) => bush(g, x, z, y, 0.15, rand, '#8aa040'));
            if (variant > 0.7) each(scatter(1, { minR: 0.5 }), (x, z) => rock(g, x, z, y, 0.15, rand, '#9a948a'));
            break;
        case 'scrubland':
            each(scatter(many(5), { minR: 0.35, minDist: 0.28 }), (x, z) => bush(g, x, z, y, 0.22 + rand() * 0.12, rand, rand() > 0.5 ? '#5f9a34' : '#79a83c'));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.12, rand));
            break;
        case 'termitemounds':
            each(scatter(many(2 + Math.floor(variant * 2)), { minR: 0.42, minDist: 0.45 }), (x, z) => termiteMound(g, x, z, y, 0.35 + rand() * 0.3, rand));
            each(scatter(small(4), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#c0a048'));
            each(scatter(many(1), { minR: 0.5 }), (x, z) => bush(g, x, z, y, 0.18, rand, '#8a9a3a'));
            break;
        case 'floodplain':
            each(scatter(small(10), { minR: 0.15, minDist: 0.14 }), (x, z) => tuft(g, x, z, y, 0.15, rand, '#7cc040'));
            each(scatter(many(2), { minR: 0.45 }), (x, z) => horsetails(g, x, z, y, 0.28, rand));
            each(scatter(many(variant > 0.5 ? 2 : 1), { minR: 0.4 }), (x, z) => {
                disc(g, x, z, y + 0.004, 0.18, '#6a7a3a', 7, rand);
                waterDisc(w, x, z, y + 0.016, 0.12, '#4aa8c8', '#8ad8ec', rand, 7);
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
        case 'youngforest':
            each(scatter(many(9), { minR: 0.32, minDist: 0.22 }), (x, z) => conifer(g, x, z, y, 0.35 + rand() * 0.25, rand, { tiers: 3, greens: ['#4a8a34', '#56993a', '#62a842', '#6eb44a'] }));
            each(scatter(small(4), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.14, rand, '#7ab040'));
            break;
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
        case 'jungle':
            each(scatter(many(8), { minR: 0.36, minDist: 0.26 }), (x, z, i) => (i % 3 === 0 ? cycad(g, x, z, y, 0.6, rand, '#2f8a2a') : treeFern(g, x, z, y, 0.7 + rand() * 0.4, rand)));
            each(scatter(small(6), { minR: 0.15, minDist: 0.16 }), (x, z) => fern(g, x, z, y, 0.24, rand, '#2f8a2c'));
            each(scatter(small(2), { minR: 0.3 }), (x, z) => horsetails(g, x, z, y, 0.35, rand));
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
        case 'forestedge': {
            // trees bunched toward one side of the cell, ferns on the open side
            const side = rand() * Math.PI * 2;
            const pts = scatter(many(8), { minR: 0.35, minDist: 0.26 });
            each(pts, (x, z) => {
                const facing = Math.cos(Math.atan2(z, x) - side);
                if (facing > 0.1) conifer(g, x, z, y, 0.6 + rand() * 0.35, rand);
                else fern(g, x, z, y, 0.2, rand, '#5a9a34');
            });
            each(scatter(small(4), { minR: 0.2 }), (x, z) => tuft(g, x, z, y, 0.13, rand));
            break;
        }
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
        case 'dryriverbed':
            each(scatter(many(3), { minR: 0.3, minDist: 0.2 }), (x, z) => rock(g, x, z, y, 0.09, rand, '#a59c8c'));
            each(scatter(many(1), { minR: 0.55 }), (x, z) => deadTree(g, x, z, y, 0.42, rand));
            break;
        case 'riverbank': {
            // sandbar: pale sand ribbed by the current, a backwater pool, driftwood and a few horsetails
            const [px, pz] = [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4];
            disc(g, px, pz, y + 0.004, 0.3, '#c4a86a', 8, rand);
            waterDisc(w, px, pz, y + 0.016, 0.2, '#4aa0a8', '#9ad4cc', rand);
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
                waterDisc(w, x, z, y + 0.018, 0.25, '#3a8a90', '#6ac0b8', rand);
                pools.push({ x, z, r: 0.17, y: y + 0.018 });
            });
            each(scatter(many(6), { minR: 0.35, minDist: 0.22 }), (x, z) => horsetails(g, x, z, y, 0.34, rand));
            each(scatter(many(1), { minR: 0.55 }), (x, z) => cycad(g, x, z, y, 0.5, rand, '#4a8a30'));
            if (variant > 0.6) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y - 0.02, 0.5, 0.05, rand, '#4a3a24'));
            break;
        case 'waterhole': {
            disc(g, 0.05, 0.02, y + 0.004, 0.62, '#7a6438', 10, rand);
            waterDisc(w, 0.05, 0.02, y + 0.02, 0.48, '#2f90c0', '#7ad0e8', rand, 11);
            pools.push({ x: 0.05, z: 0.02, r: 0.34, y: y + 0.02 });
            each(scatter(many(3), { minR: 0.72, minDist: 0.3 }), (x, z, i) => (i % 2 ? cycad(g, x, z, y, 0.45, rand) : rock(g, x, z, y, 0.15, rand, '#8a857c', '#6a9a34')));
            each(scatter(small(3), { minR: 0.68 }), (x, z) => tuft(g, x, z, y, 0.14, rand));
            if (variant > 0.6) each(scatter(1, { minR: 0.7 }), (x, z) => bones(g, x, z, y, rand));
            break;
        }
        case 'beach':
            // tidal flats: shining mud, pools the tide left behind, worm casts and shells
            each(scatter(4 + Math.floor(variant * 3), { minR: 0.1, minDist: 0.3, keepCentre: false }), (x, z) => {
                const r = 0.12 + rand() * 0.14;
                disc(g, x, z, y + 0.003, r * 1.3, '#8e8264', 7, rand);
                waterDisc(w, x, z, y + 0.012, r, '#5aa8a8', '#a8dcd0', rand, 8);
                pools.push({ x, z, r: r * 0.7, y: y + 0.012 });
            });
            each(scatter(small(6), { minR: 0.2 }), (x, z) => disc(g, x, z, y + 0.004, 0.035, '#f2e6cc', 5, rand)); // shells
            if (variant < 0.3) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y, 0.5, 0.045, rand, '#b8a080'));
            break;
        case 'mangrove':
            each(scatter(4 + Math.floor(variant * 2), { minR: 0.05, minDist: 0.4, keepCentre: false }), (x, z) => {
                disc(g, x, z, y + 0.003, 0.34, '#4e5a3a', 8, rand);
                waterDisc(w, x, z, y + 0.016, 0.28, '#3e8a86', '#7ec4b4', rand, 9);
                pools.push({ x, z, r: 0.2, y: y + 0.016 });
            });
            each(scatter(many(4), { minR: 0.3, minDist: 0.4 }), (x, z) => mangroveTree(g, x, z, y, 0.65 + rand() * 0.35, rand));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => horsetails(g, x, z, y, 0.24, rand));
            break;
        case 'nest': {
            // a spinosaur nest: a scraped hollow in warm sand above the flood line, eggs half buried
            disc(g, 0, 0, y + 0.004, 0.55, '#d8b878', 10, rand);
            for (let i = 0; i < 11; i++) {
                const a = (i / 11) * Math.PI * 2;
                blob(g, [Math.cos(a) * 0.42, y + 0.04, Math.sin(a) * 0.42], 0.12, i % 2 ? '#e6c88a' : '#cfae6e', { scale: [1.3, 0.55, 1], jitter: 0.4, rand, flatBottom: -0.3 });
            }
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + 0.4;
                const r = i === 4 ? 0 : 0.15;
                blob(g, [Math.cos(a) * r, y + 0.06, Math.sin(a) * r], 0.065, '#f4ecd8', {
                    detail: 1, jitter: 0.04, scale: [0.85, 1.15, 0.85], rand, colorFn: (ly, rr) => (rr() > 0.82 ? '#c9b48e' : '#f4ecd8'), faceVary: 0.02
                });
            }
            each(scatter(many(3), { minR: 0.65 }), (x, z) => horsetails(g, x, z, y, 0.26, rand));
            each(scatter(small(3), { minR: 0.6 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#a8b05a'));
            break;
        }
        case 'quicksand': {
            const rings = ['#c09a4a', '#d8b866', '#b88f42', '#cfae5c', '#a8823a'];
            rings.forEach((c, i) => disc(g, 0.02, -0.02, y + 0.003 + i * 0.002, 0.62 - i * 0.12, c, 11, null));
            each(scatter(2, { minR: 0.72 }), (x, z) => deadTree(g, x, z, y, 0.35, rand));
            if (variant > 0.5) each(scatter(1, { minR: 0.5 }), (x, z) => bones(g, x, z, y, rand));
            break;
        }
        case 'desert':
            for (let i = 0; i < 2; i++) {
                blob(g, [(rand() - 0.5) * 0.8, y, (rand() - 0.5) * 0.8], 0.42, '#e6c160', {
                    scale: [1.5, 0.32, 0.6], jitter: 0.2, rand, flatBottom: 0, rotY: rand() * Math.PI, colorFn: (ly) => (ly > 0.5 ? '#f3d888' : '#e2bb5a')
                });
            }
            each(scatter(many(3), { minR: 0.3 }), (x, z) => rock(g, x, z, y, 0.09, rand, '#c8a070'));
            if (variant > 0.7) each(scatter(1, { minR: 0.4 }), (x, z) => bones(g, x, z, y, rand));
            break;
        case 'badlands':
            each(scatter(many(3), { minR: 0.5, minDist: 0.35 }), (x, z) => {
                const h = 0.25 + rand() * 0.4;
                const r0 = 0.13 + rand() * 0.05;
                const secs = [];
                const bands = ['#b8582a', '#d98a4a', '#a14a24', '#e3a060'];
                for (let k = 0; k <= 4; k++) secs.push({ p: [x, y - 0.01 + (h * k) / 4, z], r: r0 * (1 - k * 0.12), color: bands[k % 4] });
                loft(g, secs, { sides: 6, jitter: 0.3, rand, capStart: false, rot: rand() });
                blob(g, [x, y + h + 0.03, z], r0 * 0.9, '#7a3a1e', { scale: [1.2, 0.45, 1.2], rand, jitter: 0.2 });
            });
            break;
        case 'mesa':
            each(scatter(many(2), { minR: 0.35 }), (x, z) => bush(g, x, z, y, 0.15, rand, '#8a9a3a'));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => rock(g, x, z, y, 0.08, rand, '#b07040'));
            break;
        case 'rocky':
            each(scatter(many(5), { minR: 0.3, minDist: 0.22 }), (x, z) => rock(g, x, z, y, 0.16 + rand() * 0.18, rand, rand() > 0.5 ? '#8a847a' : '#7a756d'));
            each(scatter(small(3), { minR: 0.3 }), (x, z) => tuft(g, x, z, y, 0.12, rand, '#8aa040'));
            break;
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
// the plant and clutter builders, for the real-scale roaming world (src/roam)
export const FLORA = { trunk, conifer, araucaria, ginkgo, umbrellaTree, cycad, fern, tuft, horsetails, bush, rock, log, deadTree, treeFern, mangroveTree, galleryTree, bones };
export { STYLE, PATCHES };
