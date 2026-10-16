// ==================== TERRAIN SYSTEM ====================
const createTerrain = (name, emoji, color, config = {}) => ({
    name,
    emoji,
    color,
    visibility: config.visibility || 2,
    blocksLOS: config.blocksLOS || false,
    passable: config.passable !== false,
    isWater: config.isWater || false,
    category: config.category || 'terrain',
    description: config.description || name,
    dangerLevel: config.dangerLevel || 0,
    energyCost: config.energyCost || 6,
    fitnessRisk: config.fitnessRisk || 0,
    minWeight: config.minWeight || 0,
});

export const TERRAIN_TYPES = {
    // WATER
    sea: createTerrain("Sundance Sea", "🌊", "#1d4f8c", {
        passable: false, isWater: true, category: 'water', visibility: 3,
        description: "The shallow Sundance Sea - far too deep to wade"
    }),
    river: createTerrain("River", "🌊", "#2563eb", {
        isWater: true, category: 'water', description: "Deep, fast river - hatchlings are swept away, juveniles can wade",
        dangerLevel: 2, energyCost: 12, fitnessRisk: 0.3, minWeight: 12
    }),
    stream: createTerrain("Stream", "💧", "#38bdf8", {
        isWater: true, category: 'water', description: "Shallow stream - safe to splash across",
        energyCost: 8
    }),
    dryriverbed: createTerrain("Dry Riverbed", "🪨", "#a8a29e", {
        category: 'desert', description: "Cracked bed of a seasonal river", energyCost: 8
    }),
    riverbank: createTerrain("Riverbank", "🏖️", "#92400e", {
        category: 'water', description: "Muddy riverbank - crocodiles lurk here",
        dangerLevel: 1, energyCost: 8
    }),
    floodplain: createTerrain("Floodplain", "🌱", "#84cc16", {
        category: 'plains', description: "Lush green flats renewed by every flood", energyCost: 6
    }),
    marsh: createTerrain("Marsh", "🌿", "#365314", {
        visibility: 1, category: 'water', description: "Treacherous horsetail marshland", energyCost: 10
    }),
    waterhole: createTerrain("Waterhole", "💧", "#0369a1", {
        description: "Life-giving waterhole - everything comes to drink", dangerLevel: 1, energyCost: 6
    }),
    lake: createTerrain("Lake", "🏞️", "#0ea5e9", {
        isWater: true, category: 'water', description: "Shallow lake shallows", energyCost: 8, visibility: 3
    }),
    beach: createTerrain("Beach", "🏖️", "#fbbf24", {
        description: "Sandy shore of the Sundance Sea", energyCost: 7, visibility: 3
    }),

    // FORESTS
    denseforest: createTerrain("Dense Forest", "🌲", "#166534", {
        visibility: 1, blocksLOS: true, category: "forest",
        description: "Impenetrable conifer forest", energyCost: 12, fitnessRisk: 0.08
    }),
    oldgrowth: createTerrain("Old-Growth Araucarias", "🌳", "#14532d", {
        visibility: 1, blocksLOS: true, category: "forest",
        description: "Towering ancient monkey-puzzle trees", energyCost: 11
    }),
    jungle: createTerrain("Fern Jungle", "🌴", "#15803d", {
        visibility: 1, blocksLOS: true, category: "forest",
        description: "Steamy thicket of tree ferns and cycads", energyCost: 13, fitnessRisk: 0.06
    }),
    forest: createTerrain("Forest", "🌲", "#16a34a", {
        visibility: 1, category: "forest", description: "Conifer forest", energyCost: 8
    }),
    youngforest: createTerrain("Young Forest", "🌲", "#22c55e", {
        visibility: 1, category: "forest", description: "Regrowing stand of young conifers", energyCost: 8
    }),
    openwoods: createTerrain("Open Woods", "🌿", "#65a30d", {
        visibility: 2, category: "forest", description: "Sparse woodland", energyCost: 7
    }),
    ginkgogrove: createTerrain("Ginkgo Grove", "🍃", "#4d7c0f", {
        visibility: 2, category: "forest", description: "Shady grove of broad-leaved ginkgos", energyCost: 7
    }),
    forestedge: createTerrain("Forest Edge", "🌲", "#5b8c2a", {
        visibility: 2, category: "forest", description: "Where the forest gives way to fern meadows", energyCost: 7
    }),
    galleryforest: createTerrain("Gallery Forest", "🌳", "#166534", {
        visibility: 1, category: "forest", description: "Forest hugging the riverbanks", energyCost: 9
    }),
    deadforest: createTerrain("Dead Forest", "🪵", "#78716c", {
        visibility: 2, category: "forest", description: "Trees killed by volcanic ash", energyCost: 8
    }),
    deadfall: createTerrain("Deadfall", "🪵", "#854d0e", {
        visibility: 1, category: "forest", description: "Storm-felled logs - hiding place for small things",
        energyCost: 10, fitnessRisk: 0.05
    }),

    // OPEN GROUND
    plains: createTerrain("Plains", "🌾", "#ca8a04", {
        category: "plains", description: "Open low ground-cover", energyCost: 6
    }),
    fernprairie: createTerrain("Fern Prairie", "🌿", "#a3e635", {
        category: "plains", description: "Rolling sea of ferns - the Morrison's 'grassland'", energyCost: 6
    }),
    katydidmeadow: createTerrain("Katydid Meadow", "🦗", "#4ade80", {
        category: "plains", description: "Cycad meadow ringing with singing katydids", energyCost: 6
    }),
    fernsavanna: createTerrain("Fern Savanna", "🌾", "#eab308", {
        category: "plains", description: "Sun-baked golden ferns", energyCost: 6
    }),
    savanna: createTerrain("Savanna", "🌾", "#eab308", {
        category: "plains", description: "Dry open land dotted with umbrella conifers", energyCost: 6
    }),
    steppe: createTerrain("Steppe", "🌾", "#bef264", {
        category: "plains", description: "Windswept low scrub", energyCost: 6, visibility: 3
    }),
    scrubland: createTerrain("Scrubland", "🌿", "#65a30d", {
        category: "plains", description: "Low shrub terrain", energyCost: 7
    }),
    termitemounds: createTerrain("Termite Mounds", "🐜", "#c2410c", {
        category: "plains", description: "Red-earth termite towers buzzing with insects", energyCost: 7
    }),
    sauropodgrounds: createTerrain("Migration Route", "🦕", "#a16207", {
        category: "plains", description: "Trampled sauropod migration path",
        energyCost: 6, dangerLevel: 4
    }),

    // HIGH GROUND
    mountains: createTerrain("Mountains", "⛰️", "#6b7280", {
        passable: false, blocksLOS: true, category: "mountain", description: "Impassable peaks of the Sevier highlands"
    }),
    volcanic: createTerrain("Volcanic Peak", "🌋", "#7c2d12", {
        passable: false, blocksLOS: true, category: "volcanic",
        description: "Active volcano", dangerLevel: 3
    }),
    hills: createTerrain("Hills", "🏔️", "#4ade80", {
        category: "mountain", description: "Rolling hills", energyCost: 10, visibility: 3
    }),
    rocky: createTerrain("Rocky Terrain", "🪨", "#78716c", {
        category: "mountain", description: "Broken rocky ground", energyCost: 9, fitnessRisk: 0.1
    }),
    boulderfield: createTerrain("Boulder Field", "🪨", "#94a3b8", {
        category: "mountain", description: "Jumble of lichen-covered boulders", energyCost: 10, fitnessRisk: 0.08, visibility: 2
    }),

    // DRY LANDS
    desert: createTerrain("Desert", "🏜️", "#d97706", {
        category: "desert", description: "Arid dunes", energyCost: 12, dangerLevel: 1
    }),
    badlands: createTerrain("Badlands", "🏔️", "#c2410c", {
        category: "desert", description: "Eroded striped wasteland", energyCost: 11
    }),
    mesa: createTerrain("Mesa", "🗻", "#ea580c", {
        blocksLOS: true, category: "desert", description: "Flat-topped plateau", energyCost: 12, visibility: 3
    }),
    quicksand: createTerrain("Quicksand", "⚠️", "#f59e0b", {
        category: "desert", description: "Dangerous quicksand - instant death!",
        energyCost: 15, fitnessRisk: 1.0, passable: true, dangerLevel: 5
    }),

    // VOLCANIC
    lavafield: createTerrain("Lava Field", "🔥", "#991b1b", {
        category: "volcanic", description: "Scorching cooled lava with glowing cracks",
        energyCost: 10, fitnessRisk: 0.3, dangerLevel: 2
    }),

    // SPECIAL
    nest: createTerrain("Nesting Site", "🥚", "#a16207", {
        category: "special", description: "Dinosaur nesting ground", energyCost: 6, dangerLevel: 1
    })
};
