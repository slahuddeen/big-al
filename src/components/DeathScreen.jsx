import React from 'react';

const DeathScreen = ({ gameState, dispatch }) => {
    if (!gameState.gameOver) return null;

    const getDeathMessage = () => {
        switch (gameState.deathReason) {
            case 'starved':
                return "You collapse from exhaustion and hunger. The unforgiving Jurassic world claims another predator.";
            case 'drowned':
                return "The river's current proves too strong. You are swept away into the depths.";
            case 'sank':
                return "The quicksand pulls you down. Your struggles only make it worse.";
            case 'injuries':
                return "Your wounds prove fatal. You fought bravely, but this world shows no mercy.";
            case 'combat':
                return "A stronger predator has bested you. Your reign ends here.";
            default:
                return "Your journey ends here. The Jurassic world is not for the weak.";
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
            style={{ zIndex: 70000 }}
        >
            <div className="bg-red-900 bg-opacity-90 p-8 rounded-xl border-4 border-red-600 max-w-md mx-4 text-center">
                <div className="text-6xl mb-4">💀</div>
                <h2 className="text-3xl font-bold text-red-200 mb-4">Death Claims You</h2>

                <p className="text-white text-lg mb-4 italic">
                    "{gameState.currentThought}"
                </p>

                <p className="text-red-200 mb-6">
                    {getDeathMessage()}
                </p>

                <div className="bg-black bg-opacity-50 p-4 rounded mb-6">
                    <div className="text-yellow-400 text-xl font-bold mb-2">Final Score: {gameState.score}</div>
                    <div className="text-gray-300">
                        <div>Weight: {gameState.weight.toFixed(1)}kg</div>
                        <div>Survived: {gameState.moveNumber} turns</div>
                        <div>Level: {gameState.level}</div>
                    </div>
                </div>

                <button
                    onClick={() => dispatch({ type: 'RESTART_GAME' })}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl transition-colors text-lg font-bold"
                >
                    🔄 Try Again
                </button>
            </div>
        </div>
    );
};

export default DeathScreen;