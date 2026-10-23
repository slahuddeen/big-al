# ==================== GRASS AND GROUND COVER ====================
# Two layers make the ground read as thick with growth:
#  * a field of photographic grass tufts drawn entirely on the GPU (shaders/grass.gdshader): a
#    dense ring of clumps round the camera and a sparser one beyond it, both following the camera
#    in whole grid steps, each clump dropped onto the height map and told by the baked grass map
#    how thick, dry and tall to grow and whether to flower
#  * the browser game's ground cover (src/roam/groundcover.js): a sedge, tuft, flower, fern,
#    big fern, horsetail or reed every couple of metres within ~55 m, chosen per biome
extends Node3D

# (clumps across, metres between them, and where the field starts) for the near and far rings
const FIELDS := [[240, 0.3, 0.0], [190, 0.85, 34.0]]
# cover the photo grass and the Terrain3D clutter now draw better: sedges, tufts, flowers, small ferns, pebbles
const REPLACED := ["sedge", "tuft", "flowers", "fernLo", "rock"]
const CELL := 1.9
const R := 56.0

var fields: Array[MultiMeshInstance3D] = []
var cover := {}  # kind -> MultiMeshInstance3D
var at := Vector2(INF, INF)
var flora: Node3D


func setup(fl: Node3D) -> void:
	flora = fl
	# ---- the GPU field ----
	var spans := PackedFloat32Array()
	for c in JSON.parse_string(FileAccess.get_file_as_string("res://textures/grass_cards.json")):
		spans.append(c.span)
	var height_tex := ImageTexture.create_from_image(World.height_image)
	var water_tex := ImageTexture.create_from_image(World.water_image)
	var clump := _clump()
	for f in FIELDS:
		var grid: int = f[0]
		var spacing: float = f[1]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = clump
		mm.instance_count = grid * grid
		for j in grid:
			for i in grid:
				mm.set_instance_transform(j * grid + i, Transform3D(Basis(), Vector3((i - grid * 0.5) * spacing, 0, (j - grid * 0.5) * spacing)))
		var mat := ShaderMaterial.new()
		mat.shader = load("res://shaders/grass.gdshader")
		mat.set_shader_parameter("height_tex", height_tex)
		mat.set_shader_parameter("water_tex", water_tex)
		mat.set_shader_parameter("grass_map", load("res://data/world_%d/grass.png" % World.seed))
		mat.set_shader_parameter("cards", load("res://textures/grass_cards.png"))
		mat.set_shader_parameter("spans", spans)
		mat.set_shader_parameter("grid_size", Vector2(World.grid_w, World.grid_d))
		mat.set_shader_parameter("spacing", spacing)
		mat.set_shader_parameter("extent", grid * spacing * 0.5)
		mat.set_shader_parameter("inner", f[2])
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.material_override = mat
		# the near tufts throw shadows on each other; far off it would cost more than it shows
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if f[2] == 0.0 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.extra_cull_margin = 400.0
		add_child(mi)
		fields.append(mi)
	# ---- the browser's ground cover ----
	var cap := int(PI * R * R / (CELL * CELL))
	for kind in World.game.coverSize:
		if kind in REPLACED:
			continue
		var mesh: Mesh = flora.meshes.get("%s:0" % kind)
		if mesh == null:
			continue
		var c := MultiMesh.new()
		c.transform_format = MultiMesh.TRANSFORM_3D
		c.use_custom_data = true
		c.mesh = mesh
		c.instance_count = cap
		c.visible_instance_count = 0
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = c
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)
		cover[kind] = mi


# a clump of grass: two crossed cards one unit across and tall (the shader picks the tuft and its size)
func _clump() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in 2:
		var a := k * PI / 2.0 + 0.4
		var s := Vector3(cos(a), 0, sin(a)) * 0.5
		var lean := Vector3(-sin(a), 0, cos(a)) * 0.04
		var quad := [[-s, Vector2(0, 1), 0.0], [s, Vector2(1, 1), 0.0], [s + Vector3(0, 1, 0) + lean, Vector2(1, 0), 1.0], [-s + Vector3(0, 1, 0) + lean, Vector2(0, 0), 1.0]]
		for idx in [0, 1, 2, 0, 2, 3]:
			var q: Array = quad[idx]
			st.set_color(Color(1, 1, 1, q[2]))
			st.set_uv(q[1])
			st.set_normal(Vector3.UP)
			st.add_vertex(q[0])
	var m := st.commit()
	m.custom_aabb = AABB(Vector3(-200, -100, -200), Vector3(400, 300, 400))
	return m


const DRY := ["savanna", "scrubland", "sauropodgrounds", "hills", "plains"]


func update(focus: Vector3) -> void:
	# the fields follow the camera in whole grid steps, so the clumps don't swim
	for k in fields.size():
		var sp: float = FIELDS[k][1]
		fields[k].position = Vector3(floorf(focus.x / sp) * sp, 0, floorf(focus.z / sp) * sp)
	var p := Vector2(focus.x, focus.z)
	if p.distance_to(at) < 8.0:
		return
	at = p
	var counts := {}
	for k in cover:
		counts[k] = 0
	var i0 := int(floor((p.x - R) / CELL))
	var i1 := int(floor((p.x + R) / CELL))
	var j0 := int(floor((p.y - R) / CELL))
	var j1 := int(floor((p.y + R) / CELL))
	var rng := RandomNumberGenerator.new()
	var table: Dictionary = World.game.cover
	var sizes: Dictionary = World.game.coverSize
	for j in range(j0, j1 + 1):
		for i in range(i0, i1 + 1):
			rng.seed = hash(Vector2i(i, j))
			var x := (i + rng.randf()) * CELL
			var z := (j + rng.randf()) * CELL
			if Vector2(x, z).distance_squared_to(p) > R * R or not World.inside(x, z):
				continue
			var t := World.terrain_at(x, z)
			var d = table.get(t)
			if d == null or rng.randf() > d[0]:
				continue
			var total := 0.0
			for k in range(1, d.size()):
				total += d[k][1]
			var r := rng.randf() * total
			var kind: String = d[1][0]
			for k in range(1, d.size()):
				r -= d[k][1]
				if r <= 0.0:
					kind = d[k][0]
					break
			if not cover.has(kind):
				continue
			var g := World.height(x, z)
			var w := World.water_at(x, z)
			var wet := kind == "horsetails" or kind == "reeds"
			if World.has_water(w) and g < w - (0.8 if wet else -0.1):
				continue
			var mm: MultiMesh = cover[kind].multimesh
			var n: int = counts[kind]
			if n >= mm.instance_count:
				continue
			var sz: Array = sizes[kind]
			var h: float = sz[0] + (sz[1] - sz[0]) * rng.randf()
			var basis := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(h * (0.8 + rng.randf() * 0.5), h, h * (0.8 + rng.randf() * 0.5)))
			mm.set_instance_transform(n, Transform3D(basis, Vector3(x, g - 0.08, z)))
			var l := 0.85 + rng.randf() * 0.3
			var c := Color(l, l, l)
			if t in DRY:
				c *= Color(1.15, 1.04, 0.7)
			if "forest" in t or t == "jungle":
				c *= 0.8
			mm.set_instance_custom_data(n, Color(c.r, c.g, c.b, rng.randf()))
			counts[kind] = n + 1
	for k in cover:
		cover[k].multimesh.visible_instance_count = counts[k]
