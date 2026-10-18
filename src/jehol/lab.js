// Jehol Model Lab: look at each animal up close, painted or plain, at every growth stage.
// URL options (for screenshots): ?sp=Name&stage=id&mode=plain&fur=0&yaw=&pitch=&zoom=&focus=head|body&still&grid=A,B|all
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { assemble } from './creature.js';
import { SPECIES, SECTIONS } from './species/index.js';
import { InkWash } from './inkwash.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const view = $('view');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('still') });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
view.appendChild(renderer.domElement);
const ink = new InkWash(renderer);

const scene = new THREE.Scene();
const PLAIN_BG = new THREE.Color('#d9d3c4');
const PAINT_BG = new THREE.Color('#ffffff');
scene.background = PLAIN_BG.clone();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
scene.add(new THREE.HemisphereLight('#fff6e6', '#6b604c', 0.6));
const sun = new THREE.DirectionalLight('#fff1dc', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
// the ground only catches shadows, so the animal stands on the page
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: '#3a3226', opacity: 0.32, depthWrite: false }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;

const state = {
    sp: params.get('sp') && SPECIES[params.get('sp')] ? params.get('sp') : Object.keys(SPECIES)[0],
    stage: params.get('stage'),
    mode: params.get('mode') === 'plain' ? 'plain' : 'painted',
    fur: params.get('fur') !== '0',
    turn: false
};
const cache = new Map();
let current = null;
let dirty = true;

function frame(model, def) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z);
    ground.scale.setScalar(r * 6);
    ground.position.set(c.x, 0, c.z);
    const yaw = Number(params.get('yaw') ?? 0.55);
    const pitch = Number(params.get('pitch') ?? 0.16);
    const narrow = view.clientWidth < 600;
    // fit the animal's length and height into the view
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const span = Math.max(size.x, size.z) * 0.8 + Math.min(size.x, size.z) * 0.2;
    const fit = Math.max(size.y * 0.5 / t, span * 0.5 / (t * camera.aspect));
    const dist = fit * Number(params.get('zoom') ?? (narrow ? 1.35 : 1.5)) + r * 0.3;
    const f = params.get('focus');
    const focus = f === 'head' && def?.rig?.head ? new THREE.Vector3(...def.rig.head.at(0.4, 0))
        : f === 'body' && def?.rig?.chest ? new THREE.Vector3(...def.rig.chest).lerp(new THREE.Vector3(...def.rig.hipC), 0.6)
            : c.clone().add(new THREE.Vector3(0, narrow ? -size.y * 0.45 : -size.y * 0.05, 0));
    const fd = f === 'head' ? dist * 0.25 : f === 'body' ? dist * 0.4 : dist;
    camera.position.set(focus.x + Math.sin(yaw) * Math.cos(pitch) * fd, focus.y + Math.sin(pitch) * fd, focus.z + Math.cos(yaw) * Math.cos(pitch) * fd);
    controls.target.copy(focus);
    controls.minDistance = r * 0.15;
    controls.maxDistance = r * 6;
    camera.near = r * 0.004;
    camera.far = r * 30;
    camera.updateProjectionMatrix();
    // light from above, in front of and to the left of the camera
    sun.position.set(c.x + Math.sin(yaw + 0.9) * r * 1.2, r * 1.7, c.z + Math.cos(yaw + 0.9) * r * 1.2);
    sun.target.position.copy(c);
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: r * 0.1, far: r * 5 });
    sun.shadow.camera.updateProjectionMatrix();
}

function setFur(model) {
    model.traverse((o) => {
        if (o.userData.shell !== undefined || o.isInstancedMesh) o.visible = state.fur;
    });
}

function build(name, stage) {
    const key = `${name}:${stage || ''}`;
    if (!cache.has(key)) {
        const def = SPECIES[name].build(stage || undefined);
        const model = assemble(def);
        cache.set(key, { model, def });
        console.log(`${name} ${stage || ''}: ${model.userData.tris} tris in ${model.userData.buildMs.toFixed(0)} ms`);
    }
    return cache.get(key);
}

function show(name, stage, reframe = true) {
    const sp = SPECIES[name];
    if (sp.STAGES && !sp.STAGES.some((s) => s.id === stage)) stage = sp.STAGES[sp.STAGES.length - 1].id;
    state.sp = name;
    state.stage = stage;
    renderInfo();
    $('loading').hidden = false;
    // let the label update and the spinner paint before the (blocking) sculpting
    setTimeout(() => {
        const { model, def } = build(name, stage);
        if (current) scene.remove(current);
        current = model;
        setFur(model);
        scene.add(model);
        if (reframe) frame(model, def);
        $('loading').hidden = true;
        dirty = true;
        window.__ready = true;
        if (params.has('still')) {
            draw();
            window.__rendered = true;
        }
    }, 30);
}

function renderInfo() {
    const sp = SPECIES[state.sp];
    $('sp-name').textContent = state.sp;
    const st = sp.STAGES?.find((s) => s.id === state.stage);
    $('sp-len').textContent = st ? `${st.length} m long` : sp.length;
    $('sp-group').textContent = sp.group;
    $('sp-note').textContent = sp.note;
    $('sp-colour').innerHTML = sp.colour === 'known'
        ? '<b>Colour from fossils.</b> Pigment cells (melanosomes) preserved in the feathers or skin show the pattern.'
        : sp.colour === 'partly'
            ? `<b>Colour partly known.</b> ${sp.colourNote || ''}`
            : '<b>Colour invented.</b> No pigment is known; the pattern is a reasonable guess for the habitat.';
    const stages = $('stages');
    stages.innerHTML = '';
    (sp.STAGES || []).forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = s.name;
        b.setAttribute('aria-pressed', String(s.id === state.stage));
        b.addEventListener('click', () => show(state.sp, s.id));
        stages.appendChild(b);
    });
    document.querySelectorAll('#list button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.sp === state.sp)));
}

function renderList() {
    const list = $('list');
    SECTIONS.forEach((sec) => {
        const names = Object.keys(SPECIES).filter((n) => SPECIES[n].section === sec);
        if (!names.length) return;
        const h = document.createElement('h3');
        h.textContent = sec;
        list.appendChild(h);
        names.forEach((n) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.sp = n;
            b.innerHTML = `<span class="nm"></span><span class="sz"></span>`;
            b.querySelector('.nm').textContent = n;
            // the index keeps sizes short; the label card has the full wording
            b.querySelector('.sz').textContent = SPECIES[n].length.replace(/\s*\(.*\)/, '').replace(' with streamers', '').replace('about ', '~');
            b.addEventListener('click', () => show(n, null));
            list.appendChild(b);
        });
    });
}

// the plain view sits on the page colour of the current theme
const themeBg = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
    if (v) PLAIN_BG.set(v);
    if (state.mode === 'plain') scene.background.copy(PLAIN_BG);
    dirty = true;
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeBg);
new MutationObserver(themeBg).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function setMode(mode) {
    state.mode = mode;
    themeBg();
    $('mode-painted').setAttribute('aria-pressed', String(mode === 'painted'));
    $('mode-plain').setAttribute('aria-pressed', String(mode === 'plain'));
    dirty = true;
}

$('mode-painted').addEventListener('click', () => setMode('painted'));
$('mode-plain').addEventListener('click', () => setMode('plain'));
$('tog-fur').addEventListener('click', () => {
    state.fur = !state.fur;
    $('tog-fur').setAttribute('aria-pressed', String(state.fur));
    if (current) setFur(current);
    dirty = true;
});
$('tog-turn').addEventListener('click', () => {
    state.turn = !state.turn;
    $('tog-turn').setAttribute('aria-pressed', String(state.turn));
    controls.autoRotate = state.turn;
    controls.autoRotateSpeed = 1.2;
});
controls.addEventListener('change', () => { dirty = true; });

function resize() {
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w, h, false);
    ink.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    dirty = true;
}
new ResizeObserver(resize).observe(view);
resize();

function draw() {
    controls.update();
    if (state.mode === 'painted') {
        scene.background.copy(PAINT_BG);
        ink.render(scene, camera);
    } else {
        scene.background.copy(PLAIN_BG);
        renderer.render(scene, camera);
    }
}

renderList();
setMode(state.mode);
if (params.has('nocard')) document.querySelectorAll('.card, .controls, .hint').forEach((el) => { el.hidden = true; });
$('tog-fur').setAttribute('aria-pressed', String(state.fur));

if (params.get('grid')) {
    // several animals side by side, each scaled to the same size (for checking a batch)
    const names = params.get('grid') === 'all' ? Object.keys(SPECIES) : params.get('grid').split(',');
    const cols = Math.ceil(Math.sqrt(names.length * 1.6));
    names.forEach((n, i) => {
        const { model } = build(n, null);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const s = 1 / Math.max(size.x, size.y, size.z);
        const holder = new THREE.Group();
        holder.add(model);
        holder.scale.setScalar(s);
        holder.position.set((i % cols) * 1.25, 0, Math.floor(i / cols) * 1.1);
        model.position.x -= box.getCenter(new THREE.Vector3()).x;
        model.position.z -= box.getCenter(new THREE.Vector3()).z;
        setFur(model);
        scene.add(holder);
    });
    frame(scene, null);
    draw();
    window.__ready = window.__rendered = true;
} else {
    show(state.sp, state.stage);
}

if (!params.has('still')) {
    renderer.setAnimationLoop(() => {
        if (controls.autoRotate || controls.enableDamping) controls.update();
        if (dirty || controls.autoRotate) {
            draw();
            dirty = false;
        }
    });
}
