// Dev-only gallery of every creature model and terrain tile (open /gallery.html)
import * as THREE from 'three';
import { createMaterials, sharedUniforms } from './three/materials.js';
import { buildCreatureModel, buildBigAl, SPECIES_MODELS } from './three/creatures3d.js';
import { buildTile } from './three/terrain3d.js';
import { animateModel } from './three/animation.js';
import { TERRAIN_TYPES } from './data/terrain.js';

const params = new URLSearchParams(location.search);
const view = params.get('view') || 'creatures';
const only = params.get('only');

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9ccfe8');
scene.add(new THREE.HemisphereLight('#dff2ff', '#6b5a3a', 1.4));
const sun = new THREE.DirectionalLight('#fff4dd', 2.2);
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 60 });
scene.add(sun);

const mats = createMaterials();
const ctx = { mat: mats.creature, wingMat: mats.wing };
const items = [];

if (view === 'creatures') {
    const names = only ? only.split(',') : ['Big Al 1', 'Big Al 2', 'Big Al 3', 'Big Al 4', ...Object.keys(SPECIES_MODELS)];
    const cols = Math.ceil(Math.sqrt(names.length * 1.4));
    names.forEach((name, i) => {
        const model = name.startsWith('Big Al') ? buildBigAl(Number(name.slice(-1)), ctx) : buildCreatureModel(name, ctx);
        model.seed = i;
        const x = (i % cols) * 1.5;
        const z = Math.floor(i / cols) * 1.5;
        model.root.position.set(x, 0, z);
        model.root.rotation.y = -0.5;
        scene.add(model.root);
        items.push({ model, name, x, z });
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 6), new THREE.MeshLambertMaterial({ color: '#8fbf3f' }));
        pad.position.set(x, -0.02, z);
        pad.receiveShadow = true;
        scene.add(pad);
    });
    const cx = ((cols - 1) * 1.5) / 2;
    const cz = (Math.floor((names.length - 1) / cols) * 1.5) / 2;
    sun.target.position.set(cx, 0, cz);
    scene.add(sun.target);
    sun.position.set(cx + 6, 10, cz + 4);
    window.__center = new THREE.Vector3(cx, 0, cz);
    window.__radius = cols * 1.0;
} else {
    const terrains = only ? only.split(',') : Object.keys(TERRAIN_TYPES);
    const cols = Math.ceil(Math.sqrt(terrains.length));
    terrains.forEach((t, i) => {
        const tile = buildTile(t, i, 3, ['river', null, 'lake', 'river', 'sauropodgrounds', 'dryriverbed']);
        const g = new THREE.Group();
        const ground = new THREE.Mesh(tile.ground, mats.terrain);
        ground.castShadow = ground.receiveShadow = true;
        g.add(ground);
        if (tile.water) g.add(new THREE.Mesh(tile.water, mats.water));
        if (tile.lava) g.add(new THREE.Mesh(tile.lava, mats.lava));
        g.position.set((i % cols) * 2.3, 0, Math.floor(i / cols) * 2.3);
        scene.add(g);
    });
    const c = ((cols - 1) * 2.3) / 2;
    window.__center = new THREE.Vector3(c, 0, c);
    window.__radius = cols * 1.6;
    sun.target.position.copy(window.__center);
    scene.add(sun.target);
    sun.position.set(c + 6, 12, c + 4);
}

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
let az = Number(params.get('az') ?? Math.PI / 4);
let zoom = Number(params.get('zoom') ?? 1);
const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h);
    const r = window.__radius * zoom;
    camera.left = -r * (w / h);
    camera.right = r * (w / h);
    camera.top = r;
    camera.bottom = -r;
    camera.updateProjectionMatrix();
};
addEventListener('resize', resize);
addEventListener('wheel', (e) => { zoom *= e.deltaY > 0 ? 1.1 : 0.9; resize(); });
let drag = null;
addEventListener('pointerdown', (e) => { drag = e.clientX; });
addEventListener('pointermove', (e) => { if (drag !== null) { az += (e.clientX - drag) * 0.01; drag = e.clientX; } });
addEventListener('pointerup', () => { drag = null; });
resize();

const clock = new THREE.Clock();
const loop = () => {
    const t = clock.getElapsedTime();
    sharedUniforms.uTime.value = t;
    const el = 0.62;
    camera.position.set(window.__center.x + Math.cos(az) * 40 * Math.cos(el), 40 * Math.sin(el), window.__center.z + Math.sin(az) * 40 * Math.cos(el));
    camera.lookAt(window.__center);
    for (const it of items) {
        const moving = params.get('walk') ? 1 : 0;
        animateModel(it.model, t, { phase: t * 8, moving, jaw: params.get('jaw') ? 1 : 0 });
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
};
loop();
window.__ready = true;
