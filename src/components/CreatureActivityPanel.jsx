import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import ImageWithFallback from './ImageWithFallback.jsx';

const CreatureActivityPanel = ({ gameState }) => {
    // Only show if there are recent creature activities
    if (!gameState.creatureBehaviorLog || gameState.creatureBehaviorLog.length === 0) {
        return null;
    }

    // Show recent activities from the last few turns
    const recentActivities = gameState.creatureBehaviorLog.slice(-3); // Last 3 activities

    return (
        <div className="absolute bottom-4 right-4 w-72 bg-black bg-opacity-85 backdrop-blur-md rounded-lg border-2 border-green-600 text-white text-sm">
            <div className="p-2 border-b border-green-600 bg-green-900 bg-opacity-50">
                <h4 className="font-bold text-center text-green-400">
                    🌿 Ecosystem Activity
                </h4>
            </div>

            <div className="p-3 space-y-2 max-h-32 overflow-y-auto">
                {recentActivities.map((activity, index) => {
                    const speciesData = SPECIES_DATA[activity.creature];

                    return (
                        <div key={index} className="flex items-center space-x-2 text-xs">
                            <div className="w-6 h-6 flex-shrink-0">
                                <ImageWithFallback
                                    src={speciesData?.image}
                                    fallback={speciesData?.emoji || "🦴"}
                                    alt={activity.creature}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            <div className="flex-1">
                                <div className={`font-medium ${getActivityColor(activity.type)}`}>
                                    {activity.creature}
                                </div>
                                <div className="text-gray-300 text-xs">
                                    {activity.message}
                                </div>
                            </div>

                            <div className="text-xs text-gray-500">
                                {getActivityIcon(activity.type)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Show ecosystem status */}
            <div className="p-2 border-t border-green-600 bg-green-900 bg-opacity-30">
                <div className="text-xs text-center text-green-300">
                    {getEcosystemStatus(gameState)}
                </div>
            </div>
        </div>
    );
};

const getActivityColor = (activityType) => {
    switch (activityType) {
        case 'creature_attack':
            return 'text-red-400';
        case 'creature_movement':
            return 'text-blue-400';
        case 'creature_display':
            return 'text-yellow-400';
        default:
            return 'text-white';
    }
};

const getActivityIcon = (activityType) => {
    switch (activityType) {
        case 'creature_attack':
            return '⚔️';
        case 'creature_movement':
            return '🏃';
        case 'creature_display':
            return '👁️';
        default:
            return '🌿';
    }
};

const getEcosystemStatus = (gameState) => {
    const totalCreatures = Array.from(gameState.creatures.values())
        .reduce((total, creatures) => total + creatures.length, 0);

    if (totalCreatures === 0) {
        return "🦗 The world feels empty...";
    } else if (totalCreatures < 5) {
        return "🌱 Few creatures stir in the landscape";
    } else if (totalCreatures < 15) {
        return "🌿 Life thrives around you";
    } else {
        return "🦖 The ecosystem bustles with activity!";
    }
};

export default CreatureActivityPanel;