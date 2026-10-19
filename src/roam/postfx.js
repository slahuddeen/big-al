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
        uSaturation: { value: 1.0 },
        uContrast: { value: 1.05 },
        uVignette: { value: 0.22 },
        uHurt: { value: 0 },
        uUnder: { value: 0 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uNear, uFar, uPixelRatio, uSaturation, uContrast, uVignette, uHurt, uUnder;
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
            vec2 o = px * uPixelRatio * 1.7;
            float z = viewZ(vUv);
            // inverse depth is linear across flat surfaces on screen, so only real breaks show
            float w = 1.0 / z;
            float wl = 1.0 / viewZ(vUv - vec2(o.x, 0.0)), wr = 1.0 / viewZ(vUv + vec2(o.x, 0.0));
            float wu = 1.0 / viewZ(vUv + vec2(0.0, o.y)), wd = 1.0 / viewZ(vUv - vec2(0.0, o.y));
            float jump = max(abs(wl + wr - 2.0 * w), abs(wu + wd - 2.0 * w)) / w;
            float depthEdge = smoothstep(0.02, 0.08, jump);
            vec3 cl = texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb, cr = texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb;
            vec3 cu = texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb, cd = texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb;
            float g = length(cr - cl) + length(cu - cd);
            float colourEdge = smoothstep(0.24, 0.52, g) * 0.5;
            // lines thin out with distance and vanish into the haze
            float near = 1.0 - smoothstep(140.0, 700.0, z);
            float ink = max(depthEdge, colourEdge * near) * mix(0.35, 1.0, near) * (z > uFar * 0.9 ? 0.0 : 1.0);

            // flat tone bands
            float l = max(lumOf(col), 1e-4);
            float lp = sqrt(l);
            float lq = (floor(lp * 6.0) + smoothstep(0.3, 0.7, fract(lp * 6.0))) / 6.0;
            col *= mix(1.0, (lq * lq) / l, 0.5);
            // pen hatching in real shadow, close up
            vec2 fc = gl_FragCoord.xy / uPixelRatio;
            float h1 = smoothstep(0.7, 0.92, abs(fract((fc.x + fc.y) / 5.0) - 0.5) * 2.0);
            float h2 = smoothstep(0.7, 0.92, abs(fract((fc.x - fc.y) / 5.0) - 0.5) * 2.0);
            float dark = 1.0 - smoothstep(0.02, 0.08, l);
            col *= 1.0 - (h1 * smoothstep(0.0, 0.5, dark) + h2 * smoothstep(0.6, 1.0, dark)) * 0.42 * near;
            // warm paper, then the ink
            col = mix(col, col * vec3(1.04, 1.0, 0.9), 0.5);
            col = mix(col, vec3(0.07, 0.055, 0.045), ink * 0.88);

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

    render(dt, { hurt = 0, under = 0 } = {}) {
        const u = this.pass.uniforms;
        u.tDepth.value = this.composer.readBuffer.depthTexture;
        u.uNear.value = this.camera.near;
        u.uFar.value = this.camera.far;
        u.uHurt.value = hurt;
        u.uUnder.value = under;
        this.composer.render(dt);
    }
}
