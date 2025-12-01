// Predator Attack and Trade Systems

import { getSettlementPredators, canAttackSettlement } from './prehistoricAnimals.js';
import { getSpeciesById } from './humanSpecies.js';

// ==== PREDATOR ATTACK SYSTEM ====

export const ATTACK_OUTCOMES = {
  DEFENDED: 'defended',
  MINOR_DAMAGE: 'minor_damage',
  MAJOR_DAMAGE: 'major_damage',
  DEVASTATING: 'devastating'
};

// Process predator attack on settlement
export const processPredatorAttack = (settlement, predatorType, isNight, faction) => {
  const defense = settlement.defensiveStrength;
  const population = settlement.population;
  const species = getSpeciesById(faction.speciesId);

  // Calculate attack strength
  let attackStrength = predatorType.danger;

  if (isNight) {
    attackStrength *= 1.5; // Predators stronger at night
  }

  if (predatorType.packSize) {
    const packCount = Math.floor(Math.random() * (predatorType.packSize[1] - predatorType.packSize[0])) + predatorType.packSize[0];
    attackStrength *= Math.sqrt(packCount); // Pack bonus
  }

  // Calculate defense strength
  let defenseStrength = defense + (settlement.garrison * 2);

  // Species bonuses
  if (species.traits.powerfulBuild || species.traits.dwarvenStrength) {
    defenseStrength *= 1.3; // Dwarves/strong species better at defense
  }

  // Determine outcome
  const ratio = defenseStrength / attackStrength;

  let outcome;
  let populationLoss = 0;
  let foodLoss = 0;
  let moraleLoss = 0;

  if (ratio >= 2.0) {
    // Strong defense
    outcome = ATTACK_OUTCOMES.DEFENDED;
    populationLoss = 0;
    foodLoss = Math.floor(Math.random() * 5);
    moraleLoss = 0.05;
  } else if (ratio >= 1.2) {
    // Minor damage
    outcome = ATTACK_OUTCOMES.MINOR_DAMAGE;
    populationLoss = Math.floor(Math.random() * 2) + 1;
    foodLoss = Math.floor(Math.random() * 15) + 5;
    moraleLoss = 0.1;
  } else if (ratio >= 0.7) {
    // Major damage
    outcome = ATTACK_OUTCOMES.MAJOR_DAMAGE;
    populationLoss = Math.floor(Math.random() * 4) + 2;
    foodLoss = Math.floor(Math.random() * 25) + 10;
    moraleLoss = 0.2;
  } else {
    // Devastating
    outcome = ATTACK_OUTCOMES.DEVASTATING;
    populationLoss = Math.floor(Math.random() * 6) + 4;
    foodLoss = Math.floor(Math.random() * 40) + 20;
    moraleLoss = 0.3;
  }

  // Apply effects
  settlement.population = Math.max(1, settlement.population - populationLoss);
  settlement.storedFood = Math.max(0, settlement.storedFood - foodLoss);
  settlement.morale = Math.max(0.3, settlement.morale - moraleLoss);

  // Create event
  const event = {
    turn: settlement.foundedTurn,
    type: 'predator_attack',
    predator: predatorType.name,
    outcome,
    populationLoss,
    foodLoss,
    message: generateAttackMessage(predatorType, outcome, populationLoss, foodLoss)
  };

  settlement.events.push(event);

  return event;
};

// Generate attack message
const generateAttackMessage = (predator, outcome, popLoss, foodLoss) => {
  const messages = {
    [ATTACK_OUTCOMES.DEFENDED]: [
      `${predator.name} attacked but was driven off! Minor losses: ${foodLoss} food.`,
      `Your defenders repelled ${predator.name}! ${foodLoss} food lost in chaos.`,
      `The ${predator.name} retreated after brief skirmish! ${foodLoss} food scattered.`
    ],
    [ATTACK_OUTCOMES.MINOR_DAMAGE]: [
      `${predator.name} raid! ${popLoss} killed, ${foodLoss} food stolen.`,
      `${predator.name} struck at dawn! ${popLoss} lives lost, ${foodLoss} food gone.`,
      `Attack by ${predator.name}! ${popLoss} dead, ${foodLoss} food taken.`
    ],
    [ATTACK_OUTCOMES.MAJOR_DAMAGE]: [
      `Devastating ${predator.name} attack! ${popLoss} dead, ${foodLoss} food lost.`,
      `${predator.name} ravaged the settlement! ${popLoss} killed, ${foodLoss} food destroyed.`,
      `Terrible assault by ${predator.name}! ${popLoss} slain, ${foodLoss} food ruined.`
    ],
    [ATTACK_OUTCOMES.DEVASTATING]: [
      `CATASTROPHIC ${predator.name} attack! ${popLoss} dead, ${foodLoss} food lost!`,
      `The ${predator.name} nearly destroyed us! ${popLoss} killed, ${foodLoss} food gone!`,
      `Massacre by ${predator.name}! ${popLoss} lives lost, ${foodLoss} food destroyed!`
    ]
  };

  const outcomeMessages = messages[outcome];
  return outcomeMessages[Math.floor(Math.random() * outcomeMessages.length)];
};

// Check if settlement should be attacked this turn
export const shouldSettlementBeAttacked = (settlement, isNight, hexes) => {
  // Base chance: 5% per turn
  let attackChance = 0.05;

  // Night increases chance
  if (isNight) {
    attackChance *= 2; // 10% at night
  }

  // Weak defenses increase chance
  if (settlement.defensiveStrength < 3) {
    attackChance *= 1.5;
  }

  // Low population attracts predators
  if (settlement.population < 10) {
    attackChance *= 1.3;
  }

  // No palisade = more vulnerable
  if (!settlement.buildings.includes('PALISADE')) {
    attackChance *= 1.2;
  }

  return Math.random() < attackChance;
};

// Get random predator for attack
export const getRandomPredator = () => {
  const predators = getSettlementPredators();
  return predators[Math.floor(Math.random() * predators.length)];
};

// ==== TRADE SYSTEM ====

export const TRADE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Create trade offer
export const createTradeOffer = ({
  fromFactionId,
  toFactionId,
  offering,
  requesting,
  turn,
  expiresIn = 5
}) => {
  return {
    id: `trade_${Date.now()}_${Math.random()}`,
    fromFactionId,
    toFactionId,
    offering, // { food: 20, materials: 10, water: 5 }
    requesting, // { food: 0, materials: 15, water: 0, knowledge: 5 }
    status: TRADE_STATUS.PENDING,
    createdTurn: turn,
    expiresIn,
    expiresAtTurn: turn + expiresIn
  };
};

// Calculate trade value (for AI decision making)
export const calculateTradeValue = (resources) => {
  const values = {
    food: 1,
    materials: 1.2,
    water: 0.8,
    knowledge: 2
  };

  let totalValue = 0;
  Object.entries(resources).forEach(([resource, amount]) => {
    totalValue += (values[resource] || 1) * amount;
  });

  return totalValue;
};

// Check if faction can afford trade
export const canAffordTrade = (faction, resources) => {
  return (
    faction.resources.food >= (resources.food || 0) &&
    faction.resources.materials >= (resources.materials || 0) &&
    faction.resources.water >= (resources.water || 0) &&
    faction.resources.knowledge >= (resources.knowledge || 0)
  );
};

// Execute trade
export const executeTrade = (offer, fromFaction, toFaction) => {
  if (offer.status !== TRADE_STATUS.PENDING) {
    return { success: false, reason: 'Trade already processed' };
  }

  // Check if both can afford
  if (!canAffordTrade(fromFaction, offer.offering)) {
    return { success: false, reason: 'Offering faction cannot afford trade' };
  }

  if (!canAffordTrade(toFaction, offer.requesting)) {
    return { success: false, reason: 'Requesting faction cannot afford trade' };
  }

  // Execute exchange
  // From faction gives offering, gets requesting
  fromFaction.resources.food -= (offer.offering.food || 0);
  fromFaction.resources.materials -= (offer.offering.materials || 0);
  fromFaction.resources.water -= (offer.offering.water || 0);
  fromFaction.resources.knowledge -= (offer.offering.knowledge || 0);

  fromFaction.resources.food += (offer.requesting.food || 0);
  fromFaction.resources.materials += (offer.requesting.materials || 0);
  fromFaction.resources.water += (offer.requesting.water || 0);
  fromFaction.resources.knowledge += (offer.requesting.knowledge || 0);

  // To faction gives requesting, gets offering
  toFaction.resources.food -= (offer.requesting.food || 0);
  toFaction.resources.materials -= (offer.requesting.materials || 0);
  toFaction.resources.water -= (offer.requesting.water || 0);
  toFaction.resources.knowledge -= (offer.requesting.knowledge || 0);

  toFaction.resources.food += (offer.offering.food || 0);
  toFaction.resources.materials += (offer.offering.materials || 0);
  toFaction.resources.water += (offer.offering.water || 0);
  toFaction.resources.knowledge += (offer.offering.knowledge || 0);

  offer.status = TRADE_STATUS.ACCEPTED;

  // Improve relations
  const { modifyRelation } = require('./factions.js');
  modifyRelation(fromFaction, toFaction.id, 5, 'Successful trade');
  modifyRelation(toFaction, fromFaction.id, 5, 'Successful trade');

  return { success: true, offer };
};

// AI evaluates trade offer
export const evaluateTradeOffer = (offer, evaluatingFaction, offeringFaction) => {
  // Calculate value ratio
  const offeredValue = calculateTradeValue(offer.offering);
  const requestedValue = calculateTradeValue(offer.requesting);

  // Check if faction can afford
  if (!canAffordTrade(evaluatingFaction, offer.requesting)) {
    return { accept: false, reason: 'Cannot afford' };
  }

  // Check if fair trade
  const ratio = offeredValue / requestedValue;

  // Relations affect acceptance
  const { calculateRelation } = require('./factions.js');
  const relationValue = calculateRelation(evaluatingFaction, offeringFaction);

  let acceptanceThreshold = 0.8; // Need at least 80% value

  // Good relations = more lenient
  if (relationValue > 50) {
    acceptanceThreshold = 0.6;
  } else if (relationValue < -20) {
    acceptanceThreshold = 1.2; // Demand better deal from enemies
  }

  // Check resource needs
  const needsResource = (resource) => {
    return evaluatingFaction.resources[resource] < 20;
  };

  // Desperate for resources = more likely to accept
  if (Object.keys(offer.offering).some(needsResource)) {
    acceptanceThreshold *= 0.8;
  }

  if (ratio >= acceptanceThreshold) {
    return { accept: true, reason: 'Fair trade' };
  }

  return { accept: false, reason: 'Unfair trade' };
};

// Generate AI trade offer
export const generateAITradeOffer = (fromFaction, toFaction, turn) => {
  // Determine what AI needs
  const needs = [];
  if (fromFaction.resources.food < 30) needs.push('food');
  if (fromFaction.resources.materials < 20) needs.push('materials');
  if (fromFaction.resources.water < 20) needs.push('water');
  if (fromFaction.resources.knowledge < 10) needs.push('knowledge');

  if (needs.length === 0) return null; // Don't trade if don't need anything

  // Pick random need
  const need = needs[Math.floor(Math.random() * needs.length)];

  // Determine what AI can offer
  const canOffer = [];
  if (fromFaction.resources.food > 40) canOffer.push('food');
  if (fromFaction.resources.materials > 30) canOffer.push('materials');
  if (fromFaction.resources.water > 30) canOffer.push('water');

  if (canOffer.length === 0) return null; // Nothing to offer

  const offering = canOffer[Math.floor(Math.random() * canOffer.length)];

  // Create offer
  const offerResources = { [offering]: Math.floor(Math.random() * 20) + 10 };
  const requestResources = { [need]: Math.floor(Math.random() * 15) + 10 };

  return createTradeOffer({
    fromFactionId: fromFaction.id,
    toFactionId: toFaction.id,
    offering: offerResources,
    requesting: requestResources,
    turn
  });
};

// Check if trades have expired
export const processExpiredTrades = (trades, currentTurn) => {
  return trades.map(trade => {
    if (trade.status === TRADE_STATUS.PENDING && currentTurn >= trade.expiresAtTurn) {
      trade.status = TRADE_STATUS.EXPIRED;
    }
    return trade;
  });
};
