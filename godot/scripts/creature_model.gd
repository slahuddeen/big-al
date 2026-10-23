# ==================== AN ANIMAL'S BODY ====================
# Loads one of the Blender-built animals (godot/creatures/<species>.glb with its .rig.json),
# gives it its materials (the baked skin, wet keratin teeth and claws, eyes with an iris), and
# animates it procedurally the way the browser game did (src/three/animation.js): a gait for
# its body plan (biped, quadruped, sprawler, flier, swimmer, snake), driven by its speed, with
# bites, roars, grazing, drinking, sniffing, stalking and resting blended on top. Rotations are
# given in the animal's own axes (x forward, y up, z to the side), as the browser's were, and
# turned into each bone's frame here, so the same motions drive every skeleton.
class_name CreatureModel
extends Node3D

var skel: Skeleton3D
var rig: Dictionary
var gait := "biped"
var bones := {}  # name -> index
var rest_basis := {}  # index -> global rest basis (skeleton space)
var parent_basis := {}  # index -> parent's global rest basis
var rest_local := {}  # index -> Transform3D
var mat_skin: ShaderMaterial
var seed := 0.0
var v2 := false
var legs: Array = []
var arms: Array = []
var tail: Array = []
var neck: Array = []
var wings: Array = []
var flap_speed := 6.0
var swim_speed := 9.0
var height := 0.4

static var _cache := {}


static func load_species(file: String) -> CreatureModel:
	var m := CreatureModel.new()
	m.setup(file)
	return m


func setup(file: String) -> void:
	var scene: PackedScene = load("res://creatures/%s.glb" % file)
	var inst := scene.instantiate()
	add_child(inst)
	rig = JSON.parse_string(FileAccess.get_file_as_string("res://creatures/%s.rig.json" % file))
	v2 = rig.get("version", 1) == 2
	gait = rig.gait
	if rig.get("flapSpeed"):
		flap_speed = rig.flapSpeed
	if rig.get("swimSpeed"):
		swim_speed = rig.swimSpeed
	skel = _find(inst, "Skeleton3D")
	for i in skel.get_bone_count():
		bones[skel.get_bone_name(i)] = i
	for i in skel.get_bone_count():
		var g := skel.get_bone_global_rest(i)
		rest_basis[i] = g.basis.orthonormalized()
		var p := skel.get_bone_parent(i)
		parent_basis[i] = skel.get_bone_global_rest(p).basis.orthonormalized() if p >= 0 else Basis()
		rest_local[i] = skel.get_bone_rest(i)
	if v2:
		var R: Dictionary = rig.roles
		legs = R.legs
		arms = R.arms
		tail = R.tail
		neck = R.neck
	else:
		legs = rig.legs
		arms = rig.arms
		wings = rig.wings
		for b in rig.bones:
			if b.name.begins_with("tail"):
				tail.append(b.name)
			elif b.name.begins_with("neck") or b.name.begins_with("seg"):
				neck.append(b.name)
	_materials(inst, file)
	var aabb := _aabb(inst)
	height = aabb.end.y


func _find(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := _find(c, cls)
		if r:
			return r
	return null


func _aabb(n: Node) -> AABB:
	var box := AABB()
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		box = box.merge(mi.get_aabb())
	return box


func _materials(inst: Node, file: String) -> void:
	for mi: MeshInstance3D in inst.find_children("*", "MeshInstance3D", true, false):
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		var mesh := mi.mesh
		for s in mesh.get_surface_count():
			var m := mesh.surface_get_material(s)
			var name := m.resource_name if m else "skin"
			if name.begins_with("keratin"):
				var k := ShaderMaterial.new()
				k.shader = load("res://shaders/keratin.gdshader")
				mi.set_surface_override_material(s, k)
			elif name.begins_with("eye"):
				var e := ShaderMaterial.new()
				e.shader = load("res://shaders/eye.gdshader")
				if ResourceLoader.exists("res://creatures/%s_eye.png" % file):
					e.set_shader_parameter("iris_tex", load("res://creatures/%s_eye.png" % file))
				mi.set_surface_override_material(s, e)
			else:
				if mat_skin == null:
					mat_skin = ShaderMaterial.new()
					if v2:
						mat_skin.shader = load("res://shaders/creature.gdshader")
						mat_skin.set_shader_parameter("albedo_tex", load("res://creatures/%s_albedo.jpg" % file))
						mat_skin.set_shader_parameter("normal_tex", load("res://creatures/%s_normal.webp" % file))
						mat_skin.set_shader_parameter("orm_tex", load("res://creatures/%s_orm.jpg" % file))
						mat_skin.set_shader_parameter("detail_n", load("res://textures/skin_scales_n.png"))
					else:
						mat_skin.shader = load("res://shaders/creature_vc.gdshader")
						mat_skin.set_shader_parameter("detail_n", load("res://textures/skin_scales_n.png"))
						mat_skin.set_shader_parameter("mottle", load("res://textures/skin_mottle.png"))
				mi.set_surface_override_material(s, mat_skin)


func set_flash(hurt: float, flush: float = 0.0) -> void:
	if mat_skin:
		mat_skin.set_shader_parameter("flash", Color(hurt * 1.2 + flush * 0.5, flush * 0.05, 0.0))


func set_wet(w: float) -> void:
	if mat_skin:
		mat_skin.set_shader_parameter("wet", w)


# rotate a bone by angles in the animal's own axes: x roll, y yaw, z pitch (nose up)
func rot(name: String, x: float = 0.0, y: float = 0.0, z: float = 0.0) -> void:
	var i = bones.get(name)
	if i == null:
		return
	var G: Basis = rest_basis[i]
	var q := Basis.from_euler(Vector3(x, y, z), EULER_ORDER_XYZ)
	var local: Transform3D = rest_local[i]
	var delta := G.inverse() * q * G
	skel.set_bone_pose_rotation(i, (local.basis * delta).get_rotation_quaternion())


# move a bone by an offset in the animal's own axes (body bobbing, lunging)
func shift(name: String, off: Vector3) -> void:
	var i = bones.get(name)
	if i == null:
		return
	var local: Transform3D = rest_local[i]
	var P: Basis = parent_basis[i]
	skel.set_bone_pose_position(i, local.origin + P.inverse() * off)


func _chain(names: Array, x: float, y: float, z: float, weights: Array = []) -> void:
	var n := names.size()
	for k in n:
		var w: float = weights[k] if k < weights.size() else 1.0 / n
		rot(names[k], x * w, y * w, z * w)


# m: phase, moving (0..1), attack, jaw, rear, look, graze, browse, call, crouch, rest, sniff
func animate(time: float, m: Dictionary) -> void:
	var mv: float = m.get("moving", 0.0)
	var ph: float = m.get("phase", 0.0)
	var atk: float = m.get("attack", 0.0)
	var jaw: float = m.get("jaw", 0.0)
	var rear: float = m.get("rear", 0.0)
	var look: float = m.get("look", 0.0)
	var graze: float = m.get("graze", 0.0)
	var browse: float = m.get("browse", 0.0)
	var call: float = m.get("call", 0.0)
	var crouch: float = m.get("crouch", 0.0)
	var rk: float = m.get("rest", 0.0)
	var sniff: float = m.get("sniff", 0.0)
	var breathe := sin(time * 2.2 + seed) * 0.006
	var nt := maxf(1, tail.size())
	var nn := maxf(1, neck.size())
	match gait:
		"biped":
			var sniff_bob := sin(time * 15.0 + seed) * 0.06 * sniff
			var stride := sin(ph * 2.0) * 0.05 * mv
			for l in legs:
				var s: float = sin(ph + l.phase)
				var swing := s * 0.55 * mv * (1.0 - rk) + rear * 0.25 + rk * 1.1 + crouch * 0.12
				if v2:
					# hip swing, knee flex as the foot comes forward, ankle keeping the foot flat
					var lift := maxf(0.0, cos(ph + l.phase)) * mv * (1.0 - rk)
					rot(l.thigh, 0, 0, swing)
					rot(l.shin, 0, 0, -lift * 0.8 - rk * 1.6 - crouch * 0.3)
					rot(l.foot, 0, 0, -swing * 0.6 + lift * 0.5 + rk * 0.9 + crouch * 0.2)
					rot(l.toe, 0, 0, -maxf(0.0, -s) * 0.4 * mv + rk * 0.3)
				else:
					rot(l.node, 0, 0, swing)
			for i in arms.size():
				var a: Dictionary = arms[i]
				var sw := sin(ph + i * PI) * 0.25 * mv - atk * 0.6 - call * 0.3 + rk * 0.4
				if v2:
					rot(a.upper, 0, 0, sw)
					rot(a.fore, 0, 0, -atk * 0.5 + rk * 0.3)
					rot(a.hand, 0, 0, -atk * 0.3)
				else:
					rot(a.node, 0, 0, sw)
			var bodyb := "body"
			shift(bodyb, Vector3(atk * 0.12, absf(sin(ph)) * 0.02 * mv + breathe * (1.0 + rk) - rk * 0.2 - crouch * 0.05, 0))
			rot(bodyb, 0, 0, -atk * 0.18 + rear * 0.35 - graze * 0.12 - crouch * 0.1 + call * 0.12)
			for i in tail.size():
				var w := 2.0 / nt
				rot(tail[i], 0, (sin(time * 1.4 + i * 0.9 * 2.0 / nt + seed) * (0.1 + 0.12 * mv) * (1.0 - rk * 0.7) + rk * 0.4) * w, (-rear * 0.2 + crouch * 0.08 - rk * 0.12) * w)
			for i in neck.size():
				rot(neck[i], 0, (look * 0.4 + sin(time * 0.5 + seed) * 0.08) / nn, (-mv * 0.18 + atk * 0.1 + rear * 0.1 - graze * 0.9 - crouch * 0.35 + call * 0.55 - rk * 0.55 - sniff * 0.35 + stride) / nn)
			rot("head", 0, look * 0.2, sin(time * 0.9 + seed) * 0.04 * (1.0 - rk) + rear * 0.25 - graze * 0.3 + call * 0.25 - rk * 0.2 + sniff_bob - stride * 1.4)
			rot("jaw", 0, 0, -maxf(jaw, call) * 0.75 - maxf(0.0, sin(time * 0.7 + seed) - 0.92) * 2.0 * (1.0 - rk) - graze * maxf(0.0, sin(time * 6.0 + seed)) * 0.25)
		"quad":
			for l in legs:
				var swing: float = sin(ph + l.phase) * 0.35 * mv * (1.0 - rk)
				if v2:
					var lift := maxf(0.0, cos(ph + l.phase)) * mv
					rot(l.thigh, 0, 0, swing)
					rot(l.shin, 0, 0, (lift * 0.5 if not l.front else -lift * 0.4))
					rot(l.foot, 0, 0, -swing * 0.5)
				else:
					rot(l.node, 0, 0, swing)
			shift("body", Vector3(atk * 0.08, absf(sin(ph * 2.0)) * 0.008 * mv + breathe - rk * 0.1, 0))
			rot("body", 0, 0, rear * 0.15 - atk * 0.05 - graze * 0.03)
			for i in tail.size():
				rot(tail[i], 0, (sin(time * 0.9 + i * 0.7 + seed) * (0.08 + 0.06 * mv) + (atk + rear * 0.8) * sin(time * 7.0 + i) * 0.35 * (i + 1) * 0.3) * 3.0 / nt, 0)
			for i in neck.size():
				rot(neck[i], 0, (look * 0.15 + sin(time * 0.45 + i * 0.6 + seed) * 0.08 * (1.0 + browse)) * 3.0 / nn,
					(sin(time * 0.6 + seed + i) * 0.03 + rear * 0.15 - graze * (0.5 if i == 0 else 0.18) + browse * (0.3 if i == 0 else 0.1) + call * (0.2 if i == 0 else 0.06) - rk * 0.12) * 3.0 / nn)
			rot("head", 0, look * 0.2, sin(time * 1.1 + seed) * 0.05 - graze * 0.25 + maxf(0.0, sin(time * 5.0 + seed)) * 0.08 * (graze + browse) + call * 0.2)
			rot("jaw", 0, 0, -maxf(jaw, call) * 0.6)
		"sprawl":
			for l in legs:
				if v2:
					rot(l.thigh, 0, sin(ph + l.phase) * 0.55 * mv, 0)
				else:
					rot(l.node, 0, sin(ph + l.phase) * 0.55 * mv, 0)
			var wave := sin(ph) * 0.18 * mv
			rot("body", 0, wave * 0.5, rear * 0.2)
			shift("body", Vector3(atk * 0.1, breathe * 0.5, 0))
			for i in tail.size():
				rot(tail[i], 0, (-sin(ph - i * 0.9) * 0.25 * (0.3 + mv) + sin(time + i + seed) * 0.08) * 3.0 / nt, 0)
			for n in neck:
				rot(n, 0, -wave + look * 0.3, rear * 0.2 + call * 0.3 - graze * 0.15)
			rot("jaw", 0, 0, -maxf(jaw, call) * 0.6)
		"fly":
			var flap := sin(time * flap_speed + seed)
			for w in wings:
				rot(w.node, -w.side * (flap * 0.55 + 0.1), 0, 0)
			shift("body", Vector3(0, -flap * 0.02, 0))
			rot("body", sin(time * 0.8 + seed) * 0.08 * m.get("bank", 1.0), 0, atk * -0.4)
			for l in legs:
				rot(l.node if not v2 else l.thigh, 0, 0, -0.8)
			for t in tail:
				rot(t, 0, sin(time * 2.0 + seed) * 0.15, 0)
			if neck.size():
				rot(neck[0], 0, look * 0.3, -0.3 + atk * 0.2)
		"perched":
			var twitch := maxf(0.0, sin(time * 1.3 + seed) - 0.85) * 3.0
			for i in wings.size():
				rot(wings[i].node, wings[i].side * (0.5 + (twitch * 0.4 if i else 0.0)), 0, -0.2)
			if neck.size():
				rot(neck[0], 0, sin(time * 0.6) * 0.3, -0.4 + sin(time * 0.8) * 0.15)
			shift("body", Vector3(0, -0.06 + breathe, 0))
		"slither":
			for i in neck.size():
				rot(neck[i], 0, sin(ph - i * 0.9) * (0.25 if i == 0 else 0.45), -rear * 0.6 if i == 0 else 0.0)
		"swim":
			var sp := swim_speed
			for i in tail.size():
				rot(tail[i], 0, sin(time * sp + seed - i * 0.6) * 0.5 * (1.6 / nt) * (0.6 + 0.4 * (i + 1) / nt), 0)
			rot("body", 0, -sin(time * sp + seed) * 0.08, 0)
			rot("jaw", 0, 0, -maxf(jaw, call) * 0.5)
			for l in legs:
				rot(l.node if not v2 else l.thigh, l.side * sin(time * sp + seed + l.phase) * 0.45, 0, 0)
		_:
			shift("body", Vector3(0, breathe, 0))
