import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio } from '../utils/combatUtils.js';
import ImageWithFallback from './ImageWithFallback.jsx';

const CreaturesPanel = ({ gameState, dispatch }) => {
    const playerKey = `${gameState.player.q},${gameState.player.r}`;
    const creatures = gameState.creatures.get(playerKey) || [];

    if (creatures.length === 0 || gameState.gameOver) return null;

    // Dynamic width and height based on creature count
    const getDimensions = () => {
        if (creatures.length === 1) {
            return {
                width: 'w-72',
                padding: 'p-3'
            };
        }
        if (creatures.length === 2) {
            return {
                width: 'w-80',
                padding: 'p-3'
            };
        }
        if (creatures.length <= 4) {
            return {
                width: 'w-96',
                padding: 'p-4'
            };
        }
        // For many creatures, use full width
        return {
            width: 'w-[28rem]', // 448px - extra wide for lots of creatures
            padding: 'p-4'
        };
    };

    const dimensions = getDimensions();

    // Dynamic spacing based on creature count
    const getSpacing = () => {
        if (creatures.length <= 2) return 'space-y-4';
        if (creatures.length <= 4) return 'space-y-3';
        return 'space-y-2'; // Tighter spacing for many creatures
    };

    return (
        <div
            className={`absolute top-4 right-4 ${dimensions.width} bg-black bg-opacity-90 backdrop-blur-md rounded-xl border-2 border-amber-600 text-white flex flex-col transition-all duration-500 ease-out panel-enter`}
            style={{ zIndex: 50000 }}
        >
            {/* Header */}
            <div className={`${dimensions.padding} border-b border-amber-600 gradient-overlay`}>
                <h3 className="font-bold text-center text-xl text-amber-400">
                    🎯 Creatures Present
                </h3>
                <div className="text-center text-sm text-gray-400">
                    {creatures.length} creature{creatures.length !== 1 ? 's' : ''} detected
                </div>
            </div>

            {/* Creatures List - No scroll, grows with content */}
            <div className={`${dimensions.padding} ${getSpacing()}`}>
                {creatures.map((creature) => {
                    const speciesData = SPECIES_DATA[creature.species];
                    const fiercenessRatio = calculateFiercenessRatio(gameState.weight, gameState.fitness, speciesData, creature.size);
                    const agilityRatio = calculateAgilityRatio(gameState.weight, speciesData);

                    // Success chance calculation
                    const successChance = Math.round((fiercenessRatio < 1 && agilityRatio < 1) ?
                        Math.max(20, 90 - (fiercenessRatio * 30) - (agilityRatio * 30)) :
                        (fiercenessRatio < 1) ? Math.max(10, 60 - (agilityRatio * 40)) :
                            Math.max(5, 30 - (fiercenessRatio * 20))
                    );

                    // Threat level for styling
                    const getThreatLevel = () => {
                        if (successChance >= 70) return 'safe';
                        if (successChance >= 40) return 'moderate';
                        return 'dangerous';
                    };

                    const threatLevel = getThreatLevel();
                    const threatColors = {
                        safe: {
                            border: 'border-green-500 border-glow-green',
                            bg: 'bg-green-900 bg-opacity-20',
                            text: 'text-green-400',
                            button: 'bg-green-600 hover:bg-green-700 attack-button'
                        },
                        moderate: {
                            border: 'border-yellow-500 border-glow-yellow',
                            bg: 'bg-yellow-900 bg-opacity-20',
                            text: 'text-yellow-400',
                            button: 'bg-yellow-600 hover:bg-yellow-700 attack-button'
                        },
                        dangerous: {
                            border: 'border-red-500 border-glow-red danger-pulse',
                            bg: 'bg-red-900 bg-opacity-20',
                            text: 'text-red-400',
                            button: 'bg-red-600 hover:bg-red-700 attack-button'
                        }
                    };

                    const colors = threatColors[threatLevel];

                    // Dynamic image size based on creature count
                    const getImageSize = () => {
                        if (creatures.length <= 2) return { width: '120px', height: '120px', containerHeight: 'h-32' };
                        if (creatures.length <= 4) return { width: '100px', height: '100px', containerHeight: 'h-28' };
                        return { width: '80px', height: '80px', containerHeight: 'h-24' }; // Smaller for many
                    };

                    const imageSize = getImageSize();

                    return (
                        <div
                            key={creature.id}
                            className={`rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden creature-card h-auto`}
                        >
                            {/* Large Creature Image */}
                            <div className={`relative ${imageSize.containerHeight} bg-gradient-to-b from-transparent via-transparent to-black bg-opacity-50 flex items-center justify-center gradient-overlay`}>
                                <ImageWithFallback
                                    src={speciesData.image}
                                    fallback={speciesData.emoji}
                                    alt={creature.species}
                                    className="object-contain creature-image-hover"
                                    style={{
                                        width: imageSize.width,
                                        height: imageSize.height,
                                        fontSize: creatures.length <= 2 ? '4rem' : creatures.length <= 4 ? '3rem' : '2.5rem',
                                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))'
                                    }}
                                />

                                {/* Success Chance Overlay */}
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg font-bold text-sm ${colors.bg} ${colors.border} border backdrop-blur-sm`}>
                                    <div className={`${colors.text} ${creatures.length <= 2 ? 'text-lg' : 'text-base'} font-bold`}>
                                        {successChance}%
                                    </div>
                                    <div className="text-xs text-gray-300">
                                        success
                                    </div>
                                </div>

                                {/* Size indicator */}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-60 rounded-lg backdrop-blur-sm">
                                    <div className="text-xs text-gray-300">Size</div>
                                    <div className={`${creatures.length <= 2 ? 'text-sm' : 'text-xs'} font-bold text-white`}>
                                        {(creature.size * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* Creature Info */}
                            <div className={creatures.length <= 2 ? 'p-3' : 'p-2'}>
                                {/* Name */}
                                <h4 className={`font-bold ${creatures.length <= 2 ? 'text-lg' : 'text-base'} text-center mb-2 text-white`}>
                                    {creature.species}
                                </h4>

                                {/* Compact Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                    <div className="bg-green-900 bg-opacity-40 rounded-md p-2 border border-green-700">
                                        <div className="text-gray-400">Nutrition</div>
                                        <div className="text-green-400 font-bold text-sm">
                                            {Math.round(speciesData.nutrition * creature.size)}
                                        </div>
                                    </div>
                                    <div className="bg-red-900 bg-opacity-40 rounded-md p-2 border border-red-700">
                                        <div className="text-gray-400">Danger</div>
                                        <div className="text-red-400 font-bold text-sm">
                                            {Math.round(speciesData.danger * creature.size)}
                                        </div>
                                    </div>
                                </div>

                                {/* Compact Stats Bars */}
                                <div className="space-y-1 mb-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Fierceness</span>
                                        <span className={`font-bold ${fiercenessRatio < 1 ? 'text-green-400' : 'text-red-400'}`}>
                                            {fiercenessRatio.toFixed(1)}x
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1">
                                        <div
                                            className={`h-1 rounded-full stat-bar-fill ${fiercenessRatio < 1 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, (1 / Math.max(0.1, fiercenessRatio)) * 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Agility</span>
                                        <span className={`font-bold ${agilityRatio < 1 ? 'text-green-400' : 'text-red-400'}`}>
                                            {agilityRatio.toFixed(1)}x
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1">
                                        <div
                                            className={`h-1 rounded-full stat-bar-fill ${agilityRatio < 1 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, (1 / Math.max(0.1, agilityRatio)) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Attack Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        dispatch({ type: 'ATTACK_CREATURE', creatureId: creature.id });
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className={`w-full ${colors.button} text-white py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 active:scale-95`}
                                    style={{
                                        zIndex: 55000,
                                        pointerEvents: 'all',
                                        position: 'relative'
                                    }}
                                >
                                    ⚔️ Attack
                                </button>

                                {/* Description - only show for fewer creatures */}
                                {creatures.length <= 3 && (
                                    <div className="mt-2 text-xs text-gray-400 italic text-center">
                                        {speciesData.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CreaturesPanel;