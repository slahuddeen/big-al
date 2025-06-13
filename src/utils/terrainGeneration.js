// ==================== ENHANCED ECOLOGICAL TERRAIN GENERATION ====================
import { HEX_DIRECTIONS, getHexNeighbors, hexDistance } from './hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

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
        const length = Math.floor(Math.random() * 4) + 3; // Shorter ranges: 3-6 instead of 4-11
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
            q: centerQ + Math.floor(Math.random() * radius) - radius/2,
            r: centerR + Math.floor(Math.random() * radius) - radius/2
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 8) + 6; // Shorter than rivers
        features.push(...generateMigrationRoute(start, direction, length));
    }

    // Generate volcanic features (0-1)
    if (Math.random() < 0.7) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius) - radius/2,
            r: centerR + Math.floor(Math.random() * radius) - radius/2
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

    // Starting terrain if no neighbors - focus on plains and forests
    if (existingNeighbors.length === 0) {
        const rand = Math.random();
        if (rand < 0.35) return 'plains';
        if (rand < 0.6) return 'grasslands';
        if (rand < 0.8) return 'forest';
        return 'openwoods';
    }

    // Analyze neighbors for ecological rules
    const neighborTypes = existingNeighbors.map(h => h.terrain);
    const terrainCounts = {};
    neighborTypes.forEach(t => terrainCounts[t] = (terrainCounts[t] || 0) + 1);

    const mostCommon = Object.keys(terrainCounts).reduce((a, b) =>
        terrainCounts[a] > terrainCounts[b] ? a : b
    );

    // ECOLOGICAL RULES

    // 1. River through forest becomes gallery forest
    const hasRiver = neighborTypes.includes('river');
    const hasForest = neighborTypes.some(t => ['forest', 'denseforest', 'oldgrowthforest'].includes(t));
    if (hasRiver && hasForest && Math.random() < 0.8) {
        return 'galleryforest';
    }

    // 2. Riverbanks and marshes next to rivers
    if (hasRiver && Math.random() < 0.6) {
        return Math.random() < 0.7 ? 'riverbank' : 'marsh';
    }

    // 3. Rocky terrain near mountains (REDUCED)
    const hasMountains = neighborTypes.includes('mountains');
    if (hasMountains && Math.random() < 0.3) {  // Reduced from 0.7 to 0.3
        return 'rocky';
    }

    // 4. Lava fields around volcanoes
    const hasVolcanic = neighborTypes.includes('volcanic');
    if (hasVolcanic && Math.random() < 0.6) {
        return 'lavafield';
    }

    // 5. Dead forest near volcanoes or lava fields
    const hasVolcanicFeatures = neighborTypes.some(t => ['volcanic', 'lavafield'].includes(t));
    if (hasVolcanicFeatures && hasForest && Math.random() < 0.8) {
        return 'deadforest';
    }

    // 6. Hills scattered nicely - appear near various terrains but not too dense
    const hasHills = neighborTypes.includes('hills');
    if (!hasHills && !hasMountains && !hasVolcanicFeatures && Math.random() < 0.15) {
        return 'hills';
    }

    // 7. Dense forest at center of forest clusters
    const forestCount = neighborTypes.filter(t => 
        ['forest', 'denseforest', 'oldgrowthforest', 'openwoods'].includes(t)
    ).length;
    
    if (forestCount >= 4) {
        const rand = Math.random();
        if (rand < 0.4) return 'denseforest';
        if (rand < 0.6) return 'oldgrowthforest';
        return 'forest';
    }

    // 8. Forest ecosystem hierarchy
    if (forestCount >= 2) {
        const rand = Math.random();
        if (rand < 0.3) return 'forest';
        if (rand < 0.5) return 'openwoods';
        if (rand < 0.7) return 'youngforest';
        return 'forestedge';
    }

    // 9. Plains types clump together
    const plainsCount = neighborTypes.filter(t => 
        ['plains', 'grasslands', 'meadow', 'scrubland', 'savanna', 'steppe'].includes(t)
    ).length;
    
    if (plainsCount >= 3) {
        const rand = Math.random();
        if (rand < 0.3) return mostCommon; // Continue same plains type
        if (rand < 0.5) return 'grasslands';
        if (rand < 0.7) return 'meadow';
        return 'plains';
    }

    // 10. Desert ecosystem with dry riverbeds
    const desertCount = neighborTypes.filter(t => 
        ['desert', 'badlands', 'sand', 'steppe'].includes(t)
    ).length;
    
    if (desertCount >= 2) {
        const rand = Math.random();
        if (rand < 0.2 && !neighborTypes.includes('dryriverbed')) return 'dryriverbed';
        if (rand < 0.4) return 'desert';
        if (rand < 0.6) return 'badlands';
        if (rand < 0.8) return 'steppe';
        return 'sand';
    }

    // 11. Forest edge where forest meets plains
    const hasPlains = neighborTypes.some(t => 
        ['plains', 'grasslands', 'meadow'].includes(t)
    );
    if (hasForest && hasPlains && Math.random() < 0.5) {
        return 'forestedge';
    }

    // 12. Scrubland as transition terrain
    const hasScrubland = neighborTypes.includes('scrubland');
    if ((hasForest || hasPlains || desertCount > 0) && !hasScrubland && Math.random() < 0.2) {
        return 'scrubland';
    }

    // Terrain category continuation with enhanced variation
    const currentCategory = TERRAIN_TYPES[mostCommon]?.category || 'terrain';
    let continuityChance = 0.6;

    // Increase continuity for major biomes
    if (['plains', 'forest', 'desert'].includes(currentCategory)) {
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

    // Enhanced transition weights
    const transitionWeights = {
        forest: { forest: 0.5, plains: 0.25, mountain: 0.15, desert: 0.1 },
        plains: { plains: 0.4, forest: 0.35, desert: 0.15, mountain: 0.1 },
        mountain: { mountain: 0.3, forest: 0.3, plains: 0.25, desert: 0.15 },
        desert: { desert: 0.4, plains: 0.3, mountain: 0.2, forest: 0.1 }
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
                return categoryTerrains[Math.floor(Math.random() * categoryTerrains.length)];
            }
        }
    }

    return 'plains'; // Fallback
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
    
    // Apply gallery forest rule to rivers in forests
    linearFeatures.forEach(feature => {
        if (feature.terrain === 'river') {
            const key = `${feature.q},${feature.r}`;
            const hex = newHexes.get(key);
            if (hex) {
                const neighbors = getHexNeighbors(feature);
                const hasForestNeighbor = neighbors.some(n => {
                    const neighborHex = newHexes.get(`${n.q},${n.r}`);
                    return neighborHex && ['forest', 'denseforest', 'oldgrowthforest'].includes(neighborHex.terrain);
                });
                
                if (hasForestNeighbor) {
                    hex.terrain = 'galleryforest';
                }
            }
        }
    });
    
    return newHexes;
};