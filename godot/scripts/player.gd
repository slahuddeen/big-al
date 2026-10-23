# ==================== SPINO, UP CLOSE ====================
# A sub-adult Spinosaurus, about 9.5 m long, driven like a third-person game: WASD moves
# relative to the camera, the mouse looks around, Shift sprints, the left button bites. In
# water deeper than its legs it swims, faster and lower in the water than on land. It carries
# the Spino game's abilities: submerging to hide and ambush, sniffing out prey, a lunging dash,
# the sail display, the bleeding rake of the thumb claw, and it has to drink and rest as well
# as eat (a port of src/roam/player.js).
extends Node3D

signal event(name: String)

const WALK := 5.5
const SPRINT := 11.0
const SWIM := 8.0
const SWIM_SPRINT := 13.0
const DASH := 24.0
const DASH_SWIM := 21.0
const DEEP := 2.6

var abilities: Array
var model: CreatureModel
var len := 9.5
var weight := 2500.0
var pos := Vector3.ZERO
var yaw := 0.0
var speed := 0.0
var phase := 0.0
var health := 100.0
var hunger := 80.0
var thirst := 75.0
var stamina := 100.0
var breath := 100.0
var bite_t := 0.0
var hurt_t := 0.0
var dead := false
var swimming := false
var submerged := false
var dash_t := 0.0
var display_t := 0.0
var sniff_t := 0.0
var claw_t := 0.0
var drinking := false
var resting := false
var can_drink := false
var in_water := false
var water_y := World.NO_WATER
var rest_k := 0.0
var lap_t := 0.0
var ripple_t := 0.0
var rest_warned := false
var last_hurt_by := ""
var cd := {}
var reach := 0.0
var fx = null  # {water, ambient, sound}
var flora = null
# camera rig
var cam_yaw := PI * 0.5
var cam_pitch := 0.28
var cam_dist := 22.0
var cam_pos := Vector3.ZERO
var cam_at := Vector3.ZERO


func _ready() -> void:
	abilities = World.game.abilities
	model = CreatureModel.load_species("Player")
	model.seed = 7.0
	model.scale = Vector3.ONE * len
	add_child(model)
	pos = Vector3(World.spawn.x, 0, World.spawn.y)
	pos.y = World.height(pos.x, pos.z)
	reach = len * 0.42


func head_pos() -> Vector3:
	return Vector3(pos.x + cos(yaw) * len * 0.42, pos.y + len * 0.22, pos.z - sin(yaw) * len * 0.42)


func cooldown(id: String) -> float:
	return maxf(0.0, cd.get(id, 0.0))


func ability(id: String) -> Dictionary:
	for a in abilities:
		if a.id == id:
			return a
	return {}


# start an ability if it is ready; returns true if it began
func use(id: String) -> bool:
	if dead or resting:
		return false
	var a := ability(id)
	if cooldown(id) > 0.0 or (a.has("stamina") and stamina < a.stamina):
		return false
	if a.has("cd"):
		cd[id] = a.cd
	if a.has("stamina"):
		stamina -= a.stamina
	match id:
		"bite":
			bite_t = 0.35
		"claw":
			claw_t = 0.45
		"dash":
			dash_t = 0.5
			speed = DASH_SWIM if swimming else DASH
		"sniff":
			sniff_t = 9.0
		"display":
			display_t = 1.8
	return true


func toggle_submerge() -> String:
	if submerged:
		submerged = false
		return "surface"
	if not swimming or breath < 15.0:
		return "shallow"
	submerged = true
	return "down"


func eat(amount: float) -> void:
	hunger = minf(100.0, hunger + amount)
	health = minf(100.0, health + amount * 0.25)


func hurt(dmg: float, by: String) -> void:
	if dead or dash_t > 0.0:
		return
	health -= dmg
	hurt_t = 0.6
	last_hurt_by = by
	resting = false
	if health <= 0.0:
		health = 0.0
		dead = true


func step(dt: float, time: float, keys: Dictionary, threat: bool = false) -> void:
	for k in cd:
		cd[k] -= dt
	# ---- camera-relative movement ----
	var fx_ := -sin(cam_yaw)
	var fz := -cos(cam_yaw)
	var rx := cos(cam_yaw)
	var rz := -sin(cam_yaw)
	var mx := 0.0
	var mz := 0.0
	if not dead:
		if keys.get("w"):
			mx += fx_
			mz += fz
		if keys.get("s"):
			mx -= fx_
			mz -= fz
		if keys.get("d"):
			mx += rx
			mz += rz
		if keys.get("a"):
			mx -= rx
			mz -= rz
	var moving := Vector2(mx, mz).length() > 0.01
	var s0 := World.surface(pos.x, pos.z)
	var was_swimming := swimming
	swimming = s0.depth > DEEP
	if not swimming:
		submerged = false
	# holding E drinks at the water, holding Z rests (when it is safe)
	var head := head_pos()
	var hs := World.surface(head.x, head.z)
	can_drink = (World.has_water(hs.water) and hs.water - hs.ground > 0.15) or s0.depth > 0.4
	drinking = not dead and not moving and keys.get("e", false) and can_drink and not submerged
	var want_rest: bool = not dead and not moving and keys.get("z", false) and not swimming
	if want_rest and threat and not resting and not rest_warned:
		rest_warned = true
		event.emit("rest-threat")
	if not keys.get("z", false):
		rest_warned = false
	resting = want_rest and not threat
	var sprint: bool = keys.get("shift", false) and not submerged
	var can_sprint := sprint and stamina > 2.0 and moving
	var want := 0.0
	if moving and not resting:
		want = (SWIM_SPRINT if can_sprint else SWIM) if swimming else (SPRINT if can_sprint else WALK)
		if submerged:
			want = SWIM * 0.7
		# turn towards the direction of travel
		var target := atan2(-mz, mx)
		var d := fposmod(target - yaw + PI, TAU) - PI
		yaw += clampf(d, -1.0, 1.0) * dt * 3.2
		if absf(d) > 1.8:
			want *= 0.35
	if display_t > 0.0:
		want *= 0.2
	if not swimming and s0.depth > 0.6:
		want *= 0.75
	if dash_t > 0.0:
		dash_t -= dt
		want = DASH_SWIM if swimming else DASH
		speed = maxf(speed, want * 0.8)
	speed += (want - speed) * minf(1.0, dt * 3.0)
	stamina = clampf(stamina + (-14.0 if can_sprint else (20.0 if resting else 9.0)) * dt, 0.0, 100.0)
	var nx := pos.x + cos(yaw) * speed * dt
	var nz := pos.z - sin(yaw) * speed * dt
	# trunks and boulders push back
	if flora:
		for o in flora.obstacles(nx, nz):
			var ox: float = nx - o.x
			var oz: float = nz - o.y
			var dd := sqrt(ox * ox + oz * oz)
			var mn: float = o.z + len * 0.12
			if dd < mn and dd > 0.001:
				nx = o.x + ox / dd * mn
				nz = o.y + oz / dd * mn
	nx = clampf(nx, 20.0, World.width - 20.0)
	nz = clampf(nz, 20.0, World.depth - 20.0)
	# too steep a climb stops you
	var s1 := World.surface(nx, nz)
	var climb: float = (s1.ground - s0.ground) / maxf(0.01, Vector2(nx - pos.x, nz - pos.z).length())
	if climb < 1.4 or swimming:
		pos.x = nx
		pos.z = nz
	else:
		speed *= 0.5
	var s := World.surface(pos.x, pos.z)
	var y: float = s.water - len * (0.3 if submerged else 0.17) if s.depth > DEEP else s.ground
	pos.y += (y - pos.y) * minf(1.0, dt * (3.0 if submerged else 10.0))
	in_water = s.depth > 0.3
	water_y = s.water
	# ---- splashes and ripples ----
	if fx:
		if swimming and not was_swimming and speed > 2.0:
			fx.ambient.splash(Vector3(pos.x, s.water, pos.z), 28, 1.4)
			fx.sound.event("splash", 1.4)
			fx.water.ripple(pos.x, pos.z, time, 2.0)
		if in_water:
			ripple_t -= dt * (0.8 + speed * 0.35)
			if ripple_t <= 0.0:
				ripple_t = 1.0
				fx.water.ripple(pos.x, pos.z, time, 1.6 if swimming else 1.0)
				if speed > 7.0 and not submerged:
					fx.ambient.splash(Vector3(head.x, s.water, head.z), 6, 0.8)
	# ---- body ----
	bite_t = maxf(0.0, bite_t - dt)
	claw_t = maxf(0.0, claw_t - dt)
	hurt_t = maxf(0.0, hurt_t - dt)
	display_t = maxf(0.0, display_t - dt)
	sniff_t = maxf(0.0, sniff_t - dt)
	var b := sin((1.0 - bite_t / 0.35) * PI) if bite_t > 0.0 else 0.0
	var cl := sin((1.0 - claw_t / 0.45) * PI) if claw_t > 0.0 else 0.0
	var show := minf(1.0, sin((1.0 - display_t / 1.8) * PI) * 1.6) if display_t > 0.0 else 0.0
	rest_k += ((1.0 if resting else 0.0) - rest_k) * minf(1.0, dt * 2.0)
	phase += dt * speed / (len * 0.17)
	position = pos
	rotation = Vector3(0, yaw, -0.15 if dead else 0.0)
	model.animate(time, {
		"phase": phase, "moving": minf(1.4, speed / WALK), "jaw": maxf(maxf(b, show * 0.8), maxf(absf(sin(time * 3.0)) * 0.3 if drinking else 0.0, 0.05)),
		"attack": maxf(b, cl * 0.7), "rest": 1.0 if dead else rest_k, "rear": show * 0.45 + cl * 0.2, "call": show,
		"graze": 1.0 if drinking else 0.0, "sniff": 1.0 if sniff_t > 7.8 else 0.0, "crouch": 1.0 if submerged else 0.0, "look": 0.0})
	model.set_flash(hurt_t, show)
	model.set_wet(1.0 if in_water else maxf(0.0, (model.get_meta("wet", 0.0) - dt * 0.05)))
	model.set_meta("wet", 1.0 if in_water else maxf(0.0, model.get_meta("wet", 0.0) - dt * 0.05))
	# ---- needs ----
	var drain := 2.2 if resting else 1.0
	hunger = maxf(0.0, hunger - dt * (0.3 + (0.3 if can_sprint else 0.0)) * drain)
	thirst = maxf(0.0, thirst - dt * (0.26 + (0.3 if can_sprint else 0.0)) * drain)
	if drinking:
		thirst = minf(100.0, thirst + dt * 14.0)
		lap_t -= dt
		if lap_t <= 0.0:
			lap_t = 0.45
			if fx:
				fx.sound.event("drink")
				fx.water.ripple(head.x, head.z, time, 0.5)
	if submerged:
		breath -= dt * 4.0
		if breath <= 0.0:
			breath = 0.0
			submerged = false
			event.emit("breath")
	else:
		breath = minf(100.0, breath + dt * 20.0)
	if hunger <= 0.0:
		hurt(dt * 1.5, "hunger")
	if thirst <= 0.0:
		hurt(dt * 1.8, "thirst")
	elif hunger > 40.0 and thirst > 30.0 and not dead:
		health = minf(100.0, health + dt * (3.5 if resting else 0.8))


func update_camera(camera: Camera3D, dt: float, look: Vector2, wheel: float) -> void:
	cam_yaw -= look.x * 0.0032
	cam_pitch = clampf(cam_pitch + look.y * 0.0026, -0.15, 1.1)
	cam_dist = clampf(cam_dist * pow(1.0015, wheel), 10.0, 70.0)
	var at := Vector3(pos.x, pos.y + len * 0.35, pos.z)
	cam_at = cam_at.lerp(at, minf(1.0, dt * 10.0))
	if cam_at.length_squared() < 1.0:
		cam_at = at
	var cp := cos(cam_pitch)
	var sp := sin(cam_pitch)
	var want := Vector3(cam_at.x + sin(cam_yaw) * cp * cam_dist, cam_at.y + sp * cam_dist + 1.0, cam_at.z + cos(cam_yaw) * cp * cam_dist)
	# keep the camera above the ground and the water
	var g := World.surface(want.x, want.z)
	want.y = maxf(want.y, maxf(g.ground + 1.6, g.water + 0.6))
	# and in front of any trunk or boulder standing between it and the player
	if flora:
		var a := Vector2(cam_at.x, cam_at.z)
		var seg := Vector2(want.x, want.z) - a
		var reach := seg.length()
		var keep := 1.0
		for o in flora.obstacles(cam_at.x, cam_at.z):
			var along := (Vector2(o.x, o.y) - a).dot(seg) / maxf(reach * reach, 1e-6)
			if along <= 0.0 or along >= 1.0:
				continue
			if (a + seg * along).distance_to(Vector2(o.x, o.y)) < o.z + 0.6:
				keep = minf(keep, maxf(along - (o.z + 1.0) / maxf(reach, 1e-6), 4.0 / maxf(reach, 1e-6)))
		if keep < 1.0:
			want = cam_at + (want - cam_at) * keep
			g = World.surface(want.x, want.z)
			want.y = maxf(want.y, maxf(g.ground + 1.6, g.water + 0.6))
	cam_pos = cam_pos.lerp(want, minf(1.0, dt * 12.0))
	if cam_pos.length_squared() < 1.0:
		cam_pos = want
	camera.position = cam_pos
	camera.look_at(cam_at)
