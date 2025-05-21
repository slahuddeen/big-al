// components/CreatureDetails.tsx
import React from 'react';

interface CreatureDetailsProps {
    creature: any;
    onHunt: (success: boolean) => void;
    onClose: () => void;
    calculateHuntingSuccess: (creature: any) => number;
}

const CreatureDetails: React.FC<CreatureDetailsProps> = ({
    creature, onHunt, onClose, calculateHuntingSuccess
}) => {
    const info = creature.info;
    const successChance = calculateHuntingSuccess(creature);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-amber-500">{info.name}</h2>
                    <button className="text-gray-400 hover:text-white" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <p className="mb-4">{info.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center">
                        <span className="mr-1">❤️</span>
                        <span>Nutrition: {info.nutrition}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">🏆</span>
                        <span>Danger: {info.dangerLevel}/5</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">⚡</span>
                        <span>Agility: {info.agility}</span>
                    </div>
                    <div className="flex items-center">
                        <span className="mr-1">⚖️</span>
                        <span>Size: {info.size}/5</span>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-sm italic mb-2">Did you know?</p>
                    <p className="text-sm">{info.facts && info.facts[Math.floor(Math.random() * info.facts.length)]}</p>
                </div>

                <div className="bg-gray-700 p-3 rounded-lg mb-4">
                    <p className="text-center">Hunt success chance: {Math.round(successChance * 100)}%</p>
                </div>

                <div className="flex justify-between">
                    <button
                        className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
                        onClick={() => onHunt(false)}
                    >
                        Leave It
                    </button>
                    <button
                        className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
                        onClick={() => onHunt(true)}
                    >
                        Hunt It
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatureDetails;