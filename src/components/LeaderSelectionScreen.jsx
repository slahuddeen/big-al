import React, { useState } from 'react';
import { getStartingLeadersForSpecies } from '../data/characters.js';

const LeaderSelectionScreen = ({ faction, onSelectLeader }) => {
  const [selectedLeader, setSelectedLeader] = useState(null);

  const leaders = getStartingLeadersForSpecies(faction.speciesId);

  const handleSelectLeader = () => {
    if (selectedLeader) {
      onSelectLeader(selectedLeader.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-6 border-b-4 border-yellow-600">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            Choose Your Leader
          </h1>
          <p className="text-yellow-200 text-center text-lg">
            Select who will lead your tribe to greatness
          </p>
        </div>

        {/* Leader Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {leaders.map(leader => (
              <div
                key={leader.id}
                onClick={() => setSelectedLeader(leader)}
                className={`bg-gray-800 rounded-lg p-6 cursor-pointer border-4 transition-all ${
                  selectedLeader?.id === leader.id
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/50'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Leader Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-6xl">{leader.role === 'shaman' ? '🔮' : leader.role === 'warrior' ? '⚔️' : leader.role === 'trader' ? '💰' : leader.role === 'explorer' ? '🏃' : leader.role === 'leader' ? '👑' : leader.role === 'healer' ? '💚' : leader.role === 'diplomat' ? '🤝' : '✨'}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-yellow-400">{leader.name}</h3>
                    <p className="text-gray-400 text-sm uppercase tracking-wider">{leader.role}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        leader.rarity === 'legendary' ? 'bg-purple-900 text-purple-200' :
                        leader.rarity === 'rare' ? 'bg-blue-900 text-blue-200' :
                        leader.rarity === 'uncommon' ? 'bg-green-900 text-green-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {leader.rarity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-4 italic">
                  "{leader.description}"
                </p>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Lead</div>
                    <div className="text-lg font-bold text-yellow-400">{leader.stats.leadership}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Combat</div>
                    <div className="text-lg font-bold text-red-400">{leader.stats.combat}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Wisdom</div>
                    <div className="text-lg font-bold text-purple-400">{leader.stats.wisdom}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Diplo</div>
                    <div className="text-lg font-bold text-blue-400">{leader.stats.diplomacy}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Survival</div>
                    <div className="text-lg font-bold text-green-400">{leader.stats.survival}</div>
                  </div>
                </div>

                {/* Abilities */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-yellow-500">Abilities:</h4>
                  {Object.entries(leader.abilities).map(([key, ability]) => (
                    <div key={key} className="bg-gray-900 rounded p-2">
                      <div className="text-sm font-semibold text-cyan-400">{ability.name}</div>
                      <div className="text-xs text-gray-400">{ability.description}</div>
                    </div>
                  ))}
                </div>

                {/* Traits */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {leader.traits.map(trait => (
                      <span
                        key={trait}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Backstory Section (shown when leader selected) */}
          {selectedLeader && (
            <div className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">
                The Tale of {selectedLeader.name}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {selectedLeader.backstory}
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSelectLeader}
              disabled={!selectedLeader}
              className={`px-12 py-4 rounded-lg text-xl font-bold transition-all ${
                selectedLeader
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedLeader ? `Begin with ${selectedLeader.name}` : 'Select a Leader'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderSelectionScreen;
