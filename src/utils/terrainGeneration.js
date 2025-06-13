// ==================== REALISTIC GEOLOGICAL TERRAIN GENERATION ====================
import { HEX_DIRECTIONS, getHexNeighbors, hexDistance } from './hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

// Enhanced terrain generation with realistic geological processes
export const generateTerrainFeatures = (centerQ, centerR, radius) => {
    const features = [];

    // STEP 1: Generate mountain ranges with realistic geology (2-4 ranges)
    const mountainRanges = [];
    for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
        const start = {
            q: centerQ + Math.floor(Math.random() * radius * 2) - radius,
            r: centerR + Math.floor(Math.random() * radius * 2) - radius
        };
        const direction = Math.floor(Math.random() * 6);
        const length = Math.floor(Math.random() * 8) + 6; // 6-13 hexes - more varied
        const range = generateMountainRange(start, direction, length);
        mountainRanges.push(range);
        features.push(...range);
    }

    // STEP 2: Generate lakes in lowland areas (1-3 lakes)
    const lakes = [];
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        // Place lakes away from mountains for realism
        let attempts = 0;
        let lake;
        do {
            lake = {
                q: centerQ + Math.floor(Math.random() * radius * 1.5) - radius * 0.75,
                r: centerR + Math.floor(Math.random() * radius * 1.5) - radius * 0.75
            };
            attempts++;
        } while (attempts < 10 && mountainRanges.some(range =>
            range.some(mountain => hexDistance(mountain, lake) < 3)
        ));

        lakes.push(lake);
        features.push({ ...lake, terrain: 'lake' });
    }

    // STEP 3: Generate realistic rivers FROM mountains TO lakes/edges
    mountainRanges.forEach(range => {
        if (Math.random() < 0.8 && range.length > 2) { // 80% chance per range
            const mountainStart = range[Math.floor(Math.random() * Math.min(3, range.length))]; // Start near beginning

            if (lakes.length > 0 && Math.random() < 0.7) {
                // 70% go to lakes
                const targetLake = lakes[Math.floor(Math.random() * lakes.length)];
                const river = generateRiverFromTo(mountainStart, targetLake);
                features.push(...river);
            } else {
                // 30% flow off the map edge
                const edgeDirection = Math.floor(Math.random() * 6);
                const riverLength = Math.floor(Math.random() * 15) + 10;
                const river = generateRiver(mountainStart, edgeDirection, riverLength);
                features.push(...river);
            }
        }
    });

    // STEP 4: Generate diverse forest patches (1-4 forest areas)
    for (let i = 0; i < Math.floor(Math.random() * 4) + 1; i++) {
        const forestCenter = {
            q: centerQ + Math.floor(Math.random() * radius * 1.6) - radius * 0.8,
            r: centerR + Math.floor(Math.random() * radius * 1.6) - radius * 0.8
        };

        // Vary forest sizes significantly
        const forestSize = Math.floor(Math.random() * 4) + 2; // 2-5 radius
        const forestType = ['forest', 'denseforest', 'oldgrowthforest'][Math.floor(Math.random() * 3)];
        const forestCore = generateForestPatch(forestCenter, forestSize, forestType);
        features.push(...forestCore);
    }

    // STEP 5: Generate occasional volcanic features (0-1, rare)
    if (Math.random() < 0.3) { // Only 30% chance
        const start = {
            q: centerQ + Math.floor(Math.random() * radius) - radius / 2,
            r: centerR + Math.floor(Math.random() * radius) - radius / 2
        };
        features.push(...generateVolcanicArea(start));
    }

    // STEP 6: Generate scattered special features
    const specialFeatures = Math.floor(Math.random() * 4) + 2; // 2-5 special features
    for (let i = 0; i < specialFeatures; i++) {
        const pos = {
            q: centerQ + Math.floor(Math.random() * radius * 1.8) - radius * 0.9,
            r: centerR + Math.floor(Math.random() * radius * 1.8) - radius * 0.9
        };

        const featureType = Math.random();
        if (featureType < 0.6) {
            features.push({ ...pos, terrain: 'nest' });
        } else if (featureType < 0.8) {
            // Create small mesa formations
            features.push({ ...pos, terrain: 'mesa' });
            // Add rocky terrain around mesas
            getHexNeighbors(pos).forEach(neighbor => {
                if (Math.random() < 0.4) {
                    features.push({ ...neighbor, terrain: 'rocky' });
                }
            });
        } else {
            // Migration routes
            const direction = Math.floor(Math.random() * 6);
            const length = Math.floor(Math.random() * 8) + 6;
            features.push(...generateMigrationRoute(pos, direction, length));
        }
    }

    return features;
};

// Generate varied forest patches instead of perfect circles
export const generateForestPatch = (center, maxRadius, coreType) => {
    const forestFeatures = [];

    for (let r = 0; r <= maxRadius; r++) {
        const hexesAtRadius = getHexesInRadius(center, r).filter(hex =>
            hexDistance(center, hex) === r
        );

        hexesAtRadius.forEach(hex => {
            // Add randomness to forest shape - not perfect circles
            if (Math.random() < 0.7 + (0.3 * (maxRadius - r) / maxRadius)) {
                let forestType;
                if (r === 0) {
                    forestType = coreType; // Use the specified core type
                } else if (r === 1) {
                    forestType = Math.random() < 0.6 ? coreType : 'forest';
                } else if (r <= maxRadius / 2) {
                    forestType = Math.random() < 0.5 ? 'forest' : 'openwoods';
                } else {
                    forestType = Math.random() < 0.4 ? 'openwoods' : 'forestedge';
                }

                forestFeatures.push({ ...hex, terrain: forestType });
            }
        });
    }

    return forestFeatures;
};

// Improved river generation with better pathfinding
export const generateRiverFromTo = (start, end) => {
    const river = [];
    let current = { ...start };
    const maxLength = 30;
    let attempts = 0;

    while (attempts < maxLength) {
        river.push({ ...current, terrain: 'river' });

        const distanceToTarget = hexDistance(current, end);
        if (distanceToTarget <= 1) {
            break;
        }

        // Improved pathfinding with more natural meandering
        let bestDirection = 0;
        let bestDistance = Infinity;

        for (let dir = 0; dir < 6; dir++) {
            const nextStep = HEX_DIRECTIONS[dir];
            const testPos = {
                q: current.q + nextStep.q,
                r: current.r + nextStep.r
            };
            const distance = hexDistance(testPos, end);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestDirection = dir;
            }
        }

        // Natural meandering - rivers don't go straight
        if (Math.random() < 0.4) {
            bestDirection = (bestDirection + (Math.random() < 0.5 ? 1 : -1) + 6) % 6;
        }

        const nextStep = HEX_DIRECTIONS[bestDirection];
        current.q += nextStep.q;
        current.r += nextStep.r;
        attempts++;
    }

    return river;
};

export const generateRiver = (start, targetDirection, length) => {
    const river = [];
    let current = { ...start };
    let direction = targetDirection;

    for (let i = 0; i < length; i++) {
        river.push({ ...current, terrain: 'river' });

        // Rivers meander more naturally
        if (Math.random() < 0.3) {
            direction = (direction + (Math.random() < 0.5 ? 1 : -1) + 6) % 6;
        }

        const nextStep = HEX_DIRECTIONS[direction];
        current.q += nextStep.q;
        current.r += nextStep.r;
    }

    return river;
};

export const generateMountainRange = (start, direction, length) => {
    const mountains = [];
    let current = { ...start };

    for (let i = 0; i < length; i++) {
        // More varied mountain types
        const terrainType = Math.random() < 0.7 ? 'mountains' :
            Math.random() < 0.8 ? 'hills' : 'volcanic';
        mountains.push({ ...current, terrain: terrainType });

        // Mountains snake more realistically
        if (Math.random() < 0.5) {
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

        if (Math.random() < 0.5) {
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

    // Surrounding lava fields and rocky terrain
    for (let radius = 1; radius <= 2; radius++) {
        const hexesAtRadius = getHexesInRadius(center, radius).filter(hex =>
            hexDistance(center, hex) === radius
        );

        hexesAtRadius.forEach(hex => {
            if (Math.random() < 0.5) {
                const terrainType = radius === 1 && Math.random() < 0.7 ? 'lavafield' : 'rocky';
                volcanicFeatures.push({ ...hex, terrain: terrainType });
            }
        });
    }

    return volcanicFeatures;
};

export const generateTerrain = (q, r, existingHexes, linearFeatures = []) => {
    // Check if this hex is part of pre-generated features
    const linearFeature = linearFeatures.find(f => f.q === q && f.r === r);
    if (linearFeature) {
        return linearFeature.terrain;
    }

    const neighbors = getHexNeighbors({ q, r });
    const existingNeighbors = neighbors
        .map(n => existingHexes.get(`${n.q},${n.r}`))
        .filter(Boolean);

    // Much more diverse starting terrain
    if (existingNeighbors.length === 0) {
        const rand = Math.random();
        if (rand < 0.25) return 'plains';
        if (rand < 0.45) return 'grasslands';
        if (rand < 0.60) return 'forest';
        if (rand < 0.75) return 'openwoods';
        if (rand < 0.85) return 'meadow';
        if (rand < 0.92) return 'scrubland';
        if (rand < 0.97) return 'hills';
        return 'steppe';
    }

    // Analyze neighbors for ecological rules
    const neighborTypes = existingNeighbors.map(h => h.terrain);
    const terrainCounts = {};
    neighborTypes.forEach(t => terrainCounts[t] = (terrainCounts[t] || 0) + 1);

    const mostCommon = Object.keys(terrainCounts).reduce((a, b) =>
        terrainCounts[a] > terrainCounts[b] ? a : b
    );

    // ENHANCED ECOLOGICAL RULES FOR NATURAL DIVERSITY

    // 1. Water-based ecology
    const hasRiver = neighborTypes.includes('river');
    const hasLake = neighborTypes.includes('lake');
    const hasWater = hasRiver || hasLake;

    if (hasRiver && Math.random() < 0.6) {
        const waterTerrain = ['riverbank', 'marsh', 'galleryforest'];
        return waterTerrain[Math.floor(Math.random() * waterTerrain.length)];
    }

    if (hasLake && Math.random() < 0.4) {
        return Math.random() < 0.6 ? 'marsh' : 'riverbank';
    }

    // 2. Mountain ecology with elevation effects
    const hasMountains = neighborTypes.includes('mountains');
    const hasHills = neighborTypes.includes('hills');
    const hasRocky = neighborTypes.includes('rocky');
    const mountainCount = [hasMountains, hasHills, hasRocky].filter(Boolean).length;

    if (mountainCount >= 2 && Math.random() < 0.5) {
        const mountainTerrain = ['hills', 'rocky', 'steppe'];
        return mountainTerrain[Math.floor(Math.random() * mountainTerrain.length)];
    }

    if (hasMountains && Math.random() < 0.3) {
        return Math.random() < 0.6 ? 'hills' : 'rocky';
    }

    // 3. Forest ecology with natural boundaries
    const forestTypes = ['forest', 'denseforest', 'oldgrowthforest', 'openwoods', 'forestedge'];
    const forestCount = neighborTypes.filter(t => forestTypes.includes(t)).length;

    if (forestCount >= 2) {
        // Moderate forest expansion with more variety
        if (Math.random() < 0.6) {
            const forestOptions = ['forest', 'openwoods', 'forestedge'];
            return forestOptions[Math.floor(Math.random() * forestOptions.length)];
        }
    }

    // Forest transitions to other biomes
    const hasForest = forestCount > 0;
    const plainsTypes = ['plains', 'grasslands', 'meadow'];
    const hasPlains = neighborTypes.some(t => plainsTypes.includes(t));

    if (hasForest && hasPlains && Math.random() < 0.4) {
        return 'forestedge';
    }

    // 4. Plains and grassland ecology
    const plainsCount = neighborTypes.filter(t =>
        ['plains', 'grasslands', 'meadow', 'savanna'].includes(t)
    ).length;

    if (plainsCount >= 2) {
        if (Math.random() < 0.5) {
            const plainsOptions = ['plains', 'grasslands', 'meadow'];
            if (hasWater && Math.random() < 0.3) {
                plainsOptions.push('savanna'); // Savanna near water
            }
            return plainsOptions[Math.floor(Math.random() * plainsOptions.length)];
        }
    }

    // 5. Desert ecology
    const desertTypes = ['desert', 'badlands', 'steppe'];
    const desertCount = neighborTypes.filter(t => desertTypes.includes(t)).length;

    if (desertCount >= 2) {
        if (Math.random() < 0.6) {
            return desertTypes[Math.floor(Math.random() * desertTypes.length)];
        }
    }

    // 6. Volcanic effects
    const hasVolcanic = neighborTypes.includes('volcanic');
    const hasLava = neighborTypes.includes('lavafield');

    if ((hasVolcanic || hasLava) && Math.random() < 0.5) {
        return Math.random() < 0.4 ? 'rocky' : 'deadforest';
    }

    // 7. Natural terrain transitions
    const transitionRules = {
        'forest': { continue: 0.4, transitions: ['openwoods', 'forestedge', 'meadow'] },
        'plains': { continue: 0.4, transitions: ['grasslands', 'scrubland', 'meadow'] },
        'grasslands': { continue: 0.3, transitions: ['plains', 'meadow', 'savanna'] },
        'hills': { continue: 0.3, transitions: ['rocky', 'steppe', 'scrubland'] },
        'desert': { continue: 0.5, transitions: ['badlands', 'steppe', 'scrubland'] },
        'mountains': { continue: 0.6, transitions: ['hills', 'rocky'] },
        'openwoods': { continue: 0.3, transitions: ['forest', 'forestedge', 'meadow'] }
    };

    const rule = transitionRules[mostCommon];
    if (rule && Math.random() < rule.continue) {
        return mostCommon;
    } else if (rule && Math.random() < 0.7) {
        return rule.transitions[Math.floor(Math.random() * rule.transitions.length)];
    }

    // 8. Default diverse generation
    const diverseOptions = [
        'plains', 'grasslands', 'scrubland', 'meadow', 'openwoods', 'steppe'
    ];

    return diverseOptions[Math.floor(Math.random() * diverseOptions.length)];
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

// Enhanced post-processing for realistic ecology
export const applyEcologicalPostProcessing = (hexes, linearFeatures) => {
    const newHexes = new Map(hexes);

    // Apply gallery forest rule to rivers near forests
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

                if (hasForestNeighbor && Math.random() < 0.7) {
                    hex.terrain = 'galleryforest';
                }
            }
        }
    });

    // Add natural terrain variety - prevent large uniform areas
    for (const [key, hex] of newHexes.entries()) {
        const neighbors = getHexNeighbors(hex);
        const neighborHexes = neighbors.map(n => newHexes.get(`${n.q},${n.r}`)).filter(Boolean);

        // If surrounded by the same terrain, add some variety
        if (neighborHexes.length >= 4) {
            const sameTerrainCount = neighborHexes.filter(n => n.terrain === hex.terrain).length;
            if (sameTerrainCount >= 4 && Math.random() < 0.1) {
                // 10% chance to break up uniform areas
                const varietyOptions = getTerrainVariety(hex.terrain);
                if (varietyOptions.length > 0) {
                    hex.terrain = varietyOptions[Math.floor(Math.random() * varietyOptions.length)];
                }
            }
        }
    }

    return newHexes;
};

// Get terrain varieties to break up uniform areas
const getTerrainVariety = (terrain) => {
    const varietyMap = {
        'forest': ['openwoods', 'forestedge'],
        'plains': ['grasslands', 'meadow'],
        'grasslands': ['plains', 'meadow'],
        'desert': ['badlands', 'steppe'],
        'mountains': ['hills', 'rocky'],
        'openwoods': ['forest', 'forestedge'],
    };

    return varietyMap[terrain] || [];
};