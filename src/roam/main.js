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
import { Ambient } from './ambient.js';
import { GroundCover } from './groundcover.js';
import { Soundscape } from './audio.js';
import { addCreatureInk } from './materials.js';
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
addCreatureInk(mats.creature);
const ctx = { mat: mats.creature, wingMat: mats.wing, outline: createOutlineMaterial() };
outlineUniforms.uWidth.value = 1.2;

const hud = new Hud(document.getElementById('hud'));
const world = new RoamWorld(seed);
const terrain = new Terrain(world, scene, mats);
const water = new Water(world, scene);
const sky = new Sky(scene, 0.3);
const fx = new ComicFX(renderer, scene, camera);
const ambient = new Ambient(world, scene, water);
const cover = new GroundCover(world, terrain, scene);
const sound = new Soundscape();
const player = new Player(world, terrain, scene, ctx);
player.fx = { water, ambient, sound };
player.onEvent = (e) => {
    if (e === 'breath') hud.say('Out of breath, you come up for air.');
    if (e === 'rest-threat') hud.say('Too dangerous to rest: something is hunting you.');
};
const fauna = new Fauna(world, scene, ctx, hud, water, ambient);

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
const input = { keys: {}, dx: 0, dy: 0, wheel: 0, locked: false, queue: [] };
const ACTION_KEYS = { Space: 'dash', KeyQ: 'claw', KeyF: 'sniff', KeyR: 'display', KeyC: 'submerge' };
addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat && ACTION_KEYS[e.code]) input.queue.push(ACTION_KEYS[e.code]);
    if (!e.repeat && e.code === 'KeyM') hud.say(sound.toggle() ? 'Sound off (M)' : 'Sound on (M)');
    input.keys[e.code] = true;
});
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
    const wasLocked = input.locked;
    if (!input.locked && canvas.requestPointerLock) { canvas.requestPointerLock(); }
    if (e.button === 0) input.queue.push('bite');
    // with the mouse captured the right button rakes; without it, it drags the view
    if (e.button === 2) { if (wasLocked) input.queue.push('claw'); else input.drag = true; }
});
addEventListener('mouseup', (e) => { if (e.button === 2) input.drag = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { input.wheel += e.deltaY; }, { passive: true });

// ---------- abilities ----------
const act = (id) => {
    if (id === 'submerge') {
        const r = player.toggleSubmerge();
        if (r === 'shallow') hud.say(player.swimming ? 'You need to catch your breath first.' : 'The water is too shallow to hide in.');
        if (r === 'down') hud.say('You sink until only your eyes and sail show.');
        return;
    }
    if (!player.use(id)) return;
    if (id === 'bite') {
        // a bite from under the water is an ambush; a bite at the end of a dash hits harder
        const mult = player.submerged ? 2.5 : player.dashT > 0 ? 1.5 : 1;
        const r = fauna.strike(player, 'bite', mult);
        sound.event(r && r.hit ? 'hit' : 'bite');
        if (player.submerged) player.submerged = false;
        if (r && r.eat) hud.say(`You eat. +${Math.round(r.eat)} hunger`);
        else if (r && r.ambush && !r.c.dead) hud.say(`Ambush! The ${r.c.species} never saw you coming.`);
        else if (r && r.hit && !r.c.dead) hud.say(`You bite the ${r.c.species}.`);
        else if (!r) {
            const h = player.headPos();
            const f = ambient.fishNear(h.x, h.y, h.z, player.reach * 0.9, true);
            if (f) {
                player.eat(5);
                ambient.splash(f.x, player.waterY ?? f.y, f.z, 14, 0.9);
                water.ripple(f.x, f.z, time, 1.4);
                hud.say('You snap up a fish. +5 hunger');
                sound.event('splash', { size: 0.5 });
            } else if (player.inWater) {
                ambient.splash(h.x, player.waterY ?? h.y, h.z, 10, 0.8);
                water.ripple(h.x, h.z, time, 1.2);
            }
        }
    }
    if (id === 'claw') {
        const r = fauna.strike(player, 'claw', player.dashT > 0 ? 1.3 : 1);
        sound.event('claw');
        if (r && r.hit) sound.event('hit');
        if (r && r.hit && r.c.dead) hud.say(`Your claws bring down the ${r.c.species}.`);
        else if (!r) hud.say('Your claws rake the air.');
    }
    if (id === 'dash') sound.event(player.swimming ? 'splash' : 'dash');
    if (id === 'dash' && player.swimming) ambient.splash(player.pos.x, player.waterY, player.pos.z, 20, 1.2);
    if (id === 'sniff') { hud.say('You taste the air. Scents drift in…'); sound.event('sniff'); }
    if (id === 'display') {
        const r = fauna.display(player);
        sound.event('roar');
        if (r.angered) hud.say(`The ${r.angered.species} takes it as a challenge!`);
        else if (r.fled) hud.say(r.fled > 1 ? `Your sail sends ${r.fled} animals running.` : 'Your sail sends an animal running.');
        else hud.say('You flush your sail. Nothing here is impressed.');
    }
};

let started = false;
const start = () => {
    started = true;
    sound.start();
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
        const hp0 = player.health;
        const threat = fauna.list.some((c) => !c.dead && c.predator && c.data.weight > 300 && (c.state === 'attack' || c.pos.distanceTo(player.pos) < 45));
        player.update(dt, time, input, threat);
        if (player.health < hp0 - 0.5) sound.event('hurt');
        for (const id of input.queue) act(id);
        input.queue.length = 0;
        fauna.update(dt, time, player, sky.isNight ? 3 : sky.dayFraction < 0.32 ? 0 : sky.dayFraction > 0.7 ? 2 : 1);
        // resting lets the day run on quickly
        sky.update(dt * (player.resting ? 12 : 1), player.pos, camera);
        if (player.dead && !player.deathShown) {
            player.deathShown = true;
            document.exitPointerLock?.();
            const why = player.lastHurtBy === 'hunger' ? 'You starved. Spinosaurus needed a lot of fish.'
                : player.lastHurtBy === 'thirst' ? 'You died of thirst, in a land of rivers.'
                    : `The ${player.lastHurtBy} got the better of you.`;
            hud.dead(why, () => location.reload());
        }
    } else {
        sky.update(0, player.pos, camera);
        if (!input.locked) input.dx += dt * 25; // a slow turn around Spino on the title screen
    }
    player.updateCamera(camera, dt, input);
    input.dx = 0; input.dy = 0; input.wheel = 0;
    water.update(time, 1 - sky.night, sky.atmosphere.mist, sky.atmosphere.haze);
    fx.setAtmosphere(sky.atmosphere);
    if (!loading) cover.update(player.pos.x, player.pos.z);
    sound.update({ player, world, fauna, sky, camera, wind: gust, dt });
    ambient.update(dt, time, player, sky.night || 0);

    const target = fauna.looking(camera) || null;
    const cell = world.cellAt(player.pos.x, player.pos.z);
    const under = camera.position.y < (world.surface(camera.position.x, camera.position.z).water ?? -99) ? 1 : 0;
    hud.update(player, sky, target, cell ? (TERRAIN_TYPES[cell.terrain]?.name ?? '') + (player.swimming ? ' · swimming' : '') : '', fauna, camera);
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
        for (const id of input.queue) act(id);
        input.queue.length = 0;
        fauna.update(1 / 30, time, player, 1);
        ambient.update(1 / 30, time, player, 0);
        sky.update(1 / 30, player.pos, camera);
    }
    input.keys = k;
    terrain.rebuildFlora(player.pos.x, player.pos.z);
};
window.roam = { world, terrain, cover, sound, player: () => player, fauna, ambient, water, sky, camera, start, input, renderer, warp, act };
