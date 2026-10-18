import React from 'react';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const TIPS = [
    ['footprint', 'Click a highlighted area to move, or a distant one to travel there.'],
    ['mouse', 'Drag to pan. Right-drag (or Shift-drag) to orbit and tilt. Wheel to zoom.'],
    ['claw', 'Animals in your area appear on the right. Pick your fights.'],
    ['snow', 'Winters are cold. Your feathers keep you warm, but eat well before the snow, and shelter in the forest or by the hot springs.'],
    ['sleep', 'Sleep to heal, drink to stay alive, and learn new abilities as you grow.']
];

const TOUCH_TIPS = [
    ['footprint', 'Tap a highlighted area to move, or a distant one to travel there. Press and hold an area to see what is there.'],
    ['mouse', 'Drag to pan. Pinch to zoom; twist two fingers to rotate and slide them up or down to tilt.'],
    ['claw', 'Tap the button above the action bar to see the animals in your area and pick your fights. Tap the status bar for goals.'],
    ['snow', 'Winters are cold. Your feathers keep you warm, but eat well before the snow, and shelter in the forest or by the hot springs.'],
    ['ash', 'When the volcano rumbles, get to high ground: gas from an eruption pours down into the lake basins.']
];

// First screen: sets the scene and the controls
const IntroOverlay = ({ onStart, mobile = false }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade" style={{ background: 'radial-gradient(ellipse at center, rgba(232,227,214,0.1), rgba(28,27,25,0.7))' }}>
        <div className="panel w-full max-w-[540px] p-6 anim-pop max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center gap-4">
                <CreaturePortrait species="Big Al" level={1} size={mobile ? 64 : 96} height={mobile ? 62 : 92} className="anim-bob shrink-0" />
                <div className="min-w-0">
                    <div className="label">Jehol lakes, Liaoning · 125 million years ago</div>
                    <h1 className={`panel-title ${mobile ? 'text-[30px] gap-2' : 'text-[40px] gap-3'} leading-none mt-1 flex items-center`} style={{ color: 'var(--ink)' }}>Yutyrannus<span className={`seal shrink-0 ${mobile ? 'text-[19px] w-[29px] h-[50px]' : 'text-[24px] w-[36px] h-[64px]'}`} style={{ writingMode: 'vertical-rl' }} title="Yu wang, the feathered king: its Chinese name">羽王</span></h1>
                    <p className="text-ink-muted text-[14px] mt-2 leading-snug">You have just hatched from a warm nest mound among the volcanic lakes: a feathered tyrannosaur weighing under a kilogram. Grown, you will be nine metres long and the largest feathered animal of your world.</p>
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
