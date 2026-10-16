// ==================== SHARED MATERIALS ====================
import * as THREE from 'three';
import { createWaterMaterial } from './water.js';

export const sharedUniforms = {
    uTime: { value: 0 }
};

// Foliage vertices carry a `sway` attribute (0 = rooted, 1 = free tip). The
// vertex shader pushes them around with a gentle wind so forests feel alive.
const addSway = (material, key) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = sharedUniforms.uTime;
        shader.vertexShader = 'attribute float sway;\nuniform float uTime;\n' +
            shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vec4 swWorld = modelMatrix * vec4(transformed, 1.0);
                float swPhase = uTime * 1.7 + swWorld.x * 0.8 + swWorld.z * 0.6;
                transformed.x += sin(swPhase) * sway * 0.05;
                transformed.z += cos(swPhase * 0.83) * sway * 0.035;`
            );
    };
    material.customProgramCacheKey = () => key;
    return material;
};

export const createMaterials = () => {
    const terrain = addSway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'terrain-lit');
    const terrainFog = addSway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: '#7a7e88' }), 'terrain-fog');
    // water: the Naval Command ocean shader (see water.js)
    const water = createWaterMaterial(sharedUniforms.uTime, 0);
    const waterFog = createWaterMaterial(sharedUniforms.uTime, 1);
    const lava = new THREE.MeshBasicMaterial({ vertexColors: true });
    const lavaFog = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#8a5a50' });
    const creature = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const wing = new THREE.MeshLambertMaterial({
        vertexColors: true, flatShading: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
    });
    return { terrain, terrainFog, water, waterFog, lava, lavaFog, creature, wing };
};
