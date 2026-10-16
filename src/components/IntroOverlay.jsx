import React from 'react';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const TIPS = [
    ['footprint', 'Click a highlighted area to move, or a distant one to travel there.'],
    ['mouse', 'Drag to pan. Right-drag (or Shift-drag) to orbit and tilt. Wheel to zoom.'],
    ['claw', 'Animals in your area appear on the right. Pick your fights.'],
    ['sleep', 'Sleep to heal, drink to stay alive, and learn new abilities as you grow.']
];

// First screen: sets the scene and the controls
const IntroOverlay = ({ onStart }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade" style={{ background: 'radial-gradient(ellipse at center, rgba(10,14,8,0.35), rgba(5,7,4,0.85))' }}>
        <div className="panel w-full max-w-[540px] p-6 anim-pop">
            <div className="flex items-center gap-4">
                <CreaturePortrait species="Big Al" level={1} size={96} height={92} className="anim-bob shrink-0" />
                <div>
                    <div className="label">Late Jurassic · 150 million years ago</div>
                    <h1 className="panel-title text-[44px] leading-none mt-1" style={{ color: 'var(--accent)' }}>Big Al</h1>
                    <p className="text-ink-muted text-[14px] mt-2 leading-snug">You have just hatched in the Morrison basin, a young Allosaurus weighing one kilogram. Grow up.</p>
                </div>
            </div>
            <div className="mt-5 space-y-2">
                {TIPS.map(([icon, text]) => (
                    <div key={text} className="flex items-start gap-2.5 text-[13.5px]">
                        <Icon name={icon} size={17} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                        <span>{text}</span>
                    </div>
                ))}
            </div>
            <button type="button" autoFocus onClick={onStart} className="btn btn-primary w-full mt-6 !py-3 text-[16px]">
                Crack out of the egg
            </button>
        </div>
    </div>
);

export default IntroOverlay;
