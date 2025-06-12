import React from 'react';
import { hexToPixel } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA } from '../data/species.js';
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
    creatures
}) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    const terrain = TERRAIN_TYPES[hex.terrain];

    const baseSize = 80;
    const selectedSize = 95;
    const hoverSize = 90;

    let currentSize = baseSize;
    if (isSelected) currentSize = selectedSize;
    else if (isHovered && isMovable) currentSize = hoverSize;

    const terrainColor = isNight ?
        `color-mix(in srgb, ${terrain.color} 40%, #1a1a2e)` :
        terrain.color;

    // Calculate z-index based on position - bottom hexes render on top
    const baseZIndex = 100 + hex.r * 10; // Higher r = lower on screen = higher z-index
    let zIndex = baseZIndex;
    if (isSelected) zIndex += 1000;
    else if (isMovable) zIndex += 50;
    if (isPlayer) zIndex += 500; // Player always on top

    // Determine if this terrain should have overlapping visuals (only forests)
    const isTallTerrain = ['forest', 'oldgrowthforest', 'denseforest', 'youngforest',
        'galleryforest', 'openwoods'].includes(hex.terrain);

    return (
        <div
            className={`absolute cursor-pointer transition-all duration-500 ease-out`}
            style={{
                left: x + 400,
                top: y + 300,
                transform: 'translate(-50%, -50%)',
                zIndex: zIndex
            }}
            onClick={() => onClick(hex)}
            onMouseEnter={() => onHover(hex)}
            onMouseLeave={onLeave}
        >
            <div
                className={`hex-tile ${isTallTerrain ? 'terrain-tall' : ''} ${isMovable ? 'hex-movable' : ''} ${isSelected ? 'hex-selected' : ''
                    } ${isHovered && isMovable ? 'hex-hovered' : ''} ${!terrain.passable ? 'hex-impassable' : ''
                    } ${isNight ? 'brightness-50' : ''}`}
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
                            // Only clip non-tall terrain to hex shape
                            clipPath: isTallTerrain ? 'none' : 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)'
                        }}
                    />
                </div>

                {/* Player dinosaur on top */}
                {isPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <ImageWithFallback
                            src="/assets/dinos/bigal.png"
                            fallback="🦖"
                            alt="Big Al"
                            className="animate-gentle-bounce"
                            style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'contain',
                                fontSize: '2.5rem'
                            }}
                        />
                    </div>
                )}

                {/* Show creature indicators */}
                {creatures && creatures.length > 0 && !isPlayer && (
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

                {isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-20 hex-shape" />
                )}

                {isHovered && isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-30 hex-shape" />
                )}

                {!terrain.passable && (
                    <div className="absolute inset-0 bg-red-900 bg-opacity-50 hex-shape" />
                )}

                {terrain.dangerLevel > 0 && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
            </div>

            {isPlayer && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-70 px-3 py-1 rounded-full">
                    {hex.q}, {hex.r}
                </div>
            )}
        </div>
    );
};

export default HexTile;