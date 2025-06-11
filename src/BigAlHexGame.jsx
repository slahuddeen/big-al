// ==================== MAIN COMPONENT ====================
import React, { useReducer, useEffect, useCallback, useState } from 'react';
import { hexDistance, getHexNeighbors } from './utils/hexMath.js';
import { TERRAIN_TYPES, getBackgroundGradient } from './data/terrain.js';
import { getTimeOfDay } from './game/gameConstants.js';
import { initialGameState, gameReducer } from './game/gameState.js';

// Component imports
import HexTile from './components/HexTile.jsx';
import StatusPanel from './components/StatusPanel.jsx';
import CreaturesPanel from './components/CreaturesPanel.jsx';
import NotificationSystem from './components/NotificationSystem.jsx';
import DeathScreen from './components/DeathScreen.jsx';
import HoverTooltip from './components/HoverTooltip.jsx';

const BigAlHexGame = () => {
    const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Generate terrain features first
    useEffect(() => {
        if (!gameState.mapGenerated) {
            dispatch({ type: 'GENERATE_TERRAIN_FEATURES' });
        }
    }, [gameState.mapGenerated]);

    // Generate initial hexes around player
    useEffect(() => {
        if (!gameState.linearFeatures.length) return;

        const maxRange = 6;
        for (let dq = -maxRange; dq <= maxRange; dq++) {
            for (let dr = -maxRange; dr <= maxRange; dr++) {
                if (Math.abs(dq + dr) <= maxRange) {
                    const hexQ = gameState.player.q + dq;
                    const hexR = gameState.player.r + dr;
                    dispatch({ type: 'GENERATE_HEX', q: hexQ, r: hexR });
                }
            }
        }
    }, [gameState.player.q, gameState.player.r, gameState.linearFeatures]);

    // Update visibility when player moves
    useEffect(() => {
        dispatch({ type: 'UPDATE_VISIBILITY' });
    }, [gameState.player.q, gameState.player.r, gameState.hexes.size]);

    // Spawn creatures when moving to new location
    useEffect(() => {
        if (gameState.moveNumber > 0 && gameState.gamePhase === 'exploring') {
            setTimeout(() => {
                dispatch({ type: 'SPAWN_CREATURES' });
            }, 500);
        }
    }, [gameState.player.q, gameState.player.r, gameState.moveNumber]);

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleHexClick = useCallback((hex) => {
        if (gameState.gameOver) return;

        const distance = hexDistance(gameState.player, hex);
        const terrain = TERRAIN_TYPES[hex.terrain];

        if (distance === 0) {
            dispatch({ type: 'SELECT_HEX', hex });
        } else if (distance === 1 && hex.visible && terrain.passable) {
            dispatch({ type: 'MOVE_PLAYER', target: { q: hex.q, r: hex.r } });
        } else {
            dispatch({ type: 'SELECT_HEX', hex });
        }
    }, [gameState.player, gameState.gameOver]);

    const handleHexHover = useCallback((hex) => {
        dispatch({ type: 'HOVER_HEX', hex });
    }, []);

    const handleHexLeave = useCallback(() => {
        dispatch({ type: 'CLEAR_HOVER' });
    }, []);

    const getVisibleHexes = () => {
        return Array.from(gameState.hexes.values()).filter(hex => hex.visible);
    };

    const getMovableHexes = () => {
        if (gameState.gameOver) return [];
        const neighbors = getHexNeighbors(gameState.player);
        return neighbors.filter(neighbor => {
            const key = `${neighbor.q},${neighbor.r}`;
            const hex = gameState.hexes.get(key);
            return hex && hex.visible && TERRAIN_TYPES[hex.terrain].passable;
        });
    };

    const movableHexes = getMovableHexes();

    // Get current terrain and time info
    const currentHex = gameState.hexes.get(`${gameState.player.q},${gameState.player.r}`);
    const currentTerrain = currentHex ? currentHex.terrain : 'plains';
    const timeInfo = getTimeOfDay(gameState.moveNumber);

    return (
        <div
            className={`w-full h-screen bg-gradient-to-b ${getBackgroundGradient(currentTerrain, timeInfo)} relative overflow-hidden transition-all duration-1000`}
            onMouseMove={handleMouseMove}
        >
            {/* Status Panel */}
            <StatusPanel gameState={gameState} />

            {/* Creatures Panel */}
            <CreaturesPanel gameState={gameState} dispatch={dispatch} />

            {/* Hex World */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full overflow-hidden">
                    {getVisibleHexes().map((hex) => {
                        const isPlayer = hex.q === gameState.player.q && hex.r === gameState.player.r;
                        const isSelected = gameState.selectedHex?.q === hex.q && gameState.selectedHex?.r === hex.r;
                        const isMovable = movableHexes.some(m => m.q === hex.q && m.r === hex.r);
                        const isHovered = gameState.hoveredHex?.q === hex.q && gameState.hoveredHex?.r === hex.r;
                        const hexKey = `${hex.q},${hex.r}`;
                        const hexCreatures = gameState.creatures.get(hexKey) || [];

                        return (
                            <HexTile
                                key={`${hex.q}-${hex.r}`}
                                hex={hex}
                                isPlayer={isPlayer}
                                isSelected={isSelected}
                                isMovable={isMovable}
                                isHovered={isHovered}
                                isNight={timeInfo.isNight}
                                creatures={hexCreatures}
                                onClick={handleHexClick}
                                onHover={handleHexHover}
                                onLeave={handleHexLeave}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Hover Tooltip */}
            <HoverTooltip
                hex={gameState.hoveredHex}
                mousePos={mousePos}
                creatures={gameState.hoveredHex ? gameState.creatures.get(`${gameState.hoveredHex.q},${gameState.hoveredHex.r}`) : null}
            />

            {/* Death Screen */}
            <DeathScreen gameState={gameState} dispatch={dispatch} />

            {/* Notification System */}
            <NotificationSystem gameState={gameState} dispatch={dispatch} />
        </div>
    );
};

export default BigAlHexGame;