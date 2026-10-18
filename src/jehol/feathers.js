// Vaned feathers as instanced cards: wing and tail feathers, display fans, the long
// ribbon-like quills of Beipiaosaurus and the streamers of Confuciusornis. The outline,
// barbs, rachis and colour bands are drawn in the shader, so one card shape serves all.
import * as THREE from 'three';

// card along +x (base 0, tip 1), across z, facing +y; a ridge along the rachis
const cardGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 10, 4);
    g.rotateX(-Math.PI / 2);
    g.translate(0.5, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (0.5 - Math.abs(p.getZ(i))) * 0.03);
    g.computeVertexNormals();
    return g;
})();

export const STYLE = { vane: 0, flight: 1, ribbon: 2, racket: 3, down: 4 };

const col = (c) => new THREE.Color(c);

// list: [{ at, dir, normal, length, width, col, col2, bands, style, curve, asym, tipCol }]
export function featherMesh(list, { irid = 0, sheen = 0, rough = 0.7 } = {}) {
    const n = list.length;
    const mat = new THREE.MeshPhysicalMaterial({
        color: '#ffffff', roughness: rough, metalness: 0, side: THREE.DoubleSide,
        iridescence: irid, iridescenceIOR: 1.6, iridescenceThicknessRange: [100, 330], sheen, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5,
        alphaToCoverage: true, transparent: false
    });
    const geo = cardGeo.clone();
    const aCol = new Float32Array(n * 3), aCol2 = new Float32Array(n * 3), aShape = new Float32Array(n * 4);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m4 = new THREE.Matrix4();
    const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
    list.forEach((f, i) => {
        x.set(...f.dir).normalize();
        y.set(...(f.normal || [0, 1, 0]));
        y.addScaledVector(x, -y.dot(x)).normalize();
        z.crossVectors(x, y);
        m4.makeBasis(x, y, z);
        m4.scale(new THREE.Vector3(f.length, f.length, f.width));
        m4.setPosition(...f.at);
        mesh.setMatrixAt(i, m4);
        col(f.col).toArray(aCol, i * 3);
        col(f.col2 || f.col).toArray(aCol2, i * 3);
        aShape.set([f.curve ?? 0.08, f.style ?? STYLE.vane, f.bands ?? 0, f.asym ?? 1], i * 4);
    });
    geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
    geo.setAttribute('aCol2', new THREE.InstancedBufferAttribute(aCol2, 3));
    geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(aShape, 4));
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
attribute vec3 aCol; attribute vec3 aCol2; attribute vec4 aShape;
varying vec3 vCol; varying vec3 vCol2; varying vec4 vShape; varying vec2 vFUv;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
vCol = aCol; vCol2 = aCol2; vShape = aShape; vFUv = vec2(position.x, position.z * 2.0);
// feathers camber downwards towards the tip
transformed.y -= aShape.x * position.x * position.x;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vCol; varying vec3 vCol2; varying vec4 vShape; varying vec2 vFUv;
float fh(float x) { return fract(sin(x * 127.1) * 43758.5453); }`)
            .replace('#include <color_fragment>', `#include <color_fragment>
float u = vFUv.x;
float v = vFUv.y;
float style = vShape.y;
float bands = vShape.z;
float asym = vShape.w;
float side = v < 0.0 ? asym : 1.0;
float w;
if (style > 3.5) {
    // downy: loose barbs from the base, no tight vane
    w = 0.9 * sin(3.1416 * clamp(u, 0.0, 1.0));
} else if (style > 2.5) {
    // racket: bare shaft, then a vane near the tip
    w = smoothstep(0.62, 0.8, u) * sqrt(max(0.0, 1.0 - pow((u - 0.86) / 0.15, 2.0))) * 0.9;
} else if (style > 1.5) {
    // ribbon: a broad, unbranched filament
    w = 0.32 * (1.0 - smoothstep(0.75, 1.0, u)) + 0.05;
} else {
    float t = clamp((u - 0.07) / 0.93, 0.0, 1.0);
    w = pow(sin(3.1416 * pow(t, 0.75)), 0.55) * mix(1.0, 0.8, u);
}
float shaft = 0.035 * (1.0 - u * 0.7);
float vane = abs(v) / max(side, 0.01);
// barbs run out from the rachis towards the tip; a few split apart near the edge
float barbs = 90.0;
float bp = u * barbs - abs(v) * 14.0;
float barbId = floor(bp * 0.2);
float split = step(0.9, fh(barbId + sign(v) * 31.0)) * smoothstep(0.55, 0.95, vane / max(w, 0.01));
float edgeNoise = 0.06 * fh(floor(bp)) ;
float inside = (vane < w - edgeNoise && u > 0.06 && split < 0.5) ? 1.0 : 0.0;
if (style > 3.5) inside *= step(0.35, fract(bp * 0.5 + fh(floor(abs(v) * 9.0)) * 0.5));
if (abs(v) < shaft && u < 0.995) inside = 1.0;
if (inside < 0.5) discard;
vec3 c = vCol;
if (bands > 0.5) c = mix(vCol, vCol2, step(0.5, fract(u * bands + 0.25)));
else if (bands < -0.5) c = mix(vCol, vCol2, smoothstep(0.68, 0.82, u));
c *= 0.9 + 0.1 * sin(bp * 6.2832);
// the edges of each vane are a little darker, so overlapping feathers read separately
c *= mix(1.0, 0.62, smoothstep(0.55, 1.0, vane / max(w, 0.01)));
if (abs(v) < shaft) c = c * 1.35 + 0.02;
diffuseColor.rgb = c;`);
    };
    mat.customProgramCacheKey = () => `jehol-feather-${irid > 0 ? 1 : 0}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
}

// Lay a row of feathers along a polyline: base points from `path`, each pointing along
// dirFn(t), lying in a surface with normal normalFn(t)
export function featherRow(path, { count, dirFn, normalFn, lengthFn, width, ...rest }) {
    const out = [];
    const segs = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1], path[i + 1][2] - path[i][2]);
        segs.push(l);
        total += l;
    }
    for (let k = 0; k < count; k++) {
        const t = count === 1 ? 0 : k / (count - 1);
        let d = t * total, i = 0;
        while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
        const f = segs[i] ? d / segs[i] : 0;
        const at = [0, 1, 2].map((a) => path[i][a] + (path[i + 1][a] - path[i][a]) * f);
        const length = lengthFn(t);
        out.push({ at, dir: dirFn(t), normal: normalFn(t), length, width: typeof width === 'function' ? width(t) : width * length, ...(typeof rest.each === 'function' ? rest.each(t, k) : {}), ...Object.fromEntries(Object.entries(rest).filter(([key]) => key !== 'each')) });
    }
    return out;
}
