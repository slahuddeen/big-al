// ==================== GROUND AND PLANTS AT REAL SCALE ====================
// The land is built in square chunks around the player: a faceted height field coloured by
// the Voronoi cell each point falls in (so the map's tiles still show as patches of
// biome), with sandy river banks, worn trails and bare rock on steep ground. The world is
// sampled every 4 m; chunks near the player are drawn every 2 m with extra fine relief,
// far ones every 8 m, with skirts hiding the seams between them. Plants are low-poly
// builders scaled to life size and scattered per biome as instanced meshes, each tinted a
// little differently; trunks are remembered so the player and animals bump into them.
import * as THREE from 'three';
import { MeshBuilder, mulberry32 } from '../three/lowpoly.js';
import { FLORA, STYLE, PATCHES } from '../three/cells3d.js';
import { leafyFern, flowers, sedge, reeds, lilyPads, giantConifer, giantBroadleaf } from './plants.js';
import { createGroundMaterial } from './materials.js';

export const CHUNK = 128;
const STEP = 4; // world samples
const VIEW = 720; // how far chunks are kept
const NEAR_KINDS = 200; // small plants are only drawn this close
const LOD_NEAR = 230, LOD_FAR = 470;

// ---------- plant prototypes (built one unit tall, scaled per instance) ----------
// h: height range in metres; trunk: trunk radius as a fraction of the height (collisions);
// far: drawn at any distance; water: floats on still water
const PROTOS = {
    conifer: { build: (mb, r) => FLORA.conifer(mb, 0, 0, 0, 1, r), h: [22, 34], trunk: 0.028, far: true },
    darkConifer: { build: (mb, r) => FLORA.conifer(mb, 0, 0, 0, 1, r, { dark: true }), h: [24, 36], trunk: 0.028, far: true },
    araucaria: { build: (mb, r) => FLORA.araucaria(mb, 0, 0, 0, 1, r), h: [26, 38], trunk: 0.022, far: true },
    giantConifer: { build: (mb, r) => giantConifer(mb, r), h: [44, 60], trunk: 0.03, far: true },
    giantBroadleaf: { build: (mb, r) => giantBroadleaf(mb, r), h: [26, 38], trunk: 0.045, far: true },
    ginkgo: { build: (mb, r) => FLORA.ginkgo(mb, 0, 0, 0, 1, r), h: [12, 20], trunk: 0.04, far: true },
    gallery: { build: (mb, r) => FLORA.galleryTree(mb, 0, 0, 0, 1, r, [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3]), h: [20, 30], trunk: 0.05, far: true },
    umbrella: { build: (mb, r) => FLORA.umbrellaTree(mb, 0, 0, 0, 1, r), h: [9, 14], trunk: 0.04, far: true },
    mangrove: { build: (mb, r) => FLORA.mangroveTree(mb, 0, 0, 0, 1, r), h: [8, 12], trunk: 0.03, far: true },
    dead: { build: (mb, r) => FLORA.deadTree(mb, 0, 0, 0, 1, r), h: [10, 16], trunk: 0.04, far: true },
    treeFern: { build: (mb, r) => FLORA.treeFern(mb, 0, 0, 0, 1, r), h: [5, 9], trunk: 0.03, far: true },
    cycad: { build: (mb, r) => FLORA.cycad(mb, 0, 0, 0, 1, r), h: [2.5, 4.5], trunk: 0.11 },
    fern: { build: (mb, r) => leafyFern(mb, r), h: [1.0, 2.2], detail: 70, lo: 'fernLo' },
    bigFern: { build: (mb, r) => leafyFern(mb, r, '#3f8a34'), h: [2.4, 3.8], detail: 90, lo: 'bigFernLo' },
    fernLo: { build: (mb, r) => FLORA.fern(mb, 0, 0, 0, 1, r), h: [1, 2] },
    bigFernLo: { build: (mb, r) => FLORA.fern(mb, 0, 0, 0, 1, r, '#3f8a34'), h: [2, 3] },
    tuft: { build: (mb, r) => FLORA.tuft(mb, 0, 0, 0, 1, r), h: [0.6, 1.1] },
    sedge: { build: (mb, r) => sedge(mb, r), h: [0.7, 1.4] },
    flowers: { build: (mb, r, v) => flowers(mb, r, v), h: [0.5, 0.9], variants: 6, range: 110 },
    reeds: { build: (mb, r) => reeds(mb, r), h: [1.8, 3], range: 150 },
    lily: { build: (mb, r) => lilyPads(mb, r), h: [3, 6], water: true },
    horsetails: { build: (mb, r) => FLORA.horsetails(mb, 0, 0, 0, 1, r), h: [2, 3.5] },
    bush: { build: (mb, r) => FLORA.bush(mb, 0, 0, 0, 1, r), h: [2, 3.2] },
    termite: { build: (mb, r) => FLORA.termiteMound(mb, 0, 0, 0, 1, r), h: [1.6, 3.2], far: true, solid: 0.3 },
    bones: { build: (mb, r) => FLORA.bones(mb, 0, 0, 0, r), h: [5, 8] },
    rock: { build: (mb, r) => FLORA.rock(mb, 0, 0, 0, 1, r, r() > 0.5 ? '#a8957a' : '#8e857a', r() > 0.5 ? '#6a8a3a' : null), h: [1.5, 5], far: true, solid: 0.35 },
    log: { build: (mb, r) => FLORA.log(mb, 0, 0, 0, 1, 0.06, r), h: [9, 15], far: true }
};
const VARIANTS = 3;

// plants per hectare in each biome
const DENSITY = {
    forest: { conifer: 30, araucaria: 7, giantConifer: 2.5, ginkgo: 4, fern: 260, sedge: 40, flowers: 25, treeFern: 8, log: 3, rock: 2 },
    galleryforest: { gallery: 22, giantBroadleaf: 4, darkConifer: 8, ginkgo: 3, fern: 200, horsetails: 40, treeFern: 10, sedge: 50, log: 2 },
    denseforest: { bigFern: 800, fern: 380, darkConifer: 5, giantConifer: 4, treeFern: 18 },
    jungle: { treeFern: 110, cycad: 30, ginkgo: 6, giantBroadleaf: 3, fern: 480, bigFern: 100, flowers: 30 },
    openwoods: { conifer: 8, ginkgo: 5, cycad: 14, fern: 200, tuft: 100, sedge: 60, flowers: 70, termite: 1 },
    deadfall: { log: 22, dead: 8, fern: 160, conifer: 4, sedge: 40 },
    plains: { fern: 140, tuft: 260, sedge: 120, flowers: 90, cycad: 3, rock: 3, termite: 1.5, bones: 0.3 },
    fernprairie: { fern: 600, tuft: 140, flowers: 110, sedge: 60, cycad: 5 },
    floodplain: { tuft: 360, sedge: 160, horsetails: 80, reeds: 30, fern: 100, flowers: 60, gallery: 1 },
    savanna: { umbrella: 4, tuft: 360, sedge: 80, bush: 12, flowers: 25, termite: 3, bones: 0.4 },
    scrubland: { bush: 70, tuft: 200, sedge: 40, cycad: 4, termite: 3 },
    sauropodgrounds: { tuft: 120, sedge: 40, flowers: 25, cycad: 3, bones: 1.5, termite: 2 },
    marsh: { horsetails: 380, reeds: 260, fern: 180, sedge: 120, cycad: 10, treeFern: 6 },
    mangrove: { mangrove: 45, horsetails: 90, reeds: 40 },
    riverbank: { horsetails: 40, reeds: 70, sedge: 80, tuft: 60, log: 2 },
    stream: { horsetails: 60, reeds: 50, tuft: 120, sedge: 60, gallery: 2 },
    river: { gallery: 6, giantBroadleaf: 1, horsetails: 70, reeds: 60, tuft: 150, sedge: 80, fern: 110, flowers: 30 },
    waterhole: { cycad: 6, tuft: 200, sedge: 80, reeds: 60, horsetails: 30, bones: 1 },
    beach: { log: 1, tuft: 30, sedge: 20 },
    hills: { conifer: 4, bush: 22, tuft: 200, sedge: 40, flowers: 30, rock: 14 },
    rocky: { rock: 45, bush: 8, tuft: 40 },
    boulderfield: { rock: 70, bush: 6 },
    desert: { rock: 4, bush: 2, bones: 0.6 },
    badlands: { rock: 22, bush: 3, bones: 0.5 },
    mesa: { rock: 20 },
    mountains: { darkConifer: 10, rock: 40, bush: 10 },
    nest: { tuft: 60, fern: 30, flowers: 20 },
    dryriverbed: { rock: 10, dead: 2, bones: 0.5 },
    quicksand: { dead: 2 },
    lake: {}, sea: {}
};
const MAXD = {};
for (const d of Object.values(DENSITY)) for (const [k, v] of Object.entries(d)) MAXD[k] = Math.max(MAXD[k] || 0, v);
const DRY = new Set(['savanna', 'scrubland', 'plains', 'desert', 'badlands', 'sauropodgrounds', 'rocky', 'hills']);
const LUSH = new Set(['jungle', 'denseforest', 'galleryforest', 'marsh']);

const C = (hex) => new THREE.Color(hex);
const SAND = C('#e2c88a'), WET = C('#7a6e4e'), ROCK = C('#8a7e70'), DIRT = C('#8a5a36'), TRAIL = C('#b08e58'), DEEP = C('#4e6a5a'), MUD = C('#6e5a3e');
const _hsl = {};

export class Terrain {
    constructor(world, scene, mats) {
        this.world = world;
        this.scene = scene;
        this.mats = mats;
        this.ground = createGroundMaterial();
        this.chunks = new Map();
        this.trunks = new Map(); // chunk key -> [{ x, z, r }]
        this.dirty = false;
        this.lastFlora = 0;
        // prototypes
        this.protos = {};
        for (const [key, p] of Object.entries(PROTOS)) {
            this.protos[key] = [];
            for (let v = 0; v < (p.variants || VARIANTS); v++) {
                const mb = new MeshBuilder();
                p.build(mb, mulberry32(1000 + v * 97 + key.length * 13), v);
                this.protos[key].push(mb.build());
            }
        }
        this.instanced = {};
    }

    // ---------- ground colour ----------
    groundColour(x, z, s, slopeY) {
        const cell = s.cell;
        const t = cell ? cell.terrain : 'sea';
        const style = STYLE[t] || STYLE.plains;
        const n = this.world.noise(x / 26, z / 26) * 0.5 + 0.5;
        const n2 = this.world.noise2(x / 9, z / 9) * 0.5 + 0.5;
        const col = C(style.top[Math.floor(n2 * 2.99)]);
        const patch = PATCHES[t];
        if (patch) col.lerp(C(n > 0.5 ? patch[1] : patch[0]), Math.abs(n - 0.5) * 1.1);
        // a touch richer than the map game's palette: this is seen up close
        col.getHSL(_hsl);
        col.setHSL(_hsl.h, Math.min(1, _hsl.s * 1.18), _hsl.l);
        if (slopeY < 0.82) col.lerp(style.side ? C(style.side) : (t === 'mountains' || t === 'rocky' ? ROCK : DIRT), Math.min(1, (0.82 - slopeY) * 4));
        const trail = this.world.onTrail(x, z);
        if (trail > 0) col.lerp(TRAIL, trail * 0.7);
        if (s.river && s.river.edge < 4) col.lerp(SAND, Math.min(1, (4 - s.river.edge) / 3));
        if (s.pond && s.water !== null && s.h > s.water - 1) col.lerp(MUD, 0.55);
        if (s.water !== null && s.h < s.water - 0.2) col.lerp(s.water - s.h > 3 ? DEEP : WET, Math.min(1, (s.water - s.h) / 2));
        else if (s.water !== null && s.h < s.water + 0.6) col.lerp(s.pond ? MUD : SAND, 0.6);
        return col;
    }

    // sample the world for a chunk once: heights (without the fine relief), colours, relief
    sampleChunk(cx, cz) {
        const W = this.world;
        const n = CHUNK / STEP + 1;
        const x0 = cx * CHUNK, z0 = cz * CHUNK;
        const B = n + 2;
        const Hb = new Float32Array(B * B);
        const S = [];
        for (let j = -1; j <= n; j++) {
            for (let i = -1; i <= n; i++) {
                const s = W.sample(x0 + i * STEP, z0 + j * STEP);
                Hb[(j + 1) * B + (i + 1)] = s.h - s.micro;
                if (i >= 0 && j >= 0 && i < n && j < n) S.push(s);
            }
        }
        const H = new Float32Array(n * n), R = new Float32Array(n * n), Cc = new Float32Array(n * n * 3);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const k = j * n + i;
                const h = Hb[(j + 1) * B + (i + 1)];
                const dx = Hb[(j + 1) * B + (i + 2)] - Hb[(j + 1) * B + i];
                const dz = Hb[(j + 2) * B + (i + 1)] - Hb[j * B + (i + 1)];
                const ny = (2 * STEP) / Math.hypot(dx, 2 * STEP, dz);
                const c = this.groundColour(x0 + i * STEP, z0 + j * STEP, S[k], ny);
                H[k] = h;
                R[k] = S[k].relief;
                Cc.set([c.r, c.g, c.b], k * 3);
            }
        }
        return { n, H, R, C: Cc };
    }

    // a mesh for a chunk at a given spacing, interpolating the samples and adding fine relief
    meshChunk(cx, cz, data, step) {
        const W = this.world;
        const n = CHUNK / step + 1;
        const x0 = cx * CHUNK, z0 = cz * CHUNK;
        const sn = data.n;
        const at = (arr, u, v, stride = 1, o = 0) => {
            const i0 = Math.min(sn - 2, Math.floor(u)), j0 = Math.min(sn - 2, Math.floor(v));
            const fu = u - i0, fv = v - j0;
            const a = arr[(j0 * sn + i0) * stride + o], b = arr[(j0 * sn + i0 + 1) * stride + o];
            const c = arr[((j0 + 1) * sn + i0) * stride + o], d = arr[((j0 + 1) * sn + i0 + 1) * stride + o];
            return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
        };
        const verts = n * n + 4 * n; // plus a skirt round the edge
        const pos = new Float32Array(verts * 3);
        const col = new Float32Array(verts * 3);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const x = x0 + i * step, z = z0 + j * step;
                const u = (i * step) / STEP, v = (j * step) / STEP;
                const k = j * n + i;
                const h = at(data.H, u, v) + W.micro(x, z) * at(data.R, u, v);
                pos.set([x, h, z], k * 3);
                col.set([at(data.C, u, v, 3, 0), at(data.C, u, v, 3, 1), at(data.C, u, v, 3, 2)], k * 3);
            }
        }
        const idx = [];
        for (let j = 0; j < n - 1; j++) {
            for (let i = 0; i < n - 1; i++) {
                const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
                // alternate the diagonal so the facets don't line up in rows
                if ((i + j) % 2) idx.push(a, c, b, b, c, d);
                else idx.push(a, c, d, a, d, b);
            }
        }
        // skirts: each edge hangs a strip down, so a coarser neighbour leaves no gap
        const edges = [
            (t) => t, // z0 edge
            (t) => (n - 1) * n + t, // z1 edge
            (t) => t * n, // x0 edge
            (t) => t * n + n - 1 // x1 edge
        ];
        let sk = n * n;
        edges.forEach((e, ei) => {
            const start = sk;
            for (let t = 0; t < n; t++) {
                const src = e(t);
                pos.set([pos[src * 3], pos[src * 3 + 1] - 3, pos[src * 3 + 2]], sk * 3);
                col.set([col[src * 3] * 0.7, col[src * 3 + 1] * 0.7, col[src * 3 + 2] * 0.7], sk * 3);
                sk++;
            }
            for (let t = 0; t < n - 1; t++) {
                const a = e(t), b = e(t + 1), c = start + t, d = start + t + 1;
                if (ei === 0 || ei === 3) idx.push(a, b, c, b, d, c);
                else idx.push(a, c, b, b, c, d);
            }
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, this.ground);
        mesh.receiveShadow = true;
        return mesh;
    }

    lodFor(cx, cz, px, pz) {
        const d = Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz);
        return d < LOD_NEAR ? 2 : d < LOD_FAR ? 4 : 8;
    }

    buildChunk(cx, cz, px, pz) {
        const data = this.sampleChunk(cx, cz);
        const lod = this.lodFor(cx, cz, px, pz);
        const mesh = this.meshChunk(cx, cz, data, lod);
        this.scene.add(mesh);
        return { mesh, data, lod, flora: this.scatter(cx, cz) };
    }

    // ---------- plants ----------
    // a per-plant tint: a little hue and lightness drift, yellower in dry country, deeper in
    // the wet; flowers keep their colours
    tint(kind, terrain, rand) {
        if (kind === 'rock' || kind === 'bones' || kind === 'termite' || kind === 'log') {
            const l = 0.9 + rand() * 0.2;
            return [l, l, l];
        }
        const c = new THREE.Color(1, 1, 1);
        if (kind === 'flowers') return [0.92 + rand() * 0.16, 0.92 + rand() * 0.16, 0.92 + rand() * 0.16];
        const r = rand();
        c.setRGB(0.9 + r * 0.2, 0.92 + rand() * 0.16, 0.85 + rand() * 0.2);
        if (DRY.has(terrain)) c.multiply(new THREE.Color(1.12, 1.02, 0.72));
        if (LUSH.has(terrain)) c.multiply(new THREE.Color(0.88, 1.04, 0.92));
        // now and then a yellowing or a reddish flush of new growth
        if (r > 0.93) c.multiply(new THREE.Color(1.25, 1.05, 0.6));
        else if (r < 0.04) c.multiply(new THREE.Color(1.2, 0.85, 0.75));
        return [c.r, c.g, c.b];
    }

    scatter(cx, cz) {
        const W = this.world;
        const rand = mulberry32(((cx * 73856093) ^ (cz * 19349663) ^ (W.seed * 83492791)) >>> 0);
        const ha = (CHUNK * CHUNK) / 10000;
        const out = {};
        const trunks = [];
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const place = (kind, x, z, y, h, rot, v, terrain) => {
            const proto = PROTOS[kind];
            q.setFromAxisAngle(up, rot);
            const w = kind === 'log' || kind === 'lily' || kind === 'bones' ? h : h * (0.85 + rand() * 0.3);
            m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, w));
            const key = `${kind}:${v}`;
            (out[key] || (out[key] = [])).push({ m: m.clone(), c: this.tint(kind, terrain, rand) });
            if (proto.trunk) trunks.push({ x, z, r: Math.max(0.5, proto.trunk * h * 1.3) });
            else if (proto.solid) trunks.push({ x, z, r: proto.solid * h });
        };
        for (const [kind, max] of Object.entries(MAXD)) {
            const N = Math.round(max * ha);
            const proto = PROTOS[kind];
            const nv = proto.variants || VARIANTS;
            for (let i = 0; i < N; i++) {
                const x = (cx + rand()) * CHUNK, z = (cz + rand()) * CHUNK;
                const roll = rand(), v = Math.floor(rand() * nv), hr = rand(), rot = rand() * Math.PI * 2;
                const c = W.cellAt(x, z);
                if (!c) continue;
                const d = (DENSITY[c.terrain] || {})[kind] || 0;
                if (roll * max >= d) continue;
                const s = W.sample(x, z);
                // nothing grows in open water; horsetails, reeds and mangroves stand in the shallows
                const wet = kind === 'horsetails' || kind === 'mangrove' || kind === 'reeds';
                if (s.water !== null && s.h < s.water - (wet ? 1.2 : -0.2)) continue;
                if (s.river && s.river.edge < (wet ? -1 : 1.5)) continue;
                const h = proto.h[0] + (proto.h[1] - proto.h[0]) * hr;
                place(kind, x, z, s.h - (kind === 'rock' ? h * 0.15 : kind === 'termite' ? 0.3 : 0.15), h, rot, v, c.terrain);
            }
        }
        // round each pond centred in this chunk: lilies on the water, a ring of reeds and sedge
        for (const p of W.ponds) {
            if (Math.floor(p.x / CHUNK) !== cx || Math.floor(p.z / CHUNK) !== cz) continue;
            const lilies = Math.round(p.R * p.R * 0.035 * (p.terrain === 'marsh' || p.terrain === 'mangrove' ? 1.6 : 1));
            for (let i = 0; i < lilies; i++) {
                const a = rand() * Math.PI * 2;
                const rr = W.pondRadius(p, a) * (0.3 + rand() * 0.55);
                place('lily', p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr, p.surface + 0.03, 3 + rand() * 3, rand() * 6.3, Math.floor(rand() * VARIANTS), p.terrain);
            }
            const ring = Math.round(p.R * 1.6);
            for (let i = 0; i < ring; i++) {
                const a = rand() * Math.PI * 2;
                const rr = W.pondRadius(p, a) * (0.92 + rand() * 0.25);
                const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
                const kind = rand() < 0.6 ? 'reeds' : rand() < 0.5 ? 'sedge' : 'horsetails';
                const pr = PROTOS[kind];
                place(kind, x, z, W.height(x, z) - 0.1, pr.h[0] + (pr.h[1] - pr.h[0]) * rand(), rand() * 6.3, Math.floor(rand() * VARIANTS), p.terrain);
            }
        }
        this.trunks.set(`${cx},${cz}`, trunks);
        return out;
    }

    // rebuild the instanced plant meshes from the chunks in range: plants close to the
    // player go in a set that casts shadows, the rest in one that doesn't
    rebuildFlora(px, pz) {
        const lists = {};
        const SHADOW_R = 110;
        for (const [key, ch] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            const dist = Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz);
            for (const [pk, items] of Object.entries(ch.flora)) {
                const kind = pk.split(':')[0];
                if (!PROTOS[kind].far && dist > NEAR_KINDS) continue;
                const proto = PROTOS[kind];
                for (const it of items) {
                    const d = Math.hypot(it.m.elements[12] - px, it.m.elements[14] - pz);
                    if (proto.range && d > proto.range) continue;
                    // close up the detailed model, further off a cheaper one
                    const use = proto.lo && d > proto.detail ? `${proto.lo}:${pk.split(':')[1]}` : pk;
                    const k = `${use}|${d < SHADOW_R ? 'n' : 'f'}`;
                    (lists[k] || (lists[k] = [])).push(it);
                }
            }
        }
        for (const [k, inst] of Object.entries(this.instanced)) if (!lists[k]) inst.count = 0;
        const c = new THREE.Color();
        for (const [k, items] of Object.entries(lists)) {
            let inst = this.instanced[k];
            if (!inst || inst.instanceMatrix.count < items.length) {
                if (inst) { this.scene.remove(inst); inst.dispose(); }
                const [pk, band] = k.split('|');
                const [kind, v] = pk.split(':');
                inst = new THREE.InstancedMesh(this.protos[kind][Number(v)], this.mats.terrain, Math.ceil(items.length * 1.4) + 32);
                inst.castShadow = band === 'n' && (PROTOS[kind].far || kind === 'cycad' || kind === 'bigFern');
                inst.receiveShadow = true;
                inst.frustumCulled = false;
                this.scene.add(inst);
                this.instanced[k] = inst;
            }
            items.forEach((it, i) => {
                inst.setMatrixAt(i, it.m);
                inst.setColorAt(i, c.setRGB(it.c[0], it.c[1], it.c[2]));
            });
            inst.count = items.length;
            inst.instanceMatrix.needsUpdate = true;
            if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        }
    }

    // keep the chunks around (px, pz) built; returns true while still loading
    update(px, pz, budget = 2, time = 0) {
        const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
        const R = Math.ceil(VIEW / CHUNK);
        const want = [];
        for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
            const cx = pcx + dx, cz = pcz + dz;
            const d = Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz);
            if (d > VIEW) continue;
            if (cx < -2 || cz < -2 || cx * CHUNK > this.world.width + 256 || cz * CHUNK > this.world.depth + 256) continue;
            if (!this.chunks.has(`${cx},${cz}`)) want.push({ cx, cz, d });
        }
        want.sort((a, b) => a.d - b.d);
        for (const w of want.slice(0, budget)) {
            this.chunks.set(`${w.cx},${w.cz}`, this.buildChunk(w.cx, w.cz, px, pz));
            this.dirty = true;
        }
        // re-mesh chunks whose distance band changed (cheap: the samples are kept)
        let relod = Math.max(1, budget);
        for (const [key, ch] of this.chunks) {
            if (relod <= 0) break;
            const [cx, cz] = key.split(',').map(Number);
            const lod = this.lodFor(cx, cz, px, pz);
            if (lod === ch.lod) continue;
            this.scene.remove(ch.mesh);
            ch.mesh.geometry.dispose();
            ch.mesh = this.meshChunk(cx, cz, ch.data, lod);
            ch.lod = lod;
            this.scene.add(ch.mesh);
            relod--;
        }
        // drop far chunks
        for (const [key, ch] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz) > VIEW + CHUNK * 1.5) {
                this.scene.remove(ch.mesh);
                ch.mesh.geometry.dispose();
                this.chunks.delete(key);
                this.trunks.delete(key);
                this.dirty = true;
            }
        }
        // small plants come and go with distance, so refresh now and then as well
        if (this.dirty && time - this.lastFlora > 0.6) {
            this.rebuildFlora(px, pz);
            this.lastFlora = time;
            this.dirty = false;
            this.floraAt = [px, pz];
        } else if (this.floraAt && Math.hypot(px - this.floraAt[0], pz - this.floraAt[1]) > 30 && time - this.lastFlora > 0.6) {
            this.dirty = true;
        }
        return want.length > budget;
    }

    // trunks and boulders near a point (for collisions)
    obstacles(x, z) {
        const out = [];
        const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const t = this.trunks.get(`${cx + dx},${cz + dz}`);
            if (t) out.push(...t);
        }
        return out;
    }
}
