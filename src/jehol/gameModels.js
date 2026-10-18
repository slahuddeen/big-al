// Game versions of the sculpted animals: coarser meshes with fewer fur shells, skinned
// to a small skeleton so the world renderer can walk, flap, swim and bite with them.
// A template matches the old low-poly model contract (root, body, parts, gait, height):
// one unit long, facing +x, feet at y = 0.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SPECIES } from './species/index.js';
import { skinMaterial, furShells, eyeMaterial, keratinMaterial, clawGeometry } from './skin.js';
import { featherMesh } from './feathers.js';

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Which lab model (and stage and pose) each game species uses
const GAME = {
    'Young Yutyrannus': { lab: 'Yutyrannus', stage: 'juvenile' },
    Yutyrannus: { lab: 'Yutyrannus', stage: 'adult' },
    Microraptor: { pose: 'fly' },
    Confuciusornis: { pose: 'fly' },
    Sinopterus: { pose: 'fly' },
    Feilongus: { pose: 'fly' },
    Dendrorhynchoides: { pose: 'fly' }
};
const PLAYER_STAGE = ['hatchling', 'hatchling', 'juvenile', 'subadult', 'adult'];

export const isSculpted = (species) => species.startsWith('player:') || !!SPECIES[GAME[species]?.lab || species];

// ---------- skeletons for each body plan ----------
// Bones are { name, pos (model space), parent }; skin(s) maps one primitive's view of a
// vertex (tag, position, chain u) to [[boneName, weight], ...]
const chainBlend = (u, names, stops) => {
    for (let i = 0; i < stops.length - 1; i++) {
        if (u <= stops[i + 1]) {
            const t = (u - stops[i]) / (stops[i + 1] - stops[i]);
            return [[names[i], 1 - t], [names[i + 1], t]];
        }
    }
    return [[names[names.length - 1], 1]];
};
const side = (p) => (p[2] >= 0 ? 'R' : 'L');
const HEAD_TAGS = new Set(['head', 'snout', 'brow', 'crest', 'beak', 'ear', 'nose', 'beakhead']);
const JAW_TAGS = new Set(['jaw', 'beakjaw']);

function skeletonFor(def) {
    const rig = def.rig;
    const plan = rig.plan;
    const bones = [];
    const add = (name, pos, parent = 'body') => bones.push({ name, pos, parent });
    let skin;
    let gait;
    const parts = { legs: [], arms: [], wings: [], tail: [], neck: [], head: null, jaw: null, segs: [] };
    const tailBones = (pts) => {
        const n = pts.length - 1;
        add('tail0', pts[0]);
        add('tail1', pts[Math.round(n * 0.35)], 'tail0');
        add('tail2', pts[Math.round(n * 0.7)], 'tail1');
        parts.tail = ['tail0', 'tail1', 'tail2'];
    };
    const tailSkin = (u) => chainBlend(u, ['tail0', 'tail1', 'tail2'], [0, 0.35, 0.7]);
    // neck chains run from the head end (u = 0) to the base (u = 1)
    const neckBones = (pts, headPos, jawPos) => {
        const n = pts.length - 1;
        add('neck0', pts[n]);
        add('neck1', pts[Math.round(n * 0.5)], 'neck0');
        add('head', headPos, 'neck1');
        if (jawPos) add('jaw', jawPos, 'head');
        parts.neck = ['neck0', 'neck1'];
        parts.head = 'head';
        parts.jaw = jawPos ? 'jaw' : null;
    };
    const neckSkin = (u) => chainBlend(1 - u, ['neck0', 'neck1', 'head'], [0, 0.5, 1]);

    if (plan === 'biped') {
        add('body', rig.hipC, null);
        tailBones(rig.tail);
        neckBones(rig.neck, rig.head.occ, rig.head.at(0.02, -0.3));
        ['R', 'L'].forEach((sd) => {
            add(`leg${sd}`, rig[`leg${sd}`].hip);
            add(`arm${sd}`, rig[`arm${sd}`].sh);
        });
        const fly = rig.q.pose === 'fly';
        gait = fly ? 'fly' : 'biped';
        if (fly) parts.wings = [{ pivot: 'armR', side: 1 }, { pivot: 'armL', side: -1 }];
        else {
            parts.legs = [{ pivot: 'legR', phase: 0, side: 1 }, { pivot: 'legL', phase: Math.PI, side: -1 }];
            parts.arms = [{ pivot: 'armR', side: 1 }, { pivot: 'armL', side: -1 }];
        }
        skin = (s) => {
            if (['thigh', 'shin', 'foot', 'toe'].includes(s.tag)) return [[`leg${side(s.p)}`, 1]];
            if (['arm', 'hand'].includes(s.tag)) return [[`arm${side(s.p)}`, 1]];
            if (s.tag === 'tail') return tailSkin(s.u);
            if (s.tag === 'neck') return neckSkin(s.u);
            if (HEAD_TAGS.has(s.tag)) return [['head', 1]];
            if (JAW_TAGS.has(s.tag)) return [['jaw', 1]];
            return [['body', 1]];
        };
    } else if (plan === 'quadruped' || plan === 'pterosaur' || plan === 'mammal' || plan === 'sprawler' || plan === 'turtle') {
        const hip = plan === 'sprawler' ? rig.hip : rig.hip || rig.shell;
        const sh = rig.sh || rig.shell;
        add('body', lerp3(hip, sh, 0.5), null);
        const mid = (hip[0] + sh[0]) / 2;
        let hind, fore;
        if (plan === 'turtle') {
            const c = rig.shell, q = rig.q;
            hind = { R: [c[0] - q.shell * 0.3, c[1] - q.shellH * 0.3, q.shellW * 0.36], L: [c[0] - q.shell * 0.3, c[1] - q.shellH * 0.3, -q.shellW * 0.36] };
            fore = { R: [c[0] + q.shell * 0.3, c[1] - q.shellH * 0.3, q.shellW * 0.36], L: [c[0] + q.shell * 0.3, c[1] - q.shellH * 0.3, -q.shellW * 0.36] };
            add('neck0', rig.neckBase);
            add('head', rig.neckTop, 'neck0');
            parts.neck = ['neck0'];
            parts.head = 'head';
        } else {
            const top = (leg) => leg.hip || leg.top || leg.sh;
            hind = { R: top(rig.legR), L: top(rig.legL) };
            fore = { R: rig.armR.sh || rig.armR.top, L: rig.armL.sh || rig.armL.top };
            if (rig.tail) tailBones(rig.tail);
            if (rig.neck) neckBones(rig.neck, rig.head.at(0, 0), rig.head.at(0.02, -0.3));
            else if (rig.neckBase) {
                add('neck0', rig.neckBase);
                add('head', rig.head.at(0, 0), 'neck0');
                add('jaw', rig.head.at(0.02, -0.3), 'head');
                parts.neck = ['neck0'];
                parts.head = 'head';
                parts.jaw = 'jaw';
            }
        }
        ['R', 'L'].forEach((sd) => {
            add(`leg${sd}`, hind[sd]);
            add(`arm${sd}`, fore[sd]);
        });
        const fly = plan === 'pterosaur' && rig.fly;
        gait = fly ? 'fly' : plan === 'sprawler' || plan === 'turtle' ? 'sprawl' : 'quad';
        if (fly) parts.wings = [{ pivot: 'armR', side: 1 }, { pivot: 'armL', side: -1 }];
        else {
            parts.legs = [
                { pivot: 'legR', phase: 0, side: 1 }, { pivot: 'legL', phase: Math.PI, side: -1 },
                { pivot: 'armR', phase: Math.PI, side: 1 }, { pivot: 'armL', phase: 0, side: -1 }
            ];
        }
        const front = (p) => p[0] > mid;
        skin = (s) => {
            const sd = side(s.p);
            switch (s.tag) {
                case 'thigh': case 'shin': return [[`leg${sd}`, 1]];
                case 'arm': case 'hand': case 'wingbone': return [[`arm${sd}`, 1]];
                case 'foot': case 'toe': case 'paw': case 'limb': return [[`${front(s.p) ? 'arm' : 'leg'}${sd}`, 1]];
                case 'tail': return rig.tail ? tailSkin(s.u) : [['body', 1]];
                case 'neck': return rig.neck ? neckSkin(s.u) : [['neck0', 1]];
                default:
                    if (HEAD_TAGS.has(s.tag)) return [['head', 1]];
                    if (JAW_TAGS.has(s.tag)) return [[parts.jaw ? 'jaw' : 'head', 1]];
                    return [['body', 1]];
            }
        };
    } else if (plan === 'fish') {
        const P = rig.pts;
        add('body', P[2], null);
        add('tail0', P[4]);
        add('tail1', P[6], 'tail0');
        add('tail2', P[8], 'tail1');
        parts.tail = ['tail0', 'tail1', 'tail2'];
        gait = 'swim';
        skin = (s) => (s.tag === 'body' ? chainBlend(s.u, ['body', 'tail0', 'tail1', 'tail2'], [0.25, 0.5, 0.75, 1]) : [['body', 1]]);
    }
    return { bones, skin, gait, parts };
}

// ---------- template ----------
const eyeGeo = new THREE.SphereGeometry(1, 16, 12);
const clawCache = new Map();
const clawGeo = (curve, ratio) => {
    const key = `${Math.round(curve * 10)}:${Math.round(ratio * 20)}`;
    if (!clawCache.has(key)) clawCache.set(key, clawGeometry({ length: 1, radius: Math.max(1, Math.round(ratio * 20)) / 20, curve: Math.round(curve * 10) / 10, flat: 0.62, segments: 5, radial: 6 }));
    return clawCache.get(key);
};
const basis = (dir, up) => {
    const x = new THREE.Vector3(...dir).normalize();
    const u = new THREE.Vector3(...(up || [0, 1, 0]));
    u.addScaledVector(x, -u.dot(x));
    if (u.lengthSq() < 1e-6) u.set(0, 0, 1);
    u.normalize();
    return new THREE.Matrix4().makeBasis(x, u, new THREE.Vector3().crossVectors(x, u));
};

const templates = new Map();
export const QUALITY = { mobile: false };

export function gameTemplate(species) {
    if (templates.has(species)) return templates.get(species);
    let labName, stage, pose;
    if (species.startsWith('player:')) {
        labName = 'Yutyrannus';
        stage = PLAYER_STAGE[Number(species.slice(7))] || 'hatchling';
    } else {
        const g = GAME[species] || {};
        labName = g.lab || species;
        stage = g.stage;
        pose = g.pose;
    }
    const sp = SPECIES[labName];
    const def = sp.build(stage, { pose });
    const t = buildTemplate(def, { species, player: species.startsWith('player:') });
    templates.set(species, t);
    return t;
}

function buildTemplate(def, { species, player }) {
    const realLen = def.length || 1;
    const mobile = QUALITY.mobile;
    // coarser meshes and fewer shells for small animals and phones
    const res = Math.round((player ? 110 : realLen < 0.5 ? 60 : realLen < 3 ? 76 : 92) * (mobile ? 0.8 : 1));
    const shells = Math.max(3, (player ? 10 : realLen < 0.5 ? 5 : 7) - (mobile ? 2 : 0));
    const sk = skeletonFor(def);
    const boneIndex = new Map(sk.bones.map((b, i) => [b.name, i]));
    const skin = (s) => sk.skin(s).map(([name, w]) => [boneIndex.get(name) ?? 0, w]);
    const geo = def.sculpt.mesh({ res, paint: def.paint, skin });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const len = bb.max.x - bb.min.x;
    const k = 1 / len;

    // bones
    const boneObjs = sk.bones.map((b) => {
        const bone = new THREE.Bone();
        bone.name = `b_${b.name}`;
        return bone;
    });
    sk.bones.forEach((b, i) => {
        const parent = b.parent ? sk.bones.find((o) => o.name === b.parent) : null;
        const pp = parent ? parent.pos : [0, 0, 0];
        boneObjs[i].position.set(b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]);
        if (parent) boneObjs[sk.bones.indexOf(parent)].add(boneObjs[i]);
    });
    const rootBone = boneObjs[0];

    // root (world placement) > motion (the animator bobs and pitches this, in model
    // units) > inner (scaled from metres to one unit long) > bones and meshes
    const root = new THREE.Group();
    const motion = new THREE.Group();
    motion.name = 'motion';
    const inner = new THREE.Group();
    inner.name = 'inner';
    inner.scale.setScalar(k);
    inner.position.set(-(bb.min.x + bb.max.x) * 0.5 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) * 0.5 * k);
    root.add(motion);
    motion.add(inner);
    inner.add(rootBone);
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(boneObjs);

    const bodyMat = skinMaterial(def.skin);
    bodyMat.emissive = new THREE.Color(0, 0, 0);
    const body = new THREE.SkinnedMesh(geo, bodyMat);
    body.name = 'sculpt_body';
    body.castShadow = true;
    body.receiveShadow = true;
    inner.add(body);
    body.bind(skeleton);
    if (def.fur) {
        const fur = furShells(geo, { ...def.fur, shells, density: (def.fur.density || 300) * 0.5, thickness: (def.fur.thickness || 1) * 1.15 });
        fur.children.slice().forEach((m) => {
            // shells do not write depth, so the ink outline follows the body and not every strand
            m.material.depthWrite = false;
            const sm = new THREE.SkinnedMesh(geo, m.material);
            sm.castShadow = false;
            sm.receiveShadow = true;
            sm.userData.shell = m.userData.shell;
            sm.renderOrder = m.renderOrder;
            inner.add(sm);
            sm.bind(skeleton);
        });
    }
    // fine parts meshed on their own grid ride on the head (crests) or body (armour)
    for (const part of def.details || []) {
        const dg = part.sculpt.mesh({ res: Math.round((part.res || 100) * 0.6), paint: part.paint || def.paint });
        dg.computeBoundingBox();
        const c = dg.boundingBox.getCenter(new THREE.Vector3()).toArray();
        const bone = nearestBone(sk, c, ['head', 'body']);
        attach(boneObjs, sk, bone, new THREE.Mesh(dg, bodyMat), [0, 0, 0]);
    }

    // eyes, claws, feathers and membranes ride on their bones
    const eyeMat = eyeMaterial(def.eye);
    const clawMat = keratinMaterial(def.claw || '#2c2722', 0.4);
    clawMat.side = THREE.DoubleSide;
    const tagBone = (tag, p) => {
        const w = sk.skin({ tag, p, u: 0.5 });
        return w.sort((a, b) => b[1] - a[1])[0][0];
    };
    const feathersByBone = new Map();
    const clawsByBone = new Map();
    for (const x of def.sculpt.extras) {
        if (x.type === 'eye') {
            const m = new THREE.Mesh(eyeGeo, eyeMat);
            m.scale.setScalar(x.r);
            m.quaternion.setFromRotationMatrix(basis(x.dir, [0, 1, 0]));
            attach(boneObjs, sk, boneIndex.has('head') ? 'head' : 'body', m, x.at);
        } else if (x.type === 'claw') {
            // claws (and spikes and teeth) are merged into one mesh per bone and colour
            const b = x.tag ? tagBone(x.tag, x.at) : nearestBone(sk, x.at);
            const key = `${b}|${x.color || ''}`;
            if (!clawsByBone.has(key)) clawsByBone.set(key, { bone: b, color: x.color, geos: [] });
            const bp = sk.bones.find((o) => o.name === b).pos;
            const g = clawGeo(x.curve ?? 0.8, x.radius / x.length).clone();
            const m4 = basis(x.dir, x.up).scale(new THREE.Vector3(x.length, x.length, x.length)).setPosition(x.at[0] - bp[0], x.at[1] - bp[1], x.at[2] - bp[2]);
            g.applyMatrix4(m4);
            clawsByBone.get(key).geos.push(g);
        } else if (x.type === 'feathers') {
            for (const f of x.list) {
                let b;
                if (f.tag === 'arm') b = boneIndex.has(`arm${side(f.at)}`) ? `arm${side(f.at)}` : 'body';
                else if (f.tag === 'leg') b = `leg${side(f.at)}`;
                else if (f.tag === 'tail') b = nearestBone(sk, f.at, ['tail0', 'tail1', 'tail2']);
                else b = nearestBone(sk, f.at, ['body', 'neck0', 'neck1', 'head', 'tail0', 'tail1', 'tail2']);
                const key = `${b}|${JSON.stringify(x.style || {})}`;
                if (!feathersByBone.has(key)) feathersByBone.set(key, { bone: b, style: x.style || {}, list: [] });
                feathersByBone.get(key).list.push(f);
            }
        } else if (x.type === 'mesh') {
            const b = x.bone && boneIndex.has(x.bone) ? x.bone : 'body';
            attach(boneObjs, sk, b, x.object, [0, 0, 0]);
        }
    }
    for (const { bone, color, geos } of clawsByBone.values()) {
        const m = new THREE.Mesh(mergeGeometries(geos), color ? keratinMaterial(color, 0.4) : clawMat);
        m.material.side = THREE.DoubleSide;
        m.castShadow = true;
        boneObjs[boneIndex.get(bone)].add(m);
    }
    for (const { bone, style, list } of feathersByBone.values()) {
        const bp = sk.bones.find((o) => o.name === bone).pos;
        const local = list.map((f) => ({ ...f, at: [f.at[0] - bp[0], f.at[1] - bp[1], f.at[2] - bp[2]] }));
        const fm = featherMesh(local, style);
        fm.castShadow = false;
        boneObjs[boneIndex.get(bone)].add(fm);
    }

    const height = (bb.max.y - bb.min.y) * k;
    const flapSpeed = sk.gait === 'fly' ? (realLen < 0.6 ? 11 : 5) : undefined;
    const t = {
        sculpted: true, species, root, inner, gait: sk.gait, height, minLen: 0.14, flapSpeed,
        parts: sk.parts, bodyMat
    };
    t.instantiate = () => ({ ...instantiate(root, sk, bodyMat), height, flapSpeed, minLen: 0.14 });
    return t;
}

// Put an object (positioned in model space at `at`) onto a bone
function attach(boneObjs, sk, boneName, obj, at) {
    const i = sk.bones.findIndex((b) => b.name === boneName);
    const bp = sk.bones[Math.max(0, i)].pos;
    if (obj.geometry && at[0] === 0 && at[1] === 0 && at[2] === 0 && !obj.userData.placed) {
        // geometry already in model space: move it into the bone's frame
        obj.geometry = obj.geometry.clone();
        obj.geometry.translate(-bp[0], -bp[1], -bp[2]);
        obj.userData.placed = true;
    } else {
        obj.position.set(at[0] - bp[0], at[1] - bp[1], at[2] - bp[2]);
    }
    obj.castShadow = obj.castShadow ?? true;
    boneObjs[Math.max(0, i)].add(obj);
}

function nearestBone(sk, p, among) {
    let best = sk.bones[0].name, bd = Infinity;
    for (const b of sk.bones) {
        if (among && !among.includes(b.name)) continue;
        const d = dist(b.pos, p);
        if (d < bd) { bd = d; best = b.name; }
    }
    return best;
}

// A copy for one animal in the world, with its own bones and its own body material
// (so it can flash when hurt)
function instantiate(templateRoot, sk, bodyMat) {
    const root = cloneSkinned(templateRoot);
    const mat = bodyMat.clone();
    mat.onBeforeCompile = bodyMat.onBeforeCompile;
    mat.customProgramCacheKey = bodyMat.customProgramCacheKey;
    root.traverse((o) => {
        if (o.name === 'sculpt_body') o.material = mat;
    });
    const motion = root.getObjectByName('motion');
    const inner = root.getObjectByName('inner');
    const bone = (name) => (name ? root.getObjectByName(`b_${name}`) : null);
    const P = sk.parts;
    return {
        root, mat, inner, body: motion, gait: sk.gait, sculpted: true,
        parts: {
            legs: P.legs.map((l) => ({ ...l, pivot: bone(l.pivot) })),
            arms: P.arms.map((a) => ({ ...a, pivot: bone(a.pivot) })),
            wings: P.wings.map((w) => ({ ...w, pivot: bone(w.pivot) })),
            tail: P.tail.map(bone), neck: P.neck.map(bone), segs: [],
            head: bone(P.head), jaw: bone(P.jaw)
        }
    };
}
