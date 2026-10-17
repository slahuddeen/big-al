import React from 'react';
import { LEVEL_NAMES } from '../game/gameState.js';
import { formatWeight, capitalise } from '../utils/format.js';
import CreaturePortrait from './CreaturePortrait.jsx';
import Icon from './Icon.jsx';

const CAUSES = {
    starved: 'You collapsed from hunger. Even on a river full of fish, a predator that cannot hunt does not last long.',
    drowned: 'The current was too strong. A hatchling belongs in the shallows until it has grown.',
    sank: 'The sinking mud pulled you down. Struggling only made it worse.',
    injuries: 'Your wounds were too much. Sleeping somewhere safe might have saved you.',
    dehydrated: 'You died of thirst. Never stray far from the river.',
    combat: 'Something bigger and fiercer got the better of you.'
};

const DeathScreen = ({ gameState, dispatch }) => {
    if (!gameState.gameOver) return null;
    const s = gameState.stats;
    const j = gameState.journal;
    const stats = [
        ['Survived', `${gameState.moveNumber} turns`, 'sun'],
        ['Grew to', `${capitalise(LEVEL_NAMES[gameState.level])}, ${formatWeight(gameState.weight)}`, 'level'],
        ['Hunted', s.kills, 'claw'],
        ['Species seen', Object.keys(j.species).length, 'paw'],
        ['Habitats', Object.keys(j.biomes).length, 'leaf'],
        ['Landmarks', Object.keys(j.landmarks).length, 'map']
    ];
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 anim-fade" style={{ background: 'radial-gradient(ellipse at center, rgba(40,8,6,0.75), rgba(4,3,2,0.92))' }}>
            <div className="panel w-full max-w-[520px] p-6 text-center anim-pop" style={{ borderColor: 'rgba(239,95,85,0.35)' }}>
                <div className="mx-auto w-[120px] h-[80px] flex items-center justify-center">
                    <CreaturePortrait species="Big Al" level={gameState.level} size={110} height={78} dead />
                </div>
                <h2 className="panel-title text-[34px] leading-tight mt-2" style={{ color: '#f2a198' }}>
                    {gameState.level === 1 ? "The Hatchling's End" : 'Spino has fallen'}
                </h2>
                <p className="italic text-ink mt-2">"{gameState.currentThought}"</p>
                <p className="text-ink-muted text-[14px] mt-2 leading-relaxed">{CAUSES[gameState.deathReason] || CAUSES.combat}</p>
                <div className="grid grid-cols-3 gap-2 mt-5 text-left">
                    {stats.map(([l, v, i]) => (
                        <div key={l} className="card p-2">
                            <div className="label flex items-center gap-1"><Icon name={i} size={11} />{l}</div>
                            <div className="text-[14px] font-bold mt-0.5">{v}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pixel text-[22px]" style={{ color: 'var(--accent)' }}>Score {gameState.score}</div>
                <button type="button" onClick={() => dispatch({ type: 'RESTART_GAME' })} className="btn btn-primary mt-4 !px-6 !py-2.5 text-[15px]">
                    <Icon name="egg" size={16} />Hatch again
                </button>
            </div>
        </div>
    );
};

export default DeathScreen;
