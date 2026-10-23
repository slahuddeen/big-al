// Teeth and claws: their vertex colour (paler at the tips), polished and a little translucent.
shader_type spatial;
void fragment() {
	ALBEDO = COLOR.rgb;
	ROUGHNESS = 0.3;
	SPECULAR = 0.55;
	SSS_STRENGTH = 0.3;
}
