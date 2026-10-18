// ==================== SHARED MATERIALS ====================
import * as THREE from 'three';
import { createWaterMaterial } from './water.js';

export const sharedUniforms = {
    uTime: { value: 0 },
    // wind: x, y = direction on the ground (world xz), z = strength 0..1
    uWind: { value: new THREE.Vector3(1, 0, 0.3) },
    uDry: { value: 0 }, // 0 lush .. 1 parched (season)
    uRain: { value: 0 }, // wet ground darkens in the rain
    uSnow: { value: 0 } // snow lying on the ground 0..1
};

// Foliage vertices carry a `sway` attribute (0 = rooted, 1 = free tip). The
// vertex shader leans them downwind and ripples them in gusts that roll across
// the landscape, so you can read the wind from the trees and ferns. The
// fragment shader browns green vegetation through the dry season.
const addSway = (material, key) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = sharedUniforms.uTime;
        shader.uniforms.uWind = sharedUniforms.uWind;
        shader.uniforms.uDry = sharedUniforms.uDry;
        shader.uniforms.uRain = sharedUniforms.uRain;
        shader.uniforms.uSnow = sharedUniforms.uSnow;
        shader.vertexShader = 'attribute float sway;\nuniform float uTime;\nuniform vec3 uWind;\nvarying vec3 vSnowPos;\n' +
            shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vec4 swWorld = modelMatrix * vec4(transformed, 1.0);
                float strength = uWind.z;
                // gusts travel downwind across the land
                float along = dot(swWorld.xz, uWind.xy);
                float gust = 0.55 + 0.45 * sin(along * 0.45 - uTime * (0.8 + strength * 1.6)) * (0.6 + 0.4 * sin(uTime * 0.31 + swWorld.x * 0.13));
                float swPhase = uTime * (1.5 + strength * 3.0) + swWorld.x * 0.8 + swWorld.z * 0.6;
                float lean = sway * (0.012 + 0.085 * strength * gust);
                float flutter = sway * (0.018 + 0.03 * strength);
                transformed.x += uWind.x * lean + sin(swPhase) * flutter;
                transformed.z += uWind.y * lean + cos(swPhase * 0.83) * flutter * 0.7;
                vSnowPos = swWorld.xyz;`
            );
        shader.fragmentShader = `uniform float uDry;
uniform float uRain;
uniform float uSnow;
varying vec3 vSnowPos;
float snowHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float snowNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), u.x), mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
` +
            shader.fragmentShader.replace(
                '#include <normal_fragment_maps>',
                `#include <normal_fragment_maps>
                if (uSnow > 0.01) {
                    // snow settles on anything facing the sky, patchy at first
                    vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
                    float facing = smoothstep(0.35, 0.8, dot(normal, upV));
                    vec2 sp = vSnowPos.xz;
                    float snowPatch = snowNoise(sp * 0.9) * 0.55 + snowNoise(sp * 3.3 + 7.0) * 0.3 + snowNoise(sp * 11.0 - 3.0) * 0.15;
                    float cover = facing * smoothstep(1.0 - uSnow * 1.2, 1.12 - uSnow * 1.2, snowPatch);
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.92, 0.95), cover);
                }`
            ).replace(
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
    // frozen ponds and streams
    const ice = new THREE.MeshLambertMaterial({ color: '#d6e2e6', flatShading: true });
    return { terrain, terrainFog, water, waterFog, lava, lavaFog, creature, wing, ice };
};
