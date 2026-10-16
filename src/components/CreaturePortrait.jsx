import React, { useMemo } from 'react';
import { getPortrait } from '../three/portraits.js';
import { SPECIES_DATA } from '../data/species.js';

// Image of a creature's 3D model (rendered once and cached), emoji fallback.
const CreaturePortrait = ({ species, level = 1, size = 64, className = '', style = {} }) => {
    const url = useMemo(() => {
        try {
            return getPortrait(species, level);
        } catch (e) {
            console.warn('Portrait failed for', species, e);
            return null;
        }
    }, [species, level]);

    if (!url) {
        return (
            <span className={`select-none ${className}`} style={{ fontSize: size * 0.6, lineHeight: 1, ...style }}>
                {species === 'Big Al' ? '🦖' : SPECIES_DATA[species]?.emoji ?? '🦴'}
            </span>
        );
    }
    return (
        <img
            src={url}
            alt={species}
            draggable={false}
            className={`select-none pointer-events-none ${className}`}
            style={{ width: size, height: size * 0.75, objectFit: 'contain', ...style }}
        />
    );
};

export default CreaturePortrait;
