// ==================== WORLD RENDERER ====================
// Owns the Three.js scene and mirrors the React game state into it: terrain
// tiles, creatures, Big Al, carcasses, landmarks, traces, markers, lighting,
// mist and post-processing. The game logic stays in the reducer; this class
// only *shows* it.
import * as THREE from 'three';
import { createMaterials, sharedUniforms } from './materials.js';
import { buildCell, buildOutline, cellSurfaceY, randomPointInCell } from './cells3d.js';
import { buildCreatureModel, buildBigAl } from './creatures3d.js';
import { animateModel } from './animation.js';
import { MeshBuilder, blob, limb, loft, mulberry32, hashString } from './lowpoly.js';
import { PostFX } from './postfx.js';
import { createOutlineMaterial, addOutlines, outlineUniforms } from './outline.js';
import { MistLayer } from './mist.js';
import { buildPoiMesh } from './pois3d.js';
import { getWorld } from '../world/worldGen.js';
import { SPECIES_DATA } from '../data/species.js';
import { getTimeOfDay, DAY_LENGTH } from '../game/gameConstants.js';

const DETAIL_RADIUS = 13; // cells closer than this to the camera target get full decoration
const PLAYER_CELL_GROW = 0.18; // Big Al's cell swells into a little stage so animals fit around him
const CAM_DIST = 40;
const BASE_HALF_H = 3.6;
const DEFAULT_EL = 0.64;
const DEFAULT_AZ = Math.PI / 4 + Math.PI / 12;
const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
const angleDiff = (a, b) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
};
const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
const approach = (v, goal, dt, rate) => v + (goal - v) * damp(dt, rate);
const envelope = (t, dur, fadeIn = 0.35, fadeOut = 0.45) => Math.max(0, Math.min(1, t / fadeIn, (dur - t) / fadeOut));

// Visual length (world units, 1 cell = ~2 across) from body mass in kg. The
// real range (2 g dragonfly .. 35 t Brachiosaurus) is compressed so everything
// stays readable on a cell.
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
// Sky gradient behind the diorama
const SKIES = [
    { top: '#79b2df', horizon: '#f7e2c6', glow: '#ffd59a', gx: 0.22 },
    { top: '#5ea6e2', horizon: '#d6eefc', glow: '#fff7dc', gx: 0.5 },
    { top: '#5c5c9c', horizon: '#f4ac7a', glow: '#ffb46a', gx: 0.8 },
    { top: '#0a1030', horizon: '#232c58', glow: '#3a4888', gx: 0.5 },
    { top: '#161a3e', horizon: '#4a4468', glow: '#9a7aa0', gx: 0.25 }
];
const MIST_TINT = ['#fff3e6', '#ffffff', '#ffdcc6', '#9aa6d8', '#c4bce0'].map((c) => new THREE.Color(c));
export const phaseIndex = (moveNumber) => getTimeOfDay(moveNumber).turnInCycle % PHASES.length;

const GAIT_SPEED = { biped: 0.95, quad: 0.5, sprawl: 0.6, crawl: 0.35, slither: 0.45, hop: 0.7, swim: 0.45, fly: 1.1, flutter: 0.9, perched: 0 };
const WATER_LOVERS = new Set(['Fish', 'Crocodile', 'Frog', 'Turtle']);
const GRAZERS = new Set(['herbivore', 'dangerous_herbivore']);
const HUNTERS = new Set(['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'territorial']);
const HIGH_BROWSERS = new Set(['Brachiosaurus', 'Camarasaurus']);

const roleOf = (species, gait) => {
    const t = SPECIES_DATA[species]?.behaviorType;
    if (gait === 'fly' || gait === 'flutter' || gait === 'swim' || gait === 'perched') return 'air';
    if (t === 'giant_herbivore') return 'browser';
    if (GRAZERS.has(t)) return 'grazer';
    if (HUNTERS.has(t)) return 'hunter';
    return 'critter';
};

// Canvas sprite textures for scent wisps and sleep "z"s
const iconTexture = (draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
};

export class WorldRenderer {
    constructor(container, callbacks = {}) {
        this.container = container;
        this.cb = callbacks;
        this.time = 0;
        this.disposed = false;

        // ---- renderer ----
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
        this.postfx = new PostFX(this.renderer, this.scene, this.camera);

        this.mats = createMaterials();
        this.mats.outline = createOutlineMaterial();
        this.tileGroup = new THREE.Group();
        this.actorGroup = new THREE.Group();
        this.fxGroup = new THREE.Group();
        this.markerGroup = new THREE.Group();
        this.scene.add(this.tileGroup, this.actorGroup, this.fxGroup, this.markerGroup);
        this.mist = new MistLayer(this.fxGroup);

        // ---- world state mirrors ----
        this.tiles = new Map();
        this.outlines = new Map();
        this.world = null;
        this.worldSeed = null;
        this.lodTimer = 0;
        this.tileMeshes = [];
        this.creatures = new Map();
        this.carcasses = new Map();
        this.bloodMarks = new Map();
        this.templates = new Map();
        this.player = null;
        this.seenLog = new Set();
        this.lastPlayerActionId = undefined;
        this.lastFitness = null;
        this.hurtDelay = 0;
        this.pendingHurt = null;
        this.pendingDeaths = new Map();
        this.particles = [];
        this.smokeTimer = 0;
        this.state = null;

        this.buildMarkers();
        this.buildAmbient();

        // ---- camera ----
        this.cam = {
            target: new THREE.Vector3(), goal: new THREE.Vector3(), az: DEFAULT_AZ, azGoal: DEFAULT_AZ,
            el: DEFAULT_EL, elGoal: DEFAULT_EL, zoom: 1, zoomGoal: 1, follow: true, shake: 0, aspect: 1
        };

        // ---- input ----
        this.pointer = { x: 0, y: 0, ndc: new THREE.Vector2(), dirty: false, down: null, mode: null, inside: false };
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
        if (!prev || prev.pois !== state.pois || prev.cells !== state.cells) this.syncPois(state);
        this.syncEvents(state);
        this.syncCreatures(state);
        this.syncCarcasses(state);
        this.syncTraces(state, prev);
        this.syncPlayer(state, prev);
        this.movable = extra.movable || [];
        this.path = extra.path || [];
        this.syncMarkers(state);
        if (!prev || prev.moveNumber !== state.moveNumber || this.light.phase < 0) this.light.phase = phaseIndex(state.moveNumber);
        if (prev && prev.player !== state.player) this.alertNearby(state);
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
        for (const m of this.bloodMarks.values()) {
            this.markerGroup.remove(m);
            m.geometry.dispose();
        }
        this.bloodMarks.clear();
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

    lookAt(x, z) {
        this.cam.follow = false;
        this.cam.goal.set(x, this.groundAt(x, z), z);
    }

    rotate(dir) {
        this.cam.azGoal += (dir * Math.PI) / 4;
    }

    zoomBy(f) {
        this.cam.zoomGoal = Math.max(0.4, Math.min(2.6, this.cam.zoomGoal * f));
    }

    resetView() {
        this.cam.azGoal = this.cam.az + angleDiff(this.cam.az, DEFAULT_AZ);
        this.cam.elGoal = DEFAULT_EL;
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
        this.mist.dispose();
        this.postfx.dispose();
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
            ground: null, water: null, lava: null, detail: null, poi: null, poiSig: null
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
        if (tile.poi) tile.poi.geometry.dispose();
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
        if (tile.poi) tile.poi.material = lit ? this.mats.terrain : this.mats.terrainFog;
    }

    // Landmark models (eggs, fallen sauropods, wallows...) sit on their tile
    syncPois(state) {
        for (const [key, poi] of state.pois || []) {
            const tile = this.tiles.get(key);
            if (!tile) continue;
            if (poi.type === 'eggs' && tile.terrain === 'nest') continue; // the nest already shows its clutch
            const sig = `${poi.type}:${poi.portions ?? ''}`;
            if (tile.poiSig === sig) continue;
            if (tile.poi) {
                tile.group.remove(tile.poi);
                tile.poi.geometry.dispose();
            }
            tile.poi = buildPoiMesh(poi, tile.lit ? this.mats.terrain : this.mats.terrainFog);
            tile.poiSig = sig;
            if (tile.poi) {
                tile.poi.position.y += tile.surfaceY;
                tile.group.add(tile.poi);
            }
        }
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
            addOutlines(model.root, this.mats.outline, (m) => m.material === this.mats.wing);
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
                    v.leaveT = 0;
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
            gait: model.gait, role: roleOf(c.species, model.gait), pos: new THREE.Vector3(), target: new THREE.Vector3(),
            yaw: rand() * Math.PI * 2, mv: 0, phase: rand() * 10, nextWander: this.time + rand() * 3,
            appear: 0, alt: 0, angle: rand() * Math.PI * 2, angSpeed: (0.4 + rand() * 0.4) * (rand() > 0.5 ? 1 : -1),
            centre: new THREE.Vector3(), hop: 0,
            idle: null, alertUntil: 0, look: 0, graze: 0, browse: 0, call: 0, crouch: 0, rest: 0, sniff: 0, stepPhase: 0, burst: 0
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
        v.idle = null;
        v.rest = 0;
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
        const spot = new THREE.Vector3(tile.x + x * scale, 0, tile.z + z * scale);
        // herds keep together
        if (v.role === 'grazer' || v.role === 'browser') {
            let n = 0;
            const c = new THREE.Vector3();
            for (const o of this.creatures.values()) {
                if (o === v || o.species !== v.species || o.hexKey !== hexKey || o.dying) continue;
                c.add(o.pos);
                n++;
            }
            if (n) spot.lerp(c.multiplyScalar(1 / n), 0.55);
        }
        // prey on Big Al's cell keeps its distance
        if (hexKey === this.state?.player && this.player && v.role !== 'hunter') {
            const away = spot.clone().sub(this.player.to);
            if (away.lengthSq() < 0.25) spot.add(away.normalize().multiplyScalar(0.35));
        }
        return spot;
    }

    // Animals notice Big Al arriving next to or among them
    alertNearby(state) {
        const here = state.cells.get(state.player);
        const near = new Set([state.player, ...(here?.neighbors || [])]);
        for (const v of this.creatures.values()) {
            if (!near.has(v.hexKey) || v.dying || v.role === 'air') continue;
            v.alertUntil = this.time + 2.5 + v.rand() * 2;
            v.idle = null;
            v.rest = 0;
        }
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

    // Pick what an animal does next when it has nothing to react to
    chooseIdle(v) {
        const r = v.rand();
        const night = this.light.phase >= DAY_LENGTH;
        const dur = (a, b) => a + v.rand() * (b - a);
        switch (v.role) {
            case 'grazer':
                if (r < 0.45) return { kind: 'graze', dur: dur(3, 7) };
                if (r < 0.65) return { kind: 'look', dur: dur(1.5, 3), dir: (v.rand() - 0.5) * 2 };
                if (r < 0.7) return { kind: 'call', dur: 1.4 };
                return null;
            case 'browser':
                if (r < 0.5) return { kind: HIGH_BROWSERS.has(v.species) || v.rand() < 0.4 ? 'browse' : 'graze', dur: dur(4, 9) };
                if (r < 0.65) return { kind: 'look', dur: dur(2, 4), dir: (v.rand() - 0.5) * 2 };
                if (r < 0.71) return { kind: 'call', dur: 2 };
                return null;
            case 'hunter':
                if (r < 0.28) return { kind: 'sniff', dur: dur(1.5, 3) };
                if (r < 0.55) return { kind: 'look', dur: dur(1.5, 3.5), dir: (v.rand() - 0.5) * 2 };
                if (r < 0.62) return { kind: 'call', dur: 1.5 };
                if (night && r < 0.8) return { kind: 'rest', dur: dur(6, 12) };
                return null;
            case 'critter':
                if (r < 0.35) return { kind: 'look', dur: dur(0.6, 1.6), dir: (v.rand() - 0.5) * 2 };
                if (r < 0.5) return { kind: 'graze', dur: dur(1, 2.5) };
                return null;
            default:
                return null;
        }
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
        const scale = v.len * (v.appear < 1 ? Math.max(0.001, easeOutBack(v.appear)) : 1);

        const p = this.player;
        const alert = t < v.alertUntil && p;
        const toPlayer = p ? Math.atan2(-(p.pos.z - v.pos.z), p.pos.x - v.pos.x) : 0;
        const sameCell = v.hexKey === this.state?.player;

        // charging into Big Al's area: run at him, then strike
        if (v.pendingAttack && p) {
            v.pendingAttack.t += dt;
            const reach = 0.12 + v.len * 0.35 + p.len * 0.25;
            const dir = new THREE.Vector3(v.pos.x - p.pos.x, 0, v.pos.z - p.pos.z);
            if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
            dir.normalize();
            v.target.set(p.pos.x + dir.x * reach, 0, p.pos.z + dir.z * reach);
            v.urgent = 1;
            if (Math.hypot(v.target.x - v.pos.x, v.target.z - v.pos.z) < 0.06 || v.pendingAttack.t > 1.4) {
                v.attack = { t: 0, target: p.pos.clone() };
                v.pendingAttack = null;
                v.alertUntil = t + 3;
            }
        }

        // idle behaviour state machine
        if (!v.pendingAttack && !v.urgent && v.gait !== 'fly' && v.gait !== 'flutter') {
            if (v.idle) {
                v.idle.t += dt;
                if (v.idle.t > v.idle.dur || alert) v.idle = null;
            } else if (!alert && v.mv < 0.05 && t > v.nextWander - 1.5 && v.rand() < dt * 1.2) {
                v.idle = this.chooseIdle(v);
                if (v.idle) {
                    v.idle.t = 0;
                    v.nextWander = t + v.idle.dur + 0.5 + v.rand() * 2;
                    if (v.idle.kind === 'call') this.soundRing(v);
                }
            }
        }
        const idle = v.idle?.kind;
        const env = v.idle ? envelope(v.idle.t, v.idle.dur) : 0;
        v.graze = approach(v.graze, idle === 'graze' ? env : 0, dt, 5);
        v.browse = approach(v.browse, idle === 'browse' ? env : 0, dt, 3);
        v.call = approach(v.call, idle === 'call' ? Math.sin(Math.PI * Math.min(1, v.idle.t / v.idle.dur)) : 0, dt, 9);
        v.sniff = approach(v.sniff, idle === 'sniff' ? env : 0, dt, 6);
        v.rest = approach(v.rest, idle === 'rest' ? env : 0, dt, 1.5);
        // stalking hunters crouch low and stare
        const stalking = alert && v.role === 'hunter';
        v.crouch = approach(v.crouch, stalking ? 1 : 0, dt, 3);
        let lookGoal = 0;
        if (alert) lookGoal = Math.max(-1, Math.min(1, angleDiff(v.yaw, toPlayer) / 0.9));
        else if (idle === 'look') lookGoal = v.idle.dir * env;
        v.look = approach(v.look, lookGoal, dt, 4);

        const speedBase = GAIT_SPEED[v.gait] ?? 0.6;
        // small animals dart in bursts
        if (v.role === 'critter' && v.mv > 0.5 && v.rand() < dt * 0.8) v.burst = 0.6;
        v.burst = Math.max(0, v.burst - dt);
        const speed = speedBase * (0.35 + v.len * 0.55) * (v.urgent ? 2.2 : 1) * (v.burst > 0 ? 2.2 : 1) * (stalking ? 0.45 : 1);

        if (v.gait === 'fly') {
            // circle above the cell, drifting to a new centre when relocated
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
            const busy = v.idle && v.idle.kind !== 'look';
            if (t > v.nextWander && !v.urgent && !busy && !v.pendingAttack) {
                // prey on edge moves away from Big Al; others wander
                v.target.copy(this.pickSpot(v, v.hexKey));
                if (alert && v.role !== 'hunter' && sameCell && p) {
                    const away = v.target.clone().sub(p.pos);
                    if (away.lengthSq() < 0.6) v.target.add(away.normalize().multiplyScalar(0.3));
                }
                v.nextWander = t + (v.role === 'critter' ? 1.2 : 2.5) + v.rand() * (v.role === 'browser' ? 9 : 6);
            }
            const dx = v.target.x - v.pos.x;
            const dz = v.target.z - v.pos.z;
            const dist = Math.hypot(dx, dz);
            const frozen = alert && !v.urgent && !v.pendingAttack && t < v.alertUntil - 1.2 && v.role !== 'hunter';
            if (dist > 0.02 && !busy && !frozen) {
                const step = Math.min(dist, speed * dt);
                v.pos.x += (dx / dist) * step;
                v.pos.z += (dz / dist) * step;
                v.yaw = lerpAngle(v.yaw, Math.atan2(-dz, dx), damp(dt, 7));
                v.mv = Math.min(1, v.mv + dt * 5);
                if (v.gait === 'hop') v.hop = (v.hop + dt * 2.8) % 1;
            } else {
                v.mv = Math.max(0, v.mv - dt * 4);
                if (dist <= 0.02) v.urgent = 0;
                if (v.gait === 'hop') v.hop = 0;
                if (stalking) v.yaw = lerpAngle(v.yaw, toPlayer, damp(dt, 2));
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
            const k = Math.max(0, v.attack.t) / 0.8;
            if (k >= 1) v.attack = null;
            else {
                attack = Math.sin(Math.PI * k);
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
            const k = v.rear.t / 1.4;
            if (k >= 1) v.rear = null;
            else {
                rear = Math.sin(Math.PI * k);
                jaw = Math.max(jaw, rear);
                if (p) v.yaw = lerpAngle(v.yaw, toPlayer, damp(dt, 8));
            }
        }

        // heavy footfalls
        const sp = speed / Math.max(0.1, v.len);
        v.phase += dt * sp * 5.5 * Math.max(0.15, v.mv);
        if (v.len > 1.05 && v.mv > 0.3 && (v.gait === 'quad' || v.gait === 'biped')) {
            const step = Math.floor(v.phase / Math.PI);
            if (step !== v.stepPhase) {
                v.stepPhase = step;
                this.dust(v.pos, 0.6 + v.len * 0.4);
                if (v.len > 1.45 && Math.hypot(v.pos.x - this.cam.target.x, v.pos.z - this.cam.target.z) < 5) this.cam.shake = Math.max(this.cam.shake, 0.05);
            }
        }

        m.root.position.set(v.pos.x, y - v.rest * 0.02, v.pos.z);
        m.root.rotation.set(0, v.yaw, 0);
        m.root.scale.setScalar(scale);
        animateModel(m, t, {
            phase: v.phase, moving: v.mv, attack, jaw, rear,
            look: v.look, graze: v.graze, browse: v.browse, call: v.call, crouch: v.crouch, rest: v.rest, sniff: v.sniff
        });
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
        addOutlines(mesh, this.mats.outline);
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

    // ==================== TRACES: blood trails and scent ====================
    syncTraces(state, prev) {
        if (!prev || prev.blood !== state.blood || prev.cells !== state.cells) {
            const want = state.blood || new Map();
            for (const [key, mesh] of this.bloodMarks) {
                if (!want.has(key) || !this.tiles.get(key)) {
                    this.markerGroup.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    this.bloodMarks.delete(key);
                }
            }
            for (const key of want.keys()) {
                const tile = this.tiles.get(key);
                if (!tile || this.bloodMarks.has(key)) continue;
                const rand = mulberry32(hashString(`blood${key}`));
                const mb = new MeshBuilder();
                for (let i = 0; i < 7; i++) {
                    const [x, z] = randomPointInCell(tile.localPoly, rand, 0.1, 0.2);
                    const r = 0.03 + rand() * 0.05;
                    const pts = [];
                    for (let k = 0; k < 6; k++) {
                        const a = (k / 6) * Math.PI * 2;
                        pts.push([x + Math.cos(a) * r * (0.7 + rand() * 0.6), 0, z + Math.sin(a) * r * (0.7 + rand() * 0.6)]);
                    }
                    for (let k = 0; k < 6; k++) mb.tri([x, 0, z], pts[k], pts[(k + 1) % 6], rand() > 0.5 ? '#7a1010' : '#5a0a0a', [0, 1, 0], true);
                }
                const mesh = new THREE.Mesh(mb.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
                mesh.renderOrder = 3;
                mesh.position.set(tile.x, tile.surfaceY + 0.014, tile.z);
                this.markerGroup.add(mesh);
                this.bloodMarks.set(key, mesh);
            }
        }
        if (!prev || prev.scent !== state.scent || prev.moveNumber !== state.moveNumber) {
            const list = (state.scent || []).filter((s) => s.hidden);
            this.scentSprites.forEach((sp, i) => {
                const s = list[i];
                if (!s) {
                    sp.visible = false;
                    return;
                }
                const c = this.world.byKey.get(s.key);
                const tile = this.tiles.get(s.key);
                sp.visible = true;
                sp.material.map = s.kind === 'creature' ? this.scentTex.creature : this.scentTex.food;
                sp.userData = { x: c.x, z: c.z, y: tile ? tile.surfaceY : cellSurfaceY(c), age: state.moveNumber - s.turn, i };
            });
        }
    }

    updateTraces() {
        for (const [key, mesh] of this.bloodMarks) {
            const tile = this.tiles.get(key);
            if (tile) mesh.position.y = tile.surfaceY + tile.group.position.y + 0.014;
        }
        for (const sp of this.scentSprites) {
            if (!sp.visible) continue;
            const d = sp.userData;
            const fade = Math.max(0.25, 1 - d.age / 3.5);
            sp.position.set(d.x + Math.sin(this.time * 0.8 + d.i) * 0.15, d.y + 0.9 + Math.sin(this.time * 1.6 + d.i * 1.3) * 0.12, d.z);
            sp.material.opacity = fade * (0.75 + Math.sin(this.time * 3 + d.i) * 0.2);
            sp.scale.setScalar(0.55 + Math.sin(this.time * 2 + d.i) * 0.05);
        }
    }

    // ==================== PLAYER ====================
    syncPlayer(state, prev) {
        const w = this.world.byKey.get(state.player);
        if (!this.player || this.player.level !== state.level) {
            const old = this.player;
            const tpl = buildBigAl(state.level, { mat: this.mats.creature, wingMat: this.mats.wing });
            addOutlines(tpl.root, this.mats.outline, (m) => m.material === this.mats.wing);
            const model = this.instantiate(tpl);
            model.seed = 3;
            this.actorGroup.add(model.root);
            this.player = {
                model, level: state.level, pos: old ? old.pos.clone() : new THREE.Vector3(w.x, 0, w.z),
                from: new THREE.Vector3(), to: new THREE.Vector3(w.x, 0, w.z), moveT: 1, moveDur: 0.55, yaw: old ? old.yaw : -Math.PI / 2,
                phase: 0, len: old ? old.len : displayLength(state.weight, 0.2) * 1.15, hurt: 0, attack: null, grow: old ? 0 : 1, dead: 0,
                anim: null, idleAt: this.time + 6, idle: null, look: 0, graze: 0, sniff: 0, call: 0, rest: 0
            };
            if (old) {
                this.actorGroup.remove(old.model.root);
                old.model.mat.dispose();
                this.burst(this.player.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffd84a', 24);
            }
            if (!old) {
                this.cam.target.set(w.x, 0.3, w.z);
                this.cam.goal.copy(this.cam.target);
            }
        }
        const p = this.player;
        if (Math.abs(p.to.x - w.x) > 1e-4 || Math.abs(p.to.z - w.z) > 1e-4) {
            p.from.copy(p.pos);
            p.to.set(w.x, 0, w.z);
            p.moveT = 0;
            p.anim = null;
            p.idle = null;
            p.idleAt = this.time + 5 + Math.random() * 4;
            this.cam.follow = true;
            if (prev && Math.hypot(p.to.x - p.from.x, p.to.z - p.from.z) > 3) {
                // teleport (restart)
                p.pos.copy(p.to);
                p.moveT = 1;
            }
        }
        p.lenGoal = displayLength(state.weight, 0.2) * 1.15;
        if (this.lastFitness !== null && state.fitness < this.lastFitness - 0.5) {
            // a charging attacker lands its hit when it arrives
            if (this.hurtDelay > 0) this.pendingHurt = this.time + this.hurtDelay;
            else this.hurtPlayer();
        }
        this.hurtDelay = 0;
        this.lastFitness = state.fitness;
        p.gameOver = state.gameOver;
        if (!state.gameOver) p.dead = 0;
    }

    hurtPlayer() {
        const p = this.player;
        if (!p) return;
        p.hurt = 1;
        this.cam.shake = 0.25;
        this.burst(p.pos.clone().add(new THREE.Vector3(0, p.len * 0.3, 0)), '#d02828', 14);
    }

    updatePlayer(dt) {
        const p = this.player;
        if (!p) return;
        const m = p.model;
        p.len += (p.lenGoal - p.len) * damp(dt, 2);
        if (this.pendingHurt && this.time >= this.pendingHurt) {
            this.pendingHurt = null;
            this.hurtPlayer();
        }
        let moving = 0;
        if (p.moveT < 1) {
            p.moveT = Math.min(1, p.moveT + dt / p.moveDur);
            const k = p.moveT < 0.5 ? 2 * p.moveT * p.moveT : 1 - Math.pow(-2 * p.moveT + 2, 2) / 2;
            p.pos.lerpVectors(p.from, p.to, k);
            const dx = p.to.x - p.from.x;
            const dz = p.to.z - p.from.z;
            if (Math.abs(dx) + Math.abs(dz) > 1e-4) p.yaw = lerpAngle(p.yaw, Math.atan2(-dz, dx), damp(dt, 14));
            moving = 1;
            p.phase += dt * (p.moveDur < 0.5 ? 26 : 16);
            if (Math.random() < dt * (p.moveDur < 0.5 ? 40 : 12)) this.dust(p.pos);
            if (p.moveT >= 1) p.moveDur = 0.55;
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

        // actions (sleep, drink, sniff, roar) and little idle moments
        let rest = 0;
        let graze = 0;
        let sniff = 0;
        let call = 0;
        let look = Math.sin(this.time * 0.3) * 0.4;
        if (p.anim) {
            p.anim.t += dt;
            const e = envelope(p.anim.t, p.anim.dur, 0.4, 0.5);
            if (p.anim.type === 'sleep') {
                rest = e;
                look = 0;
                p.zTimer = (p.zTimer || 0) + dt;
                if (p.zTimer > 0.55 && p.anim.t < p.anim.dur - 0.6) {
                    p.zTimer = 0;
                    this.sleepZ(p);
                }
            } else if (p.anim.type === 'drink') {
                graze = e;
                if (p.anim.t > 0.5 && !p.anim.splashed) {
                    p.anim.splashed = true;
                    this.ripple(p.pos, '#bfe8ff', 0.5);
                }
            } else if (p.anim.type === 'sniff') {
                sniff = e;
            } else if (p.anim.type === 'roar') {
                call = Math.sin(Math.PI * Math.min(1, p.anim.t / p.anim.dur));
            }
            if (p.anim.t >= p.anim.dur) p.anim = null;
        } else if (!moving && !p.gameOver) {
            if (!p.idle && this.time > p.idleAt) {
                const r = Math.random();
                p.idle = { kind: r < 0.45 ? 'look' : r < 0.8 ? 'sniff' : 'graze', t: 0, dur: 1.5 + Math.random() * 1.5, dir: Math.random() > 0.5 ? 1 : -1 };
            }
            if (p.idle) {
                p.idle.t += dt;
                const e = envelope(p.idle.t, p.idle.dur);
                if (p.idle.kind === 'look') look = p.idle.dir * e;
                else if (p.idle.kind === 'sniff') sniff = e * 0.8;
                else graze = e * 0.6;
                if (p.idle.t >= p.idle.dur) {
                    p.idle = null;
                    p.idleAt = this.time + 5 + Math.random() * 6;
                }
            }
        }
        p.rest = approach(p.rest, rest, dt, 6);
        p.graze = approach(p.graze, graze, dt, 7);
        p.sniff = approach(p.sniff, sniff, dt, 7);
        p.call = approach(p.call, call, dt, 10);
        p.look = approach(p.look, look, dt, 4);

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
        animateModel(m, this.time, {
            phase: p.phase, moving, attack, jaw: attack, look: p.look,
            rest: p.rest, graze: p.graze, sniff: p.sniff, call: p.call
        });
        this.playerRing.position.set(p.pos.x, y + 0.012, p.pos.z);
        this.playerRing.scale.setScalar(0.32 + p.len * 0.25);
        this.playerRing.material.opacity = (0.55 + Math.sin(this.time * 3) * 0.2) * (1 - p.rest * 0.7);
        this.playerRing.material.color.set(this.state?.dashArmed ? '#ffe070' : '#ffb020');
    }

    // ==================== EVENTS ====================
    syncEvents(state) {
        for (const e of state.creatureBehaviorLog || []) {
            if (!e.id || this.seenLog.has(e.id)) continue;
            this.seenLog.add(e.id);
            const v = e.creatureId ? this.creatures.get(e.creatureId) : null;
            if ((e.type === 'creature_attack' || e.type === 'creature_miss') && v && this.player) {
                if (e.charged && v.hexKey !== state.player) {
                    v.pendingAttack = { t: 0 };
                    if (e.type === 'creature_attack') this.hurtDelay = 0.75;
                } else {
                    v.attack = { t: 0, target: this.player.pos.clone() };
                }
                v.idle = null;
                v.rest = 0;
                v.alertUntil = this.time + 4;
            } else if (e.type === 'creature_display' && v) {
                v.rear = { t: 0 };
                v.idle = null;
                this.exclaim(v);
            } else if (e.type === 'creature_hunt') {
                if (v) {
                    const victim = e.victimId ? this.creatures.get(e.victimId) : null;
                    v.attack = { t: 0, target: victim ? victim.pos.clone() : null };
                }
                if (e.victimId) this.pendingDeaths.set(e.victimId, 'death');
            } else if (e.type === 'creature_died') {
                this.pendingDeaths.set(e.creatureId, 'death');
            } else if (e.type === 'creature_flee' && v) {
                this.pendingDeaths.set(e.creatureId, 'flee');
            }
        }
        if (this.seenLog.size > 400) this.seenLog = new Set([...this.seenLog].slice(-200));

        const a = state.lastPlayerAction;
        // don't replay an action that happened before this renderer existed
        if (this.lastPlayerActionId === undefined) this.lastPlayerActionId = a?.id ?? null;
        if (a && a.id !== this.lastPlayerActionId) {
            this.lastPlayerActionId = a.id;
            const p = this.player;
            if (!p) return;
            if (a.type === 'attack' && a.creatureId) {
                const v = this.creatures.get(a.creatureId);
                const target = v ? v.pos.clone() : null;
                const hit = v ? v.pos.clone().add(new THREE.Vector3(0, v.len * 0.25 + 0.05, 0)) : null;
                const lands = a.outcome === 'kill' || a.outcome === 'wound';
                p.attack = { t: 0, target, hitAt: lands ? hit : null, color: '#b02020' };
                if (a.outcome === 'kill') {
                    this.pendingDeaths.set(a.creatureId, 'death');
                    this.cam.shake = Math.max(this.cam.shake, 0.08);
                } else if (a.outcome === 'hurt' && v) {
                    v.attack = { t: -0.25, target: p.pos.clone() };
                } else if (v) {
                    v.alertUntil = this.time + 3;
                }
            } else if (a.type === 'scavenge') {
                p.attack = { t: 0, target: null };
                this.burst(p.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#8a2a24', 8);
            } else if (a.type === 'sleep') {
                p.anim = { type: 'sleep', t: 0, dur: 2.6 };
            } else if (a.type === 'drink') {
                p.anim = { type: 'drink', t: 0, dur: 1.8 };
            } else if (a.type === 'sniff') {
                p.anim = { type: 'sniff', t: 0, dur: 1.6 };
                this.ripple(p.pos, '#c8a8ff', 4.5, 1.6);
            } else if (a.type === 'roar') {
                p.anim = { type: 'roar', t: 0, dur: 1.3 };
                this.cam.shake = Math.max(this.cam.shake, 0.3);
                this.soundRing({ pos: p.pos, len: p.len, model: p.model }, 1.6);
                this.ripple(p.pos, '#ffd890', 3, 1.1);
            } else if (a.type === 'dash') {
                p.moveDur = 0.3;
                for (let i = 0; i < 6; i++) this.dust(p.pos, 1.2);
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
        this.ringGeo = pr.build();
        this.playerRing = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: 0.7, depthWrite: false, vertexColors: true }));
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

        // scent wisps (purple: animals, red: food and blood) for things smelled out of sight
        const wisp = (color) => iconTexture((g) => {
            const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            g.strokeStyle = 'rgba(255,255,255,0.9)';
            g.lineWidth = 3.5;
            g.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
                g.beginPath();
                const y0 = 22 + k * 10;
                g.moveTo(18, y0);
                g.bezierCurveTo(26, y0 - 6, 34, y0 + 6, 46, y0 - 2);
                g.stroke();
            }
        });
        this.scentTex = { creature: wisp('rgba(170,120,255,0.95)'), food: wisp('rgba(235,80,70,0.95)') };
        this.scentSprites = Array.from({ length: 30 }, () => {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.scentTex.creature, transparent: true, depthTest: false }));
            s.visible = false;
            s.renderOrder = 11;
            this.markerGroup.add(s);
            return s;
        });
        this.zTex = iconTexture((g) => {
            g.font = 'bold 46px "Pixelify Sans", monospace';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.lineWidth = 6;
            g.strokeStyle = '#1a1a3a';
            g.strokeText('z', 32, 34);
            g.fillStyle = '#e8ecff';
            g.fillText('z', 32, 34);
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
                ring.material.color.set(this.state?.dashArmed ? '#ffe880' : '#ffc23a');
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
        addOutlines(tpl.root, this.mats.outline, (m) => m.material === this.mats.wing);
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
            const t = new THREE.CanvasTexture(cv);
            t.colorSpace = THREE.SRGBColorSpace;
            return t;
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

    dust(pos, size = 1) {
        const mat = new THREE.MeshLambertMaterial({ color: '#d8c8a0', transparent: true, opacity: 0.7 });
        const m = new THREE.Mesh(this.puffGeo, mat);
        m.position.set(pos.x + (Math.random() - 0.5) * 0.2 * size, this.groundAt(pos.x, pos.z) + 0.04, pos.z + (Math.random() - 0.5) * 0.2 * size);
        const baseScale = (0.4 + Math.random() * 0.3) * size;
        m.scale.setScalar(baseScale);
        this.fxGroup.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(0, 0.25, 0), life: 0.6, t: 0, gravity: 0, grow: 1.2, baseScale, mat, fade: true });
    }

    // flat expanding ring on the ground (scent pulse, roar, splash)
    ripple(pos, color, size = 1, life = 0.9) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, vertexColors: true });
        const m = new THREE.Mesh(this.ringGeo, mat);
        m.renderOrder = 6;
        m.position.set(pos.x, this.groundAt(pos.x, pos.z) + 0.03, pos.z);
        m.scale.setScalar(0.1);
        this.fxGroup.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(), life, t: 0, gravity: 0, grow: size * 10, baseScale: 0.1, mat, fade: true, maxOpacity: 0.85 });
    }

    // ring rising from an animal's head when it calls or roars
    soundRing(v, size = 1) {
        const mat = new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.6, depthWrite: false, vertexColors: true, side: THREE.DoubleSide });
        const m = new THREE.Mesh(this.ringGeo, mat);
        m.renderOrder = 7;
        const h = (v.model?.height || 0.4) * v.len;
        m.position.set(v.pos.x, this.groundAt(v.pos.x, v.pos.z) + h * 0.9, v.pos.z);
        m.scale.setScalar(0.05);
        this.fxGroup.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(0, 0.15, 0), life: 1.1, t: 0, gravity: 0, grow: 8 * size * (0.4 + v.len * 0.5), baseScale: 0.05, mat, fade: true, maxOpacity: 0.6 });
    }

    sleepZ(p) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.zTex, transparent: true, depthTest: false }));
        s.renderOrder = 12;
        s.position.set(p.pos.x + 0.1, this.groundAt(p.pos.x, p.pos.z) + p.len * 0.3 + 0.1, p.pos.z);
        s.scale.setScalar(0.22);
        this.fxGroup.add(s);
        this.particles.push({ mesh: s, vel: new THREE.Vector3(0.12, 0.45, 0), life: 1.6, t: 0, gravity: 0, grow: 0.8, baseScale: 0.22, mat: s.material, fade: true, maxOpacity: 1, sprite: true });
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

        const phase = Math.max(0, this.light.phase);
        this.mist.update(dt, t, this.tiles, phase, this.cam.target, MIST_TINT[phase]);
    }

    updateLighting(dt) {
        const target = PHASES[Math.max(0, this.light.phase)];
        const sky = SKIES[Math.max(0, this.light.phase)];
        if (!this.light.cur) {
            this.light.cur = {
                sun: new THREE.Color(target.sun), sky: new THREE.Color(target.sky), ground: new THREE.Color(target.ground),
                sunI: target.sunI, hemiI: target.hemiI, az: target.sunAz, el: target.sunEl,
                top: new THREE.Color(sky.top), horizon: new THREE.Color(sky.horizon), glow: new THREE.Color(sky.glow), gx: sky.gx
            };
        }
        const c = this.light.cur;
        const k = damp(dt, 1.4);
        c.sun.lerp(new THREE.Color(target.sun), k);
        c.sky.lerp(new THREE.Color(target.sky), k);
        c.ground.lerp(new THREE.Color(target.ground), k);
        c.top.lerp(new THREE.Color(sky.top), k);
        c.horizon.lerp(new THREE.Color(sky.horizon), k);
        c.glow.lerp(new THREE.Color(sky.glow), k);
        c.gx += (sky.gx - c.gx) * k;
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
        this.postfx.setSky(c.top, c.horizon, c.glow, c.gx);
    }

    // ==================== CAMERA & INPUT ====================
    resize() {
        const w = Math.max(1, this.container.clientWidth);
        const h = Math.max(1, this.container.clientHeight);
        const pr = this.renderer.getPixelRatio();
        this.renderer.setSize(w, h, false);
        this.postfx.setSize(w, h, pr);
        outlineUniforms.uResolution.value.set(w * pr, h * pr);
        outlineUniforms.uWidth.value = 2.4 * pr;
        this.cam.aspect = w / h;
        this.cam.lastZoom = null;
    }

    updateCamera(dt) {
        const c = this.cam;
        if (c.follow && this.player) {
            const p = this.player.pos;
            c.goal.set(p.x, this.groundAt(p.x, p.z), p.z);
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
        // soft camera: everything eases toward its goal
        c.target.lerp(c.goal, damp(dt, c.follow ? 3.5 : 9));
        c.az = c.az + (c.azGoal - c.az) * damp(dt, 6);
        c.el = c.el + (c.elGoal - c.el) * damp(dt, 6);
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
            c.target.x + Math.cos(c.az) * Math.cos(c.el) * CAM_DIST + sx,
            c.target.y + Math.sin(c.el) * CAM_DIST,
            c.target.z + Math.sin(c.az) * Math.cos(c.el) * CAM_DIST + sz
        );
        this.camera.lookAt(c.target.x + sx, c.target.y, c.target.z + sz);
    }

    // move the camera goal in screen-aligned ground directions (world units)
    panBy(right, up) {
        const az = this.cam.az;
        const rx = Math.sin(az);
        const rz = -Math.cos(az);
        const fx = -Math.cos(az);
        const fz = -Math.sin(az);
        this.cam.goal.x += rx * right + fx * up;
        this.cam.goal.z += rz * right + fz * up;
    }

    bindInput() {
        const el = this.renderer.domElement;
        this.onPointerDown = (e) => {
            // left drag pans; right / middle drag (or shift + left) orbits
            const orbit = e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey);
            if (e.pointerType === 'mouse' && e.button !== 0 && !orbit) return;
            this.pointer.down = { x: e.clientX, y: e.clientY, orbit, button: e.button };
            this.pointer.mode = null;
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
            if (!d) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!this.pointer.mode && Math.hypot(dx, dy) > 5) {
                this.pointer.mode = d.orbit ? 'orbit' : 'pan';
                if (!d.orbit) this.cam.follow = false;
                el.style.cursor = d.orbit ? 'ew-resize' : 'grabbing';
            }
            if (this.pointer.mode === 'pan') {
                const worldPerPx = (2 * BASE_HALF_H / this.cam.zoom) / rect.height;
                this.panBy(-dx * worldPerPx, dy * worldPerPx / Math.sin(this.cam.el));
                // drag follows the hand immediately
                this.cam.target.copy(this.cam.goal);
            } else if (this.pointer.mode === 'orbit') {
                this.cam.azGoal += dx * 0.008;
                this.cam.elGoal = Math.max(0.32, Math.min(1.3, this.cam.elGoal + dy * 0.005));
            }
            if (this.pointer.mode) {
                d.x = e.clientX;
                d.y = e.clientY;
            }
        };
        this.onPointerUp = () => {
            const d = this.pointer.down;
            this.pointer.down = null;
            if (d && !this.pointer.mode && d.button === 0) {
                const key = this.pick();
                if (key) this.cb.onHexClick?.(key);
            }
            this.pointer.mode = null;
            el.style.cursor = '';
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
        this.onContextMenu = (e) => e.preventDefault();
        this.onKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
                this.keysDown.add(k);
                e.preventDefault();
            } else if (k === 'q') this.rotate(-1);
            else if (k === 'e') this.rotate(1);
            else if (k === 'c') this.centerOnPlayer();
            else if (k === 'v') this.resetView();
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
        el.addEventListener('contextmenu', this.onContextMenu);
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
        el.removeEventListener('contextmenu', this.onContextMenu);
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
        if (!this.pointer.inside || this.pointer.mode) return;
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
        const prevAz = this.cam.az;
        const prevEl = this.cam.el;
        this.updateCamera(dt);
        this.cameraMoved = prevTarget.distanceToSquared(this.cam.target) > 1e-6 || Math.abs(prevAz - this.cam.az) > 1e-4 || Math.abs(prevEl - this.cam.el) > 1e-4;
        this.updateLighting(dt);
        for (const v of [...this.creatures.values()]) this.updateCreature(v, dt);
        this.updatePlayer(dt);
        this.updateMarkers();
        this.updateTraces();
        this.updateAmbient(dt);
        this.updateParticles(dt);
        this.updateHover();
        this.postfx.render(dt);
    }
}
