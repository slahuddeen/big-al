// components/BigAlGame.tsx - Compact Layout with Better Space Usage
import React, { useEffect, useRef, useCallback } from 'react';
import { useGame } from '../hooks/useGame';
import GameBoard from './GameBoard';
import StatsPanel from './StatsPanel';
import CreatureDetails from './CreatureDetails';
import Tutorial from './UI/Tutorial';
import FactDisplay from './UI/FactDisplay';
import EventLog from './UI/EventLog';
import LandscapeView from './LandscapeView';

const BigAlGame: React.FC = () => {
    const game = useGame();
    const initialized = useRef(false);

    // Memoize frequently used values
    const gameState = {
        gameStarted: game.gameStarted,
        gameOver: game.gameOver,
        showDinosaurSelection: game.showDinosaurSelection,
        showTutorial: game.showTutorial,
        showFact: game.showFact,
        showCreatureDetails: game.showCreatureDetails,
        showEventLog: game.showEventLog,
        darkMode: game.darkMode,
        currentMessage: game.currentMessage,
        currentFact: game.currentFact,
        selectedCreature: game.selectedCreature,
        movesLeft: game.movesLeft,
        healthEvents: game.healthEvents
    };

    const mapData = {
        map: game.map,
        playerPosition: game.playerPosition,
        motherPosition: game.motherPosition,
        validMoves: game.validMoves,
        revealedTiles: game.revealedTiles,
        growthStage: game.growthStage,
        weather: game.weather,
        timeOfDay: game.timeOfDay,
        season: game.season
    };

    const statsData = {
        growthStage: game.growthStage,
        weight: game.weight,
        fitness: game.fitness,
        hunger: game.hunger,
        thirst: game.thirst,
        energy: game.energy,
        season: game.season,
        weather: game.weather,
        timeOfDay: game.timeOfDay,
        injuries: game.injuries,
        perks: game.perks,
        score: game.score,
        availablePerks: game.availablePerks,
        age: game.age
    };

    // Get current tile information for landscape view with error handling
    const getCurrentTileInfo = useCallback(() => {
        try {
            const currentTileKey = `${game.playerPosition.q},${game.playerPosition.r}`;
            const currentTile = game.map[currentTileKey];

            return {
                terrain: currentTile?.type || 'plains',
                creatures: Array.isArray(currentTile?.creatures) ? currentTile.creatures : []
            };
        } catch (error) {
            console.error('Error getting current tile info:', error);
            return {
                terrain: 'plains',
                creatures: []
            };
        }
    }, [game.map, game.playerPosition]);

    // Memoize handlers
    const handleTileSelection = useCallback((tile: any) => {
        // Handle selecting a tile if needed
    }, []);

    const handleHunting = useCallback((success: boolean) => {
        game.handleHunting(success);
    }, [game.handleHunting]);

    const handleEndTurn = useCallback(() => {
        if (!gameState.gameOver) {
            game.endTurn();
        }
    }, [game.endTurn, gameState.gameOver]);

    // Handle creature actions from landscape view with better error handling
    const handleCreatureAction = useCallback((creature: any, action: string) => {
        try {
            console.log('Handling creature action:', action, 'for creature:', creature);

            switch (action) {
                case 'hunt':
                    // Safely set the selected creature
                    if (creature && creature.type) {
                        game.setSelectedCreature?.(creature);
                        game.setShowCreatureDetails?.(true);
                    }
                    break;
                case 'observe':
                    // Show creature information without hunting
                    if (creature && creature.type) {
                        game.setSelectedCreature?.(creature);
                        game.setShowCreatureDetails?.(true);
                    }
                    break;
                case 'approach':
                    // Handle approaching mother or other friendly creatures
                    if (creature?.type === 'mothersaur') {
                        // Trigger mother interaction safely
                        try {
                            if (game.handleCreatureEncounter) {
                                const currentTileKey = `${game.playerPosition.q},${game.playerPosition.r}`;
                                game.handleCreatureEncounter(game.map, currentTileKey, game.playerPosition);
                            }
                        } catch (error) {
                            console.error('Error handling mother encounter:', error);
                        }
                    }
                    break;
                default:
                    console.log(`Unknown action: ${action} for creature:`, creature);
            }
        } catch (error) {
            console.error('Error in handleCreatureAction:', error);
        }
    }, [game]);

    // Initialize game only once
    useEffect(() => {
        if (!initialized.current) {
            console.log("Initializing Big Al game");
            game.initializeGame();
            initialized.current = true;
        }
    }, []);

    // Get current tile info
    const currentTileInfo = getCurrentTileInfo();

    return (
        <div className={`${gameState.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen`}>
            {/* Game Header */}
            <header className="p-4 bg-amber-900 text-white">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Big Al: Jurassic Survival</h1>
                    <button
                        className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                        onClick={() => game.setShowTutorial(true)}
                        aria-label="Show game tutorial"
                    >
                        How to Play
                    </button>
                </div>
            </header>

            {/* Main Game Layout - Now using grid for better space usage */}
            <div className="container mx-auto p-4">
                {/* Game Message */}
                <div className="bg-gray-800 p-3 rounded-lg w-full mb-4">
                    <p className="text-center text-white">{gameState.currentMessage}</p>
                </div>

                {/* Main Game Grid - Full width usage with custom row heights */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-[calc(100vh-180px)] w-full">

                    {/* Left Section - Map and Landscape with custom heights */}
                    <div className="lg:col-span-5 grid gap-2" style={{ gridTemplateRows: '2fr 3fr' }}>

                        {/* Top Left - Shorter Map */}
                        <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden">
                            <div className="flex-1 overflow-auto">
                                <GameBoard
                                    {...mapData}
                                    moveTo={game.moveTo}
                                    setSelectedTile={handleTileSelection}
                                    darkMode={gameState.darkMode}
                                />
                            </div>
                        </div>

                        {/* Bottom Left - Taller Landscape */}
                        <div className="flex flex-col">
                            <LandscapeView
                                currentTerrain={currentTileInfo.terrain}
                                creatures={currentTileInfo.creatures}
                                playerPosition={game.playerPosition}
                                growthStage={game.growthStage}
                                onCreatureAction={handleCreatureAction}
                                canHuntCreature={game.canHuntCreature || (() => ({ canHunt: false, reason: "System not ready" }))}
                                darkMode={gameState.darkMode}
                            />
                        </div>
                    </div>

                    {/* Right Section - Stats taking full remaining width */}
                    <div className="lg:col-span-1 flex flex-col w-full">
                        <div className="flex-1 w-full">
                            <StatsPanel
                                {...statsData}
                                growthStages={game.growthStages}
                                seasonEffects={game.seasonEffects}
                                weatherEffects={game.weatherEffects}
                                setShowStatsDetails={() => {/* Show stats details */ }}
                                setShowInjuryDetails={() => {/* Show injury details */ }}
                                setShowEventLog={() => game.setShowEventLog(true)}
                                setShowPerkSelection={() => {/* Show perk selection */ }}
                            />
                        </div>

                        {/* End Turn Button */}
                        <div className="mt-2 w-full">
                            <button
                                className={`w-full px-3 py-2 rounded-lg transition-colors font-medium ${gameState.gameOver
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-amber-700 hover:bg-amber-800'
                                    } text-white shadow-md`}
                                onClick={handleEndTurn}
                                disabled={gameState.gameOver}
                                aria-label={`End turn, ${gameState.movesLeft} moves remaining`}
                            >
                                End Turn ({gameState.movesLeft} moves left)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Components */}
            {gameState.showTutorial && (
                <Tutorial onClose={() => game.setShowTutorial(false)} />
            )}

            {gameState.showFact && (
                <FactDisplay
                    fact={gameState.currentFact}
                    onClose={() => game.setShowFact(false)}
                />
            )}

            {gameState.showEventLog && (
                <EventLog
                    events={gameState.healthEvents}
                    onClose={() => game.setShowEventLog(false)}
                />
            )}

            {gameState.showCreatureDetails && gameState.selectedCreature && (
                <CreatureDetails
                    creature={gameState.selectedCreature}
                    onHunt={handleHunting}
                    onClose={() => game.setShowCreatureDetails(false)}
                    calculateHuntingSuccess={game.calculateHuntingSuccess}
                    huntingSystem={game.huntingSystem}
                    growthSystem={game.growthSystem}
                    gameState={game}
                />
            )}
        </div>
    );
};

export default BigAlGame;