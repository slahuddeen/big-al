// Microraptor: a crow-sized dromaeosaur with long flight feathers on its arms and legs (four
// wings) and a fan at the tip of its tail. Its colour is known from melanosomes: glossy
// black with a blue-green iridescent sheen, like a starling or a crow.
import { Sculpt } from '../sculpt.js';
import { biped } from '../anatomy.js';
import { C, mix, smooth, fbm } from '../paint.js';
import { foldedWing, legFeathers, tailFan } from '../plumage.js';
import { STYLE } from '../feathers.js';

export function build() {
    const L = 0.8;
    const q = {
        femur: 0.068, tibia: 0.094, meta: 0.046, legAng: [0.55, -0.75, 0.38], hipW: 0.016,
        thighR: 0.022, kneeR: 0.009, shinR: 0.0085, ankleR: 0.0045, metaR: 0.0045,
        toeLen: 0.034, toeR: 0.0035, toes: 3, sickle: true, toeClaw: 0.006,
        torso: 0.12, hipR: 0.021, bellyR: 0.03, chestR: 0.029, bellyDrop: 0.004, chestRise: 0.012, bodySquash: 0.72,
        neck: 0.075, neckR: 0.014, headNeckR: 0.011, neckRise: 0.95, neckS: 0.7,
        head: 0.062, headH: 0.027, headW: 0.023, snoutTip: 0.62, snoutSquash: 0.65, headTilt: -0.12, jaw: 0.45,
        eyeR: 0.0068, eyeAt: 0.3, eyeUp: 0.16, brow: 0.2,
        tail: 0.42, tailR: 0.017, tailDroop: 0.02, tailLift: 0.02, tailSquash: 0.75,
        humerus: 0.068, forearm: 0.062, hand: 0.07, armR: 0.0055, fingers: 3, fingerR: 0.0022, handClaw: 0.009, armPose: 'fold'
    };
    const S = new Sculpt();
    const rig = biped(S, q);

    const black = C('#141418'), sooty = C('#24242a'), skin = C('#2c2a2a'), sole = C('#4a4440');
    const paint = (s) => {
        const [x, y, z] = s.p;
        let col = mix(black, sooty, fbm(x * 60, y * 60, z * 60) * 0.6);
        let fur = 0.022;
        let scale = 0, rough = 0.55;
        switch (s.tag) {
            case 'snout': case 'jaw': case 'brow':
                col = skin;
                fur = s.tag === 'snout' ? 0.01 * smooth(0.35, 0.05, s.u) : 0;
                scale = 0.0012;
                break;
            case 'head': fur = 0.008; break;
            case 'neck': fur = 0.02; break;
            case 'shin': fur = 0.018 * smooth(1, 0.5, s.u); break;
            case 'foot': case 'toe':
                col = mix(skin, sole, smooth(0, -0.8, s.n[1]));
                fur = s.tag === 'foot' ? 0.008 * smooth(0.6, 0.1, s.u) : 0;
                scale = 0.0011;
                rough = 0.7;
                break;
            case 'hand': col = skin; fur = 0.004; scale = 0.001; break;
            case 'tail': fur = 0.016; break;
            default: break;
        }
        return { col, fur, tip: mix(col, C('#30343c'), 0.4), scale, rough };
    };

    const fc = '#121216', fc2 = '#1d1f26';
    const feathers = [
        ...foldedWing(rig.armR, { primary: 0.2, col: fc, col2: fc2 }),
        ...foldedWing(rig.armL, { primary: 0.2, col: fc, col2: fc2 }),
        ...legFeathers(rig.legR, 1, { length: 0.12, col: fc, col2: fc2 }),
        ...legFeathers(rig.legL, -1, { length: 0.12, col: fc, col2: fc2 }),
        ...tailFan(rig.tail, { from: 0.62, length: 0.11, spread: 0.55, col: fc, col2: fc2, count: 6 })
    ];
    S.extra({ type: 'feathers', list: feathers, style: { irid: 1, rough: 0.35 } });

    return {
        sculpt: S, paint, rig, res: 260,
        fur: { shells: 20, density: 900, thickness: 1.2, clump: 0.5, lift: 0.4, tuft: 0.6, irid: 1, rough: 0.45 },
        skin: { bump: 0.3 },
        eye: { iris: '#7a4a1c', ring: '#24140a', pupil: 0.45, irisSize: 0.7 },
        claw: '#1a1818',
        length: L
    };
}
