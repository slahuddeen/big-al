import React, { useState } from 'react';
import { UNIT_TYPES, getAvailableUnits, canAffordUnit } from '../data/militaryUnits.js';

const MilitaryPanel = ({ faction, units, settlements, onTrainUnit, onDisbandUnit, onClose }) => {
  const [selectedSettlement, setSelectedSettlement] = useState(settlements[0] || null);
  const [selectedUnitType, setSelectedUnitType] = useState(null);

  const availableUnits = getAvailableUnits(faction, faction.technologies);
  const factionUnits = units.filter(u => u.factionId === faction.id);

  const getUnitTypeStats = (unitTypeId) => {
    return Object.values(UNIT_TYPES).find(u => u.id === unitTypeId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 p-4 border-b-4 border-yellow-600 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              ⚔️ Military Command
            </h2>
            <p className="text-yellow-200 text-sm">
              Active Units: {factionUnits.length} • Upkeep: {factionUnits.reduce((sum, u) => {
                const unitType = getUnitTypeStats(u.typeId);
                return sum + (unitType?.upkeep.food || 0);
              }, 0)} food/turn
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left: Train Units */}
          <div className="w-1/2 border-r-2 border-gray-700 flex flex-col">
            <div className="bg-gray-800 p-4 border-b-2 border-gray-700">
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Train Units</h3>
              <select
                value={selectedSettlement?.id || ''}
                onChange={(e) => setSelectedSettlement(settlements.find(s => s.id === e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
              >
                {settlements.map(settlement => (
                  <option key={settlement.id} value={settlement.id}>
                    {settlement.name} (Pop: {settlement.population})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {availableUnits.map(unitType => {
                  const canAfford = canAffordUnit(faction, unitType);
                  const hasRequiredTech = !unitType.requires.tech || faction.technologies.includes(unitType.requires.tech);
                  const hasRequiredBuilding = !unitType.requires.building ||
                    selectedSettlement?.buildings.includes(unitType.requires.building);

                  const canTrain = canAfford && hasRequiredTech && hasRequiredBuilding;

                  return (
                    <div
                      key={unitType.id}
                      className={`border-2 rounded-lg p-3 ${
                        canTrain
                          ? 'border-cyan-600 bg-gray-800'
                          : 'border-gray-700 bg-gray-900 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-3xl">{unitType.emoji}</span>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-yellow-400">{unitType.name}</h4>
                          <p className="text-xs text-gray-400">{unitType.description}</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-5 gap-2 mb-2 text-xs">
                        <div className="text-center">
                          <div className="text-gray-400">ATK</div>
                          <div className="text-red-400 font-bold">{unitType.stats.attack}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">DEF</div>
                          <div className="text-blue-400 font-bold">{unitType.stats.defense}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">HP</div>
                          <div className="text-green-400 font-bold">{unitType.stats.health}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">MOV</div>
                          <div className="text-cyan-400 font-bold">{unitType.stats.movement}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">RNG</div>
                          <div className="text-purple-400 font-bold">{unitType.stats.range}</div>
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="flex gap-2 mb-2 text-xs flex-wrap">
                        {unitType.cost.population && (
                          <span className={faction.resources.population >= unitType.cost.population ? 'text-blue-400' : 'text-red-400'}>
                            👥 {unitType.cost.population}
                          </span>
                        )}
                        {unitType.cost.food && (
                          <span className={faction.resources.food >= unitType.cost.food ? 'text-green-400' : 'text-red-400'}>
                            🍖 {unitType.cost.food}
                          </span>
                        )}
                        {unitType.cost.materials && (
                          <span className={faction.resources.materials >= unitType.cost.materials ? 'text-orange-400' : 'text-red-400'}>
                            🪵 {unitType.cost.materials}
                          </span>
                        )}
                        {unitType.cost.knowledge && (
                          <span className={faction.resources.knowledge >= unitType.cost.knowledge ? 'text-purple-400' : 'text-red-400'}>
                            📚 {unitType.cost.knowledge}
                          </span>
                        )}
                        <span className="text-gray-400">
                          ⏱️ {unitType.cost.time} turns
                        </span>
                      </div>

                      {/* Upkeep */}
                      <div className="text-xs text-gray-400 mb-2">
                        Upkeep: {unitType.upkeep.food} 🍖/turn
                        {unitType.upkeep.knowledge && `, ${unitType.upkeep.knowledge} 📚/turn`}
                      </div>

                      {/* Requirements */}
                      {(!hasRequiredTech || !hasRequiredBuilding) && (
                        <div className="text-xs text-red-400 mb-2">
                          {!hasRequiredTech && <div>Requires: {unitType.requires.tech}</div>}
                          {!hasRequiredBuilding && <div>Requires: {unitType.requires.building}</div>}
                        </div>
                      )}

                      {/* Train Button */}
                      <button
                        onClick={() => onTrainUnit(unitType.id, selectedSettlement?.id)}
                        disabled={!canTrain || !selectedSettlement}
                        className={`w-full py-2 rounded font-semibold transition-colors ${
                          canTrain && selectedSettlement
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canTrain ? 'Train Unit' : 'Cannot Train'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Active Units */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-800 p-4 border-b-2 border-gray-700">
              <h3 className="text-xl font-bold text-yellow-400">Active Units ({factionUnits.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {factionUnits.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No units trained yet. Train your first unit!
                </div>
              ) : (
                <div className="space-y-3">
                  {factionUnits.map(unit => {
                    const unitType = getUnitTypeStats(unit.typeId);
                    if (!unitType) return null;

                    return (
                      <div key={unit.id} className="border-2 border-gray-700 bg-gray-800 rounded-lg p-3">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-3xl">{unitType.emoji}</span>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-yellow-400">{unitType.name}</h4>
                            <p className="text-xs text-gray-400">
                              Position: ({unit.position.q}, {unit.position.r})
                            </p>
                          </div>
                        </div>

                        {/* Health Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Health</span>
                            <span>{unit.health} / {unitType.stats.health}</span>
                          </div>
                          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all"
                              style={{ width: `${(unit.health / unitType.stats.health) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Experience */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Experience</span>
                            <span>Veterancy: {unit.veterancy}</span>
                          </div>
                          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-yellow-500 h-full transition-all"
                              style={{ width: `${Math.min((unit.experience / 100) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-5 gap-2 mb-2 text-xs">
                          <div className="text-center">
                            <div className="text-gray-400">ATK</div>
                            <div className="text-red-400 font-bold">{unitType.stats.attack}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400">DEF</div>
                            <div className="text-blue-400 font-bold">{unitType.stats.defense}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400">MOV</div>
                            <div className="text-cyan-400 font-bold">{unitType.stats.movement}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400">VIS</div>
                            <div className="text-purple-400 font-bold">{unitType.stats.visionRange}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400">RNG</div>
                            <div className="text-orange-400 font-bold">{unitType.stats.range}</div>
                          </div>
                        </div>

                        {/* Disband Button */}
                        <button
                          onClick={() => onDisbandUnit(unit.id)}
                          className="w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded font-semibold transition-colors text-sm"
                        >
                          Disband (Refund {Math.floor((unitType.cost.population || 0) / 2)} Pop)
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitaryPanel;
