// Quest System - Dynamic quests with rewards and consequences
// Quests are generated based on game state and tie into all systems

import { RARE_ENCOUNTERS } from './rareEncounters.js';
import { PREHISTORIC_ANIMALS } from './prehistoricAnimals.js';

export const QUEST_TYPES = {
  EXPLORATION: 'exploration',
  HUNTING: 'hunting',
  DIPLOMACY: 'diplomacy',
  BUILDING: 'building',
  SURVIVAL: 'survival',
  RARE_ENCOUNTER: 'rare_encounter',
  TRADE: 'trade',
  MILITARY: 'military',
  KNOWLEDGE: 'knowledge',
  MYSTERY: 'mystery'
};

export const QUEST_STATUS = {
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

// Quest Templates
export const QUEST_TEMPLATES = {
  // ===== EXPLORATION QUESTS =====
  EXPLORE_TERRITORY: {
    id: 'explore_territory',
    name: 'Uncharted Lands',
    type: QUEST_TYPES.EXPLORATION,
    description: 'Explore {count} unexplored hexes to map the surrounding territory',

    objectives: {
      exploredHexes: 0,
      targetHexes: 10
    },

    rewards: {
      knowledge: 20,
      culturalInfluence: 5,
      actionPoints: 2
    },

    consequences: {
      failure: {
        morale: -0.1,
        message: 'Your people feel uncertain without knowledge of the land'
      }
    },

    expiresIn: 20, // turns
    repeatable: true
  },

  FIND_WATER_SOURCE: {
    id: 'find_water_source',
    name: 'Quest for Water',
    type: QUEST_TYPES.EXPLORATION,
    description: 'Find a new water source (river, lake, or waterhole) to secure your survival',
    priority: 'high',

    objectives: {
      waterSourcesFound: 0,
      targetWaterSources: 1
    },

    rewards: {
      knowledge: 15,
      water: 50,
      morale: 0.15
    },

    consequences: {
      failure: {
        water: -20,
        population: -2,
        message: 'The drought takes its toll on your people'
      }
    },

    expiresIn: 15,
    repeatable: false
  },

  DISCOVER_RARE_TERRAIN: {
    id: 'discover_rare_terrain',
    name: 'Legendary Lands',
    type: QUEST_TYPES.EXPLORATION,
    description: 'Discover the legendary {terrainType} spoken of in stories',

    objectives: {
      terrainType: null, // volcanic, obsidian_field, etc.
      discovered: false
    },

    rewards: {
      knowledge: 40,
      culturalInfluence: 10,
      materials: 50
    },

    expiresIn: 30,
    repeatable: false
  },

  // ===== HUNTING QUESTS =====
  HUNT_MEGAFAUNA: {
    id: 'hunt_megafauna',
    name: 'The Great Hunt',
    type: QUEST_TYPES.HUNTING,
    description: 'Hunt down a {animal} to feed your tribe',

    objectives: {
      animalType: null,
      hunted: false
    },

    rewards: {
      food: 100,
      materials: 30,
      morale: 0.2,
      culturalInfluence: 5
    },

    consequences: {
      failure: {
        population: -1,
        message: 'A hunter was lost in the attempt'
      }
    },

    expiresIn: 10,
    repeatable: true
  },

  DEFEND_AGAINST_PREDATORS: {
    id: 'defend_against_predators',
    name: 'Predator Problem',
    type: QUEST_TYPES.HUNTING,
    description: '{predator} have been attacking settlements. Drive them away!',
    priority: 'high',

    objectives: {
      predatorType: null,
      predatorsDefeated: 0,
      targetCount: 3
    },

    rewards: {
      militaryStrength: 10,
      morale: 0.15,
      materials: 20
    },

    consequences: {
      failure: {
        population: -3,
        food: -30,
        morale: -0.2
      }
    },

    expiresIn: 8,
    repeatable: true
  },

  TAME_WILD_BEAST: {
    id: 'tame_wild_beast',
    name: 'Beast Master',
    type: QUEST_TYPES.HUNTING,
    description: 'Attempt to tame a {animal} for your settlement',

    objectives: {
      animalType: null,
      tamed: false
    },

    rewards: {
      knowledge: 30,
      bonusAbility: 'animal_companion',
      food: 20
    },

    requires: {
      tech: 'animal_domestication'
    },

    expiresIn: 15,
    repeatable: false
  },

  // ===== DIPLOMACY QUESTS =====
  MAKE_FIRST_CONTACT: {
    id: 'make_first_contact',
    name: 'Meeting the Neighbors',
    type: QUEST_TYPES.DIPLOMACY,
    description: 'Make peaceful contact with another faction',

    objectives: {
      contactsMade: 0,
      targetContacts: 1
    },

    rewards: {
      knowledge: 25,
      culturalInfluence: 10,
      tradeRoutes: 1
    },

    expiresIn: 25,
    repeatable: false
  },

  FORGE_ALLIANCE: {
    id: 'forge_alliance',
    name: 'Bonds of Friendship',
    type: QUEST_TYPES.DIPLOMACY,
    description: 'Form an alliance with {factionName}',

    objectives: {
      targetFaction: null,
      allianceFormed: false,
      relationThreshold: 50
    },

    rewards: {
      culturalInfluence: 20,
      militaryStrength: 15,
      knowledge: 20,
      tradeBonus: 1.3
    },

    expiresIn: 30,
    repeatable: true
  },

  RESOLVE_CONFLICT: {
    id: 'resolve_conflict',
    name: 'Path to Peace',
    type: QUEST_TYPES.DIPLOMACY,
    description: 'Make peace with {factionName} before war breaks out',
    priority: 'high',

    objectives: {
      targetFaction: null,
      peaceAchieved: false,
      relationThreshold: 0
    },

    rewards: {
      morale: 0.2,
      culturalInfluence: 15
    },

    consequences: {
      failure: {
        war: true,
        morale: -0.15,
        militaryStrength: -10
      }
    },

    expiresIn: 10,
    repeatable: true
  },

  // ===== BUILDING QUESTS =====
  FOUND_NEW_SETTLEMENT: {
    id: 'found_new_settlement',
    name: 'Expand the Tribe',
    type: QUEST_TYPES.BUILDING,
    description: 'Found a new settlement in a suitable location',

    objectives: {
      settlementsNeeded: 1,
      settlementsFounded: 0
    },

    rewards: {
      population: 5,
      culturalInfluence: 15,
      materials: 50
    },

    expiresIn: 25,
    repeatable: true
  },

  BUILD_WONDER: {
    id: 'build_wonder',
    name: 'Monument to the Ages',
    type: QUEST_TYPES.BUILDING,
    description: 'Construct a {building} to inspire your civilization',

    objectives: {
      buildingType: 'MONUMENT',
      built: false
    },

    rewards: {
      culturalInfluence: 50,
      morale: 0.3,
      knowledge: 40,
      permanentBonus: { culturalInfluence: 1.5 }
    },

    requires: {
      tech: 'advanced_construction'
    },

    expiresIn: 50,
    repeatable: false
  },

  FORTIFY_BORDERS: {
    id: 'fortify_borders',
    name: 'Walls of Defense',
    type: QUEST_TYPES.BUILDING,
    description: 'Build defensive structures in {count} settlements',

    objectives: {
      settlementsToFortify: 3,
      fortified: 0
    },

    rewards: {
      militaryStrength: 25,
      morale: 0.15,
      materials: 30
    },

    requires: {
      tech: 'defensive_structures'
    },

    expiresIn: 30,
    repeatable: true
  },

  // ===== SURVIVAL QUESTS =====
  SURVIVE_WINTER: {
    id: 'survive_winter',
    name: 'The Long Night',
    type: QUEST_TYPES.SURVIVAL,
    description: 'Stockpile enough resources to survive {turns} turns of hardship',
    priority: 'high',

    objectives: {
      foodRequired: 200,
      materialsRequired: 100,
      waterRequired: 150,
      turnsToSurvive: 10
    },

    rewards: {
      morale: 0.25,
      population: 3,
      knowledge: 30
    },

    consequences: {
      failure: {
        population: -5,
        morale: -0.3,
        food: -50
      }
    },

    expiresIn: 15,
    repeatable: true
  },

  CURE_THE_PLAGUE: {
    id: 'cure_the_plague',
    name: 'The Sickness',
    type: QUEST_TYPES.SURVIVAL,
    description: 'Find a cure before the disease spreads',
    priority: 'critical',

    objectives: {
      herbsGathered: 0,
      herbsNeeded: 50,
      shamanConsulted: false
    },

    rewards: {
      population: 5,
      morale: 0.3,
      knowledge: 50,
      bonusAbility: 'medicine'
    },

    consequences: {
      failure: {
        population: -10,
        morale: -0.4,
        knownledge: -20
      }
    },

    expiresIn: 8,
    repeatable: false
  },

  OVERCOME_DROUGHT: {
    id: 'overcome_drought',
    name: 'The Dry Times',
    type: QUEST_TYPES.SURVIVAL,
    description: 'Build water infrastructure before your people perish',
    priority: 'critical',

    objectives: {
      waterBuildings: 0,
      targetWaterBuildings: 2
    },

    rewards: {
      water: 100,
      morale: 0.2,
      knowledge: 25
    },

    consequences: {
      failure: {
        population: -8,
        morale: -0.35,
        water: -50
      }
    },

    expiresIn: 10,
    repeatable: false
  },

  // ===== RARE ENCOUNTER QUESTS =====
  ORC_RAID_WARNING: {
    id: 'orc_raid_warning',
    name: 'The Corrupted Approach',
    type: QUEST_TYPES.RARE_ENCOUNTER,
    description: 'Scouts report Orc warbands in the region. Prepare defenses!',
    priority: 'high',

    objectives: {
      defensiveStrength: 0,
      targetStrength: 30,
      garrisonSize: 0,
      targetGarrison: 5
    },

    rewards: {
      militaryStrength: 20,
      materials: 40,
      morale: 0.15
    },

    consequences: {
      failure: {
        population: -10,
        morale: -0.3,
        food: -50,
        settlementDamage: true
      }
    },

    expiresIn: 5,
    repeatable: true
  },

  GOBLIN_MARKET: {
    id: 'goblin_market',
    name: 'The Secret Market',
    type: QUEST_TYPES.RARE_ENCOUNTER,
    description: 'Goblins offer access to their underground markets',

    objectives: {
      tradeCompleted: false,
      resourcesOffered: {
        food: 30,
        materials: 20
      }
    },

    rewards: {
      uniqueItems: ['glowing_mushrooms', 'cave_maps'],
      knowledge: 35,
      tradeRoute: true
    },

    expiresIn: 8,
    repeatable: false
  },

  DRYAD_ALLIANCE: {
    id: 'dryad_alliance',
    name: 'Daughters of the Grove',
    type: QUEST_TYPES.RARE_ENCOUNTER,
    description: 'The Dryads propose a cultural exchange',

    objectives: {
      menSent: 0,
      menRequired: 3,
      acceptAlliance: false
    },

    rewards: {
      knowledge: 60,
      bonusAbility: 'herbalism_mastery',
      allianceBonus: { healing: 2.0 },
      population: 5 // Mixed offspring eventually return
    },

    consequences: {
      refusal: {
        hostileDryads: true,
        menKidnapped: 3
      }
    },

    expiresIn: 12,
    repeatable: false
  },

  // ===== TRADE QUESTS =====
  ESTABLISH_TRADE_ROUTE: {
    id: 'establish_trade_route',
    name: 'Merchant Paths',
    type: QUEST_TYPES.TRADE,
    description: 'Establish a permanent trade route with {factionName}',

    objectives: {
      targetFaction: null,
      successfulTrades: 0,
      tradesNeeded: 3
    },

    rewards: {
      tradeBonus: 1.5,
      culturalInfluence: 10,
      materials: 30
    },

    expiresIn: 20,
    repeatable: true
  },

  MONOPOLIZE_RESOURCE: {
    id: 'monopolize_resource',
    name: 'Resource Dominance',
    type: QUEST_TYPES.TRADE,
    description: 'Control all {resource} sources in the region',

    objectives: {
      resourceType: null,
      sourcesControlled: 0,
      totalSources: 5
    },

    rewards: {
      tradeBonus: 2.0,
      materials: 100,
      culturalInfluence: 25
    },

    expiresIn: 40,
    repeatable: false
  },

  // ===== MILITARY QUESTS =====
  TRAIN_ARMY: {
    id: 'train_army',
    name: 'Raise an Army',
    type: QUEST_TYPES.MILITARY,
    description: 'Train {count} military units to defend your lands',

    objectives: {
      unitsNeeded: 5,
      unitsTrained: 0
    },

    rewards: {
      militaryStrength: 30,
      morale: 0.15,
      knowledge: 20
    },

    requires: {
      tech: 'organized_warfare'
    },

    expiresIn: 25,
    repeatable: true
  },

  DEFEAT_RIVAL: {
    id: 'defeat_rival',
    name: 'Decisive Victory',
    type: QUEST_TYPES.MILITARY,
    description: 'Defeat {factionName} in battle',
    priority: 'high',

    objectives: {
      targetFaction: null,
      defeated: false
    },

    rewards: {
      militaryStrength: 40,
      culturalInfluence: 30,
      materials: 80,
      territory: 5
    },

    consequences: {
      failure: {
        militaryStrength: -20,
        morale: -0.25,
        culturalInfluence: -15
      }
    },

    expiresIn: 20,
    repeatable: true
  },

  // ===== KNOWLEDGE QUESTS =====
  RESEARCH_BREAKTHROUGH: {
    id: 'research_breakthrough',
    name: 'Wisdom of the Ages',
    type: QUEST_TYPES.KNOWLEDGE,
    description: 'Research {techName} to advance your civilization',

    objectives: {
      techId: null,
      researched: false
    },

    rewards: {
      knowledge: 50,
      culturalInfluence: 15,
      morale: 0.1
    },

    expiresIn: 30,
    repeatable: true
  },

  UNLOCK_SPECIES_TECH: {
    id: 'unlock_species_tech',
    name: 'Ancestral Knowledge',
    type: QUEST_TYPES.KNOWLEDGE,
    description: 'Unlock your species-specific technology',

    objectives: {
      speciesTech: null,
      researched: false
    },

    rewards: {
      knowledge: 80,
      culturalInfluence: 25,
      permanentBonus: true
    },

    expiresIn: 40,
    repeatable: false
  },

  // ===== MYSTERY QUESTS =====
  ANCIENT_RUINS: {
    id: 'ancient_ruins',
    name: 'Echoes of the Past',
    type: QUEST_TYPES.MYSTERY,
    description: 'Investigate strange ruins discovered by scouts',

    objectives: {
      ruinsExplored: false,
      artifactsFound: 0
    },

    rewards: {
      randomReward: true,
      knowledge: 100,
      culturalInfluence: 40,
      possibleCurse: 0.2 // 20% chance of negative effect
    },

    expiresIn: 15,
    repeatable: false
  },

  SPIRIT_VISION: {
    id: 'spirit_vision',
    name: 'The Shaman Dreams',
    type: QUEST_TYPES.MYSTERY,
    description: 'Your shaman has had a vision. Follow it to discover the truth',

    objectives: {
      visionFollowed: false,
      locationReached: null
    },

    rewards: {
      randomReward: true,
      knowledge: 75,
      possibleBoon: true
    },

    requires: {
      building: 'RITUAL_CIRCLE'
    },

    expiresIn: 20,
    repeatable: true
  }
};

// Quest Generation Functions
export const generateQuest = (template, gameState, faction) => {
  const quest = {
    ...template,
    id: `${template.id}_${Date.now()}`,
    status: QUEST_STATUS.AVAILABLE,
    turnCreated: gameState.turn,
    expiresAtTurn: gameState.turn + template.expiresIn,
    progress: 0
  };

  // Fill in dynamic content
  if (template.description.includes('{')) {
    quest.description = fillQuestDescription(template, gameState, faction);
  }

  return quest;
};

const fillQuestDescription = (template, gameState, faction) => {
  let desc = template.description;

  // Replace placeholders
  if (desc.includes('{animal}')) {
    const animals = Object.values(PREHISTORIC_ANIMALS).filter(a => a.foodYield > 50);
    const animal = animals[Math.floor(Math.random() * animals.length)];
    desc = desc.replace('{animal}', animal.name);
  }

  if (desc.includes('{predator}')) {
    const predators = Object.values(PREHISTORIC_ANIMALS).filter(a => a.danger > 5);
    const predator = predators[Math.floor(Math.random() * predators.length)];
    desc = desc.replace('{predator}', predator.name);
  }

  if (desc.includes('{factionName}')) {
    const otherFactions = gameState.factions.filter(f => f.id !== faction.id);
    if (otherFactions.length > 0) {
      const targetFaction = otherFactions[Math.floor(Math.random() * otherFactions.length)];
      desc = desc.replace('{factionName}', targetFaction.name);
    }
  }

  if (desc.includes('{count}')) {
    desc = desc.replace('{count}', template.objectives.targetHexes ||
                                     template.objectives.unitsNeeded ||
                                     template.objectives.settlementsToFortify || 3);
  }

  return desc;
};

export const updateQuestProgress = (quest, action, amount = 1) => {
  // Update specific objective
  if (quest.objectives[action] !== undefined) {
    if (typeof quest.objectives[action] === 'number') {
      quest.objectives[action] += amount;
    } else if (typeof quest.objectives[action] === 'boolean') {
      quest.objectives[action] = true;
    }
  }

  // Check if quest is complete
  return checkQuestCompletion(quest);
};

export const checkQuestCompletion = (quest) => {
  const objectives = quest.objectives;

  // Check all objectives
  const allComplete = Object.entries(objectives).every(([key, value]) => {
    // Skip target/threshold keys
    if (key.includes('target') || key.includes('Required') || key.includes('Needed')) {
      return true;
    }

    // Check boolean objectives
    if (typeof value === 'boolean') {
      return value === true;
    }

    // Check numeric objectives
    if (typeof value === 'number') {
      const targetKey = key.replace('ed', '') + 'Needed' ||
                       'target' + key.charAt(0).toUpperCase() + key.slice(1) ||
                       key.replace('s', '') + 'Required';
      const target = objectives[targetKey];
      if (target !== undefined) {
        return value >= target;
      }
    }

    return true;
  });

  return allComplete;
};

export const completeQuest = (quest, faction) => {
  quest.status = QUEST_STATUS.COMPLETED;

  // Apply rewards
  const rewards = { ...quest.rewards };

  if (rewards.food) faction.resources.food += rewards.food;
  if (rewards.materials) faction.resources.materials += rewards.materials;
  if (rewards.water) faction.resources.water += rewards.water;
  if (rewards.knowledge) faction.resources.knowledge += rewards.knowledge;
  if (rewards.population) faction.resources.population += rewards.population;
  if (rewards.morale) {
    faction.settlements.forEach(s => {
      s.morale = Math.min(1.0, s.morale + rewards.morale);
    });
  }
  if (rewards.militaryStrength) faction.militaryStrength += rewards.militaryStrength;
  if (rewards.culturalInfluence) faction.culturalInfluence += rewards.culturalInfluence;

  return {
    quest,
    rewards,
    message: `Quest Completed: ${quest.name}!`
  };
};

export const failQuest = (quest, faction) => {
  quest.status = QUEST_STATUS.FAILED;

  // Apply consequences if any
  if (quest.consequences && quest.consequences.failure) {
    const consequences = quest.consequences.failure;

    if (consequences.food) faction.resources.food += consequences.food; // negative
    if (consequences.materials) faction.resources.materials += consequences.materials;
    if (consequences.water) faction.resources.water += consequences.water;
    if (consequences.population) faction.resources.population += consequences.population;
    if (consequences.morale) {
      faction.settlements.forEach(s => {
        s.morale = Math.max(0.3, s.morale + consequences.morale);
      });
    }

    return {
      quest,
      consequences,
      message: `Quest Failed: ${quest.name}. ${consequences.message || ''}`
    };
  }

  return { quest, message: `Quest Failed: ${quest.name}` };
};

export const getAvailableQuestTemplates = (faction, gameState) => {
  return Object.values(QUEST_TEMPLATES).filter(template => {
    // Check tech requirements
    if (template.requires?.tech && !faction.technologies.includes(template.requires.tech)) {
      return false;
    }

    // Check building requirements
    if (template.requires?.building) {
      const hasBuilding = faction.settlements.some(s =>
        s.buildings.includes(template.requires.building)
      );
      if (!hasBuilding) return false;
    }

    return true;
  });
};
