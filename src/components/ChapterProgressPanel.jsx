import React from 'react';
import { getChapterProgress } from '../data/chapterSystem.js';

const ChapterProgressPanel = ({ activeChapter, completedChapters, onClose }) => {
  if (!activeChapter) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-4xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">📖 No Active Chapter</h2>
            <p className="text-gray-400">Select a leader to begin your journey!</p>
            <button
              onClick={onClose}
              className="mt-6 bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = getChapterProgress(activeChapter);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-6 border-b-4 border-yellow-600 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              📖 Chapter {activeChapter.number}: {activeChapter.name}
            </h2>
            <p className="text-yellow-200 text-lg">{activeChapter.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 p-4 border-b-2 border-gray-700">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Chapter Progress</span>
            <span>{progress.current} / {progress.total} Objectives Complete</span>
          </div>
          <div className="bg-gray-700 h-4 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Narrative */}
          <div className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">The Story So Far</h3>
            <p className="text-gray-300 leading-relaxed italic">
              {activeChapter.narrative.intro}
            </p>
          </div>

          {/* Description */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-gray-300">{activeChapter.description}</p>
          </div>

          {/* Objectives */}
          <div className="space-y-3 mb-6">
            <h3 className="text-xl font-bold text-yellow-400">Objectives</h3>
            {activeChapter.objectives.map((objective, index) => {
              const isComplete = objective.completed;
              const hasProgress = objective.progress !== undefined && objective.target !== undefined;

              return (
                <div
                  key={objective.id}
                  className={`border-2 rounded-lg p-4 ${
                    isComplete
                      ? 'border-green-600 bg-green-900 bg-opacity-20'
                      : objective.required
                      ? 'border-yellow-600 bg-gray-800'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>
                      {isComplete ? '✓' : objective.required ? '○' : '◇'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-semibold ${isComplete ? 'text-green-400 line-through' : 'text-white'}`}>
                          {objective.description}
                        </h4>
                        {!objective.required && (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                            Optional
                          </span>
                        )}
                      </div>

                      {/* Progress Bar (if applicable) */}
                      {hasProgress && !isComplete && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{objective.progress} / {objective.target}</span>
                          </div>
                          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-yellow-500 h-full transition-all"
                              style={{ width: `${(objective.progress / objective.target) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rewards */}
          <div className="bg-gray-800 border-2 border-yellow-600 rounded-lg p-4">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">Chapter Rewards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeChapter.rewards.knowledge && (
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-2xl mb-1">📚</div>
                  <div className="text-sm text-gray-400">Knowledge</div>
                  <div className="text-lg font-bold text-purple-400">+{activeChapter.rewards.knowledge}</div>
                </div>
              )}
              {activeChapter.rewards.culturalInfluence && (
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-2xl mb-1">✨</div>
                  <div className="text-sm text-gray-400">Culture</div>
                  <div className="text-lg font-bold text-yellow-400">+{activeChapter.rewards.culturalInfluence}</div>
                </div>
              )}
              {activeChapter.rewards.materials && (
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-2xl mb-1">🪵</div>
                  <div className="text-sm text-gray-400">Materials</div>
                  <div className="text-lg font-bold text-orange-400">+{activeChapter.rewards.materials}</div>
                </div>
              )}
              {activeChapter.rewards.actionPoints && (
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-sm text-gray-400">Action Points</div>
                  <div className="text-lg font-bold text-cyan-400">+{activeChapter.rewards.actionPoints}</div>
                </div>
              )}
              {activeChapter.rewards.permanentBonus && (
                <div className="bg-gray-900 rounded p-3 text-center col-span-2">
                  <div className="text-2xl mb-1">🌟</div>
                  <div className="text-sm text-gray-400">Permanent Bonus</div>
                  <div className="text-xs font-bold text-green-400">
                    {Object.entries(activeChapter.rewards.permanentBonus).map(([key, value]) => (
                      <div key={key}>{key}: +{Math.round((value - 1) * 100)}%</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Completed Chapters */}
          {completedChapters.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-bold text-green-400 mb-3">Completed Chapters</h3>
              <div className="flex flex-wrap gap-2">
                {completedChapters.map(chapterId => (
                  <div
                    key={chapterId}
                    className="bg-green-900 bg-opacity-30 border-2 border-green-600 rounded-lg px-4 py-2"
                  >
                    <span className="text-green-400 font-semibold">✓ {chapterId.replace('_', ' ').toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-700 p-4 bg-gray-800 text-center">
          <p className="text-sm text-gray-400">
            Complete all required objectives to unlock the next chapter
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChapterProgressPanel;
