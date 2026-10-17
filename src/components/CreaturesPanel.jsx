import React from 'react';
import { SPECIES_DATA } from '../data/species.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { previewAttack } from '../game/combat.js';
import { ABILITIES, abilityUnlocked, cooldownLeft, inCover } from '../game/abilities.js';
import { creatureThreat, playerFierceness, playerMisty, hatchetTarget, counterDamage, isBigGiant, canEnter } from '../game/gameState.js';
import { preyMass } from '../game/combat.js';
import { POI_TYPES } from '../game/pois.js';
import { formatWeight, ageLabel } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import FactsHover, { DietChip } from './SpeciesFacts.jsx';
import Icon from './Icon.jsx';

const THREAT = {
    easy: { label: 'Easy prey', color: 'var(--good)' },
    quick: { label: 'Hard to catch', color: 'var(--warn)' },
    fair: { label: 'Fair fight', color: 'var(--warn)' },
    dangerous: { label: 'Dangerous', color: 'var(--bad)' },
    meagre: { label: 'Barely a snack', color: 'var(--muted)' }
};

const POI_ICONS = { eggs: 'egg', sauropodcarcass: 'bone', wallow: 'mud', lookout: 'mountain', bonebed: 'bone', waterfall: 'waterfall', volcano: 'volcano', seashore: 'wave' };
const healthColor = (h) => (h > 60 ? 'var(--good)' : h > 30 ? 'var(--warn)' : 'var(--bad)');

const AttackButton = ({ label, icon, note, disabled, reason, onClick, primary }) => (
    <button
        type="button"
        disabled={disabled}
        title={reason || undefined}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`btn ${primary ? 'btn-primary' : ''} min-w-0 !px-2 !py-1.5`}
    >
        <Icon name={icon} size={14} />
        <span className="truncate">{label}</span>
        {note && !disabled && <span className="pixel text-[11px] opacity-80">{note}</span>}
    </button>
);

const Stat = ({ label, value, color, title }) => (
    <div className="flex-1 min-w-0 rounded-md px-1.5 py-1 text-center" style={{ background: 'rgba(0,0,0,0.25)' }} title={title}>
        <div className="pixel text-[14px] leading-none" style={{ color }}>{value}</div>
        <div className="text-[9.5px] uppercase tracking-wider text-ink-dim mt-0.5">{label}</div>
    </div>
);

const GIANT_SPECIES = new Set(['Rebbachisaurus', 'Aegyptosaurus', 'Paralititan']);

const CreatureCard = ({ creature, gameState, dispatch, guarded }) => {
    const sd = SPECIES_DATA[creature.species];
    if (!sd) return null;
    const counter = counterDamage(gameState, creature);
    const base = previewAttack(gameState, creature, 'normal', counter);
    if (guarded) base.catch = 25;
    const weight = sd.weight * creature.size;
    const health = Math.max(0, Math.round(creature.health ?? 100));
    const risk = base.counter * Math.max(0, base.bites - 1) + (base.bites > 1 ? 0 : 0);
    let threat = 'fair';
    if (base.bites === 1 && base.energyGain < 5) threat = 'meagre';
    else if (risk < 8 && base.catch >= 60) threat = 'easy';
    else if (risk < 8) threat = 'quick';
    else if (risk < gameState.fitness * 0.45 && base.counterMax < gameState.fitness * 0.6) threat = 'fair';
    else threat = 'dangerous';
    const attack = (style) => dispatch({ type: 'ATTACK_CREATURE', creatureId: creature.id, style });
    const misty = playerMisty(gameState);
    const canInvite = creature.species === 'Young Spinosaurus' && gameState.level >= 2 && (gameState.pack || []).length < 2 && !creature.engaged;

    // alternative attacks from Big Al's abilities
    const styles = ['pounce', 'ambush', 'hatchet']
        .filter((id) => abilityUnlocked(gameState, id))
        .map((id) => {
            const cd = cooldownLeft(gameState, id);
            let reason = cd > 0 ? `Ready in ${cd} turn${cd > 1 ? 's' : ''}` : null;
            if (!reason && id === 'ambush' && !inCover(gameState, misty)) reason = 'Needs cover: forest, ferns, marsh or mist';
            if (!reason && id === 'ambush' && creature.engaged) reason = 'It has already seen you';
            if (!reason && id === 'hatchet' && !hatchetTarget(gameState, creature)) reason = 'Only worth it on big animals';
            if (id === 'pounce' && weight > gameState.weight * 2) return null; // no use against big things
            const p = previewAttack(gameState, creature, id, counter);
            const note = id === 'pounce' ? `${p.catch}%` : id === 'ambush' ? `${p.bite}%` : 'bleed';
            return { id, reason, note };
        })
        .filter(Boolean);

    return (
        <div className={`card threat-${threat} anim-slide-left`}>
            <div className="flex gap-3 p-2.5 pb-2">
                <FactsHover species={creature.species} className="w-[84px] h-[62px] rounded-lg flex items-center justify-center shrink-0 relative">
                    <div className="absolute inset-0 rounded-lg" style={{ background: 'radial-gradient(100% 90% at 50% 100%, rgba(255,244,220,0.12), rgba(0,0,0,0.25))' }} />
                    <CreaturePortrait species={creature.species} size={80} height={58} />
                    <Icon name="info" size={11} className="absolute bottom-0.5 right-0.5" style={{ color: 'var(--muted)' }} />
                </FactsHover>
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14.5px] leading-tight truncate">{creature.species}</div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                        <span className="chip" style={{ color: THREAT[threat].color, borderColor: 'currentColor' }}>{THREAT[threat].label}</span>
                        <DietChip species={creature.species} />
                        <span className="chip">{ageLabel(creature.size)} · {formatWeight(weight)}</span>
                        <span className="chip" title="Energy if you bring it down"><Icon name="meat" size={11} />+{base.energyGain}</span>
                        {guarded && <span className="chip" style={{ color: 'var(--warn)' }} title="The adults close ranks around it. Harass the herd to cut it off first.">Guarded</span>}
                        {creature.separated && <span className="chip" style={{ color: 'var(--good)' }}>Cut off from its herd</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2" title={`Health ${health}%`}>
                        <Icon name="heart" size={11} style={{ color: healthColor(health) }} />
                        <div className="meter flex-1" style={{ height: 6 }}><i style={{ width: `${health}%`, background: healthColor(health) }} /></div>
                        {creature.wounded && <span className="text-[10.5px] font-semibold" style={{ color: 'var(--bad)' }}>bleeding</span>}
                    </div>
                </div>
            </div>
            <div className="px-2.5 pb-2 flex gap-1.5">
                <Stat label="Per bite" value={`${base.bite}%`} color="var(--ink)" title="How much of its health one bite takes" />
                <Stat label={base.bites === 1 ? 'One bite' : 'Bites'} value={base.bites > 20 ? '20+' : base.bites} color={base.bites <= 2 ? 'var(--good)' : base.bites <= 5 ? 'var(--warn)' : 'var(--bad)'} title="Bites to bring it down" />
                <Stat label="Hits back" value={base.bites === 1 ? '-' : `-${base.counterMax}`} color={base.counterMax < gameState.fitness * 0.25 ? 'var(--ink)' : 'var(--bad)'} title="Damage when it strikes back (it doesn't always)" />
                <Stat label="Catch" value={`${base.catch}%`} color={base.catch >= 70 ? 'var(--good)' : base.catch >= 40 ? 'var(--warn)' : 'var(--bad)'} title="Chance you reach it before it bolts" />
            </div>
            <div className={`px-2.5 pb-2.5 grid gap-1.5 ${styles.length + (canInvite ? 1 : 0) >= 3 ? 'grid-cols-2' : 'grid-flow-col auto-cols-fr'}`}>
                {canInvite && <AttackButton label="Fish together" icon="paw" primary onClick={() => dispatch({ type: 'INVITE', creatureId: creature.id })} reason="Invite this young spinosaur to fish alongside you" />}
                <AttackButton label={creature.engaged ? 'Bite' : 'Attack'} icon="claw" primary={!canInvite && threat !== 'dangerous'} onClick={() => attack('normal')} />
                {styles.map((st) => (
                    <AttackButton key={st.id} label={ABILITIES[st.id].name.replace(' Bite', '')} icon={st.id} note={st.note} disabled={!!st.reason} reason={st.reason || ABILITIES[st.id].desc} onClick={() => attack(st.id)} />
                ))}
            </div>
        </div>
    );
};

const HerdCard = ({ adults, young, gameState, dispatch }) => {
    const pack = (gameState.pack || []).length;
    const tries = adults[0]?.harried || 0;
    const odds = Math.round(Math.min(0.85, 0.18 + pack * 0.18 + (gameState.level - 2) * 0.12 + tries * 0.15) * 100);
    const canHarass = gameState.level >= 2;
    return (
        <div className="card anim-slide-left" style={{ borderColor: 'rgba(240,194,74,0.45)' }}>
            <div className="p-2.5">
                <div className="flex items-center gap-2">
                    <CreaturePortrait species={adults[0].species} size={54} height={36} />
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-[13.5px]">{adults[0].species} herd</div>
                        <div className="text-[11.5px] text-ink-muted leading-snug">{adults.length} adult{adults.length > 1 ? 's' : ''} guarding {young.length} young. Charge the herd to split it and leave a calf behind.</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <button type="button" className="btn btn-primary flex-1" disabled={!canHarass} title={canHarass ? 'Costs 8 energy. The adults may lash out with their tails. Each try wears them down; a pack helps a lot.' : 'You are too small to take on a herd'}
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'HARASS' }); }}>
                        <Icon name="harass" size={14} />Harass the herd<span className="pixel text-[11px] opacity-80">{odds}%</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const SmallFry = ({ list, dispatch }) => {
    const bySpecies = [...new Set(list.map((c) => c.species))];
    return (
        <div className="rounded-xl px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--line)' }}>
            <div className="label mb-1">Small fry: hardly worth your time</div>
            <div className="flex flex-wrap gap-1.5">
                {bySpecies.map((sp) => {
                    const of = list.filter((c) => c.species === sp);
                    return (
                        <button key={sp} type="button" className="chip !pl-1 hover:text-ink" title="Snap one up"
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ATTACK_CREATURE', creatureId: of[0].id }); }}>
                            <FactsHover species={sp} className="inline-flex"><CreaturePortrait species={sp} size={26} height={18} /></FactsHover>{sp}{of.length > 1 ? ` ×${of.length}` : ''}
                        </button>
                    );
                })}
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
// What is in Spino's area, for the phone's "area" button
export const areaInfo = (gameState) => {
    const here = gameState.cells.get(gameState.player);
    const creatures = gameState.creatures.get(gameState.player) || [];
    const pf = playerFierceness(gameState);
    let danger = creatures.some((c) => creatureThreat(c) > pf || c.chasing > 0);
    for (const n of here?.neighbors || []) {
        if (!gameState.cells.get(n)?.inSight) continue;
        if ((gameState.creatures.get(n) || []).some((c) => (creatureThreat(c) > pf || c.chasing > 0) && canEnter(gameState, gameState.player, c))) danger = true;
    }
    const carcasses = (gameState.carcasses.get(gameState.player) || []).length;
    const poi = gameState.pois.get(gameState.player);
    return { count: creatures.length, danger, carcasses, poi, any: creatures.length > 0 || carcasses > 0 || !!poi || danger };
};

const CreaturesPanel = ({ gameState, dispatch, sheet = false }) => {
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
    // only animals that can actually reach you: fish stay in the water, land hunters stay out of deep channels
    const dangerNear = nearby.filter((c) => (creatureThreat(c) > pf || c.chasing > 0) && canEnter(gameState, gameState.player, c));
    // once you are big, bugs and lizards collapse into one line
    const fry = gameState.level >= 2 ? creatures.filter((c) => preyMass(c) < gameState.weight * 0.02 && !c.chasing) : [];
    const worth = creatures.filter((c) => !fry.includes(c));
    const herdAdults = creatures.filter(isBigGiant);
    const herdYoung = creatures.filter((c) => GIANT_SPECIES.has(c.species) && !isBigGiant(c));
    const chasers = [...nearby, ...creatures].filter((c) => c.chasing > 0);
    if (!creatures.length && !carcasses.length && !poi && !dangerNear.length) return null;

    return (
        <div className={sheet ? 'flex flex-col min-h-0' : 'panel w-[340px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-300px)] flex flex-col anim-slide-left'} onMouseDown={(e) => e.stopPropagation()}>
            {!sheet && <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-[color:var(--line)]">
                <div>
                    <div className="label">Your area</div>
                    <div className="panel-title text-[16px] leading-tight">{TERRAIN_TYPES[here.terrain].name}</div>
                </div>
                {creatures.length > 0 && <span className="chip"><Icon name="paw" size={12} />{creatures.length} here</span>}
            </div>}
            <div className={sheet ? 'space-y-2' : 'p-2.5 space-y-2 overflow-y-auto scroll-thin'}>
                {poi && <PoiCard poi={poi} dispatch={dispatch} />}
                {herdAdults.length > 0 && herdYoung.length > 0 && <HerdCard adults={herdAdults} young={herdYoung} gameState={gameState} dispatch={dispatch} />}
                {worth.map((c) => <CreatureCard key={c.id} creature={c} gameState={gameState} dispatch={dispatch} guarded={GIANT_SPECIES.has(c.species) && !isBigGiant(c) && herdAdults.some((a) => a.species === c.species)} />)}
                {fry.length > 0 && <SmallFry list={fry} dispatch={dispatch} />}
                {carcasses.map((c) => <CarcassCard key={c.id} carcass={c} gameState={gameState} dispatch={dispatch} />)}
                {dangerNear.length > 0 && (
                    <div className="rounded-xl px-2.5 py-2" style={{ background: 'rgba(239,95,85,0.08)', border: '1px solid rgba(239,95,85,0.3)' }}>
                        <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: 'var(--bad)' }}>
                            <Icon name="warn" size={14} />Danger next door
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {[...new Set(dangerNear.map((c) => c.species))].slice(0, 6).map((sp) => {
                                const n = dangerNear.filter((c) => c.species === sp).length;
                                return <span key={sp} className="chip !pl-1"><FactsHover species={sp} className="inline-flex"><CreaturePortrait species={sp} size={26} height={18} /></FactsHover>{sp}{n > 1 ? ` ×${n}` : ''}</span>;
                            })}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-1">{chasers.length ? `You're being chased by ${[...new Set(chasers.map((c) => c.species))].join(', ')}. Dash, or lose it in cover.` : 'Aggressive animals will charge into your area to attack.'}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreaturesPanel;
