// Sculpted creature bodies. A body is a list of blended primitives (a signed distance
// field): round cones with elliptical cross-sections, ellipsoids and tori, added with a
// smooth union or carved away. It is meshed with surface nets, snapped back onto the exact
// surface, and painted per vertex by the species' paint function.
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smin = (a, b, k) => {
    if (k <= 0) return Math.min(a, b);
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
};

// an orthonormal frame with t along the axis, w as close to `side` as possible, v = t x w
const frame = (t, side = [0, 0, 1]) => {
    let s = sub(side, t.map((x) => x * dot(side, t)));
    if (len(s) < 1e-4) s = sub([0, 1, 0], t.map((x) => x * t[1]));
    if (len(s) < 1e-4) s = [1, 0, 0];
    const w = norm(s);
    return { t, w, v: cross(t, w) };
};

// Round cone from a (radius r1) to b (radius r2). `squash` scales the cross-section:
// [along w (the side direction), along v]. u runs 0..1 from a to b.
export function roundCone(a, b, r1, r2, { squash = [1, 1], side } = {}) {
    const ab = sub(b, a);
    const h = Math.max(len(ab), 1e-5);
    const f = frame(norm(ab), side);
    // keep the cone well-formed when the radii differ by more than the length
    const dr = clamp((r1 - r2) / h, -0.98, 0.98);
    const ca = Math.sqrt(1 - dr * dr);
    const [sw, sv] = squash;
    const scale = Math.min(1, sw, sv);
    const prim = { u: 0 };
    const [ax, ay, az] = a;
    const { t, w, v } = f;
    prim.dist = (x, y, z) => {
        const px = x - ax, py = y - ay, pz = z - az;
        const qy = px * t[0] + py * t[1] + pz * t[2];
        const qw = (px * w[0] + py * w[1] + pz * w[2]) / sw;
        const qv = (px * v[0] + py * v[1] + pz * v[2]) / sv;
        const qx = Math.sqrt(qw * qw + qv * qv);
        prim.u = clamp(qy / h, 0, 1);
        prim.ang = Math.atan2(qv, qw);
        const k = -dr * qx + ca * qy;
        let d;
        if (k < 0) d = Math.hypot(qx, qy) - r1;
        else if (k > ca * h) d = Math.hypot(qx, qy - h) - r2;
        else d = qx * ca + qy * dr - r1;
        return d * scale;
    };
    const rmax = Math.max(r1, r2) * Math.max(1, sw, sv);
    prim.bbox = [
        Math.min(a[0], b[0]) - rmax, Math.min(a[1], b[1]) - rmax, Math.min(a[2], b[2]) - rmax,
        Math.max(a[0], b[0]) + rmax, Math.max(a[1], b[1]) + rmax, Math.max(a[2], b[2]) + rmax
    ];
    prim.axis = t;
    return prim;
}

// Ellipsoid centred at c with radii r = [along dir, along up, along the third axis]
export function ellipsoid(c, r, { dir = [1, 0, 0], up = [0, 1, 0] } = {}) {
    const t = norm(dir);
    const f = frame(t, cross(t, norm(up)));
    // f.w is the third axis, f.v is the up axis
    const prim = { u: 0.5 };
    const [cx, cy, cz] = c;
    const [rx, ry, rz] = r;
    prim.dist = (x, y, z) => {
        const px = x - cx, py = y - cy, pz = z - cz;
        const lx = (px * t[0] + py * t[1] + pz * t[2]) / rx;
        const lz = (px * f.w[0] + py * f.w[1] + pz * f.w[2]) / rz;
        const ly = (px * f.v[0] + py * f.v[1] + pz * f.v[2]) / ry;
        prim.u = clamp(0.5 + lx * 0.5, 0, 1);
        const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
        const k1 = Math.sqrt((lx / rx) ** 2 + (ly / ry) ** 2 + (lz / rz) ** 2);
        return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
    };
    const m = Math.max(rx, ry, rz);
    prim.bbox = [cx - m, cy - m, cz - m, cx + m, cy + m, cz + m];
    prim.axis = t;
    return prim;
}

// Torus around axis n through c (major radius R, tube radius r)
export function torus(c, n, R, r) {
    const f = frame(norm(n));
    const prim = { u: 0.5 };
    prim.dist = (x, y, z) => {
        const p = [x - c[0], y - c[1], z - c[2]];
        const a = dot(p, f.t);
        const qa = dot(p, f.w), qb = dot(p, f.v);
        const q = Math.hypot(qa, qb) - R;
        prim.u = 0.5 + Math.atan2(qb, qa) / (Math.PI * 2);
        return Math.hypot(q, a) - r;
    };
    const m = R + r;
    prim.bbox = [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m];
    prim.axis = f.t;
    return prim;
}

export class Sculpt {
    constructor() {
        this.ops = [];
        this.extras = [];
    }

    // mode: 'add' (smooth union), 'cut' (smooth subtraction)
    push(prim, { k = 0.02, tag = 'body', mode = 'add', flow, ...data } = {}) {
        const op = { prim, k, tag, mode, flow: flow || prim.axis, data };
        const m = k + 1e-6;
        op.box = prim.bbox.map((v, i) => (i < 3 ? v - m : v + m));
        this.ops.push(op);
        return op;
    }

    cone(a, b, r1, r2, opts = {}) {
        return this.push(roundCone(a, b, r1, r2, opts), opts);
    }

    // a smooth tube through points with matching radii; u runs 0..1 over the whole chain.
    // The segments are joined exactly (consecutive round cones share the sphere at each
    // joint), so the tube doesn't bulge at the joints; the chain as a whole blends with k.
    chain(points, radii, opts = {}) {
        const n = points.length - 1;
        const starts = [];
        let total = 0;
        for (let i = 0; i < n; i++) {
            starts.push(total);
            total += len(sub(points[i + 1], points[i]));
        }
        const segs = [];
        for (let i = 0; i < n; i++) {
            const sq = typeof opts.squash === 'function' ? opts.squash(i / Math.max(1, n - 1)) : opts.squash;
            const seg = roundCone(points[i], points[i + 1], radii[i], radii[i + 1], { squash: sq || [1, 1], side: opts.side });
            seg.u0 = starts[i] / total;
            seg.u1 = (starts[i] + len(sub(points[i + 1], points[i]))) / total;
            segs.push(seg);
        }
        const prim = { u: 0, ang: 0 };
        prim.dist = (x, y, z) => {
            let best = 1e9, bi = 0;
            for (let i = 0; i < segs.length; i++) {
                const sg = segs[i];
                const b = sg.bbox;
                if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) {
                    // outside this segment's box: a cheap lower bound is enough to skip it
                    const dx = Math.max(b[0] - x, 0, x - b[3]), dy = Math.max(b[1] - y, 0, y - b[4]), dz = Math.max(b[2] - z, 0, z - b[5]);
                    if (Math.hypot(dx, dy, dz) > best) continue;
                }
                const d = sg.dist(x, y, z);
                if (d < best) { best = d; bi = i; prim.ang = sg.ang; prim.u = sg.u0 + sg.u * (sg.u1 - sg.u0); }
            }
            prim.seg = bi;
            return best;
        };
        prim.bbox = segs.reduce((b, sg) => [
            Math.min(b[0], sg.bbox[0]), Math.min(b[1], sg.bbox[1]), Math.min(b[2], sg.bbox[2]),
            Math.max(b[3], sg.bbox[3]), Math.max(b[4], sg.bbox[4]), Math.max(b[5], sg.bbox[5])
        ], [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
        prim.axis = norm(sub(points[n], points[0]));
        prim.segs = segs;
        const op = this.push(prim, { ...opts, k: opts.k ?? Math.min(...radii) * 0.6 });
        // fur flows along whichever segment is nearest
        op.flowAt = () => segs[prim.seg].axis;
        return op;
    }

    ellipsoid(c, r, opts = {}) {
        return this.push(ellipsoid(c, r, opts), opts);
    }

    torus(c, n, R, r, opts = {}) {
        return this.push(torus(c, n, R, r), opts);
    }

    // separate meshes that ride along (eyes, claws, teeth, feathers)
    extra(obj) {
        this.extras.push(obj);
        return obj;
    }

    bounds() {
        const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        this.ops.forEach((op) => {
            if (op.mode !== 'add') return;
            for (let i = 0; i < 3; i++) {
                b[i] = Math.min(b[i], op.box[i]);
                b[i + 3] = Math.max(b[i + 3], op.box[i + 3]);
            }
        });
        return b;
    }

    // exact field value at a point, with the primitives that shape it (for painting)
    evaluate(x, y, z, cands) {
        let d = 1e9;
        if (cands) cands.length = 0;
        for (let i = 0; i < this.ops.length; i++) {
            const op = this.ops[i];
            const b = op.box;
            if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) continue;
            const pd = op.prim.dist(x, y, z);
            if (op.mode === 'add') {
                d = smin(d, pd, op.k);
                if (cands) cands.push({ op, d: pd, u: op.prim.u, ang: op.prim.ang, flow: op.flowAt ? op.flowAt() : op.flow });
            } else {
                d = -smin(-d, pd, op.k);
            }
        }
        return d;
    }

    // Mesh the field. `res` is the number of cells along the longest side.
    mesh({ res = 200, paint, skin } = {}) {
        const bb = this.bounds();
        const size = [bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]];
        const h = Math.max(...size) / res;
        const o = [bb[0] - h * 2, bb[1] - h * 2, bb[2] - h * 2];
        const nx = Math.ceil(size[0] / h) + 5, ny = Math.ceil(size[1] / h) + 5, nz = Math.ceil(size[2] / h) + 5;
        const grid = new Float32Array(nx * ny * nz).fill(1e9);
        const at = (i, j, k) => i + nx * (j + ny * k);

        // fill each primitive's own box only
        for (const op of this.ops) {
            const b = op.box;
            const i0 = Math.max(0, Math.floor((b[0] - o[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((b[3] - o[0]) / h));
            const j0 = Math.max(0, Math.floor((b[1] - o[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((b[4] - o[1]) / h));
            const k0 = Math.max(0, Math.floor((b[2] - o[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((b[5] - o[2]) / h));
            const dist = op.prim.dist, kk = op.k, add = op.mode === 'add';
            for (let k = k0; k <= k1; k++) {
                const z = o[2] + k * h;
                for (let j = j0; j <= j1; j++) {
                    const y = o[1] + j * h;
                    let idx = at(i0, j, k);
                    for (let i = i0; i <= i1; i++, idx++) {
                        const d = dist(o[0] + i * h, y, z);
                        grid[idx] = add ? smin(grid[idx], d, kk) : -smin(-grid[idx], d, kk);
                    }
                }
            }
        }

        // surface nets: one vertex per cell that the surface crosses
        const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
        const cAt = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
        const verts = [];
        const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
        const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        const v = new Float32Array(8);
        for (let k = 0; k < nz - 1; k++) {
            for (let j = 0; j < ny - 1; j++) {
                for (let i = 0; i < nx - 1; i++) {
                    let mask = 0;
                    for (let c = 0; c < 8; c++) {
                        const cc = corner[c];
                        v[c] = grid[at(i + cc[0], j + cc[1], k + cc[2])];
                        if (v[c] < 0) mask |= 1 << c;
                    }
                    if (mask === 0 || mask === 255) continue;
                    let sx = 0, sy = 0, sz = 0, n = 0;
                    for (const [a, b] of edges) {
                        if ((v[a] < 0) === (v[b] < 0)) continue;
                        const t = v[a] / (v[a] - v[b]);
                        const ca = corner[a], cb = corner[b];
                        sx += ca[0] + (cb[0] - ca[0]) * t;
                        sy += ca[1] + (cb[1] - ca[1]) * t;
                        sz += ca[2] + (cb[2] - ca[2]) * t;
                        n++;
                    }
                    cellVert[cAt(i, j, k)] = verts.length / 3;
                    verts.push(o[0] + (i + sx / n) * h, o[1] + (j + sy / n) * h, o[2] + (k + sz / n) * h);
                }
            }
        }

        // a quad for every grid edge the surface crosses
        const index = [];
        const quad = (a, b, c, d, flip) => {
            if (a < 0 || b < 0 || c < 0 || d < 0) return;
            if (flip) index.push(a, c, b, a, d, c);
            else index.push(a, b, c, a, c, d);
        };
        for (let k = 1; k < nz - 1; k++) {
            for (let j = 1; j < ny - 1; j++) {
                for (let i = 1; i < nx - 1; i++) {
                    const g = grid[at(i, j, k)];
                    const inside = g < 0;
                    if (i < nx - 1 && inside !== grid[at(i + 1, j, k)] < 0) {
                        quad(cellVert[cAt(i, j - 1, k - 1)], cellVert[cAt(i, j, k - 1)], cellVert[cAt(i, j, k)], cellVert[cAt(i, j - 1, k)], !inside);
                    }
                    if (j < ny - 1 && inside !== grid[at(i, j + 1, k)] < 0) {
                        quad(cellVert[cAt(i - 1, j, k - 1)], cellVert[cAt(i - 1, j, k)], cellVert[cAt(i, j, k)], cellVert[cAt(i, j, k - 1)], !inside);
                    }
                    if (k < nz - 1 && inside !== grid[at(i, j, k + 1)] < 0) {
                        quad(cellVert[cAt(i - 1, j - 1, k)], cellVert[cAt(i, j - 1, k)], cellVert[cAt(i, j, k)], cellVert[cAt(i - 1, j, k)], !inside);
                    }
                }
            }
        }

        // snap onto the exact surface and take normals from the field's gradient
        const count = verts.length / 3;
        const pos = new Float32Array(verts);
        const nrm = new Float32Array(count * 3);
        const e = h * 0.35;
        const grad = (x, y, z) => {
            const gx = this.evaluate(x + e, y, z) - this.evaluate(x - e, y, z);
            const gy = this.evaluate(x, y + e, z) - this.evaluate(x, y - e, z);
            const gz = this.evaluate(x, y, z + e) - this.evaluate(x, y, z - e);
            const l = Math.hypot(gx, gy, gz) || 1;
            return [gx / l, gy / l, gz / l];
        };
        for (let i = 0; i < count; i++) {
            let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
            for (let it = 0; it < 2; it++) {
                const d = this.evaluate(x, y, z);
                if (Math.abs(d) > h * 1.5) break;
                const g = grad(x, y, z);
                x -= g[0] * d;
                y -= g[1] * d;
                z -= g[2] * d;
            }
            const g = grad(x, y, z);
            pos.set([x, y, z], i * 3);
            nrm.set(g, i * 3);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        geo.setIndex(index);
        if (paint) this.paintGeometry(geo, paint, h, skin);
        geo.computeBoundingSphere();
        geo.userData.cell = h;
        return geo;
    }

    // Per-vertex paint, blended between the primitives that shape each vertex.
    // paint(s) returns { col, fur, tip, scale, rough } for one primitive's point of view.
    // skin(s) returns [[boneIndex, weight], ...] for one primitive's point of view; the
    // weights blend between primitives the same way the colours do
    paintGeometry(geo, paint, h, skin) {
        const pos = geo.attributes.position.array;
        const nrm = geo.attributes.normal.array;
        const count = pos.length / 3;
        const col = new Float32Array(count * 3);
        const tip = new Float32Array(count * 3);
        const comb = new Float32Array(count * 3);
        const fur = new Float32Array(count);
        const mat = new Float32Array(count * 2);
        const skinIndex = skin ? new Uint16Array(count * 4) : null;
        const skinWeight = skin ? new Float32Array(count * 4) : null;
        const boneW = new Map();
        const cands = [];
        const s = { p: [0, 0, 0], n: [0, 0, 0] };
        for (let i = 0; i < count; i++) {
            const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
            this.evaluate(x, y, z, cands);
            s.p[0] = x; s.p[1] = y; s.p[2] = z;
            s.n[0] = nrm[i * 3]; s.n[1] = nrm[i * 3 + 1]; s.n[2] = nrm[i * 3 + 2];
            let dmin = Infinity;
            cands.forEach((c) => { dmin = Math.min(dmin, c.d); });
            let wsum = 0;
            const acc = { c: [0, 0, 0], t: [0, 0, 0], f: 0, sc: 0, r: 0, cb: [0, 0, 0] };
            boneW.clear();
            for (const c of cands) {
                const blend = Math.max(c.op.k * 0.3, h * 0.6);
                const wgt = Math.exp(-(c.d - dmin) / blend);
                if (wgt < 0.02) continue;
                s.tag = c.op.tag;
                s.u = c.u;
                s.ang = c.ang;
                s.data = c.op.data;
                const r = paint(s);
                const tc = r.tip || r.col;
                for (let a = 0; a < 3; a++) {
                    acc.c[a] += r.col[a] * wgt;
                    acc.t[a] += tc[a] * wgt;
                    acc.cb[a] += (c.flow ? c.flow[a] : 0) * wgt;
                }
                acc.f += (r.fur || 0) * wgt;
                if (skin) for (const [b, bw] of skin(s)) boneW.set(b, (boneW.get(b) || 0) + bw * wgt);
                acc.sc += (r.scale || 0) * wgt;
                acc.r += (r.rough ?? 0.8) * wgt;
                wsum += wgt;
            }
            if (wsum === 0) wsum = 1;
            for (let a = 0; a < 3; a++) {
                col[i * 3 + a] = acc.c[a] / wsum;
                tip[i * 3 + a] = acc.t[a] / wsum;
            }
            // fur lies along the flow direction of its primitive, flattened onto the surface, with a little droop
            let cb = acc.cb;
            const nd = cb[0] * s.n[0] + cb[1] * s.n[1] + cb[2] * s.n[2];
            cb = [cb[0] - s.n[0] * nd, cb[1] - s.n[1] * nd - 0.25, cb[2] - s.n[2] * nd];
            const cl = Math.hypot(cb[0], cb[1], cb[2]) || 1;
            comb.set([cb[0] / cl, cb[1] / cl, cb[2] / cl], i * 3);
            fur[i] = acc.f / wsum;
            if (skin) {
                const top = [...boneW.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
                const tot = top.reduce((a, [, w]) => a + w, 0) || 1;
                top.forEach(([b, w], k) => {
                    skinIndex[i * 4 + k] = b;
                    skinWeight[i * 4 + k] = w / tot;
                });
                if (!top.length) skinWeight[i * 4] = 1;
            }
            mat[i * 2] = acc.sc / wsum;
            mat[i * 2 + 1] = acc.r / wsum;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setAttribute('aTip', new THREE.BufferAttribute(tip, 3));
        geo.setAttribute('aComb', new THREE.BufferAttribute(comb, 3));
        geo.setAttribute('aFur', new THREE.BufferAttribute(fur, 1));
        geo.setAttribute('aMat', new THREE.BufferAttribute(mat, 2));
        if (skin) {
            geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
            geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
        }
    }
}

export const vec = { sub, dot, cross, len, norm, frame };
