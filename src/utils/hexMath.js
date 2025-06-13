// ==================== HEX MATH UTILITIES ====================
export const HEX_DIRECTIONS = [
    { q: 1, r: 0 },   // E
    { q: 1, r: -1 },  // NE
    { q: 0, r: -1 },  // NW
    { q: -1, r: 0 },  // W
    { q: -1, r: 1 },  // SW
    { q: 0, r: 1 }    // SE
];

export const hexToPixel = (q, r, size = 42) => {
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = size * (3 / 2 * r);
    return { x, y };
};

export const hexDistance = (a, b) => {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

export const getHexNeighbors = (hex) => {
    return HEX_DIRECTIONS.map(dir => ({
        q: hex.q + dir.q,
        r: hex.r + dir.r
    }));
};

export const getHexesInRadius = (center, radius) => {
    const hexes = [];
    for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
            if (Math.abs(dq + dr) <= radius) {
                hexes.push({ q: center.q + dq, r: center.r + dr });
            }
        }
    }
    return hexes;
};

export const getHexesInLine = (start, end) => {
    const distance = hexDistance(start, end);
    if (distance === 0) return [start];

    const hexes = [];
    for (let i = 0; i <= distance; i++) {
        const t = i / distance;
        const q = Math.round(start.q * (1 - t) + end.q * t);
        const r = Math.round(start.r * (1 - t) + end.r * t);
        hexes.push({ q, r });
    }
    return hexes;
};