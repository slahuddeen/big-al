// Fixed hexGrid.ts - Better positioning calculation
// utils/hexGrid.ts

export type HexCoord = {
    q: number;
    r: number;
};

export const axialToPixel = (q: number, r: number) => {
    const size = 32; // hex size in pixels
    const width = size * 2;
    const height = Math.sqrt(3) * size;

    const horizontalSpacing = 1.02;
    const verticalSpacing = 1.3;

    // Calculate raw position
    const rawX = width * (q + r / 2) * horizontalSpacing;
    const rawY = height * (r * 0.75) * verticalSpacing;

    // Add offset to ensure all hexes are in positive coordinates
    // This prevents clipping at the top/left edges
    const offsetX = 600; // Large enough offset to center the map
    const offsetY = 400; // Large enough offset to prevent top clipping

    return {
        x: rawX + offsetX,
        y: rawY + offsetY
    };
};

// Get all adjacent hex coordinates
export const getAdjacentHexes = (q: number, r: number): HexCoord[] => {
    return [
        { q: q + 1, r: r - 1 }, // NE
        { q: q + 1, r: r },     // E
        { q: q, r: r + 1 },     // SE
        { q: q - 1, r: r + 1 }, // SW
        { q: q - 1, r: r },     // W
        { q: q, r: r - 1 }      // NW
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

// Calculate the bounds of the entire hex map for container sizing
export const calculateMapBounds = (mapRadius: number) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Check all hexes in the map to find bounds
    for (let q = -mapRadius; q <= mapRadius; q++) {
        const r1 = Math.max(-mapRadius, -q - mapRadius);
        const r2 = Math.min(mapRadius, -q + mapRadius);

        for (let r = r1; r <= r2; r++) {
            const { x, y } = axialToPixel(q, r);

            // Account for hex size (64x60)
            minX = Math.min(minX, x - 32);
            maxX = Math.max(maxX, x + 32);
            minY = Math.min(minY, y - 30);
            maxY = Math.max(maxY, y + 30);
        }
    }

    return {
        width: maxX - minX + 64,  // Add padding
        height: maxY - minY + 64, // Add padding
        minX,
        minY
    };
};

// Calculate movement range from a position
export const calculateMovementRange = (
    position: HexCoord,
    movesLeft: number,
    map: any,
    growthStage: number
): HexCoord[] => {
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
            const habitat = getHabitatByType(tileType);

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

// Placeholder function - you'd implement based on your actual data
export const getHabitatByType = (type: string) => {
    const habitats: any = {
        plains: { movementCost: 1 },
        forest: { movementCost: 1.5 },
        lake: { movementCost: 2.5 },
        mountain: { movementCost: 2.5 },
        // Add more as needed
    };
    return habitats[type] || { movementCost: 1 };
};