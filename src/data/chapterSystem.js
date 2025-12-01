// Chapter System - Story-driven progression with goals and narrative
// Chapters provide structure and long-term objectives for the player

export const CHAPTER_STATUS = {
  LOCKED: 'locked',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

export const CHAPTERS = {
  CHAPTER_1: {
    id: 'chapter_1',
    number: 1,
    name: 'The First Steps',
    subtitle: 'Survival and Discovery',
    description: 'Your tribe has emerged into a dangerous world. Learn to survive, explore your surroundings, and establish your first settlement.',

    narrative: {
      intro: `The sun rises over the savanna. Your people, few in number, stand at the edge of the unknown. Ancient instincts guide you, but the path ahead is yours to forge. Will you survive? Will you thrive? The story begins here...`,
      completion: `Your tribe has taken root. The first settlement stands as testament to your people's will to survive. But this is only the beginning. Greater challenges await...`
    },

    objectives: [
      {
        id: 'found_first_settlement',
        description: 'Found your first settlement',
        required: true,
        completed: false
      },
      {
        id: 'explore_10_hexes',
        description: 'Explore 10 hexes of terrain',
        required: true,
        completed: false,
        progress: 0,
        target: 10
      },
      {
        id: 'gather_100_food',
        description: 'Accumulate 100 food',
        required: true,
        completed: false,
        progress: 0,
        target: 100
      },
      {
        id: 'reach_population_20',
        description: 'Grow your population to 20',
        required: true,
        completed: false,
        progress: 0,
        target: 20
      },
      {
        id: 'make_first_contact',
        description: 'Make contact with another faction',
        required: false, // Optional objective
        completed: false
      }
    ],

    rewards: {
      knowledge: 50,
      culturalInfluence: 20,
      actionPoints: 5,
      unlocksChapter: 'chapter_2'
    },

    unlockConditions: [], // Always available at start
    recommendedTurn: 0
  },

  CHAPTER_2: {
    id: 'chapter_2',
    number: 2,
    name: 'Growing Pains',
    subtitle: 'Expansion and Conflict',
    description: 'Your settlement thrives, but growth brings challenges. Expand your territory, develop technologies, and navigate the complexities of diplomacy and warfare.',

    narrative: {
      intro: `Word of your tribe spreads across the land. Other peoples watch with curiosity... and perhaps envy. Resources grow scarce as your population swells. The time for expansion has come.`,
      completion: `Your influence grows. Multiple settlements dot the landscape, connected by paths your people have carved. You are no longer just survivors—you are builders of a civilization.`
    },

    objectives: [
      {
        id: 'found_second_settlement',
        description: 'Found a second settlement',
        required: true,
        completed: false
      },
      {
        id: 'research_3_technologies',
        description: 'Research 3 technologies',
        required: true,
        completed: false,
        progress: 0,
        target: 3
      },
      {
        id: 'build_5_buildings',
        description: 'Construct 5 different building types',
        required: true,
        completed: false,
        progress: 0,
        target: 5
      },
      {
        id: 'establish_trade_route',
        description: 'Establish a trade route with another faction',
        required: true,
        completed: false
      },
      {
        id: 'defend_against_attack',
        description: 'Successfully defend against a predator attack',
        required: false,
        completed: false
      },
      {
        id: 'train_first_military_unit',
        description: 'Train your first military unit',
        required: false,
        completed: false
      }
    ],

    rewards: {
      knowledge: 100,
      culturalInfluence: 40,
      materials: 100,
      unlocksChapter: 'chapter_3'
    },

    unlockConditions: ['chapter_1'],
    recommendedTurn: 20
  },

  CHAPTER_3: {
    id: 'chapter_3',
    number: 3,
    name: 'The Age of Wonders',
    subtitle: 'Civilization and Legacy',
    description: 'Your civilization stands as a beacon in the prehistoric world. Build wonders, master advanced technologies, and leave a lasting legacy.',

    narrative: {
      intro: `Stories of your people are told around distant fires. Some speak in awe, others in fear. Your shamans claim the spirits themselves take notice. What mark will you leave upon this ancient world?`,
      completion: `History will remember your deeds. Your civilization has achieved what seemed impossible. But every ending is a new beginning...`
    },

    objectives: [
      {
        id: 'reach_3_settlements',
        description: 'Control 3 settlements',
        required: true,
        completed: false,
        progress: 0,
        target: 3
      },
      {
        id: 'build_monument',
        description: 'Construct a monument',
        required: true,
        completed: false
      },
      {
        id: 'research_tier_3_tech',
        description: 'Research a Tier 3 technology',
        required: true,
        completed: false
      },
      {
        id: 'reach_population_100',
        description: 'Reach total population of 100',
        required: true,
        completed: false,
        progress: 0,
        target: 100
      },
      {
        id: 'forge_alliance',
        description: 'Form an alliance with another faction',
        required: false,
        completed: false
      },
      {
        id: 'encounter_mysterious_race',
        description: 'Encounter Orcs, Goblins, or Dryads',
        required: false,
        completed: false
      }
    ],

    rewards: {
      knowledge: 200,
      culturalInfluence: 100,
      materials: 200,
      permanentBonus: { allProduction: 1.2 },
      victoryProgress: 0.5
    },

    unlockConditions: ['chapter_2'],
    recommendedTurn: 50
  },

  // Placeholder for additional chapters
  CHAPTER_4: {
    id: 'chapter_4',
    number: 4,
    name: 'The Reckoning',
    subtitle: 'Destiny Awaits',
    description: 'The final chapter. Your choices have led to this moment.',

    narrative: {
      intro: `The world trembles. Ancient powers stir. Your civilization stands at a crossroads...`,
      completion: `Victory! Your legacy is secure.`
    },

    objectives: [
      {
        id: 'achieve_dominance',
        description: 'Achieve dominance condition',
        required: true,
        completed: false
      }
    ],

    rewards: {
      victory: true
    },

    unlockConditions: ['chapter_3'],
    recommendedTurn: 100
  }
};

// Chapter Management Functions
export const getCurrentChapter = (gameState) => {
  const activeChapters = Object.values(CHAPTERS).filter(chapter =>
    chapter.status === CHAPTER_STATUS.ACTIVE
  );

  return activeChapters[0] || null;
};

export const getChapterProgress = (chapter) => {
  const totalObjectives = chapter.objectives.filter(obj => obj.required).length;
  const completedObjectives = chapter.objectives.filter(obj => obj.required && obj.completed).length;

  return {
    current: completedObjectives,
    total: totalObjectives,
    percentage: (completedObjectives / totalObjectives) * 100
  };
};

export const checkChapterUnlock = (chapterId, completedChapters) => {
  const chapter = CHAPTERS[chapterId.toUpperCase()];
  if (!chapter) return false;

  // Check if all prerequisite chapters are completed
  return chapter.unlockConditions.every(condition =>
    completedChapters.includes(condition)
  );
};

export const updateChapterObjective = (chapter, objectiveId, progress = null) => {
  const objective = chapter.objectives.find(obj => obj.id === objectiveId);
  if (!objective) return false;

  // Update boolean objectives
  if (typeof objective.completed === 'boolean') {
    objective.completed = true;
    return true;
  }

  // Update progress-based objectives
  if (progress !== null && objective.target !== undefined) {
    objective.progress = progress;
    if (objective.progress >= objective.target) {
      objective.completed = true;
    }
    return true;
  }

  return false;
};

export const checkChapterCompletion = (chapter) => {
  // Check if all required objectives are completed
  const requiredObjectives = chapter.objectives.filter(obj => obj.required);
  const allCompleted = requiredObjectives.every(obj => obj.completed);

  if (allCompleted) {
    chapter.status = CHAPTER_STATUS.COMPLETED;
    return true;
  }

  return false;
};

export const completeChapter = (chapter, gameState, faction) => {
  chapter.status = CHAPTER_STATUS.COMPLETED;

  // Apply rewards
  const rewards = { ...chapter.rewards };

  if (rewards.knowledge) {
    faction.resources.knowledge += rewards.knowledge;
  }
  if (rewards.culturalInfluence) {
    faction.culturalInfluence += rewards.culturalInfluence;
  }
  if (rewards.materials) {
    faction.resources.materials += rewards.materials;
  }

  // Unlock next chapter
  if (rewards.unlocksChapter) {
    const nextChapter = CHAPTERS[rewards.unlocksChapter.toUpperCase()];
    if (nextChapter) {
      nextChapter.status = CHAPTER_STATUS.ACTIVE;
    }
  }

  return {
    chapter,
    rewards,
    narrative: chapter.narrative.completion,
    message: `Chapter ${chapter.number} Complete: ${chapter.name}!`
  };
};

export const getChapterById = (id) => {
  return CHAPTERS[id.toUpperCase()];
};

export const getActiveChapters = (gameState) => {
  return Object.values(CHAPTERS).filter(chapter =>
    chapter.status === CHAPTER_STATUS.ACTIVE
  );
};

export const getCompletedChapters = (gameState) => {
  return Object.values(CHAPTERS).filter(chapter =>
    chapter.status === CHAPTER_STATUS.COMPLETED
  );
};

// Initialize chapter system
export const initializeChapters = () => {
  // Set first chapter as active
  CHAPTERS.CHAPTER_1.status = CHAPTER_STATUS.ACTIVE;

  // Lock all other chapters
  Object.values(CHAPTERS).forEach(chapter => {
    if (chapter.id !== 'chapter_1') {
      chapter.status = CHAPTER_STATUS.LOCKED;
    }
  });

  return CHAPTERS.CHAPTER_1;
};

// Track chapter-relevant events
export const trackChapterEvent = (gameState, eventType, data) => {
  const activeChapter = getCurrentChapter(gameState);
  if (!activeChapter) return null;

  let objectiveUpdated = false;

  switch (eventType) {
    case 'settlement_founded':
      objectiveUpdated = updateChapterObjective(activeChapter, 'found_first_settlement');
      objectiveUpdated = updateChapterObjective(activeChapter, 'found_second_settlement') || objectiveUpdated;
      break;

    case 'hex_explored':
      const objective = activeChapter.objectives.find(obj => obj.id === 'explore_10_hexes');
      if (objective) {
        objective.progress = data.totalExplored;
        if (objective.progress >= objective.target) {
          objective.completed = true;
          objectiveUpdated = true;
        }
      }
      break;

    case 'technology_researched':
      const techObjective = activeChapter.objectives.find(obj => obj.id === 'research_3_technologies');
      if (techObjective) {
        techObjective.progress = data.totalTechs;
        if (techObjective.progress >= techObjective.target) {
          techObjective.completed = true;
          objectiveUpdated = true;
        }
      }
      break;

    case 'first_contact':
      objectiveUpdated = updateChapterObjective(activeChapter, 'make_first_contact');
      break;

    // Add more event types as needed
  }

  if (objectiveUpdated) {
    checkChapterCompletion(activeChapter);
  }

  return objectiveUpdated;
};
