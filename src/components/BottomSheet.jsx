import React from 'react';
import Icon from './Icon.jsx';

// A panel that slides up from the bottom of a phone screen. Tap outside or the
// cross to close; the world stays visible above it.
const BottomSheet = ({ open, onClose, title, children, height = '60dvh', dim = false }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[55]">
            <div className="absolute inset-0" style={{ background: dim ? 'rgba(0,0,0,0.4)' : 'transparent' }} onClick={onClose} />
            <div className="absolute inset-x-0 bottom-0 panel sheet flex flex-col safe-bottom anim-slide-up" style={{ maxHeight: height }} onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-[color:var(--line)] shrink-0">
                    <span className="panel-title text-[15px]">{title}</span>
                    <button type="button" onClick={onClose} className="btn !h-8 !w-8 !p-0" aria-label="Close"><Icon name="close" size={14} /></button>
                </div>
                <div className="overflow-y-auto scroll-thin px-2.5 py-2 min-h-0">{children}</div>
            </div>
        </div>
    );
};

export default BottomSheet;
