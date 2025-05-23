// components/LandscapeView.tsx
import React from 'react';
import { HexCoord, Creature, CreatureInfo } from '../types';

interface LandscapeViewProps {
    currentTerrain: string;
    creatures: Creature[];
    playerPosition: HexCoord;
    growthStage: number;
    onCreatureAction: (creature: Creature, action: string) => void;
    canHuntCreature: (creature: any) => { canHunt: boolean; reason?: string };
    darkMode: boolean;
}

interface CreatureAction {
    id: string;
    label: string;
    color: string;
    enabled: boolean;
    reason?: string;
}

const LandscapeView: React.FC<LandscapeViewProps> = ({
    currentTerrain,
    creatures,
    playerPosition,
    growthStage,
    onCreatureAction,
    canHuntCreature,
    darkMode
}) => {
    // Get terrain display info
    const getTerrainInfo = (terrain: string) => {
        const terrainMap: Record<string, { name: string; image: string; description: string }> = {
            plains: {
                name: "Open Plains",
                image: "/assets/landscapes/grassland.png",
                description: "Vast grasslands stretch to the horizon"
            },
            grassland: {
                name: "Grasslands",
                image: "/assets/landscapes/grassland.png",
                description: "Tall grass sways in the breeze"
            },
            forest: {
                name: "Forest",
                image: "/assets/landscapes/forest.png",
                description: "Ancient trees tower overhead"
            },
            denseforest: {
                name: "Dense Forest",
                image: "/assets/landscapes/denseforest.png",
                description: "Thick canopy blocks most sunlight"
            },
            lake: {
                name: "Lake",
                image: "/assets/tiles/lake.png",
                description: "Crystal clear water reflects the sky"
            },
            river: {
                name: "River",
                image: "/assets/tiles/river.png",
                description: "Fast-flowing water cuts through the land"
            },
            marsh: {
                name: "Marsh",
                image: "/assets/tiles/marsh.png",
                description: "Muddy wetlands teem with life"
            },
            rocky: {
                name: "Rocky Terrain",
                image: "/assets/tiles/rocky.png",
                description: "Jagged rocks and steep slopes"
            },
            mountain: {
                name: "Mountain",
                image: "/assets/tiles/mountain.png",
                description: "Towering peaks pierce the clouds"
            },
            desert: {
                name: "Desert",
                image: "/assets/tiles/desert.png",
                description: "Endless sand dunes under scorching sun"
            },
            volcanic: {
                name: "Volcanic Fields",
                image: "/assets/tiles/volcanic.png",
                description: "Dangerous lava flows and toxic gases"
            },
            nest: {
                name: "Your Nest",
                image: "/assets/tiles/nest.png",
                description: "The safety of your birth nest"
            }
        };

        return terrainMap[terrain] || {
            name: terrain.charAt(0).toUpperCase() + terrain.slice(1),
            image: "/api/placeholder/800/300",
            description: "An unknown landscape"
        };
    };

    // Get creature display info with better error handling
    const getCreatureInfo = (creature: Creature) => {
        if (!creature || !creature.type) {
            return {
                name: "Unknown Creature",
                image: "/assets/dinos/Stegosaurus.png",
                color: "bg-gray-500"
            };
        }

        const creatureMap: Record<string, { name: string; image: string; color: string }> = {
            dryosaurus: {
                name: "Dryosaurus",
                image: "/api/placeholder/120/80",
                color: "bg-green-400"
            },
            stegosaurus: {
                name: "Stegosaurus",
                image: "/assets/dinos/Stegosaurus.png",
                color: "bg-amber-600"
            },
            allosaurus: {
                name: "Allosaurus",
                image: "/api/placeholder/120/80",
                color: "bg-red-600"
            },
            diplodocus: {
                name: "Diplodocus",
                image: "/api/placeholder/120/80",
                color: "bg-brown-500"
            },
            centipede: {
                name: "Giant Centipede",
                image: "/assets/dinos/Stegosaurus.png",
                color: "bg-green-600"
            },
            lizard: {
                name: "Primitive Lizard",
                image: "/assets/dinos/Stegosaurus.png",
                color: "bg-yellow-600"
            },
            dragonfly: {
                name: "Giant Dragonfly",
                image: "/api/placeholder/120/80",
                color: "bg-blue-300"
            },
            fish: {
                name: "Jurassic Fish",
                image: "/api/placeholder/120/80",
                color: "bg-blue-500"
            },
            mothersaur: {
                name: "Mother Allosaurus",
                image: "/assets/dinos/Allosaurus.png",
                color: "bg-orange-700"
            },
            ceratosaurus: {
                name: "Ceratosaurus",
                image: "/api/placeholder/120/80",
                color: "bg-red-800"
            },
            ornitholestes: {
                name: "Ornitholestes",
                image: "/api/placeholder/120/80",
                color: "bg-yellow-700"
            },
            pterosaur: {
                name: "Pterosaur",
                image: "/api/placeholder/120/80",
                color: "bg-purple-500"
            },
            crocodilian: {
                name: "Primitive Crocodilian",
                image: "/api/placeholder/120/80",
                color: "bg-green-800"
            },
            compsognathus: {
                name: "Compsognathus",
                image: "/api/placeholder/120/80",
                color: "bg-orange-500"
            },
            mammal: {
                name: "Primitive Mammal",
                image: "/api/placeholder/120/80",
                color: "bg-brown-400"
            },
            dino_eggs: {
                name: "Dinosaur Eggs",
                image: "/api/placeholder/120/80",
                color: "bg-yellow-300"
            },
            brachiosaurus: {
                name: "Brachiosaurus",
                image: "/api/placeholder/120/80",
                color: "bg-green-700"
            }
        };

        return creatureMap[creature.type] || {
            name: creature.type.charAt(0).toUpperCase() + creature.type.slice(1).replace('_', ' '),
            image: "/api/placeholder/120/80",
            color: "bg-gray-500"
        };
    };

    // Get available actions for a creature with better error handling
    const getCreatureActions = (creature: Creature): CreatureAction[] => {
        const actions: CreatureAction[] = [];

        if (!creature || !creature.type) {
            return [{
                id: 'observe',
                label: 'Observe',
                color: 'bg-blue-600 hover:bg-blue-700',
                enabled: true
            }];
        }

        if (creature.type === 'mothersaur') {
            actions.push({
                id: 'approach',
                label: 'Approach Mother',
                color: 'bg-green-600 hover:bg-green-700',
                enabled: true
            });
        } else {
            // Always add observe action
            actions.push({
                id: 'observe',
                label: 'Observe',
                color: 'bg-blue-600 hover:bg-blue-700',
                enabled: true
            });

            // Try to determine if hunting is possible
            try {
                const huntCheck = canHuntCreature ? canHuntCreature(creature) : { canHunt: false, reason: "Hunting system not ready" };

                if (huntCheck.canHunt) {
                    actions.push({
                        id: 'hunt',
                        label: 'Hunt',
                        color: 'bg-red-600 hover:bg-red-700',
                        enabled: true
                    });
                } else {
                    actions.push({
                        id: 'hunt',
                        label: 'Too Small',
                        color: 'bg-gray-500',
                        enabled: false,
                        reason: huntCheck.reason || "Cannot hunt this creature"
                    });
                }
            } catch (error) {
                console.warn('Error checking hunt capability:', error);
                // If hunting check fails, just show disabled hunt option
                actions.push({
                    id: 'hunt',
                    label: 'Hunt',
                    color: 'bg-gray-500',
                    enabled: false,
                    reason: "Hunting system not ready"
                });
            }
        }

        return actions;
    };

    // Get player representation
    const getPlayerRepresentation = () => {
        const stageNames = ["Hatchling", "Juvenile", "Subadult", "Adult"];
        const stageName = stageNames[growthStage - 1] || "Unknown";

        return {
            name: `${stageName} Allosaurus`,
            image: "/assets/dinos/hatchling.png",
            size: Math.min(8, 4 + (growthStage * 2))
        };
    };

    const terrainInfo = getTerrainInfo(currentTerrain);
    const playerInfo = getPlayerRepresentation();
    const visibleCreatures = creatures.slice(0, 4); // Max 4 creatures

    return (
        <div className={`w-full h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} border-2 border-amber-600 rounded-lg overflow-hidden flex flex-col`}>
            {/* Compact Terrain Header */}
            <div className={`px-4 py-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} border-b flex-shrink-0`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                            {terrainInfo.name}
                        </h3>
                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {terrainInfo.description}
                        </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'}`}>
                        {playerPosition.q}, {playerPosition.r}
                    </div>
                </div>
            </div>

            {/* Main Landscape Area - Now flexible height */}
            <div className="relative flex-1 overflow-hidden">
                {/* Background Landscape */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url(${terrainInfo.image})`,
                        filter: darkMode ? 'brightness(0.8)' : 'brightness(1)'
                    }}
                >
                    {/* Fallback gradient if image fails to load */}
                    <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-t from-gray-800 to-gray-600' : 'bg-gradient-to-t from-green-200 to-blue-200'} opacity-50`} />
                </div>

                {/* Content Overlay - More space for creatures now */}
                <div className="absolute inset-0 flex items-end p-4">
                    <div className="w-full space-y-4">


                        {/* Creatures Section - Smaller, more compact cards */}
                        {visibleCreatures.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                {visibleCreatures.map((creature, index) => {
                                    // Safely get creature info
                                    const creatureInfo = getCreatureInfo(creature);
                                    const actions = getCreatureActions(creature);

                                    return (
                                        <div
                                            key={`${creature.id || 'unknown'}-${index}`}
                                            className={`${darkMode ? 'bg-black bg-opacity-80' : 'bg-white bg-opacity-95'} rounded-md shadow-md border ${creatureInfo.color} border-opacity-30 overflow-hidden hover:shadow-lg transition-all duration-200`}
                                        >
                                            {/* Creature Image - Much smaller */}
                                            <div className="relative">
                                                <img
                                                    src={creatureInfo.image}
                                                    alt={creatureInfo.name}
                                                    className="w-full h-12 object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiM2NjY2NjYiLz48dGV4dCB4PSI2MCIgeT0iNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEwIj5C65Y8L3RleHQ+PC9zdmc+';
                                                    }}
                                                />
                                                {/* Smaller type badge */}
                                                <div className={`absolute top-1 right-1 w-4 h-4 rounded-full text-xs font-bold ${creatureInfo.color} text-white shadow-sm flex items-center justify-center`}>
                                                    <span className="text-xs leading-none">{creature.type?.charAt(0).toUpperCase() || '?'}</span>
                                                </div>
                                            </div>

                                            {/* Card Content - Much more compact */}
                                            <div className="p-2">
                                                {/* Creature Name - Smaller */}
                                                <h4 className={`font-bold text-xs truncate mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {creatureInfo.name}
                                                </h4>

                                                {/* Action Buttons - Smaller and more compact */}
                                                <div className="space-y-1">
                                                    {actions.slice(0, 2).map((action) => ( // Only show first 2 actions to save space
                                                        <button
                                                            key={action.id}
                                                            onClick={() => {
                                                                if (action.enabled) {
                                                                    try {
                                                                        onCreatureAction(creature, action.id);
                                                                    } catch (error) {
                                                                        console.error('Error handling creature action:', error);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!action.enabled}
                                                            className={`w-full px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${action.enabled
                                                                    ? `${action.color} text-white hover:scale-105`
                                                                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                                }`}
                                                            title={action.reason || action.label}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`p-4 rounded-lg text-center ${darkMode ? 'bg-black bg-opacity-70' : 'bg-white bg-opacity-90'} shadow-lg border border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>
                                <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    🔍
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    No creatures visible
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Player Section - Slightly larger */}
                    <div className={`flex items-center px-4 py-3 rounded-lg ${darkMode ? 'bg-black bg-opacity-70' : 'bg-white bg-opacity-90'} shadow-lg`}>
                        <div className="flex-shrink-0 mr-3">
                            <img
                                src={playerInfo.image}
                                alt={playerInfo.name}
                                className="w-12 h-8 object-cover rounded border-amber-500"
                                style={{ filter: 'brightness(1.1) contrast(1.1)' }}
                            />
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                {playerInfo.name}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                You are here
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandscapeView;