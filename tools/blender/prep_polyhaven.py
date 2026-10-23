# ==================== POLY HAVEN PLANTS AND ROCKS, MADE GAME-READY ====================
# Turns the CC0 Poly Haven models fetched by tools/fetch_polyhaven.py into game assets:
#   * meshes for the Terrain3D instancer: joined, transforms applied, origin at the base,
#     split into the variants the scan holds, decimated to an instancing budget and written to
#     godot/flora_ph/<name>_<k>.glb without images (the maps are packed by fetch_polyhaven.py)
#   * grass cards: the dense grass and flower patch scans rendered side-on with an orthographic
#     camera and a transparent film, so the GPU grass field draws photographic blades
#     -> godot/textures/grass_cards.png (a strip of four cards, albedo with alpha)
# Run: blender -b -P tools/blender/prep_polyhaven.py
import bpy, math, os, sys
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '.gen', 'polyhaven', 'models')
OUT = os.path.join(HERE, '..', '..', 'godot', 'flora_ph')
TEX = os.path.join(HERE, '..', '..', 'godot', 'textures')
os.makedirs(OUT, exist_ok=True)

# triangles to keep for each variant of an instanced asset (None: keep as it is). Most scans are a
# row of several variants (four shrubs, six nettles, a set of rocks): each becomes its own mesh.
BUDGET = {'fern_02': None, 'rock_moss_set_01': 1500, 'rock_moss_set_02': 1200, 'shrub_02': 2500, 'shrub_03': 2500,
          'shrub_04': 2500, 'weed_plant_02': None, 'nettle_plant': 2000, 'boulder_01': 2500, 'stone_01': 1200, 'rock_07': 1500,
          'rock_09': 1200, 'tree_stump_01': 3000, 'dead_tree_trunk': 3500, 'bark_debris_01': 800, 'pine_roots': 2500}
CARDS = ['grass_medium_01', 'grass_medium_02', 'celandine_01']


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load(name):
    reset()
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name, name + '.gltf'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # unparent keeping the transforms, apply them, then join everything into one mesh
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    for o in list(bpy.context.scene.objects):
        if o != ob:
            bpy.data.objects.remove(o)
    # these scans come in lying on their backs (their up axis is Blender's y): stand them up
    d = ob.dimensions
    if d.y > d.z * 1.5 or name in ('grass_medium_01', 'grass_medium_02', 'grass_bermuda_01', 'celandine_01'):
        ob.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
    return ob


def ground_origin(ob):
    me = ob.data
    vs = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', vs)
    vs = vs.reshape(-1, 3)
    cx, cy = (vs[:, 0].min() + vs[:, 0].max()) / 2, (vs[:, 1].min() + vs[:, 1].max()) / 2
    vs -= np.array([cx, cy, vs[:, 2].min()])
    me.vertices.foreach_set('co', vs.reshape(-1))
    me.update()
    return vs


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def variants(ob):
    """Split a scan into its variants: loose parts whose footprints touch belong to the same plant or rock."""
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    boxes = []
    for o in parts:
        vs = np.array([v.co for v in o.data.vertices])
        boxes.append((vs.min(0) - 0.02, vs.max(0) + 0.02))
    root = list(range(len(parts)))

    def find(i):
        while root[i] != i:
            root[i] = root[root[i]]
            i = root[i]
        return i
    for i in range(len(parts)):
        for j in range(i + 1, len(parts)):
            (a0, a1), (b0, b1) = boxes[i], boxes[j]
            if (a0[:2] <= b1[:2]).all() and (b0[:2] <= a1[:2]).all():
                root[find(i)] = find(j)
    groups = {}
    for i, o in enumerate(parts):
        groups.setdefault(find(i), []).append(o)
    out = []
    for g in groups.values():
        bpy.ops.object.select_all(action='DESELECT')
        for o in g:
            o.select_set(True)
        bpy.context.view_layer.objects.active = g[0]
        if len(g) > 1:
            bpy.ops.object.join()
        out.append(bpy.context.view_layer.objects.active)
    # leave out the crumbs: anything far smaller than the biggest variant
    big = max(tris(o) for o in out)
    keep = [o for o in out if tris(o) > big * 0.04]
    for o in out:
        if o not in keep:
            bpy.data.objects.remove(o)
    keep.sort(key=lambda o: -tris(o))
    return keep


def instance_asset(name):
    ob = load(name)
    for o in os.listdir(OUT):
        if o.startswith(name + '_') or o == name + '.glb':
            os.remove(os.path.join(OUT, o))
    parts = variants(ob)
    for k, ob in enumerate(parts):
        for o in parts:
            o.hide_set(o != ob)
            o.select_set(o == ob)
        bpy.context.view_layer.objects.active = ob
        ground_origin(ob)
        target = BUDGET.get(name)
        t = tris(ob)
        # glTF splits vertices along every UV seam, which a collapse treats as a border: weld them first,
        # and go again if it still stalls short of the budget
        if target and t > target:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.remove_doubles(threshold=0.0005)
            bpy.ops.object.mode_set(mode='OBJECT')
        for _ in range(4):
            if not target or tris(ob) <= target * 1.05:
                break
            d = ob.modifiers.new('d', 'DECIMATE')
            d.ratio = target / tris(ob)
            d.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier='d')
        # a collapse leaves slivers with no area, which break normal and LOD generation in Godot
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.dissolve_degenerate(threshold=0.0002)
        bpy.ops.mesh.delete_loose()
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.quads_convert_to_tris()
        bpy.ops.object.mode_set(mode='OBJECT')
        for p in ob.data.polygons:
            p.use_smooth = True
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'{name}_{k}.glb'), export_format='GLB', use_selection=True,
                                  export_apply=True, export_image_format='NONE', export_tangents=True)
        print(f'ASSET {name}_{k}: {t} -> {tris(ob)} tris, {ob.dimensions.x:.2f} x {ob.dimensions.y:.2f} x {ob.dimensions.z:.2f} m', flush=True)


def tufts(vs, faces):
    """The scans are rows of separate tufts along x: split the faces into tufts at the gaps."""
    cx = vs[faces].mean(axis=1)[:, 0]
    order = np.sort(cx)
    cuts = [(a + b) / 2 for a, b in zip(order[:-1], order[1:]) if b - a > 0.02]
    edges = [-1e9] + cuts + [1e9]
    groups = []
    for a, b in zip(edges[:-1], edges[1:]):
        sel = (cx > a) & (cx <= b)
        if sel.sum() > 30:
            groups.append(sel)
    return groups


def card(name, size=512):
    """Render every tuft of a grass patch scan from the side with an orthographic camera."""
    ob = load(name)
    vs = ground_origin(ob)
    me = ob.data
    faces = [list(p.vertices)[:3] for p in me.polygons]
    groups = tufts(vs, np.array(faces))
    # some scans keep the cut-out mask in the colour texture's alpha without wiring it up
    for m in me.materials:
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        if not bsdf.inputs['Alpha'].is_linked:
            src = bsdf.inputs['Base Color'].links[0].from_node
            nt.links.new(src.outputs['Alpha'], bsdf.inputs['Alpha'])
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = 24
    scn.cycles.use_denoising = True
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.view_settings.view_transform = 'Standard'
    w = scn.world = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 2.5
    sun.rotation_euler = (math.radians(35), 0, math.radians(20))
    scn.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.clip_start, cam.data.clip_end = 1, 100
    scn.collection.objects.link(cam)
    scn.camera = cam
    out = []
    for k, sel in enumerate(groups):
        # show this tuft only: hide every other face by moving its corners far away
        keep = np.unique(np.array(faces)[sel])
        part = np.full(len(vs), False)
        part[keep] = True
        moved = np.where(part[:, None], vs, vs + np.array([0, 0, -500.0], np.float32))
        me.vertices.foreach_set('co', moved.reshape(-1))
        me.update()
        t = vs[keep]
        x0, x1, height = float(t[:, 0].min()), float(t[:, 0].max()), float(t[:, 2].max())
        span = max(x1 - x0, height) * 1.04
        cam.data.ortho_scale = span
        cam.location = ((x0 + x1) / 2, -50, span / 2 - 0.002)
        path = os.path.join(SRC, f'{name}_card{k}.png')
        scn.render.filepath = path
        bpy.ops.render.render(write_still=True)
        out.append((path, height, span))
        print(f'CARD {name}#{k}: {height:.2f} m tall, {x1 - x0:.2f} m wide', flush=True)
    me.vertices.foreach_set('co', vs.reshape(-1))
    return out


# the tufts that make the card atlas: (scan, tuft index), 4 x 2 cells of 512 px
PICK = [('grass_medium_01', 0), ('grass_medium_01', 1), ('grass_medium_01', 5), ('grass_medium_01', 6),
        ('grass_medium_01', 7), ('grass_medium_02', 0), ('grass_medium_02', 1), ('celandine_01', 3)]


def atlas(cards):
    """Pack the chosen tuft cards into godot/textures/grass_cards.png (4 x 2) and note each card's real size."""
    import json
    chosen = [cards[n][k] for n, k in PICK] if PICK else [c for n in CARDS for c in cards.get(n, [])][:8]
    px = np.zeros((1024, 2048, 4), np.float32)
    meta = []
    for i, (p, h, span) in enumerate(chosen):
        im = bpy.data.images.load(p)
        a = np.empty(512 * 512 * 4, np.float32)
        im.pixels.foreach_get(a)
        r, c = divmod(i, 4)
        # blender images are stored bottom row first: row 0 of the atlas goes to the top
        px[(1 - r) * 512:(2 - r) * 512, c * 512:(c + 1) * 512] = a.reshape(512, 512, 4)
        meta.append({'height': round(h, 3), 'span': round(span, 3)})
    strip = bpy.data.images.new('grass_cards', 2048, 1024, alpha=True)
    strip.pixels.foreach_set(px.reshape(-1))
    strip.filepath_raw = os.path.join(TEX, 'grass_cards.png')
    strip.file_format = 'PNG'
    strip.save()
    json.dump(meta, open(os.path.join(TEX, 'grass_cards.json'), 'w'))
    print('CARDS written', flush=True)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if 'cards' not in argv:
        for n in BUDGET:
            if not argv or n in argv:
                if os.path.exists(os.path.join(SRC, n)):
                    instance_asset(n)
    cards = {n: card(n) for n in CARDS if os.path.exists(os.path.join(SRC, n))}
    atlas(cards)
