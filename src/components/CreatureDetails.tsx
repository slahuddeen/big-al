// Enhanced CreatureDetails.tsx that uses the new hunting system
// =============================================================

import React from 'react';

interface CreatureDetailsProps {
    creature: any;
    onHunt: (success: boolean) => void;
    onClose: () => void;

    // NEW: Add hunting system props
    huntingSystem: any;
    growthSystem: any;
    gameState: any;
}

const CreatureDetails: React.FC<CreatureDetailsProps> = ({
    creature,
    onHunt,
    onClose,
    huntingSystem,
    growthSystem,
    gameState
}) => {
    const info = creature.info;

    // Use hunting system for calculations
    const successChance = huntingSystem.calculateHuntingSuccess(creature);
    const difficulty = huntingSystem.getHuntingDifficulty(creature);
    const huntCheck = huntingSystem.canHuntCreature(creature);

    // Get player capabilities
    const capabilities = growthSystem.getStageCapabilities();
    const currentStage = growthSystem.getCurrentStageInfo();

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-amber-500">{info.name}</h2>
                    <button className="text-gray-400 hover:text-white" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <p className="mb-4">{info.description}</p>

                {/* Creature Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center">
                        <span className="mr-1">❤️</span>
                        <span>Nutrition: {info.nutrition}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">🏆</span>
                        <span>Danger: {info.dangerLevel}/5</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">⚡</span>
                        <span>Agility: {info.agility}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">⚖️</span>
                        <span>Size: {info.size}/5</span>
                    </div>
                </div>

                {/* Size Comparison */}
                <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <div className="text-sm font-medium mb-2">Size Comparison</div>
                    <div className="flex items-center justify-between">
                        <div className="text-center">
                            <div className="text-amber-400">You</div>
                            <div className="text-sm">{currentStage.name}</div>
                            <div className="text-xs">Size {capabilities.canHuntSize}</div>
                        </div>
                        <div className="text-2xl">vs</div>
                        <div className="text-center">
                            <div className="text-blue-400">{info.name}</div>
                            <div className="text-sm">{info.category}</div>
                            <div className="text-xs">Size {info.size}</div>
                        </div>
                    </div>
                </div>

                {/* Hunting Analysis */}
                <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <div className="text-center mb-2">
                        <div className="text-sm font-medium">Hunt Difficulty</div>
                        <div className={`text-lg font-bold ${difficulty.color}`}>
                            {difficulty.level}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-sm">Success Chance</div>
                        <div className="text-xl font-bold text-white">
                            {Math.round(successChance * 100)}%
                        </div>
                    </div>

                    {/* Success factors breakdown */}
                    <div className="text-xs text-gray-400 mt-2">
                        <div>🏃 Your agility vs creature: {capabilities.canHuntSize >= info.size ? '✓' : '✗'}</div>
                        <div>⚡ Energy level: {gameState.energy > 50 ? '✓' : '⚠️'}</div>
                        <div>🍖 Hunger motivation: {gameState.hunger < 70 ? '✓' : '○'}</div>
                        {gameState.stealthLevel > 0 && (
                            <div>🥷 Stealth advantage: ✓</div>
                        )}
                    </div>
                </div>

                {/* Hunting Requirements */}
                {!huntCheck.canHunt && (
                    <div className="mb-4 p-3 bg-red-900 rounded-lg">
                        <div className="text-red-300 font-medium mb-1">Cannot Hunt</div>
                        <div className="text-sm">{huntCheck.reason}</div>
                    </div>
                )}

                {/* Dinosaur Fact */}
                <div className="mb-4">
                    <p className="text-sm italic mb-2">Did you know?</p>
                    <p className="text-sm">{info.facts && info.facts[Math.floor(Math.random() * info.facts.length)]}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                    <button
                        className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
                        onClick={() => onHunt(false)}
                    >
                        Leave It
                    </button>

                    {/* Stealth Approach Button (if not already stealthed) */}
                    {huntCheck.canHunt && gameState.stealthLevel === 0 && (
                        <button
                            className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-3 rounded text-sm"
                            onClick={() => {
                                huntingSystem.approachStealthily(creature.id);
                                // Component will re-render with updated stealth level
                            }}
                            disabled={gameState.energy < 10}
                        >
                            🥷 Stealth
                        </button>
                    )}

                    <button
                        className={`font-bold py-2 px-4 rounded ${huntCheck.canHunt
                                ? 'bg-green-700 hover:bg-green-800 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                        onClick={() => onHunt(true)}
                        disabled={!huntCheck.canHunt}
                    >
                        Hunt It
                    </button>
                </div>

                {/* Stealth Status */}
                {gameState.stealthLevel > 0 && (
                    <div className="mt-3 p-2 bg-purple-900 rounded">
                        <div className="text-purple-300 text-sm">
                            🥷 Stealth Level: {gameState.stealthLevel}%
                        </div>
                        <div className="text-xs text-purple-400">
                            {gameState.stealthLevel > 70
                                ? "You are well hidden!"
                                : "The prey might notice you..."}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatureDetails;

// Update your BigAlGame.tsx to pass the new props:
/*
{showCreatureDetails && selectedCreature && (
    <CreatureDetails
        creature={selectedCreature}
        onHunt={handleHunting}
        onClose={() => setShowCreatureDetails(false)}
        
        // ADD these new props:
        huntingSystem={game.huntingSystem}
        growthSystem={game.growthSystem}
        gameState={game}
    />
)}
*/