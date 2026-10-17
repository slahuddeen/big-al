// ==================== POINTS OF INTEREST ====================
// Things worth finding along the rivers. Each world gets its own scatter of them,
// seeded from the map so the same seed always hides them in the same places.
import { mulberry32 } from '../world/noise.js';

export const POI_TYPES = {
    eggs: {
        name: 'Clutch of eggs', short: 'Eggs',
        desc: 'Crocodile or turtle eggs buried in the warm sand. Easy food, if the mother is away.',
        action: 'Eat an egg'
    },
    sauropodcarcass: {
        name: 'Titanosaur carcass', short: 'Carcass',
        desc: 'A fallen giant. Enough meat for weeks, which is why every predator for miles comes here, Carcharodontosaurus first.',
        action: 'Feed'
    },
    wallow: {
        name: 'Mud wallow', short: 'Wallow',
        desc: 'Cool mud that soothes wounds and keeps the biting flies off the sail. Sleeping here heals twice as fast.'
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
        name: 'Smoking hill', short: 'Smoke',
        desc: 'A smouldering hill. Lightning fires smoke for days.'
    },
    seashore: {
        name: 'Tethys Sea', short: 'Sea',
        desc: 'Where the rivers meet the Tethys. Salt water: undrinkable, but sharks and sawfish come in on the tide.'
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
    pickSome((c) => ['riverbank', 'beach', 'floodplain'].includes(c.terrain) && !c.border, 5, 8).forEach((c) => add(c, 'eggs', { portions: 3 }));
    pickSome((c) => ['sauropodgrounds', 'floodplain', 'plains', 'fernprairie', 'riverbank'].includes(c.terrain), 4, 10)
        .forEach((c) => add(c, 'sauropodcarcass', { portions: 8, species: rand() > 0.6 ? 'Paralititan' : rand() > 0.5 ? 'Aegyptosaurus' : 'Rebbachisaurus' }));
    pickSome((c) => ['marsh', 'riverbank', 'floodplain', 'waterhole', 'mangrove'].includes(c.terrain), 7, 6).forEach((c) => add(c, 'wallow'));
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
