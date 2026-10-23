# ==================== THE KEM KEM AT REAL SCALE ====================
# The world of Spino: Roam, baked from the browser game's own generator (tools/bake_world.mjs)
# at one sample per metre: ground height, water surface, biome and distance to the river
# channels, plus the rivers, ponds and lakes themselves. Everything that stands on the land,
# swims in the water or decides where to graze asks this node, as the browser's RoamWorld did.
extends Node

const NO_WATER := -1000.0

var seed := 1234
var width := 2080.0
var depth := 1760.0
var grid_w := 2081
var grid_d := 1761
var sea_level := 2.4
var spawn := Vector2(1000, 900)
var heights := PackedFloat32Array()
var water := PackedFloat32Array()
var info := PackedByteArray()  # per metre: terrain id, river edge
var terrains: Array = []
var terrain_names: Array = []
var ponds: Array = []
var rivers: Array = []  # each a PackedVector4Array-like Array of [x, z, w, surface]
var lakes: Array = []
var game: Dictionary = {}
var height_image: Image
var water_image: Image
var pond_buckets := {}
const BUCKET := 40.0


func load_world(s: int = 1234) -> void:
	seed = s
	var dir := "res://data/world_%d/" % s
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(dir + "world.json"))
	width = meta.width
	depth = meta.depth
	grid_w = int(meta.gridW)
	grid_d = int(meta.gridD)
	sea_level = meta.seaLevel
	spawn = Vector2(meta.spawn.x, meta.spawn.z)
	terrains = meta.terrains
	terrain_names = meta.terrainNames
	ponds = meta.ponds
	rivers = meta.rivers
	lakes = meta.lakes
	var hb := gunzip(dir + "height.bin.gz")
	heights = hb.to_float32_array()
	height_image = Image.create_from_data(grid_w, grid_d, false, Image.FORMAT_RF, hb)
	var wb := gunzip(dir + "water.bin.gz")
	water = wb.to_float32_array()
	water_image = Image.create_from_data(grid_w, grid_d, false, Image.FORMAT_RF, wb)
	info = gunzip(dir + "info.bin.gz")
	game = JSON.parse_string(FileAccess.get_file_as_string("res://data/game.json"))
	for p in ponds:
		var reach: float = p.R * 1.4 + 6.0
		for bx in range(int(floor((p.x - reach) / BUCKET)), int(floor((p.x + reach) / BUCKET)) + 1):
			for bz in range(int(floor((p.z - reach) / BUCKET)), int(floor((p.z + reach) / BUCKET)) + 1):
				var key := Vector2i(bx, bz)
				if not pond_buckets.has(key):
					pond_buckets[key] = []
				pond_buckets[key].append(p)


func gunzip(path: String) -> PackedByteArray:
	var raw := FileAccess.get_file_as_bytes(path)
	return raw.decompress_dynamic(-1, FileAccess.COMPRESSION_GZIP)


func _index(x: float, z: float) -> int:
	var i := clampi(int(round(x)), 0, grid_w - 1)
	var j := clampi(int(round(z)), 0, grid_d - 1)
	return j * grid_w + i


func inside(x: float, z: float) -> bool:
	return x >= 0.0 and z >= 0.0 and x <= width and z <= depth


# ground height, bilinear between the metre samples; off the map the sea floor
func height(x: float, z: float) -> float:
	if not inside(x, z):
		return -12.0
	var fx := clampf(x, 0.0, grid_w - 1.001)
	var fz := clampf(z, 0.0, grid_d - 1.001)
	var i := int(fx)
	var j := int(fz)
	var u := fx - i
	var v := fz - j
	var k := j * grid_w + i
	var a := heights[k]
	var b := heights[k + 1]
	var c := heights[k + grid_w]
	var d := heights[k + grid_w + 1]
	return lerpf(lerpf(a, b, u), lerpf(c, d, u), v)


# the water surface here, or NO_WATER
func water_at(x: float, z: float) -> float:
	if not inside(x, z):
		return sea_level
	return water[_index(x, z)]


func terrain_at(x: float, z: float) -> String:
	if not inside(x, z):
		return "sea"
	return terrains[info[_index(x, z) * 2]]


func terrain_name_at(x: float, z: float) -> String:
	if not inside(x, z):
		return "Tethys Sea"
	return terrain_names[info[_index(x, z) * 2]]


# distance (m) outside a river's edge, negative inside the channel; 99 far from any river
func river_edge(x: float, z: float) -> float:
	if not inside(x, z):
		return 99.0
	var q := info[_index(x, z) * 2 + 1]
	return 99.0 if q == 255 else q / 4.0 - 16.0


func pond_radius(p: Dictionary, a: float) -> float:
	var l: Array = p.lobes
	return p.R * (1.0 + sin(a * 2.0 + l[0]) * l[2] + sin(a * 3.0 + l[1]) * l[3])


func pond_at(x: float, z: float):
	var list = pond_buckets.get(Vector2i(int(floor(x / BUCKET)), int(floor(z / BUCKET))))
	if list == null:
		return null
	for p in list:
		var dx: float = x - p.x
		var dz: float = z - p.z
		var d := sqrt(dx * dx + dz * dz)
		if d > p.R * 1.4 + 6.0:
			continue
		if d < pond_radius(p, atan2(dz, dx)) + 0.6:
			return p
	return null


# where an animal stands or floats here, and how deep the water is
func surface(x: float, z: float) -> Dictionary:
	var g := height(x, z)
	var w := water_at(x, z)
	var dep := 0.0
	if w > NO_WATER + 1.0:
		dep = maxf(0.0, w - g)
	else:
		w = NO_WATER
	return {"ground": g, "water": w, "depth": dep}


func has_water(w: float) -> bool:
	return w > NO_WATER + 1.0


func depth_at(x: float, z: float) -> float:
	var w := water_at(x, z)
	return maxf(0.0, w - height(x, z)) if has_water(w) else 0.0


func normal_at(x: float, z: float) -> Vector3:
	var e := 1.5
	return Vector3(height(x - e, z) - height(x + e, z), 2.0 * e, height(x, z - e) - height(x, z + e)).normalized()
