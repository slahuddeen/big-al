import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio, calculateSuccessChance, calculateEnergyGain, debugCombatCalculations } from '../utils/combatUtils.js';
import ImageWithFallback from './ImageWithFallback.jsx';

const CreaturesPanel = ({ gameState, dispatch }) => {
    const playerKey = `${gameState.player.q},${gameState.player.r}`;
    const creatures = gameState.creatures.get(playerKey) || [];

    if (creatures.length === 0 || gameState.gameOver) return null;

    // NEW: Calculate energy gain preview using the safe function
    const calculateEnergyPreview = (speciesData, creatureSize) => {
        try {
            return calculateEnergyGain(speciesData, creatureSize, gameState.weight, gameState.level);
        } catch (error) {
            console.error("Error in energy preview:", error);
            return 5; // Safe fallback
        }
    };

    // NEW: Get creature weight in kg with appropriate formatting
    const getCreatureWeight = (speciesData, creatureSize) => {
        const weightKg = (speciesData.weight || 1) * creatureSize;

        if (weightKg < 0.001) {
            return `${Math.round(weightKg * 1000000)}mg`;
        } else if (weightKg < 1) {
            return `${Math.round(weightKg * 1000)}g`;
        } else if (weightKg < 1000) {
            return `${weightKg.toFixed(1)}kg`;
        } else {
            return `${(weightKg / 1000).toFixed(1)}t`;
        }
    };

    return (
        <div
            className="absolute top-4 right-4 w-80 bg-black bg-opacity-90 backdrop-blur-md rounded-xl border-2 border-amber-600 text-white flex flex-col transition-all duration-500 ease-out panel-enter overflow-hidden"
            style={{
                zIndex: 50000,
                maxHeight: creatures.length > 2 ? '85vh' : 'auto'
            }}
        >
            {/* Header */}
            <div className="p-3 border-b border-amber-600 gradient-overlay flex-shrink-0">
                <h3 className="font-bold text-center text-xl text-amber-400">
                    🎯 Creatures Present
                </h3>
                <div className="text-center text-sm text-gray-400">
                    {creatures.length} creature{creatures.length !== 1 ? 's' : ''} detected
                </div>
            </div>

            {/* Scrollable Creatures List - Only scroll if more than 2 creatures */}
            <div className={`flex-1 p-3 space-y-3 ${creatures.length > 2 ? 'overflow-y-auto creatures-panel-scroll' : ''}`}>
                {creatures.map((creature) => {
                    const speciesData = SPECIES_DATA[creature.species];

                    // Add validation for creature data
                    if (!speciesData) {
                        console.error(`Missing species data for: ${creature.species}`);
                        return null;
                    }

                    const fiercenessRatio = calculateFiercenessRatio(gameState.weight, gameState.fitness, speciesData, creature.size);
                    const agilityRatio = calculateAgilityRatio(gameState.weight, speciesData);
                    const successChance = calculateSuccessChance(gameState.weight, gameState.fitness, speciesData, creature.size);

                    // Validate calculated values
                    if (isNaN(fiercenessRatio) || isNaN(agilityRatio) || isNaN(successChance)) {
                        console.error("NaN detected in combat calculations:", {
                            creature: creature.species,
                            fiercenessRatio,
                            agilityRatio,
                            successChance,
                            playerWeight: gameState.weight,
                            playerFitness: gameState.fitness,
                            speciesData
                        });
                        return null; // Skip rendering this creature
                    }

                    // NEW: Energy and prey suitability calculations
                    const energyGain = calculateEnergyPreview(speciesData, creature.size);
                    const creatureWeight = getCreatureWeight(speciesData, creature.size);
                    const preyWeight = (speciesData.weight || 1) * creature.size;
                    const sizeRatio = preyWeight / gameState.weight;

                    // Enhanced threat level for styling with prey suitability
                    const getThreatLevel = () => {
                        if (successChance >= 70) {
                            // Check if prey is too small to be satisfying
                            if (energyGain < 5) return 'unsatisfying';
                            return 'safe';
                        }
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
                        unsatisfying: {
                            border: 'border-gray-500 border-glow-gray',
                            bg: 'bg-gray-900 bg-opacity-20',
                            text: 'text-gray-400',
                            button: 'bg-gray-600 hover:bg-gray-700 attack-button'
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

                    return (
                        <div
                            key={creature.id}
                            className={`rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden creature-card`}
                        >
                            {/* Large Creature Image Section */}
                            <div className="relative h-32 bg-gradient-to-b from-transparent via-transparent to-black bg-opacity-50 flex items-center justify-center gradient-overlay">
                                <ImageWithFallback
                                    src={speciesData.image}
                                    fallback={speciesData.emoji}
                                    alt={creature.species}
                                    className="object-contain creature-image-hover"
                                    style={{
                                        width: '140px',
                                        height: '140px',
                                        fontSize: '5rem',
                                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))'
                                    }}
                                />

                                {/* Success Chance Overlay */}
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg font-bold text-sm ${colors.bg} ${colors.border} border backdrop-blur-sm`}>
                                    <div className={`${colors.text} text-lg font-bold`}>
                                        {successChance}%
                                    </div>
                                    <div className="text-xs text-gray-300">
                                        success
                                    </div>
                                </div>

                                {/* Weight Indicator */}
                                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-900 bg-opacity-80 rounded-lg backdrop-blur-sm border border-blue-600">
                                    <div className="text-xs font-bold text-blue-300">
                                        {creatureWeight}
                                    </div>
                                </div>
                            </div>

                            {/* Creature Info */}
                            <div className="p-3">
                                {/* Name */}
                                <h4 className="font-bold text-lg text-center mb-3 text-white">
                                    {creature.species}
                                </h4>

                                {/* Compact Stats Grid - Now including Energy */}
                                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
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
                                    <div className="bg-purple-900 bg-opacity-40 rounded-md p-2 border border-purple-700">
                                        <div className="text-gray-400">Energy</div>
                                        <div className={`font-bold text-sm ${energyGain < 5 ? 'text-gray-400' : energyGain < 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            +{energyGain}
                                        </div>
                                    </div>
                                </div>

                                {/* NEW: Prey suitability warning */}
                                {threatLevel === 'unsatisfying' && (
                                    <div className="mb-3 p-2 bg-gray-800 bg-opacity-60 rounded border border-gray-600">
                                        <div className="text-xs text-gray-300 text-center">
                                            ⚠️ Too small to be satisfying
                                        </div>
                                    </div>
                                )}

                                {/* Enhanced agility warning for tiny prey */}
                                {sizeRatio < 0.01 && gameState.weight > 50 && (
                                    <div className="mb-3 p-2 bg-orange-800 bg-opacity-60 rounded border border-orange-600">
                                        <div className="text-xs text-orange-300 text-center">
                                            🏃 Very hard to catch!
                                        </div>
                                    </div>
                                )}

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

                                {/* Description - only show if there aren't too many creatures */}
                                {creatures.length <= 2 && (
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