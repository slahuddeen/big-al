# ==================== TEXTURE IMPORT SETTINGS ====================
# Godot only notices that a texture is drawn in 3D when the editor sees it on a material, so a
# headless import leaves every texture without mipmaps and uncompressed. This writes the import
# settings each texture of the port needs and forces a re-import:
#   * everything drawn in 3D: VRAM-compressed (BC1/BC3) with mipmaps
#   * normal maps: compressed as normal maps (RGTC), except Terrain3D's, which carry roughness in alpha,
#     and the tree impostors', whose normals are read whole
#   * the world's data images (biome colour, splat): lossless, with mipmaps, never compressed
#   * the plant and clutter meshes: no automatic LODs (Godot 4.3's LOD generator crashes on some of
#     the scans and tears others into shards; the scatter and Terrain3D cull them by distance)
# Usage: python3 tools/godot_imports.py   (then run the editor once, headless, to import)
import glob, os, re

GODOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'godot')

BASE = {
    'compress/mode': 2, 'compress/high_quality': 'false', 'compress/lossy_quality': 0.7, 'compress/hdr_compression': 1,
    'compress/normal_map': 2, 'compress/channel_pack': 0, 'mipmaps/generate': 'true', 'mipmaps/limit': -1,
    'roughness/mode': 0, 'roughness/src_normal': '""', 'process/fix_alpha_border': 'true', 'process/premult_alpha': 'false',
    'process/normal_map_invert_y': 'false', 'process/hdr_as_srgb': 'false', 'process/hdr_clamp_exposure': 'false',
    'process/size_limit': 0, 'detect_3d/compress_to': 0,
}


def settings(rel):
    s = dict(BASE)
    name = os.path.basename(rel)
    if rel.startswith('data/'):
        s['compress/mode'] = 0
    elif rel.startswith('flora/imp/'):
        pass  # impostor normals are read whole (x, y and z) and stack into a texture array with the albedos' settings
    elif re.search(r'(_n|_normal|_n2)\.(png|jpg|webp)$', name):
        s['compress/normal_map'] = 1
    return s


def write(path, s):
    rel = os.path.relpath(path, GODOT).replace(os.sep, '/')
    imp = path + '.import'
    head = '[remap]\n\nimporter="texture"\ntype="CompressedTexture2D"\n'
    old = open(imp).read() if os.path.exists(imp) else ''
    params = '[params]\n\n' + ''.join(f'{k}={v}\n' for k, v in s.items())
    if old and old.split('[params]')[-1].strip() == params.split('[params]')[-1].strip():
        return False
    open(imp, 'w').write(head + '\n' + params)
    # drop the old import so the editor makes a new one
    for f in glob.glob(os.path.join(GODOT, '.godot', 'imported', os.path.basename(path) + '-*')):
        os.remove(f)
    return True


def write_scene(path):
    imp = path + '.import'
    if os.path.exists(imp) and 'meshes/generate_lods=false' in open(imp).read():
        return False
    open(imp, 'w').write('[remap]\n\nimporter="scene"\nimporter_version=1\ntype="PackedScene"\n\n[params]\n\n'
                         'meshes/ensure_tangents=true\nmeshes/generate_lods=false\nmeshes/create_shadow_meshes=true\n')
    for f in glob.glob(os.path.join(GODOT, '.godot', 'imported', os.path.basename(path) + '-*')):
        os.remove(f)
    return True


def main():
    n = 0
    for p in sorted(glob.glob(os.path.join(GODOT, 'flora_ph', '*.glb')) + glob.glob(os.path.join(GODOT, 'flora', '*.glb'))):
        n += write_scene(p)
    for pat in ('textures/*.png', 'textures/ground/*.webp', 'flora_ph/tex/*.webp', 'flora/tex/*.webp', 'flora/imp/*.webp', 'creatures/*.jpg', 'creatures/*.png', 'creatures/*.webp',
                'data/world_*/*.png'):
        for p in sorted(glob.glob(os.path.join(GODOT, pat))):
            n += write(p, settings(os.path.relpath(p, GODOT).replace(os.sep, '/')))
    print(n, 'import settings written')


if __name__ == '__main__':
    main()
