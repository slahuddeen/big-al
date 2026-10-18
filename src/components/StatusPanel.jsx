import React from 'react';
import { LEVEL_NAMES, LEVEL_WEIGHTS } from '../game/gameState.js';
import { PASSIVES, hasPassive } from '../game/abilities.js';
import { activeGoals } from '../game/goals.js';
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
const StatusPanel = ({ gameState, sheet = false }) => {
    const { level, weight } = gameState;
    const maxLevel = level >= LEVEL_WEIGHTS.length - 1;
    const from = LEVEL_WEIGHTS[level - 1] || 0;
    const to = LEVEL_WEIGHTS[level];
    // growth is shown on a log scale: 1kg to 15kg should not look stuck
    const progress = maxLevel ? 100 : Math.max(0, Math.min(100, ((Math.log(weight) - Math.log(Math.max(1, from))) / (Math.log(to) - Math.log(Math.max(1, from)))) * 100));
    const passives = PASSIVES.filter((p) => hasPassive(gameState, p.id));

    return (
        <div className={sheet ? 'p-1' : 'panel p-3 w-[264px] anim-fade'}>
            <div className="flex gap-3 items-center">
                <div className="relative w-[72px] h-[64px] rounded-xl overflow-hidden flex items-end justify-center shrink-0"
                    style={{ background: 'radial-gradient(90% 80% at 50% 90%, rgba(124,207,106,0.35), rgba(0,0,0,0.25))', border: '1px solid var(--line)' }}>
                    <CreaturePortrait species="Big Al" level={level} size={66} height={58} className="anim-bob" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="panel-title text-[22px] leading-none text-[color:var(--accent)]">Yutyrannus</div>
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

            {(gameState.pack || []).length > 0 && (
                <div className="mt-3 pt-2 border-t border-[color:var(--line)]">
                    <div className="label mb-1 flex items-center gap-1"><Icon name="paw" size={11} />Hunting pack</div>
                    <div className="space-y-1">
                        {gameState.pack.map((m) => (
                            <div key={m.id} className="flex items-center gap-2" title={`${m.name}: ${Math.round(m.health)}% health. Adds bite power and shares your kills.`}>
                                <CreaturePortrait species="Young Yutyrannus" size={34} height={22} />
                                <span className="text-[12px] font-semibold w-12 truncate">{m.name}</span>
                                <div className="meter flex-1" style={{ height: 5 }}><i style={{ width: `${Math.max(0, m.health)}%`, background: 'var(--health)' }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-3 pt-2 border-t border-[color:var(--line)]">
                <div className="label mb-1 flex items-center gap-1"><Icon name="star" size={11} />Goals</div>
                <div className="space-y-0.5">
                    {activeGoals(gameState).map((g) => {
                        const done = gameState.goals?.[g.id] !== undefined;
                        return (
                            <div key={g.id} className="flex items-start gap-1.5 text-[11.5px] leading-snug" style={{ opacity: done ? 0.55 : 1 }}>
                                <Icon name={done ? 'check' : 'target'} size={12} style={{ color: done ? 'var(--good)' : 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                                <span className={done ? 'line-through text-ink-muted' : 'text-ink'}>{g.text}</span>
                            </div>
                        );
                    })}
                </div>
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
