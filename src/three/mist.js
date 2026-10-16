// ==================== MIST ====================
// Low drifting mist over swamps (most of the night and at dawn) and over some
// forests in the early morning. A pool of soft sprites is handed out to the
// misty cells near the camera; each sprite fades in and out on its own so the
// mist rolls in and burns off gradually as the day turns.
import * as THREE from 'three';
import { mistAmount } from '../game/environment.js';
import { mulberry32, hashString } from './lowpoly.js';

const POOL = 110;
const PER_CELL = 7;
const RADIUS = 13;

const makeTexture = () => {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const rand = mulberry32(7);
    // a few overlapping soft puffs make an irregular wisp
    for (let i = 0; i < 9; i++) {
        const x = S * (0.3 + rand() * 0.4);
        const y = S * (0.38 + rand() * 0.24);
        const r = S * (0.16 + rand() * 0.18);
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.3)');
        grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, S, S);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
};

export class MistLayer {
    constructor(parent) {
        this.group = new THREE.Group();
        parent.add(this.group);
        this.texture = makeTexture();
        this.color = new THREE.Color('#ffffff');
        this.sprites = Array.from({ length: POOL }, (_, i) => {
            const mat = new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, opacity: 0, fog: false });
            const s = new THREE.Sprite(mat);
            s.visible = false;
            s.renderOrder = 8;
            this.group.add(s);
            return { sprite: s, mat, alpha: 0, goal: 0, key: null, ox: 0, oz: 0, oy: 0, size: 1, phase: i * 1.7, drift: 0.2 };
        });
        this.timer = 1;
        this.phase = 0;
    }

    // tiles: Map(key -> tile) from the renderer
    update(dt, time, tiles, phase, centre, tint) {
        this.timer += dt;
        if (this.timer > 0.6 || this.phase !== phase) {
            this.timer = 0;
            this.phase = phase;
            this.assign(tiles, phase, centre);
        }
        this.color.lerp(tint, 1 - Math.exp(-dt * 1.5));
        for (const p of this.sprites) {
            p.alpha += (p.goal - p.alpha) * (1 - Math.exp(-dt * (p.goal > p.alpha ? 0.45 : 0.8)));
            if (p.alpha < 0.004 && p.goal === 0) {
                p.sprite.visible = false;
                p.key = null;
                continue;
            }
            const tile = p.key ? tiles.get(p.key) : null;
            if (!tile) {
                p.goal = 0;
                if (!p.base) continue;
            } else {
                p.base = { x: tile.x, z: tile.z, y: tile.surfaceY + tile.group.position.y };
            }
            const b = p.base;
            p.sprite.visible = true;
            p.sprite.position.set(
                b.x + p.ox + Math.sin(time * 0.07 * p.drift + p.phase) * 0.35,
                b.y + p.oy + Math.sin(time * 0.3 + p.phase) * 0.03,
                b.z + p.oz + Math.cos(time * 0.06 * p.drift + p.phase) * 0.35
            );
            p.sprite.scale.set(p.size * 1.6, p.size * 0.8, 1);
            p.mat.opacity = p.alpha * (tile && !tile.lit ? 0.45 : 1);
            p.mat.color.copy(this.color);
        }
    }

    assign(tiles, phase, centre) {
        const wanted = [];
        for (const tile of tiles.values()) {
            if (Math.hypot(tile.x - centre.x, tile.z - centre.z) > RADIUS) continue;
            const m = mistAmount(tile.terrain, phase, tile.key);
            if (m > 0.01) wanted.push({ tile, m });
        }
        wanted.sort((a, b) => Math.hypot(a.tile.x - centre.x, a.tile.z - centre.z) - Math.hypot(b.tile.x - centre.x, b.tile.z - centre.z));
        const want = new Map();
        for (const w of wanted) want.set(w.tile.key, w.m);
        // keep sprites that still belong to a misty cell, release the rest
        const used = new Map();
        for (const p of this.sprites) {
            if (!p.key) continue;
            const m = want.get(p.key);
            const n = used.get(p.key) || 0;
            if (m && n < Math.ceil(PER_CELL * m)) {
                used.set(p.key, n + 1);
                p.goal = p.strength * m;
            } else p.goal = 0;
        }
        const free = this.sprites.filter((p) => !p.key);
        for (const { tile, m } of wanted) {
            let n = used.get(tile.key) || 0;
            const rand = mulberry32(hashString(tile.key) + n * 31);
            while (n < Math.ceil(PER_CELL * m) && free.length) {
                const p = free.pop();
                const a = rand() * Math.PI * 2;
                const r = Math.sqrt(rand()) * (tile.inradius ?? 0.8) * 1.1;
                p.key = tile.key;
                p.ox = Math.cos(a) * r;
                p.oz = Math.sin(a) * r;
                // swamp mist hugs the water; forest mist also drifts up through the canopy
                const swamp = tile.terrain === 'marsh' || tile.terrain === 'riverbank';
                p.oy = swamp ? 0.06 + rand() * 0.34 : 0.15 + rand() * 1.0;
                p.size = (swamp ? 1.6 : 1.3) + rand() * 1.3;
                p.drift = 0.6 + rand();
                p.strength = 0.55 + rand() * 0.45;
                p.goal = p.strength * m;
                p.alpha = 0;
                n++;
            }
            used.set(tile.key, n);
        }
    }

    dispose() {
        this.texture.dispose();
        for (const p of this.sprites) p.mat.dispose();
    }
}
