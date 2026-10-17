// ==================== POST-PROCESSING ====================
// The scene renders into an off-screen (multisampled) target cleared to
// transparent, then a single full-screen pass:
//  * composites the sky gradient behind the diorama
//  * "soft camera": tilt-shift blur toward the top and bottom of the frame and
//    the corners, with colour vibrance boosted toward the edges, a light grade
//    and a gentle vignette
//  * converts to sRGB for the screen
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const SoftCameraShader = {
    uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uInk: { value: 1 }, // comic ink lines, flat tone bands and hatching
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uBlur: { value: 1.4 }, // max blur radius in CSS pixels (kept low: comic art is crisp)
        uVibrance: { value: 0.25 },
        uSaturation: { value: 0.96 },
        uContrast: { value: 1.04 },
        uVignette: { value: 0.18 },
        uTop: { value: new THREE.Color('#8cc4e8') },
        uHorizon: { value: new THREE.Color('#dcecff') },
        uGlow: { value: new THREE.Color('#ffe3b8') },
        uGlowPos: { value: new THREE.Vector2(0.3, 1.0) },
        uGloom: { value: 0 }, // overcast and rain: flatter, cooler, a little darker
        uFlash: { value: 0 } // lightning
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uNear, uFar, uInk;
        uniform vec2 uResolution, uGlowPos;
        uniform float uPixelRatio, uBlur, uVibrance, uSaturation, uContrast, uVignette, uGloom, uFlash;
        uniform vec3 uTop, uHorizon, uGlow;
        varying vec2 vUv;

        vec3 sat(vec3 c, float s) {
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            return mix(vec3(l), c, s);
        }
        vec3 skyAt(vec2 uv) {
            vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 1.0, uv.y));
            vec2 d = (uv - uGlowPos) * vec2(uResolution.x / uResolution.y, 1.0);
            return mix(sky, uGlow, exp(-dot(d, d) * 2.2) * 0.85);
        }
        // the scene is premultiplied over a transparent clear: put the sky behind it
        vec3 sceneAt(vec2 uv) {
            vec4 s = texture2D(tDiffuse, uv);
            return s.rgb + skyAt(uv) * (1.0 - s.a);
        }
        vec3 toSRGB(vec3 c) {
            return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        }

        // orthographic camera: depth is linear between the near and far planes
        float depthAt(vec2 uv) { return uNear + texture2D(tDepth, uv).x * (uFar - uNear); }
        float lumOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

        void main() {
            vec2 px = 1.0 / uResolution;
            // tilt-shift: sharp band through the middle, soft toward top, bottom and corners
            float band = smoothstep(0.16, 0.5, abs(vUv.y - 0.52));
            vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
            float edge = clamp(length(c) * 1.25, 0.0, 1.0);
            float radius = uBlur * uPixelRatio * max(band, smoothstep(0.55, 1.0, edge) * 0.6);
            float cover = texture2D(tDiffuse, vUv).a;
            vec3 col = sceneAt(vUv);
            if (radius > 0.35) {
                // 12-tap golden-angle disc
                vec3 acc = col;
                for (int i = 0; i < 12; i++) {
                    float fi = float(i) + 0.5;
                    float r = sqrt(fi / 12.0) * radius;
                    float a = fi * 2.39996;
                    acc += sceneAt(vUv + vec2(cos(a), sin(a)) * r * px);
                }
                col = acc / 13.0;
            }
            // ---- comic inking ----
            if (uInk > 0.0) {
                vec2 o = px * uPixelRatio * 1.1;
                float d = depthAt(vUv);
                float dl = depthAt(vUv - vec2(o.x, 0.0));
                float dr = depthAt(vUv + vec2(o.x, 0.0));
                float du = depthAt(vUv + vec2(0.0, o.y));
                float dd = depthAt(vUv - vec2(0.0, o.y));
                // silhouettes and creases: depth jumps, ignoring the gentle slope of the ground
                float jump = max(max(abs(dl + dr - 2.0 * d), abs(du + dd - 2.0 * d)), 0.0);
                float depthEdge = smoothstep(0.05, 0.16, jump);
                // colour boundaries inside a surface (patterns, stripes, shading bands)
                vec3 cl = texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb;
                vec3 cr = texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb;
                vec3 cu = texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb;
                vec3 cd = texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb;
                float g = length(cr - cl) + length(cu - cd);
                float colourEdge = smoothstep(0.22, 0.5, g) * 0.55;
                float ink = max(depthEdge, colourEdge) * cover;

                // flat tone bands in perceptual space, keeping the hue
                float l = max(lumOf(col), 1e-4);
                float lp = sqrt(l);
                float lq = (floor(lp * 6.0) + smoothstep(0.3, 0.7, fract(lp * 6.0))) / 6.0;
                col *= mix(1.0, (lq * lq) / l, 0.55 * cover);

                // pen hatching only in real shadow, cross-hatching in the darkest parts
                vec2 fc = gl_FragCoord.xy / uPixelRatio;
                float h1 = smoothstep(0.7, 0.92, abs(fract((fc.x + fc.y) / 5.0) - 0.5) * 2.0);
                float h2 = smoothstep(0.7, 0.92, abs(fract((fc.x - fc.y) / 5.0) - 0.5) * 2.0);
                float dark = 1.0 - smoothstep(0.025, 0.09, l);
                float hatch = (h1 * smoothstep(0.0, 0.5, dark) + h2 * smoothstep(0.6, 1.0, dark)) * cover * 0.45;
                col *= 1.0 - hatch;

                // warm paper tint, then the ink on top
                col = mix(col, col * vec3(1.04, 1.0, 0.9), 0.5);
                col = mix(col, vec3(0.07, 0.055, 0.045), ink * 0.9 * uInk);
            }

            // light grade
            col = max((col - 0.18) * uContrast + 0.18, 0.0);
            col = max(sat(col, uSaturation), 0.0);
            // vibrance: lift muted colours more than already-saturated ones, rising toward the edges
            float mx = max(col.r, max(col.g, col.b));
            float mn = min(col.r, min(col.g, col.b));
            float s = clamp((mx - mn) / max(mx, 1e-3), 0.0, 1.0);
            float vib = uVibrance * smoothstep(0.25, 1.0, edge) * (1.0 - s) * smoothstep(0.0, 0.08, mx) * cover;
            col = max(sat(col, 1.0 + vib), 0.0);
            // weather: grey it down under cloud, white it out for a lightning flash
            col = mix(col, sat(col, 0.72) * vec3(0.9, 0.95, 1.02), uGloom);
            col += vec3(0.75, 0.82, 1.0) * uFlash * (0.35 + 0.65 * dot(col, vec3(0.33)));
            // gentle vignette
            col *= 1.0 - (uVignette + uGloom * 0.12) * smoothstep(0.45, 1.15, edge);
            gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
        }`
};

export class PostFX {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.camera = camera;
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
        target.depthTexture = new THREE.DepthTexture(size.x, size.y);
        target.depthTexture.type = THREE.FloatType;
        this.composer = new EffectComposer(renderer, target);
        this.renderPass = new RenderPass(scene, camera);
        this.renderPass.clearColor = new THREE.Color(0, 0, 0);
        this.renderPass.clearAlpha = 0;
        this.soft = new ShaderPass(SoftCameraShader);
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.soft);
    }

    setSize(w, h, pixelRatio) {
        this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(w, h);
        this.soft.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
        this.soft.uniforms.uPixelRatio.value = pixelRatio;
    }

    setSky(top, horizon, glow, glowX) {
        const u = this.soft.uniforms;
        u.uTop.value.copy(top);
        u.uHorizon.value.copy(horizon);
        u.uGlow.value.copy(glow);
        u.uGlowPos.value.set(glowX, 1.0);
    }

    setWeather(gloom, flash) {
        this.soft.uniforms.uGloom.value = gloom;
        this.soft.uniforms.uFlash.value = flash;
    }

    render(dt) {
        const u = this.soft.uniforms;
        u.tDepth.value = this.composer.readBuffer.depthTexture;
        u.uNear.value = this.camera.near;
        u.uFar.value = this.camera.far;
        this.composer.render(dt);
    }

    dispose() {
        this.composer.dispose();
    }
}
