// Sinopterus: a tapejarid pterosaur, about 1.2 m across the wings, with a short toothless
// beak tipped downwards and a crest on its head. It probably ate fruit and seeds as well as
// small animals. Covered in fuzzy pycnofibres. The colours are invented: a pale body, dark
// wings, and a red and gold crest for display.
import { Sculpt } from '../sculpt.js';
import { pterosaur } from '../bodyplans.js';
import { add, mul, lerp } from '../anatomy.js';
import { C, mix, smooth, fbm } from '../paint.js';
import { membrane } from '../membrane.js';

export function build() {
    const S = new Sculpt();
    const rig = pterosaur(S, { femur: 0.045, tibia: 0.068, head: 0.13, headH: 0.04, headW: 0.026, tip: 0.3, beakDrop: 0.12, neck: 0.11, neckR: 0.009, headNeckR: 0.0075, eyeR: 0.0062, eyeAt: 0.22 });
    const H = rig.head;

    // the crest: a bony prong from the back of the skull, and a soft crest above the snout
    // that sweeps back to meet it
    const crest = new Sculpt();
    const prong = [H.top(0.12), add(H.top(0.0), add(mul(H.dir, -0.05), mul(H.up, 0.03)))];
    crest.cone(prong[0], prong[1], 0.0035, 0.0012, { tag: 'crest', squash: [0.5, 1], k: 0.002 });
    const radii = [0.003, 0.008, 0.012, 0.011, 0.007, 0.004];
    const sail = [0.8, 0.68, 0.54, 0.4, 0.26, 0.14].map((f, i) => add(H.top(f), mul(H.up, radii[i] * 0.55)));
    crest.chain(sail, radii, { tag: 'crest', squash: [0.16, 1], k: 0.003 });

    const pale = C('#e4dccb'), grey = C('#8d8679'), dusk = C('#4a4038'), red = C('#c8321e'), gold = C('#e2a92c'), beak = C('#d8c48a'), beakDark = C('#5a5040');
    const paint = (s) => {
        const [x, y, z] = s.p;
        const back = smooth(-0.2, 0.7, s.n[1]);
        let col = mix(pale, grey, back * 0.65 + fbm(x * 80, y * 80, z * 80) * 0.2);
        let fur = 0.006, scale = 0, rough = 0.85;
        switch (s.tag) {
            case 'snout': case 'jaw': {
                // a horny beak over the front of the jaws, darker at the tip
                const b = smooth(0.25, 0.4, s.u);
                col = mix(mix(grey, dusk, 0.3), mix(beak, beakDark, smooth(0.75, 1, s.u)), b);
                fur = 0.003 * (1 - b) * (s.tag === 'snout' ? 1 : 0.4);
                rough = lerp(0.8, 0.35, b);
                break;
            }
            case 'head': fur = 0.003; break;
            case 'crest': {
                // red with gold bars and a dark edge
                // red at the front fading to gold, with faint darker bars and a dark rim
                const bar = smooth(0.45, 0.55, Math.sin(s.p[0] * 180) * 0.5 + 0.5);
                col = mix(gold, red, smooth(-0.01, 0.03, s.p[0] - H.at(0.4)[0]));
                col = mix(col, mix(col, dusk, 0.5), bar * 0.35);
                fur = 0;
                rough = 0.45;
                break;
            }
            case 'wingbone': col = mix(dusk, grey, 0.2); fur = 0; break;
            case 'arm': case 'thigh': fur = 0.005; break;
            case 'hand': case 'foot': case 'shin':
                col = mix(dusk, grey, 0.35);
                fur = s.tag === 'shin' ? 0.004 * smooth(0.8, 0.2, s.u) : 0;
                scale = 0.0008;
                rough = 0.7;
                break;
            case 'neck': fur = 0.007; break;
            default: break;
        }
        return { col, fur, tip: mix(col, [1, 1, 1], 0.15), scale, rough };
    };

    // the folded wing membrane hangs between the folded finger and the flank
    [rig.armR, rig.armL].forEach((arm, i) => {
        const s = i === 0 ? 1 : -1;
        const leg = s > 0 ? rig.legR : rig.legL;
        const trailing = [add(arm.elbow, [-0.004, -0.006, 0]), add(arm.sh, [-0.025, -0.012, 0.012 * s]), add(leg.hip, [0.0, 0.004, 0.016 * s])];
        S.extra({ type: 'mesh', object: membrane(arm.wf.slice(1), trailing, { col: '#5d4b3e', col2: '#2e2520', sag: 0.006, sagDir: [0, -0.6, s * 0.5], rays: 40 }) });
    });

    return {
        sculpt: S, paint, rig, res: 240,
        details: [{ sculpt: crest, res: 140 }],
        fur: { shells: 16, density: 1400, thickness: 1.2, clump: 0.5, lift: 0.55, tuft: 0.5 },
        skin: { bump: 0.25 },
        eye: { iris: '#3a2410', ring: '#120a06', pupil: 0.5, irisSize: 0.75 },
        claw: '#2a2420',
        length: 0.5
    };
}
