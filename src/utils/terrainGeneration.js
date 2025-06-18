// ==================== SIMPLIFIED TERRAIN GENERATION ====================
import { HEX_DIRECTIONS, getHexNeighbors, hexDistance } from './hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

// Helper function to check plains density in a radius
const checkPlainsInRadius = (centerQ, centerR, radius, existingHexes) => {
    let plainsCount = 0;
    let totalHexes = 0;

    for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
            if (Math.abs(dq + dr) <= radius) {
                const hexKey = `${centerQ + dq},${centerR + dr}`;
                const hex = existingHexes.get(hexKey);
                if (hex) {
                    totalHexes++;
                    if (['plains', 'savanna', 'scrubland'].includes(hex.terrain)) {
                        plainsCount++;
                    }
                }
            }
        }
    }

    return totalHexes > 0 ? plainsCount / totalHexes : 0;
};

// Enhanced terrain generation with proper ecological rules
export const generateTerrainFeatures = (centerQ, centerR, radius) => {
    const features = [];

    // Generate mountain ranges (2-3 smaller ranges)
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 4) + 3; // Shorter ranges: 3-6
        features.push(...generateMountainRange(start, direction, length));
    }

    // Generate rivers (1-3) - these will create gallery forests later
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 12) + 6;
        features.push(...generateRiver(start, direction, length));
    }

    // Generate dry riverbeds in desert areas (0-2)
    for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 10) + 4;
        features.push(...generateDryRiverbed(start, direction, length));
    }

    // Generate migration routes - rare and snaking (0-1, low chance)
    if (Math.random() < 0.4) { // 40% chance for migration route
        const start = {
            q: centerQ + Math.floor(Math.random() * radius) - radius / 2,
            r: centerR + Math.floor(Math.random() * radius) - radius / 2
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 8) + 6; // Shorter than rivers
        features.push(...generateMigrationRoute(start, direction, length));
    }

    // Generate volcanic features (0-1)
    if (Math.random() < 0.7) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius) - radius / 2,
            r: centerR + Math.floor(Math.random() * radius) - radius / 2
        };
        features.push(...generateVolcanicArea(start));
    }

    return features;
};

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

export const generateMigrationRoute = (start, targetDirection, length) => {
    const route = [];
    let current = { ...start };
    let direction = targetDirection;

    for (let i = 0; i < length; i++) {
        route.push({ ...current, terrain: 'sauropodgrounds' });

        // Migration routes meander more than rivers
        if (Math.random() < 0.4) {
            direction = (direction + (Math.random() < 0.5 ? 1 : -1) + 6) % 6;
        }

        const nextStep = HEX_DIRECTIONS[direction];
        current.q += nextStep.q;
        current.r += nextStep.r;
    }

    return route;
};

export const generateVolcanicArea = (center) => {
    const volcanicFeatures = [];

    // Central volcano
    volcanicFeatures.push({ ...center, terrain: 'volcanic' });

    // Surrounding lava fields (1-2 radius)
    for (let radius = 1; radius <= 2; radius++) {
        for (let i = 0; i < 6 * radius; i++) {
            if (Math.random() < 0.6) { // 60% chance for lava field
                const angle = (i / (6 * radius)) * 2 * Math.PI;
                const q = center.q + Math.round(radius * Math.cos(angle));
                const r = center.r + Math.round(radius * Math.sin(angle));
                volcanicFeatures.push({ q, r, terrain: 'lavafield' });
            }
        }
    }

    return volcanicFeatures;
};

// Updated terrain generation logic with simplified terrain types
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

    // Starting terrain if no neighbors - focus on plains more
    if (existingNeighbors.length === 0) {
        const rand = Math.random();
        if (rand < 0.5) return 'plains';      // Increased from 0.4
        if (rand < 0.7) return 'forest';
        return 'openwoods';
    }

    // Analyze neighbors for ecological rules
    const neighborTypes = existingNeighbors.map(h => h.terrain);
    const terrainCounts = {};
    neighborTypes.forEach(t => terrainCounts[t] = (terrainCounts[t] || 0) + 1);

    const mostCommon = Object.keys(terrainCounts).reduce((a, b) =>
        terrainCounts[a] > terrainCounts[b] ? a : b
    );

    // ECOLOGICAL RULES - Updated

    // 1. Rivers attract forests - forests tend to follow rivers
    const hasRiver = neighborTypes.includes('river');
    if (hasRiver && Math.random() < 0.7) {
        const forestOptions = ['forest', 'openwoods'];
        return forestOptions[Math.floor(Math.random() * forestOptions.length)];
    }

    // 2. Riverbanks and marshes next to rivers (no more gallery forest)
    if (hasRiver && Math.random() < 0.5) {
        return Math.random() < 0.7 ? 'riverbank' : 'marsh';
    }

    // 3. Rocky terrain near mountains (REDUCED)
    const hasMountains = neighborTypes.includes('mountains');
    if (hasMountains && Math.random() < 0.3) {
        return 'rocky';
    }

    // 4. Lava fields around volcanoes
    const hasVolcanic = neighborTypes.includes('volcanic');
    if (hasVolcanic && Math.random() < 0.6) {
        return 'lavafield';
    }

    // 5. Dead forest near volcanoes or lava fields
    const hasVolcanicFeatures = neighborTypes.some(t => ['volcanic', 'lavafield'].includes(t));
    const hasForest = neighborTypes.some(t => ['forest', 'denseforest', 'openwoods'].includes(t));
    if (hasVolcanicFeatures && hasForest && Math.random() < 0.8) {
        return 'deadforest';
    }

    // 6. Hills scattered nicely
    const hasHills = neighborTypes.includes('hills');
    if (!hasHills && !hasMountains && !hasVolcanicFeatures && Math.random() < 0.15) {
        return 'hills';
    }

    // 7. Dense forest ONLY if there are 2+ forest neighbors
    const forestCount = neighborTypes.filter(t =>
        ['forest', 'denseforest', 'openwoods'].includes(t)
    ).length;

    if (forestCount >= 2 && Math.random() < 0.3) {
        return 'denseforest';
    }

    // 8. Forest ecosystem - simplified, but add plains transition
    if (forestCount >= 1) {
        const rand = Math.random();
        if (rand < 0.4) return 'forest';
        if (rand < 0.7) return 'openwoods';
        return 'plains';  // Add plains as forest edge option
    }

    // 8.5. If surrounded by mixed terrain types, lean toward plains
    const terrainVariety = new Set(neighborTypes).size;
    if (terrainVariety >= 3 && Math.random() < 0.4) {
        return 'plains';  // Plains as "neutral" terrain
    }

    // NEW RULE: Plains to desert transition - check for large plains areas
    const hasForestNeighbors = neighborTypes.some(t =>
        ['forest', 'denseforest', 'openwoods', 'deadforest'].includes(t)
    );

    if (!hasForestNeighbors) {
        const plainsRatio2Hex = checkPlainsInRadius(q, r, 2, existingHexes);
        const plainsRatio3Hex = checkPlainsInRadius(q, r, 3, existingHexes);

        // If we're in a large plains area, start transitioning to more arid terrain
        if (plainsRatio2Hex > 0.7 && plainsRatio3Hex > 0.6) {
            // Very large plains area - high chance of arid transition
            const aridChance = 0.4; // 40% chance
            if (Math.random() < aridChance) {
                const transitionRoll = Math.random();
                if (transitionRoll < 0.3) return 'scrubland';  // Start transition
                if (transitionRoll < 0.6) return 'savanna';    // Drier plains
                if (transitionRoll < 0.8) return 'badlands';   // More arid
                return 'desert';                               // Full desert
            }
        } else if (plainsRatio2Hex > 0.6) {
            // Medium plains area - moderate chance of transition
            const aridChance = 0.25; // 25% chance
            if (Math.random() < aridChance) {
                const transitionRoll = Math.random();
                if (transitionRoll < 0.5) return 'scrubland';  // Most likely
                if (transitionRoll < 0.8) return 'savanna';    // Still grassy
                return 'badlands';                             // Some desertification
            }
        }
    }

    // 9. Desert placement rules - can't be near forests, but can be near plains
    const hasPlains = neighborTypes.some(t =>
        ['plains', 'savanna', 'scrubland'].includes(t)
    );

    // Only allow desert if no forest neighbors
    const desertCount = neighborTypes.filter(t =>
        ['desert', 'badlands'].includes(t)
    ).length;

    if (desertCount >= 2 && !hasForestNeighbors) {
        const rand = Math.random();
        if (rand < 0.2 && !neighborTypes.includes('dryriverbed')) return 'dryriverbed';
        if (rand < 0.6) return 'desert';
        return 'badlands';
    }

    // 10. Plains types clump together - make more likely to form
    const plainsCount = neighborTypes.filter(t =>
        ['plains', 'savanna', 'scrubland'].includes(t)
    ).length;

    if (plainsCount >= 1) {  // Reduced from 2 - easier to form plains
        const rand = Math.random();
        if (rand < 0.5) return 'plains';        // Increased plains chance
        if (rand < 0.7) return mostCommon;      // Continue same plains type
        return 'savanna';
    }

    // 11. Scrubland as transition terrain - but not between forest and desert
    const hasScrubland = neighborTypes.includes('scrubland');
    if ((hasPlains || plainsCount > 0) && !hasScrubland && !hasForestNeighbors && Math.random() < 0.15) {  // Reduced chance
        return 'scrubland';
    }

    // 12. Prevent desert formation near forests entirely - prefer plains as buffer
    if (hasForestNeighbors && desertCount > 0) {
        // Force plains as primary buffer - more plains!
        const bufferOptions = ['plains', 'plains', 'plains', 'savanna', 'scrubland'];  // 3x plains weight
        return bufferOptions[Math.floor(Math.random() * bufferOptions.length)];
    }

    // Terrain category continuation with enhanced variation
    const currentCategory = TERRAIN_TYPES[mostCommon]?.category || 'terrain';
    let continuityChance = 0.45;

    // Increase continuity for plains especially, and other major biomes
    if (currentCategory === 'plains') {
        continuityChance = 0.65; // Higher continuity for plains
    } else if (['forest'].includes(currentCategory)) {
        continuityChance = 0.55;
    }
    // Lower continuity for desert to make it more clustered and less sprawling
    if (currentCategory === 'desert') {
        continuityChance = 0.4;
    }

    if (Math.random() < continuityChance) {
        const categoryTerrains = Object.keys(TERRAIN_TYPES).filter(t =>
            TERRAIN_TYPES[t].category === currentCategory && !TERRAIN_TYPES[t].isLinear
        );

        if (categoryTerrains.length > 1) {
            const selectedTerrain = categoryTerrains[Math.floor(Math.random() * categoryTerrains.length)];

            // Additional check: don't place desert near forests even in category continuation
            if (selectedTerrain === 'desert' && hasForestNeighbors) {
                return 'plains'; // Fallback to plains
            }

            return selectedTerrain;
        }
        return mostCommon;
    }

    // Enhanced transition weights - more plains emphasis
    const transitionWeights = {
        forest: { forest: 0.4, plains: 0.5, mountain: 0.1, desert: 0.0 }, // Increased plains
        plains: { plains: 0.5, forest: 0.3, desert: 0.15, mountain: 0.05 }, // Increased plains self-weight
        mountain: { mountain: 0.25, forest: 0.2, plains: 0.4, desert: 0.15 }, // Increased plains
        desert: { desert: 0.4, plains: 0.5, mountain: 0.1, forest: 0.0 } // Increased plains
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

            if (categoryTerrains.length > 0) {
                const selectedTerrain = categoryTerrains[Math.floor(Math.random() * categoryTerrains.length)];

                // Final safety check for desert placement
                if (selectedTerrain === 'desert' && hasForestNeighbors) {
                    return 'plains';
                }

                return selectedTerrain;
            }
        }
    }

    return 'plains'; // Fallback
};

// Updated starting terrain selection for initial spawn
export const getStartingTerrain = () => {
    const startingOptions = ['plains', 'forest', 'openwoods', 'savanna'];
    return startingOptions[Math.floor(Math.random() * startingOptions.length)];
};

// Helper function to get hexes in radius
export const getHexesInRadius = (center, radius) => {
    const hexes = [];
    for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
            if (Math.abs(dq + dr) <= radius) {
                hexes.push({ q: center.q + dq, r: center.r + dr });
            }
        }
    }
    return hexes;
};

// Post-processing function to apply final ecological rules
export const applyEcologicalPostProcessing = (hexes, linearFeatures) => {
    const newHexes = new Map(hexes);

    // No more gallery forest rules - rivers stay as rivers
    // Post-processing can be used for other ecological rules in the future

    return newHexes;
};