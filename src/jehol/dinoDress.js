// Fur and feathers for the low-poly Jehol dinosaurs: a smooth coat over the lofted torso,
// neck and thighs carrying filament shells in the body's own colours and stripes, vaned
// wing feathers along the arms, and quills where a species had them.
import * as THREE from 'three';
import { MeshBuilder, loft } from '../three/lowpoly.js';
import { furShells } from './skin.js';
import { featherMesh } from './feathers.js';
import { foldedWing, ridgeQuills } from './plumage.js';
import { QUALITY } from './gameModels.js';

const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// The lofted surface again, without the facet jitter, with smoothed normals and the
// attributes the shell shader reads: fur length, the direction the fur lies, its tip colour
function coat(sections, opts, { len, comb, tip = 1.15, grow = 1.02 }) {
    const mb = new MeshBuilder();
    const secs = sections.map((s) => ({ ...s, rw: (s.rw ?? s.r) * grow, rh: (s.rh ?? s.r) * grow, r: undefined }));
    loft(mb, secs, { ...opts, jitter: 0, capStart: false, capEnd: false });
    const geo = mb.build();
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const col = geo.attributes.color;
    const n = pos.count;
    // average the face normals of every corner that shares a position
    const sums = new Map();
    const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    for (let i = 0; i < n; i++) {
        const k = key(i);
        const v = sums.get(k) || [0, 0, 0];
        v[0] += nor.getX(i); v[1] += nor.getY(i); v[2] += nor.getZ(i);
        sums.set(k, v);
    }
    const fur = new Float32Array(n);
    const combA = new Float32Array(n * 3);
    const tipA = new Float32Array(n * 3);
    const c = new THREE.Vector3(...comb).normalize();
    for (let i = 0; i < n; i++) {
        const v = sums.get(key(i));
        const nv = new THREE.Vector3(v[0], v[1], v[2]).normalize();
        nor.setXYZ(i, nv.x, nv.y, nv.z);
        // shorter on the belly
        fur[i] = len * (0.5 + 0.5 * smooth(-0.7, 0.2, nv.y));
        const cb = c.clone().addScaledVector(nv, -c.dot(nv)).normalize();
        combA.set([cb.x, cb.y, cb.z], i * 3);
        tipA.set([Math.min(1, col.getX(i) * tip), Math.min(1, col.getY(i) * tip), Math.min(1, col.getZ(i) * tip)], i * 3);
    }
    geo.setAttribute('aFur', new THREE.BufferAttribute(fur, 1));
    geo.setAttribute('aComb', new THREE.BufferAttribute(combA, 3));
    geo.setAttribute('aTip', new THREE.BufferAttribute(tipA, 3));
    return geo;
}

const addFur = (group, geo, f, shells) => {
    const g = furShells(geo, { shells, density: f.density ?? 420, thickness: f.thick ?? 1.2, lift: f.lift ?? 0.55, tuft: f.tuft ?? 0.6, clump: 0.5, curl: f.curl ?? 0.05, shade: 0.45 });
    g.children.forEach((m) => {
        // shells do not write depth, so the ink outline follows the body and not every strand
        m.material.depthWrite = false;
        m.castShadow = false;
    });
    group.add(g);
};

// f: { len, density, wing: { size, col, col2, bands, cover }, quills: { len, col, tip } }
export const dress = (f) => (info) => {
    const shells = QUALITY.mobile ? 3 : 5;
    if (f.len) {
        const { torso, neck, legs } = info;
        const len = f.len * 1.4;
        addFur(torso.group, coat(torso.sections, torso.opts, { len, comb: [-1, -0.25, 0] }), f, shells);
        addFur(neck.group, coat(neck.sections, neck.opts, { len: len * (f.neck ?? 1.15), comb: [-1, -0.3, 0] }), f, Math.max(3, shells - 1));
        for (const leg of legs) addFur(leg.group, coat(leg.sections, leg.opts, { len: len * 0.8, comb: [-0.3, -1, 0] }), f, Math.max(2, shells - 2));
    }
    if (f.wing) {
        for (const a of info.arms) {
            const d = [a.hand[0] - a.elbow[0], a.hand[1] - a.elbow[1], a.hand[2] - a.elbow[2]];
            const arm = { sgn: a.side, elbow: a.elbow, wrist: a.hand, handTip: [a.hand[0] + d[0] * 0.6, a.hand[1] + d[1] * 0.6, a.hand[2] + d[2] * 0.6] };
            const list = foldedWing(arm, {
                primary: a.A * f.wing.size * 1.6, primaries: 8, secondaries: 6, col: f.wing.col, col2: f.wing.col2 ?? f.wing.col,
                bands: f.wing.bands ?? 0, coverCol: f.wing.cover ?? f.wing.col, tipCol: f.wing.tip
            });
            const m = featherMesh(list, f.wing.style || {});
            m.castShadow = false;
            a.group.add(m);
        }
    }
    if (f.quills) {
        // long, broad, unbranched quills standing up through the fuzz along the neck and back
        const q = f.quills;
        const { torso, neck } = info;
        const neckPts = neck.sections.map((s) => s.p).reverse();
        const neckR = neck.sections.map((s) => s.rh ?? s.r).reverse();
        const nList = ridgeQuills(neckPts, neckR, { from: 0.05, to: 0.95, count: 18, rows: 3, length: q.len, width: 0.06, rise: 0.4, col: q.col, tipCol: q.tip });
        const tPts = torso.sections.slice(1, 8).map((s) => [s.p[0], s.p[1] + (s.yOff ?? 0), s.p[2]]).reverse();
        const tR = torso.sections.slice(1, 8).map((s) => s.rh).reverse();
        const tList = ridgeQuills(tPts, tR, { count: 20, rows: 3, length: q.len * 1.1, width: 0.06, rise: 0.4, col: q.col, tipCol: q.tip });
        neck.group.add(featherMesh(nList));
        torso.group.add(featherMesh(tList));
    }
};
