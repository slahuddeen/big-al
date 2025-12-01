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
import QuestLogPanel from './components/QuestLogPanel.jsx';
import TechTreePanel from './components/TechTreePanel.jsx';
import MilitaryPanel from './components/MilitaryPanel.jsx';
import ChapterProgressPanel from './components/ChapterProgressPanel.jsx';

const PrehistoricTribesGame = () => {
  const [gameState, dispatch] = useReducer(tribGameReducer, initialTribGameState);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedSettlement, setSelectedSettlement] = useState(null);

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
    return getBackgroundGradient(1); // Always day for now
  }, []);

  if (!playerFaction) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen overflow-hidden relative select-none"
      style={{ background: backgroundGradient }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Game Title */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <h1 className="text-4xl font-bold text-yellow-500 text-center drop-shadow-lg">
          Prehistoric Tribes
        </h1>
        <p className="text-sm text-gray-300 text-center">
          {gameState.currentMessage}
        </p>
      </div>

      {/* Hex Grid Container */}
      <div
        className="absolute"
        style={{
          width: '400vw',
          height: '400vh',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${cameraOffset.x}px), calc(-50% + ${cameraOffset.y}px))`
        }}
      >
        {renderHexes}
      </div>

      {/* Leader Selection Screen */}
      {gameState.gamePhase === 'setup' && (
        <LeaderSelectionScreen
          faction={playerFaction}
          onSelectLeader={handleSelectLeader}
        />
      )}

      {/* Menu Bar */}
      {gameState.gamePhase === 'playing' && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 flex gap-2">
          <button
            onClick={() => setShowQuestLog(true)}
            className="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2"
          >
            📜 Quests
            {gameState.availableQuests && gameState.availableQuests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {gameState.availableQuests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowTechTree(true)}
            className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded font-semibold transition-colors"
          >
            🔬 Tech Tree
          </button>
          <button
            onClick={() => setShowMilitary(true)}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition-colors flex items-center gap-2"
          >
            ⚔️ Military
            <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
              {gameState.units.filter(u => u.factionId === playerFaction.id).length}
            </span>
          </button>
          <button
            onClick={() => setShowChapterProgress(true)}
            className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold transition-colors"
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

      {/* Controls Info */}
      <div className="fixed bottom-4 left-4 bg-gray-900 bg-opacity-80 rounded-lg p-3 text-xs text-gray-300 z-40">
        <div>🖱️ <strong>Click</strong> hex to move | <strong>Drag</strong> to pan map</div>
        <div>⌨️ <strong>C</strong> center | <strong>R</strong> reset | <strong>Space</strong> end turn</div>
        <div>📍 Hexes explored: {[...gameState.hexes.values()].filter(h => h.discovered).length}</div>
      </div>

      {/* Setup Screen */}
      {gameState.gamePhase === 'setup' && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg p-8 max-w-2xl">
            <h2 className="text-3xl font-bold text-yellow-500 mb-4 text-center">
              🌍 Welcome to Prehistoric Tribes
            </h2>
            <p className="text-gray-300 mb-6 text-center">
              Lead your tribe through the challenges of prehistoric life. Hunt, explore, trade with other tribes,
              and build settlements to ensure your people's survival.
            </p>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-yellow-500 mb-4">Choose Your Species</h3>
              <div className="space-y-3">
                {/* For now, auto-start with Homo Sapiens */}
                <button
                  onClick={() => dispatch({
                    type: 'SETUP_PLAYER_FACTION',
                    name: 'The Wanderers',
                    speciesId: 'homo_sapiens',
                    color: '#004E89',
                    customization: {}
                  })}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-white py-4 px-6 rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🧑</span>
                    <div>
                      <div className="text-lg font-bold">Homo Sapiens - The Wanderers</div>
                      <div className="text-sm text-blue-200">
                        Innovative, adaptable, and social. Best all-around species.
                      </div>
                    </div>
                  </div>
                </button>

                <div className="text-center text-gray-500 text-sm mt-4">
                  More species and customization coming soon!
                </div>
              </div>
            </div>

            <div className="text-center text-gray-400 text-xs">
              Click Start to begin your journey
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrehistoricTribesGame;
