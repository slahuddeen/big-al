// ==================== WATER ====================
// Ported from the Naval Command ocean shader: a tileable ripple normal map
// scrolled in two layers, fresnel reflection of the sky, sun glitter, a
// sub-surface glow through the swell, and foam broken up with noise. Rivers
// scroll their ripples downstream; waterfalls get fast falling streaks.
//
// Per-vertex data from the cell builder: colour (deep centre / lighter
// shallows) and `wdata` = (distance along the flow, shore 0..1, kind
// 0 still | 1 river | 2 waterfall).
import * as THREE from 'three';

// shared with the renderer, which updates the sun and sky every frame
export const waterUniforms = {
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    uSunColor: { value: new THREE.Color(0.9, 0.85, 0.75) },
    uAmbient: { value: new THREE.Color(0.55, 0.6, 0.65) },
    uSkyTop: { value: new THREE.Color('#5ea6e2') },
    uSkyHorizon: { value: new THREE.Color('#d6eefc') }
};

// Tileable ripple normals from periodic value noise (from Naval Command)
const makeRippleNormals = (size = 128) => {
    const hgt = new Float32Array(size * size);
    const octave = (cells, amp, seed) => {
        const g = new Float32Array(cells * cells);
        let s = seed;
        for (let i = 0; i < g.length; i++) {
            s = (s * 16807) % 2147483647;
            g[i] = s / 2147483647;
        }
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const fx = (x / size) * cells;
                const fy = (y / size) * cells;
                const ix = Math.floor(fx);
                const iy = Math.floor(fy);
                const tx = fx - ix;
                const ty = fy - iy;
                const ux = tx * tx * (3 - 2 * tx);
                const uy = ty * ty * (3 - 2 * ty);
                const a = g[(iy % cells) * cells + (ix % cells)];
                const b = g[(iy % cells) * cells + ((ix + 1) % cells)];
                const c = g[((iy + 1) % cells) * cells + (ix % cells)];
                const d = g[((iy + 1) % cells) * cells + ((ix + 1) % cells)];
                hgt[y * size + x] += amp * ((a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy);
            }
        }
    };
    octave(8, 1.0, 11);
    octave(16, 0.5, 23);
    octave(32, 0.25, 37);
    octave(64, 0.12, 51);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) hgt[y * size + x] += 0.06 * Math.sin(((x + y * 0.35) / size) * Math.PI * 2 * 12 + hgt[y * size + x] * 4);
    }
    const data = new Uint8Array(size * size * 4);
    const H = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (H(x - 1, y) - H(x + 1, y)) * 2.2;
            const nz = (H(x, y - 1) - H(x, y + 1)) * 2.2;
            const l = Math.hypot(nx, nz, 1);
            const i = (y * size + x) * 4;
            data[i] = ((nx / l) * 0.5 + 0.5) * 255;
            data[i + 1] = ((nz / l) * 0.5 + 0.5) * 255;
            data[i + 2] = (1 / l) * 255;
            data[i + 3] = 255;
        }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
};

let ripples = null;

const NOISE = /* glsl */`
float nc_hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float nc_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(nc_hash(i), nc_hash(i + vec2(1.0, 0.0)), u.x),
             mix(nc_hash(i + vec2(0.0, 1.0)), nc_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float nc_fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * nc_noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}`;

export const createWaterMaterial = (timeUniform, dim = 0) => {
    if (!ripples) ripples = makeRippleNormals();
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: timeUniform,
            uRipples: { value: ripples },
            uDim: { value: dim },
            ...waterUniforms
        },
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */`
            attribute vec3 wdata;
            uniform float uTime;
            varying vec3 vWorld;
            varying vec3 vColor;
            varying vec3 vWData;
            varying float vCrest;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                // gentle crossing swells on lakes, sea and rivers
                float still = (1.0 - step(0.5, wdata.z)) + step(0.5, wdata.z) * (1.0 - step(1.5, wdata.z)) * 0.6;
                float swell = (sin(uTime * 1.7 + wp.x * 3.0 + wp.z * 1.9) * 0.012 + cos(uTime * 1.2 + wp.z * 2.7 - wp.x * 0.7) * 0.008) * still;
                wp.y += swell;
                vCrest = swell;
                vWorld = wp.xyz;
                vColor = color;
                vWData = wdata;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            uniform sampler2D uRipples;
            uniform float uTime, uDim;
            uniform vec3 uSunDir, uSunColor, uAmbient, uSkyTop, uSkyHorizon;
            varying vec3 vWorld;
            varying vec3 vColor;
            varying vec3 vWData;
            varying float vCrest;
            ${NOISE}
            void main() {
                vec3 V = normalize(cameraPosition - vWorld);
                float kind = vWData.z;
                float shore = clamp(vWData.y, 0.0, 1.0);
                bool river = kind > 0.5 && kind < 1.5;

                // ripple normals: two scrolling layers; rivers stream theirs downstream
                vec2 uv1 = vWorld.xz * 0.55 + vec2(uTime * 0.03, uTime * 0.018);
                vec2 uv2 = vWorld.xz * 1.25 + vec2(-uTime * 0.022, uTime * 0.035);
                if (river) {
                    uv1 = vec2(vWData.x * 0.55 - uTime * 0.32, vWorld.x * 0.4 + vWorld.z * 0.4);
                    uv2 += vec2(vWData.x * 0.9 - uTime * 0.5, 0.0);
                }
                vec3 r1 = texture2D(uRipples, uv1).xzy * 2.0 - 1.0;
                vec3 r2 = texture2D(uRipples, uv2).xzy * 2.0 - 1.0;
                vec3 N = normalize(vec3(0.0, 1.0, 0.0) + vec3(r1.x + r2.x, 0.0, r1.z + r2.z) * (river ? 0.45 : 0.36));

                // body colour: deep, dark centre to luminous shallows at the shore
                // comic teal: the flat aqua greens of the Age of Reptiles river scenes
                vec3 deep = mix(vColor, vec3(0.2, 0.46, 0.44), 0.6) * vec3(0.62, 0.8, 0.82);
                vec3 shal = mix(vColor, vec3(0.5, 0.8, 0.72), 0.6);
                vec3 body = mix(deep, shal, smoothstep(0.0, 0.9, shore));
                body *= 0.82 + 0.36 * nc_fbm(vWorld.xz * 0.45 + uTime * 0.01);

                float ndl = max(dot(N, uSunDir), 0.0);
                // sub-surface glow through the swell facing the sun
                float sss = pow(max(dot(V, -uSunDir + N * 0.6), 0.0), 3.0) * (0.4 + vCrest * 25.0);
                body += vec3(0.05, 0.30, 0.26) * clamp(sss, 0.0, 1.5) * 0.3;
                body *= uAmbient + uSunColor * ndl * 0.8;

                // fresnel reflection of the sky
                vec3 R = reflect(-V, N);
                R.y = abs(R.y);
                vec3 refl = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 1.0, R.y));
                float fres = clamp(0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0), 0.0, 0.8);
                vec3 col = mix(body, refl, fres);

                // sun glitter
                vec3 H = normalize(uSunDir + V);
                float nh = max(dot(N, H), 0.0);
                col += uSunColor * (pow(nh, 500.0) * 5.0 + pow(nh, 60.0) * 0.1);

                // foam: surf at the shore, broken up by noise; churn on waterfalls
                float breakup = nc_noise(vWorld.xz * 9.0 + uTime * 0.4) * 0.6 + nc_noise(vWorld.xz * 23.0) * 0.4;
                float surf = sin(shore * 12.0 - uTime * 2.2 + nc_noise(vWorld.xz * 3.0) * 4.0) * 0.5 + 0.5;
                float foam = smoothstep(0.7, 1.0, shore) * (0.45 + 0.55 * smoothstep(0.5, 0.95, surf));
                foam += smoothstep(0.012, 0.02, vCrest) * smoothstep(0.65, 0.9, breakup) * 0.15;
                float alphaBoost = 0.0;
                if (kind > 1.5) {
                    float streak = smoothstep(0.2, 1.0, sin(vWorld.y * 16.0 + uTime * 11.0 + vWorld.x * 23.0 + vWorld.z * 17.0));
                    foam = max(foam, streak * 0.8 + shore * 0.5);
                    alphaBoost = 0.12;
                } else if (river) {
                    // a hint of current: faint streaks drifting downstream
                    foam += smoothstep(0.75, 1.0, sin(vWData.x * 5.0 - uTime * 2.6 + nc_noise(vWorld.xz * 2.0) * 3.0)) * 0.12 * (0.3 + shore);
                }
                foam = clamp(foam * smoothstep(0.2, 0.75, breakup + foam * 0.5), 0.0, 1.0);
                vec3 foamCol = vec3(0.92, 0.95, 0.94) * (uAmbient * 0.8 + uSunColor * (0.3 + 0.4 * ndl));
                col = mix(col, foamCol, foam);

                // inked ripple lines, like the pen strokes on the water in the comics
                float rip = sin((vWorld.x * 0.7 + vWorld.z * 1.3) * 7.0 + nc_noise(vWorld.xz * 1.5) * 5.0 + (river ? vWData.x * 3.0 - uTime * 2.0 : uTime * 0.5));
                col = mix(col, vec3(0.88, 0.97, 0.92) * (uAmbient + uSunColor * 0.5), smoothstep(0.93, 0.985, rip) * 0.45);

                // remembered (out of sight) water is greyed
                float lum = dot(col, vec3(0.3, 0.59, 0.11));
                col = mix(col, vec3(lum) * vec3(0.62, 0.66, 0.74), uDim * 0.75);
                gl_FragColor = vec4(col, clamp(0.8 + foam * 0.2 + alphaBoost + fres * 0.1, 0.0, 1.0));
            }`
    });
};
