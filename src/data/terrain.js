// ==================== SIMPLIFIED TERRAIN SYSTEM ====================
const createTerrain = (name, emoji, color, config = {}) => ({
    name,
    emoji,
    color,
    image: config.image || null,
    visibility: config.visibility || 2,
    blocksLOS: config.blocksLOS || false,
    passable: config.passable !== false,
    isWater: config.isWater || false,
    isLinear: config.isLinear || false,
    category: config.category || 'terrain',
    description: config.description || name,
    dangerLevel: config.dangerLevel || 0,
    energyCost: config.energyCost || 6,
    fitnessRisk: config.fitnessRisk || 0,
    minWeight: config.minWeight || 0,
});

export const TERRAIN_TYPES = {
    // WATER FEATURES (Linear features)
    river: createTerrain("River", "🌊", "#2563eb", {
        image: "/assets/tiles/river.png",
        isLinear: true, isWater: true, description: "Flowing river - wade carefully",
        dangerLevel: 2, energyCost: 12, fitnessRisk: 0.3, minWeight: 50
    }),
    dryriverbed: createTerrain("Dry Riverbed", "🪨", "#a8a29e", {
        image: "/assets/tiles/dryriverbed.png",
        isLinear: true, description: "Ancient riverbed", energyCost: 8
    }),
    riverbank: createTerrain("Riverbank", "🏖️", "#92400e", {
        image: "/assets/tiles/riverbank.png",
        description: "Muddy riverbank - crocodiles lurk here",
        dangerLevel: 1, energyCost: 8
    }),
    marsh: createTerrain("Marsh", "🌿", "#365314", {
        image: "/assets/tiles/marsh.png",
        visibility: 1, description: "Treacherous marshland", energyCost: 10
    }),
    waterhole: createTerrain("Waterhole", "💧", "#0369a1", {
        image: "/assets/tiles/waterhole.png",
        description: "Life-giving waterhole", dangerLevel: 1, energyCost: 6
    }),
    lake: createTerrain("Lake", "🏞️", "#0ea5e9", {
        image: "/assets/tiles/lake.png",
        isWater: true, description: "Natural lake", energyCost: 8
    }),
    beach: createTerrain("Beach", "🏖️", "#fbbf24", {
        image: "/assets/tiles/beach.png",
        description: "Sandy beach by water", energyCost: 7
    }),

    // FOREST TYPES - Simplified
    denseforest: createTerrain("Dense Forest", "🌲", "#166534", {
        image: "/assets/tiles/old2.png",
        visibility: 1, blocksLOS: true, category: "forest",
        description: "Impenetrable dense forest", energyCost: 12, fitnessRisk: 0.08
    }),
    forest: createTerrain("Forest", "🌲", "#16a34a", {
        image: "/assets/tiles/denseforest.png",
        visibility: 1, category: "forest", description: "Dense forest", energyCost: 8
    }),
    openwoods: createTerrain("Open Woods", "🌿", "#65a30d", {
        image: "/assets/tiles/woods.png",
        visibility: 2, category: "forest", description: "Sparse woodland", energyCost: 7
    }),
    galleryforest: createTerrain("Gallery Forest", "🌳", "#166534", {
        image: "/assets/tiles/gal.png",
        visibility: 1, category: "forest", description: "Forest along waterways", energyCost: 9
    }),
    deadforest: createTerrain("Dead Forest", "🪵", "#78716c", {
        image: "/assets/tiles/deadforest.png",
        visibility: 1, category: "forest", description: "Burnt or dead forest", energyCost: 8
    }),

    // PLAINS TYPES - Simplified
    plains: createTerrain("Plains", "🌾", "#ca8a04", {
        image: "/assets/tiles/grassland.png",
        category: "plains", description: "Open grasslands", energyCost: 6
    }),
    savanna: createTerrain("Savanna", "🌾", "#eab308", {
        image: "/assets/tiles/savannah.png",
        category: "plains", description: "Tree-dotted grassland", energyCost: 6
    }),
    scrubland: createTerrain("Scrubland", "🌿", "#65a30d", {
        image: "/assets/tiles/shrubland.png",
        category: "plains", description: "Low shrub terrain", energyCost: 7
    }),
    sauropodgrounds: createTerrain("Migration Route", "🦕", "#a16207", {
        image: "/assets/tiles/sauropodgrounds.png",
        isLinear: true, category: "plains", description: "Sauropod migration path",
        energyCost: 6, dangerLevel: 4
    }),

    // MOUNTAIN TYPES 
    mountains: createTerrain("Mountains", "⛰️", "#6b7280", {
        image: "/assets/tiles/mountain.png",
        passable: false, blocksLOS: true, category: "mountain", description: "Impassable peaks"
    }),
    volcanic: createTerrain("Volcanic Peak", "🌋", "#7c2d12", {
        image: "/assets/tiles/volcanic.png",
        passable: false, blocksLOS: true, category: "volcanic",
        description: "Active volcano", dangerLevel: 3
    }),
    hills: createTerrain("Hills", "🏔️", "#4ade80", {
        image: "/assets/tiles/hill.png",
        category: "mountain", description: "Rolling hills", energyCost: 10, visibility: 3
    }),
    rocky: createTerrain("Rocky Terrain", "🪨", "#78716c", {
        image: "/assets/tiles/rocky3.png",
        category: "mountain", description: "Broken rocky ground", energyCost: 9, fitnessRisk: 0.1
    }),

    // DESERT TYPES - Simplified
    desert: createTerrain("Desert", "🏜️", "#d97706", {
        image: "/assets/tiles/desert.png",
        category: "desert", description: "Arid wasteland", energyCost: 12, dangerLevel: 1
    }),
    badlands: createTerrain("Badlands", "🏔️", "#c2410c", {
        image: "/assets/tiles/badlands.png",
        category: "desert", description: "Eroded wasteland", energyCost: 11
    }),
    mesa: createTerrain("Mesa", "🗻", "#ea580c", {
        image: "/assets/tiles/mesa2.png",
        blocksLOS: true, category: "desert", description: "Flat-topped plateau", energyCost: 12, visibility: 3
    }),
    quicksand: createTerrain("Quicksand", "⚠️", "#f59e0b", {
        image: "/assets/tiles/quicksand.png",
        category: "desert", description: "Dangerous quicksand - instant death!",
        energyCost: 15, fitnessRisk: 1.0, passable: true, dangerLevel: 5
    }),

    // VOLCANIC FEATURES
    lavafield: createTerrain("Lava Field", "🔥", "#991b1b", {
        image: "/assets/tiles/volcanicfeilds.png",
        category: "volcanic", description: "Molten lava - impassable",
        energyCost: 10, fitnessRisk: 0.3, dangerLevel: 2
    }),

    // SPECIAL AREAS
    nest: createTerrain("Nesting Site", "🥚", "#a16207", {
        image: "/assets/tiles/nest.png",
        category: "special", description: "Dinosaur nesting ground", energyCost: 6, dangerLevel: 1
    })
};

export const getBackgroundGradient = (currentTerrain, timeInfo) => {
    const baseGradients = {
        // Forest gradients - simplified
        'denseforest': 'from-green-900 via-green-800 to-green-900',
        'forest': 'from-green-900 via-green-800 to-green-900',
        'openwoods': 'from-green-700 via-lime-700 to-green-700',
        'galleryforest': 'from-green-800 via-blue-700 to-green-800',
        'deadforest': 'from-gray-800 via-brown-700 to-gray-800',

        // Plains gradients - simplified
        'plains': 'from-yellow-800 via-amber-700 to-yellow-800',
        'savanna': 'from-yellow-700 via-orange-700 to-yellow-700',
        'scrubland': 'from-yellow-700 via-green-700 to-yellow-700',
        'sauropodgrounds': 'from-orange-800 via-red-700 to-orange-800',

        // Water gradients
        'river': 'from-blue-900 via-blue-800 to-blue-900',
        'dryriverbed': 'from-gray-700 via-brown-600 to-gray-700',
        'riverbank': 'from-blue-800 via-amber-800 to-blue-800',
        'marsh': 'from-green-900 via-blue-800 to-green-900',
        'waterhole': 'from-blue-800 via-cyan-800 to-blue-800',
        'lake': 'from-blue-800 via-cyan-700 to-blue-800',
        'beach': 'from-yellow-600 via-blue-700 to-yellow-600',

        // Mountain gradients
        'hills': 'from-green-700 via-lime-600 to-green-700',
        'rocky': 'from-stone-800 via-gray-700 to-stone-800',
        'mountains': 'from-gray-800 via-slate-700 to-gray-800',

        // Desert gradients - simplified
        'desert': 'from-orange-900 via-yellow-800 to-orange-900',
        'badlands': 'from-red-800 via-orange-700 to-red-800',
        'mesa': 'from-orange-800 via-red-700 to-orange-800',

        // Volcanic gradients
        'volcanic': 'from-red-900 via-black to-red-900',
        'lavafield': 'from-red-900 via-orange-600 to-red-900',

        // Special
        'nest': 'from-amber-900 via-orange-800 to-amber-900'
    };

    const nightGradients = {
        // Simplified night gradients
        'denseforest': 'from-black via-green-900 to-black',
        'forest': 'from-gray-900 via-green-900 to-gray-900',
        'openwoods': 'from-gray-800 via-green-900 to-gray-800',
        'galleryforest': 'from-gray-900 via-blue-900 to-gray-900',
        'deadforest': 'from-black via-gray-900 to-black',

        'plains': 'from-gray-900 via-purple-900 to-gray-900',
        'savanna': 'from-gray-900 via-orange-900 to-gray-900',
        'scrubland': 'from-gray-900 via-green-900 to-gray-900',
        'sauropodgrounds': 'from-gray-900 via-red-900 to-gray-900',

        'river': 'from-black via-blue-900 to-black',
        'dryriverbed': 'from-black via-gray-800 to-black',
        'riverbank': 'from-black via-blue-900 to-black',
        'marsh': 'from-black via-green-900 to-black',
        'waterhole': 'from-black via-blue-900 to-black',
        'lake': 'from-black via-blue-900 to-black',
        'beach': 'from-gray-900 via-blue-900 to-gray-900',

        'hills': 'from-black via-green-900 to-black',
        'rocky': 'from-black via-gray-900 to-black',
        'mountains': 'from-black via-gray-900 to-black',

        'desert': 'from-gray-900 via-purple-900 to-gray-900',
        'badlands': 'from-gray-900 via-red-900 to-gray-900',
        'mesa': 'from-gray-900 via-red-900 to-gray-900',

        'volcanic': 'from-red-900 via-black to-red-900',
        'lavafield': 'from-red-900 via-red-800 to-red-900',

        'nest': 'from-gray-900 via-purple-900 to-gray-900'
    };

    return timeInfo.isNight ?
        (nightGradients[currentTerrain] || 'from-gray-900 via-purple-900 to-gray-900') :
        (baseGradients[currentTerrain] || 'from-green-900 via-green-800 to-green-900');
};