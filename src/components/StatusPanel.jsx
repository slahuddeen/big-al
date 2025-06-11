import React from 'react';
import { getTimeOfDay, DAY_LENGTH, NIGHT_LENGTH } from '../game/gameConstants.js';

const StatusPanel = ({ gameState }) => {
    const getStatusColor = (value, thresholds = [30, 70]) => {
        if (value <= thresholds[0]) return 'bg-red-500';
        if (value <= thresholds[1]) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const timeInfo = getTimeOfDay(gameState.moveNumber);

    return (
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-white">
            <h3 className="font-bold mb-3 text-lg">🦖 Big Al - Level {gameState.level}</h3>

            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span>Weight:</span>
                    <span className="font-mono">{gameState.weight.toFixed(1)}kg</span>
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

            <div className="border-t border-gray-600 pt-2">
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
        </div>
    );
};

export default StatusPanel;