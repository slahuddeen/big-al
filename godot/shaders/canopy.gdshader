// The forest roof from afar: crowns coloured per tree, mottled with leaf texture and shading,
// toned like the near foliage (shaders/foliage.gdshader) so the far forest is the same green as
// the trees in front of it, and its flanks dark with the shade under the crowns.
shader_type spatial;
render_mode cull_back;
uniform sampler2D atlas : source_color, filter_linear_mipmap, repeat_enable;
varying vec3 wpos;
varying float flank;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	flank = 1.0 - smoothstep(0.35, 0.8, NORMAL.y);
}
void fragment() {
	vec3 leaves = texture(atlas, fract(wpos.xz / 9.0) * 0.24 + vec2(0.255, 0.755)).rgb;
	float l = dot(leaves, vec3(0.3, 0.59, 0.11));
	vec3 c = COLOR.rgb;
	c = mix(vec3(dot(c, vec3(0.3, 0.59, 0.11))), c, 0.78) * 0.82 * 0.8;
	c *= 0.7 + 0.6 * l;
	c *= mix(1.0, 0.45, flank);
	ALBEDO = c;
	ROUGHNESS = 0.9;
	SPECULAR = 0.25;
	BACKLIGHT = c * 0.3;
}
