import React from 'react';
import { getTimeOfDay, DAY_LENGTH, NIGHT_LENGTH } from '../game/gameConstants.js';
import { LEVEL_NAMES, LEVEL_WEIGHTS } from '../game/gameState.js';

const StatusPanel = ({ gameState }) => {
    const getStatusColor = (value, thresholds = [30, 70]) => {
        if (value <= thresholds[0]) return 'bg-red-500';
        if (value <= thresholds[1]) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const timeInfo = getTimeOfDay(gameState.moveNumber);

    // Calculate level progression
    const getCurrentLevelProgress = () => {
        const currentLevel = gameState.level;
        if (currentLevel >= LEVEL_WEIGHTS.length - 1) {
            return { progress: 100, nextWeight: null, isMaxLevel: true };
        }

        const currentThreshold = LEVEL_WEIGHTS[currentLevel - 1] || 0;
        const nextThreshold = LEVEL_WEIGHTS[currentLevel];
        const progress = Math.min(100, Math.max(0,
            ((gameState.weight - currentThreshold) / (nextThreshold - currentThreshold)) * 100
        ));

        return {
            progress: Math.round(progress),
            nextWeight: nextThreshold,
            isMaxLevel: false
        };
    };

    const levelProgress = getCurrentLevelProgress();

    // Calculate discovery statistics
    const getDiscoveryStats = () => {
        const totalHexes = gameState.hexes.size;
        const discoveredHexes = Array.from(gameState.hexes.values()).filter(hex => hex.discovered).length;
        const exploredHexes = Array.from(gameState.hexes.values()).filter(hex => hex.visited).length;

        return {
            total: totalHexes,
            discovered: discoveredHexes,
            explored: exploredHexes,
            discoveryPercentage: totalHexes > 0 ? Math.round((discoveredHexes / totalHexes) * 100) : 0
        };
    };

    const discoveryStats = getDiscoveryStats();

    // Get appropriate emoji for level
    const getLevelEmoji = (level) => {
        switch (level) {
            case 1: return '🥚'; // Hatchling
            case 2: return '🦴'; // Juvenile  
            case 3: return '🦖'; // Sub-adult
            case 4: return '👑'; // Adult
            default: return '🦖';
        }
    };

    // Enhanced weight display formatting for 300g baseline
    const formatWeight = (weight) => {
        if (weight < 1) {
            return `${Math.round(weight * 1000)}g`;
        } else if (weight < 1000) {
            return `${weight.toFixed(1)}kg`;
        } else {
            return `${(weight / 1000).toFixed(1)}t`;
        }
    };

    return (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 backdrop-blur-sm rounded-xl border-2 border-amber-600 p-4 text-white">
            <h3 className="font-bold mb-3 text-lg text-amber-400">
                {getLevelEmoji(gameState.level)} Big Al - {LEVEL_NAMES[gameState.level] || 'Unknown'}
            </h3>

            <div className="space-y-2 mb-4">
                {/* Enhanced Weight and Level Progress for 300g baseline */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span>Weight:</span>
                        <span className="font-mono text-amber-300">{formatWeight(gameState.weight)}</span>
                    </div>

                    {!levelProgress.isMaxLevel && (
                        <>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Growth Progress:</span>
                                <span>{levelProgress.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-600 rounded">
                                <div
                                    className="h-full rounded bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-500"
                                    style={{ width: `${levelProgress.progress}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 text-center">
                                Next: {LEVEL_NAMES[gameState.level + 1]} at {formatWeight(levelProgress.nextWeight)}
                            </div>
                        </>
                    )}

                    {levelProgress.isMaxLevel && (
                        <div className="text-xs text-yellow-400 text-center font-bold">
                            ⭐ Maximum Size Reached! ⭐
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span>Energy:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-600 rounded">
                            <div
                                className={`h-full rounded ${getStatusColor(gameState.energy)}`}
                                style={{ width: `${gameState.energy}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono">{Math.round(gameState.energy)}%</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span>Fitness:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-600 rounded">
                            <div
                                className={`h-full rounded ${getStatusColor(gameState.fitness)}`}
                                style={{ width: `${gameState.fitness}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono">{Math.round(gameState.fitness)}%</span>
                    </div>
                </div>
            </div>

            {/* Enhanced Hunting Tips for 300g Hatchling */}
            {/*{gameState.level <= 2 && (*/}
            {/*    <div className="border-t border-amber-600 pt-2 mb-4">*/}
            {/*        <div className="flex items-center justify-between mb-2">*/}
            {/*            <span className="text-sm font-bold text-green-400">🎯 Hunting Tips</span>*/}
            {/*            <span className="text-xs text-green-300">Level {gameState.level}</span>*/}
            {/*        </div>*/}

            {/*        {gameState.level === 1 ? (*/}
            {/*            <div className="text-xs text-green-400 bg-green-900 bg-opacity-30 p-2 rounded border border-green-600">*/}
            {/*                🥚 At 300g, bugs are perfect prey! Hunt dragonflies, centipedes, and crickets in forests!*/}
            {/*            </div>*/}
            {/*        ) : (*/}
            {/*            <div className="text-xs text-yellow-400 bg-yellow-900 bg-opacity-30 p-2 rounded border border-yellow-600">*/}
            {/*                🦴 Growing bigger! Bugs are less filling now - time for lizards, frogs, and small mammals!*/}
            {/*            </div>*/}
            {/*        )}*/}

            {/*        <div className="text-xs text-gray-400 mt-1">*/}
            {/*            {gameState.level === 1 ?*/}
            {/*                "Dense forests have the most insects - your ideal hunting ground!" :*/}
            {/*                "Forest edges and plains offer larger prey for your growing appetite!"*/}
            {/*            }*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*)}*/}

            {/* Discovery Section */}
            <div className="border-t border-amber-600 pt-2 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-400">🗺️ Exploration</span>
                    <span className="text-xs text-blue-300">{discoveryStats.discoveryPercentage}%</span>
                </div>

                <div className="w-full h-1.5 bg-gray-700 rounded mb-1">
                    <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded transition-all duration-500"
                        style={{ width: `${discoveryStats.discoveryPercentage}%` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                    <span>📍 Visited: {discoveryStats.explored}</span>
                    <span>👁️ Seen: {discoveryStats.discovered}</span>
                </div>
            </div>

            <div className="border-t border-amber-600 pt-2">
                <div className="flex items-center justify-between">
                    <span>Score:</span>
                    <span className="font-mono font-bold text-yellow-400">{gameState.score}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span>Turn:</span>
                    <span className="font-mono">{gameState.moveNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span>Time:</span>
                    <span className="font-mono text-cyan-400">
                        {timeInfo.isNight ? '🌙 Night' : '☀️ Day'} ({timeInfo.turnInCycle + 1}/{timeInfo.isNight ? NIGHT_LENGTH : DAY_LENGTH})
                    </span>
                </div>
            </div>

            {/* Enhanced Level-based Growth Tips for 300g scaling */}
            {/*{gameState.level === 1 && (*/}
            {/*    <div className="mt-2 px-2 py-1 bg-purple-900 bg-opacity-50 rounded text-xs text-purple-300 border border-purple-600">*/}
            {/*        🥚 300g Hatchling: Dragonflies and centipedes are your bread and butter!*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{gameState.level === 2 && (*/}
            {/*    <div className="mt-2 px-2 py-1 bg-green-900 bg-opacity-50 rounded text-xs text-green-300 border border-green-600">*/}
            {/*        🦴 Growing Juvenile: Bugs won't cut it anymore - hunt lizards and mammals!*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{gameState.level === 3 && (*/}
            {/*    <div className="mt-2 px-2 py-1 bg-orange-900 bg-opacity-50 rounded text-xs text-orange-300 border border-orange-600">*/}
            {/*        💪 Sub-adult: Medium prey like small dinosaurs are now viable targets!*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{gameState.level === 4 && (*/}
            {/*    <div className="mt-2 px-2 py-1 bg-red-900 bg-opacity-50 rounded text-xs text-red-300 border border-red-600">*/}
            {/*        👑 Adult: Only large prey will sustain your massive frame!*/}
            {/*    </div>*/}
            {/*)}*/}

            {/* Discovery Achievement Indicators */}
            {discoveryStats.discoveryPercentage >= 25 && (
                <div className="mt-2 px-2 py-1 bg-blue-900 bg-opacity-50 rounded text-xs text-blue-300 border border-blue-600">
                    🏆 Explorer: 25% discovered!
                </div>
            )}
            {discoveryStats.discoveryPercentage >= 50 && (
                <div className="mt-1 px-2 py-1 bg-purple-900 bg-opacity-50 rounded text-xs text-purple-300 border border-purple-600">
                    🗺️ Cartographer: 50% mapped!
                </div>
            )}
            {discoveryStats.discoveryPercentage >= 75 && (
                <div className="mt-1 px-2 py-1 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-300 border border-yellow-600">
                    🌟 Master Explorer: 75% complete!
                </div>
            )}
        </div>
    );
};

export default StatusPanel;