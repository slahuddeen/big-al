// Skin membranes stretched between two edges: pterosaur wings, the rib-wings of the gliding
// lizard, fins. Built as a strip of triangles; actinofibrils (the stiffening fibres of a
// pterosaur wing) or fin rays are drawn as faint lines along the strip.
import * as THREE from 'three';

const resample = (pts, n) => {
    const d = [0];
    for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const total = d[d.length - 1] || 1;
    return Array.from({ length: n }, (_, k) => {
        const t = (k / (n - 1)) * total;
        let i = 1;
        while (i < d.length - 1 && d[i] < t) i++;
        const f = (t - d[i - 1]) / Math.max(1e-9, d[i] - d[i - 1]);
        return [0, 1, 2].map((a) => pts[i - 1][a] + (pts[i][a] - pts[i - 1][a]) * Math.min(1, Math.max(0, f)));
    });
};

// a (leading edge) and b (trailing edge) polylines; sag pulls the middle of the membrane
// along `sagDir` like slack skin; colFn(u, v) gives the colour across it
export function membrane(a, b, { n = 24, m = 6, col = '#6a4a3a', col2, sag = 0, sagDir = [0, -1, 0], rays = 30, rayDir = 'across', rough = 0.7, opacity = 1 } = {}) {
    const A = resample(a, n), B = resample(b, n);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= m; j++) {
            const v = j / m;
            const s = Math.sin(Math.PI * v) * sag * Math.sin(Math.PI * (i / (n - 1)) * 0.5 + 0.5);
            pos.push(...[0, 1, 2].map((k) => A[i][k] + (B[i][k] - A[i][k]) * v + sagDir[k] * s));
            uv.push(i / (n - 1), v);
        }
    }
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < m; j++) {
            const p = i * (m + 1) + j, q = (i + 1) * (m + 1) + j;
            idx.push(p, q, p + 1, p + 1, q, q + 1);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: rough, side: THREE.DoubleSide, transparent: opacity < 1, opacity });
    const c2 = new THREE.Color(col2 || col);
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uCol2 = { value: c2 };
        shader.uniforms.uRays = { value: rays };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vMUv;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMUv = uv;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uCol2; uniform float uRays; varying vec2 vMUv;')
            .replace('#include <color_fragment>', `#include <color_fragment>
// darker towards the trailing edge, with fine fibres running across the membrane
diffuseColor.rgb = mix(diffuseColor.rgb, uCol2, smoothstep(0.2, 1.0, vMUv.y));
float coord = ${rayDir === 'across' ? 'vMUv.x * uRays + vMUv.y * 3.0' : 'vMUv.y * uRays'};
diffuseColor.rgb *= 0.9 + 0.1 * smoothstep(0.3, 0.5, abs(fract(coord) - 0.5));
diffuseColor.rgb *= mix(0.85, 1.0, smoothstep(0.0, 0.06, vMUv.y));`);
    };
    mat.customProgramCacheKey = () => `jehol-membrane-${rayDir}`;
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}
