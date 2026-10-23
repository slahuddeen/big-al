# ==================== THE ROAM FLORA, GROWN IN BLENDER ====================
# Every plant prototype the browser game scatters (src/roam/terrain.js PROTOS) rebuilt as a
# detailed game mesh for Godot, one unit tall like the browser's prototypes, three variants each.
#   * trees grow their architecture with the Sapling Tree Gen extension (trunk, limbs, twigs and
#     leaf placement); their splines are skinned here with tapered bark tubes whose side count
#     follows the limb radius, and Sapling's leaves become cards from the foliage atlas
#   * cycads, tree ferns, ferns, horsetails, reeds, sedges, grasses, flowers, lily pads, mangroves
#     and thickets are built from fronds and cards with bmesh
#   * termite mounds are displaced with Blender's procedural textures and decimated, bones and
#     logs are lofted (rocks are Poly Haven scans: tools/blender/prep_polyhaven.py)
# Vertex colour: rgb = tint (petal colour for flowers), alpha = how far the point sways in the wind.
# Leaf normals are bent away from the crown so foliage shades as a volume.
# Writes godot/flora/<kind>_<variant>.glb. Run: blender -b -P tools/blender/build_flora.py -- [kind ...] [--preview]
import bpy, bmesh, ast, math, os, sys, random
import addon_utils
from mathutils import Vector, Matrix, noise
from mathutils.geometry import interpolate_bezier

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'godot', 'flora')
PREVIEW = os.path.join(HERE, '..', '.gen', 'flora_previews')
TEX = os.path.join(HERE, '..', '..', 'godot', 'textures')
SAPLING = None
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
want_preview = '--preview' in argv
only = [a for a in argv if not a.startswith('--')]

# foliage atlas cells (tools/textures.py)
CONIFER, ARAUCARIA, BROADLEAF, GINKGO, FROND, CYCAD, GRASS, REED, HORSETAIL, FLOWERS, LILY, MOSS, LITTER, SHRUB, TREEFERN, DARKLEAF = range(16)
MATS = ['leaf', 'bark_conifer', 'bark_smooth', 'bark_cycad', 'bark_fern', 'rock', 'plain']


def reset():
    global SAPLING
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable('bl_ext.blender_org.sapling_tree_gen')
    if SAPLING is None:
        import importlib
        SAPLING = os.path.dirname(importlib.import_module('bl_ext.blender_org.sapling_tree_gen').__file__)


def preset(name):
    txt = open(os.path.join(SAPLING, 'presets', name + '.py')).read()
    return ast.literal_eval(txt[txt.index('{'):])


class Builder:
    """Collects bark and leaf geometry into one bmesh with materials, colours and UVs."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new('Col')
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.leaf_faces = []

    def face(self, verts, uvs, mat, colors):
        try:
            f = self.bm.faces.new(verts)
        except ValueError:
            return None
        f.material_index = MATS.index(mat)
        for l, uv, c in zip(f.loops, uvs, colors):
            l[self.uv].uv = uv
            l[self.col] = c
        if mat == 'leaf':
            self.leaf_faces.append(f)
        return f

    # a tapered tube along points, side count by radius
    def tube(self, pts, radii, mat='bark_conifer', tint=(1, 1, 1), sway=None, sides=None, cap=True, uv_scale=1.0):
        n = len(pts)
        if n < 2:
            return
        sides = sides or max(3, min(12, int(4 + radii[0] * 260)))
        rings = []
        prev = None
        s_len = 0.0
        for i in range(n):
            t = (pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
            if prev is None:
                ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
                prev = t.cross(ref).normalized()
            side = (prev - t * prev.dot(t)).normalized()
            prev = side
            up = t.cross(side)
            if i:
                s_len += (pts[i] - pts[i - 1]).length
            ring = []
            for k in range(sides):
                a = k / sides * math.tau
                ring.append(self.bm.verts.new(pts[i] + (side * math.cos(a) + up * math.sin(a)) * radii[i]))
            rings.append((ring, s_len))
        for i in range(n - 1):
            (ra, sa), (rb, sb) = rings[i], rings[i + 1]
            for k in range(sides):
                k2 = (k + 1) % sides
                vs = [ra[k], ra[k2], rb[k2], rb[k]]
                uvs = [(k / sides, sa * uv_scale), ((k + 1) / sides, sa * uv_scale), ((k + 1) / sides, sb * uv_scale), (k / sides, sb * uv_scale)]
                cs = [(*tint, sway(v.co) if sway else 0.0) for v in vs]
                self.face(vs, uvs, mat, cs)
        if cap:
            ring = rings[-1][0]
            tip = self.bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * radii[-1])
            for k in range(sides):
                vs = [ring[k], ring[(k + 1) % sides], tip]
                self.face(vs, [(0, 0), (1, 0), (0.5, 1)], mat, [(*tint, sway(v.co) if sway else 0.0) for v in vs])

    # a bent card strip from the atlas: pts along the leaf, side vector for width
    def card(self, pts, widths, side, cell, tint=(1, 1, 1), sway=1.0, u0=0.0, u1=1.0):
        cx, cy = cell % 4, cell // 4
        inset = 0.004
        U = lambda u: (cx + inset + u * (1 - 2 * inset)) / 4
        V = lambda v: (3 - cy + inset + v * (1 - 2 * inset)) / 4  # the bottom of a cell is the base of the leaf
        n = len(pts)
        left, right = [], []
        for i, p in enumerate(pts):
            w = widths[i]
            left.append(self.bm.verts.new(p - side * w))
            right.append(self.bm.verts.new(p + side * w))
        for i in range(n - 1):
            va, vb = i / (n - 1), (i + 1) / (n - 1)
            sw = lambda t: sway * (0.25 + 0.75 * t)
            self.face([left[i], right[i], right[i + 1], left[i + 1]],
                      [(U(u0), (V(va) + 0.0)), (U(u1), V(va)), (U(u1), V(vb)), (U(u0), V(vb))], 'leaf',
                      [(*tint, sw(va)), (*tint, sw(va)), (*tint, sw(vb)), (*tint, sw(vb))])

    def finish(self, name, crown=None):
        bm = self.bm
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        for m in MATS:
            mat = bpy.data.materials.get(m) or make_material(m)
            me.materials.append(mat)
        return ob


def make_material(m):
    mat = bpy.data.materials.new(m)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    if m == 'leaf':
        img = bpy.data.images.load(os.path.join(TEX, 'foliage_atlas.png'), check_existing=True)
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = img
        mul = nt.nodes.new('ShaderNodeMix')
        mul.data_type = 'RGBA'
        mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1
        nt.links.new(tx.outputs['Color'], mul.inputs[6])
        nt.links.new(vc.outputs['Color'], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
        nt.links.new(tx.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat.blend_method = 'CLIP'
    else:
        tex = {'bark_conifer': 'bark_conifer', 'bark_smooth': 'bark_smooth', 'bark_cycad': 'bark_cycad', 'bark_fern': 'bark_fern'}.get(m)
        if tex:
            img = bpy.data.images.load(os.path.join(TEX, tex + '.png'), check_existing=True)
            tx = nt.nodes.new('ShaderNodeTexImage')
            tx.image = img
            mul = nt.nodes.new('ShaderNodeMix')
            mul.data_type = 'RGBA'
            mul.blend_type = 'MULTIPLY'
            mul.inputs['Factor'].default_value = 1
            nt.links.new(tx.outputs['Color'], mul.inputs[6])
            nt.links.new(vc.outputs['Color'], mul.inputs[7])
            nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
        else:
            nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    return mat


def jit(rnd, k=0.06):
    return (1 + (rnd.random() - 0.5) * k, 1 + (rnd.random() - 0.5) * k, 1 + (rnd.random() - 0.5) * k)


# ---------------------------------------------------------------- Sapling trees
def sapling_tree(name, params, leaf_cell, bark='bark_conifer', rnd=None, leaf_tint=(1, 1, 1), min_r=0.004, moss=False):
    """Grow a tree with Sapling, then rebuild its limbs as tubes and its leaves as atlas cards."""
    p = dict(params)
    p.update(showLeaves=leaf_cell is not None, leafShape='rect', do_update=True, bevel=False, makeMesh=False, useArm=False)
    bpy.ops.curve.tree_add(**p)
    tree = bpy.data.objects.get('tree')
    leaves = bpy.data.objects.get('leaves')
    b = Builder()
    # height of the tree, to normalise everything to one unit
    zmax = 0.0
    for sp in tree.data.splines:
        for bp in sp.bezier_points:
            zmax = max(zmax, bp.co.z)
    if leaves:
        for v in leaves.data.vertices:
            zmax = max(zmax, v.co.z)
    S = 1.0 / zmax
    sway = lambda co: max(0.0, min(1.0, (co.z - 0.25) / 0.75)) ** 1.6
    base_r = max(bp.radius for bp in tree.data.splines[0].bezier_points) * S * tree.data.bevel_depth if tree.data.bevel_depth else None
    for si, sp in enumerate(tree.data.splines):
        bps = sp.bezier_points
        if len(bps) < 2:
            continue
        pts, rad = [], []
        for i in range(len(bps) - 1):
            a, bb = bps[i], bps[i + 1]
            seg = (bb.co - a.co).length * S
            res = max(2, min(8, int(seg / 0.03) + 1))
            curve = interpolate_bezier(a.co, a.handle_right, bb.handle_left, bb.co, res + 1)
            for k, c in enumerate(curve[:-1] if i < len(bps) - 2 else curve):
                t = k / res
                pts.append(Vector(c) * S)
                rad.append((a.radius + (bb.radius - a.radius) * t) * S)
        if not pts or rad[0] < min_r:
            continue
        rad = [max(r, 0.0015) for r in rad]
        if si == 0:
            # root flare: the base of the trunk swells
            for i in range(len(pts)):
                if pts[i].z < 0.06:
                    rad[i] *= 1 + (0.06 - pts[i].z) / 0.06 * 0.9
        b.tube(pts, rad, bark, jit(rnd, 0.1), sway)
    if leaves:
        me = leaves.data
        uvl = me.uv_layers[0].data
        for poly in me.polygons:
            vs = [me.vertices[i].co * S for i in poly.vertices]
            if len(vs) != 4:
                continue
            uvs = [uvl[li].uv for li in poly.loop_indices]
            # Sapling's rect leaf: the uv v runs from the stalk (0) to the tip (1)
            base = (vs[0] + vs[1]) / 2 if uvs[0].y < 0.5 and uvs[1].y < 0.5 else (vs[2] + vs[3]) / 2
            tip = (vs[2] + vs[3]) / 2 if base is not None and (base - (vs[0] + vs[1]) / 2).length < 1e-9 else (vs[0] + vs[1]) / 2
            side = (vs[1] - vs[0]) / 2 if uvs[0].y < 0.5 else (vs[3] - vs[2]) / 2
            L = (tip - base).length
            if L < 1e-6:
                continue
            fwd = (tip - base) / L
            w = side.length
            sidev = side.normalized()
            # a little droop along the card
            droop = Vector((0, 0, -L * 0.18))
            pts = [base, base + fwd * L * 0.5 + droop * 0.3, tip + droop]
            t = tuple(c * f for c, f in zip(leaf_tint, jit(rnd, 0.16)))
            b.card(pts, [w * 0.9, w, w * 0.95], sidev, leaf_cell, t, 1.0)
        if moss:
            # beard moss hanging from the lower limbs
            for pi_ in range(0, len(me.polygons), 9):
                poly = me.polygons[pi_]
                c = sum((me.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices) * S
                if c.z > 0.75 or c.z < 0.25:
                    continue
                L = 0.06 + rnd.random() * 0.08
                ang = rnd.random() * math.tau
                b.card([c, c + Vector((0, 0, -L * 0.5)), c + Vector((0, 0, -L))], [0.012, 0.016, 0.01], Vector((math.cos(ang), math.sin(ang), 0)), MOSS, (0.95, 0.95, 0.9), 0.6)
    bpy.data.objects.remove(tree)
    if leaves:
        bpy.data.objects.remove(leaves)
    return b


def conifer_params(seed, tall=1.0):
    p = preset('douglas_fir')
    p.update(seed=seed, levels=3, branches=(0, 52, 9, 0), leaves=8, leafScale=3.2, leafScaleX=0.55, leafDist='6',
             scale=30 * tall, baseSize=0.22, ratio=0.02, curveRes=(10, 4, 3, 1), length=(1.0, 0.24, 0.5, 0.4))
    return p


def broad_params(seed, kind='aspen'):
    p = preset('quaking_aspen' if kind == 'aspen' else 'japanese_maple')
    p.update(seed=seed, levels=3, leafShape='rect', leaves=10, leafScale=1.6, leafScaleX=0.8, curveRes=(8, 4, 3, 1))
    br = list(p['branches'])
    p['branches'] = (br[0], min(br[1], 40), min(br[2], 12), 0)
    return p


# ---------------------------------------------------------------- frond plants
def frond(b, origin, direction, length, width, cell, rnd, arch=0.35, droop=0.3, tint=(1, 1, 1), segs=5, twist=0.0):
    """An arching frond card: rises along `direction`, bends over and droops at the tip."""
    d = direction.normalized()
    horiz = Vector((d.x, d.y, 0))
    if horiz.length < 1e-4:
        horiz = Vector((1, 0, 0))
    horiz.normalize()
    side = horiz.cross(Vector((0, 0, 1))).normalized()
    side = (Matrix.Rotation(twist, 3, horiz) @ side)
    pts, ws = [], []
    for i in range(segs + 1):
        t = i / segs
        p = origin + horiz * length * t * (1 - arch * 0.3) + Vector((0, 0, 1)) * length * (d.z * t + arch * math.sin(math.pi * t * 0.8) * 0.6 - droop * t * t)
        pts.append(p)
        ws.append(width * (0.35 + 0.65 * math.sin(math.pi * min(1.0, 0.12 + t * 0.95))))
    b.card(pts, ws, side, cell, tint, 1.0)


def build_fern(rnd, big=False, clump=1):
    b = Builder()
    for c in range(clump):
        o = Vector(((rnd.random() - 0.5) * 0.6, (rnd.random() - 0.5) * 0.6, 0)) if clump > 1 else Vector()
        n = 9 + rnd.randint(0, 5)
        for i in range(n):
            a = i / n * math.tau + rnd.random() * 0.5
            up = 0.55 + rnd.random() * 0.4
            d = Vector((math.cos(a), math.sin(a), up))
            L = (0.85 + rnd.random() * 0.35) * (0.6 if clump > 1 else 1)
            frond(b, o, d, L, 0.16 * L * (1.3 if big else 1), FROND, rnd, arch=0.5, droop=0.55, tint=jit(rnd, 0.2), twist=(rnd.random() - 0.5) * 0.6)
        # fiddleheads unrolling in the middle
        for i in range(3):
            a = rnd.random() * math.tau
            frond(b, o, Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 1)), 0.35, 0.04, FROND, rnd, arch=0.1, droop=0.0, tint=(1.1, 1.15, 0.9))
    return b


def build_cycad(rnd):
    b = Builder()
    H = 0.38 + rnd.random() * 0.08
    lean = Vector(((rnd.random() - 0.5) * 0.06, (rnd.random() - 0.5) * 0.06, 0))
    pts = [Vector((0, 0, -0.02)) + lean * 0, Vector((0, 0, H * 0.4)) + lean * 0.4, Vector((0, 0, H)) + lean]
    b.tube(pts, [0.13, 0.12, 0.09], 'bark_cycad', (1, 1, 1), lambda co: 0.0, sides=12)
    top = pts[-1]
    # the cone in the middle of the crown
    b.tube([top, top + Vector((0, 0, 0.08)), top + Vector((0, 0, 0.14))], [0.05, 0.045, 0.02], 'plain', (0.85, 0.52, 0.18), lambda co: 0.1, sides=8)
    n = 16 + rnd.randint(0, 6)
    for i in range(n):
        a = i / n * math.tau + rnd.random() * 0.3
        tier = i % 2
        up = 0.9 - tier * 0.45 + rnd.random() * 0.2
        d = Vector((math.cos(a), math.sin(a), up))
        L = 0.62 + rnd.random() * 0.22
        frond(b, top + Vector((0, 0, 0.04)), d, L, 0.11, CYCAD, rnd, arch=0.45, droop=0.5 + tier * 0.25, tint=jit(rnd, 0.16), segs=6, twist=(rnd.random() - 0.5) * 0.4)
    return b


def build_treefern(rnd):
    b = Builder()
    H = 0.66 + rnd.random() * 0.06
    bend = Vector(((rnd.random() - 0.5) * 0.12, (rnd.random() - 0.5) * 0.12, 0))
    pts = [Vector((0, 0, -0.02)), Vector((0, 0, H * 0.35)) + bend * 0.2, Vector((0, 0, H * 0.7)) + bend * 0.6, Vector((0, 0, H)) + bend]
    b.tube(pts, [0.05, 0.034, 0.03, 0.032], 'bark_fern', (1, 1, 1), lambda co: max(0, co.z - 0.4) * 0.5, sides=9)
    top = pts[-1]
    n = 12 + rnd.randint(0, 4)
    for i in range(n):
        a = i / n * math.tau + rnd.random() * 0.4
        d = Vector((math.cos(a), math.sin(a), 0.5 + rnd.random() * 0.4))
        L = 0.46 + rnd.random() * 0.12
        frond(b, top, d, L, 0.12, TREEFERN, rnd, arch=0.5, droop=0.55, tint=jit(rnd, 0.16), segs=6, twist=(rnd.random() - 0.5) * 0.4)
    # old dead fronds hanging down the trunk
    for i in range(5):
        a = rnd.random() * math.tau
        d = Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, -1))
        frond(b, top - Vector((0, 0, 0.03)), d, 0.28, 0.06, LITTER, rnd, arch=0.0, droop=0.0, tint=(0.7, 0.55, 0.35), segs=3)
    return b


def crossed(b, origin, height, width, cell, rnd, n=2, lean=0.0, tint=(1, 1, 1)):
    """Crossed cards standing up from a point (grasses, reeds, horsetails)."""
    for k in range(n):
        a = k / n * math.pi + rnd.random() * 0.4
        side = Vector((math.cos(a), math.sin(a), 0))
        la = rnd.random() * math.tau
        tipoff = Vector((math.cos(la), math.sin(la), 0)) * lean * height
        pts = [origin + tipoff * (t * t) + Vector((0, 0, height * t)) for t in (0, 0.5, 1)]
        b.card(pts, [width, width, width * 0.9], side, cell, tint, 1.0)


def build_grass(rnd, cell=GRASS, clumps=4, h=1.0, w=0.32, lean=0.25, spread=0.25):
    b = Builder()
    for c in range(clumps):
        o = Vector(((rnd.random() - 0.5) * spread, (rnd.random() - 0.5) * spread, -0.02))
        crossed(b, o, h * (0.75 + rnd.random() * 0.25), w * (0.8 + rnd.random() * 0.3), cell, rnd, n=2, lean=lean, tint=jit(rnd, 0.18))
    return b


def build_horsetails(rnd):
    b = Builder()
    n = 6 + rnd.randint(0, 5)
    for i in range(n):
        o = Vector(((rnd.random() - 0.5) * 0.5, (rnd.random() - 0.5) * 0.5, -0.02))
        h = 0.65 + rnd.random() * 0.35
        crossed(b, o, h, 0.09, HORSETAIL, rnd, n=2, lean=0.06, tint=jit(rnd, 0.14))
    return b


def build_flowers(rnd, variant):
    petals = [(1, 1, 1), (1.0, 0.72, 0.8), (1.0, 0.9, 0.45), (0.95, 0.45, 0.38), (0.78, 0.66, 1.0), (1.0, 0.95, 0.8)][variant % 6]
    b = Builder()
    for c in range(3):
        o = Vector(((rnd.random() - 0.5) * 0.4, (rnd.random() - 0.5) * 0.4, -0.02))
        crossed(b, o, 0.8 + rnd.random() * 0.2, 0.3, FLOWERS, rnd, n=2, lean=0.1, tint=petals)
    return b


def build_lily(rnd):
    b = Builder()
    for i in range(6 + rnd.randint(0, 4)):
        a, r = rnd.random() * math.tau, 0.05 + rnd.random() * 0.42
        c = Vector((math.cos(a) * r, math.sin(a) * r, 0.002 * i))
        s = 0.05 + rnd.random() * 0.07
        rot = rnd.random() * math.tau
        cs = [Vector((math.cos(rot + k * math.pi / 2 + math.pi / 4), math.sin(rot + k * math.pi / 2 + math.pi / 4), 0)) * s * 1.414 for k in range(4)]
        verts = [b.bm.verts.new(c + v) for v in cs]
        cx, cy = LILY % 4, LILY // 4
        uv = [((cx + u) / 4, (3 - cy + v) / 4) for u, v in ((0, 0), (1, 0), (1, 1), (0, 1))]
        b.face(verts, uv, 'leaf', [(*jit(rnd, 0.16), 0.15)] * 4)
    for i in range(rnd.randint(1, 2)):  # a flower or two standing on the pads
        a, r = rnd.random() * math.tau, rnd.random() * 0.3
        crossed(b, Vector((math.cos(a) * r, math.sin(a) * r, 0)), 0.12, 0.05, FLOWERS, rnd, n=2, tint=(1, 0.85, 0.9))
    return b


def build_shrub(rnd, cell=SHRUB, size=1.0, density=60):
    """A shrub: a few woody stems and a dome of leaf cards with outward normals."""
    b = Builder()
    for i in range(5):
        a = rnd.random() * math.tau
        tip = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 0.55)) * size
        b.tube([Vector((0, 0, -0.02)), tip * 0.5 + Vector((0, 0, 0.05)), tip], [0.02 * size, 0.014 * size, 0.006 * size], 'bark_smooth', (0.9, 0.85, 0.8), lambda co: co.z * 0.6)
    for i in range(density):
        u, v = rnd.random() * math.tau, math.acos(1 - rnd.random() * 1.3)
        c = Vector((math.sin(v) * math.cos(u) * 0.48, math.sin(v) * math.sin(u) * 0.48, 0.12 + math.cos(v) * 0.42)) * size
        c.z = max(c.z, 0.05 * size)
        side = Vector((-math.sin(u), math.cos(u), 0))
        out = (c - Vector((0, 0, 0.2 * size))).normalized()
        L = 0.26 * size
        pts = [c - out * L * 0.4, c + out * L * 0.1 + Vector((0, 0, L * 0.15)), c + out * L * 0.55]
        b.card(pts, [0.09 * size, 0.12 * size, 0.1 * size], side, cell, jit(rnd, 0.2), 0.8)
    return b


def build_thicket(rnd):
    b = build_shrub(rnd, SHRUB, 1.0, 50)
    for i in range(14):
        a = rnd.random() * math.tau
        o = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 0))
        frond(b, o, Vector((math.cos(a), math.sin(a), 0.9)), 0.75, 0.13, FROND, rnd, arch=0.5, droop=0.5, tint=jit(rnd, 0.2))
    for i in range(4):  # a few saplings poking through
        a = rnd.random() * math.tau
        o = Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, 0))
        b.tube([o, o + Vector((0, 0, 0.6)), o + Vector((0.05, 0, 1.0))], [0.014, 0.01, 0.005], 'bark_smooth', (1, 1, 1), lambda co: co.z * 0.5)
        for k in range(6):
            aa = rnd.random() * math.tau
            c = o + Vector((0.05, 0, 0.7 + rnd.random() * 0.3))
            b.card([c, c + Vector((math.cos(aa) * 0.1, math.sin(aa) * 0.1, 0.06)), c + Vector((math.cos(aa) * 0.2, math.sin(aa) * 0.2, 0.02))], [0.05, 0.07, 0.06], Vector((-math.sin(aa), math.cos(aa), 0)), BROADLEAF, jit(rnd, 0.2), 1.0)
    return b


def build_mangrove(rnd):
    b = Builder()
    base = 0.32
    sway = lambda co: max(0, co.z - 0.4) * 1.2
    for k in range(7):
        a = k / 7 * math.tau + rnd.random() * 0.4
        r = 0.24 + rnd.random() * 0.1
        mid = Vector((math.cos(a) * r * 0.7, math.sin(a) * r * 0.7, base + 0.05))
        end = Vector((math.cos(a) * r, math.sin(a) * r, -0.03))
        pts = [Vector((math.cos(a) * 0.02, math.sin(a) * 0.02, base)), mid * 0.5 + Vector((0, 0, base * 0.55)), mid, (mid + end) / 2 + Vector((0, 0, 0.02)), end]
        b.tube(pts, [0.016, 0.014, 0.012, 0.011, 0.01], 'bark_smooth', (0.75, 0.68, 0.6), sway, sides=6)
    b.tube([Vector((0, 0, base - 0.02)), Vector((0.02, 0, 0.5)), Vector((0, 0.02, 0.72))], [0.032, 0.026, 0.018], 'bark_smooth', (0.8, 0.72, 0.62), sway, sides=8)
    for k in range(5):
        a = rnd.random() * math.tau
        b.tube([Vector((0, 0.02, 0.62)), Vector((math.cos(a) * 0.18, math.sin(a) * 0.18, 0.78))], [0.012, 0.006], 'bark_smooth', (0.8, 0.72, 0.62), sway, sides=5)
    for i in range(110):
        u, v = rnd.random() * math.tau, math.acos(1 - rnd.random() * 1.2)
        c = Vector((math.sin(v) * math.cos(u) * 0.36, math.sin(v) * math.sin(u) * 0.36, 0.8 + math.cos(v) * 0.17))
        out = (c - Vector((0, 0, 0.72))).normalized()
        side = Vector((-math.sin(u), math.cos(u), 0))
        L = 0.15
        b.card([c - out * L * 0.4, c + out * L * 0.2, c + out * L * 0.6], [0.05, 0.065, 0.055], side, DARKLEAF, jit(rnd, 0.18), 1.0)
    return b


def build_umbrella(rnd):
    b = Builder()
    sway = lambda co: max(0, co.z - 0.5) * 1.5
    lean = Vector(((rnd.random() - 0.5) * 0.1, (rnd.random() - 0.5) * 0.1, 0))
    top = Vector((0, 0, 0.72)) + lean
    b.tube([Vector((0, 0, -0.02)), Vector((0, 0, 0.35)) + lean * 0.4, top], [0.05, 0.035, 0.028], 'bark_conifer', (1, 1, 1), sway, sides=10)
    for k in range(7):
        a = k / 7 * math.tau + rnd.random() * 0.4
        end = top + Vector((math.cos(a) * 0.34, math.sin(a) * 0.34, 0.12 + rnd.random() * 0.06))
        b.tube([top, (top + end) / 2 + Vector((0, 0, 0.06)), end], [0.018, 0.012, 0.006], 'bark_conifer', (1, 1, 1), sway, sides=5)
    # flat crown: sprays laid out in a disc and tilted up
    for i in range(140):
        r = math.sqrt(rnd.random()) * 0.42
        a = rnd.random() * math.tau
        c = top + Vector((math.cos(a) * r, math.sin(a) * r, 0.14 + (0.42 - r) * 0.18 + rnd.random() * 0.06))
        ang = rnd.random() * math.tau
        d = Vector((math.cos(ang), math.sin(ang), 0.25))
        side = Vector((-math.sin(ang), math.cos(ang), 0))
        L = 0.14
        b.card([c - d * L * 0.5, c, c + d * L * 0.5 - Vector((0, 0, 0.02))], [0.05, 0.06, 0.05], side, CONIFER, jit(rnd, 0.16), 1.0)
    return b


def build_araucaria(rnd):
    p = conifer_params(rnd.randint(0, 999), 1.2)
    p.update(baseSize=0.62, branches=(0, 30, 6, 0), downAngle=(90, 95, 60, 45), length=(1.0, 0.22, 0.45, 0.4),
             leaves=8, leafScale=3.6, leafScaleX=0.4, shape='4', ratio=0.017)
    return sapling_tree('araucaria', p, ARAUCARIA, 'bark_conifer', rnd)


def build_dead(rnd):
    p = conifer_params(rnd.randint(0, 999), 1.0)
    p.update(baseSize=0.3, branches=(0, 14, 3, 0), length=(1.0, 0.3, 0.4, 0.4), ratio=0.03)
    b = sapling_tree('dead', p, None, 'bark_smooth', rnd, min_r=0.006)
    return b


def build_bones(rnd):
    b = Builder()
    col = (0.93, 0.89, 0.78)
    sway = lambda co: 0.0
    # femur, ribs arching out of the ground and a few vertebrae
    a = rnd.random() * math.pi
    d = Vector((math.cos(a), math.sin(a), 0))
    b.tube([-d * 0.2 + Vector((0, 0, 0.03)), d * 0.0 + Vector((0, 0, 0.035)), d * 0.2 + Vector((0, 0, 0.03))], [0.045, 0.024, 0.04], 'plain', col, sway, sides=8)
    side = d.cross(Vector((0, 0, 1)))
    for k in range(6):
        o = side * (0.1 + k * 0.05) + d * 0.12
        pts = [o + d * 0.02 * math.sin(t * 3) + side * 0.05 * math.sin(t * math.pi) + Vector((0, 0, 0.16 * math.sin(t * math.pi * 0.9))) for t in (0, 0.25, 0.5, 0.75, 1)]
        b.tube(pts, [0.012, 0.011, 0.01, 0.009, 0.006], 'plain', (0.9, 0.85, 0.72), sway, sides=5)
    for k in range(4):
        c = -side * 0.12 + d * (k * 0.07 - 0.1)
        b.tube([c, c + Vector((0, 0, 0.05))], [0.03, 0.026], 'plain', col, sway, sides=7)
        b.tube([c + Vector((0, 0, 0.04)), c + Vector((0, 0, 0.09))], [0.008, 0.004], 'plain', col, sway, sides=4)
    return b


def build_log(rnd):
    b = Builder()
    sway = lambda co: 0.0
    pts = [Vector((-0.5 + t, (rnd.random() - 0.5) * 0.01, 0.05 + math.sin(t * 3) * 0.005)) for t in (0, 0.25, 0.5, 0.75, 1)]
    b.tube(pts, [0.065, 0.06, 0.057, 0.053, 0.05], 'bark_conifer', (0.75, 0.72, 0.68), sway, sides=12, cap=False)
    # root plate torn up at one end and broken branch stubs
    for k in range(9):
        a = k / 9 * math.tau
        b.tube([Vector((-0.5, 0, 0.05)), Vector((-0.55, math.cos(a) * 0.12, 0.05 + math.sin(a) * 0.12)), Vector((-0.58, math.cos(a) * 0.2, 0.03 + math.sin(a) * 0.17))], [0.02, 0.012, 0.004], 'bark_conifer', (0.6, 0.55, 0.5), sway, sides=5)
    for k in range(3):
        x = -0.2 + k * 0.25
        a = rnd.random() * math.pi
        b.tube([Vector((x, 0, 0.1)), Vector((x + 0.05, math.cos(a) * 0.08, 0.1 + math.sin(a) * 0.12))], [0.018, 0.008], 'bark_conifer', (0.7, 0.66, 0.6), sway, sides=6)
    # moss and ferns on top
    for k in range(10):
        x = -0.4 + rnd.random() * 0.8
        frond(b, Vector((x, 0, 0.1)), Vector((rnd.random() - 0.5, rnd.random() - 0.5, 0.8)), 0.12, 0.03, FROND, rnd, tint=jit(rnd, 0.2))
    return b


def displaced(name, rnd, kind='rock'):
    """Rocks and termite mounds: an icosphere pushed about by Blender's procedural textures."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=0.5)
    ob = bpy.context.active_object
    ob.name = name
    if kind == 'rock':
        ob.scale = (1.1 + rnd.random() * 0.4, 0.95 + rnd.random() * 0.3, 0.6 + rnd.random() * 0.25)
    else:
        ob.scale = (0.32, 0.32, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    tex = bpy.data.textures.new('vor', 'VORONOI')
    tex.noise_scale = 0.35 if kind == 'rock' else 0.12
    tex.distance_metric = 'DISTANCE'
    d = ob.modifiers.new('d', 'DISPLACE')
    d.texture = tex
    d.strength = 0.18 if kind == 'rock' else 0.06
    d.mid_level = 0.5
    tex2 = bpy.data.textures.new('cl', 'CLOUDS')
    tex2.noise_scale = 0.25
    d2 = ob.modifiers.new('d2', 'DISPLACE')
    d2.texture = tex2
    d2.strength = 0.08
    for m in ('d', 'd2'):
        bpy.ops.object.modifier_apply(modifier=m)
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    seed = rnd.random() * 100
    for v in bm.verts:
        # strata: stepped terraces on the rock, spires on the mound
        if kind == 'rock':
            v.co.z = v.co.z + math.sin(v.co.z * 40 + seed) * 0.008
            v.co.z = max(v.co.z, -0.08)
        else:
            k = max(0.0, v.co.z + 0.45)
            sp = 1 + 0.5 * noise.noise(Vector((v.co.x * 6 + seed, v.co.y * 6, 0)))
            v.co.x *= (1 - min(1, k / 0.95) ** 0.8 * 0.75) * sp
            v.co.y *= (1 - min(1, k / 0.95) ** 0.8 * 0.75) * sp
            v.co.z = max(v.co.z, -0.42)
    bm.to_mesh(me)
    bm.free()
    dec = ob.modifiers.new('dec', 'DECIMATE')
    dec.ratio = 0.12 if kind == 'rock' else 0.2
    bpy.ops.object.modifier_apply(modifier='dec')
    # sit on the ground, one unit tall
    zs = [v.co.z for v in me.vertices]
    lo, hi = min(zs), max(zs)
    for v in me.vertices:
        v.co.z = (v.co.z - lo) / (hi - lo)
        v.co.x /= (hi - lo)
        v.co.y /= (hi - lo)
    col = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    uv = me.uv_layers.new(name='UVMap')
    tint = (0.5, 0.27, 0.16) if kind == 'mound' else (1, 1, 1)
    for li, loop in enumerate(me.loops):
        z = me.vertices[loop.vertex_index].co.z
        k = 0.85 + 0.15 * z
        col.data[li].color = (tint[0] * k, tint[1] * k, tint[2] * k, 0.0)
    for m in MATS:
        me.materials.append(bpy.data.materials.get(m) or make_material(m))
    for p in me.polygons:
        p.material_index = MATS.index('rock' if kind == 'rock' else 'plain')
        p.use_smooth = kind != 'rock'
    return ob


# ---------------------------------------------------------------- the catalogue
def kinds():
    K = {}
    K['conifer'] = lambda r, v: sapling_tree('conifer', conifer_params(r.randint(0, 999)), CONIFER, 'bark_conifer', r)
    K['darkConifer'] = lambda r, v: sapling_tree('darkConifer', conifer_params(r.randint(0, 999)), CONIFER, 'bark_conifer', r, leaf_tint=(0.78, 0.86, 0.8))
    K['giantConifer'] = lambda r, v: sapling_tree('giantConifer', dict(conifer_params(r.randint(0, 999), 1.6), baseSize=0.42, branches=(0, 70, 9, 0)), CONIFER, 'bark_conifer', r)
    K['mossConifer'] = lambda r, v: sapling_tree('mossConifer', conifer_params(r.randint(0, 999)), CONIFER, 'bark_conifer', r, leaf_tint=(0.9, 0.95, 0.85), moss=True)
    K['araucaria'] = lambda r, v: build_araucaria(r)
    K['canopyBroadleaf'] = lambda r, v: sapling_tree('canopyBroadleaf', broad_params(r.randint(0, 999)), BROADLEAF, 'bark_smooth', r)
    K['giantBroadleaf'] = lambda r, v: sapling_tree('giantBroadleaf', dict(broad_params(r.randint(0, 999), 'maple'), scale=30), DARKLEAF, 'bark_smooth', r)
    K['gallery'] = lambda r, v: sapling_tree('gallery', broad_params(r.randint(0, 999), 'maple'), BROADLEAF, 'bark_smooth', r, moss=True)
    K['ginkgo'] = lambda r, v: sapling_tree('ginkgo', dict(broad_params(r.randint(0, 999)), leafScale=1.8), GINKGO, 'bark_smooth', r)
    K['dead'] = lambda r, v: build_dead(r)
    K['umbrella'] = lambda r, v: build_umbrella(r)
    K['mangrove'] = lambda r, v: build_mangrove(r)
    K['treeFern'] = lambda r, v: build_treefern(r)
    K['cycad'] = lambda r, v: build_cycad(r)
    K['fern'] = lambda r, v: build_fern(r)
    K['bigFern'] = lambda r, v: build_fern(r, True)
    K['fernClump'] = lambda r, v: build_fern(r, False, 4)
    K['thicket'] = lambda r, v: build_thicket(r)
    K['bush'] = lambda r, v: build_shrub(r)
    K['tuft'] = lambda r, v: build_grass(r, GRASS, 4, 1.0, 0.3, 0.35)
    K['sedge'] = lambda r, v: build_grass(r, GRASS, 6, 1.0, 0.26, 0.5, 0.35)
    K['reeds'] = lambda r, v: build_grass(r, REED, 5, 1.0, 0.24, 0.12, 0.3)
    K['horsetails'] = lambda r, v: build_horsetails(r)
    K['flowers'] = lambda r, v: build_flowers(r, v)
    K['lily'] = lambda r, v: build_lily(r)
    K['bones'] = lambda r, v: build_bones(r)
    K['log'] = lambda r, v: build_log(r)
    K['termite'] = 'mound'
    return K


VARIANTS = {'flowers': 6}


def bend_leaf_normals(ob):
    """Point the normals of leaf cards away from the plant's centre line, so a crown of
    cards lights like a solid volume rather than a pile of flat planes."""
    me = ob.data
    leaf = MATS.index('leaf')
    zs = [v.co.z for v in me.vertices]
    cz = 0.5 * (max(zs) + min(zs)) if zs else 0.5
    normals = []
    for loop in me.loops:
        normals.append(None)
    me.calc_loop_triangles()
    lnor = [Vector(l.normal) for l in me.loops] if hasattr(me.loops[0], 'normal') else None
    out = []
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            n = Vector(poly.normal)
            if poly.material_index == leaf:
                radial = Vector((v.x, v.y, (v.z - cz) * 0.6 + 0.25))
                if radial.length > 1e-5:
                    n = (radial.normalized() * 0.75 + n * 0.25 * (1 if n.dot(radial) >= 0 else -1)).normalized()
            out.append(n)
    me.normals_split_custom_set(out)


def export(ob, path):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_vertex_color='ACTIVE', export_normals=True, export_tangents=False,
                              export_image_format='NONE')  # the game gives the plants its own shared materials


def preview(obs, path):
    scn = bpy.context.scene
    for i, ob in enumerate(obs):
        ob.location.x = (i - (len(obs) - 1) / 2) * 1.3
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scn.collection.objects.link(cam)
    scn.camera = cam
    cam.location = (0, -3.4, 0.6)
    cam.rotation_euler = (math.radians(88), 0, 0)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(30))
    scn.collection.objects.link(sun)
    if scn.world is None:
        scn.world = bpy.data.worlds.new('w')
    scn.world.use_nodes = True
    scn.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.68, 0.75, 1)
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = 16
    scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 720, 300
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    reset()
    K = kinds()
    todo = only or list(K.keys())
    for kind in todo:
        reset()
        rnd = random.Random(hash(kind) & 0xffff)
        obs = []
        for v in range(VARIANTS.get(kind, 3)):
            spec = K[kind]
            if isinstance(spec, str):
                ob = displaced(f'{kind}_{v}', rnd, spec)
            else:
                b = spec(rnd, v)
                ob = b.finish(f'{kind}_{v}')
                for p in ob.data.polygons:
                    p.use_smooth = p.material_index != MATS.index('leaf')
                bend_leaf_normals(ob)
            # (the glTF exporter only writes the material slots a plant actually uses)
            names = sorted({ob.data.materials[p.material_index].name for p in ob.data.polygons})
            export(ob, os.path.join(OUT, f'{kind}_{v}.glb'))
            tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
            print(f'GREW {kind}_{v}: {tris} tris, materials {names}')
            obs.append(ob)
        if want_preview:
            preview(obs, os.path.join(PREVIEW, kind + '.png'))


main()
