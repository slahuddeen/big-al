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

const BASE_Y = -1.8;
const BEVEL = 0.06;
const BEVEL_H = 0.045;

// ---------- palettes ----------
const DIRT = '#7a5232';
const ROCK = '#6f6a64';
const SAND_SIDE = '#c9a560';
const STYLE = {
    plains: { top: ['#b9c247', '#a8b83d', '#c8c552'], lip: '#8aa035' },
    fernprairie: { top: ['#98c83e', '#8abd38', '#a6d14a'], lip: '#6f9a2c' },
    katydidmeadow: { top: ['#5f9e3a', '#56933a', '#6aa944'], lip: '#467a2c' },
    fernsavanna: { top: ['#d9a83e', '#cf9c36', '#e2b44c'], lip: '#a8782a' },
    savanna: { top: ['#d9b54a', '#cfa83e', '#e2c35a'], lip: '#b08c34' },
    steppe: { top: ['#b8cc52', '#acc24a', '#c4d660'], lip: '#8aa03a' },
    scrubland: { top: ['#9cbd45', '#8db03c', '#a9c752'], lip: '#749a30' },
    termitemounds: { top: ['#c98a4e', '#be7e44', '#d4965a'], lip: '#9a5a30' },
    floodplain: { top: ['#8fd04a', '#84c444', '#9ada56'], lip: '#6aa034' },
    sauropodgrounds: { top: ['#b9b45a', '#c4b866', '#aaa452'], lip: '#8e8a44' },
    forest: { top: ['#4f8a2c', '#457d27', '#5a9632'], lip: '#3d6c22' },
    youngforest: { top: ['#5c9a34', '#53902f', '#68a63c'], lip: '#447a26' },
    denseforest: { top: ['#3b6a24', '#335f1f', '#41742a'], lip: '#2c531b' },
    oldgrowth: { top: ['#3e6a2c', '#365f27', '#477634'], lip: '#2c4f20' },
    jungle: { top: ['#2f7a2c', '#287026', '#368434'], lip: '#215a1e' },
    openwoods: { top: ['#7aac3a', '#6e9f33', '#86b743'], lip: '#5d8a2c' },
    ginkgogrove: { top: ['#6aa83a', '#5f9c34', '#76b444'], lip: '#4f8a2a' },
    forestedge: { top: ['#7a9e34', '#6f9330', '#86aa3c'], lip: '#5a7e28' },
    galleryforest: { top: ['#4c8a34', '#43802e', '#58963c'], lip: '#3c6c26' },
    deadforest: { top: ['#857360', '#7a6857', '#907d68'], lip: '#6b5a4a' },
    deadfall: { top: ['#6f7a34', '#66702e', '#7a863c'], lip: '#535c26' },
    hills: { top: ['#86bb45', '#7aae3d', '#92c64f'], lip: '#6a9a34' },
    rocky: { top: ['#8f8577', '#83796c', '#9a9083'], lip: '#6f675d', side: ROCK },
    boulderfield: { top: ['#8a9488', '#7f897d', '#96a093'], lip: '#6a7368', side: ROCK },
    mountains: { top: ['#6f8a4a', '#7b7a72', '#687f45'], lip: '#5a6b3c', side: ROCK },
    volcanic: { top: ['#5a3328', '#4e2c23', '#63392c'], lip: '#3e231c', side: '#3a2a26' },
    lavafield: { top: ['#3b3330', '#352d2a', '#433a36'], lip: '#2a2422', side: '#2e2624' },
    desert: { top: ['#ecc967', '#e2bd5a', '#f2d47a'], lip: '#cfa54a', side: SAND_SIDE },
    badlands: { top: ['#cf7a3c', '#c26d33', '#d98848'], lip: '#a85a2a', side: '#9a4f28' },
    mesa: { top: ['#d48a48', '#c97d3d', '#de9856'], lip: '#b5693a', side: '#b25a30' },
    quicksand: { top: ['#d8b660', '#cfac55', '#e0c06c'], lip: '#b8934a', side: SAND_SIDE },
    river: { top: ['#76aa3c', '#6ca035', '#82b545'], lip: '#5b8c2e' },
    stream: { top: ['#80b440', '#76a83a', '#8cbe4a'], lip: '#5f922e' },
    dryriverbed: { top: ['#cdb27e', '#c2a672', '#d8bd8a'], lip: '#a88e5e', side: '#9c7e55' },
    riverbank: { top: ['#8f8a4a', '#857f42', '#9b9653'], lip: '#6f6a38' },
    marsh: { top: ['#577a34', '#4d6f2e', '#61853b'], lip: '#405f27' },
    waterhole: { top: ['#7fb043', '#74a43c', '#8bbb4d'], lip: '#618f33' },
    lake: { top: ['#b8a46e', '#ab9862', '#c4b07a'], lip: '#988456', side: SAND_SIDE },
    sea: { top: ['#d8c48a', '#ccb87e', '#e2cf96'], lip: '#b8a46e', side: SAND_SIDE },
    beach: { top: ['#f0d888', '#e8cf7c', '#f5e09a'], lip: '#d4b766', side: SAND_SIDE },
    nest: { top: ['#b8693a', '#ad5f33', '#c47644'], lip: '#8f4c2a' }
};
const styleOf = (t) => STYLE[t] || STYLE.plains;

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
        const wd = (P, e) => [P.s + sOffset, e, kind];
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

    // ---------- top surface with colours blended toward neighbouring biomes ----------
    const neighbourColour = (i) => {
        const n = neighbour(i);
        if (!n || n.terrain === 'sea' || n.terrain === 'mountains' || Math.abs(n.level - cell.level) > 1) return null;
        return col(styleOf(n.terrain).top[0]);
    };
    const base = topCols[0];
    const ring = [];
    for (let i = 0; i < inner.length; i++) {
        const j = (i + 1) % inner.length;
        const prevN = neighbourColour((i - 1 + inner.length) % inner.length);
        const thisN = neighbourColour(i);
        let cc = vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.03);
        const blends = [prevN, thisN].filter(Boolean);
        if (blends.length) cc = cc.lerp(blends.reduce((a, b) => a.clone().lerp(b, 0.5)), 0.3);
        ring.push({ p: inner[i], c: cc });
        let mc = vary(base, rand, 0.03);
        if (thisN) mc = mc.lerp(thisN, 0.38);
        ring.push({ p: [(inner[i][0] + inner[j][0]) / 2, (inner[i][1] + inner[j][1]) / 2], c: mc });
    }
    const mid = ring.map((r) => ({ p: [r.p[0] * 0.55, r.p[1] * 0.55], c: vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.04) }));
    const centreC = vary(topCols[Math.floor(rand() * topCols.length)], rand, 0.03);
    for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        g.triV([0, y, 0], [mid[i].p[0], y, mid[i].p[1]], [mid[j].p[0], y, mid[j].p[1]], [centreC, mid[i].c, mid[j].c], null, [0, 1, 0], true);
        g.triV([mid[i].p[0], y, mid[i].p[1]], [ring[i].p[0], y, ring[i].p[1]], [ring[j].p[0], y, ring[j].p[1]], [mid[i].c, ring[i].c, ring[j].c], null, [0, 1, 0], true);
        g.triV([mid[i].p[0], y, mid[i].p[1]], [ring[j].p[0], y, ring[j].p[1]], [mid[j].p[0], y, mid[j].p[1]], [mid[i].c, ring[j].c, mid[j].c], null, [0, 1, 0], true);
    }

    // ---------- placement helpers ----------
    const maxR = Math.max(...inner.map(([x, z]) => Math.hypot(x, z)));
    const placed = [];
    const scatter = (count, { minR = 0.42, margin = 0.1, minDist = 0.22, keepCentre = true } = {}) => {
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
            if ([...placed, ...out].some((p) => Math.hypot(p[0] - x, p[1] - z) < minDist)) continue;
            out.push([x, z]);
        }
        placed.push(...out);
        return out;
    };
    const many = (n) => (detail ? n * density : n * density * 0.35);
    const small = (n) => (detail ? n * density : 0);

    // ---------- waterways (rivers, dry channels, trails) ----------
    const localWays = (cell.waterways || []).map((ww) => ({ ...ww, pts: ww.pts.map((p) => ({ ...p, x: p.x - cx, z: p.z - cz })) }));
    const onWater = (x, z) => localWays.some((ww) => ww.kind !== 'trail' && ww.pts.some((p) => Math.hypot(p.x - x, p.z - z) < p.w * 0.9 + 0.12));
    const isWaterCell = terrain === 'sea' || terrain === 'lake';
    if (!isWaterCell) {
        for (const ww of localWays) {
            if (ww.kind === 'river') {
                const deep = '#2a86c0';
                const light = '#62c6e8';
                flatRibbon(g, ww.pts, y + 0.006, 1.7, '#6e5a30', rand); // muddy banks
                flatRibbon(g, ww.pts, y + 0.009, 1.25, '#8a7a4a', null);
                waterRibbon(w, ww.pts, y + 0.022, 1, deep, light, 1);
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
    const D = { g, w, l, rand, y, variant, density, scatter, many, small };
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
        case 'forest':
        case 'galleryforest': {
            const pts = scatter(many(5), { minR: 0.42, minDist: 0.32 });
            each(pts, (x, z, i) => {
                if (terrain === 'galleryforest' && i % 2) ginkgo(g, x, z, y, 0.7 + rand() * 0.2, rand);
                else if (i === 0 && variant > 0.4) araucaria(g, x, z, y, 1.05 + rand() * 0.3, rand);
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
            each(scatter(many(9), { minR: 0.36, minDist: 0.24 }), (x, z, i) => {
                if (i % 4 === 1) treeFern(g, x, z, y, 0.6, rand);
                else conifer(g, x, z, y, 0.95 + rand() * 0.45, rand, { dark: true });
            });
            each(scatter(small(4), { minR: 0.2, minDist: 0.18 }), (x, z) => fern(g, x, z, y, 0.2, rand, '#3f8a2c'));
            if (variant > 0.6) each(scatter(1, { minR: 0.3 }), (x, z) => mushrooms(g, x, z, y, rand));
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
            if (variant > 0.6) each(scatter(1, { minR: 0.5 }), (x, z) => (variant > 0.8 ? ginkgo(g, x, z, y, 0.7, rand) : conifer(g, x, z, y, 0.7, rand)));
            break;
        case 'dryriverbed':
            each(scatter(many(3), { minR: 0.3, minDist: 0.2 }), (x, z) => rock(g, x, z, y, 0.09, rand, '#a59c8c'));
            each(scatter(many(1), { minR: 0.55 }), (x, z) => deadTree(g, x, z, y, 0.42, rand));
            break;
        case 'riverbank': {
            const [px, pz] = [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4];
            disc(g, px, pz, y + 0.004, 0.36, '#7a6a3c', 8, rand);
            waterDisc(w, px, pz, y + 0.016, 0.22, '#3a9ac0', '#7ad0e8', rand);
            pools.push({ x: px, z: pz, r: 0.14, y: y + 0.016 });
            each(scatter(many(4), { minR: 0.45, minDist: 0.25 }), (x, z) => horsetails(g, x, z, y, 0.3, rand));
            each(scatter(small(3), { minR: 0.4 }), (x, z) => tuft(g, x, z, y, 0.13, rand, '#9aa846'));
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
            each(scatter(many(3), { minR: 0.25 }), (x, z) => rock(g, x, z, y, 0.08 + rand() * 0.06, rand, '#c8b89a'));
            if (variant > 0.5) each(scatter(1, { minR: 0.5 }), (x, z) => cycad(g, x, z, y, 0.5, rand));
            if (variant < 0.3) each(scatter(1, { minR: 0.4 }), (x, z) => log(g, x, z, y, 0.5, 0.045, rand, '#b8a080'));
            each(scatter(small(3), { minR: 0.2 }), (x, z) => disc(g, x, z, y + 0.004, 0.05, '#f6eedc', 5, rand)); // shells
            break;
        case 'nest': {
            disc(g, 0, 0, y + 0.004, 0.55, '#9a5a32', 10, rand);
            for (let i = 0; i < 11; i++) {
                const a = (i / 11) * Math.PI * 2;
                blob(g, [Math.cos(a) * 0.42, y + 0.045, Math.sin(a) * 0.42], 0.12, i % 2 ? '#7a4a28' : '#6a3e20', { scale: [1.3, 0.6, 1], jitter: 0.4, rand, flatBottom: -0.3 });
            }
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + 0.4;
                const r = i === 4 ? 0 : 0.15;
                blob(g, [Math.cos(a) * r, y + 0.07, Math.sin(a) * r], 0.065, '#f4ecd8', {
                    detail: 1, jitter: 0.04, scale: [0.85, 1.15, 0.85], rand, colorFn: (ly, rr) => (rr() > 0.82 ? '#c9b48e' : '#f4ecd8'), faceVary: 0.02
                });
            }
            each(scatter(many(3), { minR: 0.65 }), (x, z) => fern(g, x, z, y, 0.22, rand));
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
