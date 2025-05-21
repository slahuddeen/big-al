import React, { useState, useEffect } from 'react';
import { Info, AlertCircle, Clock, Compass, Heart, Award, Scale, Zap, X, ChevronRight, ChevronLeft, Droplets, Sun, Wind, Shield, Users, Moon } from 'lucide-react';

// Main Game Component
const BigAlGame = () => {
  // Game States
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [currentFact, setCurrentFact] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [showCreatureDetails, setShowCreatureDetails] = useState(false);
  const [darkMode] = useState(true); // Default to dark mode
  const [selectedDinosaur, setSelectedDinosaur] = useState(null);
  const [showDinosaurSelection, setShowDinosaurSelection] = useState(false);
  const [perks, setPerks] = useState([]);
  const [availablePerks, setAvailablePerks] = useState(0);
  const [showPerkSelection, setShowPerkSelection] = useState(false);
  const [weather, setWeather] = useState('clear');
  const [season, setSeason] = useState('spring');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [injuries, setInjuries] = useState([]);
  const [showInjuryDetails, setShowInjuryDetails] = useState(false);
  const [hunger, setHunger] = useState(100);
  const [thirst, setThirst] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [showStatsDetails, setShowStatsDetails] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [healthEvents, setHealthEvents] = useState([]);
  const [showEventLog, setShowEventLog] = useState(false);
  
  // Player Character Stats
  const [age, setAge] = useState(1); // Years
  const [weight, setWeight] = useState(50); // Progress to next level
  const [fitness, setFitness] = useState(100); // Health
  const [score, setScore] = useState(0);
  const [growthStage, setGrowthStage] = useState(1); // 1=hatchling, 2=juvenile, 3=subadult, 4=adult
  const [movesLeft, setMovesLeft] = useState(20);
  
  // Map and Location
  const [map, setMap] = useState({});
  const [playerPosition, setPlayerPosition] = useState({ q: 0, r: 0 });
  const [motherPosition, setMotherPosition] = useState({ q: 1, r: 0 });
  const [nestPosition, setNestPosition] = useState({ q: 0, r: 0 });
  const [visibleTiles, setVisibleTiles] = useState([]);
  const [viewingTile, setViewingTile] = useState(null);
  const [revealedTiles, setRevealedTiles] = useState({});
  const [validMoves, setValidMoves] = useState([]);
  
  // Map dimensions (hexagonal grid)
  const mapRadius = 10; // Results in a map of about 21x21 hexes
  
  // Perk definitions
  const perkDefinitions = {
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

  // Weather effect definitions
  const weatherEffects = {
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
  const seasonEffects = {
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
  
  // Injury type definitions
  const injuryTypes = {
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
  
  // Habitat Types
  const habitats = {
    plains: {
      name: "Open Plains",
      color: "bg-amber-200",
      description: "Vast open grasslands with little cover, home to many large herbivores.",
      movementCost: 1,
      resources: 3,
      huntingModifier: 0.8, // harder to hunt without cover
      ambushValue: 0.2,
      waterSource: false,
      fact: "The open plains of the Jurassic period were where many of the largest herbivorous dinosaurs gathered in herds for protection."
    },
    forest: {
      name: "Dense Forest",
      color: "bg-green-700",
      description: "Thick vegetation providing cover and smaller prey animals.",
      movementCost: 1.5, // harder to move through
      resources: 2,
      huntingModifier: 1.2, // easier to ambush
      ambushValue: 0.8,
      waterSource: false,
      fact: "Jurassic forests were dominated by conifers, ginkgoes, and tree ferns, creating a very different landscape from modern forests."
    },
    riverbank: {
      name: "Riverbank",
      color: "bg-blue-500",
      description: "Flowing water where many creatures gather to drink.",
      movementCost: 1.2,
      resources: 4,
      huntingModifier: 1.0,
      ambushValue: 0.5,
      waterSource: true,
      fact: "Rivers were vital lifelines in the Jurassic, with many dinosaurs gathering near water sources during dry seasons."
    },
    marsh: {
      name: "Marsh",
      color: "bg-green-500",
      description: "Waterlogged area with dense vegetation and many small creatures.",
      movementCost: 1.8, // very difficult terrain
      resources: 3,
      huntingModifier: 0.9,
      ambushValue: 0.7,
      waterSource: true,
      fact: "Jurassic marshes were home to many amphibians and primitive crocodilians that would ambush prey from the water."
    },
    rocky: {
      name: "Rocky Terrain",
      color: "bg-gray-500",
      description: "Elevated rocky terrain with few resources but good visibility.",
      movementCost: 1.5,
      resources: 1,
      huntingModifier: 0.7, // hard to hunt here
      ambushValue: 0.4,
      waterSource: false,
      fact: "The highlands during the Jurassic were forming as part of the breakup of Pangaea, creating new habitats for species to evolve in isolation."
    },
    lake: {
      name: "Lake",
      color: "bg-blue-400",
      description: "Still water body with aquatic creatures and drinking source.",
      movementCost: 2.5, // very hard to move through
      resources: 3,
      huntingModifier: 0.6, // hard to hunt in water for land dinosaurs
      ambushValue: 0.3,
      waterSource: true,
      fact: "Jurassic lakes were critical ecosystems teeming with fish, amphibians, and other aquatic life that attracted predators."
    },
    nest: {
      name: "Allosaurus Nest",
      color: "bg-amber-600",
      description: "Your birth nest, a safe place to rest.",
      movementCost: 1,
      resources: 0,
      huntingModifier: 0,
      ambushValue: 0,
      waterSource: false,
      fact: "Allosaurus nests were likely simple scrapes in the ground, possibly lined with vegetation. The mother would guard them fiercely."
    },
    volcanic: {
      name: "Volcanic Fields",
      color: "bg-red-900",
      description: "Dangerous areas with hot springs and toxic gases.",
      movementCost: 2.0,
      resources: 0,
      huntingModifier: 0.4,
      ambushValue: 0.1,
      waterSource: false,
      healthHazard: 0.1, // chance of injury per turn
      fact: "Volcanic activity was common during the late Jurassic, creating hazardous but mineral-rich environments."
    },
    grassland: {
      name: "Grasslands",
      color: "bg-green-300",
      description: "Areas with tall grass providing some cover and moderate hunting.",
      movementCost: 1.1,
      resources: 2,
      huntingModifier: 1.0,
      ambushValue: 0.6,
      waterSource: false,
      fact: "While modern grasses didn't exist in the Jurassic, similar primitive plants created grassland-like areas favored by many herbivores."
    },
    cliff: {
      name: "Cliff Face",
      color: "bg-gray-700",
      description: "Steep rocky areas difficult to traverse but offering exceptional views.",
      movementCost: 2.2,
      resources: 0,
      huntingModifier: 0.3,
      ambushValue: 0.2,
      waterSource: false,
      healthHazard: 0.05, // risk of falling
      fact: "Cliffs in the Jurassic landscape provided nesting sites for pterosaurs and smaller dinosaurs, often inaccessible to larger predators."
    }
  };
  
  // Dinosaur species definitions
  const dinosaurSpecies = {
    allosaurus: {
      name: "Allosaurus",
      description: "Top predator of the Late Jurassic, fast and agile with serrated teeth",
      color: "bg-amber-600",
      size: "Medium-Large",
      diet: "Carnivore",
      specialAbility: "Pack hunting",
      baseStats: {
        hunting: 8,
        speed: 7,
        strength: 7,
        stamina: 6,
        senses: 7
      },
      growthRates: {
        health: 1.2,
        energy: 1.0,
        hunger: 1.3
      },
      preyTypes: ["small", "medium", "large"],
      threats: ["allosaurus", "sauropod", "stegosaurus"],
      facts: [
        "Allosaurus was one of the top predators of the Late Jurassic period, living about 155 to 145 million years ago.",
        "An adult Allosaurus could grow up to 28 feet (8.5 meters) long and weigh over 2 tons.",
        "Allosaurus had about 70-80 sharp, serrated teeth designed for slicing through flesh.",
        "Scientists believe Allosaurus could run at speeds of up to 20-30 mph (30-45 km/h).",
        "Allosaurus had three clawed fingers on each hand, which it used to grab and hold prey.",
        "Fossil evidence suggests Allosaurus sometimes hunted in groups to take down larger dinosaurs.",
        "Allosaurus had relatively short but powerful arms compared to its body size.",
        "The name 'Allosaurus' means 'different lizard,' referring to its unusual vertebrae.",
        "Allosaurus fossils have been found primarily in the western United States, particularly in Colorado, Utah, and Wyoming.",
        "An Allosaurus had a life expectancy of about 20-25 years in the wild."
      ]
    },
    dilophosaurus: {
      name: "Dilophosaurus",
      description: "Early Jurassic predator with distinctive cranial crests",
      color: "bg-green-600",
      size: "Medium",
      diet: "Carnivore",
      specialAbility: "Speed burst",
      baseStats: {
        hunting: 6,
        speed: 9,
        strength: 5,
        stamina: 7,
        senses: 6
      },
      growthRates: {
        health: 0.9,
        energy: 1.3,
        hunger: 1.1
      },
      preyTypes: ["small", "medium"],
      threats: ["allosaurus", "ceratosaurus"],
      facts: [
        "Dilophosaurus lived during the Early Jurassic period, about 193 million years ago.",
        "It was characterized by a pair of rounded crests on its skull, which may have been used for display or species recognition.",
        "Unlike its depiction in popular media, there is no evidence that Dilophosaurus could spit venom or had a neck frill.",
        "Dilophosaurus was about 20 feet (6 meters) long and weighed approximately 1,000 pounds (450 kg).",
        "Its jaws were relatively weak compared to later theropods, suggesting it may have hunted small prey or scavenged.",
        "Dilophosaurus had long, strong legs and was likely one of the fastest dinosaurs of its time.",
        "The name 'Dilophosaurus' means 'two-crested lizard,' referring to its distinctive head ornaments.",
        "Fossil evidence suggests Dilophosaurus may have lived near water sources and hunted fish.",
        "It had five fingers on each hand, unlike later theropods which had fewer digits.",
        "Dilophosaurus fossils have primarily been found in Arizona in the United States."
      ]
    },
    ceratosaurus: {
      name: "Ceratosaurus",
      description: "Theropod with distinctive horns and plates",
      color: "bg-red-800",
      size: "Medium-Large",
      diet: "Carnivore",
      specialAbility: "Aquatic hunting",
      baseStats: {
        hunting: 7,
        speed: 6,
        strength: 8,
        stamina: 6,
        senses: 6
      },
      growthRates: {
        health: 1.1,
        energy: 0.9,
        hunger: 1.2
      },
      preyTypes: ["small", "medium", "aquatic"],
      threats: ["allosaurus", "large"],
      facts: [
        "Ceratosaurus lived during the Late Jurassic period, about 150 million years ago.",
        "It had a distinctive horn on its snout and smaller horns over each eye, likely used for display.",
        "Ceratosaurus had a row of small osteoderms (bony plates) along its back.",
        "It was about 20 feet (6 meters) long and weighed around 1 ton.",
        "Unlike many other theropods, Ceratosaurus had four fingers on each hand instead of three.",
        "Some paleontologists believe Ceratosaurus may have been semi-aquatic, hunting fish and other water animals.",
        "Ceratosaurus had an unusually large head compared to its body size.",
        "Fossils have been found in North America, Europe, and Tanzania.",
        "The name 'Ceratosaurus' means 'horned lizard' referring to its nasal horn.",
        "It likely competed with other predators like Allosaurus for food resources."
      ]
    },
    stegosaurus: {
      name: "Stegosaurus",
      description: "Heavily armored herbivore with distinctive back plates",
      color: "bg-amber-800",
      size: "Large",
      diet: "Herbivore",
      specialAbility: "Tail defense",
      baseStats: {
        hunting: 0,
        speed: 4,
        strength: 8,
        stamina: 9,
        senses: 3
      },
      growthRates: {
        health: 1.5,
        energy: 0.8,
        hunger: 0.9
      },
      preyTypes: ["plants"],
      threats: ["allosaurus", "ceratosaurus"],
      facts: [
        "Stegosaurus lived during the Late Jurassic period, about 155 to 145 million years ago.",
        "It had 17 large bony plates arranged in two alternating rows along its back and tail.",
        "The plates may have been used for display, species recognition, or thermoregulation rather than defense.",
        "Stegosaurus had a spiked tail called a thagomizer, which was its primary defensive weapon.",
        "Despite its massive size (up to 30 feet long), Stegosaurus had a brain the size of a dog's.",
        "It was a herbivore that likely fed on low-growing vegetation such as ferns and bushes.",
        "Stegosaurus had short forelimbs and longer hind limbs, giving it a distinctive posture.",
        "The name 'Stegosaurus' means 'roof lizard,' referring to its plates.",
        "It was one of the least intelligent dinosaurs relative to its body size.",
        "Stegosaurus fossils have been found in western North America and Portugal."
      ]
    }
  };  
  
  // Creature Types with Stats
  const creatureTypes = {
    mothersaur: {
      name: "Mother Allosaurus",
      description: "Your protective mother, teaching you survival skills.",
      size: 3,
      fierceness: 90,
      agility: 70,
      energy: 100,
      nutrition: 0,
      minGrowthToHunt: 99, // Cannot be hunted
      maxGrowthToHide: 0, // Cannot be hidden from
      dangerLevel: 0, // Not dangerous to player
      category: "large",
      habitat: ["plains", "forest"],
      facts: ["Female Allosaurus likely protected their young for some time after hatching.", 
              "An adult Allosaurus could reach lengths of 8-12 meters and weigh up to 2 tons.",
              "Allosaurus mothers may have brought food back to their young or led them to carcasses."]
    },
    dryosaurus: {
      name: "Dryosaurus",
      description: "Small, agile plant-eater that moves in small herds.",
      size: 1,
      fierceness: 20,
      agility: 80,
      energy: 50,
      nutrition: 30,
      minGrowthToHunt: 2,
      maxGrowthToHide: 0,
      dangerLevel: 1,
      category: "small",
      habitat: ["plains", "forest", "grassland"],
      facts: ["Dryosaurus was a small, fast-running herbivore about 3 meters long.",
              "They likely lived in small herds for protection against predators.",
              "Dryosaurus had a horny beak and cheek teeth for processing plant material.",
              "Their name means 'oak lizard' because they likely lived in forested areas."]
    },
    ornitholestes: {
      name: "Ornitholestes",
      description: "Small predator hunting insects and small vertebrates.",
      size: 1,
      fierceness: 40,
      agility: 90,
      energy: 40,
      nutrition: 20,
      minGrowthToHunt: 2,
      maxGrowthToHide: 1,
      dangerLevel: 1,
      category: "small",
      habitat: ["forest", "marsh", "grassland"],
      facts: ["Ornitholestes was a small carnivorous dinosaur about 2 meters long.",
              "It had a lightweight skull with sharp teeth for catching small prey.",
              "Unlike how it's sometimes depicted, it probably didn't have a crest on its nose.",
              "It likely hunted small animals including lizards, mammals, and juvenile dinosaurs."]
    },
    stegosaurus: {
      name: "Stegosaurus",
      description: "Large herbivore with plates on its back and a spiked tail.",
      size: 3,
      fierceness: 60,
      agility: 30,
      energy: 90,
      nutrition: 80,
      minGrowthToHunt: 4,
      maxGrowthToHide: 1,
      dangerLevel: 3,
      category: "large",
      habitat: ["plains", "grassland"],
      facts: ["Stegosaurus had 17 bony plates along its back and four spikes on its tail called a thagomizer.",
              "Despite its size, its brain was only about the size of a walnut.",
              "The plates may have been used for display, species recognition, or temperature regulation.",
              "A full-grown Stegosaurus could reach 9 meters in length."]
    },
    diplodocus: {
      name: "Diplodocus",
      description: "Enormous long-necked herbivore that moves in herds.",
      size: 4,
      fierceness: 50,
      agility: 20,
      energy: 100,
      nutrition: 90,
      minGrowthToHunt: 99, // Cannot be hunted
      maxGrowthToHide: 1,
      dangerLevel: 4, // Can cause crushing injuries
      category: "sauropod",
      habitat: ["plains"],
      facts: ["Diplodocus was one of the longest dinosaurs, reaching lengths of up to 27 meters.",
              "Despite its enormous size, it would have weighed less than modern elephants.",
              "It had a very long whip-like tail that may have been used for defense.",
              "Diplodocus likely traveled in herds for protection against predators like Allosaurus."]
    },
    allosaurus: {
      name: "Allosaurus",
      description: "Large predator and your main competitor.",
      size: 3,
      fierceness: 95,
      agility: 60,
      energy: 90,
      nutrition: 70,
      minGrowthToHunt: 4,
      maxGrowthToHide: 2,
      dangerLevel: 5, // Very dangerous
      category: "large",
      habitat: ["plains", "forest", "grassland"],
      facts: ["Allosaurus was the dominant predator of the Late Jurassic period.",
              "It had serrated, blade-like teeth designed for slicing through flesh.",
              "An adult Allosaurus could exert an estimated bite force of 805 to 2,148 N.",
              "Its name means 'different lizard' referring to its unusual vertebrae."]
    },
    ceratosaurus: {
      name: "Ceratosaurus",
      description: "Predator with a distinctive horn on its nose.",
      size: 3,
      fierceness: 85,
      agility: 55,
      energy: 85,
      nutrition: 65,
      minGrowthToHunt: 4,
      maxGrowthToHide: 2,
      dangerLevel: 4,
      category: "large",
      habitat: ["riverbank", "marsh", "lake"],
      facts: ["Ceratosaurus had a prominent horn on its snout and smaller horns above its eyes.",
              "Unlike many theropods, it had four fingers on each hand instead of three.",
              "Some evidence suggests it may have been semi-aquatic, hunting in and around water.",
              "Ceratosaurus lived alongside Allosaurus but occupied a different ecological niche."]
    },
    brachiosaurus: {
      name: "Brachiosaurus",
      description: "Massive sauropod with an upright posture.",
      size: 5,
      fierceness: 40,
      agility: 10,
      energy: 100,
      nutrition: 100,
      minGrowthToHunt: 99, // Cannot be hunted
      maxGrowthToHide: 1,
      dangerLevel: 4, // Dangerous due to size
      category: "sauropod",
      habitat: ["plains", "forest"],
      facts: ["Brachiosaurus could reach heights of around 13 meters (43 feet).",
              "Its name means 'arm lizard' because its front legs were longer than its back legs.",
              "It held its neck more upright than other sauropods, allowing it to browse high vegetation.",
              "An adult Brachiosaurus may have weighed up to 50 tons."]
    },
    centipede: {
      name: "Giant Centipede",
      description: "Arthropod hiding in the underbrush.",
      size: 0,
      fierceness: 5,
      agility: 60,
      energy: 10,
      nutrition: 5,
      minGrowthToHunt: 1,
      maxGrowthToHide: 4,
      dangerLevel: 0,
      category: "tiny",
      habitat: ["forest", "marsh"],
      facts: ["Jurassic centipedes were similar to modern ones but could grow much larger.",
              "They were arthropods with many body segments and a pair of legs on each segment.",
              "Centipedes were predators, hunting smaller invertebrates.",
              "They likely lived in moist, sheltered environments like forest floors and under logs."]
    },
    dragonfly: {
      name: "Giant Dragonfly",
      description: "Fast-flying insect near water sources.",
      size: 0,
      fierceness: 2,
      agility: 95,
      energy: 5,
      nutrition: 3,
      minGrowthToHunt: 1,
      maxGrowthToHide: 4,
      dangerLevel: 0,
      category: "tiny",
      habitat: ["riverbank", "marsh", "lake"],
      facts: ["Jurassic dragonflies resembled their modern relatives but could be much larger.",
              "They were skilled aerial predators, catching other insects in flight.",
              "Dragonflies have existed for over 300 million years, predating dinosaurs.",
              "They spent their larval stage in water, making them common near rivers and marshes."]
    },
    lizard: {
      name: "Primitive Lizard",
      description: "Small reptile scurrying through the underbrush.",
      size: 0,
      fierceness: 10,
      agility: 85,
      energy: 15,
      nutrition: 10,
      minGrowthToHunt: 1,
      maxGrowthToHide: 3,
      dangerLevel: 0,
      category: "tiny",
      habitat: ["forest", "marsh", "grassland", "rocky"],
      facts: ["Small lizards were already widespread by the Jurassic period.",
              "They likely fed on insects and other small invertebrates.",
              "These early lizards were distant relatives of modern species.",
              "They would have been common prey for small dinosaurs and other predators."]
    },
    pterosaur: {
      name: "Pterosaur",
      description: "Flying reptile that is difficult to catch.",
      size: 1,
      fierceness: 25,
      agility: 100,
      energy: 40,
      nutrition: 25,
      minGrowthToHunt: 3,
      maxGrowthToHide: 1,
      dangerLevel: 1,
      category: "small",
      habitat: ["cliff", "lake", "plains"],
      facts: ["Pterosaurs were flying reptiles, not dinosaurs, but lived alongside them.",
              "They had hollow bones and wing membranes stretched between their elongated fourth fingers and bodies.",
              "Their diet varied by species but included fish, insects, and small land animals.",
              "Pterosaurs were the first vertebrates to evolve powered flight."]
    },
    dino_eggs: {
      name: "Dinosaur Eggs",
      description: "Unguarded eggs that provide easy nutrition.",
      size: 0,
      fierceness: 0,
      agility: 0,
      energy: 5,
      nutrition: 15,
      minGrowthToHunt: 1,
      maxGrowthToHide: 4,
      dangerLevel: 0,
      category: "tiny",
      habitat: ["plains", "forest", "grassland", "cliff"],
      facts: ["Many dinosaur species laid eggs, often in ground nests.",
              "Unguarded nests were vulnerable to predators looking for an easy meal.",
              "Egg predation likely led to the evolution of parental care in some dinosaur species.",
              "Allosaurus and other predators would have readily fed on eggs when they found them."]
    },
    mammal: {
      name: "Primitive Mammal",
      description: "Small furry creature active at night.",
      size: 0,
      fierceness: 15,
      agility: 90,
      energy: 20,
      nutrition: 12,
      minGrowthToHunt: 1,
      maxGrowthToHide: 3,
      dangerLevel: 0,
      category: "tiny",
      habitat: ["forest", "grassland"],
      facts: ["Mammals during the Jurassic were mostly small and nocturnal.",
              "Many early mammals resembled modern shrews or rats.",
              "They likely ate insects, plants, and occasionally small reptiles.",
              "These early mammals were the ancestors of all modern mammal species."]
    },
    compsognathus: {
      name: "Compsognathus",
      description: "Tiny, fast-moving predator.",
      size: 0,
      fierceness: 30,
      agility: 95,
      energy: 30,
      nutrition: 15,
      minGrowthToHunt: 2,
      maxGrowthToHide: 2,
      dangerLevel: 1,
      category: "small",
      habitat: ["plains", "forest", "grassland"],
      facts: ["Compsognathus was one of the smallest known dinosaurs, about the size of a chicken.",
              "It was a fast, agile predator that hunted small reptiles and mammals.",
              "Fossils show it had excellent eyesight for hunting.",
              "Its name means 'elegant jaw' referring to its delicate skull structure."]
    },
    fish: {
      name: "Jurassic Fish",
      description: "Aquatic prey animal found in water sources.",
      size: 0,
      fierceness: 5,
      agility: 90,
      energy: 20,
      nutrition: 15,
      minGrowthToHunt: 1,
      maxGrowthToHide: 3, 
      dangerLevel: 0,
      category: "aquatic",
      habitat: ["riverbank", "lake"],
      facts: ["The Jurassic period had a diverse array of fish species.",
              "Many were similar to modern rays, sharks, and bony fish.",
              "They served as an important food source for semi-aquatic predators.",
              "Some grew to enormous sizes in the prehistoric oceans."]
    },
    crocodilian: {
      name: "Primitive Crocodilian",
      description: "Ambush predator lurking near water.",
      size: 2,
      fierceness: 70,
      agility: 40,
      energy: 60,
      nutrition: 40,
      minGrowthToHunt: 3,
      maxGrowthToHide: 1,
      dangerLevel: 3,
      category: "medium",
      habitat: ["riverbank", "marsh", "lake"],
      facts: ["Early crocodilians were more terrestrial than their modern descendants.",
              "They were important predators in aquatic and semi-aquatic environments.",
              "Some species could reach lengths of 3-4 meters.",
              "They used ambush tactics to catch prey coming to drink at water sources."]
    }
  };
  
  // Define the growthStage names and requirements
  const growthStages = [
    { name: "Hatchling", weightRequired: 0, description: "You've just hatched. Stay close to your mother for protection." },
    { name: "Juvenile", weightRequired: 100, description: "You're growing and can hunt small prey on your own." },
    { name: "Subadult", weightRequired: 250, description: "You're nearly full-grown and can tackle larger prey." },
    { name: "Adult", weightRequired: 450, description: "You're a mature dinosaur, a fearsome predator of the Jurassic." }
  ];
  
  // Helper function: axial to pixel coordinates for hexagonal grid
  const axialToPixel = (q, r) => {
    const size = 32; // hex size in pixels
    const x = size * (3/2 * q);
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  };
  
  // Helper function: get all adjacent hex coordinates
  const getAdjacentHexes = (q, r) => {
    return [
      { q: q+1, r: r-1 }, // NE
      { q: q+1, r: r },   // E
      { q: q, r: r+1 },   // SE
      { q: q-1, r: r+1 }, // SW
      { q: q-1, r: r },   // W
      { q: q, r: r-1 }    // NW
    ];
  };
  
  // Helper function: calculate distance between two hex coordinates
  const hexDistance = (q1, r1, q2, r2) => {
    return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
  };
  
  // Helper function: check if hex coordinates are valid (within map)
  const isValidHex = (q, r) => {
    return hexDistance(0, 0, q, r) <= mapRadius;
  };
  
  // Initialize the game
  const initializeGame = () => {
    if (!selectedDinosaur) {
      setSelectedDinosaur(dinosaurSpecies.allosaurus); // Default to Allosaurus if none selected
    }
    
    // Initialize hexagonal map
    const newMap = createHexagonalMap();
    
    // Set starting position
    const startQ = 0;
    const startR = 0;
    
    // Place nests and important features
    placeTerrainFeatures(newMap);
    
    // Place creatures
    placeCreatures(newMap);
    
    // Place player at nest
    setPlayerPosition({ q: startQ, r: startR });
    
    // Place mother nearby if player is hatchling
    setMotherPosition({ q: startQ + 1, r: startR });
    
    // Set nest position
    setNestPosition({ q: startQ, r: startR });
    
    // Set initial visibility
    updateVisibility(newMap, { q: startQ, r: startR });
    
    // Initialize valid moves
    calculateValidMoves({ q: startQ, r: startR }, newMap);
    
    // Set map state
    setMap(newMap);
    
    // Initialize game state
    setGameStarted(true);
    setGameOver(false);
    setAge(1);
    setWeight(50);
    setFitness(100);
    setHunger(100);
    setThirst(100);
    setEnergy(100);
    setScore(0);
    setGrowthStage(1);
    setMovesLeft(20);
    setTurnCount(0);
    setPerks([]);
    setAvailablePerks(0);
    setInjuries([]);
    setHealthEvents([]);
    setSeason("spring");
    setWeather("clear");
    setTimeOfDay("day");
    
    // Set welcome message
    setCurrentMessage(`You've hatched from your egg as a ${selectedDinosaur.name}. Stay close to your mother for protection as you learn to hunt.`);
    
    // Show first fact
    setCurrentFact(selectedDinosaur.facts[0]);
    setShowFact(true);
  };
  
  // Create the hexagonal map
  const createHexagonalMap = () => {
    const newMap = {};
    
    // Create hexagons within radius
    for (let q = -mapRadius; q <= mapRadius; q++) {
      const r1 = Math.max(-mapRadius, -q - mapRadius);
      const r2 = Math.min(mapRadius, -q + mapRadius);
      
      for (let r = r1; r <= r2; r++) {
        const key = `${q},${r}`;
        newMap[key] = {
          q,
          r,
          type: 'plains', // Default type
          creatures: [],
          visited: false,
          visible: false
        };
      }
    }
    
    return newMap;
  };
  
  // Place terrain features on the map
  const placeTerrainFeatures = (newMap) => {
    // Place nest at center
    const nestKey = `0,0`;
    if (newMap[nestKey]) {
      newMap[nestKey].type = 'nest';
    }
    
    // Place a river running through the map
    const riverPath = [];
    let q = -mapRadius;
    let r = Math.floor(Math.random() * mapRadius) - Math.floor(mapRadius / 2);
    
    while (q <= mapRadius) {
      riverPath.push({ q, r });
      
      // River meanders randomly
      const direction = Math.floor(Math.random() * 3);
      if (direction === 0) r--;
      else if (direction === 1) r++;
      
      q++;
    }
    
    // Place river and adjacents as riverbank
    riverPath.forEach(({ q, r }) => {
      const key = `${q},${r}`;
      if (newMap[key]) {
        newMap[key].type = 'lake'; // Main river is lake
        
        // Adjacent hexes are riverbank
        getAdjacentHexes(q, r).forEach(adj => {
          const adjKey = `${adj.q},${adj.r}`;
          if (newMap[adjKey] && newMap[adjKey].type !== 'lake' && newMap[adjKey].type !== 'nest') {
            newMap[adjKey].type = 'riverbank';
          }
        });
      }
    });
    
    // Place forest patches
    placeTerrain(newMap, 'forest', 3, 5);
    
    // Place grasslands
    placeTerrain(newMap, 'grassland', 2, 4);
    
    // Place marsh areas near water
    placeTerrain(newMap, 'marsh', 2, 3, 'riverbank');
    
    // Place rocky areas
    placeTerrain(newMap, 'rocky', 2, 3);
    
    // Place cliff faces
    placeTerrain(newMap, 'cliff', 1, 2);
    
    // Place volcanic area (small)
    placeTerrain(newMap, 'volcanic', 1, 1);
    
    return newMap;
  };
  
  // Helper function to place terrain in patches
  const placeTerrain = (newMap, terrainType, count, size, adjacentTo = null) => {
    for (let i = 0; i < count; i++) {
      // Find a valid starting point
      let startQ, startR;
      let validStart = false;
      let attempts = 0;
      
      while (!validStart && attempts < 50) {
        if (adjacentTo) {
          // Find a hex of the adjacent type
          const adjacentHexes = Object.values(newMap).filter(hex => hex.type === adjacentTo);
          if (adjacentHexes.length > 0) {
            const randomHex = adjacentHexes[Math.floor(Math.random() * adjacentHexes.length)];
            startQ = randomHex.q;
            startR = randomHex.r;
            validStart = true;
          }
        } else {
          // Random position within map
          startQ = Math.floor(Math.random() * (2 * mapRadius)) - mapRadius;
          startR = Math.floor(Math.random() * (2 * mapRadius)) - mapRadius;
          
          const key = `${startQ},${startR}`;
          if (newMap[key] && newMap[key].type === 'plains') {
            validStart = true;
          }
        }
        
        attempts++;
      }
      
      if (!validStart) continue;
      
      // Create a patch of terrain around the starting point
      const queue = [{ q: startQ, r: startR, distance: 0 }];
      const visited = new Set();
      
      while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.q},${current.r}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Set terrain type if it's not nest or water
        if (newMap[key] && 
            newMap[key].type !== 'nest' && 
            newMap[key].type !== 'lake' && 
            (newMap[key].type !== 'riverbank' || terrainType === 'marsh')) {
          newMap[key].type = terrainType;
        }
        
        // Add adjacent hexes to queue if within size limit
        if (current.distance < size) {
          getAdjacentHexes(current.q, current.r).forEach(adj => {
            const adjKey = `${adj.q},${adj.r}`;
            if (newMap[adjKey] && !visited.has(adjKey)) {
              // Add some randomness to patch growth
              if (Math.random() < 0.7) {
                queue.push({ q: adj.q, r: adj.r, distance: current.distance + 1 });
              }
            }
          });
        }
      }
    }
  };
  
  // Place creatures on the map
  const placeCreatures = (newMap) => {
    // Helper function to place a creature in a suitable habitat
    const placeCreatureInHabitat = (type, count = 1) => {
      const creatureInfo = creatureTypes[type];
      const suitableHabitats = creatureInfo.habitat;
      
      for (let i = 0; i < count; i++) {
        // Find hexes with suitable habitat
        const suitableHexes = Object.values(newMap).filter(hex => 
          suitableHabitats.includes(hex.type) && 
          hex.type !== 'nest' && 
          hexDistance(0, 0, hex.q, hex.r) > 2 // Not too close to nest
        );
        
        if (suitableHexes.length > 0) {
          const randomHex = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];
          const key = `${randomHex.q},${randomHex.r}`;
          
          newMap[key].creatures.push({
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type
          });
        }
      }
    };
    
    // Place mother at nest
    const nestKey = `0,0`;
    newMap[nestKey].creatures.push({
      id: 'mother',
      type: 'mothersaur'
    });
    
    // Place tiny creatures (hatchling food)
    placeCreatureInHabitat('centipede', 8);
    placeCreatureInHabitat('lizard', 10);
    placeCreatureInHabitat('dragonfly', 8);
    placeCreatureInHabitat('dino_eggs', 5);
    placeCreatureInHabitat('mammal', 6);
    
    // Place small dinosaurs (juvenile food)
    placeCreatureInHabitat('dryosaurus', 6);
    placeCreatureInHabitat('ornitholestes', 4);
    placeCreatureInHabitat('compsognathus', 5);
    placeCreatureInHabitat('pterosaur', 3);
    
    // Place medium creatures
    placeCreatureInHabitat('crocodilian', 3);
    
    // Place large creatures (adult food and threats)
    placeCreatureInHabitat('stegosaurus', 3);
    placeCreatureInHabitat('diplodocus', 2);
    placeCreatureInHabitat('brachiosaurus', 1);
    placeCreatureInHabitat('allosaurus', 2);
    placeCreatureInHabitat('ceratosaurus', 2);
    
    // Place aquatic creatures
    placeCreatureInHabitat('fish', 12);
  };
  
  // Update which hexes are visible to player
  const updateVisibility = (currentMap, position) => {
    const newVisibleTiles = [];
    let visibilityRadius = 2; // Base visibility radius
    
    // Add bonuses from perks
    const playerPerks = perks || [];
    playerPerks.forEach(perk => {
      const perkEffect = perkDefinitions[perk].effect();
      if (perkEffect.visibilityBonus) {
        visibilityRadius += perkEffect.visibilityBonus;
      }
    });
    
    // Adjust for time of day
    if (timeOfDay === 'night') {
      // Reduce visibility at night unless player has night vision
      const hasNightVision = playerPerks.some(perk => 
        perkDefinitions[perk].effect().nightVision
      );
      
      if (!hasNightVision) {
        visibilityRadius = Math.max(1, visibilityRadius - 1);
      }
    }
    
    // Adjust for weather
    const weatherEffect = weatherEffects[weather];
    if (weatherEffect && weatherEffect.visibilityBonus) {
      visibilityRadius = Math.max(1, visibilityRadius + weatherEffect.visibilityBonus);
    }
    
    // Mark visible hexes
    Object.keys(currentMap).forEach(key => {
      const [q, r] = key.split(',').map(Number);
      const distance = hexDistance(position.q, position.r, q, r);
      
      // If within visibility radius, mark as visible
      if (distance <= visibilityRadius) {
        newVisibleTiles.push({ q, r });
        currentMap[key].visible = true;
        currentMap[key].visited = true;
        
        // Add to revealed tiles (for persistence)
        setRevealedTiles(prev => ({
          ...prev,
          [key]: true
        }));
      }
    });
    
    setVisibleTiles(newVisibleTiles);
    
    // Calculate valid moves based on new visibility
    calculateValidMoves(position, currentMap);
  };
  
  // Calculate valid moves from current position
  const calculateValidMoves = (position, currentMap) => {
    const adjacentHexes = getAdjacentHexes(position.q, position.r);
    const validMovesList = [];
    
    adjacentHexes.forEach(hex => {
      const key = `${hex.q},${hex.r}`;
      if (currentMap[key]) {
        // Check if tile is passable
        const tileType = currentMap[key].type;
        const habitat = habitats[tileType];
        
        if (habitat) {
          // Check if this tile type is completely impassable for this growth stage
          // For example, hatchlings can't cross deep water
          let canPass = true;
          
          // Growth stage 1 (hatchling) can't cross lake
          if (growthStage === 1 && tileType === 'lake') {
            canPass = false;
          }
          
          if (canPass) {
            validMovesList.push(hex);
          }
        }
      }
    });
    
    setValidMoves(validMovesList);
  };
  
  // Handle movement and tile interaction
  const moveTo = (q, r) => {
    if (gameOver || movesLeft <= 0) return;
    
    // Check if move is valid (must be in validMoves)
    const isValidMove = validMoves.some(move => move.q === q && move.r === r);
    if (!isValidMove) return;
    
    // Get hex key
    const key = `${q},${r}`;
    const targetHex = map[key];
    
    if (!targetHex) return;
    
    // Calculate energy cost based on terrain
    const terrainType = targetHex.type;
    const habitat = habitats[terrainType];
    let energyCost = habitat ? habitat.movementCost : 1;
    
    // Apply perk effects to energy cost
    perks.forEach(perk => {
      const effect = perkDefinitions[perk].effect();
      
      // Energy conservation perk
      if (effect.energyConservation) {
        energyCost *= (1 - effect.energyConservation);
      }
      
      // Water movement perk for water terrains
      if (effect.waterMovement && (terrainType === 'lake' || terrainType === 'riverbank' || terrainType === 'marsh')) {
        energyCost *= (1 - effect.waterMovement);
      }
    });
    
    // Apply injury penalties to movement
    injuries.forEach(injury => {
      if (injury.effect.movementPenalty) {
        energyCost *= (1 + injury.effect.movementPenalty);
      }
    });
    
    // Apply weather effects to energy
    const currentWeather = weatherEffects[weather];
    if (currentWeather && currentWeather.energyEffect > 0) {
      energyCost *= (1 + currentWeather.energyEffect);
    }
    
    // Update position
    const newPosition = { q, r };
    setPlayerPosition(newPosition);
    
    // Deep copy the map
    const newMap = { ...map };
    
    // Check if this is a new area
    if (!targetHex.visited) {
      // Show habitat fact
      setCurrentFact(habitat.fact);
      setShowFact(true);
      
      // Add score for discovery
      setScore(score + 10);
      setCurrentMessage(`You've discovered ${habitat.name}!`);
    }
    
    // Handle encountering creatures
    handleCreatureEncounter(newMap, key, newPosition);
    
    // Handle terrain-specific effects
    handleTerrainEffects(habitat);
    
    // Update map with new state
    setMap(newMap);
    
    // Update visibility and valid moves
    updateVisibility(newMap, newPosition);
    
    // Consume a move and energy
    setMovesLeft(movesLeft - 1);
    setEnergy(Math.max(0, energy - energyCost));
    setTurnCount(turnCount + 1);
    
    // Apply hunger and thirst
    applyBasicNeeds();
    
    // Move mother toward player occasionally (if player is hatchling)
    if (growthStage === 1 && turnCount % 3 === 0) {
      moveMotherTowardPlayer();
    }
    
    // Heal terrain effects if at water
    if (habitat.waterSource) {
      setThirst(100); // Restore thirst at water
      
      // Add event to health log
      addHealthEvent("You drink from the water source, restoring your thirst.", "positive");
    }
    
    // Check for terrain hazards
    if (habitat.healthHazard && Math.random() < habitat.healthHazard) {
      // Determine injury type based on terrain
      let injuryType;
      
      if (terrainType === 'volcanic') {
        injuryType = 'burn';
        setFitness(Math.max(0, fitness - 10));
        setCurrentMessage("You're injured by hot volcanic gases! -10 fitness");
        
        // Add to health events
        addHealthEvent("You were injured by volcanic gases.", "negative");
      } else if (terrainType === 'cliff') {
        injuryType = 'leg_wound';
        setFitness(Math.max(0, fitness - 15));
        setCurrentMessage("You slip on the cliff face and hurt your leg! -15 fitness");
        
        // Add injury
        addInjury('leg_wound');
        
        // Add to health events
        addHealthEvent("You slipped on a cliff and injured your leg.", "negative");
      }
    }
    
    // Check for turn end
    if (movesLeft - 1 <= 0) {
      endTurn();
    }
    
    // Check for death from lack of energy
    if (energy <= 0) {
      setFitness(Math.max(0, fitness - 5));
      setCurrentMessage("You're exhausted! -5 fitness");
      
      // Add to health events
      addHealthEvent("You pushed yourself too hard and collapsed from exhaustion.", "negative");
      
      if (fitness <= 0) {
        setGameOver(true);
        setCurrentMessage("Game Over! You died from exhaustion.");
      }
    }
  };
  
  // Handle encountering creatures in a tile
  const handleCreatureEncounter = (newMap, hexKey, position) => {
    const creaturesInTile = newMap[hexKey].creatures;
    
    if (creaturesInTile.length > 0) {
      // For simplicity, just handle the first creature
      const creature = creaturesInTile[0];
      const creatureInfo = creatureTypes[creature.type];
      
      // If mother, show helpful message
      if (creature.type === 'mothersaur') {
        setCurrentMessage("Your mother keeps you safe from larger predators.");
        setFitness(Math.min(100, fitness + 5));
        
        // Add to health events
        addHealthEvent("Your mother's presence helped you recover some strength.", "positive");
      }
      // If it's potential prey, check if we can hunt it
      else if (creatureInfo.nutrition > 0 && creatureInfo.minGrowthToHunt <= growthStage) {
        setSelectedCreature({ ...creature, info: creatureInfo });
        setShowCreatureDetails(true);
      }
      // If we're too small to hunt it
      else if (creatureInfo.nutrition > 0 && creatureInfo.minGrowthToHunt > growthStage) {
        setCurrentMessage(`You spotted a ${creatureInfo.name} but you're too small to hunt it. You need to grow larger!`);
      }
      // If it's a dangerous predator
      else if (creatureInfo.dangerLevel >= 3 && growthStage < creatureInfo.maxGrowthToHide) {
        // Check if mother is in an adjacent tile for protection
        const motherNearby = isMotherNearby();
        
        if (motherNearby && growthStage === 1) {
          setCurrentMessage(`Your mother protects you from the ${creatureInfo.name}!`);
          
          // Add to health events
          addHealthEvent(`Your mother scared away a dangerous ${creatureInfo.name}.`, "positive");
        } else {
          // Take damage from predator
          const damage = Math.floor(creatureInfo.fierceness / 10);
          setFitness(Math.max(0, fitness - damage));
          setCurrentMessage(`A ${creatureInfo.name} attacks you! You lose ${damage} fitness.`);
          
          // Chance of injury from attack
          if (Math.random() < 0.3) {
            // Determine injury type
            const possibleInjuries = ['broken_rib', 'leg_wound', 'infection'];
            const randomInjury = possibleInjuries[Math.floor(Math.random() * possibleInjuries.length)];
            addInjury(randomInjury);
          }
          
          // Add to health events
          addHealthEvent(`You were attacked by a ${creatureInfo.name} and took damage.`, "negative");
          
          // Move the predator away
          const creatureIndex = newMap[hexKey].creatures.findIndex(c => c.id === creature.id);
          if (creatureIndex !== -1) {
            newMap[hexKey].creatures.splice(creatureIndex, 1);
            
            // Place it elsewhere
            const availableHexes = Object.keys(newMap).filter(key => {
              const [q, r] = key.split(',').map(Number);
              return hexDistance(position.q, position.r, q, r) > 5; // Far from player
            });
            
            if (availableHexes.length > 0) {
              const randomHex = availableHexes[Math.floor(Math.random() * availableHexes.length)];
              newMap[randomHex].creatures.push(creature);
            }
          }
          
          // Check for game over
          if (fitness - damage <= 0) {
            setGameOver(true);
            setCurrentMessage(`Game Over! You were killed by a ${creatureInfo.name}.`);
          }
        }
      }
    }
  };
  
  // Handle terrain-specific effects
  const handleTerrainEffects = (habitat) => {
    if (habitat.waterSource) {
      // Restore thirst at water sources
      setThirst(100);
    }
  };
  
  // Apply basic needs changes (hunger, thirst)
  const applyBasicNeeds = () => {
    // Base rates of hunger and thirst increase
    let hungerRate = 0.5;
    let thirstRate = 0.8;
    
    // Adjust for growth stage
    hungerRate *= (1 + (growthStage * 0.2)); // Larger dinosaurs get hungrier faster
    
    // Adjust for weather
    const currentWeather = weatherEffects[weather];
    if (currentWeather) {
      hungerRate *= (1 + currentWeather.hungerEffect);
      thirstRate *= (1 + currentWeather.thirstEffect);
    }
    
    // Adjust for perks
    perks.forEach(perk => {
      const effect = perkDefinitions[perk].effect();
      if (effect.energyConservation) {
        hungerRate *= (1 - effect.energyConservation * 0.5);
        thirstRate *= (1 - effect.energyConservation * 0.5);
      }
    });
    
    // Apply changes
    setHunger(Math.max(0, hunger - hungerRate));
    setThirst(Math.max(0, thirst - thirstRate));
    
    // Check for starvation/dehydration effects
    if (hunger <= 0) {
      const fitnessLoss = 2;
      setFitness(Math.max(0, fitness - fitnessLoss));
      
      // Add to health events if this is the first time hunger hits 0
      if (hunger > 0) {
        addHealthEvent("You're starving! Your fitness is being drained.", "negative");
      }
      
      if (fitness <= 0) {
        setGameOver(true);
        setCurrentMessage("Game Over! You died of starvation.");
      }
    }
    
    if (thirst <= 0) {
      const fitnessLoss = 3; // Dehydration is worse than hunger
      setFitness(Math.max(0, fitness - fitnessLoss));
      
      // Add to health events if this is the first time thirst hits 0
      if (thirst > 0) {
        addHealthEvent("You're severely dehydrated! Your fitness is being drained rapidly.", "negative");
      }
      
      if (fitness <= 0) {
        setGameOver(true);
        setCurrentMessage("Game Over! You died of dehydration.");
      }
    }
  };
  
  // Check if mother is nearby
  const isMotherNearby = () => {
    return hexDistance(playerPosition.q, playerPosition.r, motherPosition.q, motherPosition.r) <= 1;
  };
  
  // Move mother toward player
  const moveMotherTowardPlayer = () => {
    // Only if mother is not already adjacent
    if (isMotherNearby()) return;
    
    // Calculate shortest path toward player
    const motherQ = motherPosition.q;
    const motherR = motherPosition.r;
    const playerQ = playerPosition.q;
    const playerR = playerPosition.r;
    
    // All possible moves
    const possibleMoves = getAdjacentHexes(motherQ, motherR);
    
    // Sort by distance to player
    possibleMoves.sort((a, b) => {
      const distA = hexDistance(a.q, a.r, playerQ, playerR);
      const distB = hexDistance(b.q, b.r, playerQ, playerR);
      return distA - distB;
    });
    
    // Choose best move
    for (const move of possibleMoves) {
      const key = `${move.q},${move.r}`;
      if (map[key]) {
        // Update mother's position
        const newMap = { ...map };
        
        // Remove mother from current position
        const currentKey = `${motherQ},${motherR}`;
        const motherIndex = newMap[currentKey].creatures.findIndex(c => c.type === 'mothersaur');
        
        if (motherIndex !== -1) {
          const mother = newMap[currentKey].creatures.splice(motherIndex, 1)[0];
          
          // Add mother to new position
          newMap[key].creatures.push(mother);
          
          setMotherPosition({ q: move.q, r: move.r });
          setMap(newMap);
        }
        
        break;
      }
    }
  };
  
  // Handle creature interaction (hunting)
  const handleHunting = (success) => {
    if (!selectedCreature) return;
    
    const creature = selectedCreature;
    const creatureInfo = creature.info;
    setShowCreatureDetails(false);
    
    // Deep copy the map
    const newMap = { ...map };
    
    if (success) {
      // Calculate hunt success chance
      let successChance = calculateHuntingSuccess(creature);
      
      const huntSuccessful = Math.random() < successChance;
      
      if (huntSuccessful) {
        // Get hex key
        const hexKey = `${playerPosition.q},${playerPosition.r}`;
        
        // Remove creature from map
        const creatureIndex = newMap[hexKey].creatures.findIndex(c => c.id === creature.id);
        if (creatureIndex !== -1) {
          newMap[hexKey].creatures.splice(creatureIndex, 1);
        }
        
        // Calculate nutrition value with perk bonuses
        let nutritionValue = creatureInfo.nutrition;
        perks.forEach(perk => {
          const effect = perkDefinitions[perk].effect();
          if (effect.nutritionBonus) {
            nutritionValue *= (1 + effect.nutritionBonus);
          }
        });
        
        // Add nutrition and score
        setWeight(Math.min(1000, weight + nutritionValue));
        setHunger(Math.min(100, hunger + nutritionValue));
        setScore(score + (nutritionValue * 2));
        setCurrentMessage(`You successfully caught the ${creatureInfo.name}! +${Math.floor(nutritionValue)} nutrition`);
        
        // Add to health events
        addHealthEvent(`You successfully hunted a ${creatureInfo.name} and gained nutrition.`, "positive");
        
        // Check for growth stage change
        checkGrowthStage(weight + nutritionValue);
        
        // Spawn replacement creature elsewhere
        setTimeout(() => {
          spawnNewCreature(creature.type);
        }, 5000);
      } else {
        // Hunt failed
        setEnergy(Math.max(0, energy - 15));
        setCurrentMessage(`The ${creatureInfo.name} escaped! You lost 15 energy from the exertion.`);
        
        // Add to health events
        addHealthEvent(`You attempted to hunt a ${creatureInfo.name} but it escaped.`, "neutral");
        
        // Small chance of injury from failed hunt
        if (Math.random() < 0.1) {
          addInjury('sprained_claw');
        }
      }
    } else {
      // Player chose not to hunt
      setCurrentMessage(`You decided not to hunt the ${creatureInfo.name}.`);
    }
    
    setMap(newMap);
    setSelectedCreature(null);
  };
  
  // Calculate hunting success chance
  const calculateHuntingSuccess = (creature) => {
    const creatureInfo = creature.info;
    const hexKey = `${playerPosition.q},${playerPosition.r}`;
    const terrainType = map[hexKey].type;
    const habitat = habitats[terrainType];
    
    // Base success chance depends on dinosaur species
    let baseChance = 0.5;
    if (selectedDinosaur) {
      baseChance = selectedDinosaur.baseStats.hunting / 10;
    }
    
    // Adjust for creature difficulty
    const creatureDifficulty = (creatureInfo.agility + creatureInfo.fierceness) / 200;
    baseChance -= creatureDifficulty;
    
    // Adjust for growth stage vs creature size
    const sizeAdvantage = (growthStage / 4) - (creatureInfo.size / 5);
    baseChance += sizeAdvantage;
    
    // Adjust for terrain hunting modifier
    baseChance *= habitat.huntingModifier;
    
    // Adjust for energy level (tired hunters are less successful)
    const energyFactor = energy / 100;
    baseChance *= energyFactor;
    
    // Adjust for hunger (desperate hunters may be more aggressive)
    const hungerFactor = 1 + ((100 - hunger) / 200);
    baseChance *= hungerFactor;
    
    // Adjust for injuries
    injuries.forEach(injury => {
      if (injury.effect.huntingPenalty) {
        baseChance *= (1 - injury.effect.huntingPenalty);
      }
    });
    
    // Apply perk effects
    perks.forEach(perk => {
      const effect = perkDefinitions[perk].effect();
      
      // Ambush bonus in appropriate terrain
      if (effect.ambushBonus && habitat.ambushValue > 0.5) {
        baseChance += effect.ambushBonus;
      }
      
      // Water hunting bonus for aquatic prey
      if (effect.waterHunting && 
          (terrainType === 'lake' || terrainType === 'riverbank' || terrainType === 'marsh') &&
          creatureInfo.category === 'aquatic') {
        baseChance += effect.waterHunting;
      }
    });
    
    // Apply pack hunting bonus if that perk is active
    const hasPackHunting = perks.some(perk => perkDefinitions[perk].effect().packHunting);
    if (hasPackHunting && Math.random() < 0.15) {
      baseChance += 0.3; // Significant bonus when pack hunting activates
      
      // Add to health events
      addHealthEvent("Another Allosaurus joined your hunt, improving your chances!", "positive");
    }
    
    // Ensure chance stays within reasonable bounds
    return Math.min(0.95, Math.max(0.05, baseChance));
  };
  
  // Spawn a new creature of given type somewhere on the map
  const spawnNewCreature = (type) => {
    const newMap = { ...map };
    const creatureInfo = creatureTypes[type];
    
    if (!creatureInfo) return;
    
    // Find suitable habitat for this creature
    const suitableHabitats = creatureInfo.habitat;
    const suitableHexes = Object.entries(newMap).filter(([key, hex]) => {
      // Check if habitat is suitable
      if (!suitableHabitats.includes(hex.type)) return false;
      
      // Check if far enough from player
      const [q, r] = key.split(',').map(Number);
      return hexDistance(playerPosition.q, playerPosition.r, q, r) > 5;
    });
    
    if (suitableHexes.length > 0) {
      // Choose random suitable hex
      const [randomKey, randomHex] = suitableHexes[Math.floor(Math.random() * suitableHexes.length)];
      
      // Add creature
      newMap[randomKey].creatures.push({
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type
      });
      
      setMap(newMap);
    }
  };
  
  // Add an injury to the player
  const addInjury = (injuryType) => {
    const injury = injuryTypes[injuryType];
    
    if (injury) {
      // Create new injury instance
      const newInjury = {
        type: injuryType,
        name: injury.name,
        description: injury.description,
        effect: { ...injury.effect },
        healTime: injury.healTime,
        severity: injury.severity,
        progressive: injury.progressive || false,
        turnsRemaining: injury.healTime
      };
      
      // Add to injuries list
      setInjuries(prev => [...prev, newInjury]);
      
      // Show message
      setCurrentMessage(`You've sustained a ${injury.name}! This will affect your abilities until it heals.`);
      
      // Add to health events
      addHealthEvent(`You sustained a ${injury.name} injury.`, "negative");
    }
  };
  
  // Heal injuries over time
  const healInjuries = () => {
    if (injuries.length === 0) return;
    
    const updatedInjuries = injuries.map(injury => {
      // Reduce turns remaining
      const turnsRemaining = injury.turnsRemaining - 1;
      
      // If progressive injury, increase effects slightly
      if (injury.progressive && turnsRemaining > 0 && Math.random() < 0.2) {
        const worsenedEffect = { ...injury.effect };
        
        // Increase all penalties by 10%
        Object.keys(worsenedEffect).forEach(key => {
          worsenedEffect[key] *= 1.1;
        });
        
        // Add to health events
        addHealthEvent(`Your ${injury.name} has worsened!`, "negative");
        
        return { ...injury, effect: worsenedEffect, turnsRemaining };
      }
      
      return { ...injury, turnsRemaining };
    }).filter(injury => injury.turnsRemaining > 0);
    
    // Check for healed injuries
    const healedCount = injuries.length - updatedInjuries.length;
    if (healedCount > 0) {
      setCurrentMessage(`One of your injuries has healed!`);
      
      // Add to health events
      addHealthEvent("An injury has fully healed.", "positive");
    }
    
    setInjuries(updatedInjuries);
  };
  
  // Add an event to the health events log
  const addHealthEvent = (message, type = "neutral") => {
    const newEvent = {
      message,
      type,
      turn: turnCount
    };
    
    setHealthEvents(prev => [newEvent, ...prev]);
  };
  
  // Check if player has reached a new growth stage
  const checkGrowthStage = (currentWeight) => {
    for (let i = growthStages.length - 1; i >= 0; i--) {
      if (currentWeight >= growthStages[i].weightRequired && i + 1 > growthStage) {
        setGrowthStage(i + 1);
        setCurrentMessage(`You have grown into a ${growthStages[i].name} ${selectedDinosaur.name}! ${growthStages[i].description}`);
        
        // If growing to juvenile, mother leaves
        if (i + 1 === 2 && growthStage === 1) {
          removeMotherFromMap();
        }
        
        // Add score for growth
        setScore(score + 100);
        
        // Award perk point
        setAvailablePerks(prev => prev + 1);
        setShowPerkSelection(true);
        
        // Add to health events
        addHealthEvent(`You've grown to the ${growthStages[i].name} stage!`, "positive");
        
        break;
      }
    }
  };
  
  // Remove mother from map when player becomes juvenile
  const removeMotherFromMap = () => {
    const newMap = { ...map };
    
    // Find mother
    Object.entries(newMap).forEach(([key, hex]) => {
      const motherIndex = hex.creatures.findIndex(c => c.type === 'mothersaur');
      if (motherIndex !== -1) {
        hex.creatures.splice(motherIndex, 1);
      }
    });
    
    setMap(newMap);
    setCurrentMessage("Your mother has left. You are now on your own as a juvenile " + selectedDinosaur.name + ".");
    
    // Add to health events
    addHealthEvent("Your mother has left you to fend for yourself as you're now a juvenile.", "neutral");
  };
  
  // Select a perk
  const selectPerk = (perkId) => {
    if (availablePerks > 0) {
      // Add perk
      setPerks(prev => [...prev, perkId]);
      
      // Reduce available perks
      setAvailablePerks(prev => prev - 1);
      
      // Hide perk selection
      setShowPerkSelection(false);
      
      // Show message
      const perkName = perkDefinitions[perkId].name;
      setCurrentMessage(`You've developed a new ability: ${perkName}!`);
      
      // Add to health events
      addHealthEvent(`You've developed a new ability: ${perkName}!`, "positive");
    }
  };
  
  // End current turn and start a new one
  const endTurn = () => {
    // Update age if necessary (every 10 turns = 1 year)
    if (turnCount % 10 === 0 && turnCount > 0) {
      setAge(age + 1);
      
      // Add to health events
      addHealthEvent(`You've survived another year! You are now ${age + 1} years old.`, "positive");
    }
    
    // Process injuries
    healInjuries();
    
    // Reset moves for next turn
    setMovesLeft(20);
    
    // Move creatures
    moveCreatures();
    
    // Update weather occasionally
    if (Math.random() < 0.2) {
      updateWeather();
    }
    
    // Update season (every 40 turns = season change)
    if (turnCount % 40 === 0 && turnCount > 0) {
      updateSeason();
    }
    
    // Update time of day (every 5 turns)
    if (turnCount % 5 === 0) {
      updateTimeOfDay();
    }
    
    // Natural healing if resting and well-fed
    if (hunger > 70 && thirst > 70) {
      const healingAmount = 5;
      setFitness(Math.min(100, fitness + healingAmount));
      
      // Add to health events
      addHealthEvent("You rested and recovered some fitness.", "positive");
    }
    
    // Occasionally spawn new creatures
    if (Math.random() < 0.3) {
      // Determine what types to spawn based on season
      const currentSeason = seasonEffects[season];
      const spawnMultiplier = currentSeason ? currentSeason.preyMultiplier : 1.0;
      
      if (Math.random() < spawnMultiplier * 0.5) {
        const smallCreatures = ['centipede', 'lizard', 'dragonfly', 'dino_eggs', 'mammal', 'compsognathus'];
        const randomType = smallCreatures[Math.floor(Math.random() * smallCreatures.length)];
        spawnNewCreature(randomType);
      }
      
      if (Math.random() < spawnMultiplier * 0.3) {
        const mediumCreatures = ['dryosaurus', 'ornitholestes', 'pterosaur', 'crocodilian'];
        const randomType = mediumCreatures[Math.floor(Math.random() * mediumCreatures.length)];
        spawnNewCreature(randomType);
      }
      
      if (Math.random() < spawnMultiplier * 0.1) {
        const largeCreatures = ['stegosaurus', 'allosaurus', 'ceratosaurus'];
        const randomType = largeCreatures[Math.floor(Math.random() * largeCreatures.length)];
        spawnNewCreature(randomType);
      }
    }
  };
  
  // Update weather based on season
  const updateWeather = () => {
    const currentSeason = seasonEffects[season];
    let possibleWeather = ['clear', 'cloudy', 'rainy'];
    
    if (currentSeason && currentSeason.weatherPatterns) {
      possibleWeather = currentSeason.weatherPatterns;
    }
    
    const newWeather = possibleWeather[Math.floor(Math.random() * possibleWeather.length)];
    
    if (newWeather !== weather) {
      setWeather(newWeather);
      setCurrentMessage(`The weather has changed to ${weatherEffects[newWeather].name}.`);
      
      // Add to health events
      addHealthEvent(`The weather has changed to ${weatherEffects[newWeather].name}.`, "neutral");
    }
  };
  
  // Update season in cycle
  const updateSeason = () => {
    const seasonOrder = ['spring', 'summer', 'fall', 'winter'];
    const currentIndex = seasonOrder.indexOf(season);
    const nextIndex = (currentIndex + 1) % seasonOrder.length;
    const newSeason = seasonOrder[nextIndex];
    
    setSeason(newSeason);
    setCurrentMessage(`The season has changed to ${newSeason}.`);
    
    // Add to health events
    addHealthEvent(`The season has changed to ${newSeason}.`, "neutral");
    
    // Update weather to match new season
    updateWeather();
  };
  
  // Update time of day
  const updateTimeOfDay = () => {
    const newTimeOfDay = timeOfDay === 'day' ? 'night' : 'day';
    setTimeOfDay(newTimeOfDay);
    
    // Add to health events
    addHealthEvent(`It is now ${newTimeOfDay}time.`, "neutral");
  };
  
  // Move creatures randomly
  const moveCreatures = () => {
    const newMap = { ...map };
    
    // For each hex with creatures
    Object.entries(newMap).forEach(([key, hex]) => {
      if (hex.creatures.length === 0) return;
      
      const [q, r] = key.split(',').map(Number);
      
      // For each creature in the hex
      for (let i = hex.creatures.length - 1; i >= 0; i--) {
        const creature = hex.creatures[i];
        
        // Skip mother (handled separately)
        if (creature.type === 'mothersaur') continue;
        
        // Get creature info
        const creatureInfo = creatureTypes[creature.type];
        
        // Chance to move based on creature agility
        const moveChance = creatureInfo ? (creatureInfo.agility / 200) + 0.2 : 0.3;
        
        if (Math.random() < moveChance) {
          // Get adjacent hexes
          const adjacentHexes = getAdjacentHexes(q, r);
          
          // Filter to valid and suitable hexes
          const validHexes = adjacentHexes.filter(adj => {
            const adjKey = `${adj.q},${adj.r}`;
            
            // Must be in map
            if (!newMap[adjKey]) return false;
            
            // Check if habitat is suitable (if defined)
            if (creatureInfo && creatureInfo.habitat) {
              return creatureInfo.habitat.includes(newMap[adjKey].type);
            }
            
            return true;
          });
          
          if (validHexes.length > 0) {
            // Choose random valid hex
            const randomHex = validHexes[Math.floor(Math.random() * validHexes.length)];
            const newKey = `${randomHex.q},${randomHex.r}`;
            
            // Move creature
            newMap[newKey].creatures.push({ ...creature });
            hex.creatures.splice(i, 1);
          }
        }
      }
    });
    
    setMap(newMap);
  };
  
  // Render dinosaur selection screen
  const renderDinosaurSelection = () => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-3xl text-gray-200 border border-amber-600">
          <h2 className="text-xl font-bold text-amber-500 mb-4">Choose Your Dinosaur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(dinosaurSpecies).map(dino => (
              <div 
                key={dino.name}
                className={`border p-4 rounded-lg cursor-pointer transition-all ${
                  selectedDinosaur?.name === dino.name ? 'bg-amber-800 border-amber-500' : 'border-gray-600 hover:border-amber-500'
                }`}
                onClick={() => setSelectedDinosaur(dino)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">{dino.name}</h3>
                  <div className={`w-6 h-6 rounded-full ${dino.color}`}></div>
                </div>
                <p className="text-sm mb-3">{dino.description}</p>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div className="flex items-center">
                    <Compass className="mr-1 text-yellow-500" size={12} />
                    <span>Hunting: {dino.baseStats.hunting}</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="mr-1 text-blue-500" size={12} />
                    <span>Speed: {dino.baseStats.speed}</span>
                  </div>
                  <div className="flex items-center">
                    <Scale className="mr-1 text-red-500" size={12} />
                    <span>Strength: {dino.baseStats.strength}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 text-green-500" size={12} />
                    <span>Stamina: {dino.baseStats.stamina}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                setShowDinosaurSelection(false);
                initializeGame();
              }}
              disabled={!selectedDinosaur}
            >
              Start Game as {selectedDinosaur?.name || 'Selected Dinosaur'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render perk selection screen
  const renderPerkSelection = () => {
    if (!showPerkSelection) return null;
    
    // Filter out perks the player already has
    const availablePerksList = Object.entries(perkDefinitions)
      .filter(([perkId]) => !perks.includes(perkId))
      .map(([perkId, perk]) => ({ id: perkId, ...perk }));
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-3xl text-gray-200 border border-amber-600">
          <h2 className="text-xl font-bold text-amber-500 mb-4">Select a New Ability</h2>
          <p className="mb-4">You've earned a new ability point! Choose wisely to enhance your survival skills.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {availablePerksList.slice(0, 6).map(perk => (
              <div 
                key={perk.id}
                className="border border-gray-600 hover:border-amber-500 p-4 rounded-lg cursor-pointer transition-all"
                onClick={() => selectPerk(perk.id)}
              >
                <div className="flex items-center mb-2">
                  <div className="mr-2">{perk.icon}</div>
                  <h3 className="text-lg font-bold">{perk.name}</h3>
                </div>
                <p className="text-sm">{perk.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <button
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => setShowPerkSelection(false)}
            >
              Decide Later
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render creature details view
  const renderCreatureDetails = () => {
    if (!showCreatureDetails || !selectedCreature) return null;
    
    const creature = selectedCreature;
    const info = creature.info;
    
    // Calculate hunting success chance
    const successChance = calculateHuntingSuccess(creature);
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-amber-500">{info.name}</h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowCreatureDetails(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="mb-4">{info.description}</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex items-center">
              <Heart className="mr-1 text-red-500" size={16} />
              <span>Nutrition: {info.nutrition}</span>
            </div>
            <div className="flex items-center">
              <Award className="mr-1 text-yellow-500" size={16} />
              <span>Danger: {info.dangerLevel}/5</span>
            </div>
            <div className="flex items-center">
              <Zap className="mr-1 text-blue-500" size={16} />
              <span>Agility: {info.agility}</span>
            </div>
            <div className="flex items-center">
              <Scale className="mr-1 text-purple-500" size={16} />
              <span>Size: {info.size}/5</span>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm italic mb-2">Did you know?</p>
            <p className="text-sm">{info.facts[Math.floor(Math.random() * info.facts.length)]}</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg mb-4">
            <p className="text-center">Hunt success chance: {Math.round(successChance * 100)}%</p>
          </div>
          
          <div className="flex justify-between">
            <button
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleHunting(false)}
            >
              Leave It
            </button>
            <button
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleHunting(true)}
            >
              Hunt It
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render injury details view
  const renderInjuryDetails = () => {
    if (!showInjuryDetails) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-amber-500">Current Injuries</h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowInjuryDetails(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          {injuries.length === 0 ? (
            <p className="text-center">You have no injuries. Stay healthy!</p>
          ) : (
            <div className="space-y-4">
              {injuries.map((injury, index) => (
                <div key={index} className={`p-3 rounded-lg ${injury.severity > 3 ? 'bg-red-900' : injury.severity > 1 ? 'bg-amber-900' : 'bg-gray-700'}`}>
                  <h3 className="font-bold mb-1">{injury.name}</h3>
                  <p className="text-sm mb-2">{injury.description}</p>
                  <div className="text-xs flex justify-between">
                    <span>Severity: {injury.severity}/5</span>
                    <span>Healing in: {injury.turnsRemaining} turns</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render stats details view
  const renderStatsDetails = () => {
    if (!showStatsDetails) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-amber-500">Dinosaur Stats</h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowStatsDetails(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-bold text-sm mb-1">Basic Info</h3>
              <p className="text-sm">Species: {selectedDinosaur?.name || 'Allosaurus'}</p>
              <p className="text-sm">Age: {age} years</p>
              <p className="text-sm">Growth Stage: {growthStages[growthStage-1]?.name || 'Unknown'}</p>
              <p className="text-sm">Weight: {weight} kg</p>
            </div>
            
            <div>
              <h3 className="font-bold text-sm mb-1">Environment</h3>
              <p className="text-sm">Season: {seasonEffects[season]?.name || season}</p>
              <p className="text-sm">Weather: {weatherEffects[weather]?.name || weather}</p>
              <p className="text-sm">Time: {timeOfDay === 'day' ? 'Daytime' : 'Night'}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-2">Abilities</h3>
            {perks.length === 0 ? (
              <p className="text-sm italic">No special abilities yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {perks.map(perkId => (
                  <div key={perkId} className="flex items-center">
                    <div className="mr-1">{perkDefinitions[perkId].icon}</div>
                    <span className="text-sm">{perkDefinitions[perkId].name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <p className="text-center font-bold">Total Score: {score}</p>
        </div>
      </div>
    );
  };
  
  // Render event log
  const renderEventLog = () => {
    if (!showEventLog) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600" style={{maxHeight: '80vh', overflowY: 'auto'}}>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-amber-500">Event Log</h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowEventLog(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          {healthEvents.length === 0 ? (
            <p className="text-center">No events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {healthEvents.map((event, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-sm ${
                    event.type === 'positive' ? 'bg-green-900' : 
                    event.type === 'negative' ? 'bg-red-900' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{event.message}</span>
                    <span className="text-xs text-gray-400">Turn {event.turn}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render tutorial
  const renderTutorial = () => {
    if (!showTutorial) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
        <div className="bg-gray-800 p-6 rounded-lg max-w-3xl text-gray-200 border border-amber-600" style={{maxHeight: '80vh', overflowY: 'auto'}}>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-amber-500">How to Play</h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowTutorial(false)}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-1">Game Goal</h3>
              <p>Survive and grow from a hatchling to an adult Allosaurus in the dangerous Jurassic world.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Movement</h3>
              <p>Click on adjacent hexes to move. Different terrain types cost different amounts of energy to traverse.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Hunting</h3>
              <p>You'll encounter various creatures you can hunt for food. Your success chance depends on your size, the creature's characteristics, and your abilities.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Growth</h3>
              <p>As you eat and survive, you'll grow through four stages: Hatchling, Juvenile, Subadult, and Adult.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Basic Needs</h3>
              <p>Monitor your hunger, thirst, and energy. If any reach zero, your fitness will decrease, potentially leading to death.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Weather & Time</h3>
              <p>The game includes a dynamic weather system and day/night cycle that affect gameplay.</p>
            </div>
            
            <div>
              <h3 className="font-bold mb-1">Abilities</h3>
              <p>When you reach new growth stages, you'll earn special abilities to help you survive.</p>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setShowTutorial(false)}
            >
              Start Playing
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render dinosaur fact
  const renderFact = () => {
    if (!showFact) return null;
    
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-gray-900 border border-amber-600 rounded-lg p-4 z-40">
        <div className="flex items-start">
          <Info className="text-amber-500 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm text-amber-500 font-bold mb-1">Dinosaur Fact</p>
            <p className="text-white text-sm">{currentFact}</p>
          </div>
          <button 
            className="ml-3 text-gray-400 hover:text-white flex-shrink-0"
            onClick={() => setShowFact(false)}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };
  
  // Main game render function
  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen relative`}>
      {/* Game title */}
      <div className="p-4 bg-amber-900 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Big Al: Jurassic Survival</h1>
          <div className="space-x-2">
            <button 
              className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700"
              onClick={() => setShowTutorial(true)}
            >
              How to Play
            </button>
          </div>
        </div>
      </div>
      
      {/* Game container */}
      <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
        {/* Game board */}
        <div className="flex-1 flex flex-col items-center">
          {/* Game message */}
          <div className="bg-gray-800 p-3 rounded-lg w-full mb-4">
            <p>{currentMessage}</p>
          </div>
          
          {/* Game map */}
          <div className="relative w-full overflow-auto p-4 bg-gray-800 rounded-lg" style={{height: '500px'}}>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {/* Hex grid */}
              <div className="relative">
                {Object.values(map).map(hex => {
                  const { q, r, type, visible, creatures } = hex;
                  const { x, y } = axialToPixel(q, r);
                  const habitat = habitats[type];
                  
                  // Check if player can move here
                  const canMove = validMoves.some(move => move.q === q && move.r === r);
                  
                  // Check if this is player position
                  const isPlayer = playerPosition.q === q && playerPosition.r === r;
                  
                  // Check if this is mother position
                  const isMother = motherPosition.q === q && motherPosition.r === r;
                  
                  // Check if hex is revealed (for fog of war)
                  const isRevealed = revealedTiles[`${q},${r}`] || visible;
                  
                  return (
                    <div
                      key={`${q},${r}`}
                      className={`absolute hexagon ${habitat?.color || 'bg-gray-700'} ${
                        isRevealed ? 'opacity-100' : 'opacity-20'
                      } ${canMove ? 'cursor-pointer ring-2 ring-white ring-opacity-60' : ''}`}
                      style={{
                        left: x + 'px',
                        top: y + 'px',
                      }}
                      onClick={() => canMove ? moveTo(q, r) : setSelectedTile({ q, r })}
                    >
                      {/* Show player */}
                      {isPlayer && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-5 h-5 rounded-full ${darkMode ? 'bg-amber-500' : 'bg-amber-600'} border-2 border-white z-10`}></div>
                        </div>
                      )}
                      
                      {/* Show mother */}
                      {isMother && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-orange-700 border-2 border-white z-10"></div>
                        </div>
                      )}
                      
                      {/* Show creatures */}
                      {isRevealed && creatures.length > 0 && !isPlayer && !isMother && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 z-10"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Game controls */}
          <div className="w-full flex justify-between items-center mt-2">
            <button
              className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg"
              onClick={endTurn}
              disabled={gameOver}
            >
              End Turn ({movesLeft} moves left)
            </button>
          </div>
        </div>
        
        {/* Game stats panel */}
        <div className="w-full md:w-64 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-amber-500 mb-4">Stats</h2>
          
          {/* Basic stats */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between mb-1">
                <span>Growth</span>
                <span>{growthStages[growthStage-1]?.name || 'Hatchling'}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${(weight / growthStages[growthStage >= growthStages.length ? growthStage - 1 : growthStage].weightRequired) * 100}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Fitness</span>
                <span>{fitness}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${fitness}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Hunger</span>
                <span>{Math.floor(hunger)}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full" style={{ width: `${hunger}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Thirst</span>
                <span>{Math.floor(thirst)}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${thirst}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Energy</span>
                <span>{Math.floor(energy)}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${energy}%` }}></div>
              </div>
            </div>
          </div>
          
          {/* Environment info */}
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-2">Environment</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              <div className="flex items-center">
                <Sun className="mr-1 text-amber-500" size={16} />
                <span>{seasonEffects[season]?.name || season}</span>
              </div>
              <div className="flex items-center">
                <Wind className="mr-1 text-blue-300" size={16} />
                <span>{weatherEffects[weather]?.name || weather}</span>
              </div>
              <div className="flex items-center">
                {timeOfDay === 'day' ? 
                  <Sun className="mr-1 text-yellow-500" size={16} /> :
                  <Moon className="mr-1 text-gray-300" size={16} />
                }
                <span>{timeOfDay === 'day' ? 'Daytime' : 'Night'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 text-green-500" size={16} />
                <span>Year {age}</span>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-2">
            <button 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={() => setShowStatsDetails(true)}
            >
              <Info className="mr-2" size={16} />
              <span>Full Stats</span>
            </button>
            
            <button 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={() => setShowInjuryDetails(true)}
            >
              <AlertCircle className="mr-2" size={16} />
              <span>Injuries ({injuries.length})</span>
            </button>
            
            <button 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={() => setShowEventLog(true)}
            >
              <Clock className="mr-2" size={16} />
              <span>Event Log</span>
            </button>
            
            {availablePerks > 0 && (
              <button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded flex items-center justify-center animate-pulse"
                onClick={() => setShowPerkSelection(true)}
              >
                <Award className="mr-2" size={16} />
                <span>Select Ability! ({availablePerks})</span>
              </button>
            )}
          </div>
          
          {/* Score */}
          <div className="mt-6 text-center">
            <p className="text-sm">Score</p>
            <p className="text-xl font-bold text-amber-500">{score}</p>
          </div>
        </div>
      </div>
      
      {/* Start screen */}
      {!gameStarted && !showDinosaurSelection && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="bg-gray-800 p-8 rounded-lg max-w-lg text-center text-gray-200 border border-amber-600">
            <h1 className="text-4xl font-bold text-amber-500 mb-6">Big Al: Jurassic Survival</h1>
            <p className="mb-6">Experience life as an Allosaurus during the Late Jurassic period. Survive, hunt, and grow from a hatchling to a fearsome adult predator.</p>
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              onClick={() => setShowDinosaurSelection(true)}
            >
              Start Game
            </button>
          </div>
        </div>
      )}
      
      {/* Game over screen */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="bg-gray-800 p-8 rounded-lg max-w-lg text-center text-gray-200 border border-amber-600">
            <h1 className="text-4xl font-bold text-amber-500 mb-4">Game Over</h1>
            <p className="mb-4">{currentMessage}</p>
            <p className="mb-6">You survived for {age} years and reached the {growthStages[growthStage-1]?.name || 'Hatchling'} stage.</p>
            <p className="text-xl mb-6">Final Score: <span className="text-amber-500 font-bold">{score}</span></p>
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              onClick={() => {
                setGameOver(false);
                setGameStarted(false);
                setShowDinosaurSelection(true);
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
      
      {/* Conditional renders */}
      {showDinosaurSelection && renderDinosaurSelection()}
      {renderPerkSelection()}
      {renderCreatureDetails()}
      {renderInjuryDetails()}
      {renderStatsDetails()}
      {renderEventLog()}
      {renderTutorial()}
      {renderFact()}
    </div>
  );
};

export default BigAlGame;