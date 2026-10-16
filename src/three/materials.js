// ==================== SHARED MATERIALS ====================
import * as THREE from 'three';

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

// Water: per-vertex `wdata` = (flow distance, edge/foam 0..1, kind 0 still | 1 river | 2 waterfall).
// Still water gets gentle swell and ripples, rivers get streaks flowing downstream,
// waterfalls get fast falling streaks, and banks/shores get animated foam.
const addWater = (material, key) => {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = sharedUniforms.uTime;
        shader.vertexShader = 'attribute vec3 wdata;\nuniform float uTime;\nvarying vec3 vWData;\nvarying vec3 vWPos;\n' +
            shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vec4 wvWorld = modelMatrix * vec4(transformed, 1.0);
                // lakes, sea and rivers share the same gentle swell (rivers a little less)
                float still = (1.0 - step(0.5, wdata.z)) + step(0.5, wdata.z) * (1.0 - step(1.5, wdata.z)) * 0.6;
                transformed.y += (sin(uTime * 1.7 + wvWorld.x * 3.0 + wvWorld.z * 1.9) * 0.012
                               + cos(uTime * 1.2 + wvWorld.z * 2.7) * 0.008) * still;
                vWData = wdata;
                vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );
        shader.fragmentShader = 'uniform float uTime;\nvarying vec3 vWData;\nvarying vec3 vWPos;\n' +
            shader.fragmentShader
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    vec2 wp = vWPos.xz;
                    float kind = vWData.z;
                    float ripple = sin(wp.x * 4.5 + uTime * 1.3 + sin(wp.y * 2.7 + uTime) * 1.6) * sin(wp.y * 3.8 - uTime * 1.1);
                    float streak = 0.0;
                    if (kind > 1.5) {
                        streak = smoothstep(0.2, 1.0, sin(vWPos.y * 16.0 + uTime * 11.0 + wp.x * 23.0 + wp.y * 17.0));
                    } else if (kind > 0.5) {
                        // rivers look like the lakes, with just a hint of current
                        streak = smoothstep(0.6, 1.0, sin(vWData.x * 5.0 - uTime * 2.6 + sin(wp.x * 3.1 + wp.y * 2.3) * 2.2)) * 0.35;
                    }
                    vec3 wc = diffuseColor.rgb + vec3(0.05, 0.08, 0.09) * ripple;
                    wc = mix(wc, vec3(0.86, 0.96, 1.0), streak * 0.45);
                    float foamNoise = sin(wp.x * 12.0 + uTime * 2.1) * sin(wp.y * 10.0 - uTime * 1.7) * 0.5 + 0.5;
                    float foam = smoothstep(0.62, 0.98, vWData.y + foamNoise * 0.3 - 0.12);
                    wc = mix(wc, vec3(0.95, 0.98, 1.0), foam * 0.85);
                    diffuseColor.rgb = wc;
                    diffuseColor.a = min(1.0, diffuseColor.a + foam * 0.5 + streak * 0.25 + step(1.5, kind) * 0.1);`
                )
                .replace(
                    '#include <normal_fragment_maps>',
                    `#include <normal_fragment_maps>
                    normal = normalize(normal + vec3(cos(vWPos.x * 5.5 + uTime * 1.5) * 0.18, 0.0, sin(vWPos.z * 4.7 - uTime * 1.2) * 0.18));`
                );
    };
    material.customProgramCacheKey = () => key;
    return material;
};

export const createMaterials = () => {
    const terrain = addSway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'terrain-lit');
    const terrainFog = addSway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: '#7a7e88' }), 'terrain-fog');
    const water = addWater(new THREE.MeshPhongMaterial({
        vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false,
        shininess: 120, specular: '#e8f8ff'
    }), 'water-lit');
    const waterFog = addWater(new THREE.MeshPhongMaterial({
        vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false,
        shininess: 30, specular: '#333844', color: '#7a7e88'
    }), 'water-fog');
    const lava = new THREE.MeshBasicMaterial({ vertexColors: true });
    const lavaFog = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#8a5a50' });
    const creature = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const wing = new THREE.MeshLambertMaterial({
        vertexColors: true, flatShading: true, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
    });
    return { terrain, terrainFog, water, waterFog, lava, lavaFog, creature, wing };
};
