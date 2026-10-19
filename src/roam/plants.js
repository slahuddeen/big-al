// ==================== PLANTS SEEN UP CLOSE ====================
// Extra builders for the roaming game, all made one unit tall (or wide) and scaled per
// instance: ferns with real leaflets, early flowering herbs, sedges and reeds for the
// water's edge, water-lily pads, and the giant emergent trees that tower over a forest.
import * as THREE from 'three';
import { loft, blob, limb, shade, vary } from '../three/lowpoly.js';

const swaying = (mb, height, fn) => {
    mb.swayFn = (v) => Math.max(0, Math.min(1, v.y / height)) ** 1.5;
    fn();
    mb.swayFn = null;
};

// a fern frond by frond, each with paired leaflets that shrink towards the tip
export const leafyFern = (mb, rand, color = '#4f9e38') => {
    swaying(mb, 1, () => {
        const n = 7 + Math.floor(rand() * 4);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand() * 0.5;
            const len = 0.85 + rand() * 0.4;
            const rise = 0.55 + rand() * 0.25;
            const dx = Math.cos(a), dz = Math.sin(a);
            const c = vary(color, rand, 0.12);
            const at = (t) => new THREE.Vector3(dx * len * t, rise * Math.sin(t * Math.PI * 0.8) + 0.04 - t * t * 0.25, dz * len * t);
            const steps = 7;
            for (let k = 1; k < steps; k++) {
                const t = k / steps;
                const p = at(t), q = at(t + 1 / steps);
                const w = 0.17 * (1 - t) + 0.02;
                const side = new THREE.Vector3(-dz, 0.15, dx).normalize();
                const cc = k % 2 ? c : shade(c, 0.9);
                for (const s of [1, -1]) {
                    const tip = p.clone().addScaledVector(side, w * s).add(new THREE.Vector3(dx * 0.05, -0.04, dz * 0.05));
                    mb.tri(p, q, tip, cc, [0, 1, 0], true);
                }
            }
            // the rachis
            mb.tri([0, 0, 0], at(0.5).add(new THREE.Vector3(-dz * 0.012, 0, dx * 0.012)), at(1), shade(c, 0.7), [0, 1, 0], true);
        }
    });
};

// a clump of early flowering herbs: thin stems, a few leaves, small bright heads
const PETALS = ['#f2c62a', '#f4f0e2', '#e4573a', '#b56ad8', '#f08ab0', '#ff9a2a'];
export const flowers = (mb, rand, variant = 0) => {
    const petal = PETALS[variant % PETALS.length];
    swaying(mb, 1, () => {
        const n = 5 + Math.floor(rand() * 5);
        for (let i = 0; i < n; i++) {
            const a = rand() * Math.PI * 2, r = rand() * 0.35;
            const x = Math.cos(a) * r, z = Math.sin(a) * r;
            const h = 0.55 + rand() * 0.45;
            const lx = (rand() - 0.5) * 0.15, lz = (rand() - 0.5) * 0.15;
            limb(mb, [x, 0, z], [x + lx, h, z + lz], 0.018, 0.012, '#4f8a2e', { sides: 3 });
            // two leaves
            for (const s of [0.25, 0.45]) {
                const la = rand() * Math.PI * 2;
                const bx = x + lx * s, by = h * s, bz = z + lz * s;
                mb.tri([bx, by, bz], [bx + Math.cos(la) * 0.2, by + 0.08, bz + Math.sin(la) * 0.2], [bx + Math.cos(la + 0.5) * 0.12, by + 0.02, bz + Math.sin(la + 0.5) * 0.12], '#5f9e36', [0, 1, 0], true);
            }
            // the flower head: a ring of petals round a dark or golden centre
            const cx = x + lx, cy = h, cz = z + lz;
            const pc = vary(petal, rand, 0.08);
            const k = 5;
            for (let j = 0; j < k; j++) {
                const pa = (j / k) * Math.PI * 2 + rand() * 0.3;
                const pr = 0.09 + rand() * 0.03;
                mb.tri([cx, cy, cz], [cx + Math.cos(pa - 0.32) * pr, cy + 0.025, cz + Math.sin(pa - 0.32) * pr], [cx + Math.cos(pa + 0.32) * pr, cy + 0.025, cz + Math.sin(pa + 0.32) * pr], pc, [0, 1, 0], true);
            }
            blob(mb, [cx, cy + 0.02, cz], 0.03, variant % 2 ? '#e0a020' : '#5a3a1a', { rand, jitter: 0.1 });
        }
    });
};

// sedge: a dense fountain of long thin blades
export const sedge = (mb, rand, color = '#8fb84a') => {
    swaying(mb, 1, () => {
        const n = 14 + Math.floor(rand() * 8);
        for (let i = 0; i < n; i++) {
            const a = rand() * Math.PI * 2;
            const h = 0.6 + rand() * 0.45;
            const lean = 0.2 + rand() * 0.35;
            const bx = Math.cos(a) * 0.08, bz = Math.sin(a) * 0.08;
            const w = 0.03;
            const mid = [bx + Math.cos(a) * lean * 0.45, h * 0.62, bz + Math.sin(a) * lean * 0.45];
            const c = vary(color, rand, 0.16);
            mb.tri([bx - Math.sin(a) * w, 0, bz + Math.cos(a) * w], [bx + Math.sin(a) * w, 0, bz - Math.cos(a) * w], mid, c, [Math.cos(a), 0.3, Math.sin(a)], true);
            mb.tri([mid[0] - Math.sin(a) * w * 0.6, mid[1], mid[2] + Math.cos(a) * w * 0.6], [mid[0] + Math.sin(a) * w * 0.6, mid[1], mid[2] - Math.cos(a) * w * 0.6], [bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean], shade(c, 1.1), [Math.cos(a), 0.3, Math.sin(a)], true);
        }
    });
};

// reeds at the water's edge: tall straight stems, some with dark seed heads
export const reeds = (mb, rand) => {
    swaying(mb, 1, () => {
        const n = 10 + Math.floor(rand() * 8);
        for (let i = 0; i < n; i++) {
            const x = (rand() - 0.5) * 0.5, z = (rand() - 0.5) * 0.5;
            const h = 0.65 + rand() * 0.35;
            const lx = (rand() - 0.5) * 0.12, lz = (rand() - 0.5) * 0.12;
            limb(mb, [x, 0, z], [x + lx, h, z + lz], 0.012, 0.006, i % 3 ? '#7aa040' : '#93ae4c', { sides: 3 });
            if (rand() < 0.35) limb(mb, [x + lx * 0.85, h * 0.85, z + lz * 0.85], [x + lx * 0.97, h * 0.97, z + lz * 0.97], 0.022, 0.02, '#6a4a2a', { sides: 4 });
            // a long ribbon leaf
            const a = rand() * Math.PI * 2;
            mb.tri([x, 0.05, z], [x + 0.02, 0.05, z], [x + Math.cos(a) * 0.3, h * 0.6, z + Math.sin(a) * 0.3], '#87ac46', [0, 1, 0], true);
        }
    });
};

// water lilies: a raft of notched round pads, now and then a white or pink flower
export const lilyPads = (mb, rand) => {
    const n = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.45;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const pr = 0.06 + rand() * 0.07;
        const notch = rand() * Math.PI * 2;
        const c = vary(rand() < 0.2 ? '#7a9a3a' : '#4f9a3a', rand, 0.12);
        const k = 9;
        for (let j = 0; j < k; j++) {
            const a0 = notch + 0.35 + (j / k) * (Math.PI * 2 - 0.7), a1 = notch + 0.35 + ((j + 1) / k) * (Math.PI * 2 - 0.7);
            mb.tri([x, 0.01, z], [x + Math.cos(a0) * pr, 0.01, z + Math.sin(a0) * pr], [x + Math.cos(a1) * pr, 0.01, z + Math.sin(a1) * pr], j % 2 ? c : shade(c, 1.08), [0, 1, 0], true);
        }
        if (rand() < 0.18) {
            const fc = rand() < 0.5 ? '#f6f2ea' : '#f2a0c0';
            for (let j = 0; j < 6; j++) {
                const pa = (j / 6) * Math.PI * 2;
                mb.tri([x, 0.035, z], [x + Math.cos(pa - 0.3) * 0.05, 0.06, z + Math.sin(pa - 0.3) * 0.05], [x + Math.cos(pa + 0.3) * 0.05, 0.06, z + Math.sin(pa + 0.3) * 0.05], fc, [0, 1, 0], true);
            }
            blob(mb, [x, 0.045, z], 0.015, '#f0c030', { rand, jitter: 0.1 });
        }
    }
};

// a giant emergent conifer: tall bare trunk with buttresses, tiers of flat dark boughs
export const giantConifer = (mb, rand) => {
    const bark = '#5e3e26';
    const lx = (rand() - 0.5) * 0.03, lz = (rand() - 0.5) * 0.03;
    loft(mb, [
        { p: [0, -0.01, 0], r: 0.05 },
        { p: [lx * 0.1, 0.06, lz * 0.1], r: 0.03 },
        { p: [lx * 0.5, 0.5, lz * 0.5], r: 0.022 },
        { p: [lx, 1, lz], r: 0.008 }
    ], { sides: 7, color: bark, ridgeColor: shade(bark, 1.18), stripes: { every: 2, offset: 1, color: shade(bark, 0.85) }, rand, jitter: 0.12 });
    // buttress roots
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rand() * 0.4;
        limb(mb, [0, 0.08, 0], [Math.cos(a) * 0.075, -0.005, Math.sin(a) * 0.075], 0.014, 0.006, shade(bark, 0.95), { sides: 4 });
    }
    swaying(mb, 1, () => {
        const greens = ['#2f6a34', '#3a7a3a', '#2a5e30', '#44863e'];
        const tiers = 5;
        for (let t = 0; t < tiers; t++) {
            const y = 0.42 + (t / tiers) * 0.55;
            const r = 0.2 * (1 - t / tiers) + 0.05;
            const k = 4 + Math.floor(rand() * 2);
            for (let j = 0; j < k; j++) {
                const a = (j / k) * Math.PI * 2 + rand() * 0.6 + t;
                const bx = lx * y + Math.cos(a) * r * 0.55, bz = lz * y + Math.sin(a) * r * 0.55;
                const g = greens[(t + j) % 4];
                blob(mb, [bx, y + 0.01, bz], r * 0.5, g, { scale: [1.3, 0.32, 1.3], jitter: 0.35, rand, colorFn: (ly) => (ly > 0.2 ? shade(g, 1.2) : g) });
            }
        }
        blob(mb, [lx, 1.0, lz], 0.05, greens[1], { scale: [1, 1.5, 1], jitter: 0.3, rand });
    });
};

// a broad, spreading broadleaf giant for the gallery forests (an early angiosperm tree)
export const giantBroadleaf = (mb, rand) => {
    const bark = '#6a5038';
    const top = [(rand() - 0.5) * 0.08, 0.62, (rand() - 0.5) * 0.08];
    loft(mb, [{ p: [0, -0.01, 0], r: 0.07 }, { p: [0, 0.08, 0], r: 0.04 }, { p: [top[0] * 0.5, 0.35, top[2] * 0.5], r: 0.032 }, { p: top, r: 0.024 }],
        { sides: 7, color: bark, ridgeColor: shade(bark, 1.15), rand, jitter: 0.15 });
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rand() * 0.5;
        limb(mb, [0, 0.1, 0], [Math.cos(a) * 0.1, -0.005, Math.sin(a) * 0.1], 0.02, 0.006, shade(bark, 0.92), { sides: 4 });
    }
    const ends = [];
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rand() * 0.6;
        const e = [top[0] + Math.cos(a) * 0.26, top[1] + 0.12 + rand() * 0.1, top[2] + Math.sin(a) * 0.26];
        limb(mb, top, e, 0.018, 0.008, bark, { sides: 5 });
        ends.push(e);
    }
    swaying(mb, 1, () => {
        const greens = ['#4f9a3a', '#5aa83e', '#468a34', '#6ab446'];
        ends.forEach((e, i) => {
            const g = greens[i % 4];
            blob(mb, [e[0], e[1] + 0.05, e[2]], 0.17 + rand() * 0.05, g, { scale: [1.2, 0.55, 1.2], jitter: 0.4, rand, colorFn: (ly) => (ly > 0.3 ? shade(g, 1.15) : ly < -0.3 ? shade(g, 0.82) : g) });
        });
        blob(mb, [top[0], top[1] + 0.22, top[2]], 0.2, greens[3], { scale: [1.3, 0.5, 1.3], jitter: 0.4, rand });
        // hanging vines
        for (let i = 0; i < 6; i++) {
            const e = ends[i % ends.length];
            const len = 0.15 + rand() * 0.2;
            limb(mb, [e[0] + (rand() - 0.5) * 0.1, e[1], e[2] + (rand() - 0.5) * 0.1], [e[0], e[1] - len, e[2]], 0.004, 0.003, '#3f7a2e', { sides: 3 });
        }
    });
};
