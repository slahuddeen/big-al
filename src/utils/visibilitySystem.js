// ==================== VISIBILITY SYSTEM ====================
import { getHexesInLine } from './hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';

export const calculateVisibility = (playerPos, hexes) => {
    const newHexes = new Map(hexes);

    const playerKey = `${playerPos.q},${playerPos.r}`;
    const playerHex = hexes.get(playerKey);
    const baseVisibility = playerHex ? TERRAIN_TYPES[playerHex.terrain].visibility : 2;

    for (const hex of newHexes.values()) {
        hex.visible = false;
        hex.inRange = false;
    }

    if (newHexes.has(playerKey)) {
        const playerHex = newHexes.get(playerKey);
        playerHex.visible = true;
        playerHex.visited = true;
        playerHex.inRange = true;
    }

    for (let dq = -baseVisibility; dq <= baseVisibility; dq++) {
        for (let dr = -baseVisibility; dr <= baseVisibility; dr++) {
            if (Math.abs(dq + dr) <= baseVisibility && (dq !== 0 || dr !== 0)) {
                const targetHex = { q: playerPos.q + dq, r: playerPos.r + dr };
                const targetKey = `${targetHex.q},${targetHex.r}`;

                if (newHexes.has(targetKey)) {
                    const hex = newHexes.get(targetKey);
                    hex.inRange = true;

                    const lineHexes = getHexesInLine(playerPos, targetHex);
                    let hasLOS = true;

                    for (let i = 1; i < lineHexes.length - 1; i++) {
                        const checkKey = `${lineHexes[i].q},${lineHexes[i].r}`;
                        const checkHex = newHexes.get(checkKey);
                        if (checkHex && TERRAIN_TYPES[checkHex.terrain].blocksLOS) {
                            hasLOS = false;
                            break;
                        }
                    }

                    if (hasLOS) {
                        hex.visible = true;
                    }
                }
            }
        }
    }

    return newHexes;
};