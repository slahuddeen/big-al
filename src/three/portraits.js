// ==================== 3D PORTRAITS FOR THE UI ====================
// Renders each species' low-poly model once into a small image so panels and
// tooltips can show the same creature you see in the world.
import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { buildCreatureModel } from './creatures3d.js';
import { gameTemplate, isSculpted } from '../jehol/gameModels.js';
import { isJeholDino, dinoTemplate, instantiateDino } from '../jehol/dinoModels.js';
import { animateModel } from './animation.js';

const cache = new Map();
let ctx = null;

const init = () => {
    if (ctx) return ctx;
    try {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(240, 180, false);
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight('#e8f4ff', '#6b5a3a', 1.5));
        const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
        sun.position.set(2, 4, 3);
        scene.add(sun);
        const mats = createMaterials();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
        ctx = { renderer, scene, camera, mats };
    } catch (e) {
        ctx = { failed: true };
    }
    return ctx;
};

export const getPortrait = (species, level = 1) => {
    const key = species === 'Big Al' ? `Big Al:${level}` : species;
    if (cache.has(key)) return cache.get(key);
    const c = init();
    if (c.failed) {
        cache.set(key, null);
        return null;
    }
    const mctx = { mat: c.mats.creature, wingMat: c.mats.wing };
    // 'Big Al' is the player: a Yutyrannus at its current growth stage
    const modelKey = species === 'Big Al' ? `player:${level}` : species;
    const model = isJeholDino(modelKey) ? instantiateDino(dinoTemplate(modelKey, mctx), mctx.mat)
        : isSculpted(species) ? gameTemplate(species).instantiate() : buildCreatureModel(species, mctx);
    model.seed = 1;
    animateModel(model, 0.6, { phase: 0, moving: 0, jaw: model.gait === 'biped' ? 0.35 : 0 });
    if (model.gait === 'fly' || model.gait === 'flutter') model.root.position.y = 0.2;
    model.root.rotation.y = 0.45; // side-on 3/4 view, head to the right
    c.scene.add(model.root);
    model.root.updateMatrixWorld(true);

    // frame the model from a 3/4 view
    const box = new THREE.Box3().setFromObject(model.root);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x * 0.75, size.y * 1.25, size.z * 0.6) * 0.62 * (model.gait === 'fly' || model.gait === 'flutter' ? 0.8 : 1);
    const aspect = 240 / 180;
    c.camera.left = -r * aspect;
    c.camera.right = r * aspect;
    c.camera.top = r;
    c.camera.bottom = -r;
    const flyer = model.gait === 'fly' || model.gait === 'flutter';
    if (flyer) c.camera.position.set(centre.x + 1.5, centre.y + 5, centre.z + 3.5);
    else c.camera.position.set(centre.x + 3, centre.y + 2.2, centre.z + 5);
    c.camera.lookAt(centre);
    c.camera.updateProjectionMatrix();
    c.renderer.render(c.scene, c.camera);
    const url = c.renderer.domElement.toDataURL('image/png');
    c.scene.remove(model.root);
    // sculpted and Jehol dinosaur models share their geometry with cached templates
    if (!isJeholDino(modelKey) && !isSculpted(species)) model.root.traverse((o) => o.isMesh && o.geometry.dispose());
    cache.set(key, url);
    return url;
};
