# ==================== PLANTS ====================
# The browser game's forests and meadows, scattered with its per-biome densities
# (src/roam/terrain.js): forests in layers (emergent giants over a closed canopy, a sub-canopy, an
# understory of tree ferns, cycads and thickets, ferns on the floor), and horsetails, reeds,
# lilies, termite mounds, bones, rocks and logs where they belong.
# The trees and big plants are tools/blender/build_trees.py's: Modular Tree skeletons with
# photo-scanned bark, dressed in twig, branchlet and frond cards composed from leaf scans. Each
# comes three ways: the full model close by (~60 m), a reduced one (thinner trunk, fewer and bigger
# cards) out to ~420 m, casting shadows to ~220 m, and beyond that an impostor, one card showing the nearest of eight views baked
# round the tree, out to the edge of the world. The scatter runs per 128 m chunk; the models are
# drawn per 64 m cell, one MultiMesh per plant and level of detail, and one MultiMesh of
# impostors per cell for every species at once (they share a texture array). Trunks and
# boulders are remembered for collisions.
extends Node3D

const CHUNK := 128.0
const CELL := 64.0
const NEAR := 560.0  # chunks this close have their full and reduced models
const FAR := 3000.0  # chunks this close draw their trees as impostors
const LOD0_END := 60.0
const LOD1_END := 420.0
const LOD1_SHADOWS := 220.0  # the reduced trees cast shadows this far; beyond, the shadow maps would cost more than they show
const SMALL_LOD0 := 50.0
const NEAR_KINDS := 200.0
const VARIANTS := 3
const DRY := ["savanna", "scrubland", "plains", "desert", "badlands", "sauropodgrounds", "rocky", "hills"]
const LUSH := ["jungle", "denseforest", "galleryforest", "marsh"]

var protos: Dictionary
var density: Dictionary
var maxd := {}
var meshes := {}  # "kind:v" -> Mesh (full detail)
var lod1 := {}  # "kind:v" -> Mesh (reduced)
var impostors := {}  # "kind:v" -> {layer, size}
var imp_mesh: ArrayMesh
var imp_mat: ShaderMaterial
var chunks := {}  # Vector2i -> {items, trunks, far: [nodes], near: [nodes]}
var mats := {}
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
			var path1 := "res://flora/%s_%d_lod1.glb" % [kind, v]
			if ResourceLoader.exists(path1):
				lod1["%s:%d" % [kind, v]] = _mesh_from(path1)
	# rocks are photo-scanned mossy boulders (Poly Haven, tools/blender/prep_polyhaven.py), brought
	# to the unit height the scatter scales by
	for v in VARIANTS:
		meshes["rock:%d" % v] = _scan_rock("res://flora_ph/rock_moss_set_01_%d.glb" % [0, 1, 3][v % 3])
	# the browser's low-detail ferns are the same plants further off
	for v in VARIANTS:
		for k in ["fern", "bigFern"]:
			if meshes.has("%s:%d" % [k, v]):
				meshes["%sLo:%d" % [k, v]] = lod1.get("%s:%d" % [k, v], meshes["%s:%d" % [k, v]])
	_load_impostors()


# every tree's eight baked views, one layer each of a texture array
func _load_impostors() -> void:
	var path := "res://flora/imp/impostors.json"
	if not FileAccess.file_exists(path):
		return
	var info: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(path))
	var names := info.keys()
	names.sort()
	var albedo: Array[Image] = []
	var normal: Array[Image] = []
	for n in names:
		var a: Texture2D = load("res://flora/imp/%s_albedo.webp" % n)
		var nm: Texture2D = load("res://flora/imp/%s_normal.webp" % n)
		if a == null or nm == null:
			continue
		var parts: PackedStringArray = n.rsplit("_", true, 1)
		impostors["%s:%s" % [parts[0], parts[1]]] = {"layer": albedo.size(), "size": float(info[n].size)}
		albedo.append(a.get_image())
		normal.append(nm.get_image())
	if albedo.is_empty():
		return
	var ta := Texture2DArray.new()
	ta.create_from_images(albedo)
	var tn := Texture2DArray.new()
	tn.create_from_images(normal)
	imp_mat = ShaderMaterial.new()
	imp_mat.shader = load("res://shaders/impostor.gdshader")
	imp_mat.set_shader_parameter("albedo_tex", ta)
	imp_mat.set_shader_parameter("normal_tex", tn)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for c in [[-0.5, 0.0, 0.0, 1.0], [0.5, 0.0, 1.0, 1.0], [0.5, 1.0, 1.0, 0.0], [-0.5, 0.0, 0.0, 1.0], [0.5, 1.0, 1.0, 0.0], [-0.5, 1.0, 0.0, 0.0]]:
		st.set_uv(Vector2(c[2], c[3]))
		st.set_normal(Vector3(0, 0, 1))
		st.add_vertex(Vector3(c[0], c[1], 0))
	imp_mesh = st.commit()
	imp_mesh.custom_aabb = AABB(Vector3(-0.8, 0, -0.8), Vector3(1.6, 1.0, 1.6))


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


# the photo-scanned materials build_trees.py names its surfaces after: "bark:<scan>", "leaf:<card>", "stem:<texture>"
func _scanned_material(name: String) -> Material:
	if mats.has(name):
		return mats[name]
	var parts := name.split(":")
	var m := ShaderMaterial.new()
	if parts[0] == "leaf":
		m.shader = load("res://shaders/foliage_pbr.gdshader")
		m.set_shader_parameter("albedo_tex", load("res://flora/tex/%s_albedo.webp" % parts[1]))
		m.set_shader_parameter("normal_tex", load("res://flora/tex/%s_normal.webp" % parts[1]))
	else:
		var base := "res://flora/tex/bark_%s" % parts[1] if parts[0] == "bark" else "res://flora/tex/%s" % parts[1]
		m.shader = load("res://shaders/bark_pbr.gdshader")
		m.set_shader_parameter("albedo_tex", load(base + "_albedo.webp"))
		m.set_shader_parameter("normal_tex", load(base + "_normal.webp"))
		if ResourceLoader.exists(base + "_orm.webp"):
			m.set_shader_parameter("orm_tex", load(base + "_orm.webp"))
	mats[name] = m
	return m


# the mesh in a plant's glb, its surfaces given the game's materials by name
func _mesh_from(path: String) -> Mesh:
	var scene: Node = load(path).instantiate()
	var found: MeshInstance3D = _find_mesh(scene)
	var mesh: Mesh = found.mesh.duplicate()
	for s in mesh.get_surface_count():
		var mat := mesh.surface_get_material(s)
		var name := mat.resource_name if mat else "plain"
		if name.contains(":"):
			mesh.surface_set_material(s, _scanned_material(name.split(".")[0]))
			continue
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


func _centre(c: Vector2i) -> Vector3:
	return Vector3((c.x + 0.5) * CELL, 0, (c.y + 0.5) * CELL)


# the chunk's plants sorted into its four cells: cell -> "kind:v" -> [[Transform3D, Color, covered]]
func _cells(items: Dictionary) -> Dictionary:
	var out := {}
	for key in items:
		for it in items[key]:
			var t: Transform3D = it[0]
			var c := Vector2i(int(floor(t.origin.x / CELL)), int(floor(t.origin.z / CELL)))
			if not out.has(c):
				out[c] = {}
			if not out[c].has(key):
				out[c][key] = []
			out[c][key].append(it)
	return out


func _multimesh(mesh: Mesh, list: Array, centre: Vector3, custom: Callable) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = mesh
	mm.instance_count = list.size()
	for i in list.size():
		var t: Transform3D = list[i][0]
		mm.set_instance_transform(i, Transform3D(t.basis, t.origin - centre))
		mm.set_instance_custom_data(i, custom.call(list[i]))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.position = centre
	return mmi


func _ranged(mmi: GeometryInstance3D, begin: float, end: float, shadows: bool) -> GeometryInstance3D:
	mmi.visibility_range_begin = begin
	mmi.visibility_range_begin_margin = 12.0 if begin > 0.0 else 0.0
	mmi.visibility_range_end = end
	mmi.visibility_range_end_margin = 12.0
	mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mmi)
	return mmi


# far off: every tree in a cell on one MultiMesh of impostor cards
func _build_far(data: Dictionary) -> Array:
	var nodes := []
	if imp_mat == null:
		return nodes
	for cell in data.cells:
		var list := []
		for key in data.cells[cell]:
			if not impostors.has(key):
				continue
			var im: Dictionary = impostors[key]
			for it in data.cells[cell][key]:
				var t: Transform3D = it[0]
				var c: Color = it[1]
				list.append([Transform3D(t.basis.scaled(Vector3.ONE * im.size), t.origin), Color(im.layer, c.r, c.g, c.b)])
		if list.is_empty():
			continue
		var mmi := _multimesh(imp_mesh, list, _centre(cell), func(it): return it[1])
		mmi.material_override = imp_mat
		nodes.append(_ranged(mmi, LOD1_END, FAR, false))
	return nodes


# close by: per cell, the full models near the camera and the reduced ones further off
func _build_near(data: Dictionary) -> Array:
	var nodes := []
	for cell in data.cells:
		var centre := _centre(cell)
		for key in data.cells[cell]:
			if not meshes.has(key):
				continue
			var kind: String = key.split(":")[0]
			var proto: Dictionary = protos[kind]
			var list: Array = data.cells[cell][key]
			var tint := func(it): return Color(it[1].r, it[1].g, it[1].b, randf())
			var tree: bool = impostors.has(key)
			var reach: float = LOD1_END if tree else (FAR if proto.far else NEAR_KINDS)
			if proto.get("range"):
				reach = minf(reach, proto.range)
			var small: bool = not proto.far and kind not in ["cycad", "bigFern", "thicket", "fernClump"]
			if lod1.has(key):
				var split := LOD0_END if tree else SMALL_LOD0
				nodes.append(_ranged(_multimesh(meshes[key], list, centre, tint), 0.0, split, not small))
				if tree:
					nodes.append(_ranged(_multimesh(lod1[key], list, centre, tint), split, LOD1_SHADOWS, true))
					nodes.append(_ranged(_multimesh(lod1[key], list, centre, tint), LOD1_SHADOWS, reach, false))
				else:
					nodes.append(_ranged(_multimesh(lod1[key], list, centre, tint), split, reach, false))
			else:
				nodes.append(_ranged(_multimesh(meshes[key], list, centre, tint), 0.0, reach, not small))
	return nodes


func _chunk_distance(key: Vector2i, px: float, pz: float) -> float:
	return Vector2((key.x + 0.5) * CHUNK - px, (key.y + 0.5) * CHUNK - pz).length()


# keep the chunks around (px, pz) grown: impostors out to the horizon, models close by; returns
# true while still loading
func update(px: float, pz: float, budget_now: int = 1) -> bool:
	var R := int(ceil(FAR / CHUNK))
	var pcx := int(floor(px / CHUNK))
	var pcz := int(floor(pz / CHUNK))
	var want := []
	for dz in range(-R, R + 1):
		for dx in range(-R, R + 1):
			var key := Vector2i(pcx + dx, pcz + dz)
			if key.x < 0 or key.y < 0 or key.x * CHUNK > World.width or key.y * CHUNK > World.depth:
				continue
			var d := _chunk_distance(key, px, pz)
			if d > FAR:
				continue
			var c = chunks.get(key)
			if c == null:
				want.append([d, key])
			elif d < NEAR and c.near.is_empty() and not c.near_built:
				want.append([d, key])
	want.sort()
	for w in want.slice(0, budget_now):
		var key: Vector2i = w[1]
		if not chunks.has(key):
			var data := _scatter(key.x, key.y)
			data.cells = _cells(data.items)
			data.erase("items")
			data.far = _build_far(data)
			data.near = []
			data.near_built = false
			chunks[key] = data
		if w[0] < NEAR:
			chunks[key].near = _build_near(chunks[key])
			chunks[key].near_built = true
	# let go of the models of chunks we have left behind, and of whole chunks past the horizon
	for key in chunks.keys():
		var d := _chunk_distance(key, px, pz)
		var c: Dictionary = chunks[key]
		if d > NEAR + CHUNK * 1.5 and c.near_built:
			for n in c.near:
				n.queue_free()
			c.near = []
			c.near_built = false
		if d > FAR + CHUNK * 1.5:
			for n in c.far:
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
