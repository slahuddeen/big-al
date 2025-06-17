// ==================== ENHANCED SPECIES SYSTEM WITH BETTER HATCHLING NUTRITION ====================
export const SPECIES_DATA = {
    // TINY PREY (Perfect for 300g hatchlings!)
    "Dragonfly": {
        emoji: "🪰",
        image: "/assets/dinos/dragonfly.png",
        nutrition: 0.15, // INCREASED - perfect hatchling food!
        danger: 0, aggression: 0, difficulty: 0.6, // Slightly easier to catch
        description: "Quick flying insect - nutritious and perfect for hatchlings",
        size: 0.1, weight: 0.002, injury: "buzzes away angrily", // Slightly heavier
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Centipede": {
        emoji: "🐛",
        image: "/assets/dinos/centipede.png",
        nutrition: 0.4, // INCREASED - excellent hatchling food!
        danger: 0, aggression: 0, difficulty: 0.25, // Easier to catch
        description: "Ground-dwelling arthropod - meaty and satisfying for young dinosaurs",
        size: 0.12, weight: 0.008, injury: "tickles you harmlessly", // Better size/weight
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Cricket": {
        emoji: "🦗",
        image: "/assets/dinos/cricket.png",
        nutrition: 0.1, // INCREASED - good hatchling snack
        danger: 0, aggression: 0, difficulty: 0.4, // Slightly easier
        description: "Chirping insect - crunchy and nutritious for small predators",
        size: 0.08, weight: 0.003, injury: "hops away frantically", // Better scaling
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Mammal": {
        emoji: "🐁",
        image: "/assets/dinos/mammal.png",
        nutrition: 1.2, // INCREASED - substantial meal for hatchling!
        danger: 0, aggression: 0.1, difficulty: 0.5, // Balanced
        description: "Small Jurassic mammal - excellent nutrition for growing dinosaurs",
        size: 0.15, weight: 0.25, injury: "squeaks and gives tiny bites", // Better size
        minimumAge: 0.05, behaviorType: "skittish"
    },

    // SMALL PREY (Good for juveniles, still okay for larger hatchlings)
    "Scorpion": {
        emoji: "🦂",
        image: "/assets/dinos/scorpion.png",
        nutrition: 0.8, // INCREASED - better reward for the risk
        danger: 8, aggression: 0.25, difficulty: 0.35, // Slightly less dangerous
        description: "Venomous arachnid - dangerous but nutritious",
        size: 0.2, weight: 0.03, injury: "stings you with its tail",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Frog": {
        emoji: "🐸",
        image: "/assets/dinos/frog.png",
        nutrition: 0.8, // INCREASED - good transitional prey
        danger: 0, aggression: 0, difficulty: 0.45, // Slightly easier
        description: "Amphibian near water sources - good nutrition",
        size: 0.2, weight: 0.06, injury: "croaks loudly",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Lizard": {
        emoji: "🦎",
        image: "/assets/dinos/lizard.png",
        nutrition: 2.5, // INCREASED - substantial meal
        danger: 0.5, aggression: 0.1, difficulty: 0.45, // Slightly easier
        description: "Quick reptile - substantial meal for growing predators",
        size: 0.3, weight: 0.12, injury: "bites your toe",
        minimumAge: 0.1, behaviorType: "skittish"
    },
    "Fish": {
        emoji: "🐟",
        image: "/assets/dinos/fish.png",
        nutrition: 2.0, // INCREASED - good nutrition
        danger: 0, aggression: 0, difficulty: 0.35, // Easier to catch
        description: "Jurassic fish from rivers and lakes - excellent nutrition",
        size: 0.3, weight: 0.25, injury: "flops around desperately",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Compsognathus": {
        emoji: "🦖",
        image: "/assets/dinos/compsognathus.png",
        nutrition: 10, // Slightly increased
        danger: 4, aggression: 0.5, difficulty: 0.65, // Slightly less dangerous
        description: "Chicken-sized pack predator - dangerous but rewarding",
        size: 0.4, weight: 3, injury: "nips you with needle teeth",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Coelurus": {
        emoji: "🦴",
        image: "/assets/dinos/coelurus.png",
        nutrition: 15, // Slightly increased
        danger: 6, aggression: 0.35, difficulty: 0.45, // Less dangerous
        description: "Gracile small theropod - agile predator with good meat",
        size: 0.5, weight: 15, injury: "slashes with small claws",
        minimumAge: 0.1, behaviorType: "skittish"
    },

    // MEDIUM PREY (Good for sub-adults, challenging for juveniles)
    "Hesperornithoides": {
        emoji: "🦅",
        image: "/assets/dinos/hesperornithoides.png",
        nutrition: 18, danger: 22, aggression: 0.65, difficulty: 0.75,
        description: "Small but intelligent troodontid - feathered and cunning",
        size: 0.4, weight: 8, injury: "slashes with sickle claws",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Sphenodontian": {
        emoji: "🦎",
        image: "/assets/dinos/lizard1.png",
        nutrition: 10, danger: 4, aggression: 0.15, difficulty: 0.25,
        description: "Ancient reptile - surprisingly aggressive",
        size: 0.4, weight: 2, injury: "bites you firmly",
        minimumAge: 0.1, behaviorType: "territorial"
    },
    "Camptosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/camptosaurus.png",
        nutrition: 140, danger: 35, aggression: 0.08, difficulty: 0.25,
        description: "Fast ornithopod herbivore - powerful kicks when cornered",
        size: 1.2, weight: 800, injury: "kicks you with powerful legs",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Dryosaurus": {
        emoji: "🦴",
        image: "/assets/dinos/dryosaurus.png",
        nutrition: 60, danger: 18, aggression: 0, difficulty: 0.18,
        description: "Fast herbivore - good nutrition with manageable risk",
        size: 0.8, weight: 80, injury: "kicks you with powerful legs",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Othnielia": {
        emoji: "🦕",
        image: "/assets/dinos/othnielia.png",
        nutrition: 55, danger: 16, aggression: 0, difficulty: 0.15,
        description: "Small ornithopod - quick but manageable",
        size: 0.7, weight: 60, injury: "headbutts you in panic",
        minimumAge: 0.05, behaviorType: "herbivore"
    },
    "Pterosaur": {
        emoji: "🦅",
        image: "/assets/dinos/pterosaur.png",
        nutrition: 25, danger: 8, aggression: 0.6, difficulty: 0.55,
        description: "Flying predator - sharp beak and talons, hard to catch",
        size: 1.0, weight: 15, injury: "snaps at you with its beak",
        minimumAge: 0.1, behaviorType: "aerial_predator"
    },
    "Injured Pterosaur": {
        emoji: "🦅",
        image: "/assets/dinos/pterosaur.png",
        nutrition: 25, danger: 0.1, aggression: 0, difficulty: 0.05,
        description: "Wounded flying reptile - easy target with good nutrition",
        size: 1.0, weight: 15, injury: "flails weakly",
        minimumAge: 0.1, behaviorType: "passive"
    },

    // LARGE PREY (Good for adults, very dangerous for smaller predators)
    "Ceratosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/ceratosaurus.png",
        nutrition: 220, danger: 380, aggression: 0.75, difficulty: 0.35,
        description: "Horned theropod predator - aggressive mid-tier carnivore",
        size: 1.3, weight: 600, injury: "gores you with nasal horn",
        minimumAge: 0.5, behaviorType: "rival_predator"
    },
    "Ornitholestes": {
        emoji: "🦖",
        image: "/assets/dinos/ornitholestes.png",
        nutrition: 60, danger: 45, aggression: 0.85, difficulty: 0.45,
        description: "Small theropod - aggressive pack hunter",
        size: 0.5, weight: 25, injury: "claws and bites viciously",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Juvenile Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/hatchling.png",
        nutrition: 25, danger: 90, aggression: 0.55, difficulty: 0.65,
        description: "Young apex predator - territorial rival",
        size: 0.6, weight: 150, injury: "attacks you fiercely",
        minimumAge: 0.5, behaviorType: "rival_predator"
    },
    "Crocodile": {
        emoji: "🐊",
        image: "/assets/dinos/crocodile.png",
        nutrition: 8, danger: 900, aggression: 0.55, difficulty: 0.35,
        description: "Ancient apex predator - death roll specialist",
        size: 1.5, weight: 400, injury: "drags you underwater but you break free",
        minimumAge: 0.1, behaviorType: "ambush_predator"
    },

    // HUGE PREY (Only for apex adult predators)
    "Torvosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/torvosaurus.png",
        nutrition: 850, danger: 2800, aggression: 0.85, difficulty: 0.25,
        description: "Massive apex predator - 'savage lizard' with enormous teeth",
        size: 2.0, weight: 3000, injury: "tears into you with massive serrated teeth",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Stegosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/stegosaurus.png",
        nutrition: 550, danger: 1200, aggression: 0.25, difficulty: 0.08,
        description: "Heavily armored herbivore - lethal tail spikes",
        size: 2.0, weight: 3000, injury: "whacks you with its spiked tail",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
    },
    "Diplodocus": {
        emoji: "🦕",
        image: "/assets/dinos/diplodocus.png",
        nutrition: 1300, danger: 750, aggression: 0.15, difficulty: 0.15,
        description: "Enormous long-necked sauropod - whip-like tail defense",
        size: 3.0, weight: 15000, injury: "whips you with its enormous tail",
        minimumAge: 0.05, behaviorType: "giant_herbivore"
    },
    "Brachiosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/brachiosaurus.png",
        nutrition: 1600, danger: 900, aggression: 0.08, difficulty: 0.08,
        description: "Towering sauropod giant - massive size is its defense",
        size: 3.5, weight: 35000, injury: "steps on you with tree-trunk legs",
        minimumAge: 0.05, behaviorType: "giant_herbivore"
    },
    "Male Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/allosaurus.png",
        nutrition: 220, danger: 1800, aggression: 0.85, difficulty: 0.75,
        description: "Adult male predator - extremely dangerous",
        size: 1.5, weight: 1500, injury: "savages you brutally",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Female Allosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/allosaurus.png",
        nutrition: 280, danger: 2200, aggression: 0.85, difficulty: 0.75,
        description: "Adult female predator - larger and deadlier",
        size: 1.6, weight: 1800, injury: "tears into you with massive jaws",
        minimumAge: 1.0, behaviorType: "apex_predator"
    }
};

// Enhanced habitat species distributions with better tiny creature spawning for hatchlings
export const HABITAT_SPECIES = {
    // FOREST HIERARCHY - Enhanced for hatchling survival!
    'denseforest': {
        // Much more abundant tiny prey for 300g hatchlings
        'Dragonfly': 0.7, 'Centipede': 0.8, 'Cricket': 0.6, 'Mammal': 0.6,
        // Small prey
        'Scorpion': 0.3, 'Lizard': 0.25, 'Frog': 0.25, 'Compsognathus': 0.35,
        // Medium prey  
        'Hesperornithoides': 0.18, 'Sphenodontian': 0.12,
        // Larger threats
        'Ornitholestes': 0.15, 'Juvenile Allosaurus': 0.08
    },
    'forest': {
        // Enhanced tiny prey availability
        'Dragonfly': 0.5, 'Centipede': 0.6, 'Cricket': 0.4, 'Mammal': 0.45,
        'Scorpion': 0.25, 'Lizard': 0.2, 'Compsognathus': 0.3, 'Coelurus': 0.18,
        'Hesperornithoides': 0.15, 'Camptosaurus': 0.18, 'Dryosaurus': 0.18, 'Othnielia': 0.18,
        'Sphenodontian': 0.12, 'Ornitholestes': 0.12, 'Juvenile Allosaurus': 0.1
    },
    'openwoods': {
        // Forest edge species with good tiny prey
        'Dragonfly': 0.45, 'Cricket': 0.45, 'Mammal': 0.35,
        'Lizard': 0.25, 'Compsognathus': 0.25, 'Coelurus': 0.18,
        'Camptosaurus': 0.3, 'Dryosaurus': 0.3, 'Othnielia': 0.3, 'Pterosaur': 0.18
    },
    'galleryforest': {
        // Waterside forest with enhanced bug life
        'Dragonfly': 0.8, 'Frog': 0.5, 'Fish': 0.4, 'Centipede': 0.4, 'Cricket': 0.3,
        'Lizard': 0.2, 'Compsognathus': 0.25, 'Crocodile': 0.18, 'Camptosaurus': 0.18
    },
    'deadforest': {
        // Sparse life in dead trees but some bugs remain
        'Cricket': 0.3, 'Centipede': 0.4, 'Scorpion': 0.3,
        'Lizard': 0.18, 'Injured Pterosaur': 0.18, 'Sphenodontian': 0.18
    },

    // PLAINS HIERARCHY - Enhanced tiny creature spawning
    'plains': {
        'Cricket': 0.4, 'Mammal': 0.25, 'Scorpion': 0.15, 'Dragonfly': 0.2,
        'Lizard': 0.2, 'Compsognathus': 0.18, 'Coelurus': 0.12,
        'Hesperornithoides': 0.12, 'Sphenodontian': 0.12, 'Pterosaur': 0.25,
        'Camptosaurus': 0.25, 'Dryosaurus': 0.2, 'Stegosaurus': 0.18,
        'Ceratosaurus': 0.12, 'Male Allosaurus': 0.12, 'Female Allosaurus': 0.12
    },
    'savanna': {
        'Cricket': 0.35, 'Mammal': 0.3, 'Lizard': 0.2, 'Dragonfly': 0.15,
        'Compsognathus': 0.25, 'Camptosaurus': 0.25, 'Stegosaurus': 0.25,
        'Dryosaurus': 0.25, 'Othnielia': 0.25, 'Pterosaur': 0.3
    },
    'scrubland': {
        'Cricket': 0.2, 'Mammal': 0.2, 'Lizard': 0.25, 'Scorpion': 0.2,
        'Compsognathus': 0.18, 'Sphenodontian': 0.18, 'Ornitholestes': 0.18
    },
    'sauropodgrounds': {
        // Migration route - large herbivores and predators
        'Pterosaur': 0.3, 'Camptosaurus': 0.18, 'Stegosaurus': 0.18,
        'Diplodocus': 0.35, 'Brachiosaurus': 0.25,
        'Ceratosaurus': 0.18, 'Torvosaurus': 0.12, 'Male Allosaurus': 0.25, 'Female Allosaurus': 0.25
    },

    // WATER FEATURES - Enhanced for bugs and small prey
    'river': {
        'Dragonfly': 0.5, 'Frog': 0.45, 'Fish': 0.6,
        'Crocodile': 0.45, 'Compsognathus': 0.12
    },
    'dryriverbed': {
        'Lizard': 0.2, 'Scorpion': 0.25, 'Cricket': 0.3, 'Mammal': 0.2,
        'Compsognathus': 0.18, 'Sphenodontian': 0.12
    },
    'riverbank': {
        'Dragonfly': 0.5, 'Frog': 0.45, 'Fish': 0.4, 'Cricket': 0.3,
        'Crocodile': 0.35, 'Camptosaurus': 0.15, 'Stegosaurus': 0.18,
        'Dryosaurus': 0.15, 'Othnielia': 0.15, 'Male Allosaurus': 0.15, 'Female Allosaurus': 0.15
    },
    'marsh': {
        'Dragonfly': 0.6, 'Frog': 0.55, 'Fish': 0.3, 'Centipede': 0.2,
        'Crocodile': 0.4, 'Lizard': 0.12
    },
    'waterhole': {
        'Dragonfly': 0.4, 'Frog': 0.4, 'Fish': 0.35, 'Cricket': 0.25,
        'Lizard': 0.15, 'Sphenodontian': 0.12, 'Stegosaurus': 0.3,
        'Camptosaurus': 0.2, 'Othnielia': 0.2, 'Dryosaurus': 0.2,
        'Diplodocus': 0.25, 'Brachiosaurus': 0.2,
        'Juvenile Allosaurus': 0.18, 'Male Allosaurus': 0.18, 'Female Allosaurus': 0.25
    },
    'lake': {
        'Dragonfly': 0.45, 'Frog': 0.45, 'Fish': 0.5,
        'Crocodile': 0.3, 'Stegosaurus': 0.18, 'Pterosaur': 0.18,
        'Diplodocus': 0.25, 'Brachiosaurus': 0.18
    },
    'beach': {
        'Dragonfly': 0.35, 'Frog': 0.2, 'Fish': 0.3, 'Cricket': 0.15,
        'Lizard': 0.2, 'Crocodile': 0.3, 'Pterosaur': 0.18
    },

    // MOUNTAIN FEATURES
    'hills': {
        'Pterosaur': 0.4, 'Lizard': 0.25, 'Scorpion': 0.2, 'Cricket': 0.15,
        'Compsognathus': 0.18, 'Coelurus': 0.12,
        'Camptosaurus': 0.18, 'Dryosaurus': 0.18, 'Othnielia': 0.18
    },
    'rocky': {
        'Lizard': 0.2, 'Scorpion': 0.15, 'Compsognathus': 0.12, 'Cricket': 0.1,
        'Pterosaur': 0.15, 'Coelurus': 0.1
    },
    'mountains': {
        'Pterosaur': 0.4, 'Lizard': 0.1, 'Cricket': 0.15, 'Mammal': 0.1
    },

    // DESERT FEATURES
    'desert': {
        'Scorpion': 0.2, 'Cricket': 0.12, 'Mammal': 0.08, 'Lizard': 0.12,
        'Compsognathus': 0.08, 'Coelurus': 0.08,
        'Sphenodontian': 0.1, 'Injured Pterosaur': 0.12,
        'Ceratosaurus': 0.08, 'Male Allosaurus': 0.1, 'Female Allosaurus': 0.1
    },
    'badlands': {
        'Scorpion': 0.25, 'Cricket': 0.15, 'Lizard': 0.15, 'Mammal': 0.1,
        'Compsognathus': 0.1, 'Injured Pterosaur': 0.18, 'Sphenodontian': 0.1
    },
    'mesa': {
        'Pterosaur': 0.45, 'Lizard': 0.1, 'Scorpion': 0.1, 'Cricket': 0.08
    },
    'quicksand': {
        // Almost no life - it's a death trap!
        'Cricket': 0.015, 'Scorpion': 0.01
    },

    // VOLCANIC FEATURES
    'volcanic': {
        'Pterosaur': 0.35, 'Lizard': 0.08, 'Cricket': 0.05, 'Scorpion': 0.05
    },
    'lavafield': {
        // Almost no life
        'Cricket': 0.02, 'Scorpion': 0.015
    },

    // SPECIAL AREAS
    'nest': {
        'Dragonfly': 0.4, 'Cricket': 0.3, 'Centipede': 0.35, 'Scorpion': 0.15,
        'Compsognathus': 0.4, 'Ornitholestes': 0.7  // Nest raiders
    }
};