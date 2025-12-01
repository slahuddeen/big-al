// Settlement System for Prehistoric Tribes

export const SETTLEMENT_TYPES = {
  CAMP: {
    name: 'Camp',
    emoji: '⛺',
    populationCap: 20,
    productionBonus: 1.0,
    defensiveBonus: 0,
    upgradeRequirements: {
      population: 15,
      materials: 50,
      knowledge: 20
    },
    upgradesTo: 'VILLAGE'
  },
  VILLAGE: {
    name: 'Village',
    emoji: '🏘️',
    populationCap: 50,
    productionBonus: 1.3,
    defensiveBonus: 2,
    upgradeRequirements: {
      population: 40,
      materials: 150,
      knowledge: 50
    },
    upgradesTo: 'SETTLEMENT'
  },
  SETTLEMENT: {
    name: 'Settlement',
    emoji: '🏛️',
    populationCap: 100,
    productionBonus: 1.6,
    defensiveBonus: 5,
    upgradeRequirements: {
      population: 80,
      materials: 300,
      knowledge: 100
    },
    upgradesTo: null // Max level
  }
};

export const SETTLEMENT_BUILDINGS = {
  SHELTER: {
    name: 'Shelter',
    emoji: '🏚️',
    description: 'Basic protection from elements',
    cost: { materials: 10 },
    benefit: { populationCap: 5, warmth: true },
    required: true
  },
  FIRE_PIT: {
    name: 'Fire Pit',
    emoji: '🔥',
    description: 'Warmth, cooking, and protection',
    cost: { materials: 5, knowledge: 5 },
    benefit: { foodBonus: 1.2, defense: 1, warmth: true }
  },
  STORAGE: {
    name: 'Storage Pit',
    emoji: '🗄️',
    description: 'Preserves food longer',
    cost: { materials: 15 },
    benefit: { foodStorage: 50, spoilageReduction: 0.5 }
  },
  WORKSHOP: {
    name: 'Workshop',
    emoji: '🔨',
    description: 'Craft better tools',
    cost: { materials: 25, knowledge: 15 },
    benefit: { toolQuality: 1.3, productionBonus: 1.2 }
  },
  GATHERING_POST: {
    name: 'Gathering Post',
    emoji: '🌾',
    description: 'Improves foraging efficiency',
    cost: { materials: 10 },
    benefit: { gatheringBonus: 1.3 }
  },
  HUNTING_LODGE: {
    name: 'Hunting Lodge',
    emoji: '🏹',
    description: 'Better hunting coordination',
    cost: { materials: 20, knowledge: 10 },
    benefit: { huntingBonus: 1.4, huntingRange: 2 }
  },
  SHAMAN_HUT: {
    name: "Shaman's Hut",
    emoji: '🔮',
    description: 'Spiritual guidance and knowledge',
    cost: { materials: 15, knowledge: 25 },
    benefit: { knowledgeProduction: 2, morale: 1.2 }
  },
  MEETING_CIRCLE: {
    name: 'Meeting Circle',
    emoji: '⭕',
    description: 'Diplomatic negotiations',
    cost: { materials: 10, knowledge: 10 },
    benefit: { diplomacyBonus: 1.3, tradeBonus: 1.1 }
  },
  PALISADE: {
    name: 'Palisade',
    emoji: '🛡️',
    description: 'Defensive wall',
    cost: { materials: 50, knowledge: 15 },
    benefit: { defense: 5 }
  },
  CAVE_DWELLING: {
    name: 'Cave Dwelling',
    emoji: '🗻',
    description: 'Natural shelter in mountains',
    cost: { materials: 5 },
    benefit: { populationCap: 10, defense: 3 },
    requiresTerrain: ['mountains', 'rocky_terrain', 'hills']
  },
  FISHING_POST: {
    name: 'Fishing Post',
    emoji: '🎣',
    description: 'Harvest fish from waters',
    cost: { materials: 15 },
    benefit: { foodProduction: 8 },
    requiresTerrain: ['river', 'lake', 'riverbank', 'waterhole']
  },
  WELL: {
    name: 'Well',
    emoji: '🚰',
    description: 'Provides water far from natural sources',
    cost: { materials: 30, knowledge: 15 },
    benefit: { waterProduction: 15, waterSecurity: true }
  },
  WATER_STORAGE: {
    name: 'Water Storage',
    emoji: '🏺',
    description: 'Store water for dry seasons',
    cost: { materials: 20 },
    benefit: { waterStorage: 50, droughtResistance: 0.5 }
  },
  AQUEDUCT: {
    name: 'Aqueduct',
    emoji: '🌉',
    description: 'Channels water from distant sources',
    cost: { materials: 50, knowledge: 30 },
    benefit: { waterProduction: 30, waterRange: 3 },
    requiresNearbyWater: true
  }
};

// Create a new settlement
export const createSettlement = ({
  id,
  name,
  factionId,
  hex,
  type = 'CAMP',
  foundedTurn = 0
}) => {
  const settlementType = SETTLEMENT_TYPES[type];

  return {
    id,
    name,
    factionId,
    hex, // { q, r }
    type,
    foundedTurn,

    // Population
    population: 10,
    populationGrowthRate: 1.05, // 5% per turn (affected by food)
    maxPopulation: settlementType.populationCap,

    // Production
    productionBonus: settlementType.productionBonus,

    // Resources
    storedFood: 20,
    storedMaterials: 10,
    storedWater: 20, // New: Water storage

    // Buildings
    buildings: ['SHELTER'], // Start with basic shelter
    buildQueue: [], // Buildings being constructed

    // Defense
    defensiveStrength: settlementType.defensiveBonus,
    garrison: 0, // Military units stationed

    // Production per turn (calculated based on terrain, buildings, population)
    production: {
      food: 0,
      materials: 0,
      knowledge: 0
    },

    // Assignments (what population is doing)
    assignments: {
      gathering: 5, // Food gathering
      hunting: 2,   // Hunting
      crafting: 1,  // Making materials
      research: 1,  // Knowledge
      military: 1,  // Defense/military
      idle: 0       // Unassigned
    },

    // Special features
    specialResources: [], // Nearby special resources (mammoth herd, flint deposit, etc)

    // Status
    isCapital: false,
    isUnderSiege: false,
    morale: 1.0, // Affects production (0.5 to 1.5)

    // History
    events: []
  };
};

// Calculate settlement production for a turn
export const calculateSettlementProduction = (settlement, terrain, faction) => {
  const { assignments, population, buildings, morale, productionBonus } = settlement;

  let foodProduction = 0;
  let materialsProduction = 0;
  let knowledgeProduction = 0;

  // Base production from assignments
  foodProduction += assignments.gathering * 2; // 2 food per gatherer
  foodProduction += assignments.hunting * 3;    // 3 food per hunter (riskier)

  materialsProduction += assignments.crafting * 2; // 2 materials per crafter

  knowledgeProduction += assignments.research * 1; // 1 knowledge per researcher

  // Terrain bonuses
  if (terrain) {
    const terrainBonuses = getTerrainProductionBonus(terrain.type);
    foodProduction *= terrainBonuses.food;
    materialsProduction *= terrainBonuses.materials;
  }

  // Building bonuses
  buildings.forEach(buildingKey => {
    const building = SETTLEMENT_BUILDINGS[buildingKey];
    if (building.benefit.gatheringBonus && assignments.gathering > 0) {
      foodProduction *= building.benefit.gatheringBonus;
    }
    if (building.benefit.huntingBonus && assignments.hunting > 0) {
      foodProduction *= building.benefit.huntingBonus;
    }
    if (building.benefit.productionBonus) {
      materialsProduction *= building.benefit.productionBonus;
    }
    if (building.benefit.knowledgeProduction) {
      knowledgeProduction += building.benefit.knowledgeProduction;
    }
    if (building.benefit.foodProduction) {
      foodProduction += building.benefit.foodProduction;
    }
  });

  // Morale modifier
  foodProduction *= morale;
  materialsProduction *= morale;
  knowledgeProduction *= morale;

  // Settlement type bonus
  foodProduction *= productionBonus;
  materialsProduction *= productionBonus;
  knowledgeProduction *= productionBonus;

  // Species bonuses (from faction)
  // This would be applied by the game engine

  return {
    food: Math.floor(foodProduction),
    materials: Math.floor(materialsProduction),
    knowledge: Math.floor(knowledgeProduction)
  };
};

// Get terrain production bonuses
const getTerrainProductionBonus = (terrainType) => {
  const bonuses = {
    // Food-rich terrains
    'forest': { food: 1.3, materials: 1.2 },
    'dense_forest': { food: 1.4, materials: 1.3 },
    'riverbank': { food: 1.5, materials: 1.0 },
    'marsh': { food: 1.3, materials: 0.9 },

    // Good for materials
    'rocky_terrain': { food: 0.8, materials: 1.4 },
    'hills': { food: 0.9, materials: 1.3 },
    'mountains': { food: 0.7, materials: 1.5 },

    // Balanced
    'plains': { food: 1.0, materials: 1.0 },
    'savanna': { food: 1.2, materials: 1.0 },

    // Poor terrains
    'desert': { food: 0.5, materials: 0.8 },
    'badlands': { food: 0.4, materials: 1.1 },

    // Default
    'default': { food: 1.0, materials: 1.0 }
  };

  return bonuses[terrainType] || bonuses.default;
};

// Calculate food consumption for settlement
export const calculateFoodConsumption = (settlement) => {
  const baseConsumption = settlement.population * 1; // 1 food per person per turn
  return baseConsumption;
};

// Process population growth
export const processPopulationGrowth = (settlement) => {
  const foodBalance = settlement.storedFood - calculateFoodConsumption(settlement);

  // Only grow if fed and not at cap
  if (foodBalance > 0 && settlement.population < settlement.maxPopulation) {
    const growthChance = settlement.populationGrowthRate - 1; // 5% = 0.05
    if (Math.random() < growthChance) {
      settlement.population += 1;
      settlement.events.push({
        turn: settlement.foundedTurn,
        type: 'growth',
        message: 'Population grew to ' + settlement.population
      });
    }
  }

  // Starvation if no food
  if (foodBalance < -10) {
    settlement.population = Math.max(1, settlement.population - 1);
    settlement.morale = Math.max(0.5, settlement.morale - 0.1);
    settlement.events.push({
      turn: settlement.foundedTurn,
      type: 'starvation',
      message: 'Population decreased due to starvation!'
    });
  }
};

// Check if settlement can upgrade
export const canUpgrade = (settlement, faction) => {
  const currentType = SETTLEMENT_TYPES[settlement.type];

  if (!currentType.upgradesTo) {
    return false; // Already max level
  }

  const requirements = currentType.upgradeRequirements;

  return (
    settlement.population >= requirements.population &&
    faction.resources.materials >= requirements.materials &&
    faction.resources.knowledge >= requirements.knowledge
  );
};

// Upgrade settlement
export const upgradeSettlement = (settlement, faction) => {
  const currentType = SETTLEMENT_TYPES[settlement.type];

  if (!canUpgrade(settlement, faction)) {
    return false;
  }

  const requirements = currentType.upgradeRequirements;

  // Pay costs
  faction.resources.materials -= requirements.materials;
  faction.resources.knowledge -= requirements.knowledge;

  // Upgrade
  settlement.type = currentType.upgradesTo;
  const newType = SETTLEMENT_TYPES[settlement.type];

  settlement.maxPopulation = newType.populationCap;
  settlement.productionBonus = newType.productionBonus;
  settlement.defensiveStrength = newType.defensiveBonus;

  settlement.events.push({
    turn: settlement.foundedTurn,
    type: 'upgrade',
    message: `Settlement upgraded to ${newType.name}!`
  });

  return true;
};

// Check if building can be constructed
export const canBuildBuilding = (settlement, buildingKey, terrain) => {
  const building = SETTLEMENT_BUILDINGS[buildingKey];

  // Already have it?
  if (settlement.buildings.includes(buildingKey)) {
    return false;
  }

  // Terrain requirement?
  if (building.requiresTerrain && !building.requiresTerrain.includes(terrain.type)) {
    return false;
  }

  return true;
};

// Add building to settlement
export const buildBuilding = (settlement, buildingKey, faction) => {
  const building = SETTLEMENT_BUILDINGS[buildingKey];

  // Check costs
  if (faction.resources.materials < (building.cost.materials || 0)) {
    return false;
  }
  if (faction.resources.knowledge < (building.cost.knowledge || 0)) {
    return false;
  }

  // Pay costs
  faction.resources.materials -= (building.cost.materials || 0);
  faction.resources.knowledge -= (building.cost.knowledge || 0);

  // Add building
  settlement.buildings.push(buildingKey);

  // Apply immediate benefits
  if (building.benefit.populationCap) {
    settlement.maxPopulation += building.benefit.populationCap;
  }
  if (building.benefit.defense) {
    settlement.defensiveStrength += building.benefit.defense;
  }

  settlement.events.push({
    turn: settlement.foundedTurn,
    type: 'construction',
    message: `${building.name} constructed!`
  });

  return true;
};

// Reassign population
export const reassignPopulation = (settlement, newAssignments) => {
  const total = Object.values(newAssignments).reduce((sum, val) => sum + val, 0);

  if (total > settlement.population) {
    return false; // Can't assign more than population
  }

  settlement.assignments = newAssignments;
  return true;
};

// ==== WATER MANAGEMENT SYSTEM ====

// Check if hex has natural water access
export const hasNaturalWaterAccess = (hexes, hex) => {
  const hexKey = `${hex.q},${hex.r}`;
  const currentHex = hexes.get(hexKey);

  if (!currentHex) return false;

  // Direct water access terrains
  const waterTerrains = ['river', 'lake', 'riverbank', 'waterhole', 'marsh'];
  if (waterTerrains.includes(currentHex.terrain)) {
    return true;
  }

  // Check adjacent hexes for water
  const { getHexNeighbors } = require('../utils/hexMath.js');
  const neighbors = getHexNeighbors(hex);

  for (const neighbor of neighbors) {
    const neighborKey = `${neighbor.q},${neighbor.r}`;
    const neighborHex = hexes.get(neighborKey);

    if (neighborHex && waterTerrains.includes(neighborHex.terrain)) {
      return true; // Adjacent to water
    }
  }

  return false;
};

// Calculate water production for settlement
export const calculateWaterProduction = (settlement, hexes, terrain) => {
  let waterProduction = 0;

  // Natural water from terrain
  if (hasNaturalWaterAccess(hexes, settlement.hex)) {
    waterProduction += 20; // Base natural water
  }

  // Check for wells and water buildings
  settlement.buildings.forEach(buildingKey => {
    const building = SETTLEMENT_BUILDINGS[buildingKey];
    if (building.benefit.waterProduction) {
      waterProduction += building.benefit.waterProduction;
    }
  });

  // Fishing posts also provide water
  if (settlement.buildings.includes('FISHING_POST')) {
    waterProduction += 5;
  }

  return waterProduction;
};

// Calculate water consumption
export const calculateWaterConsumption = (settlement) => {
  const baseConsumption = settlement.population * 2; // 2 water per person per turn
  return baseConsumption;
};

// Check if settlement has enough water
export const hasAdequateWater = (settlement, hexes) => {
  const production = calculateWaterProduction(settlement, hexes);
  const consumption = calculateWaterConsumption(settlement);

  return production >= consumption;
};

// Process water shortage effects
export const processWaterShortage = (settlement, hexes) => {
  if (!hasAdequateWater(settlement, hexes)) {
    // Reduce morale
    settlement.morale = Math.max(0.3, settlement.morale - 0.15);

    // Chance of population loss
    if (Math.random() < 0.3) {
      settlement.population = Math.max(1, settlement.population - 1);
      settlement.events.push({
        turn: settlement.foundedTurn,
        type: 'drought',
        message: 'Water shortage! 1 person died of thirst.'
      });
    }

    settlement.events.push({
      turn: settlement.foundedTurn,
      type: 'drought',
      message: 'Settlement suffering from water shortage!'
    });

    return true; // Has water shortage
  }

  return false; // Water adequate
};

// Check if settlement can be founded here (includes water check)
export const canFoundSettlement = (hexes, hex, settlements) => {
  const hexKey = `${hex.q},${hex.r}`;
  const targetHex = hexes.get(hexKey);

  if (!targetHex) return { can: false, reason: 'Unknown location' };

  // Check if hex is passable
  const { TERRAIN_TYPES } = require('../data/terrain.js');
  const terrain = TERRAIN_TYPES[targetHex.terrain];
  if (!terrain.passable) {
    return { can: false, reason: 'Impassable terrain' };
  }

  // Check if another settlement already here
  const existingSettlement = settlements.find(s =>
    s.hex.q === hex.q && s.hex.r === hex.r
  );
  if (existingSettlement) {
    return { can: false, reason: 'Settlement already exists here' };
  }

  // Check for water access (warning, not blocking)
  if (!hasNaturalWaterAccess(hexes, hex)) {
    return {
      can: true,
      reason: 'No natural water nearby',
      warning: 'Settlement will need a Well to survive! Cost: 30 materials, 15 knowledge'
    };
  }

  return { can: true, reason: 'Suitable location' };
};
