// ==================== MAIN COMPONENT WITH HATCHLING SYSTEM ====================
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
import ImageWithFallback from './components/ImageWithFallback.jsx';

const BigAlHexGame = () => {
    const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // ============ MAP DRAGGING STATE ============
    const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    // ============ DRAGGING EVENT HANDLERS ============
    const handleMouseDown = useCallback((e) => {
        console.log("🖱️ Mouse down:", e.target, e.currentTarget, e.target === e.currentTarget);

        // Try a more permissive check - let's see if this works
        // if (e.target === e.currentTarget) {  // Original restrictive check
        if (!e.target.closest('.hex-tile')) {  // New: Allow dragging unless clicking on hex
            console.log("✅ Starting drag");
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setDragStartOffset({ ...cameraOffset });
            e.preventDefault();
        } else {
            console.log("❌ Not starting drag - clicked on hex");
        }
    }, [cameraOffset]);

    const handleMouseMove = useCallback((e) => {
        // Update mouse position for tooltips
        setMousePos({ x: e.clientX, y: e.clientY });

        // Handle map dragging
        if (isDragging) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;

            setCameraOffset({
                x: dragStartOffset.x + deltaX,
                y: dragStartOffset.y + deltaY
            });
        }
    }, [isDragging, dragStart, dragStartOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    // ============ KEYBOARD SHORTCUTS ============
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Reset camera with 'R' key
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
                setCameraOffset({ x: 0, y: 0 });
                console.log("🎥 Camera reset to player position");
            }

            // Center on player with 'C' key
            if (e.key.toLowerCase() === 'c' && !e.ctrlKey) {
                setCameraOffset({ x: 0, y: 0 });
                console.log("🎯 Camera centered on player");
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // ============ HEX INTERACTION HANDLERS ============
    const handleHexClick = useCallback((hex) => {
        if (isDragging) return; // Don't process hex clicks while dragging

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
    }, [gameState.player, gameState.gameOver, isDragging]);

    const handleHexHover = useCallback((hex) => {
        if (!isDragging) { // Only show hover when not dragging
            dispatch({ type: 'HOVER_HEX', hex });
        }
    }, [isDragging]);

    const handleHexLeave = useCallback(() => {
        if (!isDragging) {
            dispatch({ type: 'CLEAR_HOVER' });
        }
    }, [isDragging]);

    // ============ HEX MOUSE EVENTS ============
    const handleHexMouseDown = useCallback((e) => {
        // Prevent map dragging when clicking on hexes
        e.stopPropagation();
    }, []);

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
        const hexesToGenerate = new Set();

        // Generate hexes around current player position
        for (let dq = -maxRange; dq <= maxRange; dq++) {
            for (let dr = -maxRange; dr <= maxRange; dr++) {
                if (Math.abs(dq + dr) <= maxRange) {
                    const hexQ = gameState.player.q + dq;
                    const hexR = gameState.player.r + dr;
                    const hexKey = `${hexQ},${hexR}`;
                    hexesToGenerate.add(hexKey);
                }
            }
        }

        // Check which hexes need to be generated (don't already exist)
        for (const hexKey of hexesToGenerate) {
            if (!gameState.hexes.has(hexKey)) {
                const [q, r] = hexKey.split(',').map(Number);
                dispatch({ type: 'GENERATE_HEX', q, r });
            }
        }

        // IMPORTANT: Don't remove old hexes! Keep all discovered hexes forever
        // The visibility system will handle showing/hiding them appropriately

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

    // ============ HELPER FUNCTIONS ============
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
            className={`w-full h-screen bg-gradient-to-b ${getBackgroundGradient(currentTerrain, timeInfo)} relative overflow-hidden transition-all duration-1000 ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ userSelect: 'none' }} // Prevent text selection while dragging
        >
            {/* Status Panel */}
            <StatusPanel gameState={gameState} />

            {/* Creatures Panel */}
            <CreaturesPanel gameState={gameState} dispatch={dispatch} />

            {/* Camera Controls Info */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs p-2 rounded">
                <div>🖱️ Drag empty space to move camera</div>
                <div>📹 Press 'R' to reset camera</div>
                <div>🎯 Press 'C' to center on player</div>
                {isDragging && <div className="text-yellow-400">📷 Dragging camera...</div>}
            </div>

            {/* Hex World with Camera Offset */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="relative w-full h-full overflow-hidden"
                    style={{
                        transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
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
                                gameState={gameState}
                                onClick={handleHexClick}
                                onHover={handleHexHover}
                                onLeave={handleHexLeave}
                                onMouseDown={handleHexMouseDown} // Prevent dragging on hexes
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