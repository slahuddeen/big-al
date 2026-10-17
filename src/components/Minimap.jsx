import React, { useEffect, useRef, useState } from 'react';
import { getWorld } from '../world/worldGen.js';
import { TERRAIN_TYPES } from '../data/terrain.js';
import Icon from './Icon.jsx';

const W = 232;
const H = 172;

// Map of everything Big Al has discovered. Local view follows Big Al; the
// basin view shows the whole map. Click to look somewhere.
const Minimap = ({ gameState, onLook, camera }) => {
    const ref = useRef(null);
    const [wide, setWide] = useState(false);
    const world = gameState.worldSeed !== null ? getWorld(gameState.worldSeed) : null;
    const me = world?.byKey.get(gameState.player);

    const view = () => {
        if (!world) return null;
        if (wide || !me) {
            const s = Math.min(W / world.W, H / world.H);
            return { s, ox: (W - world.W * s) / 2, oy: (H - world.H * s) / 2 };
        }
        const s = 8;
        return { s, ox: W / 2 - me.x * s, oy: H / 2 - me.z * s };
    };

    useEffect(() => {
        const cv = ref.current;
        const v = view();
        if (!cv || !v) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr;
        cv.height = H * dpr;
        const g = cv.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const P = (x, z) => [v.ox + x * v.s, v.oy + z * v.s];
        g.fillStyle = '#0e110c';
        g.fillRect(0, 0, W, H);
        for (const c of world.cells) {
            const cell = gameState.cells.get(c.key);
            if (!cell?.discovered) continue;
            const [cx, cy] = P(c.x, c.z);
            if (cx < -20 || cy < -20 || cx > W + 20 || cy > H + 20) continue;
            g.beginPath();
            c.poly.forEach(([x, z], i) => {
                const [px, py] = P(x, z);
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            });
            g.closePath();
            g.fillStyle = TERRAIN_TYPES[c.terrain]?.color || '#666';
            g.globalAlpha = cell.inSight ? 1 : 0.5;
            g.fill();
            g.globalAlpha = 1;
            g.strokeStyle = cell.visited ? 'rgba(255,240,200,0.35)' : 'rgba(0,0,0,0.35)';
            g.lineWidth = wide ? 0.4 : 0.8;
            g.stroke();
        }
        const dot = (x, z, r, fill, stroke) => {
            const [px, py] = P(x, z);
            g.fillStyle = fill;
            g.beginPath();
            g.arc(px, py, r, 0, Math.PI * 2);
            g.fill();
            if (stroke) {
                g.strokeStyle = stroke;
                g.lineWidth = 1.2;
                g.stroke();
            }
        };
        for (const [key, t] of gameState.blood || []) {
            const c = world.byKey.get(key);
            if (c && gameState.cells.get(key)?.discovered) dot(c.x, c.z, wide ? 1.4 : 2.5, `rgba(200,30,30,${0.4 + 0.6 * Math.max(0, 1 - (gameState.moveNumber - t) / 10)})`);
        }
        for (const sc of gameState.scent || []) {
            const c = world.byKey.get(sc.key);
            if (c) dot(c.x, c.z, wide ? 1.6 : 3, sc.kind === 'creature' ? 'rgba(200,170,255,0.95)' : 'rgba(255,140,120,0.95)');
        }
        for (const lm of Object.values(gameState.journal.landmarks)) {
            const c = world.byKey.get(lm.key);
            if (!c) continue;
            const [px, py] = P(c.x, c.z);
            const r = wide ? 3 : 4.5;
            g.fillStyle = '#f4b740';
            g.strokeStyle = '#2a1a06';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(px, py - r);
            g.lineTo(px + r * 0.8, py);
            g.lineTo(px, py + r);
            g.lineTo(px - r * 0.8, py);
            g.closePath();
            g.fill();
            g.stroke();
        }
        if (me) {
            dot(me.x, me.z, wide ? 5 : 8, 'rgba(255,255,255,0.22)');
            dot(me.x, me.z, wide ? 2.8 : 4, '#ffffff', '#1a1a1a');
        }
    }, [world, wide, gameState.cells, gameState.player, gameState.journal.landmarks, gameState.scent, gameState.blood]);

    const click = (e) => {
        const v = view();
        if (!v) return;
        const r = e.currentTarget.getBoundingClientRect();
        onLook?.((e.clientX - r.left - v.ox) / v.s, (e.clientY - r.top - v.oy) / v.s);
    };

    return (
        <div className="panel p-2 anim-fade" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="label flex items-center gap-1"><Icon name="map" size={12} />{wide ? 'Kem Kem Rivers' : 'Nearby'}</span>
                <button type="button" className="chip hover:text-ink" onClick={() => setWide(!wide)}>{wide ? 'Zoom in' : 'Whole basin'}</button>
            </div>
            <canvas ref={ref} onClick={click} className="rounded-lg cursor-crosshair block" style={{ width: W, height: H }} title="Click to look there" />
            <div className="flex gap-1 pt-2 justify-between">
                {[
                    ['rotL', 'Rotate left (Q). Or drag with the right mouse button to orbit.', () => camera.rotate(-1)],
                    ['rotR', 'Rotate right (E)', () => camera.rotate(1)],
                    ['plus', 'Zoom in (+ or mouse wheel)', () => camera.zoom(1.25)],
                    ['minus', 'Zoom out (-)', () => camera.zoom(0.8)],
                    ['target', 'Centre on Spino (C)', () => camera.center()]
                ].map(([icon, title, fn]) => (
                    <button key={icon} type="button" title={title} onClick={fn} className="btn flex-1 !h-[28px] !p-0 !rounded-md">
                        <Icon name={icon} size={14} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Minimap;
