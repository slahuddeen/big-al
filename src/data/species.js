// ==================== ENHANCED SPECIES SYSTEM WITH NEW JURASSIC CREATURES ====================
export const SPECIES_DATA = {
    // TINY PREY (Perfect for hatchlings, terrible for adults)
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
    "Cricket": {
        emoji: "🦗",
        image: "/assets/dinos/cricket.png",
        nutrition: 0.03, danger: 0, aggression: 0, difficulty: 0.5,
        description: "Chirping insect - small but quick",
        size: 0.05, weight: 0.001, injury: "hops away",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Mammal": {
        emoji: "🐁",
        image: "/assets/dinos/mammal.png",
        nutrition: 0.8, danger: 0, aggression: 0.1, difficulty: 0.6,
        description: "Small Jurassic mammal - shrew-like scurrying creature",
        size: 0.1, weight: 0.02, injury: "squeaks and bites tiny teeth",
        minimumAge: 0.05, behaviorType: "skittish"
    },

    // SMALL PREY (Good for juveniles, poor for adults)
    "Scorpion": {
        emoji: "🦂",
        image: "/assets/dinos/scorpion.png",
        nutrition: 0.5, danger: 10, aggression: 0.3, difficulty: 0.4,
        description: "Venomous arachnid - dangerous sting but small nutrition",
        size: 0.2, weight: 0.02, injury: "stings you with its tail",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Frog": {
        emoji: "🐸",
        image: "/assets/dinos/frog.png",
        nutrition: 0.5, danger: 0, aggression: 0, difficulty: 0.5,
        description: "Amphibian near water sources",
        size: 0.2, weight: 0.05, injury: "croaks loudly",
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
    "Fish": {
        emoji: "🐟",
        image: "/assets/dinos/fish.png",
        nutrition: 1.5, danger: 0, aggression: 0, difficulty: 0.4,
        description: "Jurassic fish from rivers and lakes - slippery prey",
        size: 0.3, weight: 0.2, injury: "flops around",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Compsognathus": {
        emoji: "🦖",
        image: "/assets/dinos/compsognathus.png",
        nutrition: 8, danger: 5, aggression: 0.6, difficulty: 0.7,
        description: "Chicken-sized pack predator - small but fierce in groups",
        size: 0.4, weight: 3, injury: "nips you with needle teeth",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Coelurus": {
        emoji: "🦴",
        image: "/assets/dinos/coelurus.png",
        nutrition: 12, danger: 8, aggression: 0.4, difficulty: 0.5,
        description: "Gracile small theropod - agile but delicate predator",
        size: 0.5, weight: 15, injury: "slashes with small claws",
        minimumAge: 0.1, behaviorType: "skittish"
    },

    // MEDIUM PREY (Good for sub-adults, challenging for juveniles)
    "Hesperornithoides": {
        emoji: "🦅",
        image: "/assets/dinos/hesperornithoides.png",
        nutrition: 15, danger: 25, aggression: 0.7, difficulty: 0.8,
        description: "Small but intelligent troodontid - feathered and cunning",
        size: 0.4, weight: 8, injury: "slashes with sickle claws",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Sphenodontian": {
        emoji: "🦎",
        image: "/assets/dinos/lizard1.png",
        nutrition: 8, danger: 5, aggression: 0.2, difficulty: 0.3,
        description: "Ancient reptile - surprisingly aggressive",
        size: 0.4, weight: 2, injury: "bites you firmly",
        minimumAge: 0.1, behaviorType: "territorial"
    },
    "Camptosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/camptosaurus.png",
        nutrition: 120, danger: 40, aggression: 0.1, difficulty: 0.3,
        description: "Fast ornithopod herbivore - powerful kicks when cornered",
        size: 1.2, weight: 800, injury: "kicks you with powerful legs",
        minimumAge: 0.05, behaviorType: "herbivore"
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

    // LARGE PREY (Good for adults, very dangerous for smaller predators)
    "Ceratosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/ceratosaurus.png",
        nutrition: 200, danger: 400, aggression: 0.8, difficulty: 0.4,
        description: "Horned theropod predator - aggressive mid-tier carnivore",
        size: 1.3, weight: 600, injury: "gores you with nasal horn",
        minimumAge: 0.5, behaviorType: "rival_predator"
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
    "Crocodile": {
        emoji: "🐊",
        image: "/assets/dinos/crocodile.png",
        nutrition: 5, danger: 1000, aggression: 0.6, difficulty: 0.4,
        description: "Ancient apex predator - death roll specialist",
        size: 1.5, weight: 400, injury: "drags you underwater but you break free",
        minimumAge: 0.1, behaviorType: "ambush_predator"
    },

    // HUGE PREY (Only for apex adult predators)
    "Torvosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/torvosaurus.png",
        nutrition: 800, danger: 3000, aggression: 0.9, difficulty: 0.3,
        description: "Massive apex predator - 'savage lizard' with enormous teeth",
        size: 2.0, weight: 3000, injury: "tears into you with massive serrated teeth",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Stegosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/stegosaurus.png",
        nutrition: 500, danger: 1300, aggression: 0.3, difficulty: 0.1,
        description: "Heavily armored herbivore - lethal tail spikes",
        size: 2.0, weight: 3000, injury: "whacks you with its spiked tail",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
    },
    "Diplodocus": {
        emoji: "🦕",
        image: "/assets/dinos/diplodocus.png",
        nutrition: 1200, danger: 800, aggression: 0.2, difficulty: 0.2,
        description: "Enormous long-necked sauropod - whip-like tail defense",
        size: 3.0, weight: 15000, injury: "whips you with its enormous tail",
        minimumAge: 0.05, behaviorType: "giant_herbivore"
    },
    "Brachiosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/brachiosaurus.png",
        nutrition: 1500, danger: 1000, aggression: 0.1, difficulty: 0.1,
        description: "Towering sauropod giant - massive size is its defense",
        size: 3.5, weight: 35000, injury: "steps on you with tree-trunk legs",
        minimumAge: 0.05, behaviorType: "giant_herbivore"
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

// Enhanced habitat species distributions with realistic Jurassic ecosystem
export const HABITAT_SPECIES = {
    // FOREST HIERARCHY - Rich in small creatures for hatchlings
    'denseforest': {
        // Abundant tiny prey for hatchlings
        'Dragonfly': 0.5, 'Centipede': 0.6, 'Cricket': 0.4, 'Mammal': 0.4,
        // Small prey
        'Scorpion': 0.25, 'Lizard': 0.2, 'Frog': 0.2, 'Compsognathus': 0.3,
        // Medium prey  
        'Hesperornithoides': 0.15, 'Sphenodontian': 0.1,
        // Larger threats
        'Ornitholestes': 0.12, 'Juvenile Allosaurus': 0.06
    },
    'forest': {
        // Good mix for all levels
        'Dragonfly': 0.35, 'Centipede': 0.4, 'Cricket': 0.25, 'Mammal': 0.3,
        'Scorpion': 0.2, 'Lizard': 0.15, 'Compsognathus': 0.25, 'Coelurus': 0.15,
        'Hesperornithoides': 0.12, 'Camptosaurus': 0.15, 'Dryosaurus': 0.15, 'Othnielia': 0.15,
        'Sphenodontian': 0.1, 'Ornitholestes': 0.1, 'Juvenile Allosaurus': 0.08
    },
    'openwoods': {
        // Forest edge species
        'Dragonfly': 0.3, 'Cricket': 0.3, 'Mammal': 0.25,
        'Lizard': 0.2, 'Compsognathus': 0.2, 'Coelurus': 0.15,
        'Camptosaurus': 0.25, 'Dryosaurus': 0.25, 'Othnielia': 0.25, 'Pterosaur': 0.15
    },
    'galleryforest': {
        // Waterside forest
        'Dragonfly': 0.5, 'Frog': 0.4, 'Fish': 0.3, 'Centipede': 0.25,
        'Lizard': 0.15, 'Compsognathus': 0.2, 'Crocodile': 0.15, 'Camptosaurus': 0.15
    },
    'deadforest': {
        // Sparse life in dead trees
        'Cricket': 0.2, 'Centipede': 0.3, 'Scorpion': 0.25,
        'Lizard': 0.15, 'Injured Pterosaur': 0.15, 'Sphenodontian': 0.15
    },

    // PLAINS HIERARCHY - Moderate diversity
    'plains': {
        'Cricket': 0.25, 'Mammal': 0.15, 'Scorpion': 0.1,
        'Lizard': 0.15, 'Compsognathus': 0.15, 'Coelurus': 0.1,
        'Hesperornithoides': 0.1, 'Sphenodontian': 0.1, 'Pterosaur': 0.2,
        'Camptosaurus': 0.2, 'Dryosaurus': 0.15, 'Stegosaurus': 0.15,
        'Ceratosaurus': 0.1, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1
    },
    'savanna': {
        'Cricket': 0.25, 'Mammal': 0.2, 'Lizard': 0.15,
        'Compsognathus': 0.2, 'Camptosaurus': 0.2, 'Stegosaurus': 0.2,
        'Dryosaurus': 0.2, 'Othnielia': 0.2, 'Pterosaur': 0.25
    },
    'scrubland': {
        'Cricket': 0.1, 'Mammal': 0.15, 'Lizard': 0.2, 'Scorpion': 0.15,
        'Compsognathus': 0.15, 'Sphenodontian': 0.15, 'Ornitholestes': 0.15
    },
    'sauropodgrounds': {
        // Migration route - large herbivores and predators
        'Pterosaur': 0.25, 'Camptosaurus': 0.15, 'Stegosaurus': 0.15,
        'Diplodocus': 0.3, 'Brachiosaurus': 0.2,
        'Ceratosaurus': 0.15, 'Torvosaurus': 0.1, 'Male Allosaurus': 0.2, 'Female Allosaurus': 0.2
    },

    // WATER FEATURES
    'river': {
        'Dragonfly': 0.3, 'Frog': 0.35, 'Fish': 0.5,
        'Crocodile': 0.4, 'Compsognathus': 0.1
    },
    'dryriverbed': {
        'Lizard': 0.15, 'Scorpion': 0.2, 'Cricket': 0.2, 'Mammal': 0.15,
        'Compsognathus': 0.15, 'Sphenodontian': 0.1
    },
    'riverbank': {
        'Dragonfly': 0.35, 'Frog': 0.35, 'Fish': 0.3, 'Cricket': 0.2,
        'Crocodile': 0.3, 'Camptosaurus': 0.12, 'Stegosaurus': 0.15,
        'Dryosaurus': 0.12, 'Othnielia': 0.12, 'Male Allosaurus': 0.12, 'Female Allosaurus': 0.12
    },
    'marsh': {
        'Dragonfly': 0.4, 'Frog': 0.45, 'Fish': 0.2, 'Centipede': 0.15,
        'Crocodile': 0.35, 'Lizard': 0.1
    },
    'waterhole': {
        'Dragonfly': 0.25, 'Frog': 0.3, 'Fish': 0.25, 'Cricket': 0.15,
        'Lizard': 0.1, 'Sphenodontian': 0.1, 'Stegosaurus': 0.25,
        'Camptosaurus': 0.15, 'Othnielia': 0.15, 'Dryosaurus': 0.15,
        'Diplodocus': 0.2, 'Brachiosaurus': 0.15,
        'Juvenile Allosaurus': 0.15, 'Male Allosaurus': 0.15, 'Female Allosaurus': 0.2
    },
    'lake': {
        'Dragonfly': 0.3, 'Frog': 0.35, 'Fish': 0.4,
        'Crocodile': 0.25, 'Stegosaurus': 0.15, 'Pterosaur': 0.15,
        'Diplodocus': 0.2, 'Brachiosaurus': 0.15
    },
    'beach': {
        'Dragonfly': 0.25, 'Frog': 0.15, 'Fish': 0.2, 'Cricket': 0.1,
        'Lizard': 0.15, 'Crocodile': 0.25, 'Pterosaur': 0.15
    },

    // MOUNTAIN FEATURES
    'hills': {
        'Pterosaur': 0.35, 'Lizard': 0.2, 'Scorpion': 0.15,
        'Compsognathus': 0.15, 'Coelurus': 0.1,
        'Camptosaurus': 0.15, 'Dryosaurus': 0.15, 'Othnielia': 0.15
    },
    'rocky': {
        'Lizard': 0.15, 'Scorpion': 0.12, 'Compsognathus': 0.1,
        'Pterosaur': 0.12, 'Coelurus': 0.08
    },
    'mountains': {
        'Pterosaur': 0.35, 'Lizard': 0.08, 'Cricket': 0.1, 'Mammal': 0.08
    },

    // DESERT FEATURES
    'desert': {
        'Scorpion': 0.15, 'Cricket': 0.08, 'Mammal': 0.05, 'Lizard': 0.08,
        'Compsognathus': 0.05, 'Coelurus': 0.05,
        'Sphenodontian': 0.08, 'Injured Pterosaur': 0.1,
        'Ceratosaurus': 0.05, 'Male Allosaurus': 0.08, 'Female Allosaurus': 0.08
    },
    'badlands': {
        'Scorpion': 0.2, 'Cricket': 0.12, 'Lizard': 0.12, 'Mammal': 0.08,
        'Compsognathus': 0.08, 'Injured Pterosaur': 0.15, 'Sphenodontian': 0.08
    },
    'mesa': {
        'Pterosaur': 0.4, 'Lizard': 0.08, 'Scorpion': 0.08, 'Cricket': 0.05
    },
    'quicksand': {
        // Almost no life - it's a death trap!
        'Cricket': 0.01, 'Scorpion': 0.005
    },

    // VOLCANIC FEATURES
    'volcanic': {
        'Pterosaur': 0.3, 'Lizard': 0.05, 'Cricket': 0.03, 'Scorpion': 0.03
    },
    'lavafield': {
        // Almost no life
        'Cricket': 0.01, 'Scorpion': 0.01
    },

    // SPECIAL AREAS
    'nest': {
        'Dragonfly': 0.25, 'Cricket': 0.2, 'Centipede': 0.25, 'Scorpion': 0.1,
        'Compsognathus': 0.3, 'Ornitholestes': 0.6  // Nest raiders
    }
};