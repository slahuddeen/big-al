// ==================== WILDLIFE AT REAL SCALE ====================
// Animals from the Spino game, drawn at their real lengths and given simple real-time
// minds: plant-eaters graze in herds, wander down to drink and bolt together, predators
// stalk and bite, scavengers gather at a kill while pterosaurs wheel over it, fish keep to
// the water. Each spawns in the habitats the map game uses, near the player, and is
// forgotten again once far behind. The Spino abilities act on them through here: a
// raking claw leaves them bleeding (and a trail to follow), a sail display drives the
// smaller ones off, and a bite from under the water lands before they know you're there.
import * as THREE from 'three';
import { buildCreatureModel } from '../three/creatures3d.js';
import { addOutlines } from '../three/outline.js';
import { animateModel } from '../three/animation.js';
import { SPECIES_DATA, HABITAT_SPECIES, GROUP_SIZE, FLYERS, AQUATIC, SEMI_AQUATIC, TOUGHNESS, BODY_LENGTH_M, activityFactor } from '../data/species.js';

const MIN_WEIGHT = 8; // anything smaller is too small to notice at this scale (water life aside)
const MIN_WEIGHT_WET = 2;
const MAX_ALIVE = 36;
const PREDATORS = new Set(['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'aerial_predator', 'territorial']);
const MAX_TRAIL = 160;

export const lengthOf = (species) => {
    const d = SPECIES_DATA[species];
    if (BODY_LENGTH_M[species]) return BODY_LENGTH_M[species];
    const L = 0.72 * Math.cbrt(d.weight);
    return FLYERS.has(species) ? L * 2.2 : Math.max(0.6, L);
};
const article = (s) => (/^[AEIOU]/.test(s) ? 'An' : 'A');

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
    constructor(species, x, z, world, ctx, scene, group) {
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
        this.group = group;
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
        this.bleed = 0;
        this.stun = 0;
        this.graze = 0;
        this.walk = this.aquatic ? 2 + this.len * 0.25 : 1.2 + this.len * 0.22;
        this.run = this.aquatic ? 4 + this.len * 0.6 : Math.min(15, 3 + this.len * 0.75);
        this.anchor = new THREE.Vector3(x, 0, z);
        this.fly = { r: 25 + Math.random() * 25, a: Math.random() * 6, h: 22 + Math.random() * 20 };
        this.rippleT = Math.random();
        // outline shells, hidden at a distance where they would be under a pixel anyway
        this.hulls = [];
        this.model.root.traverse((o) => { if (o.userData.outline) this.hulls.push(o); });
        this.hullsOn = true;
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
    constructor(world, scene, ctx, hud, water, ambient) {
        this.world = world;
        this.scene = scene;
        this.ctx = ctx;
        this.hud = hud;
        this.water = water;
        this.ambient = ambient;
        this.list = [];
        this.spawnTimer = 0;
        this.time = 0;
        // blood trail: flat red splashes on the ground
        const g = new THREE.CircleGeometry(0.5, 7);
        g.rotateX(-Math.PI / 2);
        this.trail = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: '#8a0e0a', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), MAX_TRAIL);
        this.trail.count = 0;
        this.trail.frustumCulled = false;
        this.trailI = 0;
        scene.add(this.trail);
    }

    pickSpecies(terrain, phase, wet = false) {
        const table = HABITAT_SPECIES[terrain];
        if (!table) return null;
        const opts = Object.entries(table).filter(([s]) => {
            const d = SPECIES_DATA[s];
            if (!d) return false;
            const w = AQUATIC.has(s) || SEMI_AQUATIC.has(s);
            if (wet && !w) return false;
            return d.weight >= (w ? MIN_WEIGHT_WET : MIN_WEIGHT);
        });
        let total = 0;
        const w = opts.map(([s, p]) => { const v = p * activityFactor(s, phase); total += v; return v; });
        if (!total) return null;
        let r = Math.random() * total;
        for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i][0]; }
        return opts[opts.length - 1][0];
    }

    // a spot in water near the player: a river channel, a pond, a lake or the sea
    waterSpot(player) {
        const W = this.world;
        if (Math.random() < 0.45) {
            const near = W.ponds.filter((p) => { const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z); return d > 40 && d < 280; });
            if (near.length) {
                const p = near[Math.floor(Math.random() * near.length)];
                return { x: p.x, z: p.z, terrain: p.terrain === 'mangrove' ? 'mangrove' : 'river', pond: p };
            }
        }
        for (let k = 0; k < 12; k++) {
            const line = W.riverLines[Math.floor(Math.random() * W.riverLines.length)];
            const pt = line[Math.floor(Math.random() * line.length)];
            const d = Math.hypot(pt.x - player.pos.x, pt.z - player.pos.z);
            if (d < 50 || d > 300) continue;
            if (W.surface(pt.x, pt.z).depth > 2) return { x: pt.x, z: pt.z, terrain: 'river' };
        }
        const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 180;
        const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
        const s = W.surface(x, z);
        return s.depth > 2.5 && s.cell ? { x, z, terrain: s.cell.terrain === 'sea' ? 'sea' : 'river' } : null;
    }

    spawnAround(player, phase) {
        let x, z, terrain, wet = false, pond = null;
        if (Math.random() < 0.3) {
            const w = this.waterSpot(player);
            if (!w) return;
            ({ x, z, terrain, pond } = w);
            wet = true;
        } else {
            const a = Math.random() * Math.PI * 2;
            // big herds show up further out, where you can see them across the plain
            const d = 90 + Math.random() * 230;
            x = player.pos.x + Math.cos(a) * d; z = player.pos.z + Math.sin(a) * d;
            terrain = this.world.cellAt(x, z)?.terrain;
        }
        if (!terrain) return;
        const species = this.pickSpecies(terrain, phase, wet);
        if (!species) return;
        const big = SPECIES_DATA[species].weight > 3000;
        const dist = Math.hypot(x - player.pos.x, z - player.pos.z);
        if (big && dist < 140) return;
        if (pond && lengthOf(species) > pond.R * 0.6) return;
        const [g0, g1] = GROUP_SIZE[species] || [1, 1];
        let n = g0 + Math.floor(Math.random() * (g1 - g0 + 1));
        if (!PREDATORS.has(SPECIES_DATA[species].behaviorType) && g1 > 1) n = Math.min(10, n + 2); // herds a little bigger than on the map
        if (FLYERS.has(species) && this.list.filter((c) => c.flyer).length >= 5) return;
        if (big && this.list.filter((c) => !c.dead && c.data.weight > 3000).length >= 5) return;
        const group = { id: ++uid, members: [] };
        const spread = Math.min(30, 6 + lengthOf(species) * 2);
        for (let i = 0; i < n; i++) {
            const c = new Creature(species, x + (Math.random() - 0.5) * spread, z + (Math.random() - 0.5) * spread, this.world, this.ctx, this.scene, group);
            if (!c.fits(this.world, c.pos.x, c.pos.z)) { this.remove(c); continue; }
            group.members.push(c);
            this.list.push(c);
        }
    }

    remove(c) {
        this.scene.remove(c.model.root);
        c.model.mat.dispose();
    }

    // the creature (alive or a carcass) a bite from `player` would hit
    biteTarget(player, reach = player.reach, arc = 1.0) {
        const head = player.headPos();
        let best = null, bd = Infinity;
        for (const c of this.list) {
            if (c.gone) continue;
            const d = Math.hypot(c.pos.x - head.x, c.pos.z - head.z) - c.radius;
            const dy = Math.abs(c.pos.y + c.len * 0.15 - head.y);
            if (d > reach || dy > player.len * 0.6 + c.len * 0.3) continue;
            const ang = Math.atan2(-(c.pos.z - player.pos.z), c.pos.x - player.pos.x);
            const da = Math.abs(((ang - player.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (da > arc && d > 1.5) continue;
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

    kill(c) {
        c.dead = true;
        c.bleed = 0;
        c.meat = Math.min(100, 8 + Math.pow(c.data.weight, 0.55) * 1.2);
        c.speed = 0;
    }

    // a bite or a claw rake. kind: 'bite' | 'claw'; mult scales the damage (ambush, dash)
    strike(player, kind = 'bite', mult = 1) {
        const claw = kind === 'claw';
        const c = this.biteTarget(player, claw ? player.reach * 0.8 : player.reach, claw ? 1.3 : 1.0);
        if (!c) return null;
        if (c.dead) {
            if (claw) return null;
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
        const unaware = c.state === 'wander' || c.state === 'drink' || c.state === 'scavenge';
        let dmg = Math.max(6, Math.min(400, 55 * Math.pow(ratio, 0.35) / (TOUGHNESS[c.species] || 1))) * mult;
        if (claw) {
            // the thumb claw opens a wound that keeps bleeding
            dmg *= 0.45;
            c.bleed = Math.max(c.bleed, 14);
        }
        c.hp -= dmg;
        c.hurt = 0.4;
        const head = player.headPos();
        this.ambient.blood(head.x, head.y, head.z, claw ? 16 : 10);
        if (mult > 1.5 && unaware) c.stun = 1.6;
        if (c.hp <= 0) {
            this.kill(c);
            this.hud.say(`You killed the ${c.species}. Bite it to feed.`);
        } else {
            // anything that can fight back turns on you; the rest bolt, and the herd with them
            if ((c.predator || c.giant || c.data.behaviorType === 'defensive') && !claw) c.state = 'attack';
            else this.alarm(c, player);
            c.timer = 6;
            if (claw) this.hud.say(`The ${c.species} is bleeding. Follow the trail.`);
        }
        return { hit: dmg, c, ambush: mult > 1.5 && unaware };
    }

    // send an animal and its herd running from the player
    alarm(c, player) {
        const flee = (o) => {
            if (o.dead || o.state === 'attack') return;
            o.state = 'flee';
            o.timer = 6 + Math.random() * 4;
        };
        flee(c);
        if (c.group) for (const o of c.group.members) if (o.pos.distanceTo(c.pos) < 60) flee(o);
    }

    // the sail display: smaller animals scatter, scavengers leave a kill, a big hunter may take it as a challenge
    display(player) {
        let fled = 0, angered = null;
        for (const c of this.list) {
            if (c.dead || c.gone || c.flyer) continue;
            const d = c.pos.distanceTo(player.pos);
            if (d > 70) continue;
            if (c.data.weight < player.weight * 0.6) {
                if (c.state !== 'flee') fled++;
                this.alarm(c, player);
                c.timer = 10;
            } else if (c.predator && Math.random() < 0.5) {
                c.state = 'attack';
                c.timer = 12;
                c.attackCD = 2;
                angered = c;
            }
        }
        return { fled, angered };
    }

    // drop a blood splash on the ground
    drip(x, z) {
        const m = new THREE.Matrix4();
        const s = 0.6 + Math.random() * 0.9;
        const y = this.world.height(x, z) + 0.05;
        m.compose(new THREE.Vector3(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6), new THREE.Vector3(s, 1, s * (0.6 + Math.random() * 0.6)));
        this.trail.setMatrixAt(this.trailI, m);
        this.trailI = (this.trailI + 1) % MAX_TRAIL;
        this.trail.count = Math.min(MAX_TRAIL, this.trail.count + 1);
        this.trail.instanceMatrix.needsUpdate = true;
    }

    update(dt, time, player, phase) {
        const W = this.world;
        this.time = time;
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 0.4;
            if (this.list.filter((c) => !c.dead).length < MAX_ALIVE) this.spawnAround(player, phase);
        }
        const carcasses = this.list.filter((c) => c.dead && !c.gone && c.meat > 1);
        for (const c of this.list) {
            const dx = player.pos.x - c.pos.x, dz = player.pos.z - c.pos.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 460 || c.gone) { c.gone = true; continue; }
            const showHulls = dist < 110;
            if (showHulls !== c.hullsOn) { c.hullsOn = showHulls; for (const h of c.hulls) h.visible = showHulls; }
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
            // bleeding: losing strength and leaving a trail
            if (c.bleed > 0) {
                c.bleed -= dt;
                c.hp -= dt * 2.2;
                c.dripT = (c.dripT || 0) - dt;
                if (c.dripT <= 0) { c.dripT = 0.5; this.drip(c.pos.x, c.pos.z); }
                if (c.hp <= 0) { this.kill(c); this.hud.say(`The ${c.species} has bled out.`); continue; }
            }
            c.stun = Math.max(0, c.stun - dt);
            this.think(c, dt, player, dist, dx, dz, carcasses);
            this.move(c, dt, time);
            // predators bite when they reach the player
            c.attackCD -= dt;
            if (c.state === 'attack' && dist < c.len * 0.55 + player.len * 0.35 && c.attackCD <= 0 && !player.dead) {
                c.attackCD = 1.8;
                c.jaw = 1;
                const dmg = Math.max(1, Math.min(30, 9 * Math.sqrt(c.data.danger / player.weight)));
                player.hurt(dmg, c.species);
            }
            // feeding at a kill
            if (c.state === 'scavenge' && c.target && !c.target.gone && c.pos.distanceTo(c.target.pos) < c.len * 0.6 + c.target.len * 0.4) {
                c.target.meat -= dt * 0.6;
                c.jaw = Math.max(c.jaw, Math.abs(Math.sin(time * 4 + c.id)));
                if (c.target.meat <= 0.5) c.target.gone = true;
            }
            c.jaw = Math.max(0, c.jaw - dt * 3);
            c.phase += dt * c.speed / Math.max(0.4, c.len * 0.18);
            const still = c.speed < 0.3;
            c.graze += (((still && !c.predator && (c.state === 'wander' || c.state === 'drink')) ? 1 : 0) - c.graze) * Math.min(1, dt * 2);
            animateModel(c.model, time, {
                phase: c.phase, moving: Math.min(1, c.speed / c.walk), jaw: c.jaw, attack: c.jaw * 0.6,
                graze: c.graze * (c.state === 'drink' ? 1 : 0.8), sniff: c.predator && c.state === 'wander' && still ? 1 : 0,
                rest: c.stun > 0 ? 0.6 : 0, call: c.call || 0
            });
            // ripples where they wade or swim
            const s = W.surface(c.pos.x, c.pos.z);
            if (s.depth > 0.3 && !c.flyer) {
                c.rippleT -= dt * (0.6 + c.speed * 0.4);
                if (c.rippleT <= 0) { c.rippleT = 1; this.water.ripple(c.pos.x, c.pos.z, time, Math.min(2, 0.4 + c.len * 0.12)); }
            }
        }
        // forget the gone
        for (const c of this.list) if (c.gone) this.remove(c);
        this.list = this.list.filter((c) => !c.gone);
        for (const c of this.list) if (c.group) c.group.members = c.group.members.filter((o) => !o.gone);
    }

    think(c, dt, player, dist, dx, dz, carcasses) {
        c.timer -= dt;
        if (c.stun > 0) { c.want = 0; return; }
        const size = player.weight / c.data.weight;
        const hidden = player.submerged;
        if (c.flyer) {
            // pterosaurs drift over to circle low above a kill
            const k = carcasses.find((o) => o.pos.distanceTo(c.anchor) < 220);
            if (k) { c.anchor.lerp(k.pos, Math.min(1, dt * 0.2)); c.fly.h += (10 - c.fly.h) * dt * 0.1; c.fly.r += (14 - c.fly.r) * dt * 0.1; }
            c.state = 'circle';
            return;
        }
        // hunters go for a player they think they can take, unless it has sunk out of sight
        if (c.predator && c.state !== 'flee' && !player.dead && !hidden && c.data.danger > player.weight * 0.08 && dist < 70 && c.data.weight * 2.5 > player.weight) {
            if (c.state !== 'attack' && Math.random() < dt * 0.35) {
                c.state = 'attack';
                c.timer = 12;
                c.attackCD = 2.5; // a moment to react before the first bite
                this.hud.say(`${article(c.species)} ${c.species} is coming for you!`);
            }
        }
        if (c.state === 'attack' && hidden && !c.aquatic && !c.amphibious && Math.random() < dt * 1.5) {
            c.state = 'wander';
            this.hud.say(`The ${c.species} has lost you.`);
        }
        // small things bolt when the player comes close (much closer if it is hidden in the water)
        const notice = hidden ? 4 + c.len : 18 + c.len * 2 + Math.min(40, size * 2);
        if (c.state !== 'attack' && !c.giant && size > 0.6 && dist < notice) {
            if (c.state !== 'flee') this.alarm(c, player);
        }
        if (c.state === 'attack' && (c.timer <= 0 || dist > 120 || player.dead)) c.state = 'wander';
        if (c.state === 'flee' && c.timer <= 0 && dist > 40) c.state = 'wander';
        if (c.state === 'attack') { c.goal = { x: player.pos.x, z: player.pos.z }; c.want = c.run; return; }
        if (c.state === 'flee') {
            // the wounded flee slower and slower
            const weak = c.bleed > 0 ? 0.55 + c.hp / 250 : 1;
            c.goal = { x: c.pos.x - dx / (dist || 1) * 30, z: c.pos.z - dz / (dist || 1) * 30 };
            c.want = c.run * weak;
            return;
        }
        // scavengers: smaller hunters smell a kill and come to feed
        if (c.predator && c.state === 'wander' && !c.aquatic && c.data.weight < 2500 && Math.random() < dt * 0.25) {
            const k = carcasses.find((o) => o.pos.distanceTo(c.pos) < 160 && o.pos.distanceTo(player.pos) > 12);
            if (k) { c.state = 'scavenge'; c.target = k; c.timer = 40; }
        }
        if (c.state === 'scavenge') {
            if (!c.target || c.target.gone || c.timer <= 0 || (dist < 14 && size > 1.5)) { c.state = 'wander'; c.target = null; }
            else {
                const near = c.pos.distanceTo(c.target.pos) < c.len * 0.6 + c.target.len * 0.4;
                c.goal = near ? null : { x: c.target.pos.x, z: c.target.pos.z };
                c.want = near ? 0 : c.walk * 1.4;
                return;
            }
        }
        if (c.state === 'drink') {
            if (c.timer <= 0) c.state = 'wander';
            else { c.goal = null; c.want = 0; if (Math.random() < dt) this.water.ripple(c.pos.x + Math.cos(c.yaw) * c.len * 0.5, c.pos.z - Math.sin(c.yaw) * c.len * 0.5, this.time, 0.5); return; }
        }
        // wander: amble about the herd's ground, sometimes down to the water to drink
        if (!c.goal || c.timer <= 0 || Math.hypot(c.goal.x - c.pos.x, c.goal.z - c.pos.z) < 2) {
            if (c.goal && c.goal.drink) { c.state = 'drink'; c.timer = 5 + Math.random() * 6; c.goal = null; c.want = 0; return; }
            if (Math.random() < 0.45) { c.goal = null; c.want = 0; c.timer = 3 + Math.random() * 6; return; }
            const lead = c.group && c.group.members[0] !== c && !c.group.members[0].dead ? c.group.members[0] : null;
            const base = lead ? lead.pos : c.pos;
            if (!c.aquatic && !c.flyer && Math.random() < 0.15) {
                const w = this.drinkSpot(c);
                if (w) { c.goal = w; c.want = c.walk; c.timer = 25; return; }
            }
            for (let k = 0; k < 6; k++) {
                const a = Math.random() * Math.PI * 2, r = (lead ? 4 : 10) + Math.random() * (lead ? 14 + c.len : 35);
                const gx = base.x + Math.cos(a) * r, gz = base.z + Math.sin(a) * r;
                if (c.fits(this.world, gx, gz)) { c.goal = { x: gx, z: gz }; break; }
            }
            c.want = c.walk;
            c.timer = 8 + Math.random() * 6;
        }
    }

    // the edge of some water within a short walk
    drinkSpot(c) {
        const W = this.world;
        for (let k = 0; k < 10; k++) {
            const a = Math.random() * Math.PI * 2;
            for (let r = 8; r < 70; r += 6) {
                const x = c.pos.x + Math.cos(a) * r, z = c.pos.z + Math.sin(a) * r;
                const s = W.surface(x, z);
                if (s.water !== null && s.depth > 0.2) {
                    // stop a few metres short, on dry ground
                    const bx = c.pos.x + Math.cos(a) * (r - c.len * 0.4 - 1), bz = c.pos.z + Math.sin(a) * (r - c.len * 0.4 - 1);
                    return c.fits(W, bx, bz) ? { x: bx, z: bz, drink: true } : null;
                }
            }
        }
        return null;
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
            const d = ((target - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            c.yaw += Math.max(-1, Math.min(1, d)) * dt * (2.5 + 6 / (1 + c.len * 0.3));
            if (Math.abs(d) > 1.6) want *= 0.3;
        } else want = 0;
        c.speed += (want - c.speed) * Math.min(1, dt * 2);
        const nx = c.pos.x + Math.cos(c.yaw) * c.speed * dt, nz = c.pos.z - Math.sin(c.yaw) * c.speed * dt;
        if (c.fits(W, nx, nz)) { c.pos.x = nx; c.pos.z = nz; } else { c.goal = null; c.speed *= 0.5; c.yaw += Math.PI * 0.5 * dt * 4; }
        // herd members keep a little apart
        if (c.group && c.group.members.length > 1) {
            for (const o of c.group.members) {
                if (o === c || o.dead) continue;
                const ox = c.pos.x - o.pos.x, oz = c.pos.z - o.pos.z;
                const d = Math.hypot(ox, oz), min = (c.len + o.len) * 0.35;
                if (d < min && d > 0.01) { c.pos.x += ox / d * (min - d) * 0.5; c.pos.z += oz / d * (min - d) * 0.5; }
            }
        }
        const s = W.surface(c.pos.x, c.pos.z);
        const swim = s.water !== null && (c.aquatic || s.depth > c.len * 0.18);
        const y = swim ? s.water - (c.aquatic ? Math.min(s.depth * 0.5, c.len * 0.3 + 0.4) : c.len * 0.18) : s.ground;
        c.pos.y += (y - c.pos.y) * Math.min(1, dt * 8);
        c.model.root.position.copy(c.pos);
        c.model.root.rotation.set(0, c.yaw, 0);
    }
}
