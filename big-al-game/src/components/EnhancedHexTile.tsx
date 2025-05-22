// PROBLEM: Hex tiles aren't using terrain configs for visual styling
// SOLUTION: Update EnhancedHexTile to use content registry for colors/images

// 1. Update your EnhancedHexTile.tsx to use terrain configs
// =========================================================

import React, { useState, useMemo, useCallback } from 'react';
import { axialToPixel } from '../utils/hexGrid';
import { ThreatLevels } from '../utils/predatorDanger';
import { contentRegistry } from '../utils/contentRegistry'; // ADD THIS IMPORT
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

    // GET TERRAIN CONFIG FROM REGISTRY (this is the key fix!)
    const terrainConfig = useMemo(() => {
        return contentRegistry.getTerrain(type) || {
            name: type,
            color: 'bg-gray-500', // fallback
            imagePath: undefined,
            description: 'Unknown terrain'
        };
    }, [type]);

    // Memoize visual styling using terrain config
    const styling = useMemo(() => {
        // Use terrain config for background image and color
        const backgroundImage = terrainConfig.imagePath ? `url(${terrainConfig.imagePath})` : '';
        const fallbackColor = terrainConfig.color || 'bg-gray-500';

        // Apply environmental effects
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
            fallbackColor,
            effectClasses
        };
    }, [terrainConfig, type, season, weather, timeOfDay]);

    // Debug logging (remove this once it's working)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        console.log(`🎨 Hex ${type} styling:`, {
            config: terrainConfig,
            backgroundImage: styling.backgroundImage,
            fallbackColor: styling.fallbackColor
        });
    }

    // Memoize player appearance
    const playerAppearance = useMemo(() => {
        const size = Math.min(8, 4 + (growthStage * 2)); // Cap at reasonable size
        const colors = ["bg-amber-300", "bg-amber-400", "bg-amber-500", "bg-amber-600"];
        const color = colors[Math.min(growthStage - 1, colors.length - 1)] || colors[0];

        return { size, color };
    }, [growthStage]);

    // Memoize creature markers
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

    // Threat color calculation
    const threatColor = useMemo(() => {
        if (predatorThreatLevel && predatorThreatLevel > 0) {
            const threatInfo = ThreatLevels[predatorThreatLevel];
            return `bg-${threatInfo.color}`;
        }
        return null;
    }, [predatorThreatLevel]);

    // Hover tooltip content
    const tooltipContent = useMemo(() => {
        if (!isHovered || !visible) return null;

        const parts = [type.charAt(0).toUpperCase() + type.slice(1)];

        if (creatures.length > 0) {
            parts.push(`${creatures.length} creature${creatures.length > 1 ? 's' : ''}`);
        }

        if (predatorThreatLevel && predatorThreatLevel > 1) {
            const threatInfo = ThreatLevels[predatorThreatLevel];
            parts.push(`${threatInfo.name} Threat`);
        }

        return parts.join(' • ');
    }, [isHovered, visible, type, creatures.length, predatorThreatLevel]);

    return (
        <div
            className={`absolute hexagon ${!styling.backgroundImage ? styling.fallbackColor : ''} ${styling.effectClasses} ${visible ? 'opacity-100' : 'opacity-20'
                } ${isValidMove ? 'cursor-pointer ring-2 ring-white ring-opacity-60' : ''
                } ${isInMovementRange ? 'ring-1 ring-yellow-300 ring-opacity-40' : ''
                } ${isHovered ? 'ring-2 ring-blue-500' : ''
                } transition-all duration-200`}
            style={{
                left: position.x + 'px',
                top: position.y + 'px',
                width: '64px',
                height: '60px',
                backgroundImage: styling.backgroundImage,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="gridcell"
            aria-label={`Hex tile at ${q},${r}: ${type}${creatures.length ? ` with ${creatures.length} creatures` : ''}`}
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