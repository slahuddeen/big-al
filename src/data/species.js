// ==================== ENHANCED SPECIES SYSTEM WITH REDUCED SPAWNING ====================
export const SPECIES_DATA = {
    // TINY PREY (Perfect for 300g hatchlings!)
    "Dragonfly": {
        emoji: "🪰",
        image: "/assets/dinos/dragonfly.png",
        nutrition: 0.15, danger: 0, aggression: 0, difficulty: 0.6,
        description: "Quick flying insect - nutritious and perfect for hatchlings",
        size: 0.1, weight: 0.002, injury: "buzzes away angrily",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Centipede": {
        emoji: "🐛",
        image: "/assets/dinos/centipede1.png",
        nutrition: 0.4, danger: 0, aggression: 0, difficulty: 0.25,
        description: "Ground-dwelling arthropod - meaty and satisfying for young dinosaurs",
        size: 0.12, weight: 0.008, injury: "tickles you harmlessly",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Cricket": {
        emoji: "🦗",
        image: "/assets/dinos/cricket.png",
        nutrition: 0.1, danger: 0, aggression: 0, difficulty: 0.4,
        description: "Chirping insect - crunchy and nutritious for small predators",
        size: 0.08, weight: 0.003, injury: "hops away frantically",
        minimumAge: 0.05, behaviorType: "skittish"
    },
    "Mammal": {
        emoji: "🐁",
        image: "/assets/dinos/mammal.png",
        nutrition: 1.2, danger: 0, aggression: 0.1, difficulty: 0.5,
        description: "Small Jurassic mammal - excellent nutrition for growing dinosaurs",
        size: 0.15, weight: 0.25, injury: "squeaks and gives tiny bites",
        minimumAge: 0.05, behaviorType: "skittish"
    },

    // SMALL PREY (Good for juveniles, still okay for larger hatchlings)
    "Scorpion": {
        emoji: "🦂",
        image: "/assets/dinos/scorpion.png",
        nutrition: 0.8, danger: 8, aggression: 0.25, difficulty: 0.35,
        description: "Venomous arachnid - dangerous but nutritious",
        size: 0.2, weight: 0.03, injury: "stings you with its tail",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Frog": {
        emoji: "🐸",
        image: "/assets/dinos/frog.png",
        nutrition: 0.8, danger: 0, aggression: 0, difficulty: 0.45,
        description: "Amphibian near water sources - good nutrition",
        size: 0.2, weight: 0.06, injury: "croaks loudly",
        minimumAge: 0.05, behaviorType: "skittish"
    },
    "Lizard": {
        emoji: "🦎",
        image: "/assets/dinos/lizard.png",
        nutrition: 2.5, danger: 0.5, aggression: 0.1, difficulty: 0.45,
        description: "Quick reptile - substantial meal for growing predators",
        size: 0.3, weight: 0.12, injury: "bites your toe",
        minimumAge: 0.1, behaviorType: "skittish"
    },
    "Fish": {
        emoji: "🐟",
        image: "/assets/dinos/fish.png",
        nutrition: 2.0, danger: 0, aggression: 0, difficulty: 0.35,
        description: "Jurassic fish from rivers and lakes - excellent nutrition",
        size: 0.3, weight: 0.25, injury: "flops around desperately",
        minimumAge: 0.05, behaviorType: "passive"
    },
    "Turtle": {
        emoji: "🐢",
        image: "/assets/dinos/turtle.png",
        nutrition: 3.0, danger: 2, aggression: 0.05, difficulty: 0.2,
        description: "Armored reptile - hard to crack but nutritious inside",
        size: 0.4, weight: 1.5, injury: "retreats into its shell",
        minimumAge: 0.05, behaviorType: "defensive"
    },
    "Snake": {
        emoji: "🐍",
        image: "/assets/dinos/snake.png",
        nutrition: 1.8, danger: 5, aggression: 0.3, difficulty: 0.6,
        description: "Slithering predator - quick and potentially venomous",
        size: 0.3, weight: 0.8, injury: "strikes with fanged bite",
        minimumAge: 0.1, behaviorType: "territorial"
    },
    "Compsognathus": {
        emoji: "🦖",
        image: "/assets/dinos/compsognathus2.png",
        nutrition: 10, danger: 4, aggression: 0.5, difficulty: 0.65,
        description: "Chicken-sized pack predator - dangerous but rewarding",
        size: 0.4, weight: 3, injury: "nips you with needle teeth",
        minimumAge: 0.1, behaviorType: "pack_predator"
    },
    "Coelurus": {
        emoji: "🦴",
        image: "/assets/dinos/coelurus.png",
        nutrition: 15, danger: 6, aggression: 0.35, difficulty: 0.45,
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
        image: "/assets/dinos/lizard3.png",
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
    "Harpactognathus": {
        emoji: "🦅",
        image: "/assets/dinos/harpactognathus.png",
        nutrition: 28, danger: 12, aggression: 0.65, difficulty: 0.6,
        description: "Morrison Formation pterosaur - sharp-toothed fish hunter with 2.5m wingspan",
        size: 1.0, weight: 18, injury: "slashes with sharp beak and claws",
        minimumAge: 0.1, behaviorType: "aerial_predator"
    },
    "Mesadactylus": {
        emoji: "🦇",
        image: "/assets/dinos/mesadactylus.png",
        nutrition: 8, danger: 2, aggression: 0.2, difficulty: 0.8,
        description: "Small fluffy pterosaur - bat-like with 1m wingspan, skittish but nutritious",
        size: 0.4, weight: 2, injury: "flutters away with tiny nips",
        minimumAge: 0.1, behaviorType: "skittish"
    },
    "Kepodactylus": {
        emoji: "🦅",
        image: "/assets/dinos/kepodactylus.png",
        nutrition: 45, danger: 35, aggression: 0.75, difficulty: 0.45,
        description: "Large Morrison pterosaur - ugly and aggressive with prominent sharp teeth, 3m wingspan",
        size: 1.4, weight: 35, injury: "tears into you with massive serrated beak",
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
    "Rhamphorhynchus": {
        emoji: "🦇",
        image: "/assets/dinos/kepodactylus.png",
        nutrition: 12, danger: 6, aggression: 0.4, difficulty: 0.7,
        description: "Long-tailed pterosaur - aggressive fish eater",
        size: 0.6, weight: 4, injury: "pecks viciously with pointed beak",
        minimumAge: 0.1, behaviorType: "aerial_predator"
    },

    // LARGE PREY (Good for adults, very dangerous for smaller predators)
    "Ceratosaurus": {
        emoji: "🦖",
        image: "/assets/dinos/ceratosaurus2.png",
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
    "Kentrosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/kentrosaurus.png",
        nutrition: 280, danger: 180, aggression: 0.15, difficulty: 0.1,
        description: "Spiky stegosaur relative - dangerous spines and tail",
        size: 1.4, weight: 1200, injury: "impales you with shoulder spines",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
    },
    "Tuojiangosaurus": {
        emoji: "🦕",
        image: "/assets/dinos/tuojiangosaurus.png",
        nutrition: 320, danger: 220, aggression: 0.2, difficulty: 0.08,
        description: "Asian stegosaur - armored herbivore with spiked tail",
        size: 1.6, weight: 1500, injury: "whips you with spiked tail",
        minimumAge: 0.05, behaviorType: "dangerous_herbivore"
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
    "Camarasaurus": {
        emoji: "🦕",
        image: "/assets/dinos/camarasaurus.png",
        nutrition: 980, danger: 600, aggression: 0.1, difficulty: 0.12,
        description: "Robust sauropod - smaller than Brachiosaurus but still massive",
        size: 2.5, weight: 18000, injury: "tramples you with massive feet",
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
        image: "/assets/dinos/female.png",
        nutrition: 280, danger: 2200, aggression: 0.85, difficulty: 0.75,
        description: "Adult female predator - larger and deadlier",
        size: 1.6, weight: 1800, injury: "tears into you with massive jaws",
        minimumAge: 1.0, behaviorType: "apex_predator"
    },
    "Saurophaganax": {
        emoji: "🦖",
        image: "/assets/dinos/saurophaganax.png",
        nutrition: 480, danger: 3200, aggression: 0.9, difficulty: 0.8,
        description: "Gigantic allosaurid - one of the largest predators ever",
        size: 2.2, weight: 4000, injury: "crushes you in its massive jaws",
        minimumAge: 1.0, behaviorType: "apex_predator"
    }
};

// BALANCED: Reasonable spawn rates - not overwhelming!
export const HABITAT_SPECIES = {
    // FOREST HIERARCHY - Moderate spawning rates
    'denseforest': {
        // Decent tiny prey spawning
        'Dragonfly': 0.25, 'Centipede': 0.3, 'Mammal': 0.2,
        // Some small prey
        'Lizard': 0.15, 'Compsognathus': 0.18, 'Coelurus': 0.12,
        // Limited medium prey
        'Hesperornithoides': 0.1, 'Sphenodontian': 0.08, 'Mesadactylus': 0.12,
        // Rare larger threats
        'Ornitholestes': 0.08, 'Juvenile Allosaurus': 0.05,
    },
    'forest': {
        // Balanced spawn rates
        'Dragonfly': 0.2, 'Centipede': 0.25, 'Cricket': 0.18, 'Mammal': 0.2,
        'Scorpion': 0.12, 'Lizard': 0.15, 'Compsognathus': 0.15, 'Coelurus': 0.1,
        'Hesperornithoides': 0.08, 'Camptosaurus': 0.12, 'Dryosaurus': 0.12, 'Othnielia': 0.12,
        'Sphenodontian': 0.08, 'Mesadactylus': 0.15, 'Harpactognathus': 0.1,
        'Ornitholestes': 0.08, 'Juvenile Allosaurus': 0.06, 'Torvosaurus': 0.08
    },
    'openwoods': {
        // Forest edge species - moderate
        'Dragonfly': 0.18, 'Cricket': 0.2, 'Mammal': 0.15,
        'Lizard': 0.12, 'Turtle': 0.1, 'Compsognathus': 0.12, 'Coelurus': 0.08,
        'Camptosaurus': 0.15, 'Dryosaurus': 0.15, 'Othnielia': 0.15,
        'Harpactognathus': 0.12, 'Mesadactylus': 0.15, 'Torvosaurus': 0.1
    },
    'deadforest': {
        // VERY SPARSE - dead forests should be mostly empty!
        'Cricket': 0.08, 'Centipede': 0.1, 'Scorpion': 0.08,
        'Lizard': 0.05, 'Injured Pterosaur': 0.06, 'Sphenodontian': 0.05
    },

    // PLAINS HIERARCHY - Moderate activity
    'plains': {
        'Cricket': 0.18, 'Mammal': 0.12, 'Scorpion': 0.08, 'Dragonfly': 0.1,
        'Lizard': 0.12, 'Compsognathus': 0.12, 'Coelurus': 0.08,
        'Hesperornithoides': 0.08, 'Sphenodontian': 0.08, 'Harpactognathus': 0.15, 'Mesadactylus': 0.18,
        'Camptosaurus': 0.15, 'Dryosaurus': 0.12, 'Othnielia': 0.12, 'Stegosaurus': 0.1, 'Kentrosaurus': 0.08,
        'Ceratosaurus': 0.06, 'Male Allosaurus': 0.06, 'Female Allosaurus': 0.06, 'Kepodactylus': 0.06
    },
    'savanna': {
        'Cricket': 0.15, 'Mammal': 0.15, 'Lizard': 0.12, 'Dragonfly': 0.1,
        'Compsognathus': 0.15, 'Camptosaurus': 0.15, 'Stegosaurus': 0.15, 'Tuojiangosaurus': 0.12,
        'Dryosaurus': 0.15, 'Othnielia': 0.15, 'Harpactognathus': 0.18, 'Mesadactylus': 0.2, 'Kepodactylus': 0.08
    },
    'scrubland': {
        'Cricket': 0.12, 'Mammal': 0.1, 'Lizard': 0.15, 'Scorpion': 0.12, 'Snake': 0.1,
        'Compsognathus': 0.1, 'Sphenodontian': 0.1, 'Ornitholestes': 0.08, 'Mesadactylus': 0.12
    },
    'sauropodgrounds': {
        // Migration route - active but not overwhelming
        'Harpactognathus': 0.15, 'Mesadactylus': 0.12, 'Camptosaurus': 0.12, 'Stegosaurus': 0.12,
        'Diplodocus': 0.18, 'Brachiosaurus': 0.15, 'Camarasaurus': 0.18,
        'Ceratosaurus': 0.1, 'Torvosaurus': 0.08, 'Male Allosaurus': 0.12, 'Female Allosaurus': 0.12,
        'Saurophaganax': 0.05, 'Kepodactylus': 0.08
    },

    // WATER FEATURES - Reasonable life around water
    'river': {
        'Dragonfly': 0.2, 'Frog': 0.25, 'Fish': 0.3, 'Turtle': 0.15,
        'Crocodile': 0.2, 'Compsognathus': 0.08, 'Harpactognathus': 0.12
    },
    'dryriverbed': {
        'Lizard': 0.12, 'Scorpion': 0.15, 'Cricket': 0.15, 'Mammal': 0.1, 'Snake': 0.1,
        'Compsognathus': 0.1, 'Sphenodontian': 0.08, 'Mesadactylus': 0.08
    },
    'riverbank': {
        'Dragonfly': 0.2, 'Frog': 0.2, 'Fish': 0.18, 'Cricket': 0.15, 'Turtle': 0.15,
        'Crocodile': 0.18, 'Camptosaurus': 0.1, 'Stegosaurus': 0.12,
        'Dryosaurus': 0.1, 'Othnielia': 0.1, 'Harpactognathus': 0.12,
        'Male Allosaurus': 0.08, 'Female Allosaurus': 0.08
    },
    'marsh': {
        'Dragonfly': 0.25, 'Frog': 0.3, 'Fish': 0.15, 'Centipede': 0.12, 'Turtle': 0.2,
        'Crocodile': 0.2, 'Lizard': 0.08, 'Harpactognathus': 0.15, 'Mesadactylus': 0.12
    },
    'waterhole': {
        'Dragonfly': 0.15, 'Frog': 0.18, 'Fish': 0.2, 'Cricket': 0.12, 'Turtle': 0.15,
        'Lizard': 0.1, 'Sphenodontian': 0.08, 'Stegosaurus': 0.15,
        'Camptosaurus': 0.12, 'Othnielia': 0.1, 'Dryosaurus': 0.1,
        'Diplodocus': 0.15, 'Brachiosaurus': 0.12, 'Camarasaurus': 0.15,
        'Harpactognathus': 0.12, 'Mesadactylus': 0.1,
        'Juvenile Allosaurus': 0.08, 'Male Allosaurus': 0.08, 'Female Allosaurus': 0.1
    },
    'lake': {
        'Dragonfly': 0.18, 'Frog': 0.2, 'Fish': 0.25, 'Turtle': 0.18,
        'Crocodile': 0.15, 'Stegosaurus': 0.12, 'Harpactognathus': 0.15, 'Mesadactylus': 0.15,
        'Rhamphorhynchus': 0.15, 'Diplodocus': 0.15, 'Brachiosaurus': 0.12, 'Kepodactylus': 0.1
    },
    'beach': {
        'Dragonfly': 0.15, 'Frog': 0.12, 'Fish': 0.18, 'Cricket': 0.1, 'Turtle': 0.2,
        'Lizard': 0.12, 'Crocodile': 0.15, 'Harpactognathus': 0.12, 'Mesadactylus': 0.15, 'Kepodactylus': 0.08
    },

    // MOUNTAIN FEATURES - Moderate aerial life
    'hills': {
        'Harpactognathus': 0.2, 'Rhamphorhynchus': 0.15, 'Mesadactylus': 0.25, 'Kepodactylus': 0.08,
        'Lizard': 0.15, 'Scorpion': 0.12, 'Cricket': 0.1,
        'Compsognathus': 0.12, 'Coelurus': 0.08,
        'Camptosaurus': 0.12, 'Dryosaurus': 0.12, 'Othnielia': 0.12
    },
    'rocky': {
        'Lizard': 0.12, 'Scorpion': 0.1, 'Snake': 0.08, 'Compsognathus': 0.08, 'Cricket': 0.08,
        'Harpactognathus': 0.1, 'Mesadactylus': 0.15, 'Coelurus': 0.06
    },
    'mountains': {
        'Harpactognathus': 0.2, 'Rhamphorhynchus': 0.18, 'Mesadactylus': 0.25, 'Kepodactylus': 0.12,
        'Lizard': 0.06, 'Cricket': 0.08, 'Mammal': 0.06
    },

    // DESERT FEATURES - Still sparse but reasonable
    'desert': {
        'Scorpion': 0.12, 'Cricket': 0.08, 'Mammal': 0.05, 'Lizard': 0.08, 'Snake': 0.1,
        'Compsognathus': 0.05, 'Coelurus': 0.05, 'Mesadactylus': 0.08,
        'Sphenodontian': 0.06, 'Injured Pterosaur': 0.08,
        'Ceratosaurus': 0.05, 'Male Allosaurus': 0.06, 'Female Allosaurus': 0.06
    },
    'badlands': {
        'Scorpion': 0.15, 'Cricket': 0.1, 'Lizard': 0.1, 'Mammal': 0.06, 'Snake': 0.08,
        'Compsognathus': 0.06, 'Injured Pterosaur': 0.12, 'Sphenodontian': 0.06, 'Mesadactylus': 0.1
    },
    'mesa': {
        'Harpactognathus': 0.25, 'Rhamphorhynchus': 0.2, 'Mesadactylus': 0.3, 'Kepodactylus': 0.15,
        'Lizard': 0.06, 'Scorpion': 0.06, 'Cricket': 0.05
    },
    'quicksand': {
        // Death trap - almost nothing!
        'Cricket': 0.005, 'Scorpion': 0.003
    },

    // VOLCANIC FEATURES - VERY SPARSE!
    'volcanic': {
        'Harpactognathus': 0.15, 'Rhamphorhynchus': 0.12, 'Mesadactylus': 0.18, 'Kepodactylus': 0.1,
        'Lizard': 0.03, 'Cricket': 0.02, 'Scorpion': 0.02
    },
    'lavafield': {
        // Almost completely dead!
        'Cricket': 0.005, 'Scorpion': 0.003, 'Mesadactylus': 0.01
    },

    // SPECIAL AREAS - Active but not crazy
    'nest': {
        'Dragonfly': 0.2, 'Cricket': 0.15, 'Centipede': 0.18, 'Scorpion': 0.1,
        'Compsognathus': 0.25, 'Ornitholestes': 0.3, 'Mesadactylus': 0.15  // Nest raiders
    }
};