// ==================== POST-PROCESSING ====================
// Jehol: the scene is painted as ink and wash on rice paper.
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
        uInk: { value: 1 }, // ink outlines, soft washes and paper
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uBlur: { value: 1.2 }, // max blur radius toward the top and bottom of the frame
        uSaturation: { value: 0.86 },
        uContrast: { value: 1.02 },
        uVignette: { value: 0.16 },
        uTop: { value: new THREE.Color('#d8d2c2') }, // paper wash at the top of the frame
        uHorizon: { value: new THREE.Color('#ece6d6') }, // paper wash behind the hills
        uGlow: { value: new THREE.Color('#f4e2c0') },
        uGlowPos: { value: new THREE.Vector2(0.3, 1.0) },
        uGloom: { value: 0 }, // overcast, rain and snow: flatter, cooler, a little darker
        uAsh: { value: 0 }, // volcanic ash in the air
        uFlash: { value: 0 }, // lightning
        uTime: { value: 0 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uNear, uFar, uInk;
        uniform vec2 uResolution, uGlowPos;
        uniform float uPixelRatio, uBlur, uSaturation, uContrast, uVignette, uGloom, uAsh, uFlash, uTime;
        uniform vec3 uTop, uHorizon, uGlow;
        varying vec2 vUv;

        float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float vnoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
        }
        float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
        vec3 sat(vec3 c, float s) {
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            return mix(vec3(l), c, s);
        }
        float lumOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
        vec3 toSRGB(vec3 c) {
            return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        }
        vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }

        // rice paper: warm, uneven, with short fibres lying every which way
        float paperGrain(vec2 px) {
            float blot = fbm(px / 380.0);
            float grain = vnoise(px / 1.7) * 0.5 + vnoise(px / 3.3) * 0.5;
            vec2 q = px / 26.0;
            vec2 cell = floor(q);
            float a = h21(cell) * 6.2832;
            vec2 f = fract(q) - 0.5;
            vec2 dir = vec2(cos(a), sin(a));
            float along = dot(f, dir), across = dot(f, vec2(-dir.y, dir.x));
            float fibre = step(abs(along), 0.42) * smoothstep(0.035, 0.0, abs(across)) * step(0.55, h21(cell + 3.1));
            return (0.955 + 0.07 * blot) * (0.975 + 0.035 * grain) * (1.0 - fibre * 0.045);
        }

        // the empty background: paper with far ink mountains fading into mist
        vec3 skyAt(vec2 uv, vec2 px) {
            vec3 c = mix(uHorizon, uTop, smoothstep(0.1, 1.0, uv.y));
            vec2 d = (uv - uGlowPos) * vec2(uResolution.x / uResolution.y, 1.0);
            c = mix(c, uGlow, exp(-dot(d, d) * 2.2) * 0.5);
            for (int i = 0; i < 3; i++) {
                float fi = float(i);
                float x = uv.x * (1.3 + fi * 0.5) + fi * 7.3;
                float ridge = 0.62 - fi * 0.09 + 0.16 * (fbm(vec2(x * 1.2, fi * 3.7)) - 0.5);
                float px2 = x * 1.3 + fi * 0.37;
                float pk = pow(max(0.0, 1.0 - abs(fract(px2) - 0.5) * (2.6 + 2.0 * h21(vec2(floor(px2), fi)))), 1.6);
                ridge += (0.08 + 0.14 * h21(vec2(floor(px2), fi + 9.0))) * pk * step(0.35, h21(vec2(floor(px2), fi * 5.0)));
                float inside = smoothstep(ridge + 0.002, ridge - 0.002, uv.y);
                float fade = smoothstep(ridge - 0.25, ridge, uv.y);
                float dry = 0.7 + 0.6 * fbm(vec2(uv.x * 140.0, uv.y * 9.0) + fi * 11.0);
                c = mix(c, c * vec3(0.55, 0.58, 0.6), inside * (0.08 + fi * 0.05) * mix(0.15, 1.0, fade) * dry);
            }
            return c * paperGrain(px);
        }
        // the scene is premultiplied over a transparent clear: put the paper behind it
        vec3 sceneAt(vec2 uv, vec2 px) {
            vec4 s = texture2D(tDiffuse, uv);
            return s.rgb + skyAt(uv, px) * (1.0 - s.a);
        }

        // orthographic camera: depth is linear between the near and far planes
        float depthAt(vec2 uv) { return uNear + texture2D(tDepth, uv).x * (uFar - uNear); }

        void main() {
            vec2 px = vUv * uResolution;
            vec2 pxs = 1.0 / uResolution;
            // a soft focus toward the top and bottom of the frame
            float band = smoothstep(0.18, 0.52, abs(vUv.y - 0.52));
            vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
            float edge = clamp(length(c) * 1.25, 0.0, 1.0);
            float radius = uBlur * uPixelRatio * max(band, smoothstep(0.55, 1.0, edge) * 0.6);
            float cover = texture2D(tDiffuse, vUv).a;
            vec3 col = sceneAt(vUv, px);
            // a wet wash: a little softening everywhere melts fine noise into the colour
            vec3 acc = col;
            float r0 = max(radius, 0.9 * uPixelRatio);
            for (int i = 0; i < 8; i++) {
                float fi = float(i) + 0.5;
                float r = sqrt(fi / 8.0) * r0;
                float a = fi * 2.39996;
                acc += sceneAt(vUv + vec2(cos(a), sin(a)) * r * pxs, px);
            }
            col = mix(col, acc / 9.0, radius > 0.35 ? 1.0 : 0.45);

            if (uInk > 0.0) {
                // ---- ink outlines, wobbling a little like a brush ----
                vec2 wob = (vec2(vnoise(px / 7.0), vnoise(px / 7.0 + 17.0)) - 0.5) * pxs * 1.2 * uPixelRatio;
                vec2 o = pxs * uPixelRatio * 1.0;
                float d = depthAt(vUv + wob);
                float dl = depthAt(vUv + wob - vec2(o.x, 0.0));
                float dr = depthAt(vUv + wob + vec2(o.x, 0.0));
                float du = depthAt(vUv + wob + vec2(0.0, o.y));
                float dd = depthAt(vUv + wob - vec2(0.0, o.y));
                float jump = max(abs(dl + dr - 2.0 * d), abs(du + dd - 2.0 * d));
                float depthEdge = smoothstep(0.06, 0.2, jump);
                vec3 cl = texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb;
                vec3 cr = texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb;
                vec3 cu = texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb;
                vec3 cd = texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb;
                float g = length(cr - cl) + length(cu - cd);
                float colourEdge = smoothstep(0.3, 0.6, g) * 0.35;
                float ink = max(depthEdge, colourEdge) * cover * (0.7 + 0.5 * vnoise(px / 3.0));

                // ---- washes: soft tone steps, mineral greens and blues, paper showing through ----
                float l = max(lumOf(col), 1e-4);
                float lp = sqrt(l);
                float lq = (floor(lp * 5.0) + smoothstep(0.2, 0.8, fract(lp * 5.0))) / 5.0;
                lq = max(lq, lp * 0.8); // keep the darkest faces from stepping down to black
                col *= mix(1.0, (lq * lq) / l, 0.3 * cover);
                // greens lean toward malachite and azurite, as in blue-green landscape painting
                float green = clamp((col.g - max(col.r, col.b)) * 6.0, 0.0, 1.0);
                col = mix(col, vec3(col.r * 0.82, col.g * 0.96, col.b * 1.18 + col.g * 0.06), green * 0.55 * cover);
                // pigment collects at the edges of a wash
                col *= 1.0 - smoothstep(0.08, 0.3, g) * 0.1 * cover;
                // dry-brush texture in the shadows
                float dark = 1.0 - smoothstep(0.02, 0.1, l);
                float dryb = smoothstep(0.55, 0.75, fbm(vec2(px.x / 2.5, px.y / 14.0)));
                col *= 1.0 - dark * dryb * 0.25 * cover;
                // paper under everything
                col *= mix(1.0, paperGrain(px), 0.85);
                // distance mist: the far side of the view fades into the paper, like a scroll
                float mist = smoothstep(0.62, 1.0, vUv.y) * 0.4 * cover;
                col = mix(col, skyAt(vUv, px), mist);
                col = mix(col, vec3(0.035, 0.032, 0.03), ink * 0.85 * uInk);
            }

            // light grade
            col = max((col - 0.18) * uContrast + 0.18, 0.0);
            col = max(sat(col, uSaturation), 0.0);
            // weather: grey it down under cloud and snow, brown it under ash, white it out for lightning
            col = mix(col, sat(col, 0.7) * vec3(0.92, 0.95, 1.0), uGloom);
            col = mix(col, sat(col, 0.45) * vec3(0.78, 0.72, 0.66), uAsh);
            col += vec3(0.75, 0.82, 1.0) * uFlash * (0.35 + 0.65 * dot(col, vec3(0.33)));
            col *= 1.0 - (uVignette + uGloom * 0.1 + uAsh * 0.2) * smoothstep(0.45, 1.15, edge);
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

    setWeather(gloom, flash, ash = 0) {
        this.soft.uniforms.uGloom.value = gloom;
        this.soft.uniforms.uFlash.value = flash;
        this.soft.uniforms.uAsh.value = ash;
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
