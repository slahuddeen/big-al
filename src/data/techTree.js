// Technology Research Tree
// Technologies unlock new buildings, units, and abilities

export const TECH_TREE = {
  // Tier 1 - Early Technologies
  FIRE_MASTERY: {
    id: 'fire_mastery',
    name: 'Fire Mastery',
    emoji: '🔥',
    description: 'Master the art of creating and controlling fire',
    tier: 1,

    cost: {
      knowledge: 10,
      time: 2 // turns to research
    },

    prerequisites: [],

    unlocks: {
      buildings: ['HEARTH'],
      abilities: ['cook_food'],
      bonuses: { cookingEfficiency: 1.5, coldResistance: 0.5 }
    }
  },

  STONE_TOOLS: {
    id: 'stone_tools',
    name: 'Advanced Stone Tools',
    emoji: '🪨',
    description: 'Craft sophisticated stone implements',
    tier: 1,

    cost: {
      knowledge: 15,
      time: 2
    },

    prerequisites: [],

    unlocks: {
      buildings: ['WORKSHOP'],
      bonuses: { gatheringSpeed: 1.3, buildingSpeed: 1.2 }
    }
  },

  SHELTER_CRAFT: {
    id: 'shelter_craft',
    name: 'Shelter Crafting',
    emoji: '🏚️',
    description: 'Build sturdy shelters from natural materials',
    tier: 1,

    cost: {
      knowledge: 12,
      time: 2
    },

    prerequisites: [],

    unlocks: {
      buildings: ['LONGHOUSE'],
      bonuses: { populationCapacity: 1.2 }
    }
  },

  PATHFINDING: {
    id: 'pathfinding',
    name: 'Pathfinding',
    emoji: '🧭',
    description: 'Navigate and map the wilderness effectively',
    tier: 1,

    cost: {
      knowledge: 10,
      time: 1
    },

    prerequisites: [],

    unlocks: {
      units: ['SCOUT'],
      bonuses: { movementSpeed: 1.2, explorationRange: 1 }
    }
  },

  // Tier 2 - Intermediate Technologies
  ORGANIZED_WARFARE: {
    id: 'organized_warfare',
    name: 'Organized Warfare',
    emoji: '⚔️',
    description: 'Coordinate groups of warriors in battle',
    tier: 2,

    cost: {
      knowledge: 25,
      time: 3
    },

    prerequisites: ['stone_tools'],

    unlocks: {
      buildings: ['TRAINING_GROUND'],
      units: ['WARRIOR'],
      bonuses: { combatEfficiency: 1.3 }
    }
  },

  SHAMANISM: {
    id: 'shamanism',
    name: 'Shamanism',
    emoji: '✨',
    description: 'Develop spiritual practices and rituals',
    tier: 2,

    cost: {
      knowledge: 30,
      time: 3
    },

    prerequisites: ['fire_mastery'],

    unlocks: {
      buildings: ['RITUAL_CIRCLE'],
      units: ['SHAMAN'],
      bonuses: { morale: 1.2, knowledgeGeneration: 1.5 }
    }
  },

  AGRICULTURE_BASICS: {
    id: 'agriculture_basics',
    name: 'Basic Agriculture',
    emoji: '🌾',
    description: 'Begin cultivating plants and storing seeds',
    tier: 2,

    cost: {
      knowledge: 35,
      time: 4
    },

    prerequisites: ['stone_tools'],

    unlocks: {
      buildings: ['FARM', 'GRANARY'],
      bonuses: { foodProduction: 1.5, foodSpoilage: 0.5 }
    }
  },

  DEFENSIVE_STRUCTURES: {
    id: 'defensive_structures',
    name: 'Defensive Structures',
    emoji: '🛡️',
    description: 'Build walls and fortifications',
    tier: 2,

    cost: {
      knowledge: 30,
      time: 3
    },

    prerequisites: ['shelter_craft', 'stone_tools'],

    unlocks: {
      buildings: ['PALISADE', 'WATCHTOWER'],
      bonuses: { defensiveStrength: 1.5 }
    }
  },

  ANIMAL_DOMESTICATION: {
    id: 'animal_domestication',
    name: 'Animal Domestication',
    emoji: '🐕',
    description: 'Begin taming and breeding animals',
    tier: 2,

    cost: {
      knowledge: 40,
      time: 5
    },

    prerequisites: ['agriculture_basics'],

    unlocks: {
      buildings: ['ANIMAL_PEN'],
      abilities: ['tame_animals'],
      bonuses: { foodProduction: 1.3, huntingBonus: 1.4 }
    }
  },

  SPEAR_FORMATIONS: {
    id: 'spear_formations',
    name: 'Spear Formations',
    emoji: '🗡️',
    description: 'Coordinate spear units in defensive formations',
    tier: 2,

    cost: {
      knowledge: 25,
      time: 3
    },

    prerequisites: ['organized_warfare'],

    unlocks: {
      units: ['SPEARMAN'],
      bonuses: { antiMegafauna: 1.8 }
    }
  },

  // Tier 3 - Advanced Technologies
  ADVANCED_TACTICS: {
    id: 'advanced_tactics',
    name: 'Advanced Tactics',
    emoji: '🧠',
    description: 'Develop sophisticated battle strategies',
    tier: 3,
    speciesAdvantage: 'homo_sapiens', // Sapiens research faster

    cost: {
      knowledge: 60,
      time: 5
    },

    prerequisites: ['organized_warfare', 'pathfinding'],

    unlocks: {
      buildings: ['COMMAND_POST'],
      units: ['STRATEGIST'],
      bonuses: { tacticalAdvantage: 1.5, ambushChance: 1.4 }
    }
  },

  BATTLE_FURY: {
    id: 'battle_fury',
    name: 'Battle Fury',
    emoji: '💪',
    description: 'Channel raw strength and rage in combat',
    tier: 3,
    speciesAdvantage: 'neanderthal', // Neanderthals excel

    cost: {
      knowledge: 50,
      time: 4
    },

    prerequisites: ['organized_warfare'],

    unlocks: {
      buildings: ['WAR_LODGE'],
      units: ['BERSERKER'],
      bonuses: { meleeStrength: 1.6 }
    }
  },

  MOUNTAIN_WARFARE: {
    id: 'mountain_warfare',
    name: 'Mountain Warfare',
    emoji: '⛰️',
    description: 'Master combat in high altitude terrain',
    tier: 3,
    speciesAdvantage: 'denisovan', // Denisovans natural mountaineers

    cost: {
      knowledge: 55,
      time: 4
    },

    prerequisites: ['organized_warfare', 'defensive_structures'],

    unlocks: {
      buildings: ['STONE_FORTRESS'],
      units: ['MOUNTAIN_DEFENDER'],
      bonuses: { mountainDefense: 2.0 }
    }
  },

  GUERRILLA_TACTICS: {
    id: 'guerrilla_tactics',
    name: 'Guerrilla Tactics',
    emoji: '🌿',
    description: 'Perfect hit-and-run forest warfare',
    tier: 3,
    speciesAdvantage: 'homo_floresiensis', // Hobbits are stealthy

    cost: {
      knowledge: 50,
      time: 4
    },

    prerequisites: ['organized_warfare', 'pathfinding'],

    unlocks: {
      buildings: ['HIDDEN_CAMP'],
      units: ['AMBUSHER'],
      bonuses: { stealth: 1.8, forestCombat: 1.7 }
    }
  },

  PERSISTENCE_HUNTING: {
    id: 'persistence_hunting',
    name: 'Persistence Hunting',
    emoji: '🏃',
    description: 'Run down prey and enemies over long distances',
    tier: 3,
    speciesAdvantage: 'homo_erectus', // Erectus are endurance specialists

    cost: {
      knowledge: 50,
      time: 4
    },

    prerequisites: ['organized_warfare', 'pathfinding'],

    unlocks: {
      buildings: ['RUNNER_LODGE'],
      units: ['ENDURANCE_RUNNER'],
      bonuses: { movementSpeed: 1.5, pursuitBonus: 1.8 }
    }
  },

  METALWORKING: {
    id: 'metalworking',
    name: 'Metalworking',
    emoji: '⚒️',
    description: 'Smelt and forge metal tools and weapons',
    tier: 3,

    cost: {
      knowledge: 80,
      time: 6
    },

    prerequisites: ['stone_tools', 'fire_mastery'],

    unlocks: {
      buildings: ['FORGE'],
      bonuses: { toolQuality: 2.0, weaponStrength: 1.8 }
    }
  },

  WRITING: {
    id: 'writing',
    name: 'Writing System',
    emoji: '📜',
    description: 'Record knowledge and history permanently',
    tier: 3,

    cost: {
      knowledge: 100,
      time: 7
    },

    prerequisites: ['shamanism', 'agriculture_basics'],

    unlocks: {
      buildings: ['LIBRARY'],
      bonuses: { knowledgeGeneration: 2.0, culturalInfluence: 1.5 }
    }
  },

  ADVANCED_CONSTRUCTION: {
    id: 'advanced_construction',
    name: 'Advanced Construction',
    emoji: '🏛️',
    description: 'Build monumental structures',
    tier: 3,

    cost: {
      knowledge: 90,
      time: 6
    },

    prerequisites: ['defensive_structures', 'stone_tools'],

    unlocks: {
      buildings: ['MONUMENT', 'STONE_WALLS'],
      bonuses: { buildingDurability: 1.8, culturalInfluence: 1.6 }
    }
  },

  IRRIGATION: {
    id: 'irrigation',
    name: 'Irrigation Systems',
    emoji: '💧',
    description: 'Channel water to where it is needed',
    tier: 3,

    cost: {
      knowledge: 70,
      time: 5
    },

    prerequisites: ['agriculture_basics', 'advanced_construction'],

    unlocks: {
      buildings: ['AQUEDUCT'],
      bonuses: { waterProduction: 2.0, agriculturalYield: 1.4 }
    }
  }
};

// Helper functions
export const getTechById = (id) => {
  return Object.values(TECH_TREE).find(tech => tech.id === id);
};

export const getAvailableTechs = (researchedTechs, speciesId) => {
  return Object.values(TECH_TREE).filter(tech => {
    // Already researched
    if (researchedTechs.includes(tech.id)) {
      return false;
    }

    // Check prerequisites
    const hasPrereqs = tech.prerequisites.every(prereq =>
      researchedTechs.includes(prereq)
    );

    return hasPrereqs;
  });
};

export const getTechCost = (tech, speciesId) => {
  let cost = { ...tech.cost };

  // Species advantage: 20% cheaper knowledge cost
  if (tech.speciesAdvantage === speciesId) {
    cost.knowledge = Math.floor(cost.knowledge * 0.8);
    cost.time = Math.max(1, cost.time - 1);
  }

  return cost;
};

export const canResearchTech = (faction, tech) => {
  const cost = getTechCost(tech, faction.speciesId);

  return (
    faction.resources.knowledge >= cost.knowledge &&
    tech.prerequisites.every(prereq =>
      faction.technologies.includes(prereq)
    )
  );
};

export const getTechsByTier = (tier) => {
  return Object.values(TECH_TREE).filter(tech => tech.tier === tier);
};

export const getTotalTechUnlocks = (technologies) => {
  const unlocks = {
    buildings: new Set(),
    units: new Set(),
    abilities: new Set(),
    bonuses: {}
  };

  technologies.forEach(techId => {
    const tech = getTechById(techId);
    if (!tech) return;

    // Collect buildings
    if (tech.unlocks.buildings) {
      tech.unlocks.buildings.forEach(b => unlocks.buildings.add(b));
    }

    // Collect units
    if (tech.unlocks.units) {
      tech.unlocks.units.forEach(u => unlocks.units.add(u));
    }

    // Collect abilities
    if (tech.unlocks.abilities) {
      tech.unlocks.abilities.forEach(a => unlocks.abilities.add(a));
    }

    // Accumulate bonuses (multiplicative)
    if (tech.unlocks.bonuses) {
      Object.entries(tech.unlocks.bonuses).forEach(([key, value]) => {
        unlocks.bonuses[key] = (unlocks.bonuses[key] || 1) * value;
      });
    }
  });

  return {
    buildings: Array.from(unlocks.buildings),
    units: Array.from(unlocks.units),
    abilities: Array.from(unlocks.abilities),
    bonuses: unlocks.bonuses
  };
};
