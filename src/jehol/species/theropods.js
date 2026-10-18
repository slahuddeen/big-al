// Feathered meat-eaters of the Jehol lakes: Sinosauropteryx, Dilong, Sinocalliopteryx,
// Zhenyuanlong and Changyuraptor.
import { Sculpt } from '../sculpt.js';
import { biped, add, mul } from '../anatomy.js';
import { C, mix, smooth, scheme } from '../paint.js';
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
        const rig = biped(S, sized(L, { ...SMALL, tail: 0.6, humerus: 0.033, forearm: 0.024, hand: 0.04, handClaw: 0.011, head: 0.08 }));
        const mask = maskOf(rig, 0.0075);
        const paint = scheme({
            L, base: '#a3602f', back: '#7c4321', belly: '#ede4d2', sole: '#6b5e52', fur: 0.012, mottle: 0.15,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col) => {
                // the tail is ringed ginger and white, and a dark mask runs through the eye
                if (s.tag === 'tail') {
                    const ring = smooth(-0.15, 0.15, Math.sin(s.u * Math.PI * 2 * 11 + 0.6));
                    col = mix(col, C('#f1e9da'), ring * smooth(0.04, 0.12, s.u) * 0.92);
                }
                return mix(col, C('#2a1e17'), mask(s) * 0.9);
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
        const rig = biped(S, sized(L, { ...SMALL, femur: 0.1, tibia: 0.12, meta: 0.075, tail: 0.5, head: 0.12, headH: 0.042, headW: 0.03, snoutTip: 0.55, eyeR: 0.0065, neckR: 0.016, humerus: 0.04, forearm: 0.03, hand: 0.04 }));
        // a low Y-shaped crest on the snout
        const crest = new Sculpt();
        [-1, 1].forEach((sd) => {
            const pts = [0.82, 0.62, 0.42].map((f) => add(rig.skullTop(f), [0, 0.002, sd * 0.004 * (1 - f)]));
            crest.chain(pts, [0.0025, 0.0045, 0.003], { tag: 'crest', squash: [0.6, 1], k: 0.002 });
        });
        const paint = scheme({
            L, base: '#7d4b2b', back: '#4d2f1f', belly: '#e6d7bd', fur: 0.018, mottle: 0.2,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col, { x }) => {
                // faint dark bars over the back and down the tail
                const bars = smooth(0.55, 0.8, Math.sin(x / L * 60) * 0.5 + 0.5) * smooth(0.1, 0.7, s.n[1]);
                return mix(col, C('#2d1c13'), bars * (s.tag === 'body' || s.tag === 'tail' ? 0.55 : 0));
            }
        });
        return { sculpt: S, paint, rig, res: 260, details: [{ sculpt: crest, res: 80 }], fur: { shells: 20, density: 800, thickness: 1.2, lift: 0.4, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#c9952e' }, length: L };
    }
    return { build };
})();

export const Sinocalliopteryx = (() => {
    function build(stage, opts = {}) {
        const L = 2.4;
        const S = new Sculpt();
        const rig = biped(S, sized(L, { ...SMALL, tail: 0.6, head: 0.1, headH: 0.03, headW: 0.022, snoutTip: 0.4, humerus: 0.04, forearm: 0.03, hand: 0.05, handClaw: 0.011 }));
        const paint = scheme({
            L, base: '#8e8a7f', back: '#5e5a52', belly: '#ece7da', fur: 0.03, mottle: 0.2,
            furBy: { snoutBack: 0.35 },
            pattern: (s, col, { x }) => {
                // dark stripes across the back, and a yellow throat
                const stripe = smooth(0.62, 0.78, Math.sin(x / L * 75) * 0.5 + 0.5) * smooth(0.15, 0.6, s.n[1]);
                col = mix(col, C('#2c2a27'), stripe * (s.tag === 'body' || s.tag === 'tail' || s.tag === 'neck' ? 0.75 : 0));
                if (s.tag === 'neck' || s.tag === 'jaw') col = mix(col, C('#d6ad3a'), smooth(-0.2, -0.7, s.n[1]) * smooth(0.6, 0.1, s.u) * 0.85);
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 280, fur: { shells: 20, density: 360, thickness: 1.2, lift: 0.42, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#a8b04a', ring: '#2a2a10' }, length: L };
    }
    return { build };
})();

// a dromaeosaur rig: sickle claws, folded arms
const RAPTOR = { ...SMALL, sickle: true, armPose: 'fold', legAng: [0.55, -0.78, 0.38], meta: 0.055, tibia: 0.11, toeClaw: 0.006 };

export const Zhenyuanlong = (() => {
    function build(stage, opts = {}) {
        const L = 1.65;
        const S = new Sculpt();
        // short arms for a dromaeosaur, but with large wings
        const rig = biped(S, sized(L, { ...RAPTOR, humerus: 0.045, forearm: 0.035, hand: 0.045, tail: 0.55, head: 0.1, headH: 0.032, snoutTip: 0.5, eyeR: 0.0065 }));
        const paint = scheme({
            L, base: '#8f4f2c', back: '#5e2f1a', belly: '#eadbc4', fur: 0.022, mottle: 0.2,
            furBy: { snoutBack: 0.4, tail: 0.7 }
        });
        const w = '#f0e8dc', b = '#1e1a18';
        const list = [
            ...foldedWing(rig.armR, { primary: 0.22, col: b, col2: w, bands: 3, coverCol: '#6a3a22' }),
            ...foldedWing(rig.armL, { primary: 0.22, col: b, col2: w, bands: 3, coverCol: '#6a3a22' }),
            ...tailFan(rig.tail, { from: 0.15, length: 0.16, spread: 0.45, col: '#4a2718', col2: w, bands: 2, count: 12, frond: false })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 20, density: 600, thickness: 1.2, lift: 0.4, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#c47a22' }, length: L };
    }
    return { build };
})();

export const Changyuraptor = (() => {
    function build(stage, opts = {}) {
        const L = 1.3;
        const S = new Sculpt();
        const rig = biped(S, sized(L, { ...RAPTOR, humerus: 0.085, forearm: 0.075, hand: 0.085, tail: 0.5, head: 0.085, headH: 0.032, snoutTip: 0.55 }));
        const paint = scheme({
            L, base: '#4b4f57', back: '#33363d', belly: '#8d8f92', fur: 0.016, mottle: 0.15,
            furBy: { snoutBack: 0.4 }
        });
        const fc = '#2d3036', fc2 = '#5b5f68';
        const list = [
            ...foldedWing(rig.armR, { primary: 0.24, col: fc, col2: fc2, tipCol: '#16181c' }),
            ...foldedWing(rig.armL, { primary: 0.24, col: fc, col2: fc2, tipCol: '#16181c' }),
            ...legFeathers(rig.legR, 1, { length: 0.16, col: fc, col2: fc2 }),
            ...legFeathers(rig.legL, -1, { length: 0.16, col: fc, col2: fc2 }),
            // the longest tail feathers of any non-bird dinosaur, about 30 cm
            ...tailFan(rig.tail, { from: 0.55, length: 0.3, spread: 0.3, col: fc, col2: '#16181c', tipCol: '#16181c', count: 6 })
        ];
        S.extra({ type: 'feathers', list, style: { irid: 0.6, rough: 0.4 } });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 18, density: 700, thickness: 1.2, lift: 0.4, tuft: 0.6, irid: 0.5, rough: 0.5 }, skin: { bump: 0.3 }, eye: { iris: '#8a5a20' }, length: L };
    }
    return { build };
})();
