// ==================== GROUND AND PLANTS AT REAL SCALE ====================
// The land is built in square chunks around the player: a faceted height field coloured by
// the Voronoi cell each point falls in (so the map's tiles still show as patches of
// biome), with sandy river banks, worn trails and bare rock on steep ground. Plants are
// the map game's low-poly builders scaled to life size and scattered per biome as
// instanced meshes; trunks are remembered so the player and animals bump into them.
import * as THREE from 'three';
import { MeshBuilder, mulberry32, shade } from '../three/lowpoly.js';
import { FLORA, STYLE, PATCHES } from '../three/cells3d.js';

export const CHUNK = 128;
const STEP = 4;
const VIEW = 720; // how far chunks are kept
const NEAR_KINDS = 220; // small plants are only drawn this close

// ---------- plant prototypes (built one unit tall, scaled per instance) ----------
const PROTOS = {
    conifer: { build: (mb, r) => FLORA.conifer(mb, 0, 0, 0, 1, r), h: [22, 34], trunk: 0.028, far: true },
    darkConifer: { build: (mb, r) => FLORA.conifer(mb, 0, 0, 0, 1, r, { dark: true }), h: [24, 36], trunk: 0.028, far: true },
    araucaria: { build: (mb, r) => FLORA.araucaria(mb, 0, 0, 0, 1, r), h: [26, 38], trunk: 0.022, far: true },
    gallery: { build: (mb, r) => FLORA.galleryTree(mb, 0, 0, 0, 1, r, [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3]), h: [18, 26], trunk: 0.05, far: true },
    umbrella: { build: (mb, r) => FLORA.umbrellaTree(mb, 0, 0, 0, 1, r), h: [9, 14], trunk: 0.04, far: true },
    mangrove: { build: (mb, r) => FLORA.mangroveTree(mb, 0, 0, 0, 1, r), h: [8, 12], trunk: 0.03, far: true },
    dead: { build: (mb, r) => FLORA.deadTree(mb, 0, 0, 0, 1, r), h: [10, 16], trunk: 0.04, far: true },
    treeFern: { build: (mb, r) => FLORA.treeFern(mb, 0, 0, 0, 1, r), h: [5, 9], trunk: 0.03, far: true },
    cycad: { build: (mb, r) => FLORA.cycad(mb, 0, 0, 0, 1, r), h: [2.5, 4.5], trunk: 0.11 },
    fern: { build: (mb, r) => FLORA.fern(mb, 0, 0, 0, 1, r), h: [1.2, 2.6] },
    bigFern: { build: (mb, r) => FLORA.fern(mb, 0, 0, 0, 1, r, '#4f8a3e'), h: [2.5, 4] },
    tuft: { build: (mb, r) => FLORA.tuft(mb, 0, 0, 0, 1, r), h: [0.6, 1.1] },
    horsetails: { build: (mb, r) => FLORA.horsetails(mb, 0, 0, 0, 1, r), h: [2, 3.5] },
    bush: { build: (mb, r) => FLORA.bush(mb, 0, 0, 0, 1, r), h: [2, 3.2] },
    rock: { build: (mb, r) => FLORA.rock(mb, 0, 0, 0, 1, r, r() > 0.5 ? '#a8957a' : '#8e857a'), h: [1.5, 5], far: true, solid: 0.35 },
    log: { build: (mb, r) => FLORA.log(mb, 0, 0, 0, 1, 0.06, r), h: [9, 15], far: true }
};
const VARIANTS = 3;

// plants per hectare in each biome
const DENSITY = {
    forest: { conifer: 30, araucaria: 7, fern: 260, treeFern: 8, log: 3, rock: 2 },
    galleryforest: { gallery: 26, darkConifer: 10, fern: 200, horsetails: 40, treeFern: 10, log: 2 },
    denseforest: { bigFern: 900, fern: 400, darkConifer: 5, treeFern: 18 },
    jungle: { treeFern: 120, cycad: 30, fern: 500, bigFern: 100 },
    openwoods: { conifer: 8, cycad: 14, fern: 200, tuft: 120 },
    deadfall: { log: 22, dead: 8, fern: 160, conifer: 4 },
    plains: { fern: 150, tuft: 320, cycad: 3, rock: 3 },
    fernprairie: { fern: 650, tuft: 160, cycad: 5 },
    floodplain: { tuft: 420, horsetails: 80, fern: 100, gallery: 1 },
    savanna: { umbrella: 4, tuft: 420, bush: 12 },
    scrubland: { bush: 70, tuft: 220, cycad: 4 },
    sauropodgrounds: { tuft: 120, cycad: 3 },
    marsh: { horsetails: 420, fern: 200, cycad: 10, treeFern: 6 },
    mangrove: { mangrove: 45, horsetails: 90 },
    riverbank: { horsetails: 40, tuft: 60, log: 2 },
    stream: { horsetails: 60, tuft: 120, gallery: 2 },
    river: { gallery: 6, horsetails: 70, tuft: 150, fern: 110 },
    waterhole: { cycad: 6, tuft: 220, horsetails: 30 },
    beach: { log: 1, tuft: 30 },
    hills: { conifer: 4, bush: 22, tuft: 220, rock: 14 },
    rocky: { rock: 45, bush: 8, tuft: 40 },
    boulderfield: { rock: 70, bush: 6 },
    desert: { rock: 4, bush: 2 },
    badlands: { rock: 22, bush: 3 },
    mesa: { rock: 20 },
    mountains: { darkConifer: 10, rock: 40, bush: 10 },
    nest: { tuft: 60, fern: 30 },
    dryriverbed: { rock: 10, dead: 2 },
    quicksand: { dead: 2 },
    lake: {}, sea: {}
};
const MAXD = {};
for (const d of Object.values(DENSITY)) for (const [k, v] of Object.entries(d)) MAXD[k] = Math.max(MAXD[k] || 0, v);

const C = (hex) => new THREE.Color(hex);
const SAND = C('#dcc48c'), WET = C('#8a7a5a'), ROCK = C('#8a7e70'), DIRT = C('#8a5a36'), TRAIL = C('#a88a58'), DEEP = C('#5e6a5a');

export class Terrain {
    constructor(world, scene, mats) {
        this.world = world;
        this.scene = scene;
        this.mats = mats;
        this.chunks = new Map();
        this.trunks = new Map(); // chunk key -> [{ x, z, r }]
        this.dirty = false;
        this.lastFlora = 0;
        // prototypes
        this.protos = {};
        for (const [key, p] of Object.entries(PROTOS)) {
            this.protos[key] = [];
            for (let v = 0; v < VARIANTS; v++) {
                const mb = new MeshBuilder();
                p.build(mb, mulberry32(1000 + v * 97 + key.length * 13));
                const geo = mb.build();
                this.protos[key].push(geo);
            }
        }
        this.instanced = {};
        this.patchNoise = world.noise2;
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
        if (slopeY < 0.82) col.lerp(style.side ? C(style.side) : (t === 'mountains' || t === 'rocky' ? ROCK : DIRT), Math.min(1, (0.82 - slopeY) * 4));
        const trail = this.world.onTrail(x, z);
        if (trail > 0) col.lerp(TRAIL, trail * 0.7);
        if (s.river) {
            if (s.river.edge < 4) col.lerp(SAND, Math.min(1, (4 - s.river.edge) / 3));
        }
        if (s.water !== null && s.h < s.water - 0.2) col.lerp(s.water - s.h > 3 ? DEEP : WET, Math.min(1, (s.water - s.h) / 2));
        else if (s.water !== null && s.h < s.water + 0.6) col.lerp(SAND, 0.6);
        return col;
    }

    buildChunk(cx, cz) {
        const W = this.world;
        const n = CHUNK / STEP + 1;
        const x0 = cx * CHUNK, z0 = cz * CHUNK;
        const H = new Float32Array((n + 2) * (n + 2));
        const S = [];
        // heights with a one-sample border for slopes
        for (let j = -1; j <= n; j++) {
            for (let i = -1; i <= n; i++) {
                const x = x0 + i * STEP, z = z0 + j * STEP;
                const s = W.sample(x, z);
                H[(j + 1) * (n + 2) + (i + 1)] = s.h;
                if (i >= 0 && j >= 0 && i < n && j < n) S.push(s);
            }
        }
        const pos = new Float32Array(n * n * 3);
        const col = new Float32Array(n * n * 3);
        let k = 0;
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const x = x0 + i * STEP, z = z0 + j * STEP;
                const h = H[(j + 1) * (n + 2) + (i + 1)];
                const dx = H[(j + 1) * (n + 2) + (i + 2)] - H[(j + 1) * (n + 2) + i];
                const dz = H[(j + 2) * (n + 2) + (i + 1)] - H[j * (n + 2) + (i + 1)];
                const ny = (2 * STEP) / Math.hypot(dx, 2 * STEP, dz);
                const c = this.groundColour(x, z, S[k], ny);
                pos.set([x, h, z], k * 3);
                col.set([c.r, c.g, c.b], k * 3);
                k++;
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
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(n * n), 1));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, this.mats.terrain);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return { mesh, flora: this.scatter(cx, cz) };
    }

    // ---------- plants ----------
    scatter(cx, cz) {
        const W = this.world;
        const rand = mulberry32(((cx * 73856093) ^ (cz * 19349663) ^ (W.seed * 83492791)) >>> 0);
        const ha = (CHUNK * CHUNK) / 10000;
        const out = {};
        const trunks = [];
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        for (const [kind, max] of Object.entries(MAXD)) {
            const N = Math.round(max * ha);
            const proto = PROTOS[kind];
            for (let i = 0; i < N; i++) {
                const x = (cx + rand()) * CHUNK, z = (cz + rand()) * CHUNK;
                const roll = rand(), v = Math.floor(rand() * VARIANTS), hr = rand(), rot = rand() * Math.PI * 2;
                const c = W.cellAt(x, z);
                if (!c) continue;
                const d = (DENSITY[c.terrain] || {})[kind] || 0;
                if (roll * max >= d) continue;
                const s = W.sample(x, z);
                // nothing grows in open water; horsetails and mangroves stand in the shallows
                const wet = kind === 'horsetails' || kind === 'mangrove';
                if (s.water !== null && s.h < s.water - (wet ? 1.2 : -0.2)) continue;
                if (s.river && s.river.edge < (wet ? -1 : 1.5)) continue;
                const h = proto.h[0] + (proto.h[1] - proto.h[0]) * hr;
                q.setFromAxisAngle(up, rot);
                const sc = kind === 'log' ? new THREE.Vector3(h, h, h) : new THREE.Vector3(h * (0.9 + hr * 0.2), h, h * (0.9 + hr * 0.2));
                m.compose(new THREE.Vector3(x, s.h - (kind === 'rock' ? h * 0.15 : 0.15), z), q, sc);
                const key = `${kind}:${v}`;
                (out[key] || (out[key] = [])).push(m.clone());
                if (proto.trunk) trunks.push({ x, z, r: Math.max(0.5, proto.trunk * h * 1.3) });
                else if (proto.solid) trunks.push({ x, z, r: proto.solid * h });
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
            for (const [pk, mats] of Object.entries(ch.flora)) {
                const kind = pk.split(':')[0];
                if (!PROTOS[kind].far && dist > NEAR_KINDS) continue;
                for (const mm of mats) {
                    const near = Math.hypot(mm.elements[12] - px, mm.elements[14] - pz) < SHADOW_R;
                    const k = `${pk}|${near ? 'n' : 'f'}`;
                    (lists[k] || (lists[k] = [])).push(mm);
                }
            }
        }
        for (const [k, inst] of Object.entries(this.instanced)) if (!lists[k]) inst.count = 0;
        for (const [k, mats] of Object.entries(lists)) {
            let inst = this.instanced[k];
            if (!inst || inst.instanceMatrix.count < mats.length) {
                if (inst) { this.scene.remove(inst); inst.dispose(); }
                const [pk, band] = k.split('|');
                const [kind, v] = pk.split(':');
                inst = new THREE.InstancedMesh(this.protos[kind][Number(v)], this.mats.terrain, Math.ceil(mats.length * 1.4) + 32);
                inst.castShadow = band === 'n' && (PROTOS[kind].far || kind === 'cycad' || kind === 'bigFern');
                inst.receiveShadow = true;
                inst.frustumCulled = false;
                this.scene.add(inst);
                this.instanced[k] = inst;
            }
            mats.forEach((mm, i) => inst.setMatrixAt(i, mm));
            inst.count = mats.length;
            inst.instanceMatrix.needsUpdate = true;
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
            this.chunks.set(`${w.cx},${w.cz}`, this.buildChunk(w.cx, w.cz));
            this.dirty = true;
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
