// ==================== IMPROVED TERRAIN GENERATION - MORE STABLE GEOGRAPHY ====================
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

// ENHANCED: More stable terrain generation with permanent geographic features
export const generateTerrainFeatures = (centerQ, centerR, radius) => {
    const features = [];

    // Generate mountain ranges (2-3 ranges, more stable)
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 6) + 4; // Slightly longer: 4-9
        features.push(...generateMountainRange(start, direction, length));
    }

    // Generate rivers (2-4) - more permanent water features
    for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 15) + 8; // Longer rivers: 8-22
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

    // Generate migration routes - rare and snaking (0-1, reduced chance)
    if (Math.random() < 0.3) { // Reduced from 40% to 30%
        const start = {
            q: centerQ + Math.floor(Math.random() * radius) - radius / 2,
            r: centerR + Math.floor(Math.random() * radius) - radius / 2
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 8) + 6;
        features.push(...generateMigrationRoute(start, direction, length));
    }

    // REDUCED: Generate volcanic features (0-1, much lower chance!)
    if (Math.random() < 0.25) { // Reduced from 70% to 25%!
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

        // Rivers meander naturally but less erratically
        if (Math.random() < 0.2) { // Reduced from 0.25 for more stable flow
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

// ENHANCED: More stable mountain ranges
export const generateMountainRange = (start, direction, length) => {
    const mountains = [];
    let current = { ...start };

    for (let i = 0; i < length; i++) {
        // Much lower chance of volcanic mountains - mostly regular mountains
        const terrainType = Math.random() < 0.15 ? 'volcanic' : 'mountains'; // Reduced from 0.8/0.2 split
        mountains.push({ ...current, terrain: terrainType });

        // Less branching for more stable ranges
        if (Math.random() < 0.15) { // Reduced from 0.2
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

// REDUCED: Smaller volcanic areas
export const generateVolcanicArea = (center) => {
    const volcanicFeatures = [];

    // Central volcano
    volcanicFeatures.push({ ...center, terrain: 'volcanic' });

    // REDUCED: Smaller lava fields (1 radius only)
    for (let radius = 1; radius <= 1; radius++) { // Reduced from 1-2 to just 1
        for (let i = 0; i < 6 * radius; i++) {
            if (Math.random() < 0.4) { // Reduced from 60% to 40% chance for lava field
                const angle = (i / (6 * radius)) * 2 * Math.PI;
                const q = center.q + Math.round(radius * Math.cos(angle));
                const r = center.r + Math.round(radius * Math.sin(angle));
                volcanicFeatures.push({ q, r, terrain: 'lavafield' });
            }
        }
    }

    return volcanicFeatures;
};

// ENHANCED: More stable terrain generation with stronger geographic feature permanence
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

    // ENHANCED ECOLOGICAL RULES - Stronger geographic feature stability

    // 1. STRONG: Rivers attract forests and are very stable
    const hasRiver = neighborTypes.includes('river');
    if (hasRiver && Math.random() < 0.8) { // Increased from 0.7
        const forestOptions = ['forest', 'openwoods'];
        return forestOptions[Math.floor(Math.random() * forestOptions.length)];
    }

    // 2. STRONG: Riverbanks and marshes next to rivers
    if (hasRiver && Math.random() < 0.6) { // Increased from 0.5
        return Math.random() < 0.7 ? 'riverbank' : 'marsh';
    }

    // 3. ENHANCED: Rocky terrain near mountains - more stable
    const hasMountains = neighborTypes.includes('mountains');
    if (hasMountains && Math.random() < 0.5) { // Increased from 0.3
        return 'rocky';
    }

    // 4. ENHANCED: Hills form near mountains - more stable mountain regions
    if (hasMountains && Math.random() < 0.4) { // New rule
        return 'hills';
    }

    // 5. REDUCED: Lava fields around volcanoes - much less spreading
    const hasVolcanic = neighborTypes.includes('volcanic');
    if (hasVolcanic && Math.random() < 0.3) { // Reduced from 0.6
        return 'lavafield';
    }

    // 6. Dead forest near volcanoes or lava fields
    const hasVolcanicFeatures = neighborTypes.some(t => ['volcanic', 'lavafield'].includes(t));
    const hasForest = neighborTypes.some(t => ['forest', 'denseforest', 'openwoods'].includes(t));
    if (hasVolcanicFeatures && hasForest && Math.random() < 0.8) {
        return 'deadforest';
    }

    // 7. ENHANCED: Hills scattered nicely and more stable
    const hasHills = neighborTypes.includes('hills');
    if (!hasHills && !hasMountains && !hasVolcanicFeatures && Math.random() < 0.2) { // Increased from 0.15
        return 'hills';
    }

    // 8. Dense forest ONLY if there are 2+ forest neighbors
    const forestCount = neighborTypes.filter(t =>
        ['forest', 'denseforest', 'openwoods'].includes(t)
    ).length;

    if (forestCount >= 2 && Math.random() < 0.3) {
        return 'denseforest';
    }

    // 9. Forest ecosystem - simplified, but add plains transition
    if (forestCount >= 1) {
        const rand = Math.random();
        if (rand < 0.4) return 'forest';
        if (rand < 0.7) return 'openwoods';
        return 'plains';  // Add plains as forest edge option
    }

    // 10. If surrounded by mixed terrain types, lean toward plains
    const terrainVariety = new Set(neighborTypes).size;
    if (terrainVariety >= 3 && Math.random() < 0.4) {
        return 'plains';  // Plains as "neutral" terrain
    }

    // 11. ENHANCED: Plains to desert transition - check for large plains areas
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

    // 12. Desert placement rules - can't be near forests, but can be near plains
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

    // 13. Plains types clump together - make more likely to form
    const plainsCount = neighborTypes.filter(t =>
        ['plains', 'savanna', 'scrubland'].includes(t)
    ).length;

    if (plainsCount >= 1) {  // Reduced from 2 - easier to form plains
        const rand = Math.random();
        if (rand < 0.5) return 'plains';        // Increased plains chance
        if (rand < 0.7) return mostCommon;      // Continue same plains type
        return 'savanna';
    }

    // 14. Scrubland as transition terrain - but not between forest and desert
    const hasScrubland = neighborTypes.includes('scrubland');
    if ((hasPlains || plainsCount > 0) && !hasScrubland && !hasForestNeighbors && Math.random() < 0.15) {  // Reduced chance
        return 'scrubland';
    }

    // 15. Prevent desert formation near forests entirely - prefer plains as buffer
    if (hasForestNeighbors && desertCount > 0) {
        // Force plains as primary buffer - more plains!
        const bufferOptions = ['plains', 'plains', 'plains', 'savanna', 'scrubland'];  // 3x plains weight
        return bufferOptions[Math.floor(Math.random() * bufferOptions.length)];
    }

    // ENHANCED: Terrain category continuation with stronger stability
    const currentCategory = TERRAIN_TYPES[mostCommon]?.category || 'terrain';
    let continuityChance = 0.5; // Increased base continuity

    // Increase continuity for major geographic features
    if (currentCategory === 'plains') {
        continuityChance = 0.7; // Higher continuity for plains
    } else if (['forest', 'mountain'].includes(currentCategory)) {
        continuityChance = 0.6; // Higher for major features
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

    // Add lakes near rivers for more permanent water features
    for (const [hexKey, hex] of newHexes.entries()) {
        if (hex.terrain === 'river') {
            const neighbors = getHexNeighbors(hex);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                const neighborHex = newHexes.get(neighborKey);

                // Create occasional lakes next to rivers
                if (neighborHex && neighborHex.terrain === 'riverbank' && Math.random() < 0.15) {
                    neighborHex.terrain = 'lake';
                }
            }
        }
    }

    return newHexes;
};