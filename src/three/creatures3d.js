// ==================== 3D CREATURE MODELS ====================
// Every creature is a small hierarchy of low-poly meshes (body, neck chain, head,
// jaw, tail chain, legs, arms, wings) so it can be animated procedurally.
// Models are built facing +x with feet on y = 0 and normalised to length 1;
// the renderer scales them by body mass.
import * as THREE from 'three';
import { MeshBuilder, loft, blob, cone, limb, slab, mulberry32, hashString, shade, mix, vary } from './lowpoly.js';

// ---------- small helpers ----------
// How creatures are drawn. The map games use the defaults; the close-up roaming view (src/roam)
// asks for finer lofts and real eyes instead of the big cartoon ones.
export const CREATURE_STYLE = { detail: 1, eyes: 'cartoon' };

// loft with more rings and sides when the style asks for detail; stripes keep their spacing
const subdivide = (secs) => {
    const out = [];
    const mid = (a, b) => {
        const l = (x, y) => (x === undefined || y === undefined ? x : x + (y - x) * 0.5);
        const pa = a.p.toArray ? a.p.toArray() : a.p;
        const pb = b.p.toArray ? b.p.toArray() : b.p;
        return { ...a, p: [l(pa[0], pb[0]), l(pa[1], pb[1]), l(pa[2], pb[2])], r: l(a.r, b.r), rw: l(a.rw ?? a.r, b.rw ?? b.r), rh: l(a.rh ?? a.r, b.rh ?? b.r), yOff: l(a.yOff ?? 0, b.yOff ?? 0) };
    };
    for (let i = 0; i < secs.length - 1; i++) out.push(secs[i], mid(secs[i], secs[i + 1]));
    out.push(secs[secs.length - 1]);
    return out;
};
const loftC = (mb, secs, opts = {}) => {
    const d = CREATURE_STYLE.detail;
    if (d <= 1) return loft(mb, secs, opts);
    const stripes = opts.stripes ? { ...opts.stripes, every: opts.stripes.every * 2, offset: opts.stripes.offset * 2 } : null;
    return loft(mb, subdivide(secs), { ...opts, stripes, sides: Math.round((opts.sides ?? 6) * d), jitter: (opts.jitter ?? 0) * 0.6 });
};

const group = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (parent) parent.add(g);
    return g;
};

const meshFrom = (mb, material) => {
    const m = new THREE.Mesh(mb.build(), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
};

const addMesh = (parent, mb, ctx, wing = false) => {
    if (mb.isEmpty()) return null;
    const m = meshFrom(mb, wing ? ctx.wingMat : ctx.mat);
    parent.add(m);
    return m;
};

// Linear resample of key sections into n evenly spread sections (for stripes)
const resample = (keys, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * (keys.length - 1);
        const a = Math.min(keys.length - 2, Math.floor(t));
        const f = t - a;
        const A = keys[a];
        const B = keys[a + 1];
        const lerp = (x, y) => x + (y - x) * f;
        out.push({
            p: [lerp(A.p[0], B.p[0]), lerp(A.p[1], B.p[1]), lerp(A.p[2], B.p[2])],
            rw: lerp(A.rw ?? A.r, B.rw ?? B.r),
            rh: lerp(A.rh ?? A.r, B.rh ?? B.r),
            yOff: lerp(A.yOff ?? 0, B.yOff ?? 0)
        });
    }
    return out;
};

const eyes = (mb, x, y, zHalf, r, iris = '#f2c230', pupil = '#141414') => {
    if (CREATURE_STYLE.eyes === 'real') {
        // a reptile's eye: small, set into a dark socket under a bony brow, a gold iris with a
        // slit pupil and a single glint
        const e = r * 0.55;
        for (const s of [-1, 1]) {
            blob(mb, [x, y, s * zHalf * 0.98], e * 1.35, '#1c1714', { detail: 1, jitter: 0.05, scale: [1.35, 0.9, 0.45], faceVary: 0 });
            blob(mb, [x + e * 0.1, y, s * (zHalf + e * 0.12)], e, iris, { detail: 1, jitter: 0, scale: [1.15, 1, 0.4], faceVary: 0.02 });
            blob(mb, [x + e * 0.12, y, s * (zHalf + e * 0.42)], e * 0.62, pupil, { detail: 1, jitter: 0, scale: [0.32, 1.25, 0.2], faceVary: 0 });
            blob(mb, [x + e * 0.4, y + e * 0.42, s * (zHalf + e * 0.48)], e * 0.13, '#ffffff', { detail: 0, jitter: 0, faceVary: 0 });
            // the brow ridge shading the eye
            blob(mb, [x - e * 0.1, y + e * 1.05, s * zHalf * 0.92], e * 1.25, shade(iris, 0.35), { detail: 0, jitter: 0.1, scale: [1.6, 0.42, 0.75], faceVary: 0.03 });
        }
        return;
    }
    for (const s of [-1, 1]) {
        blob(mb, [x, y, s * zHalf], r, iris, { detail: 1, jitter: 0, faceVary: 0 });
        blob(mb, [x + r * 0.25, y + r * 0.1, s * (zHalf + r * 0.55)], r * 0.6, pupil, { detail: 1, jitter: 0, faceVary: 0 });
        blob(mb, [x + r * 0.45, y + r * 0.45, s * (zHalf + r * 0.75)], r * 0.18, '#ffffff', { detail: 0, jitter: 0, faceVary: 0 });
    }
};

const teethRow = (mb, x0, x1, y, zHalf, size, n = 6) => {
    for (const s of [-1, 1]) {
        for (let i = 0; i < n; i++) {
            const x = x0 + ((x1 - x0) * i) / (n - 1);
            mb.tri([x - size * 0.5, y, s * zHalf], [x + size * 0.5, y, s * zHalf], [x, y - size * 1.4, s * zHalf * 0.98], '#f4f0e0', [0, 0, s], true);
        }
    }
};

const finalize = (model) => {
    const { root, inner } = model;
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    // Normalise by the longest horizontal extent (nose-to-tail, or wingspan for flyers)
    const len = Math.max(0.0001, box.max.x - box.min.x, (box.max.z - box.min.z) * 0.85);
    const s = 1 / len;
    inner.scale.setScalar(s);
    inner.position.x = -((box.max.x + box.min.x) / 2) * s;
    inner.position.y = 0;
    model.height = box.max.y * s;
    model.width = (box.max.z - box.min.z) * s;
    return model;
};

const newModel = (gait) => {
    const root = new THREE.Group();
    const inner = group(root);
    const body = group(inner);
    return {
        root, inner, body, gait,
        parts: { legs: [], arms: [], tail: [], neck: [], head: null, jaw: null, wings: [], segs: [], extra: [] },
        keepGround: true
    };
};

// ==================== THEROPODS & ORNITHOPODS (bipeds) ====================
const BIPED_DEFAULTS = {
    hipH: 0.3, bodyLen: 0.27, bodyR: 0.075, bodyH: 0.085,
    neckLen: 0.13, neckR: 0.042, neckUp: 0.75,
    headLen: 0.16, headH: 0.07, headW: 0.05, snout: 0.45, headTilt: 0,
    tailLen: 0.5, tailR: 0.06, tailLift: 0.0,
    thighR: 0.05, armLen: 0.08, armR: 0.014,
    stripes: false, fluff: 0, eyeScale: 1, teeth: true, beak: null,
    horn: null, lacrimal: null, crest: null, osteoderms: null, tailFan: null,
    headFeathers: null, wingFeathers: null, wattle: null, sickle: false, spots: null,
    // silhouette controls
    chestDrop: 0, // front of the body lower (<0, horizontal megalosaur) or higher (>0, upright coelurosaur)
    chestDepth: 1, bodyWidth: 1, // barrel shape
    neckS: 0, // S-curve of the neck
    skull: [1, 0.78, 0.5], // skull depth at back / middle / snout
    skullWidth: [1, 0.75], // skull width at back / middle
    tailDepth: 1, tailBase: 1, // tall narrow tails (>1), thick-based tails
    clawScale: 1, crouch: 0, // hand claws, bent-kneed stance
    mane: null, backRidge: null, jowl: 0,
    bristles: null, // { h, color, tip }: a crest of long filaments from the shoulders to the tail tip
    sail: null, // { h, color, streak }: a tall spined sail along the back (spinosaurs)
    tailFin: null, // { h, color }: tall neural spines and chevrons that turn the tail into a paddle
    rosette: null, // colour of a spoon-shaped rosette at the tip of the snout
    // ---- finer anatomy ----
    spinoSkull: false, // long low snout, notch behind the rosette, nostrils pulled back near the eyes
    teethSize: 1, // < 1: lipped mouth, only the tips of the teeth show (modern theropod reconstructions)
    nasalBumps: null, // colour of the rugose bumps along the top of the snout (carcharodontosaurids, abelisaurs)
    dome: null, // colour of a domed, thickened brow (Sauroniops)
    featureScales: null, // colour of the rows of large feature scales along the flanks (abelisaurs)
    webbed: null, // colour of webbing between the toes (spinosaurs)
    flatClaws: false, // broad, flat-bottomed foot claws
    thumbSpike: null, // colour of an iguanodont's conical thumb spike
    handsDown: false // forelimbs reach the ground: walks partly on all fours (iguanodonts)
};

// A spinosaur's sail: one thin panel per section of the back, the spines showing as a
// scalloped top edge, with an optional coloured streak running along it
const sailPanels = (mb, sections, from, to, sail, rand, heightAt) => {
    const top = [];
    for (let i = from; i <= to; i++) {
        const s = sections[i];
        const t = (i - from) / Math.max(1, to - from);
        const base = [s.p[0], s.p[1] + (s.yOff ?? 0) + s.rh * 0.8, 0];
        const h = heightAt(t) * (1 + (i % 2 ? 0.05 : -0.03));
        top.push({ base, h });
    }
    for (let i = 0; i < top.length - 1; i++) {
        const a = top[i];
        const b = top[i + 1];
        if (a.h < 0.004 && b.h < 0.004) continue;
        const quad = (f0, f1) => [
            [a.base[0], a.base[1] + a.h * f0, 0], [b.base[0], b.base[1] + b.h * f0, 0],
            [b.base[0] - 0.004, b.base[1] + b.h * f1, 0], [a.base[0] - 0.004, a.base[1] + a.h * f1, 0]
        ];
        slab(mb, quad(0, 1), sail.thick ?? 0.012, vary(sail.color, rand, 0.05), { edgeColor: shade(sail.color, 0.75) });
        // the spines stand slightly proud of the skin
        limb(mb, [a.base[0], a.base[1], 0], [a.base[0] - 0.004, a.base[1] + a.h * 1.04, 0], 0.006, 0.003, shade(sail.color, 0.8), { sides: 3 });
        if (sail.streak) {
            // a flame-like streak: a band whose height wanders along the sail
            const w0 = 0.5 + 0.12 * Math.sin(i * 1.3);
            const w1 = 0.5 + 0.12 * Math.sin((i + 1) * 1.3);
            const band = [
                [a.base[0], a.base[1] + a.h * (w0 - 0.13), 0], [b.base[0], b.base[1] + b.h * (w1 - 0.13), 0],
                [b.base[0] - 0.004, b.base[1] + b.h * (w1 + 0.11), 0], [a.base[0] - 0.004, a.base[1] + a.h * (w0 + 0.11), 0]
            ];
            slab(mb, band, (sail.thick ?? 0.012) + 0.005, sail.streak, { edgeColor: shade(sail.streak, 0.8) });
        }
    }
};

// Paddle tail: a tall fin above and a shallower one below a run of tail sections
const tailFins = (mb, sections, fin, scale, rand) => {
    for (let i = 0; i < sections.length - 1; i++) {
        const a = sections[i];
        const b = sections[i + 1];
        const ha = a.rh * fin.h * scale(i / (sections.length - 1));
        const hb = b.rh * fin.h * scale((i + 1) / (sections.length - 1));
        slab(mb, [[a.p[0], a.p[1] + a.rh * 0.7, 0], [b.p[0], b.p[1] + b.rh * 0.7, 0], [b.p[0] + 0.006, b.p[1] + b.rh * 0.7 + hb, 0], [a.p[0] + 0.006, a.p[1] + a.rh * 0.7 + ha, 0]], 0.008, vary(fin.color, rand, 0.04));
        slab(mb, [[a.p[0], a.p[1] - a.rh * 0.7, 0], [b.p[0], b.p[1] - b.rh * 0.7, 0], [b.p[0] + 0.006, b.p[1] - b.rh * 0.7 - hb * 0.55, 0], [a.p[0] + 0.006, a.p[1] - a.rh * 0.7 - ha * 0.55, 0]], 0.008, vary(fin.color, rand, 0.04));
    }
};

// A dense crest of long filaments along a lofted spine, from h0 at the first section to h1 at the last
const bristleRow = (mb, sections, from, to, p, h0, h1, rand) => {
    const n = sections.length;
    const last = Math.min(n, to) - 1;
    const steps = 3; // filament tufts between each pair of sections
    for (let i = from; i <= last; i++) {
        const A = sections[i];
        const B = sections[Math.min(n - 1, i + 1)];
        for (let j = 0; j < (i === last ? 1 : steps); j++) {
            const f = j / steps;
            const px = A.p[0] + (B.p[0] - A.p[0]) * f;
            const py = A.p[1] + (A.yOff ?? 0) + A.rh * 0.84 + (B.p[1] + (B.yOff ?? 0) + B.rh * 0.84 - A.p[1] - (A.yOff ?? 0) - A.rh * 0.84) * f;
            const rw = A.rw + (B.rw - A.rw) * f;
            const t = last > from ? (i + f - from) / (last - from) : 0;
            const h = h0 + (h1 - h0) * t;
            for (let k = 0; k < 5; k++) {
                const z = (k / 4 - 0.5) * rw * 0.8;
                const len = h * (0.7 + rand() * 0.5) * (1 - Math.abs(z) / Math.max(1e-4, rw) * 0.5);
                const base = [px + (rand() - 0.5) * 0.01, py - Math.abs(z) * 0.3, z];
                // filaments sweep backwards and splay out to the sides like a brush
                const tip = [base[0] - len * (0.6 + rand() * 0.2), base[1] + len * 0.75, z * 2.4 + (rand() - 0.5) * len * 0.25];
                const r = rand();
                const col = r < 0.22 ? p.bristles.tip : r < 0.7 ? p.bristles.color : shade(p.bristles.color, 0.75);
                cone(mb, base, tip, Math.max(0.003, rw * 0.13), col, { sides: 3, rand, capBase: false, squash: 0.45 });
            }
        }
    }
};

export const buildBiped = (spec, ctx) => {
    const p = { ...BIPED_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), stripe: shade(p.colors.body, 0.65), claw: '#2a2420', mouth: '#9a3434', ...p.colors };
    const rand = mulberry32(hashString(p.name || 'biped'));
    const model = newModel('biped');
    const { body, parts } = model;
    const H = p.hipH;
    const L = p.bodyLen;
    const stripes = p.stripes ? { every: p.stripeEvery ?? 2, offset: 1, color: C.stripe } : null;

    // ---- torso ----
    const tb = new MeshBuilder();
    const BW = p.bodyWidth;
    const CD = p.chestDepth;
    const torsoKeys = [
        { p: [-0.07, H + 0.012, 0], rw: p.bodyR * 0.72 * BW, rh: p.bodyH * 0.72 },
        { p: [0.0, H + 0.02, 0], rw: p.bodyR * 0.95 * BW, rh: p.bodyH * 0.95 },
        { p: [L * 0.4, H + 0.004 + p.chestDrop * 0.4, 0], rw: p.bodyR * BW, rh: p.bodyH * 1.08 * CD, yOff: -p.bodyH * 0.1 * CD },
        { p: [L * 0.75, H - 0.004 + p.chestDrop * 0.75, 0], rw: p.bodyR * 0.9 * BW, rh: p.bodyH * 0.98 * CD, yOff: -p.bodyH * 0.12 * CD },
        { p: [L, H + 0.012 + p.chestDrop, 0], rw: p.neckR * 1.35, rh: p.neckR * 1.45 }
    ];
    const torso = resample(torsoKeys, 9);
    loftC(tb, torso, { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand });
    if (p.spots) {
        for (let i = 0; i < 10; i++) {
            const s = torso[1 + Math.floor(rand() * 6)];
            const side = rand() > 0.5 ? 1 : -1;
            blob(tb, [s.p[0] + (rand() - 0.5) * 0.03, s.p[1] + s.rh * (0.2 + rand() * 0.5), side * s.rw * 0.85], p.bodyR * (p.spotSize ?? 0.16), p.spots, { jitter: 0.3, rand, scale: [1, 0.7, 0.4] });
        }
    }
    if (p.backRidge) {
        // low ridge of tall neural spines along the back
        torso.forEach((s, i) => {
            if (i < 1 || i > 7) return;
            const h = p.backRidge.h * Math.sin((i / 8) * Math.PI);
            slab(tb, [[s.p[0] - L * 0.06, s.p[1] + s.rh * 0.8, 0], [s.p[0] + L * 0.06, s.p[1] + s.rh * 0.8, 0], [s.p[0] + L * 0.02, s.p[1] + s.rh * 0.85 + h, 0], [s.p[0] - L * 0.04, s.p[1] + s.rh * 0.85 + h, 0]], p.bodyR * 0.18, p.backRidge.color);
        });
    }
    if (p.bristles) bristleRow(tb, torso, 0, 7, p, p.bristles.h * 0.9, p.bristles.h * 0.45, rand);
    if (p.featureScales) {
        // abelisaur skin: small scales studded with rows of big conical feature scales along the flanks
        for (let row = 0; row < 3; row++) {
            for (let i = 1; i < 8; i++) {
                const sc = torso[i];
                for (const sd of [-1, 1]) {
                    const a = 0.5 + row * 0.45;
                    blob(tb, [sc.p[0] + (row % 2) * 0.012, sc.p[1] + (sc.yOff ?? 0) + Math.sin(a) * sc.rh * 0.95, sd * Math.cos(a) * sc.rw * 0.98], p.bodyR * 0.08, p.featureScales, { detail: 0, jitter: 0.2, rand, scale: [1, 1, 0.7] });
                }
            }
        }
    }
    if (p.sail) {
        // tallest over the middle of the back with a slight dip, running down to the hips and shoulders
        const sh = (t) => p.sail.h * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.94)), 0.8) * (1 - 0.1 * Math.exp(-(((t - 0.52) / 0.12) ** 2)));
        sailPanels(tb, torso, 0, 8, p.sail, rand, sh);
    }
    if (p.osteoderms) {
        torso.forEach((s, i) => {
            if (i === 0 || i > 7) return;
            cone(tb, [s.p[0], s.p[1] + s.rh * 0.92, 0], [s.p[0] - 0.006, s.p[1] + s.rh * 0.92 + p.bodyH * 0.22, 0], p.bodyR * 0.12, p.osteoderms, { sides: 4, rand });
        });
    }
    addMesh(body, tb, ctx);

    // ---- tail (two segments) ----
    const T = p.tailLen;
    const tail1 = group(body, -0.07, H + 0.012, 0);
    const t1 = new MeshBuilder();
    const TD = p.tailDepth;
    const tail1Keys = resample([
        { p: [0, 0, 0], rw: p.bodyR * 0.72 * BW * p.tailBase, rh: p.bodyH * 0.72 * Math.max(1, TD * 0.85) },
        { p: [-T * 0.5, -0.025 + p.tailLift, 0], rw: p.tailR * 0.5 / Math.sqrt(TD), rh: p.tailR * 0.6 * TD }
    ], 5);
    loftC(t1, tail1Keys, { sides: 6, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, capEnd: false });
    if (p.osteoderms) {
        tail1Keys.forEach((s, i) => {
            if (i > 3) return;
            cone(t1, [s.p[0], s.p[1] + s.rh * 0.9, 0], [s.p[0] - 0.006, s.p[1] + s.rh * 0.9 + p.bodyH * 0.18, 0], p.bodyR * 0.1, p.osteoderms, { sides: 4, rand });
        });
    }
    if (p.bristles) bristleRow(t1, tail1Keys, 0, 5, p, p.bristles.h, p.bristles.h * 1.05, rand);
    if (p.tailFin) tailFins(t1, tail1Keys, p.tailFin, (t) => 0.5 + t * 0.5, rand);
    if (p.sail) {
        // the sail runs on, low, over the base of the tail
        sailPanels(t1, tail1Keys, 0, 2, p.sail, rand, (t) => p.sail.h * 0.16 * (1 - t));
    }
    addMesh(tail1, t1, ctx);
    const tail2 = group(tail1, -T * 0.5, -0.025 + p.tailLift, 0);
    const t2 = new MeshBuilder();
    const tail2Keys = resample([
        { p: [0.004, 0, 0], rw: p.tailR * 0.5 / Math.sqrt(TD), rh: p.tailR * 0.6 * TD },
        { p: [-T * 0.5, -0.012 + p.tailLift * 0.6, 0], rw: 0.006, rh: 0.006 * TD }
    ], 5);
    loftC(t2, tail2Keys, { sides: 6, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, tipEnd: 0.012 });
    if (p.tailFin) tailFins(t2, tail2Keys, p.tailFin, (t) => 1.6 - t * 0.9, rand);
    if (p.bristles) {
        // the crest carries on to a long brush at the tail tip
        bristleRow(t2, tail2Keys, 0, 5, p, p.bristles.h * 1.05, p.bristles.h * 0.8, rand);
        const tipP = tail2Keys[4].p;
        for (let k = 0; k < 14; k++) {
            const a = (k / 13 - 0.5) * 1.6;
            const bx = tipP[0] + 0.01 + rand() * 0.06;
            cone(t2, [bx, tipP[1], 0], [bx - p.bristles.h * (1.1 + rand() * 0.6), tipP[1] + Math.sin(a) * p.bristles.h * 0.6, (rand() - 0.5) * p.bristles.h * 0.6], 0.006, k % 3 ? p.bristles.color : p.bristles.tip, { sides: 3, rand, capBase: false, squash: 0.5 });
        }
    }
    if (p.tailFan) {
        const fx = -T * 0.5;
        slab(t2, [[-T * 0.12, 0.0, 0.014], [fx * 0.8, 0.004, p.tailFan.w], [fx * 1.12, 0.008, p.tailFan.w * 0.5], [fx * 1.18, 0.006, 0], [fx * 1.12, 0.008, -p.tailFan.w * 0.5], [fx * 0.8, 0.004, -p.tailFan.w], [-T * 0.12, 0.0, -0.014]], 0.012, p.tailFan.color, { edgeColor: shade(p.tailFan.color, 0.85) });
    }
    addMesh(tail2, t2, ctx);
    parts.tail.push(tail1, tail2);

    // ---- neck ----
    const neck = group(body, L, H + 0.012 + p.chestDrop, 0);
    const nb = new MeshBuilder();
    const nx = Math.cos(p.neckUp) * p.neckLen;
    const ny = Math.sin(p.neckUp) * p.neckLen;
    // S-curved necks bow down then rise (allosaurs, coelurosaurs)
    const sOff = p.neckS * p.neckLen * 0.28;
    loftC(nb, [
        { p: [-0.02, -0.004, 0], rw: p.neckR * 1.35, rh: p.neckR * 1.45 },
        { p: [nx * 0.35 + sOff * 0.4, ny * 0.35 - sOff, 0], rw: p.neckR * 1.15, rh: p.neckR * 1.3 },
        { p: [nx * 0.7, ny * 0.7 + sOff * 0.2, 0], rw: p.neckR * 1.02, rh: p.neckR * 1.15 },
        { p: [nx, ny, 0], rw: p.neckR * 0.95, rh: p.neckR * 1.05 }
    ], { sides: 6, color: C.neck ?? C.body, bellyColor: C.throat ?? C.belly, ridgeColor: C.back, jitter: p.fluff, rand, capStart: false, capEnd: false });
    if (p.mane) {
        // shaggy feather mane along the top of the neck and shoulders
        for (let i = 0; i < 6; i++) {
            const t = i / 5;
            const bx = nx * t - L * 0.15 * (1 - t);
            const by = ny * t + p.neckR * 1.1;
            slab(nb, [[bx - 0.015, by, 0], [bx + 0.02, by, 0], [bx - 0.03, by + p.mane.h * (0.7 + (i % 2) * 0.4), 0]], p.neckR * 0.9, i % 2 ? p.mane.color : shade(p.mane.color, 0.85));
        }
    }
    if (p.bristles) {
        for (let i = 0; i < 3; i++) {
            const t = 0.05 + i * 0.12;
            const bx = nx * t;
            const by = ny * t + p.neckR * 1.2;
            const len = p.bristles.h * (0.35 - i * 0.08);
            for (const z of [-0.6, 0, 0.6]) cone(nb, [bx, by, z * p.neckR * 0.4], [bx - len * 0.6, by + len * 0.8, z * p.neckR * 0.8], 0.003, p.bristles.color, { sides: 3, rand, capBase: false });
        }
    }
    if (p.wattle) {
        blob(nb, [nx * 0.55, ny * 0.45 - p.neckR, 0], p.neckR * 0.9, p.wattle, { scale: [0.8, 1.2, 0.5], jitter: 0.2, rand });
    }
    addMesh(neck, nb, ctx);
    parts.neck.push(neck);

    // ---- head ----
    const head = group(neck, nx, ny, 0);
    head.rotation.z = -p.neckUp * 0.85 + p.headTilt;
    const hb = new MeshBuilder();
    const hl = p.headLen;
    const hh = p.headH;
    const hw = p.headW;
    const [sk0, sk1, sk2] = p.skull;
    const [sw0, sw1] = p.skullWidth;
    if (p.spinoSkull) {
        // long, low snout; a notch in the upper jaw behind the expanded rosette at the tip
        loftC(hb, [
            { p: [-hl * 0.1, -hh * 0.05, 0], rw: hw * 0.8 * sw0, rh: hh * 0.72 * sk0 },
            { p: [hl * 0.16, hh * 0.05, 0], rw: hw * sw0, rh: hh * sk0 },
            { p: [hl * 0.42, -hh * 0.05, 0], rw: hw * 0.62, rh: hh * 0.6, color: p.midSnout ?? undefined },
            { p: [hl * 0.7, -hh * 0.16, 0], rw: hw * 0.46, rh: hh * 0.4, color: p.beak ?? undefined },
            { p: [hl * 0.8, -hh * 0.22, 0], rw: hw * 0.4, rh: hh * 0.32, color: p.beak ?? undefined },
            { p: [hl * 0.92, -hh * 0.16, 0], rw: hw * 0.6, rh: hh * 0.42, color: p.beak ?? undefined }
        ], {
            sides: 6, color: C.head ?? C.body, bellyColor: C.mouth, ridgeColor: C.headTop ?? C.back,
            tipEnd: hl * 0.06, jitter: p.fluff * 0.5, rand
        });
        // nostrils set far back, just in front of the eyes, so it can breathe with its snout in the water
        for (const sd of [-1, 1]) blob(hb, [hl * 0.36, hh * 0.18, sd * hw * 0.32], hh * 0.09, '#141414', { detail: 1, jitter: 0, scale: [1.6, 0.6, 0.6], faceVary: 0 });
        // big conical teeth at the rosette, smaller ones behind the notch
        for (const sd of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const x = hl * (0.86 + i * 0.035);
                cone(hb, [x, -hh * 0.42, sd * hw * 0.42], [x + hh * 0.03, -hh * 0.42 - hh * 0.45 * p.teethSize, sd * hw * 0.44], hh * 0.06, '#f2ecd8', { sides: 4 });
            }
            for (let i = 0; i < 6; i++) {
                const x = hl * (0.3 + i * 0.07);
                cone(hb, [x, -hh * 0.36 - i * hh * 0.02, sd * hw * 0.42], [x, -hh * 0.36 - i * hh * 0.02 - hh * 0.16 * p.teethSize, sd * hw * 0.43], hh * 0.03, '#f2ecd8', { sides: 3 });
            }
        }
    } else loftC(hb, [
        { p: [-hl * 0.1, -hh * 0.05, 0], rw: hw * 0.8 * sw0, rh: hh * 0.72 * sk0 },
        { p: [hl * 0.18, hh * 0.04, 0], rw: hw * sw0, rh: hh * sk0 },
        { p: [hl * 0.52, -hh * 0.04 + (sk1 - 0.78) * hh * 0.3, 0], rw: hw * (0.5 + p.snout * 0.5) * sw1 / 0.75, rh: hh * sk1, color: p.midSnout ?? undefined },
        { p: [hl * 0.88, -hh * 0.14, 0], rw: hw * p.snout, rh: hh * sk2, color: p.beak ?? C.head ?? C.body }
    ], {
        sides: 6, color: C.head ?? C.body, bellyColor: p.teeth ? C.mouth : (C.belly), ridgeColor: C.headTop ?? C.back,
        tipEnd: hl * 0.08, jitter: p.fluff * 0.5, rand
    });
    eyes(hb, hl * 0.2, hh * 0.38 * sk0, hw * 0.78 * sw0, hh * 0.19 * p.eyeScale, C.eye ?? '#f2c230');
    if (p.jowl) blob(hb, [hl * 0.12, -hh * 0.45, 0], hh * 0.55 * p.jowl, C.belly, { scale: [1.2, 0.8, 0.9], jitter: 0.15, rand });
    if (p.teeth && !p.spinoSkull) teethRow(hb, hl * 0.3, hl * 0.86, -hh * 0.36, hw * 0.55, hh * 0.09 * p.teethSize, 7);
    if (p.nasalBumps) {
        // rugose, knobbly ridges along the top of the snout and over the eyes
        for (let i = 0; i < 6; i++) {
            const x = hl * (0.3 + i * 0.1);
            for (const sd of [-1, 1]) blob(hb, [x, hh * (0.62 - i * 0.07), sd * hw * 0.28], hh * (0.09 + (i % 2) * 0.03), p.nasalBumps, { jitter: 0.3, rand, scale: [1.3, 0.7, 1] });
        }
    }
    if (p.dome) blob(hb, [hl * 0.16, hh * 0.78, 0], hh * 0.42, p.dome, { scale: [1.2, 0.75, 1], jitter: 0.12, rand });
    if (p.horn) cone(hb, [hl * 0.62, hh * 0.22, 0], [hl * 0.66, hh * 0.22 + p.horn.h, 0], p.horn.r, p.horn.color, { sides: 5, rand, squash: 0.5 });
    if (p.rosette) blob(hb, [hl * 0.86, -hh * 0.12, 0], hw * 0.62, p.rosette, { scale: [1.5, 0.75, 1], jitter: 0.1, rand });
    if (p.lacrimal) {
        for (const s of [-1, 1]) cone(hb, [hl * 0.24, hh * 0.68, s * hw * 0.5], [hl * 0.2, hh * 0.68 + p.lacrimal.h, s * hw * 0.55], p.lacrimal.r, p.lacrimal.color, { sides: 4, rand });
    }
    if (p.crest) {
        slab(hb, [[hl * 0.3, hh * 0.6, 0], [hl * 0.78, hh * 0.25, 0], [hl * 0.7, hh * 0.25 + p.crest.h * 0.6, 0], [hl * 0.45, hh * 0.6 + p.crest.h, 0]], hw * 0.18, p.crest.color);
    }
    if (p.headFeathers) {
        for (let i = 0; i < 4; i++) {
            const x = -hl * 0.05 - i * hl * 0.06;
            slab(hb, [[x, hh * 0.55, 0], [x + hl * 0.06, hh * 0.6, 0], [x - hl * 0.14, hh * (0.95 + i * 0.12), 0]], hw * 0.2, p.headFeathers);
        }
    }
    addMesh(head, hb, ctx);
    parts.head = head;

    const jaw = group(head, hl * 0.02, -hh * 0.42, 0);
    const jb = new MeshBuilder();
    loftC(jb, [
        { p: [0, 0, 0], rw: hw * 0.72, rh: hh * 0.24 },
        { p: [hl * 0.55, -hh * 0.04, 0], rw: hw * 0.55, rh: hh * 0.2 },
        { p: [hl * 0.82, 0, 0], rw: hw * p.snout * 0.8, rh: hh * 0.15, color: p.beak ?? C.belly }
    ], { sides: 5, color: C.jaw ?? C.belly, ridgeColor: p.teeth ? C.mouth : null, ridgeThreshold: 0.5, tipEnd: hl * 0.05 });
    if (p.teeth) {
        for (const s of [-1, 1]) {
            for (let i = 0; i < 5; i++) {
                const x = hl * 0.2 + (hl * 0.55 * i) / 4;
                const th = hh * 0.15 * p.teethSize;
                jb.tri([x - hh * 0.04, hh * 0.15, s * hw * 0.45], [x + hh * 0.04, hh * 0.15, s * hw * 0.45], [x, hh * 0.15 + th, s * hw * 0.43], '#f4f0e0', [0, 0, s], true);
            }
        }
    }
    addMesh(jaw, jb, ctx);
    parts.jaw = jaw;

    // ---- legs ----
    const legH = H - 0.02;
    for (const s of [-1, 1]) {
        const pivot = group(body, 0.01, legH, s * p.bodyR * 0.72);
        const lb = new MeshBuilder();
        const knee = [p.thighR * (1.2 + p.crouch * 2), -legH * (0.45 - p.crouch * 0.08), s * 0.004];
        const ankle = [-p.thighR * (0.9 + p.crouch * 1.5), -legH * 0.82, s * 0.006];
        const pad = [-p.thighR * 0.3, -legH + 0.012, s * 0.008];
        loftC(lb, [
            { p: [0, 0.02, 0], rw: p.thighR * 0.75, rh: p.thighR * 1.15 },
            { p: [p.thighR * 0.6, -legH * 0.18, 0], rw: p.thighR * 0.85, rh: p.thighR * 1.1 },
            { p: knee, r: p.thighR * 0.55 },
            { p: ankle, r: p.thighR * 0.32, color: C.shin ?? shade(C.body, 0.85) },
            { p: pad, r: p.thighR * 0.28, color: C.shin ?? shade(C.body, 0.85) }
        ], { sides: 6, color: C.body, bellyColor: C.belly, jitter: p.fluff * 0.6, rand });
        // toes
        const tips = [];
        for (const a of [-0.45, 0, 0.45]) {
            const tl = p.thighR * (p.webbed ? 1.9 : 1.6) * (a === 0 ? 1.15 : 0.9);
            const tx = pad[0] + Math.cos(a) * tl;
            const tz = pad[2] + Math.sin(a) * tl * s;
            tips.push([tx, 0.004 - legH + 0.006, tz]);
            limb(lb, pad, [tx, 0.004 - legH + 0.006, tz], p.thighR * 0.22, p.thighR * 0.12, C.shin ?? shade(C.body, 0.8), { sides: 4 });
            const cl = p.thighR * (p.flatClaws ? 0.42 : 0.5);
            cone(lb, [tx, 0.006 - legH + 0.006, tz], [tx + Math.cos(a) * cl, 0.0 - legH + 0.003, tz + Math.sin(a) * s * cl], p.thighR * (p.flatClaws ? 0.13 : 0.1), C.claw, { sides: 4, squash: p.flatClaws ? 0.45 : 1 });
        }
        if (p.webbed) {
            // webbed feet for paddling
            for (let k = 0; k < 2; k++) slab(lb, [[pad[0], pad[1] - 0.004, pad[2]], tips[k], tips[k + 1]], 0.004, p.webbed);
        }
        if (p.sickle) {
            cone(lb, [pad[0] + p.thighR * 0.4, -legH + 0.03, pad[2] - s * 0.004], [pad[0] + p.thighR * 1.0, -legH + 0.07, pad[2]], p.thighR * 0.14, '#1a1a1a', { sides: 4 });
        }
        addMesh(pivot, lb, ctx);
        parts.legs.push({ pivot, side: s, phase: s > 0 ? 0 : Math.PI });
    }

    // ---- arms ----
    for (const s of [-1, 1]) {
        const pivot = group(body, L * 0.86, H - p.bodyH * 0.45 + p.chestDrop * 0.86, s * p.bodyR * 0.62 * BW);
        const ab = new MeshBuilder();
        const A = p.armLen;
        const elbow = p.handsDown ? [A * 0.05, -A * 0.48, s * 0.014] : [A * 0.15, -A * 0.5, s * 0.01];
        const hand = p.handsDown ? [A * 0.12, -A * 0.96, s * 0.016] : [A * 0.55, -A * 0.72, s * 0.012];
        loftC(ab, [{ p: [0, 0, 0], r: p.armR * 1.3 }, { p: elbow, r: p.armR }, { p: hand, r: p.armR * 0.8 }], { sides: 5, color: C.arm ?? C.body, jitter: p.fluff * 0.5, rand });
        if (p.thumbSpike) cone(ab, hand, [hand[0] + A * 0.04, hand[1] + A * 0.1, hand[2] + s * A * 0.12], p.armR * 0.6, p.thumbSpike, { sides: 5 });
        if (p.handsDown) {
            // hoof-like middle fingers bearing weight, as in Iguanodon
            blob(ab, [hand[0] + A * 0.03, hand[1] - 0.004, hand[2]], p.armR * 1.1, C.claw, { scale: [1.3, 0.6, 1], jitter: 0.1, rand });
        } else for (const a of [-0.35, 0, 0.35]) {
            const cl = A * 0.22 * (a === -0.35 ? p.clawScale : 1);
            cone(ab, hand, [hand[0] + cl, hand[1] - cl * 0.55 + a * A * 0.1, hand[2] + s * a * A * 0.1], p.armR * 0.5 * (a === -0.35 ? Math.sqrt(p.clawScale) : 1), C.claw, { sides: 4 });
        }
        if (p.wingFeathers) {
            slab(ab, [[0, -0.004, s * 0.006], elbow, hand, [hand[0] - A * 0.35, hand[1] - A * 0.55, s * 0.012], [-A * 0.3, -A * 0.5, s * 0.008]], 0.008, p.wingFeathers.color, { edgeColor: p.wingFeathers.bar });
            slab(ab, [[hand[0] - A * 0.2, hand[1] - A * 0.3, s * 0.017], [hand[0] - A * 0.32, hand[1] - A * 0.5, s * 0.017], [hand[0] - A * 0.45, hand[1] - A * 0.42, s * 0.017]], 0.006, p.wingFeathers.bar);
        }
        addMesh(pivot, ab, ctx);
        parts.arms.push({ pivot, side: s });
    }

    return finalize(model);
};

// ==================== SAUROPODS & STEGOSAURS (big quadrupeds) ====================
const QUAD_DEFAULTS = {
    hipH: 0.3, shoulderH: 0.28, bodyLen: 0.3, bodyR: 0.11, bodyH: 0.12, arch: 0.02,
    neckSegs: 3, neckLen: 0.3, neckUp: 0.4, neckBend: -0.12, neckR0: 0.06, neckR1: 0.03,
    headLen: 0.07, headH: 0.04, headW: 0.035, headShape: 'diplo', headPitch: -0.2,
    tailSegs: 3, tailLen: 0.5, tailR: 0.07, tailDroop: 0.12, tailCurl: 0.06,
    legR: 0.045, footR: 0.05, plates: null, spikes: null, shoulderSpike: null, stripes: false, spots: null,
    gauge: 0.72, // how far apart the legs stand (titanosaurs: wide-gauge)
    osteoderms: null, // colour of the bony armour plates scattered over a titanosaur's back
    dorsalRidge: null, // { h, color }: a ridge of tall neural spines along the back (rebbachisaurids)
    columnHands: false // finger-less, horseshoe-shaped front feet (titanosaurs)
};

export const buildQuadruped = (spec, ctx) => {
    const p = { ...QUAD_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.2), back: shade(p.colors.body, 0.85), stripe: shade(p.colors.body, 0.75), feet: shade(p.colors.body, 0.6), ...p.colors };
    const rand = mulberry32(hashString(p.name || 'quad'));
    const model = newModel('quad');
    const { body, parts } = model;
    const L = p.bodyLen;
    const stripes = p.stripes ? { every: 2, offset: 1, color: C.stripe } : null;
    const yHip = p.hipH + p.bodyH * 0.1;
    const ySh = p.shoulderH + p.bodyH * 0.1;

    const tb = new MeshBuilder();
    const torso = resample([
        { p: [-0.09, yHip - 0.005, 0], rw: p.bodyR * 0.7, rh: p.bodyH * 0.7 },
        { p: [0, yHip + p.arch * 0.5, 0], rw: p.bodyR * 0.95, rh: p.bodyH * 0.98 },
        { p: [L * 0.45, (yHip + ySh) / 2 + p.arch, 0], rw: p.bodyR * 1.05, rh: p.bodyH * 1.08, yOff: -p.bodyH * 0.08 },
        { p: [L * 0.88, ySh + p.arch * 0.3, 0], rw: p.bodyR * 0.88, rh: p.bodyH * 0.95 },
        { p: [L + 0.04, ySh + 0.01, 0], rw: p.neckR0 * 1.25, rh: p.neckR0 * 1.3 }
    ], 9);
    loftC(tb, torso, { sides: 8, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: 0.08, rand });
    if (p.spots) {
        for (let i = 0; i < 14; i++) {
            const s = torso[1 + Math.floor(rand() * 6)];
            const side = rand() > 0.5 ? 1 : -1;
            blob(tb, [s.p[0] + (rand() - 0.5) * 0.04, s.p[1] + s.rh * (0.1 + rand() * 0.6), side * s.rw * 0.88], p.bodyR * 0.12, p.spots, { jitter: 0.3, rand, scale: [1.2, 0.8, 0.4] });
        }
    }
    // plates / spikes on the back
    const backPlate = (mb, x, yTop, i, size) => {
        const z = i % 2 ? 0.012 : -0.012;
        const w = size * 0.75;
        const h = size;
        const pts = p.plates.pointed
            ? [[x - w / 2, yTop, z], [x + w / 2, yTop, z], [x + w * 0.05, yTop + h * 1.1, z]]
            : [[x - w / 2, yTop - 0.01, z], [x + w / 2, yTop - 0.01, z], [x + w * 0.38, yTop + h * 0.6, z], [x - w * 0.05, yTop + h, z], [x - w * 0.5, yTop + h * 0.5, z]];
        slab(mb, pts, 0.012, i % 3 === 0 ? p.plates.color : vary(p.plates.color, rand, 0.06), { edgeColor: p.plates.edge ?? shade(p.plates.color, 0.7) });
    };
    if (p.plates) {
        const n = p.plates.count ?? 9;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const s = torso[Math.round(1 + t * 7)];
            if (p.plates.untilT !== undefined && 1 - t > p.plates.untilT) continue;
            const size = p.plates.size * (0.55 + Math.sin(Math.PI * (0.25 + t * 0.75)) * 0.6);
            backPlate(tb, s.p[0], s.p[1] + s.rh * 0.85, i, size);
        }
    }
    if (p.spikes && p.spikes.back) {
        torso.forEach((s, i) => {
            if (i < 1 || i > 4) return;
            for (const side of [-1, 1]) {
                cone(tb, [s.p[0], s.p[1] + s.rh * 0.8, side * s.rw * 0.3], [s.p[0] - 0.03, s.p[1] + s.rh * 0.8 + p.spikes.size, side * s.rw * 0.45], p.spikes.size * 0.18, p.spikes.color, { sides: 4, rand });
            }
        });
    }
    if (p.osteoderms) {
        // scattered oval armour plates, bigger along the spine
        for (let i = 0; i < 26; i++) {
            const sc = torso[1 + Math.floor(rand() * 7)];
            const a = Math.PI / 2 + (rand() - 0.5) * 1.6;
            blob(tb, [sc.p[0] + (rand() - 0.5) * 0.04, sc.p[1] + (sc.yOff ?? 0) + Math.sin(a) * sc.rh * 0.98, Math.cos(a) * sc.rw * 0.98], p.bodyR * (0.07 + rand() * 0.06), p.osteoderms, { jitter: 0.25, rand, scale: [1.3, 0.55, 1] });
        }
    }
    if (p.dorsalRidge) {
        sailPanels(tb, torso, 1, 8, { color: p.dorsalRidge.color, thick: 0.02 }, rand, (t) => p.dorsalRidge.h * Math.pow(Math.sin(Math.PI * (0.12 + t * 0.8)), 0.7));
    }
    if (p.shoulderSpike) {
        for (const side of [-1, 1]) {
            const s = torso[6];
            cone(tb, [s.p[0], s.p[1], side * s.rw * 0.9], [s.p[0] - p.shoulderSpike.len * 0.6, s.p[1] + 0.01, side * (s.rw + p.shoulderSpike.len * 0.8)], p.shoulderSpike.len * 0.15, p.shoulderSpike.color, { sides: 5, rand });
        }
    }
    addMesh(body, tb, ctx);

    // ---- tail chain ----
    let parent = group(body, -0.09, yHip - 0.005, 0);
    let r0 = p.tailR;
    const segLen = p.tailLen / p.tailSegs;
    for (let i = 0; i < p.tailSegs; i++) {
        const seg = i === 0 ? parent : group(parent, -segLen, 0, 0);
        seg.rotation.z = i === 0 ? p.tailDroop : p.tailCurl;
        const r1 = i === p.tailSegs - 1 ? 0.004 : r0 * 0.62;
        const mb = new MeshBuilder();
        loftC(mb, resample([{ p: [0.004, 0, 0], r: r0 }, { p: [-segLen, 0, 0], r: r1 }], 4), {
            sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, rand, capStart: false, capEnd: i === p.tailSegs - 1, tipEnd: 0.01
        });
        if (p.plates && i === 0 && !p.plates.noTail) {
            for (let k = 0; k < 3; k++) backPlate(mb, -segLen * (0.2 + k * 0.3), r0 * (0.9 - k * 0.15), k + 1, p.plates.size * (0.7 - k * 0.15));
        }
        if (p.spikes && p.spikes.tail && i >= p.tailSegs - (p.spikes.tailSegs ?? 1)) {
            for (let k = 0; k < 2; k++) {
                for (const side of [-1, 1]) {
                    const x = -segLen * (0.45 + k * 0.3);
                    const len = p.spikes.tail;
                    cone(mb, [x, r0 * 0.4, side * r0 * 0.4], [x - len * 0.45, r0 * 0.4 + len * 0.55, side * (r0 * 0.4 + len * 0.75)], len * 0.13, p.spikes.color, { sides: 4, rand });
                }
            }
        }
        addMesh(seg, mb, ctx);
        parts.tail.push(seg);
        parent = seg;
        r0 = r1;
    }

    // ---- neck chain ----
    parent = group(body, L + 0.02, ySh + 0.01, 0);
    let nr = p.neckR0;
    const nLen = p.neckLen / p.neckSegs;
    let totalAngle = 0;
    for (let i = 0; i < p.neckSegs; i++) {
        const seg = i === 0 ? parent : group(parent, nLen, 0, 0);
        seg.rotation.z = i === 0 ? p.neckUp : p.neckBend;
        totalAngle += seg.rotation.z;
        const nr1 = nr - (p.neckR0 - p.neckR1) / p.neckSegs;
        const mb = new MeshBuilder();
        loftC(mb, resample([{ p: [-0.01, 0, 0], r: nr }, { p: [nLen + 0.004, 0, 0], r: nr1 }], 3), {
            sides: 7, color: C.neck ?? C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, rand, capStart: false, capEnd: false
        });
        if (p.plates && !p.plates.noNeck) backPlate(mb, nLen * 0.5, nr * 0.85, i, p.plates.size * 0.45);
        addMesh(seg, mb, ctx);
        parts.neck.push(seg);
        parent = seg;
        nr = nr1;
    }
    const head = group(parent, nLen, 0, 0);
    head.rotation.z = -totalAngle + p.headPitch;
    const hb = new MeshBuilder();
    const hl = p.headLen;
    const hh = p.headH;
    const hw = p.headW;
    const C_head = C.head ?? C.body;
    if (p.headShape === 'brachio') {
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.3, hh * 0.1, 0], rw: hw, rh: hh }, { p: [hl * 0.95, -hh * 0.2, 0], rw: hw * 0.7, rh: hh * 0.5 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.06 });
        blob(hb, [hl * 0.35, hh * 0.85, 0], hh * 0.55, C.crest ?? shade(C_head, 0.9), { scale: [1, 0.9, 0.7], jitter: 0.2, rand });
    } else if (p.headShape === 'camara') {
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.35, hh * 0.15, 0], rw: hw, rh: hh * 1.1 }, { p: [hl * 0.95, -hh * 0.1, 0], rw: hw * 0.85, rh: hh * 0.75 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.04 });
    } else if (p.headShape === 'rebbach') {
        // broad, square-ended muzzle for cropping low plants
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.35, hh * 0.05, 0], rw: hw, rh: hh }, { p: [hl * 0.8, -hh * 0.2, 0], rw: hw * 1.05, rh: hh * 0.55 }, { p: [hl * 1.0, -hh * 0.25, 0], rw: hw * 1.15, rh: hh * 0.45 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.02 });
    } else if (p.headShape === 'titan') {
        // titanosaur: short, broad snout with a raised nasal arch
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.3, hh * 0.15, 0], rw: hw, rh: hh * 1.05 }, { p: [hl * 0.95, -hh * 0.18, 0], rw: hw * 0.9, rh: hh * 0.55 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.04 });
        blob(hb, [hl * 0.4, hh * 0.7, 0], hh * 0.4, C.crest ?? shade(C_head, 0.92), { scale: [1.2, 0.8, 0.8], jitter: 0.2, rand });
    } else if (p.headShape === 'stego') {
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.35, hh * 0.05, 0], rw: hw, rh: hh }, { p: [hl * 0.95, -hh * 0.25, 0], rw: hw * 0.5, rh: hh * 0.45, color: C.beak ?? '#3a3028' }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.08 });
    } else {
        loftC(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.3, hh * 0.08, 0], rw: hw, rh: hh }, { p: [hl * 1.0, -hh * 0.15, 0], rw: hw * 0.75, rh: hh * 0.45 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.05 });
    }
    eyes(hb, hl * 0.3, hh * 0.45, hw * 0.75, hh * 0.22, C.eye ?? '#e8b830');
    addMesh(head, hb, ctx);
    parts.head = head;
    parts.jaw = null;

    // ---- legs (pillars) ----
    const legDefs = [
        { x: L * 0.9, y: p.shoulderH, front: true },
        { x: 0.0, y: p.hipH, front: false }
    ];
    for (const ld of legDefs) {
        for (const s of [-1, 1]) {
            const pivot = group(body, ld.x, ld.y, s * p.bodyR * p.gauge);
            const lb = new MeshBuilder();
            const H = ld.y;
            const R = p.legR * (ld.front ? 0.9 : 1.1);
            const bend = ld.front ? -0.02 : 0.03;
            loftC(lb, [
                { p: [0, p.bodyH * 0.25, 0], rw: R * 1.1, rh: R * 1.6 },
                { p: [bend * 0.5, -H * 0.15, 0], r: R * 1.05 },
                { p: [bend, -H * 0.55, 0], r: R * 0.85 },
                { p: [0, -H * 0.9, 0], r: R * 0.8, color: C.feet },
                { p: [0.006, -H + 0.004, 0], r: p.footR * (ld.front ? 0.9 : 1), color: C.feet }
            ], { sides: 7, color: C.body, bellyColor: C.belly, rand });
            if (ld.front && p.columnHands) {
                // a titanosaur hand: a column of bones with no claws at all
            } else if (ld.front) {
                // sauropod hands: only the thumb carries a claw
                blob(lb, [p.footR * 0.85, -H + 0.016, -s * p.footR * 0.35], p.footR * 0.26, '#d8d0b8', { jitter: 0.1, rand, scale: [1.2, 0.7, 0.7] });
            } else {
                // hind feet: three big curved claws on the inner toes
                for (let k = -1; k <= 1; k++) {
                    blob(lb, [p.footR * 0.85, -H + 0.012, k * p.footR * 0.45 - s * p.footR * 0.15], p.footR * 0.22, '#d8d0b8', { jitter: 0.1, rand, scale: [1.2, 0.6, 0.7] });
                }
            }
            addMesh(pivot, lb, ctx);
            const phase = (ld.front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI);
            parts.legs.push({ pivot, side: s, phase, front: ld.front });
        }
    }

    return finalize(model);
};

// ==================== SPRAWLERS (lizards, crocodiles, sphenodonts, mammals) ====================
const SPRAWL_DEFAULTS = {
    bodyLen: 0.3, bodyR: 0.07, bodyH: 0.055, legH: 0.06, sprawl: 0.06, upright: false,
    headLen: 0.13, headH: 0.045, headW: 0.05, snout: 0.45,
    tailLen: 0.5, tailR: 0.05, crest: null, scutes: null, ears: null, fluff: 0, nose: null,
    legR: 0.018, eyeScale: 1, teeth: false, stripes: false
};

export const buildSprawler = (spec, ctx) => {
    const p = { ...SPRAWL_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), stripe: shade(p.colors.body, 0.7), claw: '#2a2420', ...p.colors };
    const rand = mulberry32(hashString(p.name || 'sprawl'));
    const model = newModel(p.upright ? 'quad' : 'sprawl');
    const { body, parts } = model;
    const L = p.bodyLen;
    const Y = p.legH + p.bodyH * 0.5;
    const stripes = p.stripes ? { every: 2, offset: 1, color: C.stripe } : null;

    const tb = new MeshBuilder();
    const torso = resample([
        { p: [-0.04, Y, 0], rw: p.bodyR * 0.7, rh: p.bodyH * 0.8 },
        { p: [L * 0.3, Y + 0.004, 0], rw: p.bodyR, rh: p.bodyH },
        { p: [L * 0.75, Y + 0.002, 0], rw: p.bodyR * 0.95, rh: p.bodyH * 0.95 },
        { p: [L, Y + 0.004, 0], rw: p.bodyR * 0.7, rh: p.bodyH * 0.75 }
    ], 7);
    loftC(tb, torso, { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand });
    if (p.crest) torso.forEach((s, i) => cone(tb, [s.p[0], s.p[1] + s.rh * 0.9, 0], [s.p[0] - 0.01, s.p[1] + s.rh * 0.9 + p.crest.h, 0], p.crest.h * 0.35, p.crest.color, { sides: 4, rand }));
    if (p.scutes) torso.forEach((s) => {
        for (const side of [-1, 1]) blob(tb, [s.p[0], s.p[1] + s.rh * 0.85, side * s.rw * 0.35], s.rh * 0.22, p.scutes, { jitter: 0.2, rand, scale: [1.2, 0.6, 1] });
    });
    addMesh(body, tb, ctx);

    // tail (3 segments for a sinuous wave)
    let parent = body;
    let px = -0.04;
    let r0 = p.tailR;
    const segLen = p.tailLen / 3;
    for (let i = 0; i < 3; i++) {
        const seg = group(parent, px, i === 0 ? Y : 0, 0);
        if (i === 0) seg.rotation.z = p.upright ? -0.25 : -0.05;
        const r1 = i === 2 ? 0.004 : r0 * 0.65;
        const mb = new MeshBuilder();
        const tailKeys = resample([{ p: [0.004, 0, 0], rw: r0, rh: r0 * 0.85 }, { p: [-segLen, 0, 0], rw: r1, rh: r1 * 0.85 }], 3);
        loftC(mb, tailKeys, { sides: 6, color: C.tail ?? C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, capEnd: i === 2, tipEnd: 0.01 });
        if (p.crest && i < 2) tailKeys.forEach((s) => cone(mb, [s.p[0], s.rh * 0.8, 0], [s.p[0] - 0.01, s.rh * 0.8 + p.crest.h * 0.8, 0], p.crest.h * 0.3, p.crest.color, { sides: 4, rand }));
        if (p.scutes && i < 2) tailKeys.forEach((s) => {
            for (const side of [-1, 1]) cone(mb, [s.p[0], s.rh * 0.7, side * s.rw * 0.3], [s.p[0] - 0.01, s.rh * 0.7 + s.rh * 0.6, side * s.rw * 0.3], s.rh * 0.25, p.scutes, { sides: 4, rand });
        });
        addMesh(seg, mb, ctx);
        parts.tail.push(seg);
        parent = seg;
        px = -segLen;
        r0 = r1;
    }

    // head
    const neck = group(body, L, Y + 0.004, 0);
    parts.neck.push(neck);
    const head = group(neck, 0, 0, 0);
    const hb = new MeshBuilder();
    const hl = p.headLen;
    const hh = p.headH;
    const hw = p.headW;
    loftC(hb, [
        { p: [-0.01, 0, 0], rw: p.bodyR * 0.72, rh: p.bodyH * 0.75 },
        { p: [hl * 0.3, hh * 0.1, 0], rw: hw, rh: hh },
        { p: [hl * 0.95, -hh * 0.15, 0], rw: hw * p.snout, rh: hh * 0.5, color: C.snout ?? C.head ?? C.body }
    ], { sides: 6, color: C.head ?? C.body, bellyColor: C.belly, ridgeColor: C.back, tipEnd: hl * 0.06, jitter: p.fluff * 0.5, rand });
    eyes(hb, hl * 0.35, hh * 0.45, hw * 0.72, hh * 0.22 * p.eyeScale, C.eye ?? '#e8c040');
    if (p.nose) blob(hb, [hl * 1.02, -hh * 0.12, 0], hh * 0.16, p.nose, { detail: 1, jitter: 0, faceVary: 0 });
    if (p.ears) for (const s of [-1, 1]) blob(hb, [hl * 0.12, hh * 0.85, s * hw * 0.7], hh * 0.32, p.ears, { scale: [0.5, 1, 1], jitter: 0.1, rand });
    if (p.teeth) teethRow(hb, hl * 0.4, hl * 0.95, -hh * 0.3, hw * p.snout * 0.9, hh * 0.08, 7);
    if (p.tusks) {
        // BoarCroc: big fang-like teeth jutting up and down out of the jaws
        for (const sd of [-1, 1]) {
            for (const [x, up] of [[0.62, true], [0.78, false], [0.9, true]]) {
                const y0 = -hh * 0.18;
                cone(hb, [hl * x, y0, sd * hw * p.snout * 0.85], [hl * (x + 0.04), y0 + (up ? 1 : -1) * hh * 0.85, sd * hw * p.snout * 1.05], hh * 0.12, p.tusks, { sides: 4 });
            }
        }
        // rough, armoured snout
        for (let i = 0; i < 4; i++) blob(hb, [hl * (0.45 + i * 0.12), hh * 0.25, 0], hh * 0.16, shade(C.head ?? C.body, 0.85), { jitter: 0.3, rand, scale: [1.3, 0.6, 1.2] });
    }
    addMesh(head, hb, ctx);
    parts.head = head;

    // legs
    const legPos = [{ x: L * 0.85, front: true }, { x: L * 0.05, front: false }];
    for (const lp of legPos) {
        for (const s of [-1, 1]) {
            const pivot = group(body, lp.x, Y - p.bodyH * 0.2, s * p.bodyR * 0.75);
            const lb = new MeshBuilder();
            const hipY = Y - p.bodyH * 0.2;
            if (p.upright) {
                loftC(lb, [{ p: [0, 0.01, 0], r: p.legR * 1.4 }, { p: [lp.front ? -0.006 : 0.01, -hipY * 0.5, s * 0.004], r: p.legR }, { p: [0.004, -hipY + 0.006, s * 0.006], r: p.legR * 0.8, color: C.feet ?? shade(C.body, 0.8) }], { sides: 5, color: C.body, rand, jitter: p.fluff });
                limb(lb, [0.004, -hipY + 0.006, s * 0.006], [0.03, -hipY + 0.004, s * 0.008], p.legR * 0.8, p.legR * 0.5, C.feet ?? C.nose ?? shade(C.body, 0.8), { sides: 4 });
            } else {
                const knee = [lp.front ? 0.01 : -0.01, -hipY * 0.15, s * p.sprawl];
                const foot = [lp.front ? 0.02 : -0.005, -hipY + 0.005, s * p.sprawl * 1.25];
                loftC(lb, [{ p: [0, 0, 0], r: p.legR * 1.3 }, { p: knee, r: p.legR }, { p: foot, r: p.legR * 0.8 }], { sides: 5, color: C.body, rand });
                for (const a of [-0.6, -0.2, 0.2, 0.6]) {
                    const len = p.legR * 2.2;
                    const dir = lp.front ? 0 : -0.3;
                    cone(lb, foot, [foot[0] + Math.cos(a + dir) * len, foot[1] - 0.002, foot[2] + s * Math.abs(Math.sin(a + dir)) * len * 0.6 + Math.sin(a) * len * 0.5], p.legR * 0.3, C.claw, { sides: 4 });
                }
            }
            addMesh(pivot, lb, ctx);
            const phase = (lp.front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI);
            parts.legs.push({ pivot, side: s, phase, front: lp.front });
        }
    }

    return finalize(model);
};

// ==================== PTEROSAURS ====================
const PTERO_DEFAULTS = {
    bodyLen: 0.12, bodyR: 0.035, neckLen: 0.06, neckUp: 0.5, headLen: 0.16, headH: 0.03, headW: 0.025,
    wingSpan: 0.55, wingChord: 0.12, tailLen: 0.25, tailVane: null, crest: null, anuro: false,
    teeth: true, fluff: 0.15, legLen: 0.06,
    walking: false // on the ground on all fours with the wings folded (azhdarchids)
};

export const buildPterosaur = (spec, ctx) => {
    const p = { ...PTERO_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), membrane: shade(p.colors.body, 0.7), ...p.colors };
    const rand = mulberry32(hashString(p.name || 'ptero'));
    const model = newModel(p.walking ? 'quad' : p.grounded ? 'perched' : 'fly');
    if (p.walking) return buildWalkingPterosaur(p, model, ctx);
    const { body, parts } = model;
    const Y = 0.12;
    const L = p.bodyLen;

    const tb = new MeshBuilder();
    loftC(tb, resample([
        { p: [-0.02, Y, 0], rw: p.bodyR * 0.7, rh: p.bodyR * 0.7 },
        { p: [L * 0.45, Y + 0.004, 0], rw: p.bodyR, rh: p.bodyR * 1.05 },
        { p: [L, Y + 0.008, 0], rw: p.bodyR * 0.75, rh: p.bodyR * 0.8 }
    ], 5), { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, jitter: p.fluff, rand });
    addMesh(body, tb, ctx);

    // tail
    if (p.tailLen > 0.02) {
        const tail = group(body, -0.02, Y, 0);
        const mb = new MeshBuilder();
        loftC(mb, [{ p: [0.004, 0, 0], r: p.bodyR * 0.35 }, { p: [-p.tailLen, 0, 0], r: 0.004 }], { sides: 4, color: C.body, capStart: false, tipEnd: 0.01 });
        if (p.tailVane) slab(mb, [[-p.tailLen * 0.85, 0, 0], [-p.tailLen * 0.95, 0.03, 0], [-p.tailLen * 1.08, 0.0, 0], [-p.tailLen * 0.95, -0.02, 0]], 0.006, p.tailVane);
        addMesh(tail, mb, ctx);
        parts.tail.push(tail);
    }

    // neck + head
    const neck = group(body, L, Y + 0.008, 0);
    const nb = new MeshBuilder();
    const nx = Math.cos(p.neckUp) * p.neckLen;
    const ny = Math.sin(p.neckUp) * p.neckLen;
    loftC(nb, [{ p: [-0.01, 0, 0], r: p.bodyR * 0.6 }, { p: [nx, ny, 0], r: p.bodyR * 0.42 }], { sides: 6, color: C.neck ?? C.body, bellyColor: C.belly, jitter: p.fluff, rand, capStart: false, capEnd: false });
    addMesh(neck, nb, ctx);
    parts.neck.push(neck);
    const head = group(neck, nx, ny, 0);
    head.rotation.z = -p.neckUp * 0.8;
    const hb = new MeshBuilder();
    const hl = p.headLen;
    const hh = p.headH;
    const hw = p.headW;
    if (p.anuro) {
        // anurognathid: big round frog-like head, short wide mouth, huge eyes
        blob(hb, [hl * 0.25, 0, 0], hh, C.head ?? C.body, { detail: 1, jitter: 0.25, rand, scale: [1, 0.85, 1.15] });
        blob(hb, [hl * 0.55, -hh * 0.25, 0], hh * 0.7, C.face ?? C.head ?? C.body, { detail: 1, jitter: 0.15, rand, scale: [0.8, 0.55, 1.3] });
        eyes(hb, hl * 0.45, hh * 0.25, hh * 0.72, hh * 0.34, C.eyeRing ?? '#d89a30', '#0e0e0e');
    } else {
        loftC(hb, [
            { p: [-hl * 0.05, 0, 0], rw: hw, rh: hh * 1.1 },
            { p: [hl * 0.25, 0, 0], rw: hw * 0.85, rh: hh },
            { p: [hl * 0.95, -hh * 0.2, 0], rw: hw * 0.25, rh: hh * 0.3, color: C.beak ?? C.head ?? C.body }
        ], { sides: 5, color: C.head ?? C.body, bellyColor: C.belly, tipEnd: hl * 0.08 });
        eyes(hb, hl * 0.08, hh * 0.45, hw * 0.75, hh * 0.32, C.eye ?? '#f0c030');
        if (p.teeth) teethRow(hb, hl * 0.35, hl * 0.9, -hh * 0.4, hw * 0.4, hh * 0.12, 6);
        if (p.crest) {
            const cr = p.crest;
            if (cr.type === 'snout') {
                slab(hb, [[hl * 0.2, hh * 0.7, 0], [hl * 0.85, hh * 0.1, 0], [hl * 0.6, hh * 0.1 + cr.h * 0.7, 0], [hl * 0.35, hh * 0.7 + cr.h, 0]], hw * 0.25, cr.color, { edgeColor: cr.edge ?? shade(cr.color, 0.8) });
            } else {
                slab(hb, [[hl * 0.15, hh * 0.6, 0], [-hl * 0.15, hh * 0.5, 0], [-hl * 0.35, hh * 0.6 + cr.h * 0.9, 0], [hl * 0.05, hh * 0.6 + cr.h, 0]], hw * 0.3, cr.color, { edgeColor: cr.edge ?? shade(cr.color, 0.8) });
                if (cr.color2) slab(hb, [[-hl * 0.05, hh * 0.65, 0], [-hl * 0.3, hh * 0.6 + cr.h * 0.85, 0], [-hl * 0.1, hh * 0.6 + cr.h * 0.6, 0]], hw * 0.34, cr.color2);
            }
        }
    }
    addMesh(head, hb, ctx);
    parts.head = head;

    // wings (pivot at shoulder, membrane in xz-plane)
    for (const s of [-1, 1]) {
        const pivot = group(body, L * 0.75, Y + 0.012, s * p.bodyR * 0.6);
        const wb = new MeshBuilder();
        const S = p.wingSpan * 0.5;
        const ch = p.wingChord;
        const wrist = [ch * 0.2, 0.004, s * S * 0.38];
        const tip = [-ch * 0.65, 0, s * S];
        limb(wb, [0, 0, 0], wrist, p.bodyR * 0.3, p.bodyR * 0.22, C.arm ?? C.back, { sides: 4 });
        limb(wb, wrist, tip, p.bodyR * 0.2, 0.004, C.arm ?? C.back, { sides: 4 });
        for (const a of [0.4, 0.8]) cone(wb, wrist, [wrist[0] + 0.02, wrist[1] - 0.004, wrist[2] + s * 0.01 * a], 0.004, '#2a2420', { sides: 3 });
        addMesh(pivot, wb, ctx);
        const mb = new MeshBuilder();
        slab(mb, [[0.004, 0, 0], wrist, tip, [-ch * 0.75, 0, s * S * 0.6], [-L * 0.95, -0.004, s * 0.006]], 0.006, C.membrane, { edgeColor: shade(C.membrane, 0.8), backColor: shade(C.membrane, 0.85) });
        if (p.wingBand) slab(mb, [[wrist[0] - 0.01, 0.0045, wrist[2]], [tip[0] * 0.6, 0.0045, tip[2] * 0.8], [tip[0] * 0.8, 0.0045, tip[2] * 0.75], [-ch * 0.3, 0.0045, wrist[2] * 1.1]], 0.002, p.wingBand);
        addMesh(pivot, mb, ctx);
        parts.wings.push({ pivot, side: s });
    }

    // legs (small, trailing)
    for (const s of [-1, 1]) {
        const pivot = group(body, 0.0, Y - p.bodyR * 0.3, s * p.bodyR * 0.5);
        const lb = new MeshBuilder();
        limb(lb, [0, 0, 0], [-p.legLen * 0.5, -p.legLen * 0.8, s * 0.004], p.bodyR * 0.25, p.bodyR * 0.15, C.back, { sides: 4 });
        limb(lb, [-p.legLen * 0.5, -p.legLen * 0.8, s * 0.004], [-p.legLen * 0.3, -Y + 0.004, s * 0.006], p.bodyR * 0.14, p.bodyR * 0.1, '#2a2420', { sides: 4 });
        addMesh(pivot, lb, ctx);
        parts.legs.push({ pivot, side: s, phase: s > 0 ? 0 : Math.PI });
    }
    model.flapSpeed = p.flapSpeed ?? 6;
    return finalize(model);
};

// An azhdarchid on the ground: it walks on all fours like a giraffe-necked stork, the
// wings folded up along the long forearms, body tilted up at the front
const buildWalkingPterosaur = (p, model, ctx) => {
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), membrane: shade(p.colors.body, 0.7), ...p.colors };
    const rand = mulberry32(hashString(p.name || 'ptero'));
    const { body, parts } = model;
    const Y = p.legLen + 0.02;
    const L = p.bodyLen;
    const tilt = 0.35;
    const front = [L * Math.cos(tilt), Y + L * Math.sin(tilt), 0];
    const tb = new MeshBuilder();
    loftC(tb, [
        { p: [-0.02, Y, 0], rw: p.bodyR * 0.7, rh: p.bodyR * 0.75 },
        { p: [front[0] * 0.45, Y + front[1] * 0.0 + (front[1] - Y) * 0.45, 0], rw: p.bodyR, rh: p.bodyR * 1.05 },
        { p: front, rw: p.bodyR * 0.75, rh: p.bodyR * 0.8 }
    ], { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, jitter: p.fluff, rand });
    addMesh(body, tb, ctx);
    // neck, long and stiff, rising forward
    const neck = group(body, front[0], front[1], 0);
    const nb = new MeshBuilder();
    const nx = Math.cos(p.neckUp) * p.neckLen;
    const ny = Math.sin(p.neckUp) * p.neckLen;
    loftC(nb, [{ p: [-0.01, 0, 0], r: p.bodyR * 0.55 }, { p: [nx * 0.5, ny * 0.5, 0], r: p.bodyR * 0.36 }, { p: [nx, ny, 0], r: p.bodyR * 0.32 }], { sides: 6, color: C.neck ?? C.body, bellyColor: C.belly, jitter: p.fluff, rand, capStart: false, capEnd: false });
    addMesh(neck, nb, ctx);
    parts.neck.push(neck);
    const head = group(neck, nx, ny, 0);
    head.rotation.z = -0.65; // the great beak points down and forward, ready to stab
    const hb = new MeshBuilder();
    const hl = p.headLen;
    const hh = p.headH;
    const hw = p.headW;
    loftC(hb, [
        { p: [-hl * 0.12, 0, 0], rw: hw, rh: hh * 1.1 },
        { p: [hl * 0.2, 0, 0], rw: hw * 0.8, rh: hh },
        { p: [hl * 1.0, -hh * 0.1, 0], rw: hw * 0.08, rh: hh * 0.08, color: C.beak ?? C.head ?? C.body }
    ], { sides: 5, color: C.head ?? C.body, bellyColor: C.belly, tipEnd: hl * 0.04 });
    eyes(hb, hl * 0.02, hh * 0.45, hw * 0.75, hh * 0.3, C.eye ?? '#f0c030');
    if (p.crest) slab(hb, [[hl * 0.15, hh * 0.6, 0], [-hl * 0.12, hh * 0.5, 0], [-hl * 0.3, hh * 0.6 + p.crest.h * 0.9, 0], [hl * 0.05, hh * 0.6 + p.crest.h, 0]], hw * 0.3, p.crest.color);
    addMesh(head, hb, ctx);
    parts.head = head;
    // front limbs: the long wing-finger forearm used as a stilt, membrane folded against it
    const legs = [
        { x: front[0] * 0.85, y: front[1] - p.bodyR * 0.4, len: front[1] - p.bodyR * 0.4, front: true },
        { x: 0, y: Y - p.bodyR * 0.3, len: Y - p.bodyR * 0.3, front: false }
    ];
    for (const lg of legs) {
        for (const s of [-1, 1]) {
            const pivot = group(body, lg.x, lg.y, s * p.bodyR * 0.75);
            const lb = new MeshBuilder();
            const knee = lg.front ? [0.02, -lg.len * 0.5, s * 0.03] : [-0.015, -lg.len * 0.5, s * 0.01];
            const foot = [lg.front ? 0.01 : -0.005, -lg.len + 0.004, s * (lg.front ? 0.035 : 0.014)];
            limb(lb, [0, 0, 0], knee, p.bodyR * (lg.front ? 0.3 : 0.26), p.bodyR * 0.2, C.arm ?? C.back, { sides: 4 });
            limb(lb, knee, foot, p.bodyR * 0.2, p.bodyR * 0.13, C.arm ?? C.back, { sides: 4 });
            if (lg.front) {
                // the folded wing: a narrow sail of membrane along the forearm, the wing finger folded up behind
                slab(lb, [[0, -0.005, s * 0.012], knee, [knee[0] - 0.035, knee[1] + 0.03, knee[2] + s * 0.005], [-0.035, 0.01, s * 0.015]], 0.005, C.membrane, { edgeColor: shade(C.membrane, 0.8) });
                limb(lb, knee, [knee[0] - 0.09, knee[1] + 0.06, knee[2] + s * 0.004], p.bodyR * 0.12, p.bodyR * 0.06, C.arm ?? C.back, { sides: 3 });
            }
            addMesh(pivot, lb, ctx);
            parts.legs.push({ pivot, side: s, phase: (lg.front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI), front: lg.front });
        }
    }
    return finalize(model);
};

// ==================== SMALL ODDBALLS ====================
export const buildDragonfly = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(7);
    const model = newModel('flutter');
    const { body, parts } = model;
    const Y = 0.1;
    const mb = new MeshBuilder();
    blob(mb, [0.0, Y, 0], 0.035, C.thorax, { detail: 1, jitter: 0.2, rand, scale: [1.3, 1, 1] });
    loftC(mb, resample([{ p: [-0.03, Y, 0], r: 0.016 }, { p: [-0.4, Y + 0.01, 0], r: 0.008 }], 10), { sides: 5, color: C.abdomen, stripes: { every: 2, offset: 1, color: C.band }, tipEnd: 0.01 });
    eyes(mb, 0.045, Y + 0.012, 0.02, 0.022, C.eye, '#1a2a10');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) limb(mb, [0.01 - i * 0.012, Y - 0.02, s * 0.01], [0.02 - i * 0.02, Y - 0.06, s * 0.04], 0.003, 0.002, '#1a1a1a', { sides: 3 });
    addMesh(body, mb, ctx);
    for (const fwd of [0.012, -0.02]) {
        for (const s of [-1, 1]) {
            const pivot = group(body, fwd, Y + 0.025, s * 0.012);
            const wb = new MeshBuilder();
            slab(wb, [[0, 0, 0], [0.025, 0, s * 0.05], [0.015, 0, s * 0.3], [-0.03, 0, s * 0.31], [-0.02, 0, s * 0.05]], 0.003, C.wing, { edgeColor: C.wingEdge });
            addMesh(pivot, wb, ctx, true);
            parts.wings.push({ pivot, side: s, fast: true });
        }
    }
    model.flapSpeed = 40;
    return finalize(model);
};

export const buildCentipede = (spec, ctx) => {
    const C = spec.colors;
    const model = newModel('crawl');
    const { body, parts } = model;
    const n = 12;
    const segL = 0.08;
    let parent = body;
    for (let i = 0; i < n; i++) {
        const seg = group(parent, i === 0 ? 0 : -segL, i === 0 ? 0.025 : 0, 0);
        const mb = new MeshBuilder();
        const r = 0.03 * (i === 0 ? 1.05 : 1 - i * 0.02);
        loftC(mb, [{ p: [0.01, 0, 0], rw: r * 1.2, rh: r * 0.7 }, { p: [-segL + 0.006, 0, 0], rw: r * 1.1, rh: r * 0.65 }], { sides: 6, color: i % 2 ? C.body : C.alt, bellyColor: shade(C.body, 1.2) });
        for (const s of [-1, 1]) {
            const knee = [-segL * 0.45, 0.012, s * (r + 0.045)];
            limb(mb, [-segL * 0.5, -0.002, s * r], knee, 0.008, 0.006, C.legs, { sides: 4 });
            limb(mb, knee, [-segL * 0.3, -0.024, s * (r + 0.075)], 0.006, 0.003, C.legs, { sides: 4 });
        }
        if (i === 0) {
            eyes(mb, 0.02, 0.006, 0.016, 0.006, '#111');
            for (const s of [-1, 1]) {
                limb(mb, [0.02, 0.004, s * 0.01], [0.09, 0.03, s * 0.05], 0.003, 0.0015, C.legs, { sides: 3 });
                cone(mb, [0.02, -0.006, s * 0.012], [0.04, -0.008, s * 0.002], 0.005, '#3a1a0a', { sides: 3 });
            }
        }
        if (i === n - 1) for (const s of [-1, 1]) limb(mb, [-segL, 0, s * 0.01], [-segL - 0.06, 0.004, s * 0.035], 0.003, 0.0015, C.legs, { sides: 3 });
        if (spec.hindLegs && i === 5) {
            // two tiny hind legs, all that is left of a four-legged ancestor
            for (const sd of [-1, 1]) {
                limb(mb, [-segL * 0.5, -0.006, sd * 0.02], [-segL * 0.75, -0.02, sd * 0.045], 0.006, 0.004, spec.hindLegs, { sides: 3 });
                cone(mb, [-segL * 0.75, -0.02, sd * 0.045], [-segL * 0.85, -0.024, sd * 0.05], 0.004, '#2a2420', { sides: 3 });
            }
        }
        addMesh(seg, mb, ctx);
        parts.segs.push(seg);
        parent = seg;
    }
    return finalize(model);
};

export const buildScorpion = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(11);
    const model = newModel('crawl');
    const { body, parts } = model;
    const Y = 0.04;
    const mb = new MeshBuilder();
    loftC(mb, resample([{ p: [0.1, Y, 0], rw: 0.04, rh: 0.02 }, { p: [0.02, Y + 0.004, 0], rw: 0.055, rh: 0.026 }, { p: [-0.12, Y + 0.006, 0], rw: 0.05, rh: 0.024 }], 7), { sides: 6, color: C.body, stripes: { every: 2, offset: 1, color: shade(C.body, 0.8) } });
    eyes(mb, 0.09, Y + 0.02, 0.006, 0.006, '#111');
    for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const x = 0.05 - i * 0.04;
            limb(mb, [x, Y, s * 0.04], [x + 0.01 - i * 0.01, Y + 0.02, s * 0.09], 0.006, 0.005, C.legs, { sides: 4 });
            limb(mb, [x + 0.01 - i * 0.01, Y + 0.02, s * 0.09], [x + 0.015 - i * 0.02, 0.002, s * 0.12], 0.005, 0.003, C.legs, { sides: 4 });
        }
    }
    addMesh(body, mb, ctx);
    // pincers as arms
    for (const s of [-1, 1]) {
        const pivot = group(body, 0.1, Y, s * 0.03);
        const ab = new MeshBuilder();
        limb(ab, [0, 0, 0], [0.06, 0.005, s * 0.05], 0.008, 0.007, C.claw, { sides: 4 });
        limb(ab, [0.06, 0.005, s * 0.05], [0.1, 0.008, s * 0.03], 0.008, 0.008, C.claw, { sides: 4 });
        blob(ab, [0.13, 0.008, s * 0.03], 0.025, C.claw, { scale: [1.4, 0.7, 0.9], jitter: 0.15, rand });
        cone(ab, [0.15, 0.008, s * 0.02], [0.2, 0.008, s * 0.01], 0.008, shade(C.claw, 0.6), { sides: 4 });
        cone(ab, [0.15, 0.008, s * 0.04], [0.2, 0.008, s * 0.03], 0.008, shade(C.claw, 0.6), { sides: 4 });
        addMesh(pivot, ab, ctx);
        parts.arms.push({ pivot, side: s });
    }
    // tail chain curling over the back
    let parent = group(body, -0.12, Y + 0.006, 0);
    const n = 5;
    for (let i = 0; i < n; i++) {
        const seg = i === 0 ? parent : group(parent, -0.045, 0, 0);
        seg.rotation.z = i === 0 ? -0.6 : -0.55;
        const tmb = new MeshBuilder();
        loftC(tmb, [{ p: [0.005, 0, 0], r: 0.018 - i * 0.002 }, { p: [-0.045, 0, 0], r: 0.016 - i * 0.002 }], { sides: 5, color: C.tail });
        if (i === n - 1) {
            blob(tmb, [-0.06, 0, 0], 0.02, C.sting, { jitter: 0.1, rand, scale: [1.3, 0.9, 0.9] });
            cone(tmb, [-0.07, -0.004, 0], [-0.07, -0.05, 0], 0.007, '#1a1010', { sides: 4 });
        }
        addMesh(seg, tmb, ctx);
        parts.tail.push(seg);
        parent = seg;
    }
    return finalize(model);
};

export const buildCricket = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(13);
    const model = newModel('hop');
    const { body, parts } = model;
    const Y = 0.07;
    const mb = new MeshBuilder();
    loftC(mb, resample([{ p: [0.1, Y + 0.01, 0], rw: 0.03, rh: 0.035 }, { p: [0.03, Y + 0.01, 0], rw: 0.04, rh: 0.04 }, { p: [-0.18, Y + 0.0, 0], rw: 0.035, rh: 0.03 }], 6), { sides: 6, color: C.body, bellyColor: C.belly, stripes: { every: 2, offset: 1, color: shade(C.body, 0.85) }, tipEnd: 0.02 });
    blob(mb, [0.12, Y + 0.01, 0], 0.035, C.head, { jitter: 0.1, rand, scale: [1, 1.1, 0.9] });
    eyes(mb, 0.14, Y + 0.025, 0.026, 0.01, '#1a1a1a', '#000');
    for (const s of [-1, 1]) {
        limb(mb, [0.15, Y + 0.03, s * 0.012], [0.32, Y + 0.12, s * 0.08], 0.003, 0.0015, C.legs, { sides: 3 });
        limb(mb, [0.07, Y - 0.01, s * 0.02], [0.08, 0.002, s * 0.06], 0.006, 0.004, C.legs, { sides: 4 });
        limb(mb, [0.03, Y - 0.01, s * 0.025], [0.02, 0.002, s * 0.07], 0.006, 0.004, C.legs, { sides: 4 });
        // big jumping legs
        limb(mb, [-0.02, Y, s * 0.035], [-0.08, Y + 0.08, s * 0.06], 0.016, 0.01, C.thigh, { sides: 5 });
        limb(mb, [-0.08, Y + 0.08, s * 0.06], [-0.16, 0.004, s * 0.07], 0.008, 0.004, C.legs, { sides: 4 });
        slab(mb, [[0.04, Y + 0.035, s * 0.02], [-0.16, Y + 0.03, s * 0.03], [-0.12, Y + 0.045, s * 0.005]], 0.004, C.wing);
    }
    addMesh(body, mb, ctx);
    return finalize(model);
};

export const buildFrog = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(17);
    const model = newModel('hop');
    const { body, parts } = model;
    const mb = new MeshBuilder();
    blob(mb, [0, 0.09, 0], 0.11, C.body, {
        detail: 1, jitter: 0.12, rand, scale: [1.2, 0.7, 1], flatBottom: -0.6,
        colorFn: (ly, rr) => (ly < -0.2 ? C.belly : rr() > 0.85 ? C.spots : C.body)
    });
    blob(mb, [0.1, 0.11, 0], 0.08, C.body, { detail: 1, jitter: 0.1, rand, scale: [1, 0.6, 1.2], colorFn: (ly) => (ly < -0.2 ? C.belly : C.body) });
    eyes(mb, 0.1, 0.16, 0.06, 0.028, C.eye, '#111');
    for (const s of [-1, 1]) {
        limb(mb, [-0.06, 0.07, s * 0.08], [0.02, 0.04, s * 0.15], 0.035, 0.025, C.legs, { sides: 5 });
        limb(mb, [0.02, 0.04, s * 0.15], [-0.08, 0.01, s * 0.14], 0.02, 0.014, C.legs, { sides: 5 });
        limb(mb, [-0.08, 0.01, s * 0.14], [0.0, 0.004, s * 0.18], 0.012, 0.01, C.legs, { sides: 4 });
        limb(mb, [0.09, 0.06, s * 0.05], [0.14, 0.005, s * 0.09], 0.016, 0.01, C.legs, { sides: 4 });
    }
    addMesh(body, mb, ctx);
    return finalize(model);
};

export const buildTurtle = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(19);
    const model = newModel('quad');
    const { body, parts } = model;
    const mb = new MeshBuilder();
    blob(mb, [0, 0.07, 0], 0.18, C.shell, {
        detail: 1, jitter: 0.06, rand, scale: [1.1, 0.5, 0.9], flatBottom: -0.15,
        colorFn: (ly, rr) => (ly < 0 ? C.plastron : rr() > 0.6 ? C.scute : C.shell), faceVary: 0.03
    });
    addMesh(body, mb, ctx);
    const neck = group(body, 0.17, 0.07, 0);
    const head = group(neck, 0, 0, 0);
    const hb = new MeshBuilder();
    loftC(hb, [{ p: [-0.03, 0, 0], r: 0.03 }, { p: [0.06, 0.01, 0], r: 0.035 }, { p: [0.11, 0.0, 0], r: 0.022 }], { sides: 6, color: C.skin, tipEnd: 0.012 });
    eyes(hb, 0.08, 0.02, 0.025, 0.008, '#111', '#000');
    addMesh(head, hb, ctx);
    parts.neck.push(neck);
    parts.head = head;
    for (const [x, front] of [[0.11, true], [-0.1, false]]) {
        for (const s of [-1, 1]) {
            const pivot = group(body, x, 0.05, s * 0.12);
            const lb = new MeshBuilder();
            limb(lb, [0, 0, 0], [front ? 0.03 : -0.02, -0.045, s * 0.05], 0.03, 0.022, C.skin, { sides: 5 });
            addMesh(pivot, lb, ctx);
            parts.legs.push({ pivot, side: s, phase: (front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI) });
        }
    }
    return finalize(model);
};

export const buildSnake = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(23);
    const model = newModel('slither');
    const { body, parts } = model;
    const n = 8;
    const segL = 0.12;
    let parent = group(body, 0.45, 0.025, 0);
    for (let i = 0; i < n; i++) {
        const seg = i === 0 ? parent : group(parent, -segL, 0, 0);
        const mb = new MeshBuilder();
        const r0 = 0.026 * (i < 2 ? 1 : 1 - (i - 2) * 0.12);
        const r1 = i === n - 1 ? 0.004 : 0.026 * (1 - (i - 1) * 0.12 * (i > 1 ? 1 : 0));
        loftC(mb, resample([{ p: [0.006, 0, 0], rw: r0, rh: r0 * 0.8 }, { p: [-segL, 0, 0], rw: Math.max(0.004, r1), rh: Math.max(0.004, r1) * 0.8 }], 3), {
            sides: 6, color: C.body, bellyColor: C.belly, stripes: { every: 2, offset: i % 2, color: C.band }, capStart: i === 0, capEnd: i === n - 1, tipEnd: 0.02
        });
        if (i === 0) {
            blob(mb, [0.03, 0.004, 0], 0.034, C.head ?? C.body, { scale: [1.5, 0.7, 1], jitter: 0.1, rand });
            eyes(mb, 0.05, 0.016, 0.022, 0.008, '#e0b020', '#111');
            limb(mb, [0.08, 0, 0], [0.12, -0.002, 0.008], 0.003, 0.002, '#c02020', { sides: 3 });
            limb(mb, [0.08, 0, 0], [0.12, -0.002, -0.008], 0.003, 0.002, '#c02020', { sides: 3 });
        }
        addMesh(seg, mb, ctx);
        parts.segs.push(seg);
        parent = seg;
    }
    return finalize(model);
};

// Fish of every shape: shoal fish, eel-like bichirs with a row of finlets, lobe-finned
// coelacanths and lungfish, sharks, and a flat sawfish with its toothed rostrum
export const buildFish = (spec, ctx) => {
    const p = { len: 0.36, depth: 0.07, width: 0.045, tail: 'fork', dorsal: 'single', ...spec };
    const C = { belly: shade(spec.colors.body, 1.3), back: shade(spec.colors.body, 0.8), fin: shade(spec.colors.body, 0.85), ...spec.colors };
    const rand = mulberry32(hashString(p.name || 'fish'));
    const model = newModel('swim');
    model.swimSpeed = p.swimSpeed ?? 9;
    const { body, parts } = model;
    const Y = 0.1;
    const L = p.len;
    const D = p.depth;
    const W = p.width;
    const flat = p.flat ? 0.45 : 1;
    const nose = L * 0.6;
    const tailX = -L * 0.4;
    const mb = new MeshBuilder();
    const keys = [
        ...(p.beakLen ? [{ p: [nose + p.beakLen, Y - D * 0.05, 0], rw: W * 0.15, rh: D * 0.12 }, { p: [nose + p.beakLen * 0.4, Y - D * 0.04, 0], rw: W * 0.24, rh: D * 0.2 }] : []),
        { p: [nose, Y - D * 0.05, 0], rw: W * 0.4, rh: D * 0.35 * flat },
        { p: [nose - L * 0.18, Y, 0], rw: W, rh: D * flat },
        { p: [nose - L * 0.5, Y, 0], rw: W * 0.9, rh: D * 0.9 * flat },
        { p: [tailX, Y, 0], rw: W * 0.4, rh: D * 0.4 * flat }
    ];
    const secs = resample(keys, 7);
    loftC(mb, secs, { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes: p.bands ? { every: 2, offset: 1, color: p.bands } : null, tipStart: L * 0.06 });
    if (p.spots) {
        for (let i = 0; i < 12; i++) {
            const sc = secs[1 + Math.floor(rand() * 5)];
            const side = rand() > 0.5 ? 1 : -1;
            blob(mb, [sc.p[0] + (rand() - 0.5) * 0.03, sc.p[1] + sc.rh * (rand() * 0.8 - 0.2), side * sc.rw * 0.9], D * 0.12, p.spots, { jitter: 0.2, rand, scale: [1.3, 0.8, 0.4] });
        }
    }
    eyes(mb, nose - L * 0.08, Y + D * 0.25 * flat, W * 0.7, D * 0.14, C.eye ?? '#f0e0a0', '#111');
    if (p.teeth) teethRow(mb, nose - L * 0.12, nose - 0.005 + (p.beakLen || 0) * 0.9, Y - D * 0.18, W * 0.3, D * 0.08, p.beakLen ? 8 : 5);
    if (p.saw) {
        // long flat rostrum lined with barbed teeth
        const r0 = [nose - 0.01, Y - D * 0.05, 0];
        const r1 = [nose + p.saw.len, Y - D * 0.08, 0];
        slab(mb, [[r0[0], r0[1], -W * 0.3], [r1[0], r1[1], -W * 0.12], [r1[0], r1[1], W * 0.12], [r0[0], r0[1], W * 0.3]], 0.012, C.snout ?? C.back);
        for (let i = 1; i <= 8; i++) {
            const x = r0[0] + (r1[0] - r0[0]) * (i / 8.5);
            const zw = W * (0.3 - 0.18 * (i / 8));
            for (const sd of [-1, 1]) cone(mb, [x, r0[1], sd * zw], [x - 0.012, r0[1], sd * (zw + 0.03)], 0.006, '#f2ead6', { sides: 3 });
        }
    }
    // dorsal fin(s)
    const backAt = (sc) => [sc.p[0], sc.p[1] + sc.rh * 0.9, 0];
    if (p.dorsal === 'finlets') {
        for (let i = 1; i < secs.length - 1; i++) {
            const [x, y] = backAt(secs[i]);
            slab(mb, [[x + 0.012, y, 0], [x - 0.012, y, 0], [x - 0.006, y + D * 0.55, 0]], 0.005, C.fin);
        }
    } else if (p.dorsal === 'shark') {
        const [x, y] = backAt(secs[2]);
        slab(mb, [[x + L * 0.08, y, 0], [x - L * 0.08, y, 0], [x - L * 0.1, y + D * 1.3, 0]], 0.008, C.fin);
        cone(mb, [x + L * 0.07, y, 0], [x + L * 0.02, y + D * 1.2, 0], 0.008, '#f0e8d0', { sides: 3 }); // fin spine
        const [x2, y2] = backAt(secs[4]);
        slab(mb, [[x2 + L * 0.05, y2, 0], [x2 - L * 0.05, y2, 0], [x2 - L * 0.07, y2 + D * 0.8, 0]], 0.007, C.fin);
    } else if (p.dorsal === 'lobed') {
        for (const i of [2, 4]) {
            const [x, y] = backAt(secs[i]);
            blob(mb, [x, y + D * 0.25, 0], D * 0.32, C.fin, { scale: [1.2, 1, 0.3], jitter: 0.1, rand });
        }
    } else if (p.dorsal !== 'none') {
        const [x, y] = backAt(secs[2]);
        slab(mb, [[x + L * 0.08, y, 0], [x - L * 0.1, y, 0], [x - L * 0.04, y + D * 0.8, 0]], 0.006, C.fin);
    }
    // paired fins: lobed limbs on coelacanths and lungfish, plain fins otherwise, wide wings on the sawfish
    const finX = [nose - L * 0.25, nose - L * 0.6];
    for (const s of [-1, 1]) {
        for (const [k, fx] of finX.entries()) {
            if (p.lobed) {
                limb(mb, [fx, Y - D * 0.4, s * W * 0.7], [fx - L * 0.07, Y - D * 0.75, s * W * 1.6], D * 0.16, D * 0.1, C.fin, { sides: 4 });
            } else if (p.flat && k === 0) {
                slab(mb, [[fx + L * 0.05, Y - D * 0.2, s * W * 0.8], [fx - L * 0.12, Y - D * 0.25, s * W * 2.3], [fx - L * 0.18, Y - D * 0.25, s * W * 0.9]], 0.006, C.fin);
            } else {
                slab(mb, [[fx, Y - D * 0.45, s * W * 0.75], [fx - L * 0.07, Y - D * 0.8, s * W * 1.5], [fx - L * 0.04, Y - D * 0.45, s * W * 0.85]], 0.004, C.fin);
            }
        }
    }
    addMesh(body, mb, ctx);
    const tail = group(body, tailX, Y, 0);
    const tb = new MeshBuilder();
    const T = D * (p.tailSize ?? 1);
    if (p.tail === 'shark') slab(tb, [[0.01, 0, 0], [-L * 0.2, T * 1.2, 0], [-L * 0.12, 0, 0], [-L * 0.08, -T * 0.5, 0]], 0.007, C.fin);
    else if (p.tail === 'round' || p.tail === 'eel') {
        const tl = p.tail === 'eel' ? L * 0.32 : L * 0.2;
        loftC(tb, [{ p: [0.004, 0, 0], rw: W * 0.4, rh: D * 0.4 * flat }, { p: [-tl, 0, 0], rw: 0.004, rh: 0.004 }], { sides: 5, color: C.body, bellyColor: C.belly, capStart: false, tipEnd: 0.01 });
        slab(tb, [[0.004, T * 0.35, 0], [-tl * 1.05, T * 0.1, 0], [-tl * 1.05, -T * 0.1, 0], [0.004, -T * 0.35, 0]], 0.005, C.fin);
    } else if (p.tail === 'diphycercal') {
        // coelacanth: a three-lobed tail with a little middle lobe
        slab(tb, [[0.01, 0, 0], [-L * 0.14, T * 0.8, 0], [-L * 0.12, 0, 0], [-L * 0.14, -T * 0.8, 0]], 0.007, C.fin);
        blob(tb, [-L * 0.15, 0, 0], T * 0.18, C.fin, { scale: [1.5, 1, 0.4], jitter: 0, rand });
    } else slab(tb, [[0.01, 0, 0], [-L * 0.25, T * 0.95, 0], [-L * 0.16, 0, 0], [-L * 0.25, -T * 0.85, 0]], 0.006, C.fin);
    addMesh(tail, tb, ctx);
    parts.tail.push(tail);
    return finalize(model);
};

// Small long-necked plesiosaur: a flat teardrop body rowed along by four flippers
export const buildPlesiosaur = (spec, ctx) => {
    const C = { belly: shade(spec.colors.body, 1.3), back: shade(spec.colors.body, 0.85), ...spec.colors };
    const rand = mulberry32(hashString(spec.name || 'plesio'));
    const model = newModel('swim');
    model.swimSpeed = 2.5;
    const { body, parts } = model;
    const Y = 0.08;
    const mb = new MeshBuilder();
    const secs = resample([
        { p: [-0.12, Y, 0], rw: 0.02, rh: 0.016 },
        { p: [-0.04, Y + 0.004, 0], rw: 0.075, rh: 0.042 },
        { p: [0.06, Y + 0.006, 0], rw: 0.08, rh: 0.045 },
        { p: [0.13, Y + 0.004, 0], rw: 0.04, rh: 0.03 }
    ], 7);
    loftC(mb, secs, { sides: 8, color: C.body, bellyColor: C.belly, ridgeColor: C.back, rand, jitter: 0.05 });
    if (C.spots) for (let i = 0; i < 12; i++) {
        const sc = secs[1 + Math.floor(rand() * 5)];
        blob(mb, [sc.p[0], sc.p[1] + sc.rh * 0.7, (rand() - 0.5) * sc.rw * 1.4], 0.012, C.spots, { jitter: 0.2, rand, scale: [1.2, 0.4, 1] });
    }
    addMesh(body, mb, ctx);
    const neck = group(body, 0.13, Y + 0.004, 0);
    const nb = new MeshBuilder();
    loftC(nb, [{ p: [-0.01, 0, 0], r: 0.03 }, { p: [0.1, 0.02, 0], r: 0.02 }, { p: [0.2, 0.05, 0], r: 0.016 }], { sides: 6, color: C.neck ?? C.body, bellyColor: C.belly, capStart: false, capEnd: false });
    addMesh(neck, nb, ctx);
    parts.neck.push(neck);
    const head = group(neck, 0.2, 0.05, 0);
    const hb = new MeshBuilder();
    loftC(hb, [{ p: [-0.01, 0, 0], rw: 0.02, rh: 0.016 }, { p: [0.04, 0, 0], rw: 0.018, rh: 0.014 }, { p: [0.075, -0.004, 0], rw: 0.007, rh: 0.007 }], { sides: 6, color: C.head ?? C.body, bellyColor: C.belly, tipEnd: 0.006 });
    eyes(hb, 0.012, 0.008, 0.016, 0.006, C.eye ?? '#f0d040');
    teethRow(hb, 0.03, 0.07, -0.008, 0.01, 0.006, 4);
    addMesh(head, hb, ctx);
    parts.head = head;
    for (const [x, front] of [[0.06, true], [-0.06, false]]) {
        for (const s of [-1, 1]) {
            const pivot = group(body, x, Y - 0.01, s * 0.06);
            const fb = new MeshBuilder();
            slab(fb, [[0.025, 0, 0], [-0.01, -0.005, s * (front ? 0.13 : 0.11)], [-0.03, -0.005, s * (front ? 0.12 : 0.1)], [-0.025, 0, 0]], 0.008, C.flipper ?? C.back);
            addMesh(pivot, fb, ctx);
            parts.legs.push({ pivot, side: s, phase: front ? 0 : Math.PI, flipper: true });
        }
    }
    const tail = group(body, -0.12, Y, 0);
    parts.tail.push(tail);
    return finalize(model);
};

// Small furry mammal (docodont / multituberculate-like)
export const buildMammal = (spec, ctx) => buildSprawler({
    name: 'mammal', upright: true, bodyLen: 0.26, bodyR: 0.075, bodyH: 0.07, legH: 0.045, legR: 0.016,
    headLen: 0.15, headH: 0.055, headW: 0.05, snout: 0.3, tailLen: 0.38, tailR: 0.012, fluff: 0.35,
    ears: '#c08060', nose: '#e0909a', eyeScale: 1.1, ...spec
}, ctx);

// ==================== SPECIES TABLE ====================
// Colours and proportions are taken from the pixel art in public/assets/dinos and,
// for the obscure Morrison species, from published life reconstructions.
// Colours follow the bold, flat palettes of Ricardo Delgado's Age of Reptiles
// comics: zebra and tiger stripes, ochres, slate blues, sage greens and reds.
const spino = (level, colors, name) => ({ build: (spec, ctx) => buildSpino(level, ctx, colors, { name }), spec: {} });

export const SPECIES_MODELS = {
    Dragonfly: { build: buildDragonfly, minLen: 0.17, spec: { colors: { thorax: '#6aa832', abdomen: '#9a3a1e', band: '#2f5a1e', eye: '#7ad040', wing: '#d8f0ff', wingEdge: '#6a8aa8' } } },
    Centipede: { build: buildCentipede, minLen: 0.2, spec: { colors: { body: '#b8582a', alt: '#8f3e1c', legs: '#e08a40' } } },
    Cricket: { build: buildCricket, minLen: 0.15, spec: { colors: { body: '#6a5a2a', belly: '#9a8a4a', head: '#4a3a1a', legs: '#5a4a24', thigh: '#7a6a32', wing: '#8a7a3a' } } },
    Scorpion: { build: buildScorpion, minLen: 0.17, spec: { colors: { body: '#3b2a20', legs: '#5a4030', claw: '#6a4426', tail: '#7a5a2a', sting: '#c88a2a' } } },
    Frog: { build: buildFrog, minLen: 0.16, spec: { colors: { body: '#5aa040', belly: '#e0e080', spots: '#2f6a22', legs: '#4a8a34', eye: '#e8b020' } } },
    Lizard: { build: buildSprawler, spec: { name: 'Lizard', bodyLen: 0.26, bodyR: 0.055, bodyH: 0.04, legH: 0.04, sprawl: 0.06, headLen: 0.11, headH: 0.04, headW: 0.04, snout: 0.5, tailLen: 0.6, tailR: 0.04, colors: { body: '#d9822b', belly: '#f0b060', back: '#b8641c', stripe: '#c0702a' }, stripes: false } },
    // --- water life ---
    Fish: { build: buildFish, minLen: 0.17, spec: { len: 0.32, depth: 0.075, colors: { body: '#f0902c', belly: '#f8d27a', back: '#c8601c', fin: '#e06a24', eye: '#1a1a1a' } } },
    Lungfish: { build: buildFish, spec: { len: 0.46, depth: 0.05, width: 0.045, tail: 'round', dorsal: 'none', lobed: true, spots: '#4a3a26', colors: { body: '#8a7a4e', belly: '#d8c89a', back: '#5e5034', fin: '#6e6040' } } },
    Calamopleurus: { build: buildFish, spec: { len: 0.46, depth: 0.06, tail: 'round', teeth: true, bands: '#3a4a3a', colors: { body: '#6e8a5a', belly: '#e0dcae', back: '#3e5a3a', fin: '#c8a040' } } },
    Bawitius: { build: buildFish, spec: { len: 0.6, depth: 0.045, width: 0.04, tail: 'eel', dorsal: 'finlets', spots: '#5a3a14', swimSpeed: 6, colors: { body: '#c8a04a', belly: '#f0dca0', back: '#8a6a2a', fin: '#a87a2a' } } },
    Tribodus: { build: buildFish, spec: { len: 0.5, depth: 0.06, tail: 'shark', dorsal: 'shark', colors: { body: '#6a7e94', belly: '#e4e8ea', back: '#46566a', fin: '#55667a' } } },
    Mawsonia: { build: buildFish, spec: { len: 0.44, depth: 0.1, width: 0.05, tail: 'diphycercal', dorsal: 'lobed', lobed: true, spots: '#e8ecf0', swimSpeed: 4, colors: { body: '#3a5a8e', belly: '#8aa2c4', back: '#26406a', fin: '#2e4a78', eye: '#e8d060' } } },
    Onchopristis: { build: buildFish, spec: { len: 0.5, depth: 0.05, width: 0.09, flat: true, saw: { len: 0.32 }, tail: 'shark', dorsal: 'shark', swimSpeed: 5, colors: { body: '#c4a676', belly: '#f2e8d2', back: '#9a7c50', fin: '#a88a5a', snout: '#b49660' } } },
    'River Plesiosaur': { build: buildPlesiosaur, spec: { colors: { body: '#4a6a7e', belly: '#d8e2e4', back: '#30485a', spots: '#26384a', flipper: '#3a5466', eye: '#f0c040' } } },
    Obaichthys: { build: buildFish, spec: { len: 0.44, depth: 0.05, width: 0.04, beakLen: 0.16, tail: 'round', teeth: true, spots: '#2a2a1a', swimSpeed: 5, colors: { body: '#b8a04a', belly: '#f0e4b0', back: '#6a5a2a', fin: '#8a6a2a', eye: '#f0d040' } } },
    Simoliophis: { build: buildSnake, spec: { colors: { body: '#c8c0a0', belly: '#f0ead6', band: '#3a4a52', head: '#a8a088' } } },
    Pachyrhachis: { build: buildSnake, spec: { hindLegs: '#6a7a4a', colors: { body: '#7a9a5a', belly: '#e8e4b8', band: '#2a3a24', head: '#6a8a4a' } } },
    Hamadachelys: { build: buildTurtle, spec: { colors: { shell: '#5a6a3a', scute: '#c8a040', plastron: '#e8d8a8', skin: '#6a7a5a' } } },
    Lapparentophis: { build: buildSnake, spec: { colors: { body: '#e8c040', belly: '#f4e4a8', band: '#1e1a16', head: '#d0a030' } } },
    // --- crocodiles ---
    Araripesuchus: { build: buildSprawler, spec: { name: 'Araripesuchus', upright: true, bodyLen: 0.28, bodyR: 0.055, bodyH: 0.05, legH: 0.09, legR: 0.016, headLen: 0.12, headH: 0.045, headW: 0.04, snout: 0.5, tailLen: 0.5, tailR: 0.04, teeth: true, stripes: true, scutes: '#5a3a1e', colors: { body: '#c8783a', belly: '#f0d0a0', back: '#8a4a22', stripe: '#5a2e14', eye: '#f0d040' } } },
    // BoarCroc: long legs held under the body, a blunt armoured snout and tusks
    Kaprosuchus: { build: buildSprawler, spec: { name: 'Kaprosuchus', upright: true, bodyLen: 0.3, bodyR: 0.06, bodyH: 0.055, legH: 0.11, legR: 0.02, headLen: 0.17, headH: 0.06, headW: 0.05, snout: 0.75, tailLen: 0.48, tailR: 0.045, teeth: false, tusks: '#f2ecd8', stripes: true, scutes: '#3a2a1e', colors: { body: '#6a5a8a', belly: '#e0d4c0', back: '#3e3456', stripe: '#d8a040', head: '#5a4a7a', eye: '#f0e060' } } },
    Laganosuchus: { build: buildSprawler, spec: { name: 'Laganosuchus', bodyLen: 0.32, bodyR: 0.08, bodyH: 0.04, legH: 0.03, sprawl: 0.09, legR: 0.02, headLen: 0.22, headH: 0.025, headW: 0.085, snout: 0.85, tailLen: 0.48, tailR: 0.05, teeth: true, scutes: '#4a4a2e', colors: { body: '#7a7a4a', belly: '#d4c89a', back: '#55552e', snout: '#8a8a56', eye: '#e8c020' } } },
    Elosuchus: { build: buildSprawler, spec: { name: 'Elosuchus', bodyLen: 0.32, bodyR: 0.07, bodyH: 0.045, legH: 0.035, sprawl: 0.08, legR: 0.02, headLen: 0.3, headH: 0.035, headW: 0.04, snout: 0.35, tailLen: 0.52, tailR: 0.055, teeth: true, stripes: true, scutes: '#1e3a26', colors: { body: '#2e5a3a', belly: '#e0d488', back: '#1e3a26', stripe: '#d8b840', eye: '#f0d040' } } },
    Aegisuchus: { build: buildSprawler, spec: { name: 'Aegisuchus', bodyLen: 0.34, bodyR: 0.09, bodyH: 0.05, legH: 0.035, sprawl: 0.1, legR: 0.025, headLen: 0.24, headH: 0.035, headW: 0.08, snout: 0.75, tailLen: 0.48, tailR: 0.06, teeth: true, scutes: '#3a4448', crest: { h: 0.012, color: '#6a5a3a' }, colors: { body: '#5a666a', belly: '#c8c4a8', back: '#3a4448', snout: '#6e5e40', eye: '#e8b020' } } },
    // --- pterosaurs ---
    // a small toothed bird (drawn with the pterosaur rig): blue wings, an orange breast and a fan of tail feathers
    Enantiornithine: { build: buildPterosaur, minLen: 0.16, spec: { name: 'Enantiornithine', bodyLen: 0.09, bodyR: 0.04, neckLen: 0.04, neckUp: 0.6, headLen: 0.07, headH: 0.03, headW: 0.026, wingSpan: 0.6, wingChord: 0.16, tailLen: 0.08, tailVane: '#2a5a8a', teeth: true, fluff: 0.4, flapSpeed: 14, wingBand: '#f0e8d8', colors: { body: '#2e6a9a', belly: '#f08a3a', back: '#1e4a6e', membrane: '#2a5a8a', head: '#2e6a9a', beak: '#3a3028', eye: '#f0d040' } } },
    Leptostomia: { build: buildPterosaur, spec: { name: 'Leptostomia', bodyLen: 0.1, bodyR: 0.032, neckLen: 0.08, neckUp: 0.6, headLen: 0.22, headH: 0.02, headW: 0.018, wingSpan: 0.7, wingChord: 0.12, tailLen: 0.03, teeth: false, colors: { body: '#e8dcc4', belly: '#f6f0e2', back: '#b8a888', membrane: '#c87a4a', head: '#e8dcc4', beak: '#3a3430' } } },
    Afrotapejara: { build: buildPterosaur, spec: { name: 'Afrotapejara', bodyLen: 0.11, bodyR: 0.04, neckLen: 0.08, neckUp: 0.7, headLen: 0.12, headH: 0.04, headW: 0.028, wingSpan: 0.8, wingChord: 0.14, tailLen: 0.03, teeth: false, crest: { type: 'snout', h: 0.09, color: '#e03a2a', edge: '#f0c030' }, colors: { body: '#2e6a6a', belly: '#e8e0c8', back: '#1e4a4e', membrane: '#3a5a5a', head: '#2e6a6a', beak: '#f0c030' } } },
    Siroccopteryx: { build: buildPterosaur, spec: { name: 'Siroccopteryx', bodyLen: 0.12, bodyR: 0.038, neckLen: 0.07, headLen: 0.2, headH: 0.032, headW: 0.024, wingSpan: 1.1, wingChord: 0.13, tailLen: 0.03, crest: { type: 'snout', h: 0.03, color: '#e8e4dc' }, wingBand: '#1e1e22', colors: { body: '#f0ece2', belly: '#ffffff', back: '#b8b8b8', membrane: '#8a8a90', head: '#f0ece2', beak: '#e0c060' } } },
    Alanqa: { build: buildPterosaur, spec: { name: 'Alanqa', walking: true,  bodyLen: 0.13, bodyR: 0.05, neckLen: 0.32, neckUp: 1.05, headLen: 0.24, legLen: 0.17, headH: 0.036, headW: 0.026, wingSpan: 0.7, wingChord: 0.12, tailLen: 0.02, teeth: false, crest: { type: 'back', h: 0.04, color: '#d0402a' }, colors: { body: '#e8dcc0', belly: '#f4ecd8', back: '#a89a7a', membrane: '#b8502e', neck: '#e8dcc0', head: '#e05a3a', beak: '#3a3028' } } },
    'Injured Pterosaur': { build: buildPterosaur, spec: { name: 'Injured Pterosaur', grounded: true, bodyLen: 0.12, bodyR: 0.04, neckLen: 0.1, neckUp: 0.5, headLen: 0.18, headH: 0.035, wingSpan: 0.8, wingChord: 0.14, tailLen: 0.05, crest: { type: 'back', h: 0.045, color: '#c87a3a' }, colors: { body: '#8a5a3a', belly: '#c89a70', back: '#5a3a24', membrane: '#6a3a24', head: '#8a5a3a', beak: '#c8b090' } } },
    // --- dinosaurs ---
    // feathered raptor: rust with dark bars, blue-black wing feathers with white tips and a sickle claw
    Dromaeosaur: { build: buildBiped, spec: { name: 'Dromaeosaur', hipH: 0.3, bodyLen: 0.22, bodyR: 0.06, bodyH: 0.07, neckLen: 0.13, neckR: 0.03, neckS: 0.9, neckUp: 0.8, headLen: 0.13, headH: 0.05, headW: 0.036, skull: [1, 0.75, 0.45], tailLen: 0.55, tailR: 0.04, tailLift: 0.02, thighR: 0.04, armLen: 0.13, armR: 0.012, fluff: 0.45, sickle: true, teethSize: 0.6, stripes: true, headFeathers: '#2a2e3a', wingFeathers: { color: '#2a2e3a', bar: '#f0ece0' }, tailFan: { w: 0.07, color: '#2a2e3a' }, colors: { body: '#c8642a', belly: '#f0d8b0', back: '#7a3414', stripe: '#3a1e10', head: '#b85a28', eye: '#f0d040' } } },
    // zebra-striped little hunter with a red face
    Noasaurid: { build: buildBiped, spec: { name: 'Noasaurid', teethSize: 0.6,  hipH: 0.34, bodyLen: 0.22, bodyR: 0.05, bodyH: 0.06, neckLen: 0.15, neckR: 0.026, neckS: 0.9, neckUp: 0.8, headLen: 0.12, headH: 0.045, headW: 0.032, skull: [1, 0.72, 0.45], tailLen: 0.6, tailR: 0.035, thighR: 0.038, armLen: 0.06, armR: 0.01, fluff: 0.25, stripes: true, mane: { h: 0.03, color: '#1e1e22' }, colors: { body: '#f0ece0', belly: '#ffffff', back: '#2a2a2e', stripe: '#1e1e22', head: '#d84a34', headTop: '#2a2a2e', eye: '#f0d040' } } },
    // iguanodonts in bold zebra stripes, like the herds of the comics
    Iguanodont: { build: buildBiped, spec: { name: 'Iguanodont', handsDown: true, thumbSpike: '#ece4cc', chestDrop: -0.03,  hipH: 0.32, bodyLen: 0.32, bodyR: 0.1, bodyH: 0.115, chestDepth: 1.1, neckLen: 0.13, neckR: 0.05, neckUp: 0.45, headTilt: -0.15, headLen: 0.16, headH: 0.07, headW: 0.05, skull: [1, 0.85, 0.7], snout: 0.55, tailLen: 0.48, tailR: 0.075, thighR: 0.068, armLen: 0.25, armR: 0.026, teeth: false, beak: '#2a2a2a', stripes: true, colors: { body: '#ece6d4', belly: '#f8f4e8', back: '#4a4a4e', stripe: '#2a2a2e', head: '#7a7a80', headTop: '#4a4a4e', claw: '#2a2420', eye: '#e0a020' } } },
    'Young Spinosaurus': spino(2, { body: '#3a2a22', belly: '#6a5040', back: '#24180e', head: '#3a2a22', headTop: '#24180e', neck: '#3a2a22', mouth: '#e06a2a', streak: '#e8a030', arm: '#3a2a22' }, 'Young Spinosaurus'),
    Spinosaurus: spino(4, { body: '#2e3a3a', belly: '#5a6a66', back: '#1c2626', head: '#2e3a3a', headTop: '#1c2626', neck: '#2e3a3a', mouth: '#c84a2a', streak: '#e8b030', arm: '#2e3a3a', eye: '#e86a2a' }, 'Spinosaurus'),
    // short-faced abelisaur in tiger stripes: ochre with black bars and a red, horned face
    Rugops: { build: buildBiped, spec: { name: 'Rugops', teethSize: 0.5, nasalBumps: '#8a2a1a', featureScales: '#b07a26',  hipH: 0.3, bodyLen: 0.3, bodyR: 0.08, bodyH: 0.095, neckLen: 0.1, neckR: 0.05, neckUp: 0.6, headLen: 0.15, headH: 0.1, headW: 0.06, skull: [1.05, 1, 0.75], snout: 0.7, tailLen: 0.5, tailR: 0.065, thighR: 0.062, armLen: 0.022, armR: 0.01, stripes: true, horn: { h: 0.025, r: 0.012, color: '#c02a1e' }, lacrimal: { h: 0.02, r: 0.012, color: '#c02a1e' }, colors: { body: '#e0a83a', belly: '#f4e0a8', back: '#9a6a1e', stripe: '#1e1a16', head: '#c8402a', headTop: '#8a2a1a', eye: '#f0e060' } } },
    // lanky long-legged hunter: pale slate with dark bands and an orange throat
    Deltadromeus: { build: buildBiped, spec: { name: 'Deltadromeus', teethSize: 0.5,  hipH: 0.42, bodyLen: 0.26, bodyR: 0.065, bodyH: 0.075, neckLen: 0.15, neckR: 0.04, neckS: 0.6, neckUp: 0.75, headLen: 0.17, headH: 0.065, headW: 0.042, skull: [1, 0.8, 0.5], tailLen: 0.56, tailR: 0.05, thighR: 0.05, armLen: 0.12, armR: 0.015, crouch: 0.05, stripes: true, colors: { body: '#9aaab8', belly: '#f0ece2', back: '#4a5a6a', stripe: '#2e3a48', throat: '#e8822a', head: '#7a8a9a', eye: '#f0c030' } } },
    // carcharodontosaurid with a domed brow: rust red with a cream belly
    Sauroniops: { build: buildBiped, spec: { name: 'Sauroniops', teethSize: 0.5, nasalBumps: '#7a2e1c', dome: '#e8d8b0',  hipH: 0.31, bodyR: 0.088, bodyH: 0.1, neckLen: 0.14, neckR: 0.055, neckS: 0.7, headLen: 0.21, headH: 0.095, headW: 0.058, skull: [1.1, 0.92, 0.58], tailLen: 0.5, tailR: 0.072, thighR: 0.07, armLen: 0.1, armR: 0.02, spots: '#5a1e14', colors: { body: '#b04a2e', belly: '#f0dcb8', back: '#7a2e1c', head: '#a8422a', headTop: '#e8d8b0', eye: '#f0d040' } } },
    // huge delta predator: sandy tan with brown rosettes and a blue-grey face
    Bahariasaurus: { build: buildBiped, spec: { name: 'Bahariasaurus', teethSize: 0.5, nasalBumps: '#a87a46',  hipH: 0.34, bodyLen: 0.29, bodyR: 0.088, bodyH: 0.1, neckLen: 0.15, neckR: 0.055, neckS: 0.7, headLen: 0.2, headH: 0.085, headW: 0.055, skull: [1, 0.85, 0.55], tailLen: 0.52, tailR: 0.07, thighR: 0.072, armLen: 0.11, armR: 0.02, spots: '#7a4a24', colors: { body: '#d8b47a', belly: '#f4ead2', back: '#a87a46', head: '#6a7a8e', headTop: '#4a5a6a', eye: '#f0c030' } } },
    // the shark-toothed lizard: green with dark blotches and a lavender mouth, as on the comic cover
    Carcharodontosaurus: { build: buildBiped, spec: { name: 'Carcharodontosaurus', teethSize: 0.5, nasalBumps: '#2e5e2a',  hipH: 0.32, bodyR: 0.1, bodyH: 0.115, chestDepth: 1.12, bodyWidth: 1.08, neckLen: 0.14, neckR: 0.062, neckS: 0.6, headLen: 0.24, headH: 0.11, headW: 0.064, skull: [1.05, 0.95, 0.62], jowl: 0.5, tailLen: 0.5, tailR: 0.08, tailBase: 1.15, thighR: 0.08, armLen: 0.09, armR: 0.02, clawScale: 1.3, spots: '#1e4a26', lacrimal: { h: 0.018, r: 0.014, color: '#3a6a2e' }, colors: { body: '#5a9a3e', belly: '#d8e0a0', back: '#2e5e2a', head: '#5a9a3e', headTop: '#2e5e2a', mouth: '#a07ac8', jaw: '#a07ac8', eye: '#f0e040' } } },
    // sail-backed sauropod of the trails: terracotta with a cream underside
    Rebbachisaurus: { build: buildQuadruped, spec: { name: 'Rebbachisaurus', dorsalRidge: { h: 0.085, color: '#7a3a20' }, gauge: 0.78,  hipH: 0.3, shoulderH: 0.27, bodyLen: 0.3, bodyR: 0.11, bodyH: 0.13, arch: 0.07, neckSegs: 3, neckLen: 0.32, neckUp: 0.02, neckBend: -0.1, neckR0: 0.06, neckR1: 0.028, headShape: 'rebbach', headLen: 0.07, headH: 0.03, headW: 0.036, headPitch: -0.55, tailSegs: 4, tailLen: 0.7, tailR: 0.07, tailDroop: 0.1, tailCurl: 0.06, legR: 0.045, footR: 0.05, stripes: true, colors: { body: '#b8643a', belly: '#f0d8b0', back: '#7a3a20', stripe: '#9a4e2c', feet: '#5a3a28', eye: '#e8c030' } } },
    // titanosaurs: slate blue with pale bands, and the giant in warm brown
    Aegyptosaurus: { build: buildQuadruped, spec: { name: 'Aegyptosaurus', gauge: 0.95, osteoderms: '#46566e', columnHands: true,  hipH: 0.32, shoulderH: 0.34, bodyLen: 0.3, bodyR: 0.13, bodyH: 0.14, neckSegs: 4, neckLen: 0.5, neckUp: 0.72, neckBend: -0.05, neckR0: 0.07, neckR1: 0.03, headShape: 'titan', headLen: 0.08, headH: 0.04, headW: 0.036, headPitch: -0.2, tailSegs: 3, tailLen: 0.45, tailR: 0.075, tailDroop: 0.2, tailCurl: 0.08, legR: 0.055, footR: 0.06, stripes: true, colors: { body: '#6a7e96', belly: '#e0e4e0', back: '#46566e', stripe: '#a8b8c8', feet: '#3a4454', eye: '#e8c030' } } },
    Paralititan: { build: buildQuadruped, spec: { name: 'Paralititan', gauge: 0.95, osteoderms: '#5e3e2a', columnHands: true,  hipH: 0.32, shoulderH: 0.4, bodyLen: 0.3, bodyR: 0.135, bodyH: 0.145, neckSegs: 4, neckLen: 0.58, neckUp: 0.92, neckBend: -0.05, neckR0: 0.075, neckR1: 0.034, headShape: 'titan', headLen: 0.085, headH: 0.04, headW: 0.036, headPitch: -0.15, tailSegs: 3, tailLen: 0.42, tailR: 0.075, tailDroop: 0.25, tailCurl: 0.1, legR: 0.06, footR: 0.065, spots: '#5a3a24', colors: { body: '#8e6446', belly: '#e0c8a8', back: '#5e3e2a', feet: '#3e2a1e', eye: '#e8c030' } } }
};

// Fallback for anything without an explicit entry
const FALLBACK = { build: buildBiped, spec: { name: 'unknown', colors: { body: '#8a8a7a' } } };

export const buildCreatureModel = (species, ctx) => {
    const def = SPECIES_MODELS[species] || FALLBACK;
    const model = def.build({ name: species, ...def.spec }, ctx);
    model.species = species;
    model.minLen = def.minLen ?? 0.14;
    return model;
};

// ==================== SPINOSAURUS ====================
// A long, low river predator: short hind legs, strong clawed arms, a long narrow
// crocodile snout with a rosette at the tip, a tall sail and a paddle tail.
// Proportions morph from a big-eyed hatchling with a stub of a sail to the adult.
const SPINO_COLORS = {
    body: '#383840', belly: '#5c5c66', back: '#1e1e24', head: '#3a3a42', headTop: '#222228', neck: '#383840',
    mouth: '#d42e2a', jaw: '#d42e2a', eye: '#f2d040', claw: '#ece0c4', shin: '#2a2a30', arm: '#3a3a42', stripe: '#2a2a30'
};
export const buildSpino = (level, ctx, colors = SPINO_COLORS, extra = {}) => {
    const t = Math.max(0, Math.min(1, (level - 1) / 3));
    const lerp = (a, b) => a + (b - a) * t;
    const C = { ...SPINO_COLORS, ...colors };
    return buildBiped({
        name: extra.name || 'Spinosaurus',
        hipH: lerp(0.3, 0.235), bodyLen: lerp(0.22, 0.34), bodyR: lerp(0.068, 0.07), bodyH: lerp(0.08, 0.092), chestDrop: lerp(0, -0.012),
        // a long, fairly straight neck held forward and a long, low crocodile-like skull
        neckLen: lerp(0.1, 0.19), neckR: lerp(0.04, 0.038), neckUp: lerp(0.75, 0.42), neckS: lerp(0.3, 0.25),
        headLen: lerp(0.21, 0.33), headH: lerp(0.075, 0.052), headW: lerp(0.055, 0.034), skull: [lerp(1, 0.95), lerp(0.75, 0.55), 0.5], skullWidth: [0.95, lerp(0.75, 0.6)],
        snout: lerp(0.6, 0.55), teeth: true, spinoSkull: true, teethSize: 0.85, beak: C.mouth, midSnout: C.mouth, rosette: C.mouth, eyeScale: lerp(1.7, 1.0),
        webbed: C.web ?? shade(C.back, 1.3), flatClaws: true,
        crest: { h: lerp(0.004, 0.014), color: C.crest ?? C.back },
        tailLen: lerp(0.42, 0.56), tailR: lerp(0.055, 0.058), tailDepth: lerp(1.4, 2.1), tailLift: 0.01,
        thighR: lerp(0.055, 0.062), crouch: lerp(0, 0.08), armLen: lerp(0.08, 0.16), armR: lerp(0.014, 0.022), clawScale: lerp(1.4, 2.2),
        sail: { h: lerp(0.05, 0.32), color: C.sail ?? C.back, streak: C.streak ?? '#d4302c', thick: lerp(0.01, 0.014) },
        tailFin: { h: lerp(0.35, 1.0), color: C.fin ?? C.back },
        stripes: !!C.stripes, stripeEvery: 3,
        colors: { ...C, stripe: C.stripe },
        ...(extra.spec || {})
    }, ctx);
};

// ==================== BIG AL ====================
// ==================== BIG AL ====================
// Proportions morph from a big-headed hatchling to an adult allosaur.
// The player: a black spinosaur with a red mouth and a red streak along the sail
export const buildBigAl = (level, ctx) => {
    const model = buildSpino(level, ctx);
    model.species = 'Big Al';
    return model;
};
