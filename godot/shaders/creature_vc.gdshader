// Skin for the animals still built from the browser's lofts: their painted vertex colours,
// a baked ambient occlusion in the alpha, mottling and the shared scale detail.
shader_type spatial;

uniform sampler2D detail_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D mottle : filter_linear_mipmap, repeat_enable;
uniform vec3 flash = vec3(0.0);
uniform float wet = 0.0;

void fragment() {
	vec3 m = texture(mottle, UV * 2.0).rgb;
	ALBEDO = COLOR.rgb * (0.82 + 0.28 * m.r) * (0.9 + 0.15 * m.b) * mix(1.0, 0.6, wet);
	AO = COLOR.a;
	AO_LIGHT_AFFECT = 0.6;
	NORMAL_MAP = texture(detail_n, UV * 6.0).rgb;
	NORMAL_MAP_DEPTH = 0.7;
	ROUGHNESS = mix(0.62 + m.g * 0.2, 0.2, wet * 0.85);
	SSS_STRENGTH = 0.2;
	EMISSION = flash;
}
