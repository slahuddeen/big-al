Play it here: http://slahuddeen.github.io/big-al/

This is a reimagining of the original Big Al dinosaur game made by the BBC in the 2000s.
Ive added a few things to it and changed a few things too:

•	Movement is now done by clicking on a tile you want to go to

•	The map is made of irregular Voronoi cells instead of squares or hexes

•	Every playthrough generates a new Morrison basin: Sevier highlands and volcanoes in the west, the Sundance Sea to the north and east, rivers that spring in the hills and wind down to lakes and the sea (with waterfalls where they drop a terrace), dry channels, sauropod migration trails and dozens of biomes

•	Ive added more Jurassic era Morison Formation animals to the game

•	Hex tiles have special properties such as vision or thirst effects

•	The world is an isometric 3D diorama built with three.js – chunky low-poly terrain and creatures, a day/night cycle, swaying forests, flowing water, smoking volcanoes and fireflies at night. Every cell is randomly decorated, so no two forests or deserts look the same

•	New biomes: fern prairie, katydid meadow, fern jungle, young forest, old-growth araucarias, ginkgo groves, forest edge, deadfall, floodplain, fern savanna, steppe, boulder fields, termite mounds and shallow streams

•	Wildlife lives in every tile you can see: predators hunt other animals and leave carcasses you can scavenge


Im still developing these features:
•	A pack hunting system

•	A sauropod hunting minigame

•	More attack types as you grow and hunt different animals (pokemon like system)

•	A territory system

•	More animals and biomes with unique effects

You can play the original game as well as a faithful rebuild of it here:
https://www.jenniferedwards.co.uk/portfolio/#bigalgame


## Controls

| Action | How |
| --- | --- |
| Move | Click a highlighted neighbouring area |
| Travel | Click any explored area further away – Big Al walks there over safe ground and stops if danger appears |
| Pan | Drag, or WASD / arrow keys |
| Zoom | Mouse wheel, or + / - |
| Rotate | Q / E (or the ⟲ ⟳ buttons) |
| Re-centre on Big Al | C (R also resets rotation and zoom) |

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

* `src/world/` generates the map: `worldGen.js` (Voronoi cells, terraced elevation, rivers, lakes, sea, biomes, trails) and `cellGraph.js` (neighbours and distances on the cell graph).
* `src/three/` holds the 3D engine: `lowpoly.js` (edge-loop lofting, extrusion and jittered blobs), `cells3d.js` (one builder per biome, rivers and waterfalls), `materials.js` (wind sway and water shaders), `creatures3d.js` (rigged models for every species and Big Al), `animation.js` (procedural gaits) and `WorldRenderer.js` (scene, camera, lighting, picking, effects). Game rules stay in `src/game/gameState.js`.
* Add `?seed=1234` to the URL to replay the same map.
* Open `/gallery.html` on the dev server to inspect every creature and biome (`?view=terrain`, `?only=Stegosaurus,Diplodocus`, `&walk=1`, `&yaw=0&az=1.57` for side profiles).
* In the browser console during `npm run dev`: `spawnCreature('Diplodocus')` drops a creature on Big Al's tile, `listCreatures()` lists everything alive.
