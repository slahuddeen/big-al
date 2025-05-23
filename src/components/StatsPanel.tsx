// components/StatsPanel.tsx
import React, { useMemo } from 'react';
import { GrowthStage, Injury, Weather, Season } from '../types';

interface StatsPanelProps {
    growthStage: number;
    growthStages: GrowthStage[];
    weight: number;
    fitness: number;
    hunger: number;
    thirst: number;
    energy: number;
    season: string;
    weather: string;
    timeOfDay: string;
    injuries: Injury[];
    perks: string[];
    score: number;
    availablePerks: number;
    setShowStatsDetails: () => void;
    setShowInjuryDetails: () => void;
    setShowEventLog: () => void;
    setShowPerkSelection: () => void;
    seasonEffects: Record<string, Season>;
    weatherEffects: Record<string, Weather>;
    age: number;
}

interface StatBarProps {
    label: string;
    current: number;
    max: number;
    color: string;
    className?: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, current, max, color, className = "" }) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));

    return (
        <div className={className}>
            <div className="flex justify-between mb-1">
                <span className="text-sm">{label}</span>
                <span className="text-sm">{Math.floor(current)}/{max}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                    className={`${color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const EnvironmentInfo: React.FC<{
    season: string;
    weather: string;
    timeOfDay: string;
    age: number;
    seasonEffects: Record<string, Season>;
    weatherEffects: Record<string, Weather>;
}> = ({ season, weather, timeOfDay, age, seasonEffects, weatherEffects }) => {
    const environmentData = useMemo(() => [
        {
            icon: "☀️",
            label: seasonEffects[season]?.name || season,
            key: "season"
        },
        {
            icon: "🌤️",
            label: weatherEffects[weather]?.name || weather,
            key: "weather"
        },
        {
            icon: timeOfDay === 'day' ? '🌞' : '🌙',
            label: timeOfDay === 'day' ? 'Daytime' : 'Night',
            key: "time"
        },
        {
            icon: "⏱️",
            label: `Year ${age}`,
            key: "age"
        }
    ], [season, weather, timeOfDay, age, seasonEffects, weatherEffects]);

    return (
        <div className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-amber-500">Environment</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                {environmentData.map(({ icon, label, key }) => (
                    <div key={key} className="flex items-center">
                        <span className="mr-1" role="img" aria-label={key}>
                            {icon}
                        </span>
                        <span className="truncate">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ActionButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}> = ({ onClick, children, variant = 'secondary', disabled = false }) => {
    const baseClasses = "w-full py-2 px-4 rounded transition-colors text-sm font-medium";
    const variantClasses = {
        primary: "bg-amber-600 hover:bg-amber-700 text-white",
        secondary: "bg-gray-700 hover:bg-gray-600 text-white"
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const StatsPanel: React.FC<StatsPanelProps> = ({
    growthStage,
    growthStages,
    weight,
    fitness,
    hunger,
    thirst,
    energy,
    season,
    weather,
    timeOfDay,
    injuries,
    perks,
    score,
    availablePerks,
    setShowStatsDetails,
    setShowInjuryDetails,
    setShowEventLog,
    setShowPerkSelection,
    seasonEffects,
    weatherEffects,
    age
}) => {
    // Memoize growth progress calculation
    const growthProgress = useMemo(() => {
        const currentStage = growthStages[growthStage - 1];
        const nextStage = growthStages[growthStage];

        if (!currentStage) return { name: 'Unknown', progress: 0 };

        if (!nextStage) {
            return { name: currentStage.name, progress: 100 };
        }

        const progress = (weight / nextStage.weightRequired) * 100;
        return { name: currentStage.name, progress: Math.min(100, progress) };
    }, [growthStage, growthStages, weight]);

    return (
        <div className="w-full md:w-64 bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-amber-500 mb-4">Stats</h2>

            {/* Growth and Basic Stats */}
            <div className="space-y-4 mb-6">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Growth</span>
                        <span className="text-sm">{growthProgress.name}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${growthProgress.progress}%` }}
                        />
                    </div>
                </div>

                <StatBar
                    label="Fitness"
                    current={fitness}
                    max={100}
                    color="bg-green-600"
                />

                <StatBar
                    label="Hunger"
                    current={hunger}
                    max={100}
                    color="bg-red-600"
                />

                <StatBar
                    label="Thirst"
                    current={thirst}
                    max={100}
                    color="bg-blue-600"
                />

                <StatBar
                    label="Energy"
                    current={energy}
                    max={100}
                    color="bg-yellow-600"
                />
            </div>

            {/* Environment Information */}
            <EnvironmentInfo
                season={season}
                weather={weather}
                timeOfDay={timeOfDay}
                age={age}
                seasonEffects={seasonEffects}
                weatherEffects={weatherEffects}
            />

            {/* Action Buttons */}
            <div className="space-y-2 mb-6">
                <ActionButton onClick={setShowStatsDetails}>
                    Full Stats
                </ActionButton>

                <ActionButton onClick={setShowInjuryDetails}>
                    Injuries ({injuries.length})
                </ActionButton>

                <ActionButton onClick={setShowEventLog}>
                    Event Log
                </ActionButton>

                {availablePerks > 0 && (
                    <ActionButton
                        onClick={setShowPerkSelection}
                        variant="primary"
                    >
                        Select Ability! ({availablePerks})
                    </ActionButton>
                )}
            </div>

            {/* Score Display */}
            <div className="text-center border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 mb-1">Score</p>
                <p className="text-xl font-bold text-amber-500">{score.toLocaleString()}</p>
            </div>
        </div>
    );
};

export default React.memo(StatsPanel);