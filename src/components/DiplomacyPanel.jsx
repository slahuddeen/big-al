import React from 'react';
import { DIPLOMACY_ACTIONS, getRelationStatus, calculateRelation, canPerformAction } from '../data/factions.js';
import { getSpeciesById } from '../data/humanSpecies.js';

const DiplomacyPanel = ({ playerFaction, targetFaction, isFirstContact, onAction, onClose }) => {
  if (!targetFaction) return null;

  const relationValue = calculateRelation(playerFaction, targetFaction);
  const relationStatus = getRelationStatus(relationValue);
  const targetSpecies = getSpeciesById(targetFaction.speciesId);

  const getRelationColor = (status) => {
    switch (status) {
      case 'allied': return 'text-green-400';
      case 'friendly': return 'text-green-300';
      case 'neutral': return 'text-gray-300';
      case 'unfriendly': return 'text-orange-300';
      case 'hostile': return 'text-red-400';
      case 'war': return 'text-red-600';
      default: return 'text-gray-300';
    }
  };

  const handleAction = (actionType) => {
    onAction(targetFaction.id, actionType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-500">
            {isFirstContact ? '🤝 First Contact!' : '💬 Diplomacy'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Faction Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: targetFaction.color }}
            >
              {targetSpecies.emoji}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{targetFaction.name}</h3>
              <p className="text-sm text-gray-400">{targetSpecies.displayName}</p>
              <p className="text-xs text-gray-500">
                Personality: {targetFaction.personality}
              </p>
            </div>
          </div>

          {/* Relation Status */}
          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Relationship:</span>
              <span className={`font-bold uppercase ${getRelationColor(relationStatus)}`}>
                {relationStatus}
              </span>
            </div>
            <div className="mt-2 bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${relationValue >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.abs(relationValue)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {relationValue > 0 ? `+${relationValue}` : relationValue}
            </div>
          </div>
        </div>

        {/* First Contact Message */}
        {isFirstContact && (
          <div className="bg-blue-900 bg-opacity-50 border border-blue-600 rounded-lg p-4 mb-4">
            <p className="text-blue-200 text-center">
              📜 You have encountered a new tribe! How will you greet them?
            </p>
          </div>
        )}

        {/* Diplomatic Actions */}
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-yellow-500 mb-3">Diplomatic Actions</h4>

          {/* Greeting (First Contact) */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.GREETING) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.GREETING)}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👋</span>
                <div>
                  <div className="font-semibold">Friendly Greeting</div>
                  <div className="text-xs text-green-200">
                    Introduce yourself peacefully (+10 relations)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Trade */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.TRADE) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.TRADE)}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <div className="font-semibold">Propose Trade</div>
                  <div className="text-xs text-blue-200">
                    Exchange resources with this tribe
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Share Knowledge */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.SHARE_KNOWLEDGE) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.SHARE_KNOWLEDGE)}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <div className="font-semibold">Share Knowledge</div>
                  <div className="text-xs text-purple-200">
                    Exchange technologies and wisdom (+20 relations)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Alliance */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.ALLIANCE) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.ALLIANCE)}
              className="w-full bg-yellow-700 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤜🤛</span>
                <div>
                  <div className="font-semibold">Form Alliance</div>
                  <div className="text-xs text-yellow-200">
                    Become allies, share map and assist in wars (+50 relations)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Request Aid */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.REQUEST_AID) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.REQUEST_AID)}
              className="w-full bg-cyan-700 hover:bg-cyan-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🙏</span>
                <div>
                  <div className="font-semibold">Request Aid</div>
                  <div className="text-xs text-cyan-200">
                    Ask for food or materials in times of need
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Threaten */}
          {relationStatus !== 'allied' && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.THREATEN)}
              className="w-full bg-orange-700 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-semibold">Threaten</div>
                  <div className="text-xs text-orange-200">
                    Intimidate this tribe (-20 relations)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Declare War */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.DECLARE_WAR) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.DECLARE_WAR)}
              className="w-full bg-red-800 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚔️</span>
                <div>
                  <div className="font-semibold">Declare War</div>
                  <div className="text-xs text-red-200">
                    Begin hostilities with this tribe (-100 relations)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Peace Treaty */}
          {canPerformAction(playerFaction, targetFaction, DIPLOMACY_ACTIONS.PEACE_TREATY) && (
            <button
              onClick={() => handleAction(DIPLOMACY_ACTIONS.PEACE_TREATY)}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕊️</span>
                <div>
                  <div className="font-semibold">Propose Peace</div>
                  <div className="text-xs text-green-200">
                    End the war and restore peace (+30 relations)
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiplomacyPanel;
