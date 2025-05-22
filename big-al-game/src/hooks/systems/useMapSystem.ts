// Fix for the nested useCallback issue in useMapSystem.ts
// Replace your entire useMapSystem.ts with this simpler version:

import { useCallback } from 'react';
import { GameState, GameMap, HexCoord } from '../../types';
import { getAdjacentHexes, hexDistance } from '../../utils/hexGrid';
import { contentRegistry } from '../../utils/contentRegistry';

export const useMapSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {

    // Create complete map in one function to avoid nested callback issues
    const createCompleteMap = useCallback(() => {
        console.log("🚀 Starting complete map creation...");

        // STEP 1: Create base hexagonal map (inline to avoid callback nesting)
        console.log("🗺️ Creating hexagonal map...");
        const newMap: GameMap = {};
        const mapRadius = 10;

        for (let q = -mapRadius; q <= mapRadius; q++) {
            const r1 = Math.max(-mapRadius, -q - mapRadius);
            const r2 = Math.min(mapRadius, -q + mapRadius);

            for (let r = r1; r <= r2; r++) {
                const key = `${q},${r}`;
                newMap[key] = {
                    q, r,
                    type: 'plains',
                    creatures: [],
                    visited: false,
                    visible: false
                };
            }
        }

        console.log(`✅ Created base map with ${Object.keys(newMap).length} hexes`);
        console.log("📊 Sample check - hex 0,0:", newMap['0,0'] ? 'EXISTS' : 'MISSING');

        // STEP 2: Verify map was created
        if (!newMap || Object.keys(newMap).length === 0) {
            console.error("❌ Map creation failed");
            return {};
        }

        // STEP 3: Place nest
        console.log("🥚 Placing nest...");
        if (newMap['0,0']) {
            newMap['0,0'].type = 'nest';
            console.log("✅ Nest placed at center");
        }

        // STEP 4: Create river system
        console.log("🌊 Creating river...");
        const riverPath: HexCoord[] = [];
        let q = -10;
        let r = Math.floor(Math.random() * 10) - 5;

        while (q <= 10) {
            riverPath.push({ q, r });
            const direction = Math.floor(Math.random() * 3);
            if (direction === 0) r--;
            else if (direction === 1) r++;
            q++;
        }

        riverPath.forEach(({ q, r }) => {
            const key = `${q},${r}`;
            if (newMap[key]) {
                newMap[key].type = 'lake';
                getAdjacentHexes(q, r).forEach(adj => {
                    const adjKey = `${adj.q},${adj.r}`;
                    if (newMap[adjKey] && newMap[adjKey].type !== 'lake' && newMap[adjKey].type !== 'nest') {
                        newMap[adjKey].type = 'riverbank';
                    }
                });
            }
        });

        console.log(`✅ River created with ${riverPath.length} segments`);

        // STEP 5: Place terrain features using registry
        console.log("🏔️ Placing terrain features from registry...");
        const allTerrains = contentRegistry.getAllTerrains();
        console.log(`📋 Found ${allTerrains.length} registered terrains`);

        // Filter and sort terrains for placement
        const terrainsByRarity = allTerrains
            .filter(terrain => terrain.id !== 'plains' && terrain.id !== 'nest')
            .sort((a, b) => a.rarity - b.rarity);

        console.log("🌍 Terrain placement order:", terrainsByRarity.map(t => `${t.name} (${t.rarity})`));

        // Place each terrain type
        terrainsByRarity.forEach(terrain => {
            const baseCount = Math.ceil(terrain.rarity * 20);
            const count = Math.max(1, baseCount);
            const size = terrain.clusterSize || 3;
            const adjacentTo = terrain.adjacentTo ? terrain.adjacentTo[0] : undefined;

            console.log(`🌱 Placing ${terrain.name}: ${count} patches, size ${size}`);

            // Place terrain patches
            for (let i = 0; i < count; i++) {
                let startQ: number, startR: number;
                let validStart = false;
                let attempts = 0;

                // Find valid starting position
                while (!validStart && attempts < 50) {
                    if (adjacentTo) {
                        const adjacentHexes = Object.values(newMap).filter(hex => hex.type === adjacentTo);
                        if (adjacentHexes.length > 0) {
                            const randomHex = adjacentHexes[Math.floor(Math.random() * adjacentHexes.length)];
                            startQ = randomHex.q;
                            startR = randomHex.r;
                            validStart = true;
                        }
                    } else {
                        startQ = Math.floor(Math.random() * 20) - 10;
                        startR = Math.floor(Math.random() * 20) - 10;
                        const key = `${startQ},${startR}`;
                        if (newMap[key] && newMap[key].type === 'plains') {
                            validStart = true;
                        }
                    }
                    attempts++;
                }

                if (!validStart) continue;

                // Flood fill from starting position
                const queue = [{ q: startQ, r: startR, distance: 0 }];
                const visited = new Set<string>();

                while (queue.length > 0) {
                    const current = queue.shift()!;
                    const key = `${current.q},${current.r}`;

                    if (visited.has(key)) continue;
                    visited.add(key);

                    const hex = newMap[key];
                    if (hex && canPlaceHere(hex, terrain)) {
                        hex.type = terrain.id;
                    }

                    // Add adjacent hexes to queue
                    if (current.distance < size) {
                        getAdjacentHexes(current.q, current.r).forEach(adj => {
                            const adjKey = `${adj.q},${adj.r}`;
                            if (newMap[adjKey] && !visited.has(adjKey) && Math.random() < 0.7) {
                                queue.push({ q: adj.q, r: adj.r, distance: current.distance + 1 });
                            }
                        });
                    }
                }
            }
        });

        // STEP 6: Count final terrain distribution
        const terrainCounts: Record<string, number> = {};
        Object.values(newMap).forEach(hex => {
            terrainCounts[hex.type] = (terrainCounts[hex.type] || 0) + 1;
        });

        console.log("🗺️ Final terrain distribution:", terrainCounts);

        // STEP 7: Update state
        setGameState(prev => ({ ...prev, map: newMap }));

        console.log("✅ Complete map created successfully!");
        return newMap;

    }, [setGameState]);

    // Helper function for terrain placement rules
    const canPlaceHere = (hex: any, terrainConfig: any) => {
        if (hex.type === 'nest') return false;
        if (hex.type === 'lake' && terrainConfig.id !== 'marsh') return false;
        return true;
    };

    // Separate functions for individual operations (if needed elsewhere)
    const createMap = useCallback((): GameMap => {
        // This is now just for external use - createCompleteMap does the real work
        console.log("Creating basic map...");
        const newMap: GameMap = {};
        const mapRadius = 10;

        for (let q = -mapRadius; q <= mapRadius; q++) {
            const r1 = Math.max(-mapRadius, -q - mapRadius);
            const r2 = Math.min(mapRadius, -q + mapRadius);

            for (let r = r1; r <= r2; r++) {
                const key = `${q},${r}`;
                newMap[key] = {
                    q, r,
                    type: 'plains',
                    creatures: [],
                    visited: false,
                    visible: false
                };
            }
        }

        return newMap;
    }, []);

    const getTerrainConfig = useCallback((terrainType: string) => {
        return contentRegistry.getTerrain(terrainType);
    }, []);

    const updateMap = useCallback((updatedMap: GameMap) => {
        setGameState(prev => ({ ...prev, map: updatedMap }));
    }, [setGameState]);

    // Return the system API
    return {
        createMap,
        createCompleteMap, // This is the main one to use
        placeTerrainFeatures: (map: GameMap) => {
            // Just return the map as-is since createCompleteMap does everything
            console.log("⚠️ placeTerrainFeatures called - use createCompleteMap instead");
            return map;
        },
        getTerrainConfig,
        updateMap,

        // For extensibility
        getAllRegisteredTerrains: () => contentRegistry.getAllTerrains(),
        getTerrainDistribution: (map: GameMap) => {
            const counts: Record<string, number> = {};
            Object.values(map).forEach(hex => {
                counts[hex.type] = (counts[hex.type] || 0) + 1;
            });
            return counts;
        }
    };
};

// WHAT THIS FIXES:
// ================
// ✅ Eliminates nested useCallback issues
// ✅ Creates map in one atomic operation
// ✅ No undefined map passing between functions
// ✅ Detailed logging for debugging
// ✅ Still uses content registry for extensibility
// ✅ Simpler, more reliable code flow