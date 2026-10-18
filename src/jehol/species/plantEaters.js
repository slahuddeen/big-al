// Big plant-eaters and the little armoured one: Jinzhousaurus, Dongbeititan, Liaoningosaurus
import { Sculpt, vec } from '../sculpt.js';
import { quadruped } from '../bodyplans.js';
import { add, mul, lerp, lerp3 } from '../anatomy.js';
import { C, mix, smooth, scheme, stripes } from '../paint.js';

export const Jinzhousaurus = (() => {
    function build(stage, opts = {}) {
        const L = 7;
        const S = new Sculpt();
        const rig = quadruped(S, {
            femur: 0.85, tibia: 0.78, meta: 0.36, hindAng: [0.22, -0.28, 0.25], humerus: 0.55, forearm: 0.48, mc: 0.2, foreAng: [-0.25, 0.18, 0.1],
            hipW: 0.26, shW: 0.27, thighR: 0.34, kneeR: 0.16, shinR: 0.16, ankleR: 0.1, footR: 0.1, upperArmR: 0.15, elbowR: 0.1, wristR: 0.08, handR: 0.08,
            torso: 2.0, hipR: 0.4, bellyR: 0.56, chestR: 0.44, bodySquash: 0.7, bellyDrop: 0.12, backHump: 0.15,
            neck: 0.85, neckR: 0.28, headNeckR: 0.18, neckRise: 0.4, neckS: 0.5,
            head: 0.7, headH: 0.3, headW: 0.22, tip: 0.65, squash: 0.62, eyeR: 0.028, eyeAt: 0.28, headTilt: -0.35, jaw: 0.55,
            tail: 3.3, tailR: 0.38, tailDroop: 0.04, tailSquash: 0.55,
            feet: 'hoof3', hands: 'hoof', toeLen: 0.22, toeR: 0.055, claw: 0.07
        });
        // colours invented: gold-tan with a dark back and cream stripes edged in black down the flanks
        const paint = scheme({
            L, base: '#b48c48', back: '#4e3a24', belly: '#efe4c8', skin: '#8a6a3a', beak: '#2e2a26', beakFrom: 0.78, fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail'], scale: 0.035, mottle: 0.15,
            pattern: (s, col, { x, y }) => {
                const c0 = mix(C('#b48c48'), C('#4e3a24'), smooth(0.1, 0.8, s.n[1]));
                let c = mix(c0, C('#efe4c8'), smooth(0.0, -0.6, s.n[1]));
                // cream stripes with black edges on the flanks, thighs and tail
                const v = Math.sin(x * 9 + Math.sin(y * 5) * 1.2) * 0.5 + 0.5;
                const side = smooth(-0.55, -0.1, s.n[1]) * smooth(0.95, 0.6, s.n[1]);
                if (s.tag === 'body' || s.tag === 'tail' || s.tag === 'thigh') {
                    c = mix(c, C('#1c1612'), smooth(0.7, 0.74, v) * side * 0.9);
                    c = mix(c, C('#f4ead0'), smooth(0.8, 0.84, v) * side);
                }
                if (s.tag === 'snout' && s.u > 0.4 && s.u < 0.8) c = mix(c, C('#b8402a'), smooth(0.2, 0.6, s.n[1]) * 0.8);
                if (s.tag === 'snout' || s.tag === 'jaw') c = mix(c, C('#2e2a26'), smooth(0.74, 0.82, s.u));
                return c;
            }
        });
        return { sculpt: S, paint, rig, res: 300, skin: { bump: 0.5 }, eye: { iris: '#8a5a22' }, claw: '#3a342c', length: L };
    }
    return { build };
})();

export const Dongbeititan = (() => {
    function build(stage, opts = {}) {
        const L = 15;
        const S = new Sculpt();
        const rig = quadruped(S, {
            femur: 1.55, tibia: 1.0, meta: 0.3, hindAng: [0.04, -0.06, 0.15], humerus: 1.45, forearm: 1.05, mc: 0.5, foreAng: [0.0, 0.04, 0.0],
            hipW: 0.6, shW: 0.6, thighR: 0.55, kneeR: 0.28, shinR: 0.26, ankleR: 0.22, footR: 0.28, upperArmR: 0.36, elbowR: 0.24, wristR: 0.2, handR: 0.24,
            torso: 3.4, hipR: 0.85, bellyR: 1.15, chestR: 1.05, bodySquash: 0.85, bellyDrop: 0.15, backHump: 0.1,
            neck: 6.6, neckR: 0.58, headNeckR: 0.18, neckRise: 0.62, neckS: 0.35,
            head: 0.72, headH: 0.32, headW: 0.3, tip: 0.85, squash: 0.85, eyeR: 0.035, eyeAt: 0.35, eyeUp: 0.22, headTilt: -0.5, jaw: 0.5,
            tail: 7, tailR: 0.75, tailDroop: 0.12, tailSquash: 0.8,
            feet: 'column', hands: 'column', claw: 0.16
        });
        // colours invented: slate grey with a dark saddle, a pale belly, gold bands down the neck
        // and tail and a rust-red face
        const paint = scheme({
            L, base: '#77808a', back: '#353d48', belly: '#ddd6c4', skin: '#6a665c', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail'], scale: 0.06, mottle: 0.2,
            pattern: (s, col) => {
                let c = col;
                const top = smooth(-0.35, 0.2, s.n[1]);
                if (s.tag === 'neck') c = mix(c, C('#d4a242'), stripes(s.u, 9, 0.35, 0.06) * top * smooth(0.04, 0.12, s.u));
                if (s.tag === 'tail') c = mix(c, C('#d4a242'), stripes(s.u, 12, 0.35, 0.06) * top);
                // dark slate bands over the back and down the flanks
                if (s.tag === 'body' || s.tag === 'thigh') c = mix(c, C('#262c34'), stripes(s.p[0] / L, 9, 0.4, 0.05) * smooth(-0.5, 0.0, s.n[1]) * 0.8);
                if (s.tag === 'neck') c = mix(c, C('#ddd6c4'), smooth(-0.3, -0.8, s.n[1]) * 0.7);
                if (['head', 'snout', 'brow'].includes(s.tag)) c = mix(c, C('#a8442c'), smooth(-0.2, 0.5, s.n[1]) * 0.8);
                return c;
            }
        });
        return { sculpt: S, paint, rig, res: 340, skin: { bump: 0.5 }, eye: { iris: '#6a4a26' }, claw: '#3a342c', length: L };
    }
    return { build };
})();

export const Liaoningosaurus = (() => {
    function build(stage, opts = {}) {
        const L = 0.34;
        const S = new Sculpt();
        // Known from a small juvenile: an ankylosaur with long, slender legs, a short, broad,
        // triangular head with horns at the back corners, plates over the back, spikes down the
        // sides, a tail without a club, and the only bony belly shield known in an ankylosaur
        const rig = quadruped(S, {
            femur: 0.042, tibia: 0.034, meta: 0.012, hindAng: [0.25, -0.34, 0.2], humerus: 0.034, forearm: 0.028, mc: 0.01, foreAng: [-0.16, 0.22, 0.05],
            hipW: 0.025, shW: 0.024, thighR: 0.0135, kneeR: 0.0075, shinR: 0.007, ankleR: 0.0052, footR: 0.0052, upperArmR: 0.0105, elbowR: 0.0065, wristR: 0.0048, handR: 0.0048,
            torso: 0.12, hipR: 0.026, bellyR: 0.032, chestR: 0.028, bodySquash: 1.3, bellyDrop: 0.002, backHump: 0.012,
            neck: 0.03, neckR: 0.017, headNeckR: 0.015, neckRise: 0.22, neckS: 0.3,
            head: 0.04, headH: 0.024, headW: 0.037, tip: 0.8, squash: 0.6, eyeR: 0.0042, eyeAt: 0.36, eyeUp: 0.26, headTilt: -0.22, jaw: 0.45, brow: 0.9,
            tail: 0.15, tailR: 0.016, tailDroop: 0.05, tailSquash: 1.4,
            feet: 'broad', hands: 'broad', toeLen: 0.012, toeR: 0.0028, claw: 0.0045
        });
        const sq = 1.3;
        const ivory = '#efe6cf', ink = '#1c1712';
        const spike = (at, dir, length, color = ivory, curve = 0.15) => S.extra({ type: 'claw', at, dir: vec.norm(dir), up: [0.01, 1, 0], length, radius: length * 0.42, curve, color });
        // a flat plate lying on the skin at angle a around a body section, with a low keel
        const plate = (p, r, a, size, keel, sqz = sq) => {
            const n = vec.norm([0, Math.cos(a), Math.sin(a) / sqz]);
            const at = add(p, [0, Math.cos(a) * r, Math.sin(a) * r * sqz]);
            S.ellipsoid(at, [size, size * 0.24, size * 0.85], { dir: [1, 0, 0], up: n, tag: 'scute', k: size * 0.25 });
            if (keel) spike(add(at, mul(n, size * 0.15)), add(n, [-0.35, 0, 0]), keel, ink, 0.05);
        };
        // transverse rows of plates over the back, the midline ones keeled
        const T = rig.torso, R = rig.torsoR;
        for (let j = 0; j <= (T.length - 1) * 2; j++) {
            // rows between the torso stations as well, so the plates nearly touch
            const i0 = Math.floor(j / 2), f = (j % 2) * 0.5;
            const p = lerp3(T[i0], T[Math.min(T.length - 1, i0 + 1)], f), r = lerp(R[i0], R[Math.min(R.length - 1, i0 + 1)], f);
            const row = j % 2 ? [-0.84, -0.42, 0, 0.42, 0.84] : [-1.05, -0.63, -0.21, 0.21, 0.63, 1.05];
            row.forEach((a) => plate(p, r * 0.98, a, 0.0105, Math.abs(a) < 0.25 ? 0.0042 : 0.0024));
        }
        for (let i = 0; i < T.length; i++) {
            // big flat spikes down each side, longest over the shoulders
            [1, -1].forEach((sd) => spike(add(T[i], [0, R[i] * 0.1, sd * R[i] * sq * 0.97]), [-0.4, 0.06, sd], 0.011 + (i === 0 ? 0.008 : i === 1 ? 0.004 : 0), ivory, 0.2));
        }
        // two half-rings of plates over the neck, each with a pair of spikes
        [0.3, 0.75].forEach((t) => {
            const k = Math.round(t * (rig.neck.length - 1));
            const p = rig.neck[k], r = 0.016;
            [-0.9, -0.3, 0.3, 0.9].forEach((a) => plate(p, r, a, 0.0075, 0.003, 1.05));
            [1, -1].forEach((sd) => spike(add(p, [0, r * 0.4, sd * r * 1.05]), [-0.1, 0.35, sd], 0.008, ivory, 0.2));
        });
        // triangular plates in pairs down the sides of the tail, a low keel on top
        rig.tail.slice(0, 8).forEach((p, i) => {
            const r = rig.tailRad[i];
            [1, -1].forEach((sd) => spike(add(p, [0, 0, sd * r * 1.25]), [-0.55, 0.0, sd * 0.8], 0.009 * (1 - i * 0.09), ivory, 0.05));
            plate(p, r, 0, 0.006 * (1 - i * 0.06), 0.003, 1.4);
        });
        // horns at the back corners of the skull and on the cheeks
        const { at } = rig.head;
        [1, -1].forEach((sd) => {
            spike(at(0.1, 0.35, 0.48 * sd), [-0.55, 0.15, 0.8 * sd], 0.009, ivory, 0.2);
            spike(at(0.22, -0.45, 0.5 * sd), [0.1, -0.6, 0.8 * sd], 0.006, ivory, 0.2);
        });
        // colours invented: gold, the plates banded black, a black mask and a pale belly
        const paint = scheme({
            L, base: '#cc9c3c', back: '#b07e28', belly: '#efe2c2', skin: '#b08a40', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail', 'scute'], scale: 0.0022, mottle: 0.15,
            pattern: (s, col, { x, up }) => {
                const band = stripes(x / L, 9, 0.45, 0.04);
                if (s.tag === 'scute') return mix(C('#d8aa48'), C(ink), band * 0.95);
                if (s.tag === 'tail') col = mix(col, C(ink), stripes(s.u, 6, 0.4, 0.06) * smooth(-0.4, 0.2, up));
                if (s.tag === 'brow' || s.tag === 'head') col = mix(col, C(ink), smooth(0.0, 0.6, up) * 0.7);
                if (s.tag === 'snout') col = mix(col, C('#2a221a'), smooth(0.75, 0.9, s.u));
                return col;
            }
        });
        return { sculpt: S, paint, rig, res: 280, skin: { bump: 0.5 }, eye: { iris: '#d0a030' }, claw: '#2a241c', length: L };
    }
    return { build };
})();
