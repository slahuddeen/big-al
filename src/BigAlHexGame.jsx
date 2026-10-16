// ==================== BIG AL: ISOMETRIC 3D WORLD ====================
import React, { useReducer, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { areNeighbors } from './world/cellGraph.js';
import { TERRAIN_TYPES } from './data/terrain.js';
import { SPECIES_DATA } from './data/species.js';
import { getTimeOfDay } from './game/gameConstants.js';
import { initialGameState, gameReducer } from './game/gameState.js';
import { calculateFiercenessRatio } from './utils/combatUtils.js';
import { phaseIndex } from './three/WorldRenderer.js';
// Component imports
import WorldView from './components/WorldView.jsx';
import StatusPanel from './components/StatusPanel.jsx';
import CreaturesPanel from './components/CreaturesPanel.jsx';
import CreatureActivityPanel from './components/CreatureActivityPanel.jsx';
import NotificationSystem from './components/NotificationSystem.jsx';
import DeathScreen from './components/DeathScreen.jsx';
import HoverTooltip from './components/HoverTooltip.jsx';

const TRAVEL_STEP_MS = 650;
const MAX_PATH = 40;

// Sky behind the (transparent) 3D canvas for each turn of the day/night cycle
const SKIES = [
    'radial-gradient(ellipse at 30% 0%, #ffe3b8 0%, #b9dcf5 45%, #8cc4e8 100%)', // morning
    'radial-gradient(ellipse at 50% 0%, #f4fbff 0%, #a6d8f5 45%, #6fb6e6 100%)', // noon
    'radial-gradient(ellipse at 70% 0%, #ffd29a 0%, #f2a27a 40%, #8a6aa8 100%)', // evening
    'radial-gradient(ellipse at 50% 0%, #3a4a8a 0%, #1c2350 50%, #0b0f26 100%)', // night
    'radial-gradient(ellipse at 40% 0%, #6a4a9a 0%, #2c2456 50%, #120e2a 100%)' // pre-dawn
];

const isWalkable = (hex, weight) => {
    if (!hex || !hex.discovered) return false;
    const t = TERRAIN_TYPES[hex.terrain];
    if (!t.passable || hex.terrain === 'quicksand') return false;
    if (t.minWeight > 0 && weight < t.minWeight) return false;
    return true;
};

// Breadth-first path over discovered, safe terrain (cell keys)
const findPath = (cells, startKey, goalKey, weight) => {
    if (!isWalkable(cells.get(goalKey), weight)) return null;
    const prev = new Map([[startKey, null]]);
    const queue = [startKey];
    while (queue.length) {
        const ck = queue.shift();
        if (ck === goalKey) break;
        for (const nk of cells.get(ck).neighbors) {
            if (prev.has(nk) || !isWalkable(cells.get(nk), weight)) continue;
            prev.set(nk, ck);
            queue.push(nk);
        }
        if (prev.size > 4000) break;
    }
    if (!prev.has(goalKey)) return null;
    const path = [];
    for (let k = goalKey; k && k !== startKey; k = prev.get(k)) path.unshift(k);
    return path.length && path.length <= MAX_PATH ? path : null;
};

const BigAlHexGame = () => {
    const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [travelPath, setTravelPath] = useState([]);
    const worldRef = useRef(null);
    const fitnessAtTravelStart = useRef(null);

    // ============ WORLD GENERATION ============
    useEffect(() => {
        if (!gameState.mapGenerated) {
            const seed = Number(new URLSearchParams(window.location.search).get('seed')) || undefined;
            dispatch({ type: 'GENERATE_WORLD', seed });
        }
    }, [gameState.mapGenerated]);

    // Update visibility (and fill the visible area with wildlife) when the player moves
    useEffect(() => {
        if (!gameState.player) return;
        dispatch({ type: 'UPDATE_VISIBILITY' });
        dispatch({ type: 'POPULATE_NEARBY' });
    }, [gameState.player, gameState.worldSeed]);

    // Spawn creatures on your tile when moving to a new location
    useEffect(() => {
        if (gameState.moveNumber > 0 && gameState.gamePhase === 'exploring') {
            const id = setTimeout(() => dispatch({ type: 'SPAWN_CREATURES' }), 500);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [gameState.player, gameState.moveNumber]);

    // Creatures keep living between your moves
    const hasCreatures = gameState.creatures.size > 0;
    useEffect(() => {
        if (gameState.gameOver || !hasCreatures) return undefined;
        const timer = setInterval(() => {
            if (Math.random() < 0.8) dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
        }, 4000);
        return () => clearInterval(timer);
    }, [gameState.gameOver, hasCreatures]);

    // ============ DEBUG HELPERS ============
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return undefined;
        window.listCreatures = () => {
            const all = [];
            for (const [hex, creatures] of gameState.creatures.entries()) creatures.forEach(c => all.push(`${c.species} at ${hex}`));
            console.log('🦖 Current creatures:', all);
            return all;
        };
        window.showBehaviorLog = () => gameState.creatureBehaviorLog;
        window.forceBehaviorUpdate = () => dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
        window.bigAl = { state: gameState, dispatch };
        window.spawnCreature = (species, hexKey, size) => dispatch({ type: 'DEBUG_SPAWN', species, hexKey, size });
        return () => {
            delete window.listCreatures;
            delete window.showBehaviorLog;
            delete window.forceBehaviorUpdate;
            delete window.bigAl;
            delete window.spawnCreature;
        };
    }, [gameState]);

    // ============ MOVEMENT ============
    const movableHexes = useMemo(() => {
        if (gameState.gameOver) return [];
        const here = gameState.cells.get(gameState.player);
        if (!here) return [];
        return here.neighbors.filter(n => {
            const cell = gameState.cells.get(n);
            return cell && cell.discovered && TERRAIN_TYPES[cell.terrain].passable;
        });
    }, [gameState.player, gameState.cells, gameState.gameOver]);

    const handleHexClick = useCallback((key) => {
        const hex = gameState.cells.get(key);
        if (!hex || gameState.gameOver) return;
        const terrain = TERRAIN_TYPES[hex.terrain];

        if (key === gameState.player) {
            setTravelPath([]);
            dispatch({ type: 'SELECT_HEX', hex });
        } else if (areNeighbors(gameState.cells, gameState.player, key) && hex.discovered && terrain.passable) {
            setTravelPath([]);
            dispatch({ type: 'MOVE_PLAYER', target: key });
        } else {
            // NEW: click a far-away tile to walk there over safe, explored ground
            const path = hex.discovered ? findPath(gameState.cells, gameState.player, key, gameState.weight) : null;
            if (path) {
                fitnessAtTravelStart.current = gameState.fitness;
                setTravelPath(path);
            }
            dispatch({ type: 'SELECT_HEX', hex });
        }
    }, [gameState.cells, gameState.player, gameState.gameOver, gameState.weight, gameState.fitness]);

    const handleHexHover = useCallback((key) => {
        if (!key) {
            dispatch({ type: 'CLEAR_HOVER' });
            return;
        }
        const hex = gameState.cells.get(key);
        if (hex) dispatch({ type: 'HOVER_HEX', hex });
    }, [gameState.cells]);

    // Auto-travel along the chosen path, one step at a time. Stops when
    // something dangerous shows up, when hurt, or when getting hungry.
    useEffect(() => {
        if (!travelPath.length) return undefined;
        if (gameState.gameOver) {
            setTravelPath([]);
            return undefined;
        }
        const id = setTimeout(() => {
            const here = gameState.creatures.get(gameState.player) || [];
            const danger = here.some(c => {
                const sd = SPECIES_DATA[c.species];
                return sd && calculateFiercenessRatio(gameState.weight, gameState.fitness, sd, c.size, 1, false) >= 1;
            });
            const hurt = fitnessAtTravelStart.current !== null && gameState.fitness < fitnessAtTravelStart.current - 5;
            const next = travelPath[0];
            if (danger || hurt || gameState.energy < 20 || !areNeighbors(gameState.cells, gameState.player, next)) {
                setTravelPath([]);
                return;
            }
            dispatch({ type: 'MOVE_PLAYER', target: next });
            setTravelPath(travelPath.slice(1));
        }, TRAVEL_STEP_MS);
        return () => clearTimeout(id);
    }, [travelPath, gameState.player, gameState.gameOver]);

    // Path preview to the hovered tile
    const previewPath = useMemo(() => {
        if (travelPath.length) return travelPath;
        const h = gameState.hoveredHex;
        if (!h || gameState.gameOver || h.key === gameState.player || areNeighbors(gameState.cells, gameState.player, h.key)) return [];
        return findPath(gameState.cells, gameState.player, h.key, gameState.weight) || [];
    }, [travelPath, gameState.hoveredHex, gameState.player, gameState.cells, gameState.weight, gameState.gameOver]);

    // ============ HUD INFO ============
    const timeInfo = getTimeOfDay(gameState.moveNumber);
    const sky = SKIES[phaseIndex(gameState.moveNumber)];

    const ecosystemInfo = useMemo(() => {
        const totalCreatures = Array.from(gameState.creatures.values()).reduce((total, c) => total + c.length, 0);
        return {
            totalCreatures,
            activityLevel: totalCreatures === 0 ? 'silent' : totalCreatures < 5 ? 'quiet' : totalCreatures < 15 ? 'active' : 'bustling'
        };
    }, [gameState.creatures]);

    const hoveredCreatures = gameState.hoveredHex && gameState.cells.get(gameState.hoveredHex.key)?.inSight
        ? gameState.creatures.get(gameState.hoveredHex.key)
        : null;

    return (
        <div
            className="w-full h-screen relative overflow-hidden transition-[background] duration-1000"
            style={{ background: sky, userSelect: 'none' }}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        >
            {/* 3D world */}
            <WorldView
                ref={worldRef}
                gameState={gameState}
                movable={movableHexes}
                path={previewPath}
                onHexClick={handleHexClick}
                onHexHover={handleHexHover}
            />

            {/* soft vignette to frame the diorama */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)' }} />

            <StatusPanel gameState={gameState} />
            <CreaturesPanel gameState={gameState} dispatch={dispatch} />
            <CreatureActivityPanel gameState={gameState} />

            {/* Thought bubble */}
            {!gameState.gameOver && gameState.currentThought && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none" style={{ maxWidth: '36rem' }}>
                    <div className="thought-bubble px-4 py-2 rounded-2xl text-sm italic text-amber-50 bg-black bg-opacity-70 border border-amber-500 shadow-lg">
                        💭 {gameState.currentThought}
                        {travelPath.length > 0 && <span className="not-italic text-amber-300"> · travelling ({travelPath.length} more)</span>}
                    </div>
                </div>
            )}

            {/* Camera controls */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded-xl border border-amber-600 space-y-2" style={{ width: '14rem' }}>
                <div className="flex gap-1">
                    {[
                        ['⟲', 'Rotate left (Q)', () => worldRef.current?.rotate(-1)],
                        ['⟳', 'Rotate right (E)', () => worldRef.current?.rotate(1)],
                        ['＋', 'Zoom in (+)', () => worldRef.current?.zoom(1.25)],
                        ['－', 'Zoom out (-)', () => worldRef.current?.zoom(0.8)],
                        ['🎯', 'Center on Big Al (C)', () => worldRef.current?.center()]
                    ].map(([label, title, fn]) => (
                        <button key={title} title={title} onClick={fn}
                            className="flex-1 bg-amber-700 hover:bg-amber-600 active:scale-95 rounded-md py-1 text-base transition">
                            {label}
                        </button>
                    ))}
                </div>
                <div className="text-gray-300 leading-snug">
                    Click a neighbouring area to move · click further to travel · drag / WASD to pan · wheel to zoom
                </div>
                <div className="pt-1 border-t border-amber-700 text-gray-400">
                    {timeInfo.isNight ? '🌙' : '☀️'} Ecosystem: {ecosystemInfo.totalCreatures} creatures ({ecosystemInfo.activityLevel})
                </div>
            </div>

            <HoverTooltip hex={gameState.hoveredHex} mousePos={mousePos} creatures={hoveredCreatures} />
            <DeathScreen gameState={gameState} dispatch={dispatch} />
            <NotificationSystem gameState={gameState} dispatch={dispatch} />
        </div>
    );
};

export default BigAlHexGame;
