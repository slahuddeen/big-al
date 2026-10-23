// Banks of mist drifting over the rivers and ponds: thick at dawn, thin through the day.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

uniform float time = 0.0;
uniform float mist = 0.3;
uniform float layer = 0.0;
uniform vec3 mist_col : source_color = vec3(0.93, 0.95, 0.95);
varying vec3 wpos;
varying vec2 flow;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	flow = UV;
}

void fragment() {
	vec2 p = wpos.xz * (0.035 - layer * 0.012) + vec2(time * 0.018, time * 0.007) * (1.0 + layer);
	float v = n(p) * 0.6 + n(p * 2.3 + 4.1) * 0.3 + n(p * 5.1) * 0.1;
	float a = smoothstep(0.42 + layer * 0.08, 0.68, v) * smoothstep(0.0, 0.35, flow.y + 0.15);
	float d = length(wpos - CAMERA_POSITION_WORLD);
	a *= mist * (0.42 - layer * 0.16) * smoothstep(3.0, 30.0, d) * (1.0 - smoothstep(600.0, 1400.0, d));
	ALBEDO = mist_col;
	ALPHA = a;
}
