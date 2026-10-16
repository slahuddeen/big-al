// ==================== GOALS ====================
// A few aims for each stage of Big Al's life. They point a growing allosaur
// out of the forest nursery toward the open plains and the sauropod routes.
const killed = (s, ...species) => species.some((sp) => (s.journal.species[sp]?.kills || 0) > 0);

export const GOALS = [
    { id: 'firstkill', level: 1, text: 'Catch your first meal', reward: 20, check: (s) => s.stats.kills >= 1 },
    { id: 'drink', level: 1, text: 'Find fresh water and drink', reward: 15, check: (s) => (s.stats.drinks || 0) >= 1 },
    { id: 'hide', level: 1, text: 'Hide from a predator', reward: 25, check: (s) => (s.stats.hidden || 0) >= 1 },
    { id: 'juvenile', level: 1, text: 'Grow to 15kg', reward: 40, check: (s) => s.level >= 2 },

    { id: 'river', level: 2, text: 'Wade across a river', reward: 30, check: (s) => !!s.stats.visited?.river },
    { id: 'route', level: 2, text: 'Find a sauropod migration route', reward: 50, check: (s) => !!s.stats.visited?.sauropodgrounds },
    { id: 'bigger', level: 2, text: 'Bring down something heavier than 10kg', reward: 40, check: (s) => (s.stats.biggestKill || 0) >= 10 },
    { id: 'partner', level: 2, text: 'Find a young Allosaurus to hunt with', reward: 40, check: (s) => (s.pack || []).length > 0 },

    { id: 'calf', level: 3, text: 'Cut a young sauropod off from its herd', reward: 80, check: (s) => (s.stats.separated || 0) >= 1 },
    { id: 'ornithopod', level: 3, text: 'Hunt an ornithopod: Dryosaurus, Othnielia or Camptosaurus', reward: 60, check: (s) => killed(s, 'Dryosaurus', 'Othnielia', 'Camptosaurus') },
    { id: 'open', level: 3, text: 'Make three kills in open country', reward: 60, check: (s) => (s.stats.openKills || 0) >= 3 },
    { id: 'adult', level: 3, text: 'Grow to 1.8 tonnes', reward: 80, check: (s) => s.level >= 4 },

    { id: 'stego', level: 4, text: 'Take on a Stegosaurus and win', reward: 120, check: (s) => killed(s, 'Stegosaurus', 'Kentrosaurus', 'Tuojiangosaurus') },
    { id: 'sauropod', level: 4, text: 'Bring down a sauropod', reward: 200, check: (s) => killed(s, 'Diplodocus', 'Camarasaurus', 'Brachiosaurus') },
    { id: 'rival', level: 4, text: 'Defeat a rival big predator', reward: 150, check: (s) => killed(s, 'Male Allosaurus', 'Female Allosaurus', 'Torvosaurus', 'Ceratosaurus', 'Saurophaganax') }
];

// Goals shown now: the current stage's, plus any unfinished from earlier stages
export const activeGoals = (s) => [
    ...GOALS.filter((g) => g.level < s.level && s.goals?.[g.id] === undefined).slice(-2),
    ...GOALS.filter((g) => g.level === s.level)
];
