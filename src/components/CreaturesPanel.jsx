import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { previewAttack } from '../utils/combatUtils.js';
import { ABILITIES, ATTACK_MODS, abilityUnlocked, cooldownLeft, inCover } from '../game/abilities.js';
import { creatureThreat, playerFierceness, playerMisty, hatchetTarget } from '../game/gameState.js';
import { POI_TYPES } from '../game/pois.js';
import { formatWeight, ageLabel } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const THREAT = {
    easy: { label: 'Easy prey', color: 'var(--good)' },
    fair: { label: 'Fair fight', color: 'var(--warn)' },
    dangerous: { label: 'Dangerous', color: 'var(--bad)' },
    meagre: { label: 'Barely a snack', color: 'var(--muted)' }
};

const oddsColor = (p) => (p >= 70 ? 'var(--good)' : p >= 40 ? 'var(--warn)' : 'var(--bad)');
const POI_ICONS = { eggs: 'egg', sauropodcarcass: 'bone', wallow: 'mud', lookout: 'mountain', bonebed: 'bone', waterfall: 'waterfall', volcano: 'volcano', seashore: 'wave' };

const AttackButton = ({ label, icon, odds, disabled, reason, onClick, primary }) => (
    <button
        type="button"
        disabled={disabled}
        title={reason || undefined}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`btn ${primary ? 'btn-primary' : ''} flex-1 min-w-0 !px-2 !py-1.5`}
    >
        <Icon name={icon} size={14} />
        <span className="truncate">{label}</span>
        {odds !== null && !disabled && <span className="pixel text-[12px]" style={primary ? undefined : { color: oddsColor(odds) }}>{odds}%</span>}
    </button>
);

const CreatureCard = ({ creature, gameState, dispatch }) => {
    const sd = SPECIES_DATA[creature.species];
    if (!sd) return null;
    const base = previewAttack(gameState, creature, ATTACK_MODS.normal, 'normal');
    const weight = sd.weight * creature.size;
    const threat = base.success >= 70 ? (base.energyGain < 5 ? 'meagre' : 'easy') : base.success >= 40 ? 'fair' : 'dangerous';
    const attack = (style) => dispatch({ type: 'ATTACK_CREATURE', creatureId: creature.id, style });
    const misty = playerMisty(gameState);

    // alternative attacks from Big Al's abilities
    const styles = ['pounce', 'ambush', 'hatchet']
        .filter((id) => abilityUnlocked(gameState, id))
        .map((id) => {
            const cd = cooldownLeft(gameState, id);
            let reason = cd > 0 ? `Ready in ${cd} turn${cd > 1 ? 's' : ''}` : null;
            if (!reason && id === 'ambush' && !inCover(gameState, misty)) reason = 'Needs cover: forest, ferns, marsh or mist';
            if (!reason && id === 'hatchet' && !hatchetTarget(gameState, creature)) reason = 'Only worth it on big animals';
            if (id === 'pounce' && weight > gameState.weight * 2) return null; // no use against big things
            const odds = previewAttack(gameState, creature, ATTACK_MODS[id], id).success;
            return { id, reason, odds };
        })
        .filter(Boolean);

    return (
        <div className={`card threat-${threat} anim-slide-left`}>
            <div className="flex gap-3 p-2.5 pb-2">
                <div className="w-[84px] h-[62px] rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'radial-gradient(100% 90% at 50% 100%, rgba(255,244,220,0.12), rgba(0,0,0,0.25))' }}>
                    <CreaturePortrait species={creature.species} size={80} height={58} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-[14.5px] leading-tight truncate">{creature.species}</div>
                        <span className="pixel text-[18px] leading-none" style={{ color: oddsColor(base.success) }} title="Chance a normal attack succeeds">{base.success}%</span>
                    </div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                        <span className="chip" style={{ color: THREAT[threat].color, borderColor: 'currentColor' }}>{THREAT[threat].label}</span>
                        <span className="chip">{ageLabel(creature.size)} · {formatWeight(weight)}</span>
                        <span className="chip" title="Energy if you catch it"><Icon name="meat" size={11} />+{base.energyGain}</span>
                    </div>
                    {creature.wounded && (
                        <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--bad)' }}>Bleeding</span>
                            <div className="meter flex-1" style={{ height: 5 }}><i style={{ width: `${Math.max(0, creature.health)}%`, background: 'var(--bad)' }} /></div>
                        </div>
                    )}
                </div>
            </div>
            <div className="px-2.5 pb-2.5 flex gap-1.5">
                <AttackButton label="Attack" icon="claw" odds={null} primary={threat !== 'dangerous'} onClick={() => attack('normal')} />
                {styles.map((s) => (
                    <AttackButton key={s.id} label={ABILITIES[s.id].name.replace(' Bite', '')} icon={s.id} odds={s.odds} disabled={!!s.reason} reason={s.reason || ABILITIES[s.id].desc} onClick={() => attack(s.id)} />
                ))}
            </div>
        </div>
    );
};

const CarcassCard = ({ carcass, gameState, dispatch }) => {
    const age = gameState.moveNumber - carcass.turn;
    return (
        <div className="card anim-slide-left" style={{ borderColor: 'rgba(200,90,80,0.4)' }}>
            <div className="flex gap-3 p-2.5 items-center">
                <div className="w-[70px] h-[48px] rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <CreaturePortrait species={carcass.species} size={64} height={44} dead />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] truncate">{carcass.species} carcass</div>
                    <div className="text-[11.5px] text-ink-muted">{age <= 2 ? 'Fresh kill' : age <= 8 ? 'Getting ripe' : 'Rotting'}{carcass.portions > 1 ? ` · ${carcass.portions} meals left` : ''}</div>
                </div>
                <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SCAVENGE', carcassId: carcass.id }); }}>
                    <Icon name="meat" size={14} />Feed
                </button>
            </div>
        </div>
    );
};

const PoiCard = ({ poi, dispatch }) => {
    const def = POI_TYPES[poi.type];
    const usable = def.action && poi.portions > 0;
    return (
        <div className="card anim-slide-left" style={{ borderColor: 'rgba(244,183,64,0.35)' }}>
            <div className="flex gap-3 p-2.5 items-center">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(244,183,64,0.12)', color: 'var(--accent)' }}>
                    <Icon name={POI_ICONS[poi.type]} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px]">{def.name}</div>
                    <div className="text-[11.5px] text-ink-muted leading-snug">{def.action && poi.portions === 0 ? 'Nothing left here.' : def.desc}</div>
                </div>
                {usable && (
                    <button type="button" className="btn btn-primary shrink-0" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'USE_POI' }); }}>
                        {def.action}
                    </button>
                )}
            </div>
        </div>
    );
};

// Everything on Big Al's area, plus a glance at what's next door
const CreaturesPanel = ({ gameState, dispatch }) => {
    if (gameState.gameOver) return null;
    const playerKey = gameState.player;
    const here = gameState.cells.get(playerKey);
    const creatures = gameState.creatures.get(playerKey) || [];
    const carcasses = gameState.carcasses.get(playerKey) || [];
    const poi = gameState.pois.get(playerKey);
    const pf = playerFierceness(gameState);
    const nearby = [];
    for (const n of here?.neighbors || []) {
        if (!gameState.cells.get(n)?.inSight) continue;
        for (const c of gameState.creatures.get(n) || []) nearby.push(c);
    }
    const dangerNear = nearby.filter((c) => creatureThreat(c) > pf);
    if (!creatures.length && !carcasses.length && !poi && !dangerNear.length) return null;

    return (
        <div className="panel w-[340px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-300px)] flex flex-col anim-slide-left" onMouseDown={(e) => e.stopPropagation()}>
            <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-[color:var(--line)]">
                <div>
                    <div className="label">Your area</div>
                    <div className="panel-title text-[16px] leading-tight">{TERRAIN_TYPES[here.terrain].name}</div>
                </div>
                {creatures.length > 0 && <span className="chip"><Icon name="paw" size={12} />{creatures.length} here</span>}
            </div>
            <div className="p-2.5 space-y-2 overflow-y-auto scroll-thin">
                {poi && <PoiCard poi={poi} dispatch={dispatch} />}
                {creatures.map((c) => <CreatureCard key={c.id} creature={c} gameState={gameState} dispatch={dispatch} />)}
                {carcasses.map((c) => <CarcassCard key={c.id} carcass={c} gameState={gameState} dispatch={dispatch} />)}
                {dangerNear.length > 0 && (
                    <div className="rounded-xl px-2.5 py-2" style={{ background: 'rgba(239,95,85,0.08)', border: '1px solid rgba(239,95,85,0.3)' }}>
                        <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: 'var(--bad)' }}>
                            <Icon name="warn" size={14} />Danger next door
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {[...new Set(dangerNear.map((c) => c.species))].slice(0, 6).map((sp) => {
                                const n = dangerNear.filter((c) => c.species === sp).length;
                                return <span key={sp} className="chip !pl-1"><CreaturePortrait species={sp} size={26} height={18} />{sp}{n > 1 ? ` ×${n}` : ''}</span>;
                            })}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-1">Aggressive animals will charge into your area to attack.</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreaturesPanel;
