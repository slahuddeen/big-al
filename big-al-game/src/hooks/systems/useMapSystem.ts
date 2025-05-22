// Ecological terrain generation system with proper biome transitions
// hooks/systems/useMapSystem.ts

import { useCallback, useEffect } from 'react';
import { GameState, GameMap, HexCoord } from '../../types';
import { getAdjacentHexes, hexDistance } from '../../utils/hexGrid';
import { contentRegistry } from '../../utils/contentRegistry';

export const useMapSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {

    useEffect(() => {
        const loadTerrains = async () => {
            try {
                const { basicTerrains } = await import('../../content/terrains/basicTerrains');
                basicTerrains.forEach(terrain => {
                    contentRegistry.registerTerrain(terrain);
                });
                console.log("✅ Terrains loaded successfully");
            } catch (error) {
                console.error("❌ Failed to load terrains:", error);
            }
        };
        loadTerrains();
    }, []);

    const createCompleteMap = useCallback(async () => {
        console.log("🚀 Creating ecological terrain map...");

        await new Promise(resolve => setTimeout(resolve, 100));

        const allTerrains = contentRegistry.getAllTerrains();
        if (allTerrains.length === 0) {
            console.error("❌ No terrains registered!");
            return {};
        }

        // STEP 1: Create base map
        const newMap: GameMap = {};
        const mapRadius = 10;

        for (let q = -mapRadius; q <= mapRadius; q++) {
            const r1 = Math.max(-mapRadius, -q - mapRadius);
            const r2 = Math.min(mapRadius, -q + mapRadius);
            for (let r = r1; r <= r2; r++) {
                const key = `${q},${r}`;
                newMap[key] = {
                    q, r,
                    type: 'plains', // Default base terrain
                    creatures: [],
                    visited: false,
                    visible: false
                };
            }
        }

        // STEP 2: Place nest at center
        if (newMap['0,0']) {
            newMap['0,0'].type = 'nest';
        }

        // STEP 3: Create major geographic features in ecological order
        console.log("🏔️ Creating mountain ranges...");
        createMountainRanges(newMap);

        console.log("🌊 Creating river system...");
        createRiverSystem(newMap);

        console.log("🌲 Creating forest ecosystems...");
        createForestEcosystems(newMap);

        console.log("🏜️ Creating arid regions...");
        createAridRegions(newMap);

        console.log("🌾 Creating grassland zones...");
        createGrasslandZones(newMap);

        console.log("🔥 Adding volcanic features...");
        addVolcanicFeatures(newMap);

        // STEP 4: Apply ecological transitions
        console.log("🔄 Applying ecological transitions...");
        applyEcologicalTransitions(newMap);

        // STEP 5: Debug output
        logTerrainDistribution(newMap);

        setGameState(prev => ({ ...prev, map: newMap }));
        console.log("✅ Ecological map created!");

        return newMap;
    }, [setGameState]);

    // Create realistic mountain ranges with proper transitions
    const createMountainRanges = (newMap: GameMap) => {
        const rangeCount = 1 + Math.floor(Math.random() * 2); // 1-2 ranges

        for (let range = 0; range < rangeCount; range++) {
            const startSide = Math.floor(Math.random() * 4);
            let currentPos = getStartingPosition(startSide);
            let direction = getInitialDirection(startSide);

            const mountainPath: HexCoord[] = [];
            const rangeLength = 12 + Math.floor(Math.random() * 8);

            // Create mountain spine
            for (let i = 0; i < rangeLength; i++) {
                if (isValidPosition(currentPos, newMap)) {
                    mountainPath.push(currentPos);

                    if (Math.random() < 0.25) {
                        direction += (Math.random() < 0.5 ? -1 : 1);
                        direction = ((direction % 6) + 6) % 6;
                    }

                    const adjacentHexes = getAdjacentHexes(currentPos.q, currentPos.r);
                    if (adjacentHexes[direction]) {
                        currentPos = adjacentHexes[direction];
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }

            // Apply mountain elevation transitions: Plains → Hills → Rocky → Mountain
            mountainPath.forEach((pos, index) => {
                const key = `${pos.q},${pos.r}`;
                if (newMap[key] && newMap[key].type !== 'nest') {
                    newMap[key].type = 'mountain';

                    // Create elevation transitions around mountains
                    getAdjacentHexes(pos.q, pos.r).forEach(adj => {
                        const adjKey = `${adj.q},${adj.r}`;
                        if (newMap[adjKey] && newMap[adjKey].type === 'plains') {
                            if (Math.random() < 0.8) {
                                newMap[adjKey].type = 'rocky';
                            }
                        }
                    });

                    // Add hills further out
                    getHexesInRadius(pos, 2, newMap).forEach(hex => {
                        const hexKey = `${hex.q},${hex.r}`;
                        if (newMap[hexKey] && newMap[hexKey].type === 'plains' && Math.random() < 0.4) {
                            newMap[hexKey].type = 'hills';
                        }
                    });
                }
            });

            // Add occasional mesa near mountains
            if (Math.random() < 0.6 && mountainPath.length > 5) {
                const mesaPos = mountainPath[Math.floor(mountainPath.length / 2)];
                const nearbyRocky = getAdjacentHexes(mesaPos.q, mesaPos.r)
                    .filter(pos => {
                        const key = `${pos.q},${pos.r}`;
                        return newMap[key] && (newMap[key].type === 'rocky' || newMap[key].type === 'hills');
                    });

                if (nearbyRocky.length > 0) {
                    const mesaSpot = nearbyRocky[Math.floor(Math.random() * nearbyRocky.length)];
                    const mesaKey = `${mesaSpot.q},${mesaSpot.r}`;
                    newMap[mesaKey].type = 'mesa';
                }
            }
        }
    };

    // Create realistic river system
    const createRiverSystem = (newMap: GameMap) => {
        const mountains = Object.values(newMap).filter(hex => hex.type === 'mountain');
        let startPos: HexCoord;

        if (mountains.length > 0) {
            const sourceMountain = mountains[Math.floor(Math.random() * mountains.length)];
            startPos = { q: sourceMountain.q, r: sourceMountain.r };
        } else {
            startPos = { q: -8, r: Math.floor(Math.random() * 6) - 3 };
        }

        const riverPath: HexCoord[] = [];
        let currentPos = startPos;

        // Create main river
        for (let i = 0; i < 20; i++) {
            riverPath.push({ ...currentPos });

            const directions = getAdjacentHexes(currentPos.q, currentPos.r);
            const possibleMoves = directions.filter(pos => {
                const key = `${pos.q},${pos.r}`;
                return newMap[key] && !['mountain', 'rocky'].includes(newMap[key].type);
            });

            if (possibleMoves.length === 0) break;

            // Rivers prefer flowing generally eastward and downhill
            let nextPos = possibleMoves[0];
            if (Math.random() < 0.6) {
                const eastwardMoves = possibleMoves.filter(pos => pos.q > currentPos.q);
                if (eastwardMoves.length > 0) {
                    nextPos = eastwardMoves[Math.floor(Math.random() * eastwardMoves.length)];
                }
            } else {
                nextPos = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }

            currentPos = nextPos;
        }

        // Place river tiles
        riverPath.forEach(pos => {
            const key = `${pos.q},${pos.r}`;
            if (newMap[key] && newMap[key].type !== 'nest') {
                newMap[key].type = 'river';
            }
        });

        // Create 2-3 small natural lakes
        const lakePositions = riverPath.filter((_, index) =>
            index > 4 && index < riverPath.length - 4 && Math.random() < 0.2
        );

        lakePositions.slice(0, 3).forEach(pos => {
            createNaturalLake(newMap, pos);
        });

        // Add marshes near water (ecological transition)
        [...riverPath, ...lakePositions].forEach(pos => {
            if (Math.random() < 0.25) {
                const nearbyLand = getAdjacentHexes(pos.q, pos.r).filter(adj => {
                    const key = `${adj.q},${adj.r}`;
                    return newMap[key] && ['plains', 'grassland'].includes(newMap[key].type);
                });

                if (nearbyLand.length > 0) {
                    const marshSpot = nearbyLand[Math.floor(Math.random() * nearbyLand.length)];
                    const marshKey = `${marshSpot.q},${marshSpot.r}`;
                    newMap[marshKey].type = 'marsh';
                }
            }
        });
    };

    // Create forest ecosystems with proper density hierarchy
    const createForestEcosystems = (newMap: GameMap) => {
        const forestRegions = 2 + Math.floor(Math.random() * 2); // 2-3 forest regions

        for (let region = 0; region < forestRegions; region++) {
            // Pick forest center away from mountains and arid areas
            const centerCandidates = Object.values(newMap).filter(hex => {
                return hex.type === 'plains' &&
                    hexDistance(0, 0, hex.q, hex.r) > 3 &&
                    hexDistance(0, 0, hex.q, hex.r) < 8 &&
                    !isNearTerrain(hex, ['mountain', 'rocky', 'hills'], newMap, 2);
            });

            if (centerCandidates.length === 0) continue;

            const forestCenter = centerCandidates[Math.floor(Math.random() * centerCandidates.length)];
            const regionSize = 6 + Math.floor(Math.random() * 4); // Size 6-9

            // Create forest ecosystem with proper density transitions
            const forestHexes = getHexesInRadius(forestCenter, regionSize, newMap);

            forestHexes.forEach(hex => {
                const distanceFromCenter = hexDistance(forestCenter.q, forestCenter.r, hex.q, hex.r);
                const key = `${hex.q},${hex.r}`;

                if (!newMap[key] || !canPlaceForestHere(newMap[key])) return;

                // FOREST DENSITY HIERARCHY: Jungle/Dense Forest (center) → Forest → Woods → Sparse Forest → Shrubland → Grassland
                if (distanceFromCenter <= 1) {
                    // Densest center: Jungle or Dense Forest
                    newMap[key].type = Math.random() < 0.6 ? 'denseforest' : 'jungle';
                } else if (distanceFromCenter <= 2) {
                    // Dense middle: Forest
                    newMap[key].type = 'forest';
                } else if (distanceFromCenter <= 3) {
                    // Medium density: Woods
                    if (Math.random() < 0.9) {
                        newMap[key].type = 'woods';
                    }
                } else if (distanceFromCenter <= 4) {
                    // Light forest: Sparse Forest
                    if (Math.random() < 0.7) {
                        newMap[key].type = 'sparse_forest';
                    }
                } else if (distanceFromCenter <= 5) {
                    // Transition: Shrubland
                    if (Math.random() < 0.6) {
                        newMap[key].type = 'shrubland';
                    }
                } else if (distanceFromCenter <= 6) {
                    // Edge: Grassland
                    if (Math.random() < 0.5) {
                        newMap[key].type = 'grassland';
                    }
                }
            });
        }
    };

    // Create arid regions following ecological rules
    const createAridRegions = (newMap: GameMap) => {
        // Arid regions typically form in rain shadows of mountains or far from water
        const mountains = Object.values(newMap).filter(hex => hex.type === 'mountain');

        mountains.forEach(mountain => {
            if (Math.random() < 0.4) { // 40% chance per mountain to create rain shadow
                // Create arid area on leeward side (east side) of mountain
                const aridCenter = { q: mountain.q + 3, r: mountain.r };
                const aridKey = `${aridCenter.q},${aridCenter.r}`;

                if (newMap[aridKey] && newMap[aridKey].type === 'plains') {
                    const aridSize = 4 + Math.floor(Math.random() * 3); // Size 4-6
                    const aridHexes = getHexesInRadius(aridCenter, aridSize, newMap);

                    aridHexes.forEach(hex => {
                        const distanceFromCenter = hexDistance(aridCenter.q, aridCenter.r, hex.q, hex.r);
                        const key = `${hex.q},${hex.r}`;

                        if (!newMap[key] || !canPlaceAridHere(newMap[key])) return;

                        // ARID HIERARCHY: Desert (center) → Steppes → Savannah → Shrubland → Grassland
                        if (distanceFromCenter <= 1) {
                            // Driest center: Desert
                            if (Math.random() < 0.8) {
                                newMap[key].type = 'desert';
                            }
                        } else if (distanceFromCenter <= 2) {
                            // Semi-arid: Steppes
                            if (Math.random() < 0.7) {
                                newMap[key].type = 'steppes';
                            }
                        } else if (distanceFromCenter <= 3) {
                            // Transition: Savannah
                            if (Math.random() < 0.6) {
                                newMap[key].type = 'savannah';
                            }
                        } else if (distanceFromCenter <= 4) {
                            // Edge: Shrubland
                            if (Math.random() < 0.5) {
                                newMap[key].type = 'shrubland';
                            }
                        }
                    });
                }
            }
        });
    };

    // Create grassland zones in appropriate areas
    const createGrasslandZones = (newMap: GameMap) => {
        // Fill remaining plains with grassland, especially near shrubland
        const grasslandCandidates = Object.values(newMap).filter(hex => {
            return hex.type === 'plains' &&
                (isNearTerrain(hex, ['shrubland'], newMap, 2) || Math.random() < 0.3);
        });

        // Create grassland patches
        for (let i = 0; i < 4; i++) {
            if (grasslandCandidates.length === 0) break;

            const grassCenter = grasslandCandidates[Math.floor(Math.random() * grasslandCandidates.length)];
            const grassSize = 3 + Math.floor(Math.random() * 3);

            const grassHexes = getHexesInRadius(grassCenter, grassSize, newMap);
            grassHexes.forEach(hex => {
                const key = `${hex.q},${hex.r}`;
                if (newMap[key] && newMap[key].type === 'plains' && Math.random() < 0.8) {
                    newMap[key].type = 'grassland';
                }
            });
        }
    };

    // Add volcanic features near mountains
    const addVolcanicFeatures = (newMap: GameMap) => {
        const mountains = Object.values(newMap).filter(hex => hex.type === 'mountain');

        mountains.forEach(mountain => {
            if (Math.random() < 0.3) { // 30% chance per mountain
                const nearbyRocky = getAdjacentHexes(mountain.q, mountain.r)
                    .filter(pos => {
                        const key = `${pos.q},${pos.r}`;
                        return newMap[key] && newMap[key].type === 'rocky';
                    });

                if (nearbyRocky.length > 0) {
                    const volcanicSpot = nearbyRocky[Math.floor(Math.random() * nearbyRocky.length)];
                    const volcanicKey = `${volcanicSpot.q},${volcanicSpot.r}`;
                    newMap[volcanicKey].type = 'volcanic';

                    // Add volcanic fields nearby
                    if (Math.random() < 0.5) {
                        const nearbyForFields = getAdjacentHexes(volcanicSpot.q, volcanicSpot.r)
                            .filter(pos => {
                                const key = `${pos.q},${pos.r}`;
                                return newMap[key] && ['rocky', 'hills'].includes(newMap[key].type);
                            });

                        if (nearbyForFields.length > 0) {
                            const fieldSpot = nearbyForFields[Math.floor(Math.random() * nearbyForFields.length)];
                            const fieldKey = `${fieldSpot.q},${fieldSpot.r}`;
                            newMap[fieldKey].type = 'volcanic_fields';
                        }
                    }
                }
            }
        });
    };

    // Apply final ecological transitions and add beaches
    const applyEcologicalTransitions = (newMap: GameMap) => {
        // Add beaches near some lakes
        const lakes = Object.values(newMap).filter(hex => hex.type === 'lake');
        lakes.forEach(lake => {
            if (Math.random() < 0.4) {
                const adjacentLand = getAdjacentHexes(lake.q, lake.r)
                    .filter(pos => {
                        const key = `${pos.q},${pos.r}`;
                        return newMap[key] && ['plains', 'grassland'].includes(newMap[key].type);
                    });

                if (adjacentLand.length > 0) {
                    const beachSpot = adjacentLand[Math.floor(Math.random() * adjacentLand.length)];
                    const beachKey = `${beachSpot.q},${beachSpot.r}`;
                    newMap[beachKey].type = 'beach';
                }
            }
        });
    };

    // Helper functions
    const createNaturalLake = (newMap: GameMap, center: HexCoord) => {
        const key = `${center.q},${center.r}`;
        if (newMap[key]) {
            newMap[key].type = 'lake';

            // Small natural lake - 1-2 adjacent hexes
            const adjacentForLake = getAdjacentHexes(center.q, center.r)
                .filter(adj => {
                    const adjKey = `${adj.q},${adj.r}`;
                    return newMap[adjKey] && ['plains', 'grassland'].includes(newMap[adjKey].type) && Math.random() < 0.5;
                });

            adjacentForLake.slice(0, 2).forEach(adj => {
                const adjKey = `${adj.q},${adj.r}`;
                if (newMap[adjKey].type !== 'nest') {
                    newMap[adjKey].type = 'lake';
                }
            });
        }
    };

    const isNearTerrain = (hex: any, terrainTypes: string[], map: GameMap, radius: number): boolean => {
        return getHexesInRadius(hex, radius, map).some(nearHex => {
            const key = `${nearHex.q},${nearHex.r}`;
            return map[key] && terrainTypes.includes(map[key].type);
        });
    };

    const canPlaceForestHere = (hex: any): boolean => {
        return ['plains', 'grassland', 'hills'].includes(hex.type);
    };

    const canPlaceAridHere = (hex: any): boolean => {
        return ['plains', 'grassland', 'shrubland'].includes(hex.type);
    };

    // Utility functions (same as before)
    const getStartingPosition = (side: number): HexCoord => {
        const radius = 9;
        switch (side) {
            case 0: return { q: Math.floor(Math.random() * 10) - 5, r: -radius };
            case 1: return { q: radius, r: Math.floor(Math.random() * 10) - 5 };
            case 2: return { q: Math.floor(Math.random() * 10) - 5, r: radius };
            case 3: return { q: -radius, r: Math.floor(Math.random() * 10) - 5 };
            default: return { q: 0, r: -radius };
        }
    };

    const getInitialDirection = (side: number): number => {
        switch (side) {
            case 0: return 2; case 1: return 4; case 2: return 5; case 3: return 1;
            default: return 2;
        }
    };

    const isValidPosition = (pos: HexCoord, map: GameMap): boolean => {
        const key = `${pos.q},${pos.r}`;
        return map[key] !== undefined;
    };

    const getHexesInRadius = (center: HexCoord, radius: number, map: GameMap): HexCoord[] => {
        const hexes: HexCoord[] = [];
        for (let q = center.q - radius; q <= center.q + radius; q++) {
            for (let r = center.r - radius; r <= center.r + radius; r++) {
                if (hexDistance(center.q, center.r, q, r) <= radius) {
                    const key = `${q},${r}`;
                    if (map[key]) {
                        hexes.push({ q, r });
                    }
                }
            }
        }
        return hexes;
    };

    const logTerrainDistribution = (newMap: GameMap) => {
        const terrainCounts: Record<string, number> = {};
        Object.values(newMap).forEach(hex => {
            terrainCounts[hex.type] = (terrainCounts[hex.type] || 0) + 1;
        });

        console.log("🗺️ Ecological terrain distribution:");
        Object.entries(terrainCounts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([type, count]) => {
                const percentage = ((count / Object.keys(newMap).length) * 100).toFixed(1);
                console.log(`  ${type}: ${count} hexes (${percentage}%)`);
            });
    };

    const getTerrainConfig = useCallback((terrainType: string) => {
        return contentRegistry.getTerrain(terrainType);
    }, []);

    const updateMap = useCallback((updatedMap: GameMap) => {
        setGameState(prev => ({ ...prev, map: updatedMap }));
    }, [setGameState]);

    return {
        createCompleteMap,
        getTerrainConfig,
        updateMap,
        getAllRegisteredTerrains: () => contentRegistry.getAllTerrains(),
    };
};