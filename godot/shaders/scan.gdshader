// Photo-scanned rocks, stones and dead wood (Poly Haven): the scan's own albedo, normal and
// AO/roughness maps, a tint per instance from the biome, and a dusting of the ground's moss
// settling on the tops of the bigger ones.
shader_type spatial;
render_mode diffuse_burley;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap_anisotropic;
uniform vec3 moss = vec3(0.24, 0.27, 0.12);
uniform bool tint_from_custom = false;  // the flora scatter's tint comes in the custom data, the instancer's as colour
varying vec3 tint;
varying float up;

void vertex() {
	tint = tint_from_custom ? INSTANCE_CUSTOM.rgb : COLOR.rgb;
	up = (MODEL_MATRIX * vec4(NORMAL, 0.0)).y / length(MODEL_MATRIX[1].xyz);
}

void fragment() {
	vec3 orm = texture(orm_tex, UV).rgb;
	vec3 c = texture(albedo_tex, UV).rgb * tint;
	c = mix(c, moss * (0.7 + 0.6 * c.g), smoothstep(0.75, 0.95, up) * 0.35);
	ALBEDO = c;
	NORMAL_MAP = texture(normal_tex, UV).rgb;
	NORMAL_MAP_DEPTH = 1.2;
	ROUGHNESS = clamp(orm.g * 1.05, 0.4, 1.0);
	METALLIC = 0.0;
	AO = orm.r;
	AO_LIGHT_AFFECT = 0.4;
	SPECULAR = 0.35;
}
