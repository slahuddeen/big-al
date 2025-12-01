import React, { useState } from 'react';
import { SETTLEMENT_TYPES, SETTLEMENT_BUILDINGS, canUpgrade, canBuildBuilding } from '../data/settlements.js';

const SettlementPanel = ({ settlement, terrain, faction, onBuild, onUpgrade, onClose }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [tab, setTab] = useState('overview'); // 'overview', 'buildings', 'production'

  if (!settlement) return null;

  const settlementType = SETTLEMENT_TYPES[settlement.type];
  const populationPercent = (settlement.population / settlement.maxPopulation) * 100;

  const canAffordBuilding = (buildingKey) => {
    const building = SETTLEMENT_BUILDINGS[buildingKey];
    return (
      (building.cost.materials || 0) <= faction.resources.materials &&
      (building.cost.knowledge || 0) <= faction.resources.knowledge
    );
  };

  return (
    <div className="fixed right-4 top-4 bottom-4 w-96 bg-gray-900 bg-opacity-95 border-2 border-yellow-600 rounded-lg overflow-hidden z-40 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-yellow-500">{settlement.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{settlementType.emoji}</span>
              <span className="text-sm text-gray-400">{settlementType.name}</span>
              {settlement.isCapital && (
                <span className="text-xs bg-yellow-700 text-white px-2 py-1 rounded">
                  ⭐ Capital
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Population Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Population</span>
            <span>{settlement.population} / {settlement.maxPopulation}</span>
          </div>
          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${populationPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            tab === 'overview'
              ? 'bg-yellow-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('buildings')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            tab === 'buildings'
              ? 'bg-yellow-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Buildings
        </button>
        <button
          onClick={() => setTab('production')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            tab === 'production'
              ? 'bg-yellow-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Production
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Resources Stored */}
            <div>
              <h4 className="text-sm font-semibold text-yellow-500 mb-2">Stored Resources</h4>
              <div className="space-y-2">
                <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">🍖 Food</span>
                  <span className="font-bold text-green-400">{settlement.storedFood}</span>
                </div>
                <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">🪵 Materials</span>
                  <span className="font-bold text-orange-400">{settlement.storedMaterials}</span>
                </div>
              </div>
            </div>

            {/* Current Production */}
            <div>
              <h4 className="text-sm font-semibold text-yellow-500 mb-2">Current Production</h4>
              <div className="space-y-2">
                <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">🍖 Food/Turn</span>
                  <span className="font-bold text-green-400">+{settlement.production.food}</span>
                </div>
                <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">🪵 Materials/Turn</span>
                  <span className="font-bold text-orange-400">+{settlement.production.materials}</span>
                </div>
                <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">📚 Knowledge/Turn</span>
                  <span className="font-bold text-purple-400">+{settlement.production.knowledge}</span>
                </div>
              </div>
            </div>

            {/* Defense */}
            <div>
              <h4 className="text-sm font-semibold text-yellow-500 mb-2">Defense</h4>
              <div className="bg-gray-800 rounded p-2 flex justify-between items-center">
                <span className="text-sm text-gray-300">🛡️ Defensive Strength</span>
                <span className="font-bold text-blue-400">{settlement.defensiveStrength}</span>
              </div>
            </div>

            {/* Upgrade */}
            {settlementType.upgradesTo && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-500 mb-2">Upgrade Settlement</h4>
                <div className="bg-gray-800 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{SETTLEMENT_TYPES[settlementType.upgradesTo].emoji}</span>
                    <span className="font-semibold text-white">
                      {SETTLEMENT_TYPES[settlementType.upgradesTo].name}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 mb-3">
                    <div>Population: {settlementType.upgradeRequirements.population}</div>
                    <div>Materials: {settlementType.upgradeRequirements.materials}</div>
                    <div>Knowledge: {settlementType.upgradeRequirements.knowledge}</div>
                  </div>

                  <button
                    onClick={() => onUpgrade(settlement.id)}
                    disabled={!canUpgrade(settlement, faction)}
                    className={`w-full py-2 rounded font-semibold transition-colors ${
                      canUpgrade(settlement, faction)
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canUpgrade(settlement, faction) ? 'Upgrade' : 'Requirements Not Met'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'buildings' && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-yellow-500 mb-2">Existing Buildings</h4>
            <div className="space-y-2 mb-4">
              {settlement.buildings.map((buildingKey) => {
                const building = SETTLEMENT_BUILDINGS[buildingKey];
                return (
                  <div key={buildingKey} className="bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{building.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">{building.name}</div>
                        <div className="text-xs text-gray-400">{building.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <h4 className="text-sm font-semibold text-yellow-500 mb-2 pt-3 border-t border-gray-700">
              Available Buildings
            </h4>
            <div className="space-y-2">
              {Object.entries(SETTLEMENT_BUILDINGS).map(([buildingKey, building]) => {
                const hasBuilding = settlement.buildings.includes(buildingKey);
                const canBuild = canBuildBuilding(settlement, buildingKey, terrain);
                const canAfford = canAffordBuilding(buildingKey);

                if (hasBuilding) return null;

                return (
                  <div
                    key={buildingKey}
                    className={`bg-gray-800 rounded p-3 ${
                      canBuild && canAfford
                        ? 'border border-yellow-600'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl">{building.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">{building.name}</div>
                        <div className="text-xs text-gray-400 mb-2">{building.description}</div>

                        {/* Cost */}
                        <div className="text-xs text-gray-400 mb-2">
                          Cost:
                          {building.cost.materials && (
                            <span className={`ml-2 ${
                              faction.resources.materials >= building.cost.materials
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              🪵 {building.cost.materials}
                            </span>
                          )}
                          {building.cost.knowledge && (
                            <span className={`ml-2 ${
                              faction.resources.knowledge >= building.cost.knowledge
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              📚 {building.cost.knowledge}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onBuild(settlement.id, buildingKey)}
                          disabled={!canBuild || !canAfford}
                          className={`w-full py-1 rounded text-xs font-semibold transition-colors ${
                            canBuild && canAfford
                              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {!canBuild ? 'Cannot Build Here' :
                           !canAfford ? 'Insufficient Resources' :
                           'Build'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'production' && (
          <div className="space-y-4">
            <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3">
              <p className="text-xs text-blue-200 text-center">
                👷 Population assignment system coming soon!
              </p>
            </div>

            <h4 className="text-sm font-semibold text-yellow-500">Current Assignments</h4>
            {Object.entries(settlement.assignments).map(([role, count]) => (
              <div key={role} className="bg-gray-800 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300 capitalize">{role}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettlementPanel;
