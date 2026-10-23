// Leaf cards from the foliage atlas: alpha-scissored, lit through from behind, swaying.
shader_type spatial;
render_mode cull_disabled, depth_draw_opaque, diffuse_burley;
#include "res://shaders/wind.gdshaderinc"

uniform sampler2D atlas : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
varying vec3 tint;
varying float shade;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	float height = length(MODEL_MATRIX[1].xyz);
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w += sway(VERTEX, origin, COLOR.a, height, TIME, 1.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(w, 1.0)).xyz;
	tint = INSTANCE_CUSTOM.rgb;
	// deeper in the crown, darker
	shade = 0.55 + 0.45 * clamp(VERTEX.y * 1.2, 0.0, 1.0);
}

void fragment() {
	vec4 t = texture(atlas, UV);
	if (t.a < 0.5) { discard; }
	vec3 c = t.rgb;
	// flowers: vertex colour tints only the pale petals
	float pale = smoothstep(0.55, 0.85, min(c.r, min(c.g, c.b)));
	c = mix(c, c * COLOR.rgb, pale);
	// a natural green: less saturated and a little darker than the painted atlas
	c = mix(vec3(dot(c, vec3(0.3, 0.59, 0.11))), c, 0.78) * 0.82;
	ALBEDO = c * tint * shade;
	ROUGHNESS = 0.75;
	SPECULAR = 0.3;
	BACKLIGHT = c * tint * 0.55;
	AO = shade;
	AO_LIGHT_AFFECT = 0.3;
}
