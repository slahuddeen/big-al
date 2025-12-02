import React, { useState } from 'react';
import { HUMAN_SPECIES } from '../data/humanSpecies.js';

const SpeciesSelectionScreen = ({ onSelectSpecies }) => {
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [factionName, setFactionName] = useState('');
  const [factionColor, setFactionColor] = useState('#c9a66b');

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
    '#c9a66b', '#8b5a2b', '#6b8e6b', '#7a6a5a', '#5a6a7a',
    '#4a3a2a', '#6a7a6a', '#5a5a4a', '#4a6a4a', '#a65d32'
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a1815 0%, #0a0a08 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <h1 style={{
        color: '#c9a66b',
        marginBottom: '10px',
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        textShadow: '2px 2px 4px #000',
        textAlign: 'center'
      }}>
        PREHISTORIC TRIBES
      </h1>
      <p style={{
        color: '#6a6a5a',
        marginBottom: '30px',
        fontStyle: 'italic',
        textAlign: 'center'
      }}>
        Choose your species
      </p>

      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {Object.values(HUMAN_SPECIES).filter(species => species.playable).map(species => (
          <button
            key={species.id}
            onClick={() => setSelectedSpecies(species)}
            style={{
              padding: '16px',
              background: selectedSpecies?.id === species.id
                ? `linear-gradient(135deg, ${species.baseColor || '#c9a66b'}44, #1a1815)`
                : `linear-gradient(135deg, ${species.baseColor || '#c9a66b'}22, #1a1815)`,
              border: `2px solid ${selectedSpecies?.id === species.id ? '#c9a66b' : (species.baseColor || '#c9a66b')}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: selectedSpecies?.id === species.id ? `0 0 20px ${species.baseColor || '#c9a66b'}66` : 'none'
            }}
            onMouseEnter={e => {
              if (selectedSpecies?.id !== species.id) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = `0 0 15px ${species.baseColor || '#c9a66b'}33`;
              }
            }}
            onMouseLeave={e => {
              if (selectedSpecies?.id !== species.id) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '40px' }}>{species.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: species.baseColor || '#c9a66b',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '2px'
                }}>
                  {species.displayName}
                </div>
                <div style={{
                  color: '#8a8a7a',
                  fontSize: '11px',
                  marginBottom: '6px',
                  fontStyle: 'italic'
                }}>
                  {species.description}
                </div>
              </div>
            </div>

            {/* Traits */}
            <div style={{ marginBottom: '8px' }}>
              {Object.entries(species.traits).slice(0, 2).map(([key, trait]) => (
                <div key={key} style={{
                  background: '#1a1815',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '6px',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#7d9a6f' }}>
                    {trait.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#6a6a5a' }}>
                    {trait.description.slice(0, 80)}...
                  </div>
                </div>
              ))}
            </div>

            {/* Starting Stats */}
            <div style={{
              fontSize: '10px',
              color: '#5a5a4a',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              borderTop: '1px solid #2a2a2a',
              paddingTop: '6px'
            }}>
              <span>👥 {species.startingBonus.population}</span>
              <span>🍖 {species.startingBonus.food}</span>
              <span>🪵 {species.startingBonus.materials}</span>
              {species.startingBonus.water && <span>💧 {species.startingBonus.water}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Faction Customization */}
      {selectedSpecies && (
        <div style={{
          width: '100%',
          maxWidth: '600px',
          background: '#12110f',
          border: '2px solid #4a4a3a',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            color: '#c9a66b',
            fontSize: '18px',
            marginBottom: '16px',
            textAlign: 'center',
            fontFamily: 'Georgia, serif'
          }}>
            Customize Your {selectedSpecies.fantasyName} Tribe
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#6a6a5a',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              Tribe Name
            </label>
            <input
              type="text"
              value={factionName}
              onChange={(e) => setFactionName(e.target.value)}
              placeholder={`Enter your ${selectedSpecies.fantasyName} tribe name...`}
              style={{
                width: '100%',
                background: '#1a1815',
                border: '1px solid #3a3a2a',
                borderRadius: '4px',
                padding: '12px',
                color: '#c9c9b9',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              }}
              onFocus={(e) => e.target.style.border = '1px solid #c9a66b'}
              onBlur={(e) => e.target.style.border = '1px solid #3a3a2a'}
              maxLength={30}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#6a6a5a',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              Tribe Color
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setFactionColor(color)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: factionColor === color ? '3px solid #c9a66b' : '2px solid #3a3a2a',
                    background: color,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: factionColor === color ? 'scale(1.1)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (factionColor !== color) {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.border = '2px solid #6a6a5a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (factionColor !== color) {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.border = '2px solid #3a3a2a';
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedSpecies || !factionName.trim()}
        style={{
          padding: '16px 48px',
          background: (selectedSpecies && factionName.trim())
            ? 'linear-gradient(135deg, #4a3a2a, #3a2a1a)'
            : '#2a2a2a',
          border: (selectedSpecies && factionName.trim())
            ? '2px solid #6a5a3a'
            : '2px solid #3a3a3a',
          borderRadius: '8px',
          color: (selectedSpecies && factionName.trim()) ? '#c9a66b' : '#5a5a4a',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: (selectedSpecies && factionName.trim()) ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (selectedSpecies && factionName.trim()) {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 0 20px #6a5a3a66';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'none';
        }}
      >
        {selectedSpecies && factionName.trim()
          ? `Begin as ${selectedSpecies.fantasyName}`
          : 'Select Species and Name Your Tribe'}
      </button>
    </div>
  );
};

export default SpeciesSelectionScreen;
