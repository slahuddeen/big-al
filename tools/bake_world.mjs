// ==================== BAKE THE ROAM WORLD FOR GODOT ====================
// Runs the very same world code the browser game uses (src/roam/world.js on top of the
// Voronoi generator) and writes what the Godot port needs to stand on it:
//   height_raw.bin.gz float32 ground height (to the centimetre), one sample per metre; tools/bake_ground.py
//                   smooths its hexagonal terraces into height.bin.gz, which the game loads
//   water.bin.gz    float32 water surface, -1000 where there is none
//   info.bin.gz     2 bytes per metre: terrain id, river edge distance (quarter metres, +16 m)
//   ground.png      the ground colour the browser game paints (biome tint, banks, trails, mud)
//   splat.png       ground kinds for the terrain shader: r sand, g mud, b forest floor, a rock
//   world.json      sea level, spawn, rivers, ponds, lakes and the terrain names
// Usage: node tools/bake_world.mjs [seed ...]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { RoamWorld, M } from '../src/roam/world.js';
import { STYLE, PATCHES } from '../src/three/cells3d.js';
import { TERRAIN_TYPES } from '../src/data/terrain.js';
import { writePNG } from './png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const seeds = process.argv.slice(2).map(Number).filter(Boolean);
if (!seeds.length) seeds.push(1234);
// (seed 1234 is the browser game's default world; others can be baked on demand)

const TERRAINS = Object.keys(TERRAIN_TYPES);
const KIND = {
    beach: 1, sea: 1, riverbank: 1, nest: 1, stream: 1, desert: 1, lake: 1,
    waterhole: 2, dryriverbed: 2, quicksand: 2, sauropodgrounds: 2,
    forest: 3, galleryforest: 3, denseforest: 3, jungle: 3, mangrove: 3, deadfall: 3,
    rocky: 4, boulderfield: 4, mountains: 4, badlands: 4, mesa: 4
};

// colour helpers (sRGB 0..1), matching THREE.Color's hex parsing and HSL maths
const hex = (h) => (typeof h !== 'string' ? hex('#' + h.getHexString()) : [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const saturate = (c, k) => {
    const [r, g, b] = c;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h /= 6;
    }
    s = Math.min(1, s * k);
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
        t = (t + 1) % 1;
        return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
};
const SAND = hex('#e2c88a'), WET = hex('#7a6e4e'), ROCK = hex('#8a7e70'), DIRT = hex('#8a5a36'), TRAIL = hex('#b08e58'), DEEP = hex('#4e6a5a'), MUD = hex('#6e5a3e');

for (const seed of seeds) {
    const t0 = Date.now();
    const world = new RoamWorld(seed);
    const out = path.join(here, '..', 'godot', 'data', `world_${seed}`);
    fs.mkdirSync(out, { recursive: true });
    const W = Math.ceil(world.width) + 1, D = Math.ceil(world.depth) + 1;
    const H = new Float32Array(W * D), WA = new Float32Array(W * D), INFO = new Uint8Array(W * D * 2);
    const samples = new Array(W * D);
    for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++) {
            const s = world.sample(x, z);
            const k = z * W + x;
            H[k] = s.h;
            WA[k] = s.water === null ? -1000 : s.water;
            const t = s.cell ? TERRAINS.indexOf(s.cell.terrain) : TERRAINS.indexOf('sea');
            INFO[k * 2] = t;
            INFO[k * 2 + 1] = s.river ? Math.max(0, Math.min(254, Math.round((s.river.edge + 16) * 4))) : 255;
            samples[k] = { terrain: s.cell ? s.cell.terrain : 'sea', river: s.river, pond: !!s.pond, h: s.h, water: s.water, trail: world.onTrail(x, z) };
        }
        if (z % 200 === 0) process.stdout.write(`\r  seed ${seed}: row ${z}/${D}`);
    }
    // ground colour and kinds, as terrain.js paints them
    const COL = new Uint8Array(W * D * 3), SPL = new Uint8Array(W * D * 4);
    const hAt = (x, z) => H[Math.max(0, Math.min(D - 1, z)) * W + Math.max(0, Math.min(W - 1, x))];
    for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++) {
            const k = z * W + x, s = samples[k];
            const t = s.terrain;
            const style = STYLE[t] || STYLE.plains;
            const n = world.noise(x / 26, z / 26) * 0.5 + 0.5;
            const n2 = world.noise2(x / 9, z / 9) * 0.5 + 0.5;
            let col = hex(style.top[Math.max(0, Math.min(2, Math.floor(n2 * 2.99)))]);
            const patch = PATCHES[t];
            if (patch) col = lerp(col, hex(n > 0.5 ? patch[1] : patch[0]), Math.abs(n - 0.5) * 1.1);
            col = saturate(col, 1.18);
            const dx = hAt(x + 2, z) - hAt(x - 2, z), dz = hAt(x, z + 2) - hAt(x, z - 2);
            const slopeY = 4 / Math.hypot(dx, 4, dz);
            if (slopeY < 0.82) col = lerp(col, style.side ? hex(style.side) : (t === 'mountains' || t === 'rocky' ? ROCK : DIRT), Math.min(1, (0.82 - slopeY) * 4));
            if (s.trail > 0) col = lerp(col, TRAIL, s.trail * 0.7);
            if (s.river && s.river.edge < 4) col = lerp(col, SAND, Math.min(1, (4 - s.river.edge) / 3));
            if (s.pond && s.water !== null && s.h > s.water - 1) col = lerp(col, MUD, 0.55);
            if (s.water !== null && s.h < s.water - 0.2) col = lerp(col, s.water - s.h > 3 ? DEEP : WET, Math.min(1, (s.water - s.h) / 2));
            else if (s.water !== null && s.h < s.water + 0.6) col = lerp(col, s.pond ? MUD : SAND, 0.6);
            for (let c = 0; c < 3; c++) COL[k * 3 + c] = Math.max(0, Math.min(255, Math.round(col[c] * 255)));
            const kind = s.pond || (s.water !== null && s.h > s.water - 1 && s.h < s.water + 0.6 && !s.river) ? 2 : s.river && s.river.edge < 4 ? 1 : KIND[t] || 0;
            if (kind) SPL[k * 4 + kind - 1] = 255;
            if (s.trail > 0) SPL[k * 4 + 1] = Math.max(SPL[k * 4 + 1], Math.round(s.trail * 200));
        }
    }
    // soften the kinds a little so the shader blends between them
    const blurred = new Uint8Array(SPL.length);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        for (let c = 0; c < 4; c++) {
            let sum = 0, n = 0;
            for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
                const xx = x + a, zz = z + b;
                if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue;
                sum += SPL[(zz * W + xx) * 4 + c]; n++;
            }
            blurred[(z * W + x) * 4 + c] = Math.round(sum / n);
        }
    }
    const Hq = new Float32Array(H.length);
    for (let i = 0; i < H.length; i++) Hq[i] = Math.round(H[i] * 100) / 100;
    fs.writeFileSync(path.join(out, 'height_raw.bin.gz'), zlib.gzipSync(Buffer.from(Hq.buffer), { level: 9 }));
    fs.writeFileSync(path.join(out, 'water.bin.gz'), zlib.gzipSync(Buffer.from(WA.buffer), { level: 9 }));
    fs.writeFileSync(path.join(out, 'info.bin.gz'), zlib.gzipSync(Buffer.from(INFO.buffer)));
    writePNG(path.join(out, 'ground.png'), W, D, 3, COL);
    writePNG(path.join(out, 'splat.png'), W, D, 4, blurred);
    const r2 = (v) => Math.round(v * 100) / 100;
    const meta = {
        seed, width: world.width, depth: world.depth, gridW: W, gridD: D, seaLevel: world.seaLevel,
        spawn: world.spawn, terrains: TERRAINS, terrainNames: TERRAINS.map((t) => TERRAIN_TYPES[t].name),
        ponds: world.ponds.map((p) => ({ x: r2(p.x), z: r2(p.z), R: r2(p.R), lobes: p.lobes.map(r2), depth: r2(p.depth), surface: r2(p.surface), terrain: p.terrain })),
        rivers: world.riverLines.map((line) => line.map((p) => [r2(p.x), r2(p.z), r2(p.w), r2(world.base(p.x, p.z) - 0.7)])),
        lakes: world.map.cells.filter((c) => c.terrain === 'lake' && c.waterM !== null).map((c) => ({ x: r2(c.x * M), z: r2(c.z * M), y: r2(c.waterM), poly: c.poly.map(([x, z]) => [r2(x * M), r2(z * M)]) }))
    };
    fs.writeFileSync(path.join(out, 'world.json'), JSON.stringify(meta));
    console.log(`\r  seed ${seed}: ${W}×${D} samples, ${meta.ponds.length} ponds, ${meta.rivers.length} rivers, ${meta.lakes.length} lakes in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
