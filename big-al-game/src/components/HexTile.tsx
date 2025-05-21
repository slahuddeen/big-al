// components/HexTile.tsx
import React from 'react';
import { axialToPixel } from '../utils/hexGrid';
import { habitats } from '../utils/terrain'; // Import habitats

interface HexTileProps {
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
    onClick: () => void;
    onHover?: () => void;
    darkMode: boolean;
}

const HexTile: React.FC<HexTileProps> = ({
    q, r, type, visible, visited, creatures,
    isPlayer, isMother, isValidMove, isInMovementRange,
    onClick, onHover, darkMode
}) => {
    const { x, y } = axialToPixel(q, r);
    const habitat = habitats[type];

    // Get the image path from habitat or use a fallback color
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

    return (
        <div
            className={`absolute hexagon ${!backgroundImage ? fallbackColor : ''} ${visible ? 'opacity-100' : 'opacity-20'}
                ${isValidMove ? 'cursor-pointer ring-2 ring-white ring-opacity-60' : ''}
                ${isInMovementRange ? 'ring-1 ring-yellow-300 ring-opacity-40' : ''}`}
            style={{
                left: x + 'px',
                top: y + 'px',
                width: '64px',
                height: '55px',
                backgroundImage: backgroundImage,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'all 0.2s ease',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
            onClick={onClick}
            onMouseEnter={onHover}
        >
            {/* Show player */}
            {isPlayer && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full ${darkMode ? 'bg-amber-500' : 'bg-amber-600'} border-2 border-white z-10`}></div>
                </div>
            )}

            {/* Show mother */}
            {isMother && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-orange-700 border-2 border-white z-10"></div>
                </div>
            )}

            {/* Show creatures */}
            {visible && creatures && creatures.length > 0 && !isPlayer && !isMother && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 z-10"></div>
                </div>
            )}
        </div>
    );
};

export default HexTile;