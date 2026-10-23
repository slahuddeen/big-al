// Bark: the tube's own UVs, the bark texture tiled up the trunk, its height map as relief.
shader_type spatial;
#include "res://shaders/wind.gdshaderinc"

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
varying vec3 tint;
varying float scale;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	float height = length(MODEL_MATRIX[1].xyz);
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w += sway(VERTEX, origin, COLOR.a, height, TIME, 0.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(w, 1.0)).xyz;
	tint = INSTANCE_CUSTOM.rgb * COLOR.rgb;
	scale = height;
}

void fragment() {
	vec2 uv = vec2(UV.x * 2.0, UV.y * scale * 0.35);
	vec4 a = texture(albedo_tex, uv);
	ALBEDO = a.rgb * mix(vec3(1.0), tint, 0.4);
	NORMAL_MAP = texture(normal_tex, uv).rgb;
	NORMAL_MAP_DEPTH = 1.4;
	ROUGHNESS = 0.92;
	AO = 0.6 + 0.4 * a.a;
}
