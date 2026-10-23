# ==================== SCULPT THE ROAM ANIMALS ====================
# For each species: build its anatomy (anatomy.py) from the browser game's spec, mesh the
# body and lower jaw at high resolution, paint them (paint.py), and write everything the
# Blender bake (tools/blender/bake_creatures.py) needs to tools/.gen/sculpt/<species>.npz:
# the high-res meshes with paint, roughness and scale size, the teeth and claws, the eyes,
# the rig and its roles. The model is normalised as the browser normalises it: one unit
# long (or wide, for fliers), centred on x, standing on the ground.
# Usage: python3 tools/sculpt/sculpt.py [species ...]
import json, os, sys, time
import numpy as np
from anatomy import theropod, fish
from paint import paint
from sdf import mesh

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '.gen', 'creatures')
OUT = os.path.join(HERE, '..', '.gen', 'sculpt')
os.makedirs(OUT, exist_ok=True)
INDEX = json.load(open(os.path.join(SRC, 'index.json')))

THEROPODS = {'Player', 'Spinosaurus', 'Young_Spinosaurus', 'Rugops', 'Deltadromeus', 'Sauroniops', 'Bahariasaurus',
             'Carcharodontosaurus', 'Noasaurid', 'Dromaeosaur', 'Iguanodont'}
FISH = {'Mawsonia', 'Lungfish', 'Calamopleurus', 'Bawitius', 'Tribodus', 'Onchopristis', 'Obaichthys'}


def real_length(name):
    if name == 'Player':
        return 9.5
    for k, v in INDEX.items():
        if v['file'] == name:
            if v.get('bodyLength'):
                return v['bodyLength']
            L = 0.72 * v['weight'] ** (1 / 3)
            return L * 2.2 if v.get('flyer') else max(0.6, L)
    return 3.0


# The Spinosaurus of the game is a big, upright hunter: long powerful legs, a deep chest,
# a thick S-curved neck, robust clawed arms, and a ragged sail whose spines run on down a long tail.
SPINO = dict(hipH=0.36, bodyLen=0.31, bodyR=0.082, bodyH=0.105, chestDepth=1.15, chestDrop=0.012, bodyWidth=1.05,
             neckLen=0.17, neckR=0.046, neckUp=0.85, neckS=0.7, headLen=0.25, headH=0.075, headW=0.05, headTilt=0.35,
             skull=[1.05, 0.72, 0.55], skullWidth=[1.0, 0.7], teethSize=1.2, eyeScale=1.0,
             tailLen=0.64, tailR=0.06, tailDepth=1.25, tailBase=1.15, tailLift=0.03, tailFin=None, tailCrest=0.075,
             thighR=0.072, crouch=0.14, armLen=0.19, armR=0.028, clawScale=2.3, spineGap=0.016, spineLean=0.22,
             spots=None, stripes=False,
             colors={'body': '#6e5a3e', 'belly': '#cdb88e', 'back': '#3a2c1e', 'head': '#76603f', 'headTop': '#4a3a26',
                     'neck': '#6e5a3e', 'mouth': '#7a3328', 'claw': '#2a2218', 'shin': '#4e3e2a', 'sail': '#3e2c1c',
                     'stripe': '#c47a2c', 'eye': '#d8a020', 'arm': '#6e5a3e'})


# The wild spinosaurs follow Dani Navarro's 2024 reconstruction (University of Chicago): long
# low snout, a tall red crest over the eyes, a long S-curved neck, a rounded sail with orange
# streaks between the spines, moderately long legs and a long, deep, blotched paddle tail.
NAVARRO = dict(hipH=0.3, bodyLen=0.3, bodyR=0.07, bodyH=0.092, chestDepth=1.05, chestDrop=0.0, bodyWidth=1.0,
               neckLen=0.22, neckR=0.036, neckUp=1.05, neckS=1.0, headLen=0.29, headH=0.056, headW=0.036, headTilt=0.42,
               skull=[0.95, 0.58, 0.5], skullWidth=[0.95, 0.62], teethSize=1.1, eyeScale=1.0, headCrest=0.075, crest=None,
               tailLen=0.66, tailR=0.056, tailDepth=1.9, tailBase=1.0, tailLift=0.01, tailCrest=0.0,
               thighR=0.064, crouch=0.06, armLen=0.17, armR=0.022, clawScale=2.2, spineGap=0.015, spineLean=0.12,
               spots=None, stripes=False, navarro=True,
               colors={'body': '#5e5a66', 'belly': '#d6cbb2', 'back': '#3a3842', 'head': '#8a7a62', 'headTop': '#6a5a4a',
                       'neck': '#5e5a66', 'mouth': '#7a3a30', 'claw': '#26242a', 'shin': '#4a4652', 'sail': '#2a2830',
                       'eye': '#e0a830', 'arm': '#5e5a66', 'fin': '#4a4652'})


def build(name):
    data = json.load(open(os.path.join(SRC, name + '.json')))
    spec = data['spec']
    if name in ('Player', 'Spinosaurus', 'Young_Spinosaurus'):
        # the browser's spinosaur body plan, which has the right proportions, with a longer,
        # single smooth paddle tail and the detail laid over it
        spec = dict(spec)
        spec['tailLen'] = spec['tailLen'] * 1.4
        spec['tailFin'] = {'h': spec['tailFin']['h'] * 0.9, 'color': spec['tailFin'].get('color')}
        spec['spineGap'] = 0.015
        spec['spineLean'] = 0.15
        if name == 'Player':
            spec.update(colors=SPINO['colors'], spinoBands=True, spots=None, tailCrest=0.05, tailFin={'h': spec['tailFin']['h'] * 0.6})
            spec['sail'] = {**spec['sail'], 'streak': None}
        else:
            spec.update(colors=NAVARRO['colors'], navarro=True, headCrest=0.05 if name == 'Spinosaurus' else 0.03, crest=None, spots=None)
            spec['sail'] = {**spec['sail'], 'streak': None}
    colors = spec.get('colors', {})
    if name in THEROPODS:
        c = theropod(name, spec, colors)
    elif name in FISH:
        c = fish(name, spec, colors)
    else:
        return None
    t0 = time.time()
    # size and voxel from the sculpt's extent
    prims = c.body.array()
    lo = np.min(prims[:, 4:7] - prims[:, 17:18], axis=0)
    hi = np.max(prims[:, 4:7] + prims[:, 17:18], axis=0)
    ext = max(hi[0] - lo[0], (hi[1] - lo[1]) * 0.85)
    voxel = ext / (900 if name == 'Player' else 720)
    bv, bf, bn, bl = mesh(c.body, voxel)
    jv, jf, jn, jl = mesh(c.jaw, voxel) if c.jaw.prims else (np.zeros((0, 3), np.float32), np.zeros((0, 3), np.int32), np.zeros((0, 3), np.float32), np.zeros(0, np.int8))
    # normalise like the browser does: one unit long, centred on x, feet on the ground
    allv = np.vstack([bv, jv]) if len(jv) else bv
    L = max(allv[:, 0].max() - allv[:, 0].min(), (allv[:, 1].max() - allv[:, 1].min()) * 0.85)
    s = 1.0 / L
    cx = (allv[:, 0].max() + allv[:, 0].min()) / 2
    ground = 0.0 if c.gait != 'swim' else 0.0
    tf = lambda p: (np.asarray(p, float) - np.array([cx, 0, ground])) * s
    bv, jv = tf(bv).astype(np.float32), tf(jv).astype(np.float32)
    for k, (h, t_, par) in list(c.bones.items()):
        c.bones[k] = (tf(h), tf(t_), par)
    c.spine = [(tf(p), r) for p, r in c.spine]
    teeth = [([tf(p) for p in pts], [r * s for r in rad], bone, col) for pts, rad, bone, col in c.teeth]
    eyes = [(tf(cc), r * s, bone, iris, sd) for cc, r, bone, iris, sd in c.eyes]
    length_m = real_length(name)
    bc, br, bs = paint(c, bv, bn, bl)
    jc, jr, js = paint(c, jv, jn, jl) if len(jv) else (np.zeros((0, 3), np.float32), np.zeros(0, np.float32), np.zeros(0, np.float32))
    meta = {
        'species': data['species'], 'gait': c.gait, 'length_m': length_m, 'scales': c.paint.get('scales', 'reptile'), 'swimSpeed': data.get('swimSpeed'), 'flapSpeed': data.get('flapSpeed'),
        'bones': [{'name': b, 'head': c.bones[b][0].tolist(), 'tail': c.bones[b][1].tolist(), 'parent': c.bones[b][2]} for b in c.order],
        'roles': c.meta,
        'teeth': [{'pts': [p.tolist() for p in pts], 'r': rad, 'bone': bone, 'color': col} for pts, rad, bone, col in teeth],
        'eyes': [{'c': cc.tolist(), 'r': r, 'bone': bone, 'iris': iris, 'side': sd} for cc, r, bone, iris, sd in eyes],
    }
    np.savez_compressed(os.path.join(OUT, name + '.npz'), bv=bv, bf=bf, bn=bn, bl=bl, bc=bc, br=br, bs=bs,
                        jv=jv, jf=jf, jn=jn, jl=jl, jc=jc, jr=jr, js=js, meta=json.dumps(meta, default=float))
    print(f'SCULPTED {name}: body {len(bf)} tris, jaw {len(jf)} tris, {len(teeth)} teeth and claws in {time.time() - t0:.1f} s', flush=True)
    return c


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(THEROPODS | FISH)
    for n in names:
        build(n)
