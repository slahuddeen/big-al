# ==================== THE SMALL FLORA AND THE GROUND'S ODDMENTS ====================
# The browser game's (src/roam/terrain.js PROTOS) small plants and objects rebuilt as game meshes
# for Godot, one unit tall like the browser's prototypes, three variants each. The trees, tree
# ferns, cycads, ferns, horsetails and shrubs are photo-scanned and built by build_trees.py.
#   * reeds, sedges, grasses, flowers and lily pads are built from fronds and cards with bmesh
#   * termite mounds are displaced with Blender's procedural textures and decimated, bones and
#     logs are lofted (rocks are Poly Haven scans: tools/blender/prep_polyhaven.py)
# Vertex colour: rgb = tint (petal colour for flowers), alpha = how far the point sways in the wind.
# Leaf normals are bent away from the crown so foliage shades as a volume.
# Writes godot/flora/<kind>_<variant>.glb. Run: blender -b -P tools/blender/build_flora.py -- [kind ...] [--preview]
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix, noise
from mathutils.geometry import interpolate_bezier

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'godot', 'flora')
PREVIEW = os.path.join(HERE, '..', '.gen', 'flora_previews')
TEX = os.path.join(HERE, '..', '..', 'godot', 'textures')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
want_preview = '--preview' in argv
only = [a for a in argv if not a.startswith('--')]

# foliage atlas cells (tools/textures.py)
CONIFER, ARAUCARIA, BROADLEAF, GINKGO, FROND, CYCAD, GRASS, REED, HORSETAIL, FLOWERS, LILY, MOSS, LITTER, SHRUB, TREEFERN, DARKLEAF = range(16)
MATS = ['leaf', 'bark_conifer', 'bark_smooth', 'bark_cycad', 'bark_fern', 'rock', 'plain']


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


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


# ---------------------------------------------------------------- fronds and cards
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
    K['tuft'] = lambda r, v: build_grass(r, GRASS, 4, 1.0, 0.3, 0.35)
    K['sedge'] = lambda r, v: build_grass(r, GRASS, 6, 1.0, 0.26, 0.5, 0.35)
    K['reeds'] = lambda r, v: build_grass(r, REED, 5, 1.0, 0.24, 0.12, 0.3)
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
