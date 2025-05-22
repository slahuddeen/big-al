// Fixed EnhancedHexTile.tsx - Proper hexagon sizing to prevent art clipping
// components/EnhancedHexTile.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { axialToPixel } from '../utils/hexGrid';
import { ThreatLevels } from '../utils/predatorDanger';
import { contentRegistry } from '../utils/contentRegistry';
import { Creature } from '../types';

interface EnhancedHexTileProps {
    q: number;
    r: number;
    type: string;
    visible: boolean;
    visited: boolean;
    creatures: Creature[];
    isPlayer: boolean;
    isMother: boolean;
    isValidMove: boolean;
    isInMovementRange: boolean;
    territoryStrength?: number;
    predatorThreatLevel?: number;
    growthStage: number;
    weather?: string;
    timeOfDay?: string;
    season?: string;
    onClick: () => void;
    onHover?: () => void;
    darkMode: boolean;
}

const EnhancedHexTile: React.FC<EnhancedHexTileProps> = ({
    q, r, type, visible, visited, creatures,
    isPlayer, isMother, isValidMove, isInMovementRange,
    territoryStrength = 0,
    predatorThreatLevel,
    growthStage,
    weather = 'clear',
    timeOfDay = 'day',
    season = 'spring',
    onClick, onHover, darkMode
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const position = useMemo(() => axialToPixel(q, r), [q, r]);

    // GET TERRAIN CONFIG WITH BETTER ERROR HANDLING
    const terrainConfig = useMemo(() => {
        const config = contentRegistry.getTerrain(type);

        if (!config) {
            console.warn(`🚨 No terrain config found for type: "${type}" at ${q},${r}`);

            return {
                id: type,
                name: type.charAt(0).toUpperCase() + type.slice(1),
                color: getDefaultTerrainColor(type),
                imagePath: undefined,
                description: `Unknown terrain: ${type}`
            };
        }

        return config;
    }, [type, q, r]);

    // Fallback colors for known terrain types
    const getDefaultTerrainColor = (terrainType: string): string => {
        const colorMap: Record<string, string> = {
            'plains': 'bg-yellow-200',
            'forest': 'bg-green-600',
            'grassland': 'bg-green-300',
            'rocky': 'bg-gray-500',
            'riverbank': 'bg-blue-500',
            'lake': 'bg-blue-400',
            'marsh': 'bg-green-500',
            'cliff': 'bg-gray-700',
            'volcanic': 'bg-red-900',
            'nest': 'bg-amber-600',
            'denseforest': 'bg-green-800',
            'woods': 'bg-green-500',
            'jungle': 'bg-green-900',
            'shrubland': 'bg-yellow-600',
            'beach': 'bg-yellow-400',
            'mountain': 'bg-gray-700',
            'mesa': 'bg-orange-400',
            'savannah': 'bg-yellow-500',
            'desert': 'bg-yellow-700',
            'volcanic_fields': 'bg-red-800',
            'steppes': 'bg-yellow-600',
            'hills': 'bg-green-600',
            'sparse_forest': 'bg-green-400'
        };

        return colorMap[terrainType] || 'bg-gray-400';
    };

    // Improved styling calculation
    const styling = useMemo(() => {
        let backgroundImage = '';
        let backgroundColor = '';

        // Try to use image first
        if (terrainConfig.imagePath) {
            backgroundImage = `url(${terrainConfig.imagePath})`;
        }

        // Always set a background color as fallback
        if (terrainConfig.color) {
            backgroundColor = terrainConfig.color;
        } else {
            backgroundColor = getDefaultTerrainColor(type);
        }

        // Environmental effects
        let effectClasses = "";

        // Season effects
        if (season === 'summer' && (type === 'plains' || type === 'grassland')) {
            effectClasses += " brightness-110 saturate-75";
        } else if (season === 'fall' && (type === 'forest' || type === 'grassland')) {
            effectClasses += " brightness-125 hue-rotate-15";
        } else if (season === 'winter') {
            effectClasses += " brightness-125 saturate-50";
        } else if (season === 'spring' && (type === 'plains' || type === 'grassland' || type === 'forest')) {
            effectClasses += " brightness-100 saturate-125";
        }

        // Weather effects
        if (weather === 'rainy') {
            effectClasses += " brightness-75";
        } else if (weather === 'cloudy') {
            effectClasses += " brightness-90";
        }

        // Time of day effects
        if (timeOfDay === 'night') {
            effectClasses += " brightness-50 saturate-75";
        }

        return {
            backgroundImage,
            backgroundColor,
            effectClasses
        };
    }, [terrainConfig, type, season, weather, timeOfDay]);

    // Player appearance
    const playerAppearance = useMemo(() => {
        const size = Math.min(8, 4 + (growthStage * 2));
        const colors = ["bg-amber-300", "bg-amber-400", "bg-amber-500", "bg-amber-600"];
        const color = colors[Math.min(growthStage - 1, colors.length - 1)] || colors[0];

        return { size, color };
    }, [growthStage]);

    // Creature markers
    const creatureMarkers = useMemo(() => {
        if (!visible || !creatures.length || isPlayer || isMother) return null;

        return creatures.map((creature, idx) => {
            const creatureStyles: Record<string, string> = {
                centipede: "w-2 h-2 rounded-full bg-green-400",
                lizard: "w-2 h-2 rounded-full bg-green-400",
                dragonfly: "w-2 h-2 rounded-full bg-green-400",
                stegosaurus: "w-4 h-4 rounded-full bg-amber-400",
                diplodocus: "w-4 h-4 rounded-full bg-amber-400",
                brachiosaurus: "w-4 h-4 rounded-full bg-amber-400",
                allosaurus: "w-4 h-4 rounded-full bg-red-600",
                ceratosaurus: "w-4 h-4 rounded-full bg-red-600"
            };

            const creatureClass = creatureStyles[creature.type] || "w-3 h-3 rounded-full bg-red-500";

            return (
                <div
                    key={`${creature.id}-${idx}`}
                    className={`${creatureClass} m-1 z-10 shadow-sm transform transition-all ${isHovered ? 'scale-110' : ''
                        }`}
                />
            );
        });
    }, [visible, creatures, isPlayer, isMother, isHovered]);

    // Event handlers
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        onHover?.();
    }, [onHover]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    // Threat color
    const threatColor = useMemo(() => {
        if (predatorThreatLevel && predatorThreatLevel > 0) {
            const threatInfo = ThreatLevels[predatorThreatLevel];
            return `bg-${threatInfo.color}`;
        }
        return null;
    }, [predatorThreatLevel]);

    // Tooltip content
    const tooltipContent = useMemo(() => {
        if (!isHovered || !visible) return null;

        const parts = [terrainConfig.name || type];

        if (creatures.length > 0) {
            parts.push(`${creatures.length} creature${creatures.length > 1 ? 's' : ''}`);
        }

        if (predatorThreatLevel && predatorThreatLevel > 1) {
            const threatInfo = ThreatLevels[predatorThreatLevel];
            parts.push(`${threatInfo.name} Threat`);
        }

        return parts.join(' • ');
    }, [isHovered, visible, terrainConfig.name, type, creatures.length, predatorThreatLevel]);

    // FIXED: Proper hexagon dimensions that don't clip the art
    const hexWidth = 72;  // Increased from 64
    const hexHeight = 72; // Increased from 60 to match width (square container)

    return (
        <div
            className={`absolute hexagon ${styling.backgroundColor} ${styling.effectClasses} ${visible ? 'opacity-100' : 'opacity-20'
                } ${isValidMove ? 'cursor-pointer ring-2 ring-white ring-opacity-60' : ''
                } ${isInMovementRange ? 'ring-1 ring-yellow-300 ring-opacity-40' : ''
                } ${isHovered ? 'ring-2 ring-blue-500' : ''
                } transition-all duration-200`}
            style={{
                left: (position.x - hexWidth / 2) + 'px',  // Center the hex properly
                top: (position.y - hexHeight / 2) + 'px',  // Center the hex properly
                width: `${hexWidth}px`,
                height: `${hexHeight}px`,
                backgroundImage: styling.backgroundImage,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                // FIXED: Perfect hexagon clip-path that doesn't cut off art
                clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                // Alternative: you could also use a CSS mask instead of clip-path
                // maskImage: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                // maskSize: '100% 100%',
                // maskRepeat: 'no-repeat'
            }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="gridcell"
            aria-label={`Hex tile at ${q},${r}: ${terrainConfig.name || type}${creatures.length ? ` with ${creatures.length} creatures` : ''
                }`}
        >
            {/* Weather effect overlay */}
            {weather === 'rainy' && visible && (
                <div className="absolute inset-0 bg-blue-500 opacity-30 pointer-events-none">
                    <div className="rain-animation" />
                </div>
            )}

            {/* Territory indicator */}
            {territoryStrength > 0 && (
                <div
                    className="absolute inset-0 bg-amber-500 mix-blend-overlay pointer-events-none"
                    style={{ opacity: territoryStrength * 0.5 }}
                />
            )}

            {/* Predator threat indicator */}
            {threatColor && visible && (
                <div className={`absolute inset-0 ${threatColor} mix-blend-color pointer-events-none opacity-30`} />
            )}

            {/* Player indicator */}
            {isPlayer && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={`w-${playerAppearance.size} h-${playerAppearance.size} rounded-full ${playerAppearance.color} border-2 border-white z-10 shadow-md transform transition-all duration-300 ${isHovered ? 'scale-110' : ''
                            }`}
                    />
                </div>
            )}

            {/* Mother dinosaur indicator */}
            {isMother && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-orange-700 border-2 border-white z-10 shadow-md" />
                </div>
            )}

            {/* Creature markers */}
            {creatureMarkers && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {creatureMarkers}
                </div>
            )}

            {/* Hover tooltip */}
            {tooltipContent && (
                <div className="absolute -top-10 left-0 bg-gray-800 bg-opacity-90 text-white text-xs p-1 rounded whitespace-nowrap z-20">
                    {tooltipContent}
                </div>
            )}
        </div>
    );
};

export default React.memo(EnhancedHexTile);