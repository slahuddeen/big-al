import React from 'react';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const TIPS = [
    ['footprint', 'Click a highlighted area to move, or a distant one to travel there.'],
    ['mouse', 'Drag to pan. Right-drag (or Shift-drag) to orbit and tilt. Wheel to zoom.'],
    ['claw', 'Animals in your area appear on the right. Pick your fights.'],
    ['wave', 'Water is your home. Start in the shallows; the great river is safe to swim once you have grown. Land hunters will not follow you in.'],
    ['sleep', 'Sleep to heal, drink to stay alive, and learn new abilities as you grow.']
];

const TOUCH_TIPS = [
    ['footprint', 'Tap a highlighted area to move, or a distant one to travel there. Press and hold an area to see what is there.'],
    ['mouse', 'Drag to pan. Pinch to zoom; twist two fingers to rotate and slide them up or down to tilt.'],
    ['claw', 'Tap the button above the action bar to see the animals in your area and pick your fights. Tap the status bar for goals.'],
    ['wave', 'Water is your home. Start in the shallows; the great river is safe to swim once you have grown. Land hunters will not follow you in.']
];

// First screen: sets the scene and the controls
const IntroOverlay = ({ onStart, mobile = false }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade" style={{ background: 'radial-gradient(ellipse at center, rgba(10,14,8,0.35), rgba(5,7,4,0.85))' }}>
        <div className="panel w-full max-w-[540px] p-6 anim-pop max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center gap-4">
                <CreaturePortrait species="Big Al" level={1} size={96} height={92} className="anim-bob shrink-0" />
                <div>
                    <div className="label">Kem Kem rivers · 95 million years ago</div>
                    <h1 className="panel-title text-[44px] leading-none mt-1" style={{ color: 'var(--accent)' }}>Spino</h1>
                    <p className="text-ink-muted text-[14px] mt-2 leading-snug">You have just hatched on a sandbank of the great river, a Spinosaurus weighing one kilogram. The land belongs to Carcharodontosaurus. The water could be yours.</p>
                </div>
            </div>
            <div className="mt-5 space-y-2">
                {(mobile ? TOUCH_TIPS : TIPS).map(([icon, text]) => (
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
