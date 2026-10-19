// ==================== GROUND MATERIAL ====================
// The ground's vertex colours give the biome patches; this shader paints the small stuff
// on top, the way a comic artist would fill a panel: mottled soil and grass, flecks of
// pebbles and tiny flowers, short grass strokes, and bands of strata on steep rock. The
// detail fades out with distance so it never shimmers.
import * as THREE from 'three';

const NOISE = /* glsl */`
    float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float gNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
    }`;

export const createGroundMaterial = () => {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = 'varying vec3 vGW;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = 'varying vec3 vGW;\n' + NOISE + '\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            {
                vec3 c = diffuseColor.rgb;
                float dist = length(vGW - cameraPosition);
                float fade = 1.0 - smoothstep(35.0, 120.0, dist);
                float mid = 1.0 - smoothstep(120.0, 420.0, dist);
                float n1 = gNoise(vGW.xz * 0.09), n2 = gNoise(vGW.xz * 0.45), n3 = gNoise(vGW.xz * 1.9);
                float green = clamp((c.g - max(c.r, c.b)) * 9.0, 0.0, 1.0);
                // broad mottling, then finer grain close up
                c *= 0.84 + 0.26 * n1;
                c *= 1.0 + (n2 - 0.5) * 0.22 * mid + (n3 - 0.5) * 0.16 * fade;
                // greener and yellower drifts through grassland
                c = mix(c, c * vec3(0.86, 1.12, 0.72), green * smoothstep(0.55, 0.8, n2) * 0.6);
                c = mix(c, c * vec3(1.18, 1.08, 0.7), green * smoothstep(0.6, 0.85, 1.0 - n2) * 0.45);
                // flecks: pebbles on bare ground, tiny flowers in the green
                vec2 g = vGW.xz / 0.8;
                vec2 id = floor(g), f = fract(g);
                float h = gHash(id);
                vec2 cp = vec2(gHash(id + 1.7), gHash(id + 3.1)) * 0.6 + 0.2;
                float fl = (1.0 - smoothstep(0.05, 0.075, length(f - cp))) * step(0.74, h) * fade;
                vec3 flower = h > 0.96 ? vec3(0.98, 0.78, 0.12) : h > 0.92 ? vec3(0.96, 0.95, 0.88) : h > 0.88 ? vec3(0.9, 0.28, 0.2) : c * 0.62;
                vec3 pebble = h > 0.9 ? c * 1.4 : c * 0.66;
                c = mix(c, mix(pebble, flower, green), fl);
                // short grass strokes in solid dark green
                vec2 sg = vGW.xz / 0.45;
                vec2 sid = floor(sg), sf = fract(sg) - 0.5;
                float sh = gHash(sid + 9.3);
                float ang = sh * 1.2 - 0.6;
                vec2 dir = vec2(sin(ang), cos(ang));
                float along = dot(sf, dir), across = dot(sf, vec2(dir.y, -dir.x));
                float stroke = step(abs(across), 0.035) * step(abs(along), 0.3) * step(0.55, sh) * green * fade;
                c = mix(c, c * vec3(0.45, 0.62, 0.4), stroke);
                // strata on steep faces
                vec3 fn = normalize(cross(dFdx(vGW), dFdy(vGW)));
                float steep = smoothstep(0.3, 0.6, 1.0 - abs(fn.y));
                float band = step(0.78, fract(vGW.y * 0.42 + n2 * 0.5));
                c *= 1.0 - band * steep * 0.24 * mid;
                c = mix(c, c * vec3(1.12, 1.0, 0.86), steep * step(0.5, fract(vGW.y * 0.2 + n1)) * 0.3);
                diffuseColor.rgb = c;
            }`);
    };
    mat.customProgramCacheKey = () => 'roam-ground';
    return mat;
};
