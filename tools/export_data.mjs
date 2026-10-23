// ==================== EXPORT THE GAME TABLES FOR GODOT ====================
// The roam game's rules live in plain tables: the species (weights, danger, behaviour),
// where each one lives, how many come together, plant densities and sizes per biome,
// the ground cover, and the abilities. This writes them to godot/data/game.json so the
// Godot port plays by exactly the same numbers.
// Usage: node tools/export_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES_DATA, HABITAT_SPECIES, GROUP_SIZE, FLYERS, AQUATIC, SEMI_AQUATIC, TOUGHNESS, BODY_LENGTH_M, ACTIVITY, CROCODILES } from '../src/data/species.js';
import { TERRAIN_TYPES } from '../src/data/terrain.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(here, '..', 'src', f), 'utf8');

// pull a plain object literal out of a source file and evaluate it
const literal = (code, name) => {
    const start = code.indexOf(`const ${name} = `);
    if (start < 0) throw new Error(`no ${name}`);
    let i = code.indexOf('{', start), depth = 0, j = i;
    for (; j < code.length; j++) {
        if (code[j] === '{') depth++;
        if (code[j] === '}' && --depth === 0) break;
    }
    return code.slice(i, j + 1);
};

const terrain = src('roam/terrain.js');
const DENSITY = new Function(`return ${literal(terrain, 'DENSITY')}`)();
const CANOPY = new Function(`return ${literal(terrain, 'CANOPY')}`)();
const CANOPY_GREENS = new Function(`return ${literal(terrain, 'CANOPY_GREENS')}`)();
// prototypes: keep the numbers, drop the browser's builder functions
const protoText = literal(terrain, 'PROTOS').replace(/build: \([^)]*\) => [^,]*\([^)]*\)(?:\([^)]*\))?,?/g, '').replace(/build: \([^)]*\) => [^}]*?,\s*h:/g, 'h:');
const PROTOS = {};
for (const line of literal(terrain, 'PROTOS').split('\n')) {
    const m = line.match(/^\s*(\w+): \{(.*)\},?\s*$/);
    if (!m) continue;
    const body = m[2];
    const num = (k) => { const r = body.match(new RegExp(`${k}: ([0-9.]+)`)); return r ? Number(r[1]) : undefined; };
    const h = body.match(/h: \[([0-9.]+), ([0-9.]+)\]/);
    PROTOS[m[1]] = {
        h: h ? [Number(h[1]), Number(h[2])] : [1, 1], trunk: num('trunk'), wide: num('wide'), solid: num('solid'), range: num('range'),
        variants: num('variants'), far: /far: true/.test(body), water: /water: true/.test(body)
    };
}
void protoText;
const cover = src('roam/groundcover.js');
const COVER = new Function(`return ${literal(cover, 'COVER')}`)();
const SIZE = new Function(`return ${literal(cover, 'SIZE')}`)();
const player = src('roam/player.js');
const ABILITIES = new Function(`return ${player.slice(player.indexOf('export const ABILITIES = ') + 25, player.indexOf('];', player.indexOf('export const ABILITIES')) + 1)}`)();

const out = {
    species: SPECIES_DATA, habitat: HABITAT_SPECIES, groupSize: GROUP_SIZE, flyers: [...FLYERS], aquatic: [...AQUATIC], semiAquatic: [...SEMI_AQUATIC],
    crocodiles: [...CROCODILES], toughness: TOUGHNESS, bodyLength: BODY_LENGTH_M, activity: ACTIVITY,
    terrain: Object.fromEntries(Object.entries(TERRAIN_TYPES).map(([k, v]) => [k, { name: v.name, category: v.category, description: v.description }])),
    density: DENSITY, protos: PROTOS, canopy: CANOPY, canopyGreens: CANOPY_GREENS, cover: COVER, coverSize: SIZE, abilities: ABILITIES
};
fs.writeFileSync(path.join(here, '..', 'godot', 'data', 'game.json'), JSON.stringify(out, null, 1));
console.log(`species ${Object.keys(SPECIES_DATA).length}, plant kinds ${Object.keys(PROTOS).length}, biomes ${Object.keys(DENSITY).length}`);
