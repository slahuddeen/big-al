# Yutyrannus

A survival game set in the Jehol lakes of Liaoning, north-east China, about 125 million years ago. You hatch from a warm nest mound as a feathered tyrannosaur weighing under a kilogram and grow into a nine-metre, 1.4-tonne Yutyrannus, the largest feathered animal known. It is the third game on the Big Al engine, after Big Al and Spino.

The look is Chinese ink-wash and blue-green landscape painting: ink outlines, soft washes on rice paper, malachite and azurite greens, mountains fading into mist, and a vermilion seal. The animals are sculpted in detail, with fur and filament plumage, vaned feathers and membranes, and a splash of colour where the fossils show it.

Play it here: https://slahuddeen.github.io/big-al/jehol/

## The world

The Jehol was a basin of lakes and forests ringed by volcanoes, with warm summers and cold, snowy winters. There were no limestone karst forests; the pillars you see are old volcanic rock.

* **Water:** deep volcanic lakes (where the fossils formed), cold rivers, clear streams, ponds, horsetail marshes, steaming hot springs and the lakeshore.
* **Open ground:** fern glades, flower meadows with some of the earliest flowering plants, wet meadows, cycad scrub, the trail the titanosaurs use, and grey ash flats from the last eruption.
* **Woods:** conifer forest, old forest with huge monkey-puzzle relatives, ginkgo groves that turn gold before winter, fern thickets, lakeside forest, open woods, windfalls and ash-killed forest.
* **High ground:** wooded hills, volcanic crags crowned with pines, basalt columns, tuff boulders, lava fields, the volcanoes themselves and the mountains at the rim.
* **Boiling mud** pools near the vents kill anything that steps in.

## Seasons and eruptions

* **Summer:** insects, frogs and herds out in the glades. Eat well while you can. The ginkgos and ferns turn gold at the end of it.
* **Winter:** snow settles, and the cold burns energy, most of all for small animals in the open. Your down helps (Warm Down), and so do forests, nest-mates and the hot springs. Insects and cold-blooded animals all but vanish.
* **Deep winter:** ponds, streams and marshes freeze. Eat snow for water, or find the lakes and hot springs. In snow your tracks give you away, unless a blizzard is blowing.
* **Eruptions:** every so often a volcano at the rim rumbles, then ash falls across the basin for a few turns. On the worst day gas pours down into the low ground around the lakes and kills what is there. Get to high ground when the ground shakes. This is how many Jehol animals died, and why their fossils are so perfect.

## The animals

* **Feathered tyrannosaurs:** grown Yutyrannus (the rival at the top) and young ones from your own clutch, which you can hunt with. Dilong is a small, earlier tyrannosaur.
* **Other predators:** Sinocalliopteryx (a long-tailed hunter known to have eaten Sinosauropteryx and birds), the big-winged raptor Zhenyuanlong, Sinosauropteryx (the first dinosaur whose colours were worked out, with a ginger-and-white banded tail), Repenomamus (a badger-sized mammal that ate baby dinosaurs) and the lizard-like crocodile relative Monjurosuchus.
* **Gliders and flyers:** Microraptor (four wings and glossy black, iridescent feathers), Changyuraptor, Confuciusornis, and the pterosaurs Sinopterus, Feilongus and the little Dendrorhynchoides.
* **Plant-eaters:** herds of Psittacosaurus, Jinzhousaurus, the small armoured Liaoningosaurus and the giant long-necked Dongbeititan.
* **Odd ones:** Beipiaosaurus (a fluffy therizinosaur), Caudipteryx (a peacock-tailed oviraptorosaur), Incisivosaurus (buck teeth), Mei long (it died asleep, curled like a bird) and Hyphalosaurus (a long-necked lake reptile).
* **Small life:** mayflies, lacewings, crickets, frogs, salamanders, the lake fish Lycoptera and Peipiaosteus, the turtle Manchurochelys, the gliding lizard Xianglong and the early mammal Eomaia.

Every animal has a diet and a field-guide card: hover over its picture, or tap it on a phone.

## Playing as Yutyrannus

* **Hatchling (to 15 kg):** small and quiet. Hide in thick cover, eat insects, frogs and lizards, and keep out of the deep water: rivers and lakes drown anything under 25 kg.
* **Juvenile (to 250 kg):** long legs make you fast and cheap to move (Long Legs). Dash and Ambush unlock.
* **Sub-adult (to 800 kg):** Crest Display drives off smaller predators and scavengers. Thick Coat cuts damage.
* **Adult (to 1.4 t):** Slashing Bite makes big prey bleed. Smaller predators keep their distance (Feathered Tyrant).
* **Hunting together:** Yutyrannus may have lived in groups. From the juvenile stage you can invite a young Yutyrannus to hunt with you, and nest-mates huddle together against the cold.
* **The rest of the Big Al systems:** round-based fights with health bars, carcasses and blood trails, chasing predators, weather and wind, mist, a field journal, landmarks (warm pools, lookouts, ash beds, waterfalls, smoking vents, a Psittacosaurus crèche) and goals for every stage of growth.

## Controls

| Action | How |
| --- | --- |
| Move | Click a highlighted neighbouring area |
| Travel | Click any explored area further away (the route avoids deadly ground) |
| Pan | Drag, or WASD / arrow keys |
| Orbit and tilt | Right-drag (or Shift-drag, or middle-drag), or Q / E to rotate |
| Zoom | Mouse wheel, or + / - |
| Re-centre | C (V resets rotation, tilt and zoom) |
| Actions | 1 Sleep, 2 Drink, 3 Hide, 4 Sniff, 5 Dash, 6 Crest Display |
| Field journal | J |

On a phone: tap to move, drag to pan, pinch to zoom, and twist or slide two fingers to rotate and tilt.

## Development

```bash
npm install
npm run dev      # http://localhost:3000/big-al/jehol/
npm run build    # served from /big-al/jehol/
```

* This branch (`claude/yuty-jehol`) is the Yutyrannus game. Big Al lives on `main` and Spino on `claude/spino-kemkem`.
* Species, habitats and spawn tables are in `src/data/species.js`, field-guide facts in `src/data/speciesFacts.js`, biomes in `src/data/terrain.js` and world generation (the basin, lakes, rivers and vents) in `src/world/worldGen.js`.
* Seasons, snow, freezing and eruptions are in `src/game/weather.js`; cold, warmth and shelter in `src/game/environment.js`.
* The animals are sculpted in `src/jehol/`: signed-distance bodies meshed with surface nets (`sculpt.js`), body plans (`anatomy.js`, `bodyplans.js`), fur shells and scales (`skin.js`), feathers (`feathers.js`, `plumage.js`) and membranes (`membrane.js`). Each species is in `src/jehol/species/`. `src/jehol/gameModels.js` turns them into lighter skinned meshes for the game.
* The model lab: open `/big-al/jehol/models.html` on the dev server to inspect every animal close up.
* The ink-wash look of the world is in `src/three/postfx.js`, the terrain palette and plants in `src/three/cells3d.js`, and the UI theme at the end of `src/index.css`.
* Add `?seed=1234` to replay a map and `?turn=30` to start later in the year (deep winter at 30; the first eruption on seed 1234 is at turns 22 to 26).
* Dev console helpers: `spawnCreature('Microraptor')`, `setStats({ level: 4, weight: 1300 })`, `teleport('hotspring', 30)`.
