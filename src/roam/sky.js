// ==================== SKY, SUN AND THE DAY ====================
// A day lasts a few minutes, as in Minecraft: the sun crosses the sky, sets in orange,
// stars come out and the moon gives a dim blue light until dawn. The sky is a dome around
// the camera; the fog takes the horizon's colour so the land fades into it.
import * as THREE from 'three';

export const DAY_LENGTH = 600; // seconds for a full day and night

const col = (h) => new THREE.Color(h);
// sky colours by sun height (-1 .. 1)
const KEYS = [
    { e: -0.35, top: col('#060c1c'), horizon: col('#14203a'), sun: col('#8fa6d8'), sunI: 0.6, amb: 0.75, ambSky: col('#6a80b4'), ambGround: col('#2a2a36') },
    { e: -0.08, top: col('#1a2a52'), horizon: col('#d27a5a'), sun: col('#ff9a5a'), sunI: 0.45, amb: 0.85, ambSky: col('#b09ac0'), ambGround: col('#4a3a32') },
    { e: 0.06, top: col('#4a76b8'), horizon: col('#f4b07a'), sun: col('#ffb070'), sunI: 1.3, amb: 0.75, ambSky: col('#d6c0b0'), ambGround: col('#5a4a36') },
    { e: 0.3, top: col('#4f9ede'), horizon: col('#cfe6f2'), sun: col('#fff0d8'), sunI: 2.3, amb: 1.05, ambSky: col('#d8ecff'), ambGround: col('#7a6a48') },
    { e: 1.0, top: col('#3f92dc'), horizon: col('#c8e4f4'), sun: col('#fff6e4'), sunI: 2.6, amb: 1.1, ambSky: col('#dcefff'), ambGround: col('#806e4a') }
];

const skyMaterial = () => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
        uTop: { value: col('#4f9ede') }, uHorizon: { value: col('#cfe6f2') },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: col('#fff0d8') }, uNight: { value: 0 },
        uTime: { value: 0 }, uCloudLit: { value: col('#ffffff') }, uCloudShade: { value: col('#b8c8dc') }
    },
    vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // always at the far plane
        }`,
    fragmentShader: /* glsl */`
        uniform vec3 uTop, uHorizon, uSunDir, uSunCol, uCloudLit, uCloudShade;
        uniform float uNight, uTime;
        varying vec3 vDir;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += n2(p) * a; p = p * 2.03 + 7.1; a *= 0.5; } return v; }
        void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, -0.2, 1.0);
            vec3 c = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, h));
            // the sun: a crisp comic disc with a soft glow; the moon opposite it
            float s = dot(d, uSunDir);
            c = mix(c, uSunCol * 1.15, smoothstep(0.9988, 0.9992, s));
            c += uSunCol * pow(max(s, 0.0), 24.0) * 0.35 * (1.0 - uNight);
            float m = dot(d, -uSunDir);
            c = mix(c, vec3(0.93, 0.93, 0.86), smoothstep(0.9993, 0.9996, m) * uNight);
            c += vec3(0.4, 0.5, 0.7) * pow(max(m, 0.0), 60.0) * 0.25 * uNight;
            // clouds: flat-bottomed comic heaps on a plane overhead, drifting with the wind
            if (d.y > 0.0) {
                vec2 cp = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
                float shape = fbm(cp * 0.8) - 0.5;
                float under = fbm((cp + vec2(0.05, 0.12)) * 0.8) - 0.5;
                float body = step(0.0, shape);
                float lit = step(0.035, shape) * step(under, shape + 0.015);
                vec3 cc = mix(uCloudShade, uCloudLit, lit);
                float fadeH = smoothstep(0.0, 0.12, d.y);
                c = mix(c, cc, body * fadeH * 0.95);
                // an ink rim where the cloud meets the sky
                c = mix(c, uCloudShade * 0.7, step(0.0, shape) * (1.0 - step(0.008, shape)) * fadeH * 0.6);
            }
            // stars
            vec3 q = floor(d * 260.0);
            float st = step(0.9965, hash(q)) * smoothstep(0.02, 0.2, d.y);
            c += vec3(0.85, 0.9, 1.0) * st * uNight * (0.6 + 0.4 * hash(q + 3.1));
            // below the horizon: the haze colour
            c = mix(c, uHorizon, smoothstep(0.02, -0.12, d.y));
            gl_FragColor = vec4(c, 1.0);
        }`
});

export class Sky {
    constructor(scene, startTime = 0.3) {
        this.time = startTime * DAY_LENGTH;
        this.dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMaterial());
        this.dome.renderOrder = -10;
        this.dome.frustumCulled = false;
        scene.add(this.dome);
        this.sun = new THREE.DirectionalLight('#fff0d8', 2.4);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        const S = 70;
        Object.assign(this.sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: 600 });
        this.sun.shadow.bias = -0.0006;
        this.sun.shadow.normalBias = 0.6;
        scene.add(this.sun);
        scene.add(this.sun.target);
        this.hemi = new THREE.HemisphereLight('#dcefff', '#806e4a', 1.0);
        scene.add(this.hemi);
        scene.fog = new THREE.Fog('#cfe6f2', 200, 950);
        this.scene = scene;
        this.top = new THREE.Color();
        this.horizon = new THREE.Color();
        this.sunDir = new THREE.Vector3();
    }

    // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    get dayFraction() { return (this.time / DAY_LENGTH) % 1; }
    get isNight() { return this.elevation < -0.05; }

    update(dt, focus, camera) {
        this.time += dt;
        const t = this.dayFraction;
        const a = (t - 0.25) * Math.PI * 2;
        // the sun rises in the east (+x), crosses the south and sets in the west
        this.sunDir.set(Math.cos(a), Math.sin(a), -0.35).normalize();
        const e = this.sunDir.y;
        this.elevation = e;
        let i = 0;
        while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
        const A = KEYS[i], B = KEYS[i + 1];
        const k = Math.max(0, Math.min(1, (e - A.e) / (B.e - A.e)));
        this.top.copy(A.top).lerp(B.top, k);
        this.horizon.copy(A.horizon).lerp(B.horizon, k);
        const night = 1 - Math.max(0, Math.min(1, (e + 0.12) / 0.2));
        const u = this.dome.material.uniforms;
        u.uTop.value.copy(this.top);
        u.uHorizon.value.copy(this.horizon);
        u.uSunDir.value.copy(this.sunDir);
        u.uSunCol.value.copy(A.sun).lerp(B.sun, k);
        u.uNight.value = night;
        u.uTime.value = this.time;
        // clouds catch the sunset and go slate blue at night
        const glow = Math.max(0, 1 - Math.abs(e - 0.02) / 0.18);
        u.uCloudLit.value.setRGB(1, 1, 1).lerp(col('#ffb488'), glow * 0.8).lerp(col('#4a5a7a'), night);
        u.uCloudShade.value.setRGB(0.74, 0.8, 0.88).lerp(col('#c47a6a'), glow * 0.6).lerp(col('#22304a'), night);
        this.dome.position.copy(camera.position);
        // light comes from the sun by day and from the moon by night
        const lightDir = e > -0.05 ? this.sunDir : this.sunDir.clone().negate();
        this.sun.color.copy(A.sun).lerp(B.sun, k);
        this.sun.intensity = A.sunI + (B.sunI - A.sunI) * k;
        this.sun.position.copy(focus).addScaledVector(lightDir, 300);
        this.sun.target.position.copy(focus);
        this.hemi.color.copy(A.ambSky).lerp(B.ambSky, k);
        this.hemi.groundColor.copy(A.ambGround).lerp(B.ambGround, k);
        this.hemi.intensity = A.amb + (B.amb - A.amb) * k;
        this.scene.fog.color.copy(this.horizon);
        this.scene.fog.near = 160 + (1 - night) * 140;
        this.scene.fog.far = 560 + (1 - night) * 640;
        this.night = night;
    }

    clock() {
        const mins = Math.floor(this.dayFraction * 24 * 60);
        return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }
}
