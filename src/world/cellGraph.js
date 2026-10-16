// ==================== CELL GRAPH HELPERS ====================
// The map is a graph of Voronoi cells keyed by string id. These helpers replace
// the old hex maths (neighbours, distances, lines of sight).

// Breadth-first step distances from `startKey` (up to maxDepth)
export const bfsDistances = (cells, startKey, maxDepth = 12) => {
    const dist = new Map([[startKey, 0]]);
    let frontier = [startKey];
    for (let d = 1; d <= maxDepth && frontier.length; d++) {
        const next = [];
        for (const key of frontier) {
            const cell = cells.get(key);
            if (!cell) continue;
            for (const n of cell.neighbors) {
                if (!dist.has(n)) {
                    dist.set(n, d);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }
    return dist;
};

// Memoised distances from the player's cell (recomputed when the player moves)
let memo = { cells: null, key: null, dist: null };
export const playerDistances = (state) => {
    if (memo.cells !== state.cells || memo.key !== state.player) {
        memo = { cells: state.cells, key: state.player, dist: bfsDistances(state.cells, state.player, 14) };
    }
    return memo.dist;
};

export const distanceToPlayer = (state, key) => playerDistances(state).get(key) ?? 99;

// Step distance between two cells (capped)
export const cellDistance = (cells, a, b, max = 12) => {
    if (a === b) return 0;
    const ca = cells.get(a);
    if (ca && ca.neighbors.includes(b)) return 1;
    return bfsDistances(cells, a, max).get(b) ?? max + 1;
};

export const neighborsOf = (cells, key) => cells.get(key)?.neighbors ?? [];
export const areNeighbors = (cells, a, b) => !!cells.get(a)?.neighbors.includes(b);
