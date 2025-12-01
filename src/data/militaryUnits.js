// Prehistoric Military Units System
// Units represent organized groups of warriors, hunters, and specialists

export const UNIT_TYPES = {
  // Basic Units - Available Early
  HUNTER: {
    id: 'hunter',
    name: 'Hunter Band',
    emoji: '🏹',
    description: 'Skilled ranged fighters armed with spears and atlatls',

    cost: {
      population: 1,
      food: 10,
      materials: 15,
      time: 1 // turns to train
    },

    upkeep: {
      food: 2 // per turn
    },

    stats: {
      attack: 4,
      defense: 2,
      health: 30,
      range: 2, // can attack 2 hexes away
      movement: 3,
      visionRange: 3
    },

    bonuses: {
      vsAnimals: 1.5, // bonus against wildlife
      inForests: 1.2
    },

    requires: {
      tech: null, // Available from start
      building: null
    }
  },

  WARRIOR: {
    id: 'warrior',
    name: 'Warrior Band',
    emoji: '⚔️',
    description: 'Close combat fighters with stone weapons and hide armor',

    cost: {
      population: 1,
      food: 15,
      materials: 20,
      time: 2
    },

    upkeep: {
      food: 3
    },

    stats: {
      attack: 6,
      defense: 5,
      health: 50,
      range: 0, // melee only
      movement: 2,
      visionRange: 2
    },

    bonuses: {
      inSettlements: 1.5, // bonus when defending
      vsRaiders: 1.3
    },

    requires: {
      tech: 'organized_warfare',
      building: 'TRAINING_GROUND'
    }
  },

  SPEARMAN: {
    id: 'spearman',
    name: 'Spear Company',
    emoji: '🗡️',
    description: 'Disciplined spearmen effective against large beasts',

    cost: {
      population: 1,
      food: 20,
      materials: 25,
      time: 2
    },

    upkeep: {
      food: 3
    },

    stats: {
      attack: 5,
      defense: 6,
      health: 45,
      range: 1, // slightly longer reach
      movement: 2,
      visionRange: 2
    },

    bonuses: {
      vsMegafauna: 2.0, // excellent against mammoths, etc.
      vsCavalry: 1.5,
      inFormation: 1.3
    },

    requires: {
      tech: 'spear_formations',
      building: 'TRAINING_GROUND'
    }
  },

  SCOUT: {
    id: 'scout',
    name: 'Scout Party',
    emoji: '👣',
    description: 'Swift explorers who reveal terrain and gather intelligence',

    cost: {
      population: 1,
      food: 8,
      materials: 10,
      time: 1
    },

    upkeep: {
      food: 2
    },

    stats: {
      attack: 2,
      defense: 2,
      health: 25,
      range: 0,
      movement: 4,
      visionRange: 4
    },

    bonuses: {
      stealthDetection: true,
      terrainReveal: 2, // reveals extra hexes
      escapeChance: 0.7 // 70% chance to escape combat
    },

    requires: {
      tech: 'pathfinding',
      building: null
    }
  },

  SHAMAN: {
    id: 'shaman',
    name: 'Shaman Circle',
    emoji: '🔮',
    description: 'Spiritual leaders who boost morale and provide wisdom',

    cost: {
      population: 1,
      food: 15,
      materials: 10,
      knowledge: 20,
      time: 3
    },

    upkeep: {
      food: 2,
      knowledge: 1
    },

    stats: {
      attack: 1,
      defense: 2,
      health: 20,
      range: 0,
      movement: 2,
      visionRange: 2
    },

    bonuses: {
      moraleBoost: 0.2, // +20% morale to nearby units
      knowledgeGeneration: 2, // generates knowledge per turn
      healingAura: 5 // heals 5 HP per turn to nearby units
    },

    requires: {
      tech: 'shamanism',
      building: 'RITUAL_CIRCLE'
    }
  },

  // Elite Units - Species-Specific

  BERSERKER: {
    id: 'berserker',
    name: 'Berserker',
    emoji: '💪',
    description: 'Fearsome Neanderthal warriors who enter battle rage',
    speciesRequired: 'neanderthal',

    cost: {
      population: 1,
      food: 30,
      materials: 40,
      time: 3
    },

    upkeep: {
      food: 5
    },

    stats: {
      attack: 10,
      defense: 4,
      health: 70,
      range: 0,
      movement: 2,
      visionRange: 2
    },

    bonuses: {
      rageMode: 2.0, // doubles attack when below 50% HP
      intimidation: 0.3, // enemies have -30% morale
      coldImmune: true
    },

    requires: {
      tech: 'battle_fury',
      building: 'WAR_LODGE'
    }
  },

  STRATEGIST: {
    id: 'strategist',
    name: 'Master Strategist',
    emoji: '🧠',
    description: 'Brilliant Sapiens tactician who commands armies',
    speciesRequired: 'homo_sapiens',

    cost: {
      population: 1,
      food: 25,
      materials: 20,
      knowledge: 40,
      time: 4
    },

    upkeep: {
      food: 3,
      knowledge: 2
    },

    stats: {
      attack: 3,
      defense: 4,
      health: 35,
      range: 0,
      movement: 3,
      visionRange: 4
    },

    bonuses: {
      commandBonus: 0.4, // +40% to all nearby units
      tacticalRetreat: true, // can order organized retreats
      ambushPlanning: 1.5
    },

    requires: {
      tech: 'advanced_tactics',
      building: 'COMMAND_POST'
    }
  },

  MOUNTAIN_DEFENDER: {
    id: 'mountain_defender',
    name: 'Mountain Defender',
    emoji: '🛡️',
    description: 'Stalwart Denisovan warriors who never yield',
    speciesRequired: 'denisovan',

    cost: {
      population: 1,
      food: 25,
      materials: 50,
      time: 3
    },

    upkeep: {
      food: 4
    },

    stats: {
      attack: 5,
      defense: 10,
      health: 80,
      range: 0,
      movement: 1,
      visionRange: 3
    },

    bonuses: {
      inMountains: 2.0,
      immovable: true, // cannot be pushed back
      highAltitude: 1.5
    },

    requires: {
      tech: 'mountain_warfare',
      building: 'STONE_FORTRESS'
    }
  },

  AMBUSHER: {
    id: 'ambusher',
    name: 'Ambush Squad',
    emoji: '🌿',
    description: 'Stealthy Hobbit fighters who strike from shadows',
    speciesRequired: 'homo_floresiensis',

    cost: {
      population: 1,
      food: 15,
      materials: 20,
      time: 2
    },

    upkeep: {
      food: 2
    },

    stats: {
      attack: 7,
      defense: 3,
      health: 30,
      range: 1,
      movement: 4,
      visionRange: 3
    },

    bonuses: {
      stealth: true, // invisible until attacking
      firstStrike: 2.0, // double damage on surprise
      inForests: 2.0,
      evasion: 0.5 // 50% chance to dodge attacks
    },

    requires: {
      tech: 'guerrilla_tactics',
      building: 'HIDDEN_CAMP'
    }
  },

  ENDURANCE_RUNNER: {
    id: 'endurance_runner',
    name: 'Endurance Runner',
    emoji: '🏃',
    description: 'Tireless Homo Erectus warriors who run down prey and enemies',
    speciesRequired: 'homo_erectus',

    cost: {
      population: 1,
      food: 20,
      materials: 15,
      time: 2
    },

    upkeep: {
      food: 3
    },

    stats: {
      attack: 5,
      defense: 4,
      health: 40,
      range: 0,
      movement: 5,
      visionRange: 3
    },

    bonuses: {
      pursuitHunter: 1.8, // bonus vs fleeing enemies
      noTerrainPenalty: true,
      exhaustion: 1.5, // tires enemies in prolonged combat
      heatResistant: true
    },

    requires: {
      tech: 'persistence_hunting',
      building: 'RUNNER_LODGE'
    }
  }
};

// Helper functions
export const getUnitById = (id) => {
  return Object.values(UNIT_TYPES).find(unit => unit.id === id);
};

export const getAvailableUnits = (faction, technologies) => {
  return Object.values(UNIT_TYPES).filter(unit => {
    // Check species requirement
    if (unit.speciesRequired && unit.speciesRequired !== faction.speciesId) {
      return false;
    }

    // Check tech requirement
    if (unit.requires.tech && !technologies.includes(unit.requires.tech)) {
      return false;
    }

    return true;
  });
};

export const canAffordUnit = (faction, unitType) => {
  return (
    faction.resources.food >= (unitType.cost.food || 0) &&
    faction.resources.materials >= (unitType.cost.materials || 0) &&
    faction.resources.knowledge >= (unitType.cost.knowledge || 0) &&
    faction.resources.population >= (unitType.cost.population || 0)
  );
};

export const calculateUnitUpkeep = (units) => {
  return units.reduce((total, unit) => {
    const unitType = getUnitById(unit.typeId);
    return {
      food: total.food + (unitType.upkeep.food || 0),
      knowledge: total.knowledge + (unitType.upkeep.knowledge || 0)
    };
  }, { food: 0, knowledge: 0 });
};
