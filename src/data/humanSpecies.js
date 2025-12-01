// Prehistoric Human and Hominid Species Definitions
// Each species has unique traits that affect gameplay

export const HUMAN_SPECIES = {
  HOMO_SAPIENS: {
    id: 'homo_sapiens',
    name: 'Homo Sapiens',
    fantasyName: 'The Wise Ones',
    displayName: 'Homo Sapiens (The Wise Ones)',
    emoji: '🧑',
    description: 'Innovative and adaptable humans with advanced cognitive abilities and unmatched creativity',
    isPlayable: true,

    // Base stats
    baseStats: {
      strength: 7,
      intelligence: 10,
      endurance: 7,
      agility: 8,
      social: 9
    },

    // Unique traits
    traits: {
      innovativeTechnology: {
        name: 'Innovative Technology',
        description: '+20% research speed, can develop advanced tools faster',
        bonus: { researchSpeed: 1.2 }
      },
      socialNetworks: {
        name: 'Social Networks',
        description: '+15% trade benefits, better diplomatic relations',
        bonus: { tradeBonus: 1.15, diplomacyBonus: 15 }
      },
      adaptability: {
        name: 'Adaptability',
        description: 'Can settle in any terrain type without penalties',
        bonus: { terrainPenalty: 0 }
      }
    },

    startingBonus: {
      population: 12,
      food: 30,
      materials: 20,
      knowledge: 15,
      water: 20
    },

    preferredTerrain: ['plains', 'savanna', 'forest', 'riverbank'],

    customization: {
      skinTones: ['light', 'medium', 'dark', 'very_dark'],
      tribalPatterns: ['geometric', 'spiral', 'linear', 'dotted'],
      colors: ['#8B4513', '#FF6B35', '#004E89', '#9B59B6', '#E74C3C']
    }
  },

  NEANDERTHAL: {
    id: 'neanderthal',
    name: 'Neanderthal',
    fantasyName: 'Dwarves',
    displayName: 'Neanderthal (Dwarves)',
    emoji: '🧔',
    description: 'Robust, stocky folk of the mountains - masters of stone and cold, fierce warriors',
    isPlayable: true,

    baseStats: {
      strength: 10,
      intelligence: 7,
      endurance: 10,
      agility: 6,
      social: 6
    },

    traits: {
      mountainLords: {
        name: 'Lords of Stone',
        description: 'No penalties in mountains/caves, +3 materials from mining',
        bonus: { coldTerrain: true, miningBonus: 3, caveBonus: 1.5 }
      },
      powerfulBuild: {
        name: 'Dwarven Strength',
        description: '+30% combat strength, can hunt megafauna alone',
        bonus: { combatStrength: 1.3, huntingSize: 1.3 }
      },
      craftsmasters: {
        name: 'Master Craftsmen',
        description: 'Superior tool quality, +25% building durability',
        bonus: { toolQuality: 1.25, buildingBonus: 1.25 }
      }
    },

    startingBonus: {
      population: 8,
      food: 40,
      materials: 30,
      knowledge: 8,
      water: 15
    },

    preferredTerrain: ['mountains', 'hills', 'rocky_terrain', 'forest'],

    customization: {
      skinTones: ['pale', 'light', 'ruddy'],
      tribalPatterns: ['runic', 'handprint', 'cave_art', 'geometric'],
      colors: ['#5D4E37', '#CD853F', '#8B7355', '#A0826D', '#C19A6B']
    }
  },

  DENISOVAN: {
    id: 'denisovan',
    name: 'Denisovan',
    fantasyName: 'Giants',
    displayName: 'Denisovan (Giants)',
    emoji: '🗻',
    description: 'Tall, powerful people of the high peaks - mysterious wanderers with ancient knowledge',
    isPlayable: true,

    baseStats: {
      strength: 9,
      intelligence: 8,
      endurance: 10,
      agility: 6,
      social: 7
    },

    traits: {
      highlandGiants: {
        name: 'Highland Giants',
        description: '+50% efficiency in mountains, can cross difficult terrain easily',
        bonus: { mountainBonus: 1.5, terrainMovement: 1.3 }
      },
      ancientBlood: {
        name: 'Ancient Bloodline',
        description: 'Better disease resistance, population grows faster',
        bonus: { diseaseResistance: 0.6, growthRate: 1.2 }
      },
      mysteriousWisdom: {
        name: 'Mysterious Wisdom',
        description: 'Random knowledge breakthroughs, +15% research',
        bonus: { researchSpeed: 1.15, randomBreakthrough: true }
      }
    },

    startingBonus: {
      population: 10,
      food: 35,
      materials: 25,
      knowledge: 12,
      water: 25
    },

    preferredTerrain: ['mountains', 'hills', 'mesa', 'rocky_terrain'],

    customization: {
      skinTones: ['tan', 'medium', 'weathered'],
      tribalPatterns: ['mountain', 'wave', 'zigzag', 'spiral'],
      colors: ['#4A5568', '#2D3748', '#718096', '#A0AEC0', '#CBD5E0']
    }
  },

  HOMO_FLORESIENSIS: {
    id: 'homo_floresiensis',
    name: 'Homo Floresiensis',
    fantasyName: 'Hobbits',
    displayName: 'Homo Floresiensis (Hobbits)',
    emoji: '🌿',
    description: 'Small, nimble folk of forests and islands - cheerful survivors who thrive where others starve',
    isPlayable: true,

    baseStats: {
      strength: 4,
      intelligence: 8,
      endurance: 7,
      agility: 10,
      social: 9
    },

    traits: {
      littlePeople: {
        name: 'The Little Folk',
        description: '-50% food consumption, can hide from predators easily',
        bonus: { foodConsumption: 0.5, predatorAvoidance: 1.5 }
      },
      forestWalkers: {
        name: 'Forest Walkers',
        description: '+3 movement in forests, can gather twice as much food',
        bonus: { forestMovement: 3, gatheringBonus: 2.0 }
      },
      cheerfulResilience: {
        name: 'Cheerful Resilience',
        description: 'High morale even in hardship, community bonds strong',
        bonus: { moraleBonus: 1.3, loyaltyBonus: 1.5 }
      }
    },

    startingBonus: {
      population: 18,
      food: 25,
      materials: 15,
      knowledge: 10,
      water: 15
    },

    preferredTerrain: ['forest', 'dense_forest', 'jungle', 'beach', 'riverbank'],

    customization: {
      skinTones: ['tan', 'brown', 'olive'],
      tribalPatterns: ['leaf', 'bamboo', 'wave', 'shell', 'vine'],
      colors: ['#27AE60', '#16A085', '#2ECC71', '#1ABC9C', '#48C9B0']
    }
  },

  HOMO_ERECTUS: {
    id: 'homo_erectus',
    name: 'Homo Erectus',
    fantasyName: 'The Old Ones',
    displayName: 'Homo Erectus (The Old Ones)',
    emoji: '🔥',
    description: 'Ancient wanderers who first tamed fire - hardy explorers with knowledge passed down through ages',
    isPlayable: true,

    baseStats: {
      strength: 8,
      intelligence: 6,
      endurance: 10,
      agility: 7,
      social: 7
    },

    traits: {
      firekeepers: {
        name: 'Keepers of the First Flame',
        description: 'Start with fire mastery, +4 food from cooking, warmth bonus',
        bonus: { startingTech: ['fire'], cookingBonus: 4, warmth: true }
      },
      endlessWanderers: {
        name: 'Endless Wanderers',
        description: '+2 movement range, can travel without rest',
        bonus: { movementRange: 2, terrainCost: 0.7, staminaBonus: 1.3 }
      },
      ancientKnowledge: {
        name: 'Ancient Ways',
        description: 'Better tracking and hunting, +20% hunt success',
        bonus: { huntingSuccess: 1.2, trackingBonus: 1.4 }
      }
    },

    startingBonus: {
      population: 10,
      food: 35,
      materials: 20,
      knowledge: 5,
      water: 20
    },

    preferredTerrain: ['plains', 'savanna', 'scrubland', 'open_woods'],

    customization: {
      skinTones: ['dark', 'very_dark', 'ebony'],
      tribalPatterns: ['flame', 'sun', 'spiral', 'ancestral'],
      colors: ['#E67E22', '#D35400', '#F39C12', '#CA6F1E', '#DC7633']
    }
  },

  // ========== NON-HUMAN GREAT APES ==========

  GIGANTOPITHECUS: {
    id: 'gigantopithecus',
    name: 'Gigantopithecus',
    fantasyName: 'Mountain Apes',
    displayName: 'Gigantopithecus (Mountain Apes)',
    emoji: '🦍',
    description: 'Massive gentle apes of bamboo forests - peaceful unless threatened, immensely strong',
    isPlayable: false,
    isHostile: false,

    baseStats: {
      strength: 15,
      intelligence: 4,
      endurance: 12,
      agility: 5,
      social: 8
    },

    traits: {
      gentleGiants: {
        name: 'Gentle Giants',
        description: 'Peaceful herbivores, will trade bamboo and forest goods',
        bonus: { peacefulNature: true, tradeBonus: 1.3 }
      },
      terrifyingStrength: {
        name: 'Terrifying When Angered',
        description: 'If attacked, becomes devastating combatant',
        bonus: { combatStrength: 2.0, intimidation: 2.0 }
      }
    },

    startingBonus: {
      population: 6,
      food: 50,
      materials: 10,
      knowledge: 2,
      water: 30
    },

    preferredTerrain: ['dense_forest', 'forest', 'jungle', 'bamboo'],

    customization: {
      colors: ['#2C3E2F', '#3E5641', '#4A6352']
    }
  },

  DINOPITHECUS: {
    id: 'dinopithecus',
    name: 'Dinopithecus',
    fantasyName: 'Savanna Baboons',
    displayName: 'Dinopithecus (Savanna Baboons)',
    emoji: '🐵',
    description: 'Large aggressive baboons of the plains - cunning pack hunters and fierce competitors',
    isPlayable: false,
    isHostile: true,

    baseStats: {
      strength: 7,
      intelligence: 5,
      endurance: 8,
      agility: 9,
      social: 10
    },

    traits: {
      packTactics: {
        name: 'Pack Tactics',
        description: 'Fight in coordinated groups, flanking and ambushing',
        bonus: { packBonus: 2.0, ambushChance: 0.4 }
      },
      cunningScavengers: {
        name: 'Cunning Scavengers',
        description: 'Will steal food and tools, raid settlements at night',
        bonus: { stealChance: 0.3, nightBonus: 1.5 }
      }
    },

    startingBonus: {
      population: 15,
      food: 20,
      materials: 5,
      knowledge: 1,
      water: 15
    },

    preferredTerrain: ['savanna', 'plains', 'rocky_terrain', 'scrubland'],

    customization: {
      colors: ['#8B7355', '#A0826D', '#6B5D52']
    }
  },

  AUSTRALOPITHECUS: {
    id: 'australopithecus',
    name: 'Australopithecus',
    fantasyName: 'The First Walkers',
    displayName: 'Australopithecus (The First Walkers)',
    emoji: '🦧',
    description: 'Ancient upright apes - primitive but curious, live in harmony with nature',
    isPlayable: false,
    isHostile: false,

    baseStats: {
      strength: 6,
      intelligence: 3,
      endurance: 7,
      agility: 8,
      social: 6
    },

    traits: {
      primitiveWays: {
        name: 'Primitive Simplicity',
        description: 'Live in small family groups, avoid conflict when possible',
        bonus: { peacefulNature: true, avoidance: 1.5 }
      },
      natureBond: {
        name: 'Bond with Nature',
        description: 'Can guide you to hidden resources and safe paths',
        bonus: { guidanceChance: 0.4, resourceBonus: 1.2 }
      }
    },

    startingBonus: {
      population: 8,
      food: 15,
      materials: 5,
      knowledge: 1,
      water: 10
    },

    preferredTerrain: ['forest', 'savanna', 'riverbank', 'open_woods'],

    customization: {
      colors: ['#6B5D52', '#8B7355', '#5D4E37']
    }
  }
};

// Helper function to get species by ID
export const getSpeciesById = (id) => {
  return Object.values(HUMAN_SPECIES).find(species => species.id === id);
};

// Helper function to get all playable species
export const getPlayableSpecies = () => {
  return Object.values(HUMAN_SPECIES).filter(species => species.isPlayable);
};

// Helper function to get all non-playable species
export const getNonPlayableSpecies = () => {
  return Object.values(HUMAN_SPECIES).filter(species => !species.isPlayable);
};

// Helper function to calculate total stats for a species
export const calculateSpeciesStats = (speciesId, customizations = {}) => {
  const species = getSpeciesById(speciesId);
  if (!species) return null;

  const stats = { ...species.baseStats };

  // Apply trait bonuses
  Object.values(species.traits).forEach(trait => {
    if (trait.bonus) {
      Object.entries(trait.bonus).forEach(([key, value]) => {
        if (typeof value === 'number' && stats[key]) {
          stats[key] += value;
        }
      });
    }
  });

  return stats;
};

// Export species count for easy reference
export const SPECIES_COUNT = Object.keys(HUMAN_SPECIES).length;
export const PLAYABLE_SPECIES_COUNT = getPlayableSpecies().length;
