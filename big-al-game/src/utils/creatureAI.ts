// utils/creatureAI.ts
import { getAdjacentHexes, hexDistance } from './hexGrid';
import { creatureTypes } from './creatures';
import { GameMap, HexCoord, Territory } from '../types';

export interface AIContext {
    map: GameMap;
    playerPosition: HexCoord;
    growthStage: number;
    stealthLevel: number;
    territoryHexes: Record<string, Territory>;
    territoryCenter: HexCoord | null;
}

export interface CreatureBehavior {
    type: 'idle' | 'flee' | 'hunt' | 'avoid' | 'wander' | 'herd';
    target: HexCoord | null;
    priority: number;
}

export interface BehaviorContext {
    creature: any;
    creatureInfo: any;
    position: HexCoord;
    playerPosition: HexCoord;
    growthStage: number;
    stealthLevel: number;
    territoryHexes: Record<string, Territory>;
    territoryCenter: HexCoord | null;
}

// Constants for behavior tuning
const BEHAVIOR_CONSTANTS = {
    PREY_DETECTION_RADIUS: 2,
    PREDATOR_DETECTION_RADIUS: 3,
    BASE_AWARENESS_CHANCE: 0.3,
    TERRITORY_RESPECT_FACTOR: 0.8,
    HERD_SEARCH_RADIUS: 3,
    BASE_MOVE_CHANCE: 0.6,
    HUNT_CHANCE: 0.4
} as const;

/**
 * Main function to update all creature behaviors
 */
export const updateCreatureBehavior = (context: AIContext): GameMap => {
    const newMap = structuredClone(context.map);

    // Process each hex with creatures
    for (const [hexKey, hex] of Object.entries(newMap)) {
        if (hex.creatures.length === 0) continue;

        const [q, r] = hexKey.split(',').map(Number);

        // Process each creature in the hex (in reverse order to handle removals)
        for (let i = hex.creatures.length - 1; i >= 0; i--) {
            const creature = hex.creatures[i];

            // Skip special creatures like mother
            if (creature.type === 'mothersaur') continue;

            const creatureInfo = creatureTypes[creature.type];
            if (!creatureInfo) continue;

            // Determine and execute behavior
            const behavior = determineCreatureBehavior({
                creature,
                creatureInfo,
                position: { q, r },
                playerPosition: context.playerPosition,
                growthStage: context.growthStage,
                stealthLevel: context.stealthLevel,
                territoryHexes: context.territoryHexes,
                territoryCenter: context.territoryCenter
            });

            executeBehavior(newMap, creature, hexKey, behavior, context.territoryCenter);
        }
    }

    return newMap;
};

/**
 * Determine what behavior a creature should exhibit
 */
export const determineCreatureBehavior = (context: BehaviorContext): CreatureBehavior => {
    const {
        creature,
        creatureInfo,
        position,
        playerPosition,
        growthStage,
        stealthLevel,
        territoryHexes,
        territoryCenter
    } = context;

    const distanceToPlayer = hexDistance(position.q, position.r, playerPosition.q, playerPosition.r);
    const isPrey = creatureInfo.minGrowthToHunt <= growthStage;
    const isPredator = creatureInfo.dangerLevel >= 3 && growthStage <= creatureInfo.maxGrowthToHide;
    const territoryStrength = getTerritoryStrength(position.q, position.r, territoryHexes);

    // Priority-based behavior selection
    const behaviors: CreatureBehavior[] = [];

    // High priority: Flee if prey and player is close
    if (isPrey && distanceToPlayer <= BEHAVIOR_CONSTANTS.PREY_DETECTION_RADIUS) {
        const awarenessChance = BEHAVIOR_CONSTANTS.BASE_AWARENESS_CHANCE +
            (0.7 * (1 - (stealthLevel / 100)));

        if (Math.random() < awarenessChance) {
            behaviors.push({
                type: 'flee',
                target: playerPosition,
                priority: 10
            });
        }
    }

    // High priority: Hunt or avoid if predator and player is close
    if (isPredator && distanceToPlayer <= BEHAVIOR_CONSTANTS.PREDATOR_DETECTION_RADIUS) {
        const territoryRespect = Math.min(BEHAVIOR_CONSTANTS.TERRITORY_RESPECT_FACTOR, territoryStrength);

        if (Math.random() < territoryRespect) {
            behaviors.push({
                type: 'avoid',
                target: territoryCenter,
                priority: 8
            });
        } else {
            const sizeAdvantage = creatureInfo.size - (growthStage / 1.5);
            const huntChance = BEHAVIOR_CONSTANTS.HUNT_CHANCE + Math.max(0, sizeAdvantage * 0.15);

            if (Math.random() < huntChance) {
                behaviors.push({
                    type: 'hunt',
                    target: playerPosition,
                    priority: 9
                });
            }
        }
    }

    // Medium priority: Herding behavior for large herbivores
    if (creatureInfo.category === 'large' && !isPredator) {
        if (shouldHerd(position, creature.type, context)) {
            behaviors.push({
                type: 'herd',
                target: null,
                priority: 5
            });
        }
    }

    // Low priority: Random movement
    const moveChance = BEHAVIOR_CONSTANTS.BASE_MOVE_CHANCE + (creatureInfo.agility / 200);
    if (Math.random() < moveChance) {
        behaviors.push({
            type: 'wander',
            target: null,
            priority: 1
        });
    }

    // Default: Idle
    behaviors.push({
        type: 'idle',
        target: null,
        priority: 0
    });

    // Return highest priority behavior
    return behaviors.reduce((prev, current) =>
        current.priority > prev.priority ? current : prev
    );
};

/**
 * Execute a creature's behavior
 */
export const executeBehavior = (
    map: GameMap,
    creature: any,
    currentHexKey: string,
    behavior: CreatureBehavior,
    territoryCenter: HexCoord | null
): void => {
    const behaviorHandlers = {
        flee: () => behavior.target && moveCreatureAwayFrom(map, creature, currentHexKey, behavior.target.q, behavior.target.r),
        hunt: () => behavior.target && moveCreatureToward(map, creature, currentHexKey, behavior.target.q, behavior.target.r),
        avoid: () => territoryCenter && moveCreatureAwayFrom(map, creature, currentHexKey, territoryCenter.q, territoryCenter.r),
        wander: () => moveCreatureRandomly(map, creature, currentHexKey),
        herd: () => moveCreatureWithHerd(map, creature, currentHexKey),
        idle: () => { } // Do nothing
    };

    const handler = behaviorHandlers[behavior.type];
    if (handler) {
        handler();
    }
};

/**
 * Check if creature should exhibit herding behavior
 */
const shouldHerd = (position: HexCoord, creatureType: string, context: BehaviorContext): boolean => {
    // Simplified herd detection - in a real implementation, 
    // you'd search nearby hexes for creatures of the same type
    return Math.random() < 0.3;
};

/**
 * Move creature away from a target position
 */
export const moveCreatureAwayFrom = (
    map: GameMap,
    creature: any,
    currentKey: string,
    targetQ: number,
    targetR: number
): void => {
    const [q, r] = currentKey.split(',').map(Number);
    const adjacentHexes = getAdjacentHexes(q, r);

    // Sort by distance from target (descending - furthest first)
    const sortedHexes = adjacentHexes
        .filter(hex => {
            const newKey = `${hex.q},${hex.r}`;
            return map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type);
        })
        .sort((a, b) => {
            const distA = hexDistance(a.q, a.r, targetQ, targetR);
            const distB = hexDistance(b.q, b.r, targetQ, targetR);
            return distB - distA;
        });

    if (sortedHexes.length > 0) {
        moveCreature(map, creature, currentKey, `${sortedHexes[0].q},${sortedHexes[0].r}`);
    }
};

/**
 * Move creature toward a target position
 */
export const moveCreatureToward = (
    map: GameMap,
    creature: any,
    currentKey: string,
    targetQ: number,
    targetR: number
): void => {
    const [q, r] = currentKey.split(',').map(Number);
    const adjacentHexes = getAdjacentHexes(q, r);

    // Sort by distance to target (ascending - closest first)
    const sortedHexes = adjacentHexes
        .filter(hex => {
            const newKey = `${hex.q},${hex.r}`;
            return map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type);
        })
        .sort((a, b) => {
            const distA = hexDistance(a.q, a.r, targetQ, targetR);
            const distB = hexDistance(b.q, b.r, targetQ, targetR);
            return distA - distB;
        });

    if (sortedHexes.length > 0) {
        moveCreature(map, creature, currentKey, `${sortedHexes[0].q},${sortedHexes[0].r}`);
    }
};

/**
 * Move creature to a random adjacent position
 */
export const moveCreatureRandomly = (map: GameMap, creature: any, currentKey: string): void => {
    const [q, r] = currentKey.split(',').map(Number);
    const adjacentHexes = getAdjacentHexes(q, r);

    // Filter valid hexes and shuffle
    const validHexes = adjacentHexes
        .filter(hex => {
            const newKey = `${hex.q},${hex.r}`;
            return map[newKey] && isTerrainSuitableForCreature(map[newKey].type, creature.type);
        })
        .sort(() => Math.random() - 0.5);

    if (validHexes.length > 0) {
        moveCreature(map, creature, currentKey, `${validHexes[0].q},${validHexes[0].r}`);
    }
};

/**
 * Move creature toward its herd
 */
export const moveCreatureWithHerd = (map: GameMap, creature: any, currentKey: string): void => {
    const [q, r] = currentKey.split(',').map(Number);

    // Find herd center
    const herdCenter = findHerdCenter(map, { q, r }, creature.type, BEHAVIOR_CONSTANTS.HERD_SEARCH_RADIUS);

    if (herdCenter) {
        moveCreatureToward(map, creature, currentKey, herdCenter.q, herdCenter.r);
    } else {
        moveCreatureRandomly(map, creature, currentKey);
    }
};

/**
 * Find the center position of a herd
 */
const findHerdCenter = (
    map: GameMap,
    position: HexCoord,
    creatureType: string,
    searchRadius: number
): HexCoord | null => {
    let herdQ = 0;
    let herdR = 0;
    let herdCount = 0;

    // Search in radius for same creature type
    for (let adjQ = position.q - searchRadius; adjQ <= position.q + searchRadius; adjQ++) {
        for (let adjR = position.r - searchRadius; adjR <= position.r + searchRadius; adjR++) {
            if (adjQ === position.q && adjR === position.r) continue;

            const adjKey = `${adjQ},${adjR}`;
            const hex = map[adjKey];

            if (hex) {
                const sameTypeCreatures = hex.creatures.filter(c => c.type === creatureType);
                if (sameTypeCreatures.length > 0) {
                    herdQ += adjQ * sameTypeCreatures.length;
                    herdR += adjR * sameTypeCreatures.length;
                    herdCount += sameTypeCreatures.length;
                }
            }
        }
    }

    return herdCount > 0 ? {
        q: Math.round(herdQ / herdCount),
        r: Math.round(herdR / herdCount)
    } : null;
};

/**
 * Actually move a creature from one hex to another
 */
const moveCreature = (map: GameMap, creature: any, fromKey: string, toKey: string): void => {
    const fromHex = map[fromKey];
    const toHex = map[toKey];

    if (!fromHex || !toHex) return;

    const creatureIndex = fromHex.creatures.findIndex(c => c.id === creature.id);
    if (creatureIndex === -1) return;

    // Remove from current hex
    const movedCreature = fromHex.creatures.splice(creatureIndex, 1)[0];

    // Add to new hex
    toHex.creatures.push(movedCreature);
};

/**
 * Check if terrain is suitable for a creature type
 */
export const isTerrainSuitableForCreature = (terrainType: string, creatureType: string): boolean => {
    const creatureInfo = creatureTypes[creatureType];

    if (!creatureInfo?.habitat) {
        return true; // Default to true if no habitat requirements
    }

    return creatureInfo.habitat.includes(terrainType);
};

/**
 * Get territory strength at a position
 */
export const getTerritoryStrength = (
    q: number,
    r: number,
    territoryHexes: Record<string, Territory>
): number => {
    const hexKey = `${q},${r}`;
    const territory = territoryHexes[hexKey];
    return territory ? territory.scent / 100 : 0;
};