// Feather layouts on a biped rig: folded wings, hind-wings on the legs and tail fans.
// Each returns a list of feather cards for featherMesh.
import { STYLE } from './feathers.js';
import { add, mul, lerp, lerp3, norm, sub } from './anatomy.js';

const along = (a, b, n, from = 0, to = 1) => Array.from({ length: n }, (_, i) => lerp3(a, b, lerp(from, to, n === 1 ? 0 : i / (n - 1))));

// A folded wing: primaries on the hand, secondaries on the forearm, a row of coverts over
// them. `primary` is the length of the longest primary.
export function foldedWing(arm, { primary, primaries = 10, secondaries = 10, col, col2, bands = 0, coverts = true, coverCol, style = STYLE.flight, tipCol }) {
    const s = arm.sgn;
    const out = [];
    const outward = [0, 0.25, s];
    // secondaries along the forearm, lying back along the flank
    along(arm.elbow, arm.wrist, secondaries, 0.05, 1).forEach((p, i, arr) => {
        const t = i / (arr.length - 1);
        out.push({
            tag: 'arm', at: add(p, [0, 0, s * primary * 0.02]), dir: norm([-1, -0.12 - t * 0.06, -0.04 * s]), normal: outward,
            length: primary * lerp(0.62, 0.74, t), width: primary * 0.17, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.06, asym: 0.75
        });
    });
    // primaries along the hand, the outer ones longest
    along(arm.wrist, arm.handTip, primaries, 0, 1.05).forEach((p, i, arr) => {
        const t = i / (arr.length - 1);
        out.push({
            tag: 'arm', at: add(p, [0, 0, s * primary * (0.03 + t * 0.03)]), dir: norm([-1, 0.02 - (1 - t) * 0.08 + Math.sin(i * 2.3) * 0.015, -0.03 * s]), normal: add(outward, [0, Math.sin(i * 1.7) * 0.06, 0]),
            length: primary * lerp(0.78, 1, Math.sqrt(t)), width: primary * 0.15, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.05, asym: 0.45
        });
    });
    if (coverts) {
        along(arm.elbow, arm.handTip, Math.round((primaries + secondaries) * 0.8), 0.05, 0.9).forEach((p) => {
            out.push({
                tag: 'arm', at: add(p, [0, primary * 0.02, s * primary * 0.06]), dir: norm([-1, -0.25, 0]), normal: outward,
                length: primary * 0.32, width: primary * 0.13, col: coverCol || col, col2: coverCol || col, style: STYLE.vane, curve: 0.04, asym: 0.9
            });
        });
    }
    return out;
}

// An open wing in flight: primaries fanning from the hand, secondaries along the
// forearm, all lying flat and pointing back, with a row of coverts over them
export function spreadWing(arm, { primary, primaries = 10, secondaries = 10, col, col2, bands = 0, coverCol, style = STYLE.flight, tipCol }) {
    const s = arm.sgn;
    const out = [];
    along(arm.elbow, arm.wrist, secondaries, 0, 1).forEach((p, i, arr) => {
        const t = i / (arr.length - 1);
        out.push({ tag: 'arm', at: p, dir: norm([-1, 0, 0.05 * s]), normal: [0, 1, 0], length: primary * lerp(0.62, 0.72, t), width: primary * 0.18, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.04, asym: 0.75 });
    });
    along(arm.wrist, arm.handTip, primaries, 0, 1.05).forEach((p, i, arr) => {
        const t = i / (arr.length - 1);
        out.push({ tag: 'arm', at: add(p, [0, -primary * 0.004 * i, 0]), dir: norm([-1 + t * 0.7, 0, (0.08 + t * 0.9) * s]), normal: [0, 1, 0], length: primary * lerp(0.8, 1, Math.sqrt(t)), width: primary * 0.15, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.03, asym: 0.45 });
    });
    along(arm.sh, arm.handTip, Math.round((primaries + secondaries) * 0.7), 0.1, 0.92).forEach((p) => {
        out.push({ tag: 'arm', at: add(p, [0, primary * 0.012, 0]), dir: norm([-1, 0, 0.1 * s]), normal: [0, 1, 0], length: primary * 0.34, width: primary * 0.14, col: coverCol || col, col2: coverCol || col, style: STYLE.vane, curve: 0.03, asym: 0.9 });
    });
    return out;
}

// Long feathers on the shin and foot: the hind-wings of Microraptor and its relatives
export function legFeathers(leg, sgn, { length, col, col2, bands = 0, count = 8, tibia = true, style = STYLE.flight, flight = false }) {
    const out = [];
    const outward = flight ? [0, 1, 0] : [0, 0.1, sgn];
    const dirOf = (t, base) => (flight ? norm([-0.45, 0, sgn]) : base);
    along(leg.ankle, leg.ball, count, 0.05, 0.8).forEach((p, i, arr) => {
        const t = i / (arr.length - 1);
        out.push({
            tag: 'leg', at: add(p, [-length * 0.02, 0, sgn * length * 0.04]), dir: dirOf(t, norm([-1, -0.45 - t * 0.4, 0.1 * sgn])), normal: outward,
            length: length * lerp(1, 0.75, t), width: length * 0.17, col, col2, bands, style, curve: 0.05, asym: 0.55
        });
    });
    if (tibia) {
        along(leg.knee, leg.ankle, Math.round(count * 0.9), 0.15, 0.95).forEach((p, i, arr) => {
            const t = i / (arr.length - 1);
            out.push({
                tag: 'leg', at: add(p, [-length * 0.03, 0, sgn * length * 0.05]), dir: dirOf(t, norm([-1, -0.15 - t * 0.2, 0.1 * sgn])), normal: outward,
                length: length * lerp(0.45, 0.7, t), width: length * 0.16, col, col2, bands, style, curve: 0.04, asym: 0.7
            });
        });
    }
    return out;
}

// A fan of feathers along the end of the tail, both sides, lying flat
export function tailFan(tail, { from = 0.5, length, spread = 0.5, col, col2, bands = 0, style = STYLE.flight, count = 7, frond = true, tipCol }) {
    const n = tail.length - 1;
    const out = [];
    const pt = (u) => {
        const f = u * n, i = Math.min(n - 1, Math.floor(f));
        return { p: lerp3(tail[i], tail[i + 1], f - i), t: norm(sub(tail[i + 1], tail[i])) };
    };
    for (let k = 0; k < count; k++) {
        const u = lerp(from, 0.98, k / Math.max(1, count - 1));
        const { p, t } = pt(u);
        const grow = frond ? lerp(0.35, 1, (k / Math.max(1, count - 1)) ** 0.8) : 1;
        [1, -1].forEach((s) => {
            const a = spread * (1 - (k / count) * 0.6);
            const dir = norm(add(t, [0, 0.03, Math.sin(a) * s]));
            out.push({ tag: 'tail', at: add(p, [0, length * 0.02, 0]), dir, normal: [0, 1, 0], length: length * grow, width: length * 0.16, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.03, asym: 0.6 });
        });
    }
    // the tip: a pair straight back
    const { p, t } = pt(0.995);
    [0.06, -0.06].forEach((z) => out.push({ tag: 'tail', at: p, dir: norm(add(t, [0, 0, z])), normal: [0, 1, 0], length: length * 1.05, width: length * 0.17, col, col2: tipCol || col2, bands: tipCol ? -1 : bands, style, curve: 0.03, asym: 1 }));
    return out;
}

// A row of quills or bristles standing along the top of a chain of points (neck, back,
// tail): the long unbranched filaments of Beipiaosaurus, the tail bristles of Psittacosaurus
export function ridgeQuills(points, radii, { from = 0, to = 1, count, length, lengthFn, width = 0.08, rise = 0.6, col, col2, tipCol, style = STYLE.ribbon, spread = 0.25, rows = 1 }) {
    const n = points.length - 1;
    const out = [];
    for (let k = 0; k < count; k++) {
        const u = lerp(from, to, count === 1 ? 0 : k / (count - 1));
        const f = u * n, i = Math.min(n - 1, Math.floor(f));
        const p = lerp3(points[i], points[i + 1], f - i);
        const r = lerp(radii[i], radii[i + 1], f - i);
        const t = norm(sub(points[i + 1], points[i]));
        for (let row = 0; row < rows; row++) {
            const side = rows === 1 ? 0 : (row / (rows - 1) - 0.5) * 2;
            const base = add(p, [0, r * (0.85 - Math.abs(side) * 0.25), side * r * 0.5]);
            // lean back along the chain, rising off the skin; jitter so they don't look combed
            const j = Math.sin(k * 12.9898 + row * 4.1) * 0.5;
            const dir = norm(add(mul(t, 1 - rise), [0, rise + j * 0.1, side * spread + j * 0.12]));
            const len = (lengthFn ? lengthFn(u) : length) * (0.85 + 0.3 * Math.abs(Math.sin(k * 7.31 + row)));
            out.push({ tag: 'ridge', at: base, dir, normal: norm([side * 0.6 + j * 0.3, 0.2, 1]), length: len, width: len * width, col, col2: tipCol || col2 || col, bands: tipCol ? -1 : 0, style, curve: 0.18 + Math.abs(j) * 0.2, asym: 1 });
        }
    }
    return out;
}
