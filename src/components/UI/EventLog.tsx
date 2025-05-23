// components/UI/EventLog.tsx
import React from 'react';

interface EventLogProps {
    events: any[];
    onClose: () => void;
}

const EventLog: React.FC<EventLogProps> = ({ events, onClose }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md text-gray-200 border border-amber-600" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-amber-500">Event Log</h2>
                    <button
                        className="text-gray-400 hover:text-white"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {events.length === 0 ? (
                    <p className="text-center">No events recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {events.map((event, index) => (
                            <div
                                key={index}
                                className={`p-2 rounded text-sm ${event.type === 'positive' ? 'bg-green-900' :
                                        event.type === 'negative' ? 'bg-red-900' : 'bg-gray-700'
                                    }`}
                            >
                                <div className="flex justify-between">
                                    <span>{event.message}</span>
                                    <span className="text-xs text-gray-400">Turn {event.turn}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventLog;