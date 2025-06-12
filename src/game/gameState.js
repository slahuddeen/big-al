// ==================== GAME CONSTANTS ====================
export const DAY_LENGTH = 3;
export const NIGHT_LENGTH = 2;
export const TOTAL_CYCLE = DAY_LENGTH + NIGHT_LENGTH;
export const MAX_NOTIFICATIONS = 3;
export const NOTIFICATION_AUTO_DISMISS_TIME = 8000; // 8 seconds

// Original Big Al constants
export const MAX_WEIGHT = 2100;
export const HEALING_RATE = 2;
export const BEHAVIOR_RANDOMNESS = 0.2;
export const ENERGY_PER_BODYWEIGHT = 10;
export const ROAMING_RATE = 0.5;

export const getTimeOfDay = (turnNumber) => {
    const cyclePosition = turnNumber % TOTAL_CYCLE;
    return {
        isNight: cyclePosition >= DAY_LENGTH,
        isDay: cyclePosition < DAY_LENGTH,
        turnInCycle: cyclePosition,
        cycleNumber: Math.floor(turnNumber / TOTAL_CYCLE)
    };
};

export const THOUGHTS = [
    "You smell carrion nearby...",
    "Mother's scent is getting weaker",
    "The air is thick with moisture",
    "Something doesn't feel right...",
    "You feel confident and strong",
    "The wind carries strange scents",
    "Your stomach rumbles with hunger",
    "Every shadow could hide danger",
    "The forest whispers ancient secrets",
    "You sense eyes watching you"
];