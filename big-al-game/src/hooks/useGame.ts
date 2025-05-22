// STEP 4: Update useGame.ts to ensure proper initialization order
// hooks/useGame.ts

import { useState, useCallback, useEffect } from 'react';
import { GameState, HexCoord } from '../types';

// Import systems
import { useMapSystem } from './systems/useMapSystem';
import { useGrowthSystem } from './systems/useGrowthSystem';
import { useHuntingSystem } from './systems/useHuntingSystem';

// Import utilities
import { getAdjacentHexes, hexDistance } from '../utils/hexGrid';
import { creatureTypes, dinosaurSpecies } from '../utils/creatures';
import { habitats } from '../utils/terrain';
import { weatherEffects, seasonEffects } from '../utils/weather';
import { injuryTypes, perkDefinitions, growthStages } from '../utils/gameData';

export const GAME_CONSTANTS = {
    MAP_RADIUS: 10,
    INITIAL_MOVES: 20,
    INITIAL_STATS: {
        age: 1,
        weight: 50,
        fitness: 100,
        hunger: 100,
        thirst: 100,
        energy: 100,
        score: 0,
        growthStage: 1
    }
} as const;

export const useGame = () => {
    // Core game state
    const [gameState, setGameState] = useState<GameState>({
        gameStarted: false,
        gameOver: false,
        turnCount: 0,
        ...GAME_CONSTANTS.INITIAL_STATS,
        movesLeft: GAME_CONSTANTS.INITIAL_MOVES,
        weather: 'clear',
        season: 'spring',
        timeOfDay: 'day',
        playerPosition: { q: 0, r: 0 },
        motherPosition: { q: 1, r: 0 },
        nestPosition: { q: 0, r: 0 },
        map: {},
        validMoves: [],
        revealedTiles: {},
        injuries: [],
        perks: [],
        availablePerks: 0,
        healthEvents: [],
        selectedCreature: null,
        stealthLevel: 0,

        // UI state
        showTutorial: false,
        showFact: false,
        showCreatureDetails: false,
        showEventLog: false,
        currentMessage: '',
        currentFact: '',
        darkMode: true
    });

    // Initialize systems
    const mapSystem = useMapSystem(gameState, setGameState);
    const growthSystem = useGrowthSystem(gameState, setGameState);
    const huntingSystem = useHuntingSystem(gameState, setGameState, growthSystem);

    // Game initialization with proper async handling
    const initializeGame = useCallback(async () => {
        console.log("🚀 Initializing Big Al game...");

        try {
            // Wait for map system to create the map (this loads terrains internally)
            console.log("🗺️ Creating map...");
            const newMap = await mapSystem.createCompleteMap();

            if (!newMap || Object.keys(newMap).length === 0) {
                console.error("❌ Map creation failed!");
                setGameState(prev => ({
                    ...prev,
                    currentMessage: "Failed to create game map. Please refresh and try again."
                }));
                return;
            }

            console.log("✅ Map created successfully with", Object.keys(newMap).length, "hexes");

            // Place creatures
            console.log("🦕 Placing creatures...");
            placeCreatures(newMap);

            // Calculate initial valid moves
            console.log("🎯 Calculating valid moves...");
            const initialValidMoves = calculateValidMovesSync({ q: 0, r: 0 }, newMap);

            // Update visibility
            console.log("👁️ Updating visibility...");
            const initialRevealedTiles = updateVisibilitySync(newMap, { q: 0, r: 0 });

            // Update game state with everything at once
            setGameState(prev => ({
                ...prev,
                gameStarted: true,
                gameOver: false,
                map: newMap,
                validMoves: initialValidMoves,
                revealedTiles: initialRevealedTiles,
                ...GAME_CONSTANTS.INITIAL_STATS,
                currentMessage: `You've hatched from your egg as an Allosaurus. Stay close to your mother for protection as you learn to hunt.`,
                currentFact: "Allosaurus was one of the top predators of the Late Jurassic period, living about 155 to 145 million years ago.",
                showFact: true
            }));

            console.log("✅ Game initialized successfully!");

        } catch (error) {
            console.error("❌ Game initialization failed:", error);
            setGameState(prev => ({
                ...prev,
                currentMessage: "Game initialization failed. Please refresh and try again."
            }));
        }
    }, [mapSystem]);

    // Synchronous helper functions (no state updates, just return values)
    const calculateValidMovesSync = (position: HexCoord, currentMap: any): HexCoord[] => {
        const adjacentHexes = getAdjacentHexes(position.q, position.r);
        const validMovesList: HexCoord[] = [];

        adjacentHexes.forEach(hex => {
            const key = `${hex.q},${hex.r}`;
            const tile = currentMap[key];

            if (tile) {
                const tileType = tile.type;
                let canPass = true;

                // Hatchlings can't cross deep water
                if (gameState.growthStage === 1 && tileType === 'lake') {
                    canPass = false;
                }

                if (canPass) {
                    validMovesList.push(hex);
                }
            }
        });

        return validMovesList;
    };

    const updateVisibilitySync = (currentMap: any, position: HexCoord): Record<string, boolean> => {
        const visibilityRadius = 2;
        const newRevealedTiles: Record<string, boolean> = {};

        Object.keys(currentMap).forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const distance = hexDistance(position.q, position.r, q, r);

            if (distance <= visibilityRadius) {
                currentMap[key].visible = true;
                currentMap[key].visited = true;
                newRevealedTiles[key] = true;
            }
        });

        return newRevealedTiles;
    };

    // Creature placement (same as before)
    const placeCreatures = useCallback((map: any) => {
        // Place mother at nest
        const nestKey = `0,0`;
        map[nestKey].creatures.push({
            id: 'mother',
            type: 'mothersaur'
        });

        // Place creatures
        const creatureSpawns = [
            { type: 'centipede', count: 5 },
            { type: 'lizard', count: 6 },
            { type: 'dryosaurus', count: 4 },
            { type: 'stegosaurus', count: 2 }
        ];

        creatureSpawns.forEach(({ type, count }) => {
            const creatureInfo = creatureTypes[type];
            if (!creatureInfo) return;

            for (let i = 0; i < count; i++) {
                const suitableHexes = Object.values(map).filter((hex: any) =>
                    creatureInfo.habitat.includes(hex.type) &&
                    hex.type !== 'nest' &&
                    hexDistance(0, 0, hex.q, hex.r) > 2
                );

                if (suitableHexes.length > 0) {
                    const randomHex: any = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];
                    const key = `${randomHex.q},${randomHex.r}`;

                    map[key].creatures.push({
                        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        type
                    });
                }
            }
        });
    }, []);

    // Movement and other game functions (same as before)
    const moveTo = useCallback((q: number, r: number) => {
        if (gameState.gameOver || gameState.movesLeft <= 0) return;

        const isValidMove = gameState.validMoves.some(move => move.q === q && move.r === r);
        if (!isValidMove) return;

        const key = `${q},${r}`;
        const targetHex = gameState.map[key];
        if (!targetHex) return;

        const newPosition = { q, r };
        const newMap = { ...gameState.map };

        // Handle creature encounters
        handleCreatureEncounter(newMap, key, newPosition);

        // Update game state
        const newValidMoves = calculateValidMovesSync(newPosition, newMap);
        const newRevealedTiles = { ...gameState.revealedTiles, ...updateVisibilitySync(newMap, newPosition) };

        setGameState(prev => ({
            ...prev,
            map: newMap,
            playerPosition: newPosition,
            validMoves: newValidMoves,
            revealedTiles: newRevealedTiles,
            movesLeft: prev.movesLeft - 1,
            turnCount: prev.turnCount + 1
        }));

        // End turn if no moves left
        if (gameState.movesLeft - 1 <= 0) {
            endTurn();
        }
    }, [gameState]);

    // Other functions remain the same...
    const handleCreatureEncounter = useCallback((newMap: any, hexKey: string, position: HexCoord) => {
        const creaturesInTile = newMap[hexKey].creatures;

        if (creaturesInTile.length > 0) {
            const creature = creaturesInTile[0];
            const creatureInfo = creatureTypes[creature.type];

            if (creature.type === 'mothersaur') {
                setGameState(prev => ({
                    ...prev,
                    fitness: Math.min(100, prev.fitness + 5),
                    currentMessage: "Your mother keeps you safe from larger predators."
                }));
            } else if (creatureInfo?.nutrition > 0) {
                const huntCheck = huntingSystem.canHuntCreature({ ...creature, info: creatureInfo });

                if (huntCheck.canHunt) {
                    setGameState(prev => ({
                        ...prev,
                        selectedCreature: { ...creature, info: creatureInfo },
                        showCreatureDetails: true
                    }));
                } else {
                    setGameState(prev => ({
                        ...prev,
                        currentMessage: huntCheck.reason || `You're too small to hunt the ${creatureInfo.name}`
                    }));
                }
            }
        }
    }, [huntingSystem]);

    const handleHunting = useCallback((attemptHunt: boolean) => {
        huntingSystem.hunt(attemptHunt);
        setGameState(prev => ({ ...prev, showCreatureDetails: false }));
    }, [huntingSystem]);

    const endTurn = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            movesLeft: GAME_CONSTANTS.INITIAL_MOVES,
            age: prev.turnCount % 10 === 0 ? prev.age + 1 : prev.age
        }));
    }, []);

    // UI functions
    const setShowTutorial = useCallback((show: boolean) => {
        setGameState(prev => ({ ...prev, showTutorial: show }));
    }, []);

    const setShowFact = useCallback((show: boolean) => {
        setGameState(prev => ({ ...prev, showFact: show }));
    }, []);

    const setShowCreatureDetails = useCallback((show: boolean) => {
        setGameState(prev => ({ ...prev, showCreatureDetails: show }));
    }, []);

    const setShowEventLog = useCallback((show: boolean) => {
        setGameState(prev => ({ ...prev, showEventLog: show }));
    }, []);

    return {
        // Core state
        ...gameState,

        // Systems
        mapSystem,
        growthSystem,
        huntingSystem,

        // Game actions
        initializeGame,
        moveTo,
        handleHunting,
        endTurn,

        // UI actions
        setShowTutorial,
        setShowFact,
        setShowCreatureDetails,
        setShowEventLog,

        // Computed values
        growthStages: growthSystem.getGrowthStages(),
        weatherEffects,
        seasonEffects,
        calculateHuntingSuccess: huntingSystem.calculateHuntingSuccess,
        getCurrentStageInfo: growthSystem.getCurrentStageInfo,
        getGrowthProgress: growthSystem.getGrowthProgress,

        // For components
        canHuntCreature: huntingSystem.canHuntCreature,
        getHuntingDifficulty: huntingSystem.getHuntingDifficulty,
    };
};