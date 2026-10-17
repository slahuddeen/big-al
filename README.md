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
