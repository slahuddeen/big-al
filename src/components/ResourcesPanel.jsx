import React from 'react';
import { getSpeciesById } from '../data/humanSpecies.js';

const ResourcesPanel = ({ faction, turn, actionPoints, maxActionPoints, onEndTurn }) => {
  if (!faction) return null;

  const species = getSpeciesById(faction.speciesId);

  return (
    <div className="fixed top-4 left-4 bg-gray-900 bg-opacity-95 border-2 border-yellow-600 rounded-lg p-4 w-80 z-40">
      {/* Faction Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: faction.color }}
        >
          {species.emoji}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-500">{faction.name}</h3>
          <p className="text-xs text-gray-400">{species.displayName}</p>
        </div>
      </div>

      {/* Turn Info */}
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Turn</span>
          <span className="text-lg font-bold text-white">{turn}</span>
        </div>

        {/* Action Points */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-400">Action Points</span>
            <span className="text-sm font-bold text-cyan-400">
              {actionPoints} / {maxActionPoints}
            </span>
          </div>
          <div className="flex gap-1">
            {[...Array(maxActionPoints)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${
                  i < actionPoints ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* End Turn Button */}
        <button
          onClick={onEndTurn}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
            actionPoints > 0
              ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
              : 'bg-yellow-600 hover:bg-yellow-500 text-white animate-pulse'
          }`}
        >
          {actionPoints > 0 ? 'End Turn' : 'End Turn →'}
        </button>
      </div>

      {/* Resources */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-yellow-500 mb-2">Resources</h4>

        {/* Food */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍖</span>
              <span className="text-sm text-gray-300">Food</span>
            </div>
            <span className={`font-bold ${
              faction.resources.food >= 50 ? 'text-green-400' :
              faction.resources.food >= 20 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {faction.resources.food}
            </span>
          </div>
        </div>

        {/* Materials */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🪵</span>
              <span className="text-sm text-gray-300">Materials</span>
            </div>
            <span className={`font-bold ${
              faction.resources.materials >= 50 ? 'text-green-400' :
              faction.resources.materials >= 20 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {faction.resources.materials}
            </span>
          </div>
        </div>

        {/* Knowledge */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📚</span>
              <span className="text-sm text-gray-300">Knowledge</span>
            </div>
            <span className="font-bold text-purple-400">
              {faction.resources.knowledge}
            </span>
          </div>
        </div>

        {/* Population */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <span className="text-sm text-gray-300">Population</span>
            </div>
            <span className="font-bold text-blue-400">
              {faction.resources.population}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 mb-1">Settlements</div>
            <div className="text-white font-bold">{faction.settlements.length}</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 mb-1">Known Tribes</div>
            <div className="text-white font-bold">{faction.knownFactions.size}</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 mb-1">Military</div>
            <div className="text-white font-bold">{faction.militaryStrength}</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 mb-1">Culture</div>
            <div className="text-white font-bold">{faction.culturalInfluence}</div>
          </div>
        </div>
      </div>

      {/* Species Traits */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-semibold text-yellow-500 mb-2">Species Traits</h4>
        <div className="space-y-1">
          {Object.entries(species.traits).map(([key, trait]) => (
            <div
              key={key}
              className="bg-gray-800 rounded p-2 text-xs"
              title={trait.description}
            >
              <div className="font-semibold text-cyan-400">{trait.name}</div>
              <div className="text-gray-400 text-[10px] truncate">{trait.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPanel;
