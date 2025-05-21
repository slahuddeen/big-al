// components/StatsPanel.tsx
import React from 'react';

interface StatsPanelProps {
    growthStage: number;
    growthStages: any[];
    weight: number;
    fitness: number;
    hunger: number;
    thirst: number;
    energy: number;
    season: string;
    weather: string;
    timeOfDay: string;
    injuries: any[];
    perks: string[];
    score: number;
    availablePerks: number;
    setShowStatsDetails: () => void;
    setShowInjuryDetails: () => void;
    setShowEventLog: () => void;
    setShowPerkSelection: () => void;
    seasonEffects: any;
    weatherEffects: any;
    age: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
    growthStage, growthStages, weight, fitness, hunger, thirst, energy,
    season, weather, timeOfDay, injuries, perks, score, availablePerks,
    setShowStatsDetails, setShowInjuryDetails, setShowEventLog, setShowPerkSelection,
    seasonEffects, weatherEffects, age
}) => {
    return (
        <div className="w-full md:w-64 bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-amber-500 mb-4">Stats</h2>

            {/* Basic stats */}
            <div className="space-y-4 mb-6">
                <div>
                    <div className="flex justify-between mb-1">
                        <span>Growth</span>
                        <span>{growthStages[growthStage - 1]?.name || 'Hatchling'}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${(weight / (growthStages[growthStage >= growthStages.length ? growthStage - 1 : growthStage]?.weightRequired || 100)) * 100}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>Fitness</span>
                        <span>{fitness}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${fitness}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>Hunger</span>
                        <span>{Math.floor(hunger)}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: `${hunger}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>Thirst</span>
                        <span>{Math.floor(thirst)}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${thirst}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <span>Energy</span>
                        <span>{Math.floor(energy)}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${energy}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Environment info */}
            <div className="mb-6">
                <h3 className="font-bold text-sm mb-2">Environment</h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                    <div className="flex items-center">
                        <span className="mr-1">☀️</span>
                        <span>{seasonEffects[season]?.name || season}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">🌤️</span>
                        <span>{weatherEffects[weather]?.name || weather}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">{timeOfDay === 'day' ? '🌞' : '🌙'}</span>
                        <span>{timeOfDay === 'day' ? 'Daytime' : 'Night'}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">⏱️</span>
                        <span>Year {age}</span>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
                <button
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    onClick={setShowStatsDetails}
                >
                    Full Stats
                </button>

                <button
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    onClick={setShowInjuryDetails}
                >
                    Injuries ({injuries.length})
                </button>

                <button
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    onClick={setShowEventLog}
                >
                    Event Log
                </button>

                {availablePerks > 0 && (
                    <button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded"
                        onClick={setShowPerkSelection}
                    >
                        Select Ability! ({availablePerks})
                    </button>
                )}
            </div>



            {/* Score */}
            <div className="mt-6 text-center">
                <p className="text-sm">Score</p>
                <p className="text-xl font-bold text-amber-500">{score}</p>
            </div>
        </div>
    );
};

export default StatsPanel;