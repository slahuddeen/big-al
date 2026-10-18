// Big plant-eaters and the little armoured one: Jinzhousaurus, Dongbeititan, Liaoningosaurus
import { Sculpt, vec } from '../sculpt.js';
import { quadruped } from '../bodyplans.js';
import { add, mul, lerp } from '../anatomy.js';
import { C, mix, smooth, scheme, fbm } from '../paint.js';

export const Jinzhousaurus = (() => {
    function build() {
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
        const paint = scheme({
            L, base: '#7c7a62', back: '#4f5040', belly: '#d8cfb4', skin: '#5a5848', beak: '#2e2a26', beakFrom: 0.78, fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail'], scale: 0.035, mottle: 0.3,
            pattern: (s, col, { x, y }) => {
                const c0 = mix(C('#7c7a62'), C('#4f5040'), smooth(-0.1, 0.75, s.n[1]));
                let c = mix(c0, C('#d8cfb4'), smooth(0.0, -0.6, s.n[1]));
                // pale vertical stripes on the flanks
                const st = smooth(0.72, 0.9, Math.sin(x * 14 + Math.sin(y * 5) * 1.2) * 0.5 + 0.5) * smooth(-0.5, 0.2, s.n[1]) * smooth(0.95, 0.5, s.n[1]);
                if (s.tag === 'body' || s.tag === 'tail' || s.tag === 'thigh') c = mix(c, C('#c9c2a2'), st * 0.4);
                if (s.tag === 'snout' && s.u > 0.4 && s.u < 0.8) c = mix(c, C('#a0503a'), smooth(0.2, 0.6, s.n[1]) * 0.6);
                if (s.tag === 'snout' || s.tag === 'jaw') c = mix(c, C('#2e2a26'), smooth(0.74, 0.82, s.u));
                return c;
            }
        });
        return { sculpt: S, paint, rig, res: 300, skin: { bump: 0.5 }, eye: { iris: '#8a5a22' }, claw: '#3a342c', length: L };
    }
    return { build };
})();

export const Dongbeititan = (() => {
    function build() {
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
        const paint = scheme({
            L, base: '#8f8676', back: '#5c5448', belly: '#c9bea6', skin: '#6a665c', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail'], scale: 0.06, mottle: 0.4,
            pattern: (s, col, { x, y, z }) => {
                // large dark blotches over the back, a pale throat
                const b = fbm(x * 0.6, y * 0.6, z * 0.6);
                let c = mix(col, C('#3e3c38'), smooth(0.55, 0.7, b) * smooth(0.0, 0.6, s.n[1]) * 0.7);
                if (s.tag === 'neck') c = mix(c, C('#d6cdb8'), smooth(-0.3, -0.8, s.n[1]) * 0.6);
                return c;
            }
        });
        return { sculpt: S, paint, rig, res: 340, skin: { bump: 0.5 }, eye: { iris: '#6a4a26' }, claw: '#3a342c', length: L };
    }
    return { build };
})();

export const Liaoningosaurus = (() => {
    function build() {
        const L = 0.34;
        const S = new Sculpt();
        const rig = quadruped(S, {
            femur: 0.03, tibia: 0.022, meta: 0.009, hindAng: [0.45, -0.5, 0.25], humerus: 0.024, forearm: 0.017, mc: 0.008, foreAng: [-0.45, 0.4, 0.05],
            hipW: 0.024, shW: 0.024, thighR: 0.014, kneeR: 0.008, shinR: 0.0075, ankleR: 0.006, footR: 0.006, upperArmR: 0.01, elbowR: 0.007, wristR: 0.0055, handR: 0.0055,
            torso: 0.12, hipR: 0.028, bellyR: 0.036, chestR: 0.031, bodySquash: 1.35, bellyDrop: 0.004, backHump: 0.008,
            neck: 0.03, neckR: 0.02, headNeckR: 0.016, neckRise: 0.15, neckS: 0.2,
            head: 0.04, headH: 0.022, headW: 0.034, tip: 0.95, squash: 0.95, eyeR: 0.0045, eyeAt: 0.32, headTilt: -0.3, jaw: 0.5, brow: 0.8,
            tail: 0.12, tailR: 0.02, tailDroop: 0.08, tailSquash: 1.15,
            feet: 'broad', hands: 'broad', toeLen: 0.012, toeR: 0.003, claw: 0.004
        });
        // armour: rows of keeled scutes over the back, bigger spikes along the flanks and neck
        const spikes = [];
        const T = rig.torso, R = rig.torsoR;
        const sq = 1.35;
        for (let i = 0; i < T.length; i++) {
            const p = T[i], r = R[i];
            [-1.05, -0.6, -0.2, 0.2, 0.6, 1.05].forEach((a) => {
                const n = [0, Math.cos(a), Math.sin(a) * sq];
                const at = add(p, [0, Math.cos(a) * r, Math.sin(a) * r * sq]);
                S.ellipsoid(at, [0.008, 0.0035, 0.006], { dir: [1, 0, 0], up: vec.norm(n), tag: 'scute', k: 0.002 });
                spikes.push({ at: add(at, mul(vec.norm(n), 0.002)), dir: vec.norm(n), size: 0.0045 });
            });
            // flank spikes
            [1, -1].forEach((sd) => spikes.push({ at: add(p, [0, r * 0.15, sd * r * sq * 0.98]), dir: vec.norm([-0.3, 0.1, sd]), size: 0.009 + (i < 2 ? 0.003 : 0) }));
        }
        rig.tail.slice(0, 7).forEach((p, i) => [1, -1].forEach((sd) => spikes.push({ at: add(p, [0, 0, sd * rig.tailRad[i] * 1.1]), dir: vec.norm([-0.4, 0.05, sd]), size: 0.007 * (1 - i * 0.1) })));
        spikes.forEach((sp) => S.extra({ type: 'claw', at: sp.at, dir: sp.dir, up: [0.01, 1, 0], length: sp.size, radius: sp.size * 0.45, curve: 0.25, color: '#5a5042' }));
        const paint = scheme({
            L, base: '#7b6f55', back: '#5c523e', belly: '#c9bb98', skin: '#6a604c', fur: 0,
            scaly: ['snout', 'jaw', 'brow', 'head', 'neck', 'body', 'thigh', 'shin', 'foot', 'toe', 'arm', 'hand', 'tail', 'scute'], scale: 0.0022, mottle: 0.35,
            pattern: (s, col) => (s.tag === 'scute' ? mix(col, C('#3e3628'), 0.5) : col)
        });
        return { sculpt: S, paint, rig, res: 260, skin: { bump: 0.5 }, eye: { iris: '#8a6a2a' }, claw: '#3a342c', length: L };
    }
    return { build };
})();
