import React from 'react';
import { hexToPixel } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA } from '../data/species.js';
import { LEVEL_NAMES } from '../game/gameState.js';
import ImageWithFallback from './ImageWithFallback.jsx';

const HexTile = ({
    hex,
    isPlayer,
    isSelected,
    isMovable,
    isHovered,
    onClick,
    onHover,
    onLeave,
    isNight,
    creatures,
    gameState // Add gameState to access level information
}) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    const terrain = TERRAIN_TYPES[hex.terrain];

    const baseSize = 80;
    const selectedSize = 95;
    const hoverSize = 90;

    let currentSize = baseSize;
    if (isSelected) currentSize = selectedSize;
    else if (isHovered && isMovable) currentSize = hoverSize;

    // Enhanced discovery-based visibility
    const isCurrentlyVisible = hex.visible && hex.inRange;
    const isDiscovered = hex.discovered;
    const isExplored = hex.visited;

    // Visual states based on discovery
    const getVisualState = () => {
        if (isCurrentlyVisible) return 'current';
        if (isDiscovered) return 'discovered';
        return 'hidden';
    };

    const visualState = getVisualState();

    // Apply different visual effects based on state
    const getStateEffects = () => {
        switch (visualState) {
            case 'current':
                return {
                    opacity: 1,
                    brightness: isNight ? 'brightness-50' : '',
                    overlay: ''
                };
            case 'discovered':
                if (['mountains', 'volcanic', 'quicksand'].includes(hex.terrain)) {
                    return {
                        opacity: 0.9,
                        brightness: 'brightness-90',
                        overlay: ''
                    };
                }
                return {
                    opacity: 0.7,
                    brightness: 'brightness-75',
                    overlay: 'bg-gray-900 bg-opacity-30'
                };
            case 'hidden':
                return {
                    opacity: 0,
                    brightness: '',
                    overlay: ''
                };
        }
    };

    const stateEffects = getStateEffects();

    // Don't render hidden tiles
    if (visualState === 'hidden') return null;

    const terrainColor = isNight ?
        `color-mix(in srgb, ${terrain.color} 40%, #1a1a2e)` :
        terrain.color;

    // Calculate z-index based on position - bottom hexes render on top, but keep all hexes behind UI
    const baseZIndex = 1 + hex.r; // Start very low, max around 20-30
    let zIndex = baseZIndex;
    if (isSelected) zIndex += 100; // Still much lower than UI
    else if (isMovable) zIndex += 50;
    if (isPlayer) zIndex += 200; // Player hex highest but still behind UI

    // Determine if this terrain should have overlapping visuals
    const isTallTerrain = ['forest', 'oldgrowthforest', 'denseforest', 'youngforest',
        'galleryforest', 'openwoods'].includes(hex.terrain);

    return (
        <div
            className={`absolute cursor-pointer transition-all duration-500 ease-out`}
            style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                zIndex: zIndex,
                opacity: stateEffects.opacity
            }}
            onClick={() => onClick(hex)}
            onMouseEnter={() => onHover(hex)}
            onMouseLeave={onLeave}
        >
            <div
                className={`hex-tile ${isTallTerrain ? 'terrain-tall' : ''} ${isMovable ? 'hex-movable' : ''} ${isSelected ? 'hex-selected' : ''
                    } ${isHovered && isMovable ? 'hex-hovered' : ''} ${!terrain.passable ? 'hex-impassable' : ''
                    } ${stateEffects.brightness}`}
                style={{
                    backgroundColor: terrainColor,
                    width: `${currentSize}px`,
                    height: `${currentSize}px`,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {/* Terrain image/emoji */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <ImageWithFallback
                        src={terrain.image}
                        fallback={terrain.emoji}
                        alt={terrain.name}
                        className={`pointer-events-none transition-all duration-300 text-lg`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            clipPath: isTallTerrain ? 'none' : 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)'
                        }}
                    />
                </div>

                {/* Discovery state overlay */}
                {visualState === 'discovered' && !['mountains', 'volcanic', 'quicksand'].includes(hex.terrain) && (
                    <div className={`absolute inset-0 ${stateEffects.overlay} hex-shape`} />
                )}

                {/* Big Al with proper image */}
                {isPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <ImageWithFallback
                            src={gameState?.level === 1 ? "/assets/dinos/hatchling.png" : "/assets/dinos/bigal.png"}
                            fallback={gameState?.level === 1 ? "🥚" : "🦖"}
                            alt="Big Al"
                            className="animate-gentle-bounce player-character"
                            style={{
                                width: gameState?.level === 1 ? '30px' :
                                    gameState?.level === 2 ? '40px' :
                                        gameState?.level === 3 ? '50px' : '60px', // Scale with level
                                height: gameState?.level === 1 ? '30px' :
                                    gameState?.level === 2 ? '40px' :
                                        gameState?.level === 3 ? '50px' : '60px',
                                objectFit: 'contain',
                                fontSize: gameState?.level === 1 ? '1.5rem' :
                                    gameState?.level === 2 ? '2rem' :
                                        gameState?.level === 3 ? '2.5rem' : '3rem',
                                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))'
                            }}
                        />
                    </div>
                )}

                {/* Show creature indicators only on currently visible tiles */}
                {creatures && creatures.length > 0 && !isPlayer && isCurrentlyVisible && (
                    <div className="absolute -top-3 -right-3 flex flex-wrap gap-1 z-10 max-w-12">
                        {creatures.slice(0, 6).map((creature, index) => {
                            const speciesData = SPECIES_DATA[creature.species];
                            return (
                                <div
                                    key={creature.id}
                                    className="w-6 h-6 rounded-full bg-red-500 bg-opacity-80 border-2 border-white text-xs flex items-center justify-center creature-indicator"
                                    title={creature.species}
                                >
                                    <ImageWithFallback
                                        src={speciesData.image}
                                        fallback={speciesData.emoji}
                                        alt={creature.species}
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            objectFit: 'contain',
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                </div>
                            );
                        })}
                        {creatures.length > 6 && (
                            <div className="w-6 h-6 rounded-full bg-gray-500 bg-opacity-80 border-2 border-white text-xs flex items-center justify-center text-white font-bold">
                                +{creatures.length - 6}
                            </div>
                        )}
                    </div>
                )}

                {/* Enhanced movable indicator */}
                {isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-20 hex-shape" />
                )}

                {/* Enhanced hover effect */}
                {isHovered && isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-30 hex-shape animate-pulse" />
                )}

                {/* Impassable terrain indicator */}
                {!terrain.passable && hex.terrain !== 'quicksand' && (
                    <div className="absolute inset-0 bg-red-900 bg-opacity-50 hex-shape" />
                )}

                {/* Special quicksand warning indicator */}
                {hex.terrain === 'quicksand' && isCurrentlyVisible && (
                    <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 hex-shape animate-pulse" />
                )}

                {/* Danger level indicator */}
                {terrain.dangerLevel > 0 && isCurrentlyVisible && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}

                {/* Discovery state indicator */}
                {visualState === 'discovered' && !isCurrentlyVisible && (
                    <div className="absolute bottom-1 left-1 w-2 h-2 bg-blue-400 rounded-full opacity-60"
                        title="Previously explored" />
                )}
            </div>

            {/* Enhanced player position indicator */}
            {isPlayer && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-70 px-3 py-1 rounded-full border border-amber-500">
                    ({hex.q},{hex.r})
                    {gameState?.level && (
                        <div className="text-amber-400 text-xs">
                            Level {gameState.level} {LEVEL_NAMES[gameState.level]}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HexTile;