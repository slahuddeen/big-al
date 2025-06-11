import React, { useEffect } from 'react';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { MAX_NOTIFICATIONS } from '../game/gameConstants.js';

const NotificationSystem = ({ gameState, dispatch }) => {
    const hasActiveNotifications = gameState.notifications.length > 0;

    // Auto-dismiss notifications
    useEffect(() => {
        const timer = setInterval(() => {
            dispatch({ type: 'AUTO_DISMISS_NOTIFICATIONS' });
        }, 1000);

        return () => clearInterval(timer);
    }, [dispatch]);

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-white text-center max-w-2xl">
            {hasActiveNotifications ? (
                <div className="space-y-2">
                    {gameState.notifications.slice(-MAX_NOTIFICATIONS).map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-3 rounded-lg flex justify-between items-start ${notification.type === 'death' ? 'bg-red-900 text-red-100' :
                                    notification.type === 'combat' ? 'bg-orange-900 text-orange-100' :
                                        notification.type === 'injury' ? 'bg-yellow-900 text-yellow-100' :
                                            'bg-blue-900 text-blue-100'
                                }`}
                        >
                            <p className="text-sm flex-1">{notification.message}</p>
                            <button
                                onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: notification.id })}
                                className="ml-2 text-xl leading-none opacity-70 hover:opacity-100"
                            >
                                Å~
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                // Show environmental info when no notifications
                (() => {
                    const currentHex = gameState.hexes.get(`${gameState.player.q},${gameState.player.r}`);
                    const terrain = currentHex ? TERRAIN_TYPES[currentHex.terrain] : null;
                    return terrain ? (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{terrain.emoji}</span>
                            <div>
                                <div className="font-bold">{terrain.name}</div>
                                <div className="text-sm opacity-75">
                                    {terrain.description}
                                </div>
                                <div className="text-xs text-cyan-400 mt-1">
                                    "{gameState.currentThought}"
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>Exploring uncharted territory...</div>
                    );
                })()
            )}
        </div>
    );
};

export default NotificationSystem;