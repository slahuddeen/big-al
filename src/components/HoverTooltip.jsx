import React from 'react';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { SPECIES_DATA } from '../data/species.js';

const HoverTooltip = ({ hex, mousePos, creatures }) => {
    if (!hex) return null;

    const terrain = TERRAIN_TYPES[hex.terrain];

    return (
        <div
            className="fixed z-50 bg-black bg-opacity-90 text-white p-3 rounded-lg text-sm pointer-events-none border border-amber-600"
            style={{
                left: mousePos.x + 10,
                top: mousePos.y - 10,
                transform: 'translateY(-100%)'
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{terrain.emoji}</span>
                <div>
                    <div className="font-bold">{terrain.name}</div>
                    <div className="text-xs opacity-75">
                        {terrain.description}
                    </div>
                    <div className="text-xs text-gray-400">
                        Energy Cost: {terrain.energyCost} • Visibility: {terrain.visibility}
                        {terrain.dangerLevel > 0 ? ` • Danger: ${terrain.dangerLevel}` : ''}
                        {terrain.minWeight > 0 ? ` • Min Weight: ${terrain.minWeight}kg` : ''}
                    </div>
                </div>
            </div>

            {creatures && creatures.length > 0 && (
                <div className="border-t border-gray-600 pt-2">
                    <div className="text-xs font-bold text-amber-400 mb-1">Creatures:</div>
                    {creatures.map((creature, index) => (
                        <div key={creature.id} className="text-xs flex items-center gap-1">
                            <span>{SPECIES_DATA[creature.species].emoji}</span>
                            <span>{creature.species}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HoverTooltip;