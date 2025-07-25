﻿import React from 'react';
import { LEVEL_NAMES } from '../game/gameState.js';

const DeathScreen = ({ gameState, dispatch }) => {
    if (!gameState.gameOver) return null;

    const getDeathMessage = () => {
        switch (gameState.deathReason) {
            case 'starved':
                if (gameState.level === 1) {
                    return "Your 300-gram hatchling body couldn't survive without constant nourishment. The Jurassic world is unforgiving to the smallest predators.";
                }
                return "You collapse from exhaustion and hunger. The unforgiving Jurassic world claims another predator.";

            case 'drowned':
                if (gameState.level === 1) {
                    return "The river's current was far too strong for your tiny 300g body. Even at this size, water is deadly.";
                }
                return "The river's current proves too strong. You are swept away into the depths.";

            case 'sank':
                if (gameState.level === 1) {
                    return "The quicksand quickly swallows your small 300g form. You were still too light to escape its grip.";
                }
                return "The quicksand pulls you down. Your struggles only make it worse.";

            case 'injuries':
                if (gameState.level === 1) {
                    return "Your fragile 300g hatchling body couldn't withstand the injuries. You were still too young for such dangers.";
                }
                return "Your wounds prove fatal. You fought bravely, but this world shows no mercy.";

            case 'combat':
                if (gameState.level === 1) {
                    return "A predator found you alone and vulnerable. Your tiny 300g body couldn't survive the encounter.";
                }
                return "A stronger predator has bested you. Your reign ends here.";

            default:
                if (gameState.level === 1) {
                    return "Your short life ends before it truly began. The Jurassic world is especially cruel to 300g hatchlings.";
                }
                return "Your journey ends here. The Jurassic world is not for the weak.";
        }
    };

    const getDeathTitle = () => {
        if (gameState.level === 1) {
            return "The Hatchling's End";
        }
        return "Death Claims You";
    };

    const getDeathIcon = () => {
        if (gameState.level === 1) {
            return '🥚💀';
        }
        return '💀';
    };

    const getRestartButtonText = () => {
        if (gameState.level === 1) {
            return '🥚 Hatch Again (300g)';
        }
        return '🔄 Try Again';
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

    // Enhanced survival achievements with 300g scaling
    const getSurvivalAchievements = () => {
        const achievements = [];

        if (gameState.level >= 2) {
            achievements.push("🎖️ Survived to independence");
        }
        if (gameState.level >= 3) {
            achievements.push("🏆 Reached sub-adult");
        }
        if (gameState.level >= 4) {
            achievements.push("👑 Became a full adult");
        }
        if (gameState.moveNumber >= 50) {
            achievements.push("⏰ Long survivor (50+ turns)");
        }
        if (gameState.weight >= 1.0) { // Adjusted for 300g start
            achievements.push("💪 Grew to 1kg+");
        }
        if (gameState.weight >= 15.0) { // Juvenile milestone
            achievements.push("🦴 Reached juvenile weight");
        }
        if (gameState.weight >= 100.0) { // Sub-adult milestone
            achievements.push("🦖 Reached sub-adult weight");
        }

        return achievements;
    };

    const achievements = getSurvivalAchievements();

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
            style={{ zIndex: 70000 }}
        >
            <div className="bg-red-900 bg-opacity-90 p-8 rounded-xl border-4 border-red-600 max-w-lg mx-4 text-center">
                <div className="text-6xl mb-4">{getDeathIcon()}</div>
                <h2 className="text-3xl font-bold text-red-200 mb-4">{getDeathTitle()}</h2>

                <p className="text-white text-lg mb-4 italic">
                    "{gameState.currentThought}"
                </p>

                <p className="text-red-200 mb-6 leading-relaxed">
                    {getDeathMessage()}
                </p>

                <div className="bg-black bg-opacity-50 p-4 rounded mb-6">
                    <div className="text-yellow-400 text-xl font-bold mb-2">Final Score: {gameState.score}</div>
                    <div className="text-gray-300 space-y-1">
                        <div>Final Form: {LEVEL_NAMES[gameState.level] || 'Unknown'}</div>
                        <div>Weight: {formatWeight(gameState.weight)}</div>
                        <div>Survived: {gameState.moveNumber} turns</div>
                        <div>Energy: {Math.round(gameState.energy)}%</div>
                        <div>Fitness: {Math.round(gameState.fitness)}%</div>
                    </div>
                </div>

                {/* Achievements Section */}
                {achievements.length > 0 && (
                    <div className="bg-purple-900 bg-opacity-50 p-4 rounded mb-6 border border-purple-600">
                        <h3 className="text-purple-300 font-bold mb-2">🏅 Achievements Unlocked</h3>
                        <div className="space-y-1">
                            {achievements.map((achievement, index) => (
                                <div key={index} className="text-sm text-purple-200">
                                    {achievement}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Enhanced hatchling death advice for 300g scaling */}
                {gameState.level === 1 && (
                    <div className="bg-blue-900 bg-opacity-50 p-3 rounded mb-4 border border-blue-600">
                        <h3 className="text-blue-300 font-bold mb-1">💡 300g Hatchling Survival Tips</h3>
                        <div className="text-xs text-blue-200 space-y-1">
                            <div>• Hunt dragonflies, centipedes, and crickets - perfect prey for 300g!</div>
                            <div>• Dense forests have the highest bug concentrations</div>
                            <div>• Avoid rivers (you're still too small!) and dangerous terrain</div>
                            <div>• Small mammals are excellent nutrition if you can catch them</div>
                            <div>• Fast creatures like dragonflies may escape - be patient!</div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => dispatch({ type: 'RESTART_GAME' })}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl transition-colors text-lg font-bold"
                >
                    {getRestartButtonText()}
                </button>

                {gameState.level === 1 && (
                    <p className="text-xs text-gray-400 mt-3">
                        The circle of life continues... A new 300g hatchling awaits
                    </p>
                )}
            </div>
        </div>
    );
};

export default DeathScreen;