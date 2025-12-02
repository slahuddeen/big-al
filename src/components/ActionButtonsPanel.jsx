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
    <div style={{
      position: 'fixed',
      right: '12px',
      bottom: '100px',
      width: '240px',
      background: '#12110f',
      border: '1px solid #2a2a2a',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 40
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #2a2a2a',
        color: '#6a6a5a',
        fontSize: '11px',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        marginBottom: '10px'
      }}>
        Selected Hex
      </div>

      {!isPlayerHere && (
        <div style={{
          fontSize: '12px',
          color: '#6a6a5a',
          marginBottom: '12px',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          Move here to perform actions
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Found Settlement */}
        {isPlayerHere && !settlement && (
          <>
            <button
              onClick={() => {
                const name = prompt('Enter settlement name:', 'New Camp');
                if (name) {
                  onFoundSettlement(selectedHex, name);
                }
              }}
              disabled={actionPoints < 2 || !foundValidation.canFound}
              style={{
                width: '100%',
                padding: '10px',
                background: (actionPoints >= 2 && foundValidation.canFound)
                  ? 'linear-gradient(135deg, #3a4a3a, #2a3a2a)'
                  : '#2a2a2a',
                border: (actionPoints >= 2 && foundValidation.canFound)
                  ? '1px solid #5a6a5a'
                  : '1px solid #3a3a3a',
                borderRadius: '4px',
                color: (actionPoints >= 2 && foundValidation.canFound) ? '#c9a66b' : '#5a5a4a',
                fontWeight: 'bold',
                cursor: (actionPoints >= 2 && foundValidation.canFound) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}
              onMouseEnter={(e) => {
                if (actionPoints >= 2 && foundValidation.canFound) {
                  e.target.style.background = 'linear-gradient(135deg, #4a5a4a, #3a4a3a)';
                }
              }}
              onMouseLeave={(e) => {
                if (actionPoints >= 2 && foundValidation.canFound) {
                  e.target.style.background = 'linear-gradient(135deg, #3a4a3a, #2a3a2a)';
                }
              }}
            >
              <span>🏘️ Found Settlement</span>
              <span style={{ fontSize: '10px' }}>2 AP</span>
            </button>
            {!foundValidation.canFound && (
              <div style={{
                fontSize: '10px',
                color: '#a65d32',
                paddingLeft: '8px',
                marginTop: '-4px'
              }}>
                {foundValidation.reason}
              </div>
            )}
          </>
        )}

        {/* Hunt Animal */}
        {isPlayerHere && (
          <button
            onClick={() => onHuntAnimal(selectedHex)}
            disabled={actionPoints < 1}
            style={{
              width: '100%',
              padding: '10px',
              background: actionPoints >= 1
                ? 'linear-gradient(135deg, #4a3a2a, #3a2a1a)'
                : '#2a2a2a',
              border: actionPoints >= 1
                ? '1px solid #6a5a3a'
                : '1px solid #3a3a3a',
              borderRadius: '4px',
              color: actionPoints >= 1 ? '#c9a66b' : '#5a5a4a',
              fontWeight: 'bold',
              cursor: actionPoints >= 1 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => {
              if (actionPoints >= 1) {
                e.target.style.background = 'linear-gradient(135deg, #5a4a3a, #4a3a2a)';
              }
            }}
            onMouseLeave={(e) => {
              if (actionPoints >= 1) {
                e.target.style.background = 'linear-gradient(135deg, #4a3a2a, #3a2a1a)';
              }
            }}
          >
            <span>🏹 Hunt Animals</span>
            <span style={{ fontSize: '10px' }}>1 AP</span>
          </button>
        )}

        {/* View Settlement */}
        {settlement && (
          <div style={{
            background: '#1a1815',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '10px'
          }}>
            <div style={{ fontSize: '12px', color: '#8a8a7a', marginBottom: '4px' }}>
              Settlement: <span style={{ color: '#c9a66b', fontWeight: 'bold' }}>{settlement.name}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#6a6a5a', fontStyle: 'italic' }}>
              Click settlement on map to view details
            </div>
          </div>
        )}

        {/* Center Camera */}
        <button
          onClick={onCenterCamera}
          style={{
            width: '100%',
            padding: '8px',
            background: 'linear-gradient(135deg, #2a3a4a, #1a2a3a)',
            border: '1px solid #3a4a5a',
            borderRadius: '4px',
            color: '#c9a66b',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
          onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #3a4a5a, #2a3a4a)'}
          onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #2a3a4a, #1a2a3a)'}
        >
          🎯 Center Camera
        </button>

        {/* Hex Info */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '10px',
          borderTop: '1px solid #2a2a2a',
          marginTop: '4px'
        }}>
          <div style={{ color: '#6a6a5a', marginBottom: '2px' }}>
            Coordinates: ({selectedHex.q}, {selectedHex.r})
          </div>
          <div style={{ color: '#6a6a5a' }}>
            Terrain: {selectedHex.terrain}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionButtonsPanel;
