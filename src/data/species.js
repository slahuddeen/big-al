// ==================== ENHANCED SPECIES SYSTEM WITH NEW TERRAIN TYPES ====================
export const SPECIES_DATA = {
    "Dragonfly": {
        emoji: "🪰",
        image: "/assets/dinos/dragonfly.png",
        nutrition: 0.05, danger: 0, aggression: 0, difficulty: 0.7,
        description: "Quick flying insect - hard to catch but harmless",
        size: 0.1, weight: 0.001, injury: "annoys you",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Centipede": {
        emoji: "🐛",
        image: "/assets/dinos/centipede.png",
        nutrition: 0.2, danger: 0, aggression: 0, difficulty: 0.3,
        description: "Ground-dwelling arthropod - easy prey",
        size: 0.1, weight: 0.005, injury: "tickles you",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Scorpion": {
        emoji: "🦂",
        image: "/assets/dinos/scorpion.png",
        nutrition: 0.5, danger: 10, aggression: 0.3, difficulty: 0.4,
        description: "Venomous arachnid - dangerous sting but small nutrition",
        size: 0.2, weight: 0.02, injury: "stings you with its tail",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Lizard": {
        emoji: "🦎",
        image: "/assets/dinos/lizard.png",
        nutrition: 2, danger: 0.5, aggression: 0.1, difficulty: 0.5,
        description: "Quick reptile - might bite when cornered",
        size: 0.3, weight: 0.1, injury: "bites your toe",
        minimumAge: 0.1, behaviorType: "skittish"
    },
    "Frog": {
        emoji: "🐸",
        image: "/assets/dinos/frog.png",
        nutrition: 0.5, danger: 0, aggression: 0, difficulty: 0.5,
        description: "Amphibian near water sources",
        size: 0.2, weight: 0.05, injury: "croaks loudly",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Sphenodontian": {
        emoji: "🦎",
        image: "/assets/dinos/lizard1.png",
        nutrition: 8, danger: 5, aggression: 0.2, difficulty: 0.3,
        description: "Ancient reptile - surprisingly aggressive",
        size: 0.4, weight: 2, injury: "bites you firmly",
        minimumAge: 0.1, behaviorType: "territorial"
    },
    "Dryosaurus": {
        emoji: "🦴",
        image: "/assets/dinos/dryosaurus.png",
        nutrition: 50, danger: 20, aggression: 0, difficulty: 0.2,
        description: "Fast herbivore - dangerous kick when cornered",
        size: 0.8, weight: 80, injury: "kicks you with powerful legs",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Othnielia": {
        emoji: "🦕",
        image: "/assets/dinos/othnielia.png",
        nutrition: 50, danger: 20, aggression: 0, difficulty: 0.2,
        description: "Small ornithopod - quick and nervous",
        size: 0.7, weight: 60, injury: "headbutts you in panic",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Stegosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/stegosaurus.png",
        nutrition: 500, danger: 1300, aggression: 0.3, difficulty: 0.1,
        description: "Heavily armored herbivore - lethal tail spikes",
        size: 2.0, weight: 3000, injury: "whacks you with its spiked tail",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
    },
    "Crocodile": {
        emoji: "🐊",
        image: "/assets/dinos/crocodile.png",
        nutrition: 5, danger: 1000, aggression: 0.6, difficulty: 0.4,
        description: "Ancient apex predator - death roll specialist",
        size: 1.5, weight: 400, injury: "drags you underwater but you break free",
        minimumAge: 0.1, behaviorType: "ambush_predator"
    },
    "Pterosaur": {
        emoji: "🦅",
        image: "/assets/dinos/pterosaur.png",
        nutrition: 20, danger: 10, aggression: 0.7, difficulty: 0.6,
        description: "Flying predator - sharp beak and talons, hard to catch",
        size: 1.0, weight: 15, injury: "snaps at you with its beak",
        minimumAge: 0.1, behaviorType: "aerial_predator"
    },
    "Injured Pterosaur": {
        emoji: "🦅",
        image: "/assets/dinos/pterosaur.png",
        nutrition: 20, danger: 0.2, aggression: 0, difficulty: 0.1,
        description: "Wounded flying reptile - easy target",
        size: 1.0, weight: 15, injury: "flails weakly",
        minimumAge: 0.1, behaviorType: "passive"
    },
    "Ornitholestes": {
        emoji: "🦖",
        image: "/assets/dinos/ornitholestes.png",
        nutrition: 50, danger: 50, aggression: 0.9, difficulty: 0.5,
        description: "Small theropod - aggressive pack hunter",
        size: 0.5, weight: 25, injury: "claws and bites viciously",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Juvenile Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/hatchling.png",
        nutrition: 20, danger: 100, aggression: 0.6, difficulty: 0.7,
        description: "Young apex predator - territorial rival",
        size: 0.6, weight: 150, injury: "attacks you fiercely",
        minimumAge: 0.5, behaviorType: "rival_predator"
    },
    "Male Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/allosaurus.png",
        nutrition: 200, danger: 2000, aggression: 0.9, difficulty: 0.8,
        description: "Adult male predator - extremely dangerous",
        size: 1.5, weight: 1500, injury: "savages you brutally",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Female Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/allosaurus.png",
        nutrition: 250, danger: 2500, aggression: 0.9, difficulty: 0.8,
        description: "Adult female predator - larger and deadlier",
        size: 1.6, weight: 1800, injury: "tears into you with massive jaws",
        minimumAge: 1.0, behaviorType: "apex_predator"
    }
};

// Enhanced habitat species distributions - REDUCED for challenging gameplay
export const HABITAT_SPECIES = {
    // FOREST HIERARCHY - From dense to sparse (REDUCED encounter rates)
    'denseforest': {
        'Centipede': 0.15, 'Scorpion': 0.1, 'Lizard': 0.05, 'Ornitholestes': 0.1,
        'Juvenile Allosaurus': 0.03
    },
    'oldgrowthforest': {
        'Dragonfly': 0.08, 'Centipede': 0.12, 'Sphenodontian': 0.05,
        'Dryosaurus': 0.03, 'Ornitholestes': 0.08
    },
    'forest': {
        'Dragonfly': 0.1, 'Centipede': 0.1, 'Scorpion': 0.08, 'Lizard': 0.1,
        'Dryosaurus': 0.05, 'Othnielia': 0.05, 'Sphenodontian': 0.03,
        'Ornitholestes': 0.05, 'Juvenile Allosaurus': 0.05
    },
    'youngforest': {
        'Dragonfly': 0.15, 'Lizard': 0.12, 'Dryosaurus': 0.08, 'Othnielia': 0.08
    },
    'forestedge': {
        'Dragonfly': 0.1, 'Scorpion': 0.08, 'Centipede': 0.05, 'Dryosaurus': 0.05,
        'Othnielia': 0.08, 'Ornitholestes': 0.05, 'Stegosaurus': 0.03,
        'Lizard': 0.05, 'Sphenodontian': 0.05, 'Male Allosaurus': 0.05,
        'Female Allosaurus': 0.05, 'Juvenile Allosaurus': 0.05
    },
    'openwoods': {
        'Dragonfly': 0.12, 'Lizard': 0.1, 'Dryosaurus': 0.08, 'Othnielia': 0.08,
        'Pterosaur': 0.05
    },
    'galleryforest': {
        'Dragonfly': 0.15, 'Frog': 0.1, 'Lizard': 0.08, 'Crocodile': 0.05,
        'Dryosaurus': 0.05
    },
    'deadforest': {
        'Scorpion': 0.1, 'Lizard': 0.08, 'Injured Pterosaur': 0.05,
        'Sphenodontian': 0.05
    },

    // PLAINS HIERARCHY - Fertile grasslands to arid steppes (REDUCED)
    'plains': {
        'Scorpion': 0.03, 'Lizard': 0.05, 'Sphenodontian': 0.05, 'Pterosaur': 0.1,
        'Stegosaurus': 0.05, 'Dryosaurus': 0.03, 'Othnielia': 0.03,
        'Male Allosaurus': 0.05, 'Female Allosaurus': 0.05
    },
    'grasslands': {
        'Stegosaurus': 0.1, 'Dryosaurus': 0.08, 'Othnielia': 0.08,
        'Pterosaur': 0.08, 'Male Allosaurus': 0.03, 'Female Allosaurus': 0.05
    },
    'meadow': {
        'Dragonfly': 0.15, 'Lizard': 0.08, 'Dryosaurus': 0.1, 'Othnielia': 0.1
    },
    'savanna': {
        'Stegosaurus': 0.08, 'Dryosaurus': 0.05, 'Othnielia': 0.05, 'Pterosaur': 0.12,
        'Lizard': 0.05, 'Scorpion': 0.03
    },
    'scrubland': {
        'Lizard': 0.1, 'Scorpion': 0.08, 'Sphenodontian': 0.08, 'Ornitholestes': 0.05
    },
    'steppe': {
        'Lizard': 0.08, 'Scorpion': 0.05, 'Sphenodontian': 0.05, 'Pterosaur': 0.05
    },
    'sauropodgrounds': {
        'Pterosaur': 0.1, 'Stegosaurus': 0.05, 'Male Allosaurus': 0.08,
        'Female Allosaurus': 0.08
        // Note: This terrain should also spawn sauropods when pack hunting is implemented
    },

    // WATER FEATURES (REDUCED)
    'river': {
        'Dragonfly': 0.12, 'Frog': 0.12, 'Crocodile': 0.25
    },
    'dryriverbed': {
        'Lizard': 0.1, 'Scorpion': 0.08, 'Sphenodontian': 0.05
    },
    'riverbank': {
        'Dragonfly': 0.18, 'Frog': 0.18, 'Crocodile': 0.2, 'Stegosaurus': 0.05,
        'Dryosaurus': 0.03, 'Othnielia': 0.03, 'Male Allosaurus': 0.05,
        'Female Allosaurus': 0.05
    },
    'marsh': {
        'Dragonfly': 0.2, 'Frog': 0.2, 'Crocodile': 0.15, 'Lizard': 0.05
    },
    'waterhole': {
        'Dragonfly': 0.12, 'Frog': 0.12, 'Scorpion': 0.03, 'Lizard': 0.05,
        'Sphenodontian': 0.05, 'Stegosaurus': 0.1, 'Othnielia': 0.05,
        'Dryosaurus': 0.05, 'Juvenile Allosaurus': 0.05, 'Male Allosaurus': 0.05,
        'Female Allosaurus': 0.4  // Females still prefer water sources
    },
    'lake': {
        'Dragonfly': 0.15, 'Frog': 0.15, 'Crocodile': 0.1, 'Stegosaurus': 0.05,
        'Pterosaur': 0.05
    },
    'beach': {
        'Dragonfly': 0.1, 'Frog': 0.1, 'Lizard': 0.08, 'Pterosaur': 0.1
    },

    // MOUNTAIN FEATURES (REDUCED rocky encounters)
    'hills': {
        'Pterosaur': 0.15, 'Lizard': 0.08, 'Scorpion': 0.05, 'Dryosaurus': 0.05,
        'Othnielia': 0.05
    },
    'rocky': {
        'Lizard': 0.05, 'Scorpion': 0.03, 'Sphenodontian': 0.03, 'Pterosaur': 0.03
    },
    'mountains': {
        'Pterosaur': 0.1, 'Lizard': 0.05
    },

    // DESERT FEATURES (REDUCED)
    'desert': {
        'Scorpion': 0.05, 'Sphenodontian': 0.03, 'Lizard': 0.03,
        'Injured Pterosaur': 0.03, 'Male Allosaurus': 0.03,
        'Female Allosaurus': 0.03
    },
    'badlands': {
        'Scorpion': 0.08, 'Lizard': 0.05, 'Injured Pterosaur': 0.05,
        'Sphenodontian': 0.03
    },
    'mesa': {
        'Pterosaur': 0.2, 'Lizard': 0.05, 'Scorpion': 0.05
    },
    'sand': {
        'Scorpion': 0.08, 'Lizard': 0.05, 'Sphenodontian': 0.03
    },

    // VOLCANIC FEATURES (VERY REDUCED - harsh environment)
    'volcanic': {
        'Pterosaur': 0.1, 'Lizard': 0.05
    },
    'lavafield': {
        // No creatures can survive in active lava
    },

    // SPECIAL AREAS
    'nest': {
        'Dragonfly': 0.12, 'Scorpion': 0.05, 'Centipede': 0.12, 'Ornitholestes': 0.35  // Nest raiders
    }
};