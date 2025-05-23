// content/creatures/herbivores.ts
export const herbivores: CreatureConfig[] = [
    {
        id: 'dryosaurus',
        name: 'Dryosaurus',
        description: 'Small, agile plant-eater that moves in herds',
        size: 1,
        agility: 80,
        fierceness: 20,
        nutrition: 30,
        minGrowthToHunt: 2,
        maxGrowthToHide: 0,
        dangerLevel: 1,
        habitat: ['plains', 'ancient_forest', 'grassland'],
        spawnWeight: 0.3,
        packSize: [2, 6], // Travels in small herds

        behavior: {
            aggressive: 0.1,
            territorial: 0.2,
            social: 0.8, // Highly social
            flightResponse: 0.9, // Very easily spooked
            huntingStyle: 'passive'
        },

        color: 'bg-green-400',
        markerSize: 'small',

        abilities: {
            'herd_warning': true, // Warns other Dryosaurus when predator spotted
            'speed_burst': 0.3 // 30% chance to escape even when caught
        },

        facts: [
            'Dryosaurus was a small, fast-running herbivore about 3 meters long.',
            'They likely lived in small herds for protection against predators.',
            'Their name means oak lizard because they likely lived in forested areas.'
        ]
    },

    {
        id: 'armored_ankylosaur',
        name: 'Armored Ankylosaur',
        description: 'Heavily armored herbivore with a devastating tail club',
        size: 3,
        agility: 20,
        fierceness: 70,
        nutrition: 60,
        minGrowthToHunt: 4,
        maxGrowthToHide: 1,
        dangerLevel: 3, // Dangerous when cornered
        habitat: ['plains', 'rocky'],
        spawnWeight: 0.1, // Uncommon

        behavior: {
            aggressive: 0.3,
            territorial: 0.6,
            social: 0.2,
            flightResponse: 0.2, // Stands ground due to armor
            huntingStyle: 'passive'
        },

        color: 'bg-gray-600',
        markerSize: 'large',

        abilities: {
            'armor_plating': 0.5, // 50% damage reduction
            'tail_club': true // Can injure attackers
        },

        facts: [
            'Ankylosaurs were living tanks with bony armor covering their backs.',
            'Their tail clubs could deliver devastating blows to attackers.',
            'Despite their bulk, they were surprisingly fast when threatened.'
        ]
    }
];