// ==================== ROUND-BASED COMBAT ====================
// Big animals are no longer a single dice roll. Every attack is one round:
//  * if the animal hasn't been engaged yet it may bolt before you close in
//  * your bite takes a share of its health, set by your power against its
//    mass and toughness (hunting companions add their weight)
//  * if it survives it may strike back, run, or (herds) its herd-mates join in
// Small prey still dies in one bite; a sauropod takes many.
import { SPECIES_DATA, TOUGHNESS, AQUATIC } from '../data/species.js';
import { calculateAgilityRatio, calculateEnergyGain, escapeChance } from '../utils/combatUtils.js';

// [bite multiplier, catch (agility) multiplier, bolt chance multiplier, counter-attack multiplier]
export const STYLE_MODS = {
    normal: { bite: 1, catch: 1, bolt: 1, counter: 1 },
    pounce: { bite: 0.9, catch: 0.6, bolt: 0.6, counter: 1.25 },
    ambush: { bite: 1.6, catch: 0.45, bolt: 0.3, counter: 0 }, // they never see it coming: no reply this round
    hatchet: { bite: 0.7, catch: 0.7, bolt: 0.5, counter: 0.7 }
};

// How likely each kind of animal is to fight back when bitten
const FIGHT_BACK = {
    pack_predator: 0.8, rival_predator: 0.85, apex_predator: 0.9, ambush_predator: 0.8, territorial: 0.6, aerial_predator: 0.5,
    dangerous_herbivore: 0.75, giant_herbivore: 0.55, herbivore: 0.3, defensive: 0.5, skittish: 0.1, passive: 0
};
export const fightBackChance = (species) => FIGHT_BACK[SPECIES_DATA[species]?.behaviorType] ?? 0.3;

// Who keeps fighting when hurt rather than running
const STANDS_GROUND = new Set(['pack_predator', 'rival_predator', 'apex_predator', 'ambush_predator', 'dangerous_herbivore', 'territorial']);
export const standsGround = (species) => STANDS_GROUND.has(SPECIES_DATA[species]?.behaviorType);

export const preyMass = (c) => (SPECIES_DATA[c.species]?.weight ?? 1) * (c.size ?? 1);

// Share of an animal's health (0..100+) one bite takes
export const biteDamage = (state, creature, style = 'normal', packPower = 0) => {
    const power = (state.weight + packPower) * (0.55 + Math.max(0, state.fitness) / 220);
    const dmg = 100 * Math.pow(power / Math.max(0.0005, preyMass(creature)), 0.6) / (TOUGHNESS[creature.species] || 1);
    return dmg * STYLE_MODS[style].bite;
};

// Total weight of Big Al's hunting companions
export const packPower = (state) => (state.pack || []).reduce((s, m) => s + m.weight * 0.8, 0);

// Chance the animal gets away before the first bite (0 once you are locked in a fight)
export const boltChance = (state, creature, style = 'normal') => {
    if (creature.engaged) return 0;
    const sd = SPECIES_DATA[creature.species];
    // sauropods and armoured herbivores don't sprint away: they stand and fight
    if (['giant_herbivore', 'dangerous_herbivore'].includes(sd?.behaviorType) && creature.size > 0.3) return 0;
    const m = STYLE_MODS[style];
    let p = escapeChance(creature.species, sd, creature.size, state.weight, state.level) * m.bolt;
    const agility = calculateAgilityRatio(state.weight, sd, false) * m.catch * (creature.wounded ? 0.6 : 1);
    if (agility > 1) p += Math.min(0.4, (agility - 1) * 0.2); // too quick for you
    if (AQUATIC.has(creature.species)) p *= 1.1; // fish are slippery for a land hunter
    return Math.max(0, Math.min(0.75, p));
};

// Numbers for the encounter cards
export const previewAttack = (state, creature, style = 'normal', counterDamage) => {
    const sd = SPECIES_DATA[creature.species];
    if (!sd) return { catch: 0, bite: 0, bites: 99, counter: 0, energyGain: 0 };
    const health = Math.max(1, creature.health ?? 100);
    const bite = biteDamage(state, creature, style, packPower(state));
    const bites = Math.max(1, Math.ceil(health / Math.max(0.1, bite)));
    const fight = fightBackChance(creature.species) * STYLE_MODS[style].counter;
    const counter = bites > 1 ? fight * counterDamage : 0; // expected damage you take per round
    return {
        catch: Math.round((1 - boltChance(state, creature, style)) * 100),
        bite: Math.min(100, Math.round((bite / health) * 100)),
        bites,
        counter: Math.round(counter),
        counterMax: Math.round(counterDamage * STYLE_MODS[style].counter),
        energyGain: calculateEnergyGain(sd, creature.size, state.weight, state.level)
    };
};
