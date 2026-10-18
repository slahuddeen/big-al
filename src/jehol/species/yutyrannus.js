// Yutyrannus huali, "beautiful feathered tyrant": an early tyrannosaur relative about 9 m
// long, covered in filaments up to 20 cm long, with a crest along its snout and three
// fingers. The colours are invented (no pigment is known): adults are white like a
// red-crowned crane, with a charcoal neck and face, a gold mantle, black slashes down the
// flanks, a ringed tail and a red crest; the young are gold, streaked black for cover.
import { Sculpt } from '../sculpt.js';
import { biped, add, mul, lerp } from '../anatomy.js';
import { C, mix, smooth, fbm, clamp01, slashes, stripes } from '../paint.js';

export const STAGES = [
    { id: 'hatchling', name: 'Hatchling', length: 0.6, g: 0 },
    { id: 'juvenile', name: 'Juvenile', length: 2.6, g: 0.38 },
    { id: 'subadult', name: 'Subadult', length: 5.6, g: 0.72 },
    { id: 'adult', name: 'Adult', length: 9, g: 1 }
];

// body proportions as fractions of total length: hatchling, adult
const P0 = {
    femur: 0.11, tibia: 0.125, meta: 0.078, hipW: 0.024, thighR: 0.042, kneeR: 0.017, shinR: 0.016, ankleR: 0.0095, metaR: 0.0095,
    toeLen: 0.062, toeR: 0.0085, toeClaw: 0.01, torso: 0.19, hipR: 0.046, bellyR: 0.062, chestR: 0.054, bellyDrop: 0.004, chestRise: 0.016,
    neck: 0.085, neckR: 0.032, headNeckR: 0.03, head: 0.175, headH: 0.098, headW: 0.085, eyeR: 0.021, tail: 0.38, tailR: 0.04,
    humerus: 0.05, forearm: 0.038, hand: 0.042, armR: 0.0095, fingerR: 0.0045, handClaw: 0.013
};
const P1 = {
    femur: 0.104, tibia: 0.098, meta: 0.06, hipW: 0.024, thighR: 0.046, kneeR: 0.02, shinR: 0.018, ankleR: 0.011, metaR: 0.011,
    toeLen: 0.05, toeR: 0.0072, toeClaw: 0.011, torso: 0.195, hipR: 0.044, bellyR: 0.058, chestR: 0.053, bellyDrop: 0.016, chestRise: 0.014,
    neck: 0.105, neckR: 0.027, headNeckR: 0.019, head: 0.1, headH: 0.046, headW: 0.033, eyeR: 0.0045, tail: 0.47, tailR: 0.042,
    humerus: 0.04, forearm: 0.03, hand: 0.034, armR: 0.0082, fingerR: 0.0032, handClaw: 0.011
};

export function build(stageId = 'adult') {
    const st = STAGES.find((s) => s.id === stageId) || STAGES[3];
    const L = st.length;
    const g = st.g;
    const q = {};
    for (const k of Object.keys(P0)) q[k] = lerp(P0[k], P1[k], g) * L;
    Object.assign(q, {
        legAng: [lerp(0.5, 0.4, g), lerp(-0.72, -0.6, g), lerp(0.36, 0.3, g)],
        neckRise: lerp(0.95, 0.72, g), neckS: lerp(0.3, 0.6, g),
        snoutTip: lerp(0.85, 0.55, g), snoutSquash: lerp(0.8, 0.7, g), headTilt: lerp(-0.25, -0.12, g),
        eyeAt: lerp(0.3, 0.24, g), eyeUp: lerp(0.18, 0.17, g), brow: lerp(0.3, 1.1, g), jaw: lerp(0.45, 0.55, g),
        bodySquash: 0.68, tailDroop: lerp(0.05, 0.09, g), tailSquash: 0.7, fingers: 3, armSpread: 0.2, armDrop: 0.75
    });
    const S = new Sculpt();
    const rig = biped(S, q);

    // the nasal crest: a low, rugose ridge from behind the nostrils back over the eyes,
    // meshed on its own finer grid
    const crestS = new Sculpt();
    const crestH = q.headH * lerp(0.03, 0.13, g);
    const crestW = q.headW * lerp(0.06, 0.1, g);
    const fs = [0.84, 0.74, 0.62, 0.5, 0.38, 0.3];
    const pts = fs.map((f, i) => {
        const bump = i === 0 || i === fs.length - 1 ? 0.35 : 1 - Math.abs(i - 2) * 0.12;
        return add(rig.skullTop(f), mul(rig.head.up, crestH * (bump - 0.55)));
    });
    pts.forEach((p, i) => {
        if (i === 0) return;
        crestS.cone(pts[i - 1], p, crestH * 0.6, crestH * 0.6, { tag: 'crest', squash: [crestW / (crestH * 0.6), 1], k: crestH * 0.4, flow: mul(rig.head.dir, -1) });
    });
    // knobbly texture along its top edge
    fs.forEach((f, i) => {
        if (i % 2) crestS.ellipsoid(add(pts[i], mul(rig.head.up, crestH * 0.45)), [crestH * 0.4, crestH * 0.3, crestW * 0.9], { dir: rig.head.dir, tag: 'crest', k: crestH * 0.3 });
    });

    // colours by stage
    const adult = smooth(0.55, 0.95, g);
    const white = C('#ece6d8'), cream = C('#d9cdb4'), charcoal = C('#26262a'), ash = C('#6c6a6a');
    const tawny = C('#c68a2a'), umber = C('#1e1712'), buff = C('#f0e2c0'), gold = C('#d4a03a');
    const red = C('#c1261f'), skinDark = C('#3d3a37'), skinLight = C('#9c9081'), beak = C('#4a403a');
    const hipY = rig.hipY;
    const furLen = L * lerp(0.032, 0.017, g);

    const paint = (s) => {
        const [x, y, z] = s.p;
        const up = s.n[1];
        const mott = fbm(x * 3 / L * 9, y * 3 / L * 9, z * 3 / L * 9);
        // the young: gold with black streaks running along the body, pale underneath
        const streak = smooth(0.54, 0.62, fbm(x / L * 6, y / L * 45, z / L * 45)) * smooth(-0.4, 0.2, up);
        let young = mix(tawny, mix(tawny, umber, 0.25), smooth(0.2, 0.9, up) * 0.7 + mott * 0.2);
        young = mix(young, umber, streak * 0.85);
        young = mix(young, buff, smooth(0.0, -0.6, up) * 0.85);
        // adults: white body, a gold mantle over the shoulders, black slashes down the flanks
        let grown = mix(white, cream, mott * 0.4);
        grown = mix(grown, gold, smooth(-0.25, 0.45, up) * smooth(-L * 0.04, L * 0.12, x) * 0.9);
        grown = mix(grown, ash, smooth(0.6, 0.95, up) * 0.15 * smooth(-L * 0.3, L * 0.1, x));
        const flank = ['body', 'thigh'].includes(s.tag) || (s.tag === 'tail' && s.u < 0.35);
        if (flank) grown = mix(grown, charcoal, slashes(x, y, z, 22 / L, 0.4, 0.3) * smooth(-0.55, -0.1, up) * smooth(0.92, 0.55, up));
        let col = mix(young, grown, adult);
        let fur = furLen;
        let scale = 0, rough = 0.85;
        const neckDark = s.tag === 'neck' ? smooth(0.75, 0.15, s.u) : 0;
        switch (s.tag) {
            case 'neck':
                col = mix(col, charcoal, neckDark * adult);
                fur *= 1.15;
                break;
            case 'head':
                col = mix(col, charcoal, adult);
                fur *= 0.35;
                break;
            case 'brow':
            case 'snout':
            case 'jaw': {
                // the face is scaly; the young have a darker mask
                const skin = mix(skinDark, mix(umber, skinLight, 0.3), (1 - adult) * 0.5);
                col = mix(skin, charcoal, adult * 0.6);
                const back = s.tag === 'jaw' ? 0 : smooth(0.22, 0.0, s.u);
                fur *= back * 0.35;
                scale = L * lerp(0.0045, 0.0011, g);
                rough = 0.6;
                // pale lips
                if (s.tag === 'jaw') col = mix(col, skinLight, 0.35);
                break;
            }
            case 'crest':
                col = mix(mix(skinDark, C('#7a3a2a'), 0.5), red, adult * 0.9 + 0.1);
                fur = 0;
                scale = L * 0.0012;
                rough = 0.5;
                break;
            case 'thigh':
                fur *= 0.95;
                break;
            case 'shin':
                fur *= smooth(0.85, 0.2, s.u);
                col = mix(col, mix(skinDark, charcoal, adult), smooth(0.4, 0.95, s.u) * adult);
                scale = L * 0.0016;
                break;
            case 'foot':
            case 'toe':
                col = mix(mix(skinDark, C('#6a5f52'), clamp01(-up)), charcoal, adult * 0.5);
                fur = 0;
                scale = L * lerp(0.003, 0.0012, g);
                rough = 0.7;
                break;
            case 'arm':
                fur *= 0.8;
                col = mix(col, charcoal, adult * smooth(0.3, 1, s.u) * 0.7);
                break;
            case 'hand':
                col = mix(skinDark, charcoal, adult);
                fur *= 0.15;
                scale = L * 0.0014;
                break;
            case 'tail': {
                fur *= lerp(1.1, 0.75, s.u);
                // young: black bands down the tail; adult: black rings towards a black tip
                const band = stripes(s.u, 9, 0.35, 0.06) * (1 - adult) * smooth(0.2, 0.4, s.u);
                col = mix(col, umber, band * 0.85);
                col = mix(col, charcoal, Math.max(stripes(s.u, 8, 0.4, 0.05) * smooth(0.45, 0.55, s.u), smooth(0.85, 0.95, s.u)) * adult);
                break;
            }
            default:
                break;
        }
        // belly fur is shorter
        if (s.tag === 'body' && up < -0.4 && y < hipY) fur *= 0.7;
        return { col, fur, tip: mix(col, [1, 1, 1], 0.08), scale, rough };
    };

    return {
        sculpt: S, paint, rig, res: 300,
        details: [{ sculpt: crestS, res: 90 }],
        fur: { shells: 24, density: 700 / L, thickness: 1.3, clump: 0.6, curl: 0.1, lift: lerp(0.6, 0.32, g), tuft: 0.6 },
        skin: { bump: 0.35 },
        eye: { iris: '#c08a24', ring: '#4a2a10', pupil: 0.38, irisSize: 0.66 },
        claw: '#2a2522',
        length: L
    };
}
