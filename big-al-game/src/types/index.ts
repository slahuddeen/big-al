// types/index.ts
export interface HexCoord {
    q: number;
    r: number;
}

export interface CreatureInfo {
    name: string;
    description: string;
    size: number;
    fierceness: number;
    agility: number;
    energy: number;
    nutrition: number;
    minGrowthToHunt: number;
    maxGrowthToHide: number;
    dangerLevel: number;
    category: 'tiny' | 'small' | 'medium' | 'large' | 'sauropod' | 'aquatic';
    habitat: string[];
    facts: string[];
}

export interface Creature {
    id: string;
    type: string;
    info?: CreatureInfo;
}

export interface HexTile {
    q: number;
    r: number;
    type: string;
    creatures: Creature[];
    visited: boolean;
    visible: boolean;
}

export interface GameMap {
    [key: string]: HexTile;
}

export interface HealthEvent {
    message: string;
    type: 'positive' | 'negative' | 'neutral';
    turn: number;
}

export interface InjuryEffect {
    movementPenalty?: number;
    huntingPenalty?: number;
    fitnessDrain?: number;
    energyDrain?: number;
    visibilityPenalty?: number;
}

export interface Injury {
    type: string;
    name: string;
    description: string;
    effect: InjuryEffect;
    healTime: number;
    severity: number;
    progressive?: boolean;
    turnsRemaining: number;
}

export interface Weather {
    name: string;
    description: string;
    energyEffect: number;
    hungerEffect: number;
    thirstEffect: number;
    visibilityBonus: number;
    injuryChance?: number;
}

export interface Season {
    name: string;
    description: string;
    preyMultiplier: number;
    weatherPatterns: string[];
    plantGrowth: number;
}

export interface Habitat {
    name: string;
    color: string;
    description: string;
    movementCost: number;
    resources: number;
    huntingModifier: number;
    ambushValue: number;
    waterSource: boolean;
    fact: string;
    healthHazard?: number;
    imagePath?: string;
}

export interface GrowthStage {
    name: string;
    weightRequired: number;
    description: string;
}

export interface PerkEffect {
    visibilityBonus?: number;
    damageReduction?: number;
    nutritionBonus?: number;
    movementEnergyCost?: number;
    energyConservation?: number;
    ambushBonus?: number;
    heatResistance?: number;
    nightVision?: boolean;
    waterMovement?: number;
    waterHunting?: number;
    packHunting?: number;
}

export interface Perk {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    effect: () => PerkEffect;
}

export interface DinosaurSpecies {
    name: string;
    description: string;
    color: string;
    size: string;
    diet: string;
    specialAbility: string;
    baseStats: {
        hunting: number;
        speed: number;
        strength: number;
        stamina: number;
        senses: number;
    };
    growthRates: {
        health: number;
        energy: number;
        hunger: number;
    };
    preyTypes: string[];
    threats: string[];
    facts: string[];
}

export interface GameState {
    gameStarted: boolean;
    gameOver: boolean;
    turnCount: number;
    age: number;
    weight: number;
    fitness: number;
    score: number;
    growthStage: number;
    movesLeft: number;
    hunger: number;
    thirst: number;
    energy: number;
    weather: string;
    season: string;
    timeOfDay: string;
    playerPosition: HexCoord;
    motherPosition: HexCoord;
    nestPosition: HexCoord;
    map: GameMap;
    validMoves: HexCoord[];
    revealedTiles: Record<string, boolean>;
    injuries: Injury[];
    perks: string[];
    availablePerks: number;
    healthEvents: HealthEvent[];
    selectedCreature: (Creature & { info: CreatureInfo }) | null;
}

export interface Territory {
    claimed: number;
    scent: number;
}

export interface PredatorWarning {
    distance: number;
    creature: Creature & { info: CreatureInfo };
    threatLevel: number;
}