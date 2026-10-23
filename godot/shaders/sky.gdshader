// The sky over the Kem Kem: a gradient that follows the sun through the day, a sun with a
// warm halo and a corona of forward scattering, cumulus clouds drawn from layered noise and
// lit from the sun's side, stars and a moon at night, and a band of haze on the horizon.
shader_type sky;
render_mode use_quarter_res_pass;

uniform vec3 top_col : source_color = vec3(0.25, 0.55, 0.86);
uniform vec3 horizon_col : source_color = vec3(0.8, 0.88, 0.93);
uniform vec3 sun_col : source_color = vec3(1.0, 0.95, 0.85);
uniform vec3 cloud_lit : source_color = vec3(1.0);
uniform vec3 cloud_shade : source_color = vec3(0.62, 0.68, 0.78);
uniform float night = 0.0;
uniform float time = 0.0;
uniform float cover = 0.45;

float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += n2(p) * a; p = p * 2.03 + 7.1; a *= 0.5; } return v; }

void sky() {
	vec3 d = normalize(EYEDIR);
	vec3 sd = LIGHT0_ENABLED ? LIGHT0_DIRECTION : vec3(0, 1, 0);
	// LIGHT0 is the sun by day and the moon by night; the sun itself is opposite the moon
	vec3 sun = night > 0.5 ? -sd : sd;
	float h = clamp(d.y, -0.2, 1.0);
	vec3 c = mix(horizon_col, top_col, smoothstep(-0.02, 0.6, h));
	float s = dot(d, sun);
	// the sun: a bright disc, a halo, and a wide warm glow near the horizon
	c += sun_col * pow(max(s, 0.0), 8.0) * 0.18 * (1.0 - night);
	c += sun_col * pow(max(s, 0.0), 64.0) * 0.5 * (1.0 - night);
	c = mix(c, sun_col * 6.0, smoothstep(0.9993, 0.9997, s) * (1.0 - night));
	float m = dot(d, -sun);
	c = mix(c, vec3(0.9, 0.9, 0.84) * 1.5, smoothstep(0.9994, 0.9997, m) * night);
	// clouds on a plane overhead, drifting
	if (d.y > 0.0) {
		vec2 cp = d.xz / (d.y + 0.08) * 0.9 + vec2(time * 0.004, time * 0.0015);
		float base = fbm(cp * 1.1);
		float dens = smoothstep(1.0 - cover, 1.0 - cover + 0.25, base);
		// light from the sun's side: sample the density a little towards the sun
		float toward = fbm((cp + sun.xz * 0.06) * 1.1);
		float lit = clamp(1.0 - (toward - base) * 6.0, 0.0, 1.0);
		vec3 cc = mix(cloud_shade, cloud_lit, lit);
		cc += sun_col * pow(max(s, 0.0), 6.0) * 0.6 * (1.0 - dens) * (1.0 - night);  // silver lining
		float fade = smoothstep(0.0, 0.15, d.y);
		c = mix(c, cc, dens * fade * 0.92);
	}
	// stars
	vec3 q = floor(d * 300.0);
	float st = step(0.9972, h3(q)) * smoothstep(0.03, 0.25, d.y);
	c += vec3(0.85, 0.9, 1.0) * st * night * (0.5 + 0.5 * h3(q + 3.1)) * 1.5;
	// haze over the horizon and below it
	c = mix(c, horizon_col, (1.0 - smoothstep(0.0, 0.14, d.y)) * 0.5);
	c = mix(c, horizon_col * 0.9, smoothstep(0.0, -0.1, d.y));
	COLOR = c;
}
