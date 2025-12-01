import React, { useState } from 'react';
import { TECH_TREE, getAvailableTechs, getTechCost, canResearchTech, getTechsByTier } from '../data/techTree.js';

const TechTreePanel = ({ faction, researchQueue, onStartResearch, onCancelResearch, onClose }) => {
  const [selectedTech, setSelectedTech] = useState(null);
  const [tierFilter, setTierFilter] = useState('all'); // 'all', 1, 2, 3

  const availableTechs = getAvailableTechs(faction.technologies, faction.speciesId);
  const researchedTechs = faction.technologies;

  const filteredTechs = tierFilter === 'all'
    ? Object.values(TECH_TREE)
    : getTechsByTier(parseInt(tierFilter));

  const isResearched = (techId) => researchedTechs.includes(techId);
  const isAvailable = (tech) => {
    return tech.prerequisites.every(prereq => researchedTechs.includes(prereq));
  };

  const getTechStatus = (tech) => {
    if (isResearched(tech.id)) return 'researched';
    if (researchQueue && researchQueue.techId === tech.id) return 'researching';
    if (!isAvailable(tech)) return 'locked';
    if (!canResearchTech(faction, tech)) return 'unavailable'; // Can't afford
    return 'available';
  };

  const getTechStatusColor = (status) => {
    switch (status) {
      case 'researched': return 'border-green-600 bg-gray-900';
      case 'researching': return 'border-yellow-500 bg-yellow-900 bg-opacity-20';
      case 'available': return 'border-cyan-500 bg-gray-800';
      case 'unavailable': return 'border-orange-600 bg-gray-800 opacity-60';
      case 'locked': return 'border-gray-700 bg-gray-900 opacity-40';
      default: return 'border-gray-700';
    }
  };

  const renderUnlocks = (tech) => {
    const unlocks = tech.unlocks;
    return (
      <div className="space-y-2">
        {unlocks.buildings && unlocks.buildings.length > 0 && (
          <div>
            <span className="text-xs text-gray-400">Buildings: </span>
            <span className="text-xs text-cyan-400">{unlocks.buildings.join(', ')}</span>
          </div>
        )}
        {unlocks.units && unlocks.units.length > 0 && (
          <div>
            <span className="text-xs text-gray-400">Units: </span>
            <span className="text-xs text-red-400">{unlocks.units.join(', ')}</span>
          </div>
        )}
        {unlocks.abilities && unlocks.abilities.length > 0 && (
          <div>
            <span className="text-xs text-gray-400">Abilities: </span>
            <span className="text-xs text-purple-400">{unlocks.abilities.join(', ')}</span>
          </div>
        )}
        {unlocks.bonuses && (
          <div>
            <span className="text-xs text-gray-400">Bonuses: </span>
            {Object.entries(unlocks.bonuses).map(([key, value]) => (
              <span key={key} className="text-xs text-green-400 mr-2">
                {key}: +{Math.round((value - 1) * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-4 border-b-4 border-yellow-600 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              🔬 Technology Tree
            </h2>
            <p className="text-yellow-200 text-sm">
              Researched: {researchedTechs.length} / {Object.keys(TECH_TREE).length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Current Research */}
        {researchQueue && (
          <div className="bg-yellow-900 bg-opacity-30 border-b-2 border-yellow-600 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">
                  Currently Researching: {TECH_TREE[researchQueue.techId.toUpperCase()].name}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 bg-gray-700 h-3 rounded-full overflow-hidden max-w-md">
                    <div
                      className="bg-yellow-500 h-full transition-all"
                      style={{
                        width: `${((researchQueue.totalTurns - researchQueue.turnsRemaining) / researchQueue.totalTurns) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-white text-sm">
                    {researchQueue.turnsRemaining} turns remaining
                  </span>
                </div>
              </div>
              <button
                onClick={onCancelResearch}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tier Filter */}
        <div className="flex gap-2 p-4 border-b-2 border-gray-700">
          <button
            onClick={() => setTierFilter('all')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              tierFilter === 'all'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setTierFilter('1')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              tierFilter === '1'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tier 1 - Basic
          </button>
          <button
            onClick={() => setTierFilter('2')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              tierFilter === '2'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tier 2 - Intermediate
          </button>
          <button
            onClick={() => setTierFilter('3')}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              tierFilter === '3'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tier 3 - Advanced
          </button>
        </div>

        {/* Tech Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechs.map(tech => {
              const status = getTechStatus(tech);
              const cost = getTechCost(tech, faction.speciesId);
              const hasSpeciesAdvantage = tech.speciesAdvantage === faction.speciesId;

              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTech(tech)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${getTechStatusColor(status)} ${
                    selectedTech?.id === tech.id ? 'ring-2 ring-yellow-500' : ''
                  }`}
                >
                  {/* Tech Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-4xl">{tech.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                        {tech.name}
                        {status === 'researched' && <span className="text-green-400">✓</span>}
                        {hasSpeciesAdvantage && <span className="text-purple-400 text-sm">★</span>}
                      </h3>
                      <p className="text-xs text-gray-400 uppercase">
                        Tier {tech.tier}
                        {hasSpeciesAdvantage && <span className="text-purple-400 ml-2">(Species Bonus)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 mb-3">{tech.description}</p>

                  {/* Cost */}
                  <div className="flex gap-3 mb-3 text-sm">
                    <span className={faction.resources.knowledge >= cost.knowledge ? 'text-purple-400' : 'text-red-400'}>
                      📚 {cost.knowledge}
                    </span>
                    <span className="text-gray-400">
                      ⏱️ {cost.time} turns
                    </span>
                  </div>

                  {/* Prerequisites */}
                  {tech.prerequisites.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Requires:</div>
                      <div className="flex flex-wrap gap-1">
                        {tech.prerequisites.map(prereq => {
                          const prereqTech = Object.values(TECH_TREE).find(t => t.id === prereq);
                          const hasPrereq = researchedTechs.includes(prereq);
                          return (
                            <span
                              key={prereq}
                              className={`text-xs px-2 py-1 rounded ${
                                hasPrereq ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                              }`}
                            >
                              {prereqTech?.name || prereq}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unlocks */}
                  <div className="border-t border-gray-700 pt-3">
                    <div className="text-xs font-semibold text-yellow-500 mb-2">Unlocks:</div>
                    {renderUnlocks(tech)}
                  </div>

                  {/* Research Button */}
                  {status === 'available' && !researchQueue && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartResearch(tech.id);
                      }}
                      className="w-full mt-3 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded font-semibold transition-colors"
                    >
                      Research Now
                    </button>
                  )}
                  {status === 'unavailable' && (
                    <div className="w-full mt-3 text-center text-xs text-orange-400">
                      Insufficient Knowledge
                    </div>
                  )}
                  {status === 'locked' && (
                    <div className="w-full mt-3 text-center text-xs text-gray-500">
                      Prerequisites Required
                    </div>
                  )}
                  {status === 'researching' && (
                    <div className="w-full mt-3 text-center text-xs text-yellow-400 font-semibold">
                      Researching...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t-2 border-gray-700 p-4 bg-gray-800">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-600 bg-gray-900"></div>
              <span className="text-gray-300">Researched</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-900"></div>
              <span className="text-gray-300">Researching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-500 bg-gray-800"></div>
              <span className="text-gray-300">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-600 bg-gray-800 opacity-60"></div>
              <span className="text-gray-300">Can't Afford</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-700 bg-gray-900 opacity-40"></div>
              <span className="text-gray-300">Locked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechTreePanel;
