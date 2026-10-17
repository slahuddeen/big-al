// ==================== GAME CONSTANTS ====================
export const DAY_LENGTH = 3;
export const NIGHT_LENGTH = 2;
export const TOTAL_CYCLE = DAY_LENGTH + NIGHT_LENGTH;
export const MAX_CREATURES_PER_HEX = 3;
export const MAX_NOTIFICATIONS = 3;
export const NOTIFICATION_AUTO_DISMISS_TIME = 8000; // 8 seconds

// Original Big Al constants
export const MAX_WEIGHT = 7000;
export const HEALING_RATE = 2;
export const BEHAVIOR_RANDOMNESS = 0.2;
export const ENERGY_PER_BODYWEIGHT = 10;
export const ROAMING_RATE = 0.5;

// One turn of the day/night cycle each
export const PHASE_NAMES = ['Morning', 'Midday', 'Evening', 'Night', 'Before dawn'];

export const getTimeOfDay = (turnNumber) => {
    const cyclePosition = turnNumber % TOTAL_CYCLE;
    return {
        isNight: cyclePosition >= DAY_LENGTH,
        isDay: cyclePosition < DAY_LENGTH,
        turnInCycle: cyclePosition,
        cycleNumber: Math.floor(turnNumber / TOTAL_CYCLE),
        day: Math.floor(turnNumber / TOTAL_CYCLE) + 1,
        phaseName: PHASE_NAMES[cyclePosition]
    };
};

export const THOUGHTS = [
    "You smell rotting fish somewhere downstream...",
    "The river is rising. Rain upstream.",
    "The air is heavy and hot",
    "Something doesn't feel right on the bank...",
    "You feel strong in the water",
    "The wind carries the stink of the mudflats",
    "Your stomach rumbles with hunger",
    "A shadow moves under the surface",
    "Carcharodontosaurus has been here. The bones are cracked.",
    "You sense eyes watching from the reeds"
];
