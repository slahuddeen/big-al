// Prehistoric Human Species Definitions
// Each species has unique traits that affect gameplay

export const HUMAN_SPECIES = {
  HOMO_SAPIENS: {
    id: 'homo_sapiens',
    name: 'Homo Sapiens',
    displayName: 'Homo Sapiens',
    emoji: '🧑',
    description: 'Innovative and adaptable humans with advanced cognitive abilities',

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

    // Starting bonuses
    startingBonus: {
      population: 12,
      food: 30,
      materials: 20,
      knowledge: 15
    },

    // Preferred terrain
    preferredTerrain: ['plains', 'savanna', 'forest', 'riverbank'],

    // Available customizations
    customization: {
      skinTones: ['light', 'medium', 'dark', 'very_dark'],
      tribalPatterns: ['geometric', 'spiral', 'linear', 'dotted'],
      colors: ['#8B4513', '#FF6B35', '#004E89', '#9B59B6', '#E74C3C']
    }
  },

  NEANDERTHAL: {
    id: 'neanderthal',
    name: 'Neanderthal',
    displayName: 'Neanderthal',
    emoji: '💪',
    description: 'Robust and powerful humans adapted to harsh climates',

    baseStats: {
      strength: 10,
      intelligence: 7,
      endurance: 10,
      agility: 6,
      social: 6
    },

    traits: {
      coldAdapted: {
        name: 'Cold Adapted',
        description: 'No penalties in cold/mountain terrain, +2 food from hunting',
        bonus: { coldTerrain: true, huntingBonus: 2 }
      },
      powerfulBuild: {
        name: 'Powerful Build',
        description: '+30% combat strength in melee, can hunt larger animals',
        bonus: { combatStrength: 1.3, huntingSize: 1.2 }
      },
      smallGroups: {
        name: 'Small Groups',
        description: 'Lower population cap but higher individual efficiency',
        bonus: { populationCap: 0.8, efficiency: 1.25 }
      }
    },

    startingBonus: {
      population: 8,
      food: 40,
      materials: 25,
      knowledge: 8
    },

    preferredTerrain: ['mountains', 'hills', 'forest', 'rocky_terrain'],

    customization: {
      skinTones: ['pale', 'light'],
      tribalPatterns: ['simple', 'handprint', 'cave_art'],
      colors: ['#5D4E37', '#CD853F', '#8B7355', '#A0826D', '#C19A6B']
    }
  },

  DENISOVAN: {
    id: 'denisovan',
    name: 'Denisovan',
    displayName: 'Denisovan',
    emoji: '🏔️',
    description: 'Mysterious humans adapted to high altitudes and diverse environments',

    baseStats: {
      strength: 8,
      intelligence: 8,
      endurance: 9,
      agility: 7,
      social: 7
    },

    traits: {
      highAltitude: {
        name: 'High Altitude Adaptation',
        description: '+50% efficiency in mountains and hills, better oxygen usage',
        bonus: { mountainBonus: 1.5, enduranceBonus: 2 }
      },
      geneticDiversity: {
        name: 'Genetic Diversity',
        description: 'Better disease resistance, faster population growth',
        bonus: { diseaseResistance: 0.7, growthRate: 1.15 }
      },
      mysteriousKnowledge: {
        name: 'Mysterious Knowledge',
        description: 'Random knowledge breakthroughs, +10% research',
        bonus: { researchSpeed: 1.1, randomBreakthrough: true }
      }
    },

    startingBonus: {
      population: 10,
      food: 35,
      materials: 22,
      knowledge: 12
    },

    preferredTerrain: ['mountains', 'hills', 'mesa', 'rocky_terrain'],

    customization: {
      skinTones: ['medium', 'tan'],
      tribalPatterns: ['mountain', 'wave', 'zigzag'],
      colors: ['#4A5568', '#2D3748', '#718096', '#A0AEC0', '#CBD5E0']
    }
  },

  HOMO_FLORESIENSIS: {
    id: 'homo_floresiensis',
    name: 'Homo Floresiensis',
    displayName: 'Homo Floresiensis',
    emoji: '🌴',
    description: 'Small-statured "Hobbits" adapted to island life and dense forests',

    baseStats: {
      strength: 5,
      intelligence: 8,
      endurance: 6,
      agility: 10,
      social: 8
    },

    traits: {
      smallStature: {
        name: 'Small Stature',
        description: '-40% food consumption, can move through dense terrain easily',
        bonus: { foodConsumption: 0.6, terrainMovement: 1.3 }
      },
      islandAdapted: {
        name: 'Island Adapted',
        description: 'Can cross water more easily, +2 movement in forests',
        bonus: { waterCrossing: true, forestMovement: 2 }
      },
      resourceful: {
        name: 'Resourceful',
        description: '+25% material gathering from limited resources',
        bonus: { gatheringBonus: 1.25, efficiencyBonus: 1.2 }
      }
    },

    startingBonus: {
      population: 15,
      food: 25,
      materials: 18,
      knowledge: 10
    },

    preferredTerrain: ['forest', 'dense_forest', 'jungle', 'beach'],

    customization: {
      skinTones: ['tan', 'medium'],
      tribalPatterns: ['leaf', 'bamboo', 'wave', 'shell'],
      colors: ['#27AE60', '#16A085', '#2ECC71', '#1ABC9C', '#48C9B0']
    }
  },

  HOMO_ERECTUS: {
    id: 'homo_erectus',
    name: 'Homo Erectus',
    displayName: 'Homo Erectus',
    emoji: '🔥',
    description: 'Ancient pioneers who mastered fire and long-distance travel',

    baseStats: {
      strength: 8,
      intelligence: 6,
      endurance: 9,
      agility: 7,
      social: 7
    },

    traits: {
      fireMasters: {
        name: 'Masters of Fire',
        description: 'Start with fire technology, +3 food from cooking',
        bonus: { startingTech: ['fire'], cookingBonus: 3, warmth: true }
      },
      longDistance: {
        name: 'Long Distance Travelers',
        description: '+2 movement range, lower terrain costs',
        bonus: { movementRange: 2, terrainCost: 0.8 }
      },
      persistent: {
        name: 'Persistent Hunters',
        description: 'Better at exhausting prey, +15% hunting success',
        bonus: { huntingSuccess: 1.15, stamina: 1.2 }
      }
    },

    startingBonus: {
      population: 10,
      food: 35,
      materials: 20,
      knowledge: 5
    },

    preferredTerrain: ['plains', 'savanna', 'scrubland', 'open_woods'],

    customization: {
      skinTones: ['dark', 'very_dark'],
      tribalPatterns: ['flame', 'sun', 'spiral'],
      colors: ['#E67E22', '#D35400', '#F39C12', '#CA6F1E', '#DC7633']
    }
  }
};

// Helper function to get species by ID
export const getSpeciesById = (id) => {
  return Object.values(HUMAN_SPECIES).find(species => species.id === id);
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
