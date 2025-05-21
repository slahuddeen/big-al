// types/index.ts
export interface HexCoord {
    q: number;
    r: number;
}

export interface Creature {
    id: string;
    type: string;
    size: number;
    dangerLevel: number;
    minGrowthToHunt: number;
    maxGrowthToHide: number;
    agility: number;
    category: 'small' | 'medium' | 'large';
    habitat: string[];
    info?: any;
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

export interface Injury {
    type: string;
    name: string;
    description: string;
    effect: any;
    healTime: number;
    severity: number;
    progressive: boolean;
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
}

export interface GrowthStage {
    name: string;
    weightRequired: number;
    description: string;
}

export interface Perk {
    id: string;
    name: string;
    description: string;
    effect: {
        type: 'stat' | 'ability' | 'passive';
        value: number;
        target: string;
    };
    requirements?: {
        level?: number;
        growthStage?: number;
        stats?: Record<string, number>;
    };
}