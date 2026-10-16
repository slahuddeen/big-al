// ==================== POINT-OF-INTEREST MODELS ====================
import * as THREE from 'three';
import { MeshBuilder, blob, limb, loft, mulberry32, hashString, vary } from './lowpoly.js';

const disc = (mb, x, z, y, r, color, sides, rand) => {
    const pts = [];
    for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const rr = r * (0.8 + rand() * 0.35);
        pts.push([x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]);
    }
    for (let k = 0; k < sides; k++) mb.tri([x, y, z], pts[k], pts[(k + 1) % sides], vary(color, rand, 0.04), [0, 1, 0], true);
};

const eggs = (mb, rand, n, broken) => {
    disc(mb, 0, 0, 0.004, 0.3, '#8a5a32', 9, rand);
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        blob(mb, [Math.cos(a) * 0.24, 0.03, Math.sin(a) * 0.24], 0.07, i % 2 ? '#6a4a28' : '#7a5530', { scale: [1.3, 0.6, 1], jitter: 0.4, rand, flatBottom: -0.3 });
    }
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        const r = i === 3 ? 0 : 0.09;
        if (i < n) {
            blob(mb, [Math.cos(a) * r, 0.055, Math.sin(a) * r], 0.05, '#f2ead6', { detail: 1, jitter: 0.04, scale: [0.85, 1.2, 0.85], rand, colorFn: (ly, rr) => (rr() > 0.8 ? '#c8b088' : '#f2ead6'), faceVary: 0.02 });
        } else if (broken) {
            blob(mb, [Math.cos(a) * r, 0.02, Math.sin(a) * r], 0.04, '#e8dcc0', { scale: [1, 0.45, 1], jitter: 0.5, rand });
        }
    }
};

const sauropod = (mb, rand, meat) => {
    // spine, ribs arching up, a long neck and tail of vertebrae, and (while it lasts) meat
    loft(mb, [{ p: [-0.9, 0.12, 0], r: 0.05 }, { p: [0, 0.2, 0], r: 0.06 }, { p: [0.7, 0.14, 0.05], r: 0.05 }], { sides: 5, color: '#ece2c8', rand, jitter: 0.1 });
    for (let i = 0; i < 9; i++) {
        const x = -0.45 + i * 0.12;
        const h = 0.42 - Math.abs(i - 4) * 0.03;
        for (const s of [-1, 1]) {
            limb(mb, [x, 0.2, 0], [x + 0.02, h, s * 0.3], 0.025, 0.02, '#f0e8d4', { sides: 4 });
            limb(mb, [x + 0.02, h, s * 0.3], [x + 0.05, 0.02, s * 0.42], 0.02, 0.014, '#e4d8bc', { sides: 4 });
        }
    }
    for (let i = 0; i < 9; i++) blob(mb, [0.75 + i * 0.13, 0.08 - i * 0.004, 0.08 + Math.sin(i * 0.6) * 0.18], 0.045, '#e8dec4', { rand, jitter: 0.3 });
    for (let i = 0; i < 10; i++) blob(mb, [-0.95 - i * 0.12, 0.07, -Math.sin(i * 0.4) * 0.22], 0.04 - i * 0.002, '#e8dec4', { rand, jitter: 0.3 });
    blob(mb, [1.95, 0.08, 0.5], 0.08, '#efe6d0', { scale: [1.6, 0.8, 1], rand, jitter: 0.2 });
    limb(mb, [0.4, 0.04, 0.45], [0.9, 0.04, 0.7], 0.05, 0.045, '#ece2c8', { sides: 5 });
    limb(mb, [-0.5, 0.04, -0.45], [-0.95, 0.04, -0.75], 0.055, 0.05, '#ece2c8', { sides: 5 });
    if (meat > 0) {
        const k = Math.min(1, meat / 8);
        blob(mb, [0, 0.16, 0], 0.32 * (0.5 + 0.5 * k), '#8a2a24', { scale: [1.8, 0.6, 1], jitter: 0.4, rand, flatBottom: -0.4 });
        blob(mb, [-0.3, 0.12, 0.1], 0.2 * (0.5 + 0.5 * k), '#6a1e1a', { scale: [1.5, 0.5, 1], jitter: 0.4, rand, flatBottom: -0.4 });
    }
    disc(mb, 0.1, 0.1, 0.006, 0.55, '#4a1e18', 9, rand);
};

const wallow = (mb, rand) => {
    disc(mb, 0, 0, 0.006, 0.55, '#5a4026', 11, rand);
    disc(mb, 0.02, -0.02, 0.012, 0.42, '#4a3220', 10, rand);
    disc(mb, 0.04, 0.0, 0.016, 0.26, '#3e2a1a', 9, rand);
    for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2;
        const r = rand() * 0.3;
        blob(mb, [Math.cos(a) * r, 0.02, Math.sin(a) * r], 0.025 + rand() * 0.02, '#6a4e32', { scale: [1, 0.5, 1], rand, jitter: 0.2 });
    }
};

const lookout = (mb, rand) => {
    blob(mb, [0.05, 0.05, 0], 0.42, '#8a8378', { scale: [1.2, 0.5, 0.9], jitter: 0.35, rand, flatBottom: -0.2, colorFn: (ly) => (ly > 0.4 ? '#a39b8e' : '#8a8378') });
    blob(mb, [-0.25, 0.04, 0.22], 0.2, '#7a746a', { scale: [1.1, 0.7, 1], jitter: 0.4, rand, flatBottom: -0.3 });
};

const bonebed = (mb, rand) => {
    for (let i = 0; i < 7; i++) {
        const x = (rand() - 0.5) * 0.9;
        const z = (rand() - 0.5) * 0.9;
        const a = rand() * Math.PI;
        const l = 0.12 + rand() * 0.14;
        limb(mb, [x - Math.cos(a) * l, 0.025, z - Math.sin(a) * l], [x + Math.cos(a) * l, 0.025, z + Math.sin(a) * l], 0.02, 0.018, '#ece2c8', { sides: 4 });
        blob(mb, [x + Math.cos(a) * l, 0.03, z + Math.sin(a) * l], 0.035, '#e4d8bc', { rand, jitter: 0.2 });
    }
    blob(mb, [0.1, 0.06, -0.1], 0.12, '#efe6d0', { scale: [1.5, 0.8, 1], rand, jitter: 0.25 }); // skull
};

// Returns a mesh (or null) for the POI. `state` changes (portions) rebuild it.
export const buildPoiMesh = (poi, material) => {
    const mb = new MeshBuilder();
    const rand = mulberry32(hashString(poi.id));
    switch (poi.type) {
        case 'eggs': eggs(mb, rand, Math.max(0, poi.portions ?? 3) + 1, true); break;
        case 'sauropodcarcass': sauropod(mb, rand, poi.portions ?? 0); break;
        case 'wallow': wallow(mb, rand); break;
        case 'lookout': lookout(mb, rand); break;
        case 'bonebed': bonebed(mb, rand); break;
        default: return null;
    }
    if (mb.isEmpty()) return null;
    const mesh = new THREE.Mesh(mb.build(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = rand() * Math.PI * 2;
    // eggs in a "nest" cell sit beside the nest's own clutch, the rest in the middle
    const r = poi.type === 'sauropodcarcass' ? 0.15 : poi.type === 'eggs' ? 0.32 : 0.2;
    const a = rand() * Math.PI * 2;
    mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    mesh.scale.setScalar(poi.type === 'sauropodcarcass' ? 0.62 : 1);
    return mesh;
};
