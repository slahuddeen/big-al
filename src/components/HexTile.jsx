import React from 'react';
import { hexToPixel } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA } from '../data/species.js';

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

    const baseSize = 50;
    const playerSize = 65;
    const hoverSize = 60;

    let currentSize = baseSize;
    if (isPlayer) currentSize = playerSize;
    else if (isHovered && isMovable) currentSize = hoverSize;

    const terrainColor = isNight ?
        `color-mix(in srgb, ${terrain.color} 40%, #1a1a2e)` :
        terrain.color;

    return (
        <div
            className={`absolute cursor-pointer transition-all duration-300 ease-out ${isSelected ? 'z-20' : isMovable ? 'z-15' : 'z-10'
                } ${isNight ? 'brightness-50' : ''}`}
            style={{
                left: x + 400,
                top: y + 300,
                transform: 'translate(-50%, -50%)'
            }}
            onClick={() => onClick(hex)}
            onMouseEnter={() => onHover(hex)}
            onMouseLeave={onLeave}
        >
            <div
                className={`hex-tile ${isMovable ? 'hex-movable' : ''} ${isSelected ? 'hex-selected' : ''
                    } ${isHovered && isMovable ? 'hex-hovered' : ''} ${!terrain.passable ? 'hex-impassable' : ''
                    }`}
                style={{
                    backgroundColor: terrainColor,
                    width: `${currentSize}px`,
                    height: `${currentSize}px`
                }}
            >
                <span className={`pointer-events-none transition-all duration-300 ${isPlayer ? 'text-2xl' : 'text-lg'
                    }`}>
                    {terrain.emoji}
                </span>

                {isPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl animate-bounce">🦖</span>
                    </div>
                )}

                {/* Show creature indicators */}
                {creatures && creatures.length > 0 && !isPlayer && (
                    <div className="absolute -top-2 -right-2 flex flex-wrap gap-1">
                        {creatures.slice(0, 3).map((creature, index) => (
                            <div
                                key={creature.id}
                                className="w-3 h-3 rounded-full bg-red-500 border border-white text-xs flex items-center justify-center"
                                title={creature.species}
                            >
                                {SPECIES_DATA[creature.species].emoji}
                            </div>
                        ))}
                    </div>
                )}

                {isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-20 animate-pulse hex-shape" />
                )}

                {isHovered && isMovable && (
                    <div className="absolute inset-0 bg-amber-400 bg-opacity-40 hex-shape animate-pulse" />
                )}

                {!terrain.passable && (
                    <div className="absolute inset-0 bg-red-900 bg-opacity-40 hex-shape" />
                )}

                {terrain.dangerLevel > 0 && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </div>

            {isPlayer && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                    {hex.q}, {hex.r}
                </div>
            )}
        </div>
    );
};

export default HexTile;