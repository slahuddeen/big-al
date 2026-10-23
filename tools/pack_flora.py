# ==================== PACK THE FOREST'S TEXTURES FOR THE GAME ====================
# Writes the textures the trees and plants need into godot/flora/tex as compact WebP:
#   * the composed twig, branchlet and frond cards (tools/compose_cards.py): albedo with alpha, normal
#   * the barks (tools/fetch_flora.py): albedo, OpenGL normal, AO/roughness/metal; 2k albedo and
#     normal for the trunks seen up close, 1k ORM
#   * the impostor atlases rendered by tools/blender/build_trees.py (godot/flora/imp/*.png -> .webp)
# Usage: python3 tools/pack_flora.py
import glob, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, '.gen', 'cards')
SRC = os.path.join(HERE, '.gen', 'flora_src')
OUT = os.path.join(HERE, '..', 'godot', 'flora', 'tex')
IMP = os.path.join(HERE, '..', 'godot', 'flora', 'imp')
BARKS = ['metasequoia_bark', 'japanese_cedar_bark', 'palm_bark', 'palm_tree_bark', 'bark_brown_02', 'moss_wood', 'pine_bark',
         'eucalyptus_bark']
os.makedirs(OUT, exist_ok=True)


def webp(src, dst, quality=88, size=None, mode=None):
    im = Image.open(src)
    if mode:
        im = im.convert(mode)
    if size and im.size[0] > size:
        im = im.resize((size, size * im.size[1] // im.size[0]), Image.LANCZOS)
    im.save(dst, quality=quality, method=6)


def main():
    for p in sorted(glob.glob(os.path.join(CARDS, '*_albedo.png'))):
        name = os.path.basename(p)[:-len('_albedo.png')]
        webp(p, os.path.join(OUT, name + '_albedo.webp'), 90)
        webp(p.replace('_albedo', '_normal'), os.path.join(OUT, name + '_normal.webp'), 92, mode='RGB')
    for b in BARKS:
        d = os.path.join(SRC, b)
        webp(os.path.join(d, 'diff.jpg'), os.path.join(OUT, f'bark_{b}_albedo.webp'), 86, 2048, 'RGB')
        webp(os.path.join(d, 'nor.jpg'), os.path.join(OUT, f'bark_{b}_normal.webp'), 90, 2048, 'RGB')
        webp(os.path.join(d, 'arm.jpg'), os.path.join(OUT, f'bark_{b}_orm.webp'), 86, 1024, 'RGB')
    for p in sorted(glob.glob(os.path.join(IMP, '*.png'))):
        webp(p, p[:-4] + '.webp', 90, mode='RGBA' if p.endswith('_albedo.png') else 'RGB')
        os.remove(p)
    print('packed', len(os.listdir(OUT)), 'textures,', len(glob.glob(os.path.join(IMP, '*.webp'))), 'impostor maps')


if __name__ == '__main__':
    main()
