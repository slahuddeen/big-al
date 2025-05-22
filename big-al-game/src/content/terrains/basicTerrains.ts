import { TerrainConfig } from '../../types/content';
import { registerTerrain } from '../../utils/contentRegistry';


// Replace your basicTerrains array in src/content/terrains/basicTerrains.ts with this:

export const basicTerrains: TerrainConfig[] = [
    {
        id: 'plains',
        name: 'Open Plains',
        description: 'Vast open grasslands with scattered vegetation',
        color: 'bg-yellow-200',
        imagePath: '/assets/tiles/plains.png',
        icon: '🌾',
        movementCost: 1,
        huntingModifier: 0.8,
        ambushValue: 0.2,
        waterSource: false,
        rarity: 0.35,
        clusterSize: 6,
        fact: 'Plains were the highways of the Jurassic, where herds migrated seasonally.'
    },

    {
        id: 'grassland',
        name: 'Grassland',
        description: 'Rolling hills covered in tall grass and wildflowers',
        color: 'bg-green-300',
        imagePath: '/assets/tiles/grassland.png',
        icon: '🌱',
        movementCost: 1.1,
        huntingModifier: 1.0,
        ambushValue: 0.6,
        waterSource: false,
        rarity: 0.25,
        clusterSize: 5,
        fact: 'Grasslands provided excellent grazing for herbivorous dinosaurs.'
    },

    {
        id: 'forest',
        name: 'Forest',
        description: 'Temperate forest with mixed conifers and ferns',
        color: 'bg-green-600',
        imagePath: '/assets/tiles/forest.png',
        icon: '🌲',
        movementCost: 1.4,
        huntingModifier: 1.2,
        ambushValue: 0.8,
        waterSource: false,
        rarity: 0.2,
        clusterSize: 4,
        fact: 'Jurassic forests were dominated by conifers, cycads, and tree ferns.'
    },

    {
        id: 'denseforest',
        name: 'Dense Forest',
        description: 'Thick, almost impenetrable woodland with towering trees',
        color: 'bg-green-800',
        imagePath: '/assets/tiles/denseforest.png',
        icon: '🏔️',
        movementCost: 2.0,
        huntingModifier: 1.4,
        ambushValue: 0.95,
        waterSource: false,
        rarity: 0.1,
        clusterSize: 3,
        adjacentTo: ['forest', 'woods'],
        fact: 'Dense forests provided perfect cover for ambush predators.'
    },

    {
        id: 'woods',
        name: 'Light Woods',
        description: 'Open woodland with scattered trees and clearings',
        color: 'bg-green-500',
        imagePath: '/assets/tiles/woods.png',
        icon: '🌳',
        movementCost: 1.2,
        huntingModifier: 1.1,
        ambushValue: 0.6,
        waterSource: false,
        rarity: 0.18,
        clusterSize: 4,
        fact: 'Light woods offered the perfect balance of cover and mobility.'
    },

    {
        id: 'jungle',
        name: 'Dense Jungle',
        description: 'Humid tropical jungle with thick undergrowth',
        color: 'bg-green-900',
        imagePath: '/assets/tiles/jungle.png',
        icon: '🌿',
        movementCost: 2.2,
        huntingModifier: 1.3,
        ambushValue: 0.9,
        waterSource: false,
        healthHazard: 0.02,
        rarity: 0.08,
        clusterSize: 3,
        adjacentTo: ['marsh', 'river'],
        fact: 'Jurassic jungles were filled with giant ferns and primitive flowering plants.'
    },

    {
        id: 'shrubland',
        name: 'Shrubland',
        description: 'Semi-arid landscape with hardy bushes and scattered rocks',
        color: 'bg-yellow-600',
        imagePath: '/assets/tiles/shrubland.png',
        icon: '🌵',
        movementCost: 1.3,
        huntingModifier: 0.9,
        ambushValue: 0.4,
        waterSource: false,
        rarity: 0.15,
        clusterSize: 4,
        fact: 'Shrublands were transition zones between forests and deserts.'
    },

    {
        id: 'lake',
        name: 'Lake',
        description: 'Deep freshwater lake teeming with aquatic life',
        color: 'bg-blue-500',
        imagePath: '/assets/tiles/Lake.png', // Note: capital L as in your filename
        icon: '🏞️',
        movementCost: 2.5,
        huntingModifier: 0.6,
        ambushValue: 0.3,
        waterSource: true,
        rarity: 0.08,
        clusterSize: 2,
        fact: 'Jurassic lakes were oases of life, attracting creatures from miles around.'
    },

    {
        id: 'river',
        name: 'River',
        description: 'Fast-flowing river cutting through the landscape',
        color: 'bg-blue-600',
        imagePath: '/assets/tiles/river.png',
        icon: '🌊',
        movementCost: 2.0,
        huntingModifier: 1.0,
        ambushValue: 0.5,
        waterSource: true,
        rarity: 0.12,
        clusterSize: 3,
        fact: 'Rivers were the lifelines of the Jurassic world, supporting diverse ecosystems.'
    },

    {
        id: 'marsh',
        name: 'Marsh',
        description: 'Waterlogged wetlands with reeds and muddy ground',
        color: 'bg-green-700',
        imagePath: '/assets/tiles/marsh.png',
        icon: '🪴',
        movementCost: 1.8,
        huntingModifier: 0.9,
        ambushValue: 0.7,
        waterSource: true,
        rarity: 0.1,
        clusterSize: 3,
        adjacentTo: ['river', 'lake'],
        fact: 'Marshes were home to early crocodilians and countless amphibians.'
    },

    {
        id: 'beach',
        name: 'Beach',
        description: 'Sandy coastal area where land meets ancient seas',
        color: 'bg-yellow-400',
        imagePath: '/assets/tiles/beach.png',
        icon: '🏖️',
        movementCost: 1.3,
        huntingModifier: 0.7,
        ambushValue: 0.2,
        waterSource: false,
        rarity: 0.06,
        clusterSize: 4,
        adjacentTo: ['lake'],
        fact: 'Jurassic beaches were nesting sites for marine reptiles and early sea turtles.'
    },

    {
        id: 'rocky',
        name: 'Rocky Terrain',
        description: 'Rugged rocky outcrops with sparse vegetation',
        color: 'bg-gray-500',
        imagePath: '/assets/tiles/rocky.png',
        icon: '🪨',
        movementCost: 1.6,
        huntingModifier: 0.7,
        ambushValue: 0.4,
        waterSource: false,
        rarity: 0.12,
        clusterSize: 3,
        fact: 'Rocky areas provided mineral deposits essential for dinosaur bone growth.'
    },

    {
        id: 'mountain',
        name: 'Mountain',
        description: 'Steep mountainous terrain with treacherous slopes',
        color: 'bg-gray-700',
        imagePath: '/assets/tiles/mountain.png',
        icon: '⛰️',
        movementCost: 2.5,
        huntingModifier: 0.5,
        ambushValue: 0.6,
        waterSource: false,
        healthHazard: 0.05,
        rarity: 0.08,
        clusterSize: 2,
        adjacentTo: ['rocky'],
        fact: 'Mountains formed as the supercontinent Pangaea began breaking apart.'
    },

    {
        id: 'mesa',
        name: 'Mesa',
        description: 'Flat-topped elevated plateau with steep sides',
        color: 'bg-orange-400',
        imagePath: '/assets/tiles/mesa.png',
        icon: '🏜️',
        movementCost: 1.8,
        huntingModifier: 0.8,
        ambushValue: 0.3,
        waterSource: false,
        rarity: 0.05,
        clusterSize: 2,
        adjacentTo: ['rocky', 'shrubland'],
        fact: 'Mesas provided elevated vantage points for spotting prey and predators.'
    },

    {
        id: 'volcanic',
        name: 'Volcanic Fields',
        description: 'Dangerous volcanic terrain with lava flows and toxic gases',
        color: 'bg-red-900',
        imagePath: '/assets/tiles/volcanic.png',
        icon: '🌋',
        movementCost: 2.5,
        huntingModifier: 0.4,
        ambushValue: 0.1,
        waterSource: false,
        healthHazard: 0.15,
        rarity: 0.03,
        clusterSize: 1,
        fact: 'Volcanic activity was common during the Jurassic, creating new landforms.'
    },

    {
        id: 'nest',
        name: 'Allosaurus Nest',
        description: 'Your birth nest, carefully constructed and defended',
        color: 'bg-amber-600',
        imagePath: '/assets/tiles/nest.png',
        icon: '🥚',
        movementCost: 1,
        huntingModifier: 0,
        ambushValue: 0,
        waterSource: false,
        rarity: 0,
        clusterSize: 1,
        fact: 'Allosaurus mothers fiercely guarded their nests from predators and scavengers.'
    }
];

// Register

basicTerrains.forEach(terrain => registerTerrain(terrain));

console.log(`🌍 Registered ${basicTerrains.length} basic terrains`);
