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

•	Animals behave like animals: herds graze and keep together, sauropods browse high in the trees, hunters sniff the ground, stalk you low and charge into your area to attack, small things dart about, and everything calls, looks around and reacts when you arrive. Big animals shake the ground as they walk

•	Survival is more than eating: keep your health, energy and water up. Hot, dry ground makes you thirsty; drink at rivers, lakes, waterholes and marshes (watch for crocodiles). Sleep to heal, safest in thick cover, best of all in a mud wallow

•	You learn new abilities as you grow: Sniff (find animals and carcasses out of sight), Pounce, Dash (break away from a fight), Ambush (strike from cover), Roar (scatter smaller animals) and the adult Allosaurus Hatchet Bite (wound big prey and follow its blood trail until it collapses). Passive traits change as you grow too

•	Exploration: a field journal records every species, habitat and landmark you find. Look for egg clutches, fallen sauropods, mud wallows, lookouts (see further), bone beds, waterfalls and the volcanoes. A minimap shows everything you have discovered

•	Fights take rounds: every animal has a health bar. Small prey dies in one bite, but big animals take several, fighting back, running when hurt, and herd-mates may join in. Sauropods are drawn at their real size and take a long, dangerous fight (or a hatchet bite and a long chase after the blood trail)

•	Pack hunting: as a juvenile you can invite a young Allosaurus to hunt with you (up to two). Your pack adds bite power, takes some of the blows and shares the kills. Enemy packs gang up on you too, and some predators will chase you across several areas until you dash away or lose them in cover

•	Sauropod migration routes: herds of Diplodocus, Camarasaurus and Brachiosaurus walk the trails with their young, followed by the predators that hunt them

•	Goals for each stage of growth lead you out of the forest nursery to the rivers, the open plains and the migration routes. A grown Big Al is too big for thick forest: it costs more energy, and the big prey lives in open country

•	Time of day matters: night and morning mist shorten your sight, but mist also hides you from predators. Some animals come out at night, others at dawn and dusk

•	Gallery forests line the rivers, with trees leaning out over the water. Rivers use the same water as the lakes and the sea. Mist settles over swamps at night and dawn, and over some forests in the early morning

•	The UI uses the pixel art for every animal, and creatures on the map have thick dark outlines so they stand out. The camera is soft: a tilt-shift focus with slightly boosted colour at the edges of the screen

•	Seasons: the Morrison basin alternates a wet season (rain, storms, green growth, herds out on the plains) and a dry season (you get thirsty faster, the land browns to straw, and late in the dry season streams, waterholes, floodplain pools and marshes dry up, so animals crowd round the rivers and the open country empties). The weather rolls in and out: overcast, rain and storms dim the light, rain washes away your scent and gives you puddles to drink, storms cut your sight and bring lightning

•	Hide: as a hatchling or juvenile you can freeze in cover when hunters are near. How well it works depends on the cover (deadfall, dense forest, jungle and ferns are best, open desert worst), and rain and mist help. If you are found, they attack

•	Cutting a calf from the herd: sauropod calves are guarded, and adults block most attacks on them. Harass the herd (better with a pack, and it gets easier as they tire) to drive the adults on down the trail and leave a calf behind

•	Wind blows across the basin, changing with the weather and the season. You read it from the foliage leaning and rustling in travelling gusts, faint streaks of wind, and leaves (or dust in the dry season) tumbling past

•	The bigger you grow, the fewer insects and small fry you notice: they stop turning up as food once you are too big to care

•	Dryosaurus follows newer reconstructions: a beaked head held low on a long neck, striped ochre hide and a russet bristle crest from the shoulders to the tip of the tail

Im still developing these features:
•	More attack types as you grow and hunt different animals (pokemon like system)

•	A territory system

•	More animals and biomes with unique effects

You can play the original game as well as a faithful rebuild of it here:
https://www.jenniferedwards.co.uk/portfolio/#bigalgame


## Controls

| Action | How |
| --- | --- |
| Move | Click a highlighted neighbouring area |
| Travel | Click any explored area further away. Big Al walks there over safe ground and stops if danger appears |
| Pan | Drag, or WASD / arrow keys |
| Orbit and tilt | Right-drag (or Shift-drag, or middle-drag), or Q / E to rotate |
| Zoom | Mouse wheel, or + / - |
| Re-centre on Big Al | C (V resets rotation, tilt and zoom) |
| Actions | 1 Sleep, 2 Drink, 3 Hide, 4 Sniff, 5 Dash, 6 Roar |
| Field journal | J |
| Look somewhere | Click the minimap |

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

* `src/world/` generates the map: `worldGen.js` (Voronoi cells, terraced elevation, rivers, lakes, sea, biomes, trails) and `cellGraph.js` (neighbours and distances on the cell graph).
* `src/three/` holds the 3D engine: `lowpoly.js` (edge-loop lofting, extrusion and jittered blobs), `cells3d.js` (one builder per biome, ground detail, rivers and waterfalls), `materials.js` (wind sway and water shaders), `creatures3d.js` (rigged models for every species and Big Al), `animation.js` (procedural gaits and behaviour poses), `outline.js` (inverted-hull creature outlines), `mist.js`, `weather3d.js` (rain, lightning, wind streaks, leaves and dust), `pois3d.js` (landmark models), `postfx.js` (sky, tilt-shift soft focus and edge vibrance) and `WorldRenderer.js` (scene, camera, lighting, picking, creature behaviour, effects).
* Game rules live in `src/game/`: `gameState.js` (the reducer), `abilities.js` (growth abilities and passives), `environment.js` (mist, water, thirst and shelter rules), `weather.js` (seasons, weather and wind, all pure functions of the world seed and turn) and `pois.js` (points of interest).
* UI pictures come from `public/assets/sprites`, trimmed web-sized copies of the pixel art in `public/assets/dinos` (mapped in `src/data/sprites.js`). Species without art (and Dryosaurus, whose model is the more accurate picture) fall back to a rendered portrait of their 3D model.
* Add `?seed=1234` to the URL to replay the same map.
* Open `/gallery.html` on the dev server to inspect every creature and biome (`?view=terrain`, `?only=Stegosaurus,Diplodocus`, `&walk=1`, `&yaw=0&az=1.57` for side profiles, `&pose=graze|browse|call|crouch|rest|sniff` for behaviour poses).
* Add `?skipintro` to the URL to skip the title card.
* The water shader is ported from the Naval Command ocean (ripple normals, fresnel sky reflection, sun glitter, sub-surface glow, noise-broken foam): `src/three/water.js`.
* Fight maths live in `src/game/combat.js`, growth goals in `src/game/goals.js`.
* In the browser console during `npm run dev`: `spawnCreature('Diplodocus')` drops a creature on Big Al's tile, `setStats({ level: 4, weight: 2000 })` skips ahead, `teleport('galleryforest', 0)` jumps to the nearest cell of a habitat (optionally setting the turn, 0 = morning), `listCreatures()` lists everything alive.
