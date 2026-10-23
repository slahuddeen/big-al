// Photo-scanned ferns, shrubs, nettles and weeds (Poly Haven): the scan's own maps, cut out
// by its alpha, lit through from behind, tinted per instance by the biome (paler and yellower
// where it is dry, darker under the canopy) and swaying in the wind from the root up.
shader_type spatial;
render_mode cull_disabled, diffuse_burley;
#include "res://shaders/wind.gdshaderinc"

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap_anisotropic;
uniform float plant_height = 0.4;  // the scan's height before scaling, metres
varying vec3 tint;
varying float shade;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	float scale = length(MODEL_MATRIX[1].xyz);
	float freedom = smoothstep(0.0, plant_height, VERTEX.y);
	freedom *= freedom;
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w += sway(VERTEX, origin, freedom, plant_height * scale * 1.5, TIME, 1.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(w, 1.0)).xyz;
	tint = COLOR.rgb;
	shade = 0.6 + 0.4 * smoothstep(0.0, plant_height, VERTEX.y);
}

void fragment() {
	vec4 a = texture(albedo_tex, UV);
	vec3 orm = texture(orm_tex, UV).rgb;
	vec3 c = a.rgb * tint;
	ALBEDO = c * shade;
	ALPHA = a.a;
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	ALPHA_ANTIALIASING_EDGE = 0.3;
	NORMAL_MAP = texture(normal_tex, UV).rgb;
	ROUGHNESS = clamp(orm.g, 0.45, 1.0);
	AO = orm.r * shade;
	AO_LIGHT_AFFECT = 0.3;
	SPECULAR = 0.3;
	BACKLIGHT = c * 0.5;
}
