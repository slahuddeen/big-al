// ==================== SOUNDSCAPE ====================
// Everything is synthesised with WebAudio, nothing is loaded. Beds of filtered noise for
// the wind, the leaves and the river, swelling and fading with where Spino stands; a
// cicada chorus by day and crickets by night; frogs near water after dark; birds and
// pterosaurs; and calls from the real animals nearby, panned to where they are: the deep
// hoots of sauropods, the honks of iguanodonts, the growls of the big hunters. Spino's own
// footfalls, splashes, bites and the roar of its sail display sit on top.
const FOREST = new Set(['forest', 'galleryforest', 'denseforest', 'jungle', 'mangrove', 'deadfall', 'openwoods']);
const OPEN = new Set(['plains', 'savanna', 'fernprairie', 'floodplain', 'scrubland', 'sauropodgrounds', 'hills']);

export class Soundscape {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.nextCall = 4;
        this.nextBird = 2;
        this.nextFrog = 3;
        this.stepPhase = 0;
    }

    start() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = new AC();
        this.out = ctx.createDynamicsCompressor();
        this.out.connect(ctx.destination);
        // everything passes a low-pass that closes when Spino is under the water
        this.muffle = ctx.createBiquadFilter();
        this.muffle.type = 'lowpass';
        this.muffle.frequency.value = 18000;
        this.muffle.connect(this.out);
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3);
        this.master.connect(this.muffle);
        // pink-ish noise
        const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.997 * b0 + w * 0.03; b1 = 0.985 * b1 + w * 0.06; b2 = 0.95 * b2 + w * 0.1;
            d[i] = (b0 + b1 + b2 + w * 0.05) * 0.4;
        }
        this.noise = buf;
        // beds
        this.wind = this.bed(380, 0.7, 'lowpass');
        this.leaves = this.bed(2600, 0.9, 'bandpass');
        this.river = this.bed(700, 0.6, 'bandpass');
        this.rush = this.bed(260, 0.5, 'lowpass');
        // cicadas: band-passed noise pulsing at a few rates
        this.cicadas = [[4300, 7.5], [5600, 11], [3400, 3.2]].map(([f, rate]) => {
            const b = this.bed(f, 14, 'bandpass');
            const lfo = ctx.createOscillator();
            lfo.frequency.value = rate;
            const lg = ctx.createGain();
            lg.gain.value = 0.5;
            const amp = ctx.createGain();
            amp.gain.value = 0.5;
            b.gain.disconnect();
            b.gain.connect(amp).connect(this.master);
            lfo.connect(lg).connect(amp.gain);
            lfo.start();
            return b;
        });
        // crickets: a high sine, chopped into chirps
        this.crickets = [4400, 4900, 3900].map((f, i) => {
            const o = ctx.createOscillator();
            o.frequency.value = f;
            const chop = ctx.createOscillator();
            chop.type = 'square';
            chop.frequency.value = 2.2 + i * 0.7;
            const cg = ctx.createGain();
            cg.gain.value = 0.5;
            const amp = ctx.createGain();
            amp.gain.value = 0.5;
            const g = ctx.createGain();
            g.gain.value = 0;
            const pan = ctx.createStereoPanner();
            pan.pan.value = i - 1;
            o.connect(amp).connect(g).connect(pan).connect(this.master);
            chop.connect(cg).connect(amp.gain);
            o.start(); chop.start();
            return g;
        });
    }

    bed(freq, q, type) {
        const ctx = this.ctx;
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        s.loop = true;
        s.playbackRate.value = 0.9 + Math.random() * 0.2;
        const f = ctx.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        s.connect(f).connect(g).connect(this.master);
        s.start(0, Math.random() * 3);
        return { src: s, filter: f, gain: g };
    }

    panner(pan = Math.random() * 2 - 1) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(this.master);
        return p;
    }

    tone(t0, f0, f1, dur, vol, type, out, attack = 0.03) {
        const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.4));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(out);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
        return o;
    }

    burst(t0, dur, vol, freq, q, type, out = this.master, sweep = null) {
        const ctx = this.ctx;
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
        if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        s.connect(f).connect(g).connect(out);
        s.start(t0, Math.random() * 3, dur + 0.05);
    }

    // a growl: a low buzz through a mouth-like filter, shaken, with breath noise
    growl(t, f0, f1, dur, vol, out) {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.linearRampToValueAtTime(f1, t + dur);
        const form = ctx.createBiquadFilter();
        form.type = 'bandpass'; form.frequency.value = 420; form.Q.value = 1.4;
        const shake = ctx.createOscillator();
        shake.frequency.value = 17 + Math.random() * 8;
        const sg = ctx.createGain();
        sg.gain.value = 0.35;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.15);
        g.gain.setValueAtTime(vol, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const amp = ctx.createGain();
        amp.gain.value = 0.7;
        shake.connect(sg).connect(amp.gain);
        o.connect(form).connect(amp).connect(g).connect(out);
        o.start(t); shake.start(t);
        o.stop(t + dur + 0.1); shake.stop(t + dur + 0.1);
        this.burst(t, dur * 0.9, vol * 0.5, 700, 0.8, 'bandpass', out);
    }

    // ---------- voices of the animals ----------
    call(c, pan, vol) {
        const t = this.ctx.currentTime + 0.05;
        const out = this.panner(pan);
        const type = c.data.behaviorType;
        if (c.giant) {
            // sauropods: deep, hollow hoots
            for (let i = 0; i < 2; i++) {
                this.tone(t + i * 1.1, 70, 52, 1.2, vol * 0.9, 'sine', out, 0.25);
                this.tone(t + i * 1.1, 140, 104, 1.2, vol * 0.25, 'triangle', out, 0.25);
            }
        } else if (c.predator && c.data.weight > 300 && !c.aquatic) {
            this.growl(t, 95 - Math.min(40, c.len * 3), 70 - Math.min(30, c.len * 2), 1.4 + Math.random(), vol, out);
        } else if (c.amphibious) {
            // crocodiles: a low rumbling bellow or a hiss
            if (Math.random() < 0.5) this.growl(t, 48, 42, 1.6, vol * 0.8, out);
            else this.burst(t, 0.9, vol * 0.6, 3500, 0.7, 'highpass', out);
        } else if (!c.aquatic && type !== 'skittish') {
            // iguanodonts and other plant-eaters: nasal honks
            const f = 260 - Math.min(150, c.len * 18);
            for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                this.tone(t + i * 0.42, f * 1.1, f * 0.85, 0.32, vol * 0.5, 'sawtooth', out, 0.04);
                this.tone(t + i * 0.42, f * 2.2, f * 1.7, 0.32, vol * 0.2, 'square', out, 0.04);
            }
        }
    }

    bird(t) {
        const out = this.panner();
        const r = Math.random();
        if (r < 0.4) for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) this.tone(t + i * 0.13, 2600 + Math.random() * 900, 3400 + Math.random() * 900, 0.09, 0.025, 'sine', out);
        else if (r < 0.7) { this.tone(t, 1500, 2600, 0.25, 0.03, 'sine', out); this.tone(t + 0.3, 2600, 1300, 0.4, 0.03, 'sine', out); }
        else {
            // a pterosaur's harsh cry
            this.tone(t, 1300, 600, 0.45, 0.02, 'sawtooth', out);
            this.burst(t, 0.4, 0.02, 1800, 2, 'bandpass', out, 900);
        }
    }

    frog(t) {
        const out = this.panner();
        const deep = Math.random() < 0.5;
        for (let i = 0; i < 4 + Math.floor(Math.random() * 5); i++) {
            if (deep) this.tone(t + i * 0.32, 180, 140, 0.18, 0.05, 'triangle', out);
            else this.tone(t + i * 0.1, 2200, 1900, 0.05, 0.02, 'triangle', out);
        }
    }

    // ---------- Spino ----------
    event(name, x = {}) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime + 0.01;
        const m = this.master;
        switch (name) {
            case 'bite':
                this.burst(t, 0.08, 0.5, 2400, 1.5, 'bandpass', m);
                this.tone(t, 160, 60, 0.12, 0.35, 'sine', m, 0.005);
                break;
            case 'hit':
                this.tone(t, 90, 40, 0.25, 0.45, 'sine', m, 0.005);
                this.burst(t, 0.2, 0.3, 500, 0.8, 'lowpass', m);
                break;
            case 'claw':
                this.burst(t, 0.25, 0.3, 4000, 0.9, 'bandpass', m, 900);
                break;
            case 'dash':
                this.burst(t, 0.5, 0.35, 300, 0.7, 'bandpass', m, 1600);
                break;
            case 'splash':
                this.burst(t, 0.6 * (x.size || 1), 0.4 * (x.size || 1), 1400, 0.6, 'bandpass', m, 500);
                this.burst(t + 0.05, 0.4, 0.2, 3000, 0.5, 'highpass', m);
                break;
            case 'roar':
                this.growl(t, 62, 46, 1.9, 0.7, m);
                this.tone(t, 48, 40, 1.9, 0.4, 'sine', m, 0.2);
                break;
            case 'sniff':
                for (let i = 0; i < 3; i++) this.burst(t + i * 0.22, 0.15, 0.18, 1800, 1, 'bandpass', m);
                break;
            case 'hurt':
                this.tone(t, 120, 50, 0.3, 0.5, 'sine', m, 0.005);
                this.burst(t, 0.25, 0.3, 800, 0.7, 'lowpass', m);
                break;
            case 'drink':
                this.burst(t, 0.12, 0.1, 900, 3, 'bandpass', m);
                break;
            case 'step': {
                const v = x.vol ?? 0.3;
                if (x.wet) this.burst(t, 0.25, v * 0.6, 1100, 0.8, 'bandpass', m, 400);
                else {
                    this.tone(t, 70, 38, 0.22, v, 'sine', m, 0.005);
                    this.burst(t, 0.12, v * 0.35, 260, 0.7, 'lowpass', m);
                }
                break;
            }
            default:
        }
    }

    // where Spino is and what is around: { player, world, fauna, sky, camera, wind, dt }
    update(s) {
        if (!this.ctx) return;
        const ctx = this.ctx, t = ctx.currentTime;
        const { player, world, sky, camera } = s;
        const cell = world.cellAt(player.pos.x, player.pos.z);
        const terr = cell ? cell.terrain : '';
        const forest = FOREST.has(terr) ? 1 : 0;
        const open = OPEN.has(terr) ? 1 : 0;
        const night = sky.night || 0;
        const day = 1 - night;
        // how near the nearest running water is
        const r = world.nearest(world.rivers, player.pos.x, player.pos.z);
        const near = r ? Math.max(0, 1 - Math.max(0, r.edge) / 45) : 0;
        const wet = player.inWater ? 1 : 0;
        const k = 0.6;
        this.wind.gain.gain.setTargetAtTime(0.05 + s.wind * (0.1 + open * 0.12), t, k);
        this.wind.filter.frequency.setTargetAtTime(280 + s.wind * 500, t, k);
        this.leaves.gain.gain.setTargetAtTime((0.01 + forest * 0.05) * (0.4 + s.wind), t, k);
        this.river.gain.gain.setTargetAtTime(near * 0.09 + wet * 0.05, t, k);
        this.rush.gain.gain.setTargetAtTime(near * near * 0.14, t, k);
        const cic = day * (0.012 + forest * 0.02 + open * 0.012) * (sky.dayFraction > 0.35 && sky.dayFraction < 0.72 ? 1 : 0.3);
        this.cicadas.forEach((c, i) => c.gain.gain.setTargetAtTime(cic * (1 - i * 0.25), t, 1.5));
        this.crickets.forEach((g, i) => g.gain.setTargetAtTime(night * 0.006 * (1 - i * 0.2), t, 1.5));
        this.muffle.frequency.setTargetAtTime(player.submerged ? 500 : 18000, t, 0.15);
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, t, 0.2);
        if (this.muted) return;

        // footfalls on the beat of the stride
        const ph = player.phase;
        if (player.speed > 0.6 && !player.swimming) {
            const step = Math.floor(ph / Math.PI);
            if (step !== this.lastStep) { this.lastStep = step; this.event('step', { vol: Math.min(0.45, 0.12 + player.speed * 0.03), wet: player.inWater }); }
        }
        // occasional voices
        this.nextBird -= s.dt;
        if (this.nextBird <= 0) {
            this.nextBird = (night > 0.5 ? 20 : 3) + Math.random() * 7;
            if (night < 0.5) this.bird(t + 0.05);
        }
        this.nextFrog -= s.dt;
        if (this.nextFrog <= 0) {
            this.nextFrog = 2 + Math.random() * 5;
            const pondNear = world.ponds.some((p) => Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 120);
            if ((night > 0.3 || pondNear) && (near > 0.2 || pondNear) && Math.random() < 0.3 + night * 0.6) this.frog(t + 0.05);
        }
        this.nextCall -= s.dt;
        if (this.nextCall <= 0) {
            this.nextCall = 5 + Math.random() * 9;
            const cands = s.fauna.list.filter((c) => !c.dead && !c.flyer && !c.aquatic && c.pos.distanceTo(player.pos) < 380);
            if (cands.length) {
                const c = cands[Math.floor(Math.random() * cands.length)];
                // pan from where it is relative to the way the camera faces
                const dx = c.pos.x - camera.position.x, dz = c.pos.z - camera.position.z;
                const fx = -Math.sin(player.camYaw), fz = -Math.cos(player.camYaw);
                const side = (dx * -fz + dz * fx) / (Math.hypot(dx, dz) || 1);
                const d = c.pos.distanceTo(player.pos);
                this.call(c, side, Math.min(0.5, 30 / (30 + d)));
            }
        }
    }

    toggle() {
        this.muted = !this.muted;
        return this.muted;
    }
}
