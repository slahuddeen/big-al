// Prehistoric Animals for the Pleistocene Era
// These animals coexisted with early humans

export const ANIMAL_CATEGORIES = {
  SMALL_PREY: 'small_prey',
  MEDIUM_PREY: 'medium_prey',
  LARGE_PREY: 'large_prey',
  MEGAFAUNA: 'megafauna',
  PREDATOR: 'predator',
  APEX_PREDATOR: 'apex_predator',
  SCAVENGER: 'scavenger',
  DANGEROUS: 'dangerous'
};

export const PREHISTORIC_ANIMALS = {
  // === SMALL PREY (Easy to hunt, low food yield) ===
  RABBIT: {
    name: 'Rabbit',
    emoji: '🐰',
    category: ANIMAL_CATEGORIES.SMALL_PREY,
    baseWeight: 2,
    danger: 1,
    difficulty: 2,
    foodYield: 3,
    behavior: 'skittish',
    habitat: ['plains', 'scrubland', 'open_woods'],
    description: 'Fast and nervous, but good eating',
    spawnChance: 0.4
  },

  GROUND_SQUIRREL: {
    name: 'Ground Squirrel',
    emoji: '🐿️',
    category: ANIMAL_CATEGORIES.SMALL_PREY,
    baseWeight: 1,
    danger: 1,
    difficulty: 3,
    foodYield: 2,
    behavior: 'skittish',
    habitat: ['plains', 'rocky_terrain', 'scrubland'],
    description: 'Quick and alert, lives in burrows',
    spawnChance: 0.35
  },

  WILD_FOWL: {
    name: 'Wild Fowl',
    emoji: '🦆',
    category: ANIMAL_CATEGORIES.SMALL_PREY,
    baseWeight: 3,
    danger: 1,
    difficulty: 2,
    foodYield: 4,
    behavior: 'skittish',
    habitat: ['riverbank', 'marsh', 'waterhole', 'lake'],
    description: 'Water birds, good source of eggs and meat',
    spawnChance: 0.3
  },

  FISH: {
    name: 'Fish',
    emoji: '🐟',
    category: ANIMAL_CATEGORIES.SMALL_PREY,
    baseWeight: 2,
    danger: 1,
    difficulty: 1,
    foodYield: 3,
    behavior: 'passive',
    habitat: ['river', 'lake', 'waterhole'],
    description: 'Abundant in clean waters',
    spawnChance: 0.5
  },

  // === MEDIUM PREY (Moderate challenge, good food) ===
  WILD_HORSE: {
    name: 'Wild Horse',
    emoji: '🐴',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 400,
    danger: 3,
    difficulty: 5,
    foodYield: 50,
    behavior: 'skittish',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Fast herd animals, valuable prey',
    spawnChance: 0.2,
    packSize: [3, 8]
  },

  DEER: {
    name: 'Deer',
    emoji: '🦌',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 150,
    danger: 2,
    difficulty: 4,
    foodYield: 30,
    behavior: 'skittish',
    habitat: ['forest', 'open_woods', 'plains'],
    description: 'Graceful and alert herbivores',
    spawnChance: 0.25,
    packSize: [2, 6]
  },

  WILD_BOAR: {
    name: 'Wild Boar',
    emoji: '🐗',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 180,
    danger: 5,
    difficulty: 6,
    foodYield: 35,
    behavior: 'defensive',
    habitat: ['forest', 'scrubland', 'marsh'],
    description: 'Aggressive when cornered, dangerous tusks',
    spawnChance: 0.15
  },

  REINDEER: {
    name: 'Reindeer',
    emoji: '🦌',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 180,
    danger: 2,
    difficulty: 4,
    foodYield: 35,
    behavior: 'skittish',
    habitat: ['plains', 'hills', 'scrubland'],
    description: 'Migratory herds, cold-adapted',
    spawnChance: 0.2,
    packSize: [4, 12]
  },

  // === LARGE PREY (Dangerous, high food yield) ===
  AUROCHS: {
    name: 'Aurochs',
    emoji: '🐂',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 1000,
    danger: 7,
    difficulty: 8,
    foodYield: 120,
    behavior: 'territorial',
    habitat: ['plains', 'savanna', 'forest'],
    description: 'Massive wild cattle, very dangerous',
    spawnChance: 0.12,
    packSize: [1, 4]
  },

  GIANT_DEER: {
    name: 'Giant Deer (Megaloceros)',
    emoji: '🦌',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 700,
    danger: 4,
    difficulty: 7,
    foodYield: 90,
    behavior: 'skittish',
    habitat: ['forest', 'open_woods', 'plains'],
    description: 'Enormous deer with massive antlers',
    spawnChance: 0.1,
    packSize: [1, 3]
  },

  BISON: {
    name: 'Steppe Bison',
    emoji: '🦬',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 900,
    danger: 7,
    difficulty: 8,
    foodYield: 110,
    behavior: 'defensive',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Powerful herd animals, stampede when threatened',
    spawnChance: 0.15,
    packSize: [3, 10]
  },

  // === MEGAFAUNA (Extremely dangerous, huge rewards) ===
  WOOLLY_MAMMOTH: {
    name: 'Woolly Mammoth',
    emoji: '🦣',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 6000,
    danger: 10,
    difficulty: 10,
    foodYield: 500,
    behavior: 'territorial',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Massive tusked giants, require coordinated hunting',
    spawnChance: 0.05,
    packSize: [1, 4],
    requiresGroup: true
  },

  WOOLLY_RHINO: {
    name: 'Woolly Rhinoceros',
    emoji: '🦏',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 3500,
    danger: 9,
    difficulty: 9,
    foodYield: 300,
    behavior: 'territorial',
    habitat: ['plains', 'scrubland', 'hills'],
    description: 'Aggressive and unpredictable, thick hide',
    spawnChance: 0.06,
    requiresGroup: true
  },

  GIANT_GROUND_SLOTH: {
    name: 'Giant Ground Sloth',
    emoji: '🦥',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 4000,
    danger: 6,
    difficulty: 7,
    foodYield: 350,
    behavior: 'defensive',
    habitat: ['forest', 'open_woods', 'scrubland'],
    description: 'Slow but powerful, dangerous claws',
    spawnChance: 0.05,
    requiresGroup: true
  },

  GLYPTODON: {
    name: 'Glyptodon',
    emoji: '🐢',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 2000,
    danger: 4,
    difficulty: 8,
    foodYield: 150,
    behavior: 'defensive',
    habitat: ['plains', 'savanna'],
    description: 'Armored herbivore, hard to kill but valuable',
    spawnChance: 0.04
  },

  // === PREDATORS (Dangerous competition) ===
  DIRE_WOLF: {
    name: 'Dire Wolf',
    emoji: '🐺',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 70,
    danger: 7,
    difficulty: 7,
    foodYield: 15,
    behavior: 'pack_predator',
    habitat: ['plains', 'forest', 'hills'],
    description: 'Hunt in packs, fierce competitors',
    spawnChance: 0.12,
    packSize: [2, 6],
    aggressive: true
  },

  CAVE_HYENA: {
    name: 'Cave Hyena',
    emoji: '🦘',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 100,
    danger: 6,
    difficulty: 6,
    foodYield: 18,
    behavior: 'pack_predator',
    habitat: ['rocky_terrain', 'hills', 'scrubland'],
    description: 'Scavengers and hunters, compete for kills',
    spawnChance: 0.1,
    packSize: [2, 5],
    aggressive: true
  },

  CAVE_LION: {
    name: 'Cave Lion',
    emoji: '🦁',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 350,
    danger: 9,
    difficulty: 9,
    foodYield: 60,
    behavior: 'territorial',
    habitat: ['plains', 'savanna', 'rocky_terrain'],
    description: 'Massive predators, extremely dangerous',
    spawnChance: 0.06,
    packSize: [1, 2],
    aggressive: true
  },

  SMILODON: {
    name: 'Smilodon (Saber-tooth Cat)',
    emoji: '🐯',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 280,
    danger: 9,
    difficulty: 9,
    foodYield: 50,
    behavior: 'ambush_predator',
    habitat: ['forest', 'scrubland', 'savanna'],
    description: 'Deadly ambush hunter with massive fangs',
    spawnChance: 0.05,
    aggressive: true
  },

  CAVE_BEAR: {
    name: 'Cave Bear',
    emoji: '🐻',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 600,
    danger: 10,
    difficulty: 10,
    foodYield: 100,
    behavior: 'territorial',
    habitat: ['mountains', 'hills', 'rocky_terrain', 'forest'],
    description: 'Massive and aggressive, defends territory fiercely',
    spawnChance: 0.04,
    aggressive: true
  },

  SHORT_FACED_BEAR: {
    name: 'Short-faced Bear',
    emoji: '🐻',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 900,
    danger: 10,
    difficulty: 10,
    foodYield: 150,
    behavior: 'territorial',
    habitat: ['plains', 'scrubland', 'forest'],
    description: 'Largest land predator, run away!',
    spawnChance: 0.03,
    aggressive: true
  },

  // === SCAVENGERS & OPPORTUNISTS ===
  VULTURE: {
    name: 'Vulture',
    emoji: '🦅',
    category: ANIMAL_CATEGORIES.SCAVENGER,
    baseWeight: 8,
    danger: 1,
    difficulty: 2,
    foodYield: 2,
    behavior: 'passive',
    habitat: ['plains', 'savanna', 'rocky_terrain'],
    description: 'Circles over dying creatures',
    spawnChance: 0.15
  },

  // === DANGEROUS BUT NOT FOOD ===
  GIANT_SHORT_FACED_KANGAROO: {
    name: 'Giant Kangaroo',
    emoji: '🦘',
    category: ANIMAL_CATEGORIES.DANGEROUS,
    baseWeight: 240,
    danger: 6,
    difficulty: 6,
    foodYield: 40,
    behavior: 'defensive',
    habitat: ['plains', 'scrubland'],
    description: 'Powerful kicks, aggressive when cornered',
    spawnChance: 0.08
  },

  TERROR_BIRD: {
    name: 'Terror Bird',
    emoji: '🦤',
    category: ANIMAL_CATEGORIES.DANGEROUS,
    baseWeight: 140,
    danger: 8,
    difficulty: 8,
    foodYield: 30,
    behavior: 'aggressive',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Flightless predatory bird, very aggressive',
    spawnChance: 0.05,
    aggressive: true
  }
};

// Helper function to get animals by habitat
export const getAnimalsByHabitat = (terrainType) => {
  return Object.values(PREHISTORIC_ANIMALS).filter(animal =>
    animal.habitat.includes(terrainType)
  );
};

// Helper function to get animals by category
export const getAnimalsByCategory = (category) => {
  return Object.values(PREHISTORIC_ANIMALS).filter(animal =>
    animal.category === category
  );
};

// Calculate hunting difficulty based on group size
export const calculateHuntingDifficulty = (animal, hunterCount) => {
  let difficulty = animal.difficulty;

  if (animal.requiresGroup && hunterCount < 3) {
    difficulty *= 2; // Much harder solo/duo
  }

  if (animal.packSize && animal.packSize[0] > 1) {
    // Fighting a pack is harder
    difficulty *= 1.5;
  }

  return difficulty;
};

// Calculate food yield based on hunting success
export const calculateFoodYield = (animal, successLevel) => {
  // successLevel: 0-1, where 1 is perfect hunt
  const baseYield = animal.foodYield;
  const efficiency = 0.5 + (successLevel * 0.5); // 50% to 100% efficiency

  return Math.floor(baseYield * efficiency);
};

export const ANIMAL_COUNT = Object.keys(PREHISTORIC_ANIMALS).length;
