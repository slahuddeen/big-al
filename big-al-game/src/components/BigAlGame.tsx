// components/BigAlGame.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { useGame } from '../hooks/useGame';
import GameBoard from './GameBoard';
import StatsPanel from './StatsPanel';
import CreatureDetails from './CreatureDetails';
import Tutorial from './UI/Tutorial';
import FactDisplay from './UI/FactDisplay';
import EventLog from './UI/EventLog';

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

    // Initialize game only once
    useEffect(() => {
        if (!initialized.current) {
            console.log("Initializing Big Al game");
            game.initializeGame();
            initialized.current = true;
        }
    }, []);

    return (
        <div className={`${gameState.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen relative`}>
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

            {/* Main Game Container */}
            <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
                {/* Game Board Section */}
                <main className="flex-1 flex flex-col items-center">
                    {/* Game Message */}
                    <div className="bg-gray-800 p-3 rounded-lg w-full mb-4">
                        <p className="text-center">{gameState.currentMessage}</p>
                    </div>

                    {/* Game Map */}
                    <GameBoard
                        {...mapData}
                        moveTo={game.moveTo}
                        setSelectedTile={handleTileSelection}
                        darkMode={gameState.darkMode}
                    />

                    {/* Game Controls */}
                    <div className="w-full flex justify-between items-center mt-2">
                        <button
                            className={`px-4 py-2 rounded-lg transition-colors ${gameState.gameOver
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-amber-700 hover:bg-amber-800'
                                } text-white`}
                            onClick={handleEndTurn}
                            disabled={gameState.gameOver}
                            aria-label={`End turn, ${gameState.movesLeft} moves remaining`}
                        >
                            End Turn ({gameState.movesLeft} moves left)
                        </button>
                    </div>
                </main>

                {/* Stats Panel */}
                <aside className="w-full md:w-64">
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
                </aside>
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