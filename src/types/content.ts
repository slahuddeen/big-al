// types/content.ts - Define the content schema
import { GameState } from './index';

export interface TerrainConfig {
    id: string;
    name: string;
    description: string;

    // Visual properties
    color: string;
    imagePath?: string;
    icon?: string;

    // Gameplay properties
    movementCost: number;
    huntingModifier: number;
    ambushValue: number;
    waterSource: boolean;
    healthHazard?: number;

    // Generation properties
    rarity: number; // 0-1, how rare this terrain is
    clusterSize: number; // How big patches should be
    adjacentTo?: string[]; // What terrains this should spawn near

    // Effects
    effects?: {
        onEnter?: (gameState: GameState) => void;
        onLeave?: (gameState: GameState) => void;
        onTurnEnd?: (gameState: GameState) => void;
    };

    // Environmental
    seasonalVariations?: {
        [season: string]: {
            visualModifier?: string;
            effectModifier?: number;
        };
    };

    fact: string;
}

export interface CreatureConfig {
    id: string;
    name: string;
    description: string;

    // Physical properties
    size: number; // 0-5 scale
    agility: number; // 0-100
    fierceness: number; // 0-100

    // Gameplay properties
    nutrition: number;
    minGrowthToHunt: number;
    maxGrowthToHide: number;
    dangerLevel: number; // 0-5

    // Habitat and spawning
    habitat: string[];
    spawnWeight: number; // Relative spawn frequency
    packSize?: [number, number]; // Min, max pack size

    // AI Behavior configuration
    behavior: {
        aggressive: number; // 0-1
        territorial: number; // 0-1
        social: number; // 0-1 (herding tendency)
        flightResponse: number; // 0-1 (how easily spooked)
        huntingStyle: 'ambush' | 'chase' | 'scavenger' | 'passive';
    };

    // Visual
    color: string;
    markerSize: 'tiny' | 'small' | 'medium' | 'large';

    // Special abilities
    abilities?: {
        [abilityName: string]: any;
    };

    facts: string[];
}

// Content registry system
export interface ContentRegistry {
    terrains: Map<string, TerrainConfig>;
    creatures: Map<string, CreatureConfig>;
}

// Plugin interface for custom content
export interface ContentPlugin {
    name: string;
    version: string;
    terrains?: TerrainConfig[];
    creatures?: CreatureConfig[];
    init?: (gameState: GameState) => void;
}