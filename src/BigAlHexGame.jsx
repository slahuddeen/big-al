// ==================== BIG AL: ISOMETRIC 3D WORLD ====================
import React, { useReducer, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { hexDistance, getHexNeighbors } from './utils/hexMath.js';
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

const GENERATION_RADIUS = 8;
const TRAVEL_STEP_MS = 650;
const MAX_PATH = 24;

// Sky behind the (transparent) 3D canvas for each turn of the day/night cycle
const SKIES = [
    'radial-gradient(ellipse at 30% 0%, #ffe3b8 0%, #b9dcf5 45%, #8cc4e8 100%)', // morning
    'radial-gradient(ellipse at 50% 0%, #f4fbff 0%, #a6d8f5 45%, #6fb6e6 100%)', // noon
    'radial-gradient(ellipse at 70% 0%, #ffd29a 0%, #f2a27a 40%, #8a6aa8 100%)', // evening
    'radial-gradient(ellipse at 50% 0%, #3a4a8a 0%, #1c2350 50%, #0b0f26 100%)', // night
    'radial-gradient(ellipse at 40% 0%, #6a4a9a 0%, #2c2456 50%, #120e2a 100%)' // pre-dawn
];

const keyOf = (h) => `${h.q},${h.r}`;

const isWalkable = (hex, weight) => {
    if (!hex || !hex.discovered) return false;
    const t = TERRAIN_TYPES[hex.terrain];
    if (!t.passable || hex.terrain === 'quicksand') return false;
    if (t.minWeight > 0 && weight < t.minWeight) return false;
    return true;
};

// Breadth-first path over discovered, safe terrain
const findPath = (hexes, from, to, weight) => {
    const goalKey = keyOf(to);
    if (!isWalkable(hexes.get(goalKey), weight)) return null;
    const startKey = keyOf(from);
    const prev = new Map([[startKey, null]]);
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        const ck = keyOf(cur);
        if (ck === goalKey) break;
        for (const n of getHexNeighbors(cur)) {
            const nk = keyOf(n);
            if (prev.has(nk) || !isWalkable(hexes.get(nk), weight)) continue;
            if (hexDistance(n, from) > MAX_PATH) continue;
            prev.set(nk, ck);
            queue.push(n);
        }
    }
    if (!prev.has(goalKey)) return null;
    const path = [];
    for (let k = goalKey; k && k !== startKey; k = prev.get(k)) {
        const [q, r] = k.split(',').map(Number);
        path.unshift({ q, r });
    }
    return path.length ? path : null;
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
            dispatch({ type: 'GENERATE_TERRAIN_FEATURES' });
        }
    }, [gameState.mapGenerated]);

    useEffect(() => {
        if (!gameState.linearFeatures.length) return;
        const coords = [];
        for (let dq = -GENERATION_RADIUS; dq <= GENERATION_RADIUS; dq++) {
            for (let dr = -GENERATION_RADIUS; dr <= GENERATION_RADIUS; dr++) {
                if (Math.abs(dq + dr) > GENERATION_RADIUS) continue;
                const q = gameState.player.q + dq;
                const r = gameState.player.r + dr;
                if (!gameState.hexes.has(`${q},${r}`)) coords.push({ q, r });
            }
        }
        // Generate closest hexes first so neighbour-based rules flow outward
        coords.sort((a, b) => hexDistance(a, gameState.player) - hexDistance(b, gameState.player));
        if (coords.length) dispatch({ type: 'GENERATE_HEXES', coords });
        // IMPORTANT: Don't remove old hexes! Keep all discovered hexes forever
    }, [gameState.player.q, gameState.player.r, gameState.linearFeatures]);

    // Update visibility (and fill the visible area with wildlife) when the player moves
    useEffect(() => {
        dispatch({ type: 'UPDATE_VISIBILITY' });
        if (gameState.hexes.size > 0) dispatch({ type: 'POPULATE_NEARBY' });
    }, [gameState.player.q, gameState.player.r, gameState.hexes.size]);

    // Spawn creatures on your tile when moving to a new location
    useEffect(() => {
        if (gameState.moveNumber > 0 && gameState.gamePhase === 'exploring') {
            const id = setTimeout(() => dispatch({ type: 'SPAWN_CREATURES' }), 500);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [gameState.player.q, gameState.player.r, gameState.moveNumber]);

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
        return getHexNeighbors(gameState.player).filter(n => {
            const hex = gameState.hexes.get(keyOf(n));
            return hex && hex.discovered && TERRAIN_TYPES[hex.terrain].passable;
        });
    }, [gameState.player, gameState.hexes, gameState.gameOver]);

    const handleHexClick = useCallback((key) => {
        const hex = gameState.hexes.get(key);
        if (!hex || gameState.gameOver) return;
        const distance = hexDistance(gameState.player, hex);
        const terrain = TERRAIN_TYPES[hex.terrain];

        if (distance === 0) {
            setTravelPath([]);
            dispatch({ type: 'SELECT_HEX', hex });
        } else if (distance === 1 && hex.discovered && terrain.passable) {
            setTravelPath([]);
            dispatch({ type: 'MOVE_PLAYER', target: { q: hex.q, r: hex.r } });
        } else {
            // NEW: click a far-away tile to walk there over safe, explored ground
            const path = hex.discovered ? findPath(gameState.hexes, gameState.player, hex, gameState.weight) : null;
            if (path) {
                fitnessAtTravelStart.current = gameState.fitness;
                setTravelPath(path);
            }
            dispatch({ type: 'SELECT_HEX', hex });
        }
    }, [gameState.hexes, gameState.player, gameState.gameOver, gameState.weight, gameState.fitness]);

    const handleHexHover = useCallback((key) => {
        if (!key) {
            dispatch({ type: 'CLEAR_HOVER' });
            return;
        }
        const hex = gameState.hexes.get(key);
        if (hex) dispatch({ type: 'HOVER_HEX', hex });
    }, [gameState.hexes]);

    // Auto-travel along the chosen path, one step at a time. Stops when
    // something dangerous shows up, when hurt, or when getting hungry.
    useEffect(() => {
        if (!travelPath.length) return undefined;
        if (gameState.gameOver) {
            setTravelPath([]);
            return undefined;
        }
        const id = setTimeout(() => {
            const here = gameState.creatures.get(keyOf(gameState.player)) || [];
            const danger = here.some(c => {
                const sd = SPECIES_DATA[c.species];
                return sd && calculateFiercenessRatio(gameState.weight, gameState.fitness, sd, c.size, 1, false) >= 1;
            });
            const hurt = fitnessAtTravelStart.current !== null && gameState.fitness < fitnessAtTravelStart.current - 5;
            const next = travelPath[0];
            if (danger || hurt || gameState.energy < 20 || hexDistance(next, gameState.player) !== 1) {
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
        if (!h || gameState.gameOver || hexDistance(h, gameState.player) <= 1) return [];
        return findPath(gameState.hexes, gameState.player, h, gameState.weight) || [];
    }, [travelPath, gameState.hoveredHex, gameState.player, gameState.hexes, gameState.weight, gameState.gameOver]);

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

    const hoveredCreatures = gameState.hoveredHex && gameState.hexes.get(keyOf(gameState.hoveredHex))?.inSight
        ? gameState.creatures.get(keyOf(gameState.hoveredHex))
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
                    Click a tile to move · click further to travel · drag / WASD to pan · wheel to zoom
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
