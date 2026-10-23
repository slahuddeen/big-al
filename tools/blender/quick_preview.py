# Quick look at a sculpt (tools/.gen/sculpt/<name>.npz) with its paint, before the full bake.
# Run: blender -b -P tools/blender/quick_preview.py -- <name> [side|head|front]...
import bpy, json, math, os, sys
import numpy as np
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:]
name, views = argv[0], argv[1:] or ['side']
d = np.load(os.path.join(HERE, '..', '.gen', 'sculpt', name + '.npz'))
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = 'CYCLES'
scn.cycles.samples = 16
scn.cycles.use_denoising = True
for key in ('b', 'j'):
    v, f, c = d[key + 'v'], d[key + 'f'], d[key + 'c']
    if not len(v):
        continue
    me = bpy.data.meshes.new(key)
    me.from_pydata(v.tolist(), [], f.tolist())
    a = me.color_attributes.new('paint', 'FLOAT_COLOR', 'POINT')
    rgba = np.ones((len(v), 4), np.float32)
    rgba[:, :3] = c ** 2.2
    a.data.foreach_set('color', rgba.reshape(-1))
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(key, me)
    scn.collection.objects.link(ob)
    m = bpy.data.materials.new('m')
    m.use_nodes = True
    at = m.node_tree.nodes.new('ShaderNodeAttribute')
    at.attribute_name = 'paint'
    m.node_tree.links.new(at.outputs['Color'], m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
    me.materials.append(m)
meta = json.loads(str(d['meta']))
for t in meta['teeth']:
    for p, r in zip(t['pts'], t['r']):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=max(r, 0.0006), location=p, segments=8, ring_count=6)
for e in meta['eyes']:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=e['r'], location=e['c'])
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 4
sun.rotation_euler = (math.radians(55), math.radians(-10), math.radians(40))
scn.collection.objects.link(sun)
scn.world = bpy.data.worlds.new('w')
scn.world.use_nodes = True
scn.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.66, 0.72, 1)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scn.collection.objects.link(cam)
scn.camera = cam
scn.render.resolution_x, scn.render.resolution_y = 960, 540
v = d['bv']
lo, hi = v.min(0), v.max(0)
mid = Vector(((lo + hi) / 2).tolist())
size = float(max(hi[0] - lo[0], hi[2] - lo[2]))
bones = {b['name']: b for b in meta['bones']}
for view in views:
    if view == 'side':
        loc, at = mid + Vector((0, -size * 1.75, size * 0.05)), mid
    elif view == 'front':
        loc, at = mid + Vector((size * 1.1, -size * 0.7, size * 0.2)), mid
    else:
        h = bones['head']
        hc = (Vector(h['head']) + Vector(h['tail'])) / 2
        loc, at = hc + Vector((size * 0.05, -size * 0.35, size * 0.05)), hc
    cam.location = loc
    cam.rotation_euler = (at - loc).to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = os.path.join(HERE, '..', '.gen', 'previews', f'q_{name}_{view}.png')
    bpy.ops.render.render(write_still=True)
