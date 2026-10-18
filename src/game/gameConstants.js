// ==================== GAME CONSTANTS ====================
export const DAY_LENGTH = 3;
export const NIGHT_LENGTH = 2;
export const TOTAL_CYCLE = DAY_LENGTH + NIGHT_LENGTH;
export const MAX_CREATURES_PER_HEX = 3;
export const MAX_NOTIFICATIONS = 3;
export const NOTIFICATION_AUTO_DISMISS_TIME = 8000; // 8 seconds

// Original Big Al constants
export const MAX_WEIGHT = 1400;
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
    "Smoke hangs over the far hills.",
    "The lake is perfectly still. Too still.",
    "The air smells of sulphur today.",
    "Something big walked through here. The ferns are flattened.",
    "Your filaments lift in the breeze.",
    "Feathers on the ground. Something ate a bird here.",
    "The ground trembles, just for a moment.",
    "You hear wings in the canopy above.",
    "Psittacosaurus chatter somewhere beyond the trees.",
    "A grown Yutyrannus has marked this tree. Best not to linger."
];
