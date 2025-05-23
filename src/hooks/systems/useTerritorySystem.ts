export const useTerritorySystem = (gameState, setGameState, mapSystem) => {
    const [territoryHexes, setTerritoryHexes] = useState<Record<string, Territory>>({});
    const [territoryCenter, setTerritoryCenter] = useState<HexCoord | null>(null);

    const claimTerritory = useCallback(() => {
        if (gameState.growthStage < 3) return "You're too young to claim territory.";
        if (gameState.energy < 30) return "You're too tired to claim territory.";

        const territoryRadius = 3;
        const newTerritory: Record<string, Territory> = {};

        // Mark hexes as territory
        Object.entries(gameState.map).forEach(([key, hex]) => {
            const [q, r] = key.split(',').map(Number);
            const distance = hexDistance(gameState.playerPosition.q, gameState.playerPosition.r, q, r);

            if (distance <= territoryRadius) {
                newTerritory[key] = {
                    claimed: gameState.turnCount,
                    scent: 100
                };
            }
        });

        setTerritoryHexes(prev => ({ ...prev, ...newTerritory }));
        setTerritoryCenter(gameState.playerPosition);

        setGameState(prev => ({
            ...prev,
            energy: Math.max(0, prev.energy - 30),
            score: prev.score + 50
        }));

        return "You've claimed this area as your territory!";
    }, [gameState, setGameState]);

    return { claimTerritory, territoryHexes, territoryCenter };
};