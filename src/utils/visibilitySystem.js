// ==================== VISIBILITY ON THE CELL GRAPH ====================
import { TERRAIN_TYPES } from '../data/terrain.js';
import { bfsDistances } from '../world/cellGraph.js';
import { getWorld } from '../world/worldGen.js';

// Line of sight between two cell centres: blocked by sight-blocking terrain
// (dense forest, mountains, mesas) or by ground that rises above both ends.
const hasLineOfSight = (world, cells, from, to) => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / 0.6);
    const top = Math.max(from.level, to.level);
    let hint = Number(from.key);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const c = world.cellAt(from.x + dx * t, from.z + dz * t, hint);
        if (!c) continue;
        hint = c.id;
        if (c.key === from.key || c.key === to.key) continue;
        const cell = cells.get(c.key);
        if (TERRAIN_TYPES[cell.terrain]?.blocksLOS) return false;
        if (cell.level > top + 1) return false;
    }
    return true;
};

// opts.rangeBonus: + for lookouts, - for night and mist (sight never drops below 1)
export const calculateVisibility = (playerKey, cells, worldSeed, opts = {}) => {
    const world = getWorld(worldSeed);
    const newCells = new Map(cells);

    for (const cell of newCells.values()) {
        cell.visible = false;
        cell.inRange = false;
        cell.inSight = false; // in range AND in line of sight this turn
    }

    const here = newCells.get(playerKey);
    if (!here) return newCells;
    here.visible = here.visited = here.discovered = here.inRange = here.inSight = true;

    // High ground lets you see further
    const lowerNeighbours = here.neighbors.filter((n) => newCells.get(n).level < here.level).length;
    const range = Math.max(1, (TERRAIN_TYPES[here.terrain]?.visibility || 2) + (lowerNeighbours >= 3 ? 1 : 0) + (opts.rangeBonus || 0));

    for (const [key, d] of bfsDistances(newCells, playerKey, range)) {
        if (d === 0) continue;
        const cell = newCells.get(key);
        cell.inRange = true;
        if (d === 1 || hasLineOfSight(world, newCells, here, cell)) {
            cell.visible = cell.discovered = cell.inSight = true;
        }
    }

    // Persistent discovery
    for (const cell of newCells.values()) {
        if (cell.discovered) cell.visible = true;
    }
    return newCells;
};
