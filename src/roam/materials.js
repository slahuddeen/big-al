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
        shader.vertexShader = 'attribute float aKind;\nvarying float vKind;\nvarying vec3 vGW;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vKind = aKind;
            vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = 'varying vec3 vGW;\nvarying float vKind;\n' + NOISE + '\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
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
                // what kind of ground: 1 sand, 2 mud, 3 forest floor, 4 bare rock
                float sand = 1.0 - step(0.5, abs(vKind - 1.0));
                float mud = 1.0 - step(0.5, abs(vKind - 2.0));
                float floor_ = 1.0 - step(0.5, abs(vKind - 3.0));
                // wind ripples in sand, wavering and broken
                float rp = fract(dot(vGW.xz, vec2(0.62, 0.78)) * 0.8 + gNoise(vGW.xz * 0.21) * 2.8 + gNoise(vGW.xz * 0.9) * 0.4);
                float rm = step(0.45, gNoise(vGW.xz * 0.05 + 3.0)) * fade;
                c = mix(c, c * 0.88, sand * step(0.9, rp) * rm);
                c = mix(c, c * 1.05, sand * step(rp, 0.25) * rm);
                // sun-cracked mud: a net of dark cracks round paler plates
                vec2 mp = vGW.xz / 1.3;
                vec2 mi = floor(mp), mf = fract(mp);
                float d1 = 9.0, d2 = 9.0;
                for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
                    vec2 o = vec2(float(i), float(j));
                    vec2 q = o + vec2(gHash(mi + o), gHash(mi + o + 5.3)) - mf;
                    float d = dot(q, q);
                    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
                }
                float crack = 1.0 - step(0.05, sqrt(d2) - sqrt(d1));
                c = mix(c, c * (1.08 + 0.06 * n3), mud * mid);
                c = mix(c, c * 0.42, mud * crack * fade);
                // forest floor: shaded by the canopy, strewn with fallen leaves
                c = mix(c, c * vec3(0.66, 0.74, 0.7), floor_);
                vec2 lg = vGW.xz / 0.32;
                vec2 li = floor(lg), lf = fract(lg) - 0.5;
                float lh = gHash(li + 2.9);
                float la = lh * 6.28;
                vec2 lr = vec2(cos(la) * lf.x + sin(la) * lf.y, -sin(la) * lf.x + cos(la) * lf.y);
                float leaf = step(length(lr * vec2(1.0, 2.4)), 0.26) * step(0.45, lh) * fade;
                vec3 lc = lh > 0.85 ? vec3(0.62, 0.34, 0.12) : lh > 0.7 ? vec3(0.48, 0.42, 0.16) : vec3(0.3, 0.24, 0.12);
                c = mix(c, lc, floor_ * leaf);
                diffuseColor.rgb = c;
            }`);
    };
    mat.customProgramCacheKey = () => 'roam-ground';
    return mat;
};

// ---------- ink strokes on plants ----------
// Delgado fills every surface with short pen strokes: scalloped marks over the leaves,
// long broken lines down the bark. Drawn here in world space on top of the plant
// material (which keeps its wind sway), thicker on the shaded undersides, and faded out
// with distance before they could shimmer.
const STROKES = /* glsl */`
    float sHash(vec2 p) { return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
    float sNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
    }`;

export const createFoliageMaterial = (base) => {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    mat.onBeforeCompile = (shader, r) => {
        base.onBeforeCompile(shader, r);
        shader.vertexShader = 'varying vec3 vFW;\nvarying vec3 vFN;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            {
                vec4 fw = vec4(transformed, 1.0);
                vec3 fn = objectNormal;
                #ifdef USE_INSTANCING
                fw = instanceMatrix * fw;
                fn = mat3(instanceMatrix) * fn;
                #endif
                vFW = (modelMatrix * fw).xyz;
                vFN = normalize(mat3(modelMatrix) * fn);
            }`);
        shader.fragmentShader = 'varying vec3 vFW;\nvarying vec3 vFN;\n' + STROKES + '\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            {
                float sd = length(vFW - cameraPosition);
                float sf = 1.0 - smoothstep(30.0, 85.0, sd);
                if (sf > 0.0) {
                    vec3 c = diffuseColor.rgb;
                    vec3 an = abs(vFN);
                    float green = clamp((c.g - max(c.r, c.b)) * 7.0, 0.0, 1.0);
                    float under = 1.0 - clamp(vFN.y * 0.6 + 0.6, 0.0, 1.0);
                    // bark: long, broken vertical lines on the steep brown faces
                    float across = an.x > an.z ? vFW.z : vFW.x;
                    float bn = sNoise(vec2(across * 0.9, vFW.y * 0.35));
                    float bl = step(0.8, fract(across * 3.4 + bn * 1.3)) * step(0.3, sNoise(vec2(across * 3.4, vFW.y * 1.4)));
                    float bark = (1.0 - green) * step(an.y, 0.7) * bl;
                    // leaves: little scalloped arcs, crowded on the shaded side
                    vec2 uv = an.y > max(an.x, an.z) ? vFW.xz : an.x > an.z ? vFW.zy : vFW.xy;
                    vec2 g = uv * 2.4;
                    vec2 id = floor(g), f = fract(g) - 0.5;
                    float h = sHash(id);
                    vec2 o = vec2(sHash(id + 3.7), sHash(id + 1.3)) * 0.3 - 0.15;
                    vec2 q = f - o;
                    float rr = length(q - vec2(0.0, 0.14));
                    float arc = step(abs(rr - 0.2), 0.04) * step(q.y, 0.06);
                    float leaf = green * arc * step(0.55 - under * 0.45, h);
                    diffuseColor.rgb = mix(c, c * vec3(0.3, 0.36, 0.3), max(bark, leaf) * sf);
                }
            }`);
    };
    mat.customProgramCacheKey = () => 'roam-foliage';
    return mat;
};

// ---------- ink strokes on hide ----------
// Wrinkle lines across the body and a stipple of scales, drawn in each mesh's own space so
// they move with the animal, darker and denser on the shaded side.
export const addCreatureInk = (mat) => {
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = 'varying vec3 vCL;\nvarying vec3 vCN;\nvarying float vCD;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vCL = position;
            vCN = normalize(mat3(modelMatrix) * objectNormal);
            vCD = -mvPosition.z;`);
        shader.fragmentShader = 'varying vec3 vCL;\nvarying vec3 vCN;\nvarying float vCD;\n' + STROKES + '\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            {
                float sf = 1.0 - smoothstep(14.0, 45.0, vCD);
                if (sf > 0.0) {
                    float under = 1.0 - clamp(vCN.y * 0.7 + 0.55, 0.0, 1.0);
                    float n = sNoise(vCL.yz * 18.0);
                    float wr = step(0.84 - under * 0.12, fract(vCL.x * 52.0 + n * 1.4)) * step(0.35 - under * 0.3, sNoise(vCL.xz * 30.0 + 4.0));
                    vec2 sc = vCL.xz * 90.0 + vCL.y * 40.0;
                    float dot_ = step(length(fract(sc) - 0.5), 0.17) * step(0.6, sHash(floor(sc))) * under;
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.38, max(wr, dot_) * sf);
                }
            }`);
    };
    mat.customProgramCacheKey = () => 'roam-hide';
    return mat;
};

// ---------- the forest roof seen from afar ----------
// Only drawn beyond `near` metres (with a dithered edge), where the real trees stop.
export const createCanopyMaterial = (near) => {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = 'varying vec3 vCW;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vCW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = 'varying vec3 vCW;\n' + NOISE + '\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
            {
                float d = length(vCW.xz - cameraPosition.xz);
                if (d < ${near.toFixed(1)} + gHash(floor(gl_FragCoord.xy)) * 40.0) discard;
            }`).replace('#include <color_fragment>', `#include <color_fragment>
            diffuseColor.rgb *= 0.85 + 0.3 * gNoise(vCW.xz * 0.35);`);
    };
    mat.customProgramCacheKey = () => 'roam-canopy';
    return mat;
};
