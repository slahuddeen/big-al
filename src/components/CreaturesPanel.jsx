import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio } from '../utils/combatUtils.js';
import { MAX_CREATURES_PER_HEX } from '../game/gameConstants.js';

const CreaturesPanel = ({ gameState, dispatch }) => {
    const playerKey = `${gameState.player.q},${gameState.player.r}`;
    const creatures = gameState.creatures.get(playerKey) || [];

    if (creatures.length === 0 || gameState.gameOver) return null;

    return (
        <div
            className="absolute top-4 right-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm"
            style={{ zIndex: 1000 }}
        >
            <h3 className="font-bold mb-3 text-center">🎯 Creatures Here ({creatures.length}/{MAX_CREATURES_PER_HEX})</h3>

            <div className="space-y-3">
                {creatures.map((creature) => {
                    const speciesData = SPECIES_DATA[creature.species];
                    const fiercenessRatio = calculateFiercenessRatio(gameState.weight, gameState.fitness, speciesData, creature.size);
                    const agilityRatio = calculateAgilityRatio(gameState.weight, speciesData);

                    // Original Big Al success calculation: both fierceness AND agility must be < 1
                    const successChance = Math.round((fiercenessRatio < 1 && agilityRatio < 1) ?
                        Math.max(20, 90 - (fiercenessRatio * 30) - (agilityRatio * 30)) :
                        (fiercenessRatio < 1) ? Math.max(10, 60 - (agilityRatio * 40)) :
                            Math.max(5, 30 - (fiercenessRatio * 20))
                    );

                    return (
                        <div key={creature.id} className="border border-gray-600 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{speciesData.emoji}</span>
                                    <div>
                                        <div className="font-bold text-sm">{creature.species}</div>
                                        <div className="text-xs text-gray-400">Size: {(creature.size * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                                <div className="text-right text-xs">
                                    <div className={`font-bold ${successChance > 60 ? 'text-green-400' : successChance > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {successChance}% success
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div>
                                    <span className="text-gray-400">Nutrition:</span>
                                    <span className="text-green-400 ml-1">{Math.round(speciesData.nutrition * creature.size)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Danger:</span>
                                    <span className="text-red-400 ml-1">{Math.round(speciesData.danger * creature.size)}</span>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    dispatch({ type: 'ATTACK_CREATURE', creatureId: creature.id });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm transition-colors cursor-pointer relative"
                                style={{
                                    zIndex: 1001,
                                    pointerEvents: 'all',
                                    position: 'relative'
                                }}
                            >
                                🗡️ Attack
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CreaturesPanel;