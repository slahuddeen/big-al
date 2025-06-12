import React, { useEffect } from 'react';

const NotificationSystem = ({ gameState, dispatch }) => {
    // Auto-dismiss notifications after a timeout
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: 'AUTO_DISMISS_NOTIFICATIONS' });
        }, 1000);

        return () => clearInterval(interval);
    }, [dispatch]);

    if (!gameState.notifications || gameState.notifications.length === 0) {
        return null;
    }

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'combat':
                return 'bg-red-900 border-red-600 text-red-100';
            case 'injury':
                return 'bg-orange-900 border-orange-600 text-orange-100';
            case 'death':
                return 'bg-black border-red-500 text-red-200';
            case 'success':
                return 'bg-green-900 border-green-600 text-green-100';
            case 'warning':
                return 'bg-yellow-900 border-yellow-600 text-yellow-100';
            default:
                return 'bg-blue-900 border-blue-600 text-blue-100';
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'combat':
                return '⚔️';
            case 'injury':
                return '🩸';
            case 'death':
                return '💀';
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none">
            {gameState.notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    className={`
                        ${getNotificationStyle(notification.type)}
                        border-2 rounded-lg p-3 max-w-md shadow-lg
                        animate-in slide-in-from-top duration-300
                        pointer-events-auto
                    `}
                    style={{
                        animation: `slideInFromTop 0.3s ease-out ${index * 0.1}s both`
                    }}
                >
                    <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-medium">
                                {notification.message}
                            </p>
                        </div>
                        <button
                            onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: notification.id })}
                            className="text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationSystem;