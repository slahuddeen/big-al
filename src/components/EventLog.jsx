import React, { useState } from 'react';
import { eventStyle } from './eventStyles.js';
import Icon from './Icon.jsx';

// Running log of everything that has happened, newest first
const EventLog = ({ gameState }) => {
    const [open, setOpen] = useState(true);
    const entries = [...(gameState.eventLog || [])].reverse();
    return (
        <div className="panel w-[300px] anim-fade" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2">
                <span className="label flex items-center gap-1.5"><Icon name="book" size={12} />Field notes</span>
                <Icon name={open ? 'down' : 'up'} size={14} className="text-ink-dim" />
            </button>
            {open && (
                <div className="px-2 pb-2 max-h-[168px] overflow-y-auto scroll-thin space-y-1">
                    {entries.length === 0 && <div className="text-[12px] text-ink-dim px-1 pb-1">Nothing yet. Go and explore.</div>}
                    {entries.map((e) => {
                        const st = eventStyle(e.type);
                        return (
                            <div key={e.id} className="flex gap-2 items-start text-[12px] leading-snug px-1 py-0.5 rounded-md hover:bg-white/5">
                                <Icon name={st.icon} size={13} style={{ color: st.color, marginTop: 2, flexShrink: 0 }} />
                                <span className="flex-1 text-ink-muted"><span className="text-ink">{e.message}</span></span>
                                <span className="pixel text-[10px] text-ink-dim mt-0.5">T{e.turn}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default EventLog;
