// ==================== FIELD GUIDE ====================
// What each animal ate, what it was, how big it really grew, where its fossils
// come from and a few tidbits, for the creature cards and the journal. Sizes are
// rounded; many of these animals are known from only a few bones, and the notes
// say so where it matters.

export const DIETS = {
    herbivore: { label: 'Herbivore', short: 'Plant-eater', note: 'eats plants', color: '#7ccf6a', icon: 'leaf' },
    carnivore: { label: 'Carnivore', short: 'Meat-eater', note: 'eats other animals', color: '#ef6f5f', icon: 'claw' },
    piscivore: { label: 'Piscivore', short: 'Fish-eater', note: 'eats mostly fish', color: '#5fb8e8', icon: 'fish' },
    omnivore: { label: 'Omnivore', short: 'Eats anything', note: 'eats both plants and animals', color: '#f0c24a', icon: 'paw' },
    insectivore: { label: 'Insectivore', short: 'Bug-eater', note: 'eats insects, worms and other small invertebrates', color: '#c8a0f0', icon: 'bug' }
};

const f = (group, diet, size, known, facts) => ({ group, diet, size, known, facts });

export const SPECIES_FACTS = {
    // ---- small animals ----
    Dragonfly: f('Insect (dragonfly)', 'insectivore', 'Wingspan about 8 cm', 'Insects of this kind are found worldwide',
        ['Dragonflies were already very old by this time: their relatives flew over 300 million years ago.', 'They catch other insects in mid-air; their young hunt underwater.']),
    Cricket: f('Insect (cricket)', 'omnivore', 'About 3 cm', 'Insects of this kind are found worldwide',
        ['Crickets and katydids were already singing. The song of a 165-million-year-old katydid has been rebuilt from its fossil wings.']),
    Centipede: f('Centipede', 'carnivore', 'About 10 cm', 'Animals of this kind are found worldwide',
        ['Its first pair of legs are hollow fangs that inject venom.', 'Centipedes have hunted on land for more than 400 million years.']),
    Scorpion: f('Scorpion', 'carnivore', 'About 8 cm', 'Animals of this kind are found worldwide',
        ['Scorpions were among the first animals to live on land.', 'Living scorpions glow blue-green under ultraviolet light.']),
    Frog: f('Frog (Oumtkoutia)', 'insectivore', 'About 8 cm', 'Kem Kem beds, Morocco; known from backbones',
        ['Oumtkoutia was named in 2008 from fossil vertebrae found in the Kem Kem beds.', 'Frogs snap up insects with a sticky, flick-out tongue.']),
    Lizard: f('Lizard', 'insectivore', 'About 30 cm', 'Small lizard bones are found in the Kem Kem beds',
        ['Lizards were already widespread, but their small, fragile bones are rarely preserved.']),
    Fish: f('Ray-finned fish', 'omnivore', '10 to 30 cm', 'Kem Kem beds, Morocco',
        ['Dozens of fish species lived in these rivers. Shoals of small fish fed almost every predator here, from pterosaurs to Spinosaurus.']),
    Lapparentophis: f('Snake', 'carnivore', 'About 1 m', 'Algeria and Morocco; known only from backbones',
        ['One of the oldest snakes known anywhere.', 'It lived on land, not in the water, which helps show where snakes first evolved.']),
    Hamadachelys: f('Side-necked turtle', 'omnivore', 'Shell about 30 cm', 'Kem Kem beds, Morocco',
        ['A side-necked turtle: it folds its neck sideways under the edge of its shell instead of pulling it straight back.', 'Side-necked turtles still live in Africa, South America and Australia.']),
    Leptostomia: f('Pterosaur', 'insectivore', 'Wingspan about 1.5 m (estimate)', 'Kem Kem beds; known from pieces of the jaws',
        ['Named in 2020. Its beak was long, thin and pointed, like a kiwi or sandpiper.', 'It probably probed mud and soil for worms and shellfish.']),
    Araripesuchus: f('Crocodyliform', 'carnivore', 'About 1 m', 'Kem Kem beds; relatives in Niger and Brazil',
        ['A small, long-legged land crocodile that could run with its body held high.', 'Close relatives lived in both Africa and South America, which had only just split apart.']),

    // ---- middle-sized animals ----
    Noasaurid: f('Theropod dinosaur (noasaurid)', 'carnivore', '2 to 3 m', 'Kem Kem beds; known from scattered bones',
        ['Noasaurids were small, lightly built relatives of Ceratosaurus.', 'One, Masiakasaurus from Madagascar, had front teeth that stuck forward, perhaps for snatching fish.']),
    Lungfish: f('Lungfish', 'omnivore', 'About 1 m', 'Kem Kem beds; tooth plates are very common',
        ['Lungfish breathe air with a lung as well as gills.', 'African lungfish alive today survive droughts sealed in mud cocoons for months.', 'They crush snails and plants with tough tooth plates.']),
    Calamopleurus: f('Bowfin (amiid fish)', 'piscivore', 'About 1.5 m', 'Morocco and Brazil',
        ['A big relative of the bowfin, which still lives in North American swamps.', 'Bowfins can gulp air, useful in warm, oxygen-poor water.']),
    Bawitius: f('Bichir (polypterid fish)', 'carnivore', 'Up to 3 m (estimate)', 'Bahariya Formation, Egypt; known from bones and scales',
        ['A giant bichir. Bichirs still live in African rivers, but today none is longer than about a metre.', 'Bichirs have a row of little sail-like fins along the back and thick, armoured scales.']),
    Tribodus: f('Hybodont shark', 'carnivore', 'About 2 m', 'Brazil and North Africa',
        ['Hybodont sharks had a spine at the front of each back fin.', 'Flat crushing teeth at the back of its jaws cracked shellfish.', 'Hybodonts lived in rivers as well as the sea, and died out with the dinosaurs.']),
    Afrotapejara: f('Pterosaur (tapejarid)', 'omnivore', 'Wingspan about 2 m (estimate)', 'Kem Kem beds; known from the front of the jaw',
        ['Named in 2020. Tapejarids had toothless beaks and tall head crests.', 'They may have eaten fruit and seeds as well as small animals.']),
    Siroccopteryx: f('Pterosaur (ornithocheirid)', 'piscivore', 'Wingspan about 4 to 5 m', 'Kem Kem beds; known from the snout',
        ['It had a rounded crest at the tip of its snout and long, interlocking teeth for gripping slippery fish.', 'It probably snatched fish from the surface while flying, or while sitting on the water.']),
    'Injured Pterosaur': f('Pterosaur', 'piscivore', 'Wingspan about 3 m', 'Many pterosaurs are known from the Kem Kem beds',
        ['Pterosaurs were not dinosaurs but close cousins. They were the first vertebrates to fly.', 'Their wings were skin stretched from one hugely long fourth finger.']),
    Iguanodont: f('Ornithopod dinosaur (iguanodontian)', 'herbivore', 'About 6 m', 'Only scrappy remains from the Kem Kem beds',
        ['Plant-eaters like this were rare here, one of the clues to "Stromer\'s riddle".', 'Iguanodontians had a spike for a thumb and could walk on two legs or four.']),

    // ---- big animals ----
    Alanqa: f('Pterosaur (azhdarchid)', 'carnivore', 'Wingspan about 4 to 6 m', 'Kem Kem beds; known from jaws and neck bones',
        ['Azhdarchids probably hunted on foot, striding about like giant storks and snapping up small animals.', 'Its long, straight, toothless jaws were built for stabbing and grabbing.']),
    'Young Spinosaurus': f('Theropod dinosaur (spinosaurid)', 'piscivore', 'About 2 to 4 m', 'Kem Kem beds',
        ['A toe bone from a Spinosaurus only about 1.8 m long has been found in Morocco, so young ones lived along these rivers too.']),
    'River Plesiosaur': f('Plesiosaur (leptocleidid)', 'piscivore', 'About 3 m', 'Kem Kem beds; known from teeth and bones',
        ['Plesiosaurs were marine reptiles, but teeth found in the Kem Kem rivers suggest some swam far up the rivers.', 'They "flew" through the water with four long flippers.']),
    Mawsonia: f('Coelacanth', 'carnivore', '3.5 to 5 m (estimates)', 'Morocco, Algeria, Egypt and Brazil',
        ['One of the largest coelacanths ever.', 'Coelacanths were thought to have died out with the dinosaurs until a living one was caught off South Africa in 1938.']),
    Laganosuchus: f('Crocodyliform', 'piscivore', 'About 6 m', 'Niger and Morocco; known from jaws and skull',
        ['Nicknamed "PancakeCroc" for its flat, wide head.', 'It probably lay still with its jaws open and snapped them shut on fish that swam in.']),
    Elosuchus: f('Crocodyliform', 'piscivore', 'Perhaps 8 to 10 m (estimate)', 'Kem Kem beds, Morocco and Algeria',
        ['A long, narrow snout full of needle-like teeth, like a gharial: built for catching fish.']),
    Rugops: f('Theropod dinosaur (abelisaurid)', 'carnivore', 'About 6 m', 'Echkar Formation, Niger, the same age as the Kem Kem',
        ['Its name means "wrinkle face": its short skull was rough and pitted, perhaps with horny skin and display crests.', 'Only its skull has been found, but its relatives, like Carnotaurus, had tiny arms, even shorter than T. rex\'s.', 'It may have scavenged as well as hunted.']),
    Deltadromeus: f('Theropod dinosaur (ceratosaur, probably a noasaurid)', 'carnivore', 'About 8 m', 'Kem Kem beds, Morocco',
        ['Its name means "delta runner". Its very long, slender legs suggest it was fast.', 'Where it sits in the family tree is still argued over; Bahariasaurus may be the same kind of animal.']),
    Onchopristis: f('Sawskate (sclerorhynchid ray)', 'piscivore', 'Perhaps 5 to 8 m', 'Kem Kem beds and North Africa',
        ['Not a true sawfish but a related ray, which evolved a toothed saw separately.', 'Each saw tooth carried hooked barbs. It probably slashed through shoals of fish.']),
    Aegisuchus: f('Crocodyliform', 'piscivore', 'Huge but uncertain: estimates run from about 9 to 20 m', 'Kem Kem beds; known only from part of the skull',
        ['Nicknamed "ShieldCroc". The top of its very flat skull had a raised, blood-rich area, perhaps a coloured shield for display.', 'Like Laganosuchus, it may have waited with its jaws open for fish.']),
    Sauroniops: f('Theropod dinosaur (carcharodontosaurid)', 'carnivore', 'Perhaps 9 to 12 m', 'Kem Kem beds; known from a single bone of the skull roof',
        ['Named in 2012 after the Eye of Sauron, because the only fossil is the bone above the eye.', 'A dome on that bone may have been for display, or even head-butting rivals.']),
    Bahariasaurus: f('Theropod dinosaur', 'carnivore', 'About 11 m', 'Bahariya Formation, Egypt',
        ['Its fossils were destroyed in a 1944 bombing raid on Munich, along with the first Spinosaurus.', 'It may have been a giant relative of Deltadromeus.']),
    Carcharodontosaurus: f('Theropod dinosaur (carcharodontosaurid)', 'carnivore', '12 to 13 m', 'Kem Kem beds, Morocco; Egypt; Algeria',
        ['Its name means "shark-toothed lizard": its blade-like teeth were serrated like a great white shark\'s.', 'Its skull was about 1.6 m long, one of the largest of any meat-eating dinosaur.', 'It was the top land predator here, while Spinosaurus ruled the rivers.']),
    Spinosaurus: f('Theropod dinosaur (spinosaurid)', 'piscivore', 'About 14 m', 'Egypt (first found 1912) and the Kem Kem beds, Morocco',
        ['The longest meat-eating dinosaur known.', 'It had a sail of spines up to 1.65 m tall, dense bones like a penguin\'s, nostrils set far back on its long snout, and a paddle-like tail.', 'Scientists still argue about whether it swam after prey or waded like a giant heron.']),
    Rebbachisaurus: f('Sauropod dinosaur (rebbachisaurid)', 'herbivore', 'About 14 to 20 m', 'Kem Kem beds, Morocco',
        ['Tall spines on its backbone raised a ridge, or even a low sail, along its back.', 'Relatives like Nigersaurus had broad mouths lined with hundreds of teeth for mowing low plants.']),
    Aegyptosaurus: f('Sauropod dinosaur (titanosaur)', 'herbivore', 'About 15 m', 'Bahariya Formation, Egypt',
        ['Its bones were also destroyed in the 1944 bombing of Munich.', 'Many titanosaurs had bony armour plates set in the skin of the back.']),
    Paralititan: f('Sauropod dinosaur (titanosaur)', 'herbivore', 'Perhaps 26 m and 50 tonnes or more', 'Bahariya Formation, Egypt; found in 2001',
        ['One of the largest animals ever to walk the Earth. Its upper arm bone alone is 1.69 m long.', 'It was found in rocks laid down by a tidal mangrove forest; its name means "tidal giant".']),

    // ---- added animals ----
    Kaprosuchus: f('Crocodyliform', 'carnivore', 'About 6 m', 'Echkar Formation, Niger, the same age as the Kem Kem; known from one skull',
        ['Nicknamed "BoarCroc" for three pairs of tusks sticking up and down from its jaws.', 'Its eyes faced partly forward and its nostrils pointed forward too: it probably hunted on land, perhaps ramming prey with its armoured snout.']),
    Dromaeosaur: f('Theropod dinosaur (dromaeosaurid, a "raptor")', 'carnivore', 'About 2 m', 'Known here only from small serrated teeth',
        ['Raptors were covered in feathers, with long feathered arms like wings.', 'Each foot had an enlarged, sickle-shaped claw on the second toe, for pinning prey down.', 'Small teeth like theirs have been reported from the Kem Kem beds, though experts disagree about which dinosaur they came from.']),
    Enantiornithine: f('Bird (enantiornithine)', 'insectivore', 'About 20 cm', 'Birds of this group lived worldwide; Kem Kem bird fossils are only fragments',
        ['The commonest birds of the Cretaceous. Most still had teeth and claws on their wings.', 'They all died out at the end of the Cretaceous; today\'s birds come from a different branch.']),
    Simoliophis: f('Sea snake (simoliophiid)', 'piscivore', 'About 1 m', 'Bahariya Formation, Egypt, and North Africa',
        ['A snake that lived in shallow coastal water.', 'Its ribs and backbone were thick and heavy, like ballast, to help it stay under water.']),
    Pachyrhachis: f('Sea snake with hind legs', 'piscivore', 'About 1 m', 'Ein Yabrud, on the eastern shore of the same Tethys Sea',
        ['It still had a pair of tiny hind legs.', 'Its flattened body helped it swim in the shallows.', 'Snakes like this show that snakes evolved from four-legged lizards.']),
    Obaichthys: f('Gar (lepisosteid fish)', 'piscivore', 'About 1 m or more', 'Kem Kem beds, Morocco',
        ['A gar, armoured in thick, shiny, diamond-shaped scales.', 'Gars hang motionless in the water, then snatch passing fish with a sideways snap of their long jaws.', 'They still live in the rivers of North America.'])
};

export const factsOf = (species) => SPECIES_FACTS[species] || null;
export const dietOfSpecies = (species) => DIETS[SPECIES_FACTS[species]?.diet] || null;
