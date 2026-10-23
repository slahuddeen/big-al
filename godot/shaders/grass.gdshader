// The grass field: photographic tufts (Poly Haven grass and celandine scans rendered side-on by
// tools/blender/prep_polyhaven.py) on crossed cards. Every clump finds its own place on the
// height map and asks the grass map (tools/bake_ground.py) how thick, how dry and how tall the
// grass grows there and whether it flowers: lush green tufts in the meadows, tall dry grass on
// the savanna, nothing on rock, sand or in the water. It leans with the wind and grows up out
// of the ground at the edge of the field instead of popping in.
shader_type spatial;
render_mode cull_disabled, diffuse_burley;

uniform sampler2D height_tex : filter_linear, repeat_disable;
uniform sampler2D water_tex : filter_nearest, repeat_disable;
uniform sampler2D grass_map : filter_linear, repeat_disable;
uniform sampler2D cards : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
uniform float spans[8];
uniform vec2 grid_size = vec2(2081.0, 1761.0);
uniform float spacing = 0.35;
uniform float extent = 50.0;
uniform float inner = 0.0;  // the far field leaves the middle to the near one
uniform float size = 4.2;   // the scans are small tufts: grow them to Cretaceous meadow grass
uniform vec3 wind = vec3(0.8, 0.0, 0.6);

varying vec3 tint;
varying flat int card;
varying float fade;

float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	vec2 cell = floor(origin.xz / spacing + 0.5);
	vec2 xz = origin.xz + (vec2(h2(cell), h2(cell + 31.7)) - 0.5) * spacing * 1.8;
	vec2 uv = (xz + 0.5) / grid_size;
	float g = texture(height_tex, uv).r;
	float wl = texture(water_tex, uv).r;
	vec4 m = texture(grass_map, uv);  // r thick, g dry, b flowers, a tall
	float d = length(xz - CAMERA_POSITION_WORLD.xz);
	fade = 1.0 - smoothstep(extent * 0.65, extent * 0.97, d);
	if (inner > 0.0) fade *= smoothstep(inner * 0.8, inner, d);
	float keep = step(h2(cell + 7.3), pow(m.r, 0.7) * 1.3);
	if (wl > -999.0 && g < wl + 0.1) keep = 0.0;
	// which tuft: celandine where it flowers, the dry tall scans where it is dry, green tufts elsewhere
	float pick = h2(cell + 2.7);
	card = int(pick * 4.99);
	if (h2(cell + 9.1) < m.g * 0.55) card = 5 + int(pick * 1.99);
	if (card < 5 && h2(cell + 4.4) < m.b * 0.3) card = 7;
	if (card == 4 && m.a > 0.6) card = 2;
	float s = spans[card] * size * (0.7 + 0.6 * h2(cell + 1.3)) * (0.45 + 0.75 * m.a) * keep * smoothstep(0.0, 0.35, fade);
	float ang = h2(cell + 5.5) * 6.2831;
	mat2 rot = mat2(vec2(cos(ang), sin(ang)), vec2(-sin(ang), cos(ang)));
	vec3 v = VERTEX * s;
	v.xz = rot * v.xz;
	// wind: a lean that travels across the field, and a flutter at the tips
	float tip = VERTEX.y;
	float wave = sin(dot(xz, vec2(0.08, 0.05)) - TIME * 1.6) * 0.5 + 0.5;
	v.xz += normalize(wind.xz) * tip * tip * s * (0.1 + 0.22 * wave) + vec2(sin(TIME * 4.7 + pick * 40.0), cos(TIME * 4.1 + pick * 30.0)) * tip * s * 0.025;
	vec3 world = vec3(xz.x, g - 0.03, xz.y) + v;
	VERTEX = (inverse(MODEL_MATRIX) * vec4(world, 1.0)).xyz;
	// a dry, sun-bleached cast where it is dry, and a little variety clump to clump
	tint = mix(vec3(1.0), vec3(1.12, 1.02, 0.74), m.g * 0.7) * (0.82 + 0.3 * h2(cell + 2.2));
	NORMAL = mix(NORMAL, vec3(0, 1, 0), 0.75);
}

void fragment() {
	vec2 cellUV = vec2(float(card % 4), float(card / 4));
	vec4 t = texture(cards, (cellUV + vec2(UV.x, mix(0.01, 0.995, UV.y))) / vec2(4.0, 2.0));
	if (fade <= 0.01) { discard; }
	vec3 c = t.rgb * tint;
	float base = mix(0.55, 1.0, smoothstep(1.0, 0.45, UV.y));  // shaded down in the tuft
	ALBEDO = c * base;
	ALPHA = t.a;
	ALPHA_SCISSOR_THRESHOLD = 0.45;
	ALPHA_ANTIALIASING_EDGE = 0.25;
	ROUGHNESS = 0.85;
	SPECULAR = 0.2;
	BACKLIGHT = c * 0.4;
	AO = base;
	AO_LIGHT_AFFECT = 0.4;
}
