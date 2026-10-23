# ==================== BAKE THE SCULPTED ANIMALS INTO GAME MODELS ====================
# Takes the high-resolution sculpts from tools/sculpt/sculpt.py and makes the game models:
#   * the high mesh gets a skin shader: Voronoi scales sized by the animal's real length and by
#     region (big dorsal scales, fine ones on the head and belly, armour plates), pebbling within
#     each scale, creases between them and fine wrinkles
#   * a game mesh is retopologised from it (voxel remesh + decimate) and unwrapped
#   * albedo, tangent-space normals (sculpt + scales), roughness and ambient occlusion are baked
#     from the high mesh onto the game mesh
#   * teeth and claws are modelled as curved cones, eyes as spheres, all on the same skeleton
#   * the armature comes from the sculpt's rig and the skin is weighted automatically (bone heat)
# Writes godot/creatures/<species>.glb, <species>_albedo.jpg, _normal.webp, _orm.jpg, <species>.rig.json
# Run: blender -b -P tools/blender/bake_creatures.py -- [species ...] [--res 2048] [--preview]
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '.gen', 'sculpt')
OUT = os.path.join(HERE, '..', '..', 'godot', 'creatures')
PREV = os.path.join(HERE, '..', '.gen', 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
want_preview = '--preview' in argv
RES = int(argv[argv.index('--res') + 1]) if '--res' in argv else 0
names = [a for a in argv if not a.startswith('--') and not a.isdigit()]
if not names:
    names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.npz'))

SMALL = {'Noasaurid', 'Dromaeosaur', 'Araripesuchus', 'Lungfish', 'Calamopleurus', 'Obaichthys', 'Simoliophis', 'Hamadachelys', 'Siroccopteryx', 'Injured_Pterosaur', 'Bawitius', 'Tribodus'}
BUDGET = {n: 6500 for n in SMALL}
BIG = {'Player', 'Spinosaurus', 'Carcharodontosaurus', 'Bahariasaurus', 'Sauroniops', 'Paralititan', 'Aegyptosaurus', 'Rebbachisaurus'}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.world = bpy.data.worlds.new('w')


def make_mesh(name, v, f, attrs):
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(v))
    me.vertices.foreach_set('co', v.reshape(-1))
    me.loops.add(len(f) * 3)
    me.loops.foreach_set('vertex_index', f.reshape(-1))
    me.polygons.add(len(f))
    me.polygons.foreach_set('loop_start', np.arange(0, len(f) * 3, 3, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(f), 3, np.int32))
    me.update()
    me.validate()
    for key, (kind, data) in attrs.items():
        if kind == 'color':
            a = me.color_attributes.new(key, 'FLOAT_COLOR', 'POINT')
            rgba = np.ones((len(v), 4), np.float32)
            rgba[:, :3] = data ** 2.2  # stored as linear
            a.data.foreach_set('color', rgba.reshape(-1))
        else:
            a = me.attributes.new(key, 'FLOAT', 'POINT')
            a.data.foreach_set('value', data.astype(np.float32))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def skin_shader(density, kind='reptile'):
    """The high-res skin: paint, scales and wrinkles, ready to bake from."""
    mat = bpy.data.materials.new('hi_skin')
    mat.use_nodes = True
    nt = mat.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N['Principled BSDF']
    paint = N.new('ShaderNodeAttribute'); paint.attribute_name = 'paint'
    ssize = N.new('ShaderNodeAttribute'); ssize.attribute_name = 'ssize'
    rough = N.new('ShaderNodeAttribute'); rough.attribute_name = 'rough'
    tc = N.new('ShaderNodeTexCoord')
    div = N.new('ShaderNodeMath'); div.operation = 'DIVIDE'
    div.inputs[0].default_value = density
    L.new(ssize.outputs['Fac'], div.inputs[1])
    # scales: distance to the cell edge gives the creases, F1 gives each scale its own height
    vor = N.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Randomness'].default_value = 0.85
    L.new(tc.outputs['Object'], vor.inputs['Vector']); L.new(div.outputs[0], vor.inputs['Scale'])
    vor2 = N.new('ShaderNodeTexVoronoi'); vor2.feature = 'F1'; vor2.inputs['Randomness'].default_value = 0.85
    L.new(tc.outputs['Object'], vor2.inputs['Vector']); L.new(div.outputs[0], vor2.inputs['Scale'])
    edge = N.new('ShaderNodeMapRange'); edge.inputs['From Min'].default_value = 0.0; edge.inputs['From Max'].default_value = 0.16
    edge.interpolation_type = 'SMOOTHSTEP'
    L.new(vor.outputs['Distance'], edge.inputs['Value'])
    dome = N.new('ShaderNodeMath'); dome.operation = 'MULTIPLY'
    inv = N.new('ShaderNodeMapRange'); inv.inputs['From Min'].default_value = 0.0; inv.inputs['From Max'].default_value = 0.75
    inv.inputs['To Min'].default_value = 1.0; inv.inputs['To Max'].default_value = 0.0
    L.new(vor2.outputs['Distance'], inv.inputs['Value'])
    L.new(edge.outputs['Result'], dome.inputs[0]); L.new(inv.outputs['Result'], dome.inputs[1])
    # fine pebbling and wrinkles
    noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = density * 3.0; noise.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], noise.inputs['Vector'])
    wr = N.new('ShaderNodeTexNoise'); wr.inputs['Scale'].default_value = density * 0.35; wr.inputs['Distortion'].default_value = 3.0
    L.new(tc.outputs['Object'], wr.inputs['Vector'])
    wrr = N.new('ShaderNodeMapRange'); wrr.inputs['From Min'].default_value = 0.45; wrr.inputs['From Max'].default_value = 0.55
    wrr.inputs['To Min'].default_value = 0.0; wrr.inputs['To Max'].default_value = 1.0
    wrr.interpolation_type = 'SMOOTHSTEP'
    L.new(wr.outputs['Fac'], wrr.inputs['Value'])
    if kind != 'reptile':
        # fish: rows of overlapping scales (or rhombic ganoid plates) projected onto the body
        img = bpy.data.images.load(os.path.join(HERE, '..', '..', 'godot', 'textures', ('ganoid' if kind == 'ganoid' else 'fish') + '_scales_h.png'), check_existing=True)
        img.colorspace_settings.name = 'Non-Color'
        mp = N.new('ShaderNodeMapping')
        per = {'cosmoid': 1 / 42, 'cycloid': 1 / 70, 'ganoid': 1 / 55, 'denticle': 1 / 400}[kind]
        mp.inputs['Scale'].default_value = (1 / (8 * per),) * 3
        L.new(tc.outputs['Object'], mp.inputs['Vector'])
        it = N.new('ShaderNodeTexImage'); it.image = img; it.projection = 'BOX'; it.projection_blend = 0.35
        L.new(mp.outputs['Vector'], it.inputs['Vector'])
        dome = it
        edge_src = it.outputs['Color']
        nt.links.remove(edge.inputs['Value'].links[0])
        L.new(edge_src, edge.inputs['Value'])
        edge.inputs['From Max'].default_value = 0.45
    h = N.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    L.new(noise.outputs['Fac'], h.inputs[0]); h.inputs[1].default_value = 0.15; L.new(dome.outputs[0], h.inputs[2])
    h2 = N.new('ShaderNodeMath'); h2.operation = 'MULTIPLY_ADD'
    L.new(wrr.outputs['Result'], h2.inputs[0]); h2.inputs[1].default_value = -0.25; L.new(h.outputs[0], h2.inputs[2])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.85
    bump.inputs['Distance'].default_value = 0.35 / density
    L.new(h2.outputs[0], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # colour: the paint, darker in the creases, each scale a shade different
    shade = N.new('ShaderNodeMapRange'); shade.inputs['To Min'].default_value = 0.68; shade.inputs['To Max'].default_value = 1.0
    L.new(edge.outputs['Result'], shade.inputs['Value'])
    cell = N.new('ShaderNodeMapRange'); cell.inputs['To Min'].default_value = 0.9; cell.inputs['To Max'].default_value = 1.06
    L.new(vor2.outputs['Color'], cell.inputs['Value'])
    m1 = N.new('ShaderNodeVectorMath'); m1.operation = 'SCALE'
    L.new(paint.outputs['Color'], m1.inputs[0]); L.new(shade.outputs['Result'], m1.inputs['Scale'])
    m2 = N.new('ShaderNodeVectorMath'); m2.operation = 'SCALE'
    L.new(m1.outputs[0], m2.inputs[0]); L.new(cell.outputs['Result'], m2.inputs['Scale'])
    L.new(m2.outputs[0], bsdf.inputs['Base Color'])
    emit = bsdf.inputs['Emission Color']
    L.new(m2.outputs[0], emit)
    bsdf.inputs['Emission Strength'].default_value = 1.0
    L.new(rough.outputs['Fac'], bsdf.inputs['Roughness'])
    mat['albedo_link'] = True
    nt['rough_node'] = rough.name
    nt['color_out'] = m2.name
    return mat


def emit_rough(mat):
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    for l in list(bsdf.inputs['Emission Color'].links):
        nt.links.remove(l)
    nt.links.new(nt.nodes[nt['rough_node']].outputs['Color'], bsdf.inputs['Emission Color'])


def retopo(ob, voxel, target):
    lo = ob.copy()
    lo.data = ob.data.copy()
    bpy.context.scene.collection.objects.link(lo)
    for a in list(lo.data.attributes):
        if a.name in ('paint', 'rough', 'ssize'):
            lo.data.attributes.remove(a)
    lo.data.materials.clear()
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = lo
    lo.select_set(True)
    lo.data.remesh_voxel_size = voxel
    bpy.ops.object.voxel_remesh()
    tris = sum(len(p.vertices) - 2 for p in lo.data.polygons)
    if tris > target:
        d = lo.modifiers.new('d', 'DECIMATE')
        d.ratio = target / tris
        bpy.ops.object.modifier_apply(modifier='d')
    for p in lo.data.polygons:
        p.use_smooth = True
    return lo


def tube_mesh(name, chains, sides=6):
    """Teeth and claws: curved, tapering cones, each with its bone and colour."""
    bm = bmesh.new()
    col = bm.loops.layers.color.new('Col')
    groups = []
    for pts, rad, bone, colour in chains:
        pts = [Vector(p) for p in pts]
        h = colour.lstrip('#')
        cc = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        rings = []
        prev = None
        for i, p in enumerate(pts):
            t = (pts[min(len(pts) - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            side = t.cross(ref).normalized() if prev is None else (prev - t * prev.dot(t)).normalized()
            prev = side
            up = t.cross(side)
            rings.append([bm.verts.new(p + (side * math.cos(k / sides * math.tau) + up * math.sin(k / sides * math.tau)) * rad[i]) for k in range(sides)])
        tip = bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * rad[-1])
        made = []
        for i in range(len(rings) - 1):
            for k in range(sides):
                k2 = (k + 1) % sides
                made.append(bm.faces.new([rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]]))
        for k in range(sides):
            made.append(bm.faces.new([rings[-1][k], rings[-1][(k + 1) % sides], tip]))
        made.append(bm.faces.new(list(reversed(rings[0]))))
        for fi, f in enumerate(made):
            for l in f.loops:
                # paler toward the tip, like enamel and keratin
                z = (l.vert.co - pts[0]).length / max(1e-6, (pts[-1] - pts[0]).length)
                k = 0.8 + 0.3 * min(1, z)
                l[col] = (min(1, cc[0] * k) ** 2.2, min(1, cc[1] * k) ** 2.2, min(1, cc[2] * k) ** 2.2, 1)
        groups.append((bone, [v for r in rings for v in r] + [tip]))
    me = bpy.data.meshes.new(name)
    index = {}
    bm.verts.index_update()
    for bone, vs in groups:
        index.setdefault(bone, []).extend(v.index for v in vs)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for bone, ids in index.items():
        ob.vertex_groups.new(name=bone).add(ids, 1.0, 'REPLACE')
    for p in me.polygons:
        p.use_smooth = True
    return ob


def eye_mesh(eyes):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    groups = {}
    for e in eyes:
        c, r = Vector(e['c']), e['r']
        side = e['side']
        res = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
        vs = res['verts']
        # point the pole (the pupil) outward and a little forward
        look = Vector((0.35, side * 1.0, 0.08)).normalized()
        R = Vector((0, 0, 1)).rotation_difference(look).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ R, verts=vs)
        for f in {f for v in vs for f in v.link_faces}:
            for l in f.loops:
                d = (R.inverted() @ (l.vert.co - c)).normalized()
                # planar projection along the look axis: the iris shader draws from this
                l[uv].uv = (0.5 + d.x * 0.5, 0.5 + d.y * 0.5) if d.z > 0 else (0.0, 0.0)
        groups.setdefault(e['bone'], []).extend(vs)
    me = bpy.data.meshes.new('eyes')
    bm.verts.index_update()
    index = {b: [v.index for v in vs] for b, vs in groups.items()}
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('eyes', me)
    bpy.context.scene.collection.objects.link(ob)
    for b, ids in index.items():
        ob.vertex_groups.new(name=b).add(ids, 1.0, 'REPLACE')
    for p in me.polygons:
        p.use_smooth = True
    return ob


def eye_texture(name, iris_hex, slit):
    """An eye: an iris of radial fibres in the species' colour, a darker limbal ring, a slit
    (archosaurs) or round (fish, pterosaurs) pupil and a wet glint, mapped across the front."""
    n = 256
    ys, xs = (np.mgrid[0:n, 0:n] + 0.5) / n * 2 - 1
    r = np.sqrt(xs * xs + ys * ys)
    ang = np.arctan2(ys, xs)
    h = iris_hex.lstrip('#')
    iris = np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    rng = np.random.default_rng(len(name))
    fib = 0.8 + 0.2 * np.sin(ang * 60 + rng.random() * 6) * np.sin(ang * 23) + 0.1 * np.sin(r * 40)
    col = iris[None, None, :] * fib[..., None] * (0.7 + 0.5 * (1 - r))[..., None]
    col = np.where((r > 0.72)[..., None], iris * 0.35, col)
    col = np.where((r > 0.86)[..., None], np.array([0.12, 0.1, 0.08]), col)
    pupil = (np.abs(xs) / 0.13) ** 2 + (ys / 0.62) ** 2 < 1 if slit else r < 0.32
    col = np.where(pupil[..., None], 0.02, col)
    glint = ((xs + 0.25) ** 2 + (ys - 0.3) ** 2) < 0.012
    col = np.where(glint[..., None], 0.95, col)
    rgba = np.ones((n, n, 4), np.float32)
    rgba[..., :3] = np.clip(col, 0, 1) ** 2.2
    img = bpy.data.images.new(name + '_eye', n, n)
    img.pixels.foreach_set(rgba[::-1].reshape(-1))
    img.filepath_raw = os.path.join(OUT, name + '_eye.png')
    img.file_format = 'PNG'
    img.save()
    return img


def bake_image(name, res, alpha=False, non_color=False):
    img = bpy.data.images.new(name, res, res, alpha=alpha, float_buffer=False)
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def set_target(ob, img):
    mat = ob.data.materials[0]
    nt = mat.node_tree
    node = nt.nodes.get('bake') or nt.nodes.new('ShaderNodeTexImage')
    node.name = 'bake'
    node.image = img
    for n in nt.nodes:
        n.select = False
    node.select = True
    nt.nodes.active = node


def build(name):
    reset()
    scn = bpy.context.scene
    d = np.load(os.path.join(SRC, name + '.npz'))
    meta = json.loads(str(d['meta']))
    length_m = meta['length_m']
    # scales: about 1.5 cm on a man-sized animal, growing with the animal (in model units of 1)
    scale_m = 0.011 * length_m ** 0.62
    density = length_m / scale_m
    res = RES or (2048 if name in BIG else 1024)
    hi_b = make_mesh('hi_body', d['bv'], d['bf'], {'paint': ('color', d['bc']), 'rough': ('f', d['br']), 'ssize': ('f', d['bs'])})
    his = [hi_b]
    if len(d['jv']):
        his.append(make_mesh('hi_jaw', d['jv'], d['jf'], {'paint': ('color', d['jc']), 'rough': ('f', d['jr']), 'ssize': ('f', d['js'])}))
    mat = skin_shader(density, meta.get('scales', 'reptile'))
    for h in his:
        h.data.materials.append(mat)
    # the game mesh: never more than 20k triangles; the detail is in the baked maps
    budget = 15500 if name == 'Player' else 14500 if name in BIG else BUDGET.get(name, 10000)
    lo_b = retopo(hi_b, 0.0032, budget)
    los = [lo_b]
    if len(his) > 1:
        lo_j = retopo(his[1], 0.0026, budget * 0.08)
        los.append(lo_j)
    # ---- armature ----
    arm_data = bpy.data.armatures.new(name + '_rig')
    arm = bpy.data.objects.new(name + '_rig', arm_data)
    scn.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for b in meta['bones']:
        eb = arm_data.edit_bones.new(b['name'])
        eb.head, eb.tail = Vector(b['head']), Vector(b['tail'])
        if (eb.tail - eb.head).length < 1e-4:
            eb.tail = eb.head + Vector((0.01, 0, 0))
        if b['parent']:
            eb.parent = arm_data.edit_bones[b['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    # bone heat for the body; the jaw bone stays out of it, the lower jaw is all jaw
    jawb = arm_data.bones.get('jaw')
    if jawb:
        jawb.use_deform = False
    bpy.ops.object.select_all(action='DESELECT')
    lo_b.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    if jawb:
        jawb.use_deform = True
    if len(los) > 1:
        los[1].vertex_groups.new(name='jaw').add(list(range(len(los[1].data.vertices))), 1.0, 'REPLACE')
        los[1].parent = arm
    # ---- join skin, UV, bake ----
    bpy.ops.object.select_all(action='DESELECT')
    for o in los:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lo_b
    bpy.ops.object.join()
    skin = lo_b
    skin.name = name
    for m in list(skin.modifiers):
        skin.modifiers.remove(m)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=0.003, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    lowmat = bpy.data.materials.new('skin')
    lowmat.use_nodes = True
    skin.data.materials.clear()
    skin.data.materials.append(lowmat)
    rb = scn.render.bake
    rb.use_selected_to_active = True
    rb.cage_extrusion = 0.006
    rb.max_ray_distance = 0.03
    rb.margin = 6
    scn.cycles.samples = 1
    bpy.ops.object.select_all(action='DESELECT')
    for h in his:
        h.select_set(True)
    skin.select_set(True)
    bpy.context.view_layer.objects.active = skin
    imgs = {}
    for kind in ('normal', 'albedo', 'rough'):
        img = bake_image(f'{name}_{kind}', res, non_color=kind != 'albedo')
        set_target(skin, img)
        if kind == 'normal':
            bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
        else:
            if kind == 'rough':
                emit_rough(mat)
            bpy.ops.object.bake(type='EMIT')
        imgs[kind] = img
    # ambient occlusion on the game mesh itself, teeth and eyes in place
    teeth = tube_mesh('teeth', [(t['pts'], t['r'], t['bone'], t['color']) for t in meta['teeth']]) if meta['teeth'] else None
    eyes = eye_mesh(meta['eyes']) if meta['eyes'] else None
    if meta['eyes']:
        eye_texture(name, meta['eyes'][0]['iris'], meta['gait'] != 'swim')
    for h in his:
        h.hide_render = True
    rb.use_selected_to_active = False
    scn.cycles.samples = 48
    scn.world.light_settings.distance = 0.05
    ao = bake_image(f'{name}_ao', res, non_color=True)
    set_target(skin, ao)
    bpy.ops.object.select_all(action='DESELECT')
    skin.select_set(True)
    bpy.context.view_layer.objects.active = skin
    bpy.ops.object.bake(type='AO')
    # ---- write the maps ----
    def px(img):
        a = np.empty(res * res * 4, np.float32)
        img.pixels.foreach_get(a)
        return a.reshape(res, res, 4)
    rgh, aoc = px(imgs['rough']), px(ao)

    def save(img, path, fmt):
        img.filepath_raw = path
        img.file_format = fmt
        img.save(quality=92 if fmt == 'JPEG' else 95) if fmt in ('JPEG', 'WEBP') else img.save()
    save(imgs['albedo'], os.path.join(OUT, name + '_albedo.jpg'), 'JPEG')
    save(imgs['normal'], os.path.join(OUT, name + '_normal.webp'), 'WEBP')
    orm = np.ones((res, res, 4), np.float32)
    orm[..., 0] = aoc[..., 0]
    orm[..., 1] = rgh[..., 0]
    orm[..., 2] = 0
    out_orm = bpy.data.images.new(name + '_orm', res, res)
    out_orm.colorspace_settings.name = 'Non-Color'
    out_orm.pixels.foreach_set(orm.reshape(-1))
    save(out_orm, os.path.join(OUT, name + '_orm.jpg'), 'JPEG')
    nimg = imgs['normal']
    # ---- assemble the game model ----
    for o in (teeth, eyes):
        if o is None:
            continue
        m = bpy.data.materials.new('keratin' if o is teeth else 'eye')
        o.data.materials.append(m)
    sc = skin.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    sc.data.foreach_set('color', [1.0] * (len(skin.data.loops) * 4))
    if eyes is not None:
        ec = eyes.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
        ec.data.foreach_set('color', [1.0] * (len(eyes.data.loops) * 4))
    for o in (teeth, eyes):
        if o is None:
            continue
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.to_mesh(o.data)
        bm.free()
    parts = [skin] + [o for o in (teeth, eyes) if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = skin
    bpy.ops.object.join()
    skin.data.color_attributes.active_color = skin.data.color_attributes['Col']
    skin.parent = arm
    mod = skin.modifiers.new('rig', 'ARMATURE')
    mod.object = arm
    for h in his:
        bpy.data.objects.remove(h)
    bpy.ops.object.select_all(action='DESELECT')
    skin.select_set(True)
    arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True, export_yup=True,
                              export_skins=True, export_animations=False, export_tangents=True, export_vertex_color='ACTIVE',
                              export_all_vertex_colors=False, export_normals=True, export_materials='PLACEHOLDER', export_def_bones=False)
    rig = {'species': meta['species'], 'gait': meta['gait'], 'roles': meta['roles'], 'length_m': length_m,
           'swimSpeed': meta.get('swimSpeed'), 'flapSpeed': meta.get('flapSpeed'), 'version': 2,
           'bones': [{'name': b['name'], 'parent': b['parent'], 'head': [b['head'][0], b['head'][2], -b['head'][1]], 'tail': [b['tail'][0], b['tail'][2], -b['tail'][1]]} for b in meta['bones']]}
    json.dump(rig, open(os.path.join(OUT, name + '.rig.json'), 'w'))
    tris = sum(len(p.vertices) - 2 for p in skin.data.polygons)
    print(f'BAKED {name}: {tris} tris, {res}px maps, {len(meta["bones"])} bones', flush=True)
    if want_preview:
        preview(name, skin, arm, imgs['albedo'], nimg, imgs['rough'], ao)


def preview(name, skin, arm, alb, nor, rgh, ao):
    scn = bpy.context.scene
    mat = skin.data.materials[0]
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], nt.nodes['Material Output'].inputs[0])
    ta = nt.nodes.new('ShaderNodeTexImage'); ta.image = alb
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nor
    tr = nt.nodes.new('ShaderNodeTexImage'); tr.image = rgh
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = ao
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    nt.links.new(ta.outputs['Color'], mul.inputs[6]); nt.links.new(to.outputs['Color'], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
    nt.links.new(tr.outputs['Color'], bsdf.inputs['Roughness'])
    bsdf.inputs['Subsurface Weight'].default_value = 0.08
    for m in skin.data.materials[1:]:
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        vc = m.node_tree.nodes.new('ShaderNodeVertexColor')
        if m.name.startswith('keratin'):
            m.node_tree.links.new(vc.outputs['Color'], b.inputs['Base Color'])
            b.inputs['Roughness'].default_value = 0.35
        else:
            et = m.node_tree.nodes.new('ShaderNodeTexImage')
            et.image = bpy.data.images.get(name + '_eye')
            m.node_tree.links.new(et.outputs['Color'], b.inputs['Base Color'])
            b.inputs['Roughness'].default_value = 0.04
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 4.0
    sun.data.angle = 0.05
    sun.rotation_euler = (math.radians(55), math.radians(-10), math.radians(40))
    scn.collection.objects.link(sun)
    scn.world.use_nodes = True
    scn.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.6, 0.72, 1)
    scn.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scn.collection.objects.link(cam)
    scn.camera = cam
    scn.cycles.samples = 32
    scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 960, 540
    scn.render.image_settings.file_format = 'PNG'
    pts = [skin.matrix_world @ Vector(c) for c in skin.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    mid = (lo + hi) / 2
    size = max(hi.x - lo.x, hi.z - lo.z)
    shots = {'side': (mid + Vector((size * 0.35, -size * 1.4, size * 0.25)), mid, 50)}
    head = arm.data.bones.get('head')
    if head:
        hc = arm.matrix_world @ ((head.head_local + head.tail_local) / 2)
        shots['head'] = (hc + Vector((size * 0.12, -size * 0.3, size * 0.06)), hc, 50)
    for k, (loc, at, lens) in shots.items():
        cam.location = loc
        cam.rotation_euler = (at - loc).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = lens
        scn.render.filepath = os.path.join(PREV, f'{name}_{k}.png')
        bpy.ops.render.render(write_still=True)


for n in names:
    build(n)
