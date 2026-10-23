# ==================== SKY, SUN AND THE DAY ====================
# A day lasts ten minutes, as in the browser game: sunrise, a sun that crosses the sky, an
# orange sunset, then stars and moonlight until dawn. The same colour keys drive a real
# lighting rig: a shadow-casting sun (or moon), sky-lit ambient light, volumetric height fog
# that thickens into valley mist at dawn and dusk, screen-space AO and indirect light, and glow.
extends Node3D

const DAY_LENGTH := 600.0

# sky colours by sun height (-1 .. 1), from src/roam/sky.js
const KEYS := [
	{"e": -0.35, "top": Color("#060c1c"), "horizon": Color("#14203a"), "sun": Color("#8fa6d8"), "sunI": 0.25, "amb": 0.35},
	{"e": -0.08, "top": Color("#1a2a52"), "horizon": Color("#d27a5a"), "sun": Color("#ff9a5a"), "sunI": 0.4, "amb": 0.45},
	{"e": 0.06, "top": Color("#4a76b8"), "horizon": Color("#f4b07a"), "sun": Color("#ffb070"), "sunI": 1.6, "amb": 0.7},
	{"e": 0.3, "top": Color("#4f9ede"), "horizon": Color("#cfe6f2"), "sun": Color("#fff0d8"), "sunI": 2.8, "amb": 1.0},
	{"e": 1.0, "top": Color("#3f92dc"), "horizon": Color("#c8e4f4"), "sun": Color("#fff6e4"), "sunI": 3.2, "amb": 1.05},
]

var time := 0.3 * DAY_LENGTH
var sun: DirectionalLight3D
var env: Environment
var sky_mat: ShaderMaterial
var elevation := 0.5
var night := 0.0
var sun_dir := Vector3.UP
var mist := 0.3


func _ready() -> void:
	sky_mat = ShaderMaterial.new()
	sky_mat.shader = load("res://shaders/sky.gdshader")
	var sky := Sky.new()
	sky.sky_material = sky_mat
	sky.process_mode = Sky.PROCESS_MODE_REALTIME
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.tonemap_white = 6.0
	env.ssao_enabled = true
	env.ssao_radius = 2.5
	env.ssao_intensity = 1.6
	env.ssao_power = 1.4
	env.ssil_enabled = true
	env.ssil_radius = 6.0
	env.ssil_intensity = 0.8
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.2
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	env.fog_density = 0.0006
	env.fog_sky_affect = 0.2
	env.fog_aerial_perspective = 0.55
	env.fog_sun_scatter = 0.35
	env.fog_height = 14.0
	env.fog_height_density = 0.012
	env.volumetric_fog_enabled = true
	env.volumetric_fog_density = 0.004
	env.volumetric_fog_length = 180.0
	env.volumetric_fog_detail_spread = 2.0
	env.volumetric_fog_anisotropy = 0.6
	env.volumetric_fog_ambient_inject = 0.4
	env.volumetric_fog_sky_affect = 0.0
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.05
	env.adjustment_contrast = 1.04
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_max_distance = 420.0
	sun.directional_shadow_split_1 = 0.06
	sun.directional_shadow_split_2 = 0.18
	sun.directional_shadow_split_3 = 0.45
	sun.directional_shadow_blend_splits = true
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.light_angular_distance = 0.6
	sun.light_volumetric_fog_energy = 1.6
	add_child(sun)


var day_fraction: float:
	get:
		return fmod(time / DAY_LENGTH, 1.0)

var is_night: bool:
	get:
		return elevation < -0.05


func clock() -> String:
	var mins := int(day_fraction * 24.0 * 60.0)
	return "%02d:%02d" % [mins / 60, mins % 60]


func phase_name() -> String:
	var f := day_fraction
	if f < 0.22 or f > 0.8:
		return "Night"
	if f < 0.3:
		return "Dawn"
	if f < 0.48:
		return "Morning"
	if f < 0.62:
		return "Midday"
	if f < 0.72:
		return "Afternoon"
	return "Dusk"


func update(dt: float) -> void:
	time += dt
	var t := day_fraction
	var a := (t - 0.25) * TAU
	# the sun rises in the east (+x), crosses the south and sets in the west
	sun_dir = Vector3(cos(a), sin(a), -0.35).normalized()
	elevation = sun_dir.y
	var i := 0
	while i < KEYS.size() - 2 and elevation > KEYS[i + 1].e:
		i += 1
	var A: Dictionary = KEYS[i]
	var B: Dictionary = KEYS[i + 1]
	var k := clampf((elevation - A.e) / (B.e - A.e), 0.0, 1.0)
	var top: Color = A.top.lerp(B.top, k)
	var horizon: Color = A.horizon.lerp(B.horizon, k)
	var sc: Color = A.sun.lerp(B.sun, k)
	night = 1.0 - clampf((elevation + 0.12) / 0.2, 0.0, 1.0)
	sky_mat.set_shader_parameter("top_col", top)
	sky_mat.set_shader_parameter("horizon_col", horizon)
	sky_mat.set_shader_parameter("sun_col", sc)
	sky_mat.set_shader_parameter("night", night)
	sky_mat.set_shader_parameter("time", time)
	var glow := maxf(0.0, 1.0 - absf(elevation - 0.02) / 0.18)
	sky_mat.set_shader_parameter("cloud_lit", Color(1, 1, 1).lerp(Color("#ffb488"), glow * 0.8).lerp(Color("#4a5a7a"), night))
	sky_mat.set_shader_parameter("cloud_shade", Color(0.64, 0.7, 0.8).lerp(Color("#c47a6a"), glow * 0.6).lerp(Color("#1c2638"), night))
	# light from the sun by day and from the moon by night
	var light_dir := sun_dir if elevation > -0.05 else -sun_dir
	sun.look_at_from_position(Vector3.ZERO, -light_dir, Vector3.UP if absf(light_dir.y) < 0.99 else Vector3.FORWARD)
	sun.light_color = sc
	sun.light_energy = lerpf(A.sunI, B.sunI, k) * smoothstep(-0.02, 0.08, absf(light_dir.y))
	env.ambient_light_energy = lerpf(A.amb, B.amb, k)
	env.ambient_light_sky_contribution = 1.0
	# atmosphere: haze the colour of the horizon, mist thick at dawn, thinner by day
	var dawn := maxf(0.0, 1.0 - absf(t - 0.27) / 0.08)
	var dusk := maxf(0.0, 1.0 - absf(t - 0.77) / 0.07)
	mist = minf(1.0, 0.22 + dawn * 0.8 + dusk * 0.3 + night * 0.4)
	env.fog_light_color = horizon.lerp(Color("#eef0ea"), (1.0 - night) * 0.3)
	env.fog_density = 0.00045 + dawn * 0.0006 + night * 0.0003
	env.fog_height = World.sea_level + 10.0 + dawn * 6.0
	env.fog_height_density = 0.004 + dawn * 0.02 + dusk * 0.008 + night * 0.006
	env.volumetric_fog_density = 0.0025 + dawn * 0.01 + dusk * 0.004
	env.volumetric_fog_albedo = horizon.lerp(Color(1, 1, 1), 0.5)
