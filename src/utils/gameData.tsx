// utils/gameData.tsx
import React from 'react';
import { Compass, Shield, Heart, Zap, AlertCircle, Sun, Clock, Moon, Droplets, Users } from 'lucide-react';

export const perkDefinitions = {
    keen_sense: {
        name: "Keen Sense of Smell",
        description: "Detect prey and predators from farther away",
        icon: <Compass className="text-yellow-500" size={16} />,
        effect: () => {
            // Increase visibility radius
            return { visibilityBonus: 1 };
        }
    },
    thick_hide: {
        name: "Thick Hide",
        description: "Reduces damage taken from attacks and environmental hazards",
        icon: <Shield className="text-gray-300" size={16} />,
        effect: () => {
            // Reduce damage taken
            return { damageReduction: 0.25 };
        }
    },
    efficient_hunter: {
        name: "Efficient Hunter",
        description: "Gain more nutrition from prey",
        icon: <Heart className="text-red-500" size={16} />,
        effect: () => {
            // Increase nutrition from prey
            return { nutritionBonus: 0.3 };
        }
    },
    swift_runner: {
        name: "Swift Runner",
        description: "Move faster and use less energy while running",
        icon: <Zap className="text-blue-500" size={16} />,
        effect: () => {
            // Reduce energy cost for movement
            return { movementEnergyCost: -0.3 };
        }
    },
    ambush_predator: {
        name: "Ambush Predator",
        description: "Higher chance of successful hunts from cover",
        icon: <AlertCircle className="text-green-500" size={16} />,
        effect: () => {
            // Increase hunting success chance from cover
            return { ambushBonus: 0.2 };
        }
    },
    adapted_to_heat: {
        name: "Heat Adapted",
        description: "Suffer less from hot weather conditions",
        icon: <Sun className="text-orange-500" size={16} />,
        effect: () => {
            // Reduce heat effects
            return { heatResistance: 0.5 };
        }
    },
    endurance: {
        name: "Endurance",
        description: "Reduces energy consumption during activities",
        icon: <Clock className="text-indigo-500" size={16} />,
        effect: () => {
            // Reduce energy consumption
            return { energyConservation: 0.2 };
        }
    },
    night_vision: {
        name: "Night Vision",
        description: "Better visibility during night time",
        icon: <Moon className="text-purple-500" size={16} />,
        effect: () => {
            // Increase night visibility
            return { nightVision: true };
        }
    },
    water_adaptation: {
        name: "Water Adaptation",
        description: "Move faster through water and find aquatic prey easier",
        icon: <Droplets className="text-blue-500" size={16} />,
        effect: () => {
            // Water movement and hunting bonus
            return { waterMovement: 0.5, waterHunting: 0.3 };
        }
    },
    pack_hunter: {
        name: "Pack Hunter",
        description: "Chance to attract another Allosaurus to help with large hunts",
        icon: <Users className="text-amber-500" size={16} />,
        effect: () => {
            // Pack hunting chance
            return { packHunting: 0.15 };
        }
    }
};

export const injuryTypes = {
    broken_rib: {
        name: "Broken Rib",
        description: "A fractured rib causing pain during movement",
        effect: { movementPenalty: 0.3, fitnessDrain: 0.2 },
        healTime: 20, // turns to heal
        severity: 2
    },
    leg_wound: {
        name: "Leg Wound",
        description: "An injury to the leg limiting mobility",
        effect: { movementPenalty: 0.5, huntingPenalty: 0.3 },
        healTime: 15,
        severity: 3
    },
    infection: {
        name: "Infection",
        description: "An infected wound causing fever and weakness",
        effect: { energyDrain: 0.4, fitnessDrain: 0.3 },
        healTime: 12,
        severity: 4,
        progressive: true // gets worse if not treated
    },
    sprained_claw: {
        name: "Sprained Claw",
        description: "A minor injury to the claw",
        effect: { huntingPenalty: 0.2 },
        healTime: 8,
        severity: 1
    },
    internal_bleeding: {
        name: "Internal Bleeding",
        description: "Serious internal injury causing gradual weakening",
        effect: { fitnessDrain: 0.5, energyDrain: 0.3 },
        healTime: 25,
        severity: 5,
        progressive: true
    },
    concussion: {
        name: "Concussion",
        description: "A head injury causing disorientation",
        effect: { visibilityPenalty: 1, huntingPenalty: 0.4 },
        healTime: 10,
        severity: 3
    }
};

export const growthStages = [
    { name: "Hatchling", weightRequired: 0, description: "You've just hatched. Stay close to your mother for protection." },
    { name: "Juvenile", weightRequired: 100, description: "You're growing and can hunt small prey on your own." },
    { name: "Subadult", weightRequired: 250, description: "You're nearly full-grown and can tackle larger prey." },
    { name: "Adult", weightRequired: 450, description: "You're a mature dinosaur, a fearsome predator of the Jurassic." }
];