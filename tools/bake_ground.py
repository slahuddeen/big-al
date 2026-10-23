# ==================== THE GROUND'S MATERIALS, PAINTED FROM THE WORLD ====================
# Paints the Terrain3D control and colour maps from the baked world (tools/bake_world.mjs):
# every biome is a mix of the photo-scanned Poly Haven ground materials (fetch_polyhaven.py),
# each of them patchy with its own noise so no two hectares look alike; steep slopes turn to
# bare rock, the waterline to damp sand and mud, river beds to pebbles. Per metre the two
# strongest materials become Terrain3D's base and overlay texture and their ratio the blend.
#   height.bin.gz   the ground the game stands on: the browser's height (height_raw.bin.gz) with its
#                   hexagonal terraces warped into wandering, natural slopes away from the water
#   t3d_height.bin.gz, t3d_control.bin.gz, t3d_color.bin.gz, t3d.json: what Terrain3D draws, the map
#                   plus an apron of land and sea floor round it running out towards the horizon:
#                   float32 height, uint32 control (Terrain3D's bit layout, doc/docs/controlmap_format.md)
#                   and RGBA8 colour (a gentle tint and brightness in rgb, wetness as roughness in a)
#   clutter.bin.gz  the ground clutter Terrain3D's instancer draws, per biome: Poly Haven ferns, shrubs,
#                   nettles, weeds, mossy rocks, boulders, pebbles, stumps, logs and fallen bark
#                   (tools/blender/prep_polyhaven.py); the meshes are listed in t3d.json
# Usage: python3 tools/bake_ground.py [seed]
import gzip, json, os, re, sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates, zoom

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1234
DIR = os.path.join(HERE, '..', 'godot', 'data', f'world_{SEED}')
GROUND = json.load(open(os.path.join(HERE, '..', 'godot', 'textures', 'ground', 'index.json')))['ground']
T = {n: i for i, n in enumerate(GROUND)}

# the materials of each biome and how much of each
MIX = {
    'sea': {'damp_sand': 1, 'coast_sand': .5},
    'river': {'river_small_rocks': 1, 'damp_sand': .5},
    'stream': {'river_small_rocks': 1, 'brown_mud_leaves_01': .4},
    'lake': {'damp_sand': 1, 'brown_mud_leaves_01': .5},
    'waterhole': {'brown_mud_leaves_01': 1, 'damp_sand': .6},
    'marsh': {'brown_mud_leaves_01': 1, 'forest_leaves_02': .5, 'leafy_grass': .3},
    'mangrove': {'brown_mud_leaves_01': 1, 'damp_sand': .5},
    'beach': {'coast_sand_01': 1, 'damp_sand': .5, 'gravelly_sand': .25},
    'riverbank': {'damp_sand': 1, 'gravelly_sand': .5, 'river_small_rocks': .3},
    'dryriverbed': {'mud_cracked_dry_03': 1, 'gravelly_sand': .6, 'river_small_rocks': .3},
    'floodplain': {'brown_mud_leaves_01': 1, 'leafy_grass': .8, 'damp_sand': .2},
    'galleryforest': {'forest_leaves_02': 1, 'forrest_ground_01': .6, 'brown_mud_leaves_01': .3},
    'forest': {'forest_leaves_02': 1, 'forrest_ground_01': .7},
    'denseforest': {'forest_leaves_02': 1, 'brown_mud_leaves_01': .5, 'mossy_rock': .1},
    'jungle': {'forest_leaves_02': 1, 'brown_mud_leaves_01': .6, 'mossy_rock': .15},
    'openwoods': {'forrest_ground_01': 1, 'forest_leaves_02': .6, 'leafy_grass': .4},
    'deadfall': {'forest_leaves_02': 1, 'forrest_ground_01': .5, 'brown_mud_leaves_01': .3},
    'plains': {'leafy_grass': 1, 'forrest_ground_01': .6},
    'fernprairie': {'leafy_grass': 1, 'forest_leaves_02': .4, 'forrest_ground_01': .4},
    'savanna': {'withered_grass': 1, 'dry_ground_rocks': .45, 'leafy_grass': .2},
    'scrubland': {'dry_ground_rocks': 1, 'withered_grass': .7, 'red_laterite_soil_stones': .2},
    'sauropodgrounds': {'withered_grass': 1, 'mud_cracked_dry_03': .5, 'dry_ground_rocks': .3},
    'mountains': {'rock_face_03': 1, 'mossy_rock': .4, 'dry_ground_rocks': .3},
    'hills': {'red_laterite_soil_stones': 1, 'dry_ground_rocks': .6, 'withered_grass': .25},
    'rocky': {'dry_ground_rocks': 1, 'rock_face_03': .5, 'gravelly_sand': .3},
    'boulderfield': {'rock_face_03': 1, 'dry_ground_rocks': .8},
    'desert': {'gravelly_sand': 1, 'coast_sand_01': .6},
    'badlands': {'red_laterite_soil_stones': 1, 'rock_face_03': .5, 'mud_cracked_dry_03': .2},
    'mesa': {'rock_face_03': 1, 'red_laterite_soil_stones': .7},
    'quicksand': {'damp_sand': 1, 'brown_mud_leaves_01': .6},
    'nest': {'coast_sand_01': 1, 'gravelly_sand': .5},
}
WET = {'marsh', 'mangrove', 'floodplain', 'galleryforest', 'denseforest', 'jungle', 'waterhole', 'stream', 'river', 'lake'}
# how coarse each material's patches are, metres
PATCH = {'leafy_grass': 14, 'withered_grass': 22, 'forest_leaves_02': 10, 'forrest_ground_01': 16, 'brown_mud_leaves_01': 9,
         'mud_cracked_dry_03': 12, 'coast_sand_01': 26, 'gravelly_sand': 18, 'rock_face_03': 7, 'red_laterite_soil_stones': 20,
         'dry_ground_rocks': 11, 'mossy_rock': 6, 'damp_sand': 15, 'river_small_rocks': 8}


def load(name, dtype):
    return np.frombuffer(gzip.open(os.path.join(DIR, name)).read(), dtype)


def fbm(shape, scale, rng, octaves=3):
    """Smooth 0..1 noise with features about `scale` metres across."""
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(scale / 2 ** o, 1.0)
        small = rng.standard_normal((int(shape[0] / s) + 3, int(shape[1] / s) + 3)).astype(np.float32)
        big = zoom(small, s, order=3)[:shape[0], :shape[1]]
        out += big * amp
        tot += amp
        amp *= 0.5
    out /= tot
    return np.clip(0.5 + out * 0.6, 0, 1)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


APRON = 480  # metres of made-up land and sea floor round the map


FOREST = ['galleryforest', 'forest', 'denseforest', 'jungle', 'openwoods', 'deadfall']
WETLAND = ['marsh', 'mangrove', 'floodplain']
FERNY = ['plains', 'fernprairie']
DRY = ['savanna', 'scrubland', 'sauropodgrounds', 'hills']
ROCKY = ['mountains', 'rocky', 'boulderfield', 'badlands', 'mesa']
SANDY = ['desert', 'beach', 'riverbank', 'dryriverbed', 'nest']
CHANNEL = ['river', 'stream']


def per(names, d):
    return {n: d for n in names}


# what lies on the ground where: scan, kind, plants per square metre by biome, scale range, draw distance, shadows
CLUTTER = [
    ('fern_02', 'plant', {**per(FOREST, .06), **per(WETLAND, .03), **per(FERNY, .05)}, (1.8, 3.0), 90, True),
    ('shrub_02', 'plant', {'openwoods': .004, **per(DRY, .006), **per(FERNY, .002), 'floodplain': .003}, (0.9, 1.8), 160, True),
    ('shrub_03', 'plant', {**per(DRY, .02), **per(FERNY, .015), **per(ROCKY, .004)}, (2.0, 3.5), 70, True),
    ('shrub_04', 'plant', {**per(DRY, .012), **per(FERNY, .01), 'openwoods': .01}, (2.5, 4.0), 70, True),
    ('nettle_plant', 'plant', {'galleryforest': .03, 'floodplain': .04, 'marsh': .03, 'openwoods': .02, 'riverbank': .01}, (3.0, 5.0), 60, True),
    ('weed_plant_02', 'plant', {**per(FERNY, .06), **per(DRY, .04), **per(FOREST, .03), **per(WETLAND, .03), **per(SANDY, .01), 'riverbank': .02}, (3.0, 6.0), 45, False),
    ('rock_moss_set_01', 'rock', {**per(ROCKY, .0025), 'hills': .001, **per(FOREST, .0006), 'denseforest': .001, 'jungle': .001}, (0.4, 1.4), 260, True),
    ('rock_moss_set_02', 'rock', {**per(ROCKY, .003), **per(SANDY, .001), **per(CHANNEL, .002), 'riverbank': .002, **per(DRY, .0008)}, (0.4, 1.2), 220, True),
    ('boulder_01', 'rock', {'boulderfield': .004, 'mountains': .002, 'rocky': .0015, 'badlands': .001, 'hills': .0008, 'mesa': .001}, (0.8, 3.2), 400, True),
    ('stone_01', 'pebble', {**per(ROCKY, .012), **per(SANDY, .008), **per(CHANNEL, .012), **per(DRY, .004)}, (1.5, 5.0), 40, False),
    ('rock_07', 'pebble', {**per(ROCKY, .01), **per(SANDY, .006), **per(CHANNEL, .01), **per(DRY, .003)}, (1.5, 5.0), 40, False),
    ('rock_09', 'pebble', {**per(ROCKY, .01), **per(SANDY, .006), **per(CHANNEL, .01), **per(DRY, .003)}, (2.0, 6.0), 40, False),
    ('tree_stump_01', 'wood', {**per(FOREST, .0012), 'deadfall': .003}, (0.8, 1.6), 160, True),
    ('dead_tree_trunk', 'wood', {'deadfall': .012, **per(FOREST, .0015), 'riverbank': .002, 'floodplain': .001, 'beach': .0008}, (1.2, 3.0), 220, True),
    ('bark_debris_01', 'wood', {**per(FOREST, .012), 'deadfall': .02}, (1.5, 2.5), 40, False),
    ('pine_roots', 'wood', {'galleryforest': .0015, 'forest': .0015, 'denseforest': .001}, (1.2, 2.2), 90, True),
]
FLORA_PH = os.path.join(HERE, '..', 'godot', 'flora_ph')


def glb_material(path):
    """The name of the (first) material a glb uses: the scan's maps are packed under that name."""
    import struct
    d = open(path, 'rb').read()
    n = struct.unpack('<I', d[12:16])[0]
    return re.sub(r'\.\d+$', '', json.loads(d[20:20 + n])['materials'][0]['name'])  # Blender's .001 copies


def scatter(names, tid, h, above, slope, rng):
    """Ground clutter: sampled in proportion to each scan's density, which clumps with noise."""
    D, W = h.shape
    meshes, recs = [], []
    for scan, kind, dens, (s0, s1), reach, shadows in CLUTTER:
        files = sorted(f for f in os.listdir(FLORA_PH) if re.fullmatch(re.escape(scan) + r'_\d+\.glb', f))
        if not files:
            continue
        field = np.zeros((D, W), np.float32)
        for name, d in dens.items():
            if name in names:
                field += (tid == names.index(name)) * d
        field *= np.clip(fbm((D, W), 14, rng) * 2.2 - 0.5, 0, None) ** 1.5
        if kind in ('plant', 'wood'):
            field *= (above > 0.15) & (slope < 33)
        else:
            field *= above > (-1.5 if kind == 'pebble' else -0.6)
        n = rng.poisson(field.sum())
        if n == 0:
            continue
        flat = field.ravel() / field.sum()
        idx = rng.choice(flat.size, n, p=flat)
        z, x = np.divmod(idx, W)
        x = x + rng.random(n)
        z = z + rng.random(n)
        # ground height under each, bilinear
        xi, zi = np.minimum(x.astype(int), W - 2), np.minimum(z.astype(int), D - 2)
        fx, fz = x - xi, z - zi
        y = (h[zi, xi] * (1 - fx) + h[zi, xi + 1] * fx) * (1 - fz) + (h[zi + 1, xi] * (1 - fx) + h[zi + 1, xi + 1] * fx) * fz
        sc = s0 + (s1 - s0) * rng.random(n) ** 1.6
        if kind in ('rock', 'pebble'):
            y -= 0.12 * sc  # set into the ground
        variant = rng.integers(0, len(files), n)
        t = tid[zi, xi]
        lum = 0.85 + 0.3 * rng.random(n)
        tint = np.ones((n, 3), np.float32) * lum[:, None]
        if kind == 'plant':
            dry = np.isin(t, [names.index(b) for b in DRY + SANDY if b in names])
            shade = np.isin(t, [names.index(b) for b in FOREST if b in names])
            tint[dry] *= [1.12, 1.04, 0.72]
            tint[shade] *= 0.85
        elif kind in ('rock', 'pebble'):
            red = np.isin(t, [names.index(b) for b in ('hills', 'badlands', 'mesa') if b in names])
            tint[red] *= [1.1, 0.9, 0.78]
        base = len(meshes)
        for f in files:
            meshes.append({'file': 'res://flora_ph/' + f, 'material': glb_material(os.path.join(FLORA_PH, f)), 'kind': kind,
                           'range': reach, 'shadows': shadows})
        recs.append(np.column_stack([x, y, z, rng.random(n) * 2 * np.pi, sc, base + variant, tint[:, 0], tint[:, 1], tint[:, 2]]))
        print(f'clutter {scan}: {n}')
    r = np.concatenate(recs).astype(np.float32)
    return meshes, r


# how much grass each ground material grows
GRASSY = {'leafy_grass': 1.0, 'withered_grass': 0.9, 'forrest_ground_01': 0.8, 'forest_leaves_02': 0.3, 'brown_mud_leaves_01': 0.45,
          'mud_cracked_dry_03': 0.12, 'coast_sand_01': 0.04, 'gravelly_sand': 0.15, 'rock_face_03': 0.0, 'red_laterite_soil_stones': 0.35,
          'dry_ground_rocks': 0.4, 'mossy_rock': 0.08, 'damp_sand': 0.08, 'river_small_rocks': 0.03}
DRYNESS = {**per(DRY, 1.0), **per(SANDY, 0.9), **per(ROCKY, 0.85), **per(FERNY, 0.25), 'openwoods': 0.4}
TALL = {**per(FERNY, 1.0), 'savanna': 1.0, 'sauropodgrounds': 0.8, 'floodplain': 0.9, 'marsh': 0.8, 'scrubland': 0.6,
        **per(FOREST, 0.5), **per(ROCKY, 0.4), 'hills': 0.6}
FLOWERY = {**per(FERNY, 1.0), 'floodplain': 0.6, 'openwoods': 0.5, 'marsh': 0.3}


def grass_map(names, tid, w, above, slope, rng):
    """grass.png for the GPU grass field: r how thick it grows, g how dry, b flowers, a how tall."""
    D, W = tid.shape
    tot = np.maximum(w.sum(0), 1e-6)
    dens = sum(GRASSY[m] * w[T[m]] for m in GROUND) / tot
    dens *= smoothstep(0.1, 0.5, above) * smoothstep(38, 28, slope)
    dens = gaussian_filter(dens, 1.2) * (0.55 + 0.7 * fbm((D, W), 6, rng))

    def field(table, sigma, base=0.0):
        f = np.full((D, W), base, np.float32)
        for name, v in table.items():
            if name in names:
                f[tid == names.index(name)] = v
        return gaussian_filter(f, sigma)
    dry = np.clip(field(DRYNESS, 6) + (fbm((D, W), 25, rng) - 0.5) * 0.5, 0, 1)
    flowers = field(FLOWERY, 4) * np.clip(fbm((D, W), 9, rng) * 2.4 - 1.1, 0, 1)
    tall = np.clip(field(TALL, 5, 0.6) * (0.6 + 0.8 * fbm((D, W), 18, rng)), 0, 1)
    img = np.stack([np.clip(dens, 0, 1), dry, flowers, tall], -1)
    Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(DIR, 'grass.png'))


def apron(meta, h, ctrl, col, rng, meshes):
    """The map with an apron round it: the hills at the edge roll on and fall away to the sea floor, the sea stays sea."""
    P, sea = APRON, meta['seaLevel']
    D, W = h.shape
    hp = np.pad(h, P, mode='reflect')
    jj, ii = np.mgrid[0:D + 2 * P, 0:W + 2 * P]
    d = np.hypot(np.maximum(0, np.maximum(P - ii, ii - (P + W - 1))), np.maximum(0, np.maximum(P - jj, jj - (P + D - 1)))).astype(np.float32)
    del jj, ii
    out = d > 0
    hp = hp + (gaussian_filter(hp, 12) - hp) * smoothstep(0, 220, d)
    land = smoothstep(-2, 8, hp)
    hp = hp + (fbm(hp.shape, 90, rng) - 0.5) * 2 * 22 * smoothstep(0, 260, d) * land
    hp = hp + (-12 - hp) * smoothstep(330, 470, d)
    hp = np.where(out, np.round(hp * 20) / 20, np.pad(h, P)).astype(np.float32)
    # the apron's ground: dry grass and stony soil, rock on its steep faces, sand under the sea
    gz, gx = np.gradient(hp)
    steep = np.degrees(np.arctan(np.hypot(gx, gz))) > 28
    n = fbm(hp.shape, 20, rng)
    base = np.where(hp < sea + 0.5, T['damp_sand'], np.where(steep, T['rock_face_03'], np.where(n > 0.5, T['withered_grass'], T['dry_ground_rocks'])))
    over = np.where(hp < sea + 0.5, T['coast_sand_01'], np.where(n > 0.5, T['dry_ground_rocks'], T['withered_grass']))
    bl = np.clip(0.5 - np.abs(n - 0.5) * 3, 0, 0.5)
    c = (base.astype(np.uint32) << 27) | (over.astype(np.uint32) << 22) | (np.round(bl * 255).astype(np.uint32) << 14)
    c[P:P + D, P:P + W] = ctrl
    cp = np.ones(hp.shape + (4,), np.float32) * np.array([0.82, 0.82, 0.82, 0.5], np.float32)
    cp[..., :3] *= (0.86 + 0.2 * fbm(hp.shape, 60, rng))[..., None]
    cp[P:P + D, P:P + W] = col
    for name, a in (('height', hp.astype('<f4')), ('control', c.astype('<u4')), ('color', (cp * 255 + 0.5).astype(np.uint8))):
        open(os.path.join(DIR, f't3d_{name}.bin.gz'), 'wb').write(gzip.compress(a.tobytes(), 6))
    json.dump({'origin': [-P, -P], 'width': W + 2 * P, 'depth': D + 2 * P, 'textures': GROUND, 'clutter': meshes}, open(os.path.join(DIR, 't3d.json'), 'w'))


def main():
    meta = json.load(open(os.path.join(DIR, 'world.json')))
    W, D = meta['gridW'], meta['gridD']
    raw = load('height_raw.bin.gz', np.float32).reshape(D, W)
    wl = load('water.bin.gz', np.float32).reshape(D, W)
    info = load('info.bin.gz', np.uint8).reshape(D, W, 2)
    tid = info[..., 0]
    edge = np.where(info[..., 1] == 255, 99.0, info[..., 1] / 4.0 - 16.0)
    names = meta['terrains']
    rng = np.random.default_rng(SEED)

    # the hex cells' terrace edges run dead straight: bend them, and soften them a little, but leave
    # everything within reach of water alone so banks, beds and water surfaces still agree
    jj, ii = np.mgrid[0:D, 0:W].astype(np.float32)
    near = distance_transform_edt(~((wl > -999) | (edge < 6)))
    calm = smoothstep(5, 18, near).astype(np.float32)
    amp = 11.0 * calm
    hx = (fbm((D, W), 26, rng) - 0.5) * 2 * amp
    hz = (fbm((D, W), 26, rng) - 0.5) * 2 * amp
    bent = map_coordinates(raw, [np.clip(jj + hz, 0, D - 1), np.clip(ii + hx, 0, W - 1)], order=1)
    bent = bent * (1 - 0.6 * calm) + gaussian_filter(bent, 2.0) * 0.6 * calm
    h = (raw * (1 - calm) + bent * calm).astype(np.float32)
    h = np.round(h * 100) / 100
    open(os.path.join(DIR, 'height.bin.gz'), 'wb').write(gzip.compress(h.astype('<f4').tobytes(), 6))
    print('height: moved %.2f m on average, %.1f m at most' % (np.abs(h - raw).mean(), np.abs(h - raw).max()))

    # the browser's biomes are hexagonal cells: look them up through a warp so their borders wander
    warp = 14.0
    wx = (fbm((D, W), 30, rng) - 0.5) * 2 * warp
    wz = (fbm((D, W), 30, rng) - 0.5) * 2 * warp
    biome = map_coordinates(tid, [np.clip(jj + wz, 0, D - 1), np.clip(ii + wx, 0, W - 1)], order=0)
    # ...but water channels and their banks stay where the water is
    wet_t = [names.index(n) for n in ('sea', 'river', 'stream', 'lake', 'waterhole', 'riverbank', 'beach') if n in names]
    biome = np.where(np.isin(tid, wet_t) | np.isin(biome, wet_t), tid, biome)
    del jj, ii, wx, wz, hx, hz, bent

    # each material's share: the biomes' mixes, softened across borders, made patchy by noise
    w = np.zeros((len(GROUND), D, W), np.float32)
    for t, name in enumerate(names):
        m = biome == t
        if not m.any():
            continue
        for mat, amt in MIX[name].items():
            w[T[mat if mat in T else mat + '_01']] += m * amt
    for i, mat in enumerate(GROUND):
        w[i] = gaussian_filter(w[i], 4.0) * (0.25 + 1.5 * fbm((D, W), PATCH[mat], rng))

    # the shape of the land: rock on steep ground, damp sand and mud at the waterline, pebbles in the beds
    gz, gx = np.gradient(h)
    slope = np.degrees(np.arctan(np.hypot(gx, gz)))
    has_w = wl > -999
    above = np.where(has_w, h - wl, 99.0)
    wetbiome = np.isin(tid, [names.index(n) for n in WET if n in names])
    cliff = smoothstep(26, 40, slope) * (0.6 + 0.8 * fbm((D, W), 9, rng))
    w[T['rock_face_03']] += cliff * 3.0 * ~wetbiome
    w[T['mossy_rock']] += cliff * 3.0 * wetbiome
    shore = smoothstep(1.4, 0.0, above) * (above > -0.3) * (0.5 + fbm((D, W), 7, rng))
    w[T['damp_sand']] += shore * 1.6 * ~wetbiome
    w[T['brown_mud_leaves_01']] += shore * 1.6 * wetbiome
    channel = np.isin(tid, [names.index(n) for n in ('river', 'stream', 'riverbank', 'dryriverbed') if n in names])
    bed = (smoothstep(-0.2, -1.0, above) + smoothstep(2.5, 0.0, edge) * 0.6) * channel
    w[T['river_small_rocks']] += bed * (0.6 + 0.8 * fbm((D, W), 6, rng))

    grass_map(names, tid, w, above, slope, rng)

    # the two strongest materials and how much of the second shows through
    order = np.argsort(w, axis=0)
    base, over = order[-1], order[-2]
    w1 = np.take_along_axis(w, base[None], 0)[0]
    w2 = np.take_along_axis(w, over[None], 0)[0]
    r = w2 / np.maximum(w1 + w2, 1e-6)
    blend = np.clip((r - 0.12) / 0.38, 0, 1) * 0.5
    ctrl = (base.astype(np.uint32) << 27) | (over.astype(np.uint32) << 22) | (np.round(blend * 255).astype(np.uint32) << 14)

    # colour: a breath of the biome colour, large-scale brightness, and wet, dark, glossy ground by the water
    g = np.asarray(Image.open(os.path.join(DIR, 'ground.png')).convert('RGB'), np.float32) / 255
    g = np.stack([gaussian_filter(g[..., c], 5) for c in range(3)], -1)
    chroma = g / np.maximum(g.mean(-1, keepdims=True), 1e-3)
    tint = 1 + 0.16 * (chroma - 1)
    tint *= (0.86 + 0.2 * fbm((D, W), 60, rng))[..., None]
    wet = smoothstep(0.9, 0.0, above) * (above > -2)
    tint *= (1 - 0.3 * wet)[..., None]
    rough = 0.5 - 0.35 * wet
    col = np.concatenate([np.clip(tint * 0.92, 0, 1), rough[..., None]], -1)
    meshes, clutter = scatter(names, tid, h, above, slope, rng)
    open(os.path.join(DIR, 'clutter.bin.gz'), 'wb').write(gzip.compress(clutter.astype('<f4').tobytes(), 6))
    apron(meta, h, ctrl, col, rng, meshes)
    used = np.bincount(base.ravel(), minlength=len(GROUND)) / base.size
    np.save(os.path.join(HERE, '.gen', 'ground_preview.npy'), np.stack([base, over, np.round(blend * 255)]).astype(np.uint8))
    print('base share:', ', '.join(f'{GROUND[i]} {used[i]:.1%}' for i in np.argsort(-used) if used[i] > 0.001))


if __name__ == '__main__':
    main()
