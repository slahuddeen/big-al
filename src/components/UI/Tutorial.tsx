// components/UI/Tutorial.tsx
import React from 'react';

interface TutorialProps {
    onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-3xl text-gray-200 border border-amber-600" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-amber-500">How to Play</h2>
                    <button
                        className="text-gray-400 hover:text-white"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-bold mb-1">Game Goal</h3>
                        <p>Survive and grow from a hatchling to an adult Allosaurus in the dangerous Jurassic world.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Movement</h3>
                        <p>Click on adjacent hexes to move. Different terrain types cost different amounts of energy to traverse.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Hunting</h3>
                        <p>You'll encounter various creatures you can hunt for food. Your success chance depends on your size, the creature's characteristics, and your abilities.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Growth</h3>
                        <p>As you eat and survive, you'll grow through four stages: Hatchling, Juvenile, Subadult, and Adult.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Basic Needs</h3>
                        <p>Monitor your hunger, thirst, and energy. If any reach zero, your fitness will decrease, potentially leading to death.</p>
                    </div>
                </div>

                <div className="flex justify-center mt-6">
                    <button
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
                        onClick={onClose}
                    >
                        Start Playing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Tutorial;