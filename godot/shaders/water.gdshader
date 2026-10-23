// Water: clear in the shallows and deepening to jade and blue with depth (Beer-Lambert
// absorption of the refracted river bed), sky and sun reflected by Fresnel, two layers of
// ripples drifting with the current along the rivers, white water on the rapids, foam at
// the shore, and rings spreading from anything moving through it.
shader_type spatial;
render_mode blend_mix, depth_draw_always, cull_disabled, specular_schlick_ggx;

uniform sampler2D normal_a : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D normal_b : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear;
uniform float time = 0.0;
uniform float sun = 1.0;
uniform vec4 ripples[16];
uniform vec3 deep_col : source_color = vec3(0.015, 0.07, 0.08);
uniform vec3 shallow_col : source_color = vec3(0.06, 0.16, 0.13);
uniform vec3 pond_col : source_color = vec3(0.04, 0.07, 0.04);

varying vec3 wpos;
varying vec2 flow;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	flow = UV;
}

vec3 unpack(vec4 t) { return t.xyz * 2.0 - 1.0; }

void fragment() {
	bool river = flow.x > 0.0;
	float pond = step(flow.x, -0.5);
	vec2 p = wpos.xz;
	// ripples: along the river they run with the current, elsewhere they drift
	vec2 uva, uvb;
	if (river) {
		uva = vec2(flow.x * 0.08 - time * 0.12, flow.y * 1.2);
		uvb = vec2(flow.x * 0.05 - time * 0.07, flow.y * 0.7 + 0.3);
	} else {
		uva = p * 0.06 + vec2(time * 0.012, time * 0.007);
		uvb = p * 0.025 - vec2(time * 0.006, -time * 0.009);
	}
	vec3 n1 = unpack(texture(normal_a, uva));
	vec3 n2 = unpack(texture(normal_b, uvb));
	vec3 nt = normalize(vec3(n1.xy + n2.xy, 1.0) * vec3(river ? 1.0 : 0.55, river ? 1.0 : 0.55, 1.0));
	// ripple rings
	float rip = 0.0;
	for (int i = 0; i < 16; i++) {
		vec4 r = ripples[i];
		float age = time - r.z;
		if (age < 0.0 || age > 3.0) continue;
		float d = distance(p, r.xy);
		float rad = age * (2.0 + r.w * 1.5);
		float ring = 1.0 - smoothstep(0.0, 0.25 + r.w * 0.15, abs(d - rad));
		rip = max(rip, ring * (1.0 - age / 3.0) * min(1.0, r.w));
	}
	nt.xy += vec2(rip) * 0.6;
	vec3 nw = normalize(vec3(nt.x, nt.z, nt.y));
	NORMAL = normalize((VIEW_MATRIX * vec4(nw, 0.0)).xyz);
	// depth of water under this pixel, from the depth buffer
	float zb = texture(depth_tex, SCREEN_UV).r;
	vec4 ndc = vec4(SCREEN_UV * 2.0 - 1.0, zb, 1.0);
	vec4 vpos = INV_PROJECTION_MATRIX * ndc;
	vpos.xyz /= vpos.w;
	float thick = max(0.0, length(vpos.xyz) - length(VERTEX));
	float wd = thick * clamp(-normalize(VERTEX).y + 0.2, 0.2, 1.0);
	// refraction: the bed seen through the surface, bent by the ripples
	vec2 ruv = SCREEN_UV + nt.xy * 0.03 * clamp(wd, 0.0, 1.0);
	vec3 bed = textureLod(screen_tex, ruv, 0.0).rgb;
	vec3 body = mix(shallow_col, deep_col, smoothstep(0.0, 6.0, wd));
	body = mix(body, pond_col, pond * 0.7);
	float absorb = 1.0 - exp(-wd * (pond > 0.5 ? 1.1 : 0.45));
	vec3 col = mix(bed * vec3(0.8, 0.95, 0.9), body, absorb);
	// white water: rapids where the river runs fast and the shore line
	float foam = 0.0;
	if (river) {
		foam = smoothstep(0.75, 0.95, n1.x * 0.5 + 0.5) * smoothstep(0.35, 0.0, flow.y) * 0.5;
	}
	float shore = 1.0 - smoothstep(0.0, 0.5, wd);
	foam = max(foam, shore * smoothstep(0.4, 0.7, texture(normal_a, p * 0.3 + time * 0.03).r) * 0.7);
	foam = max(foam, step(0.45, rip) * 0.6);
	col = mix(col, vec3(0.92, 0.95, 0.95), foam);
	ALBEDO = col;
	// the far bank and the trees would be reflected at a glancing angle: without screen-space
	// reflections on water, darken the sky's reflection towards the horizon instead
	float fres = pow(1.0 - clamp(dot(NORMAL, normalize(-VERTEX)), 0.0, 1.0), 5.0);
	ALBEDO *= 1.0 - fres * 0.5;
	ROUGHNESS = mix(0.06, 0.3, foam);
	METALLIC = 0.0;
	SPECULAR = mix(0.5, 0.25, pond);
	ALPHA = clamp(0.55 + absorb * 0.45 + foam, 0.0, 1.0) * smoothstep(0.0, 0.15, wd + 0.02);
}
