// Photo-scanned foliage: twig, branchlet and frond cards composed from CC0 leaf scans
// (tools/compose_cards.py). Cut out by alpha, lit through from behind, swaying with the wind.
// The cards carry the crown's normals (turned out from the middle of the crown when the tree was
// built), so a crown shades as one mass; both faces keep them, rather than the back face flipping.
shader_type spatial;
render_mode cull_disabled, diffuse_burley;
#include "res://shaders/wind.gdshaderinc"

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform float translucency = 0.4;
uniform float normal_depth = 0.6;
varying vec3 tint;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	float height = length(MODEL_MATRIX[1].xyz);
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w += sway(VERTEX, origin, COLOR.a, height, TIME, 1.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(w, 1.0)).xyz;
	tint = INSTANCE_CUSTOM.rgb;
}

void fragment() {
	if (!FRONT_FACING) {
		NORMAL = -NORMAL;
		TANGENT = -TANGENT;
		BINORMAL = -BINORMAL;
	}
	vec4 a = texture(albedo_tex, UV);
	vec3 c = a.rgb * tint * 0.86;
	ALBEDO = c;
	// keep the cut-out's coverage as the mipmaps blur its alpha away, or crowns thin to haze far off
	float lod = textureQueryLod(albedo_tex, UV).x;
	ALPHA = a.a * (1.0 + max(lod, 0.0) * 0.28);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	NORMAL_MAP = texture(normal_tex, UV).rgb;
	NORMAL_MAP_DEPTH = normal_depth;
	ROUGHNESS = 0.62;
	SPECULAR = 0.35;
	BACKLIGHT = c * translucency;
}
