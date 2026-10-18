// Mammals, lake and forest reptiles, fish, and two more pterosaurs
import { Sculpt } from '../sculpt.js';
import { mammal, sprawler, turtle, fish, pterosaur, flightWingEdges } from '../bodyplans.js';
import { add, mul, lerp, lerp3 } from '../anatomy.js';
import { C, mix, smooth, scheme, fbm } from '../paint.js';
import { membrane } from '../membrane.js';

const furOnly = { snout: 0.25, jaw: 0.3, head: 0.6, brow: 0.6, ear: 0.25, nose: 0, paw: 0.05, neck: 1, body: 1, thigh: 1, shin: 0.7, arm: 0.8, tail: 0.9 };

export const Repenomamus = (() => {
    function build(stage, opts = {}) {
        const L = 0.7;
        const S = new Sculpt();
        const rig = mammal(S, {
            torso: 0.26, hipR: 0.058, bellyR: 0.072, chestR: 0.064, bodySquash: 0.95, backHump: 0.025,
            upperLeg: 0.07, lowerLeg: 0.06, paw: 0.04, limbR: 0.018, spread: 0.5,
            neck: 0.05, neckR: 0.055, head: 0.13, headH: 0.062, headW: 0.07, tip: 0.75, squash: 0.62, eyeR: 0.0065, ear: 0.016,
            tail: 0.14, tailR: 0.02
        });
        // grizzled dark brown with a pale band along each flank, like a wolverine
        const paint = scheme({
            L, base: '#4a3a2c', back: '#2e241c', belly: '#3a2e24', skin: '#2a2420', fur: 0.026, mottle: 0.3, furBy: furOnly,
            scaly: ['nose', 'paw'], scale: 0.0015, tip: '#b8a286', tipAmt: 0.35,
            pattern: (s, col, { y, z }) => {
                if (s.tag === 'body' || s.tag === 'tail') {
                    const band = smooth(0.12, 0.35, s.n[1]) * smooth(0.75, 0.5, s.n[1]);
                    col = mix(col, C('#9a7a52'), band * 0.75);
                }
                if (s.tag === 'snout' || s.tag === 'head') col = mix(col, C('#8a7258'), smooth(0.4, 0.8, Math.abs(s.n[2])) * 0.35);
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 230, fur: { shells: 22, density: 1500, thickness: 1.25, lift: 0.5, tuft: 0.6, curl: 0.15 }, skin: { bump: 0.2 }, eye: { iris: '#1e1410', ring: '#0a0604', pupil: 0.6, irisSize: 0.85 }, claw: '#d8ccb8', length: L };
    }
    return { build };
})();

export const Eomaia = (() => {
    function build(stage, opts = {}) {
        const L = 0.2;
        const S = new Sculpt();
        const rig = mammal(S, {
            torso: 0.05, hipR: 0.011, bellyR: 0.013, chestR: 0.011, bodySquash: 0.95, backHump: 0.006,
            upperLeg: 0.014, lowerLeg: 0.013, paw: 0.009, limbR: 0.0032, spread: 0.6,
            neck: 0.008, neckR: 0.009, head: 0.026, headH: 0.012, headW: 0.013, tip: 0.35, squash: 0.5, eyeR: 0.0022, eyeAt: 0.45, ear: 0.006,
            tail: 0.095, tailR: 0.003, tailDroop: 0.1
        });
        const paint = scheme({
            L, base: '#7a5c40', back: '#4f3a28', belly: '#d9c6a6', skin: '#c9998a', fur: 0.0035, mottle: 0.2, furBy: { ...furOnly, tail: 0.3 },
            scaly: ['nose', 'paw'], scale: 0.0004, tip: '#a8865e'
        });
        return { sculpt: S, paint, rig, res: 220, fur: { shells: 16, density: 7000, thickness: 1.2, lift: 0.5, tuft: 0.5 }, skin: { bump: 0.2 }, eye: { iris: '#100a08', pupil: 0.7, irisSize: 0.9 }, claw: '#d8ccb8', length: L };
    }
    return { build };
})();

export const Hyphalosaurus = (() => {
    function build(stage, opts = {}) {
        const L = 0.8;
        const S = new Sculpt();
        // a swimming reptile with a very long neck and small head
        const rig = sprawler(S, {
            torso: 0.15, bodyR: 0.032, hipR: 0.024, chestR: 0.026, bodySquash: 1.2,
            neck: 0.25, neckR: 0.014, headNeckR: 0.009, neckRise: 0.35, neckCurve: 0.15,
            head: 0.035, headH: 0.013, headW: 0.014, tip: 0.5, squash: 0.65, eyeR: 0.003, eyeAt: 0.35, headTilt: -0.3,
            tail: 0.36, tailR: 0.02, tailSquash: 0.45, tailWave: 0.06,
            upper: 0.03, lower: 0.025, limbR: 0.0055, footLen: 0.025
        });
        const paint = scheme({
            L, base: '#6a6a3e', back: '#46462a', belly: '#d8cfa8', skin: '#5a5a38', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'arm', 'tail'], scale: 0.0018, mottle: 0.3,
            pattern: (s, col, { x, y, z }) => {
                const c0 = mix(C('#6a6a3e'), C('#46462a'), smooth(-0.1, 0.75, s.n[1]));
                let c = mix(c0, C('#d8cfa8'), smooth(0.0, -0.6, s.n[1]));
                const sp = fbm(x * 220, y * 220, z * 220);
                c = mix(c, C('#2a2a18'), smooth(0.62, 0.7, sp) * smooth(-0.2, 0.4, s.n[1]) * 0.8);
                // a gold stripe along each side of the neck and body
                c = mix(c, C('#c9a03a'), smooth(0.12, 0.0, Math.abs(s.n[1] - 0.15)) * smooth(0.6, 0.9, Math.abs(s.n[2])) * 0.55);
                return c;
            }
        });
        return { sculpt: S, paint, rig, res: 300, skin: { bump: 0.4 }, eye: { iris: '#c0a040', ring: '#3a3010', pupil: 0.3 }, length: L };
    }
    return { build };
})();

export const Monjurosuchus = (() => {
    function build(stage, opts = {}) {
        const L = 0.4;
        const S = new Sculpt();
        const rig = sprawler(S, {
            torso: 0.11, bodyR: 0.026, hipR: 0.02, chestR: 0.022, bodySquash: 1.3,
            neck: 0.025, neckR: 0.017, headNeckR: 0.015, neckRise: 0.05,
            head: 0.05, headH: 0.017, headW: 0.03, tip: 0.55, squash: 0.65, eyeR: 0.004, eyeAt: 0.35, eyeUp: 0.32, brow: 0.6,
            tail: 0.2, tailR: 0.017, tailSquash: 0.55, tailWave: 0.08,
            upper: 0.025, lower: 0.02, limbR: 0.005, footLen: 0.022
        });
        // webbing between the toes of the hind feet
        [rig.legR, rig.legL].forEach((leg) => {
            const t = leg.toes;
            for (let i = 0; i < t.length - 1; i++) S.extra({ type: 'mesh', object: membrane([leg.foot, t[i].tip], [leg.foot, t[i + 1].tip], { n: 4, m: 3, col: '#4a3c2a', col2: '#6a5a42', rays: 6, rough: 0.6 }) });
        });
        const paint = scheme({
            L, base: '#4c3e2c', back: '#33291c', belly: '#c9b88a', skin: '#4c3e2c', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'arm', 'tail'], scale: 0.0015, mottle: 0.35,
            pattern: (s, col, { x, y, z }) => {
                const c0 = mix(C('#4c3e2c'), C('#33291c'), smooth(-0.1, 0.75, s.n[1]));
                let c = mix(c0, C('#c9b88a'), smooth(0.0, -0.6, s.n[1]));
                const sp = fbm(x * 260, y * 260, z * 260);
                return mix(c, C('#d4b04a'), smooth(0.66, 0.72, sp) * smooth(-0.1, 0.5, s.n[1]) * 0.85);
            }
        });
        return { sculpt: S, paint, rig, res: 260, skin: { bump: 0.45 }, eye: { iris: '#b0902a', ring: '#302508', pupil: 0.3, slit: 0.6 }, length: L };
    }
    return { build };
})();

export const Xianglong = (() => {
    function build(stage, opts = {}) {
        const L = 0.15;
        const S = new Sculpt();
        const rig = sprawler(S, {
            torso: 0.035, bodyR: 0.0065, hipR: 0.005, chestR: 0.0058, bodySquash: 1.25,
            neck: 0.006, neckR: 0.005, headNeckR: 0.0045, neckRise: 0.15,
            head: 0.014, headH: 0.006, headW: 0.0075, tip: 0.4, squash: 0.6, eyeR: 0.0015, eyeAt: 0.4, eyeUp: 0.25, brow: 0.5,
            tail: 0.088, tailR: 0.0035, tailSquash: 0.9, tailWave: 0.03,
            upper: 0.008, lower: 0.007, limbR: 0.0013, footLen: 0.007
        });
        // the gliding membrane: skin stretched over eight long ribs on each side, spread out
        const T = rig.torso;
        [1, -1].forEach((s) => {
            const lead = [], trail = [];
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const base = lerp3(T[1], T[4], t);
                lead.push(add(base, [0, 0.0012, 0.006 * s]));
                const reach = 0.026 * Math.sin(Math.PI * (0.15 + t * 0.75));
                trail.push(add(base, [-0.004 * t, 0.002 - reach * 0.06, (0.006 + reach) * s]));
            }
            S.extra({ type: 'mesh', object: membrane(lead, trail, { n: 9, m: 5, col: '#e0902a', col2: '#3a2a18', rays: 8, rayDir: 'along', rough: 0.55 }) });
        });
        const paint = scheme({
            L, base: '#5e7a3a', back: '#3e5a2a', belly: '#d8d4a8', skin: '#5e7a3a', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'arm', 'tail'], scale: 0.0005, mottle: 0.35,
            pattern: (s, col) => (s.tag === 'tail' ? mix(col, C('#2a3a1a'), smooth(0.6, 0.8, Math.sin(s.u * 45) * 0.5 + 0.5) * 0.6) : col)
        });
        return { sculpt: S, paint, rig, res: 240, skin: { bump: 0.4 }, eye: { iris: '#c8a030', ring: '#302508', pupil: 0.35 }, length: L };
    }
    return { build };
})();

export const Manchurochelys = (() => {
    function build(stage, opts = {}) {
        const L = 0.25;
        const S = new Sculpt();
        const rig = turtle(S, { shell: 0.25, shellH: 0.055, shellW: 0.19, head: 0.042, neck: 0.035, limb: 0.032, limbR: 0.0085, tail: 0.03, eyeR: 0.0045 });
        const c = rig.shell;
        const paint = (s) => {
            const [x, y, z] = s.p;
            if (s.tag === 'shell') {
                // scutes: a central row and side rows, with pale seams between them
                const u = (x - c[0]) / 0.25, v = (z - c[2]) / 0.19;
                const row = Math.abs(v) < 0.14 ? 0 : 1;
                const fx = row === 0 ? (u + 0.5) * 5 : (u + 0.5) * 4 + 0.5;
                const seamX = smooth(0.06, 0.0, Math.abs(fx - Math.round(fx)));
                const seamZ = smooth(0.025, 0.0, Math.abs(Math.abs(v) - 0.14)) + smooth(0.025, 0.0, Math.abs(Math.abs(v) - 0.38));
                const rings = 0.85 + 0.15 * Math.sin(Math.hypot((fx - Math.floor(fx) - 0.5), v * 3) * 30);
                let col = mix(C('#4a4a2c'), C('#2e2e1c'), fbm(x * 40, y * 40, z * 40));
                col = mix(col.map((k) => k * rings), C('#b8ac7a'), Math.min(1, seamX + seamZ) * 0.7);
                return { col, fur: 0, scale: 0, rough: 0.45 };
            }
            if (s.tag === 'plastron') return { col: C('#c8b888'), fur: 0, scale: 0, rough: 0.6 };
            if (s.tag === 'beakhead' || s.tag === 'beakjaw') {
                const b = smooth(0.7, 0.8, s.u);
                return { col: mix(mix(C('#5a5a3a'), C('#d4b84a'), smooth(-0.3, 0.6, Math.abs(s.n[2])) * 0.5), C('#2a2620'), b), fur: 0, scale: b > 0.5 ? 0 : 0.0016, rough: 0.5 };
            }
            return { col: mix(C('#5a5a3a'), C('#c8b888'), smooth(0, -0.7, s.n[1])), fur: 0, scale: 0.0018, rough: 0.6 };
        };
        return { sculpt: S, paint, rig, res: 240, skin: { bump: 0.45 }, eye: { iris: '#a08a30', ring: '#2a2008' }, length: L };
    }
    return { build };
})();

// fins as membranes from the fish rig
const fins = (S, rig, { col, col2, dorsalAt = 0.45, dorsalH = 0.6, dorsalLen = 0.15, anal = true }) => {
    const { q, pts, rad } = rig;
    const at = (u) => {
        const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
        return { p: lerp3(pts[i], pts[i + 1], f - i), r: lerp(rad[i], rad[i + 1], f - i) };
    };
    const fin = (u0, u1, up, h, sweep = 0.5) => {
        const a = [], b = [];
        for (let k = 0; k <= 5; k++) {
            const u = lerp(u0, u1, k / 5);
            const { p, r } = at(u);
            a.push(add(p, [0, r * 0.85 * up, 0]));
            const hh = h * Math.sin(Math.PI * (0.15 + 0.85 * (1 - k / 5)) * 0.5 + 0.3) * (1 - k / 5 * 0.6);
            b.push(add(p, [-hh * sweep, (r + hh) * up, 0]));
        }
        S.extra({ type: 'mesh', object: membrane(a, b, { n: 6, m: 3, col, col2, rays: 10, rayDir: 'across', rough: 0.5, opacity: 0.9 }) });
    };
    fin(dorsalAt, dorsalAt + dorsalLen, 1, q.depth * dorsalH);
    if (anal) fin(dorsalAt + 0.08, dorsalAt + 0.08 + dorsalLen * 0.9, -1, q.depth * dorsalH * 0.75);
    const [base, tail] = rig.fins.caudal;
    S.extra({ type: 'mesh', object: membrane([base[0], lerp3(base[0], base[1], 0.5), base[1]], tail, { n: 3, m: 5, col, col2, rays: 12, rayDir: 'along', rough: 0.5, opacity: 0.9 }) });
    // pectoral and pelvic fins, angled out and back
    [1, -1].forEach((s) => {
        [[0.2, 0.35], [0.5, 0.3]].forEach(([u, size]) => {
            const { p, r } = at(u);
            const root = add(p, [0, -r * 0.4, q.width * 0.45 * s]);
            S.extra({ type: 'mesh', object: membrane([root, add(root, [-q.depth * 0.15, 0, 0])], [add(root, [-q.depth * size * 1.2, -q.depth * size * 0.6, q.depth * size * 0.6 * s]), add(root, [-q.depth * size * 1.6, -q.depth * size * 0.2, q.depth * size * 0.3 * s])], { n: 2, m: 3, col, col2, rays: 8, rayDir: 'along', opacity: 0.9 }) });
        });
    });
};

export const Lycoptera = (() => {
    function build(stage, opts = {}) {
        const L = 0.08;
        const S = new Sculpt();
        const rig = fish(S, { len: 0.068, depth: 0.016, width: 0.008, headLen: 0.017, eyeR: 0.002, tailFork: 0.8, tailH: 0.013 });
        fins(S, rig, { col: '#9aa4a0', col2: '#5a6460', dorsalAt: 0.55, dorsalLen: 0.12, dorsalH: 0.55 });
        const paint = (s) => {
            const up = s.n[1];
            let col = mix(C('#c9d2cc'), C('#3e4a48'), smooth(0.1, 0.8, up));
            col = mix(col, C('#e8eee8'), smooth(-0.2, -0.8, up));
            return { col, fur: 0, scale: 0.0008, rough: 0.25 };
        };
        return { sculpt: S, paint, rig, res: 220, skin: { bump: 0.12 }, eye: { iris: '#c8c0a0', ring: '#2a2a20', pupil: 0.55 }, length: L };
    }
    return { build };
})();

export const Peipiaosteus = (() => {
    function build(stage, opts = {}) {
        const L = 0.35;
        const S = new Sculpt();
        // a small, scaleless relative of sturgeons and paddlefish, with a pointed snout
        const rig = fish(S, { len: 0.29, depth: 0.04, width: 0.034, headLen: 0.06, snout: 0.045, eyeR: 0.004, tailFork: 0.3, tailH: 0.045 });
        fins(S, rig, { col: '#6a5a48', col2: '#3a3028', dorsalAt: 0.7, dorsalLen: 0.1, dorsalH: 0.7 });
        const paint = (s) => {
            const up = s.n[1];
            let col = mix(C('#a89a80'), C('#4a4034'), smooth(0.1, 0.8, up));
            col = mix(col, C('#e0d8c4'), smooth(-0.2, -0.8, up));
            return { col, fur: 0, scale: 0, rough: 0.4 };
        };
        return { sculpt: S, paint, rig, res: 240, skin: { bump: 0.2, wrinkle: 0.6 }, eye: { iris: '#b0a070', ring: '#2a2a20', pupil: 0.55 }, length: L };
    }
    return { build };
})();

export const Feilongus = (() => {
    function build(stage, { pose } = {}) {
        const L = 0.9;
        const S = new Sculpt();
        // long jaws with an overbite, lined with thin teeth, and a crest at each end of the skull
        const rig = pterosaur(S, {
            pose, humerus: 0.11, forearm: 0.18, meta: 0.17, wingFinger: 0.6, femur: 0.08, tibia: 0.12, footLen: 0.045,
            torso: 0.13, chestR: 0.035, bellyR: 0.036, hipR: 0.024, neck: 0.25, neckR: 0.016, headNeckR: 0.012,
            head: 0.38, headH: 0.042, headW: 0.03, tip: 0.12, eyeR: 0.008, eyeAt: 0.14, limbR: 0.008, neckRise: 0.8, headTilt: -0.4
        });
        const H = rig.head;
        const crest = new Sculpt();
        const front = [0.85, 0.7, 0.55, 0.42].map((f, i) => add(H.top(f), mul(H.up, [0.003, 0.012, 0.012, 0.004][i])));
        crest.chain(front, [0.003, 0.012, 0.012, 0.004], { tag: 'crest', squash: [0.2, 1], k: 0.003 });
        crest.chain([H.top(0.12), add(H.top(0.02), add(mul(H.dir, -0.05), mul(H.up, 0.018)))], [0.01, 0.003], { tag: 'crest', squash: [0.25, 1], k: 0.003 });
        // needle-like teeth along the front of the jaws
        for (let i = 0; i < 14; i++) {
            const f = lerp(0.55, 0.96, i / 13);
            [1, -1].forEach((sd) => S.extra({ type: 'claw', at: H.at(f, -0.24 - f * 0.05, 0.26 * sd * (1 - f * 0.4)), dir: [0.5, -0.8, 0.25 * sd], up: [1, 0, 0], length: 0.012, radius: 0.0012, curve: 0.2, color: '#ece4d0' }));
        }
        [rig.armR, rig.armL].forEach((arm, i) => {
            const s = i === 0 ? 1 : -1;
            if (pose === 'fly') {
                const { lead, trail } = flightWingEdges(rig, s);
                S.extra({ type: 'mesh', bone: s > 0 ? 'armR' : 'armL', object: membrane(lead, trail, { col: '#3a3634', col2: '#1e1c1b', rays: 50 }) });
                return;
            }
            const leg = s > 0 ? rig.legR : rig.legL;
            const trailing = [add(arm.elbow, [-0.006, -0.01, 0]), add(arm.sh, [-0.04, -0.02, 0.02 * s]), add(leg.hip, [0, 0.006, 0.03 * s])];
            S.extra({ type: 'mesh', object: membrane(arm.wf.slice(1), trailing, { col: '#3a3634', col2: '#1e1c1b', sag: 0.01, sagDir: [0, -0.6, s * 0.5], rays: 50 }) });
        });
        const paint = scheme({
            L, base: '#e8e4dc', back: '#9a958c', belly: '#f2efe8', skin: '#5a5450', beak: '#e2d6b8', beakFrom: 0.3, fur: 0.008, mottle: 0.1,
            furBy: { snoutBack: 0.4, wingbone: 0 },
            scaly: ['jaw', 'brow', 'foot', 'toe', 'hand', 'crest', 'shin', 'wingbone'], scale: 0.0012,
            pattern: (s, col) => {
                if (s.tag === 'crest') return mix(C('#c23a24'), C('#2a2422'), smooth(0.4, 0.95, s.n[1]) * 0.5);
                if (s.tag === 'wingbone' || s.tag === 'hand' || s.tag === 'foot' || s.tag === 'shin') return C('#3a3634');
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 260, details: [{ sculpt: crest, res: 160 }], fur: { shells: 16, density: 1100, thickness: 1.2, lift: 0.55, tuft: 0.5 }, skin: { bump: 0.25 }, eye: { iris: '#3a2410' }, claw: '#2a2420', length: L };
    }
    return { build };
})();

export const Dendrorhynchoides = (() => {
    function build(stage, { pose } = {}) {
        const L = 0.15;
        const S = new Sculpt();
        // a tiny, fluffy insect-catcher with a short, wide, frog-like head and big eyes
        const rig = pterosaur(S, {
            pose, humerus: 0.022, forearm: 0.032, meta: 0.022, wingFinger: 0.11, femur: 0.022, tibia: 0.03, footLen: 0.012,
            torso: 0.032, chestR: 0.011, bellyR: 0.012, hipR: 0.008, neck: 0.012, neckR: 0.0075, headNeckR: 0.0075, tail: 0.006,
            head: 0.026, headH: 0.016, headW: 0.03, tip: 0.95, eyeR: 0.0034, eyeAt: 0.36, limbR: 0.0018, neckRise: 0.4, headTilt: -0.05
        });
        [rig.armR, rig.armL].forEach((arm, i) => {
            const s = i === 0 ? 1 : -1;
            if (pose === 'fly') {
                const { lead, trail } = flightWingEdges(rig, s);
                S.extra({ type: 'mesh', bone: s > 0 ? 'armR' : 'armL', object: membrane(lead, trail, { col: '#5a4434', col2: '#2e221a', rays: 30 }) });
                return;
            }
            const leg = s > 0 ? rig.legR : rig.legL;
            const trailing = [add(arm.elbow, [-0.002, -0.003, 0]), add(arm.sh, [-0.01, -0.005, 0.004 * s]), add(leg.hip, [0, 0.002, 0.006 * s])];
            S.extra({ type: 'mesh', object: membrane(arm.wf.slice(1), trailing, { col: '#5a4434', col2: '#2e221a', sag: 0.003, sagDir: [0, -0.6, s * 0.5], rays: 30 }) });
        });
        const paint = scheme({
            L, base: '#6a5440', back: '#3e3024', belly: '#c9b28e', skin: '#4a3a2c', fur: 0.006, mottle: 0.3,
            furBy: { snout: 0.5, jaw: 0.4, head: 0.9, wingbone: 0, hand: 0, foot: 0 },
            scaly: ['brow', 'foot', 'toe', 'hand', 'wingbone'], scale: 0.0004, tip: '#c9b28e', tipAmt: 0.25,
            pattern: (s, col) => (s.tag === 'wingbone' ? C('#3a2c20') : col)
        });
        return { sculpt: S, paint, rig, res: 240, fur: { shells: 18, density: 5500, thickness: 1.25, lift: 0.6, tuft: 0.55 }, skin: { bump: 0.2 }, eye: { iris: '#1a120c', pupil: 0.65, irisSize: 0.9 }, claw: '#2a2420', length: L };
    }
    return { build };
})();
