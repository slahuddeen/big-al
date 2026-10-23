# ==================== THE LAND ====================
# The ground is drawn by Terrain3D (the GDExtension in addons/terrain_3d): a clipmap mesh that
# follows the camera over the baked one-metre height map, textured from fourteen photo-scanned
# Poly Haven ground materials. The control map (tools/bake_ground.py) picks the two of them that
# show at every metre and how they blend, by biome, slope and waterline, and Terrain3D blends
# them by their height maps, so pebbles poke out of the sand and grass grows up between the
# stones. Its instancer scatters the ground clutter: ferns, shrubs, nettles, weeds, mossy rocks,
# boulders, pebbles, stumps, logs and fallen bark, each a photo scan with its own maps.
# Gameplay never asks Terrain3D anything: the ground everything stands on is World.height, the
# same height map.
extends Node3D

# how many metres one repeat of each ground material covers (the scans are about 2-4 m across)
const TILE := {"leafy_grass": 3.0, "withered_grass": 3.5, "forest_leaves_02": 3.0, "forrest_ground_01": 3.5,
	"brown_mud_leaves_01": 3.0, "mud_cracked_dry_03": 4.0, "coast_sand_01": 4.0, "gravelly_sand": 3.0, "rock_face_03": 7.0,
	"red_laterite_soil_stones": 4.0, "dry_ground_rocks": 3.5, "mossy_rock": 5.0, "damp_sand": 4.0, "river_small_rocks": 3.0}

var terrain: Terrain3D
var meta: Dictionary
var scan_materials := {}  # Poly Haven scan -> Material


func _ready() -> void:
	var dir := "res://data/world_%d/" % World.seed
	meta = JSON.parse_string(FileAccess.get_file_as_string(dir + "t3d.json"))
	terrain = Terrain3D.new()
	terrain.name = "Terrain3D"
	terrain.region_size = Terrain3D.SIZE_512
	terrain.vertex_spacing = 1.0
	terrain.mesh_size = 48
	terrain.mesh_lods = 7
	terrain.collision_mode = Terrain3DCollision.DISABLED
	terrain.cast_shadows = RenderingServer.SHADOW_CASTING_SETTING_ON
	terrain.assets = _assets()
	terrain.material = _material()
	add_child(terrain)
	_guard_shader()
	var w: int = meta.width
	var d: int = meta.depth
	var height := Image.create_from_data(w, d, false, Image.FORMAT_RF, World.gunzip(dir + "t3d_height.bin.gz"))
	var control := Image.create_from_data(w, d, false, Image.FORMAT_RF, World.gunzip(dir + "t3d_control.bin.gz"))
	var color := Image.create_from_data(w, d, false, Image.FORMAT_RGBA8, World.gunzip(dir + "t3d_color.bin.gz"))
	terrain.data.import_images([height, control, color], Vector3(meta.origin[0], 0, meta.origin[1]), 0.0, 1.0)
	_clutter(dir)


func set_camera(cam: Camera3D) -> void:
	terrain.set_camera(cam)


# Terrain3D 1.0's shader reads its region map at an index it has only checked afterwards, which
# is out of the array's bounds wherever there is no region. Most GPUs return garbage there and
# the result is thrown away; some drivers (Mesa's llvmpipe among them) crash. Clamp the index in
# the shader Terrain3D generates and use that instead.
func _guard_shader() -> void:
	var m := terrain.material
	var code := RenderingServer.shader_get_code(m.get_shader_rid())
	var idx := "_region_map[ pos.y * _region_map_size + pos.x ]"
	if not idx in code:
		return
	code = code.replace(idx, "_region_map[ clamp(pos.y * _region_map_size + pos.x, 0, _region_map_size * _region_map_size - 1) ]")
	# the generated code also carries the debug checker pattern, whose names clash on recompiling
	var re := RegEx.create_from_string("\\b__(p|ddx|ddy|w|i)\\b")
	code = re.sub(code, "__$1_t3d", true)
	var sh := Shader.new()
	sh.code = code
	m.shader_override = sh
	m.shader_override_enabled = true


func _assets() -> Terrain3DAssets:
	var a := Terrain3DAssets.new()
	var names: Array = meta.textures
	for i in names.size():
		var n: String = names[i]
		var t := Terrain3DTextureAsset.new()
		t.name = n
		t.albedo_texture = load("res://textures/ground/%s_albedo_h.webp" % n)
		t.normal_texture = load("res://textures/ground/%s_normal_r.webp" % n)
		t.uv_scale = 1.0 / TILE.get(n, 3.5)
		t.normal_depth = 0.9
		t.ao_strength = 0.6
		t.detiling_rotation = 0.35
		t.detiling_shift = 0.25
		a.set_texture(i, t)
	var clutter: Array = meta.clutter
	for i in clutter.size():
		var c: Dictionary = clutter[i]
		var m := Terrain3DMeshAsset.new()
		m.name = c.file.get_file().get_basename()
		m.scene_file = load(c.file)
		m.material_override = _scan_material(c.material, c.kind)
		m.cast_shadows = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if c.shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		m.visibility_range = c.range
		m.fade_margin = c.range * 0.15
		m.density = 0.1
		a.set_mesh_asset(i, m)
	return a


func _material() -> Terrain3DMaterial:
	var m := Terrain3DMaterial.new()
	m.auto_shader = false
	m.world_background = Terrain3DMaterial.NONE
	m.texture_filtering = Terrain3DMaterial.LINEAR
	m.set_shader_param("height_blending", true)
	m.set_shader_param("blend_sharpness", 0.82)
	m.set_shader_param("enable_macro_variation", true)
	m.set_shader_param("macro_variation1", Color(0.93, 0.95, 0.88))
	m.set_shader_param("macro_variation2", Color(0.97, 0.92, 0.86))
	m.set_shader_param("noise1_scale", 0.02)
	m.set_shader_param("noise2_scale", 0.05)
	return m


# one material per scan, shared by its variants: the scan's own albedo, normal and AO/roughness maps
func _scan_material(scan: String, kind: String) -> Material:
	if scan_materials.has(scan):
		return scan_materials[scan]
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/scan_plant.gdshader" if kind == "plant" else "res://shaders/scan.gdshader")
	m.set_shader_parameter("albedo_tex", load("res://flora_ph/tex/%s_albedo.webp" % scan))
	m.set_shader_parameter("normal_tex", load("res://flora_ph/tex/%s_normal.webp" % scan))
	m.set_shader_parameter("orm_tex", load("res://flora_ph/tex/%s_orm.webp" % scan))
	scan_materials[scan] = m
	return m


# the baked clutter: per instance x, y, z, yaw, scale, mesh, tint
func _clutter(dir: String) -> void:
	var rec := World.gunzip(dir + "clutter.bin.gz").to_float32_array()
	var n := rec.size() / 9
	var xforms := {}
	var colors := {}
	for i in n:
		var o := i * 9
		var id := int(rec[o + 5])
		if not xforms.has(id):
			xforms[id] = []
			colors[id] = PackedColorArray()
		var s := rec[o + 4]
		var b := Basis(Vector3.UP, rec[o + 3]).scaled(Vector3(s, s, s))
		xforms[id].append(Transform3D(b, Vector3(rec[o], rec[o + 1], rec[o + 2])))
		colors[id].append(Color(rec[o + 6], rec[o + 7], rec[o + 8]))
	for id in xforms:
		terrain.instancer.add_transforms(id, xforms[id], colors[id], false)
	terrain.instancer.update_mmis(true)
