# Spino: Roam (experiment)

A real-time, third-person version of Spino. You play a sub-adult Spinosaurus, 9.5 m long and 2.5 tonnes, in the Kem Kem world at its real size, drawn in the Spino game's comic style.

Play it here: https://slahuddeen.github.io/big-al/spino-roam/

* **Controls:** W A S D move relative to the camera, Shift sprints (and swims faster in deep water), the mouse looks around (click the game to capture the mouse, Esc to release it), the wheel zooms.
* **Abilities, from the Spino game:**
    * **Bite (left click):** in the water it snaps up fish. Bite a kill to feed.
    * **Thumb Claw (Q or right click):** a lighter wound that keeps bleeding and leaves a blood trail.
    * **Dash (Space):** a lunge on land or a tail surge in the water. Nothing can hurt you during it.
    * **Submerge (C, in deep water):** only your eyes and sail show. Land hunters lose you, and a bite from below is an ambush that does 2.5 times the damage and stuns. Breath runs out after about 25 seconds.
    * **Sniff (F):** marks herds, hunters, kills and bleeding animals within 260 m.
    * **Sail Display (R):** smaller animals scatter and scavengers leave a kill, but a big hunter may take it as a challenge.
    * **Drink (hold E):** at the water's edge.
    * **Rest (hold Z):** heal while the day runs twelve times faster. Not possible with hunters about.
    * **Needs:** hunger and thirst fall all the time.
* **The world:** the same Voronoi world generator as Spino, at 20 m per map unit, so each cell is about 45 m across and the basin about 2 × 1.8 km. Cells keep their biomes and terrace levels; the steps between levels become slopes you can walk. Rivers are carved as channels deep enough to swim, with rapids where they drop a terrace, and the sea and lakes fill their basins. About 300 ponds and pools lie in the marshes, waterholes, floodplains, woods and grassland. Each is a lobed basin with lily pads, reeds and sedge round its shore. Near the player the ground is drawn every 2 m with fine relief, further off every 4 and then 8 m.
* **Forests in layers:** forests are built like real ones, with several layers in turn:
    * **Emergent giants:** conifers up to 60 m, and broadleaf giants with buttress roots.
    * **Canopy:** a closed canopy of conifers, moss-hung conifers and broadleaf trees with lianas.
    * **Sub-canopy:** ginkgos.
    * **Understory:** tree ferns, fern clumps, cycads and dense thickets.
    * **Forest floor:** ferns, shaded and strewn with fallen leaves.

    Each forest type has its own mix:
    * **Gallery forests:** moss curtains and vines.
    * **Weichselia brakes:** a low sea of fern.
    * **Tree-fern thickets:** tree ferns of every height.
    * **Mangroves:** stilt roots.
    * **Marshes:** reeds and dead snags.

    Beyond about 230 m a forest is drawn as a blanket of lumpy crowns, so distant woods read as solid walls. Elsewhere there are sedges, early flowering herbs, horsetails, reeds, lily pads, termite mounds and weathered sauropod bones. Every plant is tinted a little differently, yellower in dry country and darker under the canopy.
* **Ground cover:** within about 55 m of Spino a clump grows every couple of metres, rebuilt as you move:
    * **Open country:** grass and sedge.
    * **Forest floor:** fern sprigs.
    * **Wet ground:** horsetails.
    * **Bare rock:** pebbles.
* **Ground:** a shader paints soil and grass mottling, pebbles, tiny flowers, grass strokes, wind ripples in sand, sun-cracked mud round waterholes, leaf litter on forest floors, and rock strata on steep slopes.
* **Pen strokes, after Ricardo Delgado's Age of Reptiles:** scalloped marks over the leaves, broken lines down the bark, and wrinkle lines and scale stipple on every animal's hide. All of them are thicker on the shaded side.
* **Animals at real scale:** the Spino game's animals, sized from their weight (or their recorded length for the giants).
    * **Herds:** plant-eaters move in herds that stay together, graze, wander down to the water to drink, and bolt together.
    * **Predators:** big predators warn you, then stalk and bite.
    * **Scavengers:** smaller hunters gather at a kill, and pterosaurs circle low over it.
    * **Water life:** crocodiles, turtles and big fish live in the rivers and ponds.
* **Small life:**
    * **Fish:** schools turn in the ponds and channels and sometimes leap.
    * **Overhead:** flocks of little pterosaurs and birds wheel in the sky.
    * **At night:** fireflies come out.
    * **Water:** splashes and ripples spread from anything moving through it.
* **A day lasts ten minutes:** sunrise, a sun that crosses the sky, an orange sunset, then stars and moonlight until dawn. Flat comic clouds drift over and catch the sunset.
* **Atmosphere:** the comic pass rebuilds each pixel's position from the depth buffer and adds distance haze and height fog. The far land fades in a few soft steps, like the paler planes of a printed landscape, and the haze glows towards the sun. Mist lies thick in the valleys at dawn, thins through the day and gathers again at dusk and at night. Banks of mist drift over the rivers and ponds.
* **Soundscape:** everything is synthesised with WebAudio, nothing is loaded:
    * **Beds:** wind, leaf rustle and river water, rising and falling with where you are.
    * **Insects:** a cicada chorus by day and crickets at night.
    * **Animal voices:** frogs near water, birds and pterosaurs, and calls from the real animals nearby, panned to where they stand: sauropod hoots, iguanodont honks, the growls of big hunters, crocodile bellows.
    * **Spino:** footfalls, splashes, bites, the claw and the roar of the sail display.
    * **Underwater:** sound is muffled while you are submerged.
    * **Mute:** M turns the sound off.
* **Quality:** add `?q=low` to the address for half the plants and a smaller patch of ground cover.
* **Comic look:**
    * **Ink lines:** one pixel wide and solid, found on inverse depth so the ground doesn't fill with lines. Thin ink outlines go round the animals.
    * **Colour:** flat tone bands, pen hatching in the deepest shadow, extra vibrance on dull colours and a warm paper tint.
* **Spino up close:** finer bodies and real reptile eyes (a gold iris with a slit pupil under a brow ridge) for every animal, and extra detail and pale skin flecks on the player.

Code: `src/roam/` (world sampling and ponds, terrain chunks, forest layers and the canopy blanket, plants, ground cover, ground and stroke shaders, water and mist, sky and atmosphere, comic pass, player and abilities, wildlife, small life, soundscape, HUD). Add `?seed=77` for another world. In the console, `roam.warp(10)` runs the world ten seconds forward.

The turn-based Spino game is on `claude/spino-kemkem`.

Play it here: https://slahuddeen.github.io/big-al/spino/

# Spino

A survival game set on the Kem Kem rivers of North Africa, about 95 million years ago. You hatch on a sandbank as a one-kilogram Spinosaurus and grow into a seven-tonne river giant. It is built on the same engine as Big Al, with its own world, animals, rules and art style.

The look follows Ricardo Delgado's *Age of Reptiles: Ancient Egyptians* comics: flat colour, ink outlines, pen hatching in the shadows, teal water and cream skies, and boldly patterned animals.

## The world

The rivers run north to the Tethys Sea and end in a mangrove delta and tidal flats. Highlands lie to the west.

* **Water:** the great river (deep channels), braided shallows, oxbow lakes, pools, fern swamps, the mangrove delta and the tidal flats.
* **Banks:** sandbars, floodplain, dry channels, log jams left by floods, and the sandbank where Spino hatches.
* **Woods:** conifer galleries along the rivers, conifer woods, Weichselia fern brakes, tree-fern thickets and open woods.
* **Open and dry ground:** fern flats and meadows, dry savanna, scrub, titan trails, red hills, hamada, boulder fields, red badlands, mesas and dunes.

## The animals

The Kem Kem had far more big predators than big plant-eaters ("Stromer's riddle") because the rivers were full of fish. So does the game.

* **Predators on land:** Carcharodontosaurus (the apex rival, green with a lavender mouth), Bahariasaurus, Sauroniops, Deltadromeus, Rugops, small zebra-striped noasaurids and gangs of the land crocodile Araripesuchus.
* **In the water:** Elosuchus, Laganosuchus (the pancake croc), Aegisuchus (the shieldcroc), a river plesiosaur, the giant sawfish Onchopristis, the river shark Tribodus, Mawsonia (a coelacanth the size of a crocodile), the giant bichir Bawitius, lungfish, Calamopleurus, shoals of small fish and Hamadachelys turtles.
* **Pterosaurs:** Alanqa stalks the mudflats and swallows hatchlings. Siroccopteryx skims the river for fish. Afrotapejara has a bright crest, and Leptostomia probes the mud.
* **Plant-eaters:** zebra-striped iguanodonts, plus the titan herds on the trails: Rebbachisaurus, Aegyptosaurus and Paralititan, one of the largest animals that ever lived, drawn at its real size.
* **Spinosaurs:** young spinosaurs (clutch-mates you can fish with) and grown rivals that defend their stretch of river.
* **Small animals:** dragonflies, crickets, centipedes, scorpions, frogs, lizards and the early snake Lapparentophis. They fade from view as you grow.
* **Odd neighbours:**
  * Kaprosuchus, the tusked "BoarCroc";
  * a feathered raptor with sickle claws;
  * a small toothed bird with claws on its wings;
  * Obaichthys, an armoured gar;
  * Simoliophis, a heavy-boned sea snake;
  * Pachyrhachis, a sea snake that still had tiny hind legs.

Rugops and Kaprosuchus come from neighbouring Niger, and Pachyrhachis from the eastern shore of the same sea, rather than the Kem Kem itself. The noasaurid and the iguanodont stand in for animals known from the region only from fragments.

## Learning as you play

* Every animal has a diet: herbivore, carnivore, piscivore (fish-eater), omnivore or insectivore. It shows on its card, in the journal and on the map.
* Hover over an animal's picture (or tap it on a phone) for its field-guide card:
  * what kind of animal it was;
  * its real size;
  * where its fossils were found, and how complete they are;
  * a few facts about how it lived.
* New discoveries in the field notes say what the animal ate.

## Playing as a spinosaur

* **Water is your refuge.** Land predators will not follow you into the deep channels and lakes, and they lose your trail when you swim off. Crocodiles, sharks and plesiosaurs live there, though.
* **Growing into the river:**
  * As a hatchling under 4 kg, the main river sweeps you away, so stay in the shallows, pools and swamps.
  * Once you are bigger the great river is yours.
  * Swimming gets cheaper as you grow (Paddle Tail), and walking gets dearer.
* **Fishing:** your snout is built for fish, so they rarely slip away (Fish Catcher). Snap is a quick strike that works best on fish and small, fast prey.
* **Submerge:** sink until only your eyes show. Small spinosaurs can also hide in thick cover on land. From the sub-adult stage you can only hide in water.
* **Abilities for a grown spinosaur:**
  * Water Ambush: strike from the water at prey drinking at the edge.
  * Sail Display: drives off smaller predators and scavengers.
  * Thumb Claw: rakes big prey and lets it bleed.
* **Seasons and the flood pulse:**
  * Wet season: rain, and the herds spread over the green plains.
  * Dry season: small waters dry up. Fish get trapped in shrinking pools and lungfish bury themselves in the mud, so everything crowds round the main channels.
* **Big prey:** cut a titanosaur calf off from its herd, bring down a giant, or take on Carcharodontosaurus.
* **The rest of the Big Al systems:** round-based fights with health bars, carcasses and blood trails, chasing predators, weather and wind, mist, a field journal, landmarks and goals for every stage of growth.

## Controls

| Action | How |
| --- | --- |
| Move | Click a highlighted neighbouring area |
| Travel | Click any explored area further away |
| Pan | Drag, or WASD / arrow keys |
| Orbit and tilt | Right-drag (or Shift-drag, or middle-drag), or Q / E to rotate |
| Zoom | Mouse wheel, or + / - |
| Re-centre on Spino | C (V resets rotation, tilt and zoom) |
| Actions | 1 Sleep, 2 Drink, 3 Submerge, 4 Sniff, 5 Dash, 6 Sail Display |
| Field journal | J |

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # served from /big-al/spino/
```

* This branch (`claude/spino-kemkem`) is the Spino game. Big Al lives on `main`.
* Species, habitats and spawn tables are in `src/data/species.js`. Biomes are in `src/data/terrain.js` and world generation in `src/world/worldGen.js`.
* The Spinosaurus model (`buildSpino`) is in `src/three/creatures3d.js`, along with every other model, the fish and plesiosaur builders, and the sail and paddle-tail options for bipeds.
* Water rules (who can enter which water, swimming costs, submerging) are near the top of `src/game/gameState.js`.
* The comic look (ink lines from depth and colour edges, flat tone bands, hatching) is in `src/three/postfx.js`. The UI theme is at the end of `src/index.css`.
* All UI portraits are rendered from the 3D models.
* Add `?seed=1234` to replay a map. Open `/gallery.html` on the dev server to see every model (`?only=Big%20Al%201,Big%20Al%204,Carcharodontosaurus`).
* Dev console helpers: `spawnCreature('Onchopristis')`, `setStats({ level: 4, weight: 7000 })`, `teleport('mangrove', 0)`.
