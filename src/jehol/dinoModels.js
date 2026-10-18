// The Jehol dinosaurs in the game: low-poly bodies built like Big Al's and Spino's (lofted,
// flat-shaded, with banded stripes), carrying the sculpted feathered tails of the lab models.
// The smaller animals (birds, pterosaurs, mammals, reptiles, fish) stay fully sculpted.
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildBiped, buildQuadruped } from '../three/creatures3d.js';
import { sculptTail } from './gameModels.js';
import { dress } from './dinoDress.js';

// Yutyrannus from hatchling (t = 0) to adult (t = 1). The young are gold, flecked with black;
// grown ones are white with a gold mantle, black bands down the flanks and a red crest.
const yutyrannus = (t, name) => {
    const lerp = (a, b) => a + (b - a) * t;
    const adult = t > 0.5;
    const colors = adult
        ? { body: '#ece6d8', belly: '#f7f3ea', back: '#d4a03a', stripe: '#1e1a18', neck: '#2a2a2e', throat: '#ece6d8', head: '#2a2a2e', headTop: '#1e1e22', mouth: '#a83a2c', jaw: '#3a3a3e', shin: '#26262a', arm: '#2a2a2e', eye: '#e0a830', claw: '#2a2522' }
        : { body: '#c68a2a', belly: '#f0e2c0', back: '#8a5a1a', stripe: '#1e1712', neck: '#c68a2a', throat: '#f0e2c0', head: '#b07a24', headTop: '#1e1712', mouth: '#a83a2c', jaw: '#e8d4a8', shin: '#3a2a1e', arm: '#b07a24', eye: '#e0a830', claw: '#2a2522' };
    return {
        name,
        hipH: lerp(0.3, 0.29), bodyLen: lerp(0.22, 0.3), bodyR: lerp(0.07, 0.085), bodyH: lerp(0.08, 0.1), chestDepth: lerp(1, 1.15), chestDrop: lerp(0.01, -0.005),
        neckLen: lerp(0.09, 0.12), neckR: lerp(0.042, 0.05), neckUp: lerp(0.8, 0.6), neckS: lerp(0.3, 0.45),
        headLen: lerp(0.2, 0.21), headH: lerp(0.1, 0.09), headW: lerp(0.07, 0.058), skull: [1.05, lerp(0.8, 0.85), lerp(0.5, 0.58)], skullWidth: [1, 0.72], snout: lerp(0.55, 0.62),
        eyeScale: lerp(1.6, 1.05), teethSize: lerp(0.5, 0.8),
        crest: { h: lerp(0.006, 0.022), color: adult ? '#c8261e' : '#8a3a22' }, nasalBumps: adult ? '#a8261e' : null,
        tailLen: lerp(0.42, 0.5), tailR: 0.062, thighR: lerp(0.058, 0.066), armLen: lerp(0.07, 0.075), armR: 0.016, crouch: lerp(0.02, 0.04),
        fluff: lerp(0.55, 0.45), mane: { h: lerp(0.025, 0.045), color: adult ? '#2a2a2e' : '#1e1712' },
        // adults banded; the young flecked and streaked instead, so they don't read as Dilong
        stripes: adult, stripeEvery: 2, spots: adult ? null : '#1e1712', spotCount: 34,
        colors
    };
};

// species -> { kind, spec, tail: [lab model, stage, options] }
const DINOS = {
    'Young Yutyrannus': { spec: yutyrannus(0.33, 'Young Yutyrannus'), coat: { len: 0.03, density: 380 }, tail: ['Yutyrannus', 'juvenile'] },
    Yutyrannus: { spec: yutyrannus(1, 'Yutyrannus'), coat: { len: 0.026, density: 340 }, tail: ['Yutyrannus', 'adult'] },

    // a little tyrannosaur: big deep head, stocky, tiger-striped, red crest
    Dilong: {
        spec: {
            name: 'Dilong', hipH: 0.29, bodyLen: 0.24, bodyR: 0.068, bodyH: 0.084, chestDepth: 1.1,
            neckLen: 0.1, neckR: 0.04, neckUp: 0.7, neckS: 0.5, headLen: 0.19, headH: 0.085, headW: 0.052, skull: [1.05, 0.85, 0.55], snout: 0.6, teethSize: 0.6,
            crest: { h: 0.016, color: '#c8331e' }, tailLen: 0.5, tailR: 0.05, thighR: 0.052, armLen: 0.075, armR: 0.013,
            fluff: 0.45, stripes: true, stripeEvery: 2,
            colors: { body: '#d58b26', belly: '#f4ecda', back: '#b4661a', stripe: '#17110d', head: '#c8781e', headTop: '#17110d', throat: '#f4ecda', jaw: '#f4ecda', shin: '#56626e', eye: '#e0b030' }
        },
        coat: { len: 0.022, density: 420 },
        tail: ['Dilong']
    },

    // long and low, with long arms and big hands; cream with black spots and a red face
    Sinocalliopteryx: {
        spec: {
            name: 'Sinocalliopteryx', hipH: 0.27, bodyLen: 0.31, bodyR: 0.052, bodyH: 0.062, chestDrop: -0.012, crouch: 0.06,
            neckLen: 0.16, neckR: 0.028, neckUp: 0.6, neckS: 0.7, headLen: 0.19, headH: 0.05, headW: 0.034, skull: [1, 0.7, 0.42], snout: 0.42, teethSize: 0.6,
            tailLen: 0.62, tailR: 0.04, thighR: 0.04, armLen: 0.17, armR: 0.013, clawScale: 1.8,
            fluff: 0.4, spots: '#1a1612', spotCount: 26,
            colors: { body: '#eee6d4', belly: '#f7f3ea', back: '#d8c8a8', head: '#b03e2c', headTop: '#1a1612', mouth: '#7a1e14', throat: '#f7f3ea', jaw: '#b03e2c', shin: '#4a403a', eye: '#e0b23a' }
        },
        coat: { len: 0.026, density: 360 },
        tail: ['Sinocalliopteryx']
    },

    // its real colours: ginger above, white below, a bandit mask, a very long ringed tail
    Sinosauropteryx: {
        spec: {
            name: 'Sinosauropteryx', hipH: 0.3, bodyLen: 0.2, bodyR: 0.048, bodyH: 0.058,
            neckLen: 0.13, neckR: 0.025, neckUp: 0.8, neckS: 0.8, headLen: 0.13, headH: 0.05, headW: 0.032, skull: [1, 0.75, 0.45], snout: 0.5, teethSize: 0.5,
            tailLen: 0.68, tailR: 0.035, thighR: 0.038, armLen: 0.045, armR: 0.009, fluff: 0.35, mask: '#1e1612',
            colors: { body: '#c8692a', belly: '#f4eee2', back: '#8e3c18', head: '#c8692a', headTop: '#8e3c18', throat: '#f4eee2', jaw: '#f4eee2', shin: '#6b5e52', eye: '#d8a030' }
        },
        coat: { len: 0.016, density: 520 },
        tail: ['Sinosauropteryx']
    },

    // a heavy raptor with big wings: a magpie, black and white with a gold head
    Zhenyuanlong: {
        spec: {
            name: 'Zhenyuanlong', hipH: 0.3, bodyLen: 0.25, bodyR: 0.066, bodyH: 0.078, chestDepth: 1.1,
            neckLen: 0.13, neckR: 0.032, neckUp: 0.8, neckS: 0.9, headLen: 0.14, headH: 0.055, headW: 0.038, skull: [1, 0.75, 0.45], snout: 0.5, teethSize: 0.6,
            tailLen: 0.5, tailR: 0.045, thighR: 0.048, armLen: 0.12, armR: 0.012, sickle: true, fluff: 0.35,
            stripes: true, stripeEvery: 4, headFeathers: '#d9a12a',
            colors: { body: '#1f1c1b', belly: '#f1ebe0', back: '#151313', stripe: '#f1ebe0', neck: '#d9a12a', throat: '#d9a12a', head: '#d9a12a', headTop: '#b07a1a', jaw: '#3f6888', shin: '#2a2624', arm: '#151313', eye: '#e8b23a' }
        },
        coat: { len: 0.016, density: 480, wing: { size: 1.6, col: '#151313', col2: '#f1ebe0', bands: 3, cover: '#d9a12a' } },
        tail: ['Zhenyuanlong']
    },

    // four-winged, with the longest tail plumes: a golden pheasant
    Changyuraptor: {
        spec: {
            name: 'Changyuraptor', hipH: 0.31, bodyLen: 0.2, bodyR: 0.05, bodyH: 0.06,
            neckLen: 0.12, neckR: 0.027, neckUp: 0.85, neckS: 0.9, headLen: 0.12, headH: 0.046, headW: 0.032, skull: [1, 0.75, 0.45], snout: 0.5, teethSize: 0.5,
            tailLen: 0.5, tailR: 0.034, thighR: 0.04, armLen: 0.17, armR: 0.011, sickle: true, fluff: 0.3,
            headFeathers: '#1c2622',
            colors: { body: '#d29a2a', belly: '#f2e2b8', back: '#a8701a', neck: '#1c2622', throat: '#d29a2a', head: '#1c2622', headTop: '#1c2622', shin: '#161616', arm: '#161616', eye: '#d8a030' }
        },
        coat: { len: 0.014, density: 520, wing: { size: 1.3, col: '#161616', col2: '#d6a232', bands: 3, cover: '#d29a2a' } },
        tail: ['Changyuraptor']
    },

    // long legs, a short tail with a fan, a small beaked head: white, black-backed, orange face
    Caudipteryx: {
        spec: {
            name: 'Caudipteryx', hipH: 0.44, bodyLen: 0.19, bodyR: 0.06, bodyH: 0.074, chestDepth: 1.1, chestDrop: 0.02,
            neckLen: 0.2, neckR: 0.028, neckUp: 1.05, neckS: 0.5, headLen: 0.09, headH: 0.05, headW: 0.034, skull: [1, 0.8, 0.45], snout: 0.45, teeth: false, beak: '#2a2420',
            tailLen: 0.2, tailR: 0.04, thighR: 0.05, armLen: 0.1, armR: 0.011, fluff: 0.35, wattle: '#d0602e',
            colors: { body: '#efe9dd', belly: '#f7f3ea', back: '#171311', neck: '#efe9dd', throat: '#f7f3ea', head: '#d0602e', headTop: '#171311', jaw: '#d0602e', shin: '#d0602e', arm: '#171311', eye: '#d0a030' }
        },
        coat: { len: 0.016, density: 480, wing: { size: 1.4, col: '#171311', col2: '#f2ece2', bands: 2, cover: '#171311' } },
        tail: ['Caudipteryx']
    },

    // a short, deep, beaked head with buck teeth: gold with black spots, a blue face
    Incisivosaurus: {
        spec: {
            name: 'Incisivosaurus', hipH: 0.33, bodyLen: 0.22, bodyR: 0.06, bodyH: 0.072,
            neckLen: 0.14, neckR: 0.031, neckUp: 0.85, neckS: 0.6, headLen: 0.1, headH: 0.07, headW: 0.046, skull: [1, 0.95, 0.85], snout: 0.75, teeth: false, beak: '#2e2824', buckTeeth: '#ece4cc',
            tailLen: 0.45, tailR: 0.045, thighR: 0.045, armLen: 0.1, armR: 0.011, fluff: 0.35, spots: '#18120e', spotCount: 18,
            colors: { body: '#d8a43a', belly: '#f4ead4', back: '#b47e22', head: '#4a6e9a', headTop: '#18120e', throat: '#f4ead4', jaw: '#4a6e9a', shin: '#6a5a48', eye: '#c58a2c' }
        },
        coat: { len: 0.018, density: 460, wing: { size: 1.2, col: '#18120e', col2: '#d8a43a', bands: 2, cover: '#18120e' } },
        tail: ['Incisivosaurus']
    },

    // pot-bellied, long-necked, small-headed, with huge hand claws: black with a white mane and face
    Beipiaosaurus: {
        spec: {
            name: 'Beipiaosaurus', hipH: 0.28, bodyLen: 0.27, bodyR: 0.1, bodyH: 0.115, chestDepth: 1.25, chestDrop: 0.04, bodyWidth: 1.1,
            neckLen: 0.22, neckR: 0.036, neckUp: 1.05, neckS: 0.4, headLen: 0.08, headH: 0.042, headW: 0.032, skull: [1, 0.8, 0.5], snout: 0.5, teeth: false, beak: '#2e2925',
            tailLen: 0.24, tailR: 0.05, thighR: 0.062, armLen: 0.19, armR: 0.017, clawScale: 3.2, fluff: 0.65,
            colors: { body: '#221d1a', belly: '#3a322c', back: '#151210', neck: '#efe8dc', throat: '#efe8dc', head: '#efe8dc', headTop: '#221d1a', jaw: '#efe8dc', shin: '#3f3833', arm: '#221d1a', claw: '#ece0c4', eye: '#6a4a20' }
        },
        coat: { len: 0.04, density: 300, neck: 1.2, quills: { len: 0.075, col: '#151210', tip: '#f2ece0' } },
        tail: ['Beipiaosaurus']
    },

    // a small, big-eyed troodontid: white, barred black
    'Mei long': {
        spec: {
            name: 'Mei long', hipH: 0.34, bodyLen: 0.2, bodyR: 0.05, bodyH: 0.06,
            neckLen: 0.13, neckR: 0.026, neckUp: 0.8, neckS: 0.8, headLen: 0.12, headH: 0.056, headW: 0.042, skull: [1.05, 0.75, 0.45], snout: 0.45, eyeScale: 1.7, teethSize: 0.4,
            tailLen: 0.5, tailR: 0.034, thighR: 0.038, armLen: 0.08, armR: 0.01, sickle: true, fluff: 0.3,
            stripes: true, stripeEvery: 2,
            colors: { body: '#ede7db', belly: '#f7f3ea', back: '#ddd4c2', stripe: '#18140f', head: '#ede7db', headTop: '#18140f', throat: '#f7f3ea', shin: '#6a6058', eye: '#e0b23a' }
        },
        coat: { len: 0.014, density: 560, wing: { size: 1.1, col: '#18140f', col2: '#ede7db', bands: 2, cover: '#18140f' } },
        tail: ['Mei long']
    },

    // deep, parrot-beaked head with cheek horns; known countershading; bristles on the tail
    Psittacosaurus: {
        spec: {
            name: 'Psittacosaurus', hipH: 0.3, bodyLen: 0.27, bodyR: 0.082, bodyH: 0.092, chestDrop: -0.02, chestDepth: 1.05,
            neckLen: 0.07, neckR: 0.045, neckUp: 0.45, headTilt: -0.1, headLen: 0.12, headH: 0.095, headW: 0.078, skull: [1, 1.05, 0.9], snout: 0.6, teeth: false, beak: '#2c2622', cheekHorns: '#3a3028',
            tailLen: 0.45, tailR: 0.06, thighR: 0.06, armLen: 0.1, armR: 0.016,
            colors: { body: '#8a7356', belly: '#e2d6bc', back: '#4f3f2e', head: '#8a7356', headTop: '#4f3f2e', throat: '#e2d6bc', jaw: '#e2d6bc', shin: '#5a4c3c', eye: '#5a3a1c' }
        },
        tail: ['Psittacosaurus']
    },

    // an iguanodont, walking partly on its hands: gold-tan, dark-backed, cream stripes, red nose
    Jinzhousaurus: {
        spec: {
            name: 'Jinzhousaurus', handsDown: true, thumbSpike: '#ece4cc', chestDrop: -0.03, hipH: 0.32, bodyLen: 0.32, bodyR: 0.1, bodyH: 0.115, chestDepth: 1.1,
            neckLen: 0.13, neckR: 0.05, neckUp: 0.45, headTilt: -0.15, headLen: 0.17, headH: 0.07, headW: 0.05, skull: [1, 0.85, 0.7], snout: 0.55,
            tailLen: 0.48, tailR: 0.075, thighR: 0.068, armLen: 0.25, armR: 0.026, teeth: false, beak: '#2a2a2a', midSnout: '#b8402a', stripes: true,
            colors: { body: '#b48c48', belly: '#efe4c8', back: '#4e3a24', stripe: '#f4ead0', head: '#b48c48', headTop: '#4e3a24', claw: '#2a2420', eye: '#e0a020' }
        }
    },

    // the titanosaur: slate with a dark back, gold bands, a rust face
    Dongbeititan: {
        kind: 'quad',
        spec: {
            name: 'Dongbeititan', gauge: 0.92, hipH: 0.32, shoulderH: 0.36, bodyLen: 0.3, bodyR: 0.13, bodyH: 0.14,
            neckSegs: 4, neckLen: 0.55, neckUp: 0.75, neckBend: -0.06, neckR0: 0.07, neckR1: 0.03, headShape: 'titan', headLen: 0.08, headH: 0.04, headW: 0.036, headPitch: -0.25,
            tailSegs: 3, tailLen: 0.5, tailR: 0.075, tailDroop: 0.18, tailCurl: 0.08, legR: 0.055, footR: 0.06, columnHands: true, stripes: true,
            colors: { body: '#77808a', belly: '#ddd6c4', back: '#353d48', stripe: '#d4a242', feet: '#3a404a', head: '#a8442c', crest: '#8a3a26', eye: '#e8c030' }
        }
    },

    // the little ankylosaur: long slender legs, a short horned head, banded plates, side spikes
    Liaoningosaurus: {
        kind: 'quad',
        spec: {
            name: 'Liaoningosaurus', gauge: 0.8, hipH: 0.27, shoulderH: 0.25, bodyLen: 0.3, bodyR: 0.12, bodyH: 0.09, arch: 0.03,
            neckSegs: 1, neckLen: 0.07, neckUp: 0.05, neckBend: 0, neckR0: 0.055, neckR1: 0.045, headShape: 'ankylo', headLen: 0.1, headH: 0.05, headW: 0.065, headPitch: -0.2,
            tailSegs: 3, tailLen: 0.42, tailR: 0.05, tailDroop: 0.06, tailCurl: 0.02, legR: 0.026, footR: 0.03,
            armour: { color: '#d8aa48', band: '#1c1712', spike: '#efe6cf', keel: '#1c1712' },
            colors: { body: '#cc9c3c', belly: '#efe2c2', back: '#b07e28', head: '#cc9c3c', headTop: '#1c1712', feet: '#6a5030', beak: '#2a221a', eye: '#d0a030' }
        }
    }
};

const PLAYER_T = [0, 0, 0.33, 0.7, 1];
const lerp = (a, b, t) => a + (b - a) * t;
const PLAYER_STAGE = ['hatchling', 'hatchling', 'juvenile', 'subadult', 'adult'];

export const isJeholDino = (species) => species.startsWith('player:') || !!DINOS[species];

const templates = new Map();

// A template like the low-poly builders return, plus a skinned-aware instantiate
export function dinoTemplate(species, ctx) {
    const key = `${species}|${ctx.mat.uuid}`;
    if (templates.has(key)) return templates.get(key);
    let def;
    if (species.startsWith('player:')) {
        const level = Number(species.slice(7)) || 1;
        const t = PLAYER_T[level] ?? 0;
        def = { spec: yutyrannus(t, 'Yutyrannus'), coat: { len: lerp(0.034, 0.026, t), density: 360 }, tail: ['Yutyrannus', PLAYER_STAGE[level] || 'hatchling'] };
    } else def = DINOS[species];
    const spec = { ...def.spec };
    if (def.coat) spec.dress = dress(def.coat);
    if (def.tail) {
        const [lab, stage, opts] = def.tail;
        spec.graftTail = sculptTail(lab, stage, opts);
    }
    const model = (def.kind === 'quad' ? buildQuadruped : buildBiped)(spec, ctx);
    model.species = species;
    model.minLen = 0.14;
    model.skinned = !!def.tail;
    templates.set(key, model);
    return model;
}

// A copy for one animal in the world: clone (re-binding the grafted tail's skeleton) and find
// its animated parts again by their place in the hierarchy
export function instantiateDino(template, creatureMat) {
    const pathOf = (obj) => {
        const p = [];
        while (obj && obj !== template.root) {
            p.unshift(obj.parent.children.indexOf(obj));
            obj = obj.parent;
        }
        return p;
    };
    const root = template.skinned ? cloneSkinned(template.root) : template.root.clone(true);
    const resolve = (obj) => (obj ? pathOf(obj).reduce((o, i) => o.children[i], root) : null);
    const P = template.parts;
    const mat = creatureMat.clone();
    root.traverse((o) => {
        if (o.isMesh && o.material === creatureMat) o.material = mat;
    });
    return {
        root, mat, gait: template.gait, flapSpeed: template.flapSpeed, minLen: template.minLen,
        inner: resolve(template.inner), body: resolve(template.body), height: template.height,
        parts: {
            legs: P.legs.map((l) => ({ ...l, pivot: resolve(l.pivot) })),
            arms: P.arms.map((a) => ({ ...a, pivot: resolve(a.pivot) })),
            wings: P.wings.map((w) => ({ ...w, pivot: resolve(w.pivot) })),
            tail: P.tail.map(resolve), neck: P.neck.map(resolve), segs: P.segs.map(resolve),
            head: resolve(P.head), jaw: resolve(P.jaw)
        }
    };
}
