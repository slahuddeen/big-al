// hooks/useGame.ts - Working version with only the systems we've created
import { useState, useCallback } from 'react';
import { GameState, HexCoord } from '../types';

// Import only the systems we've actually created
import { useMapSystem } from './systems/useMapSystem';
import { useGrowthSystem } from './systems/useGrowthSystem';
import { useHuntingSystem } from './systems/useHuntingSystem';

// Import your existing utilities (keep these)
import { getAdjacentHexes, hexDistance } from '../utils/hexGrid';
import { creatureTypes, dinosaurSpecies } from '../utils/creatures';
import { habitats } from '../utils/terrain';
import { weatherEffects, seasonEffects } from '../utils/weather';
import { injuryTypes, perkDefinitions, growthStages } from '../utils/gameData';

// Game constants
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
        stealthLevel: 0, // Add this for hunting system

        // UI state
        showTutorial: false,
        showFact: false,
        showCreatureDetails: false,
        showEventLog: false,
        currentMessage: '',
        currentFact: '',
        darkMode: true
    });

    // Initialize only the systems we have
    const mapSystem = useMapSystem(gameState, setGameState);
    const growthSystem = useGrowthSystem(gameState, setGameState);
    const huntingSystem = useHuntingSystem(gameState, setGameState, growthSystem);

    // Game initialization - simplified to work with current systems
    const initializeGame = useCallback(() => {
        console.log("Initializing Big Al game");

        // Use map system
        const newMap = mapSystem.createCompleteMap();
        if (!newMap || Object.keys(newMap).length === 0) {
            console.error("❌ Map creation failed!");
            return;
        }
        console.log("✅ Map created successfully with", Object.keys(newMap).length, "hexes");

        // Place creatures manually for now (until we have creature system)
        placeCreatures(newMap);

        // Calculate initial valid moves
        calculateValidMoves({ q: 0, r: 0 }, newMap);

        // Update visibility manually for now
        updateVisibility(newMap, { q: 0, r: 0 });

        setGameState(prev => ({
            ...prev,
            gameStarted: true,
            gameOver: false,
            map: newMap,
            ...GAME_CONSTANTS.INITIAL_STATS,
            currentMessage: `You've hatched from your egg as an Allosaurus. Stay close to your mother for protection as you learn to hunt.`,
            currentFact: "Allosaurus was one of the top predators of the Late Jurassic period, living about 155 to 145 million years ago.",
            showFact: true
        }));

    }, [mapSystem, setGameState]);

    // Temporary creature placement (until we have creature system)
    const placeCreatures = useCallback((map: any) => {
        // Place mother at nest
        const nestKey = `0,0`;
        map[nestKey].creatures.push({
            id: 'mother',
            type: 'mothersaur'
        });

        // Place some basic creatures
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

    // Temporary visibility update (until we have visibility system)
    const updateVisibility = useCallback((currentMap: any, position: HexCoord) => {
        const visibilityRadius = 2;
        const newRevealedTiles = { ...gameState.revealedTiles };

        Object.keys(currentMap).forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const distance = hexDistance(position.q, position.r, q, r);

            if (distance <= visibilityRadius) {
                currentMap[key].visible = true;
                currentMap[key].visited = true;
                newRevealedTiles[key] = true;
            }
        });

        setGameState(prev => ({ ...prev, revealedTiles: newRevealedTiles }));
    }, [gameState.revealedTiles]);

    // Temporary movement validation (until we have movement system)
    const calculateValidMoves = useCallback((position: HexCoord, currentMap: any) => {
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

        setGameState(prev => ({ ...prev, validMoves: validMovesList }));
    }, [gameState.growthStage]);

    // Main movement function
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
        setGameState(prev => ({
            ...prev,
            map: newMap,
            playerPosition: newPosition,
            movesLeft: prev.movesLeft - 1,
            turnCount: prev.turnCount + 1
        }));

        // Update visibility and valid moves
        updateVisibility(newMap, newPosition);
        calculateValidMoves(newPosition, newMap);

        // End turn if no moves left
        if (gameState.movesLeft - 1 <= 0) {
            endTurn();
        }
    }, [gameState, updateVisibility, calculateValidMoves]);

    // Handle creature encounters
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

    // Hunting handler
    const handleHunting = useCallback((attemptHunt: boolean) => {
        huntingSystem.hunt(attemptHunt);
        setGameState(prev => ({ ...prev, showCreatureDetails: false }));
    }, [huntingSystem]);

    // End turn
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

    // Return everything
    return {
        // Core state
        ...gameState,

        // Systems we have
        mapSystem,
        growthSystem,
        huntingSystem,

        // Main game actions
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