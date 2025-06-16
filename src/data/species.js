// ==================== ENHANCED SPECIES SYSTEM WITH ABUNDANT SMALL FOREST CREATURES ====================
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
    "Beetle": {
        emoji: "🪲",
        image: "/assets/dinos/beetle.png",
        nutrition: 0.1, danger: 0, aggression: 0, difficulty: 0.2,
        description: "Crunchy forest beetle - perfect hatchling food",
        size: 0.1, weight: 0.003, injury: "crawls away",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Cricket": {
        emoji: "🦗",
        image: "/assets/dinos/cricket.png",
        nutrition: 0.03, danger: 0, aggression: 0, difficulty: 0.5,
        description: "Chirping insect - small but quick",
        size: 0.05, weight: 0.001, injury: "hops away",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Worm": {
        emoji: "🪱",
        image: "/assets/dinos/worm.png",
        nutrition: 0.15, danger: 0, aggression: 0, difficulty: 0.1,
        description: "Soft forest worm - easy catch for tiny predators",
        size: 0.08, weight: 0.002, injury: "wriggles",
        minimumAge: 0.05, behaviorType: "passive"
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

// Enhanced habitat species distributions - More balanced small creature spawns
export const HABITAT_SPECIES = {
    // FOREST HIERARCHY - Good small creature presence but not overwhelming
    'denseforest': {
        // Small creatures - good encounter rates
        'Dragonfly': 0.6, 'Centipede': 0.7, 'Beetle': 0.6, 'Cricket': 0.5, 'Worm': 0.6,
        'Scorpion': 0.3, 'Lizard': 0.25,
        // Larger threats
        'Ornitholestes': 0.15, 'Juvenile Allosaurus': 0.08
    },
    'forest': {
        // Main forest - balanced hunting
        'Dragonfly': 0.45, 'Centipede': 0.5, 'Beetle': 0.55, 'Cricket': 0.35, 'Worm': 0.45,
        'Scorpion': 0.25, 'Lizard': 0.2, 'Dryosaurus': 0.2, 'Othnielia': 0.2,
        'Sphenodontian': 0.15, 'Ornitholestes': 0.15, 'Juvenile Allosaurus': 0.1
    },
    'openwoods': {
        // Open woodland - moderate small creatures
        'Dragonfly': 0.4, 'Beetle': 0.4, 'Worm': 0.35, 'Centipede': 0.3,
        'Lizard': 0.25, 'Dryosaurus': 0.3, 'Othnielia': 0.3, 'Pterosaur': 0.2
    },
    'galleryforest': {
        // Waterside forest - insects and amphibians
        'Dragonfly': 0.6, 'Frog': 0.5, 'Worm': 0.4, 'Centipede': 0.3,
        'Lizard': 0.2, 'Crocodile': 0.2, 'Dryosaurus': 0.2
    },
    'deadforest': {
        // Dead trees with some small life
        'Beetle': 0.5, 'Centipede': 0.4, 'Scorpion': 0.3, 'Cricket': 0.25,
        'Lizard': 0.2, 'Injured Pterosaur': 0.2, 'Sphenodontian': 0.2
    },

    // PLAINS HIERARCHY - Moderate creature presence
    'plains': {
        'Cricket': 0.3, 'Beetle': 0.1, 'Scorpion': 0.1, 'Lizard': 0.2,
        'Sphenodontian': 0.15, 'Pterosaur': 0.25, 'Stegosaurus': 0.2,
        'Dryosaurus': 0.15, 'Othnielia': 0.15, 'Male Allosaurus': 0.12, 'Female Allosaurus': 0.12
    },
    'savanna': {
        'Cricket': 0.3, 'Beetle': 0.25, 'Stegosaurus': 0.25, 'Dryosaurus': 0.25,
        'Othnielia': 0.25, 'Pterosaur': 0.3, 'Lizard': 0.2, 'Scorpion': 0.15
    },
    'scrubland': {
        'Cricket': 0.1, 'Beetle': 0.2, 'Lizard': 0.25, 'Scorpion': 0.2,
        'Sphenodontian': 0.2, 'Ornitholestes': 0.2
    },
    'sauropodgrounds': {
        'Pterosaur': 0.3, 'Stegosaurus': 0.2, 'Male Allosaurus': 0.25,
        'Female Allosaurus': 0.25
    },

    // WATER FEATURES - Moderate small creature presence
    'river': {
        'Dragonfly': 0.4, 'Frog': 0.4, 'Beetle': 0.2, 'Crocodile': 0.5
    },
    'dryriverbed': {
        'Lizard': 0.2, 'Scorpion': 0.25, 'Beetle': 0.3, 'Cricket': 0.25, 'Sphenodontian': 0.15
    },
    'riverbank': {
        'Dragonfly': 0.4, 'Frog': 0.4, 'Beetle': 0.3, 'Cricket': 0.25, 'Crocodile': 0.4,
        'Stegosaurus': 0.2, 'Dryosaurus': 0.15, 'Othnielia': 0.15,
        'Male Allosaurus': 0.15, 'Female Allosaurus': 0.15
    },
    'marsh': {
        'Dragonfly': 0.5, 'Frog': 0.5, 'Beetle': 0.3, 'Worm': 0.1, 'Centipede': 0.2,
        'Crocodile': 0.4, 'Lizard': 0.15
    },
    'waterhole': {
        'Dragonfly': 0.3, 'Frog': 0.35, 'Beetle': 0.25, 'Cricket': 0.2, 'Scorpion': 0.1,
        'Lizard': 0.15, 'Sphenodontian': 0.15, 'Stegosaurus': 0.3,
        'Othnielia': 0.2, 'Dryosaurus': 0.2, 'Juvenile Allosaurus': 0.2,
        'Male Allosaurus': 0.2, 'Female Allosaurus': 0.8
    },
    'lake': {
        'Dragonfly': 0.4, 'Frog': 0.4, 'Beetle': 0.2, 'Crocodile': 0.3,
        'Stegosaurus': 0.2, 'Pterosaur': 0.2
    },
    'beach': {
        'Dragonfly': 0.3, 'Frog': 0.2, 'Beetle': 0.2, 'Cricket': 0.15,
        'Lizard': 0.2, 'Crocodile': 0.3, 'Pterosaur': 0.2
    },

    // MOUNTAIN FEATURES
    'hills': {
        'Pterosaur': 0.4, 'Lizard': 0.25,
        'Scorpion': 0.2, 'Dryosaurus': 0.2, 'Othnielia': 0.2
    },
    'rocky': {
        'Lizard': 0.2, 'Scorpion': 0.15,
        'Pterosaur': 0.15
    },
    'mountains': {
        'Pterosaur': 0.4, 'Lizard': 0.12, 'Beetle': 0.15,
    },

    // DESERT FEATURES
    'desert': {
        'Scorpion': 0.2, 'Beetle': 0.15, 'Cricket': 0.1, 'Sphenodontian': 0.1, 'Lizard': 0.1,
        'Injured Pterosaur': 0.15, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1
    },
    'badlands': {
        'Scorpion': 0.25, 'Beetle': 0.2, 'Cricket': 0.15, 'Lizard': 0.15, 'Injured Pterosaur': 0.2,
        'Sphenodontian': 0.12
    },
    'mesa': {
        'Pterosaur': 0.5, 'Lizard': 0.12, 'Scorpion': 0.12, 'Beetle': 0.12, 'Cricket': 0.08
    },
    'quicksand': {
        // Almost no life - it's dangerous!
        'Beetle': 0.02, 'Scorpion': 0.01
    },

    // VOLCANIC FEATURES
    'volcanic': {
        'Pterosaur': 0.4, 'Lizard': 0.1, 'Beetle': 0.08, 'Scorpion': 0.06
    },
    'lavafield': {
        // Almost no life
        'Beetle': 0.03, 'Scorpion': 0.02
    },

    // SPECIAL AREAS
    'nest': {
        'Dragonfly': 0.3, 'Beetle': 0.4, 'Centipede': 0.3, 'Cricket': 0.25, 'Scorpion': 0.15,
        'Ornitholestes': 0.8  // Nest raiders
    }
};