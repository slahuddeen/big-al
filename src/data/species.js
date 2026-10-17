// ==================== KEM KEM FAUNA ====================
// North Africa, about 95 million years ago: a vast river system running north to
// the Tethys Sea. Far more big predators than big plant-eaters ("Stromer's
// riddle"), because the rivers were full of fish. Weights are kg for a grown animal.
const sp = (weight, nutrition, danger, aggression, difficulty, behaviorType, description, injury, extra = {}) => ({
    weight, nutrition, danger, aggression, difficulty, behaviorType, description, injury,
    size: extra.size ?? 1, minimumAge: extra.minimumAge ?? 0.05, emoji: '', ...extra
});

export const SPECIES_DATA = {
    // ---- tiny ----
    Dragonfly: sp(0.002, 0.15, 0, 0, 0.6, 'passive', 'Darting over the water: a hatchling\'s first meals', 'buzzes away angrily'),
    Cricket: sp(0.003, 0.1, 0, 0, 0.4, 'skittish', 'Chirping in the ferns at night', 'hops away frantically'),
    Centipede: sp(0.008, 0.4, 0, 0, 0.25, 'passive', 'Hunts the leaf litter of the woods', 'tickles you harmlessly'),
    Scorpion: sp(0.03, 0.8, 8, 0.25, 0.35, 'defensive', 'Desert-edge arachnid with a painful sting', 'stings you with its tail'),

    // ---- small ----
    Frog: sp(0.06, 0.8, 0, 0, 0.45, 'skittish', 'Oumtkoutia, a little frog of the pools and shallows', 'croaks loudly'),
    Lizard: sp(0.12, 2.5, 0.5, 0.1, 0.45, 'skittish', 'Quick lizard basking on the sandbars', 'bites your toe'),
    Fish: sp(0.25, 2, 0, 0, 0.35, 'passive', 'Small river fish in shining shoals', 'flops around desperately', { aquatic: true }),
    Lapparentophis: sp(0.8, 1.8, 3, 0.3, 0.6, 'territorial', 'One of the oldest known land snakes', 'strikes with a fanged bite'),
    Hamadachelys: sp(3, 3, 2, 0.05, 0.2, 'defensive', 'Side-necked river turtle: hard to crack', 'retreats into its shell', { semiAquatic: true }),
    Leptostomia: sp(1, 4, 1, 0.05, 0.6, 'skittish', 'Small pterosaur that probes the mud with a long thin beak', 'pecks at your eye'),
    Araripesuchus: sp(8, 9, 12, 0.6, 0.55, 'pack_predator', 'Small long-legged land crocodile. Raids nests in gangs', 'snaps with a mouth full of fangs'),

    // ---- medium ----
    Noasaurid: sp(15, 14, 16, 0.65, 0.6, 'pack_predator', 'Small, fast theropod that hunts hatchlings along the banks', 'slashes with hooked claws'),
    Lungfish: sp(15, 14, 2, 0, 0.3, 'passive', 'Neoceratodus: survives the drought buried in the mud of drying pools', 'thrashes in your jaws', { aquatic: true }),
    Calamopleurus: sp(12, 12, 3, 0.1, 0.45, 'passive', 'Long, toothy bowfin of the channels', 'bites back', { aquatic: true }),
    Bawitius: sp(60, 40, 12, 0.15, 0.4, 'defensive', 'Giant armoured bichir, three metres of scales and teeth', 'rakes you with armoured scales', { aquatic: true }),
    Tribodus: sp(40, 30, 20, 0.35, 0.5, 'territorial', 'River shark with crushing teeth and a spined fin', 'bites and twists away', { aquatic: true }),
    Afrotapejara: sp(3, 6, 2, 0.05, 0.7, 'skittish', 'Crested fruit-eating pterosaur', 'flaps its crest at you'),
    Siroccopteryx: sp(8, 10, 8, 0.35, 0.65, 'aerial_predator', 'Fish-catching pterosaur that skims the river', 'jabs with a toothy beak'),
    'Injured Pterosaur': sp(20, 25, 0.1, 0, 0.05, 'passive', 'A wounded pterosaur that can no longer fly', 'flaps weakly'),
    Iguanodont: sp(400, 90, 60, 0.05, 0.2, 'herbivore', 'One of the few plant-eaters here, a heavy-bodied iguanodont', 'kicks you with powerful legs'),

    // ---- large ----
    Alanqa: sp(40, 30, 30, 0.7, 0.4, 'aerial_predator', 'Tall azhdarchid pterosaur that stalks the mudflats like a stork and swallows hatchlings whole', 'stabs with its spear of a beak'),
    'Young Spinosaurus': sp(250, 50, 120, 0.25, 0.5, 'rival_predator', 'A spinosaur of your own age: a clutch-mate you could fish with', 'snaps at you'),
    'River Plesiosaur': sp(150, 60, 120, 0.4, 0.45, 'territorial', 'Small long-necked plesiosaur that swims up the rivers from the sea', 'snaps with interlocking teeth', { aquatic: true }),
    Mawsonia: sp(350, 160, 60, 0.05, 0.35, 'defensive', 'Coelacanth the size of a crocodile, slow and heavy', 'slaps you with a lobed fin', { aquatic: true }),
    Laganosuchus: sp(400, 70, 450, 0.6, 0.35, 'ambush_predator', 'Pancake-headed crocodile that lies still with its jaws open', 'snaps its flat jaws shut on you', { semiAquatic: true }),
    Elosuchus: sp(900, 140, 800, 0.55, 0.35, 'ambush_predator', 'Long-snouted river crocodile, eight metres of fish-catcher', 'drags you under in a death roll', { semiAquatic: true }),
    Rugops: sp(750, 160, 700, 0.6, 0.4, 'rival_predator', 'Short-faced abelisaur with a wrinkled, horned head. Often steals kills', 'bites with a short, deep snout'),
    Deltadromeus: sp(1000, 200, 900, 0.75, 0.5, 'rival_predator', 'Lanky, long-legged hunter of the floodplain: fast and relentless', 'slashes with long claws'),

    // ---- huge ----
    Onchopristis: sp(1200, 240, 900, 0.3, 0.3, 'territorial', 'Giant sawfish relative with a barbed saw longer than you', 'slashes you with its toothed saw', { aquatic: true }),
    Aegisuchus: sp(3000, 400, 2600, 0.55, 0.3, 'ambush_predator', 'Shieldcroc: a gigantic flat-headed crocodile of the deep channels', 'crushes you in enormous jaws', { semiAquatic: true }),
    Sauroniops: sp(2500, 420, 2400, 0.8, 0.6, 'rival_predator', 'Carcharodontosaurid with a domed brow, hunting the edges of the floodplain', 'tears at you with blade-like teeth'),
    Bahariasaurus: sp(4000, 560, 3600, 0.8, 0.55, 'rival_predator', 'Huge, long-legged predator of the delta', 'rakes you with serrated teeth'),
    Carcharodontosaurus: sp(6500, 800, 6500, 0.9, 0.7, 'apex_predator', 'The shark-toothed lizard: master of the land, and the spinosaur\'s great rival', 'slices you open with shark-like teeth'),
    Spinosaurus: sp(7000, 750, 6000, 0.6, 0.6, 'rival_predator', 'A grown rival spinosaur defending its stretch of river', 'clamps its crocodile jaws on you', { semiAquatic: true }),
    Rebbachisaurus: sp(7000, 1100, 2500, 0.12, 0.15, 'giant_herbivore', 'Sail-backed sauropod that crops low plants along the trails', 'swings its tail like a whip'),
    Aegyptosaurus: sp(15000, 1400, 4500, 0.1, 0.12, 'giant_herbivore', 'Titanosaur that roams the delta in small herds', 'tramples you'),
    Paralititan: sp(50000, 2000, 9000, 0.08, 0.08, 'giant_herbivore', 'One of the largest animals that ever lived, browsing the mangrove edge', 'crushes you underfoot')
};

// Which animals live in which habitats, and how often they turn up
export const HABITAT_SPECIES = {
    // ---- the rivers ----
    river: {
        Fish: 0.35, Calamopleurus: 0.2, Lungfish: 0.12, Bawitius: 0.12, Tribodus: 0.1, Mawsonia: 0.12, Onchopristis: 0.08,
        'River Plesiosaur': 0.06, Elosuchus: 0.12, Laganosuchus: 0.08, Aegisuchus: 0.05, Hamadachelys: 0.12,
        Dragonfly: 0.15, Siroccopteryx: 0.15, Spinosaurus: 0.05, 'Young Spinosaurus': 0.05
    },
    stream: {
        Fish: 0.35, Calamopleurus: 0.15, Lungfish: 0.15, Bawitius: 0.08, Frog: 0.2, Dragonfly: 0.25, Hamadachelys: 0.15,
        Laganosuchus: 0.06, Araripesuchus: 0.1, Leptostomia: 0.12, Siroccopteryx: 0.1, Alanqa: 0.05, 'Young Spinosaurus': 0.06, Iguanodont: 0.05
    },
    lake: {
        Fish: 0.35, Calamopleurus: 0.18, Lungfish: 0.15, Bawitius: 0.12, Mawsonia: 0.15, Tribodus: 0.06,
        Elosuchus: 0.1, Laganosuchus: 0.1, Hamadachelys: 0.15, Dragonfly: 0.15, Frog: 0.12, Siroccopteryx: 0.15, Spinosaurus: 0.04
    },
    waterhole: {
        Fish: 0.25, Lungfish: 0.25, Frog: 0.2, Dragonfly: 0.15, Hamadachelys: 0.12, Laganosuchus: 0.08,
        Leptostomia: 0.12, Alanqa: 0.08, Iguanodont: 0.1, Rugops: 0.05, Deltadromeus: 0.04
    },
    marsh: {
        Frog: 0.3, Dragonfly: 0.25, Fish: 0.2, Lungfish: 0.2, Centipede: 0.1, Hamadachelys: 0.15, Lapparentophis: 0.08,
        Laganosuchus: 0.12, Araripesuchus: 0.1, Leptostomia: 0.12, Afrotapejara: 0.08, Iguanodont: 0.06
    },
    mangrove: {
        Fish: 0.3, Tribodus: 0.12, Onchopristis: 0.1, 'River Plesiosaur': 0.1, Mawsonia: 0.08, Hamadachelys: 0.12,
        Elosuchus: 0.1, Aegisuchus: 0.05, Siroccopteryx: 0.15, Afrotapejara: 0.1, Dragonfly: 0.15, Frog: 0.08,
        Paralititan: 0.08, Aegyptosaurus: 0.06, Bahariasaurus: 0.05
    },
    beach: {
        Leptostomia: 0.2, Alanqa: 0.15, Siroccopteryx: 0.15, 'Injured Pterosaur': 0.06, Hamadachelys: 0.15, Fish: 0.15,
        Araripesuchus: 0.08, Lizard: 0.1, Bahariasaurus: 0.04, Elosuchus: 0.06
    },
    riverbank: {
        Lizard: 0.15, Dragonfly: 0.15, Frog: 0.12, Hamadachelys: 0.15, Araripesuchus: 0.12, Leptostomia: 0.15, Alanqa: 0.08,
        Elosuchus: 0.1, Laganosuchus: 0.08, Noasaurid: 0.08, Iguanodont: 0.06, 'Young Spinosaurus': 0.06, Spinosaurus: 0.04,
        Rugops: 0.04, Carcharodontosaurus: 0.03
    },
    dryriverbed: {
        Lizard: 0.15, Scorpion: 0.15, Cricket: 0.12, Lapparentophis: 0.1, Noasaurid: 0.08, Araripesuchus: 0.08, Rugops: 0.04
    },
    floodplain: {
        Dragonfly: 0.2, Frog: 0.15, Cricket: 0.15, Lizard: 0.1, Lungfish: 0.08, Leptostomia: 0.12, Alanqa: 0.12, Iguanodont: 0.12,
        Noasaurid: 0.08, Deltadromeus: 0.06, Rugops: 0.05, Sauroniops: 0.03, Carcharodontosaurus: 0.03, Aegyptosaurus: 0.05
    },
    nest: {
        Dragonfly: 0.25, Cricket: 0.2, Centipede: 0.15, Lizard: 0.12, Frog: 0.12, Araripesuchus: 0.15, Noasaurid: 0.08 // nest raiders
    },

    // ---- woods and ferns ----
    galleryforest: {
        Dragonfly: 0.2, Centipede: 0.15, Frog: 0.15, Lizard: 0.12, Lapparentophis: 0.08, Hamadachelys: 0.08, Afrotapejara: 0.15,
        Noasaurid: 0.08, Araripesuchus: 0.08, Iguanodont: 0.1, Rugops: 0.04, Carcharodontosaurus: 0.03
    },
    forest: {
        Centipede: 0.2, Cricket: 0.15, Scorpion: 0.08, Lizard: 0.12, Lapparentophis: 0.1, Afrotapejara: 0.12,
        Noasaurid: 0.1, Iguanodont: 0.1, Rugops: 0.05, Sauroniops: 0.03, Carcharodontosaurus: 0.03
    },
    denseforest: {
        Centipede: 0.2, Cricket: 0.2, Frog: 0.12, Lizard: 0.12, Lapparentophis: 0.1, Noasaurid: 0.06, Iguanodont: 0.06, Afrotapejara: 0.08
    },
    jungle: {
        Dragonfly: 0.18, Centipede: 0.2, Frog: 0.18, Lapparentophis: 0.1, Afrotapejara: 0.15, Noasaurid: 0.06, Iguanodont: 0.08
    },
    openwoods: {
        Cricket: 0.15, Lizard: 0.12, Scorpion: 0.06, Afrotapejara: 0.12, Noasaurid: 0.08, Iguanodont: 0.12,
        Rugops: 0.05, Deltadromeus: 0.05, Rebbachisaurus: 0.06
    },
    deadfall: {
        Centipede: 0.3, Scorpion: 0.12, Lizard: 0.18, Lapparentophis: 0.12, Frog: 0.12, Araripesuchus: 0.08
    },

    // ---- open country ----
    plains: {
        Cricket: 0.15, Lizard: 0.12, Scorpion: 0.08, Leptostomia: 0.08, Alanqa: 0.12, Iguanodont: 0.12, Noasaurid: 0.08,
        Deltadromeus: 0.08, Rugops: 0.05, Sauroniops: 0.04, Carcharodontosaurus: 0.05, Rebbachisaurus: 0.06
    },
    fernprairie: {
        Cricket: 0.18, Dragonfly: 0.1, Lizard: 0.12, Afrotapejara: 0.1, Alanqa: 0.1, Iguanodont: 0.15, Noasaurid: 0.08,
        Deltadromeus: 0.06, Carcharodontosaurus: 0.04, Rebbachisaurus: 0.06
    },
    savanna: {
        Cricket: 0.12, Lizard: 0.15, Scorpion: 0.1, Alanqa: 0.1, Iguanodont: 0.1, Deltadromeus: 0.06,
        Bahariasaurus: 0.04, Carcharodontosaurus: 0.05, Rebbachisaurus: 0.08
    },
    scrubland: {
        Cricket: 0.12, Lizard: 0.15, Scorpion: 0.12, Lapparentophis: 0.1, Noasaurid: 0.1, Rugops: 0.05, Alanqa: 0.06
    },
    sauropodgrounds: {
        Rebbachisaurus: 0.4, Aegyptosaurus: 0.35, Paralititan: 0.25, Iguanodont: 0.1, Alanqa: 0.08,
        Rugops: 0.06, Deltadromeus: 0.06, Sauroniops: 0.05, Bahariasaurus: 0.05, Carcharodontosaurus: 0.08
    },

    // ---- dry uplands ----
    desert: { Scorpion: 0.15, Lizard: 0.12, Cricket: 0.08, Lapparentophis: 0.1, 'Injured Pterosaur': 0.06, Noasaurid: 0.04 },
    badlands: { Scorpion: 0.15, Lizard: 0.12, Lapparentophis: 0.08, 'Injured Pterosaur': 0.08, Alanqa: 0.06 },
    mesa: { Alanqa: 0.12, Afrotapejara: 0.1, Siroccopteryx: 0.08, Lizard: 0.08, Scorpion: 0.08 },
    rocky: { Lizard: 0.12, Scorpion: 0.12, Lapparentophis: 0.08, Noasaurid: 0.06, Alanqa: 0.08 },
    boulderfield: { Lizard: 0.15, Scorpion: 0.12, Lapparentophis: 0.1, Afrotapejara: 0.1, Noasaurid: 0.06 },
    hills: { Lizard: 0.12, Cricket: 0.1, Scorpion: 0.08, Afrotapejara: 0.12, Alanqa: 0.08, Iguanodont: 0.08, Noasaurid: 0.06 },
    mountains: { Afrotapejara: 0.12, Alanqa: 0.08, Lizard: 0.06 },
    quicksand: { Cricket: 0.005, Scorpion: 0.003 },
    sea: {}
};

// Herds, packs, shoals and swarms: how many turn up together [min, max]
export const GROUP_SIZE = {
    Dragonfly: [1, 3], Frog: [1, 2], Fish: [2, 4], Cricket: [1, 2], Calamopleurus: [1, 2], Lungfish: [1, 2],
    Araripesuchus: [2, 4], Noasaurid: [2, 3], Leptostomia: [1, 3], Afrotapejara: [1, 2], Siroccopteryx: [1, 2],
    Iguanodont: [2, 5], Rebbachisaurus: [2, 4], Aegyptosaurus: [2, 4], Paralititan: [1, 3], Tribodus: [1, 2]
};

// Animals that can fly (and so crowd the sky if too many spawn)
export const FLYERS = new Set(['Leptostomia', 'Afrotapejara', 'Siroccopteryx', 'Alanqa']);

// Fish and other animals that never leave the water, and those that come and go
export const AQUATIC = new Set(Object.keys(SPECIES_DATA).filter((k) => SPECIES_DATA[k].aquatic));
export const SEMI_AQUATIC = new Set(Object.keys(SPECIES_DATA).filter((k) => SPECIES_DATA[k].semiAquatic));
export const CROCODILES = new Set(['Laganosuchus', 'Elosuchus', 'Aegisuchus']);

// Extra toughness: armour, sheer bulk or a shell soak up bites
export const TOUGHNESS = {
    Hamadachelys: 2.5, Bawitius: 1.6, Mawsonia: 1.3, Onchopristis: 1.3, Laganosuchus: 1.5, Elosuchus: 1.6, Aegisuchus: 1.8,
    Rebbachisaurus: 2, Aegyptosaurus: 2.3, Paralititan: 2.6, Carcharodontosaurus: 1.2, Spinosaurus: 1.2, Bahariasaurus: 1.1
};

// Predators that will run you down across several areas
export const CHASERS = {
    Araripesuchus: 0.7, Noasaurid: 0.8, Deltadromeus: 0.75, Rugops: 0.55, Sauroniops: 0.6, Bahariasaurus: 0.6,
    Carcharodontosaurus: 0.6, Alanqa: 0.5
};

// Real body length in metres, used to draw the giants at their true scale
export const BODY_LENGTH_M = { Rebbachisaurus: 15, Aegyptosaurus: 16, Paralititan: 26 };

// When each animal is about: 'day', 'night', 'twilight' (dawn and dusk) or both
export const ACTIVITY = {
    Scorpion: 'night', Centipede: 'night', Frog: 'night', Cricket: 'night', Araripesuchus: 'night', Lapparentophis: 'twilight',
    Laganosuchus: 'night', Elosuchus: 'twilight', Aegisuchus: 'night', Noasaurid: 'twilight', Deltadromeus: 'twilight',
    Carcharodontosaurus: 'twilight', Sauroniops: 'twilight', Bahariasaurus: 'twilight', Rugops: 'night',
    Dragonfly: 'day', Lizard: 'day', Leptostomia: 'day', Afrotapejara: 'day', Siroccopteryx: 'day', Alanqa: 'day',
    Iguanodont: 'day', Rebbachisaurus: 'day', Aegyptosaurus: 'day', Paralititan: 'day', Hamadachelys: 'day'
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

// Short field-guide notes for the journal
export const dietOf = (species) => {
    const t = SPECIES_DATA[species]?.behaviorType;
    if (['herbivore', 'dangerous_herbivore', 'giant_herbivore'].includes(t)) return 'Plant eater';
    if (['Dragonfly', 'Centipede', 'Cricket', 'Scorpion'].includes(species)) return 'Invertebrate';
    if (SPECIES_DATA[species]?.aquatic) return 'Fish and sea life';
    if (['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'aerial_predator'].includes(t)) return 'Predator';
    return 'Small animal';
};
