// ==================== WATER ====================
// The sea as one sheet, each lake as a flat pool over its basin, and every river as a
// ribbon that follows its channel down the terraces, so the steps become rapids. The
// material is flat and comic-like: a body colour, paler shallows at the edges and bands
// of light drifting with the current.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const RIPPLES = 16;

const waterMaterial = () => {
    const mat = new THREE.MeshLambertMaterial({ color: '#2a96bc', transparent: true, opacity: 0.8, depthWrite: true, side: THREE.DoubleSide });
    mat.userData.uTime = { value: 0 };
    mat.userData.uRip = { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) };
    mat.userData.uSun = { value: 1 };
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = mat.userData.uTime;
        shader.uniforms.uRip = mat.userData.uRip;
        shader.uniforms.uSun = mat.userData.uSun;
        shader.vertexShader = 'attribute vec2 aFlow;\nvarying vec2 vFlow;\nvarying vec3 vWPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vFlow = aFlow;
            vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = `uniform float uTime, uSun;
            uniform vec4 uRip[${RIPPLES}];
            varying vec2 vFlow;
            varying vec3 vWPos;
            float wHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
            float wNoise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            ` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            // flow.x: distance along a river (0 for still water, -1 for a pond); flow.y: 0 at the edge .. 1 in the middle
            bool river = vFlow.x > 0.0;
            float pond = step(vFlow.x, -0.5);
            float edge = 1.0 - smoothstep(0.0, 0.3, vFlow.y);
            // ponds are greener and darker, the big river a bright jade
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.42, 0.34), pond * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.62, 0.6), river ? 0.35 : 0.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.72, 0.66), edge * 0.55);
            float along = river ? vFlow.x * 0.12 - uTime * 0.9 : (vWPos.x + vWPos.z) * 0.05 + sin(vWPos.x * 0.03 + uTime * 0.3) * 1.5;
            float across = river ? vFlow.y * 6.0 : (vWPos.x - vWPos.z) * 0.04;
            float band = smoothstep(0.84, 0.94, sin(along + sin(across * 1.3 + uTime * 0.4) * 1.2) * 0.5 + 0.5);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.96, 0.98), band * (0.45 - pond * 0.25));
            // the shore: a crisp pale line where the water meets the land
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), step(vFlow.y, 0.06) * 0.8 + edge * edge * 0.25);
            // ripples spreading from anything that moves in the water
            float rip = 0.0;
            for (int i = 0; i < ${RIPPLES}; i++) {
                vec4 r = uRip[i];
                float age = uTime - r.z;
                if (age < 0.0 || age > 2.6) continue;
                float d = distance(vWPos.xz, r.xy);
                float rad = age * (2.0 + r.w * 1.5);
                float ring = 1.0 - smoothstep(0.0, 0.18 + r.w * 0.1, abs(d - rad));
                float ring2 = 1.0 - smoothstep(0.0, 0.12, abs(d - rad * 0.62));
                rip = max(rip, max(ring, ring2 * 0.7) * (1.0 - age / 2.6) * min(1.0, r.w));
            }
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.98, 1.0), step(0.35, rip) * 0.85);
            // sun glints: little sparks that drift with the water
            vec2 gp = vWPos.xz * 0.9 + (river ? vec2(0.0) : vec2(uTime * 0.2, -uTime * 0.13));
            float gl = step(0.93, wNoise(gp + uTime * vec2(0.31, 0.17))) * step(0.6, wNoise(gp * 0.31 - uTime * 0.05));
            float camD = length(vWPos - cameraPosition);
            diffuseColor.rgb += vec3(1.0, 0.95, 0.8) * gl * uSun * (1.0 - smoothstep(30.0, 160.0, camD)) * 0.9;
            diffuseColor.a = mix(diffuseColor.a, 0.95, edge * 0.5 + rip * 0.5);`);
    };
    return mat;
};

const mistMaterial = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uMist: { value: 0.3 }, uCol: { value: new THREE.Color('#eef4f4') }, uLayer: { value: 0 } },
    vertexShader: /* glsl */`
        attribute vec2 aFlow;
        varying vec2 vFlow;
        varying vec3 vW;
        void main() {
            vFlow = aFlow;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
        }`,
    fragmentShader: /* glsl */`
        uniform float uTime, uMist, uLayer;
        uniform vec3 uCol;
        varying vec2 vFlow;
        varying vec3 vW;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y); }
        void main() {
            vec2 p = vW.xz * (0.035 - uLayer * 0.012) + vec2(uTime * 0.018, uTime * 0.007) * (1.0 + uLayer);
            float v = n(p) * 0.6 + n(p * 2.3 + 4.1) * 0.3 + n(p * 5.1) * 0.1;
            // flat banks of mist with soft edges, thinning towards the shore
            float a = smoothstep(0.4 + uLayer * 0.08, 0.62, v) * smoothstep(0.0, 0.35, vFlow.y + 0.15);
            float d = length(vW - cameraPosition);
            a *= uMist * (0.55 - uLayer * 0.2) * smoothstep(3.0, 25.0, d);
            if (a < 0.01) discard;
            gl_FragColor = vec4(uCol, a);
        }`
});

export class Water {
    constructor(world, scene) {
        this.mat = waterMaterial();
        const meshes = [];
        // the sea
        const sea = new THREE.PlaneGeometry(world.width + 4000, world.depth + 4000, 1, 1);
        sea.rotateX(-Math.PI / 2);
        sea.translate(world.width / 2, world.seaLevel, world.depth / 2);
        sea.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(8).fill(0).map((v, i) => (i % 2 ? 1 : 0)), 2));
        meshes.push(sea);
        // lakes: each lake cell's polygon, grown a little so its edge hides under the shore
        for (const c of world.map.cells) {
            if (c.terrain !== 'lake' || c.waterM === null) continue;
            const pos = [], flow = [], idx = [];
            const cx = c.x * 20, cz = c.z * 20;
            pos.push(cx, c.waterM, cz);
            flow.push(0, 1);
            c.poly.forEach(([x, z]) => {
                pos.push(cx + (x * 20 - cx) * 1.3, c.waterM, cz + (z * 20 - cz) * 1.3);
                flow.push(0, 0.3);
            });
            for (let i = 0; i < c.poly.length; i++) idx.push(0, 1 + ((i + 1) % c.poly.length), 1 + i);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
            g.setIndex(idx);
            meshes.push(g);
        }
        // ponds and pools: a fan of rings, lobed like the basin and reaching just under the bank
        for (const p of world.ponds) {
            const pos = [p.x, p.surface, p.z], flow = [-1, 1], idx = [];
            const K = 28, rings = [[0.55, 0.6], [1, 0.05], [1, 0]];
            rings.forEach(([f, fy], ri) => {
                for (let i = 0; i < K; i++) {
                    const a = (i / K) * Math.PI * 2;
                    const r = world.pondRadius(p, a) * f + (ri === 2 ? 1.2 : 0);
                    pos.push(p.x + Math.cos(a) * r, p.surface, p.z + Math.sin(a) * r);
                    flow.push(-1, fy);
                }
            });
            for (let i = 0; i < K; i++) idx.push(0, 1 + ((i + 1) % K), 1 + i);
            for (let ri = 0; ri < rings.length - 1; ri++) {
                for (let i = 0; i < K; i++) {
                    const a = 1 + ri * K + i, b = 1 + ri * K + ((i + 1) % K), c = a + K, d = b + K;
                    idx.push(a, b, c, b, d, c);
                }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
            g.setIndex(idx);
            meshes.push(g);
        }
        // rivers
        for (const line of world.riverLines) {
            if (line.length < 2) continue;
            const pos = [], flow = [], idx = [];
            let s = 0;
            const ACROSS = 4;
            line.forEach((p, i) => {
                const q = line[Math.min(line.length - 1, i + 1)], o = line[Math.max(0, i - 1)];
                let dx = q.x - o.x, dz = q.z - o.z;
                const L = Math.hypot(dx, dz) || 1;
                dx /= L; dz /= L;
                if (i > 0) s += Math.hypot(p.x - line[i - 1].x, p.z - line[i - 1].z);
                const half = p.w * 0.5 + 1.6;
                const y = world.base(p.x, p.z) - 0.7;
                for (let k = 0; k <= ACROSS; k++) {
                    const t = k / ACROSS * 2 - 1;
                    pos.push(p.x - dz * half * t, y, p.z + dx * half * t);
                    flow.push(s + 1, 1 - Math.abs(t));
                }
            });
            const n = ACROSS + 1;
            for (let i = 0; i < line.length - 1; i++) {
                for (let k = 0; k < ACROSS; k++) {
                    const a = i * n + k, b = a + 1, c = a + n, d = c + 1;
                    idx.push(a, b, c, b, d, c);
                }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
            g.setIndex(idx);
            meshes.push(g);
        }
        // one mesh for all of it: a few hundred pools and rivers would be as many draw calls
        sea.deleteAttribute('uv');
        sea.deleteAttribute('normal');
        const all = mergeGeometries(meshes);
        // still water faces up even where the ribbon winds back on itself
        const nrm = new Float32Array(all.attributes.position.count * 3);
        for (let i = 0; i < nrm.length; i += 3) nrm[i + 1] = 1;
        all.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        all.computeBoundingSphere();
        const m = new THREE.Mesh(all, this.mat);
        m.receiveShadow = true;
        m.renderOrder = 1;
        m.frustumCulled = false;
        scene.add(m);
        this.meshes = [m];
        // mist: two drifting sheets over all the water, thick at dawn and in the night
        this.mistMat = mistMaterial();
        this.mists = [1.3, 3.6].map((h, i) => {
            const mm = new THREE.Mesh(all, this.mistMat.clone());
            mm.material.uniforms = { ...this.mistMat.uniforms, uLayer: { value: i } };
            mm.position.y = h;
            mm.renderOrder = 2 + i;
            mm.frustumCulled = false;
            scene.add(mm);
            return mm;
        });
    }

    // a ring spreading out from (x, z); strength 0..2 sets its size
    ripple(x, z, time, strength = 1) {
        const r = this.mat.userData.uRip.value;
        this.ripI = ((this.ripI || 0) + 1) % r.length;
        r[this.ripI].set(x, z, time, strength);
    }

    update(time, sun = 1, mist = 0.3, mistCol = null) {
        this.mat.userData.uTime.value = time;
        this.mat.userData.uSun.value = sun;
        this.mistMat.uniforms.uTime.value = time;
        this.mistMat.uniforms.uMist.value = mist;
        if (mistCol) this.mistMat.uniforms.uCol.value.copy(mistCol);
    }
}
