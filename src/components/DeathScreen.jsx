import React from 'react';
import { LEVEL_NAMES } from '../game/gameState.js';

const DeathScreen = ({ gameState, dispatch }) => {
    if (!gameState.gameOver) return null;

    const getDeathMessage = () => {
        switch (gameState.deathReason) {
            case 'starved':
                if (gameState.level === 1) {
                    return "Your tiny hatchling body couldn't survive without constant nourishment. The harsh Jurassic world claims another young life.";
                }
                return "You collapse from exhaustion and hunger. The unforgiving Jurassic world claims another predator.";

            case 'drowned':
                if (gameState.level === 1) {
                    return "The river's current was far too strong for your tiny body. You should have stayed on dry land until you grew bigger.";
                }
                return "The river's current proves too strong. You are swept away into the depths.";

            case 'sank':
                if (gameState.level === 1) {
                    return "The quicksand quickly swallows your small form. You were too light to escape its grip.";
                }
                return "The quicksand pulls you down. Your struggles only make it worse.";

            case 'injuries':
                if (gameState.level === 1) {
                    return "Your fragile hatchling body couldn't withstand the injuries. You were too young for such dangers.";
                }
                return "Your wounds prove fatal. You fought bravely, but this world shows no mercy.";

            case 'combat':
                if (gameState.level === 1) {
                    return "A predator found you alone and vulnerable. Your tiny body couldn't survive the encounter.";
                }
                return "A stronger predator has bested you. Your reign ends here.";

            default:
                if (gameState.level === 1) {
                    return "Your short life ends before it truly began. The Jurassic world is especially cruel to the young.";
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
            return '🥚 Hatch Again';
        }
        return '🔄 Try Again';
    };

    // Format weight display based on size
    const formatWeight = (weight) => {
        if (weight < 1) {
            return `${Math.round(weight * 1000)}g`;
        } else if (weight < 1000) {
            return `${weight.toFixed(1)}kg`;
        } else {
            return `${(weight / 1000).toFixed(1)}t`;
        }
    };

    // Calculate survival achievements
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
        if (gameState.weight >= 100) {
            achievements.push("💪 Grew to 100kg+");
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

                {/* Special hatchling death advice */}
                {gameState.level === 1 && (
                    <div className="bg-blue-900 bg-opacity-50 p-3 rounded mb-4 border border-blue-600">
                        <h3 className="text-blue-300 font-bold mb-1">💡 Hatchling Survival Tips</h3>
                        <div className="text-xs text-blue-200 space-y-1">
                            <div>• Hunt appropriate-sized creatures: beetles, worms, crickets</div>
                            <div>• Forest areas have better hunting opportunities</div>
                            <div>• Avoid rivers and dangerous terrain until bigger</div>
                            <div>• Don't attack anything much bigger than you</div>
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
                        The circle of life continues... A new hatchling awaits
                    </p>
                )}
            </div>
        </div>
    );
};

export default DeathScreen;