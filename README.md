Play it here: http://slahuddeen.github.io/big-al/

This is a reimagining of the original Big Al dinosaur game made by the BBC in the 2000s.
Ive added a few things to it and changed a few things too:

•	Movement is now done by clicking on a tile you want to go to

•	There are hex based tiles instead of squares

•	There is a world generation algorithm to may every playthrough different

•	Ive added more Jurassic era Morison Formation animals to the game

•	Hex tiles have special properties such as vision or thirst effects

•	The world is an isometric 3D diorama built with three.js – chunky low-poly terrain and creatures, a day/night cycle, swaying forests, flowing water, smoking volcanoes and fireflies at night

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
| Move | Click a highlighted neighbouring tile |
| Travel | Click any explored tile further away – Big Al walks there over safe ground and stops if danger appears |
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

* `src/three/` holds the 3D engine: `lowpoly.js` (edge-loop lofting, extrusion and jittered blobs), `terrain3d.js` (one builder per terrain type), `creatures3d.js` (rigged models for every species and Big Al), `animation.js` (procedural gaits) and `WorldRenderer.js` (scene, camera, lighting, picking, effects). Game rules stay in `src/game/gameState.js`.
* Open `/gallery.html` on the dev server to inspect every creature and terrain tile (`?view=terrain`, `?only=Stegosaurus,Diplodocus`, `&walk=1`).
* In the browser console during `npm run dev`: `spawnCreature('Diplodocus')` drops a creature on Big Al's tile, `listCreatures()` lists everything alive.
