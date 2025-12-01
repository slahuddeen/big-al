// Character System - Unique leaders and NPCs with special abilities
// Characters can be leaders, units, or settlement residents

import { HUMAN_SPECIES } from './humanSpecies.js';

export const CHARACTER_ROLES = {
  LEADER: 'leader',           // Faction leader
  HERO: 'hero',              // Legendary character
  UNIT_COMMANDER: 'unit_commander',  // Leads military units
  SHAMAN: 'shaman',          // Spiritual leader
  TRADER: 'trader',          // Trade specialist
  EXPLORER: 'explorer',      // Scout/pathfinder
  CRAFTSMAN: 'craftsman',    // Building/crafting specialist
  HEALER: 'healer',          // Medicine/healing
  WARRIOR: 'warrior',        // Combat specialist
  DIPLOMAT: 'diplomat',      // Diplomacy specialist
  SETTLER: 'settler'         // Lives in settlement, provides bonus
};

export const CHARACTER_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  LEGENDARY: 'legendary'
};

// ========== NEANDERTHAL (DWARF) CHARACTERS ==========

export const CHARACTERS = {
  // Neanderthal Characters
  THORNA_STONEHEART: {
    id: 'thorna_stoneheart',
    name: 'Thorna Stoneheart',
    species: 'neanderthal',
    gender: 'female',

    description: 'Auburn-haired shaman of great power, bearer of the Copper Ring of Ages',
    backstory: `Thorna was born during the harshest winter in living memory. As her tribe starved, she had a vision of fire within stone. Following her dream, she discovered copper in the mountains and forged the first ring, a symbol that would unite three clans. Her staff, carved from ancient oak struck by lightning, channels the fury of storms. She is chunky and powerful, her presence commanding respect even from the most hardened warriors.`,

    appearance: {
      description: 'Auburn hair, chunky build, carries massive staff with copper ring',
      // artFile: 'thorna_stoneheart.png' // User will provide
    },

    role: CHARACTER_ROLES.SHAMAN,
    rarity: CHARACTER_RARITY.LEGENDARY,

    startingLocation: 'wandering', // 'faction_leader', 'wandering', 'settlement', 'event'

    abilities: {
      storm_caller: {
        name: 'Storm Caller',
        description: 'Can summon storms to aid in battle or drive away enemies',
        effect: { combatBonus: 1.5, defenseBonus: 1.3 }
      },
      copper_wisdom: {
        name: 'Copper Wisdom',
        description: 'Unlocks metalworking research 30% faster',
        effect: { techBonus: { metalworking: 0.3 } }
      },
      clan_uniter: {
        name: 'Clan Uniter',
        description: '+20 relations with all Neanderthal factions',
        effect: { diplomacyBonus: 20, species: 'neanderthal' }
      }
    },

    stats: {
      leadership: 9,
      combat: 6,
      wisdom: 10,
      diplomacy: 7,
      survival: 8
    },

    traits: ['Spiritual', 'Wise', 'Respected', 'Ancient Knowledge'],

    encounterWeight: 0.05, // 5% chance when meeting Neanderthal faction
    recruitCost: {
      knowledge: 100,
      culturalInfluence: 50
    }
  },

  YLVA_WARPAINT: {
    id: 'ylva_warpaint',
    name: 'Ylva Warpaint',
    species: 'neanderthal',
    gender: 'female',

    description: 'Blonde warrior marked with sacred blue paint and battle piercings',
    backstory: `Ylva earned her name in blood. Each piercing on her chest represents a cave bear slain in single combat. The blue paint she wears is made from rare minerals found only in the deepest caves, applied in patterns that tell the story of her victories. She leads her warband with fierce determination, never retreating, never surrendering. Her people say she was born during a blue moon, blessed by the war spirits.`,

    appearance: {
      description: 'Blonde hair, blue warpaint, chest piercings, muscular build',
      // artFile: 'ylva_warpaint.png'
    },

    role: CHARACTER_ROLES.WARRIOR,
    rarity: CHARACTER_RARITY.RARE,

    startingLocation: 'wandering',

    abilities: {
      berserker_rage: {
        name: 'Berserker Rage',
        description: 'Units led by Ylva gain rage mode (2x attack when wounded)',
        effect: { unitBonus: { rage: 2.0 } }
      },
      cave_bear_hunter: {
        name: 'Cave Bear Hunter',
        description: '+50% damage vs large predators',
        effect: { huntingBonus: 1.5, predatorDefense: 1.3 }
      },
      fearless: {
        name: 'Fearless',
        description: 'Immune to morale penalties, inspires nearby units',
        effect: { moraleImmune: true, inspirationRadius: 2 }
      }
    },

    stats: {
      leadership: 7,
      combat: 10,
      wisdom: 4,
      diplomacy: 3,
      survival: 9
    },

    traits: ['Fearless', 'Aggressive', 'Inspiring', 'Relentless'],

    encounterWeight: 0.08,
    recruitCost: {
      food: 50,
      materials: 30,
      militaryStrength: 20
    }
  },

  // ========== HOBBIT (HOMO FLORESIENSIS) CHARACTERS ==========

  KIKO_QUICKFINGER: {
    id: 'kiko_quickfinger',
    name: 'Kiko Quickfinger',
    species: 'homo_floresiensis',
    gender: 'male',

    description: 'Monkey-like trickster and master thief with unmatched agility',
    backstory: `Kiko was raised by gibbons after his settlement was destroyed by a tsunami. When he returned to his people years later, he moved like no other Hobbit—swinging through trees, scaling cliffs with ease. His quick fingers can steal anything, his quick feet can escape anyone. Some say he's part spirit, part monkey, all trouble. Despite his mischievous nature, he has a good heart and often steals from the greedy to help the poor.`,

    appearance: {
      description: 'Small, monkey-like features, extremely agile, always grinning',
      // artFile: 'kiko_quickfinger.png'
    },

    role: CHARACTER_ROLES.EXPLORER,
    rarity: CHARACTER_RARITY.UNCOMMON,

    startingLocation: 'wandering',

    abilities: {
      master_thief: {
        name: 'Master Thief',
        description: 'Can steal resources from other factions (diplomatic penalty)',
        effect: { stealChance: 0.7, stealAmount: 1.5 }
      },
      tree_runner: {
        name: 'Tree Runner',
        description: '+2 movement in forests, can move through forest without penalty',
        effect: { forestMovement: 2, forestBonus: 1.5 }
      },
      escape_artist: {
        name: 'Escape Artist',
        description: '90% chance to escape from combat',
        effect: { escapeChance: 0.9 }
      }
    },

    stats: {
      leadership: 5,
      combat: 6,
      wisdom: 6,
      diplomacy: 4,
      survival: 10
    },

    traits: ['Agile', 'Mischievous', 'Lucky', 'Forest-Wise'],

    encounterWeight: 0.12,
    recruitCost: {
      food: 20,
      materials: 15
    }
  },

  MIRA_FARTRADER: {
    id: 'mira_fartrader',
    name: 'Mira Fartrader',
    species: 'homo_floresiensis',
    gender: 'female',

    description: 'Renowned merchant who has traveled to every known land',
    backstory: `Mira's grandmother told stories of lands across the sea. Mira made those stories real. She was the first Hobbit to build a raft that could survive the ocean crossing, and she returned with shells, stones, and goods never before seen. Her trade network spans from the ice mountains to the volcanic islands. She speaks six languages and can negotiate with anyone. Her small size makes others underestimate her—their first and last mistake.`,

    appearance: {
      description: 'Carries large pack of trade goods, adorned with foreign trinkets',
      // artFile: 'mira_fartrader.png'
    },

    role: CHARACTER_ROLES.TRADER,
    rarity: CHARACTER_RARITY.RARE,

    startingLocation: 'wandering',

    abilities: {
      master_negotiator: {
        name: 'Master Negotiator',
        description: 'All trades are 50% more favorable',
        effect: { tradeBonus: 1.5 }
      },
      far_connections: {
        name: 'Far Connections',
        description: 'Generates 1 trade offer per turn from distant factions',
        effect: { tradeGeneration: 1 }
      },
      polyglot: {
        name: 'Polyglot',
        description: '+30 relations with all factions on first contact',
        effect: { firstContactBonus: 30 }
      }
    },

    stats: {
      leadership: 6,
      combat: 2,
      wisdom: 8,
      diplomacy: 10,
      survival: 7
    },

    traits: ['Charismatic', 'Worldly', 'Shrewd', 'Multilingual'],

    encounterWeight: 0.10,
    recruitCost: {
      materials: 50,
      knowledge: 30,
      culturalInfluence: 20
    }
  },

  // ========== HOMO ERECTUS (OLD ONES) CHARACTERS ==========

  CAESAR_THE_WISE: {
    id: 'caesar_the_wise',
    name: 'Caesar the Wise',
    species: 'homo_erectus',
    gender: 'male',

    description: 'Highly intelligent leader who revolutionized his people with advanced tactics',
    backstory: `Caesar was not born great—he became great through relentless learning. While others hunted, he studied the stars. While others fought, he observed patterns. He developed the first true battle formations, the first irrigation systems, the first written symbols. Some call him a genius, others call him dangerous. He dreams of an empire that will span the world, united under reason and law. His mind is his greatest weapon.`,

    appearance: {
      description: 'Thoughtful expression, carries clay tablets, lean from constant travel',
      // artFile: 'caesar_the_wise.png'
    },

    role: CHARACTER_ROLES.LEADER,
    rarity: CHARACTER_RARITY.LEGENDARY,

    startingLocation: 'faction_leader',

    abilities: {
      supreme_tactician: {
        name: 'Supreme Tactician',
        description: 'All military units gain +50% effectiveness',
        effect: { militaryBonus: 1.5, commandRange: 10 }
      },
      rapid_learner: {
        name: 'Rapid Learner',
        description: 'All technologies research 40% faster',
        effect: { researchSpeed: 1.4 }
      },
      empire_builder: {
        name: 'Empire Builder',
        description: 'Settlements produce +30% of all resources',
        effect: { productionBonus: 1.3 }
      }
    },

    stats: {
      leadership: 10,
      combat: 7,
      wisdom: 10,
      diplomacy: 8,
      survival: 6
    },

    traits: ['Genius', 'Visionary', 'Ambitious', 'Strategic Mind'],

    encounterWeight: 0.02, // Very rare
    recruitCost: {
      knowledge: 200,
      culturalInfluence: 100
    }
  },

  SIKARI_DEERSKULL: {
    id: 'sikari_deerskull',
    name: 'Sikari Deerskull',
    species: 'homo_erectus',
    gender: 'female',

    description: 'Mysterious hunter who wears the skull of a giant deer she slew with her bare hands',
    backstory: `Sikari does not speak of her past. She appeared one day wearing the skull of a creature thought extinct—a deer twice the size of a mammoth. Those who ask how she killed it receive only silence and a cold stare through empty eye sockets. She hunts alone, tracks in silence, and can run for days without rest. Her people whisper that she made a pact with the deer's spirit, trading her voice for its strength.`,

    appearance: {
      description: 'Wears massive deer skull as mask, lean and tall, moves like a predator',
      // artFile: 'sikari_deerskull.png'
    },

    role: CHARACTER_ROLES.EXPLORER,
    rarity: CHARACTER_RARITY.RARE,

    startingLocation: 'wandering',

    abilities: {
      tireless_hunter: {
        name: 'Tireless Hunter',
        description: 'Can hunt without action point cost, +100% hunting yield',
        effect: { freeHunting: true, huntingYield: 2.0 }
      },
      spirit_pact: {
        name: 'Spirit Pact',
        description: 'Animals do not flee, predators are less aggressive',
        effect: { animalCalm: true, predatorReduction: 0.5 }
      },
      endurance_runner: {
        name: 'Endurance Runner',
        description: '+3 movement, no terrain penalties',
        effect: { movement: 3, noTerrainPenalty: true }
      }
    },

    stats: {
      leadership: 4,
      combat: 9,
      wisdom: 7,
      diplomacy: 1,
      survival: 10
    },

    traits: ['Silent', 'Mysterious', 'Tireless', 'Spirit-Touched'],

    encounterWeight: 0.06,
    recruitCost: {
      food: 100,
      knowledge: 50,
      culturalInfluence: 30
    }
  },

  // ========== DENISOVAN (GIANT) CHARACTERS ==========

  AYANA_CLOUDREACHER: {
    id: 'ayana_cloudreacher',
    name: 'Ayana Cloudreacher',
    species: 'denisovan',
    gender: 'female',

    description: 'Tall, slender mountain dweller adorned with sacred green feathers',
    backstory: `Ayana was born at the roof of the world, where the air is thin and eagles nest in stone. She was the first to climb the Impossible Peak, where she found the green-feathered birds that live above the clouds. These birds, sacred to her people, granted her their feathers as a gift. She speaks with the wind and reads the future in the patterns of snow. Her height is legendary even among Giants—she stands a full head taller than the tallest warrior.`,

    appearance: {
      description: 'Extremely tall and slender, adorned with brilliant green feathers',
      // artFile: 'ayana_cloudreacher.png'
    },

    role: CHARACTER_ROLES.SHAMAN,
    rarity: CHARACTER_RARITY.RARE,

    startingLocation: 'wandering',

    abilities: {
      wind_speaker: {
        name: 'Wind Speaker',
        description: 'Can predict weather, grants vision of distant hexes',
        effect: { weatherPrediction: true, visionBonus: 3 }
      },
      high_altitude_adapted: {
        name: 'High Altitude Adapted',
        description: 'Mountain hexes provide double resources',
        effect: { mountainBonus: 2.0 }
      },
      sacred_feathers: {
        name: 'Sacred Feathers',
        description: '+25% morale to all settlements, +1 cultural influence per turn',
        effect: { moraleBonus: 1.25, culturePerTurn: 1 }
      }
    },

    stats: {
      leadership: 8,
      combat: 5,
      wisdom: 9,
      diplomacy: 7,
      survival: 10
    },

    traits: ['Tall', 'Spiritual', 'Wise', 'Mountain-Born'],

    encounterWeight: 0.07,
    recruitCost: {
      knowledge: 60,
      culturalInfluence: 40
    }
  },

  JORUN_BEADKEEPER: {
    id: 'jorun_beadkeeper',
    name: 'Jorun Beadkeeper',
    species: 'denisovan',
    gender: 'female',

    description: 'Historian who wears beads representing every important event in her people\'s history',
    backstory: `Each bead tells a story. Jorun wears hundreds—births, deaths, wars, peace, discoveries, disasters. She is the living memory of her people, the keeper of oral histories dating back twenty generations. When she speaks, everyone listens, for her words carry the weight of ancestors. She adds a new bead only for events of great significance. The color, size, and material of each bead is a code only she fully understands.`,

    appearance: {
      description: 'Covered in hundreds of colored beads, braided hair with bone ornaments',
      // artFile: 'jorun_beadkeeper.png'
    },

    role: CHARACTER_ROLES.DIPLOMAT,
    rarity: CHARACTER_RARITY.UNCOMMON,

    startingLocation: 'settlement',

    abilities: {
      living_history: {
        name: 'Living History',
        description: '+50% knowledge generation, unlocks special historical quests',
        effect: { knowledgeBonus: 1.5, historicalQuests: true }
      },
      wisdom_of_ages: {
        name: 'Wisdom of Ages',
        description: 'Can recall solutions to problems, grants random tech hints',
        effect: { techHints: true, problemSolving: 0.3 }
      },
      respected_elder: {
        name: 'Respected Elder',
        description: '+40 relations with all factions when present',
        effect: { globalDiplomacy: 40 }
      }
    },

    stats: {
      leadership: 7,
      combat: 2,
      wisdom: 10,
      diplomacy: 9,
      survival: 6
    },

    traits: ['Wise', 'Respected', 'Ancient Knowledge', 'Storyteller'],

    encounterWeight: 0.10,
    recruitCost: {
      knowledge: 80,
      culturalInfluence: 60
    }
  },

  // ========== HOMO SAPIENS (HUMAN) CHARACTERS ==========

  AMARA_BONEPAINTED: {
    id: 'amara_bonepainted',
    name: 'Amara Bonepainted',
    species: 'homo_sapiens',
    gender: 'female',

    description: 'Dark-skinned shaman covered in intricate bone paintings and sacred pigments',
    backstory: `Amara's body is a canvas of power. Every bone painting represents a spirit she has communed with, every pigment a pact she has made. She spent three years alone in the painted caves, learning from the ancient handprints on the walls. When she emerged, she could see the threads that connect all living things. Her paintings grant protection, her rituals bring rain, her curses bring death. She is feared and revered in equal measure.`,

    appearance: {
      description: 'Dark skin covered in white bone paint patterns, carries paint pots',
      // artFile: 'amara_bonepainted.png'
    },

    role: CHARACTER_ROLES.SHAMAN,
    rarity: CHARACTER_RARITY.RARE,

    startingLocation: 'wandering',

    abilities: {
      ritual_master: {
        name: 'Ritual Master',
        description: 'Can perform powerful rituals for various effects',
        effect: { ritualPower: 2.0, spiritualBonus: 1.5 }
      },
      bone_painting: {
        name: 'Bone Painting',
        description: 'Painted units gain +30% defense and morale immunity',
        effect: { paintedUnitsDefense: 1.3, moraleImmune: true }
      },
      spirit_sight: {
        name: 'Spirit Sight',
        description: 'Can see rare encounters and hidden resources',
        effect: { encounterVision: true, resourceReveal: true }
      }
    },

    stats: {
      leadership: 6,
      combat: 4,
      wisdom: 10,
      diplomacy: 5,
      survival: 8
    },

    traits: ['Spiritual', 'Mysterious', 'Powerful', 'Visionary'],

    encounterWeight: 0.08,
    recruitCost: {
      knowledge: 70,
      culturalInfluence: 50,
      materials: 30
    }
  },

  ZARA_SHELLMOTHER: {
    id: 'zara_shellmother',
    name: 'Zara Shellmother',
    species: 'homo_sapiens',
    gender: 'female',

    description: 'New mother adorned with shells from seven sacred beaches, protector of children',
    backstory: `Zara gave birth to twins during a tsunami, sheltering them in a cave as the water rose around her. She and her children survived on shellfish for seven days until the water receded. Now she wears shells from that cave and six others she has visited in pilgrimage. She has dedicated her life to protecting mothers and children, establishing the first safe birthing houses and teaching midwifery. Her presence guarantees healthy births and strong children.`,

    appearance: {
      description: 'Kind face, adorned with hundreds of shells, carries infant in wrap',
      // artFile: 'zara_shellmother.png'
    },

    role: CHARACTER_ROLES.HEALER,
    rarity: CHARACTER_RARITY.UNCOMMON,

    startingLocation: 'settlement',

    abilities: {
      midwife_master: {
        name: 'Midwife Master',
        description: '+50% population growth, zero infant mortality',
        effect: { populationGrowth: 1.5, infantSurvival: 1.0 }
      },
      shell_blessing: {
        name: 'Shell Blessing',
        description: 'All children born are blessed with +1 to random stat',
        effect: { blessedChildren: true }
      },
      mother_of_all: {
        name: 'Mother of All',
        description: '+20% morale in all settlements, families feel safe',
        effect: { moraleBonus: 1.2, safetyFeeling: true }
      }
    },

    stats: {
      leadership: 7,
      combat: 3,
      wisdom: 8,
      diplomacy: 8,
      survival: 9
    },

    traits: ['Nurturing', 'Protective', 'Wise', 'Blessed'],

    encounterWeight: 0.12,
    recruitCost: {
      food: 40,
      knowledge: 30,
      culturalInfluence: 20
    }
  },

  // ========== GIGANTOPITHECUS (NON-PLAYABLE SPECIES) ==========

  KONG_THE_MOUNTAIN: {
    id: 'kong_the_mountain',
    name: 'Kong the Mountain',
    species: 'gigantopithecus',
    gender: 'male',

    description: 'Massive King Kong-like creature of legendary strength and intelligence',
    backstory: `Kong is the last of his kind, a lonely giant who towers over even the tallest Denisovan. He was once a king, ruling a kingdom of great apes in the bamboo forests. But his people are gone now, lost to time and human expansion. He is intelligent enough to communicate through gestures and drawings, and he understands more than most realize. Those who treat him with respect gain a powerful ally. Those who threaten him learn why his kind were called Mountain Shakers.`,

    appearance: {
      description: 'Enormous gorilla-like being, 10 feet tall, silver-back, wise eyes',
      // artFile: 'kong_the_mountain.png'
    },

    role: CHARACTER_ROLES.HERO,
    rarity: CHARACTER_RARITY.LEGENDARY,

    startingLocation: 'event', // Special encounter only

    abilities: {
      mountain_shaker: {
        name: 'Mountain Shaker',
        description: 'Can destroy enemy fortifications and scatter armies',
        effect: { siegePower: 5.0, intimidation: 0.8 }
      },
      last_of_kind: {
        name: 'Last of His Kind',
        description: 'Immune to all damage, cannot die (will leave if mistreated)',
        effect: { immortal: true, loyaltyRequired: 80 }
      },
      gentle_giant: {
        name: 'Gentle Giant',
        description: '+100% food gathering, can tame any animal instantly',
        effect: { gatheringBonus: 2.0, animalTaming: 1.0 }
      }
    },

    stats: {
      leadership: 5,
      combat: 10,
      wisdom: 7,
      diplomacy: 3,
      survival: 10
    },

    traits: ['Legendary', 'Gentle', 'Powerful', 'Lonely', 'Ancient'],

    encounterWeight: 0.01, // 1% chance, special quest only
    recruitCost: {
      specialQuest: 'BEFRIEND_KONG', // Must complete quest
      food: 500, // He eats a LOT
      culturalInfluence: 100
    }
  }
};

// Helper Functions

export const getCharacterById = (id) => {
  return CHARACTERS[id.toUpperCase()];
};

export const getCharactersBySpecies = (speciesId) => {
  return Object.values(CHARACTERS).filter(char => char.species === speciesId);
};

export const getCharactersByRole = (role) => {
  return Object.values(CHARACTERS).filter(char => char.role === role);
};

export const getCharactersByRarity = (rarity) => {
  return Object.values(CHARACTERS).filter(char => char.rarity === rarity);
};

export const canRecruitCharacter = (character, faction) => {
  const cost = character.recruitCost;

  // Special quest requirement
  if (cost.specialQuest) {
    return false; // Must complete quest first
  }

  // Check resources
  if (cost.food && faction.resources.food < cost.food) return false;
  if (cost.materials && faction.resources.materials < cost.materials) return false;
  if (cost.knowledge && faction.resources.knowledge < cost.knowledge) return false;
  if (cost.culturalInfluence && faction.culturalInfluence < cost.culturalInfluence) return false;
  if (cost.militaryStrength && faction.militaryStrength < cost.militaryStrength) return false;

  return true;
};

export const generateCharacterEncounter = (gameState, faction) => {
  // Get possible characters based on faction species and explored factions
  const possibleCharacters = Object.values(CHARACTERS).filter(char => {
    // Species match or neutral characters
    if (char.species !== faction.speciesId && char.startingLocation !== 'wandering') {
      return false;
    }

    // Check if already recruited
    if (gameState.characters?.some(c => c.characterId === char.id)) {
      return false;
    }

    return true;
  });

  // Weighted random selection
  const totalWeight = possibleCharacters.reduce((sum, char) => sum + char.encounterWeight, 0);
  let random = Math.random() * totalWeight;

  for (const char of possibleCharacters) {
    random -= char.encounterWeight;
    if (random <= 0) {
      return createCharacterInstance(char, gameState.turn);
    }
  }

  return null;
};

export const createCharacterInstance = (characterTemplate, currentTurn) => {
  return {
    characterId: characterTemplate.id,
    name: characterTemplate.name,
    species: characterTemplate.species,
    role: characterTemplate.role,

    currentRole: null, // 'leader', 'unit_commander', 'settler', etc.
    assignedTo: null, // settlementId or unitId

    abilities: characterTemplate.abilities,
    stats: { ...characterTemplate.stats },
    traits: [...characterTemplate.traits],

    // Tracking
    recruitedTurn: currentTurn,
    loyalty: 100, // 0-100, affects if they stay
    experience: 0,

    // Status
    isAlive: true,
    location: null
  };
};

export const applyCharacterAbilities = (character, target, abilityContext) => {
  const characterData = CHARACTERS[character.characterId.toUpperCase()];
  if (!characterData) return target;

  const abilities = characterData.abilities;

  // Apply abilities based on context
  // This will be called from various game systems

  return target; // Modified by abilities
};

// Starting Leaders (for faction selection at game start)
export const STARTING_LEADERS = {
  NEANDERTHAL: ['THORNA_STONEHEART', 'YLVA_WARPAINT'],
  HOMO_FLORESIENSIS: ['KIKO_QUICKFINGER', 'MIRA_FARTRADER'],
  HOMO_ERECTUS: ['CAESAR_THE_WISE', 'SIKARI_DEERSKULL'],
  DENISOVAN: ['AYANA_CLOUDREACHER', 'JORUN_BEADKEEPER'],
  HOMO_SAPIENS: ['AMARA_BONEPAINTED', 'ZARA_SHELLMOTHER']
};

export const getStartingLeadersForSpecies = (speciesId) => {
  const leaderIds = STARTING_LEADERS[speciesId.toUpperCase()] || [];
  return leaderIds.map(id => CHARACTERS[id]);
};
