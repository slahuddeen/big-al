// An eye: the iris map across the front of the ball, a dark sclera behind, and a wet,
// glossy cornea over all of it.
shader_type spatial;
uniform sampler2D iris_tex : source_color, filter_linear_mipmap;
void fragment() {
	vec2 uv = UV;
	vec3 c = (uv.x <= 0.001 && uv.y <= 0.001) ? vec3(0.08, 0.06, 0.05) : texture(iris_tex, uv).rgb;
	ALBEDO = c;
	ROUGHNESS = 0.03;
	SPECULAR = 0.9;
	CLEARCOAT = 1.0;
	CLEARCOAT_ROUGHNESS = 0.02;
}
