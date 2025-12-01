// ==================== PREHISTORIC TRIBES CIVILIZATION GAME STATE ====================
import { hexDistance, getHexNeighbors } from '../utils/hexMath.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { PREHISTORIC_ANIMALS, getAnimalsByHabitat } from '../data/prehistoricAnimals.js';
import { HUMAN_SPECIES, getSpeciesById } from '../data/humanSpecies.js';
import {
  createFaction,
  performFirstContact,
  modifyRelation,
  getRelationStatus,
  FACTION_TEMPLATES,
  canPerformAction,
  DIPLOMACY_ACTIONS
} from '../data/factions.js';
import {
  createSettlement,
  calculateSettlementProduction,
  calculateFoodConsumption,
  calculateWaterProduction,
  calculateWaterConsumption,
  processWaterShortage,
  processPopulationGrowth,
  canUpgrade,
  upgradeSettlement,
  buildBuilding,
  canBuildBuilding,
  canFoundSettlement
} from '../data/settlements.js';
import {
  processPredatorAttack,
  shouldSettlementBeAttacked,
  getRandomPredator,
  createTradeOffer,
  executeTrade,
  evaluateTradeOffer,
  generateAITradeOffer,
  processExpiredTrades,
  TRADE_STATUS
} from '../data/gameEvents.js';
import { calculateVisibility } from '../utils/visibilitySystem.js';
import { generateTerrainFeatures, generateTerrain, applyEcologicalPostProcessing } from '../utils/terrainGeneration.js';
import {
  TECH_TREE,
  getTechById,
  getAvailableTechs,
  getTechCost,
  canResearchTech
} from '../data/techTree.js';
import {
  UNIT_TYPES,
  getUnitById,
  getAvailableUnits,
  canAffordUnit,
  calculateUnitUpkeep
} from '../data/militaryUnits.js';
import {
  QUEST_TEMPLATES,
  generateQuest,
  updateQuestProgress,
  checkQuestCompletion,
  completeQuest,
  failQuest,
  getAvailableQuestTemplates,
  QUEST_STATUS
} from '../data/questSystem.js';
import {
  CHAPTERS,
  initializeChapters,
  getCurrentChapter,
  updateChapterObjective,
  checkChapterCompletion,
  completeChapter,
  trackChapterEvent
} from '../data/chapterSystem.js';
import {
  CHARACTERS,
  getCharacterById,
  getStartingLeadersForSpecies,
  generateCharacterEncounter,
  createCharacterInstance,
  canRecruitCharacter
} from '../data/characters.js';

// Game constants
const MAX_NOTIFICATIONS = 5;
const NOTIFICATION_AUTO_DISMISS_TIME = 10000; // 10 seconds
const MAX_ANIMALS_PER_HEX = 3;
const STARTING_ACTION_POINTS = 3; // Actions per turn

// Generate initial factions for the game
const generateStartingFactions = (playerFactionId) => {
  const factions = [];

  // Player faction (will be customized during setup)
  const playerFaction = createFaction({
    id: playerFactionId,
    name: 'Player Tribe',
    speciesId: 'homo_sapiens',
    color: '#004E89',
    personality: 'PEACEFUL',
    isPlayer: true,
    startingHex: { q: 0, r: 0 }
  });

  factions.push(playerFaction);

  // Generate 3-5 AI factions at random locations
  const templates = Object.values(FACTION_TEMPLATES);
  const numAIFactions = 3 + Math.floor(Math.random() * 3); // 3-5 factions

  for (let i = 0; i < numAIFactions; i++) {
    const template = templates[i % templates.length];
    const angle = (i / numAIFactions) * Math.PI * 2;
    const distance = 15 + Math.floor(Math.random() * 10); // 15-25 hexes away

    const q = Math.round(Math.cos(angle) * distance);
    const r = Math.round(Math.sin(angle) * distance);

    const aiFaction = createFaction({
      id: `ai_faction_${i}`,
      name: template.name,
      speciesId: template.speciesId,
      color: template.color,
      personality: template.personality,
      isPlayer: false,
      startingHex: { q, r }
    });

    factions.push(aiFaction);
  }

  return factions;
};

// Initial game state for prehistoric civilization
export const initialTribGameState = {
  // Turn and phase management
  turn: 1,
  phase: 'player_action', // 'player_action', 'ai_action', 'production', 'events'
  actionPoints: STARTING_ACTION_POINTS,
  maxActionPoints: STARTING_ACTION_POINTS,

  // Player state
  playerFactionId: 'player_faction',
  selectedUnit: null, // Current tribe leader/scout position
  playerPosition: { q: 0, r: 0 }, // Player's current exploration position
  playerLeader: null, // Selected character leader

  // Map
  hexes: new Map(),
  linearFeatures: [],
  mapGenerated: false,

  // Factions
  factions: generateStartingFactions('player_faction'),

  // Settlements
  settlements: [],

  // Animals (wildlife for hunting)
  animals: new Map(), // hexKey -> [animals]

  // Military Units
  units: [], // All military units on the map

  // Characters (leaders, heroes, NPCs)
  characters: [],

  // Quests
  quests: [], // Active and completed quests
  availableQuests: [], // Quests that can be accepted

  // Chapters (story progression)
  activeChapter: null, // Will be initialized when game starts
  completedChapters: [],

  // Technology Research
  researchQueue: null, // Current tech being researched
  researchProgress: 0,

  // Diplomacy
  activeDiplomacy: null, // Current diplomacy screen
  tradeOffers: [],

  // UI state
  selectedHex: null,
  hoveredHex: null,
  selectedSettlement: null,
  selectedFaction: null,
  selectedCharacter: null,

  // Notifications and messages
  notifications: [],
  currentMessage: "Your tribe awakens in a vast, untamed world...",

  // Game state
  gamePhase: 'setup', // 'setup', 'playing', 'victory', 'defeat'
  gameOver: false,
  victoryCondition: null,

  // Tutorial/First time flags
  hasFoundedSettlement: false,
  hasMetAnotherFaction: false,
  hasTraded: false,
  hasRecruitedCharacter: false,
  hasResearchedTech: false,
  hasTrainedUnit: false,

  // Event history
  history: []
};

// Helper function to get player faction
const getPlayerFaction = (state) => {
  return state.factions.find(f => f.id === state.playerFactionId);
};

// Helper function to add notifications
const addNotification = (notifications, newNotification) => {
  const notification = {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    ...newNotification
  };

  const updatedNotifications = [...notifications, notification];

  if (updatedNotifications.length > MAX_NOTIFICATIONS) {
    return updatedNotifications.slice(-MAX_NOTIFICATIONS);
  }

  return updatedNotifications;
};

// Helper function to get faction by ID
const getFactionById = (state, factionId) => {
  return state.factions.find(f => f.id === factionId);
};

// Spawn animals in a hex based on terrain
const spawnAnimalsInHex = (hex, currentAnimals = []) => {
  if (currentAnimals.length >= MAX_ANIMALS_PER_HEX) {
    return currentAnimals;
  }

  const possibleAnimals = getAnimalsByHabitat(hex.terrain);
  const newAnimals = [...currentAnimals];

  for (const animal of possibleAnimals) {
    if (newAnimals.length >= MAX_ANIMALS_PER_HEX) break;

    if (Math.random() < animal.spawnChance) {
      const animalInstance = {
        id: `animal_${Date.now()}_${Math.random()}`,
        species: animal.name,
        emoji: animal.emoji,
        ...animal,
        health: 100,
        isAggressive: animal.aggressive || false
      };

      newAnimals.push(animalInstance);
    }
  }

  return newAnimals;
};

// Process end of turn
const processEndTurn = (state) => {
  let newState = { ...state };
  let notifications = [...state.notifications];
  const isNight = state.turn % 2 === 0; // Even turns are night

  // Process each faction
  const updatedFactions = state.factions.map(faction => {
    const factionCopy = { ...faction };
    factionCopy.turnsFounded += 1;

    // Process settlements
    const factionSettlements = state.settlements.filter(s => s.factionId === faction.id);
    let totalFood = 0;
    let totalMaterials = 0;
    let totalKnowledge = 0;
    let totalWater = 0;

    factionSettlements.forEach(settlement => {
      const hex = state.hexes.get(`${settlement.hex.q},${settlement.hex.r}`);
      const production = calculateSettlementProduction(settlement, hex, faction);

      totalFood += production.food;
      totalMaterials += production.materials;
      totalKnowledge += production.knowledge;

      // Water production and consumption
      const waterProduction = calculateWaterProduction(settlement, state.hexes, hex);
      const waterConsumption = calculateWaterConsumption(settlement);
      totalWater += (waterProduction - waterConsumption);

      // Check for water shortage
      const hasWaterShortage = processWaterShortage(settlement, state.hexes);
      if (hasWaterShortage && faction.isPlayer) {
        notifications = addNotification(notifications, {
          type: 'warning',
          message: `💧 ${settlement.name} suffering from water shortage!`
        });
      }

      // Food consumption
      const foodConsumption = calculateFoodConsumption(settlement);
      totalFood -= foodConsumption;

      // Population growth
      settlement.foundedTurn = state.turn;
      processPopulationGrowth(settlement);

      // PREDATOR ATTACKS
      if (shouldSettlementBeAttacked(settlement, isNight, state.hexes)) {
        const predator = getRandomPredator();
        if (predator) {
          const attackEvent = processPredatorAttack(settlement, predator, isNight, faction);

          if (faction.isPlayer) {
            notifications = addNotification(notifications, {
              type: 'danger',
              message: `🐺 ${attackEvent.message}`
            });
          }
        }
      }
    });

    // Update faction resources
    factionCopy.resources.food += totalFood;
    factionCopy.resources.materials += totalMaterials;
    factionCopy.resources.knowledge += totalKnowledge;
    factionCopy.resources.water = (factionCopy.resources.water || 0) + totalWater;

    // Prevent negative resources
    factionCopy.resources.food = Math.max(0, factionCopy.resources.food);
    factionCopy.resources.materials = Math.max(0, factionCopy.resources.materials);
    factionCopy.resources.water = Math.max(0, factionCopy.resources.water);

    // Add production notification for player
    if (faction.isPlayer) {
      notifications = addNotification(notifications, {
        type: 'success',
        message: `Turn ${state.turn} production: ${totalFood >= 0 ? '+' : ''}${totalFood} 🍖, ${totalMaterials >= 0 ? '+' : ''}${totalMaterials} 🪵, ${totalWater >= 0 ? '+' : ''}${totalWater} 💧`
      });
    }

    return factionCopy;
  });

  // Process trades (AI makes offers occasionally)
  const playerFaction = updatedFactions.find(f => f.isPlayer);
  if (playerFaction && Math.random() < 0.3) { // 30% chance per turn
    // Random AI faction makes trade offer
    const aiFactions = updatedFactions.filter(f => !f.isPlayer && f.knownFactions.has(playerFaction.id));
    if (aiFactions.length > 0) {
      const randomAI = aiFactions[Math.floor(Math.random() * aiFactions.length)];
      const tradeOffer = generateAITradeOffer(randomAI, playerFaction, state.turn);

      if (tradeOffer) {
        newState.tradeOffers = [...(newState.tradeOffers || []), tradeOffer];
        notifications = addNotification(notifications, {
          type: 'info',
          message: `💱 Trade offer from ${randomAI.name}!`
        });
      }
    }
  }

  // Expire old trades
  newState.tradeOffers = processExpiredTrades(newState.tradeOffers || [], state.turn);

  // ========== RESEARCH PROGRESS ==========
  if (newState.researchQueue) {
    newState.researchQueue.turnsRemaining -= 1;

    if (newState.researchQueue.turnsRemaining <= 0) {
      // Research complete!
      const tech = getTechById(newState.researchQueue.techId);
      if (playerFaction && tech) {
        playerFaction.technologies.push(tech.id);

        notifications = addNotification(notifications, {
          type: 'success',
          message: `🔬 ${tech.name} researched! ${tech.description}`
        });

        // Track for chapter
        if (newState.activeChapter) {
          trackChapterEvent(newState, 'technology_researched', {
            totalTechs: playerFaction.technologies.length
          });
        }
      }

      newState.researchQueue = null;
      newState.hasResearchedTech = true;
    }
  }

  // ========== UNIT UPKEEP ==========
  const playerUnits = state.units.filter(u => u.factionId === playerFaction?.id);
  const upkeep = calculateUnitUpkeep(playerUnits);

  if (playerFaction && upkeep.food > 0) {
    playerFaction.resources.food -= upkeep.food;
    if (upkeep.knowledge > 0) {
      playerFaction.resources.knowledge -= upkeep.knowledge;
    }

    // If can't afford upkeep, units start deserting
    if (playerFaction.resources.food < 0) {
      const unitsToDisband = Math.ceil(Math.abs(playerFaction.resources.food) / 10);
      for (let i = 0; i < Math.min(unitsToDisband, playerUnits.length); i++) {
        const unit = playerUnits[i];
        newState.units = newState.units.filter(u => u.id !== unit.id);
      }

      notifications = addNotification(notifications, {
        type: 'danger',
        message: `⚠️ ${unitsToDisband} units disbanded due to lack of food!`
      });

      playerFaction.resources.food = 0;
    }
  }

  // ========== QUEST GENERATION ==========
  if (playerFaction && Math.random() < 0.2) { // 20% chance per turn
    const availableTemplates = getAvailableQuestTemplates(playerFaction, newState);
    if (availableTemplates.length > 0) {
      const randomTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
      const newQuest = generateQuest(randomTemplate, newState, playerFaction);

      newState.availableQuests = [...(newState.availableQuests || []), newQuest];

      notifications = addNotification(notifications, {
        type: 'info',
        message: `📜 New quest available: ${newQuest.name}!`
      });
    }
  }

  // ========== QUEST EXPIRATION AND AUTO-PROGRESS ==========
  newState.quests = (newState.quests || []).map(quest => {
    // Check expiration
    if (quest.expiresAtTurn && state.turn >= quest.expiresAtTurn) {
      quest.status = QUEST_STATUS.EXPIRED;
      notifications = addNotification(notifications, {
        type: 'warning',
        message: `⏰ Quest expired: ${quest.name}`
      });
    }

    // Auto-progress certain quests
    if (quest.type === 'exploration' && quest.objectives.exploredHexes !== undefined) {
      quest.objectives.exploredHexes = playerFaction?.exploredHexes.size || 0;
      if (checkQuestCompletion(quest)) {
        const result = completeQuest(quest, playerFaction);
        notifications = addNotification(notifications, {
          type: 'success',
          message: result.message
        });
      }
    }

    return quest;
  });

  // Remove expired quests
  newState.quests = (newState.quests || []).filter(q => q.status !== QUEST_STATUS.EXPIRED);

  // Expire available quests too
  newState.availableQuests = (newState.availableQuests || []).filter(q => {
    if (q.expiresAtTurn && state.turn >= q.expiresAtTurn) {
      return false;
    }
    return true;
  });

  // ========== CHAPTER PROGRESS ==========
  if (newState.activeChapter) {
    // Update chapter objectives based on game state
    if (playerFaction) {
      updateChapterObjective(newState.activeChapter, 'reach_population_20', playerFaction.resources.population);
      updateChapterObjective(newState.activeChapter, 'gather_100_food', playerFaction.resources.food);
      updateChapterObjective(newState.activeChapter, 'reach_population_100', playerFaction.resources.population);
      updateChapterObjective(newState.activeChapter, 'reach_3_settlements', playerFaction.settlements.length);
    }

    // Check if chapter is complete
    if (checkChapterCompletion(newState.activeChapter)) {
      const result = completeChapter(newState.activeChapter, newState, playerFaction);
      newState.completedChapters = [...newState.completedChapters, newState.activeChapter.id];

      notifications = addNotification(notifications, {
        type: 'success',
        message: `📖 ${result.message}`
      });

      // Show narrative
      notifications = addNotification(notifications, {
        type: 'info',
        message: result.narrative
      });
    }
  }

  newState.factions = updatedFactions;
  newState.notifications = notifications;
  newState.turn += 1;
  newState.actionPoints = newState.maxActionPoints;
  newState.phase = 'player_action';

  return newState;
};

// Main game reducer
export const tribGameReducer = (state, action) => {
  switch (action.type) {
    case 'SETUP_PLAYER_FACTION': {
      const { name, speciesId, color, customization } = action;

      const updatedFactions = state.factions.map(faction => {
        if (faction.id === state.playerFactionId) {
          return {
            ...faction,
            name,
            speciesId,
            color,
            customization
          };
        }
        return faction;
      });

      return {
        ...state,
        factions: updatedFactions,
        gamePhase: 'playing',
        notifications: addNotification(state.notifications, {
          type: 'success',
          message: `Welcome, leader of the ${name}!`
        })
      };
    }

    case 'GENERATE_TERRAIN_FEATURES': {
      const features = generateTerrainFeatures(0, 0, 3);
      return { ...state, linearFeatures: features, mapGenerated: true };
    }

    case 'GENERATE_HEX': {
      const { q, r } = action;
      const key = `${q},${r}`;

      if (state.hexes.has(key)) return state;

      const terrain = generateTerrain(q, r, state.hexes, state.linearFeatures);

      const newHex = {
        q, r, terrain,
        visited: false,
        visible: false,
        discovered: false,
        inRange: false,
        controlledBy: null // Faction ID
      };

      const newHexes = new Map(state.hexes);
      newHexes.set(key, newHex);

      const processedHexes = applyEcologicalPostProcessing(newHexes, state.linearFeatures);

      return { ...state, hexes: processedHexes };
    }

    case 'UPDATE_VISIBILITY': {
      const newHexes = calculateVisibility(state.playerPosition, state.hexes);
      return { ...state, hexes: newHexes };
    }

    case 'MOVE_PLAYER': {
      const { target } = action;

      if (state.actionPoints <= 0) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: 'No action points remaining! End your turn.'
          })
        };
      }

      const distance = hexDistance(state.playerPosition, target);
      if (distance > 1) return state;

      const targetHex = state.hexes.get(`${target.q},${target.r}`);
      if (!targetHex) return state;

      const terrain = TERRAIN_TYPES[targetHex.terrain];
      if (!terrain.passable) return state;

      // Spawn animals if needed
      const hexKey = `${target.q},${target.r}`;
      let newAnimals = new Map(state.animals);
      const currentAnimals = newAnimals.get(hexKey) || [];
      const spawnedAnimals = spawnAnimalsInHex(targetHex, currentAnimals);
      if (spawnedAnimals.length > 0) {
        newAnimals.set(hexKey, spawnedAnimals);
      }

      // Check for other factions
      const playerFaction = getPlayerFaction(state);
      const otherFactionHere = state.settlements.find(s =>
        s.hex.q === target.q && s.hex.r === target.r && s.factionId !== playerFaction.id
      );

      let newState = {
        ...state,
        playerPosition: target,
        actionPoints: state.actionPoints - 1,
        animals: newAnimals
      };

      // First contact with another faction
      if (otherFactionHere && !playerFaction.knownFactions.has(otherFactionHere.factionId)) {
        const otherFaction = getFactionById(state, otherFactionHere.factionId);

        // Perform first contact
        performFirstContact(playerFaction, otherFaction);

        newState.activeDiplomacy = {
          factionId: otherFaction.id,
          isFirstContact: true
        };

        newState.hasMetAnotherFaction = true;

        newState.notifications = addNotification(newState.notifications, {
          type: 'success',
          message: `First contact with the ${otherFaction.name}!`
        });
      }

      return newState;
    }

    case 'FOUND_SETTLEMENT': {
      const { hex, name } = action;

      const playerFaction = getPlayerFaction(state);

      // Check if hex is suitable
      const hexKey = `${hex.q},${hex.r}`;
      const targetHex = state.hexes.get(hexKey);

      if (!targetHex) return state;

      const terrain = TERRAIN_TYPES[targetHex.terrain];
      if (!terrain.passable) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: 'Cannot found settlement on impassable terrain!'
          })
        };
      }

      // Check if another settlement already here
      const existingSettlement = state.settlements.find(s =>
        s.hex.q === hex.q && s.hex.r === hex.r
      );

      if (existingSettlement) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: 'A settlement already exists here!'
          })
        };
      }

      // Check if location is suitable for settlement (including water access)
      const validationResult = canFoundSettlement(state.hexes, hex);
      if (!validationResult.canFound) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: `Cannot found settlement: ${validationResult.reason}`
          })
        };
      }

      // Create settlement
      const settlement = createSettlement({
        id: `settlement_${Date.now()}`,
        name: name || `${playerFaction.name} Camp`,
        factionId: playerFaction.id,
        hex,
        type: 'CAMP',
        foundedTurn: state.turn
      });

      // Set as capital if first settlement
      if (playerFaction.settlements.length === 0) {
        settlement.isCapital = true;
        playerFaction.capital = settlement.id;
      }

      return {
        ...state,
        settlements: [...state.settlements, settlement],
        hasFoundedSettlement: true,
        actionPoints: state.actionPoints - 2, // Costs 2 action points
        notifications: addNotification(state.notifications, {
          type: 'success',
          message: `${name} has been founded!`
        })
      };
    }

    case 'HUNT_ANIMAL': {
      const { animalId, hexKey } = action;

      const animals = state.animals.get(hexKey) || [];
      const targetAnimal = animals.find(a => a.id === animalId);

      if (!targetAnimal) return state;

      const playerFaction = getPlayerFaction(state);
      const species = getSpeciesById(playerFaction.speciesId);

      // Calculate hunting success
      const huntingSkill = species.baseStats.agility + species.baseStats.strength;
      const animalDifficulty = targetAnimal.difficulty;

      const successChance = Math.min(0.95, Math.max(0.2, huntingSkill / (animalDifficulty + 5)));
      const success = Math.random() < successChance;

      let newNotifications = [...state.notifications];
      let updatedFaction = { ...playerFaction };

      if (success) {
        // Successful hunt
        const foodGained = targetAnimal.foodYield;
        updatedFaction.resources.food += foodGained;

        // Remove animal
        const updatedAnimals = animals.filter(a => a.id !== animalId);
        const newAnimals = new Map(state.animals);
        if (updatedAnimals.length > 0) {
          newAnimals.set(hexKey, updatedAnimals);
        } else {
          newAnimals.delete(hexKey);
        }

        newNotifications = addNotification(newNotifications, {
          type: 'success',
          message: `Successfully hunted ${targetAnimal.species}! +${foodGained} food`
        });

        const updatedFactions = state.factions.map(f =>
          f.id === playerFaction.id ? updatedFaction : f
        );

        return {
          ...state,
          factions: updatedFactions,
          animals: newAnimals,
          actionPoints: state.actionPoints - 1,
          notifications: newNotifications
        };
      } else {
        // Failed hunt
        newNotifications = addNotification(newNotifications, {
          type: 'warning',
          message: `The ${targetAnimal.species} escaped!`
        });

        // Remove animal (it fled)
        const updatedAnimals = animals.filter(a => a.id !== animalId);
        const newAnimals = new Map(state.animals);
        if (updatedAnimals.length > 0) {
          newAnimals.set(hexKey, updatedAnimals);
        } else {
          newAnimals.delete(hexKey);
        }

        return {
          ...state,
          animals: newAnimals,
          actionPoints: state.actionPoints - 1,
          notifications: newNotifications
        };
      }
    }

    case 'OPEN_DIPLOMACY': {
      const { factionId } = action;

      return {
        ...state,
        activeDiplomacy: {
          factionId,
          isFirstContact: false
        }
      };
    }

    case 'CLOSE_DIPLOMACY': {
      return {
        ...state,
        activeDiplomacy: null
      };
    }

    case 'DIPLOMACY_ACTION': {
      const { targetFactionId, actionType, data } = action;

      const playerFaction = getPlayerFaction(state);
      const targetFaction = getFactionById(state, targetFactionId);

      if (!targetFaction) return state;

      let newNotifications = [...state.notifications];

      switch (actionType) {
        case DIPLOMACY_ACTIONS.GREETING:
          modifyRelation(playerFaction, targetFactionId, 10, 'Friendly greeting');
          modifyRelation(targetFaction, playerFaction.id, 10, 'Friendly greeting');

          newNotifications = addNotification(newNotifications, {
            type: 'success',
            message: `Relations improved with ${targetFaction.name}`
          });
          break;

        case DIPLOMACY_ACTIONS.TRADE:
          // Implement trade logic
          break;

        case DIPLOMACY_ACTIONS.ALLIANCE:
          modifyRelation(playerFaction, targetFactionId, 50, 'Alliance formed');
          modifyRelation(targetFaction, playerFaction.id, 50, 'Alliance formed');

          newNotifications = addNotification(newNotifications, {
            type: 'success',
            message: `Alliance formed with ${targetFaction.name}!`
          });
          break;

        case DIPLOMACY_ACTIONS.DECLARE_WAR:
          modifyRelation(playerFaction, targetFactionId, -100, 'War declared');
          modifyRelation(targetFaction, playerFaction.id, -100, 'War declared');

          newNotifications = addNotification(newNotifications, {
            type: 'warning',
            message: `War declared on ${targetFaction.name}!`
          });
          break;
      }

      return {
        ...state,
        notifications: newNotifications,
        actionPoints: state.actionPoints - 1
      };
    }

    case 'BUILD_IN_SETTLEMENT': {
      const { settlementId, buildingKey } = action;

      const settlement = state.settlements.find(s => s.id === settlementId);
      if (!settlement) return state;

      const playerFaction = getPlayerFaction(state);
      const hex = state.hexes.get(`${settlement.hex.q},${settlement.hex.r}`);

      if (!canBuildBuilding(settlement, buildingKey, hex)) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: 'Cannot build this structure here!'
          })
        };
      }

      const success = buildBuilding(settlement, buildingKey, playerFaction);

      if (success) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'success',
            message: `Construction complete in ${settlement.name}!`
          })
        };
      }

      return state;
    }

    case 'UPGRADE_SETTLEMENT': {
      const { settlementId } = action;

      const settlement = state.settlements.find(s => s.id === settlementId);
      if (!settlement) return state;

      const playerFaction = getPlayerFaction(state);

      const success = upgradeSettlement(settlement, playerFaction);

      if (success) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'success',
            message: `${settlement.name} has been upgraded!`
          })
        };
      }

      return {
        ...state,
        notifications: addNotification(state.notifications, {
          type: 'warning',
          message: 'Not enough resources to upgrade!'
        })
      };
    }

    case 'END_TURN': {
      return processEndTurn(state);
    }

    case 'SELECT_HEX': {
      return { ...state, selectedHex: action.hex };
    }

    case 'HOVER_HEX': {
      return { ...state, hoveredHex: action.hex };
    }

    case 'CLEAR_HOVER': {
      return { ...state, hoveredHex: null };
    }

    case 'DISMISS_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id)
      };
    }

    case 'AUTO_DISMISS_NOTIFICATIONS': {
      const now = Date.now();
      return {
        ...state,
        notifications: state.notifications.filter(n =>
          (now - n.timestamp) < NOTIFICATION_AUTO_DISMISS_TIME
        )
      };
    }

    case 'RESTART_GAME': {
      return {
        ...initialTribGameState,
        hexes: new Map(),
        factions: generateStartingFactions('player_faction')
      };
    }

    case 'ACCEPT_TRADE': {
      const { offerId } = action;
      const offer = state.tradeOffers.find(o => o.id === offerId);
      if (!offer || offer.status !== TRADE_STATUS.PENDING) {
        return state;
      }

      const fromFaction = getFactionById(state, offer.fromFactionId);
      const toFaction = getFactionById(state, offer.toFactionId);

      if (!fromFaction || !toFaction) {
        return state;
      }

      const result = executeTrade(offer, fromFaction, toFaction);

      if (result.success) {
        return {
          ...state,
          factions: state.factions.map(f =>
            f.id === fromFaction.id ? fromFaction :
            f.id === toFaction.id ? toFaction : f
          ),
          tradeOffers: state.tradeOffers.map(o =>
            o.id === offerId ? result.offer : o
          ),
          notifications: addNotification(state.notifications, {
            type: 'success',
            message: `✅ Trade completed with ${fromFaction.name}!`,
            timestamp: Date.now()
          })
        };
      } else {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'error',
            message: `❌ Trade failed: ${result.reason}`,
            timestamp: Date.now()
          })
        };
      }
    }

    case 'REJECT_TRADE': {
      const { offerId } = action;
      const offer = state.tradeOffers.find(o => o.id === offerId);

      if (!offer) {
        return state;
      }

      const fromFaction = getFactionById(state, offer.fromFactionId);
      const updatedOffers = state.tradeOffers.map(o =>
        o.id === offerId ? { ...o, status: TRADE_STATUS.REJECTED } : o
      );

      // Slightly negative relation impact for rejection
      if (fromFaction) {
        const { modifyRelation } = require('../data/factions.js');
        modifyRelation(fromFaction, offer.toFactionId, -2, 'Trade rejected');
      }

      return {
        ...state,
        tradeOffers: updatedOffers,
        notifications: addNotification(state.notifications, {
          type: 'info',
          message: `Trade offer rejected.`,
          timestamp: Date.now()
        })
      };
    }

    // ========== LEADER/CHARACTER ACTIONS ==========

    case 'SELECT_LEADER': {
      const { characterId } = action;
      const character = CHARACTERS[characterId.toUpperCase()];

      if (!character) return state;

      const characterInstance = createCharacterInstance(character, state.turn);
      characterInstance.currentRole = 'leader';

      const playerFaction = getPlayerFaction(state);

      return {
        ...state,
        playerLeader: characterInstance,
        characters: [characterInstance],
        gamePhase: 'playing',
        activeChapter: initializeChapters(),
        notifications: addNotification(state.notifications, {
          type: 'success',
          message: `${character.name} leads your tribe!`,
          timestamp: Date.now()
        })
      };
    }

    case 'RECRUIT_CHARACTER': {
      const { characterId, location } = action;
      const character = CHARACTERS[characterId.toUpperCase()];
      const playerFaction = getPlayerFaction(state);

      if (!character || !canRecruitCharacter(character, playerFaction)) {
        return state;
      }

      const characterInstance = createCharacterInstance(character, state.turn);
      characterInstance.location = location;

      // Deduct recruitment cost
      const cost = character.recruitCost;
      if (cost.food) playerFaction.resources.food -= cost.food;
      if (cost.materials) playerFaction.resources.materials -= cost.materials;
      if (cost.knowledge) playerFaction.resources.knowledge -= cost.knowledge;
      if (cost.culturalInfluence) playerFaction.culturalInfluence -= cost.culturalInfluence;

      return {
        ...state,
        characters: [...state.characters, characterInstance],
        hasRecruitedCharacter: true,
        notifications: addNotification(state.notifications, {
          type: 'success',
          message: `🎖️ ${character.name} has joined your tribe!`,
          timestamp: Date.now()
        })
      };
    }

    // ========== TECH RESEARCH ACTIONS ==========

    case 'START_RESEARCH': {
      const { techId } = action;
      const tech = getTechById(techId);
      const playerFaction = getPlayerFaction(state);

      if (!tech || !canResearchTech(playerFaction, tech)) {
        return state;
      }

      const cost = getTechCost(tech, playerFaction.speciesId);

      // Deduct knowledge cost
      playerFaction.resources.knowledge -= cost.knowledge;

      return {
        ...state,
        researchQueue: {
          techId: tech.id,
          turnsRemaining: cost.time,
          totalTurns: cost.time
        },
        actionPoints: state.actionPoints - 1,
        notifications: addNotification(state.notifications, {
          type: 'info',
          message: `🔬 Researching ${tech.name}... (${cost.time} turns)`,
          timestamp: Date.now()
        })
      };
    }

    case 'CANCEL_RESEARCH': {
      return {
        ...state,
        researchQueue: null,
        notifications: addNotification(state.notifications, {
          type: 'warning',
          message: 'Research cancelled.',
          timestamp: Date.now()
        })
      };
    }

    // ========== MILITARY UNIT ACTIONS ==========

    case 'TRAIN_UNIT': {
      const { unitTypeId, settlementId } = action;
      const unitType = getUnitById(unitTypeId);
      const playerFaction = getPlayerFaction(state);
      const settlement = state.settlements.find(s => s.id === settlementId);

      if (!unitType || !settlement || !canAffordUnit(playerFaction, unitType)) {
        return state;
      }

      // Deduct costs
      playerFaction.resources.food -= unitType.cost.food || 0;
      playerFaction.resources.materials -= unitType.cost.materials || 0;
      playerFaction.resources.knowledge -= unitType.cost.knowledge || 0;
      playerFaction.resources.population -= unitType.cost.population || 0;

      // Create unit
      const unit = {
        id: `unit_${Date.now()}`,
        typeId: unitType.id,
        factionId: playerFaction.id,
        position: settlement.hex,
        health: unitType.stats.health,
        experience: 0,
        veterancy: 0,
        createdTurn: state.turn
      };

      return {
        ...state,
        units: [...state.units, unit],
        hasTrainedUnit: true,
        actionPoints: state.actionPoints - 1,
        notifications: addNotification(state.notifications, {
          type: 'success',
          message: `⚔️ ${unitType.name} trained in ${settlement.name}!`,
          timestamp: Date.now()
        })
      };
    }

    case 'MOVE_UNIT': {
      const { unitId, targetHex } = action;
      const unit = state.units.find(u => u.id === unitId);

      if (!unit) return state;

      const unitType = getUnitById(unit.typeId);
      const distance = hexDistance(unit.position, targetHex);

      if (distance > unitType.stats.movement) {
        return {
          ...state,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: 'Unit cannot move that far!',
            timestamp: Date.now()
          })
        };
      }

      // Update unit position
      unit.position = targetHex;

      // Check for encounters with animals
      const hexKey = `${targetHex.q},${targetHex.r}`;
      const animals = state.animals.get(hexKey) || [];

      if (animals.length > 0 && animals.some(a => a.aggressive)) {
        return {
          ...state,
          actionPoints: state.actionPoints - 1,
          notifications: addNotification(state.notifications, {
            type: 'warning',
            message: `⚠️ Unit encountered ${animals[0].type} at ${hexKey}!`,
            timestamp: Date.now()
          })
        };
      }

      return {
        ...state,
        actionPoints: state.actionPoints - 1
      };
    }

    case 'DISBAND_UNIT': {
      const { unitId } = action;
      const unit = state.units.find(u => u.id === unitId);

      if (!unit) return state;

      const unitType = getUnitById(unit.typeId);
      const playerFaction = getPlayerFaction(state);

      // Refund half the population cost
      if (unitType.cost.population) {
        playerFaction.resources.population += Math.floor(unitType.cost.population / 2);
      }

      return {
        ...state,
        units: state.units.filter(u => u.id !== unitId),
        notifications: addNotification(state.notifications, {
          type: 'info',
          message: `${unitType.name} disbanded.`,
          timestamp: Date.now()
        })
      };
    }

    // ========== QUEST ACTIONS ==========

    case 'ACCEPT_QUEST': {
      const { questId } = action;
      const quest = state.availableQuests.find(q => q.id === questId);

      if (!quest) return state;

      quest.status = QUEST_STATUS.ACTIVE;
      quest.turnAccepted = state.turn;

      return {
        ...state,
        quests: [...state.quests, quest],
        availableQuests: state.availableQuests.filter(q => q.id !== questId),
        notifications: addNotification(state.notifications, {
          type: 'info',
          message: `📜 Quest Accepted: ${quest.name}`,
          timestamp: Date.now()
        })
      };
    }

    case 'ABANDON_QUEST': {
      const { questId } = action;
      const quest = state.quests.find(q => q.id === questId);

      if (!quest) return state;

      const playerFaction = getPlayerFaction(state);
      const result = failQuest(quest, playerFaction);

      return {
        ...state,
        quests: state.quests.filter(q => q.id !== questId),
        notifications: addNotification(state.notifications, {
          type: 'warning',
          message: result.message,
          timestamp: Date.now()
        })
      };
    }

    default:
      return state;
  }
};
