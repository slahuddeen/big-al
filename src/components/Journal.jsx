import React, { useState, useEffect } from 'react';
import { SPECIES_DATA, dietOf } from '../data/species.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { ABILITIES, PASSIVES } from '../game/abilities.js';
import { LEVEL_NAMES, LEVEL_WEIGHTS } from '../game/gameState.js';
import { POI_TYPES } from '../game/pois.js';
import { formatWeight, capitalise } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const POI_ICONS = { eggs: 'egg', sauropodcarcass: 'bone', wallow: 'mud', lookout: 'mountain', bonebed: 'bone', waterfall: 'waterfall', volcano: 'volcano', seashore: 'wave' };
const TABS = [['bestiary', 'Bestiary', 'paw'], ['habitats', 'Habitats', 'leaf'], ['landmarks', 'Landmarks', 'map'], ['growth', 'Growth', 'level']];

const Bestiary = ({ gameState }) => {
    const all = Object.keys(SPECIES_DATA).sort((a, b) => SPECIES_DATA[a].weight - SPECIES_DATA[b].weight);
    const seen = gameState.journal.species;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {all.map((s) => {
                const e = seen[s];
                const sd = SPECIES_DATA[s];
                return (
                    <div key={s} className="card p-2" title={e ? sd.description : 'Not yet seen'}>
                        <div className="h-[70px] flex items-center justify-center rounded-lg" style={{ background: 'radial-gradient(100% 90% at 50% 100%, rgba(255,244,220,0.1), rgba(0,0,0,0.2))' }}>
                            <CreaturePortrait species={s} size={92} height={64} silhouette={!e} />
                        </div>
                        <div className="mt-1.5 font-bold text-[12.5px] truncate">{e ? s : '???'}</div>
                        <div className="text-[11px] text-ink-muted">{e ? `${dietOf(s)} · ${formatWeight(sd.weight)}` : 'Keep exploring'}</div>
                        {e?.kills > 0 && <div className="text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>Hunted {e.kills}</div>}
                    </div>
                );
            })}
        </div>
    );
};

const Habitats = ({ gameState }) => {
    const found = gameState.journal.biomes;
    const all = Object.keys(TERRAIN_TYPES);
    return (
        <div className="grid sm:grid-cols-2 gap-2">
            {all.map((t) => {
                const terr = TERRAIN_TYPES[t];
                const f = found[t];
                return (
                    <div key={t} className="card p-2.5 flex gap-2.5 items-start" style={{ opacity: f ? 1 : 0.45 }}>
                        <span className="w-8 h-8 rounded-lg shrink-0" style={{ background: f ? terr.color : '#333', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)' }} />
                        <div className="min-w-0">
                            <div className="font-bold text-[13px]">{f ? terr.name : '???'}</div>
                            <div className="text-[11.5px] text-ink-muted leading-snug">{f ? terr.description : 'Undiscovered habitat'}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Landmarks = ({ gameState }) => {
    const found = Object.values(gameState.journal.landmarks).sort((a, b) => a.firstTurn - b.firstTurn);
    const total = gameState.pois.size;
    return (
        <div>
            <div className="text-[12.5px] text-ink-muted mb-2">{found.length} of {total} places found. Landmarks show on your map.</div>
            {found.length === 0 && <div className="text-[13px] text-ink-dim">Nothing yet. Look for nests, wallows, lookouts, waterfalls and fallen giants.</div>}
            <div className="grid sm:grid-cols-2 gap-2">
                {found.map((l) => (
                    <div key={`${l.type}-${l.key}`} className="card p-2.5 flex gap-2.5 items-start">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(244,183,64,0.12)', color: 'var(--accent)' }}>
                            <Icon name={POI_ICONS[l.type]} size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-[13px]">{POI_TYPES[l.type].name}</div>
                            <div className="text-[11.5px] text-ink-muted leading-snug">{POI_TYPES[l.type].desc}</div>
                            <div className="text-[10.5px] text-ink-dim mt-0.5">Found on turn {l.firstTurn}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Growth = ({ gameState }) => {
    const s = gameState.stats;
    return (
        <div className="space-y-2">
            {[1, 2, 3, 4].map((lvl) => {
                const current = gameState.level === lvl;
                const reached = gameState.level >= lvl;
                const abilities = Object.values(ABILITIES).filter((a) => a.level === lvl);
                const passives = PASSIVES.filter((p) => p.level === lvl);
                return (
                    <div key={lvl} className="card p-3" style={{ borderColor: current ? 'rgba(244,183,64,0.6)' : undefined, opacity: reached ? 1 : 0.6 }}>
                        <div className="flex items-center gap-3">
                            <CreaturePortrait species="Big Al" level={lvl} size={62} height={46} silhouette={!reached} />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="panel-title text-[17px]">{capitalise(LEVEL_NAMES[lvl])}</span>
                                    {current && <span className="chip" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>You are here</span>}
                                </div>
                                <div className="text-[11.5px] text-ink-muted">{lvl === 1 ? 'From hatching' : `From ${formatWeight(LEVEL_WEIGHTS[lvl - 1])}`}</div>
                            </div>
                        </div>
                        <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                            {abilities.map((a) => (
                                <div key={a.id} className="flex gap-2 items-start text-[12px]">
                                    <Icon name={reached ? a.id : 'lock'} size={15} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                                    <div><span className="font-bold">{a.name}</span> <span className="text-ink-muted">{a.desc}</span></div>
                                </div>
                            ))}
                            {passives.map((p) => (
                                <div key={p.id} className="flex gap-2 items-start text-[12px]">
                                    <Icon name="shield" size={15} style={{ color: 'var(--grow)', marginTop: 1, flexShrink: 0 }} />
                                    <div><span className="font-bold">{p.name}</span> <span className="text-ink-muted">{p.desc}{p.maxLevel ? ' (hatchlings only)' : ''}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            <div className="grid grid-cols-4 gap-2 pt-1">
                {[['Hunted', s.kills, 'claw'], ['Scavenged', s.scavenged, 'bone'], ['Slept', s.sleeps, 'sleep'], ['Walked', s.distance, 'footprint']].map(([l, v, i]) => (
                    <div key={l} className="card p-2 text-center">
                        <Icon name={i} size={16} className="mx-auto text-ink-muted" />
                        <div className="pixel text-[20px] leading-tight">{v}</div>
                        <div className="label">{l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Journal = ({ gameState, onClose }) => {
    const [tab, setTab] = useState('bestiary');
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const counts = {
        bestiary: `${Object.keys(gameState.journal.species).length}/${Object.keys(SPECIES_DATA).length}`,
        habitats: `${Object.keys(gameState.journal.biomes).length}/${Object.keys(TERRAIN_TYPES).length}`,
        landmarks: `${Object.keys(gameState.journal.landmarks).length}`,
        growth: capitalise(LEVEL_NAMES[gameState.level])
    };
    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 anim-fade" style={{ background: 'rgba(5,7,4,0.6)' }} onMouseDown={onClose}>
            <div className="panel w-full max-w-[860px] h-[min(720px,90vh)] flex flex-col anim-pop" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 pt-3">
                    <div className="flex items-center gap-2">
                        <Icon name="book" size={20} style={{ color: 'var(--accent)' }} />
                        <span className="panel-title text-[22px]">Field Journal</span>
                    </div>
                    <button type="button" className="btn icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
                </div>
                <div className="flex gap-1 px-3 pt-3 border-b border-[color:var(--line)]">
                    {TABS.map(([id, label, icon]) => (
                        <button key={id} type="button" onClick={() => setTab(id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-t-lg border-b-2 transition ${tab === id ? 'border-[color:var(--accent)] text-ink bg-white/5' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                            <Icon name={icon} size={14} />{label}<span className="pixel text-[11px] text-ink-dim">{counts[id]}</span>
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto scroll-thin p-4">
                    {tab === 'bestiary' && <Bestiary gameState={gameState} />}
                    {tab === 'habitats' && <Habitats gameState={gameState} />}
                    {tab === 'landmarks' && <Landmarks gameState={gameState} />}
                    {tab === 'growth' && <Growth gameState={gameState} />}
                </div>
            </div>
        </div>
    );
};

export default Journal;
