// Weather effect definitions
export const weatherEffects = {
    clear: {
        name: "Clear",
        description: "Perfect hunting conditions",
        energyEffect: 0,
        hungerEffect: 0,
        thirstEffect: 0.5,
        visibilityBonus: 1
    },
    cloudy: {
        name: "Cloudy",
        description: "Reduced visibility, but comfortable temperatures",
        energyEffect: 0,
        hungerEffect: 0,
        thirstEffect: 0.3,
        visibilityBonus: 0
    },
    rainy: {
        name: "Rainy",
        description: "Wet conditions make hunting harder but provide drinking water",
        energyEffect: -0.2,
        hungerEffect: 0.1,
        thirstEffect: -0.5,
        visibilityBonus: -1
    },
    stormy: {
        name: "Stormy",
        description: "Dangerous conditions with risk of injury",
        energyEffect: -0.5,
        hungerEffect: 0.2,
        thirstEffect: -0.3,
        visibilityBonus: -2,
        injuryChance: 0.05
    },
    hot: {
        name: "Scorching Hot",
        description: "Heat stress increases thirst and drains energy",
        energyEffect: -0.4,
        hungerEffect: 0.1,
        thirstEffect: 1,
        visibilityBonus: 0
    },
    cold: {
        name: "Cold Snap",
        description: "Cold temperatures increase hunger and risk of hypothermia",
        energyEffect: -0.3,
        hungerEffect: 0.3,
        thirstEffect: 0.2,
        visibilityBonus: 0
    }
};

// Season effect definitions
export const seasonEffects = {
    spring: {
        name: "Spring",
        description: "Abundant prey and mild weather",
        preyMultiplier: 1.2,
        weatherPatterns: ["clear", "cloudy", "rainy"],
        plantGrowth: 1.5
    },
    summer: {
        name: "Summer",
        description: "Hot days but plentiful food",
        preyMultiplier: 1.0,
        weatherPatterns: ["clear", "hot", "stormy"],
        plantGrowth: 1.0
    },
    fall: {
        name: "Fall",
        description: "Cooling temperatures with animals preparing for winter",
        preyMultiplier: 0.8,
        weatherPatterns: ["cloudy", "rainy", "clear"],
        plantGrowth: 0.5
    },
    winter: {
        name: "Winter",
        description: "Harsh conditions with scarce prey",
        preyMultiplier: 0.5,
        weatherPatterns: ["cold", "cloudy", "clear"],
        plantGrowth: 0.2
    }
};