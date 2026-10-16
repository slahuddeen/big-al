// ==================== VORONOI WORLD GENERATION ====================
// Builds a finite Late-Jurassic Morrison basin out of irregular Voronoi cells:
//  * Sevier highlands and volcanoes in the west, the Sundance Sea to the north/east
//  * terraced elevation (cells sit on discrete levels, so cliffs form naturally)
//  * rivers spring in the uplands and run downhill to lakes or the sea, merging on
//    the way; their courses are smooth splines that are cut into per-cell pieces
//  * biomes from elevation, moisture and patchy variation noise
//  * sauropod migration trails between watering spots
import { Delaunay } from 'd3-delaunay';
import { createNoise2D, fbm, mulberry32, smoothstep } from './noise.js';

export const WORLD_W = 104;
export const WORLD_H = 88;
export const CELL_SPACING = 2.15;
export const LEVELS = 10;
export const SEA_WATER_Y = 0.12;
export const SEA_FLOOR_Y = -0.5;
export const levelHeight = (level) => 0.3 + (level - 1) * 0.24;

const DEEP_RIVER_FLOW = 7;

const polygonCentroid = (poly) => {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % poly.length];
        const f = x0 * y1 - x1 * y0;
        a += f;
        cx += (x0 + x1) * f;
        cy += (y0 + y1) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-9) return poly[0];
    return [cx / (6 * a), cy / (6 * a)];
};

const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
};

// Catmull-Rom through control points, sampled every `step` units
const sampleSpline = (ctrl, step = 0.12) => {
    const out = [];
    const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
    for (let i = 0; i < ctrl.length - 1; i++) {
        const p0 = P(i - 1);
        const p1 = P(i);
        const p2 = P(i + 1);
        const p3 = P(i + 2);
        const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const n = Math.max(2, Math.ceil(len / step));
        for (let k = 0; k < n; k++) {
            const t = k / n;
            const t2 = t * t;
            const t3 = t2 * t;
            const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push({
                x: cr(p0.x, p1.x, p2.x, p3.x),
                z: cr(p0.z, p1.z, p2.z, p3.z),
                w: p1.w + (p2.w - p1.w) * t
            });
        }
    }
    const last = ctrl[ctrl.length - 1];
    out.push({ x: last.x, z: last.z, w: last.w });
    let s = 0;
    for (let i = 0; i < out.length; i++) {
        if (i > 0) s += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z);
        out[i].s = s;
    }
    return out;
};

const worldCache = new Map();
export const getWorld = (seed) => {
    if (!worldCache.has(seed)) {
        worldCache.clear();
        worldCache.set(seed, generateWorld(seed));
    }
    return worldCache.get(seed);
};

export const generateWorld = (seed) => {
    const rand = mulberry32(seed);
    const W = WORLD_W;
    const H = WORLD_H;
    const S = CELL_SPACING;

    // ---------- points: jittered hex lattice + one Lloyd relaxation ----------
    let pts = [];
    const rowH = (S * Math.sqrt(3)) / 2;
    for (let row = 0; S * 0.5 + row * rowH < H; row++) {
        for (let col = 0; S * 0.5 + col * S + (row % 2) * S * 0.5 < W; col++) {
            pts.push([
                Math.min(W - 0.01, Math.max(0.01, S * 0.5 + col * S + (row % 2) * S * 0.5 + (rand() - 0.5) * S * 0.75)),
                Math.min(H - 0.01, Math.max(0.01, S * 0.5 + row * rowH + (rand() - 0.5) * S * 0.75))
            ]);
        }
    }
    let delaunay = Delaunay.from(pts);
    let voronoi = delaunay.voronoi([0, 0, W, H]);
    pts = pts.map((_, i) => polygonCentroid(voronoi.cellPolygon(i).slice(0, -1)));
    delaunay = Delaunay.from(pts);
    voronoi = delaunay.voronoi([0, 0, W, H]);

    const cells = pts.map(([x, z], i) => {
        const poly = voronoi.cellPolygon(i).slice(0, -1);
        const border = poly.some(([px, pz]) => px < 0.01 || pz < 0.01 || px > W - 0.01 || pz > H - 0.01);
        return {
            id: i, key: String(i), x, z, poly, border,
            neighborIds: [...voronoi.neighbors(i)],
            waterways: [], level: 1, terrain: 'plains'
        };
    });
    for (const c of cells) {
        c.neighbors = c.neighborIds.map(String);
        // which neighbour sits across each polygon edge
        c.edges = c.poly.map((a, k) => {
            const b = c.poly[(k + 1) % c.poly.length];
            const mx = (a[0] + b[0]) / 2;
            const mz = (a[1] + b[1]) / 2;
            const d0 = Math.hypot(mx - c.x, mz - c.z);
            let best = null;
            let bestErr = 0.35;
            for (const nid of c.neighborIds) {
                const n = cells[nid];
                const err = Math.abs(Math.hypot(mx - n.x, mz - n.z) - d0);
                if (err < bestErr) {
                    bestErr = err;
                    best = nid;
                }
            }
            return { a, b, n: best };
        });
        c.inradius = Math.min(...c.edges.map((e) => segDist(c.x, c.z, e.a[0], e.a[1], e.b[0], e.b[1])));
    }

    // ---------- elevation ----------
    const nE = createNoise2D(seed + 11);
    const nR = createNoise2D(seed + 23);
    const nM = createNoise2D(seed + 37);
    const nV = createNoise2D(seed + 41);
    const nV2 = createNoise2D(seed + 53);
    for (const c of cells) {
        const nx = c.x / W;
        const ny = c.z / H;
        let e = 0.5 + 0.5 * fbm(nE, c.x * 0.032, c.z * 0.032, 5);
        const ridge = Math.pow(1 - Math.abs(fbm(nR, c.x * 0.045, c.z * 0.045, 3)), 4);
        e += ridge * 0.38 * smoothstep(0.75, 0.15, nx);
        e += smoothstep(0.32, 0.0, nx) * 0.42; // Sevier highlands (west)
        e += smoothstep(0.7, 1.0, ny) * 0.16; // southern uplands
        e -= smoothstep(0.24, 0.0, ny) * 0.55; // Sundance Sea (north)
        e -= smoothstep(0.82, 1.0, nx) * 0.5; // eastern shore
        c.e = e;
        c.m = 0.5 + 0.55 * fbm(nM, c.x * 0.04 + 7, c.z * 0.04 - 3, 4) + smoothstep(0.55, 0.05, ny) * 0.12 - smoothstep(0.55, 1, ny) * 0.1 - smoothstep(0.3, 0.05, nx) * 0.05;
        c.v = 0.5 + 0.5 * fbm(nV, c.x * 0.09, c.z * 0.09, 2);
        c.v2 = 0.5 + 0.5 * fbm(nV2, c.x * 0.07 + 13, c.z * 0.07 + 5, 2);
    }
    // smooth once so terraces form coherent plateaus instead of speckle
    const smoothed = cells.map((c) => (c.e * 2 + c.neighborIds.reduce((s, n) => s + cells[n].e, 0) / c.neighborIds.length) / 3);
    cells.forEach((c, i) => { c.e = smoothed[i]; });

    // ---------- sea (flood fill from the map edge below sea level) ----------
    const sortedE = cells.map((c) => c.e).sort((a, b) => a - b);
    const seaLevel = sortedE[Math.floor(sortedE.length * 0.2)];
    const queue = cells.filter((c) => c.border && c.e < seaLevel);
    queue.forEach((c) => { c.isSea = true; });
    while (queue.length) {
        const c = queue.shift();
        for (const n of c.neighborIds) {
            const nc = cells[n];
            if (!nc.isSea && nc.e < seaLevel) {
                nc.isSea = true;
                queue.push(nc);
            }
        }
    }
    // the outermost ring is always sea or highland, never open land that ends in a void
    for (const c of cells) if (c.border && !c.isSea && c.e < seaLevel + 0.08) c.isSea = true;

    const land = cells.filter((c) => !c.isSea);
    const landSorted = land.map((c) => c.e).sort((a, b) => a - b);
    const rank = (e) => {
        let lo = 0;
        let hi = landSorted.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (landSorted[mid] < e) lo = mid + 1;
            else hi = mid;
        }
        return lo / landSorted.length;
    };
    for (const c of land) {
        const q = rank(c.e);
        c.level = Math.max(1, Math.min(LEVELS, 1 + Math.floor(Math.pow(q, 1.7) * LEVELS)));
        if (c.e < seaLevel - 0.025) c.isLake = true; // inland depression
        else if (c.e < seaLevel) c.lowland = true;
        if (c.neighborIds.some((n) => cells[n].isSea)) {
            c.coast = true;
            c.level = Math.min(c.level, 2);
        }
    }
    for (const c of cells) if (c.isSea) c.level = 0;

    // ---------- rivers ----------
    const isWet = (c) => c.isSea || c.isLake;
    const springs = [];
    const candidates = land
        .filter((c) => c.level >= 4 && c.level <= 8 && !c.border)
        .map((c) => ({ c, score: c.m + rand() * 0.35 }))
        .sort((a, b) => b.score - a.score);
    const targetSprings = Math.max(10, Math.min(30, Math.round(land.length / 85)));
    for (const { c } of candidates) {
        if (springs.length >= targetSprings) break;
        if (springs.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < S * 6)) continue;
        springs.push(c);
    }
    const paths = [];
    for (const spring of springs) {
        if (spring.down !== undefined || spring.riverPath) continue;
        const path = [spring];
        const seen = new Set([spring.id]);
        let cur = spring;
        let terminal = null;
        for (let step = 0; step < 90; step++) {
            const opts = cur.neighborIds.map((n) => cells[n]).filter((n) => !seen.has(n.id) && n.level <= cur.level);
            if (!opts.length) {
                // local minimum: pool into a lake
                if (!isWet(cur)) cur.isLake = true;
                terminal = 'lake';
                break;
            }
            opts.sort((a, b) => (a.level - b.level) || (a.e - b.e));
            const next = opts[0];
            path.push(next);
            seen.add(next.id);
            if (cur.down === undefined) cur.down = next.id;
            if (isWet(next)) { terminal = next.isSea ? 'sea' : 'lake'; break; }
            if (next.riverPath) { terminal = 'join'; break; }
            next.riverPath = true;
            cur = next;
        }
        spring.riverPath = true;
        if (path.length < 3) continue;
        path.forEach((c) => { c.riverPath = true; });
        paths.push({ cells: path, terminal, dry: spring.m < 0.42 });
    }
    // flow accumulation along the down pointers
    const ups = new Map();
    for (const c of cells) if (c.down !== undefined) {
        if (!ups.has(c.down)) ups.set(c.down, []);
        ups.get(c.down).push(c.id);
    }
    const flowMemo = new Map();
    const flowOf = (id, depth = 0) => {
        if (flowMemo.has(id)) return flowMemo.get(id);
        if (depth > 400) return 1;
        const f = 1 + (ups.get(id) || []).reduce((s, u) => s + (cells[u].riverPath ? flowOf(u, depth + 1) : 0), 0);
        flowMemo.set(id, f);
        return f;
    };
    // a little lake around local-minimum basins
    for (const c of land) {
        if (c.isLake && !c.isSea) {
            for (const n of c.neighborIds) {
                const nc = cells[n];
                if (!nc.isSea && !nc.riverPath && nc.level === c.level && rand() < 0.25) nc.isLake = true;
            }
        }
    }
    const lakeLevel = (c) => Math.min(c.level, ...c.neighborIds.map((n) => cells[n]).filter((n) => !n.isSea).map((n) => n.level));
    for (const c of land) if (c.isLake) c.level = Math.max(1, lakeLevel(c));

    // ---------- waterway geometry: smooth splines cut into per-cell pieces ----------
    const meander = cells.map(() => ({ dx: (rand() - 0.5) * S * 0.36, dz: (rand() - 0.5) * S * 0.36 }));
    const find = (x, z, hint) => delaunay.find(x, z, hint);
    const addWaterway = (kind, samples, extra = {}) => {
        let cur = null;
        let curCell = -1;
        const flush = (end) => {
            if (cur && cur.pts.length >= 2) {
                cur.end = end;
                cells[cur.cell].waterways.push(cur);
            }
        };
        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const ci = find(s.x, s.z, curCell >= 0 ? curCell : 0);
            if (ci !== curCell) {
                if (cur) {
                    const prev = samples[i - 1];
                    const cross = { x: (prev.x + s.x) / 2, z: (prev.z + s.z) / 2, w: (prev.w + s.w) / 2, s: (prev.s + s.s) / 2 };
                    cur.pts.push(cross);
                    cur.exitTo = ci;
                    flush(false);
                    cur = { kind, cell: ci, pts: [cross], enterFrom: curCell, ...extra };
                } else {
                    cur = { kind, cell: ci, pts: [], start: true, ...extra };
                }
                curCell = ci;
            }
            cur.pts.push(s);
        }
        flush(true);
    };
    for (const p of paths) {
        const ctrl = p.cells.map((c, i) => {
            const terminalCell = i === p.cells.length - 1;
            const flow = flowOf(c.id);
            const w = p.dry ? 0.32 : Math.min(0.62, 0.12 + 0.06 * Math.sqrt(flow));
            const m = terminalCell && isWet(c) ? { dx: 0, dz: 0 } : meander[c.id];
            return { x: c.x + m.dx, z: c.z + m.dz, w, flow };
        });
        const samples = sampleSpline(ctrl, 0.12);
        // springs start as a trickle and widen
        for (const s of samples) s.w *= 0.25 + 0.75 * smoothstep(0, 2.2, s.s);
        addWaterway(p.dry ? 'dry' : 'river', samples);
    }

    // which cells actually carry water (the spline may clip a corner of a neighbour)
    for (const c of cells) {
        if (c.isSea || c.isLake) continue;
        let len = 0;
        let maxW = 0;
        let dry = true;
        for (const w of c.waterways) {
            for (let i = 1; i < w.pts.length; i++) len += Math.hypot(w.pts[i].x - w.pts[i - 1].x, w.pts[i].z - w.pts[i - 1].z);
            maxW = Math.max(maxW, ...w.pts.map((p) => p.w));
            if (w.kind === 'river') dry = false;
        }
        if (len > 0.45) {
            c.water = dry ? 'dry' : maxW >= 0.12 + 0.06 * Math.sqrt(DEEP_RIVER_FLOW) ? 'river' : 'stream';
        }
    }

    // ---------- moisture boost near water ----------
    for (const c of land) {
        const wetNear = c.water && c.water !== 'dry' ? 0.12 : 0;
        const nWet = c.neighborIds.some((n) => cells[n].isLake || (cells[n].water && cells[n].water !== 'dry')) ? 0.08 : 0;
        const sea = c.coast ? 0.06 : 0;
        c.m = Math.min(1, c.m + wetNear + nWet + sea);
    }

    // ---------- biomes ----------
    const pick = (opts, t) => opts[Math.min(opts.length - 1, Math.floor(t * opts.length))];
    // volcanoes in the western highlands
    const volcanoCands = land.filter((c) => c.x / W < 0.36 && c.level >= 6 && !c.border).sort((a, b) => b.v2 - a.v2);
    const volcanoes = [];
    for (const c of volcanoCands) {
        if (volcanoes.length >= 2) break;
        if (volcanoes.some((v) => Math.hypot(v.x - c.x, v.z - c.z) < S * 10)) continue;
        volcanoes.push(c);
    }
    const volcanoDist = (c) => Math.min(99, ...volcanoes.map((v) => Math.hypot(v.x - c.x, v.z - c.z) / S));

    for (const c of cells) {
        if (c.isSea) { c.terrain = 'sea'; continue; }
        if (c.isLake) { c.terrain = 'lake'; continue; }
        if (c.water === 'river') { c.terrain = 'river'; continue; }
        if (c.water === 'stream') { c.terrain = 'stream'; continue; }
        if (c.water === 'dry') { c.terrain = 'dryriverbed'; continue; }
        const L = c.level;
        const m = c.m;
        const v = c.v;
        const nearRiver = c.neighborIds.some((n) => cells[n].water === 'river' || cells[n].water === 'stream' || cells[n].isLake);
        const vd = volcanoDist(c);
        let t;
        if (vd < 0.5) t = 'volcanic';
        else if (vd < 1.6) t = rand() < 0.6 ? 'lavafield' : 'deadforest';
        else if (vd < 2.6 && rand() < 0.5) t = pick(['deadforest', 'rocky', 'lavafield'], v);
        else if (L >= 9) t = 'mountains';
        else if (L === 8) t = v > 0.62 ? 'mountains' : m > 0.55 ? pick(['youngforest', 'boulderfield', 'hills'], c.v2) : pick(['rocky', 'boulderfield'], c.v2);
        else if (c.coast && L <= 2 && rand() < 0.75) t = m > 0.7 ? 'marsh' : 'beach';
        else if (c.lowland && m > 0.5) t = 'marsh';
        else if (L >= 6) t = m > 0.58 ? pick(['youngforest', 'hills', 'forest'], v) : m > 0.42 ? pick(['hills', 'hills', 'rocky'], v) : pick(['rocky', 'boulderfield', 'badlands'], v);
        else if (m < 0.3) t = L >= 4 ? pick(['mesa', 'badlands', 'badlands'], v) : pick(['desert', 'desert', 'steppe', 'badlands'], v);
        else if (m < 0.38) t = L >= 4 ? pick(['badlands', 'steppe', 'mesa'], v) : pick(['steppe', 'plains', 'savanna', 'fernsavanna', 'termitemounds'], v);
        else if (m < 0.46) t = pick(['plains', 'fernprairie', 'savanna', 'scrubland', 'fernsavanna'], v);
        else if (m < 0.54) t = pick(['fernprairie', 'katydidmeadow', 'forestedge', 'openwoods', 'ginkgogrove'], v);
        else if (m < 0.62) t = pick(['forestedge', 'forest', 'youngforest', 'ginkgogrove', 'openwoods'], v);
        else if (m < 0.7) t = pick(['forest', 'denseforest', 'oldgrowth', 'youngforest'], v);
        else t = L <= 2 && nearRiver ? pick(['marsh', 'jungle'], v) : pick(['jungle', 'oldgrowth', 'denseforest'], v);

        // river-side variety: where forest meets a river it becomes gallery forest
        if (nearRiver && !['volcanic', 'lavafield', 'mountains'].includes(t)) {
            const r = rand();
            const forested = ['forest', 'denseforest', 'oldgrowth', 'jungle', 'youngforest', 'openwoods', 'ginkgogrove', 'forestedge'].includes(t);
            if ((forested && r < 0.8) || (m > 0.48 && r < 0.4)) t = 'galleryforest';
            else if (L <= 3 && r < 0.6) t = pick(['floodplain', 'riverbank', 'floodplain'], c.v2);
            else if (m < 0.4 && r < 0.7) t = 'riverbank';
        }
        // rare features
        const r2 = rand();
        if (t === 'desert' && r2 < 0.05) t = 'quicksand';
        else if (['plains', 'steppe', 'fernsavanna', 'savanna'].includes(t) && r2 < 0.035) t = 'waterhole';
        else if (['forest', 'youngforest', 'oldgrowth'].includes(t) && r2 < 0.05) t = 'deadfall';
        else if (['plains', 'fernprairie', 'openwoods', 'forestedge', 'katydidmeadow'].includes(t) && r2 < 0.012) t = 'nest';
        c.terrain = t;
    }

    // ---------- sauropod migration trails ----------
    const passCost = (c) => (c.isSea || c.terrain === 'mountains' || c.terrain === 'volcanic' || c.terrain === 'lake') ? Infinity : 1 + (c.level > 4 ? 2 : 0) + (c.terrain.includes('forest') || c.terrain === 'jungle' || c.terrain === 'oldgrowth' ? 1.5 : 0);
    const shortest = (a, b) => {
        const dist = new Map([[a.id, 0]]);
        const prev = new Map();
        const open = [[0, a.id]];
        while (open.length) {
            open.sort((x, y) => x[0] - y[0]);
            const [d, id] = open.shift();
            if (id === b.id) break;
            if (d > dist.get(id)) continue;
            for (const n of cells[id].neighborIds) {
                const nc = cells[n];
                const step = passCost(nc) + Math.abs(nc.level - cells[id].level) * 2;
                if (!isFinite(step)) continue;
                const nd = d + step;
                if (nd < (dist.get(n) ?? Infinity)) {
                    dist.set(n, nd);
                    prev.set(n, id);
                    open.push([nd, n]);
                }
            }
        }
        if (!prev.has(b.id)) return null;
        const out = [];
        for (let id = b.id; id !== undefined; id = prev.get(id)) out.unshift(cells[id]);
        return out;
    };
    const waterSpots = land.filter((c) => (c.terrain === 'waterhole' || c.isLake) && c.level <= 4);
    const trailPairs = [];
    for (let i = 0; i < 6 && waterSpots.length > 1 && trailPairs.length < 3; i++) {
        const a = waterSpots[Math.floor(rand() * waterSpots.length)];
        const b = waterSpots.filter((o) => Math.hypot(o.x - a.x, o.z - a.z) > W * 0.3).sort(() => rand() - 0.5)[0];
        if (b) trailPairs.push([a, b]);
    }
    for (const [a, b] of trailPairs) {
        const route = shortest(a, b);
        if (!route || route.length < 6) continue;
        for (const c of route) {
            if (!c.isLake && !c.water && !['waterhole', 'nest'].includes(c.terrain)) c.terrain = 'sauropodgrounds';
        }
        const ctrl = route.map((c) => ({ x: c.x + meander[c.id].dx * 0.6, z: c.z + meander[c.id].dz * 0.6, w: 0.5 }));
        addWaterway('trail', sampleSpline(ctrl, 0.15));
    }

    // ---------- the nest where Big Al hatches ----------
    const startable = ['fernprairie', 'katydidmeadow', 'forestedge', 'openwoods', 'plains', 'floodplain'];
    const centre = { x: W * 0.55, z: H * 0.58 };
    const spawn = land
        .filter((c) => startable.includes(c.terrain) && c.level <= 4 && !c.border)
        .sort((a, b) => Math.hypot(a.x - centre.x, a.z - centre.z) - Math.hypot(b.x - centre.x, b.z - centre.z))[0] || land[0];
    spawn.terrain = 'nest';
    for (const n of spawn.neighborIds) {
        const nc = cells[n];
        if (nc.terrain === 'river') nc.terrain = 'stream'; // a shallow ford next to the nest
        if (['mountains', 'volcanic', 'quicksand', 'lavafield', 'sea'].includes(nc.terrain)) nc.terrain = 'fernprairie';
    }

    const byKey = new Map(cells.map((c) => [c.key, c]));
    return {
        seed, W, H, spacing: S, cells, byKey, delaunay, spawnKey: spawn.key,
        cellAt: (x, z, hint = 0) => {
            if (x < 0 || z < 0 || x > W || z > H) return null;
            return cells[delaunay.find(x, z, hint)];
        }
    };
};
