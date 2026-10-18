// ==================== FIELD GUIDE ====================
// What each animal ate, what it was, how big it really grew, where its fossils
// come from and a few tidbits, for the creature cards and the journal. Sizes are
// rounded, and the notes say where the evidence is thin or argued over.

export const DIETS = {
    herbivore: { label: 'Herbivore', short: 'Plant-eater', note: 'eats plants', color: '#6f9a5c', icon: 'leaf' },
    carnivore: { label: 'Carnivore', short: 'Meat-eater', note: 'eats other animals', color: '#b8473c', icon: 'claw' },
    piscivore: { label: 'Piscivore', short: 'Fish-eater', note: 'eats mostly fish', color: '#4d7fa0', icon: 'fish' },
    omnivore: { label: 'Omnivore', short: 'Eats anything', note: 'eats both plants and animals', color: '#b8892e', icon: 'paw' },
    insectivore: { label: 'Insectivore', short: 'Bug-eater', note: 'eats insects, worms and other small invertebrates', color: '#8a6aa8', icon: 'bug' }
};

const f = (group, diet, size, known, facts) => ({ group, diet, size, known, facts });
const YIXIAN = 'Yixian Formation, Liaoning, China';
const JIUFOTANG = 'Jiufotang Formation, Liaoning (a few million years younger)';

const YUTYRANNUS = ['The largest animal known to have had feathers: simple filaments up to 20 cm long covered its body.',
    'Its name means "beautiful feathered tyrant".',
    'Three were found together, an adult and two younger animals, so they may have lived or hunted in groups.',
    'Winters here were cold, and a coat of filaments would have kept a big animal warm.'];

export const SPECIES_FACTS = {
    // ---- small animals ----
    Mayfly: f('Insect (mayfly, Ephemeropsis)', 'herbivore', 'About 3 cm', YIXIAN,
        ['Its larvae are among the most common fossils in the lake beds, sometimes thousands to a slab.', 'The young live for months under water grazing algae; the adults live only a day or two.']),
    Lacewing: f('Insect (kalligrammatid lacewing)', 'herbivore', 'Wingspan up to about 15 cm', YIXIAN,
        ['It had eyespots on its wings and a long sucking mouth, like a butterfly, though butterflies did not exist yet.', 'It probably fed on sugary drops from the cones of plants related to cycads.']),
    Cricket: f('Insect (cricket and katydid relatives)', 'omnivore', 'About 3 cm', 'Insects of this kind are found worldwide',
        ['Crickets and katydids were already singing. Their wings carried the same file-and-scraper used by living crickets.']),
    Frog: f('Frog (Liaobatrachus)', 'insectivore', 'About 6 cm', YIXIAN,
        ['Several kinds of frog are known from the Jehol, some preserved with their skin outlines.', 'Its tadpoles have been found too, in the same lake muds.']),
    Salamander: f('Salamander (Liaoxitriton)', 'insectivore', 'About 10 cm', YIXIAN,
        ['Salamanders of this age are rare anywhere; China has some of the best.', 'It lived in damp places and laid its eggs in water.']),
    Lycoptera: f('Bony fish (Lycoptera)', 'omnivore', 'About 8 cm', YIXIAN,
        ['The most common fossil fish of the Jehol. Whole shoals died together, probably poisoned by gas or ash from an eruption.', 'A relative of the living bonytongues and mooneyes.']),
    Xianglong: f('Gliding lizard', 'insectivore', 'About 15 cm', YIXIAN,
        ['Eight long ribs on each side held out a skin membrane for gliding, like the living Draco lizards of Southeast Asia.', 'The fossil is a young animal, so adults may have been bigger.']),
    Eomaia: f('Early mammal (eutherian)', 'insectivore', 'About 20 cm with its tail, 20 to 25 g', YIXIAN,
        ['Its name means "dawn mother". It was hailed as the earliest relative of placental mammals; some now think it sits a little further from them.', 'Its fur is preserved as a dark halo around the skeleton, and its feet were built for climbing.']),
    Dendrorhynchoides: f('Pterosaur (anurognathid)', 'insectivore', 'Wingspan about 40 cm', YIXIAN,
        ['Anurognathids had short, wide heads, big eyes and fuzzy bodies, a bit like a frogmouth bird.', 'They probably caught insects on the wing, perhaps at dusk.']),
    Confuciusornis: f('Early bird', 'omnivore', 'About 50 cm with tail streamers', `${YIXIAN} and Jiufotang Formation`,
        ['The oldest known bird with a toothless beak.', 'Thousands of fossils are known, more than of any other Mesozoic bird.', 'One was found with fish remains in its gut; it may have eaten seeds as well.']),
    'Mei long': f('Troodontid', 'omnivore', 'About 53 cm', YIXIAN,
        ['Its name means "soundly sleeping dragon".', 'It was buried curled up with its head tucked under its arm, the way birds sleep, probably overcome by volcanic gas or ash.']),
    Sinosauropteryx: f('Compsognathid theropod', 'carnivore', 'About 1 m', YIXIAN,
        ['Found in 1996, the first dinosaur known to have feather-like filaments.', 'Pigment cells show a ginger back, a pale belly, a ringed tail and a dark mask through the eye.', 'Specimens have been found with a lizard and the jaws of small mammals in their guts.']),
    Microraptor: f('Dromaeosaur (four-winged)', 'carnivore', 'About 80 cm', JIUFOTANG,
        ['Long flight feathers on both its arms and legs gave it four wings.', 'Its feathers were glossy black with an iridescent sheen, like a crow or starling.', 'Fossils have been found with a bird, a lizard, a mammal and fish in their stomachs: it ate whatever it could catch.']),
    Monjurosuchus: f('Choristodere', 'carnivore', 'About 40 cm', YIXIAN,
        ['A small, lizard-like swimmer with webbed hind feet, preserved with its skin outline.', 'Choristoderes were an extinct group of reptiles; some looked like crocodiles, some like lizards.']),
    Peipiaosteus: f('Acipenseriform fish (sturgeon and paddlefish relative)', 'insectivore', 'Tens of centimetres long', YIXIAN,
        ['Almost scaleless, with a skeleton partly of cartilage, like a sturgeon.', 'Its mouth sat underneath its snout, for feeding along the lake bed.']),
    Manchurochelys: f('Freshwater turtle', 'omnivore', 'Shell about 25 cm', YIXIAN,
        ['One of the turtles of the Jehol lakes, first described in the 1940s.', 'Turtles were already very old: they had been around for more than 100 million years.']),
    Hyphalosaurus: f('Choristodere', 'piscivore', 'Up to about 80 cm', YIXIAN,
        ['A tiny head on a neck of 19 or more vertebrae, longer than its body.', 'A pregnant female was found with 18 young inside, so it gave birth to live young; eggs are known too.']),

    // ---- middle-sized ----
    Sinopterus: f('Tapejarid pterosaur', 'omnivore', 'Wingspan about 1.2 m', JIUFOTANG,
        ['A short, toothless beak with a downturned tip, and a crest on its head.', 'One specimen has stomach stones, a hint that it ate plants such as seeds or fruit, at least some of the time.']),
    Changyuraptor: f('Dromaeosaur (four-winged)', 'carnivore', 'About 1.3 m, around 4 kg', YIXIAN,
        ['A large relative of Microraptor, with long feathers on its legs as well as its arms.', 'Its tail feathers, about 30 cm long, are the longest known in a non-bird dinosaur, perhaps to help it slow down and land.']),
    Liaoningosaurus: f('Ankylosaur', 'herbivore', 'The known fossil is about 34 cm long (a young animal)', YIXIAN,
        ['The smallest ankylosaur known, and unusual in having bony plates on its belly as well as its back.', 'Remains of fish in its gut led to the idea that it hunted in water. Not everyone agrees; the fish may have been swallowed some other way.']),
    Feilongus: f('Pterosaur', 'piscivore', 'Wingspan about 2.4 m', YIXIAN,
        ['Its upper jaw overhung the lower one, and both were lined with thin teeth.', 'It had a crest on the front of its snout and another at the back of its skull.']),
    Repenomamus: f('Gobiconodont mammal', 'carnivore', 'About 0.7 m (R. robustus); R. giganticus reached about 1 m and 12 kg', YIXIAN,
        ['One of the largest mammals of the dinosaur age.', 'One was found with the bones of a young Psittacosaurus in its stomach.', 'Another was found locked onto a Psittacosaurus, biting it, when both were buried by a volcanic mudflow.']),
    Incisivosaurus: f('Oviraptorosaur', 'herbivore', 'About 1 m', YIXIAN,
        ['A pair of large, rodent-like front teeth, worn down like a plant-eater\'s.', 'An early member of the group that later gave rise to the toothless, beaked oviraptors.']),
    Caudipteryx: f('Oviraptorosaur', 'omnivore', 'About 1 m', YIXIAN,
        ['Its name means "tail feather": its short tail ended in a fan.', 'It swallowed stones to help grind its food, as many birds do.', 'Its arms carried short wings, too small for flight.']),
    Dilong: f('Early tyrannosauroid', 'carnivore', 'About 1.6 m', YIXIAN,
        ['A small, early relative of Tyrannosaurus, from long before the giant ones.', 'It had simple filaments on its jaw and tail, and a low, Y-shaped crest on its snout.']),
    Zhenyuanlong: f('Dromaeosaur', 'carnivore', 'About 1.65 m', YIXIAN,
        ['Short arms for a raptor, but with large, fully formed wing feathers.', 'Too heavy to fly. The wings may have been for display, for shielding eggs, or for balance when running.']),
    Sinocalliopteryx: f('Compsognathid theropod', 'carnivore', 'About 2.4 m', YIXIAN,
        ['The largest compsognathid known.', 'One was found with two Confuciusornis birds in its gut, another with the leg of a small raptor, Sinornithosaurus.']),
    Psittacosaurus: f('Early ceratopsian', 'herbivore', 'About 1.5 m', YIXIAN,
        ['A parrot-like beak and a horn on each cheek. Triceratops is a distant relative.', 'A row of long bristles stood up along its tail.', 'Pigment shows it was darker above and paler below, good camouflage in a dim forest.', 'Groups of young buried together suggest that the young gathered in crèches.']),
    Beipiaosaurus: f('Therizinosaur', 'herbivore', 'About 2.2 m', YIXIAN,
        ['A pot-bellied plant-eater with long hand claws, descended from meat-eating ancestors.', 'Besides its fuzz it had long, stiff, broad quills up to 15 cm on its head, neck and back, probably for display.']),

    // ---- big animals ----
    'Young Yutyrannus': f('Early tyrannosauroid', 'carnivore', 'Grows to 9 m and about 1.4 tonnes', YIXIAN, YUTYRANNUS),
    Jinzhousaurus: f('Iguanodont', 'herbivore', 'About 7 m', YIXIAN,
        ['One of the largest animals of the Yixian forests.', 'It could walk on two legs or four, cropping plants with a horny beak and grinding them with rows of cheek teeth.']),
    Yutyrannus: f('Early tyrannosauroid', 'carnivore', 'About 9 m and 1.4 tonnes', YIXIAN, YUTYRANNUS),
    Dongbeititan: f('Titanosauriform sauropod', 'herbivore', 'Perhaps 15 m or more; known from a partial skeleton', YIXIAN,
        ['The giant of the Jehol, and one of the few sauropods known from these beds.', 'Sauropods were rare here, so a herd moving through the forest would have been a rare sight.'])
};

export const factsOf = (species) => SPECIES_FACTS[species] || null;
export const dietOfSpecies = (species) => DIETS[SPECIES_FACTS[species]?.diet] || null;
