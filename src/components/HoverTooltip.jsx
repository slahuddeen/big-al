import React from 'react';
import { TERRAIN_TYPES } from '../data/terrain.js';
import { WATER_SOURCES, thirstFactor } from '../game/environment.js';
import { POI_TYPES } from '../game/pois.js';
import { crampedIn, drinkableAt } from '../game/gameState.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const SIGHT = ['', 'Short', 'Normal', 'Far'];

// Card that follows the mouse over the map
const HoverTooltip = ({ hex, mousePos, creatures, gameState, pathLength }) => {
    if (!hex) return null;
    const cell = gameState.cells.get(hex.key) || hex;
    const terrain = TERRAIN_TYPES[cell.terrain];
    const poi = gameState.journal.landmarks[gameState.pois.get(hex.key)?.id] ? gameState.pois.get(hex.key) : null;
    const scent = (gameState.scent || []).filter((s) => s.key === hex.key && s.hidden);
    const left = Math.min(mousePos.x + 16, window.innerWidth - 280);
    const blocked = !terrain.passable || cell.terrain === 'quicksand';
    const thirst = thirstFactor(cell.terrain);
    return (
        <div className="fixed panel p-2.5 w-[260px] pointer-events-none z-[60]" style={{ left, top: mousePos.y + 18 }}>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: terrain.color, boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />
                <span className="font-bold text-[14px]">{terrain.name}</span>
                {!cell.inSight && <span className="chip ml-auto">Remembered</span>}
            </div>
            <div className="text-[12px] text-ink-muted leading-snug mt-1">{terrain.description}</div>
            <div className="flex flex-wrap gap-1 mt-2">
                {blocked ? <span className="chip" style={{ color: 'var(--bad)' }}>{cell.terrain === 'quicksand' ? 'Deadly' : 'Impassable'}</span>
                    : <span className="chip"><Icon name="footprint" size={11} />Cost {terrain.energyCost}</span>}
                <span className="chip"><Icon name="eye" size={11} />{SIGHT[terrain.visibility] || 'Normal'} sight</span>
                {WATER_SOURCES.has(cell.terrain) && (drinkableAt(gameState, hex.key)
                    ? <span className="chip" style={{ color: 'var(--water)' }}><Icon name="water" size={11} />Water</span>
                    : <span className="chip" style={{ color: 'var(--food)' }}>Dried up</span>)}
                {thirst >= 1.3 && <span className="chip" style={{ color: 'var(--food)' }}>Hot and dry</span>}
                {terrain.minWeight > 0 && <span className="chip" style={{ color: gameState.weight < terrain.minWeight ? 'var(--bad)' : 'var(--good)' }}>{gameState.weight < terrain.minWeight ? `Deadly under ${terrain.minWeight}kg` : 'You can wade it'}</span>}
                {crampedIn(gameState, cell.terrain) && <span className="chip" style={{ color: 'var(--warn)' }}>Cramped for your size</span>}
                {terrain.fitnessRisk > 0 && terrain.fitnessRisk < 1 && <span className="chip" style={{ color: 'var(--warn)' }}>Rough going</span>}
                {pathLength > 1 && <span className="chip" style={{ color: 'var(--accent)' }}>{pathLength} steps</span>}
            </div>
            {poi && (
                <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
                    <Icon name="star" size={12} />{POI_TYPES[poi.type].name}
                </div>
            )}
            {creatures && creatures.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[color:var(--line)] space-y-1">
                    {creatures.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-[12px]">
                            <CreaturePortrait species={c.species} size={36} height={24} />
                            <span className="font-semibold">{c.species}</span>
                            {c.wounded && <span className="text-[11px]" style={{ color: 'var(--bad)' }}>bleeding</span>}
                        </div>
                    ))}
                </div>
            )}
            {scent.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[color:var(--line)] text-[12px] text-ink-muted">
                    <Icon name="sniff" size={12} className="inline mr-1" />You smell {[...new Set(scent.map((s) => s.species || 'blood'))].join(', ')} here.
                </div>
            )}
        </div>
    );
};

export default HoverTooltip;
