import React from 'react';
import { canFoundSettlement } from '../data/settlements.js';

const ActionButtonsPanel = ({
  selectedHex,
  hexes,
  settlements,
  playerPosition,
  actionPoints,
  onFoundSettlement,
  onHuntAnimal,
  onCenterCamera
}) => {
  if (!selectedHex) return null;

  const hexKey = `${selectedHex.q},${selectedHex.r}`;
  const terrain = selectedHex;
  const settlement = settlements.find(s => s.hex.q === selectedHex.q && s.hex.r === selectedHex.r);
  const isPlayerHere = selectedHex.q === playerPosition.q && selectedHex.r === playerPosition.r;

  // Check if can found settlement
  const canFound = !settlement && canFoundSettlement && isPlayerHere;
  const foundValidation = canFound ? canFoundSettlement(hexes, selectedHex) : { canFound: false };

  return (
    <div className="fixed right-4 bottom-20 bg-gray-900 bg-opacity-95 border-2 border-yellow-600 rounded-lg p-4 w-80 z-40">
      <h3 className="text-lg font-bold text-yellow-400 mb-3">Actions</h3>

      {!isPlayerHere && (
        <div className="text-sm text-gray-400 mb-3">
          Move to this hex to perform actions
        </div>
      )}

      <div className="space-y-2">
        {/* Found Settlement */}
        {isPlayerHere && !settlement && (
          <button
            onClick={() => {
              const name = prompt('Enter settlement name:', 'New Camp');
              if (name) {
                onFoundSettlement(selectedHex, name);
              }
            }}
            disabled={actionPoints < 2 || !foundValidation.canFound}
            className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-between ${
              actionPoints >= 2 && foundValidation.canFound
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>🏘️ Found Settlement</span>
            <span className="text-xs">2 AP</span>
          </button>
        )}
        {isPlayerHere && !settlement && !foundValidation.canFound && (
          <div className="text-xs text-red-400 -mt-2 mb-2 px-2">
            {foundValidation.reason}
          </div>
        )}

        {/* Hunt Animal */}
        {isPlayerHere && (
          <button
            onClick={() => onHuntAnimal(selectedHex)}
            disabled={actionPoints < 1}
            className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-between ${
              actionPoints >= 1
                ? 'bg-orange-700 hover:bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>🏹 Hunt Animals</span>
            <span className="text-xs">1 AP</span>
          </button>
        )}

        {/* View Settlement */}
        {settlement && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-sm text-gray-300">
              Settlement: <span className="text-yellow-400 font-semibold">{settlement.name}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Click settlement icon on map to view details
            </div>
          </div>
        )}

        {/* Center Camera */}
        <button
          onClick={onCenterCamera}
          className="w-full py-2 rounded-lg font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors"
        >
          🎯 Center Camera
        </button>

        {/* Hex Info */}
        <div className="bg-gray-800 rounded p-3 text-xs">
          <div className="text-gray-400">Coordinates: ({selectedHex.q}, {selectedHex.r})</div>
          <div className="text-gray-400">Terrain: {selectedHex.terrain}</div>
        </div>
      </div>
    </div>
  );
};

export default ActionButtonsPanel;
