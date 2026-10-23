// The forest roof from afar: crowns coloured per tree, mottled with leaf texture and shading.
shader_type spatial;
render_mode cull_back;
uniform sampler2D atlas : source_color, filter_linear_mipmap, repeat_enable;
varying vec3 wpos;
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec3 leaves = texture(atlas, fract(wpos.xz / 9.0) * 0.24 + vec2(0.255, 0.755)).rgb;
	float l = dot(leaves, vec3(0.3, 0.59, 0.11));
	ALBEDO = COLOR.rgb * (0.7 + 0.6 * l);
	ROUGHNESS = 0.9;
	BACKLIGHT = COLOR.rgb * 0.3;
}
