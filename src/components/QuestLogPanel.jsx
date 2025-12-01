import React, { useState } from 'react';
import { QUEST_STATUS } from '../data/questSystem.js';

const QuestLogPanel = ({ quests, availableQuests, onAcceptQuest, onAbandonQuest, onClose }) => {
  const [tab, setTab] = useState('available'); // 'available', 'active', 'completed'

  const activeQuests = quests.filter(q => q.status === QUEST_STATUS.ACTIVE);
  const completedQuests = quests.filter(q => q.status === QUEST_STATUS.COMPLETED);

  const getQuestIcon = (type) => {
    switch (type) {
      case 'exploration': return '🗺️';
      case 'hunting': return '🏹';
      case 'diplomacy': return '🤝';
      case 'building': return '🏗️';
      case 'survival': return '💀';
      case 'rare_encounter': return '✨';
      case 'trade': return '💱';
      case 'military': return '⚔️';
      case 'knowledge': return '📚';
      case 'mystery': return '🔮';
      default: return '📜';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const renderObjectives = (quest) => {
    const objectives = quest.objectives;
    return (
      <div className="space-y-1">
        {Object.entries(objectives).map(([key, value]) => {
          // Skip target/required/needed keys
          if (key.includes('target') || key.includes('Required') || key.includes('Needed')) {
            return null;
          }

          // Find the target value
          const targetKey = Object.keys(objectives).find(k =>
            k.includes('target') || k.includes('Required') || k.includes('Needed')
          );
          const target = objectives[targetKey];

          // Render based on type
          if (typeof value === 'boolean') {
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className={value ? 'text-green-400' : 'text-gray-400'}>
                  {value ? '✓' : '○'}
                </span>
                <span className="text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
              </div>
            );
          } else if (typeof value === 'number' && target !== undefined) {
            const percentage = (value / target) * 100;
            return (
              <div key={key} className="text-sm">
                <div className="flex justify-between text-gray-300 mb-1">
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <span>{value} / {target}</span>
                </div>
                <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const renderRewards = (rewards) => {
    return (
      <div className="flex flex-wrap gap-2">
        {rewards.food && <span className="px-2 py-1 bg-green-900 text-green-200 rounded text-xs">🍖 {rewards.food}</span>}
        {rewards.materials && <span className="px-2 py-1 bg-orange-900 text-orange-200 rounded text-xs">🪵 {rewards.materials}</span>}
        {rewards.water && <span className="px-2 py-1 bg-cyan-900 text-cyan-200 rounded text-xs">💧 {rewards.water}</span>}
        {rewards.knowledge && <span className="px-2 py-1 bg-purple-900 text-purple-200 rounded text-xs">📚 {rewards.knowledge}</span>}
        {rewards.population && <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">👥 {rewards.population}</span>}
        {rewards.militaryStrength && <span className="px-2 py-1 bg-red-900 text-red-200 rounded text-xs">⚔️ {rewards.militaryStrength}</span>}
        {rewards.culturalInfluence && <span className="px-2 py-1 bg-yellow-900 text-yellow-200 rounded text-xs">✨ {rewards.culturalInfluence}</span>}
        {rewards.morale && <span className="px-2 py-1 bg-pink-900 text-pink-200 rounded text-xs">😊 +{Math.floor(rewards.morale * 100)}%</span>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-4 border-b-4 border-yellow-600 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            📜 Quest Log
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-700">
          <button
            onClick={() => setTab('available')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              tab === 'available'
                ? 'bg-yellow-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Available ({availableQuests.length})
          </button>
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              tab === 'active'
                ? 'bg-yellow-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Active ({activeQuests.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              tab === 'completed'
                ? 'bg-yellow-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Completed ({completedQuests.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'available' && (
            <div className="space-y-4">
              {availableQuests.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No quests available. Check back next turn!
                </div>
              ) : (
                availableQuests.map(quest => (
                  <div key={quest.id} className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{getQuestIcon(quest.type)}</span>
                        <div>
                          <h3 className="text-xl font-bold text-yellow-400">{quest.name}</h3>
                          <p className={`text-sm uppercase tracking-wider ${getPriorityColor(quest.priority)}`}>
                            {quest.priority || 'Normal'} Priority • Expires Turn {quest.expiresAtTurn}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-300 mb-4">{quest.description}</p>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-yellow-500 mb-2">Rewards:</h4>
                      {renderRewards(quest.rewards)}
                    </div>

                    <button
                      onClick={() => onAcceptQuest(quest.id)}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-semibold transition-colors"
                    >
                      Accept Quest
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'active' && (
            <div className="space-y-4">
              {activeQuests.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No active quests. Accept some from the Available tab!
                </div>
              ) : (
                activeQuests.map(quest => (
                  <div key={quest.id} className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{getQuestIcon(quest.type)}</span>
                        <div>
                          <h3 className="text-xl font-bold text-yellow-400">{quest.name}</h3>
                          <p className={`text-sm uppercase tracking-wider ${getPriorityColor(quest.priority)}`}>
                            {quest.priority || 'Normal'} Priority • Expires Turn {quest.expiresAtTurn}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-300 mb-4">{quest.description}</p>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-yellow-500 mb-2">Objectives:</h4>
                      {renderObjectives(quest)}
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-yellow-500 mb-2">Rewards:</h4>
                      {renderRewards(quest.rewards)}
                    </div>

                    <button
                      onClick={() => onAbandonQuest(quest.id)}
                      className="w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded font-semibold transition-colors"
                    >
                      Abandon Quest
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'completed' && (
            <div className="space-y-4">
              {completedQuests.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No completed quests yet. Get adventuring!
                </div>
              ) : (
                completedQuests.map(quest => (
                  <div key={quest.id} className="bg-gray-800 border-2 border-green-600 rounded-lg p-4 opacity-75">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{getQuestIcon(quest.type)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
                          {quest.name}
                          <span className="text-2xl">✓</span>
                        </h3>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">{quest.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestLogPanel;
