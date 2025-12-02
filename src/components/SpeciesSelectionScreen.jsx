import React, { useState } from 'react';
import { HUMAN_SPECIES } from '../data/humanSpecies.js';

const SpeciesSelectionScreen = ({ onSelectSpecies }) => {
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [factionName, setFactionName] = useState('');
  const [factionColor, setFactionColor] = useState('#ff6b35');

  const handleContinue = () => {
    if (selectedSpecies && factionName.trim()) {
      onSelectSpecies({
        speciesId: selectedSpecies.id,
        name: factionName.trim(),
        color: factionColor
      });
    }
  };

  const colors = [
    '#ff6b35', '#f7931e', '#fdc82f', '#8cc63f', '#00a651',
    '#00b4d8', '#0077b6', '#9b59b6', '#e74c3c', '#c0392b'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-6 border-b-4 border-yellow-600">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            Choose Your Species
          </h1>
          <p className="text-yellow-200 text-center text-lg">
            Select the human species that will define your civilization
          </p>
        </div>

        <div className="p-6">
          {/* Species Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.values(HUMAN_SPECIES).filter(species => species.playable).map(species => (
              <div
                key={species.id}
                onClick={() => setSelectedSpecies(species)}
                className={`bg-gray-800 rounded-lg p-6 cursor-pointer border-4 transition-all ${
                  selectedSpecies?.id === species.id
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/50'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-6xl">{species.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-yellow-400">{species.displayName}</h3>
                    <p className="text-gray-400 text-sm">{species.name}</p>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 italic">{species.description}</p>

                {/* Traits */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-yellow-500">Unique Traits:</h4>
                  {Object.entries(species.traits).map(([key, trait]) => (
                    <div key={key} className="bg-gray-900 rounded p-2">
                      <div className="text-sm font-semibold text-cyan-400">{trait.name}</div>
                      <div className="text-xs text-gray-400">{trait.description}</div>
                    </div>
                  ))}
                </div>

                {/* Starting Bonus */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h4 className="text-xs font-semibold text-yellow-500 mb-2">Starting Bonus:</h4>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded">👥 {species.startingBonus.population}</span>
                    <span className="bg-green-900 text-green-200 px-2 py-1 rounded">🍖 {species.startingBonus.food}</span>
                    <span className="bg-orange-900 text-orange-200 px-2 py-1 rounded">🪵 {species.startingBonus.materials}</span>
                    {species.startingBonus.water && <span className="bg-cyan-900 text-cyan-200 px-2 py-1 rounded">💧 {species.startingBonus.water}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Faction Setup */}
          {selectedSpecies && (
            <div className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Customize Your Tribe</h3>

              <div className="space-y-4">
                {/* Faction Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Tribe Name
                  </label>
                  <input
                    type="text"
                    value={factionName}
                    onChange={(e) => setFactionName(e.target.value)}
                    placeholder={`Enter your ${selectedSpecies.fantasyName} tribe name...`}
                    className="w-full bg-gray-700 text-white p-3 rounded border-2 border-gray-600 focus:border-yellow-500 outline-none"
                    maxLength={30}
                  />
                </div>

                {/* Faction Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Tribe Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFactionColor(color)}
                        className={`w-12 h-12 rounded-full border-4 transition-all ${
                          factionColor === color
                            ? 'border-yellow-500 scale-110'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!selectedSpecies || !factionName.trim()}
              className={`px-12 py-4 rounded-lg text-xl font-bold transition-all ${
                selectedSpecies && factionName.trim()
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedSpecies && factionName.trim()
                ? `Continue as ${selectedSpecies.fantasyName}`
                : 'Select Species and Name Your Tribe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeciesSelectionScreen;
