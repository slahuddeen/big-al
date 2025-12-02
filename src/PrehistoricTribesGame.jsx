// ==================== PREHISTORIC TRIBES - TURN-BASED STRATEGY GAME ====================
import React, { useReducer, useEffect, useCallback, useState, useMemo } from 'react';
import { hexDistance, getHexNeighbors, hexToPixel } from './utils/hexMath.js';
import { TERRAIN_TYPES, getBackgroundGradient } from './data/terrain.js';
import { initialTribGameState, tribGameReducer } from './game/tribGameState.js';
import { getSpeciesById } from './data/humanSpecies.js';

// Component imports
import HexTile from './components/HexTile.jsx';
import ResourcesPanel from './components/ResourcesPanel.jsx';
import DiplomacyPanel from './components/DiplomacyPanel.jsx';
import SettlementPanel from './components/SettlementPanel.jsx';
import TradePanel from './components/TradePanel.jsx';
import NotificationSystem from './components/NotificationSystem.jsx';
import HoverTooltip from './components/HoverTooltip.jsx';
import LeaderSelectionScreen from './components/LeaderSelectionScreen.jsx';
import SpeciesSelectionScreen from './components/SpeciesSelectionScreen.jsx';
import ActionButtonsPanel from './components/ActionButtonsPanel.jsx';
import QuestLogPanel from './components/QuestLogPanel.jsx';
import TechTreePanel from './components/TechTreePanel.jsx';
import MilitaryPanel from './components/MilitaryPanel.jsx';
import ChapterProgressPanel from './components/ChapterProgressPanel.jsx';

const PrehistoricTribesGame = () => {
  const [gameState, dispatch] = useReducer(tribGameReducer, initialTribGameState);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [setupPhase, setSetupPhase] = useState('species'); // 'species', 'leader', 'playing'

  // Panel visibility state
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showTechTree, setShowTechTree] = useState(false);
  const [showMilitary, setShowMilitary] = useState(false);
  const [showChapterProgress, setShowChapterProgress] = useState(false);

  // Camera state
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Get player faction
  const playerFaction = useMemo(() => {
    return gameState.factions.find(f => f.id === gameState.playerFactionId);
  }, [gameState.factions, gameState.playerFactionId]);

  // Generate initial terrain features
  useEffect(() => {
    if (!gameState.mapGenerated) {
      dispatch({ type: 'GENERATE_TERRAIN_FEATURES' });
    }
  }, [gameState.mapGenerated]);

  // Generate hexes around player
  useEffect(() => {
    if (!gameState.mapGenerated) return;

    const radius = 12;
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (hexDistance({ q, r }, { q: 0, r: 0 }) <= radius) {
          dispatch({ type: 'GENERATE_HEX', q, r });
        }
      }
    }
  }, [gameState.playerPosition, gameState.mapGenerated]);

  // Update visibility
  useEffect(() => {
    if (gameState.hexes.size > 0) {
      dispatch({ type: 'UPDATE_VISIBILITY' });
    }
  }, [gameState.playerPosition, gameState.hexes.size]);

  // Auto-dismiss notifications
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'AUTO_DISMISS_NOTIFICATIONS' });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Camera dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (!e.target.closest('.hex-tile') && !e.target.closest('[data-no-drag]')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartOffset({ ...cameraOffset });
      e.preventDefault();
    }
  }, [cameraOffset]);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newOffset = {
        x: dragStartOffset.x + deltaX,
        y: dragStartOffset.y + deltaY
      };

      setCameraOffset(newOffset);
    }
  }, [isDragging, dragStart, dragStartOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
        setCameraOffset({ x: 0, y: 0 });
      }

      if (e.key.toLowerCase() === 'c' && !e.ctrlKey) {
        const playerPixel = hexToPixel(gameState.playerPosition.q, gameState.playerPosition.r);
        setCameraOffset({ x: -playerPixel.x, y: -playerPixel.y });
      }

      // Space bar to end turn
      if (e.code === 'Space' && !e.ctrlKey && !e.shiftKey) {
        dispatch({ type: 'END_TURN' });
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cameraOffset, gameState.playerPosition]);

  // Hex click handler
  const handleHexClick = useCallback((hex) => {
    if (isDragging) return;

    const hexKey = `${hex.q},${hex.r}`;
    const distance = hexDistance(gameState.playerPosition, hex);

    // Check if there's a settlement here
    const settlement = gameState.settlements.find(s =>
      s.hex.q === hex.q && s.hex.r === hex.r
    );

    if (settlement) {
      if (settlement.factionId === playerFaction.id) {
        // Player's settlement - open management panel
        setSelectedSettlement(settlement);
      } else {
        // Other faction's settlement - open diplomacy
        dispatch({ type: 'OPEN_DIPLOMACY', factionId: settlement.factionId });
      }
      return;
    }

    // Move player if adjacent
    if (distance === 1) {
      dispatch({ type: 'MOVE_PLAYER', target: hex });
    }

    dispatch({ type: 'SELECT_HEX', hex });
  }, [isDragging, gameState.playerPosition, gameState.settlements, playerFaction]);

  const handleHexHover = useCallback((hex) => {
    dispatch({ type: 'HOVER_HEX', hex });
  }, []);

  const handleHexLeave = useCallback(() => {
    dispatch({ type: 'CLEAR_HOVER' });
  }, []);

  // Diplomacy handlers
  const handleDiplomacyAction = useCallback((targetFactionId, actionType, data) => {
    dispatch({
      type: 'DIPLOMACY_ACTION',
      targetFactionId,
      actionType,
      data
    });
  }, []);

  const handleCloseDiplomacy = useCallback(() => {
    dispatch({ type: 'CLOSE_DIPLOMACY' });
  }, []);

  // Trade handlers
  const handleAcceptTrade = useCallback((offerId) => {
    dispatch({ type: 'ACCEPT_TRADE', offerId });
  }, []);

  const handleRejectTrade = useCallback((offerId) => {
    dispatch({ type: 'REJECT_TRADE', offerId });
  }, []);

  // Settlement handlers
  const handleBuildInSettlement = useCallback((settlementId, buildingKey) => {
    dispatch({
      type: 'BUILD_IN_SETTLEMENT',
      settlementId,
      buildingKey
    });
  }, []);

  const handleUpgradeSettlement = useCallback((settlementId) => {
    dispatch({
      type: 'UPGRADE_SETTLEMENT',
      settlementId
    });
  }, []);

  // Leader/Character handlers
  const handleSelectLeader = useCallback((characterId) => {
    dispatch({ type: 'SELECT_LEADER', characterId });
  }, []);

  const handleRecruitCharacter = useCallback((characterId, location) => {
    dispatch({ type: 'RECRUIT_CHARACTER', characterId, location });
  }, []);

  // Tech handlers
  const handleStartResearch = useCallback((techId) => {
    dispatch({ type: 'START_RESEARCH', techId });
  }, []);

  const handleCancelResearch = useCallback(() => {
    dispatch({ type: 'CANCEL_RESEARCH' });
  }, []);

  // Military handlers
  const handleTrainUnit = useCallback((unitTypeId, settlementId) => {
    dispatch({ type: 'TRAIN_UNIT', unitTypeId, settlementId });
  }, []);

  const handleMoveUnit = useCallback((unitId, targetHex) => {
    dispatch({ type: 'MOVE_UNIT', unitId, targetHex });
  }, []);

  const handleDisbandUnit = useCallback((unitId) => {
    dispatch({ type: 'DISBAND_UNIT', unitId });
  }, []);

  // Quest handlers
  const handleAcceptQuest = useCallback((questId) => {
    dispatch({ type: 'ACCEPT_QUEST', questId });
  }, []);

  const handleAbandonQuest = useCallback((questId) => {
    dispatch({ type: 'ABANDON_QUEST', questId });
  }, []);

  // Species and setup handlers
  const handleSelectSpecies = useCallback((speciesData) => {
    dispatch({
      type: 'SETUP_PLAYER_FACTION',
      name: speciesData.name,
      speciesId: speciesData.speciesId,
      color: speciesData.color,
      customization: {}
    });
    setSetupPhase('leader');
  }, []);

  const handleCompleteLeaderSelection = useCallback((characterId) => {
    handleSelectLeader(characterId);
    setSetupPhase('playing');
  }, [handleSelectLeader]);

  // Action button handlers
  const handleFoundSettlement = useCallback((hex, name) => {
    dispatch({
      type: 'FOUND_SETTLEMENT',
      hex,
      name
    });
  }, []);

  const handleHuntAnimal = useCallback((hex) => {
    dispatch({
      type: 'HUNT_ANIMAL',
      hex
    });
  }, []);

  const handleCenterCamera = useCallback(() => {
    const playerPixel = hexToPixel(gameState.playerPosition.q, gameState.playerPosition.r);
    setCameraOffset({ x: -playerPixel.x, y: -playerPixel.y });
  }, [gameState.playerPosition]);

  // Render hexes
  const renderHexes = useMemo(() => {
    const hexes = [];

    for (const hex of gameState.hexes.values()) {
      if (!hex.discovered) continue;

      const hexKey = `${hex.q},${hex.r}`;
      const isPlayerHere = hex.q === gameState.playerPosition.q && hex.r === gameState.playerPosition.r;
      const settlement = gameState.settlements.find(s => s.hex.q === hex.q && s.hex.r === hex.r);
      const animals = gameState.animals.get(hexKey) || [];

      hexes.push(
        <HexTile
          key={hexKey}
          hex={hex}
          terrain={TERRAIN_TYPES[hex.terrain]}
          isPlayer={isPlayerHere}
          isSelected={gameState.selectedHex && gameState.selectedHex.q === hex.q && gameState.selectedHex.r === hex.r}
          isHovered={gameState.hoveredHex && gameState.hoveredHex.q === hex.q && gameState.hoveredHex.r === hex.r}
          creatures={animals}
          settlement={settlement}
          onClick={() => handleHexClick(hex)}
          onMouseEnter={() => handleHexHover(hex)}
          onMouseLeave={handleHexLeave}
        />
      );
    }

    return hexes;
  }, [gameState.hexes, gameState.playerPosition, gameState.selectedHex, gameState.hoveredHex, gameState.settlements, gameState.animals, handleHexClick, handleHexHover, handleHexLeave]);

  // End turn handler
  const handleEndTurn = useCallback(() => {
    dispatch({ type: 'END_TURN' });
  }, []);

  // Background gradient
  const backgroundGradient = useMemo(() => {
    const isNight = gameState.turn % 2 === 0;
    return getBackgroundGradient({ isNight, currentTerrain: 'plains' });
  }, [gameState.turn]);

  if (!playerFaction) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #1a1815 0%, #0a0a08 100%)'
      }}>
        <div style={{ color: '#c9a66b', fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        background: 'linear-gradient(180deg, #1a1815 0%, #0a0a08 100%)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#c9c9b9',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: '#0a0a08',
        borderBottom: '2px solid #2a2a2a',
        zIndex: 50
      }}>
        <div>
          <span style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#c9a66b',
            fontFamily: 'Georgia, serif',
            textShadow: '2px 2px 4px #000'
          }}>
            PREHISTORIC TRIBES
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            padding: '6px 16px',
            background: '#7d9a6f33',
            border: '1px solid #7d9a6f',
            borderRadius: '4px',
            color: '#7d9a6f',
            fontSize: '14px'
          }}>
            Turn {gameState.turn}
          </div>
          <button
            onClick={handleEndTurn}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #4a3a2a, #3a2a1a)',
              border: '2px solid #6a5a3a',
              borderRadius: '6px',
              color: '#c9a66b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 0 20px #6a5a3a44';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            End Turn
          </button>
        </div>
      </div>

      {/* Hex Grid Container */}
      <div
        style={{
          position: 'absolute',
          width: '400vw',
          height: '400vh',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${cameraOffset.x}px), calc(-50% + ${cameraOffset.y}px))`,
          flex: 1
        }}
      >
        {renderHexes}
      </div>

      {/* Setup Screens */}
      {gameState.gamePhase === 'setup' && setupPhase === 'species' && (
        <SpeciesSelectionScreen
          onSelectSpecies={handleSelectSpecies}
        />
      )}

      {gameState.gamePhase === 'setup' && setupPhase === 'leader' && playerFaction && (
        <LeaderSelectionScreen
          faction={playerFaction}
          onSelectLeader={handleCompleteLeaderSelection}
        />
      )}

      {/* Menu Bar */}
      {gameState.gamePhase === 'playing' && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setShowQuestLog(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #4a3a2a, #3a2a1a)',
              border: '1px solid #6a5a3a',
              borderRadius: '4px',
              color: '#c9a66b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #5a4a3a, #4a3a2a)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #4a3a2a, #3a2a1a)'}
          >
            📜 Quests
            {gameState.availableQuests && gameState.availableQuests.length > 0 && (
              <span style={{
                background: '#a65d32',
                color: '#fff',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {gameState.availableQuests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowTechTree(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3a4a4a, #2a3a3a)',
              border: '1px solid #4a5a5a',
              borderRadius: '4px',
              color: '#c9a66b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #4a5a5a, #3a4a4a)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #3a4a4a, #2a3a3a)'}
          >
            🔬 Tech Tree
          </button>
          <button
            onClick={() => setShowMilitary(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #4a2a2a, #3a1a1a)',
              border: '1px solid #6a3a3a',
              borderRadius: '4px',
              color: '#c9a66b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #5a3a3a, #4a2a2a)'}
            onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #4a2a2a, #3a1a1a)'}
          >
            ⚔️ Military
            <span style={{
              background: '#2a2a1a',
              color: '#c9a66b',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {gameState.units.filter(u => u.factionId === playerFaction.id).length}
            </span>
          </button>
          <button
            onClick={() => setShowChapterProgress(true)}
            style={{
              padding: '8px 16px',
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
            📖 Chapter
          </button>
        </div>
      )}

      {/* UI Panels */}
      {gameState.gamePhase === 'playing' && (
        <>
          <ResourcesPanel
            faction={playerFaction}
            turn={gameState.turn}
            actionPoints={gameState.actionPoints}
            maxActionPoints={gameState.maxActionPoints}
            onEndTurn={handleEndTurn}
          />

          {selectedSettlement && selectedSettlement.factionId === playerFaction.id && (
            <SettlementPanel
              settlement={selectedSettlement}
              terrain={gameState.hexes.get(`${selectedSettlement.hex.q},${selectedSettlement.hex.r}`)}
              faction={playerFaction}
              onBuild={handleBuildInSettlement}
              onUpgrade={handleUpgradeSettlement}
              onClose={() => setSelectedSettlement(null)}
            />
          )}

          {gameState.activeDiplomacy && (
            <DiplomacyPanel
              playerFaction={playerFaction}
              targetFaction={gameState.factions.find(f => f.id === gameState.activeDiplomacy.factionId)}
              isFirstContact={gameState.activeDiplomacy.isFirstContact}
              onAction={handleDiplomacyAction}
              onClose={handleCloseDiplomacy}
            />
          )}

          {gameState.tradeOffers && (
            <TradePanel
              tradeOffers={gameState.tradeOffers}
              factions={gameState.factions}
              onAcceptTrade={handleAcceptTrade}
              onRejectTrade={handleRejectTrade}
            />
          )}

          {/* New Panels */}
          {showQuestLog && (
            <QuestLogPanel
              quests={gameState.quests || []}
              availableQuests={gameState.availableQuests || []}
              onAcceptQuest={handleAcceptQuest}
              onAbandonQuest={handleAbandonQuest}
              onClose={() => setShowQuestLog(false)}
            />
          )}

          {showTechTree && (
            <TechTreePanel
              faction={playerFaction}
              researchQueue={gameState.researchQueue}
              onStartResearch={handleStartResearch}
              onCancelResearch={handleCancelResearch}
              onClose={() => setShowTechTree(false)}
            />
          )}

          {showMilitary && (
            <MilitaryPanel
              faction={playerFaction}
              units={gameState.units}
              settlements={gameState.settlements.filter(s => s.factionId === playerFaction.id)}
              onTrainUnit={handleTrainUnit}
              onDisbandUnit={handleDisbandUnit}
              onClose={() => setShowMilitary(false)}
            />
          )}

          {showChapterProgress && (
            <ChapterProgressPanel
              activeChapter={gameState.activeChapter}
              completedChapters={gameState.completedChapters || []}
              onClose={() => setShowChapterProgress(false)}
            />
          )}
        </>
      )}

      {/* Notifications */}
      <NotificationSystem
        notifications={gameState.notifications}
        onDismiss={(id) => dispatch({ type: 'DISMISS_NOTIFICATION', id })}
      />

      {/* Hover Tooltip */}
      {gameState.hoveredHex && (
        <HoverTooltip
          hex={gameState.hoveredHex}
          terrain={TERRAIN_TYPES[gameState.hoveredHex.terrain]}
          creatures={gameState.animals.get(`${gameState.hoveredHex.q},${gameState.hoveredHex.r}`) || []}
          mousePos={mousePos}
        />
      )}

      {/* Action Buttons */}
      {gameState.gamePhase === 'playing' && gameState.selectedHex && (
        <ActionButtonsPanel
          selectedHex={gameState.selectedHex}
          hexes={gameState.hexes}
          settlements={gameState.settlements}
          playerPosition={gameState.playerPosition}
          actionPoints={gameState.actionPoints}
          onFoundSettlement={handleFoundSettlement}
          onHuntAnimal={handleHuntAnimal}
          onCenterCamera={handleCenterCamera}
        />
      )}

      {/* Controls Info */}
      <div style={{
        position: 'fixed',
        bottom: '12px',
        left: '12px',
        background: '#0a0a08e6',
        border: '1px solid #2a2a2a',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '11px',
        color: '#8a8a7a',
        zIndex: 40
      }}>
        <div style={{ marginBottom: '2px' }}>🖱️ <strong style={{ color: '#c9a66b' }}>Click</strong> hex to move | <strong style={{ color: '#c9a66b' }}>Drag</strong> to pan map</div>
        <div style={{ marginBottom: '2px' }}>⌨️ <strong style={{ color: '#c9a66b' }}>C</strong> center | <strong style={{ color: '#c9a66b' }}>R</strong> reset | <strong style={{ color: '#c9a66b' }}>Space</strong> end turn</div>
        <div>📍 Hexes explored: {[...gameState.hexes.values()].filter(h => h.discovered).length}</div>
      </div>
    </div>
  );
};

export default PrehistoricTribesGame;
