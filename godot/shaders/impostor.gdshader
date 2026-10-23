// Distant trees: each one a single card turning to face the camera, showing whichever two of the
// eight views baked round the tree (tools/blender/build_trees.py) are nearest the direction it is
// seen from, cross-faded. Every species and variant is a layer of one texture array, picked by the
// instance's custom data (r = layer, gba = tint); the baked normals are in the tree's own space and
// turn with it, so the light falls on a distant forest as it does on the near trees.
shader_type spatial;
render_mode cull_disabled, diffuse_burley;

uniform sampler2DArray albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2DArray normal_tex : filter_linear_mipmap_anisotropic;
uniform float frames = 8.0;
varying vec3 tint;
varying flat float layer;
varying flat float frame0;
varying flat float frame1;
varying float blend;
varying vec3 axis_x;
varying vec3 axis_z;

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0, 0, 0, 1)).xyz;
	vec3 sx = MODEL_MATRIX[0].xyz;
	float w = length(sx);
	float h = length(MODEL_MATRIX[1].xyz);
	axis_x = sx / w;
	axis_z = normalize(MODEL_MATRIX[2].xyz);
	vec3 to_cam = CAMERA_POSITION_WORLD - origin;
	to_cam.y = 0.0;
	to_cam = normalize(to_cam + vec3(1e-4, 0.0, 0.0));
	vec3 right = vec3(to_cam.z, 0.0, -to_cam.x);
	vec3 world = origin + right * VERTEX.x * w + vec3(0.0, VERTEX.y * h, 0.0);
	VERTEX = (inverse(MODEL_MATRIX) * vec4(world, 1.0)).xyz;
	// which way round the tree we are looking, in the tree's own frame
	float a = atan(dot(to_cam, axis_x), dot(to_cam, axis_z));
	float f = mod(a / 6.2831853 * frames + frames, frames);
	frame0 = floor(f);
	frame1 = mod(frame0 + 1.0, frames);
	blend = fract(f);
	layer = INSTANCE_CUSTOM.r;
	tint = INSTANCE_CUSTOM.gba;
	NORMAL = (MODELVIEW_MATRIX * vec4(to_cam, 0.0)).xyz;
}

void fragment() {
	vec2 uv0 = vec2((frame0 + UV.x) / frames, UV.y);
	vec2 uv1 = vec2((frame1 + UV.x) / frames, UV.y);
	vec4 a0 = texture(albedo_tex, vec3(uv0, layer));
	vec4 a1 = texture(albedo_tex, vec3(uv1, layer));
	vec4 a = mix(a0, a1, blend);
	vec3 n = mix(texture(normal_tex, vec3(uv0, layer)).rgb, texture(normal_tex, vec3(uv1, layer)).rgb, blend) * 2.0 - 1.0;
	vec3 wn = normalize(axis_x * n.x + vec3(0.0, n.y, 0.0) + axis_z * n.z);
	NORMAL = normalize((VIEW_MATRIX * vec4(wn, 0.0)).xyz);
	vec3 c = a.rgb * tint * 0.86;
	ALBEDO = c;
	float lod = textureQueryLod(albedo_tex, uv0).x;
	ALPHA = a.a * (1.0 + max(lod, 0.0) * 0.3);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	ROUGHNESS = 0.75;
	SPECULAR = 0.3;
	BACKLIGHT = c * 0.3;
}
