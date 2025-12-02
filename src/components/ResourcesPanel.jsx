import React from 'react';
import { getSpeciesById } from '../data/humanSpecies.js';

const ResourcesPanel = ({ faction, turn, actionPoints, maxActionPoints, onEndTurn }) => {
  if (!faction) return null;

  const species = getSpeciesById(faction.speciesId);

  return (
    <div style={{
      position: 'fixed',
      top: '12px',
      left: '12px',
      width: '280px',
      background: '#12110f',
      border: '1px solid #2a2a2a',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 40,
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 120px)'
    }}>
      {/* Faction Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          background: `linear-gradient(135deg, ${faction.color}66, ${faction.color}33)`,
          border: `2px solid ${faction.color}`
        }}>
          {species.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#c9a66b',
            marginBottom: '2px'
          }}>
            {faction.name}
          </h3>
          <p style={{
            fontSize: '11px',
            color: '#6a6a5a',
            fontStyle: 'italic'
          }}>
            {species.displayName}
          </p>
        </div>
      </div>

      {/* Turn Info */}
      <div style={{
        background: '#1a1815',
        border: '1px solid #2a2a2a',
        borderRadius: '4px',
        padding: '10px',
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '11px', color: '#6a6a5a', textTransform: 'uppercase' }}>Turn</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#c9a66b' }}>{turn}</span>
        </div>

        {/* Action Points */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '11px', color: '#6a6a5a', textTransform: 'uppercase' }}>Action Points</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7d9a6f' }}>
              {actionPoints} / {maxActionPoints}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[...Array(maxActionPoints)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: '6px',
                  flex: 1,
                  borderRadius: '2px',
                  background: i < actionPoints ? '#7d9a6f' : '#2a2a2a'
                }}
              />
            ))}
          </div>
        </div>

        {/* End Turn Button */}
        <button
          onClick={onEndTurn}
          style={{
            width: '100%',
            padding: '10px',
            background: actionPoints > 0 ? 'linear-gradient(135deg, #4a3a2a, #3a2a1a)' : 'linear-gradient(135deg, #5a4a3a, #4a3a2a)',
            border: '2px solid #6a5a3a',
            borderRadius: '6px',
            color: '#c9a66b',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '13px',
            animation: actionPoints === 0 ? 'pulse 2s infinite' : 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.02)';
            e.target.style.boxShadow = '0 0 15px #6a5a3a44';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {actionPoints > 0 ? 'End Turn' : 'End Turn →'}
        </button>
      </div>

      {/* Resources */}
      <div>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#6a6a5a',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          Resources
        </h4>

        {/* Food */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🍖</span>
              <span style={{ fontSize: '12px', color: '#8a8a7a' }}>Food</span>
            </div>
            <span style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: faction.resources.food >= 50 ? '#7d9a6f' :
                     faction.resources.food >= 20 ? '#c4a35a' : '#a65d32'
            }}>
              {faction.resources.food}
            </span>
          </div>
        </div>

        {/* Materials */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🪵</span>
              <span style={{ fontSize: '12px', color: '#8a8a7a' }}>Materials</span>
            </div>
            <span style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: faction.resources.materials >= 50 ? '#7d9a6f' :
                     faction.resources.materials >= 20 ? '#c4a35a' : '#a65d32'
            }}>
              {faction.resources.materials}
            </span>
          </div>
        </div>

        {/* Knowledge */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📚</span>
              <span style={{ fontSize: '12px', color: '#8a8a7a' }}>Knowledge</span>
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#7a5c8a' }}>
              {faction.resources.knowledge}
            </span>
          </div>
        </div>

        {/* Water */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💧</span>
              <span style={{ fontSize: '12px', color: '#8a8a7a' }}>Water</span>
            </div>
            <span style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: (faction.resources.water || 0) >= 50 ? '#5b8a9a' :
                     (faction.resources.water || 0) >= 20 ? '#c4a35a' : '#a65d32'
            }}>
              {faction.resources.water || 0}
            </span>
          </div>
        </div>

        {/* Population */}
        <div style={{
          background: '#1a1815',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>👥</span>
              <span style={{ fontSize: '12px', color: '#8a8a7a' }}>Population</span>
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#c9a66b' }}>
              {faction.resources.population}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          <div style={{
            background: '#1a1815',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '10px', color: '#6a6a5a', marginBottom: '4px' }}>Settlements</div>
            <div style={{ fontSize: '14px', color: '#c9a66b', fontWeight: 'bold' }}>{faction.settlements.length}</div>
          </div>
          <div style={{
            background: '#1a1815',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '10px', color: '#6a6a5a', marginBottom: '4px' }}>Known Tribes</div>
            <div style={{ fontSize: '14px', color: '#c9a66b', fontWeight: 'bold' }}>{faction.knownFactions.size}</div>
          </div>
          <div style={{
            background: '#1a1815',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '10px', color: '#6a6a5a', marginBottom: '4px' }}>Military</div>
            <div style={{ fontSize: '14px', color: '#c9a66b', fontWeight: 'bold' }}>{faction.militaryStrength}</div>
          </div>
          <div style={{
            background: '#1a1815',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            padding: '8px'
          }}>
            <div style={{ fontSize: '10px', color: '#6a6a5a', marginBottom: '4px' }}>Culture</div>
            <div style={{ fontSize: '14px', color: '#c9a66b', fontWeight: 'bold' }}>{faction.culturalInfluence}</div>
          </div>
        </div>
      </div>

      {/* Species Traits */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #2a2a2a'
      }}>
        <h4 style={{
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#6a6a5a',
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}>
          Species Traits
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(species.traits).map(([key, trait]) => (
            <div
              key={key}
              style={{
                background: '#1a1815',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                padding: '6px'
              }}
              title={trait.description}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#7d9a6f', marginBottom: '2px' }}>
                {trait.name}
              </div>
              <div style={{
                fontSize: '9px',
                color: '#6a6a5a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {trait.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPanel;
