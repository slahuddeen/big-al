// Body plans other than the biped: pterosaurs, four-legged dinosaurs, mammals, sprawling
// reptiles, turtles and fish. Same conventions as anatomy.js (metres, facing +x, y up).
import { Sculpt, vec } from './sculpt.js';
import { add, mul, lerp, lerp3, bezier, ramp, digit, sphereCut } from './anatomy.js';

const { norm, sub, cross, len } = vec;

// Eye with socket and a soft brow, at point c looking along out
export function addEye(S, c, out, r, { brow = 0.4, up = [0, 1, 0], dir = [1, 0, 0], tag = 'brow' } = {}) {
    S.push(sphereCut(c, r * 1.05), { mode: 'cut', k: r * 0.25 });
    if (brow > 0) S.ellipsoid(add(c, add(mul(up, r * 0.95), mul(out, -r * 0.15))), [r * 1.5, r * (0.18 + 0.3 * brow), r * 0.55], { dir, tag, k: r * 0.45, flow: mul(dir, -1) });
    S.extra({ type: 'eye', at: add(c, mul(out, -r * 0.12)), dir: out, r });
}

// A head built along its own axis: skull (wedge), lower jaw, eyes. Returns at(f, up, side).
export function head(S, base, dir, { len: L, h, w, tip = 0.4, squash = 0.7, jaw = 0.5, eyeAt = 0.3, eyeUp = 0.15, eyeR, brow = 0.4, tag = 'snout', jawTag = 'jaw', drop = 0, gape = true }) {
    const hd = norm(dir);
    const hu = norm(cross([0, 0, 1], hd));
    const at = (f, up = 0, side = 0) => add(add(add(base, mul(hd, L * f)), mul(hu, h * up)), [0, 0, w * side]);
    const td = (1 - tip) * 0.1 + drop;
    const F = [0, 0.3, 0.64, 0.97];
    const U = [0.04, 0.02, -0.04 - td * 0.5, -0.1 - td];
    const R = [0.48, 0.42, 0.3 * (0.75 + tip * 0.5), 0.13 * (0.5 + tip)];
    const sw = w / h;
    S.chain(F.map((f, i) => at(f, U[i])), R.map((r) => r * h), { tag, squash: (t) => [lerp(sw, sw * squash, t), 1], k: h * 0.12, flow: mul(hd, -1) });
    S.ellipsoid(at(0.06, -0.02), [L * 0.16, h * 0.42, w * 0.56], { dir: hd, tag: 'head', k: h * 0.2, flow: mul(hd, -1) });
    S.cone(at(0.02, -0.34), at(0.93, -0.25 - td * 1.2), h * 0.4 * jaw, h * 0.14 * jaw, { tag: jawTag, squash: [sw * 0.95, 0.85], k: h * 0.1, flow: mul(hd, -1) });
    if (gape) S.cone(at(0.12, -0.2), at(0.96, -0.2 - td * 1.1), h * 0.03, h * 0.018, { mode: 'cut', squash: [sw * 4, 1], k: h * 0.03 });
    const top = (f) => {
        let i = 0;
        while (i < F.length - 2 && f > F[i + 1]) i++;
        const t = Math.min(1, Math.max(0, (f - F[i]) / (F[i + 1] - F[i])));
        return at(f, lerp(U[i], U[i + 1], t) + lerp(R[i], R[i + 1], t));
    };
    const eyes = [1, -1].map((s) => {
        const c = at(eyeAt, eyeUp, 0.36 * s);
        const out = norm(add([0, 0, s], mul(hd, 0.3)));
        addEye(S, c, out, eyeR, { brow, up: hu, dir: hd });
        return { c, out };
    });
    return { at, dir: hd, up: hu, top, eyes };
}

// ---------------------------------------------------------------------------------------
// Pterosaur standing on all fours with its wings folded
export function pterosaur(S, p) {
    const q = {
        humerus: 0.055, forearm: 0.095, meta: 0.085, wingFinger: 0.3, femur: 0.055, tibia: 0.085, footLen: 0.03,
        torso: 0.075, chestR: 0.022, bellyR: 0.023, hipR: 0.015, neck: 0.13, neckR: 0.011, headNeckR: 0.009,
        head: 0.17, headH: 0.034, headW: 0.024, tip: 0.25, eyeR: 0.0065, eyeAt: 0.2, tail: 0.02, limbR: 0.0045,
        neckRise: 0.95, headTilt: -0.35,
        ...p
    };
    const rig = { q };
    // forelimb from the shoulder, then lift the shoulder so the hand stands on the ground
    const sides = [1, -1].map((s) => {
        const e = norm([-0.3, 0.3, 0.9 * s]);
        const w = norm([0.18, -0.97, -0.12 * s]);
        const m = norm([0.12, -0.99, 0.06 * s]);
        return { s, e, w, m };
    });
    const drop = -(sides[0].e[1] * q.humerus + sides[0].w[1] * q.forearm + sides[0].m[1] * q.meta);
    const shY = drop + q.limbR * 1.5;
    const sh0 = [0, shY, 0];
    // hindlimb: the hip sits lower, so the back slopes down to the tail
    const kd = norm([0.25, -0.7, 0.62]), ad = norm([-0.2, -0.97, 0.08]);
    const hipY = -(kd[1] * q.femur + ad[1] * q.tibia) + q.limbR;
    const hip0 = [-q.torso, hipY, 0];

    // torso and the short tail
    const torsoPts = [add(sh0, [q.chestR * 0.3, 0, 0]), lerp3(sh0, hip0, 0.5), hip0];
    S.chain(torsoPts, [q.chestR, q.bellyR, q.hipR], { tag: 'body', squash: [0.85, 1], k: q.hipR * 0.6 });
    S.cone(hip0, add(hip0, [-q.tail, -q.tail * 0.3, 0]), q.hipR * 0.5, q.hipR * 0.15, { tag: 'tail', k: q.hipR * 0.3 });

    sides.forEach(({ s, e, w, m }) => {
        const sh = add(sh0, [0, -q.chestR * 0.2, q.chestR * 0.7 * s]);
        const elbow = add(sh, mul(e, q.humerus));
        const wrist = add(elbow, mul(w, q.forearm));
        const hand = add(wrist, mul(m, q.meta));
        S.cone(sh, elbow, q.limbR * 2.2, q.limbR * 1.5, { tag: 'arm', k: q.limbR * 1.5 });
        S.cone(elbow, wrist, q.limbR * 1.5, q.limbR * 1.1, { tag: 'arm', k: q.limbR });
        S.cone(wrist, hand, q.limbR * 1.1, q.limbR * 0.9, { tag: 'hand', k: q.limbR * 0.6, flow: [0, -1, 0] });
        // three small fingers on the ground, pointing out and back
        [0, 1, 2].forEach((f) => digit(S, hand, [0.3 - f * 0.3, -0.25, 0.9 * s], [0.008, 0.007], q.limbR * 0.4, { tag: 'hand', claw: 0.006, clawCurve: 1.2 }));
        // the wing finger folds back up along the forearm and past the elbow
        const k0 = add(hand, [0, q.limbR * 0.5, q.limbR * s]);
        const wf = [k0, add(k0, mul(norm([-0.2, 0.97, 0.18 * s]), q.wingFinger * 0.38)), null, null];
        wf[2] = add(wf[1], mul(norm([-0.97, 0.06, -0.12 * s]), q.wingFinger * 0.3));
        wf[3] = add(wf[2], mul(norm([-0.95, -0.22, -0.08 * s]), q.wingFinger * 0.32));
        S.chain(wf, [q.limbR * 0.7, q.limbR * 0.55, q.limbR * 0.4, q.limbR * 0.2], { tag: 'wingbone', k: q.limbR * 0.3 });
        rig[s > 0 ? 'armR' : 'armL'] = { sh, elbow, wrist, hand, wf };
        // hindlimb
        const hp = add(hip0, [0, 0, q.hipR * 0.7 * s]);
        const knee = add(hp, mul([kd[0], kd[1], kd[2] * s], q.femur));
        const ankle = add(knee, mul([ad[0], ad[1], ad[2] * s], q.tibia));
        S.cone(hp, knee, q.limbR * 2.2, q.limbR * 1.3, { tag: 'thigh', k: q.limbR * 1.5 });
        S.cone(knee, ankle, q.limbR * 1.3, q.limbR * 0.8, { tag: 'shin', k: q.limbR });
        [-0.25, -0.08, 0.08, 0.25].forEach((a) => digit(S, add(ankle, [0, -q.limbR * 0.3, 0]), [Math.cos(a), -0.05, Math.sin(a) * s + 0.15 * s], [q.footLen * 0.5, q.footLen * 0.5], q.limbR * 0.45, { tag: 'foot', claw: 0.004, clawCurve: 1 }));
        rig[s > 0 ? 'legR' : 'legL'] = { hip: hp, knee, ankle };
    });

    // neck rising in a gentle curve, and the head
    const n0 = add(sh0, [q.chestR * 0.6, q.chestR * 0.4, 0]);
    const n3 = add(n0, [Math.cos(q.neckRise) * q.neck, Math.sin(q.neckRise) * q.neck, 0]);
    const neckPts = bezier(n3, add(n3, [-q.neck * 0.15, -q.neck * 0.3, 0]), add(n0, [q.neck * 0.3, 0, 0]), n0, 5);
    S.chain(neckPts, ramp(5, (t) => lerp(q.headNeckR, q.neckR, t)), { tag: 'neck', k: q.neckR * 0.5 });
    const hdir = [Math.cos(q.headTilt), Math.sin(q.headTilt), 0];
    rig.head = head(S, add(n3, mul(norm(hdir), -q.headH * 0.2)), hdir, {
        len: q.head, h: q.headH, w: q.headW, tip: q.tip, squash: 0.55, jaw: 0.42, eyeAt: q.eyeAt, eyeUp: 0.18, eyeR: q.eyeR, brow: 0.15, drop: q.beakDrop || 0, gape: q.gape ?? false
    });
    rig.neck = neckPts;
    rig.sh = sh0;
    rig.hip = hip0;
    return rig;
}
