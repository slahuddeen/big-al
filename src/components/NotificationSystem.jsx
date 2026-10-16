import React, { useEffect } from 'react';
import { eventStyle } from './eventStyles.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

// Short-lived toasts for the latest events
const NotificationSystem = ({ gameState, dispatch }) => {
    useEffect(() => {
        const interval = setInterval(() => dispatch({ type: 'AUTO_DISMISS_NOTIFICATIONS' }), 1000);
        return () => clearInterval(interval);
    }, [dispatch]);

    if (!gameState.notifications?.length) return null;
    return (
        <div className="flex flex-col items-center gap-1.5 pointer-events-none">
            {gameState.notifications.map((n) => {
                const st = eventStyle(n.type);
                return (
                    <div key={n.id} className="panel pointer-events-auto flex items-center gap-2.5 pl-2.5 pr-1.5 py-1.5 max-w-[460px] anim-slide-down"
                        style={{ borderColor: `${st.color}55`, boxShadow: `0 8px 24px rgba(0,0,0,0.35), inset 3px 0 0 ${st.color}` }}>
                        {n.species ? <CreaturePortrait species={n.species} size={34} height={24} /> : <Icon name={st.icon} size={16} style={{ color: st.color, flexShrink: 0 }} />}
                        <p className="text-[13px] font-medium leading-snug flex-1">{n.message}</p>
                        <button type="button" onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id })} className="text-ink-dim hover:text-ink p-1">
                            <Icon name="close" size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationSystem;
