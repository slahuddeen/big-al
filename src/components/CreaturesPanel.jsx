import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { calculateFiercenessRatio, calculateAgilityRatio } from '../utils/combatUtils.js';
import ImageWithFallback from './ImageWithFallback.jsx';

const CreaturesPanel = ({ gameState, dispatch }) => {
    const playerKey = `${gameState.player.q},${gameState.player.r}`;
    const creatures = gameState.creatures.get(playerKey) || [];

    if (creatures.length === 0 || gameState.gameOver) return null;

    return (
        <div
            className="absolute top-4 right-4 bottom-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-white w-80 flex flex-col"
            style={{ zIndex: 50000 }}
        >
            <h3 className="font-bold mb-4 text-center text-lg">🎯 Creatures Here ({creatures.length})</h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 creatures-panel-scroll">
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
                        <div key={creature.id} className="border border-gray-600 rounded-lg p-4 bg-gray-900 bg-opacity-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-600">
                                        <ImageWithFallback
                                            src={speciesData.image}
                                            fallback={speciesData.emoji}
                                            alt={creature.species}
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                objectFit: 'contain',
                                                fontSize: '2rem'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <div className="font-bold text-base">{creature.species}</div>
                                        <div className="text-sm text-gray-400">Size: {(creature.size * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold text-lg ${successChance > 60 ? 'text-green-400' : successChance > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {successChance}%
                                    </div>
                                    <div className="text-xs text-gray-400">success</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div className="bg-green-900 bg-opacity-30 rounded p-2 border border-green-700">
                                    <div className="text-gray-400 text-xs">Nutrition</div>
                                    <div className="text-green-400 font-bold">{Math.round(speciesData.nutrition * creature.size)}</div>
                                </div>
                                <div className="bg-red-900 bg-opacity-30 rounded p-2 border border-red-700">
                                    <div className="text-gray-400 text-xs">Danger</div>
                                    <div className="text-red-400 font-bold">{Math.round(speciesData.danger * creature.size)}</div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    dispatch({ type: 'ATTACK_CREATURE', creatureId: creature.id });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer font-bold"
                                style={{
                                    zIndex: 55000,
                                    pointerEvents: 'all',
                                    position: 'relative'
                                }}
                            >
                                ⚔️ Attack
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CreaturesPanel;