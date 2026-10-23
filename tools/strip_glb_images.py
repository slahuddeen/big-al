# ==================== STRIP THE PICTURES OUT OF GLB FILES ====================
# The game gives the plants and creatures its own shared materials by name, so the images a
# glb carries are dead weight (and Godot extracts a copy of each one next to every model).
# This rewrites glb files without their images, textures and samplers, keeping the materials,
# their names and everything else.
# Usage: python3 tools/strip_glb_images.py godot/flora/*.glb
import json, struct, sys


def strip(path):
    data = open(path, 'rb').read()
    n = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + n])
    if not gltf.get('images'):
        return False
    binary = data[20 + n + 8:]
    image_views = {im['bufferView'] for im in gltf['images'] if 'bufferView' in im}
    # repack the buffer with only the views something else still uses
    remap, chunks, at = {}, [], 0
    for i, v in enumerate(gltf['bufferViews']):
        if i in image_views:
            continue
        b = binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        pad = (-at) % 4
        chunks.append(b'\0' * pad + b)
        at += pad
        v['byteOffset'] = at
        at += len(b)
        remap[i] = len(remap)
    gltf['bufferViews'] = [v for i, v in enumerate(gltf['bufferViews']) if i not in image_views]
    for a in gltf.get('accessors', []):
        if 'bufferView' in a:
            a['bufferView'] = remap[a['bufferView']]
    for key in ('images', 'textures', 'samplers'):
        gltf.pop(key, None)
    for m in gltf.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for k in ('baseColorTexture', 'metallicRoughnessTexture'):
            pbr.pop(k, None)
        for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
            m.pop(k, None)
        m.pop('extensions', None)
    gltf['extensionsUsed'] = [e for e in gltf.get('extensionsUsed', []) if not e.startswith('KHR_texture')]
    if not gltf['extensionsUsed']:
        gltf.pop('extensionsUsed')
    blob = b''.join(chunks)
    blob += b'\0' * ((-len(blob)) % 4)
    gltf['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js
           + struct.pack('<II', len(blob), 0x004E4942) + blob)
    open(path, 'wb').write(out)
    return True


if __name__ == '__main__':
    done = sum(strip(p) for p in sys.argv[1:])
    print(done, 'of', len(sys.argv) - 1, 'files stripped')
