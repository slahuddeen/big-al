// ==================== THE KEM KEM AT REAL SCALE ====================
// The same Voronoi world the map game uses, blown up to 20 m per map unit, so a cell is
// about 45 m across and the whole basin about 2 by 1.8 km. Cells keep their terrace
// levels, but the steps between them become slopes you can walk, rivers are carved into
// channels wide and deep enough to swim, and the sea and lakes fill their basins.
import { generateWorld } from '../world/worldGen.js';
import { cellSurfaceY, cellWaterY } from '../three/cells3d.js';
import { createNoise2D } from '../world/noise.js';

export const M = 20; // metres per map unit
const RIVER_WIDEN = 2.6; // channels are drawn wider than the map's ribbons, for a 9 m swimmer
const CLIFFY = new Set(['mountains', 'mesa', 'badlands', 'rocky']);
const SEA_LIKE = new Set(['sea']);

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
        const spawn = map.byKey.get(map.spawnKey);
        this.spawn = { x: spawn.x * M, z: spawn.z * M };
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
        if (!c) return { h: -12, water: this.seaLevel, cell: null, river: null };
        const b = this.base(x, z);
        // gentle undulation and per-biome bumpiness
        const sea = SEA_LIKE.has(c.terrain);
        const rough = CLIFFY.has(c.terrain) || c.terrain === 'hills' || c.terrain === 'boulderfield' ? 2.2 : sea || c.terrain === 'lake' ? 0.4 : 0.9;
        let h = b + this.noise(x / 70, z / 70) * rough + this.noise2(x / 18, z / 18) * rough * 0.35;
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
        const dry = this.nearest(this.dry, x, z);
        if (dry && dry.edge < 3) h = Math.min(h, b - 1.2 * (1 - Math.min(1, Math.max(0, dry.edge + dry.w * 0.5) / (dry.w * 0.5 + 3))));
        return { h, water, cell: c, river, base: b };
    }

    height(x, z) {
        return this.sample(x, z).h;
    }

    // where an animal stands or floats here, and how deep the water is
    surface(x, z) {
        const s = this.sample(x, z);
        const depth = s.water !== null ? s.water - s.h : 0;
        return { ground: s.h, water: s.water, depth: Math.max(0, depth), cell: s.cell, river: s.river };
    }

    onTrail(x, z) {
        const t = this.nearest(this.trails, x, z);
        return t && t.edge < 0 ? 1 - Math.min(1, t.d / (t.w * 0.5 + 0.01)) : 0;
    }
}
