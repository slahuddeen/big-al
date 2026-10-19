// ==================== WATER ====================
// The sea as one sheet, each lake as a flat pool over its basin, and every river as a
// ribbon that follows its channel down the terraces, so the steps become rapids. The
// material is flat and comic-like: a body colour, paler shallows at the edges and bands
// of light drifting with the current.
import * as THREE from 'three';

const waterMaterial = () => {
    const mat = new THREE.MeshLambertMaterial({ color: '#2f8fb4', transparent: true, opacity: 0.86, depthWrite: true, side: THREE.DoubleSide });
    mat.userData.uTime = { value: 0 };
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = mat.userData.uTime;
        shader.vertexShader = 'attribute vec2 aFlow;\nvarying vec2 vFlow;\nvarying vec3 vWPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vFlow = aFlow;
            vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = 'uniform float uTime;\nvarying vec2 vFlow;\nvarying vec3 vWPos;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            // flow.x: distance along the river (0 for still water), flow.y: 0 at the edge .. 1 mid-stream
            float edge = 1.0 - smoothstep(0.0, 0.35, vFlow.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.72, 0.74), edge * 0.6);
            float along = vFlow.x > 0.0 ? vFlow.x * 0.12 - uTime * 0.9 : (vWPos.x + vWPos.z) * 0.05 + sin(vWPos.x * 0.03 + uTime * 0.3) * 1.5;
            float across = vFlow.x > 0.0 ? vFlow.y * 6.0 : (vWPos.x - vWPos.z) * 0.04;
            float band = smoothstep(0.82, 0.95, sin(along + sin(across * 1.3 + uTime * 0.4) * 1.2) * 0.5 + 0.5);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.96, 0.98), band * 0.45);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), edge * edge * 0.35);`);
    };
    return mat;
};

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
        this.meshes = meshes.map((g) => {
            g.computeVertexNormals();
            // still water faces up even where the ribbon winds back on itself
            const nrm = g.attributes.normal;
            for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
            const m = new THREE.Mesh(g, this.mat);
            m.receiveShadow = true;
            m.renderOrder = 1;
            scene.add(m);
            return m;
        });
    }

    update(time) {
        this.mat.userData.uTime.value = time;
    }
}
