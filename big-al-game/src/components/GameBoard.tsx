// components/GameBoard.tsx
import React, { useMemo, useCallback } from 'react';
import EnhancedHexTile from './EnhancedHexTile';
import { HexCoord, GameMap } from '../types';

interface GameBoardProps {
    map: GameMap;
    playerPosition: HexCoord;
    motherPosition: HexCoord;
    validMoves: HexCoord[];
    movesLeft: number;
    growthStage: number;
    revealedTiles: Record<string, boolean>;
    moveTo: (q: number, r: number) => void;
    setSelectedTile: (tile: { q: number; r: number }) => void;
    darkMode: boolean;
    weather: string;
    timeOfDay: string;
    season: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
    map,
    playerPosition,
    motherPosition,
    validMoves,
    movesLeft,
    growthStage,
    revealedTiles,
    moveTo,
    setSelectedTile,
    darkMode,
    weather,
    timeOfDay,
    season
}) => {
    // Memoize valid moves lookup for performance
    const validMovesSet = useMemo(() => {
        return new Set(validMoves.map(move => `${move.q},${move.r}`));
    }, [validMoves]);

    // Memoize tile click handler
    const handleTileClick = useCallback((q: number, r: number) => {
        const moveKey = `${q},${r}`;
        if (validMovesSet.has(moveKey)) {
            moveTo(q, r);
        } else {
            setSelectedTile({ q, r });
        }
    }, [validMovesSet, moveTo, setSelectedTile]);

    // Memoize rendered tiles
    const renderedTiles = useMemo(() => {
        return Object.entries(map).map(([key, hex]) => {
            const [q, r] = key.split(',').map(Number);
            const isPlayer = playerPosition.q === q && playerPosition.r === r;
            const isMother = motherPosition.q === q && motherPosition.r === r;
            const isRevealed = revealedTiles[key] || hex.visible;
            const canMove = validMovesSet.has(key);

            return (
                <EnhancedHexTile
                    key={key}
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
                    growthStage={growthStage}
                    weather={weather}
                    timeOfDay={timeOfDay}
                    season={season}
                    onClick={() => handleTileClick(q, r)}
                    darkMode={darkMode}
                />
            );
        });
    }, [
        map,
        playerPosition,
        motherPosition,
        revealedTiles,
        validMovesSet,
        growthStage,
        weather,
        timeOfDay,
        season,
        handleTileClick,
        darkMode
    ]);

    return (
        <div
            className="relative w-full overflow-auto p-4 bg-gray-800 rounded-lg shadow-lg"
            style={{ height: '300px' }}
            role="application"
            aria-label="Game map"
        >
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative" role="grid" aria-label="Hexagonal game board">
                    {renderedTiles}
                </div>
            </div>
        </div>
    );
};

export default React.memo(GameBoard);