// ==================== SPINO: ROAMING EXPERIMENT ====================
// A real-time, third-person Spinosaurus in the Kem Kem world at its real size, drawn in
// the Spino game's comic style.
import * as THREE from 'three';
import './roam.css';
import { createMaterials, sharedUniforms, advanceWind } from '../three/materials.js';
import { createOutlineMaterial, outlineUniforms } from '../three/outline.js';
import { CREATURE_STYLE } from '../three/creatures3d.js';
import { RoamWorld } from './world.js';
import { Terrain } from './terrain.js';
import { Water } from './water.js';
import { Sky } from './sky.js';
import { ComicFX } from './postfx.js';
import { Player } from './player.js';
import { Fauna } from './fauna.js';
import { Hud } from './hud.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

// animals are seen close up here: finer bodies and real eyes
CREATURE_STYLE.detail = 1.6;
CREATURE_STYLE.eyes = 'real';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 1234;

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
const pr = Math.min(1.5, window.devicePixelRatio || 1);
renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 3500);
const mats = createMaterials();
const ctx = { mat: mats.creature, wingMat: mats.wing, outline: createOutlineMaterial() };
outlineUniforms.uWidth.value = 2.2;

const hud = new Hud(document.getElementById('hud'));
const world = new RoamWorld(seed);
const terrain = new Terrain(world, scene, mats);
const water = new Water(world, scene);
const sky = new Sky(scene, 0.3);
const fx = new ComicFX(renderer, scene, camera);
let player = new Player(world, terrain, scene, ctx);
const fauna = new Fauna(world, scene, ctx, hud);

const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    fx.setSize(innerWidth, innerHeight, pr);
    outlineUniforms.uResolution.value.set(innerWidth * pr, innerHeight * pr);
};
addEventListener('resize', resize);
resize();

// ---------- input ----------
const input = { keys: {}, dx: 0, dy: 0, wheel: 0, locked: false };
addEventListener('keydown', (e) => { input.keys[e.code] = true; });
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('blur', () => { input.keys = {}; });
const canvas = renderer.domElement;
document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
    if (!input.locked && started && !player.dead) hud.showStart('Click to continue');
});
addEventListener('mousemove', (e) => {
    if (input.locked || input.drag) { input.dx += e.movementX; input.dy += e.movementY; }
});
canvas.addEventListener('mousedown', (e) => {
    if (!started) return;
    if (!input.locked && canvas.requestPointerLock) { canvas.requestPointerLock(); }
    if (e.button === 0) input.biteQueued = true;
    if (e.button === 2) input.drag = true;
});
addEventListener('mouseup', (e) => { if (e.button === 2) input.drag = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { input.wheel += e.deltaY; }, { passive: true });

let started = false;
const start = () => {
    started = true;
    hud.hideStart();
    canvas.requestPointerLock?.();
};

// ---------- loading: build the land around the start before showing it ----------
let loading = true;
const clock = new THREE.Clock();
let time = 0;
let wind = { a: Math.random() * 6, s: 0.35 };

let frames = 0;
const frame = () => {
    frames++;
    window.roam && (window.roam.frames = frames);
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;
    sharedUniforms.uTime.value = time;
    wind.a += dt * 0.02;
    const gust = 0.35 + Math.sin(time * 0.21) * 0.1 + Math.sin(time * 0.67) * 0.05;
    sharedUniforms.uWind.value.set(Math.cos(wind.a), Math.sin(wind.a), gust);
    advanceWind(dt);

    const stillLoading = terrain.update(player.pos.x, player.pos.z, loading ? 6 : 1, time);
    if (loading && !stillLoading) {
        loading = false;
        terrain.rebuildFlora(player.pos.x, player.pos.z);
        hud.ready(start);
    }
    if (started && !loading) {
        player.update(dt, time, input);
        if (input.biteQueued) {
            input.biteQueued = false;
            if (player.bite()) {
                const r = fauna.bite(player);
                if (r && r.eat) hud.say(`You eat. +${Math.round(r.eat)} hunger`);
                else if (r && r.hit && !r.c.dead) hud.say(`You bite the ${r.c.species}.`);
            }
        }
        fauna.update(dt, time, player, sky.isNight ? 3 : sky.dayFraction < 0.32 ? 0 : sky.dayFraction > 0.7 ? 2 : 1);
        sky.update(dt, player.pos, camera);
        if (player.dead && !player.deathShown) {
            player.deathShown = true;
            document.exitPointerLock?.();
            const why = player.lastHurtBy === 'hunger' ? 'You starved. Spinosaurus needed a lot of fish.' : `The ${player.lastHurtBy} got the better of you.`;
            hud.dead(why, () => location.reload());
        }
    } else {
        sky.update(0, player.pos, camera);
        if (!input.locked) input.dx += dt * 25; // a slow turn around Spino on the title screen
    }
    player.updateCamera(camera, dt, input);
    input.dx = 0; input.dy = 0; input.wheel = 0;
    water.update(time);

    const target = fauna.looking(camera) || null;
    const cell = world.cellAt(player.pos.x, player.pos.z);
    const under = camera.position.y < (world.surface(camera.position.x, camera.position.z).water ?? -99) ? 1 : 0;
    hud.update(player, sky, target, cell ? (TERRAIN_TYPES[cell.terrain]?.name ?? '') + (player.swimming ? ' · swimming' : '') : '');
    fx.render(dt, { hurt: player.hurtT, under });
    requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
// dev helper: run the world forward without drawing (for tests on slow machines)
const warp = (secs, keys = {}) => {
    const k = input.keys;
    input.keys = keys;
    for (let i = 0; i < secs * 30; i++) {
        time += 1 / 30;
        terrain.update(player.pos.x, player.pos.z, 1, time);
        player.update(1 / 30, time, input);
        fauna.update(1 / 30, time, player, 1);
        sky.update(1 / 30, player.pos, camera);
    }
    input.keys = k;
    terrain.rebuildFlora(player.pos.x, player.pos.z);
};
window.roam = { world, terrain, player: () => player, fauna, sky, camera, start, input, renderer, warp };
