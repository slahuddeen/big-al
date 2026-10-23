// Photo-scanned bark (Poly Haven) on the Modular Tree trunks and limbs: the tree's own bark UVs,
// albedo, normal and AO/roughness, a touch of the instance's tint, and the gentle sway of the
// boughs (vertex colour alpha: none at the foot, more out along the limbs).
shader_type spatial;
#include "res://shaders/wind.gdshaderinc"

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec2 uv_scale = vec2(1.0, 1.0);
varying vec3 tint;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	float height = length(MODEL_MATRIX[1].xyz);
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w += sway(VERTEX, origin, COLOR.a, height, TIME, 0.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(w, 1.0)).xyz;
	tint = INSTANCE_CUSTOM.rgb;
}

void fragment() {
	vec2 uv = UV * uv_scale;
	vec3 orm = texture(orm_tex, uv).rgb;
	ALBEDO = texture(albedo_tex, uv).rgb * mix(vec3(1.0), tint, 0.35);
	NORMAL_MAP = texture(normal_tex, uv).rgb;
	NORMAL_MAP_DEPTH = 1.3;
	ROUGHNESS = clamp(orm.g, 0.6, 1.0);
	AO = orm.r;
	AO_LIGHT_AFFECT = 0.3;
	SPECULAR = 0.3;
}
