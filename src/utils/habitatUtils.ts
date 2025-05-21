import { habitats } from './terrain';
import type { Habitat } from '../types';

export const getHabitatByType = (type: string): Habitat | undefined => {
    return habitats[type as keyof typeof habitats];
};

export const isHabitatPassable = (
    habitatType: string,
    growthStage: number,
    weather: string
): boolean => {
    const habitat = getHabitatByType(habitatType);
    if (!habitat) return false;

    // Growth stage restrictions
    if (growthStage === 1 && habitatType === 'lake') return false;
    if (growthStage < 3 && habitatType === 'cliff') return false;

    // Weather restrictions
    if (weather === 'stormy' && habitatType === 'cliff') return false;

    return true;
};

export const calculateMovementCost = (
    habitatType: string,
    weather: string
): number => {
    const habitat = getHabitatByType(habitatType);
    if (!habitat) return Infinity;

    let cost = habitat.movementCost;

    // Weather effects
    switch (weather) {
        case 'rainy':
            cost *= 1.2;
            break;
        case 'stormy':
            cost *= 1.5;
            break;
        case 'hot':
            if (habitat.waterSource) cost *= 0.8;
            else cost *= 1.2;
            break;
    }

    return cost;
};