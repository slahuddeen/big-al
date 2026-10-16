import React, { useMemo, useState } from 'react';
import { getPortrait } from '../three/portraits.js';
import { spriteFor } from '../data/sprites.js';

// Pixel-art picture of a creature. Species without their own art fall back to a
// rendered image of their 3D model.
const CreaturePortrait = ({ species, level = 1, size = 64, height, className = '', style = {}, dead = false, silhouette = false }) => {
    const sprite = spriteFor(species, level);
    const [spriteFailed, setSpriteFailed] = useState(false);
    const fallback = useMemo(() => {
        if (sprite && !spriteFailed) return null;
        try {
            return getPortrait(species, level);
        } catch (e) {
            console.warn('Portrait failed for', species, e);
            return null;
        }
    }, [species, level, sprite, spriteFailed]);

    const filters = [];
    if (sprite?.filter && !spriteFailed) filters.push(sprite.filter);
    if (dead) filters.push('grayscale(0.75) brightness(0.7) sepia(0.3)');
    if (silhouette) filters.push('brightness(0) opacity(0.55)');
    const src = sprite && !spriteFailed ? sprite.src : fallback;
    if (!src) return <div className={className} style={{ width: size, height: height ?? size * 0.75, ...style }} />;
    return (
        <img
            src={src}
            alt={species}
            draggable={false}
            onError={() => setSpriteFailed(true)}
            className={`sprite select-none pointer-events-none ${className}`}
            style={{
                width: size,
                height: height ?? size * 0.75,
                objectFit: 'contain',
                filter: filters.join(' ') || undefined,
                transform: dead ? 'rotate(180deg) scaleX(-1)' : undefined,
                ...style
            }}
        />
    );
};

export default CreaturePortrait;
