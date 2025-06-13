import React from 'react';
import { getTimeOfDay, DAY_LENGTH, NIGHT_LENGTH } from '../game/gameConstants.js';

const StatusPanel = ({ gameState }) => {
    const getStatusColor = (value, thresholds = [30, 70]) => {
        if (value <= thresholds[0]) return 'bg-red-500';
        if (value <= thresholds[1]) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const timeInfo = getTimeOfDay(gameState.moveNumber);

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

    return (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 backdrop-blur-sm rounded-xl border-2 border-amber-600 p-4 text-white">
            <h3 className="font-bold mb-3 text-lg text-amber-400">🦖 Big Al - Level {gameState.level}</h3>

            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span>Weight:</span>
                    <span className="font-mono text-amber-300">{gameState.weight.toFixed(1)}kg</span>
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
                <div className="mt-1 px-2 py-1 bg-gold-900 bg-opacity-50 rounded text-xs text-yellow-300 border border-yellow-600">
                    🌟 Master Explorer: 75% complete!
                </div>
            )}
        </div>
    );
};

export default StatusPanel;