export const useVisibilitySystem = (gameState, setGameState, mapSystem, perkSystem) => {
    const updateVisibility = useCallback((position: HexCoord) => {
        let visibilityRadius = 2; // Base visibility

        // Apply perk bonuses
        const perks = perkSystem.getActivePerks();
        perks.forEach(perk => {
            if (perk.effect.visibilityBonus) {
                visibilityRadius += perk.effect.visibilityBonus;
            }
        });

        // Apply time of day effects
        if (gameState.timeOfDay === 'night') {
            const hasNightVision = perks.some(p => p.effect.nightVision);
            visibilityRadius = hasNightVision ? visibilityRadius : Math.max(1, visibilityRadius - 1);
        }

        // Apply weather effects
        const weatherEffects = {
            rainy: -1,
            cloudy: 0,
            clear: 1
        };
        visibilityRadius += weatherEffects[gameState.weather] || 0;

        // Mark hexes as visible
        const newRevealedTiles = { ...gameState.revealedTiles };
        const map = { ...gameState.map };

        Object.keys(map).forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const distance = hexDistance(position.q, position.r, q, r);

            if (distance <= visibilityRadius) {
                map[key].visible = true;
                map[key].visited = true;
                newRevealedTiles[key] = true;
            } else {
                map[key].visible = false;
            }
        });

        setGameState(prev => ({
            ...prev,
            map,
            revealedTiles: newRevealedTiles
        }));
    }, [gameState, perkSystem, setGameState]);

    return { updateVisibility };
};