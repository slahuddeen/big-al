// components/EnhancedHexTile.tsx
import React, { useState } from 'react';
import { axialToPixel } from '../utils/hexGrid';
import { ThreatLevels } from '../utils/predatorDanger';
import { habitats } from '../utils/terrain'; // Import habitats

interface EnhancedHexTileProps {
    q: number;
    r: number;
    type: string;
    visible: boolean;
    visited: boolean;
    creatures: any[];
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
    territoryStrength, predatorThreatLevel, growthStage,
    weather, timeOfDay, season,
    onClick, onHover, darkMode
}) => {
    const { x, y } = axialToPixel(q, r);
    const [isHovered, setIsHovered] = useState(false);
    const habitat = habitats[type];

    // Get the image path from habitat
    const backgroundImage = habitat?.imagePath ? `url(${habitat.imagePath})` : '';

    // Fallback color if image is not available
    let fallbackColor = "bg-gray-700";
    if (type === 'plains') fallbackColor = "bg-amber-200";
    if (type === 'forest') fallbackColor = "bg-green-700";
    if (type === 'grassland') fallbackColor = "bg-green-300";
    if (type === 'rocky') fallbackColor = "bg-gray-500";
    if (type === 'riverbank') fallbackColor = "bg-blue-500";
    if (type === 'lake') fallbackColor = "bg-blue-400";
    if (type === 'marsh') fallbackColor = "bg-green-500";
    if (type === 'cliff') fallbackColor = "bg-gray-700";
    if (type === 'volcanic') fallbackColor = "bg-red-900";
    if (type === 'nest') fallbackColor = "bg-amber-600";

    // Apply season modifiers
    let seasonClass = "";
    if (season === 'summer' && (type === 'plains' || type === 'grassland')) {
        seasonClass = "brightness-110 saturate-75"; // Brighter, more dried out
    } else if (season === 'fall' && (type === 'forest' || type === 'grassland')) {
        seasonClass = "brightness-125 hue-rotate-15"; // Fall colors
    } else if (season === 'winter') {
        seasonClass = "brightness-125 saturate-50"; // Winter colors
    } else if (season === 'spring' && (type === 'plains' || type === 'grassland' || type === 'forest')) {
        seasonClass = "brightness-100 saturate-125"; // Vibrant spring
    }

    // Apply weather effects
    let weatherClass = "";
    if (weather === 'rainy') {
        weatherClass = "brightness-75";
    } else if (weather === 'cloudy') {
        weatherClass = "brightness-90";
    }

    // Apply time of day
    let timeClass = "";
    if (timeOfDay === 'night') {
        timeClass = "brightness-50 saturate-75";
    }

    // Combine all visual effects
    const visualEffects = `${seasonClass} ${weatherClass} ${timeClass}`;

    // Determine player appearance based on growth stage
    const playerSize = 4 + (growthStage * 2); // Gets bigger with growth
    const playerColor =
        growthStage === 1 ? "bg-amber-300" :
            growthStage === 2 ? "bg-amber-400" :
                growthStage === 3 ? "bg-amber-500" : "bg-amber-600";

    // Get threat color if this tile has dangerous creatures
    let threatColor = null;
    if (predatorThreatLevel && predatorThreatLevel > 0) {
        const threatInfo = ThreatLevels[predatorThreatLevel];
        threatColor = `bg-${threatInfo.color}`;
    }

    return (
        <div
            className={`absolute hexagon ${!backgroundImage ? fallbackColor : ''} ${visualEffects} ${visible ? 'opacity-100' : 'opacity-20'}
                ${isValidMove ? 'cursor-pointer ring-2 ring-white ring-opacity-60' : ''}
                ${isInMovementRange ? 'ring-1 ring-yellow-300 ring-opacity-40' : ''}
                ${isHovered ? 'ring-2 ring-blue-500' : ''}
                transition-all duration-200`}
            style={{
                left: x + 'px',
                top: y + 'px',
                width: '64px',
                height: '55px',
                backgroundImage: backgroundImage,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
            onClick={onClick}
            onMouseEnter={() => {
                setIsHovered(true);
                if (onHover) onHover();
            }}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Weather effect overlay */}
            {weather === 'rainy' && visible && (
                <div className="absolute inset-0 bg-blue-500 opacity-30 pointer-events-none">
                    <div className="rain-animation"></div>
                </div>
            )}

            {/* Territory indicator */}
            {territoryStrength > 0 && (
                <div
                    className="absolute inset-0 bg-amber-500 mix-blend-overlay pointer-events-none"
                    style={{ opacity: territoryStrength * 0.5 }}
                ></div>
            )}

            {/* Predator threat indicator */}
            {threatColor && visible && (
                <div className={`absolute inset-0 ${threatColor} mix-blend-color pointer-events-none opacity-30`}></div>
            )}

            {/* Show player with dynamic appearance */}
            {isPlayer && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={`w-${playerSize} h-${playerSize} rounded-full ${playerColor} border-2 border-white z-10
                                  shadow-md transform transition-all duration-300
                                  ${isHovered ? 'scale-110' : ''}`}
                    />
                </div>
            )}

            {/* Show mother dinosaur */}
            {isMother && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-orange-700 border-2 border-white z-10 shadow-md"></div>
                </div>
            )}

            {/* Show creatures with more distinctive markers */}
            {visible && creatures && creatures.length > 0 && !isPlayer && !isMother && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {creatures.map((creature, idx) => {
                        // Different creature types have different appearances
                        let creatureClass = "w-3 h-3 rounded-full bg-red-500";

                        // Example: smaller creatures are smaller dots
                        if (creature.type === 'centipede' || creature.type === 'lizard' || creature.type === 'dragonfly') {
                            creatureClass = "w-2 h-2 rounded-full bg-green-400";
                        }
                        // Large herbivores are bigger
                        else if (creature.type === 'stegosaurus' || creature.type === 'diplodocus' || creature.type === 'brachiosaurus') {
                            creatureClass = "w-4 h-4 rounded-full bg-amber-400";
                        }
                        // Other predators are red
                        else if (creature.type === 'allosaurus' || creature.type === 'ceratosaurus') {
                            creatureClass = "w-4 h-4 rounded-full bg-red-600";
                        }

                        return (
                            <div key={idx} className={`${creatureClass} m-1 z-10 shadow-sm transform transition-all 
                                                      ${isHovered ? 'scale-110' : ''}`}></div>
                        );
                    })}
                </div>
            )}

            {/* Show tile details on hover */}
            {isHovered && visible && (
                <div className="absolute -top-10 left-0 bg-gray-800 bg-opacity-90 text-white text-xs p-1 rounded whitespace-nowrap z-20">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {creatures.length > 0 && ` • ${creatures.length} creature${creatures.length > 1 ? 's' : ''}`}
                    {predatorThreatLevel && predatorThreatLevel > 1 && (
                        <span className={`ml-1 text-${ThreatLevels[predatorThreatLevel].color}`}>
                            • {ThreatLevels[predatorThreatLevel].name} Threat
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default EnhancedHexTile;