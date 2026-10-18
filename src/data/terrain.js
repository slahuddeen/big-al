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

// The Jehol lakes of Liaoning, north-east China, about 125 million years ago:
// forest and lakes in valleys among volcanoes, with cold winters
export const TERRAIN_TYPES = {
    // ---- WATER ----
    lake: createTerrain("Volcanic Lake", "", "#6f9aa0", {
        isWater: true, category: 'water', visibility: 3, energyCost: 9, minWeight: 25,
        description: "A deep, still lake in a volcanic basin. Its muddy bottom has no oxygen, which is why the fossils here are so perfect"
    }),
    river: createTerrain("River", "", "#5e8ea0", {
        isWater: true, category: 'water', description: "A cold, fast river between the lakes. Too strong for a small animal",
        dangerLevel: 2, energyCost: 10, fitnessRisk: 0.04, minWeight: 25
    }),
    stream: createTerrain("Stream", "", "#7aa8b0", {
        isWater: true, category: 'water', description: "A clear stream over pebbles, full of mayfly larvae and little fish", energyCost: 7
    }),
    waterhole: createTerrain("Pond", "", "#6a9a98", {
        description: "A small pond in the forest. It freezes over in deep winter", dangerLevel: 1, energyCost: 6
    }),
    marsh: createTerrain("Horsetail Marsh", "", "#5d7a58", {
        visibility: 1, category: 'water', description: "Shallow water thick with horsetails and reeds, alive with frogs", energyCost: 9
    }),
    hotspring: createTerrain("Hot Springs", "", "#8ab8b0", {
        category: 'water', description: "Steaming pools ringed with white mineral crust. Warm, even in the snow; the water tastes of sulphur", energyCost: 7
    }),
    riverbank: createTerrain("Lakeshore", "", "#b8a682", {
        category: 'water', description: "Mud and shingle at the water's edge, printed with the tracks of everything that comes to drink", dangerLevel: 1, energyCost: 7
    }),

    // ---- OPEN GROUND ----
    meadow: createTerrain("Flower Meadow", "", "#a8b06a", {
        category: 'plains', description: "Ferns and some of the world's first flowering plants, small and weedy", energyCost: 7
    }),
    fernprairie: createTerrain("Fern Glade", "", "#88a464", {
        category: 'plains', description: "An open glade of knee-high ferns where Psittacosaurus graze", energyCost: 7
    }),
    floodplain: createTerrain("Wet Meadow", "", "#90a46c", {
        category: 'plains', description: "Low, soggy ground between the lakes, with puddles and horsetails", energyCost: 8
    }),
    scrubland: createTerrain("Cycad Scrub", "", "#9a9a62", {
        category: 'plains', description: "Stubby cycads and bushy seed-plants on dry slopes", energyCost: 8
    }),
    sauropodgrounds: createTerrain("Titan Trail", "", "#a89a6a", {
        category: 'plains', description: "A path pounded flat by the rare sauropod herds on the move", energyCost: 7, dangerLevel: 3
    }),
    ashflat: createTerrain("Ash Flats", "", "#b8b4a8", {
        category: 'desert', description: "Grey ash from the last eruption, barely grown over. Thirsty, open ground", energyCost: 8, visibility: 3
    }),

    // ---- WOODS ----
    forest: createTerrain("Conifer Forest", "", "#4f7a5c", {
        visibility: 1, category: 'forest', description: "Tall conifers related to pines and monkey puzzles", energyCost: 9
    }),
    oldgrowth: createTerrain("Old Forest", "", "#3e6650", {
        visibility: 1, blocksLOS: true, category: 'forest', description: "Huge old conifers and deep shade. Gliders and climbers live in the canopy", energyCost: 10
    }),
    ginkgogrove: createTerrain("Ginkgo Grove", "", "#8aa45a", {
        visibility: 2, category: 'forest', description: "Fan-leaved ginkgo trees. Their leaves turn gold before winter", energyCost: 8
    }),
    denseforest: createTerrain("Fern Thicket", "", "#4a7050", {
        visibility: 1, blocksLOS: true, category: 'forest', description: "A head-high tangle of ferns and tree ferns", energyCost: 11, fitnessRisk: 0.03
    }),
    galleryforest: createTerrain("Lakeside Forest", "", "#56806a", {
        visibility: 1, category: 'forest', description: "Trees leaning over the water at the lake's edge", energyCost: 9
    }),
    openwoods: createTerrain("Open Woods", "", "#8a9c62", {
        visibility: 2, category: 'forest', description: "Scattered conifers, ginkgos and cycads", energyCost: 7
    }),
    deadforest: createTerrain("Ash-Killed Forest", "", "#8a8478", {
        visibility: 2, category: 'forest', description: "Grey trunks still standing where an ash fall killed the forest", energyCost: 8
    }),
    deadfall: createTerrain("Windfall", "", "#7a7050", {
        visibility: 1, category: 'forest', description: "Fallen trunks piled by storms: hiding places for small things", energyCost: 10, fitnessRisk: 0.04
    }),

    // ---- HIGH GROUND ----
    hills: createTerrain("Wooded Hills", "", "#7a9068", {
        category: 'mountain', description: "Rolling hills dark with conifers", energyCost: 10, visibility: 3
    }),
    crags: createTerrain("Volcanic Crags", "", "#7a7a80", {
        category: 'mountain', description: "Steep pillars of old volcanic rock, misty and crowned with pines. You can see a long way from here", energyCost: 12, visibility: 3, fitnessRisk: 0.05
    }),
    basalt: createTerrain("Basalt Columns", "", "#5a5c60", {
        category: 'mountain', description: "Six-sided columns of cooled lava, like giant steps", energyCost: 11, fitnessRisk: 0.05
    }),
    boulderfield: createTerrain("Tuff Boulders", "", "#9a948a", {
        category: 'mountain', description: "Blocks of hardened ash, tumbled from the hillsides", energyCost: 11, fitnessRisk: 0.04
    }),
    lavafield: createTerrain("Lava Field", "", "#3e3634", {
        category: 'desert', description: "Black, broken lava, still warm in places", energyCost: 12, fitnessRisk: 0.08, dangerLevel: 2
    }),
    volcanic: createTerrain("Volcano", "", "#4a3a36", {
        passable: false, blocksLOS: true, category: 'mountain', description: "An active volcano. When it erupts, ash falls across the whole basin"
    }),
    mountains: createTerrain("Mountains", "", "#6a6e74", {
        passable: false, blocksLOS: true, category: 'mountain', description: "Impassable mountains at the edge of the basin"
    }),
    mudpot: createTerrain("Boiling Mud", "", "#9a8a72", {
        category: 'desert', description: "Bubbling volcanic mud - deadly!",
        energyCost: 15, fitnessRisk: 1.0, passable: true, dangerLevel: 5
    }),

    // ---- SPECIAL ----
    nest: createTerrain("Nest Mound", "", "#9a8462", {
        category: 'special', description: "A mound of earth and rotting plants that a Yutyrannus scraped together to keep its eggs warm", energyCost: 6, dangerLevel: 1
    })
};
