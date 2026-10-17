import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DIETS, factsOf } from '../data/speciesFacts.js';
import Icon from './Icon.jsx';

// "Piscivore" chip with its icon and colour
export const DietChip = ({ species, short = false }) => {
    const facts = factsOf(species);
    const d = facts && DIETS[facts.diet];
    if (!d) return null;
    return (
        <span className="chip" style={{ color: d.color, borderColor: `${d.color}66` }} title={`${d.label}: ${d.note}`}>
            <Icon name={d.icon} size={11} />{short ? d.short : d.label}
        </span>
    );
};

// The field-guide card: what it was, what it ate, how big it grew, where it is found and a few tidbits
export const FactsCard = ({ species }) => {
    const facts = factsOf(species);
    if (!facts) return null;
    const d = DIETS[facts.diet];
    return (
        <div>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-bold text-[14px] leading-tight">{species}</div>
                    <div className="text-[11.5px] text-ink-muted leading-snug">{facts.group}</div>
                </div>
                <DietChip species={species} />
            </div>
            <div className="text-[11.5px] mt-1.5 leading-snug" style={{ color: d?.color }}>{d.label}: {d.note}.</div>
            <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] leading-snug">
                <span className="label !text-[9.5px] pt-[2px]">Size</span><span>{facts.size}</span>
                <span className="label !text-[9.5px] pt-[2px]">Fossils</span><span className="text-ink-muted">{facts.known}</span>
            </div>
            <ul className="mt-2 space-y-1">
                {facts.facts.map((t) => (
                    <li key={t} className="flex gap-1.5 text-[12px] leading-snug">
                        <Icon name="info" size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                        <span>{t}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Wrap a portrait: hovering it (or tapping it on a touch screen) opens the field-guide card beside it.
// The card is portalled to the page body so panels with blur or scrolling cannot clip it.
export const FactsHover = ({ species, children, className = '', disabled = false }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState(null);
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const open = () => {
        if (disabled || !factsOf(species) || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const w = Math.min(310, window.innerWidth - 16);
        let left = r.left - w - 10;
        if (left < 8) left = Math.min(window.innerWidth - w - 8, r.right + 10);
        if (left < 8 || touch) left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
        const top = touch ? Math.max(8, r.top - 12) : Math.max(8, Math.min(window.innerHeight - 340, r.top - 10));
        setPos({ left, top, w, above: touch });
    };
    useEffect(() => {
        if (!pos || !touch) return undefined;
        const close = (e) => { if (!ref.current?.contains(e.target)) setPos(null); };
        const id = setTimeout(() => window.addEventListener('pointerdown', close), 0);
        return () => { clearTimeout(id); window.removeEventListener('pointerdown', close); };
    }, [pos, touch]);
    return (
        <div
            ref={ref}
            className={`${className} ${factsOf(species) && !disabled ? 'cursor-help' : ''}`}
            onMouseEnter={touch ? undefined : open}
            onMouseLeave={touch ? undefined : () => setPos(null)}
            onClick={touch ? (e) => { e.stopPropagation(); if (pos) setPos(null); else open(); } : undefined}
        >
            {children}
            {pos && createPortal(
                <div className="fixed panel p-3 z-[90] pointer-events-none anim-fade"
                    style={{ left: pos.left, top: pos.above ? undefined : pos.top, bottom: pos.above ? window.innerHeight - pos.top : undefined, width: pos.w }}>
                    <FactsCard species={species} />
                    {touch && <div className="text-[10.5px] text-ink-dim mt-2">Tap anywhere to close</div>}
                </div>,
                document.body
            )}
        </div>
    );
};

export default FactsHover;
