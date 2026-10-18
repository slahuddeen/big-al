// ==================== POINTS OF INTEREST ====================
// Things worth finding around the lakes. Each world gets its own scatter of them,
// seeded from the map so the same seed always hides them in the same places.
import { mulberry32 } from '../world/noise.js';

export const POI_TYPES = {
    eggs: {
        name: 'Clutch of eggs', short: 'Eggs',
        desc: 'A clutch half buried in a mound of earth and leaves. Easy food, if the parent is away.',
        action: 'Eat an egg'
    },
    sauropodcarcass: {
        name: 'Fallen giant', short: 'Carcass',
        desc: 'A dead Dongbeititan. Enough meat for weeks, which is why every predator for miles comes here, grown Yutyrannus first.',
        action: 'Feed'
    },
    wallow: {
        name: 'Warm pool', short: 'Warm pool',
        desc: 'A sheltered pool fed by hot water. Sleeping here heals twice as fast, and it keeps the winter cold off.'
    },
    lookout: {
        name: 'Lookout', short: 'Lookout',
        desc: 'A high crag above the forest. From here you can see two areas further.'
    },
    bonebed: {
        name: 'Ash bed', short: 'Ash bed',
        desc: 'Bones and feathers poking out of grey ash: a whole group of animals killed together by an old eruption. This is how the Jehol fossils formed.'
    },
    waterfall: {
        name: 'Waterfall', short: 'Falls',
        desc: 'A stream drops over a ledge of volcanic rock. Fish gather in the plunge pool.'
    },
    volcano: {
        name: 'Smoking vent', short: 'Vent',
        desc: 'Steam and sulphur hiss from the ground. The volcano is never fully asleep.'
    },
    creche: {
        name: 'Psittacosaurus crèche', short: 'Crèche',
        desc: 'A gathering place where young Psittacosaurus huddle together, watched by an older one.'
    }
};

// Choose cells for each point of interest. Returns Map(cellKey -> poi)
export const generatePois = (world) => {
    const rand = mulberry32((world.seed ?? 1) * 7 + 101);
    const pois = new Map();
    const land = world.cells.filter((c) => !['lake', 'volcanic', 'mountains'].includes(c.terrain));
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
    pickSome((c) => ['riverbank', 'meadow', 'fernprairie', 'openwoods'].includes(c.terrain) && !c.border, 5, 8).forEach((c) => add(c, 'eggs', { portions: 3 }));
    pickSome((c) => ['sauropodgrounds', 'meadow', 'fernprairie', 'riverbank', 'floodplain'].includes(c.terrain), 3, 12)
        .forEach((c) => add(c, 'sauropodcarcass', { portions: 8, species: 'Dongbeititan' }));
    pickSome((c) => ['marsh', 'riverbank', 'floodplain', 'hotspring', 'galleryforest'].includes(c.terrain), 6, 7).forEach((c) => add(c, 'wallow'));
    pickSome((c) => ['crags', 'hills', 'basalt', 'boulderfield'].includes(c.terrain) && c.level >= 4, 7, 7).forEach((c) => add(c, 'lookout'));
    pickSome((c) => ['ashflat', 'deadforest', 'riverbank'].includes(c.terrain), 4, 10).forEach((c) => add(c, 'bonebed'));
    pickSome((c) => ['fernprairie', 'meadow', 'openwoods'].includes(c.terrain), 3, 12).forEach((c) => add(c, 'creche'));
    pickSome((c) => ['lavafield', 'basalt', 'ashflat', 'hotspring'].includes(c.terrain), 4, 9).forEach((c) => add(c, 'volcano'));

    const falls = [];
    for (const c of land) {
        for (const w of c.waterways || []) {
            if (w.kind !== 'river' || w.exitTo === undefined || w.exitTo === null || w.end) continue;
            const next = world.cells[w.exitTo];
            if (next && next.level < c.level && next.terrain !== 'lake') falls.push(c);
        }
    }
    pickSome((c) => falls.includes(c), 6, 5).forEach((c) => add(c, 'waterfall'));
    return pois;
};
