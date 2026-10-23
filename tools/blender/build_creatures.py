# ==================== THE ROAM CREATURES, REBUILT IN BLENDER ====================
# Takes the lofted low-poly animals exported by tools/export_creatures.mjs and turns them
# into detailed, rigged game models for the Godot port:
#   * welds each part's loose triangles and joins them back into the quads of the loft
#   * edge-extrudes rows of scutes and osteoderms (crocodiles, titanosaurs, abelisaurs) and a
#     ridge of scales down the back of every theropod, before smoothing
#   * creases teeth, claws and the rims of sails and fins so they stay sharp under the
#     Catmull-Clark subdivision that rounds the bodies
#   * builds an armature from the animation groups the browser game drives, weights each part
#     to its bone and blends the weights across the neck and tail joints
#   * unwraps, bakes ambient occlusion into the vertex colour alpha and splits the surface into
#     skin, eye, keratin and membrane materials
#   * writes <species>.glb plus <species>.rig.json (rest pose of every bone) into the Godot project
# Run: blender -b -P tools/blender/build_creatures.py -- [species_file ...] [--preview]
import bpy, bmesh, json, math, os, sys, random
from mathutils import Matrix, Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '.gen', 'creatures')
OUT = os.path.join(HERE, '..', '..', 'godot', 'creatures')
PREVIEW = os.path.join(HERE, '..', '.gen', 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
want_preview = '--preview' in argv
names = [a for a in argv if not a.startswith('--')]
if not names:
    names = [f[:-5] for f in sorted(os.listdir(SRC)) if f.endswith('.json') and f != 'index.json']

TAGS = ['skin', 'eye', 'keratin', 'membrane']
CROCS = {'Elosuchus', 'Laganosuchus', 'Aegisuchus', 'Araripesuchus', 'Kaprosuchus'}
ARMOURED = {'Aegyptosaurus', 'Paralititan'}
THEROPODS = {'Player', 'Spinosaurus', 'Young_Spinosaurus', 'Rugops', 'Deltadromeus', 'Sauroniops', 'Bahariasaurus',
             'Carcharodontosaurus', 'Noasaurid', 'Dromaeosaur', 'Iguanodont'}
BLEND = ('tail', 'neck', 'head', 'seg')


def js_to_bl(v):
    # three.js (x, y up, z) to Blender (x, y = -z, z up); the glTF exporter turns it back
    return Vector((v[0], -v[2], v[1]))


def euler_matrix(rot):
    # three.js Euler XYZ in its own axes
    return Euler((rot[0], rot[1], rot[2]), 'XYZ').to_matrix().to_4x4()


AXIS = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # js -> blender basis change


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def node_globals(nodes):
    """Model-space transforms of every group with the normalising scale taken out of the
    rotations (it is uniform, so it only shortens the offsets below the 'inner' group)."""
    s = 1.0
    for n in nodes:
        if n['name'] == 'inner':
            s = n['scale'][0]
    G = []
    under = []
    for i, n in enumerate(nodes):
        p = n['parent']
        inside = p >= 0 and (nodes[p]['name'] == 'inner' or under[p])
        under.append(inside)
        pos = Vector(n['pos']) * (s if inside else 1.0)
        local = Matrix.Translation(pos) @ euler_matrix(n['rot'])
        G.append((G[p] @ local) if p >= 0 else local)
    return G, s, under


def make_part(name, mesh_data, G, s, bone):
    pos, col, tags = mesh_data['positions'], mesh_data['colors'], mesh_data['tags']
    bm = bmesh.new()
    clay = bm.loops.layers.color.new('Col')
    deform = bm.verts.layers.deform.verify()
    M = G
    for t in range(0, len(pos) // 9):
        vs = []
        for k in range(3):
            i = t * 3 + k
            v = Vector((pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])) * s
            w = M @ v
            vs.append(bm.verts.new(js_to_bl(w)))
        try:
            f = bm.faces.new(vs)
        except ValueError:
            continue
        tag = tags[t * 3]
        f.material_index = TAGS.index(tag) if tag in TAGS else 0
        for k, loop in enumerate(f.loops):
            i = t * 3 + k
            loop[clay] = (col[i * 3], col[i * 3 + 1], col[i * 3 + 2], 1.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00012)
    # the browser leaves the ends of tail and neck tubes open where they tuck into the next
    # part; close them so every part is a solid the remesher can fuse
    caps = bmesh.ops.holes_fill(bm, edges=bm.edges, sides=0)['faces']
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # a sharp rim, so the smoothing doesn't round the cap off and pinch the joint
    crease = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    for f in caps:
        for ed in f.edges:
            ed[crease] = 1.0
    # the loft's quads were split in two for the browser: join them back so the
    # subdivision follows the edge loops
    bmesh.ops.join_triangles(bm, faces=bm.faces, cmp_vcols=True, cmp_materials=True,
                             angle_face_threshold=math.radians(40), angle_shape_threshold=math.radians(60))
    for v in bm.verts:
        v[deform][0] = 1.0
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.vertex_groups.new(name=bone)
    return ob


def add_detail(ob, species, part):
    """Edge extrusions done on the cage before it is smoothed: scutes, osteoderms and a
    ridge of scales, plus creases that keep teeth, claws and fin rims crisp."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    rnd = random.Random(hash((species, part)) & 0xffffffff)
    crease = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    bm.faces.ensure_lookup_table()
    skin = [f for f in bm.faces if f.material_index == 0 and f.calc_area() > 1e-7]
    pick = []
    if species in CROCS and (part == 'body' or part.startswith('tail')):
        # two rows of rectangular scutes either side of the spine, as on a crocodile's back
        pick = [f for f in skin if f.normal.z > 0.55 and abs(f.calc_center_median().y) > 0.002 and rnd.random() < 0.85]
        depth = 0.0035
    elif species in ARMOURED and part == 'body':
        pick = [f for f in skin if f.normal.z > 0.35 and rnd.random() < 0.1]
        depth = 0.006
    elif species == 'Rugops' and part == 'body':
        pick = [f for f in skin if 0.1 < f.normal.z < 0.8 and rnd.random() < 0.3]
        depth = 0.003
    elif species in THEROPODS and (part == 'body' or part.startswith('tail') or part.startswith('neck')):
        pick = [f for f in skin if f.normal.z > 0.9 and rnd.random() < 0.7]
        depth = 0.0018
    if pick:
        res = bmesh.ops.inset_individual(bm, faces=pick, thickness=0.0, depth=0.0, use_even_offset=True)
        for f in pick:
            e = sum(ed.calc_length() for ed in f.edges) / max(1, len(f.edges))
            c = f.calc_center_median()
            for v in f.verts:
                v.co = c + (v.co - c) * 0.72 + f.normal * depth * (0.7 + rnd.random() * 0.6) * min(1.0, e / 0.006)
            for ed in f.edges:
                ed[crease] = 0.55
    for f in bm.faces:
        if f.material_index == 2:  # keratin: teeth and claws stay pointed
            for ed in f.edges:
                ed[crease] = 1.0
        elif f.material_index == 3:  # membrane: the outline of the sail keeps a little edge
            for ed in f.edges:
                if len(ed.link_faces) == 2 and ed.calc_face_angle(0) > math.radians(70):
                    ed[crease] = max(ed[crease], 0.3)
    bm.to_mesh(me)
    bm.free()


def fuse_skin(body, voxel, target_tris):
    """Voxel-remesh the skin of every part but the jaw into one continuous surface, as a
    sculptor would before retopology, then carry the paint and bone weights back over from
    the parts and smooth the weights so the hips, shoulders, neck and tail bend as one."""
    scn = bpy.context.scene
    jaw = body.vertex_groups.get('jaw')

    def is_skin(me, poly):
        if poly.material_index != 0:
            return False
        if jaw is None:
            return True
        v = me.vertices[poly.vertices[0]]
        return not any(g.group == jaw.index and g.weight > 0.5 for g in v.groups)

    src = body.copy()
    src.data = body.data.copy()
    scn.collection.objects.link(src)
    bm = bmesh.new()
    bm.from_mesh(src.data)
    keep = {p.index for p in src.data.polygons if is_skin(src.data, p)}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    bm.to_mesh(src.data)
    bm.free()
    fused = src.copy()
    fused.data = src.data.copy()
    scn.collection.objects.link(fused)
    fused.data.remesh_voxel_size = voxel
    fused.data.use_remesh_fix_poles = True
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = fused
    fused.select_set(True)
    bpy.ops.object.voxel_remesh()
    tris = sum(len(p.vertices) - 2 for p in fused.data.polygons)
    if tris > target_tris:
        dec = fused.modifiers.new('dec', 'DECIMATE')
        dec.ratio = target_tris / tris
        bpy.ops.object.modifier_apply(modifier='dec')
    for vg in src.vertex_groups:
        fused.vertex_groups.new(name=vg.name)
    fused.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    dt = fused.modifiers.new('dt', 'DATA_TRANSFER')
    dt.object = src
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    dt.use_loop_data = True
    dt.data_types_loops = {'COLOR_CORNER'}
    dt.loop_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vcol_loop_select_src = 'ALL'
    dt.layers_vcol_loop_select_dst = 'NAME'
    bpy.ops.object.modifier_apply(modifier='dt')
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=18, expand=0.0)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in fused.data.polygons:
        p.use_smooth = True
        p.material_index = 0
    # the shells that stay: jaw, eyes, teeth and claws, sails and fins
    bm = bmesh.new()
    bm.from_mesh(body.data)
    drop = {p.index for p in body.data.polygons if is_skin(body.data, p)}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index in drop], context='FACES')
    bm.to_mesh(body.data)
    bm.free()
    bpy.data.objects.remove(src)
    bpy.ops.object.select_all(action='DESELECT')
    fused.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    return body


INDEX = json.load(open(os.path.join(SRC, 'index.json')))


def budget(name):
    """Triangles for the fused skin, by how big (and so how close and how often) the animal is seen."""
    if name == 'Player':
        return 60000
    w = next((v['weight'] for k, v in INDEX.items() if v['file'] == name), 100)
    return 7000 if w < 60 else 11000 if w < 800 else 16000 if w < 5000 else 22000


def build(name):
    reset()
    data = json.load(open(os.path.join(SRC, name + '.json')))
    nodes = data['nodes']
    G, s, under = node_globals(nodes)
    scn = bpy.context.scene
    parts = []
    for m in data['meshes']:
        nd = nodes[m['node']]
        ob = make_part(nd['name'], m, G[m['node']], s, nd['name'])
        add_detail(ob, name, nd['name'])
        parts.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = name
    me = body.data
    for t in TAGS:
        mat = bpy.data.materials.new(t)
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = {'skin': 0.7, 'eye': 0.05, 'keratin': 0.4, 'membrane': 0.6}[t]
        me.materials.append(mat)
    # ---- smooth: Catmull-Clark over the cage ----
    sub = body.modifiers.new('sub', 'SUBSURF')
    sub.levels = sub.render_levels = 2 if name == 'Player' else 1
    sub.use_creases = True
    sub.uv_smooth = 'PRESERVE_BOUNDARIES'
    bpy.ops.object.modifier_apply(modifier='sub')
    for p in me.polygons:
        p.use_smooth = True
    # ---- armature ----
    arm_data = bpy.data.armatures.new(name + '_rig')
    arm = bpy.data.objects.new(name + '_rig', arm_data)
    scn.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    bones = {}
    kids = {}
    for i, n in enumerate(nodes):
        kids.setdefault(n['parent'], []).append(i)
    for i, n in enumerate(nodes):
        if n['name'] == 'root':
            continue
        eb = arm_data.edit_bones.new(n['name'])
        head = js_to_bl(G[i].translation)
        tail = None
        for c in kids.get(i, []):
            d = js_to_bl(G[c].translation) - head
            if d.length > 0.004 and nodes[c]['name'] not in ('jaw',):
                tail = head + d
                break
        if tail is None:
            fwd = (AXIS @ G[i]).to_3x3() @ Vector((1, 0, 0))
            tail = head + fwd.normalized() * 0.03
        eb.head, eb.tail = head, tail
        p = n['parent']
        if p >= 0 and nodes[p]['name'] != 'root':
            eb.parent = bones[nodes[p]['name']]
        bones[n['name']] = eb
    bpy.ops.object.mode_set(mode='OBJECT')
    # ---- weights: blend across the neck and tail joints so the shells bend together ----
    groups = {vg.index: vg.name for vg in body.vertex_groups}
    by_name = {vg.name: vg for vg in body.vertex_groups}
    member = {}
    for v in me.vertices:
        if v.groups:
            g = max(v.groups, key=lambda x: x.weight)
            member.setdefault(groups[g.group], []).append(v.index)
    for i, n in enumerate(nodes):
        nm = n['name']
        if not nm.startswith(BLEND) or n['parent'] < 0:
            continue
        pn = nodes[n['parent']]['name']
        if pn not in by_name or nm not in by_name:
            continue
        O = js_to_bl(G[i].translation)
        child = member.get(nm, [])
        if not child:
            continue
        ds = sorted((me.vertices[k].co - O).length for k in child)
        R = max(0.008, min(0.08, ds[len(ds) // 5] * 1.6))
        for grp, other in ((nm, pn), (pn, nm)):
            for k in member.get(grp, []):
                d = (me.vertices[k].co - O).length
                if d < R:
                    w = 0.5 * (1 - d / R) ** 1.5
                    by_name[grp].add([k], 1 - w, 'REPLACE')
                    by_name[other].add([k], w, 'REPLACE')
    body = fuse_skin(body, 0.0024 if name == 'Player' else 0.0034, budget(name))
    me = body.data
    body.parent = arm
    mod = body.modifiers.new('rig', 'ARMATURE')
    mod.object = arm
    # ---- UVs for the shared skin detail maps ----
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    # ---- ambient occlusion baked into the colour alpha ----
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 48
    if scn.world is None:
        scn.world = bpy.data.worlds.new('w')
    scn.world.light_settings.distance = 0.06
    ao = me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = ao
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = me.color_attributes['Col']
    aov = [ao.data[i].color[0] for i in range(len(me.vertices))]
    for li, loop in enumerate(me.loops):
        c = col.data[li].color
        col.data[li].color = (c[0], c[1], c[2], 0.25 + 0.75 * aov[loop.vertex_index])
    me.color_attributes.remove(me.color_attributes['AO'])
    me.color_attributes.active_color = me.color_attributes['Col']
    me.color_attributes.render_color_index = 0
    # ---- export ----
    file = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=file, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=False, export_skins=True, export_animations=False, export_tangents=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_normals=True,
                              export_morph=False, export_def_bones=False)
    rig = {
        'species': data['species'], 'gait': data['gait'], 'flapSpeed': data['flapSpeed'], 'swimSpeed': data['swimSpeed'],
        'height': data['height'], 'width': data['width'], 'minLen': data['minLen'], 'scale': s,
        'legs': data['legs'], 'arms': data['arms'], 'wings': data['wings'],
        'bones': [{'name': n['name'], 'parent': nodes[n['parent']]['name'] if n['parent'] >= 0 else None,
                   'pos': list(Vector(n['pos']) * (s if under[i] else 1.0)), 'rot': n['rot']}
                  for i, n in enumerate(nodes) if n['name'] != 'root']
    }
    json.dump(rig, open(os.path.join(OUT, name + '.rig.json'), 'w'))
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    print(f'BUILT {name}: {len(me.vertices)} verts, {tris} tris, {len(arm_data.bones)} bones')
    if want_preview:
        preview(name, body)


def preview(name, body):
    scn = bpy.context.scene
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    scn.collection.objects.link(cam)
    scn.camera = cam
    pts = [body.matrix_world @ Vector(c) for c in body.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    mid = (lo + hi) / 2
    size = max(hi.x - lo.x, hi.z - lo.z * 0 - lo.z, (hi.y - lo.y) * 0.8)
    cam.location = mid + Vector((size * 0.55, -size * 1.55, size * 0.45))
    d = mid - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = 50
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    scn.collection.objects.link(sun)
    scn.world.use_nodes = True
    scn.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.7, 1)
    scn.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    # show the AO-darkened paint, the way the game shader uses it
    for mat in body.data.materials:
        nt = mat.node_tree
        vc = [n for n in nt.nodes if n.type == 'VERTEX_COLOR'][0]
        mul = nt.nodes.new('ShaderNodeMix')
        mul.data_type = 'RGBA'
        mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0
        nt.links.new(vc.outputs['Color'], mul.inputs[6])
        nt.links.new(vc.outputs['Alpha'], mul.inputs[7])
        nt.links.new(mul.outputs[2], nt.nodes['Principled BSDF'].inputs['Base Color'])
    scn.cycles.samples = 24
    scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 720, 405
    scn.render.filepath = os.path.join(PREVIEW, name + '.png')
    bpy.ops.render.render(write_still=True)


for n in names:
    build(n)
