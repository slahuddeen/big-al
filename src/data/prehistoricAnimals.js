// Prehistoric Animals for the Pleistocene and Holocene Era
// These animals coexisted with early humans across the world

export const ANIMAL_CATEGORIES = {
  SMALL_PREY: 'small_prey',
  MEDIUM_PREY: 'medium_prey',
  LARGE_PREY: 'large_prey',
  MEGAFAUNA: 'megafauna',
  ELEPHANT_KIN: 'elephant_kin', // Special category for elephants
  GIANT_BIRD: 'giant_bird',
  PREDATOR: 'predator',
  APEX_PREDATOR: 'apex_predator',
  SCAVENGER: 'scavenger',
  DANGEROUS: 'dangerous',
  WATER_PREDATOR: 'water_predator'
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
    waterYield: 1,
    behavior: 'skittish',
    habitat: ['plains', 'scrubland', 'open_woods', 'forest'],
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
    waterYield: 0,
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
    waterYield: 1,
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
    waterYield: 0,
    behavior: 'passive',
    habitat: ['river', 'lake', 'waterhole'],
    description: 'Abundant in clean waters',
    spawnChance: 0.5
  },

  TURTLE: {
    name: 'Giant Turtle',
    emoji: '🐢',
    category: ANIMAL_CATEGORIES.SMALL_PREY,
    baseWeight: 15,
    danger: 1,
    difficulty: 1,
    foodYield: 8,
    waterYield: 2,
    behavior: 'passive',
    habitat: ['riverbank', 'lake', 'marsh'],
    description: 'Slow and easy to catch, good meat',
    spawnChance: 0.2
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
    waterYield: 8,
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
    waterYield: 5,
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
    waterYield: 6,
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
    waterYield: 6,
    behavior: 'skittish',
    habitat: ['plains', 'hills', 'scrubland'],
    description: 'Migratory herds, cold-adapted',
    spawnChance: 0.2,
    packSize: [4, 12]
  },

  WILD_ASS: {
    name: 'Wild Ass (Onager)',
    emoji: '🫏',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 250,
    danger: 4,
    difficulty: 5,
    foodYield: 40,
    waterYield: 7,
    behavior: 'skittish',
    habitat: ['desert', 'badlands', 'scrubland', 'plains'],
    description: 'Hardy desert dwellers, can kick hard',
    spawnChance: 0.15,
    packSize: [2, 5]
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
    waterYield: 15,
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
    waterYield: 12,
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
    waterYield: 14,
    behavior: 'defensive',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Powerful herd animals, stampede when threatened',
    spawnChance: 0.15,
    packSize: [3, 10]
  },

  ELASMOTHERIUM: {
    name: 'Elasmotherium (Giant Unicorn)',
    emoji: '🦏',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 5000,
    danger: 10,
    difficulty: 10,
    foodYield: 400,
    waterYield: 40,
    behavior: 'territorial',
    habitat: ['plains', 'savanna'],
    description: 'Massive rhinoceros with enormous horn, extremely dangerous',
    spawnChance: 0.03,
    requiresGroup: true
  },

  // === ELEPHANT KIN (Multiple elephant species) ===
  WOOLLY_MAMMOTH: {
    name: 'Woolly Mammoth',
    emoji: '🦣',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 6000,
    danger: 10,
    difficulty: 10,
    foodYield: 500,
    waterYield: 50,
    behavior: 'territorial',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Massive tusked giants of the north, require coordinated hunting',
    spawnChance: 0.05,
    packSize: [1, 4],
    requiresGroup: true
  },

  COLUMBIAN_MAMMOTH: {
    name: 'Columbian Mammoth',
    emoji: '🦣',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 10000,
    danger: 11,
    difficulty: 11,
    foodYield: 700,
    waterYield: 70,
    behavior: 'territorial',
    habitat: ['plains', 'savanna'],
    description: 'Largest mammoth species, incredibly dangerous',
    spawnChance: 0.03,
    packSize: [1, 3],
    requiresGroup: true
  },

  STRAIGHT_TUSKED_ELEPHANT: {
    name: 'Straight-Tusked Elephant',
    emoji: '🐘',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 13000,
    danger: 12,
    difficulty: 12,
    foodYield: 900,
    waterYield: 90,
    behavior: 'territorial',
    habitat: ['forest', 'riverbank', 'savanna'],
    description: 'Largest land mammal ever, massive straight tusks',
    spawnChance: 0.02,
    packSize: [1, 3],
    requiresGroup: true
  },

  MASTODON: {
    name: 'American Mastodon',
    emoji: '🦣',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 5000,
    danger: 9,
    difficulty: 9,
    foodYield: 450,
    waterYield: 45,
    behavior: 'territorial',
    habitat: ['forest', 'dense_forest', 'marsh'],
    description: 'Forest-dwelling elephant relative, curved tusks',
    spawnChance: 0.04,
    packSize: [1, 3],
    requiresGroup: true
  },

  STEGODON: {
    name: 'Stegodon',
    emoji: '🐘',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 8000,
    danger: 10,
    difficulty: 10,
    foodYield: 600,
    waterYield: 60,
    behavior: 'territorial',
    habitat: ['forest', 'jungle', 'riverbank'],
    description: 'Asian elephant ancestor with long straight tusks',
    spawnChance: 0.03,
    packSize: [1, 4],
    requiresGroup: true
  },

  GOMPHOTHERIUM: {
    name: 'Gomphotherium (Four-Tusker)',
    emoji: '🦣',
    category: ANIMAL_CATEGORIES.ELEPHANT_KIN,
    baseWeight: 4500,
    danger: 8,
    difficulty: 9,
    foodYield: 400,
    waterYield: 40,
    behavior: 'defensive',
    habitat: ['plains', 'savanna', 'riverbank'],
    description: 'Strange elephant with four tusks, two on lower jaw',
    spawnChance: 0.04,
    packSize: [1, 3],
    requiresGroup: true
  },

  // === GIANT BIRDS (Flightless and flying) ===
  MOA: {
    name: 'Giant Moa',
    emoji: '🦤',
    category: ANIMAL_CATEGORIES.GIANT_BIRD,
    baseWeight: 250,
    danger: 5,
    difficulty: 6,
    foodYield: 60,
    waterYield: 8,
    behavior: 'defensive',
    habitat: ['forest', 'plains', 'scrubland'],
    description: 'Enormous flightless bird from distant islands, powerful kick',
    spawnChance: 0.06,
    packSize: [1, 2]
  },

  ELEPHANT_BIRD: {
    name: 'Elephant Bird',
    emoji: '🦤',
    category: ANIMAL_CATEGORIES.GIANT_BIRD,
    baseWeight: 450,
    danger: 6,
    difficulty: 7,
    foodYield: 100,
    waterYield: 12,
    behavior: 'defensive',
    habitat: ['forest', 'savanna'],
    description: 'Largest bird ever, massive eggs, dangerous when protecting nest',
    spawnChance: 0.04,
    packSize: [1, 2]
  },

  GIANT_STORK: {
    name: 'Leptoptilos (Giant Stork)',
    emoji: '🦩',
    category: ANIMAL_CATEGORIES.GIANT_BIRD,
    baseWeight: 20,
    danger: 4,
    difficulty: 5,
    foodYield: 15,
    waterYield: 3,
    behavior: 'scavenger',
    habitat: ['marsh', 'riverbank', 'waterhole', 'plains'],
    description: 'Massive Indonesian stork, aggressive scavenger',
    spawnChance: 0.08,
    packSize: [1, 3]
  },

  TERROR_BIRD: {
    name: 'Terror Bird (Phorusrhacos)',
    emoji: '🦤',
    category: ANIMAL_CATEGORIES.DANGEROUS,
    baseWeight: 140,
    danger: 9,
    difficulty: 9,
    foodYield: 35,
    waterYield: 5,
    behavior: 'aggressive',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Flightless apex predator, massive hooked beak',
    spawnChance: 0.04,
    aggressive: true,
    attacksSettlements: true
  },

  HAAST_EAGLE: {
    name: "Haast's Eagle",
    emoji: '🦅',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 15,
    danger: 7,
    difficulty: 7,
    foodYield: 8,
    waterYield: 1,
    behavior: 'aerial_predator',
    habitat: ['mountains', 'forest', 'hills'],
    description: 'Enormous eagle that hunted moas and humans',
    spawnChance: 0.05,
    aggressive: true
  },

  // === MEGAFAUNA ===
  WOOLLY_RHINO: {
    name: 'Woolly Rhinoceros',
    emoji: '🦏',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 3500,
    danger: 9,
    difficulty: 9,
    foodYield: 300,
    waterYield: 35,
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
    waterYield: 40,
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
    waterYield: 20,
    behavior: 'defensive',
    habitat: ['plains', 'savanna'],
    description: 'Armored herbivore, hard to kill but valuable',
    spawnChance: 0.04
  },

  GIANT_WOMBAT: {
    name: 'Diprotodon (Giant Wombat)',
    emoji: '🦫',
    category: ANIMAL_CATEGORIES.MEGAFAUNA,
    baseWeight: 2800,
    danger: 5,
    difficulty: 7,
    foodYield: 250,
    waterYield: 30,
    behavior: 'defensive',
    habitat: ['forest', 'scrubland', 'plains'],
    description: 'Largest marsupial ever, peaceful unless threatened',
    spawnChance: 0.05,
    packSize: [1, 3]
  },

  GIANT_BEAVER: {
    name: 'Giant Beaver',
    emoji: '🦫',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 100,
    danger: 4,
    difficulty: 5,
    foodYield: 25,
    waterYield: 5,
    behavior: 'defensive',
    habitat: ['riverbank', 'lake', 'marsh'],
    description: 'Bear-sized beaver, valuable pelt',
    spawnChance: 0.08
  },

  // === PREDATORS ===
  DIRE_WOLF: {
    name: 'Dire Wolf',
    emoji: '🐺',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 70,
    danger: 7,
    difficulty: 7,
    foodYield: 15,
    waterYield: 3,
    behavior: 'pack_predator',
    habitat: ['plains', 'forest', 'hills'],
    description: 'Hunt in packs, fierce competitors',
    spawnChance: 0.12,
    packSize: [2, 6],
    aggressive: true,
    attacksSettlements: true
  },

  CAVE_HYENA: {
    name: 'Cave Hyena',
    emoji: '🐕',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 100,
    danger: 6,
    difficulty: 6,
    foodYield: 18,
    waterYield: 3,
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
    waterYield: 8,
    behavior: 'territorial',
    habitat: ['plains', 'savanna', 'rocky_terrain'],
    description: 'Massive predators, extremely dangerous',
    spawnChance: 0.06,
    packSize: [1, 2],
    aggressive: true,
    attacksSettlements: true
  },

  SMILODON: {
    name: 'Smilodon (Saber-tooth Cat)',
    emoji: '🐯',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 280,
    danger: 9,
    difficulty: 9,
    foodYield: 50,
    waterYield: 7,
    behavior: 'ambush_predator',
    habitat: ['forest', 'scrubland', 'savanna'],
    description: 'Deadly ambush hunter with massive fangs',
    spawnChance: 0.05,
    aggressive: true,
    attacksSettlements: true
  },

  CAVE_BEAR: {
    name: 'Cave Bear',
    emoji: '🐻',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 600,
    danger: 10,
    difficulty: 10,
    foodYield: 100,
    waterYield: 12,
    behavior: 'territorial',
    habitat: ['mountains', 'hills', 'rocky_terrain', 'forest'],
    description: 'Massive and aggressive, defends territory fiercely',
    spawnChance: 0.04,
    aggressive: true,
    attacksSettlements: true
  },

  SHORT_FACED_BEAR: {
    name: 'Short-faced Bear',
    emoji: '🐻',
    category: ANIMAL_CATEGORIES.APEX_PREDATOR,
    baseWeight: 900,
    danger: 11,
    difficulty: 11,
    foodYield: 150,
    waterYield: 18,
    behavior: 'territorial',
    habitat: ['plains', 'scrubland', 'forest'],
    description: 'Largest land predator, run away!',
    spawnChance: 0.02,
    aggressive: true,
    attacksSettlements: true
  },

  LEOPARD: {
    name: 'Leopard',
    emoji: '🐆',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 60,
    danger: 7,
    difficulty: 8,
    foodYield: 15,
    waterYield: 3,
    behavior: 'ambush_predator',
    habitat: ['forest', 'savanna', 'rocky_terrain'],
    description: 'Stealthy hunter, attacks from trees',
    spawnChance: 0.08,
    aggressive: true
  },

  // === WATER PREDATORS ===
  CROCODILE: {
    name: 'Giant Crocodile',
    emoji: '🐊',
    category: ANIMAL_CATEGORIES.WATER_PREDATOR,
    baseWeight: 1000,
    danger: 10,
    difficulty: 10,
    foodYield: 120,
    waterYield: 15,
    behavior: 'ambush_predator',
    habitat: ['river', 'lake', 'marsh', 'riverbank'],
    description: 'Ancient terror of the waterways, ambushes from below',
    spawnChance: 0.06,
    aggressive: true,
    attacksSettlements: true
  },

  GIANT_OTTER: {
    name: 'Giant Otter',
    emoji: '🦦',
    category: ANIMAL_CATEGORIES.PREDATOR,
    baseWeight: 50,
    danger: 5,
    difficulty: 6,
    foodYield: 12,
    waterYield: 3,
    behavior: 'pack_predator',
    habitat: ['river', 'lake', 'riverbank'],
    description: 'Pack hunters of the water, surprisingly aggressive',
    spawnChance: 0.1,
    packSize: [3, 8]
  },

  // === SCAVENGERS ===
  VULTURE: {
    name: 'Vulture',
    emoji: '🦅',
    category: ANIMAL_CATEGORIES.SCAVENGER,
    baseWeight: 8,
    danger: 1,
    difficulty: 2,
    foodYield: 2,
    waterYield: 1,
    behavior: 'passive',
    habitat: ['plains', 'savanna', 'rocky_terrain'],
    description: 'Circles over dying creatures',
    spawnChance: 0.15
  },

  // === DANGEROUS BUT EDIBLE ===
  GIANT_KANGAROO: {
    name: 'Procoptodon (Giant Kangaroo)',
    emoji: '🦘',
    category: ANIMAL_CATEGORIES.DANGEROUS,
    baseWeight: 240,
    danger: 6,
    difficulty: 6,
    foodYield: 40,
    waterYield: 6,
    behavior: 'defensive',
    habitat: ['plains', 'scrubland'],
    description: 'Powerful kicks, aggressive when cornered',
    spawnChance: 0.08
  },

  // === MORE VARIETY ===
  WILD_YAK: {
    name: 'Wild Yak',
    emoji: '🐃',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 1000,
    danger: 7,
    difficulty: 8,
    foodYield: 130,
    waterYield: 16,
    behavior: 'defensive',
    habitat: ['mountains', 'hills', 'plains'],
    description: 'Mountain giants, thick wool and dangerous horns',
    spawnChance: 0.08,
    packSize: [2, 6]
  },

  WILD_CAMEL: {
    name: 'Wild Camel',
    emoji: '🐫',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 600,
    danger: 4,
    difficulty: 6,
    foodYield: 70,
    waterYield: 20, // Stores water
    behavior: 'skittish',
    habitat: ['desert', 'badlands', 'scrubland'],
    description: 'Desert-adapted, valuable water source',
    spawnChance: 0.1,
    packSize: [2, 5]
  },

  ANTELOPE: {
    name: 'Antelope',
    emoji: '🦌',
    category: ANIMAL_CATEGORIES.MEDIUM_PREY,
    baseWeight: 100,
    danger: 2,
    difficulty: 5,
    foodYield: 25,
    waterYield: 4,
    behavior: 'skittish',
    habitat: ['plains', 'savanna', 'scrubland'],
    description: 'Swift grazers, difficult to catch',
    spawnChance: 0.25,
    packSize: [3, 12]
  },

  MUSK_OX: {
    name: 'Musk Ox',
    emoji: '🦬',
    category: ANIMAL_CATEGORIES.LARGE_PREY,
    baseWeight: 400,
    danger: 6,
    difficulty: 7,
    foodYield: 70,
    waterYield: 10,
    behavior: 'defensive',
    habitat: ['plains', 'hills', 'scrubland'],
    description: 'Form defensive circles, thick fur',
    spawnChance: 0.1,
    packSize: [4, 10]
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

// Helper function to get predators that attack settlements
export const getSettlementPredators = () => {
  return Object.values(PREHISTORIC_ANIMALS).filter(animal =>
    animal.attacksSettlements === true
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

// Calculate water yield
export const calculateWaterYield = (animal, successLevel) => {
  const baseYield = animal.waterYield || 0;
  const efficiency = 0.5 + (successLevel * 0.5);

  return Math.floor(baseYield * efficiency);
};

// Check if animal can attack settlement
export const canAttackSettlement = (animal, settlementDefense, isNight) => {
  if (!animal.attacksSettlements) return false;

  let attackChance = 0.1; // Base 10% chance

  if (isNight) {
    attackChance *= 1.5; // 50% more likely at night
  }

  if (settlementDefense < 3) {
    attackChance *= 2; // Weak defenses = more attacks
  }

  if (animal.packSize) {
    attackChance *= 1.3; // Packs more bold
  }

  return Math.random() < attackChance;
};

export const ANIMAL_COUNT = Object.keys(PREHISTORIC_ANIMALS).length;
