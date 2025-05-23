// components/UI/FactDisplay.tsx
import React from 'react';

interface FactDisplayProps {
    fact: string;
    onClose: () => void;
}

const FactDisplay: React.FC<FactDisplayProps> = ({ fact, onClose }) => {
    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-gray-900 border border-amber-600 rounded-lg p-4 z-40">
            <div className="flex items-start">
                <span className="text-amber-500 mr-3 mt-1 flex-shrink-0">ℹ️</span>
                <div>
                    <p className="text-sm text-amber-500 font-bold mb-1">Dinosaur Fact</p>
                    <p className="text-white text-sm">{fact}</p>
                </div>
                <button
                    className="ml-3 text-gray-400 hover:text-white flex-shrink-0"
                    onClick={onClose}
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

export default FactDisplay;