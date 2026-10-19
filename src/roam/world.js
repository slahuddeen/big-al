// ==================== THE KEM KEM AT REAL SCALE ====================
// The same Voronoi world the map game uses, blown up to 20 m per map unit, so a cell is
// about 45 m across and the whole basin about 2 by 1.8 km. Cells keep their terrace
// levels, but the steps between them become slopes you can walk, rivers are carved into
// channels wide and deep enough to swim, and the sea and lakes fill their basins.
import { generateWorld } from '../world/worldGen.js';
import { cellSurfaceY, cellWaterY } from '../three/cells3d.js';
import { createNoise2D } from '../world/noise.js';
import { mulberry32 } from '../three/lowpoly.js';

export const M = 20; // metres per map unit
const RIVER_WIDEN = 2.6; // channels are drawn wider than the map's ribbons, for a 9 m swimmer
const CLIFFY = new Set(['mountains', 'mesa', 'badlands', 'rocky']);
const SEA_LIKE = new Set(['sea']);
// pools and ponds per cell: [chance of a first one, most there can be, radius range in metres, depth]
const PONDS = {
    marsh: [1, 4, [5, 13], 1.1], waterhole: [1, 1, [16, 26], 2.6], mangrove: [1, 3, [6, 14], 1.4],
    floodplain: [0.8, 2, [8, 18], 1.8], riverbank: [0.45, 1, [7, 14], 1.6], galleryforest: [0.5, 1, [8, 16], 2],
    jungle: [0.45, 1, [6, 12], 1.6], stream: [0.5, 1, [6, 12], 1.4], denseforest: [0.3, 1, [6, 11], 1.4],
    plains: [0.3, 1, [9, 18], 2], fernprairie: [0.35, 1, [8, 15], 1.8], openwoods: [0.35, 1, [8, 15], 1.8],
    forest: [0.25, 1, [7, 13], 1.6], savanna: [0.25, 1, [10, 18], 2], sauropodgrounds: [0.6, 1, [12, 22], 1.6],
    scrubland: [0.12, 1, [6, 10], 1.2], hills: [0.12, 1, [7, 12], 1.6], deadfall: [0.3, 1, [6, 12], 1.4]
};

const segDist = (px, pz, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L2));
    return { d: Math.hypot(px - a.x - dx * t, pz - a.z - dz * t), t };
};

export class RoamWorld {
    constructor(seed) {
        this.seed = seed;
        this.map = generateWorld(seed);
        const map = this.map;
        this.width = map.W * M;
        this.depth = map.H * M;
        this.noise = createNoise2D(seed * 13 + 7);
        this.noise2 = createNoise2D(seed * 31 + 3);
        // per-cell heights in metres
        for (const c of map.cells) {
            c.baseM = cellSurfaceY(c) * M;
            const w = cellWaterY(c);
            c.waterM = w === null ? null : w * M;
            c.sigma = CLIFFY.has(c.terrain) ? 0.1 : 0.26; // how soft the step to the neighbours is (map units)
        }
        this.seaLevel = map.cells.find((c) => c.terrain === 'sea')?.waterM ?? 2.4;
        // river segments in metres, bucketed on a coarse grid for distance queries
        this.bucket = 40;
        this.rivers = new Map();
        this.dry = new Map();
        this.trails = new Map();
        this.riverLines = [];
        for (const c of map.cells) {
            for (const ww of c.waterways || []) {
                const pts = ww.pts.map((p) => ({ x: p.x * M, z: p.z * M, w: p.w * M * (ww.kind === 'river' ? RIVER_WIDEN : 1) }));
                const target = ww.kind === 'river' ? this.rivers : ww.kind === 'dry' ? this.dry : this.trails;
                if (ww.kind === 'river') this.riverLines.push(pts);
                for (let i = 0; i < pts.length - 1; i++) {
                    const seg = { a: pts[i], b: pts[i + 1] };
                    const r = Math.max(pts[i].w, pts[i + 1].w) + 14;
                    const x0 = Math.floor((Math.min(seg.a.x, seg.b.x) - r) / this.bucket), x1 = Math.floor((Math.max(seg.a.x, seg.b.x) + r) / this.bucket);
                    const z0 = Math.floor((Math.min(seg.a.z, seg.b.z) - r) / this.bucket), z1 = Math.floor((Math.max(seg.a.z, seg.b.z) + r) / this.bucket);
                    for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) {
                        const k = `${bx},${bz}`;
                        if (!target.has(k)) target.set(k, []);
                        target.get(k).push(seg);
                    }
                }
            }
        }
        this.hint = 0;
        this.makePonds();
        const spawn = map.byKey.get(map.spawnKey);
        this.spawn = { x: spawn.x * M, z: spawn.z * M };
    }

    // scatter ponds through the wetter and greener cells, each a lobed basin whose water
    // sits just below the lowest point of its rim, so it never spills over a slope
    makePonds() {
        this.ponds = [];
        this.pondBuckets = new Map();
        const sp = this.map.byKey.get(this.map.spawnKey);
        for (const c of this.map.cells) {
            const def = PONDS[c.terrain];
            if (!def) continue;
            const rand = mulberry32((c.id * 2654435761 + this.seed * 97) >>> 0);
            let n = 0;
            for (let k = 0; k < def[1]; k++) if (rand() < (k === 0 ? def[0] : 0.55)) n++;
            for (let k = 0; k < n; k++) {
                const R = def[2][0] + (def[2][1] - def[2][0]) * rand();
                const off = rand() * 14, a = rand() * Math.PI * 2;
                const x = c.x * M + Math.cos(a) * off, z = c.z * M + Math.sin(a) * off;
                if (sp && Math.hypot(x - sp.x * M, z - sp.z * M) < R + 14) continue;
                const lobes = [rand() * 6, rand() * 6, 0.12 + rand() * 0.12, 0.06 + rand() * 0.08];
                const pond = { x, z, R, lobes, depth: def[3] * (0.8 + rand() * 0.4), terrain: c.terrain };
                const r = this.nearest(this.rivers, x, z);
                if (r && r.edge < R * 1.3 + 8) continue;
                if (this.ponds.some((o) => Math.hypot(o.x - x, o.z - z) < o.R * 1.3 + R * 1.3 + 4)) continue;
                // the water level: under the lowest point of the rim
                let rim = Infinity, ok = true;
                for (let i = 0; i < 12; i++) {
                    const t = i / 12 * Math.PI * 2;
                    const rr = this.pondRadius(pond, t) + 3;
                    const bx = x + Math.cos(t) * rr, bz = z + Math.sin(t) * rr;
                    const cc = this.cellAt(bx, bz);
                    if (!cc || cc.waterM !== null || CLIFFY.has(cc.terrain)) { ok = false; break; }
                    rim = Math.min(rim, this.base(bx, bz) + this.noise(bx / 70, bz / 70) * 0.9 - 0.9);
                }
                if (!ok || rim < this.seaLevel + 0.5) continue;
                pond.surface = rim - 0.35;
                this.ponds.push(pond);
                const reach = R * 1.4 + 6;
                for (let bx = Math.floor((x - reach) / this.bucket); bx <= Math.floor((x + reach) / this.bucket); bx++) {
                    for (let bz = Math.floor((z - reach) / this.bucket); bz <= Math.floor((z + reach) / this.bucket); bz++) {
                        const key = `${bx},${bz}`;
                        if (!this.pondBuckets.has(key)) this.pondBuckets.set(key, []);
                        this.pondBuckets.get(key).push(pond);
                    }
                }
            }
        }
    }

    pondRadius(p, a) {
        return p.R * (1 + Math.sin(a * 2 + p.lobes[0]) * p.lobes[2] + Math.sin(a * 3 + p.lobes[1]) * p.lobes[3]);
    }

    // the pond whose basin covers (x, z), with the distance to its edge as a fraction
    pondAt(x, z) {
        const list = this.pondBuckets.get(`${Math.floor(x / this.bucket)},${Math.floor(z / this.bucket)}`);
        if (!list) return null;
        for (const p of list) {
            const dx = x - p.x, dz = z - p.z;
            const d = Math.hypot(dx, dz);
            if (d > p.R * 1.4 + 6) continue;
            const r = this.pondRadius(p, Math.atan2(dz, dx));
            if (d < r + 6) return { pond: p, d, r };
        }
        return null;
    }

    cellAt(x, z) {
        const c = this.map.cellAt(x / M, z / M, this.hint);
        if (c) this.hint = c.id;
        return c;
    }

    // nearest segment of a line set (rivers, dry channels, trails) within range
    nearest(lines, x, z) {
        const list = lines.get(`${Math.floor(x / this.bucket)},${Math.floor(z / this.bucket)}`);
        if (!list) return null;
        let best = null;
        for (const s of list) {
            const { d, t } = segDist(x, z, s.a, s.b);
            const w = s.a.w + (s.b.w - s.a.w) * t;
            const edge = d - w * 0.5;
            if (!best || edge < best.edge) best = { d, w, edge };
        }
        return best;
    }

    // terrace height without carving or noise: the cell's level, blended softly into its
    // neighbours near the borders so the steps become walkable slopes
    base(x, z) {
        const c = this.cellAt(x, z);
        if (!c) return -12;
        const u = x / M, v = z / M;
        const cells = this.map.cells;
        const d0 = Math.hypot(c.x - u, c.z - v);
        let sw = 1, sh = c.baseM;
        for (const n of c.neighborIds) {
            const nc = cells[n];
            const dd = Math.hypot(nc.x - u, nc.z - v) - d0;
            const s = Math.min(c.sigma, nc.sigma);
            const w = Math.exp(-(dd / s) * (dd / s));
            sw += w;
            sh += w * nc.baseM;
        }
        return sh / sw;
    }

    // everything about one spot: ground height, water surface (or null) and what lies there
    sample(x, z) {
        const c = this.cellAt(x, z);
        if (!c) return { h: -12, water: this.seaLevel, cell: null, river: null, micro: 0, relief: 0, pond: null };
        const b = this.base(x, z);
        // gentle undulation and per-biome bumpiness
        const sea = SEA_LIKE.has(c.terrain);
        const rough = CLIFFY.has(c.terrain) || c.terrain === 'hills' || c.terrain === 'boulderfield' ? 2.2 : sea || c.terrain === 'lake' ? 0.4 : 0.9;
        const relief = rough * 0.32;
        const micro = this.micro(x, z) * relief;
        let h = b + this.noise(x / 70, z / 70) * rough + this.noise2(x / 18, z / 18) * rough * 0.35 + micro;
        let water = null;
        let river = null;
        // lakes and the sea fill their basins
        if (c.waterM !== null) water = c.waterM;
        else if (b < this.seaLevel - 0.5) water = this.seaLevel;
        // carved river channels
        const r = this.nearest(this.rivers, x, z);
        if (r && r.edge < 10) {
            const half = r.w * 0.5;
            const surface = b - 0.7;
            const depth = 1.6 + r.w * 0.16;
            const t = Math.min(1, r.d / half);
            const bed = surface - depth * (1 - t * t);
            const bankUp = surface + 0.3 + Math.max(0, r.edge) * 0.45;
            h = Math.min(h, r.d < half ? bed : bankUp);
            if (r.d < half + 1.5) water = Math.max(water ?? -Infinity, surface);
            river = { d: r.d, w: r.w, edge: r.edge };
        }
        // ponds: a bowl under the water, a gentle bank around it
        const pa = this.pondAt(x, z);
        if (pa) {
            const { pond, d, r } = pa;
            if (d < r) {
                const t = d / r;
                h = Math.min(h, pond.surface - 0.25 - pond.depth * (1 - t * t));
            } else h = Math.min(h, pond.surface + 0.15 + (d - r) * 0.35);
            if (d < r + 0.6) water = pond.surface;
        }
        const dry = this.nearest(this.dry, x, z);
        if (dry && dry.edge < 3) h = Math.min(h, b - 1.2 * (1 - Math.min(1, Math.max(0, dry.edge + dry.w * 0.5) / (dry.w * 0.5 + 3))));
        return { h, water, cell: c, river, base: b, micro, relief, pond: pa && pa.d < pa.r + 0.6 ? pa.pond : null };
    }

    // fine relief, a metre or two across: drawn only near the player, felt everywhere
    micro(x, z) {
        return this.noise(x / 5.5 + 91.3, z / 5.5) * 0.75 + this.noise2(x / 2.3, z / 2.3 + 17.1) * 0.25;
    }

    height(x, z) {
        return this.sample(x, z).h;
    }

    // where an animal stands or floats here, and how deep the water is
    surface(x, z) {
        const s = this.sample(x, z);
        const depth = s.water !== null ? s.water - s.h : 0;
        return { ground: s.h, water: s.water, depth: Math.max(0, depth), cell: s.cell, river: s.river, pond: s.pond };
    }

    onTrail(x, z) {
        const t = this.nearest(this.trails, x, z);
        return t && t.edge < 0 ? 1 - Math.min(1, t.d / (t.w * 0.5 + 0.01)) : 0;
    }
}
