// ==================== SPINO, UP CLOSE ====================
// A sub-adult Spinosaurus, about 9.5 m long, driven like a third-person game: WASD moves
// relative to the camera, the mouse looks around, Shift sprints, the left button bites.
// In water deeper than its legs it swims, faster and lower in the water than on land.
// It carries over the Spino game's abilities: submerging to hide and ambush, sniffing out
// prey, a lunging dash, the sail display, the bleeding rake of the thumb claw, and it has
// to drink and rest as well as eat.
import * as THREE from 'three';
import { buildSpino, CREATURE_STYLE } from '../three/creatures3d.js';
import { addOutlines } from '../three/outline.js';
import { animateModel } from '../three/animation.js';
import { addCreatureInk } from './materials.js';

const WALK = 5.5, SPRINT = 11, SWIM = 8, SWIM_SPRINT = 13, DASH = 24, DASH_SWIM = 21;
const DEEP = 2.6; // water deeper than this is swum, not waded

// the action bar, in the order it is shown
export const ABILITIES = [
    { id: 'bite', key: 'Click', name: 'Bite', cd: 0.75, desc: 'Bite whatever is in front of your snout. In the water, snap up fish. Bite a kill to feed.' },
    { id: 'claw', key: 'Q', name: 'Thumb Claw', cd: 3, desc: 'Rake with the huge thumb claws. A lighter wound, but it keeps bleeding: follow the trail.' },
    { id: 'dash', key: 'Space', name: 'Dash', cd: 5, stamina: 18, desc: 'A lunge on land or a surge of the tail in the water. Nothing can hurt you as you go.' },
    { id: 'submerge', key: 'C', name: 'Submerge', desc: 'In deep water, sink until only your eyes and sail show. Land hunters lose you; a bite from below is an ambush.' },
    { id: 'sniff', key: 'F', name: 'Sniff', cd: 10, desc: 'Smell the wind: shows animals, kills and blood nearby for a few seconds.' },
    { id: 'display', key: 'R', name: 'Sail Display', cd: 12, stamina: 12, desc: 'Turn side-on and flush your sail. Smaller animals scatter. A big hunter may take it as a challenge.' },
    { id: 'drink', key: 'E', name: 'Drink', desc: 'Hold at the water\'s edge or in the shallows to drink.' },
    { id: 'rest', key: 'Z', name: 'Rest', desc: 'Hold to lie down and heal while time passes quickly. Not with hunters about.' }
];

export class Player {
    constructor(world, terrain, scene, ctx) {
        this.world = world;
        this.terrain = terrain;
        // the player is seen closest of all: finer still, with pale flecks over the dark hide
        const d = CREATURE_STYLE.detail;
        CREATURE_STYLE.detail = 2.1;
        this.model = buildSpino(3, ctx, undefined, { spec: { spots: '#5a5a66', spotCount: 60, spotSize: 0.06 } });
        CREATURE_STYLE.detail = d;
        addOutlines(this.model.root, ctx.outline, (m) => m.material === ctx.wingMat);
        // its own copy of the material, so the sail can flush and a wound can flash
        this.mat = addCreatureInk(ctx.mat.clone());
        this.model.root.traverse((o) => { if (o.isMesh && o.material === ctx.mat) o.material = this.mat; });
        this.model.seed = 7;
        this.len = 9.5;
        this.weight = 2500;
        this.model.root.scale.setScalar(this.len);
        this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(this.model.root);
        this.pos = new THREE.Vector3(world.spawn.x, 0, world.spawn.z);
        this.pos.y = world.height(this.pos.x, this.pos.z);
        this.yaw = 0;
        this.speed = 0;
        this.phase = 0;
        this.health = 100;
        this.hunger = 80;
        this.thirst = 75;
        this.stamina = 100;
        this.breath = 100;
        this.biteT = 0;
        this.hurtT = 0;
        this.dead = false;
        this.swimming = false;
        this.submerged = false;
        this.dashT = 0;
        this.displayT = 0;
        this.sniffT = 0;
        this.clawT = 0;
        this.drinking = false;
        this.resting = false;
        this.cd = {};
        this.reach = this.len * 0.42;
        this.rippleT = 0;
        this.fx = null; // { water, ambient }, set by the game
        // camera rig
        this.camYaw = Math.PI * 0.5;
        this.camPitch = 0.28;
        this.camDist = 17;
        this.camPos = new THREE.Vector3();
        this.camAt = new THREE.Vector3();
    }

    headPos() {
        return new THREE.Vector3(this.pos.x + Math.cos(this.yaw) * this.len * 0.42, this.pos.y + this.len * 0.22, this.pos.z - Math.sin(this.yaw) * this.len * 0.42);
    }

    cooldown(id) { return Math.max(0, this.cd[id] || 0); }

    // start an ability if it is ready; returns true if it began
    use(id) {
        if (this.dead || this.resting) return false;
        const a = ABILITIES.find((x) => x.id === id);
        if (this.cooldown(id) > 0 || (a.stamina && this.stamina < a.stamina)) return false;
        if (a.cd) this.cd[id] = a.cd;
        if (a.stamina) this.stamina -= a.stamina;
        if (id === 'bite') this.biteT = 0.35;
        if (id === 'claw') this.clawT = 0.45;
        if (id === 'dash') { this.dashT = 0.5; this.speed = this.swimming ? DASH_SWIM : DASH; }
        if (id === 'sniff') this.sniffT = 9;
        if (id === 'display') this.displayT = 1.8;
        return true;
    }

    toggleSubmerge() {
        if (this.submerged) { this.submerged = false; return 'surface'; }
        if (!this.swimming || this.breath < 15) return 'shallow';
        this.submerged = true;
        return 'down';
    }

    eat(amount) {
        this.hunger = Math.min(100, this.hunger + amount);
        this.health = Math.min(100, this.health + amount * 0.25);
    }

    hurt(dmg, by) {
        if (this.dead || this.dashT > 0) return;
        this.health -= dmg;
        this.hurtT = 0.6;
        this.lastHurtBy = by;
        if (this.resting) this.resting = false;
        if (this.health <= 0) { this.health = 0; this.dead = true; }
    }

    // input: keys, plus held flags for drink and rest; threat: a hunter is close
    update(dt, time, input, threat = false) {
        const W = this.world;
        for (const k in this.cd) this.cd[k] -= dt;
        // ---- camera-relative movement ----
        const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
        const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
        let mx = 0, mz = 0;
        if (!this.dead) {
            if (input.keys.KeyW) { mx += fx; mz += fz; }
            if (input.keys.KeyS) { mx -= fx; mz -= fz; }
            if (input.keys.KeyD) { mx += rx; mz += rz; }
            if (input.keys.KeyA) { mx -= rx; mz -= rz; }
        }
        const moving = Math.hypot(mx, mz) > 0.01;
        const s0 = W.surface(this.pos.x, this.pos.z);
        const wasSwimming = this.swimming;
        this.swimming = s0.depth > DEEP;
        if (!this.swimming) this.submerged = false;
        // holding E drinks at the water, holding Z rests (when it is safe)
        const head = this.headPos();
        const hs = W.surface(head.x, head.z);
        this.canDrink = (hs.water !== null && hs.water - hs.ground > 0.15) || s0.depth > 0.4;
        this.drinking = !this.dead && !moving && !!input.keys.KeyE && this.canDrink && !this.submerged;
        const wantRest = !this.dead && !moving && !!input.keys.KeyZ && !this.swimming;
        if (wantRest && threat && !this.resting && !this.restWarned) { this.restWarned = true; this.onEvent?.('rest-threat'); }
        if (!input.keys.KeyZ) this.restWarned = false;
        this.resting = wantRest && !threat;
        const sprint = (input.keys.ShiftLeft || input.keys.ShiftRight) && !this.submerged;
        const canSprint = sprint && this.stamina > 2 && moving;
        let want = 0;
        if (moving && !this.resting) {
            want = this.swimming ? (canSprint ? SWIM_SPRINT : SWIM) : (canSprint ? SPRINT : WALK);
            if (this.submerged) want = SWIM * 0.7;
            // turn towards the direction of travel
            const target = Math.atan2(-mz, mx);
            const d = ((target - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            this.yaw += Math.max(-1, Math.min(1, d)) * dt * 3.2;
            if (Math.abs(d) > 1.8) want *= 0.35;
        }
        if (this.displayT > 0) want *= 0.2;
        // shallow water drags at the legs
        if (!this.swimming && s0.depth > 0.6) want *= 0.75;
        if (this.dashT > 0) {
            this.dashT -= dt;
            want = this.swimming ? DASH_SWIM : DASH;
            this.speed = Math.max(this.speed, want * 0.8);
        }
        this.speed += (want - this.speed) * Math.min(1, dt * 3);
        this.stamina = Math.max(0, Math.min(100, this.stamina + (canSprint ? -14 : this.resting ? 20 : 9) * dt));
        let nx = this.pos.x + Math.cos(this.yaw) * this.speed * dt;
        let nz = this.pos.z - Math.sin(this.yaw) * this.speed * dt;
        // trunks and boulders push back
        for (const o of this.terrain.obstacles(nx, nz)) {
            const ox = nx - o.x, oz = nz - o.z;
            const d = Math.hypot(ox, oz);
            const min = o.r + this.len * 0.12;
            if (d < min && d > 0.001) { nx = o.x + (ox / d) * min; nz = o.z + (oz / d) * min; }
        }
        // the edge of the world
        nx = Math.max(20, Math.min(W.width - 20, nx));
        nz = Math.max(20, Math.min(W.depth - 20, nz));
        // too steep a climb stops you
        const s1 = W.surface(nx, nz);
        const climb = (s1.ground - s0.ground) / Math.max(0.01, Math.hypot(nx - this.pos.x, nz - this.pos.z));
        if (climb < 1.4 || this.swimming) { this.pos.x = nx; this.pos.z = nz; } else this.speed *= 0.5;
        const s = W.surface(this.pos.x, this.pos.z);
        const y = s.depth > DEEP ? s.water - this.len * (this.submerged ? 0.3 : 0.17) : s.ground;
        this.pos.y += (y - this.pos.y) * Math.min(1, dt * (this.submerged ? 3 : 10));
        this.inWater = s.depth > 0.3;
        this.waterY = s.water;

        // ---- splashes and ripples ----
        if (this.fx) {
            if (this.swimming && !wasSwimming && this.speed > 2) {
                this.fx.ambient.splash(this.pos.x, s.water, this.pos.z, 28, 1.4);
                this.fx.sound?.event('splash', { size: 1.4 });
                this.fx.water.ripple(this.pos.x, this.pos.z, time, 2);
            }
            if (this.inWater) {
                this.rippleT -= dt * (0.8 + this.speed * 0.35);
                if (this.rippleT <= 0) {
                    this.rippleT = 1;
                    this.fx.water.ripple(this.pos.x, this.pos.z, time, this.swimming ? 1.6 : 1);
                    if (this.speed > 7 && !this.submerged) this.fx.ambient.splash(head.x, s.water, head.z, 6, 0.8);
                }
            }
        }

        // ---- body ----
        this.biteT = Math.max(0, this.biteT - dt);
        this.clawT = Math.max(0, this.clawT - dt);
        this.hurtT = Math.max(0, this.hurtT - dt);
        this.displayT = Math.max(0, this.displayT - dt);
        this.sniffT = Math.max(0, this.sniffT - dt);
        const b = this.biteT > 0 ? Math.sin((1 - this.biteT / 0.35) * Math.PI) : 0;
        const cl = this.clawT > 0 ? Math.sin((1 - this.clawT / 0.45) * Math.PI) : 0;
        const show = this.displayT > 0 ? Math.min(1, Math.sin((1 - this.displayT / 1.8) * Math.PI) * 1.6) : 0;
        this.restK = (this.restK || 0) + ((this.resting ? 1 : 0) - (this.restK || 0)) * Math.min(1, dt * 2);
        this.phase += dt * this.speed / (this.len * 0.17);
        this.model.root.position.copy(this.pos);
        this.model.root.rotation.set(0, this.yaw, 0);
        animateModel(this.model, time, {
            phase: this.phase, moving: Math.min(1.4, this.speed / WALK), jaw: Math.max(b, show * 0.8, this.drinking ? Math.abs(Math.sin(time * 3)) * 0.3 : 0, 0.05),
            attack: Math.max(b, cl * 0.7), rest: this.dead ? 1 : this.restK, rear: show * 0.45 + cl * 0.2, call: show,
            graze: this.drinking ? 1 : 0, sniff: this.sniffT > 7.8 ? 1 : 0, crouch: this.submerged ? 1 : 0, look: 0
        });
        if (this.dead) this.model.root.rotation.z = -0.15;
        // the sail flushes red in a display; a wound flashes
        this.mat.emissive.setRGB(show * 0.55 + this.hurtT * 1.2, show * 0.05, 0);

        // ---- needs ----
        const drain = this.resting ? 2.2 : 1;
        this.hunger = Math.max(0, this.hunger - dt * (0.3 + (canSprint ? 0.3 : 0)) * drain);
        this.thirst = Math.max(0, this.thirst - dt * (0.26 + (canSprint ? 0.3 : 0)) * drain);
        if (this.drinking) {
            this.thirst = Math.min(100, this.thirst + dt * 14);
            this.lapT = (this.lapT || 0) - dt;
            if (this.lapT <= 0) { this.lapT = 0.45; this.fx?.sound?.event('drink'); this.fx?.water.ripple(head.x, head.z, time, 0.5); }
        }
        if (this.submerged) {
            this.breath -= dt * 4;
            if (this.breath <= 0) { this.breath = 0; this.submerged = false; this.onEvent?.('breath'); }
        } else this.breath = Math.min(100, this.breath + dt * 20);
        if (this.hunger <= 0) this.hurt(dt * 1.5, 'hunger');
        if (this.thirst <= 0) this.hurt(dt * 1.8, 'thirst');
        else if (this.hunger > 40 && this.thirst > 30 && !this.dead) this.health = Math.min(100, this.health + dt * (this.resting ? 3.5 : 0.8));
    }

    updateCamera(camera, dt, input) {
        this.camYaw -= input.dx * 0.0032;
        this.camPitch = Math.max(-0.15, Math.min(1.1, this.camPitch + input.dy * 0.0026));
        this.camDist = Math.max(10, Math.min(60, this.camDist * Math.pow(1.0015, input.wheel)));
        const at = new THREE.Vector3(this.pos.x, this.pos.y + this.len * 0.35, this.pos.z);
        this.camAt.lerp(at, Math.min(1, dt * 10));
        if (this.camAt.lengthSq() < 1) this.camAt.copy(at);
        const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
        const want = new THREE.Vector3(
            this.camAt.x + Math.sin(this.camYaw) * cp * this.camDist,
            this.camAt.y + sp * this.camDist + 1,
            this.camAt.z + Math.cos(this.camYaw) * cp * this.camDist
        );
        // keep the camera above the ground and the water
        const g = this.world.surface(want.x, want.z);
        want.y = Math.max(want.y, g.ground + 1.6, (g.water ?? -99) + 0.6);
        this.camPos.lerp(want, Math.min(1, dt * 12));
        if (this.camPos.lengthSq() < 1) this.camPos.copy(want);
        camera.position.copy(this.camPos);
        camera.lookAt(this.camAt);
    }
}
