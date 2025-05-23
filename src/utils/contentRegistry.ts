// utils/contentRegistry.ts
import { TerrainConfig, CreatureConfig, ContentRegistry, ContentPlugin } from '../types/content';

class GameContentRegistry implements ContentRegistry {
    terrains = new Map<string, TerrainConfig>();
    creatures = new Map<string, CreatureConfig>();

    // Register single pieces of content
    registerTerrain(terrain: TerrainConfig) {
        this.terrains.set(terrain.id, terrain);
        console.log(`✅ Registered terrain: ${terrain.name}`);
    }

    registerCreature(creature: CreatureConfig) {
        this.creatures.set(creature.id, creature);
        console.log(`✅ Registered creature: ${creature.name}`);
    }

    // Register content plugins
    registerPlugin(plugin: ContentPlugin) {
        console.log(`📦 Loading plugin: ${plugin.name} v${plugin.version}`);

        plugin.terrains?.forEach(terrain => this.registerTerrain(terrain));
        plugin.creatures?.forEach(creature => this.registerCreature(creature));

        console.log(`✅ Plugin ${plugin.name} loaded successfully`);
    }

    // Bulk register from arrays
    registerTerrains(terrains: TerrainConfig[]) {
        terrains.forEach(terrain => this.registerTerrain(terrain));
    }

    registerCreatures(creatures: CreatureConfig[]) {
        creatures.forEach(creature => this.registerCreature(creature));
    }

    // Query methods
    getTerrain(id: string): TerrainConfig | undefined {
        return this.terrains.get(id);
    }

    getCreature(id: string): CreatureConfig | undefined {
        return this.creatures.get(id);
    }

    getAllTerrains(): TerrainConfig[] {
        return Array.from(this.terrains.values());
    }

    getAllCreatures(): CreatureConfig[] {
        return Array.from(this.creatures.values());
    }

    // Get content by criteria
    getTerrainsByRarity(minRarity: number, maxRarity: number): TerrainConfig[] {
        return this.getAllTerrains().filter(t =>
            t.rarity >= minRarity && t.rarity <= maxRarity
        );
    }

    getCreaturesByHabitat(habitat: string): CreatureConfig[] {
        return this.getAllCreatures().filter(c =>
            c.habitat.includes(habitat)
        );
    }

    getCreaturesBySize(size: number): CreatureConfig[] {
        return this.getAllCreatures().filter(c => c.size === size);
    }

    // Validation
    validateTerrain(terrain: TerrainConfig): string[] {
        const errors: string[] = [];

        if (!terrain.id) errors.push('Terrain must have an id');
        if (!terrain.name) errors.push('Terrain must have a name');
        if (terrain.movementCost <= 0) errors.push('Movement cost must be positive');
        if (terrain.rarity < 0 || terrain.rarity > 1) errors.push('Rarity must be between 0 and 1');

        return errors;
    }

    validateCreature(creature: CreatureConfig): string[] {
        const errors: string[] = [];

        if (!creature.id) errors.push('Creature must have an id');
        if (!creature.name) errors.push('Creature must have a name');
        if (creature.size < 0 || creature.size > 5) errors.push('Size must be between 0 and 5');
        if (creature.habitat.length === 0) errors.push('Creature must have at least one habitat');

        return errors;
    }
}

// Global registry instance
export const contentRegistry = new GameContentRegistry();

// Helper functions for easier registration
export const registerTerrain = (terrain: TerrainConfig) => {
    const errors = contentRegistry.validateTerrain(terrain);
    if (errors.length > 0) {
        console.error(`❌ Invalid terrain ${terrain.name}:`, errors);
        return false;
    }
    contentRegistry.registerTerrain(terrain);
    return true;
};

export const registerCreature = (creature: CreatureConfig) => {
    const errors = contentRegistry.validateCreature(creature);
    if (errors.length > 0) {
        console.error(`❌ Invalid creature ${creature.name}:`, errors);
        return false;
    }
    contentRegistry.registerCreature(creature);
    return true;
};

export const registerPlugin = (plugin: ContentPlugin) => {
    contentRegistry.registerPlugin(plugin);
};

// Content loading utilities
export const loadContentFromModule = async (modulePath: string) => {
    try {
        const module = await import(modulePath);

        if (module.terrains) {
            contentRegistry.registerTerrains(module.terrains);
        }

        if (module.creatures) {
            contentRegistry.registerCreatures(module.creatures);
        }

        if (module.plugin) {
            contentRegistry.registerPlugin(module.plugin);
        }

        console.log(`✅ Loaded content from ${modulePath}`);
    } catch (error) {
        console.error(`❌ Failed to load content from ${modulePath}:`, error);
    }
};

// Auto-discovery for content files
export const autoLoadContent = async () => {
    const contentPaths = [
        './content/terrains',
        './content/creatures',
        './content/plugins'
    ];

    for (const path of contentPaths) {
        try {
            // In a real implementation, you'd scan the directory
            // For now, we'll load known files
            await loadContentFromModule(path);
        } catch (error) {
            // Path doesn't exist or is empty, continue
        }
    }
};