# ==================== CC0 GROUND MATERIALS AND PLANTS FROM POLY HAVEN ====================
# Downloads photo-scanned, CC0-licensed ground textures and plant/rock models from Poly Haven
# (https://polyhaven.com, all public domain) and prepares them for the Godot port:
#   * ground textures are packed the way Terrain3D wants them: albedo with height in alpha,
#     normal (OpenGL) with roughness in alpha, 1024 px, written as WebP to keep the repo small
#     -> godot/textures/ground/<name>_albedo_h.webp, <name>_normal_r.webp
#   * models are downloaded as glTF (1k textures) into tools/.gen/polyhaven/models/ for
#     tools/blender/prep_polyhaven.py to decimate into game meshes; the maps of the ones the game
#     instances are packed once per material (the meshes carry no images, so the variants of a
#     scan share them): albedo with the cut-out alpha, OpenGL normal, and AO/roughness/metal
#     -> godot/flora_ph/tex/<material>_{albedo,normal,orm}.webp and godot/flora_ph/materials.json
# Usage: python3 tools/fetch_polyhaven.py
import json, os, sys, urllib.request
from io import BytesIO
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.gen', 'polyhaven')
TEX_OUT = os.path.join(HERE, '..', 'godot', 'textures', 'ground')
MAT_OUT = os.path.join(HERE, '..', 'godot', 'flora_ph', 'tex')
os.makedirs(CACHE, exist_ok=True)
os.makedirs(TEX_OUT, exist_ok=True)

GROUND = ['leafy_grass', 'withered_grass', 'forest_leaves_02', 'forrest_ground_01', 'brown_mud_leaves_01', 'mud_cracked_dry_03',
          'coast_sand_01', 'gravelly_sand', 'rock_face_03', 'red_laterite_soil_stones', 'dry_ground_rocks', 'mossy_rock',
          'damp_sand', 'river_small_rocks']
MODELS = ['grass_medium_01', 'grass_medium_02', 'grass_bermuda_01', 'fern_02', 'moss_01', 'rock_moss_set_01', 'rock_moss_set_02',
          'shrub_02', 'shrub_03', 'shrub_04', 'weed_plant_02', 'nettle_plant', 'celandine_01', 'boulder_01', 'stone_01', 'rock_07',
          'rock_09', 'tree_stump_01', 'dead_tree_trunk', 'bark_debris_01', 'pine_roots']
CARD_ONLY = ['grass_medium_01', 'grass_medium_02', 'grass_bermuda_01', 'celandine_01', 'moss_01']  # not instanced


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'spino-godot-port/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def cached(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(get(url))
    return path


def pick(files, *names):
    for n in names:
        if n in files:
            return files[n]
    raise KeyError(names)


def ground(name, res='1k'):
    files = json.loads(get(f'https://api.polyhaven.com/files/{name}'))
    d = os.path.join(CACHE, 'tex', name)
    diff = cached(pick(files, 'Diffuse', 'diff')[res]['jpg']['url'], os.path.join(d, 'diff.jpg'))
    nor = cached(pick(files, 'nor_gl')[res]['jpg']['url'], os.path.join(d, 'nor.jpg'))
    rough = cached(pick(files, 'Rough', 'rough')[res]['jpg']['url'], os.path.join(d, 'rough.jpg'))
    disp = cached(pick(files, 'Displacement', 'disp')[res]['png' if 'png' in pick(files, 'Displacement', 'disp')[res] else 'jpg']['url'], os.path.join(d, 'disp.img'))
    size = (1024, 1024)
    a = Image.open(diff).convert('RGB').resize(size, Image.LANCZOS)
    # displacement often comes as a 16-bit PNG, which a plain conversion to 8 bits clips to white:
    # read it as numbers and stretch it over the full range, so Terrain3D's height blending has
    # the whole of it to work with
    d = np.asarray(Image.open(disp), np.float32)
    d = d.mean(-1) if d.ndim == 3 else d
    lo, hi = np.percentile(d, [0.5, 99.5])
    h = Image.fromarray((np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1) * 255).astype(np.uint8), 'L').resize(size, Image.LANCZOS)
    n = Image.open(nor).convert('RGB').resize(size, Image.LANCZOS)
    r = Image.open(rough).convert('L').resize(size, Image.LANCZOS)
    Image.merge('RGBA', (*a.split(), h)).save(os.path.join(TEX_OUT, f'{name}_albedo_h.webp'), quality=88, method=6)
    Image.merge('RGBA', (*n.split(), r)).save(os.path.join(TEX_OUT, f'{name}_normal_r.webp'), quality=92, method=6)
    print('ground', name)


def model(name, res='1k'):
    files = json.loads(get(f'https://api.polyhaven.com/files/{name}'))
    g = files['gltf'][res]['gltf']
    d = os.path.join(CACHE, 'models', name)
    cached(g['url'], os.path.join(d, name + '.gltf'))
    for rel, inc in g.get('include', {}).items():
        cached(inc['url'], os.path.join(d, rel))
    if 'Alpha' in files:
        cached(files['Alpha'][res]['jpg']['url'], os.path.join(d, 'textures', name + '_alpha_1k.jpg'))
    print('model', name)


def pack_materials(name, res='1k'):
    """One set of game maps per material of an instanced scan."""
    d = os.path.join(CACHE, 'models', name)
    g = json.load(open(os.path.join(d, name + '.gltf')))
    uri = lambda info: os.path.join(d, g['images'][g['textures'][info['index']]['source']]['uri'])
    out = {}
    os.makedirs(MAT_OUT, exist_ok=True)
    for m in g['materials']:
        pbr = m['pbrMetallicRoughness']
        a = Image.open(uri(pbr['baseColorTexture'])).convert('RGB')
        alpha = os.path.join(d, 'textures', name + '_alpha_1k.jpg')
        cut = m.get('alphaMode') in ('MASK', 'BLEND') and os.path.exists(alpha)
        al = Image.open(alpha).convert('L').resize(a.size) if cut else Image.new('L', a.size, 255)
        Image.merge('RGBA', (*a.split(), al)).save(os.path.join(MAT_OUT, m['name'] + '_albedo.webp'), quality=90, method=6)
        Image.open(uri(m['normalTexture'])).convert('RGB').save(os.path.join(MAT_OUT, m['name'] + '_normal.webp'), quality=92, method=6)
        # Poly Haven's arm maps are AO, roughness, metal: the layout Godot's ORM wants. Some scans only
        # have a grey roughness map: give those no occlusion and no metal
        src = uri(pbr['metallicRoughnessTexture'])
        orm = Image.open(src).convert('RGB')
        if '_arm_' not in src:
            r = orm.convert('L')
            orm = Image.merge('RGB', (Image.new('L', r.size, 255), r, Image.new('L', r.size, 0)))
        orm.save(os.path.join(MAT_OUT, m['name'] + '_orm.webp'), quality=90, method=6)
        out[m['name']] = {'cutout': cut}
    return out


if __name__ == '__main__':
    only = sys.argv[1:]
    for n in GROUND:
        if not only or n in only:
            ground(n)
    for n in MODELS:
        if not only or n in only:
            try:
                model(n)
            except Exception as e:
                print('skip', n, e)
    json.dump({'ground': GROUND, 'models': MODELS}, open(os.path.join(TEX_OUT, 'index.json'), 'w'))
    mats = {}
    for n in MODELS:
        if n not in CARD_ONLY and os.path.exists(os.path.join(CACHE, 'models', n)):
            mats.update(pack_materials(n))
    json.dump(mats, open(os.path.join(MAT_OUT, '..', 'materials.json'), 'w'), indent=1)
