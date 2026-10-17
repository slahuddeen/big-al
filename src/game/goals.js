// ==================== GOALS ====================
// A few aims for each stage of a spinosaur's life. They lead from the nursery
// shallows out into the great river, the delta and the titanosaur trails.
const killed = (s, ...species) => species.some((sp) => (s.journal.species[sp]?.kills || 0) > 0);

export const GOALS = [
    { id: 'firstkill', level: 1, text: 'Catch your first meal', reward: 20, check: (s) => s.stats.kills >= 1 },
    { id: 'fish', level: 1, text: 'Catch a fish in the shallows', reward: 25, check: (s) => killed(s, 'Fish') },
    { id: 'hide', level: 1, text: 'Hide from a predator', reward: 25, check: (s) => (s.stats.hidden || 0) >= 1 },
    { id: 'juvenile', level: 1, text: 'Grow to 20kg', reward: 40, check: (s) => s.level >= 2 },

    { id: 'river', level: 2, text: 'Swim the great river', reward: 30, check: (s) => !!s.stats.visited?.river },
    { id: 'bigfish', level: 2, text: 'Catch a lungfish, bowfin or bichir', reward: 40, check: (s) => killed(s, 'Lungfish', 'Calamopleurus', 'Bawitius') },
    { id: 'delta', level: 2, text: 'Find the mangrove delta', reward: 40, check: (s) => !!s.stats.visited?.mangrove },
    { id: 'partner', level: 2, text: 'Find a young spinosaur to fish with', reward: 40, check: (s) => (s.pack || []).length > 0 },

    { id: 'croc', level: 3, text: 'Kill a crocodile', reward: 70, check: (s) => killed(s, 'Laganosuchus', 'Elosuchus', 'Aegisuchus', 'Araripesuchus') },
    { id: 'coelacanth', level: 3, text: 'Land a Mawsonia or a river shark', reward: 70, check: (s) => killed(s, 'Mawsonia', 'Tribodus') },
    { id: 'calf', level: 3, text: 'Cut a young titanosaur off from its herd', reward: 80, check: (s) => (s.stats.separated || 0) >= 1 },
    { id: 'adult', level: 3, text: 'Grow to 7 tonnes', reward: 80, check: (s) => s.level >= 4 },

    { id: 'sawfish', level: 4, text: 'Take on Onchopristis, the giant sawfish', reward: 150, check: (s) => killed(s, 'Onchopristis') },
    { id: 'titan', level: 4, text: 'Bring down a titanosaur', reward: 200, check: (s) => killed(s, 'Paralititan', 'Aegyptosaurus', 'Rebbachisaurus') },
    { id: 'rival', level: 4, text: 'Beat Carcharodontosaurus or a rival spinosaur', reward: 200, check: (s) => killed(s, 'Carcharodontosaurus', 'Spinosaurus', 'Bahariasaurus', 'Sauroniops') }
];

// Goals shown now: the current stage's, plus any unfinished from earlier stages
export const activeGoals = (s) => [
    ...GOALS.filter((g) => g.level < s.level && s.goals?.[g.id] === undefined).slice(-2),
    ...GOALS.filter((g) => g.level === s.level)
];
