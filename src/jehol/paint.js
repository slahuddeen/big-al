// Small helpers for species paint functions
import * as THREE from 'three';

const cache = new Map();
// a hex colour as linear RGB (vertex colours are in linear space)
export const C = (hex) => {
    if (!cache.has(hex)) cache.set(hex, new THREE.Color(hex).toArray());
    return cache.get(hex);
};
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};

// cheap value noise for mottling
const hash = (x, y, z) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
};
export function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
        l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
        l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
        w
    );
}
export const fbm = (x, y, z) => noise3(x, y, z) * 0.55 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.15;

// ---------- bold patterns: each returns a 0..1 mask ----------
const fract = (v) => v - Math.floor(v);

// stripes across a coordinate t: n per unit, `width` the share of each period that is stripe
export const stripes = (t, n, width = 0.35, soft = 0.05) => {
    const f = fract(t * n);
    return smooth(0, soft, f) * smooth(width, width - soft, f);
};

// distance (in cell units) from p to the nearest of a jittered lattice of points, and that point's id
export function cells(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let d = 9, id = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const cx = xi + a, cy = yi + b, cz = zi + c;
        const px = cx + hash(cx, cy, cz), py = cy + hash(cy + 7.1, cz, cx), pz = cz + hash(cz + 3.3, cx, cy);
        const dd = Math.hypot(px - x, py - y, pz - z);
        if (dd < d) { d = dd; id = hash(cx + 0.5, cy + 0.5, cz + 0.5); }
    }
    return [d, id];
}

// round spots `size` metres apart; `r` is the spot radius as a share of the spacing
export const spots = (p, size, r = 0.28, soft = 0.05) => {
    const [d] = cells(p[0] / size, p[1] / size, p[2] / size);
    return smooth(r + soft, r - soft, d);
};

// broken rings, like a leopard's rosettes (ring 1) with an optional paler centre (centre 1)
export const rosettes = (p, size, r0 = 0.17, r1 = 0.33) => {
    const [d, id] = cells(p[0] / size, p[1] / size, p[2] / size);
    const ring = smooth(r0 - 0.04, r0 + 0.02, d) * smooth(r1 + 0.04, r1 - 0.02, d);
    const gap = smooth(0.25, 0.4, noise3(p[0] / size * 4, p[1] / size * 4, p[2] / size * 4 + id * 9));
    return { ring: ring * gap, centre: smooth(r0 + 0.02, r0 - 0.04, d) };
};

// tapering diagonal slashes on the side of the body (x forward, y up): n per metre,
// tilted by `angle` from vertical; broken up so they read as brush strokes, not hoops
export const slashes = (x, y, z, n, angle = 0.35, width = 0.32) => {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const t = x * ca + y * sa;
    const along = -x * sa + y * ca;
    const k = Math.floor(t * n);
    const brk = smooth(0.32, 0.5, noise3(along * n * 1.4, z * n * 0.5, k * 3.7));
    return stripes(t, n, width * (0.6 + 0.5 * brk), 0.06) * brk;
};

// 0 on the back, 1 on the belly: for countershading
export const belly = (s, centreY) => smooth(0.15, -0.55, s.n[1]) * 0.6 + smooth(centreY + 0.1, centreY - 0.25, s.p[1]) * 0.4;

// A paint function for feathered or scaly bipeds and similar body plans.
//  base / back / belly: plumage colours (back is blended in on top, belly underneath)
//  skin / sole: bare skin (face, feet); beak: keratin colour, covering the snout from beakFrom (0..1)
//  fur: filament length in metres; furBy: per-body-part multipliers
//  pattern(s, col, info): optional hook to add stripes, bands or masks; returns the colour
//  scaly: parts with scales instead of filaments (with scale size `scale`)
export function scheme(o) {
    const base = C(o.base), back = C(o.back || o.base), belly = C(o.belly || o.base);
    // bare skin defaults to a darker, greyer version of the plumage
    const skin = o.skin ? C(o.skin) : mix(C(o.back || o.base), C('#4a4640'), 0.55);
    const sole = C(o.sole || '#6a6058');
    const feet = o.feet ? C(o.feet) : skin;
    const beak = o.beak ? C(o.beak) : null;
    const furBy = {
        head: 0.35, neck: 1.1, snout: 0, jaw: 0, brow: 0, crest: 0, thigh: 1, shin: 1, foot: 0, toe: 0, arm: 0.85, hand: 0.15, tail: 0.95, body: 1, wingbone: 0,
        ...(o.furBy || {})
    };
    const scaly = new Set(o.scaly || ['snout', 'jaw', 'brow', 'foot', 'toe', 'hand', 'crest']);
    const fur = o.fur ?? 0.02;
    const mottle = o.mottle ?? 0.25;
    const L = o.L || 1;
    return (s) => {
        const [x, y, z] = s.p;
        const up = s.n[1];
        const m = fbm(x / L * 14, y / L * 14, z / L * 14);
        let col = mix(base, back, smooth(-0.1, 0.75, up) * (o.backAmt ?? 0.85));
        col = mix(col, belly, smooth(0.0, -0.6, up) * (o.bellyAmt ?? 0.9));
        col = mix(col, scale(col, 0.82), m * mottle * 2);
        let f = fur * (furBy[s.tag] ?? 1);
        let sc = 0, rough = 0.85;
        if (s.tag === 'shin') f *= smooth(o.shinBare ?? 0.75, 0.2, s.u);
        if (s.tag === 'tail' && o.tailFurEnd !== undefined) f *= mix([1, 1, 1], [o.tailFurEnd, 0, 0], s.u)[0];
        if (scaly.has(s.tag)) {
            col = s.tag === 'foot' || s.tag === 'toe' ? mix(feet, sole, smooth(0, -0.8, up)) : skin;
            sc = o.scale ?? L * 0.003;
            rough = 0.65;
            if ((s.tag === 'snout' || s.tag === 'head') && furBy.snoutBack) f = fur * furBy.snoutBack * smooth(0.25, 0.0, s.u);
        }
        if (s.tag === 'shin') {
            const bare = smooth(0.55, 0.95, s.u) * (o.shinScales ?? 1);
            col = mix(col, feet, bare);
            sc = bare > 0.3 ? o.scale ?? L * 0.003 : 0;
        }
        if (beak && (s.tag === 'snout' || s.tag === 'jaw')) {
            const b = smooth((o.beakFrom ?? 0.5) - 0.06, (o.beakFrom ?? 0.5) + 0.04, s.u);
            col = mix(col, beak, b);
            rough = mix([rough, 0, 0], [0.35, 0, 0], b)[0];
            if (b > 0.5) sc = 0;
        }
        if (s.tag === 'beak') {
            col = beak || skin;
            f = 0;
            sc = 0;
            rough = 0.35;
        }
        if (o.pattern) col = o.pattern(s, col, { m, up, x, y, z });
        const tip = o.tip ? mix(col, C(o.tip), o.tipAmt ?? 0.3) : mix(col, [1, 1, 1], 0.06);
        if (o.furFn) f = o.furFn(s, f);
        return { col, fur: f, tip, scale: sc, rough };
    };
}
