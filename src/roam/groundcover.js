// ==================== GROUND COVER ====================
// The dense carpet right around Spino: a clump every couple of metres within about 55 m,
// chosen by biome (grass and sedge in the open, fern sprigs on the forest floor,
// horsetails in the wet, pebbles on bare rock) and rebuilt as you move. It is what makes
// the ground read as thick with growth, the way the comics fill every inch of it.
import * as THREE from 'three';
import { mulberry32 } from '../three/lowpoly.js';

const CELL = 1.8;
const LOW = typeof location !== 'undefined' && new URLSearchParams(location.search).get('q') === 'low';
const R = LOW ? 34 : 55;
// per biome: [chance of a clump in a cell, [kind, weight]...]
const COVER = {
    plains: [0.75, ['sedge', 3], ['tuft', 4], ['flowers', 0.6]],
    savanna: [0.8, ['sedge', 5], ['tuft', 4]],
    floodplain: [0.85, ['sedge', 4], ['tuft', 3], ['horsetails', 0.6], ['flowers', 0.5]],
    fernprairie: [0.85, ['fernLo', 5], ['tuft', 2], ['flowers', 0.6]],
    openwoods: [0.7, ['fernLo', 3], ['sedge', 2], ['tuft', 2]],
    scrubland: [0.55, ['tuft', 4], ['sedge', 2], ['rock', 0.4]],
    sauropodgrounds: [0.45, ['tuft', 4], ['sedge', 1]],
    hills: [0.55, ['tuft', 4], ['sedge', 2], ['rock', 0.6]],
    forest: [0.7, ['fernLo', 4], ['sedge', 1]],
    galleryforest: [0.8, ['fernLo', 4], ['horsetails', 1], ['sedge', 1]],
    denseforest: [0.9, ['fernLo', 3], ['bigFernLo', 2]],
    jungle: [0.85, ['fernLo', 4], ['bigFernLo', 1]],
    deadfall: [0.6, ['fernLo', 3], ['sedge', 1]],
    marsh: [0.9, ['horsetails', 3], ['reeds', 2], ['sedge', 2]],
    mangrove: [0.5, ['horsetails', 2], ['reeds', 1]],
    riverbank: [0.5, ['sedge', 3], ['tuft', 2], ['reeds', 1]],
    river: [0.7, ['sedge', 3], ['tuft', 3], ['fernLo', 1]],
    stream: [0.6, ['sedge', 3], ['tuft', 2]],
    waterhole: [0.5, ['sedge', 2], ['tuft', 3]],
    nest: [0.25, ['tuft', 3]],
    beach: [0.15, ['sedge', 1]],
    rocky: [0.4, ['rock', 2], ['tuft', 1]],
    boulderfield: [0.35, ['rock', 2]],
    badlands: [0.2, ['rock', 1]],
    desert: [0.08, ['rock', 1]],
    mountains: [0.35, ['rock', 2], ['tuft', 1]]
};
const SIZE = { sedge: [0.5, 1.1], tuft: [0.5, 1.0], flowers: [0.4, 0.8], fernLo: [0.6, 1.2], bigFernLo: [1.3, 2.2], horsetails: [1.0, 1.8], reeds: [1.2, 2.0], rock: [0.3, 0.8] };
const DRY = new Set(['savanna', 'scrubland', 'sauropodgrounds', 'hills', 'plains']);

export class GroundCover {
    constructor(world, terrain, scene) {
        this.world = world;
        this.scene = scene;
        this.meshes = {};
        const cap = Math.ceil((Math.PI * R * R) / (CELL * CELL));
        for (const kind of Object.keys(SIZE)) {
            const m = new THREE.InstancedMesh(terrain.protos[kind][0], terrain.foliage, cap);
            m.count = 0;
            m.frustumCulled = false;
            m.receiveShadow = true;
            scene.add(m);
            this.meshes[kind] = m;
        }
        this.at = null;
    }

    rebuild(px, pz) {
        const W = this.world;
        const counts = {};
        for (const k in this.meshes) counts[k] = 0;
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
        const up = new THREE.Vector3(0, 1, 0);
        const i0 = Math.floor((px - R) / CELL), i1 = Math.floor((px + R) / CELL);
        const j0 = Math.floor((pz - R) / CELL), j1 = Math.floor((pz + R) / CELL);
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                const rand = mulberry32(((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995) >>> 0);
                const x = (i + rand()) * CELL, z = (j + rand()) * CELL;
                if ((x - px) ** 2 + (z - pz) ** 2 > R * R) continue;
                const cell = W.cellAt(x, z);
                if (!cell) continue;
                const def = COVER[cell.terrain];
                if (!def || rand() > def[0]) continue;
                let total = 0;
                for (let k = 1; k < def.length; k++) total += def[k][1];
                let r = rand() * total, kind = def[1][0];
                for (let k = 1; k < def.length; k++) { r -= def[k][1]; if (r <= 0) { kind = def[k][0]; break; } }
                const sf = W.surface(x, z);
                const wet = kind === 'horsetails' || kind === 'reeds';
                if (sf.water !== null && sf.ground < sf.water - (wet ? 0.8 : -0.1)) continue;
                const mesh = this.meshes[kind];
                const [a, b] = SIZE[kind];
                const h = a + (b - a) * rand();
                q.setFromAxisAngle(up, rand() * Math.PI * 2);
                m.compose(v.set(x, sf.ground - 0.08, z), q, s.set(h * (0.8 + rand() * 0.5), h, h * (0.8 + rand() * 0.5)));
                mesh.setMatrixAt(counts[kind], m);
                // drier and yellower out in the open, darker under trees
                const l = 0.85 + rand() * 0.3;
                c.setRGB(l, l, l);
                if (DRY.has(cell.terrain)) c.multiply(new THREE.Color(1.15, 1.04, 0.7));
                if (cell.terrain.includes('forest') || cell.terrain === 'jungle') c.multiplyScalar(0.8);
                mesh.setColorAt(counts[kind], c);
                counts[kind]++;
            }
        }
        for (const [k, mesh] of Object.entries(this.meshes)) {
            mesh.count = counts[k];
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        this.at = [px, pz];
    }

    update(px, pz) {
        if (!this.at || Math.hypot(px - this.at[0], pz - this.at[1]) > 6) this.rebuild(px, pz);
    }
}
