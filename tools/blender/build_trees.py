# ==================== THE KEM KEM FOREST: TREES AND BIG PLANTS ====================
# Trees grown with the Modular Tree add-on (Blender extension "modular_tree", the m_tree library):
# a trunk and branch functions per species grow the skeleton, its manifold mesher skins it with
# bark UVs. The foliage is photo-scanned: twig, branchlet and frond cards composed from CC0 leaf
# scans by tools/compose_cards.py, laid along the thin branches, bent by their weight, their normals
# turned out from the crown so it shades as one mass. Tree ferns, cycads, ferns and horsetails are
# built directly from fronds and stems.
# Species (the browser's kinds, made Cenomanian):
#   conifer / darkConifer / mossConifer / giantConifer  cheirolepid conifers: scale-leaf sprays
#   araucaria / umbrella                              araucarias: tall bare trunks, whorled crowns
#   canopyBroadleaf / giantBroadleaf / gallery        early flowering trees, broad crowns
#   ginkgo / thicket / bush / mangrove                smaller flowering trees and shrubs
#   treeFern / cycad / bigFern / fern / fernClump     ferns and cycads from photo fronds
#   horsetails / dead                                 jointed Equisetum stems; bare dead trees
# For each kind and variant it writes godot/flora/<kind>_<v>.glb (full detail) and
# <kind>_<v>_lod1.glb (thinner trunk, fewer and bigger cards), all one unit tall, base at the
# origin; vertex colour alpha = how freely a point sways. Trees also get impostors: eight views
# round the tree in square 256 px frames, albedo + alpha and normal, the frame's size in model units
# in godot/flora/imp/impostors.json -> godot/flora/imp/<kind>_<v>_{albedo,normal}.png.
# Run: blender-4.5 -b -P tools/blender/build_trees.py -- [kind ...] [--preview] [--no-impostors | --impostors-only]
import bpy, bmesh, json, math, os, sys, zlib
import numpy as np
import addon_utils
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(ROOT, 'tools', '.gen', 'flora_src')
OUT = os.path.join(ROOT, 'godot', 'flora')
TEX = os.path.join(ROOT, 'tools', '.gen', 'cards')  # composed by tools/compose_cards.py
IMP = os.path.join(OUT, 'imp')
PREV = os.path.join(ROOT, 'tools', '.gen', 'previews')
for d in (OUT, IMP, PREV):
    os.makedirs(d, exist_ok=True)

addon_utils.enable('bl_ext.blender_org.modular_tree')
from m_tree import m_tree as M  # noqa: E402
from bl_ext.blender_org.modular_tree.python_classes.mesh_utils import create_mesh_from_cpp  # noqa: E402

UP = np.array([0.0, 0.0, 1.0])
VARIANTS = 3
BARK_BUDGET = (22000, 3500)  # triangles of trunk and limbs: full model, reduced model
PRUNE = (0.012, 0.05)  # branches thinner than this (metres) are left to the cards: full model, reduced model


# ------------------------------------------------------------------------------- m_tree skeleton
NESTED = {'start': ('distribution', 'start'), 'end': ('distribution', 'end'), 'density': ('distribution', 'density'),
          'phillotaxis': ('distribution', 'phillotaxis'), 'gravity': ('gravity', 'strength'), 'stiffness': ('gravity', 'stiffness'),
          'up_attraction': ('gravity', 'up_attraction'), 'split_proba': ('split', 'probability'), 'split_radius': ('split', 'radius'),
          'split_angle': ('split', 'angle'), 'crown': ('crown', 'shape'), 'crown_base': ('crown', 'base_size'),
          'crown_height': ('crown', 'height'), 'crown_angle': ('crown', 'angle_variation')}
WRAPPED = {'length', 'start_radius', 'randomness', 'start_angle'}


def curve(y0, y1, power=1.0):
    """A value that runs from y0 where a branch leaves its parent's base to y1 at its tip (a cone)."""
    c = M.SimpleCurveProperty()
    c.x_min, c.x_max, c.y_min, c.y_max, c.power = 0.0, 1.0, float(y0), float(y1), float(power)
    w = M.PropertyWrapper()
    w.set_simple_curve_property(c)
    return w


def branches(seed, children=(), **p):
    b = M.BranchFunction()
    b.seed = seed
    for k, v in p.items():
        if k in WRAPPED and not isinstance(v, M.PropertyWrapper):
            v = M.PropertyWrapper(M.ConstantProperty(float(v)))
        if k == 'crown':
            v = getattr(M.CrownShape, v)
        if k in NESTED:
            setattr(getattr(b, NESTED[k][0]), NESTED[k][1], v)
        else:
            setattr(b, k, v)
    for c in children:
        b.add_child(c)
    return b


def skeleton(name, trunk, branch_fn, radial=16, smooth=2):
    t = M.TrunkFunction()
    for k, v in trunk.items():
        setattr(t, k, v)
    if branch_fn is not None:
        t.add_child(branch_fn)
    tree = M.Tree()
    tree.set_trunk_function(t)
    tree.execute_functions()
    mesher = M.ManifoldMesher()
    mesher.radial_n_points = radial
    mesher.smooth_iterations = smooth
    cpp = mesher.mesh_tree(tree)
    me = bpy.data.meshes.new(name)
    create_mesh_from_cpp(me, cpp)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def attr(me, name, n=1):
    a = np.empty(len(me.vertices) * n, np.float32)
    me.attributes[name].data.foreach_get('vector' if n == 3 else 'value', a)
    return a.reshape(-1, n) if n == 3 else a


def twig_points(ob, max_radius, min_depth=1, min_extent=0.0):
    """Points on the centre line of the thin branches, with their direction, depth and radius."""
    me = ob.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    nrm = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('normal', nrm)
    nrm = nrm.reshape(-1, 3)
    r = attr(me, 'radius')
    d = attr(me, 'direction', 3)
    depth = attr(me, 'hierarchy_depth') if 'hierarchy_depth' in me.attributes else np.ones(len(r))
    ext = attr(me, 'branch_extent') if 'branch_extent' in me.attributes else np.ones(len(r))
    sel = (r < max_radius) & (depth >= min_depth) & (ext >= min_extent)
    centre = co - nrm * r[:, None]
    key = np.round(centre[sel] * 50).astype(np.int64)
    _, idx = np.unique(key, axis=0, return_index=True)
    s = np.nonzero(sel)[0][idx]
    return centre[s], d[s], depth[s], r[s], ext[s]


# ------------------------------------------------------------------------------- foliage cards
class Cards:
    """Quads (bent once along their length) collected into one mesh, with their UV cell and sway."""

    def __init__(self):
        self.v, self.f, self.uv, self.col, self.nrm = [], [], [], [], []

    def add(self, base, d, side, size, cell, droop=0.3, sway=1.0, aspect=1.0, normal=None, bend=None):
        d = d / (np.linalg.norm(d) + 1e-9)
        w = side - d * np.dot(side, d)
        w = w / (np.linalg.norm(w) + 1e-9) * size * aspect * 0.5
        mid = base + d * size * 0.5
        d2 = d - UP * droop
        d2 = d2 / (np.linalg.norm(d2) + 1e-9)
        tip = mid + d2 * size * 0.5
        if bend is not None:
            tip = tip + bend
        u0, v0, u1, v1 = cell
        n0 = len(self.v)
        for p, v in ((base, v0), (mid, (v0 + v1) * 0.5), (tip, v1)):
            self.v += [p - w, p + w]
            self.uv += [(u0, v), (u1, v)]
        self.f += [(n0, n0 + 1, n0 + 3, n0 + 2), (n0 + 2, n0 + 3, n0 + 5, n0 + 4)]
        self.col += [(1, 1, 1, sway * 0.6), (1, 1, 1, sway * 0.6), (1, 1, 1, sway * 0.85), (1, 1, 1, sway * 0.85),
                     (1, 1, 1, sway), (1, 1, 1, sway)]
        self.nrm += [normal if normal is not None else np.cross(d, w)] * 6

    def build(self, name, material):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        uv = me.uv_layers.new(name='UVMap')
        loops = np.array([li for f in self.f for li in f])
        uvs = np.array(self.uv, np.float32)[loops]
        uv.data.foreach_set('uv', uvs.reshape(-1))
        col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        col.data.foreach_set('color', np.array(self.col, np.float32).reshape(-1))
        me.materials.append(material)
        for p in me.polygons:
            p.use_smooth = True
        # crown normals: every card shades as part of the crown, not as a flat sheet
        ns = [Vector(n).normalized() for n in self.nrm]
        me.normals_split_custom_set_from_vertices(ns)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def cells(kind):
    """UV rectangles of the four cards in an atlas: four twigs in a 2x2 grid, or four fronds in a row."""
    if kind == 'twig4':
        return [(0.0, 0.5, 0.5, 1.0), (0.5, 0.5, 1.0, 1.0), (0.0, 0.0, 0.5, 0.5), (0.5, 0.0, 1.0, 0.5)]
    return [(k * 0.25, 0.0, (k + 1) * 0.25, 1.0) for k in range(4)]


# ------------------------------------------------------------------------------- materials
MATS = {}


def image(path, color=True):
    im = bpy.data.images.load(path, check_existing=True)
    if not color:
        im.colorspace_settings.name = 'Non-Color'
    return im


def bark_material(tex):
    key = 'bark:' + tex
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = image(os.path.join(SRC, tex, 'diff.jpg'))
    nt.links.new(tx.outputs['Color'], bsdf.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = image(os.path.join(SRC, tex, 'nor.jpg'), False)
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = 0.9
    MATS[key] = m
    return m


def leaf_material(atlas):
    key = 'leaf:' + atlas
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = image(os.path.join(TEX, atlas + '_albedo.png'))
    nt.links.new(tx.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tx.outputs['Alpha'], bsdf.inputs['Alpha'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = image(os.path.join(TEX, atlas + '_normal.png'), False)
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = 0.6
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.15
    m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
    MATS[key] = m
    return m


# ------------------------------------------------------------------------------- species
def foliage(ob, atlas, n, size, max_radius, rng, droop=0.35, outward=0.5, min_depth=1, aspect=1.0, scatter=0.25,
            down=0.0, min_extent=0.0):
    """Lay n twig cards from an atlas along a skeleton's thin branches."""
    pts, dirs, depth, rad, ext = twig_points(ob, max_radius, min_depth, min_extent)
    if len(pts) == 0:
        return None
    zmin, zmax = pts[:, 2].min(), pts[:, 2].max()
    crown_c = np.array([0.0, 0.0, (zmin + zmax) * 0.55])
    crown_r = max(1e-3, np.linalg.norm((pts - crown_c)[:, :2], axis=1).max())
    w = (1.2 - np.clip(rad / max_radius, 0, 1)) * (0.4 + ext)
    pick = rng.choice(len(pts), n, p=w / w.sum())
    cs = cells(json.load(open(os.path.join(TEX, 'cards.json')))[atlas]['cells'])
    cards = Cards()
    for i in pick:
        p = pts[i] + rng.normal(0, scatter * size * 0.3, 3)
        out = np.array([p[0], p[1], 0.0])
        out = out / (np.linalg.norm(out) + 1e-6)
        d = dirs[i] / (np.linalg.norm(dirs[i]) + 1e-6) + out * outward + rng.normal(0, scatter, 3) - UP * down
        side = np.cross(d, UP) + rng.normal(0, 0.6, 3)
        nrm = (p - crown_c) / (np.linalg.norm(p - crown_c) + 1e-6) + UP * 0.35
        sway = 0.35 + 0.65 * min(1.0, np.linalg.norm(p[:2]) / crown_r)
        cards.add(p, d, side, size * rng.uniform(0.8, 1.2), cs[rng.integers(4)], droop=droop, sway=sway, aspect=aspect, normal=nrm)
    return cards.build(ob.name + '_leaves', leaf_material(atlas))


def bark_sway(ob):
    """How freely the bark moves in the wind (vertex colour alpha): the foot is still, the thin
    branches high up move most."""
    me = ob.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    r = attr(me, 'radius')
    h = max(co[:, 2].max(), 1e-3)
    a = np.clip((co[:, 2] / h) ** 2 * 0.3 * (1.0 - np.clip(r / r.max(), 0, 1)) + (1.0 - np.clip(r / 0.05, 0, 1)) * 0.25, 0, 0.6)
    col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    rgba = np.ones((len(a), 4), np.float32)
    rgba[:, 3] = a
    col.data.foreach_set('color', rgba.reshape(-1))


def prune(ob, min_radius):
    """Delete the branches thinner than min_radius (metres, before scaling)."""
    me = ob.data
    r = attr(me, 'radius')
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    gone = [v for v in bm.verts if r[v.index] < min_radius]
    bmesh.ops.delete(bm, geom=gone, context='VERTS')
    bm.to_mesh(me)
    bm.free()


def tree_variant(kind, v, spec, rng, lod):
    """A skeleton and its foliage, for full detail (lod 0) or the reduced model (lod 1)."""
    seed = int(rng.integers(1, 10_000))
    tr = dict(spec['trunk'])
    tr['seed'] = seed
    ob = skeleton(f'{kind}_{v}', tr, spec['branches'](seed), radial=spec.get('radial', 16) if lod == 0 else 6,
                  smooth=2 if lod == 0 else 0)
    obs = [ob]
    ob.data.materials.append(bark_material(spec['bark']))
    bark_sway(ob)
    # the foliage goes on first, while the skeleton still has its finest twigs to sit on
    for f in spec.get('foliage', []):
        f = dict(f)
        if lod == 1:
            f['n'] = int(f['n'] * 0.4)
            f['size'] = f['size'] * 1.45
        lv = foliage(ob, rng=np.random.default_rng(seed + 7), **f)
        if lv:
            obs.append(lv)
    # then the twigs the cards hide go, and the decimator brings the bark to its triangle budget
    prune(ob, PRUNE[lod] if spec.get('foliage') else PRUNE[lod] * 0.5)
    budget = BARK_BUDGET[lod]
    if tris(ob) > budget:
        dec = ob.modifiers.new('d', 'DECIMATE')
        dec.ratio = budget / tris(ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier='d')
    return obs


def conifer_branches(scale=1.0, droop=10, density=1.1, start=0.2, breaks=0.03):
    """Tiers of near-level limbs, longest low down, shortening to the leader: a cone."""
    def f(seed):
        twigs = branches(seed + 2, length=curve(3.2 * scale, 1.2 * scale), start=0.08, end=0.95, density=2.2, start_angle=62,
                         randomness=0.45, flatness=0.85, up_attraction=0.0, gravity=droop * 1.6, stiffness=0.08,
                         split_proba=0.1, start_radius=0.5, end_radius=0.02, break_chance=0.0, resolution=2)
        return branches(seed + 1, children=[twigs], length=curve(10.0 * scale, 1.6 * scale, 1.2), start=start, end=0.98,
                        density=density, start_angle=82, randomness=0.5, flatness=0.5, up_attraction=0.02, gravity=droop,
                        stiffness=0.12, split_proba=0.08, split_angle=25, phillotaxis=137.5, start_radius=0.3,
                        end_radius=0.03, break_chance=breaks, resolution=2)
    return f


def araucaria_branches(scale=1.0, start=0.55, up=0.22, density=1.0):
    """A clear bole, then near-horizontal limbs in loose whorls that turn up at their ends, hung with
    rope-like branchlets: the araucaria's tiered crown."""
    def f(seed):
        twigs = branches(seed + 2, length=curve(2.2 * scale, 0.9 * scale), start=0.05, end=0.98, density=3.6, start_angle=72,
                         randomness=0.35, flatness=0.9, up_attraction=0.0, gravity=16, stiffness=0.05, split_proba=0.0,
                         start_radius=0.4, end_radius=0.02, break_chance=0.0, resolution=2)
        return branches(seed + 1, children=[twigs], length=curve(11.0 * scale, 2.0 * scale, 0.8), start=start, end=0.99,
                        density=density, start_angle=88, randomness=0.3, flatness=0.6, up_attraction=up, gravity=3,
                        stiffness=0.3, split_proba=0.0, phillotaxis=137.5, start_radius=0.25, end_radius=0.03,
                        break_chance=0.02, resolution=3)
    return f


def broad_branches(scale=1.0, up=0.35, split=0.45, density=1.2, start=0.3, spread=48):
    """Few big limbs that fork and fork again; the leafy twig cards stand in for the finest twigs, so
    the skeleton stops at the branchlets that carry them: a broad, open crown."""
    def f(seed):
        limbs = branches(seed + 2, length=curve(5.0 * scale, 2.2 * scale), start=0.15, end=0.95,
                         density=1.6, start_angle=42, randomness=0.5, flatness=0.3, up_attraction=up, gravity=3,
                         stiffness=0.25, split_proba=0.3, split_angle=30, start_radius=0.55, end_radius=0.05, resolution=2)
        return branches(seed + 1, children=[limbs], length=curve(9.0 * scale, 4.0 * scale), start=start, end=1.0,
                        density=density, start_angle=spread, randomness=0.6, flatness=0.2, up_attraction=up, gravity=2,
                        stiffness=0.3, split_proba=split, split_angle=35, start_radius=0.6, end_radius=0.06, resolution=3)
    return f


def shrub_branches(scale=1.0, density=6.0):
    """Many stems from the base, arching up and out."""
    def f(seed):
        twigs = branches(seed + 2, length=curve(0.9 * scale, 0.4 * scale), start=0.2, end=0.95, density=4.0, start_angle=45,
                         randomness=0.5, flatness=0.2, up_attraction=0.3, gravity=3, stiffness=0.2, split_proba=0.1,
                         start_radius=0.5, end_radius=0.05, resolution=2)
        return branches(seed + 1, children=[twigs], length=curve(3.0 * scale, 2.0 * scale), start=0.0, end=0.6,
                        density=density, start_angle=35, randomness=0.6, flatness=0.1, up_attraction=0.45, gravity=4,
                        stiffness=0.25, split_proba=0.3, split_angle=25, start_radius=0.7, end_radius=0.08, resolution=2)
    return f


def conifer(length, radius, bark, scale=1.0, n=2400, size=2.1, droop=0.5, density=1.1, start=0.2, tint=None):
    return {'trunk': dict(length=length, start_radius=radius, end_radius=0.04, shape=0.9, up_attraction=0.7, resolution=4,
                          randomness=0.15),
            'branches': conifer_branches(scale, 10 + droop * 8, density, start), 'bark': bark, 'radial': 10,
            'foliage': [dict(atlas='conifer_spray', n=n, size=size, max_radius=0.035, droop=droop, outward=0.35)]}


def broadleaf(length, radius, bark, atlas, scale=1.0, n=3400, size=1.8, up=0.35, split=0.45, start=0.3, spread=48):
    return {'trunk': dict(length=length, start_radius=radius, end_radius=0.08, shape=0.6, up_attraction=0.5, resolution=4,
                          randomness=0.4),
            'branches': broad_branches(scale, up, split, 1.2, start, spread), 'bark': bark, 'radial': 10,
            'foliage': [dict(atlas=atlas, n=n, size=size, max_radius=0.09, droop=0.25, outward=0.6, scatter=0.45)]}


SPECIES = {
    'conifer': conifer(28, 0.55, 'metasequoia_bark'),
    'darkConifer': conifer(30, 0.6, 'japanese_cedar_bark', density=1.5, n=3000, droop=0.6),
    'mossConifer': conifer(28, 0.6, 'moss_wood', droop=0.85, n=2600, size=2.3),
    'giantConifer': conifer(52, 1.3, 'metasequoia_bark', scale=1.45, n=3600, size=2.6, start=0.38),
    'araucaria': {'trunk': dict(length=34, start_radius=0.6, end_radius=0.05, shape=0.8, up_attraction=0.9, resolution=4,
                                randomness=0.08),
                  'branches': araucaria_branches(density=0.75), 'bark': 'pine_bark', 'radial': 10,
                  'foliage': [dict(atlas='araucaria_twig', n=2200, size=1.8, max_radius=0.05, droop=0.6, outward=0.3)]},
    'umbrella': {'trunk': dict(length=12, start_radius=0.32, end_radius=0.05, shape=0.8, up_attraction=0.8, resolution=4,
                               randomness=0.2),
                 'branches': araucaria_branches(0.75, start=0.62, up=0.12, density=1.6), 'bark': 'pine_bark', 'radial': 10,
                 'foliage': [dict(atlas='araucaria_twig', n=1500, size=1.4, max_radius=0.05, droop=0.4, outward=0.4)]},
    'canopyBroadleaf': broadleaf(12, 0.6, 'bark_brown_02', 'broadleaf_twig'),
    'giantBroadleaf': broadleaf(18, 1.0, 'bark_brown_02', 'broadleaf_twig', scale=1.4, n=4600, size=2.1),
    'gallery': broadleaf(14, 0.7, 'eucalyptus_bark', 'magnolia_twig', scale=1.15, n=3600, size=1.9, up=0.45),
    'ginkgo': broadleaf(12, 0.4, 'bark_brown_02', 'magnolia_twig', scale=0.6, n=1800, size=1.3, up=0.6, split=0.25, spread=35),
    'mangrove': broadleaf(6, 0.3, 'bark_brown_02', 'magnolia_twig', scale=0.6, n=1800, size=1.4, up=0.3, start=0.4),
    'thicket': {'trunk': dict(length=2.5, start_radius=0.12, end_radius=0.03, shape=0.6, up_attraction=0.4, resolution=3,
                              randomness=0.5),
                'branches': shrub_branches(1.4, 7.0), 'bark': 'bark_brown_02', 'radial': 6,
                'foliage': [dict(atlas='magnolia_twig', n=900, size=0.9, max_radius=0.03, droop=0.2, outward=0.5)]},
    'bush': {'trunk': dict(length=1.2, start_radius=0.06, end_radius=0.02, shape=0.6, up_attraction=0.4, resolution=3,
                           randomness=0.5),
             'branches': shrub_branches(0.7, 6.0), 'bark': 'bark_brown_02', 'radial': 6,
             'foliage': [dict(atlas='broadleaf_twig', n=420, size=0.6, max_radius=0.025, droop=0.2, outward=0.5)]},
    'dead': {'trunk': dict(length=14, start_radius=0.45, end_radius=0.05, shape=0.8, up_attraction=0.6, resolution=4,
                           randomness=0.3),
             'branches': conifer_branches(0.6, 6, 0.8, 0.25, 0.35), 'bark': 'moss_wood', 'radial': 8},
}
# what draws far off as an impostor
FAR = ['conifer', 'darkConifer', 'mossConifer', 'giantConifer', 'araucaria', 'umbrella', 'canopyBroadleaf', 'giantBroadleaf',
       'gallery', 'ginkgo', 'mangrove', 'thicket', 'dead', 'treeFern']


# ------------------------------------------------------------------------------- plants from fronds and stems
def tube(name, pts, radii, sides, material, v_repeat=1.0, sway_h=1.0):
    """A tube along a polyline, with bark UVs (u round, v along it at the texture's natural scale)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    col = bm.verts.layers.float_color.new('Col')
    rings = []
    v_at = [0.0]
    for i in range(1, len(pts)):
        v_at.append(v_at[-1] + np.linalg.norm(pts[i] - pts[i - 1]) / (2 * math.pi * max(radii[i], 1e-3)) * v_repeat)
    for i, (p, r) in enumerate(zip(pts, radii)):
        d = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        d = d / (np.linalg.norm(d) + 1e-9)
        a = np.cross(d, [0.0, 1.0, 0.0] if abs(d[1]) < 0.9 else [1.0, 0.0, 0.0])
        a /= np.linalg.norm(a)
        b = np.cross(d, a)
        ring = []
        for k in range(sides + 1):
            t = 2 * math.pi * k / sides
            v = bm.verts.new(tuple(p + (a * math.cos(t) + b * math.sin(t)) * r))
            v[col] = (1, 1, 1, min(1.0, (p[2] / max(sway_h, 1e-3)) ** 2 * 0.3))
            ring.append(v)
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]))
            for li, (ui, vi) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                li[uvl].uv = (ui / sides, v_at[vi])
            f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


class Strips(Cards):
    """Fronds: long cards along a curved rachis, folded into a shallow V so they hold their shape side-on."""

    def strip(self, pts, side, width, cell, fold=0.25, sway0=0.2, nrm_up=0.5):
        u0, v0, u1, v1 = cell
        n = len(pts)
        n0 = len(self.v)
        for i, p in enumerate(pts):
            t = i / (n - 1)
            d = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
            d = d / (np.linalg.norm(d) + 1e-9)
            w = side - d * np.dot(side, d)
            w = w / (np.linalg.norm(w) + 1e-9) * width * 0.5
            up = np.cross(w, d)
            up = up / (np.linalg.norm(up) + 1e-9)
            drop = -up * width * fold * 0.5
            v = v0 + (v1 - v0) * t
            self.v += [p - w + drop, p.copy(), p + w + drop]
            self.uv += [(u0, v), ((u0 + u1) * 0.5, v), (u1, v)]
            sw = sway0 + (1 - sway0) * t
            self.col += [(1, 1, 1, sw)] * 3
            nn = up * nrm_up + d * 0.1
            self.nrm += [nn - w * 0.6, nn, nn + w * 0.6]
        for i in range(n - 1):
            a = n0 + i * 3
            self.f += [(a, a + 1, a + 4, a + 3), (a + 1, a + 2, a + 5, a + 4)]


def arch(base, d0, length, droop, n=12, twist=0.0):
    """Points of a frond arching out from its base and bowing under its weight."""
    pts, p, d = [], np.array(base, float), np.array(d0, float) / np.linalg.norm(d0)
    step = length / (n - 1)
    for i in range(n):
        pts.append(p.copy())
        d = d - UP * droop * step / length * 2.2
        d = d / np.linalg.norm(d)
        p = p + d * step
    return np.array(pts)


def rosette(strips, centre, n, length, pitch, droop, atlas_cells, rng, width_k=0.26, rise=0.0, fold=0.3):
    for k in range(n):
        az = 2 * math.pi * k / n + rng.uniform(-0.25, 0.25)
        pt = math.radians(pitch + rng.uniform(-12, 12))
        d0 = np.array([math.cos(az) * math.cos(pt), math.sin(az) * math.cos(pt), math.sin(pt)])
        L = length * rng.uniform(0.75, 1.1)
        pts = arch(np.array(centre) + UP * rise, d0, L, droop * rng.uniform(0.8, 1.2))
        side = np.array([-math.sin(az), math.cos(az), 0.0])
        strips.strip(pts, side, L * width_k, atlas_cells[rng.integers(4)], fold=fold)


def tree_fern(v, rng, lod):
    H = 7.0
    th = H * rng.uniform(0.5, 0.62)
    lean = rng.normal(0, 0.07, 2)
    zs = np.linspace(0, th, 14)
    pts = np.array([[lean[0] * (z / th) ** 1.5 * th, lean[1] * (z / th) ** 1.5 * th, z] for z in zs])
    # a flared root mantle, a thick fibrous stem, swelling a little under the crown
    radii = [0.42 if i == 0 else 0.32 if i == 1 else 0.24 + 0.03 * (i / 13) ** 3 for i in range(14)]
    obs = [tube(f'treeFern_{v}', np.vstack([pts, pts[-1] + UP * 0.12]), radii + [0.05], 12 if lod == 0 else 6,
                bark_material('palm_bark'), 0.45, H)]
    top = pts[-1]
    cs = cells('frond4')
    fr = Strips()
    rosette(fr, top, 18 if lod == 0 else 11, H * 0.5, 58, 0.75, cs, rng, width_k=0.34, rise=0.08)
    rosette(fr, top, 5 if lod == 0 else 3, H * 0.3, 80, 0.3, cs, rng, width_k=0.3, rise=0.1)
    obs.append(fr.build(f'treeFern_{v}_fronds', leaf_material('fern_frond')))
    dead = Strips()
    for k in range(9 if lod == 0 else 5):
        az = 2 * math.pi * k / 9 + rng.uniform(-0.3, 0.3)
        d0 = np.array([math.cos(az) * 0.45, math.sin(az) * 0.45, -1.0])
        p = arch(top - UP * 0.15, d0, H * 0.3, -0.15, 8)
        dead.strip(p, np.array([-math.sin(az), math.cos(az), 0.0]), H * 0.09, cs[rng.integers(4)], fold=0.1, sway0=0.1)
    obs.append(dead.build(f'treeFern_{v}_dead', leaf_material('dead_frond')))
    return obs


def cycad(v, rng, lod):
    H = 3.5
    th = H * rng.uniform(0.3, 0.42)
    pts = np.array([[0, 0, z] for z in np.linspace(0, th, 8)])
    radii = [0.36 - 0.1 * (z / th) ** 2 for z in np.linspace(0, th, 8)]
    obs = [tube(f'cycad_{v}', pts, radii, 12 if lod == 0 else 6, bark_material('palm_bark'), 0.6, H)]
    fr = Strips()
    cs = cells('frond4')
    rosette(fr, pts[-1], 26 if lod == 0 else 14, H * 0.55, 42, 0.25, cs, rng, width_k=0.22, fold=0.35)
    rosette(fr, pts[-1] - UP * 0.15, 8 if lod == 0 else 4, H * 0.5, 5, 0.45, cs, rng, width_k=0.22, fold=0.35)
    obs.append(fr.build(f'cycad_{v}_leaves', leaf_material('cycad_leaf')))
    return obs


def fern_clump(name, H, n_fronds, rosettes, spread, pitch, rng, lod):
    fr = Strips()
    cs = cells('frond4')
    for r in range(rosettes):
        c = np.array([*(rng.normal(0, spread, 2) if r else (0.0, 0.0)), 0.0])
        rosette(fr, c, n_fronds if lod == 0 else max(4, n_fronds // 2), H * 0.95, pitch, 0.7, cs, rng, width_k=0.3, fold=0.3)
    return [fr.build(name, leaf_material('fern_frond'))]


def horsetails(v, rng, lod):
    H = 3.0
    stems = []
    mat = stem_material('horsetail')
    for k in range(26 if lod == 0 else 12):
        c = rng.normal(0, 0.35, 2)
        h = H * rng.uniform(0.55, 1.0)
        lean = rng.normal(0, 0.08, 2)
        pts = np.array([[c[0] + lean[0] * z, c[1] + lean[1] * z, z] for z in np.linspace(0, h, 8)])
        r = 0.018 * H
        stems.append(tube(f'ht{k}', pts, [r * (1 - 0.6 * z / h) for z in pts[:, 2]], 6 if lod == 0 else 4, mat, 1.0, H))
        if lod == 0:
            for z in np.arange(0.25, 0.9, 0.11) * h:
                base = np.array([c[0] + lean[0] * z, c[1] + lean[1] * z, z])
                for j in range(7):
                    az = 2 * math.pi * j / 7 + rng.uniform(-0.2, 0.2)
                    d = np.array([math.cos(az), math.sin(az), 0.9])
                    L = 0.09 * H * (1.2 - z / h)
                    bp = np.array([base, base + d / np.linalg.norm(d) * L])
                    stems.append(tube(f'hb{k}', bp, [0.004 * H, 0.0015 * H], 3, mat, 1.0, H))
    return stems


def stem_material(tex):
    key = 'stem:' + tex
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = image(os.path.join(TEX, tex + '_albedo.png'))
    nt.links.new(tx.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    MATS[key] = m
    return m


def stilt_roots(rng, n=10, height=2.6, reach=2.6):
    roots = []
    for k in range(n):
        az = 2 * math.pi * k / n + rng.uniform(-0.2, 0.2)
        h = height * rng.uniform(0.6, 1.0)
        rr = reach * rng.uniform(0.7, 1.1)
        pts = np.array([[math.cos(az) * rr * (1 - (1 - t) ** 2) * 1.0, math.sin(az) * rr * (1 - (1 - t) ** 2), h * (1 - t ** 1.6)]
                        for t in np.linspace(0, 1, 10)])
        roots.append(tube(f'root{k}', pts, [0.07 + 0.02 * t for t in np.linspace(0, 1, 10)], 6, bark_material('bark_brown_02'), 0.5))
    return roots


BUILDERS = {
    'treeFern': tree_fern, 'cycad': cycad, 'horsetails': horsetails,
    'bigFern': lambda v, rng, lod: fern_clump(f'bigFern_{v}', 3.2, 12, 1, 0.0, 58, rng, lod),
    'fern': lambda v, rng, lod: fern_clump(f'fern_{v}', 1.8, 9, 1, 0.0, 55, rng, lod),
    'fernClump': lambda v, rng, lod: fern_clump(f'fernClump_{v}', 5.0, 10, 4, 1.4, 62, rng, lod),
}


# ------------------------------------------------------------------------------- impostors
IMP_FRAMES = 8
IMP_H = 256  # square frames, the same for every tree, so all impostors stack into one texture array


def impostor(ob, name):
    """Eight views round a model (one unit tall, base at the origin), albedo + alpha and normal, laid
    side by side: what a tree looks like from every side, for drawing it far off on a single card.
    The normals are in the model's own space, Godot's axes (y up), so lighting turns with the tree."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = 6
    scn.cycles.use_denoising = False
    scn.cycles.transparent_max_bounces = 48
    scn.cycles.max_bounces = 2
    scn.render.film_transparent = True
    co = np.array([v.co for v in ob.data.vertices])
    half = max(np.abs(co[:, 0]).max(), np.abs(co[:, 1]).max()) * 1.03
    size = max(1.0, 2 * half)  # a frame is size x size model units, base at its bottom edge (the model is one unit tall)
    fw = IMP_H
    scn.render.resolution_x, scn.render.resolution_y = fw, IMP_H
    cam = bpy.data.objects.new('impcam', bpy.data.cameras.new('impcam'))
    scn.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = size
    cam.data.clip_start, cam.data.clip_end = 0.1, 100
    scn.camera = cam
    for o in scn.objects:
        o.hide_render = o.type == 'MESH' and o != ob
    originals = [s.material for s in ob.material_slots]
    # the middle of each material's geometry: the leaves' normals in the views are turned out from it
    mi = np.empty(len(ob.data.polygons), np.int32)
    ob.data.polygons.foreach_get('material_index', mi)
    centres = []
    for k in range(len(originals)):
        vs = [ob.data.vertices[v].co for p in np.nonzero(mi == k)[0][::7] for v in ob.data.polygons[p].vertices]
        centres.append(tuple(np.mean(vs, axis=0)) if vs else (0.0, 0.0, 0.5))
    out = {}
    for pass_name in ('albedo', 'normal'):
        scn.view_settings.view_transform = 'Standard' if pass_name == 'albedo' else 'Raw'
        for slot, m, c in zip(ob.material_slots, originals, centres):
            slot.material = _imp_material(m, pass_name, c)
        frames = []
        for k in range(IMP_FRAMES):
            a = 2 * math.pi * k / IMP_FRAMES
            # Godot looks down -z; frame k is seen from yaw a, i.e. from the direction (sin a, cos a) in Godot's x/z,
            # which is (sin a, -cos a) in Blender's x/y
            cam.location = (math.sin(a) * 30, -math.cos(a) * 30, size * 0.5)
            cam.rotation_euler = (math.radians(90), 0, a)
            path = os.path.join(PREV, f'_imp_{pass_name}_{k}.png')
            scn.render.filepath = path
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(path)
            px = np.empty(fw * IMP_H * 4, np.float32)
            im.pixels.foreach_get(px)
            frames.append(px.reshape(IMP_H, fw, 4))
            bpy.data.images.remove(im)
        out[pass_name] = np.concatenate(frames, axis=1)
    for slot, m in zip(ob.material_slots, originals):
        slot.material = m
    for pass_name, px in out.items():
        if pass_name == 'normal':
            px = px.copy()
            px[..., 3] = out['albedo'][..., 3]
        im = bpy.data.images.new(name + pass_name, px.shape[1], px.shape[0], alpha=True)
        im.colorspace_settings.name = 'Non-Color'  # the rendered pixels are already what goes in the file
        im.pixels.foreach_set(px.reshape(-1))
        im.filepath_raw = os.path.join(IMP, f'{name}_{pass_name}.png')
        im.file_format = 'PNG'
        im.save()
    bpy.data.objects.remove(cam)
    return size


def _imp_material(m, pass_name, centre):
    key = f'{m.name}#{pass_name}#{centre[2]:.3f}'
    if key in bpy.data.materials:
        return bpy.data.materials[key]
    nm = bpy.data.materials.new(key)
    nm.use_nodes = True
    nt = nm.node_tree
    nt.nodes.clear()
    outn = nt.nodes.new('ShaderNodeOutputMaterial')
    src = {n.image.name: n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}
    col_img = next((n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name != 'Non-Color'), None)
    nrm_img = next((n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'Non-Color'), None)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = col_img
    em = nt.nodes.new('ShaderNodeEmission')
    if pass_name == 'albedo':
        nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    else:
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        geo_n = geo.outputs['Normal']
        if m.name.startswith('leaf:'):
            # a crown shades as one mass: its normal points out from the middle of the foliage (a little
            # upward), as the cards' own normals did in the model; Cycles would flip back-facing cards
            off = nt.nodes.new('ShaderNodeVectorMath')
            off.operation = 'SUBTRACT'
            off.inputs[1].default_value = centre
            nt.links.new(geo.outputs['Position'], off.inputs[0])
            sq = nt.nodes.new('ShaderNodeVectorMath')
            sq.operation = 'MULTIPLY_ADD'
            sq.inputs[1].default_value = (1.0, 1.0, 0.7)
            sq.inputs[2].default_value = (0.0, 0.0, 0.08)
            nt.links.new(off.outputs['Vector'], sq.inputs[0])
            crown = nt.nodes.new('ShaderNodeVectorMath')
            crown.operation = 'NORMALIZE'
            nt.links.new(sq.outputs['Vector'], crown.inputs[0])
            geo_n = crown.outputs['Vector']
        elif nrm_img is not None:
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = nrm_img
            nmap = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(tn.outputs['Color'], nmap.inputs['Color'])
            geo_n = nmap.outputs['Normal']
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(geo_n, sep.inputs['Vector'])
        neg = nt.nodes.new('ShaderNodeMath')
        neg.operation = 'MULTIPLY'
        neg.inputs[1].default_value = -1.0
        nt.links.new(sep.outputs['Y'], neg.inputs[0])
        comb = nt.nodes.new('ShaderNodeCombineXYZ')  # Blender (x, y, z) -> Godot (x, z, -y)
        nt.links.new(sep.outputs['X'], comb.inputs['X'])
        nt.links.new(sep.outputs['Z'], comb.inputs['Y'])
        nt.links.new(neg.outputs[0], comb.inputs['Z'])
        sc = nt.nodes.new('ShaderNodeVectorMath')
        sc.operation = 'MULTIPLY_ADD'
        sc.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(comb.outputs['Vector'], sc.inputs[0])
        nt.links.new(sc.outputs['Vector'], em.inputs['Color'])
    if m.name.startswith('leaf:'):
        mix = nt.nodes.new('ShaderNodeMixShader')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        nt.links.new(tex.outputs['Alpha'], mix.inputs['Fac'])
        nt.links.new(tr.outputs['BSDF'], mix.inputs[1])
        nt.links.new(em.outputs['Emission'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], outn.inputs['Surface'])
    else:
        nt.links.new(em.outputs['Emission'], outn.inputs['Surface'])
    return nm


# ------------------------------------------------------------------------------- output
def finish(obs, height=None):
    """Join, put the base at the origin and scale to one unit tall."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    zs = [v.co.z for v in ob.data.vertices]
    h = height or (max(zs) - min(zs))
    ob.data.transform(Matrix.Translation((0, 0, -min(zs))))
    ob.data.transform(Matrix.Scale(1.0 / h, 4))
    return ob


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def export(ob, path):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_vertex_color='ACTIVE', export_normals=True,
                              export_tangents=True, export_image_format='NONE')


def preview(ob, name, size=900):
    """A quick Cycles render of a model against the sky, for checking a species."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = 24
    scn.cycles.use_denoising = True
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.view_settings.view_transform = 'AgX'
    w = scn.world or bpy.data.worlds.new('w')
    scn.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.68, 0.85, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sun = bpy.data.objects.get('sun') or bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    if sun.name not in scn.collection.objects:
        scn.collection.objects.link(sun)
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    if cam.name not in scn.collection.objects:
        scn.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.15
    cam.location = (0, -10, 0.52)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scn.camera = cam
    for o in scn.objects:
        o.hide_render = o.type == 'MESH' and o != ob
    scn.render.filepath = os.path.join(PREV, f'tree_{name}.png')
    bpy.ops.render.render(write_still=True)


def build(kind, do_preview, do_impostors, only_impostors=False):
    meta = {}
    if only_impostors and kind not in FAR:
        return
    for v in range(VARIANTS):
        for lod in ((0,) if only_impostors else (0, 1)):
            bpy.ops.wm.read_factory_settings(use_empty=True)
            addon_utils.enable('bl_ext.blender_org.modular_tree')
            MATS.clear()
            rng = np.random.default_rng(zlib.crc32(f"{kind}:{v}".encode()))
            if kind in SPECIES:
                obs = tree_variant(kind, v, SPECIES[kind], rng, lod)
                if kind == 'mangrove':
                    obs += stilt_roots(np.random.default_rng(v))
            else:
                obs = BUILDERS[kind](v, rng, lod)
            ob = finish(obs)
            if not only_impostors:
                export(ob, os.path.join(OUT, f'{kind}_{v}' + ('_lod1' if lod else '') + '.glb'))
                print(f'TREE {kind}_{v} lod{lod}: {tris(ob)} tris', flush=True)
            if do_preview and lod == 0 and v == 0:
                preview(ob, kind)
            if do_impostors and lod == 0 and kind in FAR:
                meta[f'{kind}_{v}'] = {'size': round(impostor(ob, f'{kind}_{v}'), 4), 'frames': IMP_FRAMES}
    if meta:
        path = os.path.join(IMP, 'impostors.json')
        allm = json.load(open(path)) if os.path.exists(path) else {}
        allm.update(meta)
        json.dump(allm, open(path, 'w'), indent=1)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    kinds = [a for a in argv if not a.startswith('--')] or list(SPECIES) + list(BUILDERS)
    for k in kinds:
        build(k, '--preview' in argv, '--no-impostors' not in argv, '--impostors-only' in argv)
