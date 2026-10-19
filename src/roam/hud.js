// ==================== HUD ====================
// Comic-panel overlays: health, hunger and stamina, the time of day, what you are looking
// at, a short log of what happened, and the start and death screens.
export class Hud {
    constructor(root) {
        root.innerHTML = `
            <div class="hud-stats panel">
                <div class="hud-name">SPINO <span>sub-adult · 9.5 m · 2.5 t</span></div>
                <div class="bar"><label>Health</label><i class="b-health"></i></div>
                <div class="bar"><label>Hunger</label><i class="b-hunger"></i></div>
                <div class="bar"><label>Stamina</label><i class="b-stamina"></i></div>
            </div>
            <div class="hud-clock panel"><b class="clock">06:00</b><span class="phase">Morning</span><span class="place"></span></div>
            <div class="hud-target panel" hidden><b class="t-name"></b><span class="t-info"></span><div class="bar small"><i class="t-hp"></i></div></div>
            <div class="crosshair"></div>
            <div class="hud-log"></div>
            <div class="hud-help">WASD move · Shift sprint · Mouse look · Click bite · Wheel zoom · Esc release mouse</div>
            <div class="overlay start panel">
                <div class="kicker">Kem Kem rivers · 95 million years ago</div>
                <h1>SPINO</h1>
                <p>A sub-adult Spinosaurus, nine and a half metres long, in a river world at its real size. Fish the channels, hunt the banks, and keep clear of Carcharodontosaurus.</p>
                <ul>
                    <li><b>W A S D</b> move, <b>Shift</b> sprint (swim faster in deep water)</li>
                    <li><b>Mouse</b> look around, <b>wheel</b> zoom</li>
                    <li><b>Click</b> to bite. Bite a kill again to feed.</li>
                    <li>Hunger falls all the time. Eat to heal.</li>
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
        this.lines = [];
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
        this.lines.push({ text, t: performance.now() });
        if (this.lines.length > 5) this.lines.shift();
        this.renderLog();
    }

    renderLog() {
        const now = performance.now();
        this.lines = this.lines.filter((l) => now - l.t < 7000);
        this.logEl.innerHTML = this.lines.map((l) => `<div style="opacity:${Math.min(1, (7000 - (now - l.t)) / 1500)}">${l.text}</div>`).join('');
    }

    update(player, sky, target, place) {
        this.$('.b-health').style.width = `${player.health}%`;
        this.$('.b-hunger').style.width = `${player.hunger}%`;
        this.$('.b-stamina').style.width = `${player.stamina}%`;
        this.$('.clock').textContent = sky.clock();
        const f = sky.dayFraction;
        this.$('.phase').textContent = f < 0.22 || f > 0.8 ? 'Night' : f < 0.3 ? 'Dawn' : f < 0.48 ? 'Morning' : f < 0.62 ? 'Midday' : f < 0.72 ? 'Afternoon' : 'Dusk';
        this.$('.place').textContent = place || '';
        const tEl = this.$('.hud-target');
        if (target) {
            tEl.hidden = false;
            this.$('.t-name').textContent = target.dead ? `${target.species} (carcass)` : target.species;
            this.$('.t-info').textContent = `${target.len.toFixed(1)} m · ${target.data.weight >= 1000 ? `${(target.data.weight / 1000).toFixed(1)} t` : `${Math.round(target.data.weight)} kg`}${target.state === 'attack' ? ' · hunting you' : ''}`;
            this.$('.t-hp').style.width = `${target.dead ? target.meat : Math.max(0, target.hp)}%`;
            this.$('.t-hp').style.background = target.dead ? '#c8902a' : '';
        } else tEl.hidden = true;
        this.renderLog();
    }

    dead(why, onAgain) {
        this.$('.dead').hidden = false;
        this.$('.why').textContent = why;
        this.$('.again').onclick = onAgain;
    }
}
