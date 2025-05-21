// hooks/useGame.ts
import { useState, useEffect } from 'react';
import {
    getAdjacentHexes,
    hexDistance,
    isValidHex
} from '../utils/hexGrid';
import { habitats } from '../utils/terrain';
import { creatureTypes, dinosaurSpecies } from '../utils/creatures';
import { weatherEffects, seasonEffects } from '../utils/weather';
import { injuryTypes, perkDefinitions, growthStages} from '../utils/gameData';
import { HexCoord, Creature, GameMap, HealthEvent } from '../types';
import {
    updateCreatureBehavior as updateAI,
    AIContext
} from '../utils/creatureAI';
import {
    handlePredatorEncounter,
    detectNearbyPredators,
    createPredatorWarning,
    PredatorEncounterContext
} from '../utils/predatorDanger';


export const useGame = () => {
    // Game States
    const [stealthLevel, setStealthLevel] = useState(0); // 0-100

    const [territoryHexes, setTerritoryHexes] = useState({});
    const [territoryCenter, setTerritoryCenter] = useState(null);

    const [predatorWarning, setPredatorWarning] = useState(null);
    const [nearbyPredators, setNearbyPredators] = useState([]);


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




    const mapRadius = 10;

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

    // Initialize the game
    const initializeGame = () => {
        const dinosaur = selectedDinosaur || dinosaurSpecies.allosaurus;
        if (!selectedDinosaur) {
            setSelectedDinosaur(dinosaur);
        }

        // Initialize hexagonal map
        const newMap = createHexagonalMap();
        console.log("Created map with tile count:", Object.keys(newMap).length);
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
        setCurrentMessage(`You've hatched from your egg as a ${dinosaur.name}. Stay close to your mother for protection as you learn to hunt.`);

        // Show first fact
        setCurrentFact(dinosaur.facts[0]);
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

    // Function to claim territory
    const claimTerritory = () => {
        // Can only claim territory as adult
        if (growthStage < 3) {
            setCurrentMessage("You're too young to claim territory. Grow larger first!");
            return;
        }

        // Energy cost to claim territory
        if (energy < 30) {
            setCurrentMessage("You're too tired to claim territory now.");
            return;
        }

        setEnergy(Math.max(0, energy - 30));

        // Set territory center to current position
        setTerritoryCenter(playerPosition);

        // Claim territory in radius around player
        const territoryRadius = 3;
        const newTerritory = { ...territoryHexes };

        // Mark all hexes within radius as territory
        Object.entries(map).forEach(([key, hex]) => {
            const [q, r] = key.split(',').map(Number);
            const distance = hexDistance(playerPosition.q, playerPosition.r, q, r);

            if (distance <= territoryRadius) {
                newTerritory[key] = {
                    claimed: turnCount,
                    scent: 100
                };
            }
        });

        setTerritoryHexes(newTerritory);
        setCurrentMessage("You've claimed this area as your territory! Other predators will be more cautious here.");
        addHealthEvent("You've claimed territory in this area.", "positive");

        // Add to score
        setScore(score + 50);
    };

    const maintainTerritory = () => {
        if (!territoryCenter) return;

        // Energy cost
        if (energy < 10) {
            setCurrentMessage("You're too tired to mark your territory now.");
            return;
        }

        setEnergy(Math.max(0, energy - 10));

        // Refresh scent in current hex and adjacent
        const currentHex = `${playerPosition.q},${playerPosition.r}`;
        const adjacentHexes = getAdjacentHexes(playerPosition.q, playerPosition.r);

        const newTerritory = { ...territoryHexes };

        // Update current hex
        if (newTerritory[currentHex]) {
            newTerritory[currentHex].scent = 100;
        } else {
            newTerritory[currentHex] = {
                claimed: turnCount,
                scent: 100
            };
        }

        // Update adjacent hexes
        adjacentHexes.forEach(hex => {
            const hexKey = `${hex.q},${hex.r}`;
            if (newTerritory[hexKey]) {
                newTerritory[hexKey].scent = 100;
            }
        });

        setTerritoryHexes(newTerritory);
        setCurrentMessage("You mark your territory, refreshing your scent in the area.");
    };

    const getTerritoryStrength = (q, r) => {
        const hexKey = `${q},${r}`;
        if (territoryHexes[hexKey]) {
            return territoryHexes[hexKey].scent / 100; // 0-1 strength
        }
        return 0;
    };



    const updateTerritory = () => {
        if (Object.keys(territoryHexes).length === 0) return;

        const newTerritory = { ...territoryHexes };

        // Reduce scent strength in all territory hexes
        Object.keys(newTerritory).forEach(key => {
            newTerritory[key].scent = Math.max(0, newTerritory[key].scent - 2);

            // Remove from territory if scent is gone
            if (newTerritory[key].scent <= 0) {
                delete newTerritory[key];
            }
        });

        setTerritoryHexes(newTerritory);

        // Territory effects - reduce predator spawn chance in territory
        // This would be integrated with your existing creature spawn logic
    };

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


    const updateCreatureBehavior = () => {
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
                if (!creatureInfo) continue;

                // Determine creature behavior based on various factors
                let behavior = 'idle'; // Default behavior

                // Check distance to player
                const distanceToPlayer = hexDistance(q, r, playerPosition.q, playerPosition.r);

                // Check if creature is prey or predator relative to player
                const isPrey = creatureInfo.minGrowthToHunt <= growthStage;
                const isPredator = creatureInfo.dangerLevel >= 3 && growthStage <= creatureInfo.maxGrowthToHide;

                // Get territory strength in this hex
                const territoryStrength = getTerritoryStrength(q, r);

                // Determine behavior
                if (isPrey && distanceToPlayer <= 2) {
                    // Prey near player
                    const awarenessChance = 0.3 + (0.7 * (1 - (stealthLevel / 100)));

                    if (Math.random() < awarenessChance) {
                        behavior = 'flee'; // Flee from player
                    }
                }
                else if (isPredator && distanceToPlayer <= 3) {
                    // Predator near player

                    // Predators respect territory
                    const territoryRespect = Math.min(0.8, territoryStrength);

                    if (Math.random() < territoryRespect) {
                        behavior = 'avoid'; // Avoid player's territory
                    } else if (Math.random() < 0.4) {
                        behavior = 'hunt'; // Hunt player
                    }
                }
                else {
                    // Normal behavior
                    const moveChance = 0.5 + (creatureInfo.agility / 200);

                    if (Math.random() < moveChance) {
                        behavior = 'wander';
                    }

                    // Herding behavior for herbivores
                    if (creatureInfo.category === 'large' && !isPredator) {
                        // Check for nearby herd members
                        const nearbyHexes = [];
                        for (let adjQ = q - 2; adjQ <= q + 2; adjQ++) {
                            for (let adjR = r - 2; adjR <= r + 2; adjR++) {
                                if (adjQ === q && adjR === r) continue;

                                const adjKey = `${adjQ},${adjR}`;
                                if (newMap[adjKey]) {
                                    nearbyHexes.push({ key: adjKey, q: adjQ, r: adjR, hex: newMap[adjKey] });
                                }
                            }
                        }

                        // Find hexes with same species
                        const herdHexes = nearbyHexes.filter(adj => {
                            return adj.hex.creatures.some(c => c.type === creature.type);
                        });

                        if (herdHexes.length > 0) {
                            // Move toward herd
                            behavior = 'herd';
                        }
                    }
                }

                // Execute behavior
                switch (behavior) {
                    case 'flee':
                        // Move away from player
                        moveCreatureAwayFrom(newMap, creature, key, playerPosition.q, playerPosition.r);
                        break;

                    case 'hunt':
                        // Move toward player
                        moveCreatureToward(newMap, creature, key, playerPosition.q, playerPosition.r);
                        break;

                    case 'avoid':
                        // Move away from territory
                        if (territoryCenter) {
                            moveCreatureAwayFrom(newMap, creature, key, territoryCenter.q, territoryCenter.r);
                        }
                        break;

                    case 'wander':
                        // Random movement (already implemented in your moveCreatures function)
                        moveCreatureRandomly(newMap, creature, key);
                        break;

                    case 'herd':
                        // Herding behavior - find average position of herd and move toward it
                        moveCreatureWithHerd(newMap, creature, key);
                        break;

                    case 'idle':
                    default:
                        // Do nothing
                        break;
                }
            }
        });

        setMap(newMap);
    };

    const moveCreatureAwayFrom = (newMap, creature, currentKey, targetQ, targetR) => {
        const [q, r] = currentKey.split(',').map(Number);

        // Get adjacent hexes
        const adjacentHexes = getAdjacentHexes(q, r);

        // Sort by distance FROM target (descending)
        adjacentHexes.sort((a, b) => {
            const distA = hexDistance(a.q, a.r, targetQ, targetR);
            const distB = hexDistance(b.q, b.r, targetQ, targetR);
            return distB - distA; // Reverse sort to move away
        });

        // Choose valid hex with highest distance from target
        for (const hex of adjacentHexes) {
            const newKey = `${hex.q},${hex.r}`;

            if (newMap[newKey] && isTerrainSuitableForCreature(newMap[newKey].type, creature.type)) {
                // Move creature
                const creatureIndex = newMap[currentKey].creatures.findIndex(c => c.id === creature.id);

                if (creatureIndex !== -1) {
                    // Remove from current hex
                    const movedCreature = newMap[currentKey].creatures.splice(creatureIndex, 1)[0];

                    // Add to new hex
                    newMap[newKey].creatures.push(movedCreature);
                    break;
                }
            }
        }
    };

    const moveCreatureToward = (newMap, creature, currentKey, targetQ, targetR) => {
        const [q, r] = currentKey.split(',').map(Number);

        // Get adjacent hexes
        const adjacentHexes = getAdjacentHexes(q, r);

        // Sort by distance to target (ascending)
        adjacentHexes.sort((a, b) => {
            const distA = hexDistance(a.q, a.r, targetQ, targetR);
            const distB = hexDistance(b.q, b.r, targetQ, targetR);
            return distA - distB;
        });

        // Choose valid hex with lowest distance to target
        for (const hex of adjacentHexes) {
            const newKey = `${hex.q},${hex.r}`;

            if (newMap[newKey] && isTerrainSuitableForCreature(newMap[newKey].type, creature.type)) {
                // Move creature
                const creatureIndex = newMap[currentKey].creatures.findIndex(c => c.id === creature.id);

                if (creatureIndex !== -1) {
                    // Remove from current hex
                    const movedCreature = newMap[currentKey].creatures.splice(creatureIndex, 1)[0];

                    // Add to new hex
                    newMap[newKey].creatures.push(movedCreature);
                    break;
                }
            }
        }
    };

    const moveCreatureRandomly = (newMap, creature, currentKey) => {
        const [q, r] = currentKey.split(',').map(Number);

        // Get adjacent hexes
        const adjacentHexes = getAdjacentHexes(q, r);

        // Shuffle adjacentHexes
        const shuffled = [...adjacentHexes].sort(() => Math.random() - 0.5);

        // Choose first valid hex
        for (const hex of shuffled) {
            const newKey = `${hex.q},${hex.r}`;

            if (newMap[newKey] && isTerrainSuitableForCreature(newMap[newKey].type, creature.type)) {
                // Move creature
                const creatureIndex = newMap[currentKey].creatures.findIndex(c => c.id === creature.id);

                if (creatureIndex !== -1) {
                    // Remove from current hex
                    const movedCreature = newMap[currentKey].creatures.splice(creatureIndex, 1)[0];

                    // Add to new hex
                    newMap[newKey].creatures.push(movedCreature);
                    break;
                }
            }
        }
    };

    const moveCreatureWithHerd = (newMap, creature, currentKey) => {
        const [q, r] = currentKey.split(',').map(Number);

        // Find nearby hexes with same creature type
        let herdQ = 0;
        let herdR = 0;
        let herdCount = 0;

        // Search in radius
        for (let adjQ = q - 3; adjQ <= q + 3; adjQ++) {
            for (let adjR = r - 3; adjR <= r + 3; adjR++) {
                if (adjQ === q && adjR === r) continue;

                const adjKey = `${adjQ},${adjR}`;
                if (newMap[adjKey]) {
                    // Check for same creature type
                    const sameTypeCreatures = newMap[adjKey].creatures.filter(c => c.type === creature.type);

                    if (sameTypeCreatures.length > 0) {
                        herdQ += adjQ * sameTypeCreatures.length;
                        herdR += adjR * sameTypeCreatures.length;
                        herdCount += sameTypeCreatures.length;
                    }
                }
            }
        }

        // If no herd found, move randomly
        if (herdCount === 0) {
            moveCreatureRandomly(newMap, creature, currentKey);
            return;
        }

        // Calculate average herd position
        const avgQ = Math.round(herdQ / herdCount);
        const avgR = Math.round(herdR / herdCount);

        // Move toward herd center
        moveCreatureToward(newMap, creature, currentKey, avgQ, avgR);
    };

    // Helper function to check if terrain is suitable for a creature
    const isTerrainSuitableForCreature = (terrainType, creatureType) => {
        const creatureInfo = creatureTypes[creatureType];

        if (!creatureInfo || !creatureInfo.habitat) {
            return true; // Default to true if no specific habitat requirements
        }

        return creatureInfo.habitat.includes(terrainType);
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
                // Set up encounter context for predator danger system
                const encounterContext = {
                    creatureInfo,
                    creatureId: creature.id,
                    creatureType: creature.type,
                    playerGrowthStage: growthStage,
                    playerFitness: fitness,
                    playerEnergy: energy,
                    playerPerks: perks,
                    isMotherNearby: isMotherNearby(),
                    terrainType: newMap[hexKey].type,
                    map: newMap,
                    hexKey,
                    timeOfDay,
                    weather
                };

                // Use the predator danger system to handle the encounter
                const result = handlePredatorEncounter(encounterContext);

                // Apply result effects
                if (result.damage > 0) {
                    setFitness(Math.max(0, fitness - result.damage));
                }

                setCurrentMessage(result.message);

                if (result.injuryType) {
                    addInjury(result.injuryType);
                }

                // Add to health events
                addHealthEvent(result.healthEventMessage, result.healthEventType);

                // Remove creature if needed
                if (result.removeCreature) {
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
                }

                // Check for game over
                if (result.gameOver) {
                    setGameOver(true);
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

        // NEW: Adjust for stealth level
        baseChance += (stealthLevel / 200); // Up to +50% success chance with perfect stealth

        // Weather affects hunting success
        if (weather === 'rainy') {
            baseChance *= 0.85; // Rain makes hunting harder
        } else if (weather === 'cloudy') {
            baseChance *= 1.1; // Cloudy weather helps hide the predator
        }

        // Time of day affects hunting success
        if (timeOfDay === 'night' && perks.includes('night_vision')) {
            baseChance *= 1.2; // Night hunting advantage with night vision perk
        } else if (timeOfDay === 'night') {
            baseChance *= 0.7; // Night hunting disadvantage without night vision
        }

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

        // Pack hunting bonus
        const hasPackHunting = perks.some(perk => perkDefinitions[perk].effect().packHunting);
        if (hasPackHunting && Math.random() < 0.15) {
            baseChance += 0.3; // Significant bonus when pack hunting activates
            addHealthEvent("Another Allosaurus joined your hunt, improving your chances!", "positive");
        }

        // Ensure chance stays within reasonable bounds
        return Math.min(0.95, Math.max(0.05, baseChance));
    };

    // New function to approach prey stealthily
    const approachStealthily = (creatureId) => {
        // Get the creature
        const hexKey = `${playerPosition.q},${playerPosition.r}`;
        const creature = map[hexKey].creatures.find(c => c.id === creatureId);

        if (!creature) return;

        // Calculate base stealth based on player stats and terrain
        const terrainType = map[hexKey].type;
        const habitat = habitats[terrainType];

        let stealthBase = habitat.ambushValue * 50; // 0-50 based on terrain

        // Growth stage affects stealth (smaller = stealthier)
        stealthBase += Math.max(0, (4 - growthStage) * 10);

        // Time of day affects stealth
        if (timeOfDay === 'night') {
            stealthBase += 20; // Easier to sneak at night
        }

        // Perks affect stealth
        if (perks.includes('ambush_predator')) {
            stealthBase += 15;
        }

        // Random factor for stealth approach
        const stealthRoll = Math.random() * 30;

        // Set final stealth level
        const finalStealth = Math.min(100, Math.max(0, stealthBase + stealthRoll));
        setStealthLevel(finalStealth);

        // Show stealth message
        if (finalStealth > 70) {
            setCurrentMessage("You approach silently, the prey doesn't notice you...");
        } else if (finalStealth > 40) {
            setCurrentMessage("You move quietly, trying not to alert your prey.");
        } else {
            setCurrentMessage("The prey seems alert to your presence!");
        }

        // Use energy for stalking
        setEnergy(Math.max(0, energy - 10));

        // Show creature details for hunting decision
        setSelectedCreature({ ...creature, info: creatureTypes[creature.type] });
        setShowCreatureDetails(true);
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

        const aiContext: AIContext = {
            map,
            playerPosition,
            growthStage,
            stealthLevel,
            territoryHexes,
            territoryCenter
        };

        const newMap = updateAI(aiContext);
        setMap(newMap);
        updateTerritory();

        // Update weather occasionally
        if (Math.random() < 0.2) {
            updateWeather();
        }

        // Update season (every 10 turns = season change)
        if (turnCount % 10 === 0 && turnCount > 0) {
            updateSeason();
        }

        // Update time of day (every 5 turns)
        if (turnCount % 2 === 0) {
            updateTimeOfDay();
        }

        // Natural healing if resting and well-fed
        if (hunger > 70 && thirst > 70) {
            const healingAmount = 5;
            setFitness(Math.min(100, fitness + healingAmount));

            // Add to health events
            addHealthEvent("You rested and recovered some fitness.", "positive");
        }

        // Detect nearby predators after creatures have moved
        const detectedPredators = detectNearbyPredators(map, playerPosition, growthStage);
        setNearbyPredators(detectedPredators);

        // Create warning if predators are detected
        const warning = createPredatorWarning(detectedPredators);
        setPredatorWarning(warning);

        // If there's a warning, display it
        if (warning) {
            setCurrentMessage(warning);
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

    return {
        gameStarted,
        gameOver,
        turnCount,
        showTutorial,
        showFact,
        currentFact,
        currentMessage,
        selectedCreature,
        showCreatureDetails,
        darkMode,
        selectedDinosaur,
        showDinosaurSelection,
        perks,
        availablePerks,
        showPerkSelection,
        weather,
        season,
        timeOfDay,
        injuries,
        showInjuryDetails,
        hunger,
        thirst,
        energy,
        showStatsDetails,
        selectedTile,
        healthEvents,
        showEventLog,
        age,
        weight,
        fitness,
        score,
        growthStage,
        movesLeft,
        map,
        playerPosition,
        motherPosition,
        nestPosition,
        visibleTiles,
        viewingTile,
        revealedTiles,
        validMoves,
        predatorWarning,
        nearbyPredators,

        // Constants
        growthStages,
        weatherEffects,
        seasonEffects,

        // Game actions
        setGameStarted,
        setGameOver,
        setShowTutorial,
        setShowFact,
        setCurrentFact,
        setCurrentMessage,
        setSelectedCreature,
        setShowCreatureDetails,
        setSelectedDinosaur,
        setShowDinosaurSelection,
        setPerks,
        setAvailablePerks,
        setShowPerkSelection,
        setWeather,
        setSeason,
        setTimeOfDay,
        setInjuries,
        setShowInjuryDetails,
        setHunger,
        setThirst,
        setEnergy,
        setShowStatsDetails,
        setSelectedTile,
        setHealthEvents,
        setShowEventLog,
        setAge,
        setWeight,
        setFitness,
        setScore,
        setGrowthStage,
        setMovesLeft,
        setMap,
        setPlayerPosition,
        setMotherPosition,
        setNestPosition,
        setVisibleTiles,
        setViewingTile,
        setRevealedTiles,
        setValidMoves,

        // Game functions
        initializeGame,
        createHexagonalMap,
        placeTerrainFeatures,
        placeCreatures,
        updateVisibility,
        calculateValidMoves,
        moveTo,
        handleCreatureEncounter,
        handleTerrainEffects,
        applyBasicNeeds,
        isMotherNearby,
        moveMotherTowardPlayer,
        handleHunting,
        calculateHuntingSuccess,
        spawnNewCreature,
        addInjury,
        healInjuries,
        addHealthEvent,
        checkGrowthStage,
        removeMotherFromMap,
        selectPerk,
        endTurn,
        updateWeather,
        updateSeason,
        updateTimeOfDay
    };
};