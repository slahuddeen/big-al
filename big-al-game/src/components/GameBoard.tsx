// components/GameBoard.tsx
import React from 'react';
import EnhancedHexTile from './EnhancedHexTile';

interface GameBoardProps {
    map: any;
    playerPosition: { q: number; r: number };
    motherPosition: { q: number; r: number };
    validMoves: { q: number; r: number }[];
    movesLeft: number;
    growthStage: number;
    revealedTiles: Record<string, boolean>;
    moveTo: (q: number, r: number) => void;
    setSelectedTile: (tile: any) => void;
    darkMode: boolean;
    weather: string;
    timeOfDay: string;
    season: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
    map, playerPosition, motherPosition, validMoves, movesLeft,
    growthStage, revealedTiles, moveTo, setSelectedTile, darkMode,
    weather, timeOfDay, season
}) => {
    return (
        <div className="relative w-full overflow-auto p-4 bg-gray-800 rounded-lg" style={{ height: '500px' }}>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                    {Object.entries(map).map(([key, hex]: [string, any]) => {
                        const [q, r] = key.split(',').map(Number);
                        const isPlayer = playerPosition.q === q && playerPosition.r === r;
                        const isMother = motherPosition.q === q && motherPosition.r === r;
                        const isRevealed = revealedTiles[`${q},${r}`] || hex.visible;
                        const canMove = validMoves.some(move => move.q === q && move.r === r);

                        return (
                            <EnhancedHexTile 
                                key={`${q},${r}`}
                                q={q}
                                r={r}
                                type={hex.type}
                                visible={isRevealed}
                                visited={hex.visited}
                                creatures={hex.creatures}
                                isPlayer={isPlayer}
                                isMother={isMother}
                                isValidMove={canMove}
                                isInMovementRange={false}
                                growthStage={growthStage} // New prop
                                weather={weather} // New prop
                                timeOfDay={timeOfDay} // New prop
                                season={season} // New prop
                                onClick={() => canMove ? moveTo(q, r) : setSelectedTile({ q, r })}
                                darkMode={darkMode}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GameBoard;