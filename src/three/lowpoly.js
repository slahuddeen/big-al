// ==================== LOW-POLY GEOMETRY TOOLKIT ====================
// Everything in the 3D world is built from a handful of primitives that mimic
// box-modelling: edge loops extruded along a spine (loft), extruded polygons
// (prism / slab) and jittered polyhedra (blob). All geometry is non-indexed and
// flat shaded with per-face vertex colours, which gives the chunky faceted look.
import * as THREE from 'three';

// ---------- Seeded randomness ----------
export const mulberry32 = (seed) => () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const hashInts = (...ns) => {
    let h = 2166136261;
    for (const n of ns) {
        h ^= (n | 0) + 0x9e3779b9;
        h = Math.imul(h, 16777619);
        h ^= h >>> 13;
    }
    return h >>> 0;
};

export const hashString = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

export const rngFor = (...ns) => mulberry32(hashInts(...ns));

// ---------- Colour helpers ----------
export const col = (c) => (c && c.isColor ? c.clone() : new THREE.Color(c));
export const shade = (c, f) => col(c).multiplyScalar(f);
export const mix = (a, b, t) => col(a).lerp(col(b), t);
export const vary = (c, rand, amount = 0.05) => {
    const out = col(c);
    out.offsetHSL((rand() - 0.5) * amount * 0.3, 0, (rand() - 0.5) * amount * 2);
    return out;
};

export const v3 = (p) => (p && p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]));

const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _n = new THREE.Vector3();
const _cen = new THREE.Vector3();

// Returns two unit vectors perpendicular to `axis` (side is horizontal when possible)
export const frameFor = (axis, upHint = new THREE.Vector3(0, 1, 0), prevSide = null) => {
    const t = axis.clone().normalize();
    let side = new THREE.Vector3().crossVectors(t, upHint);
    if (side.lengthSq() < 1e-6) {
        side = prevSide ? prevSide.clone() : new THREE.Vector3(0, 0, 1);
        side.sub(t.clone().multiplyScalar(side.dot(t)));
    }
    side.normalize();
    if (prevSide && side.dot(prevSide) < 0) side.negate();
    const nrm = new THREE.Vector3().crossVectors(side, t).normalize();
    return { t, side, nrm };
};

// ---------- Mesh builder ----------
export class MeshBuilder {
    constructor() {
        this.positions = [];
        this.colors = [];
        this.sways = [];
        this.swayFn = null;
    }

    _push(v, c) {
        this.positions.push(v.x, v.y, v.z);
        this.colors.push(c.r, c.g, c.b);
        this.sways.push(this.swayFn ? this.swayFn(v) : 0);
    }

    // Adds a triangle. `hint` orients the face: if hintIsDir the face normal will
    // point along hint, otherwise the face will point away from the hint point.
    tri(a, b, c, color, hint = null, hintIsDir = false) {
        a = v3(a); b = v3(b); c = v3(c);
        _ab.subVectors(b, a);
        _ac.subVectors(c, a);
        _n.crossVectors(_ab, _ac);
        if (_n.lengthSq() < 1e-14) return;
        if (hint) {
            let d;
            if (hintIsDir) {
                d = v3(hint);
            } else {
                _cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
                d = _cen.clone().sub(v3(hint));
            }
            if (_n.dot(d) < 0) {
                const tmp = b; b = c; c = tmp;
            }
        }
        const cc = col(color);
        this._push(a, cc);
        this._push(b, cc);
        this._push(c, cc);
    }

    quad(a, b, c, d, color, hint = null, hintIsDir = false) {
        this.tri(a, b, c, color, hint, hintIsDir);
        this.tri(a, c, d, color, hint, hintIsDir);
    }

    // Convex polygon fan
    fan(points, color, hint = null, hintIsDir = false) {
        for (let i = 1; i < points.length - 1; i++) {
            this.tri(points[0], points[i], points[i + 1], color, hint, hintIsDir);
        }
    }

    isEmpty() {
        return this.positions.length === 0;
    }

    build() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
        g.setAttribute('sway', new THREE.Float32BufferAttribute(this.sways, 1));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        g.computeBoundingBox();
        return g;
    }
}

// ---------- Loft: extrude an edge loop along a spine ----------
// sections: [{ p:[x,y,z], r | rw/rh, color?, belly? }]
export const loft = (mb, sections, opts = {}) => {
    const {
        sides = 6,
        rot = Math.PI / 2,
        capStart = true,
        capEnd = true,
        tipStart = 0,
        tipEnd = 0,
        jitter = 0,
        rand = Math.random,
        color = '#888888',
        bellyColor = null,
        bellyThreshold = -0.35,
        ridgeColor = null,
        ridgeThreshold = 0.85,
        up = [0, 1, 0],
        stripes = null // { every, color }
    } = opts;

    const pts = sections.map((s) => v3(s.p));
    const n = pts.length;
    if (n < 2) return;
    const upV = v3(up).normalize();
    const rings = [];
    const tangents = [];
    let prevSide = null;

    for (let i = 0; i < n; i++) {
        let axis;
        if (i === 0) axis = pts[1].clone().sub(pts[0]);
        else if (i === n - 1) axis = pts[n - 1].clone().sub(pts[n - 2]);
        else axis = pts[i + 1].clone().sub(pts[i - 1]);
        const { t, side, nrm } = frameFor(axis, upV, prevSide);
        prevSide = side;
        tangents.push(t);
        const s = sections[i];
        const rw = s.rw ?? s.r ?? 0.1;
        const rh = s.rh ?? s.r ?? 0.1;
        const yOff = s.yOff ?? 0; // shifts the loop centre vertically (e.g. flat bellies)
        const ring = [];
        for (let k = 0; k < sides; k++) {
            const a = rot + (Math.PI * 2 * k) / sides;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const v = pts[i].clone()
                .addScaledVector(side, ca * rw)
                .addScaledVector(nrm, sa * rh + yOff);
            if (jitter > 0 && rw > 0 && rh > 0) {
                const m = Math.min(rw, rh) * jitter;
                v.x += (rand() - 0.5) * m;
                v.y += (rand() - 0.5) * m;
                v.z += (rand() - 0.5) * m;
            }
            ring.push({ v, s: sa });
        }
        rings.push(ring);
    }

    const pickColor = (i, sMean) => {
        const sec = sections[i];
        if (bellyColor && sMean < bellyThreshold) return sec.belly ?? bellyColor;
        if (ridgeColor && sMean > ridgeThreshold) return sec.ridge ?? ridgeColor;
        if (stripes && i % stripes.every === stripes.offset) return stripes.color;
        return sec.color ?? color;
    };

    for (let i = 0; i < n - 1; i++) {
        const ref = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5);
        for (let k = 0; k < sides; k++) {
            const k2 = (k + 1) % sides;
            const a = rings[i][k];
            const b = rings[i][k2];
            const c = rings[i + 1][k2];
            const d = rings[i + 1][k];
            const sMean = (a.s + b.s) / 2;
            mb.quad(a.v, b.v, c.v, d.v, pickColor(i, sMean), ref);
        }
    }

    const cap = (idx, tipLen, dirSign) => {
        const ring = rings[idx];
        const p = pts[idx];
        const t = tangents[idx];
        const tip = p.clone().addScaledVector(t, tipLen * dirSign);
        const interior = idx === 0 ? pts[1] : pts[n - 2];
        for (let k = 0; k < sides; k++) {
            const k2 = (k + 1) % sides;
            const sMean = (ring[k].s + ring[k2].s) / 2;
            mb.tri(tip, ring[k].v, ring[k2].v, pickColor(idx === 0 ? 0 : n - 2, sMean), tipLen > 0 ? p : interior);
        }
    };

    if (capStart) cap(0, tipStart, -1);
    if (capEnd) cap(n - 1, tipEnd, 1);
};

// ---------- Prism: extruded convex polygon with a bevelled top ----------
// pts2: [[x,z], ...] (convex, any winding). bands: [{ to: y, color }] from bottom up
export const prism = (mb, pts2, y0, y1, opts = {}) => {
    const {
        top = '#7cb342',
        side = '#6b4a2b',
        bevel = 0,
        bevelH = 0,
        bands = null,
        topFn = null,
        offset = [0, 0]
    } = opts;
    const cx = pts2.reduce((s, p) => s + p[0], 0) / pts2.length + offset[0];
    const cz = pts2.reduce((s, p) => s + p[1], 0) / pts2.length + offset[1];
    const outer = pts2.map((p) => [p[0] + offset[0], p[1] + offset[1]]);
    const inner = outer.map(([x, z]) => {
        const dx = x - cx;
        const dz = z - cz;
        const len = Math.hypot(dx, dz) || 1;
        return [x - (dx / len) * bevel, z - (dz / len) * bevel];
    });
    const n = outer.length;
    const ref = new THREE.Vector3(cx, (y0 + y1) / 2, cz);
    const wallTop = y1 - bevelH;

    // Top
    const topPts = inner.map(([x, z]) => new THREE.Vector3(x, y1, z));
    if (topFn) {
        topFn(topPts, cx, cz);
    } else {
        mb.fan(topPts, top, [0, 1, 0], true);
    }

    // Bevel
    if (bevel > 0 || bevelH > 0) {
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            mb.quad(
                [outer[i][0], wallTop, outer[i][1]],
                [outer[j][0], wallTop, outer[j][1]],
                [inner[j][0], y1, inner[j][1]],
                [inner[i][0], y1, inner[i][1]],
                opts.bevelColor ?? top,
                ref
            );
        }
    }

    // Walls (banded)
    const levels = bands && bands.length ? bands : [{ to: wallTop, color: side }];
    let yA = y0;
    for (const band of levels) {
        const yB = Math.min(band.to, wallTop);
        if (yB <= yA) continue;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            mb.quad(
                [outer[i][0], yA, outer[i][1]],
                [outer[j][0], yA, outer[j][1]],
                [outer[j][0], yB, outer[j][1]],
                [outer[i][0], yB, outer[i][1]],
                band.color,
                ref
            );
        }
        yA = yB;
    }
};

// ---------- Blob: jittered icosphere (rocks, bushes, canopies, eyes) ----------
const _icoCache = new Map();
const getIco = (detail) => {
    if (!_icoCache.has(detail)) {
        const g = new THREE.IcosahedronGeometry(1, detail);
        _icoCache.set(detail, g.attributes.position.array.slice());
    }
    return _icoCache.get(detail);
};

export const blob = (mb, center, radius, color, opts = {}) => {
    const {
        detail = 0,
        jitter = 0.2,
        scale = [1, 1, 1],
        rand = Math.random,
        flatBottom = null, // y (local, -1..1) below which vertices are flattened
        colorFn = null, // (localY, rand) => colour
        faceVary = 0.06,
        rotY = 0
    } = opts;
    const arr = getIco(detail);
    const c = v3(center);
    const jit = new Map();
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const vtx = (i) => {
        let x = arr[i], y = arr[i + 1], z = arr[i + 2];
        const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
        if (!jit.has(key)) jit.set(key, [(rand() - 0.5) * jitter, (rand() - 0.5) * jitter, (rand() - 0.5) * jitter]);
        const j = jit.get(key);
        x += j[0]; y += j[1]; z += j[2];
        if (flatBottom !== null && y < flatBottom) y = flatBottom;
        x *= scale[0] * radius; y *= scale[1] * radius; z *= scale[2] * radius;
        const rx = x * cosR - z * sinR;
        const rz = x * sinR + z * cosR;
        return new THREE.Vector3(c.x + rx, c.y + y, c.z + rz);
    };
    for (let i = 0; i < arr.length; i += 9) {
        const a = vtx(i);
        const b = vtx(i + 3);
        const d = vtx(i + 6);
        const localY = (arr[i + 1] + arr[i + 4] + arr[i + 7]) / 3;
        let fc = colorFn ? colorFn(localY, rand) : color;
        if (faceVary) fc = vary(fc, rand, faceVary);
        mb.tri(a, b, d, fc, c);
    }
};

// ---------- Cone (spikes, horns, conifer tiers, mountains) ----------
export const cone = (mb, base, tip, radius, color, opts = {}) => {
    const { sides = 6, jitter = 0, rand = Math.random, baseColor = null, capBase = true, rot = 0, tipColor = null, squash = 1 } = opts;
    const b = v3(base);
    const t = v3(tip);
    const { side, nrm } = frameFor(t.clone().sub(b));
    const ring = [];
    for (let k = 0; k < sides; k++) {
        const a = rot + (Math.PI * 2 * k) / sides;
        const v = b.clone()
            .addScaledVector(side, Math.cos(a) * radius)
            .addScaledVector(nrm, Math.sin(a) * radius * squash);
        if (jitter) {
            v.x += (rand() - 0.5) * radius * jitter;
            v.y += (rand() - 0.5) * radius * jitter * 0.5;
            v.z += (rand() - 0.5) * radius * jitter;
        }
        ring.push(v);
    }
    const ref = b.clone().lerp(t, 0.3);
    for (let k = 0; k < sides; k++) {
        const k2 = (k + 1) % sides;
        const fc = tipColor ? (k % 2 ? color : vary(color, rand, 0.06)) : vary(color, rand, 0.05);
        mb.tri(t, ring[k], ring[k2], fc, ref);
    }
    if (capBase) mb.fan(ring, baseColor ?? shade(color, 0.7), t);
};

// ---------- Cylinder-ish limb between two points ----------
export const limb = (mb, a, b, r0, r1, color, opts = {}) => {
    loft(mb, [{ p: a, r: r0 }, { p: b, r: r1 }], { sides: opts.sides ?? 5, color, ...opts });
};

// ---------- Slab: thick convex polygon (plates, fins, wing membranes) ----------
export const slab = (mb, pts, thickness, color, opts = {}) => {
    const P = pts.map(v3);
    // Newell normal
    const nrm = new THREE.Vector3();
    for (let i = 0; i < P.length; i++) {
        const a = P[i];
        const b = P[(i + 1) % P.length];
        nrm.x += (a.y - b.y) * (a.z + b.z);
        nrm.y += (a.z - b.z) * (a.x + b.x);
        nrm.z += (a.x - b.x) * (a.y + b.y);
    }
    nrm.normalize();
    const h = thickness / 2;
    const A = P.map((p) => p.clone().addScaledVector(nrm, h));
    const B = P.map((p) => p.clone().addScaledVector(nrm, -h));
    const centre = P.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / P.length);
    mb.fan(A, color, nrm, true);
    mb.fan(B, opts.backColor ?? color, nrm.clone().negate(), true);
    const edge = opts.edgeColor ?? shade(color, 0.8);
    for (let i = 0; i < P.length; i++) {
        const j = (i + 1) % P.length;
        mb.quad(A[i], A[j], B[j], B[i], edge, centre);
    }
};

// ---------- Hex helpers (pointy-top, matching utils/hexMath hexToPixel) ----------
export const HEX_SIZE = 1;
export const hexCorners = (radius = 1, cx = 0, cz = 0) => {
    const pts = [];
    for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k - 30);
        pts.push([cx + radius * Math.cos(a), cz + radius * Math.sin(a)]);
    }
    return pts;
};

export const hexToWorld = (q, r, size = HEX_SIZE) => ({
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    z: size * (1.5 * r)
});

export const worldToHex = (x, z, size = HEX_SIZE) => {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / size;
    const r = ((2 / 3) * z) / size;
    // cube round
    let rx = Math.round(q);
    let rz = Math.round(r);
    const ry = Math.round(-q - r);
    const dx = Math.abs(rx - q);
    const dy = Math.abs(ry - (-q - r));
    const dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy <= dz) rz = -rx - ry;
    return { q: rx, r: rz };
};

// Edge midpoint direction (in world xz) for HEX_DIRECTIONS index
// HEX_DIRECTIONS: E, NE, NW, W, SW, SE  (q,r): (1,0)(1,-1)(0,-1)(-1,0)(-1,1)(0,1)
export const directionVector = (dirIndex) => {
    const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const [dq, dr] = dirs[dirIndex];
    const w = hexToWorld(dq, dr);
    const len = Math.hypot(w.x, w.z);
    return { x: w.x / len, z: w.z / len };
};
