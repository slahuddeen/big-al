// Bones, termite mounds and cones: their vertex colour, with a little grain.
shader_type spatial;
varying vec3 tint;
varying vec3 wpos;
float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void vertex() {
	tint = INSTANCE_CUSTOM.rgb * COLOR.rgb;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
	float g = 0.9 + 0.1 * h(floor(wpos * 20.0));
	ALBEDO = tint * g;
	ROUGHNESS = 0.85;
}
