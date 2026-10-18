import { DIETS, SPECIES_FACTS } from './speciesFacts.js';
// ==================== JEHOL FAUNA ====================
// The Yixian Formation of Liaoning, north-east China, about 125 million years ago:
// forested lakes among volcanoes, with cold winters. Ash from the eruptions buried
// whole communities, preserving feathers, fur and even colour. Weights are kg for a
// grown animal.
const sp = (weight, nutrition, danger, aggression, difficulty, behaviorType, description, injury, extra = {}) => ({
    weight, nutrition, danger, aggression, difficulty, behaviorType, description, injury,
    size: extra.size ?? 1, minimumAge: extra.minimumAge ?? 0.05, emoji: '', ...extra
});

export const SPECIES_DATA = {
    // ---- tiny ----
    Mayfly: sp(0.0008, 0.12, 0, 0, 0.55, 'passive', 'Ephemeropsis: mayflies swarm over the lakes in their millions', 'flutters away'),
    Lacewing: sp(0.002, 0.2, 0, 0, 0.6, 'skittish', 'A giant lacewing with eyespots on its wings, like a butterfly', 'flashes its eyespots'),
    Cricket: sp(0.003, 0.15, 0, 0, 0.45, 'skittish', 'Chirping in the ferns at dusk', 'hops away frantically'),
    Frog: sp(0.04, 0.8, 0, 0, 0.45, 'skittish', 'Liaobatrachus, a little frog of the lake margins', 'croaks loudly'),
    Salamander: sp(0.03, 0.7, 0, 0, 0.35, 'passive', 'Liaoxitriton, a salamander that hides under wet logs', 'wriggles free'),

    // ---- small ----
    Lycoptera: sp(0.01, 0.5, 0, 0, 0.4, 'passive', 'Small fish in silver shoals, the most common fossil in the lake beds', 'flips out of your jaws', { aquatic: true }),
    Xianglong: sp(0.015, 0.4, 0, 0, 0.7, 'skittish', 'A gliding lizard that spreads skin wings over its long ribs', 'glides off to another tree'),
    Eomaia: sp(0.025, 0.6, 0.2, 0.05, 0.6, 'skittish', 'A mouse-sized climbing mammal with dense fur', 'squeaks and bites'),
    Dendrorhynchoides: sp(0.04, 0.6, 0.2, 0, 0.75, 'skittish', 'A tiny fuzzy pterosaur that snaps insects out of the air', 'flaps in your face'),
    Confuciusornis: sp(0.2, 1.6, 0.5, 0.05, 0.75, 'skittish', 'A beaked bird of the lakeshore flocks; males trail long tail streamers', 'pecks and claws with its wings'),
    'Mei long': sp(0.6, 2.5, 1.5, 0.2, 0.55, 'skittish', 'A small, big-eyed troodontid that sleeps tucked up like a bird', 'kicks with a curved claw'),
    Sinosauropteryx: sp(0.6, 2.5, 2.5, 0.45, 0.6, 'territorial', 'Ginger, ring-tailed hunter of lizards and little mammals', 'bites with needle teeth'),
    Microraptor: sp(1, 3, 4, 0.55, 0.7, 'aerial_predator', 'A glossy black four-winged raptor that glides down from the trees', 'rakes you with its claws'),
    Monjurosuchus: sp(0.6, 2.5, 2, 0.35, 0.45, 'ambush_predator', 'A small crocodile-like reptile waiting in the shallows', 'snaps from the water', { semiAquatic: true }),
    Peipiaosteus: sp(0.6, 3, 0, 0, 0.35, 'passive', 'A smooth relative of sturgeons that noses along the lake bed', 'thrashes in your jaws', { aquatic: true }),
    Manchurochelys: sp(1.5, 3, 1.5, 0.05, 0.2, 'defensive', 'A pond turtle: hard to crack', 'pulls into its shell', { semiAquatic: true }),
    Hyphalosaurus: sp(1.2, 4, 1, 0.05, 0.45, 'skittish', 'A swimming reptile with a tiny head on a very long neck', 'whips its neck away', { semiAquatic: true }),

    // ---- medium ----
    Sinopterus: sp(1.2, 3.5, 1.5, 0.05, 0.7, 'skittish', 'A crested pterosaur that walks the shore looking for fruit and seeds', 'jabs with its beak'),
    Changyuraptor: sp(4, 6, 7, 0.6, 0.6, 'ambush_predator', 'A four-winged raptor that drops on prey from the branches', 'slashes with its sickle claws'),
    Liaoningosaurus: sp(4, 5, 3, 0.1, 0.25, 'defensive', 'A small ankylosaur armoured even on its belly', 'swipes with its spiky flank'),
    Feilongus: sp(5, 6, 6, 0.3, 0.65, 'aerial_predator', 'A crested pterosaur with an overbite, snatching fish and small animals', 'stabs with its toothy jaws'),
    Repenomamus: sp(5, 7, 12, 0.6, 0.5, 'rival_predator', 'A badger-sized mammal that eats baby dinosaurs', 'locks its jaws on you'),
    Incisivosaurus: sp(6, 7, 4, 0.1, 0.55, 'skittish', 'A buck-toothed oviraptorosaur that crops low plants', 'bites with its front teeth'),
    Caudipteryx: sp(5, 7, 3, 0.1, 0.6, 'herbivore', 'Long-legged and short-tailed, flashing a fan of tail feathers', 'kicks and flaps its wings'),
    Dilong: sp(12, 12, 16, 0.6, 0.6, 'rival_predator', 'A small, fast tyrannosaur relative: your own family, and no friend', 'bites hard'),
    Zhenyuanlong: sp(18, 16, 22, 0.7, 0.6, 'pack_predator', 'A big-winged raptor that hunts in small groups', 'slashes you with a sickle claw'),
    Sinocalliopteryx: sp(20, 18, 28, 0.7, 0.55, 'rival_predator', 'A long-tailed hunter known to eat birds and raptors', 'grabs you with big hands'),
    Psittacosaurus: sp(25, 22, 15, 0.15, 0.35, 'herbivore', 'A parrot-beaked plant-eater; the young gather in crèches', 'bites with its beak'),
    Beipiaosaurus: sp(45, 35, 45, 0.3, 0.35, 'dangerous_herbivore', 'A pot-bellied, shaggy plant-eater with long hand claws', 'swipes with hooked claws'),

    // ---- large ----
    'Young Yutyrannus': sp(150, 45, 140, 0.25, 0.5, 'rival_predator', 'A young Yutyrannus of your own age: a nest-mate you could hunt with', 'snaps at you'),
    Jinzhousaurus: sp(1200, 200, 500, 0.08, 0.25, 'herbivore', 'A large iguanodont that browses the lakeside forests in small herds', 'kicks with heavy legs'),
    Yutyrannus: sp(1400, 300, 1400, 0.8, 0.6, 'apex_predator', 'A grown Yutyrannus, the feathered tyrant of the Jehol', 'bites with a mouth full of blades'),
    Dongbeititan: sp(12000, 1200, 3000, 0.08, 0.1, 'giant_herbivore', 'A long-necked giant, rare in these forests', 'tramples you')
};

// Which animals live in which habitats, and how often they turn up
export const HABITAT_SPECIES = {
    // ---- water ----
    lake: {
        Lycoptera: 0.4, Peipiaosteus: 0.2, Hyphalosaurus: 0.18, Manchurochelys: 0.12, Mayfly: 0.25,
        Feilongus: 0.15, Confuciusornis: 0.1, Monjurosuchus: 0.08
    },
    river: { Lycoptera: 0.35, Peipiaosteus: 0.15, Hyphalosaurus: 0.12, Mayfly: 0.2, Feilongus: 0.12, Monjurosuchus: 0.06 },
    stream: { Lycoptera: 0.3, Frog: 0.2, Salamander: 0.18, Mayfly: 0.2, Monjurosuchus: 0.1, Hyphalosaurus: 0.06, Sinopterus: 0.08, Psittacosaurus: 0.06 },
    waterhole: { Lycoptera: 0.25, Frog: 0.25, Salamander: 0.15, Mayfly: 0.2, Manchurochelys: 0.12, Monjurosuchus: 0.1, Psittacosaurus: 0.08, Sinopterus: 0.08 },
    marsh: {
        Frog: 0.3, Salamander: 0.2, Mayfly: 0.25, Lycoptera: 0.2, Manchurochelys: 0.12, Monjurosuchus: 0.12,
        Hyphalosaurus: 0.08, Liaoningosaurus: 0.08, Confuciusornis: 0.08, Psittacosaurus: 0.06
    },
    hotspring: { Frog: 0.12, Mayfly: 0.15, Salamander: 0.08, Confuciusornis: 0.06 },
    riverbank: {
        Confuciusornis: 0.2, Sinopterus: 0.15, Feilongus: 0.08, Frog: 0.12, Manchurochelys: 0.12, Hyphalosaurus: 0.1,
        Monjurosuchus: 0.08, Liaoningosaurus: 0.06, Psittacosaurus: 0.12, Sinosauropteryx: 0.08, Mayfly: 0.15, Jinzhousaurus: 0.04
    },
    nest: { Cricket: 0.25, Lacewing: 0.2, Mayfly: 0.2, Frog: 0.12, Salamander: 0.1, Eomaia: 0.08, Sinosauropteryx: 0.06, Repenomamus: 0.04 },

    // ---- open country ----
    meadow: {
        Lacewing: 0.2, Cricket: 0.2, Xianglong: 0.06, Caudipteryx: 0.15, Incisivosaurus: 0.1, Psittacosaurus: 0.15,
        Sinosauropteryx: 0.08, Dilong: 0.05, Zhenyuanlong: 0.04, Jinzhousaurus: 0.05, Yutyrannus: 0.02
    },
    fernprairie: {
        Cricket: 0.2, Lacewing: 0.12, Psittacosaurus: 0.18, Caudipteryx: 0.1, Incisivosaurus: 0.08, 'Mei long': 0.08,
        Sinosauropteryx: 0.08, Dilong: 0.06, Sinocalliopteryx: 0.04, Zhenyuanlong: 0.04, Jinzhousaurus: 0.06, Yutyrannus: 0.02
    },
    floodplain: { Frog: 0.18, Mayfly: 0.15, Cricket: 0.12, Psittacosaurus: 0.15, Caudipteryx: 0.08, Confuciusornis: 0.1, Sinopterus: 0.08, Jinzhousaurus: 0.06, Dilong: 0.04 },
    scrubland: { Cricket: 0.18, Xianglong: 0.06, Incisivosaurus: 0.12, Caudipteryx: 0.1, Beipiaosaurus: 0.08, Sinosauropteryx: 0.08, 'Mei long': 0.08, Dilong: 0.05, Liaoningosaurus: 0.05 },
    sauropodgrounds: { Dongbeititan: 0.45, Jinzhousaurus: 0.15, Psittacosaurus: 0.1, Sinocalliopteryx: 0.06, Zhenyuanlong: 0.05, Yutyrannus: 0.06 },
    ashflat: { Cricket: 0.08, Sinosauropteryx: 0.05, Sinopterus: 0.05, Feilongus: 0.04 },

    // ---- woods ----
    forest: {
        Cricket: 0.15, Lacewing: 0.12, Salamander: 0.08, Eomaia: 0.12, Xianglong: 0.1, Microraptor: 0.12, Changyuraptor: 0.06,
        Confuciusornis: 0.1, Dendrorhynchoides: 0.08, 'Mei long': 0.08, Sinosauropteryx: 0.06, Repenomamus: 0.06, Dilong: 0.05,
        Beipiaosaurus: 0.05, Sinocalliopteryx: 0.04, Yutyrannus: 0.02
    },
    oldgrowth: {
        Salamander: 0.12, Eomaia: 0.12, Xianglong: 0.12, Microraptor: 0.12, Changyuraptor: 0.08, Dendrorhynchoides: 0.08,
        Repenomamus: 0.07, Beipiaosaurus: 0.06, Sinocalliopteryx: 0.05, Jinzhousaurus: 0.05, Yutyrannus: 0.03
    },
    ginkgogrove: {
        Lacewing: 0.15, Cricket: 0.12, Eomaia: 0.1, Xianglong: 0.1, Microraptor: 0.08, Confuciusornis: 0.12,
        Sinopterus: 0.1, Incisivosaurus: 0.1, Psittacosaurus: 0.08, Beipiaosaurus: 0.06, Dilong: 0.04
    },
    denseforest: {
        Cricket: 0.18, Salamander: 0.12, Eomaia: 0.12, 'Mei long': 0.1, Repenomamus: 0.08, Sinosauropteryx: 0.08,
        Changyuraptor: 0.06, Zhenyuanlong: 0.05, Psittacosaurus: 0.08, Liaoningosaurus: 0.05
    },
    galleryforest: {
        Frog: 0.12, Salamander: 0.12, Mayfly: 0.12, Eomaia: 0.08, Xianglong: 0.08, Microraptor: 0.1, Confuciusornis: 0.12,
        Dendrorhynchoides: 0.1, Monjurosuchus: 0.05, Psittacosaurus: 0.08, Jinzhousaurus: 0.05, Sinocalliopteryx: 0.04, Yutyrannus: 0.02
    },
    openwoods: {
        Lacewing: 0.12, Cricket: 0.12, Xianglong: 0.08, Confuciusornis: 0.1, Caudipteryx: 0.1, Incisivosaurus: 0.08,
        Psittacosaurus: 0.12, Dilong: 0.06, Zhenyuanlong: 0.05, Jinzhousaurus: 0.06, Yutyrannus: 0.03
    },
    deadforest: { Cricket: 0.12, Salamander: 0.06, Xianglong: 0.06, Microraptor: 0.06, Sinosauropteryx: 0.06, Feilongus: 0.04, Repenomamus: 0.04 },
    deadfall: { Salamander: 0.2, Cricket: 0.15, Eomaia: 0.15, Xianglong: 0.08, Repenomamus: 0.08, 'Mei long': 0.08, Sinosauropteryx: 0.06 },

    // ---- high ground ----
    hills: { Cricket: 0.12, Lacewing: 0.08, Psittacosaurus: 0.1, Caudipteryx: 0.08, Sinopterus: 0.08, Dilong: 0.05, Zhenyuanlong: 0.05, Yutyrannus: 0.03 },
    crags: { Sinopterus: 0.15, Feilongus: 0.12, Dendrorhynchoides: 0.08, Xianglong: 0.06, Microraptor: 0.05 },
    basalt: { Cricket: 0.1, Xianglong: 0.08, Sinopterus: 0.1, Sinosauropteryx: 0.05, Liaoningosaurus: 0.04 },
    boulderfield: { Cricket: 0.12, Xianglong: 0.08, Eomaia: 0.08, Sinosauropteryx: 0.06, Repenomamus: 0.05, Liaoningosaurus: 0.05 },
    lavafield: { Cricket: 0.04 },
    volcanic: {},
    mountains: {},
    mudpot: { Cricket: 0.005 }
};

// Herds, packs, shoals and swarms: how many turn up together [min, max]
export const GROUP_SIZE = {
    Mayfly: [2, 4], Lacewing: [1, 2], Cricket: [1, 2], Frog: [1, 2], Lycoptera: [2, 4], Confuciusornis: [2, 4],
    Sinopterus: [1, 2], Caudipteryx: [2, 4], Psittacosaurus: [2, 5], Zhenyuanlong: [2, 3], Jinzhousaurus: [2, 4],
    Dongbeititan: [1, 3], Hyphalosaurus: [1, 2], Eomaia: [1, 2]
};

// Animals that fly or glide (and so crowd the sky if too many spawn)
export const FLYERS = new Set(['Confuciusornis', 'Dendrorhynchoides', 'Microraptor', 'Feilongus', 'Sinopterus']);

// Fish never leave the water; turtles, choristoderes and a few others come and go
export const AQUATIC = new Set(Object.keys(SPECIES_DATA).filter((k) => SPECIES_DATA[k].aquatic));
export const SEMI_AQUATIC = new Set(Object.keys(SPECIES_DATA).filter((k) => SPECIES_DATA[k].semiAquatic));
// lurkers that strike at animals drinking at the edge
export const CROCODILES = new Set(['Monjurosuchus']);

// Extra toughness: armour, a shell or sheer bulk soak up bites
export const TOUGHNESS = {
    Manchurochelys: 2.5, Liaoningosaurus: 3, Beipiaosaurus: 1.2, Jinzhousaurus: 1.4, Dongbeititan: 2.4, Yutyrannus: 1.2
};

// Predators that will run you down across several areas
export const CHASERS = {
    Sinosauropteryx: 0.6, Repenomamus: 0.55, Dilong: 0.75, Zhenyuanlong: 0.8, Sinocalliopteryx: 0.7, Yutyrannus: 0.6, Changyuraptor: 0.5
};

// Real body length in metres, used to draw the giants at their true scale
export const BODY_LENGTH_M = { Dongbeititan: 15 };

// When each animal is about: 'day', 'night', 'twilight' (dawn and dusk) or both
export const ACTIVITY = {
    Cricket: 'night', Frog: 'night', Salamander: 'night', Eomaia: 'night', Repenomamus: 'night', Dendrorhynchoides: 'twilight',
    'Mei long': 'twilight', Monjurosuchus: 'twilight', Sinocalliopteryx: 'twilight', Zhenyuanlong: 'twilight', Yutyrannus: 'twilight',
    Mayfly: 'twilight', Lacewing: 'day', Xianglong: 'day', Confuciusornis: 'day', Sinopterus: 'day', Feilongus: 'day',
    Microraptor: 'day', Changyuraptor: 'day', Psittacosaurus: 'day', Caudipteryx: 'day', Incisivosaurus: 'day',
    Jinzhousaurus: 'day', Dongbeititan: 'day', Hyphalosaurus: 'day', Manchurochelys: 'day', Sinosauropteryx: 'day', Dilong: 'day'
};

// Spawn multiplier for the time of day (phase 0 morning .. 4 before dawn)
export const activityFactor = (species, phase) => {
    const a = ACTIVITY[species];
    const night = phase >= 3;
    const twilight = phase === 0 || phase === 2 || phase === 4;
    if (a === 'night') return night ? 1.6 : 0.5;
    if (a === 'day') return night ? 0.25 : 1.15;
    if (a === 'twilight') return twilight ? 1.6 : night ? 0.8 : 0.8;
    return 1;
};

// Diet for the journal and cards, from the field guide
export const dietOf = (species) => {
    const d = DIETS[SPECIES_FACTS[species]?.diet];
    return d ? d.label : 'Unknown diet';
};
