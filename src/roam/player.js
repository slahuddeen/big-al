// ==================== SPINO, UP CLOSE ====================
// A sub-adult Spinosaurus, about 9.5 m long, driven like a third-person game: WASD moves
// relative to the camera, the mouse looks around, Shift sprints, the left button bites.
// In water deeper than its legs it swims, faster and lower in the water than on land.
import * as THREE from 'three';
import { buildSpino, CREATURE_STYLE } from '../three/creatures3d.js';
import { addOutlines } from '../three/outline.js';
import { animateModel } from '../three/animation.js';

const WALK = 5.5, SPRINT = 11, SWIM = 8, SWIM_SPRINT = 13;

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
        this.model.seed = 7;
        this.len = 9.5;
        this.weight = 2500;
        this.model.root.scale.setScalar(this.len);
        this.model.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(this.model.root);
        this.pos = new THREE.Vector3(world.spawn.x, 0, world.spawn.z);
        this.pos.y = world.height(this.pos.x, this.pos.z);
        this.yaw = 0;
        this.vel = new THREE.Vector3();
        this.speed = 0;
        this.phase = 0;
        this.health = 100;
        this.hunger = 80;
        this.stamina = 100;
        this.biteT = 0;
        this.biteCD = 0;
        this.hurtT = 0;
        this.dead = false;
        this.swimming = false;
        this.reach = this.len * 0.42;
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

    eat(amount) {
        this.hunger = Math.min(100, this.hunger + amount);
        this.health = Math.min(100, this.health + amount * 0.25);
    }

    hurt(dmg, by) {
        if (this.dead) return;
        this.health -= dmg;
        this.hurtT = 0.6;
        this.lastHurtBy = by;
        if (this.health <= 0) { this.health = 0; this.dead = true; }
    }

    // start a bite; returns true if one began
    bite() {
        if (this.biteCD > 0 || this.dead) return false;
        this.biteCD = 0.75;
        this.biteT = 0.35;
        return true;
    }

    update(dt, time, input) {
        const W = this.world;
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
        this.swimming = s0.depth > 2.6;
        const sprint = input.keys.ShiftLeft || input.keys.ShiftRight;
        const canSprint = sprint && this.stamina > 2 && moving;
        let want = 0;
        if (moving) {
            want = this.swimming ? (canSprint ? SWIM_SPRINT : SWIM) : (canSprint ? SPRINT : WALK);
            // turn towards the direction of travel
            const target = Math.atan2(-mz, mx);
            const d = ((target - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            this.yaw += Math.max(-1, Math.min(1, d)) * dt * 3.2;
            if (Math.abs(d) > 1.8) want *= 0.35;
        }
        // shallow water drags at the legs
        if (!this.swimming && s0.depth > 0.6) want *= 0.75;
        this.speed += (want - this.speed) * Math.min(1, dt * 3);
        this.stamina = Math.max(0, Math.min(100, this.stamina + (canSprint ? -14 : 9) * dt));
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
        const y = s.depth > 2.6 ? s.water - this.len * 0.17 : s.ground;
        this.pos.y += (y - this.pos.y) * Math.min(1, dt * 10);

        // ---- body ----
        this.biteT = Math.max(0, this.biteT - dt);
        this.biteCD = Math.max(0, this.biteCD - dt);
        this.hurtT = Math.max(0, this.hurtT - dt);
        const b = this.biteT > 0 ? Math.sin((1 - this.biteT / 0.35) * Math.PI) : 0;
        this.phase += dt * this.speed / (this.len * 0.17);
        this.model.root.position.copy(this.pos);
        this.model.root.rotation.set(0, this.yaw, 0);
        animateModel(this.model, time, {
            phase: this.phase, moving: Math.min(1.2, this.speed / WALK), jaw: Math.max(b, 0.05), attack: b,
            rest: this.dead ? 1 : 0, look: 0
        });
        if (this.dead) this.model.root.rotation.z = -0.15;

        // ---- needs ----
        this.hunger = Math.max(0, this.hunger - dt * (0.32 + (canSprint ? 0.35 : 0)));
        if (this.hunger <= 0) this.hurt(dt * 1.5, 'hunger');
        else if (this.hunger > 40 && !this.dead) this.health = Math.min(100, this.health + dt * 0.8);
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
