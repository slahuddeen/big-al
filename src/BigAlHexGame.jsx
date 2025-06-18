// ==================== UNCONSTRAINED CAMERA SYSTEM ====================
import React, { useReducer, useEffect, useCallback, useState, useMemo } from 'react';
import { hexDistance, getHexNeighbors, hexToPixel } from './utils/hexMath.js';
import { TERRAIN_TYPES, getBackgroundGradient } from './data/terrain.js';
import { getTimeOfDay } from './game/gameConstants.js';
import { initialGameState, gameReducer } from './game/gameState.js';
import CreatureActivityPanel from './components/CreatureActivityPanel.jsx';
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

    // ============ UNCONSTRAINED MAP DRAGGING STATE ============
    const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    // ============ MAP BOUNDS (FOR INFO ONLY - NO CONSTRAINTS) ============
    const mapBounds = useMemo(() => {
        if (gameState.hexes.size === 0) {
            return { minX: -500, maxX: 500, minY: -500, maxY: 500 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        // Calculate actual pixel bounds by converting each hex position
        for (const hex of gameState.hexes.values()) {
            const pixel = hexToPixel(hex.q, hex.r);
            minX = Math.min(minX, pixel.x);
            maxX = Math.max(maxX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxY = Math.max(maxY, pixel.y);
        }

        // Add padding for hex size
        const hexSize = 42;
        const padding = hexSize * 1.5;

        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minY: minY - padding,
            maxY: maxY + padding
        };
    }, [gameState.hexes]);

    // ============ UNCONSTRAINED DRAGGING EVENT HANDLERS ============
    const handleMouseDown = useCallback((e) => {
        // Allow dragging unless clicking on hex tiles or UI elements
        if (!e.target.closest('.hex-tile') && !e.target.closest('[data-no-drag]')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setDragStartOffset({ ...cameraOffset });
            e.preventDefault();
        }
    }, [cameraOffset]);

    const handleMouseMove = useCallback((e) => {
        // Update mouse position for tooltips
        setMousePos({ x: e.clientX, y: e.clientY });

        // Handle map dragging - NO CONSTRAINTS
        if (isDragging) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;

            const newOffset = {
                x: dragStartOffset.x + deltaX,
                y: dragStartOffset.y + deltaY
            };

            // Apply NO constraints - camera can move anywhere
            setCameraOffset(newOffset);
        }
    }, [isDragging, dragStart, dragStartOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    // ============ UNCONSTRAINED KEYBOARD SHORTCUTS ============
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Reset camera with 'R' key
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
                setCameraOffset({ x: 0, y: 0 });
                console.log("🎥 Camera reset to center");
            }

            // Center on player with 'C' key
            if (e.key.toLowerCase() === 'c' && !e.ctrlKey) {
                const playerPixel = hexToPixel(gameState.player.q, gameState.player.r);
                setCameraOffset({ x: -playerPixel.x, y: -playerPixel.y });
                console.log("🎯 Camera centered on player");
            }

            // Show full map bounds with 'F' key
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey) {
                const centerX = (mapBounds.minX + mapBounds.maxX) / 2;
                const centerY = (mapBounds.minY + mapBounds.maxY) / 2;
                setCameraOffset({ x: -centerX, y: -centerY });
                console.log("🗺️ Camera showing full map");
            }

            // Arrow keys for precise camera movement - NO CONSTRAINTS
            const moveDistance = 100;
            let newOffset = { ...cameraOffset };

            if (e.key === 'ArrowUp') {
                newOffset.y += moveDistance;
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                newOffset.y -= moveDistance;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                newOffset.x += moveDistance;
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                newOffset.x -= moveDistance;
                e.preventDefault();
            }

            if (newOffset.x !== cameraOffset.x || newOffset.y !== cameraOffset.y) {
                // NO constraints applied
                setCameraOffset(newOffset);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [cameraOffset, gameState.player, mapBounds]);

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

    // ENHANCED: Independent creature behavior processing
    useEffect(() => {
        if (!gameState.gameOver && gameState.creatures.size > 0) {
            const creatureTurnTimer = setInterval(() => {
                // Only process if there are creatures and player isn't moving rapidly
                const totalCreatures = Array.from(gameState.creatures.values())
                    .reduce((total, creatures) => total + creatures.length, 0);

                if (totalCreatures > 0) {
                    // Add some randomness to make creature turns feel more natural
                    if (Math.random() < 0.8) { // 80% chance to process behaviors each cycle
                        dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
                    }
                }
            }, 4000); // Creatures act every 4 seconds

            return () => clearInterval(creatureTurnTimer);
        }
    }, [gameState.gameOver, gameState.creatures.size]);

    // ENHANCED: Debug functions for development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            // Add debug functions to window for testing
            window.testCreatureBehavior = (species) => {
                console.log(`🧪 Testing ${species} behavior...`);
                dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
            };

            window.listCreatures = () => {
                const allCreatures = [];
                for (const [hex, creatures] of gameState.creatures.entries()) {
                    creatures.forEach(c => {
                        allCreatures.push(`${c.species} at ${hex}`);
                    });
                }
                console.log('🦖 Current creatures:', allCreatures);
                return allCreatures;
            };

            window.showBehaviorLog = () => {
                console.log('🧠 Recent behaviors:', gameState.creatureBehaviorLog);
                return gameState.creatureBehaviorLog;
            };

            window.forceBehaviorUpdate = () => {
                console.log('🔄 Forcing creature behavior update...');
                dispatch({ type: 'PROCESS_CREATURE_BEHAVIORS' });
            };
        }

        // Cleanup debug functions
        return () => {
            if (process.env.NODE_ENV === 'development') {
                delete window.testCreatureBehavior;
                delete window.listCreatures;
                delete window.showBehaviorLog;
                delete window.forceBehaviorUpdate;
            }
        };
    }, [gameState.creatures, gameState.creatureBehaviorLog]);

    // Generate terrain features first
    useEffect(() => {
        if (!gameState.mapGenerated) {
            dispatch({ type: 'GENERATE_TERRAIN_FEATURES' });
        }
    }, [gameState.mapGenerated]);

    // Generate initial hexes around player
    useEffect(() => {
        if (!gameState.linearFeatures.length) return;

        const maxRange = 8; // Increased range for better exploration
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

    // ============ MAP BOUNDS INDICATOR ============
    const getBoundsInfo = () => {
        const totalHexes = gameState.hexes.size;
        const bounds = mapBounds;
        return {
            totalHexes,
            mapWidth: Math.round(bounds.maxX - bounds.minX),
            mapHeight: Math.round(bounds.maxY - bounds.minY)
        };
    };

    const boundsInfo = getBoundsInfo();

    // FIXED: Calculate ecosystem activity level - updates properly when creatures change
    const ecosystemInfo = useMemo(() => {
        const totalCreatures = Array.from(gameState.creatures.values())
            .reduce((total, creatures) => total + creatures.length, 0);
        const recentBehaviors = gameState.creatureBehaviorLog?.length || 0;

        return {
            totalCreatures,
            recentBehaviors,
            activityLevel: totalCreatures === 0 ? 'silent' :
                totalCreatures < 5 ? 'quiet' :
                    totalCreatures < 15 ? 'active' : 'bustling'
        };
    }, [gameState.creatures, gameState.creatureBehaviorLog]); // Dependencies ensure updates

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
            <div data-no-drag>
                <StatusPanel gameState={gameState} />
            </div>

            {/* Creatures Panel */}
            <div data-no-drag>
                <CreaturesPanel gameState={gameState} dispatch={dispatch} />
            </div>

            {/* ENHANCED: Creature Activity Panel */}
            <div data-no-drag>
                <CreatureActivityPanel gameState={gameState} />
            </div>

            {/* Camera Controls Info - Unlimited Movement */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg border border-amber-600" data-no-drag>
                <div className="font-bold text-amber-400 mb-2">🎮 Camera Controls (Unlimited)</div>
                <div className="space-y-1">
                    <div>🖱️ <strong>Drag</strong> anywhere to explore freely</div>
                    <div>⌨️ <strong>Arrow Keys</strong> for precise movement</div>
                    <div>📹 <strong>R</strong> - Reset to center</div>
                    <div>🎯 <strong>C</strong> - Center on player</div>
                    <div>🗺️ <strong>F</strong> - Show full map center</div>
                </div>

                {/* Map info */}
                <div className="mt-2 pt-2 border-t border-amber-600 text-gray-300">
                    <div>Map: {boundsInfo.totalHexes} hexes explored</div>
                    <div>Size: {Math.round(boundsInfo.mapWidth / 100)}×{Math.round(boundsInfo.mapHeight / 100)} units</div>
                    <div>Ecosystem: {ecosystemInfo.totalCreatures} creatures ({ecosystemInfo.activityLevel})</div>
                    {ecosystemInfo.recentBehaviors > 0 && (
                        <div className="text-green-400">
                            🧠 {ecosystemInfo.recentBehaviors} recent behaviors
                        </div>
                    )}
                    {isDragging && <div className="text-yellow-400 animate-pulse">📷 Free roaming...</div>}

                    {/* Show current camera offset */}
                    <div className="mt-2 pt-2 border-t border-amber-500 text-xs">
                        <div className="text-amber-400 font-bold">📍 Camera Position:</div>
                        <div>Offset: ({Math.round(cameraOffset.x)}, {Math.round(cameraOffset.y)})</div>
                    </div>
                </div>
            </div>

            {/* Hex World with No Viewport Clipping */}
            <div className="absolute inset-0">
                <div
                    className="relative"
                    style={{
                        // Large container to prevent clipping
                        width: '400vw',
                        height: '400vh',
                        // Center the large container in the viewport
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
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
                                onMouseDown={handleHexMouseDown}
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