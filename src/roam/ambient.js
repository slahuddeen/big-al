// ==================== SMALL LIFE ====================
// Everything too small or too many to be a full animal: schools of fish turning in the
// ponds and channels (Spino can snap them up), flocks of little pterosaurs and birds
// wheeling overhead, fireflies over the plants at night, and the splashes and blood that
// bites and plunges throw up. All of it is instanced or drawn as points, so it costs little.
import * as THREE from 'three';
import { MeshBuilder, blob, mulberry32 } from '../three/lowpoly.js';

// round point sprites: a soft glow for fireflies, a hard comic droplet for splashes
const dotTexture = (soft) => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(soft ? 0.25 : 0.62, 'rgba(255,255,255,1)');
    gr.addColorStop(soft ? 1 : 0.7, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
};

const FISH_COLOURS = ['#9aa8b0', '#c8a84a', '#7a8a5a', '#b06a3a', '#6a7a8a', '#d8c070'];
const MAX_FISH = 160;
const SCHOOL_R = 140;

const fishGeometry = () => {
    const mb = new MeshBuilder();
    const r = mulberry32(5);
    blob(mb, [0, 0, 0], 0.5, '#ffffff', { scale: [1, 0.42, 0.22], jitter: 0.1, rand: r, colorFn: (ly) => (ly > 0.2 ? '#5a6a70' : ly < -0.3 ? '#f4f0e6' : '#c8ccd0') });
    mb.tri([-0.45, 0, 0], [-0.75, 0.2, 0], [-0.75, -0.2, 0], '#8a8a80');
    mb.tri([-0.45, 0, 0], [-0.75, -0.2, 0], [-0.75, 0.2, 0], '#8a8a80');
    mb.tri([0.05, 0.18, 0], [-0.2, 0.32, 0], [-0.25, 0.15, 0], '#6a7070');
    mb.tri([0.05, 0.18, 0], [-0.25, 0.15, 0], [-0.2, 0.32, 0], '#6a7070');
    return mb.build();
};

// a little flier with its wingtips raised: scaling it on y flaps the wings
const flierGeometry = () => {
    const mb = new MeshBuilder();
    const r = mulberry32(9);
    blob(mb, [0, 0, 0], 0.12, '#3a3a40', { scale: [2.2, 0.8, 0.8], rand: r, jitter: 0.1 });
    for (const s of [1, -1]) {
        mb.tri([0.08, 0, 0], [-0.1, 0, 0], [0.0, 0.35, s * 0.9], '#4a4448', [0, 1, 0], true);
        mb.tri([0.08, 0, 0], [0.0, 0.35, s * 0.9], [-0.1, 0, 0], '#5a5050', [0, -1, 0], true);
    }
    mb.tri([0.25, 0.02, 0], [0.42, 0, 0.03], [0.25, -0.03, 0], '#c8a050');
    return mb.build();
};

export class Ambient {
    constructor(world, scene, water) {
        this.world = world;
        this.scene = scene;
        this.water = water;
        const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
        // fish
        this.fishMesh = new THREE.InstancedMesh(fishGeometry(), mat, MAX_FISH);
        this.fishMesh.frustumCulled = false;
        this.fishMesh.count = 0;
        scene.add(this.fishMesh);
        this.schools = [];
        this.fish = [];
        this.lastSchools = -99;
        // fliers
        this.flierMesh = new THREE.InstancedMesh(flierGeometry(), mat, 60);
        this.flierMesh.frustumCulled = false;
        this.flierMesh.count = 0;
        scene.add(this.flierMesh);
        this.flocks = [];
        // fireflies and splashes as points
        this.flies = this.makePoints(140, '#e8ff7a', 0.45, true);
        this.flyData = [];
        this.drops = this.makePoints(240, '#ffffff', 0.35, false, true);
        this.dropData = [];
        this.m = new THREE.Matrix4();
        this.q = new THREE.Quaternion();
        this.e = new THREE.Euler();
        this.v = new THREE.Vector3();
        this.s = new THREE.Vector3();
    }

    makePoints(n, colour, size, additive, colours = false) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        if (colours) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
        g.setDrawRange(0, 0);
        const mat = new THREE.PointsMaterial({ color: colour, size, sizeAttenuation: true, transparent: true, depthWrite: false, vertexColors: colours, map: dotTexture(additive), alphaTest: additive ? 0 : 0.5, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
        const p = new THREE.Points(g, mat);
        p.frustumCulled = false;
        this.scene.add(p);
        return p;
    }

    // ---------- fish ----------
    // find still or running water near the player and keep a few schools in it
    refreshSchools(px, pz) {
        const W = this.world;
        this.schools = this.schools.filter((s) => Math.hypot(s.x - px, s.z - pz) < SCHOOL_R * 1.3);
        const want = 9;
        const spots = [];
        for (const p of W.ponds) {
            if (Math.hypot(p.x - px, p.z - pz) < SCHOOL_R) spots.push({ x: p.x, z: p.z, r: p.R * 0.55, y: p.surface, depth: p.depth });
        }
        for (let k = 0; k < 40 && spots.length < want * 2; k++) {
            const line = W.riverLines[Math.floor(Math.random() * W.riverLines.length)];
            const pt = line[Math.floor(Math.random() * line.length)];
            if (Math.hypot(pt.x - px, pt.z - pz) > SCHOOL_R) continue;
            const s = W.surface(pt.x, pt.z);
            if (s.depth > 1.4) spots.push({ x: pt.x, z: pt.z, r: Math.min(8, pt.w * 0.3), y: s.water, depth: s.depth });
        }
        for (let k = 0; k < 20 && spots.length < want; k++) {
            const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * SCHOOL_R;
            const x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
            const s = W.surface(x, z);
            if (s.depth > 2) spots.push({ x, z, r: 8, y: s.water, depth: s.depth });
        }
        spots.sort(() => Math.random() - 0.5);
        for (const sp of spots) {
            if (this.schools.length >= want) break;
            if (this.schools.some((s) => Math.hypot(s.x - sp.x, s.z - sp.z) < 10)) continue;
            const n = 5 + Math.floor(Math.random() * 9);
            const len = 0.35 + Math.random() * 0.7;
            const colour = new THREE.Color(FISH_COLOURS[Math.floor(Math.random() * FISH_COLOURS.length)]);
            this.schools.push({ ...sp, n, len, colour, a: Math.random() * 6, dir: Math.random() < 0.5 ? 1 : -1, scare: 0, speed: 0.5 + Math.random() * 0.4, members: Array.from({ length: n }, () => ({ o: Math.random() * 6.28, rr: 0.4 + Math.random() * 0.6, dy: Math.random(), alive: true })) });
        }
    }

    // a fish within reach of Spino's snout, if any (eaten if `take`)
    fishNear(x, y, z, reach, take = false) {
        for (const f of this.fish) {
            if (!f.member.alive) continue;
            if (Math.hypot(f.x - x, f.z - z) < reach && Math.abs(f.y - y) < 2.5) {
                if (take) { f.member.alive = false; f.school.scare = 3; }
                return f;
            }
        }
        return null;
    }

    updateFish(dt, time, player) {
        const { m, q, e, v, s } = this;
        this.fish = [];
        let i = 0;
        for (const sc of this.schools) {
            const dp = Math.hypot(player.pos.x - sc.x, player.pos.z - sc.z);
            if (dp < sc.r + player.len * 0.6 && player.swimming) sc.scare = 2.5;
            sc.scare = Math.max(0, sc.scare - dt);
            const sp = sc.speed * (1 + sc.scare * 1.5);
            sc.a += dt * sp * sc.dir / Math.max(2, sc.r * 0.5);
            sc.members.forEach((mb, k) => {
                if (!mb.alive || i >= MAX_FISH) return;
                const a = sc.a + mb.o * 0.35 + k * 0.4;
                const r = sc.r * mb.rr * (1 + sc.scare * 0.35);
                const x = sc.x + Math.cos(a) * r + Math.sin(time * 1.3 + k) * 0.4, z = sc.z + Math.sin(a) * r;
                const y = sc.y - 0.35 - mb.dy * Math.min(1.2, sc.depth * 0.4);
                // now and then one leaps clear
                let jump = 0;
                const jt = (time * 0.11 + k * 0.37 + sc.a * 0.01) % 1;
                if (k === 0 && jt < 0.03) jump = Math.sin(jt / 0.03 * Math.PI) * (0.8 + sc.len);
                if (k === 0 && jt < 0.002 + dt * 0.11 && jt > 0.002) this.water.ripple(x, z, time, 0.6);
                if (k === 0 && jt > 0.028 && jt < 0.028 + dt * 0.11) { this.water.ripple(x, z, time, 0.8); this.splash(x, sc.y, z, 6, 0.5); }
                e.set(jump > 0 ? Math.cos(jt / 0.03 * Math.PI) * -0.8 : 0, -a - sc.dir * Math.PI / 2, 0, 'YXZ');
                q.setFromEuler(e);
                const L = sc.len * (0.8 + mb.rr * 0.4);
                m.compose(v.set(x, y + jump, z), q, s.set(L, L, L));
                this.fishMesh.setMatrixAt(i, m);
                this.fishMesh.setColorAt(i, sc.colour);
                this.fish.push({ x, y: y + jump, z, member: mb, school: sc });
                i++;
            });
        }
        this.fishMesh.count = i;
        this.fishMesh.instanceMatrix.needsUpdate = true;
        if (this.fishMesh.instanceColor) this.fishMesh.instanceColor.needsUpdate = true;
    }

    // ---------- fliers ----------
    updateFliers(dt, time, player, night) {
        const { m, q, e, v, s } = this;
        if (this.flocks.length < 3 && Math.random() < dt * 0.3 && !night) {
            const a = Math.random() * 6.28, d = 60 + Math.random() * 200;
            this.flocks.push({
                x: player.pos.x + Math.cos(a) * d, z: player.pos.z + Math.sin(a) * d, h: 35 + Math.random() * 50,
                r: 25 + Math.random() * 40, a: Math.random() * 6, n: 5 + Math.floor(Math.random() * 9), size: 0.8 + Math.random() * 1.6,
                drift: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4], life: 60 + Math.random() * 60,
                colour: new THREE.Color().setHSL(Math.random() < 0.5 ? 0.05 : 0.6, 0.2, 0.3 + Math.random() * 0.3)
            });
        }
        let i = 0;
        for (const f of this.flocks) {
            f.life -= dt * (night ? 4 : 1);
            f.a += dt * 6 / f.r;
            f.x += f.drift[0] * dt; f.z += f.drift[1] * dt;
            for (let k = 0; k < f.n && i < 60; k++) {
                const a = f.a + k * 0.16;
                const r = f.r + Math.sin(k * 2.3) * 6;
                const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
                const g = this.world.height(f.x, f.z);
                const y = Math.max(g, this.world.seaLevel) + f.h + Math.sin(time * 0.8 + k) * 3 + k * 0.7;
                e.set(0.35, -a - Math.PI / 2, 0, 'YXZ');
                q.setFromEuler(e);
                const flap = Math.sin(time * (9 - f.size) + k * 1.7);
                const sz = f.size * 2.2;
                m.compose(v.set(x, y, z), q, s.set(sz, sz * (0.2 + 0.8 * flap), sz));
                this.flierMesh.setMatrixAt(i, m);
                this.flierMesh.setColorAt(i, f.colour);
                i++;
            }
        }
        this.flocks = this.flocks.filter((f) => f.life > 0 && Math.hypot(f.x - player.pos.x, f.z - player.pos.z) < 500);
        this.flierMesh.count = i;
        this.flierMesh.instanceMatrix.needsUpdate = true;
        if (this.flierMesh.instanceColor) this.flierMesh.instanceColor.needsUpdate = true;
    }

    // ---------- fireflies ----------
    updateFlies(dt, time, player, night) {
        const want = night > 0.5 ? 140 : 0;
        while (this.flyData.length < want) {
            const a = Math.random() * 6.28, d = 6 + Math.random() * 70;
            const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
            const sf = this.world.surface(x, z);
            this.flyData.push({ x, z, y: Math.max(sf.ground, sf.water ?? -99) + 0.6 + Math.random() * 2.5, p: Math.random() * 6 });
        }
        if (want === 0) this.flyData.length = 0;
        const pos = this.flies.geometry.attributes.position;
        this.flyData = this.flyData.filter((f) => Math.hypot(f.x - player.pos.x, f.z - player.pos.z) < 90);
        this.flyData.forEach((f, i) => {
            const blink = Math.sin(time * 2 + f.p * 3) > 0.2 ? 1 : 0;
            pos.setXYZ(i, f.x + Math.sin(time * 0.5 + f.p) * 1.5, blink ? f.y + Math.sin(time * 0.7 + f.p * 2) * 0.6 : -9999, f.z + Math.cos(time * 0.4 + f.p) * 1.5);
        });
        pos.needsUpdate = true;
        this.flies.geometry.setDrawRange(0, this.flyData.length);
        this.flies.material.opacity = Math.min(1, night * 1.5);
    }

    // ---------- splashes and blood ----------
    splash(x, y, z, n = 12, power = 1, colour = null) {
        for (let k = 0; k < n; k++) {
            if (this.dropData.length >= 240) this.dropData.shift();
            const a = Math.random() * 6.28, sp = (1 + Math.random() * 2.5) * power;
            this.dropData.push({ x, y, z, vx: Math.cos(a) * sp, vy: (2.5 + Math.random() * 3.5) * power, vz: Math.sin(a) * sp, life: 0.8 + Math.random() * 0.6, c: colour });
        }
    }

    blood(x, y, z, n = 10) { this.splash(x, y, z, n, 0.7, [0.62, 0.05, 0.04]); }

    updateDrops(dt) {
        const pos = this.drops.geometry.attributes.position, col = this.drops.geometry.attributes.color;
        this.dropData = this.dropData.filter((d) => (d.life -= dt) > 0);
        this.dropData.forEach((d, i) => {
            d.vy -= 9.8 * dt;
            d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
            pos.setXYZ(i, d.x, d.y, d.z);
            const c = d.c || [0.92, 0.97, 1];
            col.setXYZ(i, c[0], c[1], c[2]);
        });
        pos.needsUpdate = true;
        col.needsUpdate = true;
        this.drops.geometry.setDrawRange(0, this.dropData.length);
    }

    update(dt, time, player, night) {
        if (time - this.lastSchools > 2) {
            this.refreshSchools(player.pos.x, player.pos.z);
            this.lastSchools = time;
        }
        this.updateFish(dt, time, player);
        this.updateFliers(dt, time, player, night > 0.5);
        this.updateFlies(dt, time, player, night);
        this.updateDrops(dt);
    }
}
