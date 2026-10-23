# ==================== WATER ====================
# The sea as one sheet, each lake as a pool over its basin, the ponds as lobed fans reaching
# just under their banks, and every river as a ribbon that follows its channel down the
# terraces (so the steps become rapids), all in one mesh as the browser game built it.
# UV carries the flow: x the distance along a river (0 for still water, -1 for a pond),
# y the distance from the edge (0 at the shore, 1 in the middle). Two drifting sheets of mist
# lie over all of it.
extends Node3D

const RIPPLES := 16

var material: ShaderMaterial
var mist_mats: Array[ShaderMaterial] = []
var ripples := PackedVector4Array()
var rip_i := 0


func _ready() -> void:
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var idx := PackedInt32Array()
	var add := func(p: Vector3, uv: Vector2) -> int:
		verts.append(p)
		uvs.append(uv)
		return verts.size() - 1
	# the sea: a big sheet out to the horizon
	var S := 6000.0
	var sea := World.sea_level
	var a: int = add.call(Vector3(-S, sea, -S), Vector2(0, 1))
	var b: int = add.call(Vector3(World.width + S, sea, -S), Vector2(0, 1))
	var c: int = add.call(Vector3(World.width + S, sea, World.depth + S), Vector2(0, 1))
	var d: int = add.call(Vector3(-S, sea, World.depth + S), Vector2(0, 1))
	idx.append_array([a, b, c, a, c, d])
	# lakes: each lake cell's polygon, grown a little so its edge hides under the shore
	for lk in World.lakes:
		var centre: int = add.call(Vector3(lk.x, lk.y, lk.z), Vector2(0, 1))
		var ring := []
		for q in lk.poly:
			ring.append(add.call(Vector3(lk.x + (q[0] - lk.x) * 1.3, lk.y, lk.z + (q[1] - lk.z) * 1.3), Vector2(0, 0.25)))
		for i in ring.size():
			idx.append_array([centre, ring[i], ring[(i + 1) % ring.size()]])
	# ponds: a fan of rings, lobed like the basin
	for p in World.ponds:
		var K := 32
		var centre: int = add.call(Vector3(p.x, p.surface, p.z), Vector2(-1, 1))
		var rings := [[0.55, 0.6], [1.0, 0.05], [1.0, 0.0]]
		var first := verts.size()
		for ri in rings.size():
			for i in K:
				var ang := float(i) / K * TAU
				var r: float = World.pond_radius(p, ang) * rings[ri][0] + (1.2 if ri == 2 else 0.0)
				add.call(Vector3(p.x + cos(ang) * r, p.surface, p.z + sin(ang) * r), Vector2(-1, rings[ri][1]))
		for i in K:
			idx.append_array([centre, first + i, first + (i + 1) % K])
		for ri in rings.size() - 1:
			for i in K:
				var a0 := first + ri * K + i
				var b0 := first + ri * K + (i + 1) % K
				idx.append_array([a0, a0 + K, b0, b0, a0 + K, b0 + K])
	# rivers: ribbons down their channels
	for line in World.rivers:
		if line.size() < 2:
			continue
		var ACROSS := 4
		var s := 0.0
		var start := verts.size()
		for i in line.size():
			var pt: Array = line[i]
			var q: Array = line[mini(line.size() - 1, i + 1)]
			var o: Array = line[maxi(0, i - 1)]
			var dir := Vector2(q[0] - o[0], q[1] - o[1]).normalized()
			if i > 0:
				s += Vector2(pt[0] - line[i - 1][0], pt[1] - line[i - 1][1]).length()
			var half: float = pt[2] * 0.5 + 1.6
			for k in ACROSS + 1:
				var t := float(k) / ACROSS * 2.0 - 1.0
				add.call(Vector3(pt[0] - dir.y * half * t, pt[3], pt[1] + dir.x * half * t), Vector2(s + 1.0, 1.0 - absf(t)))
		var n := ACROSS + 1
		for i in line.size() - 1:
			for k in ACROSS:
				var a1: int = start + i * n + k
				idx.append_array([a1, a1 + n, a1 + 1, a1 + 1, a1 + n, a1 + n + 1])
	var normals := PackedVector3Array()
	normals.resize(verts.size())
	normals.fill(Vector3.UP)
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_NORMAL] = normals
	arr[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	material = ShaderMaterial.new()
	material.shader = load("res://shaders/water.gdshader")
	material.set_shader_parameter("normal_a", load("res://textures/water_n.png"))
	material.set_shader_parameter("normal_b", load("res://textures/water_n2.png"))
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.extra_cull_margin = 10000.0
	add_child(mi)
	for i in RIPPLES:
		ripples.append(Vector4(0, 0, -99, 0))
	# mist: two drifting sheets over the water
	for layer in 2:
		var mm := ShaderMaterial.new()
		mm.shader = load("res://shaders/mist.gdshader")
		mm.set_shader_parameter("layer", float(layer))
		var m2 := MeshInstance3D.new()
		m2.mesh = mesh
		m2.material_override = mm
		m2.position.y = [1.3, 3.6][layer]
		m2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		m2.extra_cull_margin = 10000.0
		add_child(m2)
		mist_mats.append(mm)


# a ring spreading out from (x, z); strength 0..2 sets its size
func ripple(x: float, z: float, time: float, strength: float = 1.0) -> void:
	rip_i = (rip_i + 1) % RIPPLES
	ripples[rip_i] = Vector4(x, z, time, strength)


func update(time: float, sun: float, mist: float, mist_col: Color) -> void:
	material.set_shader_parameter("time", time)
	material.set_shader_parameter("sun", sun)
	material.set_shader_parameter("ripples", ripples)
	for m in mist_mats:
		m.set_shader_parameter("time", time)
		m.set_shader_parameter("mist", mist)
		m.set_shader_parameter("mist_col", mist_col)
