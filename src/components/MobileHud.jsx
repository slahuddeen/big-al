import React from 'react';
import { getTimeOfDay } from '../game/gameConstants.js';
import { LEVEL_NAMES, LEVEL_WEIGHTS, weatherNow, playerMisty, eruptionNow } from '../game/gameState.js';
import { seasonOf, isDrought } from '../game/weather.js';
import { formatWeight, capitalise } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const Mini = ({ icon, value, color }) => (
    <div className="flex items-center gap-1 min-w-0">
        <Icon name={icon} size={11} style={{ color, flexShrink: 0 }} />
        <div className={`meter flex-1 ${value < 25 ? 'low' : ''}`} style={{ height: 6 }}>
            <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
        </div>
    </div>
);

// Phone status strip: who you are, your three meters and the time of day in one row.
// Tap it to open the full status sheet (growth, goals, pack and traits).
const MobileHud = ({ gameState, onOpen }) => {
    const { level, weight } = gameState;
    const t = getTimeOfDay(gameState.moveNumber);
    const season = seasonOf(gameState.moveNumber);
    const drought = isDrought(gameState.moveNumber);
    const weather = weatherNow(gameState);
    const maxLevel = level >= LEVEL_WEIGHTS.length - 1;
    const from = LEVEL_WEIGHTS[level - 1] || 0;
    const to = LEVEL_WEIGHTS[level];
    const growth = maxLevel ? 100 : Math.max(0, Math.min(100, ((Math.log(weight) - Math.log(Math.max(1, from))) / (Math.log(to) - Math.log(Math.max(1, from)))) * 100));
    return (
        <div className="absolute top-0 inset-x-0 px-2 safe-top pointer-events-none z-[40]">
            <button type="button" onClick={onOpen} className="panel pointer-events-auto w-full flex items-center gap-2 p-1.5 text-left">
                <div className="w-[46px] h-[42px] rounded-sm overflow-hidden flex items-end justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid var(--line)' }}>
                    <CreaturePortrait species="Big Al" level={level} size={44} height={40} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="panel-title text-[14px] leading-none" style={{ color: 'var(--accent)' }}>Yutyrannus</span>
                        <span className="text-[11px] text-ink-muted truncate">{capitalise(LEVEL_NAMES[level])} · <span className="pixel text-ink">{formatWeight(weight)}</span></span>
                    </div>
                    <div className="meter mt-1" style={{ height: 3 }}>
                        <i style={{ width: `${growth}%`, background: 'linear-gradient(90deg, #8a6ad8, var(--accent))' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                        <Mini icon="heart" value={gameState.fitness} color="var(--health)" />
                        <Mini icon="meat" value={gameState.energy} color="var(--food)" />
                        <Mini icon="water" value={gameState.hydration} color="var(--water)" />
                    </div>
                </div>
                <div className="shrink-0 text-right pl-1">
                    <div className="flex items-center justify-end gap-1">
                        <Icon name={t.isNight ? 'moon' : 'sun'} size={12} style={{ color: 'var(--accent)' }} />
                        <span className="panel-title text-[12px] leading-none">{t.phaseName}</span>
                    </div>
                    <div className="text-[10.5px] text-ink-muted mt-1 leading-none">Day <span className="pixel text-ink">{t.day}</span></div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        {weather !== 'clear' && <Icon name={weather === 'cloudy' ? 'cloud' : weather} size={12} />}
                        {playerMisty(gameState) && <Icon name="mist" size={12} />}
                        {eruptionNow(gameState).phase !== 'none' && <Icon name="ash" size={12} style={{ color: '#e08a6a' }} />}
                        <span className="text-[10px] font-bold leading-none" style={{ color: season.name === 'summer' ? '#7fae6a' : drought ? '#9ac8e8' : '#c8d4e0' }}>
                            {season.name === 'summer' ? 'Summer' : drought ? 'Frozen' : 'Winter'} {Math.ceil(season.turnsLeft / 5)}d
                        </span>
                    </div>
                </div>
            </button>
        </div>
    );
};

export default MobileHud;
