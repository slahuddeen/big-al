import React from 'react';
import { LEVEL_NAMES, LEVEL_WEIGHTS } from '../game/gameState.js';
import { PASSIVES, hasPassive } from '../game/abilities.js';
import { formatWeight, capitalise } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const Meter = ({ icon, label, value, color }) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className="flex items-center gap-2" title={`${label}: ${v}%`}>
            <Icon name={icon} size={15} style={{ color }} />
            <div className="flex-1">
                <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[11px] font-semibold text-ink-muted">{label}</span>
                    <span className="pixel text-[13px]" style={{ color: v <= 25 ? 'var(--bad)' : 'var(--ink)' }}>{v}</span>
                </div>
                <div className={`meter segmented ${v <= 25 ? 'low' : ''}`}>
                    <i style={{ width: `${v}%`, backgroundColor: color }} />
                </div>
            </div>
        </div>
    );
};

const PASSIVE_ICONS = { tiny: 'leaf', legs: 'legs', hide: 'shield', apex: 'crown' };

// Big Al's portrait, growth stage and survival meters
const StatusPanel = ({ gameState }) => {
    const { level, weight } = gameState;
    const maxLevel = level >= LEVEL_WEIGHTS.length - 1;
    const from = LEVEL_WEIGHTS[level - 1] || 0;
    const to = LEVEL_WEIGHTS[level];
    // growth is shown on a log scale: 1kg to 15kg should not look stuck
    const progress = maxLevel ? 100 : Math.max(0, Math.min(100, ((Math.log(weight) - Math.log(Math.max(1, from))) / (Math.log(to) - Math.log(Math.max(1, from)))) * 100));
    const passives = PASSIVES.filter((p) => hasPassive(gameState, p.id));

    return (
        <div className="panel p-3 w-[264px] anim-fade">
            <div className="flex gap-3 items-center">
                <div className="relative w-[72px] h-[64px] rounded-xl overflow-hidden flex items-end justify-center shrink-0"
                    style={{ background: 'radial-gradient(90% 80% at 50% 90%, rgba(124,207,106,0.35), rgba(0,0,0,0.25))', border: '1px solid var(--line)' }}>
                    <CreaturePortrait species="Big Al" level={level} size={66} height={58} className="anim-bob" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="panel-title text-[22px] leading-none text-[color:var(--accent)]">Big Al</div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="chip" style={{ color: 'var(--ink)' }}><Icon name="level" size={12} />{capitalise(LEVEL_NAMES[level])}</span>
                        <span className="chip pixel" style={{ color: 'var(--accent)', fontSize: 12 }}>{formatWeight(weight)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-3">
                <div className="flex justify-between items-baseline">
                    <span className="label">Growth</span>
                    <span className="text-[11px] text-ink-muted">{maxLevel ? 'Fully grown' : `${capitalise(LEVEL_NAMES[level + 1])} at ${formatWeight(to)}`}</span>
                </div>
                <div className="meter mt-1" style={{ height: 6 }}>
                    <i style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #8a6ad8, var(--accent))' }} />
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <Meter icon="heart" label="Health" value={gameState.fitness} color="var(--health)" />
                <Meter icon="meat" label="Energy" value={gameState.energy} color="var(--food)" />
                <Meter icon="water" label="Water" value={gameState.hydration} color="var(--water)" />
            </div>

            {passives.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[color:var(--line)] flex gap-1.5 flex-wrap">
                    {passives.map((p) => (
                        <span key={p.id} className="chip" title={p.desc}><Icon name={PASSIVE_ICONS[p.id]} size={12} />{p.name}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusPanel;
