// Turns a species definition into a three.js group: the sculpted body, its fur shells,
// and the separate parts (eyes, claws, feathers) the builders asked for.
import * as THREE from 'three';
import { skinMaterial, furShells, eyeMaterial, keratinMaterial, clawGeometry } from './skin.js';
import { featherMesh } from './feathers.js';

const basis = (dir, up) => {
    const x = new THREE.Vector3(...dir).normalize();
    const u = new THREE.Vector3(...(up || [0, 1, 0]));
    u.addScaledVector(x, -u.dot(x));
    if (u.lengthSq() < 1e-6) u.set(0, 0, 1).addScaledVector(x, -x.z);
    u.normalize();
    const z = new THREE.Vector3().crossVectors(x, u);
    return new THREE.Matrix4().makeBasis(x, u, z);
};

const clawCache = new Map();
const clawGeo = (curve, ratio) => {
    const c = Math.round(curve * 20), r = Math.round(ratio * 40);
    const key = `${c}:${r}`;
    if (!clawCache.has(key)) clawCache.set(key, clawGeometry({ length: 1, radius: Math.max(1, r) / 40, curve: c / 20, flat: 0.62 }));
    return clawCache.get(key);
};
const eyeGeo = new THREE.SphereGeometry(1, 28, 20);

export function assemble(def) {
    const t0 = performance.now();
    const { sculpt } = def;
    const geo = sculpt.mesh({ res: def.res || 220, paint: def.paint });
    const group = new THREE.Group();
    const body = new THREE.Mesh(geo, skinMaterial(def.skin));
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    if (def.fur) group.add(furShells(geo, def.fur));
    // small, fine parts meshed on their own finer grid (crests, horns, armour)
    for (const part of def.details || []) {
        const dg = part.sculpt.mesh({ res: part.res || 120, paint: part.paint || def.paint });
        const dm = new THREE.Mesh(dg, body.material);
        dm.castShadow = true;
        dm.receiveShadow = true;
        group.add(dm);
        sculpt.extras.push(...part.sculpt.extras);
    }

    const eyeMat = eyeMaterial(def.eye);
    const clawMat = keratinMaterial(def.claw || '#2c2722', 0.4);
    clawMat.side = THREE.DoubleSide;
    for (const x of sculpt.extras) {
        if (x.type === 'eye') {
            const m = new THREE.Mesh(eyeGeo, eyeMat);
            m.scale.setScalar(x.r);
            m.position.set(...x.at);
            m.quaternion.setFromRotationMatrix(basis(x.dir, [0, 1, 0]));
            group.add(m);
        } else if (x.type === 'claw') {
            if (def.noClaws) continue;
            const m = new THREE.Mesh(clawGeo(x.curve ?? 0.8, x.radius / x.length), x.color ? keratinMaterial(x.color, 0.4) : clawMat);
            m.material.side = THREE.DoubleSide;
            m.scale.setScalar(x.length);
            m.position.set(...x.at);
            m.quaternion.setFromRotationMatrix(basis(x.dir, x.up));
            m.castShadow = true;
            group.add(m);
        } else if (x.type === 'feathers') {
            const f = featherMesh(x.list, x.style || {});
            group.add(f);
        } else if (x.type === 'mesh') {
            group.add(x.object);
        }
    }
    group.userData.buildMs = performance.now() - t0;
    group.userData.tris = geo.index.count / 3;
    return group;
}
