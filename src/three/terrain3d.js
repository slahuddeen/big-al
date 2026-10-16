// ==================== 3D HEX TERRAIN BUILDER ====================
// Builds one chunky low-poly hex tile per terrain type. Each tile is three
// merged meshes at most (ground, water, lava) so even large maps stay cheap.
import * as THREE from 'three';
import {
    MeshBuilder, loft, prism, blob, cone, limb, slab,
    hexCorners, hexToWorld, directionVector, rngFor, vary, shade, mix, col
} from './lowpoly.js';

export const TILE_RADIUS = 0.985;
const EDGE_DIST = TILE_RADIUS * Math.sqrt(3) / 2;
const BASE_Y = -1.2;

// HEX_DIRECTIONS order: E, NE, NW, W, SW, SE
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

const P = {
    dirt: '#7a5232', dirtDark: '#553820', soil: '#64432a',
    rockSide: '#6f6a64', rockDark: '#4f4b47',
    sandSide: '#c9a560', sand: '#ecd27e',
    grassLip: '#5f8f2c'
};

// Per-terrain base styling: surface height, top colour(s), lip and wall bands
const STYLE = {
    plains: { h: 0.3, top: ['#b9c247', '#a8b83d', '#c8c552'], lip: '#8aa035' },
    savanna: { h: 0.3, top: ['#d9b54a', '#cfa83e', '#e2c35a'], lip: '#b08c34' },
    scrubland: { h: 0.3, top: ['#9cbd45', '#8db03c', '#a9c752'], lip: '#749a30' },
    sauropodgrounds: { h: 0.29, top: ['#b9b45a', '#c4b866', '#aaa452'], lip: '#8e8a44' },
    forest: { h: 0.32, top: ['#4f8a2c', '#457d27', '#5a9632'], lip: '#3d6c22' },
    denseforest: { h: 0.34, top: ['#3b6a24', '#335f1f', '#41742a'], lip: '#2c531b' },
    openwoods: { h: 0.32, top: ['#7aac3a', '#6e9f33', '#86b743'], lip: '#5d8a2c' },
    galleryforest: { h: 0.32, top: ['#4c8a34', '#43802e', '#58963c'], lip: '#3c6c26' },
    deadforest: { h: 0.3, top: ['#857360', '#7a6857', '#907d68'], lip: '#6b5a4a' },
    hills: { h: 0.52, top: ['#86bb45', '#7aae3d', '#92c64f'], lip: '#6a9a34' },
    rocky: { h: 0.42, top: ['#8f8577', '#83796c', '#9a9083'], lip: '#6f675d', side: P.rockSide },
    mountains: { h: 0.55, top: ['#6f8a4a', '#7b7a72', '#687f45'], lip: '#5a6b3c', side: P.rockSide },
    volcanic: { h: 0.5, top: ['#5a3328', '#4e2c23', '#63392c'], lip: '#3e231c', side: '#3a2a26' },
    lavafield: { h: 0.3, top: ['#3b3330', '#352d2a', '#433a36'], lip: '#2a2422', side: '#2e2624' },
    desert: { h: 0.28, top: ['#ecc967', '#e2bd5a', '#f2d47a'], lip: '#cfa54a', side: P.sandSide },
    badlands: { h: 0.36, top: ['#cf7a3c', '#c26d33', '#d98848'], lip: '#a85a2a', side: '#9a4f28' },
    mesa: { h: 0.95, top: ['#d48a48', '#c97d3d', '#de9856'], lip: '#b5693a', side: '#b25a30' },
    quicksand: { h: 0.27, top: ['#d8b660', '#cfac55', '#e0c06c'], lip: '#b8934a', side: P.sandSide },
    river: { h: 0.3, top: ['#76aa3c', '#6ca035', '#82b545'], lip: '#5b8c2e' },
    dryriverbed: { h: 0.28, top: ['#d9c08e', '#cfb581', '#e2cb9a'], lip: '#b49a6c', side: '#9c7e55' },
    riverbank: { h: 0.27, top: ['#8f8a4a', '#857f42', '#9b9653'], lip: '#6f6a38' },
    marsh: { h: 0.25, top: ['#577a34', '#4d6f2e', '#61853b'], lip: '#405f27' },
    waterhole: { h: 0.3, top: ['#7fb043', '#74a43c', '#8bbb4d'], lip: '#618f33' },
    lake: { h: 0.1, top: ['#c9b277', '#bba56b', '#d4bd84'], lip: '#a89060', side: P.sandSide, waterY: 0.24 },
    beach: { h: 0.26, top: ['#f0d888', '#e8cf7c', '#f5e09a'], lip: '#d4b766', side: P.sandSide },
    nest: { h: 0.31, top: ['#b8693a', '#ad5f33', '#c47644'], lip: '#8f4c2a' }
};

export const getSurfaceHeight = (terrain, q = 0, r = 0) => {
    const s = STYLE[terrain] || STYLE.plains;
    return s.h + heightJitter(q, r, terrain);
};

const heightJitter = (q, r, terrain) => {
    if (terrain === 'lake' || terrain === 'river' || terrain === 'mesa') return 0;
    const rand = rngFor(q, r, 99);
    return (rand() - 0.5) * 0.05;
};

export const getWaterLevel = (terrain) => {
    if (terrain === 'lake') return STYLE.lake.waterY;
    return null;
};

// ---------- Hex top with patchy colour variation ----------
const hexTop = (mb, y, colors, rand, radius = TILE_RADIUS - 0.05) => {
    const outer = hexCorners(radius).map(([x, z]) => new THREE.Vector3(x, y, z));
    const inner = hexCorners(radius * 0.5).map(([x, z]) => new THREE.Vector3(x, y, z));
    const centre = new THREE.Vector3(0, y, 0);
    const pick = () => vary(colors[Math.floor(rand() * colors.length)], rand, 0.05);
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        mb.tri(centre, inner[i], inner[j], pick(), [0, 1, 0], true);
        mb.tri(inner[i], outer[i], outer[j], pick(), [0, 1, 0], true);
        mb.tri(inner[i], outer[j], inner[j], pick(), [0, 1, 0], true);
    }
};

const baseTile = (mb, style, y, rand, opts = {}) => {
    const side = style.side ?? P.dirt;
    prism(mb, hexCorners(TILE_RADIUS), BASE_Y, y, {
        bevel: 0.05,
        bevelH: 0.04,
        bevelColor: style.lip,
        topFn: opts.noTop ? () => { } : (pts) => hexTop(mb, y, style.top, rand),
        bands: [
            { to: y - 0.42, color: shade(side, 0.72) },
            { to: y - 0.16, color: side },
            { to: y - 0.04, color: style.lip }
        ]
    });
};

// ---------- Placement helpers ----------
const scatter = (rand, count, { minR = 0.35, maxR = 0.78, minDist = 0.24, existing = [] } = {}) => {
    const out = [];
    let tries = 0;
    while (out.length < count && tries < count * 30) {
        tries++;
        const a = rand() * Math.PI * 2;
        const r = minR + (maxR - minR) * Math.sqrt(rand());
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if ([...existing, ...out].some((p) => Math.hypot(p[0] - x, p[1] - z) < minDist)) continue;
        out.push([x, z]);
    }
    return out;
};

const withSway = (mb, baseY, height, fn) => {
    mb.swayFn = (v) => Math.max(0, Math.min(1, (v.y - baseY) / height)) ** 1.5;
    fn();
    mb.swayFn = null;
};

// ---------- Flora (Jurassic: conifers, araucarias, cycads, ferns, ginkgos, horsetails) ----------
const conifer = (mb, x, z, y, h, rand, dark = false) => {
    const trunk = '#6b4426';
    limb(mb, [x, y - 0.02, z], [x, y + h * 0.35, z], 0.035 * h * 2.2, 0.025 * h * 2.2, trunk, { sides: 5 });
    withSway(mb, y, h, () => {
        const greens = dark ? ['#1f4d26', '#24582b', '#2b6331'] : ['#2f6b2c', '#367a33', '#3f8838'];
        const tiers = 3;
        for (let i = 0; i < tiers; i++) {
            const by = y + h * (0.22 + i * 0.22);
            const r = h * (0.3 - i * 0.065);
            cone(mb, [x, by, z], [x, by + h * 0.42, z], r, greens[i], { sides: 6, jitter: 0.25, rand, rot: rand() * 6 });
        }
    });
};

const araucaria = (mb, x, z, y, h, rand) => {
    limb(mb, [x, y - 0.02, z], [x, y + h * 0.8, z], 0.04 * h * 1.6, 0.025 * h * 1.6, '#7a4e2c', { sides: 5 });
    withSway(mb, y, h, () => {
        const greens = ['#2e6a35', '#357a3b', '#28602f'];
        for (let i = 0; i < 3; i++) {
            const cy = y + h * (0.62 + i * 0.14);
            const r = h * (0.32 - i * 0.07);
            blob(mb, [x, cy, z], r, greens[i], { scale: [1, 0.38, 1], jitter: 0.35, rand, detail: 0 });
        }
    });
};

const ginkgo = (mb, x, z, y, h, rand) => {
    limb(mb, [x, y - 0.02, z], [x + 0.02, y + h * 0.55, z], 0.05 * h, 0.035 * h, '#6e4a2c', { sides: 5 });
    withSway(mb, y, h, () => {
        const greens = ['#6fae3a', '#7dbb44', '#5f9e33', '#8ac44c'];
        blob(mb, [x, y + h * 0.7, z], h * 0.32, greens[0], { jitter: 0.4, rand, scale: [1, 0.8, 1] });
        blob(mb, [x + h * 0.15, y + h * 0.82, z + h * 0.08], h * 0.24, greens[1], { jitter: 0.4, rand });
        blob(mb, [x - h * 0.14, y + h * 0.78, z - h * 0.1], h * 0.22, greens[2], { jitter: 0.4, rand });
    });
};

const umbrellaTree = (mb, x, z, y, h, rand) => {
    limb(mb, [x, y - 0.02, z], [x + 0.03, y + h * 0.7, z + 0.02], 0.045 * h, 0.03 * h, '#6a4528', { sides: 5 });
    withSway(mb, y, h, () => {
        blob(mb, [x + 0.03, y + h * 0.78, z + 0.02], h * 0.42, '#5d8e2e', { scale: [1, 0.28, 1], jitter: 0.3, rand });
        blob(mb, [x + 0.03, y + h * 0.88, z + 0.02], h * 0.28, '#6fa036', { scale: [1, 0.3, 1], jitter: 0.3, rand });
    });
};

const cycad = (mb, x, z, y, h, rand, frondColor = '#4f9a33') => {
    const top = new THREE.Vector3(x, y + h * 0.35, z);
    loft(mb, [{ p: [x, y - 0.01, z], r: 0.07 * h * 1.6 }, { p: [x, y + h * 0.18, z], r: 0.075 * h * 1.6 }, { p: top, r: 0.05 * h * 1.6 }],
        { sides: 6, color: '#7a5a34', stripes: { every: 2, offset: 1, color: '#634826' } });
    withSway(mb, y, h, () => {
        const fronds = 7;
        for (let i = 0; i < fronds; i++) {
            const a = (i / fronds) * Math.PI * 2 + rand() * 0.4;
            const len = h * (0.55 + rand() * 0.2);
            const dx = Math.cos(a);
            const dz = Math.sin(a);
            const mid = new THREE.Vector3(x + dx * len * 0.5, top.y + h * 0.2, z + dz * len * 0.5);
            const tip = new THREE.Vector3(x + dx * len, top.y - h * 0.05, z + dz * len);
            const px = -dz * h * 0.08;
            const pz = dx * h * 0.08;
            const c = vary(frondColor, rand, 0.08);
            mb.tri(top, [mid.x + px, mid.y, mid.z + pz], [mid.x - px, mid.y, mid.z - pz], c, [0, 1, 0], true);
            mb.tri([mid.x + px, mid.y, mid.z + pz], tip, [mid.x - px, mid.y, mid.z - pz], shade(c, 0.9), [0, 1, 0], true);
        }
    });
};

const fern = (mb, x, z, y, s, rand, color = '#5aa23a') => {
    withSway(mb, y, s, () => {
        const n = 5 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand() * 0.5;
            const len = s * (0.7 + rand() * 0.4);
            const dx = Math.cos(a);
            const dz = Math.sin(a);
            const base = [x, y, z];
            const mid = [x + dx * len * 0.5, y + s * 0.55, z + dz * len * 0.5];
            const tip = [x + dx * len, y + s * 0.15, z + dz * len];
            const w = s * 0.14;
            const c = vary(color, rand, 0.1);
            mb.tri(base, [mid[0] - dz * w, mid[1], mid[2] + dx * w], [mid[0] + dz * w, mid[1], mid[2] - dx * w], c, [0, 1, 0], true);
            mb.tri([mid[0] - dz * w, mid[1], mid[2] + dx * w], tip, [mid[0] + dz * w, mid[1], mid[2] - dx * w], shade(c, 0.88), [0, 1, 0], true);
        }
    });
};

const tuft = (mb, x, z, y, s, rand, color = '#a7c24a') => {
    withSway(mb, y, s, () => {
        for (let i = 0; i < 4; i++) {
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
        const n = 4 + Math.floor(rand() * 4);
        for (let i = 0; i < n; i++) {
            const bx = x + (rand() - 0.5) * s * 0.5;
            const bz = z + (rand() - 0.5) * s * 0.5;
            const h = s * (0.7 + rand() * 0.6);
            const lx = (rand() - 0.5) * 0.08;
            const lz = (rand() - 0.5) * 0.08;
            loft(mb, [
                { p: [bx, y, bz], r: 0.016 },
                { p: [bx + lx * 0.5, y + h * 0.5, bz + lz * 0.5], r: 0.014, color: '#4f7a2a' },
                { p: [bx + lx, y + h, bz + lz], r: 0.01 }
            ], { sides: 4, color: '#6f9a36', tipEnd: 0.03 });
        }
    });
};

const bush = (mb, x, z, y, s, rand, color = '#5f9a34') => {
    withSway(mb, y, s * 1.4, () => {
        blob(mb, [x, y + s * 0.35, z], s * 0.5, color, { scale: [1.1, 0.75, 1], jitter: 0.4, rand, flatBottom: -0.5 });
        blob(mb, [x + s * 0.25, y + s * 0.3, z + s * 0.1], s * 0.35, shade(color, 1.12), { jitter: 0.4, rand, flatBottom: -0.5 });
    });
};

const rock = (mb, x, z, y, s, rand, color = '#8a857c') => {
    blob(mb, [x, y + s * 0.25, z], s * 0.5, color, {
        scale: [1.1, 0.75, 0.95], jitter: 0.45, rand, flatBottom: -0.55, rotY: rand() * 6,
        colorFn: (ly) => (ly > 0.3 ? shade(color, 1.12) : color)
    });
};

const deadTree = (mb, x, z, y, h, rand) => {
    const c = '#5d4b3d';
    const top = [x + (rand() - 0.5) * 0.06, y + h, z + (rand() - 0.5) * 0.06];
    loft(mb, [{ p: [x, y - 0.02, z], r: 0.045 }, { p: [x, y + h * 0.5, z], r: 0.032 }, { p: top, r: 0.012 }], { sides: 5, color: c, tipEnd: 0.03 });
    for (let i = 0; i < 3; i++) {
        const by = y + h * (0.35 + i * 0.18);
        const a = rand() * Math.PI * 2;
        const len = h * (0.3 - i * 0.05);
        limb(mb, [x, by, z], [x + Math.cos(a) * len, by + len * 0.6, z + Math.sin(a) * len], 0.018, 0.006, shade(c, 0.9), { sides: 4 });
    }
};

const treeFern = (mb, x, z, y, h, rand) => {
    limb(mb, [x, y - 0.02, z], [x, y + h * 0.7, z], 0.035, 0.03, '#4a3624', { sides: 5 });
    const top = y + h * 0.7;
    withSway(mb, y, h, () => fern(mb, x, z, top, h * 0.5, rand, '#3e8a2c'));
};

// ---------- Ribbons (rivers, paths, dry channels) ----------
const ribbon = (mb, from, to, width, y, color, segs = 2, rand = null, wobble = 0) => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const w = wobble && i > 0 && i < segs ? (rand() - 0.5) * wobble : 0;
        pts.push([from[0] + dx * t + px * w, from[1] + dz * t + pz * w]);
    }
    for (let i = 0; i < segs; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        const c = rand ? vary(color, rand, 0.04) : color;
        mb.quad(
            [ax + px * width / 2, y, az + pz * width / 2],
            [bx + px * width / 2, y, bz + pz * width / 2],
            [bx - px * width / 2, y, bz - pz * width / 2],
            [ax - px * width / 2, y, az - pz * width / 2],
            c, [0, 1, 0], true
        );
    }
};

const disc = (mb, x, z, y, r, color, sides = 6, rand = null, rot = 0) => {
    const pts = [];
    for (let k = 0; k < sides; k++) {
        const a = rot + (k / sides) * Math.PI * 2;
        const rr = rand ? r * (0.8 + rand() * 0.35) : r;
        pts.push(new THREE.Vector3(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr));
    }
    const c = new THREE.Vector3(x, y, z);
    for (let k = 0; k < sides; k++) {
        mb.tri(c, pts[k], pts[(k + 1) % sides], rand ? vary(color, rand, 0.03) : color, [0, 1, 0], true);
    }
};

const edgeMid = (dirIndex, dist = EDGE_DIST) => {
    const d = directionVector(dirIndex);
    return [d.x * dist, d.z * dist];
};

// ---------- Main builder ----------
// neighbours: array of 6 terrain ids (or null) in HEX_DIRECTIONS order
export const buildTile = (terrain, q, r, neighbours = []) => {
    const style = STYLE[terrain] || STYLE.plains;
    const rand = rngFor(q, r, 7);
    const y = getSurfaceHeight(terrain, q, r);
    const g = new MeshBuilder();
    const w = new MeshBuilder();
    const l = new MeshBuilder();
    const smoke = [];
    const pools = []; // water spots creatures can swim in: { x, z, r, y }
    const connected = (types) => neighbours.map((n, i) => (n && types.includes(n) ? i : -1)).filter((i) => i >= 0);

    switch (terrain) {
        case 'mesa': {
            baseTile(g, { ...style, top: ['#c98a4a'] }, 0.4, rand, {});
            const R = TILE_RADIUS * 0.8;
            const stripes = ['#b0552c', '#d07a40', '#a44a28', '#c86a36', '#e09a58'];
            const bands = [];
            for (let i = 0; i < 5; i++) bands.push({ to: 0.4 + (i + 1) * 0.11, color: stripes[i] });
            prism(g, hexCorners(R).map(([x, z]) => [x * (0.95 + rand() * 0.1), z * (0.95 + rand() * 0.1)]), 0.38, y, {
                bevel: 0.04, bevelH: 0.03, bevelColor: style.lip,
                topFn: () => hexTop(g, y, style.top, rand, R - 0.06), bands
            });
            for (const [x, z] of scatter(rand, 2, { minR: 0.4, maxR: 0.6 })) bush(g, x, z, y, 0.16, rand, '#8a9a3a');
            break;
        }
        case 'lake': {
            baseTile(g, style, y, rand);
            const wy = style.waterY;
            // water fills the whole hex (neighbouring lake tiles join seamlessly)
            const corners = hexCorners(TILE_RADIUS + 0.01).map(([x, z]) => new THREE.Vector3(x, wy, z));
            const mid = hexCorners(TILE_RADIUS * 0.5).map(([x, z]) => new THREE.Vector3(x, wy, z));
            const c0 = new THREE.Vector3(0, wy, 0);
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                w.tri(c0, mid[i], mid[j], vary('#3aa6d8', rand, 0.04), [0, 1, 0], true);
                w.tri(mid[i], corners[i], corners[j], vary('#3299cc', rand, 0.04), [0, 1, 0], true);
                w.tri(mid[i], corners[j], mid[j], vary('#3aa0d2', rand, 0.04), [0, 1, 0], true);
            }
            // water skirt so the lake edge reads as a volume against lower neighbours
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                w.quad(corners[i], corners[j], [corners[j].x, y, corners[j].z], [corners[i].x, y, corners[i].z], '#2a7fae', [0, wy, 0]);
            }
            for (const [x, z] of scatter(rand, 2, { minR: 0.45, maxR: 0.75 })) rock(g, x, z, y, 0.18, rand, '#8d887e');
            pools.push({ x: 0, z: 0, r: 0.7, y: wy });
            break;
        }
        case 'river':
        case 'galleryforest': {
            baseTile(g, style, y, rand);
            let links = connected(['river', 'lake']);
            if (links.length === 0) links = [Math.floor(rand() * 3), Math.floor(rand() * 3) + 3];
            if (links.length === 1) links.push((links[0] + 3) % 6);
            const bankW = terrain === 'river' ? 0.7 : 0.42;
            const waterW = terrain === 'river' ? 0.5 : 0.28;
            for (const d of links) {
                const to = edgeMid(d);
                ribbon(g, [0, 0], to, bankW, y + 0.004, '#7d6a3a', 3, rand);
                ribbon(w, [0, 0], to, waterW, y + 0.02, '#46b2e0', 3, rand);
            }
            disc(g, 0, 0, y + 0.004, bankW * 0.55, '#7d6a3a', 6);
            disc(w, 0, 0, y + 0.02, waterW * 0.56, '#46b2e0', 6);
            pools.push({ x: 0, z: 0, r: waterW * 0.4, y: y + 0.02 });
            for (const d of links) { const m = edgeMid(d); pools.push({ x: m[0] * 0.55, z: m[1] * 0.55, r: waterW * 0.3, y: y + 0.02 }); }
            // banks: rocks, horsetails, (and trees for gallery forest)
            const spots = scatter(rand, terrain === 'river' ? 4 : 6, { minR: 0.5, maxR: 0.8, minDist: 0.22 });
            spots.forEach(([x, z], i) => {
                const nearWater = links.some((d) => {
                    const m = edgeMid(d);
                    const t = Math.max(0, Math.min(1, (x * m[0] + z * m[1]) / (EDGE_DIST * EDGE_DIST)));
                    return Math.hypot(x - m[0] * t, z - m[1] * t) < bankW * 0.6;
                });
                if (nearWater) return;
                if (terrain === 'galleryforest') {
                    if (i % 2) ginkgo(g, x, z, y, 0.6 + rand() * 0.2, rand);
                    else conifer(g, x, z, y, 0.7 + rand() * 0.2, rand);
                } else if (i % 2) horsetails(g, x, z, y, 0.22, rand);
                else rock(g, x, z, y, 0.13, rand);
            });
            break;
        }
        case 'dryriverbed': {
            baseTile(g, style, y, rand);
            let links = connected(['dryriverbed', 'river']);
            if (links.length === 0) links = [Math.floor(rand() * 3), Math.floor(rand() * 3) + 3];
            if (links.length === 1) links.push((links[0] + 3) % 6);
            for (const d of links) ribbon(g, [0, 0], edgeMid(d), 0.48, y + 0.004, '#c4a978', 3, rand);
            disc(g, 0, 0, y + 0.004, 0.27, '#c4a978', 6);
            for (let i = 0; i < 7; i++) {
                const a = rand() * Math.PI * 2;
                const r0 = rand() * 0.6;
                const x = Math.cos(a) * r0;
                const z = Math.sin(a) * r0;
                ribbon(g, [x, z], [x + (rand() - 0.5) * 0.3, z + (rand() - 0.5) * 0.3], 0.018, y + 0.008, '#8a7050');
            }
            for (const [x, z] of scatter(rand, 4, { minR: 0.15, maxR: 0.75, minDist: 0.15 })) rock(g, x, z, y, 0.07, rand, '#a59c8c');
            for (const [x, z] of scatter(rand, 1, { minR: 0.6, maxR: 0.8 })) deadTree(g, x, z, y, 0.4, rand);
            break;
        }
        case 'sauropodgrounds': {
            baseTile(g, style, y, rand);
            let links = connected(['sauropodgrounds']);
            if (links.length === 0) links = [Math.floor(rand() * 6)];
            if (links.length === 1) links.push((links[0] + 3) % 6);
            for (const d of links) {
                const m = edgeMid(d);
                ribbon(g, [0, 0], m, 0.62, y + 0.003, '#9a8a4c', 2, rand);
                for (let i = 0; i < 3; i++) {
                    const t = 0.18 + i * 0.27;
                    const side = i % 2 ? 0.12 : -0.12;
                    const len = Math.hypot(m[0], m[1]);
                    disc(g, m[0] * t + (-m[1] / len) * side, m[1] * t + (m[0] / len) * side, y + 0.008, 0.085, '#6b5a32', 7, rand);
                }
            }
            disc(g, 0, 0, y + 0.003, 0.34, '#9a8a4c', 6);
            for (const [x, z] of scatter(rand, 3, { minR: 0.55, maxR: 0.8 })) tuft(g, x, z, y, 0.14, rand, '#b5b04e');
            for (const [x, z] of scatter(rand, 1, { minR: 0.62, maxR: 0.8 })) cycad(g, x, z, y, 0.4, rand);
            break;
        }
        case 'mountains': {
            baseTile(g, style, y, rand);
            const peak = (cx, cz, h, rad) => {
                const secs = [];
                const steps = 5;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const yy = y - 0.02 + h * t;
                    const c = t > 0.7 ? '#f2f4f7' : t > 0.55 ? '#c9ccd0' : t > 0.25 ? '#7a7670' : '#5f5b55';
                    secs.push({ p: [cx + (rand() - 0.5) * 0.05 * t, yy, cz + (rand() - 0.5) * 0.05 * t], r: rad * (1 - t * 0.92), color: c });
                }
                loft(g, secs, { sides: 7, jitter: 0.5, rand, tipEnd: h * 0.08, capStart: false, rot: rand() });
            };
            peak(0.05, 0.05, 1.7 + rand() * 0.4, 0.82);
            peak(-0.42, 0.3, 0.9 + rand() * 0.3, 0.42);
            for (const [x, z] of scatter(rand, 2, { minR: 0.7, maxR: 0.85 })) conifer(g, x, z, y, 0.35, rand, true);
            break;
        }
        case 'volcanic': {
            baseTile(g, style, y, rand);
            const H = 1.15;
            loft(g, [
                { p: [0, y - 0.02, 0], r: 0.86, color: '#4a2a22' },
                { p: [0, y + H * 0.4, 0], r: 0.62, color: '#3d2420' },
                { p: [0, y + H * 0.8, 0], r: 0.42, color: '#33201d' },
                { p: [0, y + H, 0], r: 0.34, color: '#2a1a18' }
            ], { sides: 8, jitter: 0.35, rand, capStart: false });
            disc(l, 0, 0, y + H + 0.012, 0.3, '#ff7a1a', 8);
            disc(l, 0, 0, y + H + 0.018, 0.16, '#ffd25a', 6);
            // lava rivulets down the slope
            for (let i = 0; i < 3; i++) {
                const a = rand() * Math.PI * 2;
                const pts = [];
                for (let k = 0; k <= 4; k++) {
                    const t = k / 4;
                    const rr = 0.34 + t * 0.5;
                    const aa = a + (rand() - 0.5) * 0.3;
                    pts.push([Math.cos(aa) * rr, y + H * (1 - t) + 0.02 - t * 0.0, Math.sin(aa) * rr]);
                }
                for (let k = 0; k < 4; k++) {
                    const [ax, ay, az] = pts[k];
                    const [bx, by, bz] = pts[k + 1];
                    const px = -Math.sin(a) * 0.045;
                    const pz = Math.cos(a) * 0.045;
                    l.quad([ax + px, ay + 0.015, az + pz], [bx + px, by + 0.015, bz + pz], [bx - px, by + 0.015, bz - pz], [ax - px, ay + 0.015, az - pz],
                        k < 2 ? '#ff8a24' : '#e0501a', [Math.cos(a), 1.2, Math.sin(a)], true);
                }
            }
            smoke.push(new THREE.Vector3(0, y + H + 0.1, 0));
            break;
        }
        case 'lavafield': {
            baseTile(g, style, y, rand);
            for (let i = 0; i < 5; i++) {
                let x = (rand() - 0.5) * 1.2;
                let z = (rand() - 0.5) * 1.2;
                for (let k = 0; k < 3; k++) {
                    const nx = Math.max(-0.75, Math.min(0.75, x + (rand() - 0.5) * 0.5));
                    const nz = Math.max(-0.7, Math.min(0.7, z + (rand() - 0.5) * 0.5));
                    ribbon(l, [x, z], [nx, nz], 0.06 + rand() * 0.04, y + 0.006, rand() > 0.5 ? '#ff6a1a' : '#ff9a2a');
                    x = nx; z = nz;
                }
            }
            disc(l, 0.2, -0.2, y + 0.007, 0.16, '#ff7a1a', 7, rand);
            for (const [x, z] of scatter(rand, 4, { minR: 0.3, maxR: 0.8, minDist: 0.2 })) rock(g, x, z, y, 0.16, rand, '#2d2828');
            if (rand() < 0.5) smoke.push(new THREE.Vector3(0.2, y + 0.05, -0.2));
            break;
        }
        case 'marsh': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 3, { minR: 0.1, maxR: 0.6, minDist: 0.4 })) {
                disc(g, x, z, y + 0.004, 0.3, '#4a5a2a', 7, rand);
                disc(w, x, z, y + 0.02, 0.24, '#4a9a9a', 7, rand, rand());
                pools.push({ x, z, r: 0.17, y: y + 0.02 });
            }
            for (const [x, z] of scatter(rand, 5, { minR: 0.4, maxR: 0.82, minDist: 0.2 })) horsetails(g, x, z, y, 0.3, rand);
            for (const [x, z] of scatter(rand, 1, { minR: 0.6, maxR: 0.8 })) cycad(g, x, z, y, 0.5, rand, '#4a8a30');
            break;
        }
        case 'waterhole': {
            baseTile(g, style, y, rand);
            disc(g, 0.05, 0.02, y + 0.004, 0.56, '#7a6438', 9, rand);
            disc(w, 0.05, 0.02, y + 0.02, 0.44, '#3f9fc8', 9, rand);
            pools.push({ x: 0.05, z: 0.02, r: 0.32, y: y + 0.02 });
            for (const [x, z] of scatter(rand, 3, { minR: 0.68, maxR: 0.85, minDist: 0.3 })) {
                if (rand() > 0.5) cycad(g, x, z, y, 0.45, rand); else rock(g, x, z, y, 0.15, rand);
            }
            for (const [x, z] of scatter(rand, 3, { minR: 0.6, maxR: 0.85 })) tuft(g, x, z, y, 0.14, rand);
            break;
        }
        case 'beach': {
            baseTile(g, style, y, rand);
            const wet = connected(['river', 'lake', 'marsh']);
            const sides = wet.length ? wet : [];
            for (const d of sides) {
                const m = edgeMid(d, EDGE_DIST);
                const corners = hexCorners(TILE_RADIUS - 0.04);
                // the two corners bounding edge d
                const angle = Math.atan2(m[1], m[0]);
                const sorted = corners
                    .map(([x, z]) => ({ x, z, da: Math.abs(Math.atan2(Math.sin(Math.atan2(z, x) - angle), Math.cos(Math.atan2(z, x) - angle))) }))
                    .sort((a, b) => a.da - b.da)
                    .slice(0, 2);
                const inner = [m[0] * 0.35, m[1] * 0.35];
                w.tri([inner[0], y + 0.02, inner[1]], [sorted[0].x, y + 0.02, sorted[0].z], [sorted[1].x, y + 0.02, sorted[1].z], '#5cc3d6', [0, 1, 0], true);
                pools.push({ x: m[0] * 0.7, z: m[1] * 0.7, r: 0.12, y: y + 0.02 });
                g.tri([inner[0] * 0.8, y + 0.006, inner[1] * 0.8], [sorted[0].x, y + 0.006, sorted[0].z], [sorted[1].x, y + 0.006, sorted[1].z], '#f8f0d0', [0, 1, 0], true);
            }
            for (const [x, z] of scatter(rand, 3, { minR: 0.3, maxR: 0.8 })) rock(g, x, z, y, 0.08, rand, '#c8b89a');
            if (rand() < 0.6) for (const [x, z] of scatter(rand, 1, { minR: 0.6, maxR: 0.8 })) cycad(g, x, z, y, 0.5, rand);
            break;
        }
        case 'riverbank': {
            baseTile(g, style, y, rand);
            disc(g, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4, y + 0.004, 0.38, '#7a6a3c', 8, rand);
            const px = (rand() - 0.5) * 0.3;
            const pz = (rand() - 0.5) * 0.3;
            disc(w, px, pz, y + 0.016, 0.2, '#5aaac0', 7, rand);
            pools.push({ x: px, z: pz, r: 0.12, y: y + 0.016 });
            for (const [x, z] of scatter(rand, 4, { minR: 0.5, maxR: 0.82 })) horsetails(g, x, z, y, 0.26, rand);
            for (const [x, z] of scatter(rand, 2, { minR: 0.4, maxR: 0.8 })) tuft(g, x, z, y, 0.13, rand, '#9aa846');
            break;
        }
        case 'nest': {
            baseTile(g, style, y, rand);
            disc(g, 0, 0, y + 0.004, 0.5, '#9a5a32', 9, rand);
            for (let i = 0; i < 9; i++) {
                const a = (i / 9) * Math.PI * 2;
                blob(g, [Math.cos(a) * 0.4, y + 0.04, Math.sin(a) * 0.4], 0.11, '#7a4a28', { scale: [1.3, 0.6, 1], jitter: 0.4, rand, flatBottom: -0.3 });
            }
            const eggs = 4;
            for (let i = 0; i < eggs; i++) {
                const a = (i / eggs) * Math.PI * 2 + 0.4;
                const ex = Math.cos(a) * 0.14;
                const ez = Math.sin(a) * 0.14;
                blob(g, [ex, y + 0.07, ez], 0.065, '#f4ecd8', {
                    detail: 1, jitter: 0.04, scale: [0.85, 1.15, 0.85], rand,
                    colorFn: (ly, rr) => (rr() > 0.82 ? '#c9b48e' : '#f4ecd8'), faceVary: 0.02
                });
            }
            for (const [x, z] of scatter(rand, 3, { minR: 0.62, maxR: 0.85 })) fern(g, x, z, y, 0.2, rand);
            break;
        }
        case 'quicksand': {
            baseTile(g, style, y, rand);
            const rings = ['#c09a4a', '#d8b866', '#b88f42', '#cfae5c', '#a8823a'];
            rings.forEach((c, i) => disc(g, 0.02, -0.02, y + 0.003 + i * 0.002, 0.62 - i * 0.12, c, 10, null, i * 0.3));
            for (const [x, z] of scatter(rand, 2, { minR: 0.72, maxR: 0.85 })) deadTree(g, x, z, y, 0.35, rand);
            break;
        }
        case 'desert': {
            baseTile(g, style, y, rand);
            for (let i = 0; i < 2; i++) {
                const a = rand() * Math.PI;
                blob(g, [(rand() - 0.5) * 0.7, y, (rand() - 0.5) * 0.7], 0.4, '#e6c160', {
                    scale: [1.4, 0.32, 0.6], jitter: 0.2, rand, flatBottom: 0, rotY: a,
                    colorFn: (ly) => (ly > 0.5 ? '#f3d888' : '#e2bb5a')
                });
            }
            for (const [x, z] of scatter(rand, 3, { minR: 0.3, maxR: 0.82 })) rock(g, x, z, y, 0.09, rand, '#c8a070');
            break;
        }
        case 'badlands': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 3, { minR: 0.5, maxR: 0.78, minDist: 0.3 })) {
                const h = 0.25 + rand() * 0.35;
                const r0 = 0.13 + rand() * 0.05;
                const secs = [];
                const bands = ['#b8582a', '#d98a4a', '#a14a24', '#e3a060'];
                for (let k = 0; k <= 4; k++) secs.push({ p: [x, y - 0.01 + (h * k) / 4, z], r: r0 * (1 - k * 0.12), color: bands[k % 4] });
                loft(g, secs, { sides: 6, jitter: 0.3, rand, capStart: false, rot: rand() });
                blob(g, [x, y + h + 0.03, z], r0 * 0.9, '#7a3a1e', { scale: [1.2, 0.45, 1.2], rand, jitter: 0.2 });
            }
            for (let i = 0; i < 5; i++) {
                const x = (rand() - 0.5) * 1.1;
                const z = (rand() - 0.5) * 1.0;
                ribbon(g, [x, z], [x + (rand() - 0.5) * 0.35, z + (rand() - 0.5) * 0.35], 0.022, y + 0.005, '#8a4220');
            }
            break;
        }
        case 'rocky': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 5, { minR: 0.35, maxR: 0.8, minDist: 0.22 })) rock(g, x, z, y, 0.16 + rand() * 0.18, rand, rand() > 0.5 ? '#8a847a' : '#7a756d');
            for (const [x, z] of scatter(rand, 2, { minR: 0.4, maxR: 0.8 })) tuft(g, x, z, y, 0.12, rand, '#8aa040');
            break;
        }
        case 'hills': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 2, { minR: 0.55, maxR: 0.7, minDist: 0.6 })) {
                blob(g, [x, y - 0.02, z], 0.42, '#7ab040', {
                    detail: 1, scale: [1, 0.55, 1], jitter: 0.15, rand, flatBottom: 0,
                    colorFn: (ly) => (ly > 0.6 ? '#95c552' : ly > 0.3 ? '#83b847' : '#6e9e3a')
                });
            }
            for (const [x, z] of scatter(rand, 3, { minR: 0.3, maxR: 0.8 })) tuft(g, x, z, y, 0.13, rand, '#9cc24a');
            if (rand() < 0.5) for (const [x, z] of scatter(rand, 1, { minR: 0.5, maxR: 0.8 })) conifer(g, x, z, y, 0.5, rand);
            break;
        }
        case 'forest': {
            baseTile(g, style, y, rand);
            const spots = scatter(rand, 5, { minR: 0.38, maxR: 0.8, minDist: 0.3 });
            spots.forEach(([x, z], i) => {
                if (i === 0) araucaria(g, x, z, y, 1.0 + rand() * 0.3, rand);
                else conifer(g, x, z, y, 0.7 + rand() * 0.35, rand);
            });
            for (const [x, z] of scatter(rand, 3, { minR: 0.25, maxR: 0.8, minDist: 0.2, existing: spots })) fern(g, x, z, y, 0.18, rand);
            break;
        }
        case 'denseforest': {
            baseTile(g, style, y, rand);
            const spots = scatter(rand, 8, { minR: 0.36, maxR: 0.84, minDist: 0.24 });
            spots.forEach(([x, z], i) => {
                if (i % 3 === 0) araucaria(g, x, z, y, 1.2 + rand() * 0.3, rand);
                else if (i % 4 === 1) treeFern(g, x, z, y, 0.6, rand);
                else conifer(g, x, z, y, 0.9 + rand() * 0.4, rand, true);
            });
            for (const [x, z] of scatter(rand, 3, { minR: 0.2, maxR: 0.7, minDist: 0.18, existing: spots })) fern(g, x, z, y, 0.2, rand, '#3f8a2c');
            break;
        }
        case 'openwoods': {
            baseTile(g, style, y, rand);
            const spots = scatter(rand, 3, { minR: 0.45, maxR: 0.8, minDist: 0.4 });
            spots.forEach(([x, z], i) => {
                if (i === 0) ginkgo(g, x, z, y, 0.75 + rand() * 0.2, rand);
                else if (i === 1) cycad(g, x, z, y, 0.5, rand);
                else conifer(g, x, z, y, 0.6, rand);
            });
            for (const [x, z] of scatter(rand, 4, { minR: 0.25, maxR: 0.85, minDist: 0.18, existing: spots })) fern(g, x, z, y, 0.16, rand, '#6aaa3a');
            break;
        }
        case 'deadforest': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 4, { minR: 0.4, maxR: 0.8, minDist: 0.3 })) deadTree(g, x, z, y, 0.6 + rand() * 0.3, rand);
            const a = rand() * Math.PI;
            limb(g, [Math.cos(a) * 0.5, y + 0.04, Math.sin(a) * 0.5], [Math.cos(a) * 0.5 + 0.4 * Math.cos(a + 1.6), y + 0.04, Math.sin(a) * 0.5 + 0.4 * Math.sin(a + 1.6)], 0.045, 0.035, '#5a4838', { sides: 5 });
            for (let i = 0; i < 4; i++) disc(g, (rand() - 0.5) * 1.1, (rand() - 0.5) * 1.0, y + 0.004, 0.12, '#5a5048', 6, rand);
            break;
        }
        case 'savanna': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 1 + Math.floor(rand() * 2), { minR: 0.45, maxR: 0.75, minDist: 0.5 })) umbrellaTree(g, x, z, y, 0.85, rand);
            for (const [x, z] of scatter(rand, 6, { minR: 0.25, maxR: 0.85, minDist: 0.16 })) tuft(g, x, z, y, 0.16, rand, '#e0c050');
            break;
        }
        case 'scrubland': {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 5, { minR: 0.35, maxR: 0.82, minDist: 0.25 })) bush(g, x, z, y, 0.22 + rand() * 0.1, rand, rand() > 0.5 ? '#5f9a34' : '#79a83c');
            for (const [x, z] of scatter(rand, 2, { minR: 0.3, maxR: 0.8 })) tuft(g, x, z, y, 0.12, rand);
            break;
        }
        case 'plains':
        default: {
            baseTile(g, style, y, rand);
            for (const [x, z] of scatter(rand, 7, { minR: 0.2, maxR: 0.85, minDist: 0.15 })) tuft(g, x, z, y, 0.14, rand, '#b4c44a');
            if (rand() < 0.4) for (const [x, z] of scatter(rand, 1, { minR: 0.5, maxR: 0.8 })) fern(g, x, z, y, 0.2, rand);
            if (rand() < 0.3) for (const [x, z] of scatter(rand, 1, { minR: 0.5, maxR: 0.8 })) rock(g, x, z, y, 0.1, rand);
            break;
        }
    }

    return {
        ground: g.build(),
        water: w.isEmpty() ? null : w.build(),
        lava: l.isEmpty() ? null : l.build(),
        surfaceY: y,
        waterY: getWaterLevel(terrain),
        smoke,
        pools
    };
};

// Which neighbour terrains affect the look of a tile (for rebuild signatures)
const CONNECTS = {
    river: ['river', 'lake'],
    galleryforest: ['river', 'lake'],
    dryriverbed: ['dryriverbed', 'river'],
    sauropodgrounds: ['sauropodgrounds'],
    beach: ['river', 'lake', 'marsh']
};

export const tileSignature = (terrain, neighbours) => {
    const types = CONNECTS[terrain];
    if (!types) return terrain;
    return terrain + ':' + neighbours.map((n) => (n && types.includes(n) ? '1' : '0')).join('');
};

// Small 3D markers used by the renderer (hex outlines)
export const buildHexRing = (radius, width, color) => {
    const mb = new MeshBuilder();
    const outer = hexCorners(radius);
    const inner = hexCorners(radius - width);
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        mb.quad([outer[i][0], 0, outer[i][1]], [outer[j][0], 0, outer[j][1]], [inner[j][0], 0, inner[j][1]], [inner[i][0], 0, inner[i][1]], color, [0, 1, 0], true);
    }
    return mb.build();
};

export { DIRS, mix, col };
