// ==================== SHARED MATERIALS ====================
import * as THREE from 'three';
import { createWaterMaterial } from './water.js';

export const sharedUniforms = {
    uTime: { value: 0 },
    // wind: x, y = direction on the ground (world xz), z = strength 0..1
    uWind: { value: new THREE.Vector3(1, 0, 0.3) },
    uDry: { value: 0 }, // 0 lush .. 1 parched (season)
    uRain: { value: 0 }, // wet ground darkens in the rain
    // wind phases (gusts, sway), integrated frame by frame so a change in wind
    // strength changes the speed of the sway, not its position
    uWindPhase: { value: new THREE.Vector2(0, 0) }
};

// Advance the sway by one frame at the current wind strength. Multiplying the
// clock by a strength-dependent speed instead would make every change in
// strength jump the phase by an amount that grows with the time played.
export const advanceWind = (dt) => {
    const s = sharedUniforms.uWind.value.z;
    const p = sharedUniforms.uWindPhase.value;
    // wrap after 100 turns of 2 pi: the shader also uses 0.3x and 0.83x these phases
    p.x = (p.x + dt * (0.8 + s * 1.6)) % 628.3185307;
    p.y = (p.y + dt * (1.5 + s * 3.0)) % 628.3185307;
};

// Foliage vertices carry a `sway` attribute (0 = rooted, 1 = free tip). The
// vertex shader leans them downwind and ripples them in gusts that roll across
// the landscape, so you can read the wind from the trees and ferns. The
// fragment shader browns green vegetation through the dry season.
const addSway = (material, key) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = sharedUniforms.uTime;
        shader.uniforms.uWind = sharedUniforms.uWind;
        shader.uniforms.uWindPhase = sharedUniforms.uWindPhase;
        shader.uniforms.uDry = sharedUniforms.uDry;
        shader.uniforms.uRain = sharedUniforms.uRain;
        shader.vertexShader = 'attribute float sway;\nuniform float uTime;\nuniform vec3 uWind;\nuniform vec2 uWindPhase;\n' +
            shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vec4 swWorld = modelMatrix * vec4(transformed, 1.0);
                float strength = uWind.z;
                // gusts travel downwind across the land
                float along = dot(swWorld.xz, uWind.xy);
                float gust = 0.55 + 0.45 * sin(along * 0.45 - uWindPhase.x) * (0.6 + 0.4 * sin(uWindPhase.x * 0.3 + swWorld.x * 0.13));
                float swPhase = uWindPhase.y + swWorld.x * 0.8 + swWorld.z * 0.6;
                float lean = sway * (0.012 + 0.06 * strength * gust);
                float flutter = sway * (0.014 + 0.022 * strength);
                transformed.x += uWind.x * lean + sin(swPhase) * flutter;
                transformed.z += uWind.y * lean + cos(swPhase * 0.83) * flutter * 0.7;`
            );
        shader.fragmentShader = 'uniform float uDry;\nuniform float uRain;\n' +
            shader.fragmentShader.replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                {
                    // brown the greens in the dry season, deepen them in the wet
                    float greenness = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 7.0, 0.0, 1.0);
                    vec3 straw = vec3(dot(diffuseColor.rgb, vec3(0.45, 0.45, 0.1))) * vec3(1.3, 1.02, 0.5);
                    diffuseColor.rgb = mix(diffuseColor.rgb, straw, uDry * greenness * 0.72);
                    diffuseColor.rgb *= 1.0 - uRain * 0.14;
                }`
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
