// Faction and Diplomacy System for Prehistoric Tribes

export const FACTION_RELATIONS = {
  ALLIED: 'allied',
  FRIENDLY: 'friendly',
  NEUTRAL: 'neutral',
  UNFRIENDLY: 'unfriendly',
  HOSTILE: 'hostile',
  WAR: 'war'
};

export const DIPLOMACY_ACTIONS = {
  GREETING: 'greeting',
  TRADE: 'trade',
  ALLIANCE: 'alliance',
  NON_AGGRESSION: 'non_aggression',
  SHARE_KNOWLEDGE: 'share_knowledge',
  REQUEST_AID: 'request_aid',
  DECLARE_WAR: 'declare_war',
  PEACE_TREATY: 'peace_treaty',
  THREATEN: 'threaten',
  GIFT: 'gift'
};

export const FACTION_PERSONALITIES = {
  PEACEFUL: {
    name: 'Peaceful',
    description: 'Prefers trade and cooperation',
    tradeBonus: 1.2,
    warlikeness: 0.2,
    trustLevel: 0.8
  },
  AGGRESSIVE: {
    name: 'Aggressive',
    description: 'Quick to anger, prefers conquest',
    tradeBonus: 0.8,
    warlikeness: 0.9,
    trustLevel: 0.3
  },
  CAUTIOUS: {
    name: 'Cautious',
    description: 'Slow to trust, defensive',
    tradeBonus: 1.0,
    warlikeness: 0.4,
    trustLevel: 0.5
  },
  EXPANSIONIST: {
    name: 'Expansionist',
    description: 'Seeks to grow territory',
    tradeBonus: 0.9,
    warlikeness: 0.6,
    trustLevel: 0.5
  },
  ISOLATIONIST: {
    name: 'Isolationist',
    description: 'Prefers to be left alone',
    tradeBonus: 0.7,
    warlikeness: 0.5,
    trustLevel: 0.4
  },
  TRADERS: {
    name: 'Traders',
    description: 'Values commerce above all',
    tradeBonus: 1.5,
    warlikeness: 0.3,
    trustLevel: 0.7
  }
};

// Create a new faction
export const createFaction = ({
  id,
  name,
  speciesId,
  color,
  personality = 'CAUTIOUS',
  customization = {},
  isPlayer = false,
  startingHex = null
}) => {
  return {
    id,
    name,
    speciesId,
    color,
    personality,
    customization,
    isPlayer,

    // Resources
    resources: {
      food: 30,
      materials: 20,
      knowledge: 10,
      population: 10
    },

    // Settlements
    settlements: [],
    capital: null,

    // Technology
    technologies: ['stone_tools'], // Starting tech

    // Diplomacy
    relations: new Map(), // factionId -> relation value (-100 to 100)
    knownFactions: new Set(), // Set of faction IDs this faction knows about
    firstContact: new Map(), // factionId -> boolean (has met before)

    // Territory
    controlledHexes: startingHex ? [startingHex] : [],
    exploredHexes: new Set(),

    // Stats
    turnsFounded: 0,
    militaryStrength: 5,
    culturalInfluence: 5,

    // AI (for non-player factions)
    aiGoals: isPlayer ? null : generateAIGoals(personality),

    // History
    history: [],

    // Active status
    isAlive: true,
    eliminatedTurn: null
  };
};

// Generate AI goals based on personality
const generateAIGoals = (personality) => {
  const personalityData = FACTION_PERSONALITIES[personality];

  return {
    expansion: personality === 'EXPANSIONIST' ? 0.9 : 0.5,
    military: personalityData.warlikeness,
    trade: personalityData.tradeBonus > 1 ? 0.8 : 0.4,
    research: 0.6,
    diplomacy: personalityData.trustLevel
  };
};

// Calculate diplomatic relation value
export const calculateRelation = (faction1, faction2) => {
  if (!faction1.relations.has(faction2.id)) {
    return 0; // Neutral if never met
  }
  return faction1.relations.get(faction2.id);
};

// Get relation status from value
export const getRelationStatus = (relationValue) => {
  if (relationValue >= 80) return FACTION_RELATIONS.ALLIED;
  if (relationValue >= 40) return FACTION_RELATIONS.FRIENDLY;
  if (relationValue >= -20) return FACTION_RELATIONS.NEUTRAL;
  if (relationValue >= -60) return FACTION_RELATIONS.UNFRIENDLY;
  if (relationValue >= -90) return FACTION_RELATIONS.HOSTILE;
  return FACTION_RELATIONS.WAR;
};

// Modify faction relations
export const modifyRelation = (faction, targetFactionId, change, reason = '') => {
  const currentValue = faction.relations.get(targetFactionId) || 0;
  const newValue = Math.max(-100, Math.min(100, currentValue + change));

  faction.relations.set(targetFactionId, newValue);

  // Log to history
  faction.history.push({
    turn: faction.turnsFounded,
    type: 'diplomacy',
    targetFaction: targetFactionId,
    change,
    reason,
    newRelation: newValue
  });

  return newValue;
};

// Check if diplomacy action is available
export const canPerformAction = (faction1, faction2, action) => {
  const relationValue = calculateRelation(faction1, faction2);
  const relationStatus = getRelationStatus(relationValue);

  switch (action) {
    case DIPLOMACY_ACTIONS.GREETING:
      return !faction1.firstContact.has(faction2.id);

    case DIPLOMACY_ACTIONS.TRADE:
      return relationStatus !== FACTION_RELATIONS.WAR &&
             relationStatus !== FACTION_RELATIONS.HOSTILE;

    case DIPLOMACY_ACTIONS.ALLIANCE:
      return relationStatus === FACTION_RELATIONS.FRIENDLY ||
             relationStatus === FACTION_RELATIONS.ALLIED;

    case DIPLOMACY_ACTIONS.DECLARE_WAR:
      return relationStatus !== FACTION_RELATIONS.WAR &&
             relationStatus !== FACTION_RELATIONS.ALLIED;

    case DIPLOMACY_ACTIONS.PEACE_TREATY:
      return relationStatus === FACTION_RELATIONS.WAR;

    case DIPLOMACY_ACTIONS.SHARE_KNOWLEDGE:
      return relationStatus === FACTION_RELATIONS.FRIENDLY ||
             relationStatus === FACTION_RELATIONS.ALLIED;

    default:
      return true;
  }
};

// Perform first contact between factions
export const performFirstContact = (faction1, faction2) => {
  // Mark as having made contact
  faction1.firstContact.set(faction2.id, true);
  faction2.firstContact.set(faction1.id, true);

  // Add to known factions
  faction1.knownFactions.add(faction2.id);
  faction2.knownFactions.add(faction1.id);

  // Initial relation based on species and personality
  const initialRelation = calculateInitialRelation(faction1, faction2);

  faction1.relations.set(faction2.id, initialRelation);
  faction2.relations.set(faction1.id, initialRelation);

  return initialRelation;
};

// Calculate initial relation on first meeting
const calculateInitialRelation = (faction1, faction2) => {
  let relation = 0;

  // Same species bonus
  if (faction1.speciesId === faction2.speciesId) {
    relation += 20;
  } else {
    relation -= 10; // Different species = slight suspicion
  }

  // Personality modifiers
  const personality1 = FACTION_PERSONALITIES[faction1.personality];
  const personality2 = FACTION_PERSONALITIES[faction2.personality];

  relation += (personality1.trustLevel * 30);
  relation += (personality2.trustLevel * 30);

  // Peaceful personalities like each other
  if (faction1.personality === 'PEACEFUL' && faction2.personality === 'PEACEFUL') {
    relation += 20;
  }

  // Aggressive personalities distrust each other
  if (faction1.personality === 'AGGRESSIVE' && faction2.personality === 'AGGRESSIVE') {
    relation -= 20;
  }

  // Traders like everyone (potential customers)
  if (faction1.personality === 'TRADERS' || faction2.personality === 'TRADERS') {
    relation += 10;
  }

  return Math.max(-50, Math.min(50, relation)); // Initial relations range from -50 to 50
};

// Generate trade offer
export const generateTradeOffer = (offeringFaction, requestingFaction, offerResources, requestResources) => {
  return {
    id: `trade_${Date.now()}`,
    from: offeringFaction.id,
    to: requestingFaction.id,
    offering: offerResources, // { food: 10, materials: 5 }
    requesting: requestResources,
    relationImpact: 10, // Successful trades improve relations
    status: 'pending', // pending, accepted, rejected, expired
    createdTurn: offeringFaction.turnsFounded,
    expiresIn: 5 // turns
  };
};

// AI decision making for diplomacy
export const makeAIDiplomacyDecision = (aiFaction, targetFaction, action) => {
  const personality = FACTION_PERSONALITIES[aiFaction.personality];
  const relationValue = calculateRelation(aiFaction, targetFaction);
  const relationStatus = getRelationStatus(relationValue);

  switch (action) {
    case DIPLOMACY_ACTIONS.TRADE:
      // More likely if trader personality, good relations
      return Math.random() < (personality.tradeBonus * 0.4 + (relationValue / 200));

    case DIPLOMACY_ACTIONS.ALLIANCE:
      // Only if friendly and personality allows
      return relationStatus === FACTION_RELATIONS.FRIENDLY &&
             Math.random() < personality.trustLevel;

    case DIPLOMACY_ACTIONS.DECLARE_WAR:
      // Aggressive personalities more likely, but consider strength
      const strengthRatio = aiFaction.militaryStrength / targetFaction.militaryStrength;
      return strengthRatio > 1.3 && Math.random() < personality.warlikeness;

    case DIPLOMACY_ACTIONS.PEACE_TREATY:
      // Accept if losing or low warlikeness
      return strengthRatio < 0.8 || Math.random() < (1 - personality.warlikeness);

    default:
      return Math.random() < 0.5;
  }
};

// Predefined faction templates for variety
export const FACTION_TEMPLATES = {
  SAPIENS_TRADERS: {
    name: 'River Traders',
    speciesId: 'homo_sapiens',
    personality: 'TRADERS',
    color: '#004E89'
  },
  NEANDERTHAL_WARRIORS: {
    name: 'Mountain Clans',
    speciesId: 'neanderthal',
    personality: 'AGGRESSIVE',
    color: '#8B7355'
  },
  DENISOVAN_MYSTICS: {
    name: 'Sky Watchers',
    speciesId: 'denisovan',
    personality: 'PEACEFUL',
    color: '#4A5568'
  },
  FLORESIENSIS_FOREST: {
    name: 'Forest Folk',
    speciesId: 'homo_floresiensis',
    personality: 'ISOLATIONIST',
    color: '#27AE60'
  },
  ERECTUS_WANDERERS: {
    name: 'Fire Keepers',
    speciesId: 'homo_erectus',
    personality: 'EXPANSIONIST',
    color: '#E67E22'
  }
};
