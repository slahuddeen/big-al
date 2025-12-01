// Rare and Mysterious Encounters
// These are dangerous or mysterious offshoots of known species

export const RARE_ENCOUNTERS = {
  ORCS: {
    id: 'orcs',
    name: 'The Corrupted Ones',
    displayName: 'Orcs (Neanderthal Offshoot)',
    emoji: '👹',
    description: 'Twisted, aggressive offshoot of Neanderthals - predominantly male warband that raids settlements',
    baseSpecies: 'neanderthal',
    isHostile: true,
    encounterRarity: 0.05, // 5% chance in their territory

    baseStats: {
      strength: 12,
      intelligence: 5,
      endurance: 11,
      agility: 7,
      social: 3
    },

    traits: {
      savageRaiders: {
        name: 'Savage Raiders',
        description: 'Attack settlements at night, kidnap women, kill men',
        bonus: { nightRaidBonus: 2.0, kidnappingChance: 0.6 }
      },
      cannibalWarriors: {
        name: 'Cannibal Warriors',
        description: 'Consume fallen enemies, gain strength from fear',
        bonus: { combatStrength: 1.5, intimidation: 2.5, cannibal: true }
      },
      maleOnlySociety: {
        name: 'Warband Culture',
        description: 'Reproduce by kidnapping women from other tribes',
        bonus: { reproductionMethod: 'kidnapping', moraleDebuff: 0.5 }
      }
    },

    // Encounter scenarios
    encounters: [
      {
        id: 'night_raid',
        name: 'Night Raid',
        description: 'Orcs attack your settlement under cover of darkness!',
        trigger: 'settlement_at_night',
        chance: 0.15,
        effects: {
          populationLoss: [2, 5],
          foodStolen: [10, 30],
          womenKidnapped: [0, 2],
          menKilled: [1, 3]
        },
        outcomes: [
          {
            choice: 'Fight back',
            success: 0.6,
            successResult: 'You repel the raiders! +10 morale, -2 population',
            failureResult: 'The raid is devastating. -5 population, -20 food, 1 woman kidnapped'
          },
          {
            choice: 'Hide and survive',
            success: 0.8,
            successResult: 'Your people hide. Only minor losses. -1 population, -10 food',
            failureResult: 'They find your hiding spots. -3 population, -15 food'
          },
          {
            choice: 'Offer tribute',
            success: 0.9,
            successResult: 'They take your offerings and leave. -30 food, -10 materials',
            failureResult: 'They take everything anyway. -30 food, -20 materials, -2 population'
          }
        ]
      },
      {
        id: 'hunting_party_ambush',
        name: 'Hunting Party Ambush',
        description: 'Your scouts encounter an Orc hunting party!',
        trigger: 'exploration',
        chance: 0.1,
        effects: {
          scoutsDead: [1, 2],
          scoutsWounded: [0, 1]
        },
        outcomes: [
          {
            choice: 'Attack them',
            success: 0.5,
            successResult: 'You defeat the Orcs! +20 materials from their weapons',
            failureResult: '2 scouts killed, 1 wounded'
          },
          {
            choice: 'Flee',
            success: 0.85,
            successResult: 'Your scouts escape safely',
            failureResult: '1 scout killed in the chase'
          },
          {
            choice: 'Track them to their lair',
            success: 0.3,
            successResult: 'You find their camp! +Knowledge of Orc territory',
            failureResult: 'They notice you tracking. Ambush! 2 scouts killed'
          }
        ]
      },
      {
        id: 'war_party',
        name: 'Orc War Party',
        description: 'A massive Orc warband marches toward your settlement!',
        trigger: 'late_game',
        chance: 0.05,
        effects: {
          settlementDamage: 'severe',
          populationLoss: [5, 15]
        },
        outcomes: [
          {
            choice: 'Defend with all forces',
            success: 0.4,
            successResult: 'A costly victory! -8 population, +50 materials from spoils, Orcs flee the region',
            failureResult: 'Devastating defeat. Settlement destroyed, survivors scatter. Game Over option'
          },
          {
            choice: 'Evacuate the settlement',
            success: 0.9,
            successResult: 'Most people escape. -Settlement, -50% resources, relocate',
            failureResult: 'Evacuation goes wrong. -5 population, -Settlement, -70% resources'
          },
          {
            choice: 'Seek alliance with nearby tribe',
            success: 0.7,
            successResult: 'Combined forces drive them off! +Alliance, -3 population',
            failureResult: 'No one comes to help. Fight alone: -10 population'
          }
        ]
      }
    ],

    preferredTerrain: ['mountains', 'rocky_terrain', 'badlands'],
    territoryMarkers: ['skulls_on_stakes', 'burned_camps', 'blood_trails']
  },

  GOBLINS: {
    id: 'goblins',
    name: 'The Deep Dwellers',
    displayName: 'Goblins (Hobbit Offshoot)',
    emoji: '👁️',
    description: 'Pale cave-dwellers with enormous eyes - degenerate Hobbits who lost their way in the darkness',
    baseSpecies: 'homo_floresiensis',
    isHostile: false, // Not always hostile
    encounterRarity: 0.08,

    baseStats: {
      strength: 3,
      intelligence: 7,
      endurance: 6,
      agility: 10,
      social: 4
    },

    traits: {
      caveAdapted: {
        name: 'Children of Darkness',
        description: 'Perfect night vision, suffer in sunlight',
        bonus: { nightVision: true, sunlightPenalty: 0.5, caveBonus: 2.0 }
      },
      stealthy: {
        name: 'Shadow Walkers',
        description: 'Nearly invisible in caves and at night',
        bonus: { stealthBonus: 2.5, ambushChance: 0.7 }
      },
      scavengers: {
        name: 'Cunning Scavengers',
        description: 'Steal food and shiny objects, trade strange items',
        bonus: { stealChance: 0.5, tradeChance: 0.3 }
      }
    },

    encounters: [
      {
        id: 'cave_discovery',
        name: 'Strange Lights in the Cave',
        description: 'Your scouts find a deep cave with eerie glowing eyes watching from the darkness...',
        trigger: 'cave_exploration',
        chance: 0.2,
        outcomes: [
          {
            choice: 'Approach peacefully with offerings',
            success: 0.7,
            successResult: 'The Goblins accept your gift! They show you a hidden mushroom grove. +30 food, +Knowledge: Cave Navigation',
            failureResult: 'They steal your offerings and vanish. -10 food, -5 materials'
          },
          {
            choice: 'Attack them',
            success: 0.5,
            successResult: 'You drive them deeper. Find their stash! +20 materials (strange items)',
            failureResult: 'They disappear into the darkness. Ambush! -2 scouts wounded'
          },
          {
            choice: 'Retreat from the cave',
            success: 1.0,
            successResult: 'You leave peacefully. They remember your respect.',
            failureResult: null
          }
        ]
      },
      {
        id: 'midnight_theft',
        name: 'The Midnight Thief',
        description: 'Food and tools go missing at night. Witnesses report pale figures with huge eyes...',
        trigger: 'settlement_event',
        chance: 0.12,
        outcomes: [
          {
            choice: 'Set a trap',
            success: 0.6,
            successResult: 'You catch a Goblin! It offers to trade: strange cave mushrooms for freedom',
            failureResult: 'The trap is too crude. -10 food stolen anyway'
          },
          {
            choice: 'Leave out food as offering',
            success: 0.9,
            successResult: 'Goblins become friendly! They guide you to rare cave resources. +Goblin Trading Partner',
            failureResult: 'They take the food but keep stealing. -15 food total'
          },
          {
            choice: 'Post guards',
            success: 0.5,
            successResult: 'Thefts stop. Goblins avoid your settlement.',
            failureResult: 'Guards fall asleep. -15 food, -10 materials stolen'
          }
        ]
      },
      {
        id: 'goblin_market',
        name: 'The Secret Market',
        description: 'Goblins invite you to their underground marketplace - strange goods and stranger merchants...',
        trigger: 'good_relations',
        chance: 0.15,
        outcomes: [
          {
            choice: 'Trade with them',
            success: 1.0,
            successResult: 'Access to unique cave resources: glowing mushrooms, rare minerals, cave maps',
            failureResult: null
          },
          {
            choice: 'Steal from the market',
            success: 0.3,
            successResult: 'You grab valuable items and escape! +30 materials, -Goblin relations',
            failureResult: 'Caught! Goblins become hostile. -10 materials as punishment, permanent enemy'
          },
          {
            choice: 'Share knowledge',
            success: 0.8,
            successResult: 'Goblins teach you cave secrets. +Knowledge: Underground Farming, +Alliance',
            failureResult: 'They\'re not interested. Neutral outcome.'
          }
        ]
      }
    ],

    preferredTerrain: ['mountains', 'rocky_terrain', 'hills'],
    territoryMarkers: ['cave_markings', 'strange_fungi', 'tiny_footprints']
  },

  DRYADS: {
    id: 'dryads',
    name: 'The Forest Maidens',
    displayName: 'Dryads (All-Female Sapiens)',
    emoji: '🌺',
    description: 'Mysterious all-female tribe living deep in ancient forests - they kidnap men for breeding',
    baseSpecies: 'homo_sapiens',
    isHostile: false, // Complicated
    encounterRarity: 0.06,

    baseStats: {
      strength: 6,
      intelligence: 9,
      endurance: 8,
      agility: 9,
      social: 8
    },

    traits: {
      forestMagic: {
        name: 'Forest Harmony',
        description: 'Deep connection with nature, master herbalists',
        bonus: { herbalism: 2.0, forestBonus: 1.8, healingBonus: 1.5 }
      },
      alluringSong: {
        name: 'Enchanting Song',
        description: 'Can charm men into following them',
        bonus: { charmChance: 0.7, diplomacyBonus: 20 }
      },
      matriarchalSociety: {
        name: 'Daughters of the Grove',
        description: 'Only female children, must take men from other tribes',
        bonus: { reproductionMethod: 'kidnapping', femaleOnly: true }
      }
    },

    encounters: [
      {
        id: 'singing_forest',
        name: 'The Singing Forest',
        description: 'Your male scouts hear beautiful singing deeper in the forest...',
        trigger: 'forest_exploration',
        chance: 0.18,
        outcomes: [
          {
            choice: 'Investigate the singing',
            success: 0.4,
            successResult: 'Scouts resist the charm! Dryads offer alliance. +Dryad Trading Partner, +Herb Knowledge',
            failureResult: '2 male scouts vanish. They\'ve been taken by the Dryads'
          },
          {
            choice: 'Send only women to investigate',
            success: 0.9,
            successResult: 'Dryads welcome your women! +Alliance, +Knowledge: Herbalism, +Trade Route',
            failureResult: 'Dryads are wary but peaceful. Neutral outcome.'
          },
          {
            choice: 'Avoid the singing',
            success: 1.0,
            successResult: 'Your scouts return safely. The singing fades.',
            failureResult: null
          }
        ]
      },
      {
        id: 'missing_hunters',
        name: 'The Missing Hunters',
        description: 'Three of your best male hunters haven\'t returned from the deep forest...',
        trigger: 'settlement_event',
        chance: 0.12,
        outcomes: [
          {
            choice: 'Send rescue party (mixed gender)',
            success: 0.5,
            successResult: 'You find them! They\'re... content? But return with you. +3 hunters back, +Dryad Location',
            failureResult: 'Rescue party gets charmed too. -5 men total missing'
          },
          {
            choice: 'Send only women to negotiate',
            success: 0.8,
            successResult: 'Dryads release the men after negotiations. +Alliance possibility, men return changed',
            failureResult: 'Dryads keep the men. Offer trade agreement as compensation.'
          },
          {
            choice: 'Accept their loss',
            success: 1.0,
            successResult: 'Years later, the men return with daughters. +Population, +Knowledge: Forest Lore',
            failureResult: null
          }
        ]
      },
      {
        id: 'dryad_proposal',
        name: 'The Dryad Proposal',
        description: 'A delegation of Dryads visits your settlement with an offer...',
        trigger: 'mid_game',
        chance: 0.1,
        outcomes: [
          {
            choice: 'Accept alliance (exchange men for knowledge)',
            success: 1.0,
            successResult: 'Formal alliance! Some men choose to go. +Powerful Ally, +Herb/Medicine Knowledge, -3 population (voluntary)',
            failureResult: null
          },
          {
            choice: 'Refuse alliance',
            success: 0.7,
            successResult: 'They respect your choice and leave peacefully.',
            failureResult: 'Dryads become hostile. Night raids for men begin.'
          },
          {
            choice: 'Propose marriage exchange',
            success: 0.6,
            successResult: 'They agree to cultural exchange! +Unique hybrid culture, +Both populations grow',
            failureResult: 'They find this amusing but decline. Neutral outcome.'
          }
        ]
      },
      {
        id: 'sacred_grove',
        name: 'The Sacred Grove',
        description: 'Your people discover a beautiful grove tended by Dryads - a place of healing and peace',
        trigger: 'good_relations',
        chance: 0.2,
        outcomes: [
          {
            choice: 'Request healing for your sick',
            success: 0.9,
            successResult: 'Dryads heal your people with herbs! +Health for all, -Disease',
            failureResult: 'They require a male healer as payment. Choice: pay or decline.'
          },
          {
            choice: 'Learn their herbal arts',
            success: 0.7,
            successResult: 'They teach willing students. +Knowledge: Master Herbalism, +Medicine',
            failureResult: 'They only teach women. Send female apprentices?'
          },
          {
            choice: 'Respect the grove and leave',
            success: 1.0,
            successResult: 'They appreciate your respect. +Relations, occasional gifts of herbs',
            failureResult: null
          }
        ]
      }
    ],

    preferredTerrain: ['dense_forest', 'forest', 'jungle'],
    territoryMarkers: ['flower_circles', 'singing_heard', 'herb_gardens']
  }
};

// Helper to get rare encounter by ID
export const getRareEncounterById = (id) => {
  return RARE_ENCOUNTERS[id.toUpperCase()];
};

// Calculate encounter chance based on terrain and conditions
export const calculateEncounterChance = (encounterType, terrain, isNight, relations = 0) => {
  const encounter = getRareEncounterById(encounterType);
  if (!encounter) return 0;

  let chance = encounter.encounterRarity;

  // Terrain modifier
  if (encounter.preferredTerrain.includes(terrain)) {
    chance *= 3; // 3x more likely in preferred terrain
  }

  // Time of day modifier
  if (encounterType === 'ORCS' && isNight) {
    chance *= 2; // Orcs raid at night
  }
  if (encounterType === 'GOBLINS' && isNight) {
    chance *= 1.5; // Goblins more active at night
  }

  // Relations modifier
  if (relations > 50) {
    chance *= 0.5; // Good relations = less hostile encounters
  } else if (relations < -50) {
    chance *= 2; // Bad relations = more encounters
  }

  return Math.min(chance, 0.5); // Cap at 50%
};

// Get random encounter from specific type
export const getRandomEncounter = (encounterType) => {
  const rareType = getRareEncounterById(encounterType);
  if (!rareType || !rareType.encounters) return null;

  const encounters = rareType.encounters;
  return encounters[Math.floor(Math.random() * encounters.length)];
};

export const ENCOUNTER_TYPES = Object.keys(RARE_ENCOUNTERS);
