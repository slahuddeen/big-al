// ==================== WORLD RENDERER ====================
// Owns the Three.js scene and mirrors the React game state into it: terrain
// tiles, creatures, Big Al, carcasses, markers, lighting and ambient effects.
// The game logic stays in the reducer; this class only *shows* it.
import * as THREE from 'three';
import { createMaterials, sharedUniforms } from './materials.js';
import { buildCell, buildOutline, cellSurfaceY, randomPointInCell } from './cells3d.js';
import { buildCreatureModel, buildBigAl } from './creatures3d.js';
import { animateModel } from './animation.js';
import { MeshBuilder, blob, limb, loft, mulberry32, hashString } from './lowpoly.js';
import { getWorld } from '../world/worldGen.js';
import { SPECIES_DATA } from '../data/species.js';
import { getTimeOfDay, DAY_LENGTH } from '../game/gameConstants.js';

const DETAIL_RADIUS = 13; // cells closer than this to the camera target get full decoration
const PLAYER_CELL_GROW = 0.18; // Big Al's cell swells into a little stage so animals fit around him
const ELEV = 0.64;
const CAM_DIST = 40;
const BASE_HALF_H = 3.6;
const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
const lerpAngle = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
};

// Visual length (world units, 1 hex = ~1.7 across) from body mass in kg. The
// real range (2 g dragonfly .. 35 t Brachiosaurus) is compressed so everything
// stays readable on a hex.
export const displayLength = (massKg, minLen = 0.14) =>
    Math.max(minLen, Math.min(1.9, 0.15 * Math.pow(Math.max(massKg, 0.001) / 0.002, 0.15)));

// Lighting presets per turn of the day/night cycle
const PHASES = [
    { sun: '#ffdcb0', sunI: 2.4, sunAz: 0.4, sunEl: 0.6, sky: '#dcecff', ground: '#8a7050', hemiI: 1.35 },
    { sun: '#fff4e2', sunI: 2.5, sunAz: 1.3, sunEl: 1.05, sky: '#dcefff', ground: '#806848', hemiI: 1.25 },
    { sun: '#ff9c5a', sunI: 2.0, sunAz: 2.5, sunEl: 0.4, sky: '#ffcf9a', ground: '#5a3a3a', hemiI: 1.0 },
    { sun: '#8fa8ff', sunI: 0.85, sunAz: 3.6, sunEl: 0.95, sky: '#5a6aaa', ground: '#22223a', hemiI: 0.75 },
    { sun: '#b6a4ff', sunI: 0.7, sunAz: 5.0, sunEl: 0.7, sky: '#6a5a9a', ground: '#262034', hemiI: 0.72 }
];
export const phaseIndex = (moveNumber) => getTimeOfDay(moveNumber).turnInCycle % PHASES.length;

const GAIT_SPEED = { biped: 0.95, quad: 0.5, sprawl: 0.6, crawl: 0.35, slither: 0.45, hop: 0.7, swim: 0.45, fly: 1.1, flutter: 0.9, perched: 0 };
const WATER_LOVERS = new Set(['Fish', 'Crocodile', 'Frog', 'Turtle']);

export class WorldRenderer {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.cb = callbacks;
        this.time = 0;
        this.disposed = false;

        // ---- renderer ----
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000, 0);
        const canvas = this.renderer.domElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.touchAction = 'none';
        container.appendChild(canvas);

        // ---- scene ----
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
        this.hemi = new THREE.HemisphereLight('#dcefff', '#806848', 1.2);
        this.scene.add(this.hemi);
        this.sun = new THREE.DirectionalLight('#fff4e2', 2.4);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        Object.assign(this.sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 70 });
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias = 0.02;
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);
        this.light = { phase: -1, cur: null };

        this.mats = createMaterials();
        this.tileGroup = new THREE.Group();
        this.actorGroup = new THREE.Group();
        this.fxGroup = new THREE.Group();
        this.markerGroup = new THREE.Group();
        this.scene.add(this.tileGroup, this.actorGroup, this.fxGroup, this.markerGroup);

        // ---- world state mirrors ----
        this.tiles = new Map();
        this.outlines = new Map();
        this.world = null;
        this.worldSeed = null;
        this.lodTimer = 0;
        this.tileMeshes = [];
        this.creatures = new Map();
        this.carcasses = new Map();
        this.templates = new Map();
        this.player = null;
        this.seenLog = new Set();
        this.lastPlayerActionId = null;
        this.lastFitness = null;
        this.pendingDeaths = new Map();
        this.particles = [];
        this.smokeTimer = 0;
        this.state = null;

        this.buildMarkers();
        this.buildAmbient();

        // ---- camera ----
        this.cam = {
            target: new THREE.Vector3(), az: Math.PI / 4 + Math.PI / 12, azGoal: Math.PI / 4 + Math.PI / 12,
            zoom: 1, zoomGoal: 1, follow: true, shake: 0, aspect: 1
        };

        // ---- input ----
        this.pointer = { x: 0, y: 0, ndc: new THREE.Vector2(), dirty: false, down: null, panning: false, inside: false };
        this.hoverKey = null;
        this.raycaster = new THREE.Raycaster();
        this.keysDown = new Set();
        this.bindInput();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.clock = new THREE.Clock();
        const loop = () => {
            if (this.disposed) return;
            this.raf = requestAnimationFrame(loop);
            this.frame();
        };
        loop();
    }

    // ==================== PUBLIC API ====================
    update(state, extra = {}) {
        if (!state.worldSeed || !state.player) return;
        if (this.worldSeed !== state.worldSeed) this.resetWorld(state.worldSeed);
        const prev = this.state;
        this.state = state;
        if (!prev || prev.cells !== state.cells || this.tiles.size === 0) this.syncTiles(state.cells);
        this.syncEvents(state);
        this.syncCreatures(state);
        this.syncCarcasses(state);
        this.syncPlayer(state, prev);
        this.movable = extra.movable || [];
        this.path = extra.path || [];
        this.syncMarkers(state);
        if (!prev || prev.moveNumber !== state.moveNumber || this.light.phase < 0) this.light.phase = phaseIndex(state.moveNumber);
    }

    // New game / new map: drop everything that belonged to the old world
    resetWorld(seed) {
        for (const tile of [...this.tiles.values()]) this.removeTile(tile);
        for (const v of this.creatures.values()) {
            this.actorGroup.remove(v.model.root);
            v.model.mat.dispose();
        }
        this.creatures.clear();
        for (const vis of this.carcasses.values()) {
            this.actorGroup.remove(vis.mesh);
            vis.mesh.geometry.dispose();
        }
        this.carcasses.clear();
        this.pendingDeaths.clear();
        this.world = getWorld(seed);
        this.worldSeed = seed;
        this.state = null;
        if (this.player) {
            this.actorGroup.remove(this.player.model.root);
            this.player.model.mat.dispose();
            this.player = null;
        }
    }

    // Screen position (CSS px) of a cell centre - handy for tests and UI anchors
    projectCell(key) {
        const t = this.tiles.get(key);
        const c = this.world.byKey.get(key);
        const v = new THREE.Vector3(c.x, t ? t.surfaceY + t.group.position.y : 0.3, c.z).project(this.camera);
        const rect = this.renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
    }

    centerOnPlayer() {
        this.cam.follow = true;
    }

    rotate(dir) {
        this.cam.azGoal += (dir * Math.PI) / 3;
    }

    zoomBy(f) {
        this.cam.zoomGoal = Math.max(0.4, Math.min(2.4, this.cam.zoomGoal * f));
    }

    resetView() {
        this.cam.azGoal = Math.PI / 4 + Math.PI / 12;
        this.cam.zoomGoal = 1;
        this.cam.follow = true;
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.unbindInput();
        this.resizeObserver.disconnect();
        this.scene.traverse((o) => {
            if (o.isMesh || o.isPoints || o.isSprite) {
                o.geometry?.dispose?.();
                if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
                else o.material?.dispose?.();
            }
        });
        for (const g of this.outlines.values()) g.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    // ==================== TILES ====================
    syncTiles(cells) {
        for (const [key, cell] of cells) {
            if (!cell.discovered) continue;
            let tile = this.tiles.get(key);
            if (!tile) tile = this.createTile(key);
            const lit = !!cell.inSight;
            if (tile.lit !== lit) this.setTileLit(tile, lit);
        }
    }

    wantsDetail(x, z) {
        const t = this.cam.target;
        return Math.hypot(x - t.x, z - t.z) < DETAIL_RADIUS / Math.min(1, this.cam.zoom);
    }

    createTile(key) {
        const wc = this.world.byKey.get(key);
        const group = new THREE.Group();
        group.position.set(wc.x, -1, wc.z);
        this.tileGroup.add(group);
        const tile = {
            key, terrain: wc.terrain, group, x: wc.x, z: wc.z, lit: null, appear: 0, focus: 0,
            ground: null, water: null, lava: null, detail: null
        };
        this.buildTileMeshes(tile, this.wantsDetail(wc.x, wc.z));
        this.tiles.set(key, tile);
        return tile;
    }

    // (Re)build a tile's meshes at the given level of detail
    buildTileMeshes(tile, detail) {
        const wc = this.world.byKey.get(tile.key);
        const data = buildCell(wc, this.world, { detail });
        this.clearTileMeshes(tile);
        const ground = new THREE.Mesh(data.ground, this.mats.terrain);
        ground.castShadow = true;
        ground.receiveShadow = true;
        ground.userData.hexKey = tile.key;
        tile.group.add(ground);
        this.tileMeshes.push(ground);
        tile.ground = ground;
        if (data.water) {
            tile.water = new THREE.Mesh(data.water, this.mats.water);
            tile.water.receiveShadow = true;
            tile.water.renderOrder = 2;
            tile.group.add(tile.water);
        }
        if (data.lava) {
            tile.lava = new THREE.Mesh(data.lava, this.mats.lava);
            tile.group.add(tile.lava);
        }
        Object.assign(tile, {
            detail, surfaceY: data.surfaceY, waterY: data.waterY, pools: data.pools, smoke: data.smoke,
            localPoly: data.localPoly, inradius: data.inradius
        });
        if (tile.lit !== null) {
            const lit = tile.lit;
            tile.lit = null;
            this.setTileLit(tile, lit);
        }
    }

    clearTileMeshes(tile) {
        for (const k of ['ground', 'water', 'lava']) {
            if (tile[k]) {
                tile.group.remove(tile[k]);
                tile[k].geometry.dispose();
                tile[k] = null;
            }
        }
        this.tileMeshes = this.tileMeshes.filter((m) => m.userData.hexKey !== tile.key);
    }

    removeTile(tile) {
        this.clearTileMeshes(tile);
        this.tileGroup.remove(tile.group);
        this.tiles.delete(tile.key);
    }

    // Swap near tiles to full detail and far ones to a lighter version, a few per frame
    updateLOD() {
        let budget = 3;
        for (const tile of this.tiles.values()) {
            if (budget <= 0) break;
            const want = this.wantsDetail(tile.x, tile.z);
            if (want !== tile.detail) {
                this.buildTileMeshes(tile, want);
                budget--;
            }
        }
    }

    setTileLit(tile, lit) {
        tile.lit = lit;
        tile.ground.material = lit ? this.mats.terrain : this.mats.terrainFog;
        if (tile.water) tile.water.material = lit ? this.mats.water : this.mats.waterFog;
        if (tile.lava) tile.lava.material = lit ? this.mats.lava : this.mats.lavaFog;
    }

    cellAt(x, z) {
        return this.world ? this.world.cellAt(x, z, this.lastCellHint || 0) : null;
    }

    groundAt(x, z) {
        const c = this.cellAt(x, z);
        if (!c) return 0;
        this.lastCellHint = c.id;
        const t = this.tiles.get(c.key);
        return t ? t.surfaceY + t.group.position.y : cellSurfaceY(c);
    }

    tileAt(x, z) {
        const c = this.cellAt(x, z);
        return c ? this.tiles.get(c.key) : null;
    }

    tileScale(key) {
        return key === this.state?.player ? 1 + PLAYER_CELL_GROW : 1;
    }

    // ==================== CREATURES ====================
    getTemplate(species) {
        if (!this.templates.has(species)) {
            const model = buildCreatureModel(species, { mat: this.mats.creature, wingMat: this.mats.wing });
            this.templates.set(species, model);
        }
        return this.templates.get(species);
    }

    // Clone a template (sharing geometry) and remap its animated parts
    instantiate(template) {
        const pathOf = (obj) => {
            const p = [];
            while (obj && obj !== template.root) {
                p.unshift(obj.parent.children.indexOf(obj));
                obj = obj.parent;
            }
            return p;
        };
        const root = template.root.clone(true);
        const resolve = (obj) => (obj ? pathOf(obj).reduce((o, i) => o.children[i], root) : null);
        const P = template.parts;
        const mat = this.mats.creature.clone();
        root.traverse((o) => {
            if (o.isMesh && o.material === this.mats.creature) o.material = mat;
        });
        return {
            root, mat, gait: template.gait, flapSpeed: template.flapSpeed, minLen: template.minLen,
            inner: resolve(template.inner), body: resolve(template.body), height: template.height,
            parts: {
                legs: P.legs.map((l) => ({ ...l, pivot: resolve(l.pivot) })),
                arms: P.arms.map((a) => ({ ...a, pivot: resolve(a.pivot) })),
                wings: P.wings.map((w) => ({ ...w, pivot: resolve(w.pivot) })),
                tail: P.tail.map(resolve), neck: P.neck.map(resolve), segs: P.segs.map(resolve),
                head: resolve(P.head), jaw: resolve(P.jaw)
            }
        };
    }

    syncCreatures(state) {
        const present = new Set();
        for (const [hexKey, list] of state.creatures) {
            const tile = this.tiles.get(hexKey);
            const lit = tile?.lit;
            for (const c of list) {
                present.add(c.id);
                let v = this.creatures.get(c.id);
                if (lit) {
                    if (!v) v = this.spawnCreature(c, hexKey);
                    else if (v.hexKey !== hexKey) this.relocateCreature(v, hexKey);
                    v.leaving = false;
                    v.data = c;
                } else if (v && !v.dying) {
                    if (v.hexKey !== hexKey && tile) this.relocateCreature(v, hexKey);
                    v.leaving = true;
                    v.leaveT = v.leaveT ?? 0;
                }
            }
        }
        for (const [id, v] of this.creatures) {
            if (!present.has(id) && !v.dying) {
                const how = this.pendingDeaths.get(id) || 'fade';
                this.pendingDeaths.delete(id);
                v.dying = { type: how, t: 0 };
            }
        }
    }

    spawnCreature(c, hexKey) {
        const template = this.getTemplate(c.species);
        const model = this.instantiate(template);
        const sd = SPECIES_DATA[c.species] || { weight: 1 };
        const len = displayLength((sd.weight || 1) * (c.size || 1), template.minLen);
        const rand = mulberry32(hashString(c.id));
        model.seed = rand() * 100;
        const v = {
            id: c.id, species: c.species, data: c, model, len, hexKey, rand,
            gait: model.gait, pos: new THREE.Vector3(), target: new THREE.Vector3(),
            yaw: rand() * Math.PI * 2, mv: 0, phase: rand() * 10, nextWander: this.time + rand() * 3,
            appear: 0, alt: 0, angle: rand() * Math.PI * 2, angSpeed: (0.4 + rand() * 0.4) * (rand() > 0.5 ? 1 : -1),
            centre: new THREE.Vector3(), hop: 0
        };
        if (v.gait === 'fly') v.alt = 0.9 + rand() * 0.7 + len * 0.25;
        if (v.gait === 'flutter') v.alt = 0.22 + rand() * 0.3;
        const spot = this.pickSpot(v, hexKey);
        v.pos.copy(spot);
        v.target.copy(spot);
        const tile = this.tiles.get(hexKey);
        v.centre.set(tile.x, 0, tile.z);
        model.root.scale.setScalar(0.001);
        this.actorGroup.add(model.root);
        this.creatures.set(c.id, v);
        return v;
    }

    relocateCreature(v, hexKey) {
        v.hexKey = hexKey;
        const tile = this.tiles.get(hexKey);
        if (tile) v.centre.set(tile.x, 0, tile.z);
        v.target.copy(this.pickSpot(v, hexKey));
        v.urgent = 1;
        v.nextWander = this.time + 4 + v.rand() * 3;
    }

    pickSpot(v, hexKey) {
        const tile = this.tiles.get(hexKey);
        if (!tile) return v.pos.clone();
        const rand = v.rand;
        const scale = this.tileScale(hexKey);
        if ((v.gait === 'swim' || WATER_LOVERS.has(v.species)) && tile.pools && tile.pools.length) {
            const pool = tile.pools[Math.floor(rand() * tile.pools.length)];
            const a = rand() * Math.PI * 2;
            const r = Math.sqrt(rand()) * pool.r;
            return new THREE.Vector3(tile.x + (pool.x + Math.cos(a) * r) * scale, 0, tile.z + (pool.z + Math.sin(a) * r) * scale);
        }
        // keep the middle of the cell free for Big Al; big animals stand further out
        const minR = Math.min(tile.inradius * 0.75, 0.3 + v.len * 0.3);
        const [x, z] = randomPointInCell(tile.localPoly, rand, minR, 0.12 + v.len * 0.1);
        return new THREE.Vector3(tile.x + x * scale, 0, tile.z + z * scale);
    }

    waterLevelAt(v) {
        const tile = this.tileAt(v.pos.x, v.pos.z);
        if (!tile) return null;
        if (tile.waterY !== null && tile.waterY !== undefined) return tile.waterY + tile.group.position.y;
        const sc = tile.group.scale.x;
        for (const p of tile.pools || []) {
            if (Math.hypot(v.pos.x - tile.x - p.x * sc, v.pos.z - tile.z - p.z * sc) < (p.r + 0.05) * sc) return p.y + tile.group.position.y;
        }
        return null;
    }

    updateCreature(v, dt) {
        const t = this.time;
        const m = v.model;

        // appear / vanish
        if (v.dying) {
            this.updateDying(v, dt);
            return;
        }
        if (v.leaving) {
            v.leaveT += dt;
            if (v.leaveT > 1.6) {
                v.dying = { type: 'fade', t: 0 };
                return;
            }
        }
        v.appear = Math.min(1, v.appear + dt * 2.2);
        let scale = v.len * (v.appear < 1 ? Math.max(0.001, easeOutBack(v.appear)) : 1);

        const speedBase = GAIT_SPEED[v.gait] ?? 0.6;
        const speed = speedBase * (0.35 + v.len * 0.55) * (v.urgent ? 2.2 : 1);

        if (v.gait === 'fly') {
            // circle above the hex, drifting to a new centre when relocated
            const tile = this.tiles.get(v.hexKey);
            if (tile) v.centre.lerp(new THREE.Vector3(tile.x, 0, tile.z), damp(dt, 1.2));
            v.angle += v.angSpeed * dt * (v.urgent ? 2 : 1);
            const R = 0.55 + v.len * 0.2;
            const nx = v.centre.x + Math.cos(v.angle) * R;
            const nz = v.centre.z + Math.sin(v.angle) * R;
            const dx = nx - v.pos.x;
            const dz = nz - v.pos.z;
            v.pos.set(nx, 0, nz);
            if (Math.abs(dx) + Math.abs(dz) > 1e-5) v.yaw = lerpAngle(v.yaw, Math.atan2(-dz, dx), damp(dt, 6));
            v.mv = 1;
            v.urgent = Math.max(0, (v.urgent || 0) - dt * 0.5);
        } else if (v.gait !== 'perched') {
            if (t > v.nextWander && !v.urgent) {
                v.target.copy(this.pickSpot(v, v.hexKey));
                v.nextWander = t + 2.5 + v.rand() * 6;
            }
            const dx = v.target.x - v.pos.x;
            const dz = v.target.z - v.pos.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.02) {
                const step = Math.min(dist, speed * dt);
                v.pos.x += (dx / dist) * step;
                v.pos.z += (dz / dist) * step;
                v.yaw = lerpAngle(v.yaw, Math.atan2(-dz, dx), damp(dt, 7));
                v.mv = Math.min(1, v.mv + dt * 5);
                if (v.gait === 'hop') v.hop = (v.hop + dt * 2.8) % 1;
            } else {
                v.mv = Math.max(0, v.mv - dt * 4);
                v.urgent = 0;
                if (v.gait === 'hop') v.hop = 0;
            }
        }

        // vertical placement
        let y = this.groundAt(v.pos.x, v.pos.z);
        const wl = this.waterLevelAt(v);
        if (v.gait === 'fly') y = Math.max(y, wl ?? -9) + v.alt + Math.sin(t * 0.9 + v.angle) * 0.08;
        else if (v.gait === 'flutter') y += v.alt + Math.sin(t * 2.3 + v.phase) * 0.05;
        else if (v.gait === 'swim') {
            y = (wl ?? y + 0.02) - v.len * 0.06;
            if (Math.sin(t * 0.7 + v.phase * 3) > 0.985) y += 0.12;
        } else if (wl !== null && (v.species === 'Crocodile' || v.species === 'Turtle')) y = wl - v.len * 0.05;
        else if (v.gait === 'hop') y += Math.sin(Math.PI * v.hop) * 0.12 * (0.4 + v.len);

        // attack lunges / displays
        let attack = 0;
        let rear = 0;
        let jaw = 0;
        if (v.attack) {
            v.attack.t += dt;
            const p = v.attack.t / 0.8;
            if (p >= 1) v.attack = null;
            else {
                attack = Math.sin(Math.PI * p);
                jaw = attack;
                if (v.attack.target) {
                    const tx = v.attack.target.x - v.pos.x;
                    const tz = v.attack.target.z - v.pos.z;
                    v.yaw = lerpAngle(v.yaw, Math.atan2(-tz, tx), damp(dt, 12));
                }
                if (v.gait === 'fly') y -= attack * (v.alt * 0.7);
            }
        }
        if (v.rear) {
            v.rear.t += dt;
            const p = v.rear.t / 1.4;
            if (p >= 1) v.rear = null;
            else {
                rear = Math.sin(Math.PI * p);
                jaw = Math.max(jaw, rear);
                if (this.player) {
                    const tx = this.player.pos.x - v.pos.x;
                    const tz = this.player.pos.z - v.pos.z;
                    v.yaw = lerpAngle(v.yaw, Math.atan2(-tz, tx), damp(dt, 8));
                }
            }
        }

        const sp = speed / Math.max(0.1, v.len);
        v.phase += dt * sp * 5.5 * Math.max(0.15, v.mv) * (v.gait === 'slither' ? 1 : 1);
        m.root.position.set(v.pos.x, y, v.pos.z);
        m.root.rotation.set(0, v.yaw, 0);
        m.root.scale.setScalar(scale);
        animateModel(m, t, { phase: v.phase, moving: v.mv, attack, jaw, rear });
    }

    updateDying(v, dt) {
        const m = v.model;
        const d = v.dying;
        d.t += dt;
        let done = false;
        if (d.type === 'death') {
            const fall = Math.min(1, d.t / 0.35);
            m.root.rotation.set(fall * Math.PI * 0.5, v.yaw, 0, 'YXZ');
            if (d.t > 1.4) {
                const k = Math.min(1, (d.t - 1.4) / 0.6);
                m.root.scale.setScalar(v.len * (1 - k));
                if (k >= 1) done = true;
            }
        } else if (d.type === 'flee') {
            if (!d.dir) {
                const px = this.player ? this.player.pos.x : v.pos.x - 1;
                const pz = this.player ? this.player.pos.z : v.pos.z;
                const dx = v.pos.x - px;
                const dz = v.pos.z - pz;
                const len = Math.hypot(dx, dz) || 1;
                d.dir = { x: dx / len, z: dz / len };
            }
            v.pos.x += d.dir.x * dt * 2.4;
            v.pos.z += d.dir.z * dt * 2.4;
            v.yaw = lerpAngle(v.yaw, Math.atan2(-d.dir.z, d.dir.x), damp(dt, 10));
            v.phase += dt * 22;
            const y = this.groundAt(v.pos.x, v.pos.z) + (v.gait === 'fly' ? v.alt + d.t : 0);
            m.root.position.set(v.pos.x, y, v.pos.z);
            m.root.rotation.set(0, v.yaw, 0);
            const k = Math.max(0, (d.t - 0.6) / 0.5);
            m.root.scale.setScalar(v.len * Math.max(0.001, 1 - k));
            animateModel(m, this.time, { phase: v.phase, moving: 1 });
            if (k >= 1) done = true;
        } else {
            const k = Math.min(1, d.t / 0.45);
            m.root.scale.setScalar(v.len * Math.max(0.001, 1 - k));
            if (k >= 1) done = true;
        }
        if (done) {
            this.actorGroup.remove(m.root);
            m.mat.dispose();
            this.creatures.delete(v.id);
        }
    }

    // ==================== CARCASSES ====================
    syncCarcasses(state) {
        const present = new Set();
        for (const [hexKey, list] of state.carcasses || []) {
            const tile = this.tiles.get(hexKey);
            for (const c of list) {
                present.add(c.id);
                let vis = this.carcasses.get(c.id);
                if (tile?.lit && !vis) vis = this.spawnCarcass(c, tile);
                if (vis) vis.mesh.visible = !!tile?.lit;
            }
        }
        for (const [id, vis] of this.carcasses) {
            if (!present.has(id)) {
                this.actorGroup.remove(vis.mesh);
                vis.mesh.geometry.dispose();
                this.carcasses.delete(id);
            }
        }
    }

    spawnCarcass(c, tile) {
        const rand = mulberry32(hashString(c.id));
        const mb = new MeshBuilder();
        // rib cage + spine + a bit of meat
        loft(mb, [{ p: [-0.45, 0.06, 0], r: 0.03 }, { p: [0.45, 0.07, 0], r: 0.035 }], { sides: 5, color: '#ece2c8' });
        for (let i = 0; i < 6; i++) {
            const x = -0.25 + i * 0.1;
            for (const s of [-1, 1]) {
                limb(mb, [x, 0.07, 0], [x + 0.02, 0.2 - Math.abs(i - 2.5) * 0.015, s * 0.12], 0.016, 0.014, '#f0e8d4', { sides: 4 });
                limb(mb, [x + 0.02, 0.2 - Math.abs(i - 2.5) * 0.015, s * 0.12], [x + 0.03, 0.02, s * 0.2], 0.014, 0.01, '#e4d8bc', { sides: 4 });
            }
        }
        blob(mb, [0, 0.07, 0], 0.16, '#8a2a24', { scale: [1.6, 0.5, 1], jitter: 0.4, rand, flatBottom: -0.4 });
        blob(mb, [0.55, 0.07, 0.04], 0.09, '#ece2c8', { scale: [1.5, 0.8, 0.9], jitter: 0.3, rand });
        blob(mb, [0.1, 0.01, 0.2], 0.1, '#5a1a18', { scale: [1.8, 0.15, 1.4], jitter: 0.3, rand });
        const mesh = new THREE.Mesh(mb.build(), this.mats.creature);
        mesh.castShadow = true;
        const sd = SPECIES_DATA[c.species] || { weight: 1 };
        const len = displayLength((sd.weight || 1) * (c.size || 1), 0.15) * 0.8;
        const [px, pz] = randomPointInCell(tile.localPoly, rand, 0.35, 0.25);
        mesh.position.set(tile.x + px, tile.surfaceY + 0.005, tile.z + pz);
        mesh.rotation.y = rand() * Math.PI * 2;
        mesh.scale.setScalar(len);
        this.actorGroup.add(mesh);
        const vis = { mesh };
        this.carcasses.set(c.id, vis);
        this.burst(mesh.position.clone().add(new THREE.Vector3(0, 0.1, 0)), '#a02020', 10);
        return vis;
    }

    // ==================== PLAYER ====================
    syncPlayer(state, prev) {
        const w = this.world.byKey.get(state.player);
        if (!this.player || this.player.level !== state.level) {
            const old = this.player;
            const tpl = buildBigAl(state.level, { mat: this.mats.creature, wingMat: this.mats.wing });
            const model = this.instantiate(tpl);
            model.seed = 3;
            this.actorGroup.add(model.root);
            this.player = {
                model, level: state.level, pos: old ? old.pos.clone() : new THREE.Vector3(w.x, 0, w.z),
                from: new THREE.Vector3(), to: new THREE.Vector3(w.x, 0, w.z), moveT: 1, yaw: old ? old.yaw : -Math.PI / 2,
                phase: 0, len: old ? old.len : displayLength(state.weight, 0.2) * 1.15, hurt: 0, attack: null, grow: old ? 0 : 1, dead: 0
            };
            if (old) {
                this.actorGroup.remove(old.model.root);
                old.model.mat.dispose();
                this.burst(this.player.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffd84a', 24);
            }
            if (!old) this.cam.target.set(w.x, 0.3, w.z);
        }
        const p = this.player;
        if (Math.abs(p.to.x - w.x) > 1e-4 || Math.abs(p.to.z - w.z) > 1e-4) {
            p.from.copy(p.pos);
            p.to.set(w.x, 0, w.z);
            p.moveT = 0;
            this.cam.follow = true;
            if (prev && Math.hypot(p.to.x - p.from.x, p.to.z - p.from.z) > 3) {
                // teleport (restart)
                p.pos.copy(p.to);
                p.moveT = 1;
            }
        }
        p.lenGoal = displayLength(state.weight, 0.2) * 1.15;
        if (this.lastFitness !== null && state.fitness < this.lastFitness - 0.5) {
            p.hurt = 1;
            this.cam.shake = 0.25;
            this.burst(p.pos.clone().add(new THREE.Vector3(0, p.len * 0.3, 0)), '#d02828', 14);
        }
        this.lastFitness = state.fitness;
        p.gameOver = state.gameOver;
        if (!state.gameOver) p.dead = 0;
    }

    updatePlayer(dt) {
        const p = this.player;
        if (!p) return;
        const m = p.model;
        p.len += (p.lenGoal - p.len) * damp(dt, 2);
        let moving = 0;
        if (p.moveT < 1) {
            p.moveT = Math.min(1, p.moveT + dt / 0.55);
            const k = p.moveT < 0.5 ? 2 * p.moveT * p.moveT : 1 - Math.pow(-2 * p.moveT + 2, 2) / 2;
            p.pos.lerpVectors(p.from, p.to, k);
            const dx = p.to.x - p.from.x;
            const dz = p.to.z - p.from.z;
            if (Math.abs(dx) + Math.abs(dz) > 1e-4) p.yaw = lerpAngle(p.yaw, Math.atan2(-dz, dx), damp(dt, 14));
            moving = 1;
            p.phase += dt * 16;
            if (Math.random() < dt * 12) this.dust(p.pos);
        }
        let attack = 0;
        if (p.attack) {
            p.attack.t += dt;
            const k = p.attack.t / 0.6;
            if (k >= 1) p.attack = null;
            else {
                attack = Math.sin(Math.PI * k);
                if (p.attack.target) {
                    const dx = p.attack.target.x - p.pos.x;
                    const dz = p.attack.target.z - p.pos.z;
                    p.yaw = lerpAngle(p.yaw, Math.atan2(-dz, dx), damp(dt, 16));
                }
                if (p.attack.hitAt && p.attack.t > 0.3) {
                    this.burst(p.attack.hitAt, p.attack.color, 12);
                    p.attack.hitAt = null;
                }
            }
        }
        const y = this.groundAt(p.pos.x, p.pos.z) + (moving ? Math.sin(Math.PI * p.moveT) * 0.15 : 0);
        m.root.position.set(p.pos.x, y, p.pos.z);
        if (p.gameOver) {
            p.dead = Math.min(1, p.dead + dt * 2);
            m.root.rotation.set(p.dead * Math.PI * 0.5, p.yaw, 0, 'YXZ');
        } else {
            m.root.rotation.set(0, p.yaw, 0);
        }
        m.root.scale.setScalar(p.len);
        p.hurt = Math.max(0, p.hurt - dt * 2.5);
        m.mat.emissive.setRGB(p.hurt * 0.8, 0, 0);
        animateModel(m, this.time, { phase: p.phase, moving, attack, jaw: attack, look: Math.sin(this.time * 0.3) * 0.5 });
        this.playerRing.position.set(p.pos.x, y + 0.012, p.pos.z);
        this.playerRing.scale.setScalar(0.32 + p.len * 0.25);
        this.playerRing.material.opacity = 0.55 + Math.sin(this.time * 3) * 0.2;
    }

    // ==================== EVENTS ====================
    syncEvents(state) {
        for (const e of state.creatureBehaviorLog || []) {
            if (!e.id || this.seenLog.has(e.id)) continue;
            this.seenLog.add(e.id);
            const v = e.creatureId ? this.creatures.get(e.creatureId) : null;
            if (e.type === 'creature_attack' && v && this.player) {
                v.attack = { t: 0, target: this.player.pos.clone() };
            } else if (e.type === 'creature_display' && v) {
                v.rear = { t: 0 };
                this.exclaim(v);
            } else if (e.type === 'creature_hunt') {
                if (v) {
                    const victim = e.victimId ? this.creatures.get(e.victimId) : null;
                    v.attack = { t: 0, target: victim ? victim.pos.clone() : null };
                }
                if (e.victimId) this.pendingDeaths.set(e.victimId, 'death');
            }
        }
        if (this.seenLog.size > 400) this.seenLog = new Set([...this.seenLog].slice(-200));

        const a = state.lastPlayerAction;
        if (a && a.id !== this.lastPlayerActionId) {
            this.lastPlayerActionId = a.id;
            if (this.player && a.creatureId) {
                const v = this.creatures.get(a.creatureId);
                const target = v ? v.pos.clone() : null;
                const hit = v ? v.pos.clone().add(new THREE.Vector3(0, v.len * 0.25 + 0.05, 0)) : null;
                this.player.attack = { t: 0, target, hitAt: a.outcome === 'kill' ? hit : null, color: '#b02020' };
                this.pendingDeaths.set(a.creatureId, a.outcome === 'kill' ? 'death' : 'flee');
                if (a.outcome === 'kill') this.cam.shake = Math.max(this.cam.shake, 0.08);
            } else if (this.player && a.type === 'scavenge') {
                this.player.attack = { t: 0, target: null };
                this.burst(this.player.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#8a2a24', 8);
            }
        }
    }

    // ==================== MARKERS ====================
    buildMarkers() {
        const mk = (color, opacity) => {
            const m = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, vertexColors: true }));
            m.renderOrder = 5;
            m.visible = false;
            this.markerGroup.add(m);
            return m;
        };
        this.hoverRing = mk('#ffffff', 0.9);
        this.selectRing = mk('#58e0ff', 0.9);
        this.moveRings = Array.from({ length: 12 }, () => mk('#ffc23a', 0.55));
        const pr = new MeshBuilder();
        const segs = 20;
        for (let i = 0; i < segs; i++) {
            const a0 = (i / segs) * Math.PI * 2;
            const a1 = ((i + 1) / segs) * Math.PI * 2;
            pr.quad([Math.cos(a0), 0, Math.sin(a0)], [Math.cos(a1), 0, Math.sin(a1)], [Math.cos(a1) * 0.8, 0, Math.sin(a1) * 0.8], [Math.cos(a0) * 0.8, 0, Math.sin(a0) * 0.8], '#ffffff', [0, 1, 0], true);
        }
        this.playerRing = new THREE.Mesh(pr.build(), new THREE.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: 0.7, depthWrite: false, vertexColors: true }));
        this.playerRing.renderOrder = 5;
        this.markerGroup.add(this.playerRing);
        const dotGeo = new THREE.CircleGeometry(0.09, 6).rotateX(-Math.PI / 2);
        this.pathDots = Array.from({ length: 40 }, () => {
            const d = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.85, depthWrite: false }));
            d.visible = false;
            d.renderOrder = 6;
            this.markerGroup.add(d);
            return d;
        });
    }

    outlineFor(tile) {
        if (!this.outlines.has(tile.key)) this.outlines.set(tile.key, buildOutline(tile.localPoly));
        return this.outlines.get(tile.key);
    }

    // Put a marker on a cell: outlines take the cell's shape, dots sit at its centre
    placeOnTile(mesh, key, lift = 0.014, outline = true) {
        const t = key ? this.tiles.get(key) : null;
        if (!t) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        if (outline) {
            mesh.geometry = this.outlineFor(t);
            mesh.scale.set(t.group.scale.x, 1, t.group.scale.z);
        }
        mesh.position.set(t.x, t.surfaceY + t.group.position.y + lift, t.z);
    }

    syncMarkers(state) {
        this.markerState = {
            hovered: state.hoveredHex?.key ?? null, selected: state.selectedHex?.key ?? null,
            movable: this.movable, path: this.path, gameOver: state.gameOver
        };
    }

    updateMarkers() {
        const s = this.markerState;
        if (!s) return;
        if (s.hovered && !s.gameOver) {
            this.placeOnTile(this.hoverRing, s.hovered, 0.02);
            this.hoverRing.material.color.set(s.movable.includes(s.hovered) ? '#fff2a0' : '#ffffff');
        } else this.hoverRing.visible = false;
        if (s.selected && s.selected !== this.state.player) this.placeOnTile(this.selectRing, s.selected, 0.018);
        else this.selectRing.visible = false;
        this.moveRings.forEach((ring, i) => {
            const key = s.movable[i];
            if (key && !s.gameOver) {
                this.placeOnTile(ring, key, 0.012);
                ring.material.opacity = 0.35 + Math.sin(this.time * 3 + i) * 0.15;
            } else ring.visible = false;
        });
        this.pathDots.forEach((d, i) => {
            const key = s.path[i];
            if (key) {
                this.placeOnTile(d, key, 0.03, false);
                d.material.opacity = 0.6 + Math.sin(this.time * 5 - i * 0.6) * 0.3;
            } else d.visible = false;
        });
    }

    // ==================== AMBIENT LIFE & FX ====================
    buildAmbient() {
        // fireflies
        const n = 60;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,200,0.6)');
        grad.addColorStop(1, 'rgba(255,255,200,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 32, 32);
        const tex = new THREE.CanvasTexture(c);
        this.fireflies = new THREE.Points(geo, new THREE.PointsMaterial({
            size: 0.16, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        this.fireflyData = Array.from({ length: n }, () => ({ ox: (Math.random() - 0.5) * 10, oz: (Math.random() - 0.5) * 10, h: 0.15 + Math.random() * 0.7, ph: Math.random() * 10, sp: 0.3 + Math.random() * 0.6 }));
        this.fxGroup.add(this.fireflies);
        this.night = 0;

        // a flock of small pterosaurs wheeling overhead (pure decoration)
        this.flock = [];
        const tpl = buildCreatureModel('Rhamphorhynchus', { mat: this.mats.creature, wingMat: this.mats.wing });
        for (let i = 0; i < 5; i++) {
            const m = this.instantiate(tpl);
            m.seed = i * 1.7;
            m.root.scale.setScalar(0.32 + Math.random() * 0.1);
            this.fxGroup.add(m.root);
            this.flock.push({ model: m, off: i * 0.5, r: 3.5 + Math.random() * 1.5, h: 3 + Math.random() * 0.8 });
        }

        // shared particle geometry
        this.particleGeo = new THREE.TetrahedronGeometry(0.04);
        this.puffGeo = new THREE.IcosahedronGeometry(0.12, 0);
        this.exclaimTex = (() => {
            const cv = document.createElement('canvas');
            cv.width = cv.height = 64;
            const x = cv.getContext('2d');
            x.fillStyle = '#e02a2a';
            x.beginPath();
            x.arc(32, 32, 28, 0, Math.PI * 2);
            x.fill();
            x.lineWidth = 4;
            x.strokeStyle = '#fff';
            x.stroke();
            x.fillStyle = '#fff';
            x.font = 'bold 44px sans-serif';
            x.textAlign = 'center';
            x.textBaseline = 'middle';
            x.fillText('!', 32, 34);
            return new THREE.CanvasTexture(cv);
        })();
    }

    burst(pos, color, n = 10) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
        for (let i = 0; i < n; i++) {
            const m = new THREE.Mesh(this.particleGeo, mat);
            m.position.copy(pos);
            const a = Math.random() * Math.PI * 2;
            const sp = 0.6 + Math.random() * 1.2;
            this.fxGroup.add(m);
            this.particles.push({ mesh: m, vel: new THREE.Vector3(Math.cos(a) * sp, 1 + Math.random() * 1.5, Math.sin(a) * sp), life: 0.7 + Math.random() * 0.3, t: 0, gravity: 5, spin: Math.random() * 10, mat, shared: true });
        }
    }

    dust(pos) {
        const mat = new THREE.MeshLambertMaterial({ color: '#d8c8a0', transparent: true, opacity: 0.7 });
        const m = new THREE.Mesh(this.puffGeo, mat);
        m.position.set(pos.x + (Math.random() - 0.5) * 0.2, this.groundAt(pos.x, pos.z) + 0.04, pos.z + (Math.random() - 0.5) * 0.2);
        const baseScale = 0.4 + Math.random() * 0.3;
        m.scale.setScalar(baseScale);
        this.fxGroup.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(0, 0.25, 0), life: 0.6, t: 0, gravity: 0, grow: 1.2, baseScale, mat, fade: true });
    }

    smokePuff(pos) {
        const mat = new THREE.MeshLambertMaterial({ color: Math.random() > 0.5 ? '#d8d2cc' : '#b8b0aa', emissive: '#3a3330', transparent: true, opacity: 0.5, depthWrite: false });
        const m = new THREE.Mesh(this.puffGeo, mat);
        m.position.copy(pos);
        m.position.x += (Math.random() - 0.5) * 0.1;
        m.position.z += (Math.random() - 0.5) * 0.1;
        const baseScale = 0.5 + Math.random() * 0.3;
        m.scale.setScalar(baseScale);
        this.fxGroup.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(0.12, 0.4, 0.05), life: 3.2, t: 0, gravity: 0, grow: 2.2, baseScale, mat, fade: true, spin: 0.5, maxOpacity: 0.5 });
    }

    exclaim(v) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.exclaimTex, transparent: true, depthTest: false }));
        s.scale.setScalar(0.32);
        s.renderOrder = 10;
        this.fxGroup.add(s);
        this.particles.push({ mesh: s, follow: v, vel: new THREE.Vector3(), life: 1.6, t: 0, gravity: 0, mat: s.material, fade: true, sprite: true });
    }

    updateParticles(dt) {
        const keep = [];
        for (const p of this.particles) {
            p.t += dt;
            const k = p.t / p.life;
            if (k >= 1) {
                this.fxGroup.remove(p.mesh);
                if (!p.shared || !this.particles.some((o) => o !== p && o.mat === p.mat && o.t < o.life)) p.mat.dispose();
                continue;
            }
            if (p.follow) {
                const v = p.follow;
                p.mesh.position.set(v.pos.x, v.model.root.position.y + v.len * (v.model.height || 0.4) + 0.25 + k * 0.1, v.pos.z);
            } else {
                p.vel.y -= p.gravity * dt;
                p.mesh.position.addScaledVector(p.vel, dt);
            }
            if (p.spin) p.mesh.rotation.y += p.spin * dt;
            if (p.grow) p.mesh.scale.setScalar((p.baseScale ?? 1) * (1 + p.grow * k));
            p.mat.opacity = p.fade ? (1 - k) * (p.maxOpacity ?? 0.8) : 1 - k * k;
            keep.push(p);
        }
        this.particles = keep;
    }

    updateAmbient(dt) {
        const t = this.time;
        const isNight = this.light.phase >= DAY_LENGTH;
        this.night += ((isNight ? 1 : 0) - this.night) * damp(dt, 1.5);
        const cx = this.cam.target.x;
        const cz = this.cam.target.z;
        const pos = this.fireflies.geometry.attributes.position;
        const col = this.fireflies.geometry.attributes.color;
        this.fireflyData.forEach((f, i) => {
            const x = cx + f.ox + Math.sin(t * f.sp + f.ph) * 0.4;
            const z = cz + f.oz + Math.cos(t * f.sp * 0.8 + f.ph) * 0.4;
            const tile = this.tileAt(x, z);
            const ok = tile && tile.lit && !['lake', 'mountains', 'volcanic', 'lavafield', 'desert'].includes(tile.terrain);
            pos.setXYZ(i, x, (tile ? tile.surfaceY : 0.3) + f.h + Math.sin(t * 1.3 + f.ph) * 0.08, z);
            const b = ok ? this.night * Math.max(0, Math.sin(t * 2.4 + f.ph * 3)) : 0;
            col.setXYZ(i, b * 0.9, b, b * 0.4);
        });
        pos.needsUpdate = true;
        col.needsUpdate = true;
        this.fireflies.visible = this.night > 0.02;

        const day = 1 - this.night;
        this.flock.forEach((b, i) => {
            const a = t * 0.25 + b.off;
            const x = cx + Math.cos(a) * b.r;
            const z = cz + Math.sin(a) * b.r * 0.8;
            b.model.root.position.set(x, b.h + Math.sin(t * 0.7 + i) * 0.2, z);
            b.model.root.rotation.y = Math.atan2(-Math.cos(a) * 0.8, -Math.sin(a));
            b.model.root.visible = day > 0.4;
            animateModel(b.model, t, { bank: 2 });
        });

        // volcano smoke
        this.smokeTimer += dt;
        if (this.smokeTimer > 0.35) {
            this.smokeTimer = 0;
            for (const tile of this.tiles.values()) {
                if (!tile.smoke.length || !tile.lit) continue;
                for (const s of tile.smoke) if (Math.random() < 0.6) this.smokePuff(new THREE.Vector3(tile.x + s.x, s.y + tile.group.position.y, tile.z + s.z));
            }
        }
        // pulse lava
        const pulse = 0.85 + Math.sin(t * 2.2) * 0.15;
        this.mats.lava.color.setRGB(pulse * 1.1, pulse, pulse);
    }

    updateLighting(dt) {
        const target = PHASES[Math.max(0, this.light.phase)];
        if (!this.light.cur) {
            this.light.cur = {
                sun: new THREE.Color(target.sun), sky: new THREE.Color(target.sky), ground: new THREE.Color(target.ground),
                sunI: target.sunI, hemiI: target.hemiI, az: target.sunAz, el: target.sunEl
            };
        }
        const c = this.light.cur;
        const k = damp(dt, 1.4);
        c.sun.lerp(new THREE.Color(target.sun), k);
        c.sky.lerp(new THREE.Color(target.sky), k);
        c.ground.lerp(new THREE.Color(target.ground), k);
        c.sunI += (target.sunI - c.sunI) * k;
        c.hemiI += (target.hemiI - c.hemiI) * k;
        c.az = lerpAngle(c.az, target.sunAz, k);
        c.el += (target.sunEl - c.el) * k;
        this.sun.color.copy(c.sun);
        this.sun.intensity = c.sunI;
        this.hemi.color.copy(c.sky);
        this.hemi.groundColor.copy(c.ground);
        this.hemi.intensity = c.hemiI;
        const tg = this.cam.target;
        this.sun.position.set(tg.x + Math.cos(c.az) * Math.cos(c.el) * 25, tg.y + Math.sin(c.el) * 25, tg.z + Math.sin(c.az) * Math.cos(c.el) * 25);
        this.sun.target.position.copy(tg);
    }

    // ==================== CAMERA & INPUT ====================
    resize() {
        const w = Math.max(1, this.container.clientWidth);
        const h = Math.max(1, this.container.clientHeight);
        this.renderer.setSize(w, h, false);
        this.cam.aspect = w / h;
        this.cam.lastZoom = null;
    }

    updateCamera(dt) {
        const c = this.cam;
        if (c.follow && this.player) {
            const p = this.player.pos;
            const goal = new THREE.Vector3(p.x, this.groundAt(p.x, p.z), p.z);
            c.target.lerp(goal, damp(dt, 3.5));
        }
        // keyboard panning
        const pan = new THREE.Vector2();
        if (this.keysDown.has('arrowup') || this.keysDown.has('w')) pan.y += 1;
        if (this.keysDown.has('arrowdown') || this.keysDown.has('s')) pan.y -= 1;
        if (this.keysDown.has('arrowleft') || this.keysDown.has('a')) pan.x -= 1;
        if (this.keysDown.has('arrowright') || this.keysDown.has('d')) pan.x += 1;
        if (pan.lengthSq() > 0) {
            c.follow = false;
            this.panBy(pan.x * dt * 6 / c.zoom, pan.y * dt * 6 / c.zoom);
        }
        c.az = c.az + (c.azGoal - c.az) * damp(dt, 6);
        c.zoom = c.zoom + (c.zoomGoal - c.zoom) * damp(dt, 8);
        const halfH = BASE_HALF_H / c.zoom;
        if (c.lastZoom !== c.zoom || c.lastAspect !== c.aspect) {
            this.camera.left = -halfH * c.aspect;
            this.camera.right = halfH * c.aspect;
            this.camera.top = halfH;
            this.camera.bottom = -halfH;
            this.camera.updateProjectionMatrix();
            c.lastZoom = c.zoom;
            c.lastAspect = c.aspect;
        }
        c.shake = Math.max(0, c.shake - dt);
        const sx = c.shake > 0 ? (Math.random() - 0.5) * c.shake * 0.4 : 0;
        const sz = c.shake > 0 ? (Math.random() - 0.5) * c.shake * 0.4 : 0;
        this.camera.position.set(
            c.target.x + Math.cos(c.az) * Math.cos(ELEV) * CAM_DIST + sx,
            c.target.y + Math.sin(ELEV) * CAM_DIST,
            c.target.z + Math.sin(c.az) * Math.cos(ELEV) * CAM_DIST + sz
        );
        this.camera.lookAt(c.target.x + sx, c.target.y, c.target.z + sz);
    }

    // move the camera target in screen-aligned ground directions (world units)
    panBy(right, up) {
        const az = this.cam.az;
        const rx = Math.sin(az);
        const rz = -Math.cos(az);
        const fx = -Math.cos(az);
        const fz = -Math.sin(az);
        this.cam.target.x += rx * right + fx * up;
        this.cam.target.z += rz * right + fz * up;
    }

    bindInput() {
        const el = this.renderer.domElement;
        this.onPointerDown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            this.pointer.down = { x: e.clientX, y: e.clientY };
            this.pointer.panning = false;
            el.setPointerCapture?.(e.pointerId);
        };
        this.onPointerMove = (e) => {
            const rect = el.getBoundingClientRect();
            this.pointer.x = e.clientX;
            this.pointer.y = e.clientY;
            this.pointer.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            this.pointer.inside = true;
            this.pointer.dirty = true;
            const d = this.pointer.down;
            if (d) {
                const dx = e.clientX - d.x;
                const dy = e.clientY - d.y;
                if (!this.pointer.panning && Math.hypot(dx, dy) > 6) {
                    this.pointer.panning = true;
                    this.cam.follow = false;
                    this.cb.onDragChange?.(true);
                }
                if (this.pointer.panning) {
                    const worldPerPx = (2 * BASE_HALF_H / this.cam.zoom) / rect.height;
                    this.panBy(-dx * worldPerPx, dy * worldPerPx / Math.sin(ELEV));
                    d.x = e.clientX;
                    d.y = e.clientY;
                }
            }
        };
        this.onPointerUp = (e) => {
            const d = this.pointer.down;
            this.pointer.down = null;
            if (d && !this.pointer.panning) {
                const key = this.pick();
                if (key) this.cb.onHexClick?.(key);
            }
            if (this.pointer.panning) this.cb.onDragChange?.(false);
            this.pointer.panning = false;
        };
        this.onPointerLeave = () => {
            this.pointer.inside = false;
            if (this.hoverKey) {
                this.hoverKey = null;
                this.cb.onHexHover?.(null);
            }
        };
        this.onWheel = (e) => {
            e.preventDefault();
            this.zoomBy(e.deltaY > 0 ? 0.88 : 1.14);
        };
        this.onKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                this.keysDown.add(k);
                e.preventDefault();
            } else if (k === 'q') this.rotate(-1);
            else if (k === 'e') this.rotate(1);
            else if (k === 'c') this.centerOnPlayer();
            else if (k === 'r') this.resetView();
            else if (k === '+' || k === '=') this.zoomBy(1.2);
            else if (k === '-' || k === '_') this.zoomBy(1 / 1.2);
        };
        this.onKeyUp = (e) => this.keysDown.delete(e.key.toLowerCase());
        this.onBlur = () => this.keysDown.clear();
        el.addEventListener('pointerdown', this.onPointerDown);
        el.addEventListener('pointermove', this.onPointerMove);
        el.addEventListener('pointerup', this.onPointerUp);
        el.addEventListener('pointerleave', this.onPointerLeave);
        el.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
    }

    unbindInput() {
        const el = this.renderer.domElement;
        el.removeEventListener('pointerdown', this.onPointerDown);
        el.removeEventListener('pointermove', this.onPointerMove);
        el.removeEventListener('pointerup', this.onPointerUp);
        el.removeEventListener('pointerleave', this.onPointerLeave);
        el.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
    }

    pick() {
        this.raycaster.setFromCamera(this.pointer.ndc, this.camera);
        const hits = this.raycaster.intersectObjects(this.tileMeshes, false);
        return hits.length ? hits[0].object.userData.hexKey : null;
    }

    updateHover() {
        if (!this.pointer.inside || this.pointer.panning) return;
        if (!this.pointer.dirty && !this.cameraMoved) return;
        this.pointer.dirty = false;
        const key = this.pick();
        if (key !== this.hoverKey) {
            this.hoverKey = key;
            this.cb.onHexHover?.(key);
        }
    }

    // ==================== FRAME ====================
    frame() {
        const dt = Math.min(0.05, this.clock.getDelta());
        this.time += dt;
        sharedUniforms.uTime.value = this.time;

        const playerKey = this.state?.player;
        for (const tile of this.tiles.values()) {
            const focusGoal = tile.key === playerKey ? 1 : 0;
            if (tile.appear < 1 || tile.focus !== focusGoal) {
                tile.appear = Math.min(1, tile.appear + dt * 2.2);
                tile.focus += (focusGoal - tile.focus) * damp(dt, 6);
                if (Math.abs(tile.focus - focusGoal) < 0.002) tile.focus = focusGoal;
                // Big Al's cell rises and widens into a little stage
                const grow = 1 + PLAYER_CELL_GROW * tile.focus;
                tile.group.scale.set(grow, 1, grow);
                tile.group.position.y = (easeOutBack(tile.appear) - 1) * 0.9 + tile.focus * 0.08;
            }
        }
        this.lodTimer += dt;
        if (this.lodTimer > 0.25) {
            this.lodTimer = 0;
            this.updateLOD();
        }
        const prevTarget = this.cam.target.clone();
        this.updateCamera(dt);
        this.cameraMoved = prevTarget.distanceToSquared(this.cam.target) > 1e-6;
        this.updateLighting(dt);
        for (const v of [...this.creatures.values()]) this.updateCreature(v, dt);
        this.updatePlayer(dt);
        this.updateMarkers();
        this.updateAmbient(dt);
        this.updateParticles(dt);
        this.updateHover();
        this.renderer.render(this.scene, this.camera);
    }
}
