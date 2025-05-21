// utils/terrain.ts
export const habitats = {
    plains: {
        name: "Open Plains",
        color: "bg-amber-200",
        // Image 3 - Grassy plain
        imagePath: "/src/assets/tiles/plains.png",
        description: "Vast open grasslands with little cover, home to many large herbivores.",
        movementCost: 1,
        resources: 3,
        huntingModifier: 0.8,
        ambushValue: 0.2,
        waterSource: false,
        fact: "The open plains of the Jurassic period were where many of the largest herbivorous dinosaurs gathered in herds for protection."
    },
    forest: {
        name: "Dense Forest",
        color: "bg-green-700",
        // Image 2 - Forest with trees
        imagePath: "/src/assets/tiles/forest.png",
        description: "Thick vegetation providing cover and smaller prey animals.",
        movementCost: 1.5,
        resources: 2,
        huntingModifier: 1.2,
        ambushValue: 0.8,
        waterSource: false,
        fact: "Jurassic forests were dominated by conifers, ginkgoes, and tree ferns, creating a very different landscape from modern forests."
    },
    riverbank: {
        name: "Riverbank",
        color: "bg-blue-500",
        // Image 5 - River crossing plains
        imagePath: "/src/assets/tiles/river.png",
        description: "Flowing water where many creatures gather to drink.",
        movementCost: 1.2,
        resources: 4,
        huntingModifier: 1.0,
        ambushValue: 0.5,
        waterSource: true,
        fact: "Rivers were vital lifelines in the Jurassic, with many dinosaurs gathering near water sources during dry seasons."
    },
    marsh: {
        name: "Marsh",
        color: "bg-green-500",
        // Could use Image 3 or customize later
        imagePath: "/src/assets/tiles/grassland.png",
        description: "Waterlogged area with dense vegetation and many small creatures.",
        movementCost: 1.8,
        resources: 3,
        huntingModifier: 0.9,
        ambushValue: 0.7,
        waterSource: true,
        fact: "Jurassic marshes were home to many amphibians and primitive crocodilians that would ambush prey from the water."
    },
    rocky: {
        name: "Rocky Terrain",
        color: "bg-gray-500",
        // Image 7 - Rocky terrain
        imagePath: "/src/assets/tiles/rocky.png",
        description: "Elevated rocky terrain with few resources but good visibility.",
        movementCost: 1.5,
        resources: 1,
        huntingModifier: 0.7,
        ambushValue: 0.4,
        waterSource: false,
        fact: "The highlands during the Jurassic were forming as part of the breakup of Pangaea, creating new habitats for species to evolve in isolation."
    },
    lake: {
        name: "Lake",
        color: "bg-blue-400",
        // Image 4 - Water body
        imagePath: "/src/assets/tiles/lake.png",
        description: "Still water body with aquatic creatures and drinking source.",
        movementCost: 2.5,
        resources: 3,
        huntingModifier: 0.6,
        ambushValue: 0.3,
        waterSource: true,
        fact: "Jurassic lakes were critical ecosystems teeming with fish, amphibians, and other aquatic life that attracted predators."
    },
    nest: {
        name: "Allosaurus Nest",
        color: "bg-amber-600",
        // Image 1 - Nest with eggs
        imagePath: "/src/assets/tiles/nest.png",
        description: "Your birth nest, a safe place to rest.",
        movementCost: 1,
        resources: 0,
        huntingModifier: 0,
        ambushValue: 0,
        waterSource: false,
        fact: "Allosaurus nests were likely simple scrapes in the ground, possibly lined with vegetation. The mother would guard them fiercely."
    },
    volcanic: {
        name: "Volcanic Fields",
        color: "bg-red-900",
        // Image 8 - Volcanic terrain
        imagePath: "/src/assets/tiles/volcanic.png",
        description: "Dangerous areas with hot springs and toxic gases.",
        movementCost: 2.0,
        resources: 0,
        huntingModifier: 0.4,
        ambushValue: 0.1,
        waterSource: false,
        healthHazard: 0.1,
        fact: "Volcanic activity was common during the late Jurassic, creating hazardous but mineral-rich environments."
    },
    grassland: {
        name: "Grasslands",
        color: "bg-green-300",
        // Image 6 - Desert-like terrain with small vegetation
        imagePath: "/src/assets/tiles/grassland.png",
        description: "Areas with tall grass providing some cover and moderate hunting.",
        movementCost: 1.1,
        resources: 2,
        huntingModifier: 1.0,
        ambushValue: 0.6,
        waterSource: false,
        fact: "While modern grasses didn't exist in the Jurassic, similar primitive plants created grassland-like areas favored by many herbivores."
    },
    cliff: {
        name: "Cliff Face",
        color: "bg-gray-700",
        // Could use a modified Rocky (Image 7) or custom later
        imagePath: "/src/assets/tiles/rocky.png",
        description: "Steep rocky areas difficult to traverse but offering exceptional views.",
        movementCost: 2.2,
        resources: 0,
        huntingModifier: 0.3,
        ambushValue: 0.2,
        waterSource: false,
        healthHazard: 0.05,
        fact: "Cliffs in the Jurassic landscape provided nesting sites for pterosaurs and smaller dinosaurs, often inaccessible to larger predators."
    }
};