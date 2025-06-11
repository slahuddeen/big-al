// ==================== ENHANCED TERRAIN GENERATION ====================
import { HEX_DIRECTIONS, getHexNeighbors } from './hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

// Linear feature generation
export const generateRiver = (start, targetDirection, length) => {
    const river = [];
    let current = { ...start };
    let direction = targetDirection;

    for (let i = 0; i < length; i++) {
        river.push({ ...current, terrain: 'river' });

        // Rivers meander naturally
        if (Math.random() < 0.25) {
            direction = (direction + (Math.random() < 0.5 ? 1 : -1) + 6) % 6;
        }

        const nextStep = HEX_DIRECTIONS[direction];
        current.q += nextStep.q;
        current.r += nextStep.r;
    }

    return river;
};

export const generateDryRiverbed = (start, targetDirection, length) => {
    const riverbed = [];
    let current = { ...start };
    let direction = targetDirection;

    for (let i = 0; i < length; i++) {
        riverbed.push({ ...current, terrain: 'dryriverbed' });

        if (Math.random() < 0.3) {
            direction = (direction + (Math.random() < 0.5 ? 1 : -1) + 6) % 6;
        }

        const nextStep = HEX_DIRECTIONS[direction];
        current.q += nextStep.q;
        current.r += nextStep.r;
    }

    return riverbed;
};

export const generateMountainRange = (start, direction, length) => {
    const mountains = [];
    let current = { ...start };

    for (let i = 0; i < length; i++) {
        const terrainType = Math.random() < 0.8 ? 'mountains' : 'volcanic';
        mountains.push({ ...current, terrain: terrainType });

        if (Math.random() < 0.2) {
            const perpendicular = [(direction + 1) % 6, (direction + 5) % 6];
            direction = perpendicular[Math.floor(Math.random() * 2)];
        }

        const nextStep = HEX_DIRECTIONS[direction];
        current.q += nextStep.q;
        current.r += nextStep.r;
    }

    return mountains;
};

export const generateTerrainFeatures = (centerQ, centerR, radius) => {
    const features = [];

    // Generate mountain ranges (1-2)
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 8) + 4;
        features.push(...generateMountainRange(start, direction, length));
    }

    // Generate rivers (1-3)
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 12) + 6;
        features.push(...generateRiver(start, direction, length));
    }

    // Generate dry riverbeds (0-2)
    for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 10) + 4;
        features.push(...generateDryRiverbed(start, direction, length));
    }

    return features;
};

export const generateTerrain = (q, r, existingHexes, linearFeatures = []) => {
    // Check if this hex is part of pre-generated linear features
    const linearFeature = linearFeatures.find(f => f.q === q && f.r === r);
    if (linearFeature) {
        return linearFeature.terrain;
    }

    const neighbors = getHexNeighbors({ q, r });
    const existingNeighbors = neighbors
        .map(n => existingHexes.get(`${n.q},${n.r}`))
        .filter(Boolean);

    // Starting terrain if no neighbors - INCREASED PLAINS/FOREST FREQUENCY
    if (existingNeighbors.length === 0) {
        const rand = Math.random();
        if (rand < 0.4) return 'plains';
        if (rand < 0.7) return 'grasslands';
        if (rand < 0.85) return 'forest';
        return 'openwoods';
    }

    // Analyze neighbors
    const neighborTypes = existingNeighbors.map(h => h.terrain);
    const terrainCounts = {};
    neighborTypes.forEach(t => terrainCounts[t] = (terrainCounts[t] || 0) + 1);

    const mostCommon = Object.keys(terrainCounts).reduce((a, b) =>
        terrainCounts[a] > terrainCounts[b] ? a : b
    );

    // Advanced formation rules
    const forestCount = neighborTypes.filter(t => TERRAIN_TYPES[t].category === 'forest').length;
    if (forestCount >= 4) {
        const rand = Math.random();
        if (rand < 0.3) return 'denseforest';
        if (rand < 0.5) return 'oldgrowthforest';
    }

    // Forest edges where forest meets plains
    const hasForest = neighborTypes.some(t => TERRAIN_TYPES[t].category === 'forest');
    const hasPlains = neighborTypes.some(t => TERRAIN_TYPES[t].category === 'plains');
    if (hasForest && hasPlains && Math.random() < 0.4) {
        return 'forestedge';
    }

    // Rocky/hilly terrain near mountains
    const hasMountains = neighborTypes.some(t => TERRAIN_TYPES[t].category === 'mountain');
    if (hasMountains && Math.random() < 0.4) {
        return Math.random() < 0.6 ? 'rocky' : 'hills';
    }

    // Gallery forest near water
    const hasRiver = neighborTypes.includes('river');
    if (hasRiver && hasForest && Math.random() < 0.6) {
        return 'galleryforest';
    }

    // Riverbank near rivers
    if (neighborTypes.includes('river') && Math.random() < 0.25) {
        return 'riverbank';
    }

    // Terrain category continuation with variation
    const currentCategory = TERRAIN_TYPES[mostCommon].category;
    let continuityChance = 0.6;

    if (currentCategory === 'plains' || currentCategory === 'forest') {
        continuityChance = 0.75;
    }

    if (Math.random() < continuityChance) {
        const categoryTerrains = Object.keys(TERRAIN_TYPES).filter(t =>
            TERRAIN_TYPES[t].category === currentCategory && !TERRAIN_TYPES[t].isLinear
        );

        if (categoryTerrains.length > 1) {
            return categoryTerrains[Math.floor(Math.random() * categoryTerrains.length)];
        }
        return mostCommon;
    }

    // Transition to different categories
    const transitionWeights = {
        forest: { forest: 0.5, plains: 0.3, mountain: 0.15, desert: 0.05 },
        plains: { plains: 0.5, forest: 0.3, desert: 0.15, mountain: 0.05 },
        mountain: { mountain: 0.4, forest: 0.3, plains: 0.25, desert: 0.05 },
        desert: { desert: 0.4, plains: 0.35, mountain: 0.2, forest: 0.05 }
    };

    const weights = transitionWeights[currentCategory] || transitionWeights.plains;
    const rand = Math.random();
    let sum = 0;

    for (const [category, weight] of Object.entries(weights)) {
        sum += weight;
        if (rand < sum) {
            const categoryTerrains = Object.keys(TERRAIN_TYPES).filter(t =>
                TERRAIN_TYPES[t].category === category && !TERRAIN_TYPES[t].isLinear
            );
            return categoryTerrains[Math.floor(Math.random() * categoryTerrains.length)];
        }
    }

    return 'plains';
};