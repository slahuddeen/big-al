// ==================== CREATURE OUTLINES ====================
// Inverted-hull outlines: every creature mesh gets a back-face shell pushed out
// along smoothed normals by a fixed number of screen pixels, drawn in a dark
// ink colour. It reads as a thick cartoon outline at any zoom and is correctly
// hidden behind trees and terrain.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const outlineUniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uWidth: { value: 2.6 } // drawing-buffer pixels (scaled by device pixel ratio)
};

export const createOutlineMaterial = (color = '#17110b') => new THREE.ShaderMaterial({
    uniforms: {
        uResolution: outlineUniforms.uResolution,
        uWidth: outlineUniforms.uWidth,
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 }
    },
    vertexShader: /* glsl */`
        uniform vec2 uResolution;
        uniform float uWidth;
        void main() {
            vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy * uResolution;
            float l = length(dir);
            if (l > 1e-5) clip.xy += (dir / l) * uWidth * 2.0 / uResolution * clip.w;
            gl_Position = clip;
        }`,
    fragmentShader: /* glsl */`
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
    side: THREE.BackSide
});

// Position-only copy of a geometry with welded vertices and smooth normals, so
// the extruded shell has no cracks between flat-shaded faces
const hullCache = new WeakMap();
export const hullGeometry = (geo) => {
    let hull = hullCache.get(geo);
    if (!hull) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', geo.getAttribute('position').clone());
        if (geo.index) g.setIndex(geo.index.clone());
        hull = mergeVertices(g, 1e-4);
        hull.computeVertexNormals();
        g.dispose();
        hullCache.set(geo, hull);
    }
    return hull;
};

// Give every (non-wing) mesh under `root` an outline shell as a child
export const addOutlines = (root, material, skip = () => false) => {
    const meshes = [];
    root.traverse((o) => {
        if (o.isMesh && !o.userData.outline && !skip(o)) meshes.push(o);
    });
    for (const m of meshes) {
        const hull = new THREE.Mesh(hullGeometry(m.geometry), material);
        hull.userData.outline = true;
        hull.castShadow = false;
        hull.receiveShadow = false;
        hull.raycast = () => {};
        m.add(hull);
    }
};
