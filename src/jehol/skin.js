// Materials for sculpted creatures: scaly skin, shell-textured fur and filament plumage,
// eyes, and keratin (claws, beaks, teeth).
import * as THREE from 'three';

const NOISE = /* glsl */ `
vec3 jh33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
}
float jh31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}
float jnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(jh31(i), jh31(i + vec3(1,0,0)), f.x), mix(jh31(i + vec3(0,1,0)), jh31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(jh31(i + vec3(0,0,1)), jh31(i + vec3(1,0,1)), f.x), mix(jh31(i + vec3(0,1,1)), jh31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

// Bump-map normal perturbation with a height given in view-space units
const PERTURB = /* glsl */ `
vec3 jPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
    vec3 vSigmaX = dFdx(surf_pos);
    vec3 vSigmaY = dFdy(surf_pos);
    vec3 R1 = cross(vSigmaY, surf_norm);
    vec3 R2 = cross(surf_norm, vSigmaX);
    float fDet = dot(vSigmaX, R1) * faceDirection;
    vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
    return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

// Skin: pebbly, non-overlapping scales (as preserved in dinosaur skin impressions) wherever
// aMat.x gives a scale size, plus per-vertex roughness in aMat.y
export function skinMaterial({ bump = 0.18, wrinkle = 0.0 } = {}) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uBump = { value: bump };
        shader.uniforms.uWrinkle = { value: wrinkle };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec2 aMat;\nvarying vec3 vObj;\nvarying vec2 vMat;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvMat = aMat;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
uniform float uBump;
uniform float uWrinkle;
varying vec3 vObj;
varying vec2 vMat;
${NOISE}
${PERTURB}
// height of a field of rounded scales, size s (0..1 in the middle of a scale)
float scaleField(vec3 p, out float cellId) {
    vec3 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    cellId = 0.0;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec3 off = vec3(float(x), float(y), float(z));
        vec3 r = off + jh33(i + off) * 0.8 + 0.1 - f;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; cellId = jh31(i + off); }
        else if (d < d2) d2 = d;
    }
    float edge = sqrt(d2) - sqrt(d1);
    return smoothstep(0.0, 0.32, edge);
}`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = vMat.y;
float jCell = 0.0;
float jH = 0.0;
// scales smaller than a couple of pixels fade out instead of shimmering
float jFade = vMat.x > 0.0 ? smoothstep(0.7, 0.3, length(fwidth(vObj)) / vMat.x) : 0.0;
if (jFade > 0.0) {
    jH = mix(0.75, scaleField(vObj / vMat.x, jCell), jFade);
    // scales vary a little in tone, and the grooves between them hold dirt
    diffuseColor.rgb *= mix(0.72, 1.0, jH) * (0.93 + 0.14 * jCell);
}`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (jFade > 0.0) {
    float hgt = jH * vMat.x * uBump * jFade;
    normal = jPerturb(-vViewPosition, normal, vec2(dFdx(hgt), dFdy(hgt)), faceDirection);
}
if (uWrinkle > 0.0) {
    float wr = jnoise(vObj * 90.0) * 0.5 + jnoise(vObj * 210.0) * 0.25;
    float hgt2 = wr * uWrinkle * 0.002;
    normal = jPerturb(-vViewPosition, normal, vec2(dFdx(hgt2), dFdy(hgt2)), faceDirection);
}`);
    };
    mat.customProgramCacheKey = () => 'jehol-skin';
    return mat;
}

// Fur and filament plumage as stacked shells. Each shell is the body pushed out along its
// normals by a fraction of the local fur length and bent along aComb; strands are cut out
// of each shell so they thin towards their tips.
export function furShells(geometry, { shells = 22, density = 260, thickness = 1, clump = 0.5, curl = 0.0, sheen = 0, lift = 0.4, tuft = 0.5, irid = 0, rough = 0.9, shade = 1 } = {}) {
    const group = new THREE.Group();
    // glossy, iridescent plumage (Microraptor) needs the physical material
    const base = irid > 0
        ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: rough, metalness: 0, iridescence: irid, iridescenceIOR: 1.6, iridescenceThicknessRange: [100, 330] })
        : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
    const uniforms = { uDensity: { value: density }, uThick: { value: thickness }, uClump: { value: clump }, uCurl: { value: curl }, uSheen: { value: sheen }, uLift: { value: lift }, uTuft: { value: tuft }, uShade: { value: shade } };
    for (let s = 1; s <= shells; s++) {
        const m = base.clone();
        const h = s / shells;
        m.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, uniforms, { uShell: { value: h } });
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', `#include <common>
attribute float aFur;
attribute vec3 aComb;
attribute vec3 aTip;
uniform float uShell;
uniform float uCurl;
uniform float uLift;
varying vec3 vBase;
varying vec3 vBaseN;
varying float vFur;
varying vec3 vTipCol;`)
                .replace('#include <begin_vertex>', `#include <begin_vertex>
vBase = position;
vBaseN = normal;
vFur = aFur;
vTipCol = aTip;
float hh = uShell;
// strands rise from the skin and lay back along the comb; curl adds a little twist
vec3 bend = aComb * (hh * hh * 0.85 + hh * 0.2) * (1.2 - uLift) + cross(normal, aComb) * sin(hh * 6.0 + position.x * 40.0) * uCurl * hh;
transformed += (normal * hh * uLift + bend) * aFur;`)
                .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
objectNormal = normalize(normal + aComb * uShell * 0.8);`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
uniform float uShell;
uniform float uDensity;
uniform float uThick;
uniform float uClump;
uniform float uSheen;
uniform float uTuft;
uniform float uShade;
varying vec3 vBase;
varying vec3 vBaseN;
varying float vFur;
varying vec3 vTipCol;
${NOISE}`)
                .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vFur < 0.0008) discard;
vec3 q = vBase * uDensity;
// strands gather into tufts towards their tips: find the tuft this point belongs to and
// trace back to the root that would reach here
vec3 tq = q / 5.0;
vec3 tcell = floor(tq);
vec3 tcen = (tcell + 0.3 + 0.4 * jh33(tcell + 3.7)) * 5.0;
float pull = uTuft * uShell * 0.85;
q = (q - tcen * pull) / (1.0 - pull);
vec3 cell = floor(q);
vec3 fp = fract(q) - (0.38 + 0.24 * jh33(cell));
vec3 bn = normalize(vBaseN);
fp -= bn * dot(fp, bn);
float rnd = jh31(cell + 7.1);
// strands are shorter in places and clump together
float clumpN = jnoise(vBase * uDensity * 0.18);
float strandLen = mix(0.6, 1.0, rnd) * mix(1.0, 0.55 + 0.6 * jh31(tcell + 9.1) + 0.3 * clumpN, uClump);
if (uShell > strandLen) discard;
float radius = min(0.37 * uThick, 0.46) * (1.0 - uShell / strandLen * 0.8);
float r = length(fp);
if (r > radius) discard;`)
                .replace('#include <color_fragment>', `#include <color_fragment>
float hs = uShell / max(strandLen, 0.001);
diffuseColor.rgb = mix(diffuseColor.rgb, vTipCol, smoothstep(0.25, 1.0, hs));
// each lock of filaments catches the light a little differently, and the partings between
// locks are darker
float tuftD = length((q - tcen) - bn * dot(q - tcen, bn)) / 5.0;
// (uShade < 1 softens this for small, distant animals, where it would read as dark speckle)
diffuseColor.rgb *= mix(1.0, (0.92 + 0.16 * rnd) * (0.82 + 0.36 * jh31(tcell + 1.3)) * mix(1.0, 0.78, smoothstep(0.35, 0.7, tuftD) * (1.0 - uShell)), uShade);
// self-shadowing: the deeper layers sit in shadow
diffuseColor.rgb *= mix(1.0 - 0.5 * uShade, 1.0, pow(uShell, 0.6));`)
                .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * uSheen * pow(uShell, 2.0) * 0.15;`);
        };
        m.customProgramCacheKey = () => `jehol-fur-${irid > 0 ? 1 : 0}`;
        const mesh = new THREE.Mesh(geometry, m);
        mesh.castShadow = s === Math.round(shells * 0.4);
        mesh.receiveShadow = true;
        mesh.renderOrder = s;
        mesh.userData.shell = h;
        group.add(mesh);
    }
    group.userData.uniforms = uniforms;
    return group;
}

// Eye: a glossy ball with an iris and pupil facing local +x
export function eyeMaterial({ iris = '#c98a2a', ring = '#3a2410', pupil = 0.32, irisSize = 0.62, slit = 0 } = {}) {
    const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uIris = { value: new THREE.Color(iris) };
        shader.uniforms.uRing = { value: new THREE.Color(ring) };
        shader.uniforms.uPupil = { value: pupil };
        shader.uniforms.uIrisSize = { value: irisSize };
        shader.uniforms.uSlit = { value: slit };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = normalize(position);');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
uniform vec3 uIris; uniform vec3 uRing; uniform float uPupil; uniform float uIrisSize; uniform float uSlit;
varying vec3 vLocal;`)
            .replace('#include <color_fragment>', `#include <color_fragment>
float ang = acos(clamp(vLocal.x, -1.0, 1.0)) / 1.5708;
vec2 yz = vLocal.yz;
float rr = length(vec2(yz.x, yz.y * (1.0 + uSlit * 3.0)));
float pr = asin(clamp(rr, 0.0, 1.0)) / 1.5708;
vec3 c = vec3(0.10, 0.08, 0.06);
if (ang < uIrisSize) {
    float t = ang / uIrisSize;
    float fib = 0.85 + 0.15 * sin(atan(yz.y, yz.x) * 40.0);
    c = mix(uIris * 1.15, uIris * 0.7, t) * fib;
    c = mix(c, uRing, smoothstep(0.82, 1.0, t));
}
if (vLocal.x > 0.0 && pr < uPupil * uIrisSize) c = vec3(0.01);
diffuseColor.rgb = c;`);
    };
    mat.customProgramCacheKey = () => `jehol-eye`;
    return mat;
}

export function keratinMaterial(color = '#2a2622', rough = 0.45) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

// A curved, tapering horn-like spike: claws, teeth, horns. Built along +x, curving towards -y.
export function clawGeometry({ length = 1, radius = 0.12, curve = 0.6, flat = 0.6, segments = 8, radial = 8 } = {}) {
    const pos = [];
    const idx = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const a = t * curve;
        const cx = (Math.sin(a) / Math.max(curve, 1e-3)) * length;
        const cy = ((Math.cos(a) - 1) / Math.max(curve, 1e-3)) * length;
        const r = radius * Math.pow(1 - t, 0.9) + 0.002 * length;
        // ring in the plane across the tangent (cos a, -sin a, 0); flattened from side to side
        for (let j = 0; j < radial; j++) {
            const th = (j / radial) * Math.PI * 2;
            const ny = Math.cos(th), nz = Math.sin(th) * flat;
            pos.push(cx + Math.sin(a) * ny * r, cy + Math.cos(a) * ny * r, nz * r);
        }
    }
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radial; j++) {
            const a = i * radial + j, b = i * radial + ((j + 1) % radial);
            const c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
            idx.push(a, c, b, b, c, d);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
}
