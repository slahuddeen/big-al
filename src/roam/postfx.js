// ==================== COMIC INKING FOR A PERSPECTIVE CAMERA ====================
// The Spino game's comic pass (ink outlines from depth and colour edges, flat tone bands,
// pen hatching in the shadows, a warm paper tint), reworked for a camera at ground level:
// edges are found on inverse depth, which is flat across planes in screen space, so the
// ground doesn't fill with lines, and the ink thins out into the distance.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const ComicShader = {
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uNear: { value: 0.5 },
        uFar: { value: 4000 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uSaturation: { value: 1.12 },
        uVibrance: { value: 0.35 },
        uContrast: { value: 1.08 },
        uInk: { value: new THREE.Color('#1c130d') },
        uVignette: { value: 0.22 },
        uHurt: { value: 0 },
        uUnder: { value: 0 },
        // atmosphere
        uProjInv: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uHaze: { value: new THREE.Color('#cfe6f2') },
        uSunCol: { value: new THREE.Color('#fff0d8') },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uDensity: { value: 1 / 1400 },
        uHDensity: { value: 0.004 },
        uHBase: { value: 4 },
        uHFall: { value: 0.12 },
        uGlow: { value: 1 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uNear, uFar, uPixelRatio, uSaturation, uContrast, uVignette, uHurt, uUnder, uVibrance;
        uniform mat4 uProjInv, uCamWorld;
        uniform vec3 uCamPos, uHaze, uSunCol, uSunDir;
        uniform float uDensity, uHDensity, uHBase, uHFall, uGlow;
        uniform vec3 uInk;
        uniform vec2 uResolution;
        varying vec2 vUv;

        vec3 sat(vec3 c, float s) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return mix(vec3(l), c, s); }
        vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        float viewZ(vec2 uv) {
            float d = texture2D(tDepth, uv).x;
            return (uNear * uFar) / max(1e-6, uFar - d * (uFar - uNear));
        }
        float lumOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

        void main() {
            vec2 px = 1.0 / uResolution;
            vec3 col = texture2D(tDiffuse, vUv).rgb;
            // one-pixel lines, decided crisply: a line is either there in solid ink or not at all
            vec2 o = px * uPixelRatio;
            float z = viewZ(vUv);
            // inverse depth is linear across flat surfaces on screen, so only real breaks show
            float w = 1.0 / z;
            float wl = 1.0 / viewZ(vUv - vec2(o.x, 0.0)), wr = 1.0 / viewZ(vUv + vec2(o.x, 0.0));
            float wu = 1.0 / viewZ(vUv + vec2(0.0, o.y)), wd = 1.0 / viewZ(vUv - vec2(0.0, o.y));
            // only the nearer side of a break is inked, so a line is one pixel wide
            float jump = max(2.0 * w - wl - wr, 2.0 * w - wu - wd) / w;
            // further away only the bigger breaks get a line, so the distance doesn't fill with ink
            float th = mix(0.05, 0.16, smoothstep(60.0, 500.0, z));
            float ink = step(th, jump) * (z > uFar * 0.9 ? 0.0 : 1.0) * (1.0 - step(650.0, z));
            float near = 1.0 - smoothstep(140.0, 700.0, z);

            // ---- atmosphere: distance haze plus height fog that pools in the low ground ----
            float sky = step(uFar * 0.9, z);
            vec4 vp = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
            vec3 vdir = normalize(vp.xyz / vp.w);
            vec3 rd = normalize((uCamWorld * vec4(vdir, 0.0)).xyz);
            float dist = z / max(1e-3, -vdir.z);
            vec3 wp = uCamPos + rd * dist;
            float dy = wp.y - uCamPos.y;
            float kdy = uHFall * dy;
            float hf = uHDensity * exp(-uHFall * (uCamPos.y - uHBase)) * dist * (abs(kdy) > 1e-3 ? (1.0 - exp(-kdy)) / kdy : 1.0);
            float fogAmt = 1.0 - exp(-(dist * uDensity + max(hf, 0.0)));
            // a few soft steps, like the paler planes of a printed landscape
            float fb = fogAmt * 5.0;
            fogAmt = mix(fogAmt, (floor(fb) + smoothstep(0.35, 0.65, fract(fb))) / 5.0, 0.45);
            fogAmt *= 1.0 - sky;
            vec3 haze = mix(uHaze, uSunCol, pow(max(dot(rd, uSunDir), 0.0), 6.0) * 0.55 * uGlow);
            col = mix(col, haze, fogAmt);
            ink *= 1.0 - smoothstep(0.35, 0.8, fogAmt);

            // flat tone bands
            float l = max(lumOf(col), 1e-4);
            float lp = sqrt(l);
            float lq = (floor(lp * 6.0) + smoothstep(0.3, 0.7, fract(lp * 6.0))) / 6.0;
            col *= mix(1.0, (lq * lq) / l, 0.5);
            // pen hatching in the deepest shadow, close up
            vec2 fc = gl_FragCoord.xy / uPixelRatio;
            float h1 = step(0.86, abs(fract((fc.x + fc.y) / 4.0) - 0.5) * 2.0);
            float dark = 1.0 - smoothstep(0.015, 0.05, l);
            col *= 1.0 - h1 * dark * 0.3 * near;
            // vibrance: lift the duller colours more than the already bright ones
            float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
            col = sat(col, 1.0 + uVibrance * (1.0 - (mx - mn) / max(mx, 1e-3)));
            col = mix(col, col * vec3(1.03, 1.0, 0.93), 0.5);
            col = mix(col, uInk, ink);

            col = max((col - 0.18) * uContrast + 0.18, 0.0);
            col = max(sat(col, uSaturation), 0.0);
            // under water: a green-blue cast; hurt: a red flash at the edges
            col = mix(col, col * vec3(0.55, 0.85, 0.95) + vec3(0.0, 0.05, 0.08), uUnder);
            vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
            float edge = clamp(length(c) * 1.25, 0.0, 1.0);
            col = mix(col, vec3(0.75, 0.08, 0.05), uHurt * smoothstep(0.3, 1.0, edge) * 0.7);
            col *= 1.0 - uVignette * smoothstep(0.45, 1.15, edge);
            gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
        }`
};

export class ComicFX {
    constructor(renderer, scene, camera) {
        this.camera = camera;
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
        target.depthTexture = new THREE.DepthTexture(size.x, size.y);
        target.depthTexture.type = THREE.FloatType;
        this.composer = new EffectComposer(renderer, target);
        this.composer.addPass(new RenderPass(scene, camera));
        this.pass = new ShaderPass(ComicShader);
        this.composer.addPass(this.pass);
    }

    setSize(w, h, pr) {
        this.composer.setPixelRatio(pr);
        this.composer.setSize(w, h);
        this.pass.uniforms.uResolution.value.set(w * pr, h * pr);
        this.pass.uniforms.uPixelRatio.value = pr;
    }

    // atmosphere: { haze, sunCol, sunDir, density, hDensity, hBase, glow }
    setAtmosphere(a) {
        const u = this.pass.uniforms;
        u.uHaze.value.copy(a.haze);
        u.uSunCol.value.copy(a.sunCol);
        u.uSunDir.value.copy(a.sunDir);
        u.uDensity.value = a.density;
        u.uHDensity.value = a.hDensity;
        u.uHBase.value = a.hBase;
        u.uGlow.value = a.glow;
    }

    render(dt, { hurt = 0, under = 0 } = {}) {
        const u = this.pass.uniforms;
        this.camera.updateMatrixWorld();
        u.uProjInv.value.copy(this.camera.projectionMatrixInverse);
        u.uCamWorld.value.copy(this.camera.matrixWorld);
        u.uCamPos.value.setFromMatrixPosition(this.camera.matrixWorld);
        u.tDepth.value = this.composer.readBuffer.depthTexture;
        u.uNear.value = this.camera.near;
        u.uFar.value = this.camera.far;
        u.uHurt.value = hurt;
        u.uUnder.value = under;
        this.composer.render(dt);
    }
}
