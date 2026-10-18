// Ink-wash presentation: the scene rendered as if painted on rice paper. Fine ink outlines
// (from depth and colour edges, with a little brush wobble), colours laid on as soft washes
// that pool darker at their edges, paper grain over everything, and misty ink mountains in
// the empty background.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uInk;
uniform float uWash;
uniform float uHills;
uniform vec3 uPaper;
uniform vec3 uInkCol;
uniform vec3 uClear;
varying vec2 vUv;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 toSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 aces(vec3 x) { x *= 0.9; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

// rice paper: warm, uneven, with fibres
vec3 paper(vec2 px) {
    float blot = fbm(px / 420.0);
    float grain = vnoise(px / 1.6) * 0.5 + vnoise(px / 3.1) * 0.5;
    // short fibres lying every which way
    vec2 q = px / 26.0;
    vec2 cell = floor(q);
    float a = h21(cell) * 6.2832;
    vec2 f = fract(q) - 0.5;
    vec2 dir = vec2(cos(a), sin(a));
    float along = dot(f, dir), across = dot(f, vec2(-dir.y, dir.x));
    float fibre = step(abs(along), 0.42) * smoothstep(0.035, 0.0, abs(across)) * step(0.55, h21(cell + 3.1));
    vec3 c = uPaper * (0.95 + 0.07 * blot) * (0.975 + 0.035 * grain);
    return c * (1.0 - fibre * 0.05);
}

// layered mountains fading into mist, in the style of a shan shui scroll
vec3 hills(vec2 uv, vec3 base) {
    vec3 c = base;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x = uv.x * (1.4 + fi * 0.6) + fi * 7.3;
        float ridge = 0.6 - fi * 0.075 + 0.2 * (fbm(vec2(x * 1.1, fi * 3.7)) - 0.5) + 0.05 * (vnoise(vec2(x * 9.0, fi)) - 0.5);
        // tall, steep-sided volcanic crags in the manner of a shan shui scroll
        float px2 = x * 1.3 + fi * 0.37;
        float pk = pow(max(0.0, 1.0 - abs(fract(px2) - 0.5) * (2.6 + 2.0 * h21(vec2(floor(px2), fi)))), 1.6);
        ridge += (0.1 + 0.16 * h21(vec2(floor(px2), fi + 9.0))) * pk * step(0.35, h21(vec2(floor(px2), fi * 5.0)));
        float inside = smoothstep(ridge + 0.002, ridge - 0.002, uv.y);
        // ink is darkest at the ridge line and fades down into mist
        float depthFade = smoothstep(ridge - 0.22 - fi * 0.02, ridge, uv.y);
        // dry-brush texture: streaks running down the slopes
        float dry = 0.7 + 0.6 * fbm(vec2(uv.x * 140.0, uv.y * 9.0) + fi * 11.0);
        float strength = (0.07 + fi * 0.05) * mix(0.15, 1.0, depthFade) * dry;
        c = mix(c, c * mix(vec3(1.0), uInkCol * 2.6, 0.6), inside * strength * uHills);
    }
    return c;
}

void main() {
    vec2 px = vUv * uRes;
    vec2 e = 1.0 / uRes;
    float d0 = texture2D(tDepth, vUv).r;
    vec3 col = texture2D(tColor, vUv).rgb;
    bool bg = d0 >= 0.99999;
    vec3 pap = paper(px);

    // a little brush wobble in where lines are sampled
    vec2 wob = (vec2(vnoise(px / 7.0), vnoise(px / 7.0 + 17.0)) - 0.5) * e * 1.4;
    float dc = lin(texture2D(tDepth, vUv + wob).r);
    float edgeD = 0.0;
    float edgeC = 0.0;
    float lc = lum(aces(col));
    for (int i = 0; i < 4; i++) {
        vec2 o = i == 0 ? vec2(e.x, 0.0) : i == 1 ? vec2(-e.x, 0.0) : i == 2 ? vec2(0.0, e.y) : vec2(0.0, -e.y);
        float dn = lin(texture2D(tDepth, vUv + wob + o * 1.5).r);
        edgeD = max(edgeD, (dn - dc) / dc);
        edgeC = max(edgeC, abs(lum(aces(texture2D(tColor, vUv + o).rgb)) - lc));
    }
    float ink = smoothstep(0.035, 0.1, edgeD) * 0.9 + smoothstep(0.16, 0.32, edgeC) * 0.3;
    ink *= 0.75 + 0.5 * vnoise(px / 3.0);
    ink = clamp(ink, 0.0, 1.0) * uInk;

    vec3 outc;
    if (bg) {
        vec3 b = hills(vUv, pap);
        // keep cast shadows as a pale grey wash
        float sh = clamp(lum(col) / max(lum(uClear), 0.001), 0.0, 1.0);
        outc = b * mix(vec3(0.62, 0.6, 0.58), vec3(1.0), sh);
    } else {
        // a wet wash: blend in a soft blur so fine fur and scale noise melts into the colour
        vec3 blur = vec3(0.0);
        for (int i = 0; i < 8; i++) {
            float an = float(i) * 0.7854;
            blur += texture2D(tColor, vUv + vec2(cos(an), sin(an)) * e * 1.8).rgb;
        }
        col = mix(col, blur / 8.0, 0.55);
        vec3 cs = toSRGB(aces(col));
        vec3 c = cs;
        // soft washes: gently flatten the tonal range and lift the shadows, like layered pigment
        float l = lum(c);
        float band = floor(l * 6.0 + 0.5) / 6.0;
        float banded = mix(l, band, 0.35);
        c = c * (banded / max(l, 0.001));
        c = mix(c, c * 0.88 + 0.08, 0.35);
        // pigment collects at the edges of a wash
        c *= 1.0 - smoothstep(0.04, 0.18, edgeC) * 0.12;
        outc = mix(cs, c, uWash);
        // paper grain shows through the pigment
        outc *= mix(vec3(1.0), pap / uPaper, 0.8);
    }
    outc = mix(outc, uInkCol, ink * 0.85);
    gl_FragColor = vec4(outc, 1.0);
}
`;

export class InkWash {
    constructor(renderer) {
        this.renderer = renderer;
        this.target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
        this.target.depthTexture = new THREE.DepthTexture(1, 1);
        this.target.depthTexture.type = THREE.UnsignedIntType;
        this.material = new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms: {
                tColor: { value: this.target.texture },
                tDepth: { value: this.target.depthTexture },
                uRes: { value: new THREE.Vector2(1, 1) },
                uNear: { value: 0.1 },
                uFar: { value: 100 },
                uInk: { value: 1 },
                uWash: { value: 1 },
                uHills: { value: 1 },
                uPaper: { value: new THREE.Color('#ece3cf').convertLinearToSRGB() },
                uInkCol: { value: new THREE.Vector3(0.11, 0.1, 0.1) },
                uClear: { value: new THREE.Color('#ffffff') }
            },
            depthTest: false,
            depthWrite: false
        });
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
        this.quad.frustumCulled = false;
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);
        this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    setSize(w, h) {
        const pr = this.renderer.getPixelRatio();
        this.target.setSize(Math.round(w * pr), Math.round(h * pr));
        this.material.uniforms.uRes.value.set(Math.round(w * pr), Math.round(h * pr));
    }

    render(scene, camera) {
        const r = this.renderer;
        const u = this.material.uniforms;
        u.uNear.value = camera.near;
        u.uFar.value = camera.far;
        if (scene.background?.isColor) u.uClear.value.copy(scene.background);
        const tm = r.toneMapping;
        r.setRenderTarget(this.target);
        r.render(scene, camera);
        r.setRenderTarget(null);
        r.toneMapping = THREE.NoToneMapping;
        r.render(this.scene, this.cam);
        r.toneMapping = tm;
    }
}
