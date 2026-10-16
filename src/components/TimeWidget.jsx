import React from 'react';
import { getTimeOfDay, TOTAL_CYCLE } from '../game/gameConstants.js';
import { playerMisty, weatherNow } from '../game/gameState.js';
import { seasonOf, isDrought } from '../game/weather.js';
import Icon from './Icon.jsx';

// Sun (or moon) travelling over a small arc: one notch per turn of the day
const PHASE_COLORS = ['#ffcf7a', '#fff1b8', '#ff9a5a', '#a8b8ff', '#c0a8ff'];

const TimeWidget = ({ gameState }) => {
    const t = getTimeOfDay(gameState.moveNumber);
    const misty = playerMisty(gameState);
    const season = seasonOf(gameState.moveNumber);
    const drought = isDrought(gameState.moveNumber);
    const weather = weatherNow(gameState);
    const phase = t.turnInCycle;
    const ang = Math.PI * (1 - (phase + 0.5) / TOTAL_CYCLE);
    const cx = 50 + Math.cos(ang) * 40;
    const cy = 44 - Math.sin(ang) * 30;
    return (
        <div className="panel px-4 pt-2 pb-2 flex items-center gap-4 anim-slide-down">
            <svg width="100" height="48" viewBox="0 0 100 48" className="shrink-0">
                <path d="M10 44 A40 30 0 0 1 90 44" fill="none" stroke="rgba(255,236,200,0.18)" strokeWidth="1.5" strokeDasharray="2 4" />
                {Array.from({ length: TOTAL_CYCLE }, (_, i) => {
                    const a = Math.PI * (1 - (i + 0.5) / TOTAL_CYCLE);
                    return <circle key={i} cx={50 + Math.cos(a) * 40} cy={44 - Math.sin(a) * 30} r={1.6} fill={i === phase ? PHASE_COLORS[i] : 'rgba(255,236,200,0.25)'} />;
                })}
                <line x1="4" y1="44.5" x2="96" y2="44.5" stroke="rgba(255,236,200,0.25)" />
                <circle cx={cx} cy={cy} r="8" fill={PHASE_COLORS[phase]} opacity="0.25" />
                <circle cx={cx} cy={cy} r="5" fill={PHASE_COLORS[phase]} />
            </svg>
            <div className="min-w-[132px]">
                <div className="flex items-center gap-1.5">
                    <Icon name={t.isNight ? 'moon' : 'sun'} size={15} style={{ color: PHASE_COLORS[phase] }} />
                    <span className="panel-title text-[17px] leading-none">{t.phaseName}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11.5px] text-ink-muted">
                    <span>Day <span className="pixel text-ink">{t.day}</span></span>
                    <span className="opacity-40">|</span>
                    <span>Turn <span className="pixel text-ink">{gameState.moveNumber}</span></span>
                    <span className="opacity-40">|</span>
                    <span title="Score"><Icon name="star" size={11} className="inline -mt-0.5 mr-0.5" style={{ color: 'var(--accent)' }} /><span className="pixel text-ink">{gameState.score}</span></span>
                </div>
            </div>
            <div className="flex flex-col gap-1 items-start">
                <span className="chip" style={{ color: season.name === 'wet' ? '#8fd46a' : drought ? '#ef8f55' : '#e8c060' }}
                    title={season.name === 'wet' ? 'Wet season: rain, green growth, herds out on the plains' : drought ? 'Drought: small waters have dried up; animals crowd the rivers' : 'Dry season: water is scarce and you get thirsty faster'}>
                    <Icon name={season.name === 'wet' ? 'leaf' : 'sun'} size={12} />
                    {season.name === 'wet' ? 'Wet season' : drought ? 'Drought' : 'Dry season'}
                    <span className="text-ink-dim">{Math.ceil(season.turnsLeft / 5)}d</span>
                </span>
                {weather !== 'clear' && (
                    <span className="chip" title={weather === 'storm' ? 'Storm: you see less, and your scent is hidden' : weather === 'rain' ? 'Rain: your scent washes away and there are puddles to drink' : 'Overcast'}>
                        <Icon name={weather === 'cloudy' ? 'cloud' : weather} size={12} />{weather === 'cloudy' ? 'Overcast' : weather === 'rain' ? 'Rain' : 'Storm'}
                    </span>
                )}
            </div>
            {misty && (
                <span className="chip" title="Morning mist: you see less, but predators notice you less too">
                    <Icon name="mist" size={12} />Mist
                </span>
            )}
        </div>
    );
};

export default TimeWidget;
