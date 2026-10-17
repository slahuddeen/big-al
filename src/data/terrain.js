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

// The Kem Kem river system, North Africa, about 95 million years ago
export const TERRAIN_TYPES = {
    // ---- WATER ----
    sea: createTerrain("Tethys Sea", "", "#1d6f8c", {
        passable: false, isWater: true, category: 'water', visibility: 3,
        description: "The open Tethys: too rough and salty even for a spinosaur"
    }),
    river: createTerrain("Great River", "", "#2563eb", {
        isWater: true, category: 'water', description: "Deep main channel. The current sweeps tiny hatchlings away; once you are bigger it is your home",
        dangerLevel: 2, energyCost: 10, fitnessRisk: 0.05, minWeight: 4
    }),
    stream: createTerrain("Braided Shallows", "", "#38bdf8", {
        isWater: true, category: 'water', description: "Shallow channels braiding between sandbars, full of small fish", energyCost: 7
    }),
    lake: createTerrain("Oxbow Lake", "", "#0ea5e9", {
        isWater: true, category: 'water', description: "A loop of old river cut off by a flood: still, deep and full of fish", energyCost: 8, visibility: 3
    }),
    waterhole: createTerrain("Pool", "", "#0369a1", {
        description: "A pool left by the last flood. In the dry season it shrinks and traps its fish", dangerLevel: 1, energyCost: 6
    }),
    marsh: createTerrain("Fern Swamp", "", "#365314", {
        visibility: 1, category: 'water', description: "Warm swamp of ferns and horsetails, alive with frogs", energyCost: 9
    }),
    mangrove: createTerrain("Mangrove Delta", "", "#2f6b4a", {
        visibility: 1, category: 'water', description: "Tidal channels among stilt-rooted trees where the rivers meet the sea", energyCost: 9
    }),
    beach: createTerrain("Tidal Flats", "", "#c9b27a", {
        description: "Glistening mud the tide leaves behind: stranded fish and stalking pterosaurs", energyCost: 7, visibility: 3
    }),
    riverbank: createTerrain("Sandbar", "", "#d7b26a", {
        category: 'water', description: "Sandbars and banks where crocodiles bask and turtles lay their eggs", dangerLevel: 1, energyCost: 7
    }),
    dryriverbed: createTerrain("Dry Channel", "", "#a8a29e", {
        category: 'desert', description: "An old channel the river has abandoned", energyCost: 8
    }),
    floodplain: createTerrain("Floodplain", "", "#84cc16", {
        category: 'plains', description: "Open mud and fern flats that the river covers every wet season", energyCost: 7
    }),

    // ---- WOODS ----
    galleryforest: createTerrain("Conifer Gallery", "", "#166534", {
        visibility: 1, category: 'forest', description: "A strip of tall conifers along the banks", energyCost: 9
    }),
    forest: createTerrain("Conifer Woods", "", "#16a34a", {
        visibility: 1, category: 'forest', description: "Dry conifer woods away from the water", energyCost: 9
    }),
    denseforest: createTerrain("Fern Brake", "", "#166534", {
        visibility: 1, blocksLOS: true, category: 'forest', description: "Head-high thicket of Weichselia ferns", energyCost: 11, fitnessRisk: 0.04
    }),
    jungle: createTerrain("Tree-Fern Thicket", "", "#15803d", {
        visibility: 1, blocksLOS: true, category: 'forest', description: "Steamy thicket of tree ferns and cycads", energyCost: 12, fitnessRisk: 0.05
    }),
    openwoods: createTerrain("Open Woods", "", "#65a30d", {
        visibility: 2, category: 'forest', description: "Scattered conifers and early flowering shrubs", energyCost: 7
    }),
    deadfall: createTerrain("Log Jam", "", "#854d0e", {
        visibility: 1, category: 'forest', description: "Trees piled up by the last great flood: hiding place for small things", energyCost: 10, fitnessRisk: 0.05
    }),

    // ---- OPEN GROUND ----
    plains: createTerrain("Fern Flats", "", "#ca8a04", {
        category: 'plains', description: "Open low fern cover", energyCost: 7
    }),
    fernprairie: createTerrain("Fern Meadow", "", "#a3e635", {
        category: 'plains', description: "Rolling green ferns where iguanodonts graze", energyCost: 7
    }),
    savanna: createTerrain("Dry Savanna", "", "#eab308", {
        category: 'plains', description: "Sun-baked open land dotted with umbrella conifers", energyCost: 7
    }),
    scrubland: createTerrain("Scrub", "", "#65a30d", {
        category: 'plains', description: "Low thorny shrubs", energyCost: 8
    }),
    sauropodgrounds: createTerrain("Titan Trail", "", "#a16207", {
        category: 'plains', description: "A path trampled by titanosaur herds on the move",
        energyCost: 7, dangerLevel: 4
    }),

    // ---- HIGH AND DRY ----
    mountains: createTerrain("Highlands", "", "#6b7280", {
        passable: false, blocksLOS: true, category: 'mountain', description: "Impassable highlands at the edge of the basin"
    }),
    hills: createTerrain("Red Hills", "", "#c2410c", {
        category: 'mountain', description: "Rolling red hills", energyCost: 11, visibility: 3
    }),
    rocky: createTerrain("Hamada", "", "#78716c", {
        category: 'mountain', description: "Stony desert plateau", energyCost: 10, fitnessRisk: 0.08
    }),
    boulderfield: createTerrain("Boulder Field", "", "#94a3b8", {
        category: 'mountain', description: "Jumble of sun-cracked boulders", energyCost: 11, fitnessRisk: 0.06, visibility: 2
    }),
    desert: createTerrain("Dunes", "", "#d97706", {
        category: 'desert', description: "Red sand dunes beyond the reach of the river", energyCost: 13, dangerLevel: 1
    }),
    badlands: createTerrain("Red Badlands", "", "#c2410c", {
        category: 'desert', description: "Eroded red and cream banded slopes", energyCost: 12
    }),
    mesa: createTerrain("Mesa", "", "#ea580c", {
        blocksLOS: true, category: 'desert', description: "Flat-topped sandstone butte", energyCost: 13, visibility: 3
    }),
    quicksand: createTerrain("Sinking Mud", "", "#f59e0b", {
        category: 'desert', description: "Treacherous sucking mud - instant death!",
        energyCost: 15, fitnessRisk: 1.0, passable: true, dangerLevel: 5
    }),

    // ---- SPECIAL ----
    nest: createTerrain("Nesting Sandbank", "", "#a16207", {
        category: 'special', description: "Warm sand above the flood line where spinosaurs lay their eggs", energyCost: 6, dangerLevel: 1
    })
};
