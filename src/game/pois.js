// ==================== POINTS OF INTEREST ====================
// Things worth finding in the basin. Each world gets its own scatter of them,
// seeded from the map so the same seed always hides them in the same places.
import { mulberry32 } from '../world/noise.js';

export const POI_TYPES = {
    eggs: {
        name: 'Clutch of eggs', short: 'Eggs',
        desc: 'An unguarded clutch in a scraped nest. Easy food, if the parents are away.',
        action: 'Eat an egg'
    },
    sauropodcarcass: {
        name: 'Sauropod carcass', short: 'Carcass',
        desc: 'A fallen giant. Enough meat for weeks, which is why every predator in the basin comes here.',
        action: 'Feed'
    },
    wallow: {
        name: 'Mud wallow', short: 'Wallow',
        desc: 'Cool mud that soothes wounds and keeps the biting flies off. Sleeping here heals twice as fast.'
    },
    lookout: {
        name: 'Lookout', short: 'Lookout',
        desc: 'High open ground. From here you can see two areas further.'
    },
    bonebed: {
        name: 'Bone bed', short: 'Bones',
        desc: 'Bleached bones of animals caught by an old flood. Something about this place makes you uneasy.'
    },
    waterfall: {
        name: 'Waterfall', short: 'Falls',
        desc: 'A river spills over a terrace edge. Fish gather in the plunge pool.'
    },
    volcano: {
        name: 'Smoking volcano', short: 'Volcano',
        desc: 'One of the Sevier volcanoes. The ash has killed the forest around it.'
    },
    seashore: {
        name: 'Sundance Sea', short: 'Sea',
        desc: 'The edge of the shallow inland sea. Salt water: undrinkable.'
    }
};

// Choose cells for each point of interest. Returns Map(cellKey -> poi)
export const generatePois = (world) => {
    const rand = mulberry32((world.seed ?? 1) * 7 + 101);
    const pois = new Map();
    const land = world.cells.filter((c) => c.terrain !== 'sea');
    const add = (cell, type, extra = {}) => {
        if (!cell || pois.has(cell.key) || cell.key === world.spawnKey) return;
        pois.set(cell.key, { id: `${type}-${cell.key}`, type, key: cell.key, ...extra });
    };
    const pickSome = (filter, n, spread = 6) => {
        const cands = land.filter(filter).sort(() => rand() - 0.5);
        const chosen = [];
        for (const c of cands) {
            if (chosen.length >= n) break;
            if (chosen.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < world.spacing * spread)) continue;
            chosen.push(c);
        }
        return chosen;
    };

    for (const c of land.filter((c) => c.terrain === 'nest')) add(c, 'eggs', { portions: 3 });
    pickSome((c) => ['nest', 'fernprairie', 'openwoods', 'forestedge'].includes(c.terrain) && !c.border, 4, 9).forEach((c) => add(c, 'eggs', { portions: 3 }));
    pickSome((c) => ['sauropodgrounds', 'floodplain', 'plains', 'fernprairie', 'riverbank'].includes(c.terrain), 4, 10)
        .forEach((c) => add(c, 'sauropodcarcass', { portions: 8, species: rand() > 0.5 ? 'Diplodocus' : 'Camarasaurus' }));
    pickSome((c) => ['marsh', 'riverbank', 'floodplain', 'waterhole'].includes(c.terrain), 7, 6).forEach((c) => add(c, 'wallow'));
    pickSome((c) => ['hills', 'mesa', 'boulderfield', 'rocky'].includes(c.terrain) && c.level >= 4, 7, 7).forEach((c) => add(c, 'lookout'));
    pickSome((c) => ['dryriverbed', 'badlands', 'desert'].includes(c.terrain), 3, 10).forEach((c) => add(c, 'bonebed'));

    // natural landmarks
    for (const c of land) {
        if (c.terrain === 'volcanic') add(c, 'volcano');
    }
    const falls = [];
    for (const c of land) {
        for (const w of c.waterways || []) {
            if (w.kind !== 'river' || w.exitTo === undefined || w.exitTo === null || w.end) continue;
            const next = world.cells[w.exitTo];
            if (next && next.level < c.level && next.terrain !== 'sea') falls.push(c);
        }
    }
    pickSome((c) => falls.includes(c), 6, 5).forEach((c) => add(c, 'waterfall'));
    pickSome((c) => c.terrain === 'beach', 3, 14).forEach((c) => add(c, 'seashore'));
    return pois;
};
