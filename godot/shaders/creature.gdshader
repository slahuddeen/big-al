// An animal's skin: the baked albedo, normal and AO/roughness maps from the Blender sculpt,
// a fine scale normal for close views, light scattering a little into the skin, a sheen
// when wet, and a flush of colour for wounds and the sail display.
shader_type spatial;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D orm_tex : filter_linear_mipmap;
uniform sampler2D detail_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec3 flash = vec3(0.0);
uniform float wet = 0.0;

void fragment() {
	vec3 a = texture(albedo_tex, UV).rgb;
	vec4 orm = texture(orm_tex, UV);
	vec3 n = texture(normal_tex, UV).rgb;
	vec3 d = texture(detail_n, UV * 9.0).rgb;
	float near = 1.0 - smoothstep(4.0, 25.0, length(VERTEX));
	vec2 nd = (n.xy - 0.5) + (d.xy - 0.5) * 0.35 * near;
	NORMAL_MAP = vec3(nd + 0.5, n.z);
	NORMAL_MAP_DEPTH = 1.0;
	ALBEDO = a * mix(1.0, 0.6, wet) * (0.55 + 0.45 * orm.r);
	AO = orm.r;
	AO_LIGHT_AFFECT = 0.5;
	ROUGHNESS = mix(orm.g, 0.18, wet * 0.85);
	SPECULAR = mix(0.4, 0.6, wet);
	SSS_STRENGTH = 0.25;
	SSS_TRANSMITTANCE_COLOR = vec4(0.9, 0.45, 0.3, 1.0);
	SSS_TRANSMITTANCE_DEPTH = 0.08;
	EMISSION = flash;
}
