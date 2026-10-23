# Spino: Kem Kem

A Godot 4.3 rebuild of Spino: Roam. You play a sub-adult Spinosaurus in the Kem Kem river
world, 95 million years ago, at its real size. The world, the rules and the creatures come
from the browser game's own code (`src/roam`, `src/three/creatures3d.js`). The assets are
built in Blender, or taken from CC0 photo scans, by the scripts in `../tools`.

## Running

Open this folder in **Godot 4.3** (Forward+), let it import, and press Play. The project's
data is already baked; you only need the tools below to change it.

Controls: mouse to look; WASD to move; Shift to sprint; left click to bite; right click or Q
to claw; Space to dash; F to sniff; R to display; C to submerge; hold E to drink and Z to rest;
Esc to release the mouse.

## What draws what

| Part | Where | How |
|-|-|-|
| Ground | `scripts/ground.gd` | [Terrain3D](https://github.com/TokisanGames/Terrain3D) 1.0 (`addons/terrain_3d`) draws the baked height map. It uses 14 photo-scanned ground materials, picked and blended per metre by the control map. |
| Grass | `scripts/grass.gd`, `shaders/grass.gdshader` | A GPU field of photographic tufts, sized and chosen per clump from the baked grass map. |
| Ground clutter | Terrain3D instancer | Ferns, shrubs, nettles, weeds, mossy rocks, boulders, pebbles, stumps, logs and bark from Poly Haven scans, scattered by biome. |
| Trees and plants | `scripts/flora.gd` | Sapling Tree Gen trees and bmesh plants, scattered per 128 m chunk with the browser's per-biome densities. A blanket of crowns stands in for distant forest. |
| Creatures | `scripts/creature_model.gd` | Sculpted, baked and rigged models (20k triangles or fewer), animated procedurally. |
| Sky, water | `scripts/sky.gd`, `scripts/water.gd` | The browser's day cycle and light keys, with volumetric fog, SSAO and SSIL; water with depth, refraction and ripples. |
| World queries | `scripts/world.gd` (autoload `World`) | Ground height, water, biome and river distance for gameplay. Nothing in gameplay asks Terrain3D. |

## Terrain3D notes

- The terrain is built at runtime from `data/world_<seed>/t3d_*.bin.gz`, so there is no
  Terrain3D data directory to edit.
- The editor plugin is left disabled, because it crashes Godot 4.3's headless import in this
  pipeline. The runtime classes come from the GDExtension either way. To look at the terrain
  tools in the editor, enable the plugin under Project Settings → Plugins.
- `ground.gd` clamps an out-of-bounds region-map read in the shader Terrain3D generates.
  Most GPUs ignore that read, but some drivers (Mesa's llvmpipe among them) crash on it.

## Rebuilding the assets

Run these from the repository root. You need Node, Python 3 (numpy, scipy, Pillow, numba and
scikit-image for the sculpts), and Blender 4.2 with the Sapling Tree Gen extension.

```sh
node tools/bake_world.mjs 1234             # world from the browser generator -> godot/data/world_1234
node tools/export_data.mjs                 # species, biomes, densities -> godot/data/game.json
python3 tools/fetch_polyhaven.py           # CC0 ground materials and plant/rock scans
blender -b -P tools/blender/prep_polyhaven.py   # scans -> godot/flora_ph, grass cards
python3 tools/bake_ground.py 1234          # terrain warp, control/colour maps, grass map, clutter
python3 tools/textures.py                  # painted bark, skin, water and foliage atlas
blender -b -P tools/blender/build_flora.py # trees and plants -> godot/flora
node tools/export_creatures.mjs            # creature specs from creatures3d.js
python3 tools/sculpt/sculpt.py             # anatomical SDF sculpts
blender -b -P tools/blender/bake_creatures.py   # retopology, bakes, rig -> godot/creatures
python3 tools/godot_imports.py             # import settings (mipmaps, VRAM compression, no auto-LOD)
```

## Credits

Ground materials, plant and rock scans: [Poly Haven](https://polyhaven.com), CC0.
Terrain: [Terrain3D](https://github.com/TokisanGames/Terrain3D) by Tokisan Games, MIT
(`addons/terrain_3d/LICENSE.txt`).
