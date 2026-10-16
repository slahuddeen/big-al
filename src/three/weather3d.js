// ==================== WEATHER EFFECTS ====================
// Rain, the odd lightning flash, and quiet signs of the wind: a few faint
// streaks curling downwind, and leaves (or dust in the dry season) tumbling
// past. Everything lives in a box around the camera target and is recycled.
import * as THREE from 'three';

const RAIN = 900;
const STREAKS = 14;
const STREAK_PTS = 10;
const FLECKS = 40;
const BOX = 9; // half-size of the box around the camera target

const rnd = (a, b) => a + Math.random() * (b - a);

export class WeatherLayer {
    constructor(parent) {
        this.group = new THREE.Group();
        parent.add(this.group);

        // ---- rain: short slanted lines ----
        this.drops = Array.from({ length: RAIN }, () => ({ x: rnd(-BOX, BOX), y: rnd(0, 7), z: rnd(-BOX, BOX), s: rnd(0.8, 1.2) }));
        const rg = new THREE.BufferGeometry();
        rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN * 6), 3));
        this.rainMat = new THREE.LineBasicMaterial({ color: '#d4e4f2', transparent: true, opacity: 0, depthWrite: false, fog: false });
        this.rain = new THREE.LineSegments(rg, this.rainMat);
        this.rain.frustumCulled = false;
        this.rain.renderOrder = 9;
        this.rain.visible = false;
        this.group.add(this.rain);

        // ---- wind streaks: faint curling lines that fade in and out ----
        this.streaks = Array.from({ length: STREAKS }, () => ({ life: 0, dur: 0, x: 0, y: 0, z: 0, len: 1, curl: 0, phase: 0 }));
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * (STREAK_PTS - 1) * 6), 3));
        sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(STREAKS * (STREAK_PTS - 1) * 8), 4));
        this.streakMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false });
        this.streakLines = new THREE.LineSegments(sg, this.streakMat);
        this.streakLines.frustumCulled = false;
        this.streakLines.renderOrder = 9;
        this.group.add(this.streakLines);

        // ---- leaves and dust ----
        const leaf = new THREE.BufferGeometry();
        leaf.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.035, 0, 0, 0, 0.014, 0, -0.035, 0, 0, 0, -0.014, 0, 0.035, 0, 0, -0.035, 0, 0]), 3));
        leaf.setIndex([0, 1, 2, 0, 2, 3]);
        leaf.computeVertexNormals();
        this.fleckMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
        this.flecks = new THREE.InstancedMesh(leaf, this.fleckMat, FLECKS);
        this.flecks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.flecks.frustumCulled = false;
        this.flecks.renderOrder = 7;
        this.fleckState = Array.from({ length: FLECKS }, () => ({ life: 0, dur: 0, pos: new THREE.Vector3(), vy: 0, spin: new THREE.Vector3(), rot: new THREE.Euler(), size: 1, dust: false }));
        for (let i = 0; i < FLECKS; i++) this.flecks.setColorAt(i, new THREE.Color('#6a9a3a'));
        this.group.add(this.flecks);
        this.dummy = new THREE.Object3D();
        this.tmpColor = new THREE.Color();

        this.flash = 0;
        this.nextFlash = rnd(3, 8);
        this.thunder = null;
    }

    // centre: camera target; wind: {x, z (unit dir), strength}; rain 0..1 (storm > 1); dry 0..1; zoom: camera zoom
    update(dt, time, { centre, wind, rain, storm, dry, zoom = 1 }) {
        const box = BOX / Math.max(0.5, zoom);
        const wx = wind.x * wind.strength;
        const wz = wind.z * wind.strength;

        // ---- rain ----
        const rainA = Math.min(1, rain);
        this.rain.visible = rainA > 0.01;
        if (this.rain.visible) {
            this.rainMat.opacity = rainA * (0.32 + storm * 0.12);
            const pos = this.rain.geometry.attributes.position.array;
            const fall = 9 + storm * 4;
            const n = Math.floor(RAIN * Math.min(1, 0.35 + rainA * 0.65));
            for (let i = 0; i < RAIN; i++) {
                const d = this.drops[i];
                d.y -= fall * d.s * dt;
                d.x += wx * 3.2 * dt;
                d.z += wz * 3.2 * dt;
                if (d.y < 0 || Math.abs(d.x) > box || Math.abs(d.z) > box) {
                    d.y = rnd(5, 7.5);
                    d.x = rnd(-box, box) - wx * 2;
                    d.z = rnd(-box, box) - wz * 2;
                }
                const o = i * 6;
                if (i >= n) {
                    pos.fill(0, o, o + 6);
                    continue;
                }
                const x = centre.x + d.x;
                const z = centre.z + d.z;
                const y = centre.y + d.y;
                const l = 0.09 * d.s * (1 + storm * 0.4);
                pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
                pos[o + 3] = x - wx * 0.35 * l; pos[o + 4] = y + fall * l * 0.11 * 3; pos[o + 5] = z - wz * 0.35 * l;
            }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }

        // ---- wind streaks: more of them, longer-lived, as the wind picks up ----
        const sPos = this.streakLines.geometry.attributes.position.array;
        const sCol = this.streakLines.geometry.attributes.color.array;
        const active = Math.round(STREAKS * Math.max(0, wind.strength - 0.15) / 0.85);
        const tint = rain > 0.2 ? [0.85, 0.9, 0.95] : dry > 0.5 ? [1, 0.95, 0.82] : [1, 1, 0.96];
        for (let i = 0; i < STREAKS; i++) {
            const s = this.streaks[i];
            s.life += dt;
            if (s.life >= s.dur) {
                if (i < active) {
                    s.life = 0;
                    s.dur = rnd(2.2, 3.6);
                    s.x = centre.x + rnd(-box * 0.7, box * 0.7) - wx * 2;
                    s.z = centre.z + rnd(-box * 0.7, box * 0.7) - wz * 2;
                    s.y = centre.y + rnd(0.25, 1.4);
                    s.len = rnd(0.9, 1.6) * (0.7 + wind.strength * 0.5);
                    s.curl = Math.random() < 0.35 ? rnd(0.8, 1.3) : 0; // some make a little loop
                    s.phase = rnd(0, 6);
                } else s.dur = 0;
            }
            const alive = s.dur > 0;
            const k = alive ? s.life / s.dur : 1;
            // the line slides downwind and its visible stretch travels along it
            const fade = alive ? Math.sin(Math.PI * k) : 0;
            const head = k * 1.4;
            for (let j = 0; j < STREAK_PTS - 1; j++) {
                for (let e = 0; e < 2; e++) {
                    const u = (j + e) / (STREAK_PTS - 1);
                    const a = (head - 0.4 + u * 0.4) * s.len * 2.2; // distance along the wind
                    const side = Math.sin(a * 2.2 + s.phase) * 0.12;
                    let lx = a;
                    let ly = Math.sin(a * 1.6 + s.phase) * 0.06;
                    let lz = side;
                    if (s.curl) {
                        // a single loop midway along, like a gust curling round
                        const t = Math.max(0, Math.min(1, (a - s.len * 0.9) / 0.5));
                        if (t > 0 && t < 1) {
                            const ang = t * Math.PI * 2;
                            lx = s.len * 0.9 + Math.sin(ang) * 0.2 * s.curl + t * 0.5;
                            ly += (1 - Math.cos(ang)) * 0.16 * s.curl;
                        } else if (t >= 1) lx = a;
                    }
                    const o = ((i * (STREAK_PTS - 1) + j) * 2 + e);
                    sPos[o * 3] = s.x + wind.x * lx - wind.z * lz;
                    sPos[o * 3 + 1] = s.y + ly;
                    sPos[o * 3 + 2] = s.z + wind.z * lx + wind.x * lz;
                    const edge = Math.sin(Math.PI * u);
                    sCol[o * 4] = tint[0];
                    sCol[o * 4 + 1] = tint[1];
                    sCol[o * 4 + 2] = tint[2];
                    sCol[o * 4 + 3] = fade * edge * (0.22 + wind.strength * 0.18);
                }
            }
        }
        this.streakLines.geometry.attributes.position.needsUpdate = true;
        this.streakLines.geometry.attributes.color.needsUpdate = true;

        // ---- leaves and dust ----
        const want = Math.round(FLECKS * Math.min(1, 0.05 + wind.strength * 0.7) * (1 - Math.min(0.6, rain * 0.5)));
        for (let i = 0; i < FLECKS; i++) {
            const f = this.fleckState[i];
            f.life += dt;
            if (f.life >= f.dur) {
                if (i < want) {
                    f.life = 0;
                    f.dur = rnd(3.5, 6.5);
                    f.dust = dry > 0.4 && Math.random() < dry * 0.6;
                    f.pos.set(centre.x + rnd(-box, box) - wx * 3, centre.y + (f.dust ? rnd(0.05, 0.5) : rnd(0.4, 2.2)), centre.z + rnd(-box, box) - wz * 3);
                    f.vy = f.dust ? rnd(-0.02, 0.06) : rnd(-0.35, -0.12);
                    f.spin.set(rnd(-4, 4), rnd(-3, 3), rnd(-5, 5));
                    f.size = f.dust ? rnd(0.3, 0.6) : rnd(0.8, 1.3);
                    // wet season: green leaves; dry: brown and straw leaves and pale dust
                    if (f.dust) this.tmpColor.set('#d8c49a');
                    else if (dry > 0.5) this.tmpColor.set(Math.random() < 0.5 ? '#9a6a32' : '#c09a4a');
                    else this.tmpColor.set(Math.random() < 0.7 ? '#5f9a34' : '#8ab040');
                    this.flecks.setColorAt(i, this.tmpColor);
                    this.flecks.instanceColor.needsUpdate = true;
                } else f.dur = 0;
            }
            const alive = f.dur > 0 && f.life < f.dur;
            const k = alive ? f.life / f.dur : 1;
            const sc = alive ? Math.min(1, k * 5, (1 - k) * 5) * f.size : 0;
            if (alive) {
                const flutter = Math.sin(time * 3 + i) * 0.4;
                f.pos.x += (wx * (f.dust ? 2.6 : 1.9) + wind.z * flutter * 0.3) * dt;
                f.pos.z += (wz * (f.dust ? 2.6 : 1.9) - wind.x * flutter * 0.3) * dt;
                f.pos.y = Math.max(centre.y + 0.02, f.pos.y + (f.vy + Math.sin(time * 2 + i * 1.3) * 0.12) * dt);
                f.rot.x += f.spin.x * dt;
                f.rot.y += f.spin.y * dt;
                f.rot.z += f.spin.z * dt;
            }
            this.dummy.position.copy(f.pos);
            this.dummy.rotation.copy(f.rot);
            this.dummy.scale.setScalar(sc);
            this.dummy.updateMatrix();
            this.flecks.setMatrixAt(i, this.dummy.matrix);
        }
        this.flecks.instanceMatrix.needsUpdate = true;

        // ---- lightning ----
        this.flash = Math.max(0, this.flash - dt * 3.2);
        let thunder = 0;
        if (storm > 0.5) {
            this.nextFlash -= dt;
            if (this.nextFlash <= 0) {
                this.flash = rnd(0.7, 1);
                // a double flicker now and then
                this.nextFlash = Math.random() < 0.3 ? rnd(0.12, 0.25) : rnd(5, 12);
                this.thunder = rnd(0.6, 1.6);
            }
        }
        if (this.thunder !== null) {
            this.thunder -= dt;
            if (this.thunder <= 0) {
                this.thunder = null;
                thunder = 1;
            }
        }
        return { flash: this.flash, thunder };
    }

    dispose() {
        this.rain.geometry.dispose();
        this.rainMat.dispose();
        this.streakLines.geometry.dispose();
        this.streakMat.dispose();
        this.flecks.geometry.dispose();
        this.fleckMat.dispose();
    }
}
