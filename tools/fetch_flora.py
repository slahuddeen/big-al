# ==================== PHOTO-SCANNED LEAVES, TWIGS AND BARK FOR THE FOREST ====================
# Downloads the CC0 photo textures the trees and plants are built from (tools/blender/build_trees.py):
#   * twig and leaf atlases with their alpha from Poly Haven's scanned trees and plants: pine and fir
#     twigs, broadleaf clusters, a fern, quiver-tree leaves (https://polyhaven.com, CC0)
#   * bark: metasequoia and cedar for the conifers, palm bark for cycad and tree-fern trunks, brown
#     bark for the broadleaves, mossy wood (Poly Haven, CC0)
#   * leaf sets from ambientCG (https://ambientcg.com, CC0): scale-leaf conifer sprays, narrow
#     leaflets for cycad fronds, elliptic leaves for the early flowering trees
# Everything lands in tools/.gen/flora_src/<name>/{diff,nor,arm,alpha}.jpg (2k), cached.
# Usage: python3 tools/fetch_flora.py
import io, json, os, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '.gen', 'flora_src')

# Poly Haven model maps: (asset, map prefix or '' for the model's own maps)
PH_MAPS = [('pine_tree_01', 'twig'), ('pine_tree_01', 'bark'), ('fir_tree_01', 'twig'), ('fir_sapling_medium', 'twigs'),
           ('island_tree_01', 'leaves'), ('island_tree_02', 'leaves'), ('jacaranda_tree', 'leaves'), ('tree_small_02', 'leaves'),
           ('pachira_aquatica_01', 'leaves'), ('quiver_tree_01', 'leaf'), ('fern_02', '')]
PH_TEXTURES = ['metasequoia_bark', 'japanese_cedar_bark', 'palm_bark', 'palm_tree_bark', 'bark_brown_02', 'moss_wood',
               'pine_bark', 'eucalyptus_bark']
ACG = ['LeafSet019', 'LeafSet013', 'LeafSet022', 'LeafSet024', 'LeafSet003', 'LeafSet020']


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'spino-godot-port/1.0'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def save(path, url):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(get(url))


def polyhaven(asset, prefix, res='2k'):
    files = json.loads(get(f'https://api.polyhaven.com/files/{asset}'))
    name = f'{asset}_{prefix}' if prefix else asset
    d = os.path.join(OUT, name)
    keys = {'diff': ['diff', 'Diffuse'], 'nor': ['nor_gl'], 'arm': ['arm'], 'alpha': ['alpha', 'Alpha'], 'rough': ['rough', 'Rough'],
            'ao': ['ao', 'AO']}
    for out, cands in keys.items():
        for c in cands:
            k = f'{prefix}_{c}' if prefix else c
            if k in files and res in files[k]:
                save(os.path.join(d, out + '.jpg'), files[k][res]['jpg']['url'])
                break
    print('polyhaven', name, sorted(os.listdir(d)))


def ambientcg(asset, res='2K'):
    d = os.path.join(OUT, asset)
    if os.path.exists(os.path.join(d, 'diff.jpg')):
        return
    z = zipfile.ZipFile(io.BytesIO(get(f'https://ambientcg.com/get?file={asset}_{res}-JPG.zip')))
    os.makedirs(d, exist_ok=True)
    for n in z.namelist():
        for tag, out in (('_Color', 'diff'), ('_NormalGL', 'nor'), ('_Roughness', 'rough'), ('_Opacity', 'alpha'),
                         ('_Displacement', 'disp'), ('_Scattering', 'sss')):
            if tag in n and n.lower().endswith(('.jpg', '.png')):
                open(os.path.join(d, out + '.jpg'), 'wb').write(z.read(n))
    print('ambientcg', asset, sorted(os.listdir(d)))


if __name__ == '__main__':
    only = sys.argv[1:]
    for a, p in PH_MAPS:
        if not only or a in only:
            polyhaven(a, p)
    for t in PH_TEXTURES:
        if not only or t in only:
            polyhaven(t, '')
    for a in ACG:
        if not only or a in only:
            ambientcg(a)
