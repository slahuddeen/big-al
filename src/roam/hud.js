// ==================== HUD ====================
// Comic-panel overlays: health, hunger, thirst and stamina, the time of day, what you are
// looking at, the action bar with its cooldowns, scent markers from a sniff, a short log
// of what happened, and the start and death screens.
import * as THREE from 'three';
import { ABILITIES } from './player.js';

export class Hud {
    constructor(root) {
        root.innerHTML = `
            <div class="hud-stats panel">
                <div class="hud-name">SPINO <span>sub-adult · 9.5 m · 2.5 t</span></div>
                <div class="bar"><label>Health</label><i class="b-health"></i></div>
                <div class="bar"><label>Hunger</label><i class="b-hunger"></i></div>
                <div class="bar"><label>Thirst</label><i class="b-thirst"></i></div>
                <div class="bar"><label>Stamina</label><i class="b-stamina"></i></div>
                <div class="bar breath" hidden><label>Breath</label><i class="b-breath"></i></div>
            </div>
            <div class="hud-clock panel"><b class="clock">06:00</b><span class="phase">Morning</span><span class="place"></span></div>
            <div class="hud-target panel" hidden><b class="t-name"></b><span class="t-info"></span><div class="bar small"><i class="t-hp"></i></div></div>
            <div class="crosshair"></div>
            <div class="scents"></div>
            <div class="hud-state"></div>
            <div class="hud-log"></div>
            <div class="hud-actions">${ABILITIES.map((a) => `<div class="act panel" data-id="${a.id}" title="${a.desc}"><kbd>${a.key}</kbd><b>${a.name}</b><i class="cd"></i></div>`).join('')}</div>
            <div class="overlay start panel">
                <div class="kicker">Kem Kem rivers · 95 million years ago</div>
                <h1>SPINO</h1>
                <p>A sub-adult Spinosaurus, nine and a half metres long, in a river world at its real size. Fish the channels, hunt the banks, and keep clear of Carcharodontosaurus.</p>
                <ul>
                    <li><b>W A S D</b> move, <b>Shift</b> sprint, <b>mouse</b> look, <b>wheel</b> zoom</li>
                    <li><b>Click</b> bite (and snap fish in the water), <b>Q</b> or <b>right click</b> thumb claw: the wound bleeds</li>
                    <li><b>Space</b> dash, <b>C</b> submerge in deep water: hunters lose you and a bite from below is an ambush</li>
                    <li><b>F</b> sniff out prey, <b>R</b> sail display, hold <b>E</b> to drink, hold <b>Z</b> to rest</li>
                    <li>Hunger and thirst fall all the time. Eat, drink and rest to heal.</li>
                </ul>
                <button class="go">Loading the world…</button>
            </div>
            <div class="overlay dead panel" hidden>
                <h1>SPINO HAS FALLEN</h1>
                <p class="why"></p>
                <button class="again">Try again</button>
            </div>`;
        this.root = root;
        this.$ = (s) => root.querySelector(s);
        this.logEl = this.$('.hud-log');
        this.scentEl = this.$('.scents');
        this.acts = Object.fromEntries(ABILITIES.map((a) => [a.id, root.querySelector(`.act[data-id="${a.id}"]`)]));
        this.lines = [];
        this.v = new THREE.Vector3();
    }

    ready(onStart) {
        const b = this.$('.go');
        b.textContent = 'Click to play';
        b.disabled = false;
        b.onclick = onStart;
    }

    hideStart() { this.$('.start').hidden = true; }
    showStart(text = 'Click to continue') {
        this.$('.start').hidden = false;
        this.$('.go').textContent = text;
    }

    say(text) {
        if (this.lines.length && this.lines[this.lines.length - 1].text === text) return;
        this.lines.push({ text, t: performance.now() });
        if (this.lines.length > 5) this.lines.shift();
        this.renderLog();
    }

    renderLog() {
        const now = performance.now();
        this.lines = this.lines.filter((l) => now - l.t < 7000);
        this.logEl.innerHTML = this.lines.map((l) => `<div style="opacity:${Math.min(1, (7000 - (now - l.t)) / 1500)}">${l.text}</div>`).join('');
    }

    // scent markers: animals, kills and blood the sniff picked up, placed on screen
    scents(player, fauna, camera) {
        if (player.sniffT <= 0) { if (this.scentEl.innerHTML) this.scentEl.innerHTML = ''; return; }
        const fade = Math.min(1, player.sniffT / 1.5);
        // one marker per herd (or per kill, or per wounded animal), at the middle of it
        const groups = new Map();
        for (const c of fauna.list) {
            if (c.gone || c.flyer) continue;
            const d = c.pos.distanceTo(player.pos);
            if (d > 260 || d < 8) continue;
            const kind = c.dead ? 'kill' : c.bleed > 0 ? 'blood' : c.predator ? 'danger' : 'prey';
            const key = kind === 'prey' || kind === 'danger' ? `${c.group?.id ?? c.id}` : `${kind}${c.id}`;
            const g = groups.get(key) || { kind, species: c.species, n: 0, x: 0, y: 0, z: 0, d: Infinity, h: 0 };
            g.n++; g.x += c.pos.x; g.y += c.pos.y; g.z += c.pos.z; g.d = Math.min(g.d, d); g.h = Math.max(g.h, c.len * 0.5);
            groups.set(key, g);
        }
        const out = [];
        for (const g of groups.values()) {
            this.v.set(g.x / g.n, g.y / g.n + g.h, g.z / g.n).project(camera);
            if (this.v.z > 1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) continue;
            const label = g.kind === 'kill' ? `${g.species} kill` : g.n > 1 ? `${g.species} ×${g.n}` : g.species;
            out.push(`<div class="scent ${g.kind}" style="left:${(this.v.x * 0.5 + 0.5) * 100}%;top:${(-this.v.y * 0.5 + 0.5) * 100}%;opacity:${fade}"><b>${label}</b><span>${Math.round(g.d)} m</span></div>`);
        }
        this.scentEl.innerHTML = out.join('');
    }

    update(player, sky, target, place, fauna, camera) {
        this.$('.b-health').style.width = `${player.health}%`;
        this.$('.b-hunger').style.width = `${player.hunger}%`;
        this.$('.b-thirst').style.width = `${player.thirst}%`;
        this.$('.b-stamina').style.width = `${player.stamina}%`;
        this.$('.breath').hidden = !player.submerged && player.breath > 99;
        this.$('.b-breath').style.width = `${player.breath}%`;
        this.$('.clock').textContent = sky.clock();
        const f = sky.dayFraction;
        this.$('.phase').textContent = f < 0.22 || f > 0.8 ? 'Night' : f < 0.3 ? 'Dawn' : f < 0.48 ? 'Morning' : f < 0.62 ? 'Midday' : f < 0.72 ? 'Afternoon' : 'Dusk';
        this.$('.place').textContent = place || '';
        const tEl = this.$('.hud-target');
        if (target) {
            tEl.hidden = false;
            this.$('.t-name').textContent = target.dead ? `${target.species} (carcass)` : target.species;
            const state = target.state === 'attack' ? ' · hunting you' : target.bleed > 0 ? ' · bleeding' : target.state === 'scavenge' ? ' · scavenging' : target.state === 'drink' ? ' · drinking' : '';
            this.$('.t-info').textContent = `${target.len.toFixed(1)} m · ${target.data.weight >= 1000 ? `${(target.data.weight / 1000).toFixed(1)} t` : `${Math.round(target.data.weight)} kg`}${state}`;
            this.$('.t-hp').style.width = `${target.dead ? target.meat : Math.max(0, target.hp)}%`;
            this.$('.t-hp').style.background = target.dead ? '#c8902a' : '';
        } else tEl.hidden = true;
        // the action bar
        for (const a of ABILITIES) {
            const el = this.acts[a.id];
            const cd = player.cooldown(a.id);
            const short = a.stamina && player.stamina < a.stamina;
            const active = (a.id === 'submerge' && player.submerged) || (a.id === 'drink' && player.drinking) || (a.id === 'rest' && player.resting) || (a.id === 'sniff' && player.sniffT > 0);
            const off = (a.id === 'submerge' && !player.swimming) || (a.id === 'drink' && !player.canDrink);
            el.classList.toggle('active', active);
            el.classList.toggle('off', !!(off || short));
            el.querySelector('.cd').style.height = a.cd && cd > 0 ? `${(cd / a.cd) * 100}%` : '0';
        }
        const st = player.submerged ? 'Submerged: only your eyes and sail show' : player.resting ? 'Resting…' : player.drinking ? 'Drinking…' : '';
        this.$('.hud-state').textContent = st;
        this.scents(player, fauna, camera);
        this.renderLog();
    }

    dead(why, onAgain) {
        this.$('.dead').hidden = false;
        this.$('.why').textContent = why;
        this.$('.again').onclick = onAgain;
    }
}
