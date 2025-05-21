// components/BigAlGame.tsx
import React, { useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import GameBoard from './GameBoard';
import StatsPanel from './StatsPanel';
import CreatureDetails from './CreatureDetails';
import Tutorial from './UI/Tutorial';
import FactDisplay from './UI/FactDisplay';
import EventLog from './UI/EventLog';


const BigAlGame: React.FC = () => {
    console.log("BigAlGame rendering");
    const game = useGame();
    
    // Destructure the game state and functions
    const {
        gameStarted, gameOver, showDinosaurSelection,
        map, playerPosition, motherPosition, validMoves,
        movesLeft, turnCount, showTutorial, showFact,
        currentFact, currentMessage, showCreatureDetails,
        selectedCreature, injuries, perks, availablePerks,
        score, fitness, hunger, thirst, energy, age, weight,
        growthStage, revealedTiles, showPerkSelection,
        darkMode, healthEvents, showEventLog,
        weather, season, timeOfDay,
        // Functions
        initializeGame, moveTo, endTurn, handleHunting,
        setShowTutorial, setShowFact, setShowEventLog,
        setShowCreatureDetails, selectPerk
    } = game;
    const initialized = useRef(false);
    useEffect(() => {
        if (!initialized.current) {
            console.log("First initialization only");
            game.initializeGame();
            initialized.current = true;
        }
    }, []); // Empty dependency array
    return (
        <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen relative`}>
            {/* Game title */}
            <div className="p-4 bg-amber-900 text-white">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Big Al: Jurassic Survival</h1>
                    <div className="space-x-2">
                        <button
                            className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700"
                            onClick={() => setShowTutorial(true)}
                        >
                            How to Play
                        </button>
                    </div>
                </div>
            </div>

            {/* Game container */}
            <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
                {/* Game board area */}
                <div className="flex-1 flex flex-col items-center">
                    {/* Game message */}
                    <div className="bg-gray-800 p-3 rounded-lg w-full mb-4">
                        <p>{currentMessage}</p>
                    </div>

                    {/* Game map */}
                    <GameBoard
                        map={map}
                        playerPosition={playerPosition}
                        motherPosition={motherPosition}
                        validMoves={validMoves}
                        movesLeft={movesLeft}
                        growthStage={growthStage}
                        revealedTiles={revealedTiles}
                        moveTo={moveTo}
                        setSelectedTile={(tile) => {/* Handle selecting a tile */ }}
                        darkMode={darkMode}
                        // Add these new props
                        weather={weather}
                        timeOfDay={timeOfDay}
                        season={season}
                    />

                    {/* Game controls */}
                    <div className="w-full flex justify-between items-center mt-2">
                        <button
                            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg"
                            onClick={endTurn}
                            disabled={gameOver}
                        >
                            End Turn ({movesLeft} moves left)
                        </button>
                    </div>
                </div>

                {/* Game stats panel */}
                <StatsPanel
                    growthStage={growthStage}
                    growthStages={game.growthStages}
                    weight={weight}
                    fitness={fitness}
                    hunger={hunger}
                    thirst={thirst}
                    energy={energy}
                    season={game.season}
                    weather={game.weather}
                    timeOfDay={game.timeOfDay}
                    injuries={injuries}
                    perks={perks}
                    score={score}
                    availablePerks={availablePerks}
                    setShowStatsDetails={() => {/* Show stats details */ }}
                    setShowInjuryDetails={() => {/* Show injury details */ }}
                    setShowEventLog={() => setShowEventLog(true)}
                    setShowPerkSelection={() => {/* Show perk selection */ }}
                    seasonEffects={game.seasonEffects}
                    weatherEffects={game.weatherEffects}
                    age={age}
                />
            </div>

            {/* Conditional UI components */}
            {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
            {showFact && <FactDisplay fact={currentFact} onClose={() => setShowFact(false)} />}
            {showEventLog && <EventLog events={healthEvents} onClose={() => setShowEventLog(false)} />}
            {showCreatureDetails && selectedCreature && (
                <CreatureDetails
                    creature={selectedCreature}
                    onHunt={handleHunting}
                    onClose={() => setShowCreatureDetails(false)}
                    calculateHuntingSuccess={game.calculateHuntingSuccess}
                />
            )}

            {/* More conditional components like perk selection, etc. */}
        </div>
    );
};

export default BigAlGame;