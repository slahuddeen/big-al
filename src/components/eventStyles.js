// Icon and colour for each kind of message
export const EVENT_STYLE = {
    combat: { icon: 'claw', color: '#ef5f55' },
    injury: { icon: 'heart', color: '#f08a4a' },
    death: { icon: 'skull', color: '#ef5f55' },
    success: { icon: 'check', color: '#7ccf6a' },
    warning: { icon: 'warn', color: '#f0c24a' },
    info: { icon: 'info', color: '#7ab8f0' },
    discovery: { icon: 'star', color: '#f4b740' },
    levelup: { icon: 'level', color: '#b88cf0' },
    rest: { icon: 'sleep', color: '#9aa8ff' }
};
export const eventStyle = (type) => EVENT_STYLE[type] || EVENT_STYLE.info;
