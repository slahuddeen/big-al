// Feathered dinosaurs with unusual bodies: Caudipteryx, Incisivosaurus, Beipiaosaurus and
// Mei long; the beaked bird Confuciusornis; and the parrot-beaked Psittacosaurus.
import { Sculpt } from '../sculpt.js';
import { biped, add, mul, lerp3 } from '../anatomy.js';
import { C, mix, smooth, scheme } from '../paint.js';
import { foldedWing, tailFan, ridgeQuills } from '../plumage.js';
import { STYLE } from '../feathers.js';
import { SMALL, sized } from './theropods.js';

export const Caudipteryx = (() => {
    function build() {
        const L = 1.0;
        const S = new Sculpt();
        // long legs, a short tail with a fan of feathers, a short beaked head
        const rig = biped(S, sized(L, {
            ...SMALL, femur: 0.13, tibia: 0.18, meta: 0.1, torso: 0.15, bellyR: 0.04, chestR: 0.035, hipR: 0.028, thighR: 0.03,
            neck: 0.14, neckR: 0.017, headNeckR: 0.013, neckRise: 1.0, head: 0.075, headH: 0.036, headW: 0.026, snoutTip: 0.75, eyeR: 0.008, eyeAt: 0.33,
            tail: 0.22, tailR: 0.02, tailLift: 0.3, humerus: 0.06, forearm: 0.05, hand: 0.05, armPose: 'fold', beakHook: 0.2
        }));
        const paint = scheme({
            L, base: '#6f6458', back: '#4a4038', belly: '#e9e2d4', beak: '#3a3430', beakFrom: 0.55, fur: 0.014, mottle: 0.2,
            pattern: (s, col) => (s.tag === 'neck' || s.tag === 'jaw' ? mix(col, C('#f1ece2'), smooth(-0.1, -0.6, s.n[1]) * 0.9) : col)
        });
        const list = [
            ...foldedWing(rig.armR, { primary: 0.15, primaries: 8, secondaries: 6, col: '#2a2522', col2: '#f2ece2', bands: 2, coverCol: '#5a4e44' }),
            ...foldedWing(rig.armL, { primary: 0.15, primaries: 8, secondaries: 6, col: '#2a2522', col2: '#f2ece2', bands: 2, coverCol: '#5a4e44' }),
            // a raised fan for display, its feathers banded dark and light as in some fossils
            ...tailFan(rig.tail, { from: 0.45, length: 0.17, spread: 0.7, col: '#1f1b19', col2: '#efe8dc', bands: 2, count: 6, frond: false, style: STYLE.vane })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 240, fur: { shells: 20, density: 750, thickness: 1.2, lift: 0.45, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#d0a030' }, length: L };
    }
    return { build };
})();

export const Incisivosaurus = (() => {
    function build() {
        const L = 1.0;
        const S = new Sculpt();
        const rig = biped(S, sized(L, {
            ...SMALL, femur: 0.1, tibia: 0.12, meta: 0.068, head: 0.08, headH: 0.042, headW: 0.032, snoutTip: 0.85, eyeR: 0.0085, eyeAt: 0.34, eyeUp: 0.2,
            tail: 0.48, humerus: 0.055, forearm: 0.045, hand: 0.05, armPose: 'fold', beakHook: 0.1
        }));
        // the buck teeth: two big incisor-like teeth at the front of the upper jaw
        const { at, dir } = rig.head;
        [1, -1].forEach((sd) => S.extra({ type: 'claw', at: at(0.93, -0.24, 0.045 * sd), dir: [dir[0] * 0.6, -0.8, 0], up: [1, 0, 0], length: 0.014, radius: 0.0045, curve: 0.2, color: '#e9e1cc' }));
        const paint = scheme({
            L, base: '#a08560', back: '#6d5536', belly: '#ece3cf', skin: '#5a6e86', feet: '#6a5a48', sole: '#5a5048', beak: '#3a3430', beakFrom: 0.75, fur: 0.02, mottle: 0.3,
            furBy: { snoutBack: 0.5 },
            pattern: (s, col, { x, y, z }) => {
                // dark spots over the back
                const sp = Math.sin(x * 160) * Math.sin(y * 150 + z * 40) * Math.sin(z * 170);
                return mix(col, C('#3b2c1c'), smooth(0.25, 0.45, sp) * smooth(0.1, 0.6, s.n[1]) * (s.tag === 'body' || s.tag === 'tail' ? 0.7 : 0));
            }
        });
        const list = [
            ...foldedWing(rig.armR, { primary: 0.12, primaries: 8, secondaries: 7, col: '#4a3a28', col2: '#d9c9a8', tipCol: '#d9c9a8' }),
            ...foldedWing(rig.armL, { primary: 0.12, primaries: 8, secondaries: 7, col: '#4a3a28', col2: '#d9c9a8', tipCol: '#d9c9a8' })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 240, fur: { shells: 20, density: 800, thickness: 1.2, lift: 0.45, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#c58a2c' }, length: L };
    }
    return { build };
})();

export const Beipiaosaurus = (() => {
    function build() {
        const L = 2.2;
        const S = new Sculpt();
        // a therizinosaur: small head, long neck, pot belly, short tail, huge hand claws
        const rig = biped(S, sized(L, {
            femur: 0.13, tibia: 0.13, meta: 0.06, legAng: [0.35, -0.5, 0.25], hipW: 0.028, thighR: 0.04, kneeR: 0.016, shinR: 0.015, ankleR: 0.01, metaR: 0.011,
            toeLen: 0.04, toeR: 0.007, toes: 4, hallux: false, toeClaw: 0.01,
            torso: 0.19, hipR: 0.038, bellyR: 0.062, chestR: 0.045, bellyDrop: 0.035, chestRise: 0.06, bodySquash: 0.78,
            neck: 0.19, neckR: 0.022, headNeckR: 0.014, neckRise: 1.05, neckS: 0.5,
            head: 0.075, headH: 0.03, headW: 0.024, snoutTip: 0.55, snoutSquash: 0.65, headTilt: -0.3, jaw: 0.45, eyeR: 0.0055, eyeAt: 0.3, brow: 0.3, beakHook: 0.05,
            tail: 0.28, tailR: 0.028, tailDroop: 0.06, tailSquash: 0.75,
            humerus: 0.1, forearm: 0.085, hand: 0.06, armR: 0.009, fingers: 3, fingerR: 0.004, handClaw: 0.045, armSpread: 0.25, armDrop: 0.85
        }));
        const paint = scheme({
            L, base: '#5a4330', back: '#3a2a1e', belly: '#8a7058', skin: '#3f3833', beak: '#2e2925', beakFrom: 0.7, fur: 0.07, mottle: 0.25,
            furBy: { head: 0.2, neck: 0.9, hand: 0.1, snoutBack: 0.15 }
        });
        // long, broad, unbranched quills standing up through the fuzz on the neck, back and tail
        const torsoTop = [rig.chest, lerp3(rig.chest, rig.hipC, 0.5), rig.hipC].map((p, i) => add(p, [0, [0.02, 0.03, 0.01][i] * L, 0]));
        const list = [
            ...ridgeQuills([...rig.neck].reverse(), [0.022, 0.02, 0.019, 0.018, 0.016, 0.015, 0.014].map((r) => r * L), { from: 0.05, to: 0.95, count: 24, rows: 4, length: 0.14, width: 0.05, rise: 0.35, col: '#3b2a1c', tipCol: '#e8dcc4' }),
            ...ridgeQuills(torsoTop, [0.045, 0.06, 0.038].map((r) => r * L), { count: 22, rows: 4, length: 0.15, width: 0.05, rise: 0.35, col: '#3b2a1c', tipCol: '#e8dcc4' }),
            ...ridgeQuills(rig.tail, rig.tailRad, { from: 0, to: 0.85, count: 16, rows: 4, length: 0.13, width: 0.05, rise: 0.3, col: '#3b2a1c', tipCol: '#e8dcc4' })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 260, fur: { shells: 24, density: 300, thickness: 1.25, lift: 0.45, tuft: 0.7, curl: 0.2 }, skin: { bump: 0.3 }, eye: { iris: '#6a4a20' }, claw: '#d6cbb5', length: L };
    }
    return { build };
})();

export const MeiLong = (() => {
    function build() {
        const L = 0.53;
        const S = new Sculpt();
        // a small troodontid with big eyes and long legs
        const rig = biped(S, sized(L, {
            ...SMALL, femur: 0.1, tibia: 0.13, meta: 0.08, sickle: true, head: 0.09, headH: 0.036, headW: 0.03, snoutTip: 0.4, eyeR: 0.0105, eyeAt: 0.32, eyeUp: 0.2,
            tail: 0.5, humerus: 0.05, forearm: 0.045, hand: 0.05, armPose: 'fold'
        }));
        const paint = scheme({
            L, base: '#8a8170', back: '#5c5446', belly: '#e9e4d8', fur: 0.012, mottle: 0.35,
            furBy: { snoutBack: 0.4 },
            pattern: (s, col, { x }) => {
                // speckled back and barred tail
                if (s.tag === 'tail') col = mix(col, C('#2e2a24'), smooth(0.7, 0.85, Math.sin(s.u * 50) * 0.5 + 0.5) * 0.7);
                return col;
            }
        });
        const list = [
            ...foldedWing(rig.armR, { primary: 0.07, primaries: 8, secondaries: 7, col: '#4c463c', col2: '#8a8170', tipCol: '#2a2622' }),
            ...foldedWing(rig.armL, { primary: 0.07, primaries: 8, secondaries: 7, col: '#4c463c', col2: '#8a8170', tipCol: '#2a2622' })
        ];
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 240, fur: { shells: 18, density: 1500, thickness: 1.2, lift: 0.45, tuft: 0.6 }, skin: { bump: 0.3 }, eye: { iris: '#e0b23a', ring: '#4a3010', pupil: 0.4 }, length: L };
    }
    return { build };
})();

export const Confuciusornis = (() => {
    function build() {
        const L = 0.32; // body and tail, without the streamers
        const S = new Sculpt();
        // an early beaked bird: short tail ending in a pygostyle, big wings with a claw
        const rig = biped(S, sized(L, {
            femur: 0.12, tibia: 0.16, meta: 0.08, legAng: [0.75, -0.95, 0.35], hipW: 0.03, thighR: 0.045, kneeR: 0.015, shinR: 0.014, ankleR: 0.008, metaR: 0.008,
            toeLen: 0.075, toeR: 0.007, toeClaw: 0.016,
            torso: 0.3, hipR: 0.05, bellyR: 0.075, chestR: 0.08, bellyDrop: 0.0, chestRise: 0.06, bodySquash: 0.8,
            neck: 0.17, neckR: 0.04, headNeckR: 0.034, neckRise: 1.15, neckS: 0.8,
            head: 0.17, headH: 0.08, headW: 0.07, snoutTip: 0.35, snoutSquash: 0.6, headTilt: -0.15, jaw: 0.4, eyeR: 0.018, eyeAt: 0.3, eyeUp: 0.2, brow: 0.1,
            tail: 0.12, tailR: 0.03, tailDroop: 0.1, tailSquash: 0.9,
            humerus: 0.17, forearm: 0.17, hand: 0.15, armR: 0.012, fingers: 3, fingerR: 0.006, handClaw: 0.035, armPose: 'fold'
        }));
        const paint = scheme({
            L, base: '#4e4640', back: '#2e2a28', belly: '#cfc6b8', skin: '#4a4038', beak: '#2a2624', beakFrom: 0.22, fur: 0.012, mottle: 0.2,
            furBy: { neck: 1.2, head: 0.7, snoutBack: 0.8, tail: 1.2 },
            pattern: (s, col) => (s.tag === 'neck' || s.tag === 'jaw' ? mix(col, C('#e9e3d8'), smooth(-0.15, -0.6, s.n[1]) * smooth(0.7, 0.2, s.u)) : col)
        });
        // spotted wing coverts over dark flight feathers
        const list = [
            ...foldedWing(rig.armR, { primary: 0.2, primaries: 9, secondaries: 9, col: '#1f1c1b', col2: '#3a3532', coverCol: '#6a5e54' }),
            ...foldedWing(rig.armL, { primary: 0.2, primaries: 9, secondaries: 9, col: '#1f1c1b', col2: '#3a3532', coverCol: '#6a5e54' })
        ];
        // a pair of long streamer feathers from the tail (thought to belong to males)
        const tip = rig.tail[rig.tail.length - 1];
        [0.05, -0.05].forEach((z) => list.push({ at: tip, dir: [-1, -0.12, z], normal: [0, 1, 0], length: 0.24, width: 0.024, col: '#24201e', col2: '#24201e', style: STYLE.racket, curve: -0.25, asym: 1 }));
        // a short tuft of tail feathers
        list.push(...tailFan(rig.tail, { from: 0.4, length: 0.06, spread: 0.5, col: '#2a2624', col2: '#2a2624', count: 3, frond: false, style: STYLE.vane }));
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 220, fur: { shells: 18, density: 1700, thickness: 1.25, lift: 0.4, tuft: 0.55 }, skin: { bump: 0.25 }, eye: { iris: '#4a2c14', ring: '#1a1008', pupil: 0.5 }, length: L };
    }
    return { build };
})();

export const Psittacosaurus = (() => {
    function build() {
        const L = 1.6;
        const S = new Sculpt();
        // a deep, wide head with a parrot beak and a horn on each cheek; long legs, short arms
        const rig = biped(S, sized(L, {
            femur: 0.12, tibia: 0.13, meta: 0.065, legAng: [0.42, -0.6, 0.3], hipW: 0.03, thighR: 0.038, kneeR: 0.015, shinR: 0.014, ankleR: 0.009, metaR: 0.01,
            toeLen: 0.04, toeR: 0.0075, toes: 3, hallux: true, toeClaw: 0.008,
            torso: 0.22, hipR: 0.042, bellyR: 0.058, chestR: 0.045, bellyDrop: 0.02, chestRise: 0.0, bodySquash: 0.78,
            neck: 0.075, neckR: 0.028, headNeckR: 0.024, neckRise: 0.7, neckS: 0.3,
            head: 0.1, headH: 0.07, headW: 0.072, snoutTip: 0.85, snoutSquash: 0.5, headTilt: -0.25, jaw: 0.6, eyeR: 0.011, eyeAt: 0.3, eyeUp: 0.22, brow: 0.3, beakHook: 1,
            tail: 0.46, tailR: 0.035, tailDroop: 0.04, tailSquash: 0.55,
            humerus: 0.06, forearm: 0.045, hand: 0.03, armR: 0.009, fingers: 3, fingerR: 0.004, handClaw: 0.006, armSpread: 0.3, armDrop: 0.9
        }));
        // the cheek horns
        const { at } = rig.head;
        [1, -1].forEach((sd) => S.extra({ type: 'claw', at: at(0.14, -0.28, 0.5 * sd), dir: [0.1, -0.35, sd], up: [0, 1, 0], length: 0.035, radius: 0.009, curve: 0.3, color: '#3a3028' }));
        // countershaded: darker above, pale below, with a dark patch on the shoulder
        const paint = scheme({
            L, base: '#8a7356', back: '#4f3f2e', belly: '#e2d6bc', skin: '#7a6650', sole: '#5a4c3c', beak: '#2c2622', fur: 0, mottle: 0.25,
            scaly: ['snout', 'jaw', 'brow', 'foot', 'toe', 'hand', 'body', 'neck', 'head', 'thigh', 'shin', 'arm', 'tail'],
            scale: 0.008,
            backAmt: 0.95, bellyAmt: 1,
            pattern: (s, col, { x, y }) => {
                let c = col;
                const base = mix(C('#8a7356'), C('#4f3f2e'), smooth(-0.1, 0.75, s.n[1]));
                c = mix(base, C('#e2d6bc'), smooth(0.0, -0.6, s.n[1]));
                const sh = Math.hypot(x - rig.chest[0], y - rig.chest[1] + 0.02) ;
                c = mix(c, C('#2e241b'), smooth(0.1, 0.05, sh) * smooth(-0.2, 0.4, s.n[1]) * 0.7);
                if (s.tag === 'beak' || ((s.tag === 'snout' || s.tag === 'jaw') && s.u > 0.7)) c = mix(c, C('#2c2622'), s.tag === 'beak' ? 1 : smooth(0.7, 0.8, s.u));
                if (s.tag === 'foot' || s.tag === 'toe') c = mix(C('#5a4c3c'), C('#7a6650'), 0.3);
                // faint bars on the legs and tail
                if (s.tag === 'thigh' || s.tag === 'tail') c = mix(c, C('#3a2e22'), smooth(0.7, 0.9, Math.sin(x * 90) * 0.5 + 0.5) * 0.35 * smooth(-0.3, 0.3, s.n[1]));
                return c;
            }
        });
        // the row of long bristles along the top of the tail
        const list = ridgeQuills(rig.tail, rig.tailRad, { from: 0.08, to: 0.55, count: 40, rows: 2, length: 0.15, width: 0.03, rise: 0.55, col: '#2e2419', tipCol: '#7a6a52', spread: 0.08 });
        S.extra({ type: 'feathers', list });
        return { sculpt: S, paint, rig, res: 260, skin: { bump: 0.45 }, eye: { iris: '#5a3a1c', ring: '#1e1208' }, claw: '#2e2620', length: L };
    }
    return { build };
})();
