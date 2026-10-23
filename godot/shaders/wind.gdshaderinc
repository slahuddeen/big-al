// Wind shared by all plants: a slow sway of the whole plant from the base, gusts travelling
// across the land, and a quick flutter of the leaves. COLOR.a is how freely a point moves.
uniform vec3 wind = vec3(0.8, 0.0, 0.6);
uniform float gust = 0.35;

vec3 sway(vec3 v, vec3 origin, float freedom, float height, float t, float leaf) {
	float ph = dot(origin.xz, vec2(0.031, 0.027));
	float g = 0.5 + 0.5 * sin(t * 0.5 + dot(origin.xz, vec2(0.012, 0.008)));
	float bend = freedom * (sin(t * 1.3 + ph) * 0.6 + 0.4) * gust * (0.6 + g);
	vec3 off = normalize(wind) * bend * 0.045 * height;
	off += vec3(sin(t * 7.0 + v.x * 3.0 + ph), sin(t * 9.0 + v.y * 2.0), cos(t * 8.0 + v.z * 3.0)) * leaf * freedom * 0.012 * height;
	return off;
}
