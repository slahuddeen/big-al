// ==================== GOALS ====================
// A few aims for each stage of a young Yutyrannus's life, from the nest mound out
// to the lakes, the old forests and the titan trails.
const killed = (s, ...species) => species.some((sp) => (s.journal.species[sp]?.kills || 0) > 0);

export const GOALS = [
    { id: 'firstkill', level: 1, text: 'Catch your first meal', reward: 20, check: (s) => s.stats.kills >= 1 },
    { id: 'frog', level: 1, text: 'Catch a frog or a salamander', reward: 25, check: (s) => killed(s, 'Frog', 'Salamander') },
    { id: 'hide', level: 1, text: 'Hide from a predator', reward: 25, check: (s) => (s.stats.hidden || 0) >= 1 },
    { id: 'juvenile', level: 1, text: 'Grow to 15kg', reward: 40, check: (s) => s.level >= 2 },

    { id: 'lake', level: 2, text: 'Find a volcanic lake', reward: 30, check: (s) => !!s.journal.biomes?.lake },
    { id: 'mammal', level: 2, text: 'Catch Eomaia or Repenomamus', reward: 40, check: (s) => killed(s, 'Eomaia', 'Repenomamus') },
    { id: 'winter', level: 2, text: 'Survive a winter', reward: 50, check: (s) => (s.stats.winters || 0) >= 1 },
    { id: 'partner', level: 2, text: 'Find a nest-mate to hunt with', reward: 40, check: (s) => (s.pack || []).length > 0 },

    { id: 'psitta', level: 3, text: 'Hunt a Psittacosaurus', reward: 60, check: (s) => killed(s, 'Psittacosaurus') },
    { id: 'raptor', level: 3, text: 'Beat Zhenyuanlong or Sinocalliopteryx', reward: 70, check: (s) => killed(s, 'Zhenyuanlong', 'Sinocalliopteryx', 'Dilong') },
    { id: 'eruption', level: 3, text: 'Live through an eruption', reward: 60, check: (s) => (s.stats.eruptions || 0) >= 1 },
    { id: 'adult', level: 3, text: 'Grow to 1.4 tonnes', reward: 80, check: (s) => s.level >= 4 },

    { id: 'iguanodont', level: 4, text: 'Bring down a Jinzhousaurus', reward: 150, check: (s) => killed(s, 'Jinzhousaurus') },
    { id: 'calf', level: 4, text: 'Cut a Dongbeititan calf off from its herd', reward: 120, check: (s) => (s.stats.separated || 0) >= 1 },
    { id: 'rival', level: 4, text: 'Beat a rival Yutyrannus', reward: 200, check: (s) => killed(s, 'Yutyrannus') }
];

// Goals shown now: the current stage's, plus any unfinished from earlier stages
export const activeGoals = (s) => [
    ...GOALS.filter((g) => g.level < s.level && s.goals?.[g.id] === undefined).slice(-2),
    ...GOALS.filter((g) => g.level === s.level)
];
