// utils/creatureAI.ts
import { getAdjacentHexes, hexDistance } from './hexGrid';
import { creatureTypes } from './creatures';

export interface AIContext {
    map: any;
    playerPosition: { q: number, r: number };
    growthStage: number;
    stealthLevel: number;
    territoryHexes: Record<string, any>;
    territoryCenter: { q: number, r: number } | null;
}

// Main function to update all creature behaviors
export const updateCreatureBehavior = (context: AIContext) => {
    const { map, playerPosition, growthStage, stealthLevel, territoryHexes, territoryCenter } = context;
    
    const newMap = { ...map };

    // For each hex with creatures
    Object.entries(newMap).forEach(([key, hex]: [string, any]) => {
        if (hex.creatures.length === 0) return;

        const [q, r] = key.split(',').map(Number);

        // For each creature in the hex
        for (let i = hex.creatures.length - 1; i >= 0; i--) {
            const creature = hex.creatures[i];

            // Skip mother (handled separately)
            if (creature.type === 'mothersaur') continue;

            // Get creature info
            const creatureInfo = creatureTypes[creature.type];
            if (!creatureInfo) continue;

            // Determine behavior based on various factors
            const behavior = determineCreatureBehavior({
                creature, 
                creatureInfo, 
                position: { q, r }, 
                playerPosition, 
                growthStage,
                stealthLevel,
                territoryHexes,
                territoryCenter
            });

            // Execute behavior
            executeBehavior(newMap, creature, key, behavior, territoryCenter);
        }
    });

    return newMap;
};

// Determine what a creature should do
export const determineCreatureBehavior = (params: {
    creature: any,
    creatureInfo: any,
    position: { q: number, r: number },
    playerPosition: { q: number, r: number },
    growthStage: number,
    stealthLevel: number,
    territoryHexes: Record<string, any>,
    territoryCenter: { q: number, r: number } | null
}) => {
    const { 
        creature, 
        creatureInfo, 
        position, 
        playerPosition, 
        growthStage,
        stealthLevel,
        territoryHexes,
        territoryCenter
    } = params;
    
    // Default behavior
    let behavior = {
        type: 'idle',
        target: null
    };

    // Check distance to player
    const distanceToPlayer = hexDistance(position.q, position.r, playerPosition.q, playerPosition.r);

    // Check if creature is prey or predator relative to player
    const isPrey = creatureInfo.minGrowthToHunt <= growthStage;
    const isPredator = creatureInfo.dangerLevel >= 3 && growthStage <= creatureInfo.maxGrowthToHide;

    // Get territory strength in this hex
    const territoryStrength = getTerritoryStrength(position.q, position.r, territoryHexes);

    // Determine behavior
    if (isPrey && distanceToPlayer <= 2) {
        // Prey near player
        const awarenessChance = 0.3 + (0.7 * (1 - (stealthLevel / 100)));

        if (Math.random() < awarenessChance) {
            behavior = { 
                type: 'flee', 
                target: playerPosition 
            };
        }
    }
    else if (isPredator && distanceToPlayer <= 3) {
        // Predator near player

        // Predators respect territory
        const territoryRespect = Math.min(0.8, territoryStrength);

        if (Math.random() < territoryRespect) {
            behavior = { 
                type: 'avoid', 
                target: territoryCenter 
            };
        } else if (Math.random() < 0.4) {
            // More aggressive hunting for larger predators compared to player
            const sizeAdvantage = creatureInfo.size - (growthStage / 1.5);
            const huntChance = 0.4 + Math.max(0, sizeAdvantage * 0.15);
            
            if (Math.random() < huntChance) {
                behavior = { 
                    type: 'hunt', 
                    target: playerPosition 
                };
            }
        }
    }
    else {
        // Normal behavior
        const moveChance = 0.6 + (creatureInfo.agility / 200);

        if (Math.random() < moveChance) {
            behavior = { 
                type: 'wander', 
                target: null 
            };
        }

        // Herding behavior for herbivores
        if (creatureInfo.category === 'large' && !isPredator) {
            // Check for nearby herd members (simplified here, full implementation in moveCreatureWithHerd)
            const hexKey = `${position.q},${position.r}`;
            const hasHerd = checkForHerd(hexKey, creature.type, position, params);
            
            if (hasHerd) {
                behavior = { 
                    type: 'herd', 
                    target: null 
                };
            }
        }
    }

    return behavior;
};

// Execute creature behavior
export const executeBehavior = (
    map: any, 
    creature: any, 
    hexKey: string, 
    behavior: { type: string, target: any }, 
    territoryCenter: { q: number, r: number } | null
) => {
    const [q, r] = hexKey.split(',').map(Number);
    
    switch (behavior.type) {
        case 'flee':
            // Move away from player
            if (behavior.target) {
                moveCreatureAwayFrom(map, creature, hexKey, behavior.target.q, behavior.target.r);
            }
            break;

        case 'hunt':
            // Move toward player
            if (behavior.target) {
                moveCreatureToward(map, creature, hexKey, behavior.target.q, behavior.target.r);
            }
            break;

        case 'avoid':
            // Move away from territory
            if (territoryCenter) {
                moveCreatureAwayFrom(map, creature, hexKey, territoryCenter.q, territoryCenter.r);
            }
            break;

        case 'wander':
            // Random movement
            moveCreatureRandomly(map, creature, hexKey);
            break;

        case 'herd':
            // Herding behavior - find average position of herd and move toward it
            moveCreatureWithHerd(map, creature, hexKey);
            break;

        case 'idle':
        default:
            // Do nothing
            break;
    }
};

// Helper function to check for herds (simplified)
export const checkForHerd = (hexKey: string, creatureType: string, position: any, params: any) => {
    // This is a simplified version - actual logic would search for nearby creatures of same type
    return Math.random() < 0.3; // 30% chance a herd is nearby for demo purposes
};

// Move creature away from target
export const moveCreatureAwayFrom = (map: any, creature: any, currentKey: string, targetQ: number, targetR: number) => {
    const [q, r] = currentKey.split(',').map(Number);

    // Get adjacent hexes
    const adjacentHexes = getAdjacentHexes(q, r);

    // Sort by distance FROM target (descending)
    adjacentHexes.sort((a, b) => {
        const distA = hexDistance(a.q, a.r, targetQ, targetR);
        const distB = hexDistance(b.q, b.r, targetQ, targetR);
        return distB - distA; // Reverse sort to move away
    });

    // Choose valid hex with highest distance from target
    for (const hex of adjacentHexes) {
        const newKey = `${hex.q},${hex.r}`;

        if (map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type)) {
            // Move creature
            const creatureIndex = map[currentKey].creatures.findIndex((c: any) => c.id === creature.id);

            if (creatureIndex !== -1) {
                // Remove from current hex
                const movedCreature = map[currentKey].creatures.splice(creatureIndex, 1)[0];

                // Add to new hex
                map[newKey].creatures.push(movedCreature);
                break;
            }
        }
    }
};

// Move creature toward target
export const moveCreatureToward = (map: any, creature: any, currentKey: string, targetQ: number, targetR: number) => {
    const [q, r] = currentKey.split(',').map(Number);

    // Get adjacent hexes
    const adjacentHexes = getAdjacentHexes(q, r);

    // Sort by distance to target (ascending)
    adjacentHexes.sort((a, b) => {
        const distA = hexDistance(a.q, a.r, targetQ, targetR);
        const distB = hexDistance(b.q, b.r, targetQ, targetR);
        return distA - distB;
    });

    // Choose valid hex with lowest distance to target
    for (const hex of adjacentHexes) {
        const newKey = `${hex.q},${hex.r}`;

        if (map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type)) {
            // Move creature
            const creatureIndex = map[currentKey].creatures.findIndex((c: any) => c.id === creature.id);

            if (creatureIndex !== -1) {
                // Remove from current hex
                const movedCreature = map[currentKey].creatures.splice(creatureIndex, 1)[0];

                // Add to new hex
                map[newKey].creatures.push(movedCreature);
                break;
            }
        }
    }
};

// Move creature randomly
export const moveCreatureRandomly = (map: any, creature: any, currentKey: string) => {
    const [q, r] = currentKey.split(',').map(Number);

    // Get adjacent hexes
    const adjacentHexes = getAdjacentHexes(q, r);

    // Shuffle adjacentHexes
    const shuffled = [...adjacentHexes].sort(() => Math.random() - 0.5);

    // Choose first valid hex
    for (const hex of shuffled) {
        const newKey = `${hex.q},${hex.r}`;

        if (map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type)) {
            // Move creature
            const creatureIndex = map[currentKey].creatures.findIndex((c: any) => c.id === creature.id);

            if (creatureIndex !== -1) {
                // Remove from current hex
                const movedCreature = map[currentKey].creatures.splice(creatureIndex, 1)[0];

                // Add to new hex
                map[newKey].creatures.push(movedCreature);
                break;
            }
        }
    }
};

// Move creature with herd
export const moveCreatureWithHerd = (map: any, creature: any, currentKey: string) => {
    const [q, r] = currentKey.split(',').map(Number);

    // Find nearby hexes with same creature type
    let herdQ = 0;
    let herdR = 0;
    let herdCount = 0;

    // Search in radius
    for (let adjQ = q - 3; adjQ <= q + 3; adjQ++) {
        for (let adjR = r - 3; adjR <= r + 3; adjR++) {
            if (adjQ === q && adjR === r) continue;

            const adjKey = `${adjQ},${adjR}`;
            if (map[adjKey]) {
                // Check for same creature type
                const sameTypeCreatures = map[adjKey].creatures.filter((c: any) => c.type === creature.type);

                if (sameTypeCreatures.length > 0) {
                    herdQ += adjQ * sameTypeCreatures.length;
                    herdR += adjR * sameTypeCreatures.length;
                    herdCount += sameTypeCreatures.length;
                }
            }
        }
    }

    // If no herd found, move randomly
    if (herdCount === 0) {
        moveCreatureRandomly(map, creature, currentKey);
        return;
    }

    // Calculate average herd position
    const avgQ = Math.round(herdQ / herdCount);
    const avgR = Math.round(herdR / herdCount);

    // Move toward herd center
    moveCreatureToward(map, creature, currentKey, avgQ, avgR);
};

// Check if terrain is suitable for creature
export const isTerrainSuitableForCreature = (terrainType: string, creatureType: string) => {
    const creatureInfo = creatureTypes[creatureType];

    if (!creatureInfo || !creatureInfo.habitat) {
        return true; // Default to true if no specific habitat requirements
    }

    return creatureInfo.habitat.includes(terrainType);
};

// Get territory strength at a position
export const getTerritoryStrength = (q: number, r: number, territoryHexes: Record<string, any>) => {
    const hexKey = `${q},${r}`;
    if (territoryHexes[hexKey]) {
        return territoryHexes[hexKey].scent / 100; // 0-1 strength
    }
    return 0;
};