// ==================== TERRAIN SYSTEM ====================
const createTerrain = (name, emoji, color, config = {}) => ({
    name,
    emoji,
    color,
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
        isLinear: true, isWater: true, description: "Flowing river - wade carefully",
        dangerLevel: 2, energyCost: 12, fitnessRisk: 0.3, minWeight: 500
    }),
    dryriverbed: createTerrain("Dry Riverbed", "🪨", "#a8a29e", {
        isLinear: true, description: "Ancient riverbed", energyCost: 8
    }),
    riverbank: createTerrain("Riverbank", "🏖️", "#92400e", {
        description: "Muddy riverbank - crocodiles lurk here",
        dangerLevel: 1, energyCost: 8
    }),
    marsh: createTerrain("Marsh", "🌿", "#365314", {
        visibility: 1, description: "Treacherous marshland", energyCost: 10
    }),
    waterhole: createTerrain("Waterhole", "💧", "#0369a1", {
        description: "Life-giving waterhole", dangerLevel: 1, energyCost: 6
    }),

    // FOREST TYPES - Much more variety
    forest: createTerrain("Forest", "🌲", "#16a34a", {
        visibility: 1, category: "forest", description: "Dense forest", energyCost: 8
    }),
    oldgrowthforest: createTerrain("Ancient Forest", "🌳", "#15803d", {
        visibility: 1, blocksLOS: true, category: "forest", description: "Ancient old-growth forest", energyCost: 10
    }),
    denseforest: createTerrain("Dense Forest", "🌴", "#166534", {
        visibility: 1, blocksLOS: true, category: "forest", description: "Impenetrable forest", energyCost: 12
    }),
    youngforest: createTerrain("Young Forest", "🌱", "#22c55e", {
        visibility: 2, category: "forest", description: "New growth forest", energyCost: 7
    }),
    forestedge: createTerrain("Forest Edge", "🌾", "#4d7c0f", {
        visibility: 2, category: "forest", description: "Edge of the forest", energyCost: 6
    }),
    openwoods: createTerrain("Open Woods", "🌿", "#65a30d", {
        visibility: 2, category: "forest", description: "Sparse woodland", energyCost: 7
    }),
    galleryforest: createTerrain("Gallery Forest", "🌳", "#166534", {
        visibility: 1, category: "forest", description: "Forest along waterways", energyCost: 9
    }),
    deadforest: createTerrain("Dead Forest", "🪵", "#78716c", {
        visibility: 2, category: "forest", description: "Burnt or dead forest", energyCost: 8
    }),

    // PLAINS TYPES - Much more variety  
    plains: createTerrain("Plains", "🌾", "#ca8a04", {
        category: "plains", description: "Open grasslands", energyCost: 6
    }),
    grasslands: createTerrain("Grasslands", "🌱", "#84cc16", {
        category: "plains", description: "Rich grasslands", energyCost: 5
    }),
    meadow: createTerrain("Meadow", "🌸", "#a3e635", {
        category: "plains", description: "Flower-filled meadow", energyCost: 5
    }),
    scrubland: createTerrain("Scrubland", "🌿", "#65a30d", {
        category: "plains", description: "Low shrub terrain", energyCost: 7
    }),
    savanna: createTerrain("Savanna", "🌾", "#eab308", {
        category: "plains", description: "Tree-dotted grassland", energyCost: 6
    }),
    steppe: createTerrain("Steppe", "🏜️", "#f59e0b", {
        category: "plains", description: "Dry grassland", energyCost: 8
    }),
    sauropodgrounds: createTerrain("Migration Route", "🦕", "#a16207", {
        category: "plains", description: "Sauropod migration path", energyCost: 6, dangerLevel: 3
    }),

    // MOUNTAIN TYPES 
    mountains: createTerrain("Mountains", "⛰️", "#6b7280", {
        passable: false, blocksLOS: true, category: "mountain", description: "Impassable peaks"
    }),
    volcanic: createTerrain("Volcanic Peak", "🌋", "#7c2d12", {
        passable: false, blocksLOS: true, category: "mountain", description: "Active volcano"
    }),
    hills: createTerrain("Hills", "🏔️", "#4ade80", {
        category: "mountain", description: "Rolling hills", energyCost: 10, visibility: 3
    }),
    rocky: createTerrain("Rocky Terrain", "🪨", "#78716c", {
        category: "mountain", description: "Broken rocky ground", energyCost: 9, fitnessRisk: 0.05
    }),

    // DESERT TYPES
    desert: createTerrain("Desert", "🏜️", "#d97706", {
        category: "desert", description: "Arid wasteland", energyCost: 12, dangerLevel: 1
    }),
    badlands: createTerrain("Badlands", "🏔️", "#c2410c", {
        category: "desert", description: "Eroded wasteland", energyCost: 11
    }),
    mesa: createTerrain("Mesa", "🗻", "#ea580c", {
        blocksLOS: true, category: "desert", description: "Flat-topped plateau", energyCost: 12
    }),
    sand: createTerrain("Sand Dunes", "🟡", "#eab308", {
        category: "desert", description: "Shifting sand dunes", energyCost: 8
    }),
    quicksand: createTerrain("Quicksand", "⚠️", "#f59e0b", {
        category: "desert", description: "Dangerous quicksand", energyCost: 15, fitnessRisk: 1.0, passable: false
    }),
    lavafield: createTerrain("Lava Field", "🔥", "#991b1b", {
        passable: false, category: "volcanic", description: "Molten lava - impassable"
    }),

    // SPECIAL AREAS
    nest: createTerrain("Nesting Site", "🥚", "#a16207", {
        category: "special", description: "Dinosaur nesting ground", energyCost: 6, dangerLevel: 1
    })
};

export const getBackgroundGradient = (currentTerrain, timeInfo) => {
    const baseGradients = {
        'forest': 'from-green-900 via-green-800 to-green-900',
        'oldgrowthforest': 'from-green-900 via-green-900 to-gray-900',
        'denseforest': 'from-green-900 via-gray-800 to-green-900',
        'youngforest': 'from-green-700 via-green-600 to-green-700',
        'forestedge': 'from-green-800 via-yellow-700 to-green-800',
        'openwoods': 'from-green-700 via-lime-700 to-green-700',
        'galleryforest': 'from-green-800 via-blue-700 to-green-800',
        'deadforest': 'from-gray-800 via-brown-700 to-gray-800',
        'plains': 'from-yellow-800 via-amber-700 to-yellow-800',
        'grasslands': 'from-green-700 via-lime-800 to-green-700',
        'meadow': 'from-green-600 via-pink-700 to-green-600',
        'scrubland': 'from-yellow-700 via-green-700 to-yellow-700',
        'savanna': 'from-yellow-700 via-orange-700 to-yellow-700',
        'steppe': 'from-orange-800 via-yellow-700 to-orange-800',
        'sauropodgrounds': 'from-orange-800 via-red-700 to-orange-800',
        'river': 'from-blue-900 via-blue-800 to-blue-900',
        'dryriverbed': 'from-gray-700 via-brown-600 to-gray-700',
        'riverbank': 'from-blue-800 via-amber-800 to-blue-800',
        'marsh': 'from-green-900 via-blue-800 to-green-900',
        'waterhole': 'from-blue-800 via-cyan-800 to-blue-800',
        'hills': 'from-green-700 via-lime-600 to-green-700',
        'rocky': 'from-stone-800 via-gray-700 to-stone-800',
        'desert': 'from-orange-900 via-yellow-800 to-orange-900',
        'badlands': 'from-red-800 via-orange-700 to-red-800',
        'mesa': 'from-orange-800 via-red-700 to-orange-800',
        'sand': 'from-yellow-800 via-orange-700 to-yellow-800',
        'nest': 'from-amber-900 via-orange-800 to-amber-900'
    };

    const nightGradients = {
        'forest': 'from-gray-900 via-green-900 to-gray-900',
        'oldgrowthforest': 'from-black via-green-900 to-black',
        'denseforest': 'from-black via-gray-900 to-black',
        'youngforest': 'from-gray-900 via-green-800 to-gray-900',
        'forestedge': 'from-gray-900 via-green-900 to-gray-900',
        'openwoods': 'from-gray-800 via-green-900 to-gray-800',
        'galleryforest': 'from-gray-900 via-blue-900 to-gray-900',
        'deadforest': 'from-black via-gray-900 to-black',
        'plains': 'from-gray-900 via-purple-900 to-gray-900',
        'grasslands': 'from-gray-900 via-purple-900 to-gray-900',
        'meadow': 'from-gray-900 via-purple-800 to-gray-900',
        'scrubland': 'from-gray-900 via-green-900 to-gray-900',
        'savanna': 'from-gray-900 via-orange-900 to-gray-900',
        'steppe': 'from-gray-900 via-purple-900 to-gray-900',
        'sauropodgrounds': 'from-gray-900 via-red-900 to-gray-900',
        'river': 'from-black via-blue-900 to-black',
        'dryriverbed': 'from-black via-gray-800 to-black',
        'riverbank': 'from-black via-blue-900 to-black',
        'marsh': 'from-black via-green-900 to-black',
        'waterhole': 'from-black via-blue-900 to-black',
        'hills': 'from-black via-green-900 to-black',
        'rocky': 'from-black via-gray-900 to-black',
        'desert': 'from-gray-900 via-purple-900 to-gray-900',
        'badlands': 'from-gray-900 via-red-900 to-gray-900',
        'mesa': 'from-gray-900 via-red-900 to-gray-900',
        'sand': 'from-gray-900 via-purple-900 to-gray-900',
        'nest': 'from-gray-900 via-purple-900 to-gray-900'
    };

    return timeInfo.isNight ?
        (nightGradients[currentTerrain] || 'from-gray-900 via-purple-900 to-gray-900') :
        (baseGradients[currentTerrain] || 'from-green-900 via-green-800 to-green-900');
};