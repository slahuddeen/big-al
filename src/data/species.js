// ==================== ENHANCED SPECIES SYSTEM ====================
export const SPECIES_DATA = {
    "Dragonfly": {
        emoji: "🪰", nutrition: 0.05, danger: 0, aggression: 0, difficulty: 0.7,
        description: "Quick flying insect - hard to catch but harmless",
        size: 0.1, weight: 0.001, injury: "annoys you",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Centipede": {
        emoji: "🐛", nutrition: 0.2, danger: 0, aggression: 0, difficulty: 0.3,
        description: "Ground-dwelling arthropod - easy prey",
        size: 0.1, weight: 0.005, injury: "tickles you",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Scorpion": {
        emoji: "🦂", nutrition: 0.5, danger: 10, aggression: 0.3, difficulty: 0.4,
        description: "Venomous arachnid - dangerous sting but small nutrition",
        size: 0.2, weight: 0.02, injury: "stings you with its tail",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Lizard": {
        emoji: "🦎", nutrition: 2, danger: 0.5, aggression: 0.1, difficulty: 0.5,
        description: "Quick reptile - might bite when cornered",
        size: 0.3, weight: 0.1, injury: "bites your toe",
        minimumAge: 0.1, behaviorType: "skittish"
    },
    "Frog": {
        emoji: "🐸", nutrition: 0.5, danger: 0, aggression: 0, difficulty: 0.5,
        description: "Amphibian near water sources",
        size: 0.2, weight: 0.05, injury: "croaks loudly",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Sphenodontian": {
        emoji: "🦎", nutrition: 8, danger: 5, aggression: 0.2, difficulty: 0.3,
        description: "Ancient reptile - surprisingly aggressive",
        size: 0.4, weight: 2, injury: "bites you firmly",
        minimumAge: 0.1, behaviorType: "territorial"
    },
    "Dryosaurus": {
        emoji: "🦴", nutrition: 50, danger: 20, aggression: 0, difficulty: 0.2,
        description: "Fast herbivore - dangerous kick when cornered",
        size: 0.8, weight: 80, injury: "kicks you with powerful legs",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Othnielia": {
        emoji: "🦕", nutrition: 50, danger: 20, aggression: 0, difficulty: 0.2,
        description: "Small ornithopod - quick and nervous",
        size: 0.7, weight: 60, injury: "headbutts you in panic",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Stegosaurus": {
        emoji: "🦕", nutrition: 500, danger: 1300, aggression: 0.3, difficulty: 0.1,
        description: "Heavily armored herbivore - lethal tail spikes",
        size: 2.0, weight: 3000, injury: "whacks you with its spiked tail",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
    },
    "Crocodile": {
        emoji: "🐊", nutrition: 5, danger: 1000, aggression: 0.6, difficulty: 0.4,
        description: "Ancient apex predator - death roll specialist",
        size: 1.5, weight: 400, injury: "drags you underwater but you break free",
        minimumAge: 0.1, behaviorType: "ambush_predator"
    },
    "Pterosaur": {
        emoji: "🦅", nutrition: 20, danger: 10, aggression: 0.7, difficulty: 0.6,
        description: "Flying predator - sharp beak and talons, hard to catch",
        size: 1.0, weight: 15, injury: "snaps at you with its beak",
        minimumAge: 0.1, behaviorType: "aerial_predator"
    },
    "Injured Pterosaur": {
        emoji: "🦅", nutrition: 20, danger: 0.2, aggression: 0, difficulty: 0.1,
        description: "Wounded flying reptile - easy target",
        size: 1.0, weight: 15, injury: "flails weakly",
        minimumAge: 0.1, behaviorType: "passive"
    },
    "Ornitholestes": {
        emoji: "🦖", nutrition: 50, danger: 50, aggression: 0.9, difficulty: 0.5,
        description: "Small theropod - aggressive pack hunter",
        size: 0.5, weight: 25, injury: "claws and bites viciously",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Juvenile Allosaurus": {
        emoji: "🦖", nutrition: 20, danger: 100, aggression: 0.6, difficulty: 0.7,
        description: "Young apex predator - territorial rival",
        size: 0.6, weight: 150, injury: "attacks you fiercely",
        minimumAge: 0.5, behaviorType: "rival_predator"
    },
    "Male Allosaurus": {
        emoji: "🦖", nutrition: 200, danger: 2000, aggression: 0.9, difficulty: 0.8,
        description: "Adult male predator - extremely dangerous",
        size: 1.5, weight: 1500, injury: "savages you brutally",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Female Allosaurus": {
        emoji: "🦖", nutrition: 250, danger: 2500, aggression: 0.9, difficulty: 0.8,
        description: "Adult female predator - larger and deadlier",
        size: 1.6, weight: 1800, injury: "tears into you with massive jaws",
        minimumAge: 1.0, behaviorType: "apex_predator"
    }
};

// Increased plains/forest frequency in species distributions
export const HABITAT_SPECIES = {
    'forest': { 'Dragonfly': 0.2, 'Centipede': 0.2, 'Scorpion': 0.15, 'Lizard': 0.2, 'Dryosaurus': 0.1, 'Othnielia': 0.1, 'Sphenodontian': 0.05, 'Ornitholestes': 0.1, 'Juvenile Allosaurus': 0.1 },
    'oldgrowthforest': { 'Dragonfly': 0.15, 'Centipede': 0.25, 'Dryosaurus': 0.05, 'Ornitholestes': 0.15 },
    'denseforest': { 'Centipede': 0.3, 'Scorpion': 0.2, 'Ornitholestes': 0.2 },
    'youngforest': { 'Dragonfly': 0.3, 'Lizard': 0.25, 'Dryosaurus': 0.15, 'Othnielia': 0.15 },
    'forestedge': { 'Dragonfly': 0.2, 'Scorpion': 0.15, 'Centipede': 0.1, 'Dryosaurus': 0.1, 'Othnielia': 0.15, 'Ornitholestes': 0.1, 'Stegosaurus': 0.05, 'Lizard': 0.1, 'Sphenodontian': 0.1, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1, 'Juvenile Allosaurus': 0.1 },
    'openwoods': { 'Dragonfly': 0.25, 'Lizard': 0.2, 'Dryosaurus': 0.15, 'Othnielia': 0.15, 'Pterosaur': 0.1 },
    'galleryforest': { 'Dragonfly': 0.3, 'Frog': 0.2, 'Lizard': 0.15, 'Crocodile': 0.1 },
    'deadforest': { 'Scorpion': 0.2, 'Lizard': 0.15, 'Injured Pterosaur': 0.1 },
    'plains': { 'Scorpion': 0.05, 'Lizard': 0.1, 'Sphenodontian': 0.1, 'Pterosaur': 0.2, 'Stegosaurus': 0.1, 'Dryosaurus': 0.05, 'Othnielia': 0.05, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1 },
    'grasslands': { 'Stegosaurus': 0.2, 'Dryosaurus': 0.15, 'Othnielia': 0.15, 'Pterosaur': 0.15, 'Male Allosaurus': 0.05, 'Female Allosaurus': 0.1 },
    'meadow': { 'Dragonfly': 0.3, 'Lizard': 0.15, 'Dryosaurus': 0.2, 'Othnielia': 0.2 },
    'scrubland': { 'Lizard': 0.2, 'Scorpion': 0.15, 'Sphenodontian': 0.15, 'Ornitholestes': 0.1 },
    'savanna': { 'Stegosaurus': 0.15, 'Dryosaurus': 0.1, 'Othnielia': 0.1, 'Pterosaur': 0.25 },
    'steppe': { 'Lizard': 0.15, 'Scorpion': 0.1, 'Sphenodontian': 0.1 },
    'sauropodgrounds': { 'Pterosaur': 0.2 },
    'river': { 'Dragonfly': 0.25, 'Frog': 0.25, 'Crocodile': 0.5 },
    'dryriverbed': { 'Lizard': 0.2, 'Scorpion': 0.15, 'Sphenodontian': 0.1 },
    'riverbank': { 'Dragonfly': 0.35, 'Frog': 0.35, 'Crocodile': 0.4, 'Stegosaurus': 0.1, 'Dryosaurus': 0.05, 'Othnielia': 0.05, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1 },
    'marsh': { 'Dragonfly': 0.4, 'Frog': 0.4, 'Crocodile': 0.3 },
    'waterhole': { 'Dragonfly': 0.25, 'Frog': 0.25, 'Scorpion': 0.05, 'Lizard': 0.1, 'Sphenodontian': 0.1, 'Stegosaurus': 0.2, 'Othnielia': 0.1, 'Dryosaurus': 0.1, 'Juvenile Allosaurus': 0.1, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.8 },
    'hills': { 'Pterosaur': 0.3, 'Lizard': 0.15, 'Scorpion': 0.1 },
    'rocky': { 'Lizard': 0.2, 'Scorpion': 0.15, 'Sphenodontian': 0.1 },
    'desert': { 'Scorpion': 0.1, 'Sphenodontian': 0.05, 'Lizard': 0.05, 'Injured Pterosaur': 0.05, 'Male Allosaurus': 0.05, 'Female Allosaurus': 0.05 },
    'badlands': { 'Scorpion': 0.15, 'Lizard': 0.1, 'Injured Pterosaur': 0.1 },
    'mesa': { 'Pterosaur': 0.4, 'Lizard': 0.1 },
    'sand': { 'Scorpion': 0.15, 'Lizard': 0.1 },
    'nest': { 'Dragonfly': 0.25, 'Scorpion': 0.1, 'Centipede': 0.25, 'Ornitholestes': 0.7 }
};