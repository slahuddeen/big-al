// ==================== EXPORT THE ROAM CREATURES FOR BLENDER ====================
// Builds every animal with the browser game's own creature code (src/three/creatures3d.js),
// at a finer loft than even the roam view uses, and writes each one as JSON for
// tools/blender/build_creatures.py:
//   nodes   the group hierarchy the procedural animation drives (body, neck, head, jaw,
//           tail, legs, arms, wings, segments), with rest transforms
//   meshes  the triangles hung off each group, with sRGB vertex colours and a material tag
//           per vertex: skin, eye, keratin (teeth and claws) or membrane (sails, fins, wings)
//   parts   which node plays which role, with each leg's side and gait phase
// Usage: node tools/export_creatures.mjs [species ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'src');
const gen = path.join(here, '.gen');
fs.mkdirSync(gen, { recursive: true });

// ---------- a copy of the creature code that tags what it draws ----------
const lowpolyURL = pathToFileURL(path.join(src, 'three', 'lowpoly.js')).href;
let code = fs.readFileSync(path.join(src, 'three', 'creatures3d.js'), 'utf8');
code = code.replace(
    "import { MeshBuilder, loft, blob, cone, limb, slab, mulberry32, hashString, shade, mix, vary } from './lowpoly.js';",
    `import { MeshBuilder, loft, blob as blob_, cone as cone_, limb, slab as slab_, mulberry32, hashString, shade, mix, vary } from '${lowpolyURL}';
const KERATIN = new Set(['f2ecd8', 'f4f0e0', 'd8d0b8', 'ece0c4', 'ece4cc', 'f2ecd8', '1a1a1a', '2a2420', 'e0d4c0']);
const hexOf = (c) => (typeof c === 'string' ? c.replace('#', '').toLowerCase() : c && c.isColor ? c.getHexString() : '');
const tagged = (tag, fn) => (mb, ...a) => { const t = mb.tag; if (!t || tag === 'eye') mb.tag = tag; const r = fn(mb, ...a); mb.tag = t; return r; };
const slab = tagged('membrane', slab_);
const cone = (mb, base, tip, radius, color, opts) => (KERATIN.has(hexOf(color)) ? tagged('keratin', cone_) : cone_)(mb, base, tip, radius, color, opts);
const blob = (mb, center, radius, color, opts) => (KERATIN.has(hexOf(color)) && !mb.tag ? tagged('keratin', blob_) : blob_)(mb, center, radius, color, opts);`
);
code = code.replace('const eyes = (mb, x, y, zHalf, r, iris', 'const eyes_ = (mb, x, y, zHalf, r, iris');
code = code.replace('const teethRow = (mb, x0', `const eyes = (mb, x, y, zHalf, r, iris = '#f2c230', pupil = '#141414') => {
    mb.eyeSkin = [new THREE.Color('#1c1714').getHexString(), shade(iris, 0.35).getHexString()];
    tagged('eye', eyes_)(mb, x, y, zHalf, r, iris, pupil);
    mb.eyeSkin = null;
};
const teethRow_ = (mb, x0`);
code = code.replace('const finalize = (model)', `const teethRow = tagged('keratin', teethRow_);
const finalize = (model)`);
code = code.replace(/const p = \{ /g, 'const p = globalThis.__spec = { ');
fs.writeFileSync(path.join(gen, 'creatures3d.gen.js'), code);

// ---------- record a tag with every vertex ----------
const { MeshBuilder } = await import(lowpolyURL);
const push = MeshBuilder.prototype._push;
MeshBuilder.prototype._push = function (v, c, w) {
    push.call(this, v, c, w);
    let tag = this.tag || 'skin';
    if (tag === 'eye' && this.eyeSkin && this.eyeSkin.includes(c.getHexString())) tag = 'skin';
    (this.tags || (this.tags = [])).push(tag);
};
const build = MeshBuilder.prototype.build;
MeshBuilder.prototype.build = function () {
    const g = build.call(this);
    g.userData.tags = this.tags || [];
    return g;
};

const C3D = await import(pathToFileURL(path.join(gen, 'creatures3d.gen.js')).href);
const { SPECIES_DATA, HABITAT_SPECIES, AQUATIC, SEMI_AQUATIC, FLYERS, BODY_LENGTH_M } = await import(pathToFileURL(path.join(src, 'data', 'species.js')).href);
C3D.CREATURE_STYLE.eyes = 'real';

// the animals the roam game can actually meet (it skips anything too small to notice)
const roaming = new Set();
for (const table of Object.values(HABITAT_SPECIES)) {
    for (const s of Object.keys(table)) {
        const d = SPECIES_DATA[s];
        if (!d) continue;
        const wet = AQUATIC.has(s) || SEMI_AQUATIC.has(s);
        if (d.weight >= (wet ? 2 : 8)) roaming.add(s);
    }
}
const wanted = process.argv.slice(2);
const list = wanted.length ? wanted : ['Player', ...[...roaming].filter((s) => C3D.SPECIES_MODELS[s])];

const ctx = { mat: new THREE.MeshBasicMaterial(), wingMat: new THREE.MeshBasicMaterial() };
const srgb = new THREE.Color();
const r4 = (v) => Math.round(v * 1e5) / 1e5;
const outDir = path.join(here, '.gen', 'creatures');
fs.mkdirSync(outDir, { recursive: true });

const exportModel = (name, model) => {
    const nodes = [];
    const ids = new Map();
    const P = model.parts;
    const role = new Map();
    role.set(model.root, 'root');
    role.set(model.inner, 'inner');
    role.set(model.body, 'body');
    P.neck.forEach((n, i) => role.set(n, `neck${i}`));
    P.tail.forEach((n, i) => role.set(n, `tail${i}`));
    P.segs.forEach((n, i) => role.set(n, `seg${i}`));
    if (P.head) role.set(P.head, 'head');
    if (P.jaw) role.set(P.jaw, 'jaw');
    P.legs.forEach((l, i) => role.set(l.pivot, `leg${i}`));
    P.arms.forEach((a, i) => role.set(a.pivot, `arm${i}`));
    P.wings.forEach((w, i) => role.set(w.pivot, `wing${i}`));
    const meshes = [];
    model.root.updateMatrixWorld(true);
    model.root.traverse((o) => {
        if (o.isMesh) {
            const g = o.geometry;
            const pos = g.attributes.position.array, col = g.attributes.color.array;
            const colors = [];
            for (let i = 0; i < col.length; i += 3) {
                srgb.setRGB(col[i], col[i + 1], col[i + 2]);
                const t = {};
                srgb.getRGB(t, THREE.SRGBColorSpace);
                colors.push(r4(t.r), r4(t.g), r4(t.b));
            }
            meshes.push({ node: ids.get(o.parent), positions: Array.from(pos, r4), colors, tags: g.userData.tags });
            return;
        }
        const id = nodes.length;
        ids.set(o, id);
        let n = role.get(o) || `g${id}`;
        nodes.push({
            name: n, parent: o.parent && ids.has(o.parent) ? ids.get(o.parent) : -1,
            pos: o.position.toArray().map(r4), rot: [o.rotation.x, o.rotation.y, o.rotation.z].map(r4), scale: o.scale.toArray().map(r4)
        });
    });
    const out = {
        species: name, gait: model.gait, flapSpeed: model.flapSpeed ?? null, swimSpeed: model.swimSpeed ?? null,
        height: r4(model.height ?? 0), width: r4(model.width ?? 0), minLen: model.minLen ?? 0.14,
        legs: P.legs.map((l, i) => ({ node: `leg${i}`, side: l.side, phase: r4(l.phase ?? 0), front: !!l.front })),
        arms: P.arms.map((a, i) => ({ node: `arm${i}`, side: a.side })),
        wings: P.wings.map((w, i) => ({ node: `wing${i}`, side: w.side })),
        spec: JSON.parse(JSON.stringify(globalThis.__spec || {}, (k, v) => (v && v.isColor ? '#' + v.getHexString() : v))),
        nodes, meshes
    };
    const file = path.join(outDir, `${name.replace(/[^A-Za-z0-9]+/g, '_')}.json`);
    fs.writeFileSync(file, JSON.stringify(out));
    const tris = meshes.reduce((s, m) => s + m.positions.length / 9, 0);
    console.log(`  ${name.padEnd(22)} ${model.gait.padEnd(7)} ${nodes.length} nodes, ${meshes.length} meshes, ${tris} tris`);
};

for (const name of list) {
    if (name === 'Player') {
        // the player is seen closest of all: finer still, with pale flecks over the dark hide
        C3D.CREATURE_STYLE.detail = 3;
        const m = C3D.buildSpino(3, ctx, undefined, { spec: { spots: '#5a5a66', spotCount: 60, spotSize: 0.06 } });
        m.minLen = 0.14;
        exportModel('Player', m);
        continue;
    }
    C3D.CREATURE_STYLE.detail = 2.5;
    exportModel(name, C3D.buildCreatureModel(name, ctx));
}
// sizes and kinds for the Godot side
const meta = {};
for (const s of list) {
    if (s === 'Player') continue;
    const d = SPECIES_DATA[s];
    meta[s] = { file: s.replace(/[^A-Za-z0-9]+/g, '_'), weight: d.weight, aquatic: AQUATIC.has(s), amphibious: SEMI_AQUATIC.has(s), flyer: FLYERS.has(s), bodyLength: BODY_LENGTH_M[s] ?? null };
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(meta, null, 1));
