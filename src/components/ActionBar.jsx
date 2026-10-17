import React, { useEffect, useState } from 'react';
import { ABILITIES, abilityUnlocked, cooldownLeft } from '../game/abilities.js';
import { WATER_SOURCES, shelterOf } from '../game/environment.js';
import { LEVEL_NAMES, sleepBlockers, canDrink, hideChance, raining, canHideHere } from '../game/gameState.js';
import { capitalise } from '../utils/format.js';
import Icon from './Icon.jsx';

// What each slot does right now: enabled state, reason it's not, tooltip text
export const getActions = (gameState) => {
    const here = gameState.cells.get(gameState.player);
    const blockers = sleepBlockers(gameState);
    const water = canDrink(gameState);
    const nearDried = here && [gameState.player, ...here.neighbors].some((k) => WATER_SOURCES.has(gameState.cells.get(k)?.terrain));
    const wallow = gameState.pois.get(gameState.player)?.type === 'wallow';
    const shelter = here ? shelterOf(here.terrain)[0] : 1;
    const ability = (id) => {
        const a = ABILITIES[id];
        const unlocked = abilityUnlocked(gameState, id);
        const cd = cooldownLeft(gameState, id);
        let reason = null;
        if (!unlocked) reason = gameState.level > (a.maxLevel ?? 99) ? 'You are too big for this now' : `Unlocks as a ${LEVEL_NAMES[a.level]}`;
        else if (cd > 0) reason = `Ready in ${cd} turn${cd > 1 ? 's' : ''}`;
        else if (gameState.energy <= (a.energy || 0)) reason = 'Too tired';
        return { id, icon: id, label: a.name, desc: a.desc, unlocked, cooldown: cd, reason, cost: a.energy };
    };
    return [
        {
            id: 'sleep', icon: 'sleep', label: 'Sleep', unlocked: true,
            reason: blockers.length ? `Not safe: a ${blockers[0].species} is right here` : null,
            desc: `Sleep through this part of the day to heal.${wallow ? ' The mud wallow doubles healing.' : shelter > 1.1 ? ' Good cover here: you heal faster and are harder to find.' : shelter < 1 ? ' Exposed ground: you heal slowly and predators may find you.' : ''} You still get hungrier and thirstier.`
        },
        {
            id: 'drink', icon: 'drink', label: 'Drink', unlocked: true,
            reason: !water ? (nearDried ? 'The water here has dried up' : 'No fresh water within reach') : gameState.hydration >= 99 ? 'Not thirsty' : null,
            desc: raining(gameState) ? 'It is raining: lap water from the puddles anywhere.' : 'Drink your fill from water here or next to you. Watch for crocodiles. In the drought, streams, waterholes and marshes dry up.'
        },
        (() => {
            const h = ability('hide');
            const reason = h.reason || (canHideHere(gameState) ? null : 'Too big to hide on land: get into the water');
            return { ...h, reason, desc: `${ABILITIES.hide.desc} Cover here: ${canHideHere(gameState) ? Math.round(hideChance(gameState) * 100) : 0}%.` };
        })(),
        ability('sniff'),
        { ...ability('dash'), armed: gameState.dashArmed, reason: gameState.dashArmed ? null : ability('dash').reason },
        ability('roar')
    ];
};

const Slot = ({ action, hotkey, onClick, compact = false, onExplain }) => {
    const [hover, setHover] = useState(false);
    const disabled = !!action.reason && !action.armed;
    return (
        <div className="relative" onMouseEnter={() => !compact && setHover(true)} onMouseLeave={() => setHover(false)}>
            <button
                type="button"
                className={`action-slot ${compact ? 'compact' : ''} ${disabled ? 'disabled' : ''} ${action.armed ? 'armed' : ''}`}
                // on a phone there is no hover: tapping a locked button explains why instead
                onClick={() => (disabled ? onExplain?.(action) : onClick())}
                aria-label={action.label}
            >
                {!compact && <span className="hotkey">{hotkey}</span>}
                <Icon name={action.unlocked ? action.icon : 'lock'} size={compact ? 21 : 24} style={{ color: action.armed ? 'var(--accent)' : 'var(--ink)' }} />
                <span className="slot-label">{action.label}</span>
                {action.unlocked && action.cooldown > 0 && <span className="cooldown">{action.cooldown}</span>}
            </button>
            {hover && (
                <div className="tooltip panel p-2.5 anim-pop">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-[13px]">{action.label}</span>
                        {action.cost ? <span className="chip"><Icon name="meat" size={11} />-{action.cost}</span> : null}
                    </div>
                    <div className="text-[12px] text-ink-muted leading-snug mt-1">{action.desc}</div>
                    {action.armed && <div className="text-[12px] mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>Armed: click an area to dash there.</div>}
                    {action.reason && !action.armed && <div className="text-[12px] mt-1.5 font-semibold" style={{ color: 'var(--warn)' }}>{action.reason}</div>}
                </div>
            )}
        </div>
    );
};

const ActionBar = ({ gameState, dispatch, onJournal, journalNew, compact = false }) => {
    const [explain, setExplain] = useState(null);
    useEffect(() => {
        if (!explain) return undefined;
        const id = setTimeout(() => setExplain(null), 2600);
        return () => clearTimeout(id);
    }, [explain]);
    if (gameState.gameOver) return null;
    const actions = getActions(gameState);
    const run = (a) => {
        if (a.id === 'sleep') dispatch({ type: 'SLEEP' });
        else if (a.id === 'drink') dispatch({ type: 'DRINK' });
        else if (a.id === 'hide') dispatch({ type: 'HIDE' });
        else dispatch({ type: 'USE_ABILITY', ability: a.id });
    };
    const journal = { id: 'journal', icon: 'book', label: 'Journal', unlocked: true, desc: `Your field journal: species you've seen, habitats, landmarks and how you grow.${journalNew ? ' New entries!' : ''}` };
    if (compact) {
        return (
            <div className="panel relative p-1.5 grid grid-cols-7 gap-1 w-full" onMouseDown={(e) => e.stopPropagation()}>
                {explain && (
                    <div className="absolute left-1.5 right-1.5 bottom-full mb-1.5 panel px-3 py-2 text-[12.5px] anim-fade pointer-events-none">
                        <span className="font-bold">{explain.label}: </span>
                        <span style={{ color: 'var(--warn)' }}>{explain.reason}</span>
                    </div>
                )}
                {actions.map((a, i) => <Slot key={a.id} action={a} hotkey={i + 1} compact onExplain={setExplain} onClick={() => run(a)} />)}
                <Slot action={journal} compact onClick={onJournal} />
                {journalNew && <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />}
            </div>
        );
    }
    return (
        <div className="panel relative p-2 flex gap-2 items-center anim-slide-down" onMouseDown={(e) => e.stopPropagation()}>
            {actions.map((a, i) => <Slot key={a.id} action={a} hotkey={i + 1} onClick={() => run(a)} />)}
            <div className="w-px self-stretch bg-[color:var(--line)] mx-0.5" />
            <Slot action={journal} hotkey="J" onClick={onJournal} />
            {journalNew && <span className="absolute -top-1 right-2 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />}
        </div>
    );
};

export const actionHotkeys = (gameState, dispatch, key) => {
    const idx = Number(key) - 1;
    const actions = getActions(gameState);
    const a = actions[idx];
    if (!a || (a.reason && !a.armed)) return false;
    if (a.id === 'sleep') dispatch({ type: 'SLEEP' });
    else if (a.id === 'drink') dispatch({ type: 'DRINK' });
    else if (a.id === 'hide') dispatch({ type: 'HIDE' });
    else dispatch({ type: 'USE_ABILITY', ability: a.id });
    return true;
};

export const levelName = (l) => capitalise(LEVEL_NAMES[l]);

export default ActionBar;
