# ==================== PLANTS ====================
# The browser game's forests and meadows, grown with the Blender flora (tools/blender/
# build_flora.py) and scattered with the same per-biome densities (src/roam/terrain.js):
# forests in layers (emergent giants over a closed canopy, a sub-canopy, an understory of tree
# ferns, cycads and thickets, ferns on the floor), and sedges, flowers, horsetails, reeds,
# lilies, termite mounds, bones, photo-scanned rocks and logs where they belong. Each 128 m chunk keeps one
# MultiMesh per plant, so Godot picks a mesh LOD per chunk; small plants are only drawn close.
# Past ~420 m a forest is drawn as a blanket of lumpy crowns at the canopy's height instead of
# its trees, so distant woods read as solid walls. Trunks and boulders are remembered for
# collisions.
extends Node3D

const CHUNK := 128.0
const VIEW := 900.0
const NEAR_KINDS := 200.0
const CANOPY_NEAR := 420.0
const VARIANTS := 3
const DRY := ["savanna", "scrubland", "plains", "desert", "badlands", "sauropodgrounds", "rocky", "hills"]
const LUSH := ["jungle", "denseforest", "galleryforest", "marsh"]

var protos: Dictionary
var density: Dictionary
var maxd := {}
var meshes := {}  # "kind:v" -> Mesh
var chunks := {}  # Vector2i -> {nodes, trunks, canopy}
var mats := {}
var canopy_mat: ShaderMaterial
var budget := 2


func _ready() -> void:
	protos = World.game.protos
	density = World.game.density
	for biome in density:
		for kind in density[biome]:
			maxd[kind] = maxf(maxd.get(kind, 0.0), density[biome][kind])
	_make_materials()
	for kind in protos:
		var nv: int = int(protos[kind].get("variants", VARIANTS)) if protos[kind].get("variants") else VARIANTS
		for v in nv:
			var path := "res://flora/%s_%d.glb" % [kind, v]
			if ResourceLoader.exists(path):
				meshes["%s:%d" % [kind, v]] = _mesh_from(path)
	# rocks are photo-scanned mossy boulders (Poly Haven, tools/blender/prep_polyhaven.py), brought
	# to the unit height the scatter scales by
	for v in VARIANTS:
		meshes["rock:%d" % v] = _scan_rock("res://flora_ph/rock_moss_set_01_%d.glb" % [0, 1, 3][v % 3])
	# the browser's low-detail ferns are the same plants further off: Godot's mesh LOD does that here
	for v in VARIANTS:
		if meshes.has("fern:%d" % v):
			meshes["fernLo:%d" % v] = meshes["fern:%d" % v]
		if meshes.has("bigFern:%d" % v):
			meshes["bigFernLo:%d" % v] = meshes["bigFern:%d" % v]


func _make_materials() -> void:
	var leaf := ShaderMaterial.new()
	leaf.shader = load("res://shaders/foliage.gdshader")
	leaf.set_shader_parameter("atlas", load("res://textures/foliage_atlas.png"))
	mats["leaf"] = leaf
	for b in ["bark_conifer", "bark_smooth", "bark_cycad", "bark_fern"]:
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/bark.gdshader")
		m.set_shader_parameter("albedo_tex", load("res://textures/%s.png" % b))
		m.set_shader_parameter("normal_tex", load("res://textures/%s_n.png" % b))
		mats[b] = m
	var rock := ShaderMaterial.new()
	rock.shader = load("res://shaders/scan.gdshader")
	for m in ["albedo", "normal", "orm"]:
		rock.set_shader_parameter(m + "_tex", load("res://flora_ph/tex/rock_moss_set_01_%s.webp" % m))
	rock.set_shader_parameter("tint_from_custom", true)
	mats["rock"] = rock
	var plain := ShaderMaterial.new()
	plain.shader = load("res://shaders/plain.gdshader")
	mats["plain"] = plain
	canopy_mat = ShaderMaterial.new()
	canopy_mat.shader = load("res://shaders/canopy.gdshader")
	canopy_mat.set_shader_parameter("atlas", load("res://textures/foliage_atlas.png"))


# the mesh in a plant's glb, its surfaces given the game's materials by name
func _mesh_from(path: String) -> Mesh:
	var scene: Node = load(path).instantiate()
	var found: MeshInstance3D = _find_mesh(scene)
	var mesh: Mesh = found.mesh.duplicate()
	for s in mesh.get_surface_count():
		var mat := mesh.surface_get_material(s)
		var name := mat.resource_name if mat else "plain"
		for key in mats:
			if name.begins_with(key):
				mesh.surface_set_material(s, mats[key])
				break
	scene.free()
	return mesh


func _scan_rock(path: String) -> Mesh:
	var scene: Node = load(path).instantiate()
	var src: Mesh = _find_mesh(scene).mesh
	var k := 1.0 / src.get_aabb().size.y
	var arrays := src.surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	for i in verts.size():
		verts[i] *= k
	arrays[Mesh.ARRAY_VERTEX] = verts
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, mats["rock"])
	scene.free()
	return mesh


func _find_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := _find_mesh(c)
		if r:
			return r
	return null


# a per-plant tint: a little drift in hue and lightness, yellower in dry country and deeper in
# the wet; flowers keep their colours (src/roam/terrain.js tint)
func _tint(kind: String, terrain: String, rng: RandomNumberGenerator) -> Color:
	if kind in ["rock", "bones", "termite", "log"]:
		var l := 0.9 + rng.randf() * 0.2
		return Color(l, l, l)
	if kind == "flowers":
		return Color(0.92 + rng.randf() * 0.16, 0.92 + rng.randf() * 0.16, 0.92 + rng.randf() * 0.16)
	var r := rng.randf()
	var c := Color(0.9 + r * 0.2, 0.92 + rng.randf() * 0.16, 0.85 + rng.randf() * 0.2)
	if terrain in DRY:
		c *= Color(1.12, 1.02, 0.72)
	if terrain in LUSH:
		c *= Color(0.88, 1.04, 0.92)
	if r > 0.93:
		c *= Color(1.25, 1.05, 0.6)
	elif r < 0.04:
		c *= Color(1.2, 0.85, 0.75)
	return c


func _scatter(cx: int, cz: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector3i(cx, cz, World.seed))
	var ha := CHUNK * CHUNK / 10000.0
	var out := {}  # "kind:v" -> Array of [Transform3D, Color, covered]
	var trunks := []
	var place := func(kind: String, x: float, z: float, y: float, h: float, rot: float, v: int, terrain: String) -> void:
		var proto: Dictionary = protos[kind]
		var w := h if kind in ["log", "lily", "bones"] else h * (0.85 + rng.randf() * 0.3) * float(proto.get("wide", 1.0) if proto.get("wide") else 1.0)
		var basis := Basis(Vector3.UP, rot).scaled(Vector3(w, h, w))
		var key := "%s:%d" % [kind, v]
		var cov: bool = float(World.game.canopy.get(terrain, 0)) > 0.0
		var tint := _tint(kind, terrain, rng)
		if cov and not proto.far:
			tint = tint * 0.78
		if not out.has(key):
			out[key] = []
		out[key].append([Transform3D(basis, Vector3(x, y, z)), tint, cov])
		if proto.get("trunk"):
			trunks.append(Vector3(x, z, maxf(0.5, proto.trunk * h * 1.3)))
		elif proto.get("solid"):
			trunks.append(Vector3(x, z, proto.solid * h))
	for kind in maxd:
		if not protos.has(kind):
			continue
		var mx: float = maxd[kind]
		var N := int(round(mx * ha))
		var proto: Dictionary = protos[kind]
		var nv := int(proto.get("variants", VARIANTS)) if proto.get("variants") else VARIANTS
		for i in N:
			var x := (cx + rng.randf()) * CHUNK
			var z := (cz + rng.randf()) * CHUNK
			var roll := rng.randf()
			var v := rng.randi() % nv
			var hr := rng.randf()
			var rot := rng.randf() * TAU
			if not World.inside(x, z):
				continue
			var terrain := World.terrain_at(x, z)
			var d: float = density.get(terrain, {}).get(kind, 0.0)
			if roll * mx >= d:
				continue
			var g := World.height(x, z)
			var w := World.water_at(x, z)
			var wet: bool = kind in ["horsetails", "mangrove", "reeds"]
			# nothing grows in open water; horsetails, reeds and mangroves stand in the shallows
			if World.has_water(w) and g < w - (1.2 if wet else -0.2):
				continue
			if World.river_edge(x, z) < (-1.0 if wet else 1.5):
				continue
			var h: float = proto.h[0] + (proto.h[1] - proto.h[0]) * hr
			var y := g - (h * 0.15 if kind == "rock" else 0.3 if kind == "termite" else 0.15)
			place.call(kind, x, z, y, h, rot, v, terrain)
	# round each pond centred in this chunk: lilies on the water, a ring of reeds and sedge
	for p in World.ponds:
		if int(floor(p.x / CHUNK)) != cx or int(floor(p.z / CHUNK)) != cz:
			continue
		var lilies := int(round(p.R * p.R * 0.035 * (1.6 if p.terrain in ["marsh", "mangrove"] else 1.0)))
		for i in lilies:
			var a := rng.randf() * TAU
			var rr: float = World.pond_radius(p, a) * (0.3 + rng.randf() * 0.55)
			place.call("lily", p.x + cos(a) * rr, p.z + sin(a) * rr, p.surface + 0.03, 3.0 + rng.randf() * 3.0, rng.randf() * TAU, rng.randi() % VARIANTS, p.terrain)
		var ring := int(round(p.R * 1.6))
		for i in ring:
			var a := rng.randf() * TAU
			var rr: float = World.pond_radius(p, a) * (0.92 + rng.randf() * 0.25)
			var x: float = p.x + cos(a) * rr
			var z: float = p.z + sin(a) * rr
			var kind := "reeds" if rng.randf() < 0.6 else ("sedge" if rng.randf() < 0.5 else "horsetails")
			var pr: Dictionary = protos[kind]
			place.call(kind, x, z, World.height(x, z) - 0.1, pr.h[0] + (pr.h[1] - pr.h[0]) * rng.randf(), rng.randf() * TAU, rng.randi() % VARIANTS, p.terrain)
	return {"items": out, "trunks": trunks}


func _build_chunk(cx: int, cz: int) -> Dictionary:
	var data := _scatter(cx, cz)
	var nodes := []
	var centre := Vector3((cx + 0.5) * CHUNK, 0, (cz + 0.5) * CHUNK)
	for key in data.items:
		if not meshes.has(key):
			continue
		var kind: String = key.split(":")[0]
		var proto: Dictionary = protos[kind]
		var items: Array = data.items[key]
		# trees under the forest canopy hand over to the blanket further off
		for pass_cov in [false, true]:
			var list := items.filter(func(it): return it[2] == pass_cov)
			if list.is_empty():
				continue
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.use_custom_data = true
			mm.mesh = meshes[key]
			mm.instance_count = list.size()
			for i in list.size():
				var t: Transform3D = list[i][0]
				mm.set_instance_transform(i, Transform3D(t.basis, t.origin - centre))
				var c: Color = list[i][1]
				mm.set_instance_custom_data(i, Color(c.r, c.g, c.b, randf()))
			var mmi := MultiMeshInstance3D.new()
			mmi.multimesh = mm
			mmi.position = centre
			var far: bool = proto.far
			var end := VIEW if far else NEAR_KINDS
			if proto.get("range"):
				end = minf(end, proto.range)
			if pass_cov and far:
				end = CANOPY_NEAR + 30.0
			mmi.visibility_range_end = end
			mmi.visibility_range_end_margin = 20.0
			mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
			var small := not far and kind not in ["cycad", "bigFern", "thicket"]
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if small else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			add_child(mmi)
			nodes.append(mmi)
	var canopy := _canopy(cx, cz)
	if canopy:
		add_child(canopy)
		nodes.append(canopy)
	return {"nodes": nodes, "trunks": data.trunks}


# the forest roof seen from afar: lumpy crowns at the canopy's height over every forest cell
func _canopy(cx: int, cz: int) -> MeshInstance3D:
	var step := 6.0
	var n := int(CHUNK / step) + 1
	var x0 := cx * CHUNK
	var z0 := cz * CHUNK
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	var on := PackedByteArray()
	verts.resize(n * n)
	cols.resize(n * n)
	on.resize(n * n)
	var any := false
	var greens: Dictionary = World.game.canopyGreens
	for j in n:
		for i in n:
			var x := x0 + i * step
			var z := z0 + j * step
			var t := World.terrain_at(x, z)
			var ch: float = float(World.game.canopy.get(t, 0))
			var g := World.height(x, z)
			var k := j * n + i
			if ch <= 0.0 or World.has_water(World.water_at(x, z)) or World.river_edge(x, z) < 6.0:
				# the forest's edge falls to the ground; the canopy shader darkens its flanks like the shade under trees
				verts[k] = Vector3(x, g - 1.0, z)
				cols[k] = Color(0.16, 0.2, 0.12)
				continue
			on[k] = 1
			any = true
			var cs := 11.0 if ch > 15.0 else 6.0
			var gx := x / cs
			var gz := z / cs
			var d1 := 9.0
			var d2 := 9.0
			var id := 0.0
			for b in range(-1, 2):
				for a in range(-1, 2):
					var xi: float = floorf(gx) + a
					var zi: float = floorf(gz) + b
					var px: float = xi + _h2(xi, zi)
					var pz: float = zi + _h2(zi + 17.3, xi - 3.1)
					var dd := Vector2(px - gx, pz - gz).length()
					if dd < d1:
						d2 = d1
						d1 = dd
						id = _h2(xi + 0.5, zi + 0.25)
					elif dd < d2:
						d2 = dd
			var dome := sqrt(maxf(0.0, 1.0 - pow(d1 / 0.8, 2.0)))
			var edge := minf(1.0, (d2 - d1) / 0.25)
			verts[k] = Vector3(x, g + ch * (0.82 + 0.08 * sin(x * 0.03) * cos(z * 0.027)) + dome * ch * 0.2 - (1.0 - edge) * ch * 0.06, z)
			var list: Array = greens.get(t, greens.forest)
			var c := Color(list[int(id * list.size()) % list.size()])
			cols[k] = c * (0.62 + 0.38 * edge * (0.7 + 0.3 * dome))
	if not any:
		return null
	var idx := PackedInt32Array()
	for j in n - 1:
		for i in n - 1:
			var a := j * n + i
			if not (on[a] or on[a + 1] or on[a + n] or on[a + n + 1]):
				continue
			idx.append_array([a, a + 1, a + n, a + 1, a + n + 1, a + n])
	if idx.is_empty():
		return null
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	arr[Mesh.ARRAY_INDEX] = idx
	var st := SurfaceTool.new()
	st.create_from_arrays(arr)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = canopy_mat
	mi.visibility_range_begin = CANOPY_NEAR - 10.0
	mi.visibility_range_begin_margin = 20.0
	mi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


func _h2(x: float, y: float) -> float:
	var s := sin(x * 127.1 + y * 311.7) * 43758.5453
	return s - floor(s)


# keep the chunks around (px, pz) grown; returns true while still loading
func update(px: float, pz: float, budget_now: int = 1) -> bool:
	var pcx := int(floor(px / CHUNK))
	var pcz := int(floor(pz / CHUNK))
	var R := int(ceil(VIEW / CHUNK))
	var want := []
	for dz in range(-R, R + 1):
		for dx in range(-R, R + 1):
			var cx := pcx + dx
			var cz := pcz + dz
			var d := Vector2((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz).length()
			if d > VIEW or cx < 0 or cz < 0 or cx * CHUNK > World.width or cz * CHUNK > World.depth:
				continue
			if not chunks.has(Vector2i(cx, cz)):
				want.append([d, cx, cz])
	want.sort()
	for w in want.slice(0, budget_now):
		chunks[Vector2i(w[1], w[2])] = _build_chunk(w[1], w[2])
	for key in chunks.keys():
		var d := Vector2((key.x + 0.5) * CHUNK - px, (key.y + 0.5) * CHUNK - pz).length()
		if d > VIEW + CHUNK * 1.5:
			for n in chunks[key].nodes:
				n.queue_free()
			chunks.erase(key)
	return want.size() > budget_now


# trunks and boulders near a point, for collisions: Vector3(x, z, radius)
func obstacles(x: float, z: float) -> Array:
	var out := []
	var cx := int(floor(x / CHUNK))
	var cz := int(floor(z / CHUNK))
	for dz in range(-1, 2):
		for dx in range(-1, 2):
			var c = chunks.get(Vector2i(cx + dx, cz + dz))
			if c:
				out.append_array(c.trunks)
	return out
