# ==================== SPINO: KEM KEM ====================
# The Godot port of Spino: Roam. A sub-adult Spinosaurus in the Kem Kem river world at its
# real size: the world, the land and its plants, the water, the sky and its light, the
# wildlife and the player, wired together here as the browser's main.js wired them.
extends Node3D

const ACTION_KEYS := {KEY_SPACE: "dash", KEY_Q: "claw", KEY_F: "sniff", KEY_R: "display", KEY_C: "submerge"}

var terrain: Node3D
var water: Node3D
var flora: Node3D
var grass: Node3D
var sky: Node3D
var player: Node3D
var camera: Camera3D
var time := 0.0
var look := Vector2.ZERO
var wheel := 0.0
var queue: Array[String] = []
var started := false
var loading := true
var shot := {}  # --shot=x,z,dist,yaw,pitch,dayfraction: a still for screenshots


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="):
			var v := a.substr(7).split_floats(",")
			shot = {"x": v[0], "z": v[1], "h": v[2], "yaw": v[3], "pitch": v[4], "t": v[5]}
	World.load_world(1234)
	sky = preload("res://scripts/sky.gd").new()
	add_child(sky)
	terrain = preload("res://scripts/ground.gd").new()
	add_child(terrain)
	water = preload("res://scripts/water.gd").new()
	add_child(water)
	flora = preload("res://scripts/flora.gd").new()
	add_child(flora)
	grass = preload("res://scripts/grass.gd").new()
	add_child(grass)
	grass.setup(flora)
	player = preload("res://scripts/player.gd").new()
	add_child(player)
	player.flora = flora
	camera = Camera3D.new()
	camera.fov = 60.0
	camera.near = 0.3
	camera.far = 4000.0
	add_child(camera)
	camera.make_current()
	terrain.set_camera(camera)
	if shot:
		sky.time = shot.t * sky.DAY_LENGTH
		player.pos = Vector3(shot.x, 0, shot.z)
		player.pos.y = World.height(shot.x, shot.z)
		player.cam_dist = shot.h
		player.cam_yaw = deg_to_rad(shot.yaw)
		player.cam_pitch = deg_to_rad(shot.pitch)
		player.yaw = deg_to_rad(shot.yaw)
		while flora.update(shot.x, shot.z, 8):
			pass
		loading = false
		started = true


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		look += e.relative
	elif e is InputEventMouseButton and e.pressed:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			started = true
			return
		if e.button_index == MOUSE_BUTTON_LEFT:
			queue.append("bite")
		elif e.button_index == MOUSE_BUTTON_RIGHT:
			queue.append("claw")
		elif e.button_index == MOUSE_BUTTON_WHEEL_UP:
			wheel -= 120.0
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			wheel += 120.0
	elif e is InputEventKey and e.pressed and not e.echo:
		if ACTION_KEYS.has(e.physical_keycode):
			queue.append(ACTION_KEYS[e.physical_keycode])
		if e.physical_keycode == KEY_ESCAPE:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func keys() -> Dictionary:
	var k := func(c): return Input.is_physical_key_pressed(c)
	return {"w": k.call(KEY_W), "a": k.call(KEY_A), "s": k.call(KEY_S), "d": k.call(KEY_D), "e": k.call(KEY_E), "z": k.call(KEY_Z),
		"shift": k.call(KEY_SHIFT)}


func act(id: String) -> void:
	if id == "submerge":
		player.toggle_submerge()
		return
	player.use(id)


func _process(dt: float) -> void:
	dt = minf(dt, 0.05)
	time += dt
	if loading:
		loading = flora.update(player.pos.x, player.pos.z, 6)
	else:
		flora.update(player.pos.x, player.pos.z, 1)
	if started and not loading:
		player.step(dt, time, {} if shot else keys(), false)
		for id in queue:
			act(id)
		queue.clear()
		sky.update(0.0 if shot else dt * (12.0 if player.resting else 1.0))
	else:
		sky.update(0.0)
		look.x += dt * 25.0
	player.update_camera(camera, dt, look, wheel)
	look = Vector2.ZERO
	wheel = 0.0
	grass.update(camera.position)
	water.update(time, 1.0 - sky.night, sky.mist, sky.env.fog_light_color)
