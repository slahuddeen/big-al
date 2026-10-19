// ==================== WILDLIFE AT REAL SCALE ====================
// Animals from the Spino game, drawn at their real lengths and given simple real-time
// minds: plant-eaters graze and bolt, predators stalk and bite, fish keep to the water,
// pterosaurs circle overhead. Each spawns in the habitats the map game uses, near the
// player, and is forgotten again once far behind.
import * as THREE from 'three';
import { buildCreatureModel } from '../three/creatures3d.js';
import { addOutlines } from '../three/outline.js';
import { animateModel } from '../three/animation.js';
import { SPECIES_DATA, HABITAT_SPECIES, GROUP_SIZE, FLYERS, AQUATIC, SEMI_AQUATIC, TOUGHNESS, BODY_LENGTH_M, activityFactor } from '../data/species.js';

const MIN_WEIGHT = 8; // anything smaller is too small to notice at this scale
const MAX_ALIVE = 28;
const PREDATORS = new Set(['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'aerial_predator', 'territorial']);

export const lengthOf = (species) => {
    const d = SPECIES_DATA[species];
    if (BODY_LENGTH_M[species]) return BODY_LENGTH_M[species];
    const L = 0.72 * Math.cbrt(d.weight);
    return FLYERS.has(species) ? L * 2.2 : Math.max(0.6, L);
};

// ---------- templates (one per species) and cheap copies ----------
const templates = new Map();
const instantiate = (species, ctx) => {
    if (!templates.has(species)) {
        const t = buildCreatureModel(species, ctx);
        addOutlines(t.root, ctx.outline, (m) => m.material === ctx.wingMat);
        templates.set(species, t);
    }
    const t = templates.get(species);
    const pathOf = (obj) => {
        const p = [];
        while (obj && obj !== t.root) { p.unshift(obj.parent.children.indexOf(obj)); obj = obj.parent; }
        return p;
    };
    const root = t.root.clone(true);
    const resolve = (obj) => (obj ? pathOf(obj).reduce((o, i) => o.children[i], root) : null);
    const P = t.parts;
    const mat = ctx.mat.clone();
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material === ctx.mat) o.material = mat; } });
    return {
        root, mat, gait: t.gait, flapSpeed: t.flapSpeed, height: t.height,
        inner: resolve(t.inner), body: resolve(t.body),
        parts: {
            legs: P.legs.map((l) => ({ ...l, pivot: resolve(l.pivot) })), arms: P.arms.map((a) => ({ ...a, pivot: resolve(a.pivot) })),
            wings: P.wings.map((w) => ({ ...w, pivot: resolve(w.pivot) })), tail: P.tail.map(resolve), neck: P.neck.map(resolve),
            segs: P.segs.map(resolve), head: resolve(P.head), jaw: resolve(P.jaw)
        }
    };
};

let uid = 0;
class Creature {
    constructor(species, x, z, world, ctx, scene) {
        this.id = ++uid;
        this.species = species;
        this.data = SPECIES_DATA[species];
        this.model = instantiate(species, ctx);
        this.model.seed = this.id;
        this.len = lengthOf(species) * (0.8 + Math.random() * 0.25);
        this.model.root.scale.setScalar(this.len);
        this.aquatic = AQUATIC.has(species);
        this.amphibious = SEMI_AQUATIC.has(species);
        this.flyer = FLYERS.has(species);
        this.predator = PREDATORS.has(this.data.behaviorType);
        this.giant = this.data.behaviorType === 'giant_herbivore';
        this.pos = new THREE.Vector3(x, 0, z);
        this.yaw = Math.random() * Math.PI * 2;
        this.speed = 0;
        this.phase = Math.random() * 10;
        this.hp = 100;
        this.state = 'wander';
        this.target = null;
        this.timer = Math.random() * 4;
        this.attackCD = 0;
        this.jaw = 0;
        this.dead = false;
        this.meat = 0;
        this.walk = this.aquatic ? 2 + this.len * 0.25 : 1.2 + this.len * 0.22;
        this.run = this.aquatic ? 4 + this.len * 0.6 : Math.min(15, 3 + this.len * 0.75);
        this.anchor = new THREE.Vector3(x, 0, z);
        this.fly = { r: 25 + Math.random() * 25, a: Math.random() * 6, h: 22 + Math.random() * 20 };
        scene.add(this.model.root);
    }

    get radius() { return this.len * 0.3; }

    // can this animal be at (x, z)?
    fits(world, x, z) {
        const s = world.surface(x, z);
        if (!s.cell) return false;
        if (this.flyer) return true;
        if (this.aquatic) return s.depth > Math.min(3, this.len * 0.35 + 0.6);
        if (this.amphibious) return true;
        return s.depth < Math.max(0.8, this.len * 0.12);
    }
}

export class Fauna {
    constructor(world, scene, ctx, hud) {
        this.world = world;
        this.scene = scene;
        this.ctx = ctx;
        this.hud = hud;
        this.list = [];
        this.spawnTimer = 0;
    }

    pickSpecies(terrain, phase) {
        const table = HABITAT_SPECIES[terrain];
        if (!table) return null;
        const opts = Object.entries(table).filter(([s]) => SPECIES_DATA[s] && SPECIES_DATA[s].weight >= MIN_WEIGHT);
        let total = 0;
        const w = opts.map(([s, p]) => { const v = p * activityFactor(s, phase); total += v; return v; });
        if (!total) return null;
        let r = Math.random() * total;
        for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i][0]; }
        return opts[opts.length - 1][0];
    }

    // a spot in deep water near the player (rivers are narrow, so random points rarely hit them)
    waterSpot(player) {
        const W = this.world;
        for (let k = 0; k < 12; k++) {
            const line = W.riverLines[Math.floor(Math.random() * W.riverLines.length)];
            const pt = line[Math.floor(Math.random() * line.length)];
            const d = Math.hypot(pt.x - player.pos.x, pt.z - player.pos.z);
            if (d < 50 || d > 300) continue;
            if (W.surface(pt.x, pt.z).depth > 2) return { x: pt.x, z: pt.z, terrain: 'river' };
        }
        // or out in a lake or the sea
        const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 180;
        const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
        const s = W.surface(x, z);
        return s.depth > 2.5 && s.cell ? { x, z, terrain: s.cell.terrain === 'sea' ? 'sea' : 'river' } : null;
    }

    spawnAround(player, phase) {
        let x, z, terrain;
        if (Math.random() < 0.35) {
            const w = this.waterSpot(player);
            if (!w) return;
            ({ x, z, terrain } = w);
        } else {
            const a = Math.random() * Math.PI * 2;
            const d = 90 + Math.random() * 170;
            x = player.pos.x + Math.cos(a) * d; z = player.pos.z + Math.sin(a) * d;
            terrain = this.world.cellAt(x, z)?.terrain;
        }
        if (!terrain) return;
        const species = this.pickSpecies(terrain, phase);
        if (!species) return;
        const [g0, g1] = GROUP_SIZE[species] || [1, 1];
        const n = g0 + Math.floor(Math.random() * (g1 - g0 + 1));
        // big animals are rarer: keep the giants and big hunters to one or two at a time
        if (FLYERS.has(species) && this.list.filter((c) => c.flyer).length >= 4) return;
        const big = SPECIES_DATA[species].weight > 3000;
        if (big && this.list.filter((c) => !c.dead && c.data.weight > 3000).length >= 3) return;
        for (let i = 0; i < n; i++) {
            const c = new Creature(species, x + (Math.random() - 0.5) * 18, z + (Math.random() - 0.5) * 18, this.world, this.ctx, this.scene);
            if (!c.fits(this.world, c.pos.x, c.pos.z)) { this.remove(c); continue; }
            this.list.push(c);
        }
    }

    remove(c) {
        this.scene.remove(c.model.root);
        c.model.mat.dispose();
    }

    // the creature (alive or a carcass) a bite from `player` would hit
    biteTarget(player) {
        const head = player.headPos();
        let best = null, bd = Infinity;
        for (const c of this.list) {
            if (c.gone) continue;
            const d = Math.hypot(c.pos.x - head.x, c.pos.z - head.z) - c.radius;
            const dy = Math.abs(c.pos.y + c.len * 0.15 - head.y);
            if (d > player.reach || dy > player.len * 0.6 + c.len * 0.3) continue;
            const ang = Math.atan2(-(c.pos.z - player.pos.z), c.pos.x - player.pos.x);
            let da = Math.abs(((ang - player.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (da > 1.0 && d > 1.5) continue;
            if (d < bd) { bd = d; best = c; }
        }
        return best;
    }

    // what the crosshair is on: the animal nearest the camera's line of sight
    looking(camera, maxDist = 60) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        let best = null, bs = Infinity;
        for (const c of this.list) {
            if (c.gone) continue;
            const to = c.pos.clone().add(new THREE.Vector3(0, c.len * 0.2, 0)).sub(camera.position);
            const along = to.dot(dir);
            if (along < 0 || along > maxDist + 40) continue;
            const off = to.clone().addScaledVector(dir, -along).length() - c.radius * 1.4;
            if (off < 2 && along < bs) { bs = along; best = c; }
        }
        return best;
    }

    bite(player) {
        const c = this.biteTarget(player);
        if (!c) return null;
        if (c.dead) {
            // tear off a mouthful
            const take = Math.min(c.meat, 22);
            c.meat -= take;
            player.eat(take);
            if (c.meat <= 0.5) {
                this.hud.say(`You have finished the ${c.species}.`);
                c.gone = true;
            }
            return { eat: take, c };
        }
        const ratio = player.weight / c.data.weight;
        const dmg = Math.max(6, Math.min(400, 55 * Math.pow(ratio, 0.35) / (TOUGHNESS[c.species] || 1)));
        c.hp -= dmg;
        c.hurt = 0.4;
        if (c.hp <= 0) {
            c.dead = true;
            c.meat = Math.min(100, 8 + Math.pow(c.data.weight, 0.55) * 1.2);
            c.speed = 0;
            this.hud.say(`You killed the ${c.species}. Bite it to feed.`);
        } else {
            // anything that can fight back turns on you; the rest bolt
            if (c.predator || c.giant || c.data.behaviorType === 'defensive') c.state = 'attack';
            else c.state = 'flee';
            c.timer = 6;
        }
        return { hit: dmg, c };
    }

    update(dt, time, player, phase) {
        const W = this.world;
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 0.4;
            if (this.list.filter((c) => !c.dead).length < MAX_ALIVE) this.spawnAround(player, phase);
        }
        for (const c of this.list) {
            const dx = player.pos.x - c.pos.x, dz = player.pos.z - c.pos.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 420 || c.gone) { c.gone = true; continue; }
            c.hurt = Math.max(0, (c.hurt || 0) - dt);
            c.model.mat.emissive.setRGB(c.hurt * 1.6, 0, 0);
            if (c.dead) {
                // a carcass lies on its side
                c.model.root.rotation.x += (Math.PI / 2 * 0.95 - c.model.root.rotation.x) * Math.min(1, dt * 3);
                const s = W.surface(c.pos.x, c.pos.z);
                c.pos.y = Math.max(s.ground, s.water !== null && c.aquatic ? s.water - 0.5 : s.ground) + c.len * 0.06;
                c.model.root.position.copy(c.pos);
                continue;
            }
            this.think(c, dt, player, dist, dx, dz);
            this.move(c, dt, time);
            // predators bite when they reach the player
            c.attackCD -= dt;
            if (c.state === 'attack' && dist < c.len * 0.55 + player.len * 0.35 && c.attackCD <= 0 && !player.dead) {
                c.attackCD = 1.8;
                c.jaw = 1;
                const dmg = Math.max(1, Math.min(30, 9 * Math.sqrt(c.data.danger / player.weight)));
                player.hurt(dmg, c.species);
            }
            c.jaw = Math.max(0, c.jaw - dt * 3);
            c.phase += dt * c.speed / Math.max(0.4, c.len * 0.18);
            animateModel(c.model, time, { phase: c.phase, moving: Math.min(1, c.speed / c.walk), jaw: c.jaw, attack: c.jaw * 0.6 });
        }
        // forget the gone
        for (const c of this.list) if (c.gone) this.remove(c);
        this.list = this.list.filter((c) => !c.gone);
    }

    think(c, dt, player, dist, dx, dz) {
        c.timer -= dt;
        const size = player.weight / c.data.weight;
        if (c.flyer) { c.state = 'circle'; return; }
        // hunters go for a player they think they can take
        if (c.predator && c.state !== 'flee' && !player.dead && c.data.danger > player.weight * 0.08 && dist < 70 && c.data.weight * 2.5 > player.weight) {
            if (c.state !== 'attack' && Math.random() < dt * 0.35) {
                c.state = 'attack';
                c.timer = 12;
                c.attackCD = 2.5; // a moment to react before the first bite
                this.hud.say(`${/^[AEIOU]/.test(c.species) ? 'An' : 'A'} ${c.species} is coming for you!`);
            }
        }
        // small things bolt when the player comes close
        if (c.state !== 'attack' && !c.giant && size > 0.6 && dist < 18 + c.len * 2 + Math.min(40, size * 2)) {
            if (c.state !== 'flee') { c.state = 'flee'; c.timer = 5 + Math.random() * 3; }
        }
        if (c.state === 'attack' && (c.timer <= 0 || dist > 120 || player.dead)) c.state = 'wander';
        if (c.state === 'flee' && c.timer <= 0 && dist > 40) c.state = 'wander';
        if (c.state === 'attack') { c.goal = { x: player.pos.x, z: player.pos.z }; c.want = c.run; return; }
        if (c.state === 'flee') { c.goal = { x: c.pos.x - dx / (dist || 1) * 30, z: c.pos.z - dz / (dist || 1) * 30 }; c.want = c.run; return; }
        // wander: amble to a nearby spot, then graze or rest a while
        if (!c.goal || c.timer <= 0 || Math.hypot(c.goal.x - c.pos.x, c.goal.z - c.pos.z) < 2) {
            if (Math.random() < 0.45) { c.goal = null; c.want = 0; c.timer = 3 + Math.random() * 5; return; }
            for (let k = 0; k < 6; k++) {
                const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 35;
                const gx = c.pos.x + Math.cos(a) * r, gz = c.pos.z + Math.sin(a) * r;
                if (c.fits(this.world, gx, gz)) { c.goal = { x: gx, z: gz }; break; }
            }
            c.want = c.walk;
            c.timer = 8 + Math.random() * 6;
        }
    }

    move(c, dt, time) {
        const W = this.world;
        if (c.state === 'circle') {
            c.fly.a += dt * (8 / c.fly.r);
            const x = c.anchor.x + Math.cos(c.fly.a) * c.fly.r, z = c.anchor.z + Math.sin(c.fly.a) * c.fly.r;
            const g = W.surface(x, z);
            c.pos.set(x, Math.max(g.ground, g.water ?? -99) + c.fly.h + Math.sin(time * 0.7 + c.id) * 2, z);
            c.yaw = c.fly.a + Math.PI;
            c.speed = c.walk;
            c.model.root.position.copy(c.pos);
            c.model.root.rotation.set(0, c.yaw, 0.25);
            return;
        }
        let want = c.want || 0;
        if (c.goal) {
            const gx = c.goal.x - c.pos.x, gz = c.goal.z - c.pos.z;
            const target = Math.atan2(-gz, gx);
            let d = ((target - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            c.yaw += Math.max(-1, Math.min(1, d)) * dt * (2.5 + 6 / (1 + c.len * 0.3));
            if (Math.abs(d) > 1.6) want *= 0.3;
        } else want = 0;
        c.speed += (want - c.speed) * Math.min(1, dt * 2);
        const nx = c.pos.x + Math.cos(c.yaw) * c.speed * dt, nz = c.pos.z - Math.sin(c.yaw) * c.speed * dt;
        if (c.fits(W, nx, nz)) { c.pos.x = nx; c.pos.z = nz; } else { c.goal = null; c.speed *= 0.5; c.yaw += Math.PI * 0.5 * dt * 4; }
        const s = W.surface(c.pos.x, c.pos.z);
        const swim = s.water !== null && (c.aquatic || s.depth > c.len * 0.18);
        const y = swim ? s.water - (c.aquatic ? Math.min(s.depth * 0.5, c.len * 0.3 + 0.4) : c.len * 0.18) : s.ground;
        c.pos.y += (y - c.pos.y) * Math.min(1, dt * 8);
        c.model.root.position.copy(c.pos);
        c.model.root.rotation.set(0, c.yaw, 0);
    }
}
