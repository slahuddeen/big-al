// utils/hexGrid.ts
export type HexCoord = {
    q: number;
    r: number;
};

export const axialToPixel = (q: number, r: number) => {
    const size = 32; // hex size in pixels
    const width = size * 2;
    const height = Math.sqrt(3) * size;

    // This is the corrected formula for flat-topped hexagons
    const x = width * (q + r / 2);
    const y = height * (r * 0.75);

    return { x, y };
};

// Get all adjacent hex coordinates
export const getAdjacentHexes = (q: number, r: number): HexCoord[] => {
    return [
        { q: q + 1, r: r - 1 }, // NE
        { q: q + 1, r: r },   // E
        { q: q, r: r + 1 },   // SE
        { q: q - 1, r: r + 1 }, // SW
        { q: q - 1, r: r },   // W
        { q: q, r: r - 1 }    // NW
    ];
};

// Calculate distance between two hex coordinates
export const hexDistance = (q1: number, r1: number, q2: number, r2: number): number => {
    return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
};

// Check if hex coordinates are valid (within map)
export const isValidHex = (q: number, r: number, mapRadius: number): boolean => {
    return hexDistance(0, 0, q, r) <= mapRadius;
};

// Calculate movement range from a position
export const calculateMovementRange = (
    position: HexCoord,
    movesLeft: number,
    map: any,
    growthStage: number
): HexCoord[] => {
    // Start with current position
    const visited: Set<string> = new Set([`${position.q},${position.r}`]);
    const result: HexCoord[] = [];
    const queue: Array<{ pos: HexCoord, movesRemaining: number }> = [
        { pos: position, movesRemaining: movesLeft }
    ];

    while (queue.length > 0) {
        const { pos, movesRemaining } = queue.shift()!;

        // Add to result if not the starting position
        if (!(pos.q === position.q && pos.r === position.r)) {
            result.push(pos);
        }

        // If no moves left, don't explore further
        if (movesRemaining <= 0) continue;

        // Check all adjacent hexes
        getAdjacentHexes(pos.q, pos.r).forEach(adjHex => {
            const key = `${adjHex.q},${adjHex.r}`;

            // Skip if already visited
            if (visited.has(key)) return;

            // Check if tile exists and is passable
            const tile = map[key];
            if (!tile) return;

            const tileType = tile.type;
            const habitat = getHabitatByType(tileType); // You'll need to implement this

            if (habitat) {
                // Check if this tile type is passable for this growth stage
                let canPass = true;

                // Growth stage 1 (hatchling) can't cross lake
                if (growthStage === 1 && tileType === 'lake') {
                    canPass = false;
                }

                if (canPass) {
                    // Calculate movement cost
                    const moveCost = habitat.movementCost || 1;
                    const remainingMoves = movesRemaining - moveCost;

                    // If we can still move after this, add to queue
                    if (remainingMoves >= 0) {
                        visited.add(key);
                        queue.push({
                            pos: adjHex,
                            movesRemaining: remainingMoves
                        });
                    }
                }
            }
        });
    }

    return result;
};

// You'll need to implement this function based on your habitats object
export const getHabitatByType = (type: string) => {
    // Return the habitat from your habitats object
    // This is a placeholder - you'd need to implement based on your actual data
    const habitats: any = {
        plains: { movementCost: 1 },
        forest: { movementCost: 1.5 },
        // etc.
    };
    return habitats[type];
};