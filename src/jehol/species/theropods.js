// Feathered meat-eaters of the Jehol lakes: Sinosauropteryx, Dilong, Sinocalliopteryx,
// Zhenyuanlong and Changyuraptor.
import { Sculpt } from '../sculpt.js';
import { biped, add, mul } from '../anatomy.js';
import { C, mix, smooth, scheme, stripes, rosettes } from '../paint.js';
import { foldedWing, legFeathers, tailFan } from '../plumage.js';
import { STYLE } from '../feathers.js';

// measurements that scale with body length (everything else is an angle or a ratio)
const SIZED = ['femur', 'tibia', 'meta', 'hipW', 'thighR', 'kneeR', 'shinR', 'ankleR', 'metaR', 'toeLen', 'toeR', 'toeClaw', 'torso', 'hipR', 'bellyR', 'chestR', 'bellyDrop', 'chestRise',
    'neck', 'neckR', 'headNeckR', 'head', 'headH', 'headW', 'eyeR', 'tail', 'tailR', 'humerus', 'forearm', 'hand', 'armR', 'fingerR', 'handClaw'];
export const sized = (L, q) => {
    const out = { ...q };
    SIZED.forEach((k) => { if (typeof q[k] === 'number') out[k] = q[k] * L; });
    return out;
};

// a small, long-tailed coelurosaur, as fractions of total length
export const SMALL = {
    femur: 0.088, tibia: 0.105, meta: 0.062, legAng: [0.5, -0.72, 0.36], hipW: 0.018,
    thighR: 0.025, kneeR: 0.011, shinR: 0.011, ankleR: 0.0058, metaR: 0.0058, toeLen: 0.038, toeR: 0.0042, toeClaw: 0.007,
    torso: 0.14, hipR: 0.02, bellyR: 0.029, chestR: 0.026, bellyDrop: 0.004, chestRise: 0.012, bodySquash: 0.72,
    neck: 0.085, neckR: 0.0145, headNeckR: 0.0115, neckRise: 0.85, neckS: 0.6,
    head: 0.085, headH: 0.032, headW: 0.023, snoutTip: 0.6, snoutSquash: 0.66, headTilt: -0.12, jaw: 0.5,
    eyeR: 0.0062, eyeAt: 0.28, eyeUp: 0.17, brow: 0.3,
    tail: 0.56, tailR: 0.017, tailDroop: 0.03, tailSquash: 0.75,
    humerus: 0.04, forearm: 0.032, hand: 0.045, armR: 0.0055, fingers: 3, fingerR: 0.0026, handClaw: 0.009, armSpread: 0.2, armDrop: 0.7
};

// a dark band through the eye, from the nostril back towards the ear
const maskOf = (rig, width) => {
    const e = rig.eyes[0].c;
    const d = rig.head.dir;
    return (s) => {
        if (!['head', 'snout', 'brow', 'neck'].includes(s.tag)) return 0;
        const rel = [s.p[0] - e[0], s.p[1] - e[1]];
        const along = rel[0] * d[0] + rel[1] * d[1];
        const across = -rel[0] * d[1] + rel[1] * d[0];
        const lim = along < 0 ? width * 1.6 : width * 4;
        return smooth(width, width * 0.6, Math.abs(across + along * 0.05)) * smooth(-lim, -lim * 0.6, along) * smooth(width * 5, width * 3.5, along);
    };
};

export const Sinosauropteryx = (() => {
    function build(stage, opts = {}) {
        const L = 1.0;
        const S = new Sculpt();
        // short arms, a big head for its size and the longest tail of any theropod relative to its body
        const rig = biped(S, sized(L, { ...SMALL, tail: 0.6, humerus: 0.033, forearm: 0.024, hand: 0.04, handClaw: 0.011, head: 0.08 }));
        const mask = maskOf(rig, 0.0075);
        // its real colours, from melanosomes: ginger above, white below, a bandit mask and a ringed tail
        const paint = scheme({
            L, base: '#c8692a', back: '#8e3c18', belly: '#f4eee2', sole: '#6b5e52', fur: 0.012, mottle: 0.12,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col) => {
                if (s.tag === 'tail') {
                    const ring = stripes(s.u, 11, 0.45, 0.06);
                    col = mix(col, C('#f4eee2'), Math.max(ring * smooth(0.04, 0.12, s.u), smooth(0.0, -0.5, s.n[1])) * 0.95);
                }
                return mix(col, C('#1e1612'), mask(s) * 0.95);
            }
        });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 18, density: 900, thickness: 1.2, lift: 0.45, tuft: 0.55 }, skin: { bump: 0.3 }, eye: { iris: '#b88628', ring: '#3a2410' }, length: L };
    }
    return { build };
})();

export const Dilong = (() => {
    function build(stage, opts = {}) {
        const L = 1.6;
        const S = new Sculpt();
        // an early tyrannosaur: already big-headed and deep-chested, with a shorter tail than its neighbours
        const rig = biped(S, sized(L, {
            ...SMALL, femur: 0.1, tibia: 0.115, meta: 0.07, thighR: 0.031, torso: 0.15, hipR: 0.025, bellyR: 0.036, chestR: 0.034, chestRise: 0.016,
            neck: 0.08, neckR: 0.02, headNeckR: 0.017, neckRise: 0.7, tail: 0.45, tailR: 0.02,
            head: 0.13, headH: 0.052, headW: 0.035, snoutTip: 0.62, snoutSquash: 0.72, eyeR: 0.0068, brow: 0.6, humerus: 0.04, forearm: 0.03, hand: 0.04
        }));
        // a low Y-shaped crest on the snout
        const crest = new Sculpt();
        [-1, 1].forEach((sd) => {
            const pts = [0.82, 0.62, 0.42].map((f) => add(rig.skullTop(f), [0, 0.002, sd * 0.004 * (1 - f)]));
            crest.chain(pts, [0.0025, 0.0045, 0.003], { tag: 'crest', squash: [0.6, 1], k: 0.002 });
        });
        // colours invented: a tiger of a dinosaur, gold with bold black stripes and a red crest
        const paint = scheme({
            L, base: '#d58b26', back: '#b4661a', belly: '#f4ecda', skin: '#56626e', fur: 0.018, mottle: 0.12,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col, { x, up }) => {
                if (s.tag === 'crest') return C('#c8331e');
                const striped = ['body', 'tail', 'thigh', 'neck', 'arm'].includes(s.tag);
                const st = stripes(x / L + Math.sin(s.p[1] / L * 30) * 0.012, 11, 0.32, 0.05) * smooth(-0.55, -0.1, up);
                col = mix(col, C('#17110d'), striped ? st * 0.95 : 0);
                if (s.tag === 'neck' || s.tag === 'jaw') col = mix(col, C('#f4ecda'), smooth(-0.2, -0.65, up) * 0.9);
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 260, details: [{ sculpt: crest, res: 80 }], fur: { shells: 20, density: 800, thickness: 1.2, lift: 0.4, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#e0b030' }, length: L };
    }
    return { build };
})();

export const Sinocalliopteryx = (() => {
    function build(stage, opts = {}) {
        const L = 2.4;
        const S = new Sculpt();
        // long and low: a long body and skull, big grasping hands and a very long tail
        const rig = biped(S, sized(L, {
            ...SMALL, femur: 0.08, tibia: 0.095, meta: 0.055, legAng: [0.56, -0.82, 0.42], thighR: 0.026,
            torso: 0.17, hipR: 0.022, bellyR: 0.029, chestR: 0.027, bodySquash: 0.68, neck: 0.09, neckRise: 0.6,
            tail: 0.63, tailR: 0.016, head: 0.115, headH: 0.028, headW: 0.021, snoutTip: 0.35, eyeAt: 0.25,
            humerus: 0.05, forearm: 0.04, hand: 0.068, armR: 0.007, handClaw: 0.014
        }));
        // colours invented: a snow leopard, cream with black rosettes, a ringed tail and a bare red face
        const paint = scheme({
            L, base: '#eee6d4', back: '#ddd0b4', belly: '#f7f3ea', skin: '#b03e2c', feet: '#4a403a', fur: 0.03, mottle: 0.1,
            furBy: { snoutBack: 0.35 },
            pattern: (s, col, { up }) => {
                if (s.tag === 'hand') return C('#4a403a');
                const spotted = ['body', 'thigh', 'neck', 'arm', 'tail', 'head'].includes(s.tag);
                if (spotted) {
                    const r = rosettes(s.p, L * 0.032);
                    const side = smooth(-0.7, -0.2, up);
                    col = mix(col, C('#1a1612'), r.ring * side * (s.tag === 'tail' ? smooth(0.55, 0.4, s.u) : 1));
                    col = mix(col, C('#d6a456'), r.centre * side * 0.45 * (s.tag === 'body' ? 1 : 0));
                }
                if (s.tag === 'tail') col = mix(col, C('#1a1612'), stripes(s.u, 9, 0.38, 0.05) * smooth(0.45, 0.55, s.u));
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 280, fur: { shells: 20, density: 360, thickness: 1.2, lift: 0.42, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#e0b23a', ring: '#2a2a10' }, length: L };
    }
    return { build };
})();

// a dromaeosaur rig: sickle claws, folded arms
const RAPTOR = { ...SMALL, sickle: true, armPose: 'fold', legAng: [0.55, -0.78, 0.38], meta: 0.055, tibia: 0.11, toeClaw: 0.006 };

export const Zhenyuanlong = (() => {
    function build(stage, opts = {}) {
        const L = 1.65;
        const S = new Sculpt();
        // a heavy-bodied dromaeosaur: short arms for a raptor, but with big wings
        const rig = biped(S, sized(L, {
            ...RAPTOR, torso: 0.16, hipR: 0.025, bellyR: 0.036, chestR: 0.034, thighR: 0.03, neckR: 0.017,
            humerus: 0.045, forearm: 0.035, hand: 0.045, tail: 0.53, tailR: 0.019, head: 0.1, headH: 0.034, snoutTip: 0.5, eyeR: 0.0065
        }));
        // colours invented: a magpie, black and white, with a gold head and neck ruff and blue face skin
        const paint = scheme({
            L, base: '#1f1c1b', back: '#151313', belly: '#f1ebe0', skin: '#3f6888', feet: '#2a2624', fur: 0.022, mottle: 0.1,
            furBy: { snoutBack: 0.4, tail: 0.7 },
            pattern: (s, col, { up, x }) => {
                if (s.tag === 'head' || s.tag === 'brow') return mix(C('#d9a12a'), C('#b07a1a'), smooth(0, 0.8, up) * 0.5);
                if (s.tag === 'neck') col = mix(col, C('#d9a12a'), smooth(0.85, 0.2, s.u) * smooth(-0.8, -0.2, up) + smooth(0.85, 0.5, s.u) * 0.5);
                // a white slash across the shoulder
                if (s.tag === 'body') col = mix(col, C('#f1ebe0'), stripes(x / L - 0.05, 4, 0.18, 0.05) * smooth(-0.3, 0.1, up) * smooth(0.9, 0.5, up) * smooth(0, 0.06, x / L));
                return col;
            }
        });
        const w = '#f1ebe0', b = '#151313';
        const list = [
            ...foldedWing(rig.armR, { primary: 0.22, col: b, col2: w, bands: 3, coverCol: '#d9a12a' }),
            ...foldedWing(rig.armL, { primary: 0.22, col: b, col2: w, bands: 3, coverCol: '#d9a12a' }),
            ...tailFan(rig.tail, { from: 0.15, length: 0.17, spread: 0.45, col: b, col2: w, bands: 2, count: 12, frond: false })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 20, density: 600, thickness: 1.2, lift: 0.4, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#e8b23a' }, length: L };
    }
    return { build };
})();

export const Changyuraptor = (() => {
    function build(stage, opts = {}) {
        const L = 1.3;
        const S = new Sculpt();
        const rig = biped(S, sized(L, { ...RAPTOR, humerus: 0.085, forearm: 0.075, hand: 0.085, tail: 0.5, head: 0.085, headH: 0.032, snoutTip: 0.55 }));
        // colours invented: a golden pheasant, gold body, glossy black-green head, barred wings and
        // white tail plumes with black tips
        const paint = scheme({
            L, base: '#d29a2a', back: '#a8701a', belly: '#f2e2b8', fur: 0.016, mottle: 0.12,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col, { up }) => {
                if (s.tag === 'head' || s.tag === 'brow') return C('#1c2622');
                if (s.tag === 'neck') col = mix(col, C('#1c2622'), smooth(0.65, 0.25, s.u));
                if (s.tag === 'body' || s.tag === 'thigh') col = mix(col, C('#7a1e14'), smooth(0.4, 0.9, up) * 0.35);
                return col;
            }
        });
        const fc = '#161616', fc2 = '#d6a232';
        const list = [
            ...foldedWing(rig.armR, { primary: 0.24, col: fc, col2: fc2, bands: 3, tipCol: '#161616', coverCol: '#d29a2a' }),
            ...foldedWing(rig.armL, { primary: 0.24, col: fc, col2: fc2, bands: 3, tipCol: '#161616', coverCol: '#d29a2a' }),
            ...legFeathers(rig.legR, 1, { length: 0.16, col: fc, col2: fc2 }),
            ...legFeathers(rig.legL, -1, { length: 0.16, col: fc, col2: fc2 }),
            // the longest tail feathers of any non-bird dinosaur, about 30 cm
            ...tailFan(rig.tail, { from: 0.55, length: 0.3, spread: 0.3, col: '#f4efe4', col2: '#f4efe4', tipCol: '#141414', count: 6 })
        ];
        S.extra({ type: 'feathers', list, style: { irid: 0.25, rough: 0.45 } });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 18, density: 700, thickness: 1.2, lift: 0.4, tuft: 0.6, irid: 0.2, rough: 0.55 }, skin: { bump: 0.3 }, eye: { iris: '#d8a030' }, length: L };
    }
    return { build };
})();
