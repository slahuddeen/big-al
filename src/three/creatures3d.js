// ==================== 3D CREATURE MODELS ====================
// Every creature is a small hierarchy of low-poly meshes (body, neck chain, head,
// jaw, tail chain, legs, arms, wings) so it can be animated procedurally.
// Models are built facing +x with feet on y = 0 and normalised to length 1;
// the renderer scales them by body mass.
import * as THREE from 'three';
import { MeshBuilder, loft, blob, cone, limb, slab, mulberry32, hashString, shade, mix, vary } from './lowpoly.js';

// ---------- small helpers ----------
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
    headFeathers: null, wingFeathers: null, wattle: null, sickle: false, spots: null
};

export const buildBiped = (spec, ctx) => {
    const p = { ...BIPED_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), stripe: shade(p.colors.body, 0.65), claw: '#2a2420', mouth: '#9a3434', ...p.colors };
    const rand = mulberry32(hashString(p.name || 'biped'));
    const model = newModel('biped');
    const { body, parts } = model;
    const H = p.hipH;
    const L = p.bodyLen;
    const stripes = p.stripes ? { every: 2, offset: 1, color: C.stripe } : null;

    // ---- torso ----
    const tb = new MeshBuilder();
    const torsoKeys = [
        { p: [-0.07, H + 0.012, 0], rw: p.bodyR * 0.72, rh: p.bodyH * 0.72 },
        { p: [0.0, H + 0.02, 0], rw: p.bodyR * 0.95, rh: p.bodyH * 0.95 },
        { p: [L * 0.4, H + 0.004, 0], rw: p.bodyR, rh: p.bodyH * 1.08, yOff: -p.bodyH * 0.1 },
        { p: [L * 0.75, H - 0.004, 0], rw: p.bodyR * 0.9, rh: p.bodyH * 0.98, yOff: -p.bodyH * 0.08 },
        { p: [L, H + 0.012, 0], rw: p.neckR * 1.35, rh: p.neckR * 1.45 }
    ];
    const torso = resample(torsoKeys, 9);
    loft(tb, torso, { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand });
    if (p.spots) {
        for (let i = 0; i < 10; i++) {
            const s = torso[1 + Math.floor(rand() * 6)];
            const side = rand() > 0.5 ? 1 : -1;
            blob(tb, [s.p[0] + (rand() - 0.5) * 0.03, s.p[1] + s.rh * (0.2 + rand() * 0.5), side * s.rw * 0.85], p.bodyR * 0.16, p.spots, { jitter: 0.3, rand, scale: [1, 0.7, 0.4] });
        }
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
    const tail1Keys = resample([
        { p: [0, 0, 0], rw: p.bodyR * 0.72, rh: p.bodyH * 0.72 },
        { p: [-T * 0.5, -0.025 + p.tailLift, 0], rw: p.tailR * 0.5, rh: p.tailR * 0.6 }
    ], 5);
    loft(t1, tail1Keys, { sides: 6, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, capEnd: false });
    if (p.osteoderms) {
        tail1Keys.forEach((s, i) => {
            if (i > 3) return;
            cone(t1, [s.p[0], s.p[1] + s.rh * 0.9, 0], [s.p[0] - 0.006, s.p[1] + s.rh * 0.9 + p.bodyH * 0.18, 0], p.bodyR * 0.1, p.osteoderms, { sides: 4, rand });
        });
    }
    addMesh(tail1, t1, ctx);
    const tail2 = group(tail1, -T * 0.5, -0.025 + p.tailLift, 0);
    const t2 = new MeshBuilder();
    loft(t2, resample([
        { p: [0.004, 0, 0], rw: p.tailR * 0.5, rh: p.tailR * 0.6 },
        { p: [-T * 0.5, -0.012 + p.tailLift * 0.6, 0], rw: 0.006, rh: 0.006 }
    ], 5), { sides: 6, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, tipEnd: 0.012 });
    if (p.tailFan) {
        const fx = -T * 0.5;
        slab(t2, [[-T * 0.12, 0.0, 0.014], [fx * 0.8, 0.004, p.tailFan.w], [fx * 1.12, 0.008, p.tailFan.w * 0.5], [fx * 1.18, 0.006, 0], [fx * 1.12, 0.008, -p.tailFan.w * 0.5], [fx * 0.8, 0.004, -p.tailFan.w], [-T * 0.12, 0.0, -0.014]], 0.012, p.tailFan.color, { edgeColor: shade(p.tailFan.color, 0.85) });
    }
    addMesh(tail2, t2, ctx);
    parts.tail.push(tail1, tail2);

    // ---- neck ----
    const neck = group(body, L, H + 0.012, 0);
    const nb = new MeshBuilder();
    const nx = Math.cos(p.neckUp) * p.neckLen;
    const ny = Math.sin(p.neckUp) * p.neckLen;
    loft(nb, resample([
        { p: [-0.02, -0.004, 0], rw: p.neckR * 1.35, rh: p.neckR * 1.45 },
        { p: [nx, ny, 0], rw: p.neckR * 0.95, rh: p.neckR * 1.05 }
    ], 4), { sides: 6, color: C.neck ?? C.body, bellyColor: C.throat ?? C.belly, ridgeColor: C.back, jitter: p.fluff, rand, capStart: false, capEnd: false });
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
    loft(hb, [
        { p: [-hl * 0.1, -hh * 0.05, 0], rw: hw * 0.8, rh: hh * 0.72 },
        { p: [hl * 0.18, hh * 0.04, 0], rw: hw, rh: hh },
        { p: [hl * 0.52, -hh * 0.04, 0], rw: hw * (0.5 + p.snout * 0.5), rh: hh * 0.78 },
        { p: [hl * 0.88, -hh * 0.14, 0], rw: hw * p.snout, rh: hh * 0.5, color: p.beak ?? C.head ?? C.body }
    ], {
        sides: 6, color: C.head ?? C.body, bellyColor: p.teeth ? C.mouth : (C.belly), ridgeColor: C.headTop ?? C.back,
        tipEnd: hl * 0.08, jitter: p.fluff * 0.5, rand
    });
    eyes(hb, hl * 0.2, hh * 0.38, hw * 0.78, hh * 0.19 * p.eyeScale, C.eye ?? '#f2c230');
    if (p.teeth) teethRow(hb, hl * 0.3, hl * 0.86, -hh * 0.36, hw * 0.55, hh * 0.09, 6);
    if (p.horn) cone(hb, [hl * 0.62, hh * 0.22, 0], [hl * 0.66, hh * 0.22 + p.horn.h, 0], p.horn.r, p.horn.color, { sides: 5, rand, squash: 0.5 });
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
    loft(jb, [
        { p: [0, 0, 0], rw: hw * 0.72, rh: hh * 0.24 },
        { p: [hl * 0.55, -hh * 0.04, 0], rw: hw * 0.55, rh: hh * 0.2 },
        { p: [hl * 0.82, 0, 0], rw: hw * p.snout * 0.8, rh: hh * 0.15, color: p.beak ?? C.belly }
    ], { sides: 5, color: C.jaw ?? C.belly, ridgeColor: p.teeth ? C.mouth : null, ridgeThreshold: 0.5, tipEnd: hl * 0.05 });
    if (p.teeth) {
        for (const s of [-1, 1]) {
            for (let i = 0; i < 5; i++) {
                const x = hl * 0.2 + (hl * 0.55 * i) / 4;
                jb.tri([x - hh * 0.04, hh * 0.15, s * hw * 0.45], [x + hh * 0.04, hh * 0.15, s * hw * 0.45], [x, hh * 0.3, s * hw * 0.43], '#f4f0e0', [0, 0, s], true);
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
        const knee = [p.thighR * 1.2, -legH * 0.45, s * 0.004];
        const ankle = [-p.thighR * 0.9, -legH * 0.82, s * 0.006];
        const pad = [-p.thighR * 0.3, -legH + 0.012, s * 0.008];
        loft(lb, [
            { p: [0, 0.02, 0], rw: p.thighR * 0.75, rh: p.thighR * 1.15 },
            { p: [p.thighR * 0.6, -legH * 0.18, 0], rw: p.thighR * 0.85, rh: p.thighR * 1.1 },
            { p: knee, r: p.thighR * 0.55 },
            { p: ankle, r: p.thighR * 0.32, color: C.shin ?? shade(C.body, 0.85) },
            { p: pad, r: p.thighR * 0.28, color: C.shin ?? shade(C.body, 0.85) }
        ], { sides: 6, color: C.body, bellyColor: C.belly, jitter: p.fluff * 0.6, rand });
        // toes
        for (const a of [-0.45, 0, 0.45]) {
            const tl = p.thighR * 1.6 * (a === 0 ? 1.15 : 0.9);
            const tx = pad[0] + Math.cos(a) * tl;
            const tz = pad[2] + Math.sin(a) * tl * s;
            limb(lb, pad, [tx, 0.004 - legH + 0.006, tz], p.thighR * 0.22, p.thighR * 0.12, C.shin ?? shade(C.body, 0.8), { sides: 4 });
            cone(lb, [tx, 0.006 - legH + 0.006, tz], [tx + Math.cos(a) * p.thighR * 0.5, 0.0 - legH + 0.003, tz + Math.sin(a) * s * p.thighR * 0.5], p.thighR * 0.1, C.claw, { sides: 4 });
        }
        if (p.sickle) {
            cone(lb, [pad[0] + p.thighR * 0.4, -legH + 0.03, pad[2] - s * 0.004], [pad[0] + p.thighR * 1.0, -legH + 0.07, pad[2]], p.thighR * 0.14, '#1a1a1a', { sides: 4 });
        }
        addMesh(pivot, lb, ctx);
        parts.legs.push({ pivot, side: s, phase: s > 0 ? 0 : Math.PI });
    }

    // ---- arms ----
    for (const s of [-1, 1]) {
        const pivot = group(body, L * 0.86, H - p.bodyH * 0.45, s * p.bodyR * 0.62);
        const ab = new MeshBuilder();
        const A = p.armLen;
        const elbow = [A * 0.15, -A * 0.5, s * 0.01];
        const hand = [A * 0.55, -A * 0.72, s * 0.012];
        loft(ab, [{ p: [0, 0, 0], r: p.armR * 1.3 }, { p: elbow, r: p.armR }, { p: hand, r: p.armR * 0.8 }], { sides: 5, color: C.arm ?? C.body, jitter: p.fluff * 0.5, rand });
        for (const a of [-0.35, 0, 0.35]) {
            cone(ab, hand, [hand[0] + A * 0.22, hand[1] - A * 0.12 + a * A * 0.1, hand[2] + s * a * A * 0.1], p.armR * 0.5, C.claw, { sides: 4 });
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
    legR: 0.045, footR: 0.05, plates: null, spikes: null, shoulderSpike: null, stripes: false, spots: null
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
    loft(tb, torso, { sides: 8, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: 0.08, rand });
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
        loft(mb, resample([{ p: [0.004, 0, 0], r: r0 }, { p: [-segLen, 0, 0], r: r1 }], 4), {
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
        loft(mb, resample([{ p: [-0.01, 0, 0], r: nr }, { p: [nLen + 0.004, 0, 0], r: nr1 }], 3), {
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
        loft(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.3, hh * 0.1, 0], rw: hw, rh: hh }, { p: [hl * 0.95, -hh * 0.2, 0], rw: hw * 0.7, rh: hh * 0.5 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.06 });
        blob(hb, [hl * 0.35, hh * 0.85, 0], hh * 0.55, C.crest ?? shade(C_head, 0.9), { scale: [1, 0.9, 0.7], jitter: 0.2, rand });
    } else if (p.headShape === 'camara') {
        loft(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.35, hh * 0.15, 0], rw: hw, rh: hh * 1.1 }, { p: [hl * 0.95, -hh * 0.1, 0], rw: hw * 0.85, rh: hh * 0.75 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.04 });
    } else if (p.headShape === 'stego') {
        loft(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.35, hh * 0.05, 0], rw: hw, rh: hh }, { p: [hl * 0.95, -hh * 0.25, 0], rw: hw * 0.5, rh: hh * 0.45, color: C.beak ?? '#3a3028' }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.08 });
    } else {
        loft(hb, [{ p: [-hl * 0.1, 0, 0], r: nr * 1.05 }, { p: [hl * 0.3, hh * 0.08, 0], rw: hw, rh: hh }, { p: [hl * 1.0, -hh * 0.15, 0], rw: hw * 0.75, rh: hh * 0.45 }], { sides: 6, color: C_head, bellyColor: C.belly, tipEnd: hl * 0.05 });
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
            const pivot = group(body, ld.x, ld.y, s * p.bodyR * 0.72);
            const lb = new MeshBuilder();
            const H = ld.y;
            const R = p.legR * (ld.front ? 0.9 : 1.1);
            const bend = ld.front ? -0.02 : 0.03;
            loft(lb, [
                { p: [0, p.bodyH * 0.25, 0], rw: R * 1.1, rh: R * 1.6 },
                { p: [bend * 0.5, -H * 0.15, 0], r: R * 1.05 },
                { p: [bend, -H * 0.55, 0], r: R * 0.85 },
                { p: [0, -H * 0.9, 0], r: R * 0.8, color: C.feet },
                { p: [0.006, -H + 0.004, 0], r: p.footR * (ld.front ? 0.9 : 1), color: C.feet }
            ], { sides: 7, color: C.body, bellyColor: C.belly, rand });
            for (let k = -1; k <= 1; k++) {
                blob(lb, [p.footR * 0.85, -H + 0.012, k * p.footR * 0.45], p.footR * 0.22, '#d8d0b8', { jitter: 0.1, rand, scale: [1, 0.6, 0.8] });
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
    loft(tb, torso, { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand });
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
        loft(mb, tailKeys, { sides: 6, color: C.tail ?? C.body, bellyColor: C.belly, ridgeColor: C.back, stripes, jitter: p.fluff, rand, capStart: false, capEnd: i === 2, tipEnd: 0.01 });
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
    loft(hb, [
        { p: [-0.01, 0, 0], rw: p.bodyR * 0.72, rh: p.bodyH * 0.75 },
        { p: [hl * 0.3, hh * 0.1, 0], rw: hw, rh: hh },
        { p: [hl * 0.95, -hh * 0.15, 0], rw: hw * p.snout, rh: hh * 0.5, color: C.snout ?? C.head ?? C.body }
    ], { sides: 6, color: C.head ?? C.body, bellyColor: C.belly, ridgeColor: C.back, tipEnd: hl * 0.06, jitter: p.fluff * 0.5, rand });
    eyes(hb, hl * 0.35, hh * 0.45, hw * 0.72, hh * 0.22 * p.eyeScale, C.eye ?? '#e8c040');
    if (p.nose) blob(hb, [hl * 1.02, -hh * 0.12, 0], hh * 0.16, p.nose, { detail: 1, jitter: 0, faceVary: 0 });
    if (p.ears) for (const s of [-1, 1]) blob(hb, [hl * 0.12, hh * 0.85, s * hw * 0.7], hh * 0.32, p.ears, { scale: [0.5, 1, 1], jitter: 0.1, rand });
    if (p.teeth) teethRow(hb, hl * 0.4, hl * 0.95, -hh * 0.3, hw * p.snout * 0.9, hh * 0.08, 7);
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
                loft(lb, [{ p: [0, 0.01, 0], r: p.legR * 1.4 }, { p: [lp.front ? -0.006 : 0.01, -hipY * 0.5, s * 0.004], r: p.legR }, { p: [0.004, -hipY + 0.006, s * 0.006], r: p.legR * 0.8, color: C.feet ?? shade(C.body, 0.8) }], { sides: 5, color: C.body, rand, jitter: p.fluff });
                limb(lb, [0.004, -hipY + 0.006, s * 0.006], [0.03, -hipY + 0.004, s * 0.008], p.legR * 0.8, p.legR * 0.5, C.feet ?? C.nose ?? shade(C.body, 0.8), { sides: 4 });
            } else {
                const knee = [lp.front ? 0.01 : -0.01, -hipY * 0.15, s * p.sprawl];
                const foot = [lp.front ? 0.02 : -0.005, -hipY + 0.005, s * p.sprawl * 1.25];
                loft(lb, [{ p: [0, 0, 0], r: p.legR * 1.3 }, { p: knee, r: p.legR }, { p: foot, r: p.legR * 0.8 }], { sides: 5, color: C.body, rand });
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
    teeth: true, fluff: 0.15, legLen: 0.06
};

export const buildPterosaur = (spec, ctx) => {
    const p = { ...PTERO_DEFAULTS, ...spec };
    const C = { belly: shade(p.colors.body, 1.25), back: shade(p.colors.body, 0.85), membrane: shade(p.colors.body, 0.7), ...p.colors };
    const rand = mulberry32(hashString(p.name || 'ptero'));
    const model = newModel(p.grounded ? 'perched' : 'fly');
    const { body, parts } = model;
    const Y = 0.12;
    const L = p.bodyLen;

    const tb = new MeshBuilder();
    loft(tb, resample([
        { p: [-0.02, Y, 0], rw: p.bodyR * 0.7, rh: p.bodyR * 0.7 },
        { p: [L * 0.45, Y + 0.004, 0], rw: p.bodyR, rh: p.bodyR * 1.05 },
        { p: [L, Y + 0.008, 0], rw: p.bodyR * 0.75, rh: p.bodyR * 0.8 }
    ], 5), { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, jitter: p.fluff, rand });
    addMesh(body, tb, ctx);

    // tail
    if (p.tailLen > 0.02) {
        const tail = group(body, -0.02, Y, 0);
        const mb = new MeshBuilder();
        loft(mb, [{ p: [0.004, 0, 0], r: p.bodyR * 0.35 }, { p: [-p.tailLen, 0, 0], r: 0.004 }], { sides: 4, color: C.body, capStart: false, tipEnd: 0.01 });
        if (p.tailVane) slab(mb, [[-p.tailLen * 0.85, 0, 0], [-p.tailLen * 0.95, 0.03, 0], [-p.tailLen * 1.08, 0.0, 0], [-p.tailLen * 0.95, -0.02, 0]], 0.006, p.tailVane);
        addMesh(tail, mb, ctx);
        parts.tail.push(tail);
    }

    // neck + head
    const neck = group(body, L, Y + 0.008, 0);
    const nb = new MeshBuilder();
    const nx = Math.cos(p.neckUp) * p.neckLen;
    const ny = Math.sin(p.neckUp) * p.neckLen;
    loft(nb, [{ p: [-0.01, 0, 0], r: p.bodyR * 0.6 }, { p: [nx, ny, 0], r: p.bodyR * 0.42 }], { sides: 6, color: C.neck ?? C.body, bellyColor: C.belly, jitter: p.fluff, rand, capStart: false, capEnd: false });
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
        loft(hb, [
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

// ==================== SMALL ODDBALLS ====================
export const buildDragonfly = (spec, ctx) => {
    const C = spec.colors;
    const rand = mulberry32(7);
    const model = newModel('flutter');
    const { body, parts } = model;
    const Y = 0.1;
    const mb = new MeshBuilder();
    blob(mb, [0.0, Y, 0], 0.035, C.thorax, { detail: 1, jitter: 0.2, rand, scale: [1.3, 1, 1] });
    loft(mb, resample([{ p: [-0.03, Y, 0], r: 0.016 }, { p: [-0.4, Y + 0.01, 0], r: 0.008 }], 10), { sides: 5, color: C.abdomen, stripes: { every: 2, offset: 1, color: C.band }, tipEnd: 0.01 });
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
        loft(mb, [{ p: [0.01, 0, 0], rw: r * 1.2, rh: r * 0.7 }, { p: [-segL + 0.006, 0, 0], rw: r * 1.1, rh: r * 0.65 }], { sides: 6, color: i % 2 ? C.body : C.alt, bellyColor: shade(C.body, 1.2) });
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
    loft(mb, resample([{ p: [0.1, Y, 0], rw: 0.04, rh: 0.02 }, { p: [0.02, Y + 0.004, 0], rw: 0.055, rh: 0.026 }, { p: [-0.12, Y + 0.006, 0], rw: 0.05, rh: 0.024 }], 7), { sides: 6, color: C.body, stripes: { every: 2, offset: 1, color: shade(C.body, 0.8) } });
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
        loft(tmb, [{ p: [0.005, 0, 0], r: 0.018 - i * 0.002 }, { p: [-0.045, 0, 0], r: 0.016 - i * 0.002 }], { sides: 5, color: C.tail });
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
    loft(mb, resample([{ p: [0.1, Y + 0.01, 0], rw: 0.03, rh: 0.035 }, { p: [0.03, Y + 0.01, 0], rw: 0.04, rh: 0.04 }, { p: [-0.18, Y + 0.0, 0], rw: 0.035, rh: 0.03 }], 6), { sides: 6, color: C.body, bellyColor: C.belly, stripes: { every: 2, offset: 1, color: shade(C.body, 0.85) }, tipEnd: 0.02 });
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
    loft(hb, [{ p: [-0.03, 0, 0], r: 0.03 }, { p: [0.06, 0.01, 0], r: 0.035 }, { p: [0.11, 0.0, 0], r: 0.022 }], { sides: 6, color: C.skin, tipEnd: 0.012 });
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
        loft(mb, resample([{ p: [0.006, 0, 0], rw: r0, rh: r0 * 0.8 }, { p: [-segL, 0, 0], rw: Math.max(0.004, r1), rh: Math.max(0.004, r1) * 0.8 }], 3), {
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

export const buildFish = (spec, ctx) => {
    const C = spec.colors;
    const model = newModel('swim');
    const { body, parts } = model;
    const Y = 0.1;
    const mb = new MeshBuilder();
    loft(mb, [
        { p: [0.22, Y - 0.005, 0], rw: 0.02, rh: 0.03 },
        { p: [0.12, Y, 0], rw: 0.045, rh: 0.075 },
        { p: [-0.02, Y, 0], rw: 0.04, rh: 0.065 },
        { p: [-0.14, Y, 0], rw: 0.016, rh: 0.025 }
    ], { sides: 7, color: C.body, bellyColor: C.belly, ridgeColor: C.back, tipStart: 0.03 });
    eyes(mb, 0.17, Y + 0.012, 0.022, 0.012, '#f0e0a0', '#111');
    slab(mb, [[0.08, Y + 0.06, 0], [-0.04, Y + 0.05, 0], [0.0, Y + 0.11, 0]], 0.006, C.fin);
    for (const s of [-1, 1]) slab(mb, [[0.1, Y - 0.03, s * 0.035], [0.05, Y - 0.05, s * 0.07], [0.07, Y - 0.03, s * 0.04]], 0.004, C.fin);
    addMesh(body, mb, ctx);
    const tail = group(body, -0.14, Y, 0);
    const tb = new MeshBuilder();
    slab(tb, [[0.01, 0, 0], [-0.09, 0.07, 0], [-0.06, 0, 0], [-0.09, -0.06, 0]], 0.006, C.fin);
    addMesh(tail, tb, ctx);
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
export const SPECIES_MODELS = {
    // --- tiny prey ---
    Dragonfly: { build: buildDragonfly, minLen: 0.17, spec: { colors: { thorax: '#6aa832', abdomen: '#9a3a1e', band: '#2f5a1e', eye: '#7ad040', wing: '#d8f0ff', wingEdge: '#6a8aa8' } } },
    Centipede: { build: buildCentipede, minLen: 0.2, spec: { colors: { body: '#b8582a', alt: '#8f3e1c', legs: '#e08a40' } } },
    Cricket: { build: buildCricket, minLen: 0.15, spec: { colors: { body: '#6a5a2a', belly: '#9a8a4a', head: '#4a3a1a', legs: '#5a4a24', thigh: '#7a6a32', wing: '#8a7a3a' } } },
    Mammal: { build: buildMammal, spec: { name: 'Mammal', colors: { body: '#8a5530', belly: '#c89060', back: '#6a3f22', head: '#8a5530', snout: '#a06a40', feet: '#e0a0a0', tail: '#b07a5a' } } },
    // --- small prey ---
    Scorpion: { build: buildScorpion, minLen: 0.17, spec: { colors: { body: '#3b2a20', legs: '#5a4030', claw: '#6a4426', tail: '#7a5a2a', sting: '#c88a2a' } } },
    Frog: { build: buildFrog, minLen: 0.16, spec: { colors: { body: '#5aa040', belly: '#e0e080', spots: '#2f6a22', legs: '#4a8a34', eye: '#e8b020' } } },
    Lizard: { build: buildSprawler, spec: { name: 'Lizard', bodyLen: 0.26, bodyR: 0.055, bodyH: 0.04, legH: 0.04, sprawl: 0.06, headLen: 0.11, headH: 0.04, headW: 0.04, snout: 0.5, tailLen: 0.6, tailR: 0.04, colors: { body: '#d9822b', belly: '#f0b060', back: '#b8641c', stripe: '#c0702a' }, stripes: false } },
    Fish: { build: buildFish, minLen: 0.17, spec: { colors: { body: '#8a9bb8', belly: '#dfe6f0', back: '#4a5a7a', fin: '#5a6a8a' } } },
    Turtle: { build: buildTurtle, spec: { colors: { shell: '#6b6a3a', scute: '#7d7a44', plastron: '#c8b47a', skin: '#8a8a5a' } } },
    Snake: { build: buildSnake, spec: { colors: { body: '#a88a50', belly: '#e0d0a0', band: '#4a3a24', head: '#8a6a3a' } } },
    Sphenodontian: { build: buildSprawler, spec: { name: 'Sphenodontian', bodyLen: 0.3, bodyR: 0.07, bodyH: 0.05, legH: 0.045, sprawl: 0.07, headLen: 0.12, headH: 0.05, headW: 0.05, snout: 0.6, tailLen: 0.5, tailR: 0.045, crest: { h: 0.025, color: '#d8e870' }, colors: { body: '#7bb33a', belly: '#c8e070', back: '#5a9028' } } },
    // --- small dinosaurs ---
    Compsognathus: { build: buildBiped, spec: { name: 'Compsognathus', hipH: 0.27, bodyR: 0.06, bodyH: 0.065, neckLen: 0.14, neckR: 0.03, headLen: 0.14, headH: 0.055, headW: 0.04, tailLen: 0.55, tailR: 0.04, armLen: 0.06, thighR: 0.04, fluff: 0.25, tailFan: { w: 0.05, color: '#f4f0e8' }, colors: { body: '#d97a2a', belly: '#f0c080', back: '#b85a1a', throat: '#3a7ad8', neck: '#d97a2a', eye: '#f0d040' } } },
    Coelurus: { build: buildBiped, spec: { name: 'Coelurus', hipH: 0.32, bodyR: 0.06, bodyH: 0.07, neckLen: 0.2, neckR: 0.028, neckUp: 0.95, headLen: 0.12, headH: 0.05, headW: 0.035, tailLen: 0.58, tailR: 0.045, thighR: 0.042, stripes: true, colors: { body: '#4f8a2a', belly: '#e0c030', back: '#3a6a20', stripe: '#c8b030', throat: '#d8c040' } } },
    Hesperornithoides: { build: buildBiped, spec: { name: 'Hesperornithoides', hipH: 0.28, bodyR: 0.07, bodyH: 0.075, neckLen: 0.12, neckR: 0.035, headLen: 0.13, headH: 0.055, headW: 0.045, snout: 0.35, tailLen: 0.5, tailR: 0.05, armLen: 0.12, fluff: 0.35, sickle: true, teeth: true, eyeScale: 1.3, headFeathers: '#3a7ae0', wingFeathers: { color: '#1e2a44', bar: '#f0f0f0' }, tailFan: { w: 0.06, color: '#e8e8f0' }, colors: { body: '#22304e', belly: '#34446a', back: '#162038', head: '#2a3a60', eye: '#f0b020' } } },
    Ornitholestes: { build: buildBiped, spec: { name: 'Ornitholestes', hipH: 0.3, bodyR: 0.07, bodyH: 0.08, neckLen: 0.12, neckR: 0.038, headLen: 0.15, headH: 0.065, headW: 0.048, tailLen: 0.52, armLen: 0.11, fluff: 0.15, crest: { h: 0.02, color: '#f0a040' }, spots: '#8a3a10', colors: { body: '#d0601a', belly: '#f09a50', back: '#a8460e', eye: '#f0d040' } } },
    // --- ornithopods ---
    Camptosaurus: { build: buildBiped, spec: { name: 'Camptosaurus', hipH: 0.3, bodyLen: 0.32, bodyR: 0.1, bodyH: 0.11, neckLen: 0.12, neckR: 0.05, neckUp: 0.5, headLen: 0.15, headH: 0.065, headW: 0.05, snout: 0.55, tailLen: 0.48, tailR: 0.075, thighR: 0.065, armLen: 0.2, armR: 0.022, teeth: false, beak: '#3a3020', colors: { body: '#4f7a3a', belly: '#c0a060', back: '#3a5a2a', claw: '#3a3020', eye: '#e0a020' } } },
    Dryosaurus: { build: buildBiped, spec: { name: 'Dryosaurus', hipH: 0.34, bodyR: 0.075, bodyH: 0.085, neckLen: 0.12, neckR: 0.035, neckUp: 0.65, headLen: 0.12, headH: 0.055, headW: 0.042, snout: 0.5, tailLen: 0.55, tailR: 0.055, thighR: 0.055, armLen: 0.09, teeth: false, beak: '#4a4020', eyeScale: 1.3, spots: '#7a9030', colors: { body: '#a8c050', belly: '#eee8b0', back: '#88a040', eye: '#f0c030' } } },
    Othnielia: { build: buildBiped, spec: { name: 'Othnielia', hipH: 0.28, bodyR: 0.07, bodyH: 0.075, neckLen: 0.1, neckR: 0.035, neckUp: 0.6, headLen: 0.11, headH: 0.055, headW: 0.045, snout: 0.5, tailLen: 0.55, tailR: 0.05, thighR: 0.05, armLen: 0.08, teeth: false, beak: '#2a3a4a', eyeScale: 1.3, stripes: true, colors: { body: '#6a9a34', belly: '#d8d080', back: '#4a7a24', stripe: '#3a6020', head: '#3a9ad8', headTop: '#2a7ac0', eye: '#f0d040' } } },
    // --- pterosaurs ---
    Harpactognathus: { build: buildPterosaur, spec: { name: 'Harpactognathus', bodyLen: 0.12, bodyR: 0.038, neckLen: 0.05, headLen: 0.16, headH: 0.035, headW: 0.026, wingSpan: 0.95, wingChord: 0.14, tailLen: 0.4, tailVane: '#3ad0e8', crest: { type: 'snout', h: 0.03, color: '#5ab0f0' }, wingBand: '#2a4a9a', colors: { body: '#2a6ab0', belly: '#6aa0d8', back: '#1a4a8a', membrane: '#1a3a7a', head: '#2f78c8', beak: '#d8d8c8' } } },
    Mesadactylus: { build: buildPterosaur, spec: { name: 'Mesadactylus', anuro: true, bodyLen: 0.1, bodyR: 0.05, neckLen: 0.02, neckUp: 0.2, headLen: 0.12, headH: 0.042, wingSpan: 0.8, wingChord: 0.18, tailLen: 0.0, fluff: 0.4, teeth: false, flapSpeed: 10, colors: { body: '#8a8460', belly: '#b0a880', back: '#6a6448', membrane: '#5a5440', head: '#8a8460', face: '#c8a050', eyeRing: '#d89a30' } } },
    Kepodactylus: { build: buildPterosaur, spec: { name: 'Kepodactylus', bodyLen: 0.13, bodyR: 0.045, neckLen: 0.14, neckUp: 0.7, headLen: 0.22, headH: 0.04, headW: 0.03, wingSpan: 1.05, wingChord: 0.16, tailLen: 0.03, crest: { type: 'back', h: 0.07, color: '#2a7ae0', color2: '#f0d040' }, colors: { body: '#3a4a6a', belly: '#6a7a9a', back: '#2a3450', membrane: '#7a2a3a', neck: '#5a7a9a', head: '#4a6a8a', beak: '#e8c040' } } },
    'Injured Pterosaur': { build: buildPterosaur, spec: { name: 'Injured Pterosaur', grounded: true, bodyLen: 0.12, bodyR: 0.04, neckLen: 0.1, neckUp: 0.5, headLen: 0.18, headH: 0.035, wingSpan: 0.8, wingChord: 0.14, tailLen: 0.05, crest: { type: 'back', h: 0.045, color: '#4ab0d0' }, wingBand: '#3a9ab0', colors: { body: '#6a2a20', belly: '#9a5a40', back: '#4a1a14', membrane: '#5a2018', head: '#6a2a20', beak: '#c8b090' } } },
    Rhamphorhynchus: { build: buildPterosaur, spec: { name: 'Rhamphorhynchus', bodyLen: 0.1, bodyR: 0.032, neckLen: 0.04, headLen: 0.14, headH: 0.028, headW: 0.022, wingSpan: 0.85, wingChord: 0.11, tailLen: 0.42, tailVane: '#e04a2a', colors: { body: '#a0602a', belly: '#d8a060', back: '#7a4018', membrane: '#6a3a24', beak: '#e0d0b0' } } },
    // --- mid & large theropods ---
    Ceratosaurus: { build: buildBiped, spec: { name: 'Ceratosaurus', hipH: 0.28, bodyR: 0.085, bodyH: 0.095, neckLen: 0.12, neckR: 0.05, headLen: 0.19, headH: 0.08, headW: 0.055, tailLen: 0.5, tailR: 0.07, thighR: 0.06, armLen: 0.05, stripes: true, horn: { h: 0.045, r: 0.016, color: '#c02828' }, lacrimal: { h: 0.025, r: 0.01, color: '#c02828' }, osteoderms: '#2a2e33', colors: { body: '#3a3f45', belly: '#8a8e90', back: '#2a2e33', stripe: '#5a6068', eye: '#f0a020' } } },
    'Juvenile Allosaurus': { build: buildBiped, spec: { name: 'Juvenile Allosaurus', hipH: 0.32, bodyR: 0.075, bodyH: 0.085, neckLen: 0.12, neckR: 0.045, headLen: 0.18, headH: 0.08, headW: 0.055, tailLen: 0.48, thighR: 0.055, armLen: 0.08, stripes: true, eyeScale: 1.25, lacrimal: { h: 0.015, r: 0.009, color: '#c86a30' }, colors: { body: '#8aa04a', belly: '#e0dca0', back: '#6a8038', stripe: '#b0a040', eye: '#f0c030' } } },
    'Male Allosaurus': { build: buildBiped, spec: { name: 'Male Allosaurus', hipH: 0.3, bodyR: 0.09, bodyH: 0.1, neckLen: 0.12, neckR: 0.055, headLen: 0.2, headH: 0.085, headW: 0.06, tailLen: 0.5, tailR: 0.075, thighR: 0.07, armLen: 0.09, stripes: true, lacrimal: { h: 0.03, r: 0.013, color: '#c84a28' }, crest: { h: 0.012, color: '#a83a20' }, colors: { body: '#4e8a3a', belly: '#d8d0a0', back: '#3a6a2a', stripe: '#c09a3a', eye: '#f0c030' } } },
    'Female Allosaurus': { build: buildBiped, spec: { name: 'Female Allosaurus', hipH: 0.3, bodyR: 0.095, bodyH: 0.105, neckLen: 0.12, neckR: 0.056, headLen: 0.2, headH: 0.085, headW: 0.062, tailLen: 0.5, tailR: 0.078, thighR: 0.072, armLen: 0.09, stripes: true, lacrimal: { h: 0.022, r: 0.012, color: '#e8a040' }, colors: { body: '#c0501a', belly: '#f0d0a0', back: '#9a3a12', stripe: '#5a2010', eye: '#f0d040' } } },
    Torvosaurus: { build: buildBiped, spec: { name: 'Torvosaurus', hipH: 0.3, bodyR: 0.1, bodyH: 0.11, neckLen: 0.12, neckR: 0.06, headLen: 0.24, headH: 0.08, headW: 0.06, snout: 0.55, tailLen: 0.48, tailR: 0.08, thighR: 0.075, armLen: 0.06, stripes: true, colors: { body: '#e8e0c8', belly: '#f8f4e8', back: '#d8c8a0', stripe: '#d0a020', eye: '#e0a010' } } },
    Saurophaganax: { build: buildBiped, spec: { name: 'Saurophaganax', hipH: 0.3, bodyR: 0.1, bodyH: 0.11, neckLen: 0.13, neckR: 0.06, headLen: 0.21, headH: 0.09, headW: 0.065, tailLen: 0.5, tailR: 0.08, thighR: 0.075, armLen: 0.09, stripes: true, lacrimal: { h: 0.03, r: 0.014, color: '#e0c060' }, colors: { body: '#5a3020', belly: '#b08a70', back: '#3a1a10', stripe: '#1e0e08', eye: '#f0b020' } } },
    // --- sprawling predators ---
    Crocodile: { build: buildSprawler, spec: { name: 'Crocodile', bodyLen: 0.32, bodyR: 0.075, bodyH: 0.045, legH: 0.035, sprawl: 0.08, legR: 0.02, headLen: 0.2, headH: 0.04, headW: 0.055, snout: 0.45, tailLen: 0.5, tailR: 0.055, teeth: true, scutes: '#3a4a2a', colors: { body: '#4a5a3a', belly: '#b0a070', back: '#3a4a2a', eye: '#e0c020' } } },
    // --- armoured herbivores ---
    Stegosaurus: { build: buildQuadruped, spec: { name: 'Stegosaurus', hipH: 0.3, shoulderH: 0.18, bodyLen: 0.3, bodyR: 0.11, bodyH: 0.13, arch: 0.04, neckSegs: 2, neckLen: 0.14, neckUp: -0.1, neckBend: -0.1, neckR0: 0.05, neckR1: 0.03, headShape: 'stego', headLen: 0.09, headH: 0.035, headW: 0.03, headPitch: -0.15, tailSegs: 2, tailLen: 0.38, tailR: 0.07, tailDroop: 0.05, tailCurl: 0.1, legR: 0.04, footR: 0.04, plates: { size: 0.13, color: '#e0602a', edge: '#a03a18', count: 9 }, spikes: { tail: 0.11, color: '#f0e0c0', tailSegs: 1 }, colors: { body: '#3aa070', belly: '#a8d8a0', back: '#2a7a54', feet: '#2a6a48' } } },
    Kentrosaurus: { build: buildQuadruped, spec: { name: 'Kentrosaurus', hipH: 0.27, shoulderH: 0.17, bodyLen: 0.28, bodyR: 0.1, bodyH: 0.11, arch: 0.03, neckSegs: 2, neckLen: 0.12, neckUp: -0.05, neckBend: -0.1, neckR0: 0.045, neckR1: 0.03, headShape: 'stego', headLen: 0.08, headH: 0.032, headW: 0.028, tailSegs: 2, tailLen: 0.42, tailR: 0.06, tailDroop: 0.05, tailCurl: 0.08, legR: 0.035, footR: 0.035, plates: { size: 0.08, color: '#7a5a30', pointed: true, count: 6, untilT: 0.55, noTail: true }, spikes: { back: true, size: 0.08, tail: 0.12, tailSegs: 2, color: '#f0e8d0' }, shoulderSpike: { len: 0.16, color: '#f0e8d0' }, colors: { body: '#b8a060', belly: '#e8d8a8', back: '#8a7040' } } },
    Tuojiangosaurus: { build: buildQuadruped, spec: { name: 'Tuojiangosaurus', hipH: 0.29, shoulderH: 0.18, bodyLen: 0.3, bodyR: 0.105, bodyH: 0.12, arch: 0.035, neckSegs: 2, neckLen: 0.13, neckUp: -0.05, neckBend: -0.1, neckR0: 0.05, neckR1: 0.03, headShape: 'stego', headLen: 0.09, headH: 0.034, headW: 0.03, tailSegs: 2, tailLen: 0.4, tailR: 0.065, tailDroop: 0.05, tailCurl: 0.08, plates: { size: 0.12, color: '#f0dcb0', pointed: true, edge: '#a08a60', count: 11 }, spikes: { tail: 0.11, color: '#f0e8d0', tailSegs: 1 }, colors: { body: '#a84a30', belly: '#e0b090', back: '#7a3220' } } },
    // --- sauropods ---
    Diplodocus: { build: buildQuadruped, spec: { name: 'Diplodocus', hipH: 0.3, shoulderH: 0.26, bodyLen: 0.3, bodyR: 0.125, bodyH: 0.14, neckSegs: 4, neckLen: 0.5, neckUp: 0.42, neckBend: -0.06, neckR0: 0.07, neckR1: 0.025, headShape: 'diplo', headLen: 0.075, headH: 0.03, headW: 0.026, tailSegs: 4, tailLen: 0.8, tailR: 0.07, tailDroop: 0.12, tailCurl: 0.06, legR: 0.045, footR: 0.05, spots: '#a0601a', colors: { body: '#d0902a', belly: '#f0d090', back: '#a8701a', feet: '#6a7a4a', eye: '#e8c030' } } },
    Brachiosaurus: { build: buildQuadruped, spec: { name: 'Brachiosaurus', hipH: 0.33, shoulderH: 0.48, bodyLen: 0.3, bodyR: 0.12, bodyH: 0.13, neckSegs: 4, neckLen: 0.62, neckUp: 1.1, neckBend: -0.06, neckR0: 0.07, neckR1: 0.035, headShape: 'brachio', headLen: 0.09, headH: 0.04, headW: 0.032, headPitch: -0.1, tailSegs: 3, tailLen: 0.35, tailR: 0.07, tailDroop: 0.3, tailCurl: 0.1, legR: 0.055, footR: 0.06, stripes: true, colors: { body: '#7a9a6a', belly: '#c8d0a8', back: '#5a7a50', stripe: '#6a8a5c', feet: '#4a5a40', crest: '#8aa070' } } },
    Camarasaurus: { build: buildQuadruped, spec: { name: 'Camarasaurus', hipH: 0.32, shoulderH: 0.34, bodyLen: 0.3, bodyR: 0.12, bodyH: 0.13, neckSegs: 3, neckLen: 0.38, neckUp: 0.65, neckBend: -0.1, neckR0: 0.07, neckR1: 0.04, headShape: 'camara', headLen: 0.09, headH: 0.05, headW: 0.04, headPitch: -0.2, tailSegs: 3, tailLen: 0.42, tailR: 0.075, tailDroop: 0.22, tailCurl: 0.08, legR: 0.055, footR: 0.06, stripes: true, colors: { body: '#8a7060', belly: '#d8c0a8', back: '#6a5040', stripe: '#a08070', feet: '#4a3a30' } } }
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

// ==================== BIG AL ====================
// Proportions morph from a big-headed hatchling to an adult allosaur.
export const buildBigAl = (level, ctx) => {
    const t = Math.max(0, Math.min(1, (level - 1) / 3));
    const lerp = (a, b) => a + (b - a) * t;
    const model = buildBiped({
        name: 'BigAl',
        hipH: lerp(0.34, 0.3), bodyLen: lerp(0.22, 0.27), bodyR: lerp(0.08, 0.09), bodyH: lerp(0.09, 0.1),
        neckLen: lerp(0.08, 0.12), neckR: lerp(0.05, 0.055), neckUp: lerp(0.9, 0.75),
        headLen: lerp(0.24, 0.2), headH: lerp(0.12, 0.085), headW: lerp(0.09, 0.062), snout: lerp(0.6, 0.45),
        tailLen: lerp(0.36, 0.5), tailR: lerp(0.06, 0.075), thighR: lerp(0.06, 0.07), armLen: lerp(0.07, 0.09),
        eyeScale: lerp(1.7, 1.05), stripes: level >= 2, fluff: lerp(0.15, 0),
        lacrimal: level >= 3 ? { h: lerp(0.0, 0.03), r: 0.013, color: '#d8542a' } : null,
        crest: level >= 4 ? { h: 0.012, color: '#c04a24' } : null,
        colors: {
            body: level === 1 ? '#7cc46a' : '#5fa04a',
            belly: '#e4eeb8', back: level === 1 ? '#5aa04c' : '#3f7a34', stripe: '#d0a640',
            eye: '#f0c030', claw: '#2a2a20'
        }
    }, ctx);
    model.species = 'Big Al';
    return model;
};
