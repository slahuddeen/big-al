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
    const rig = { q, plan: 'pterosaur', fly: p.pose === 'fly' };
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
    const hipY = q.pose === 'fly' ? shY : -(kd[1] * q.femur + ad[1] * q.tibia) + q.limbR;
    const hip0 = [-q.torso, hipY, 0];

    // torso and the short tail
    const torsoPts = [add(sh0, [q.chestR * 0.3, 0, 0]), lerp3(sh0, hip0, 0.5), hip0];
    S.chain(torsoPts, [q.chestR, q.bellyR, q.hipR], { tag: 'body', squash: [0.85, 1], k: q.hipR * 0.6 });
    S.cone(hip0, add(hip0, [-q.tail, -q.tail * 0.3, 0]), q.hipR * 0.5, q.hipR * 0.15, { tag: 'tail', k: q.hipR * 0.3 });

    const fly = q.pose === 'fly';
    sides.forEach(({ s, e, w, m }) => {
        const sh = add(sh0, [0, -q.chestR * 0.2, q.chestR * 0.7 * s]);
        if (fly) {
            // wings spread: arm out to the side, the long wing finger sweeping back to the tip
            const elbow = add(sh, mul(norm([0.25, 0.08, s]), q.humerus));
            const wrist = add(elbow, mul(norm([0.35, -0.02, s]), q.forearm));
            const k0 = add(wrist, mul(norm([0.15, 0, s]), q.meta));
            S.cone(sh, elbow, q.limbR * 2.2, q.limbR * 1.5, { tag: 'arm', k: q.limbR * 1.5 });
            S.cone(elbow, wrist, q.limbR * 1.5, q.limbR * 1.1, { tag: 'arm', k: q.limbR });
            S.cone(wrist, k0, q.limbR * 1.1, q.limbR * 0.9, { tag: 'hand', k: q.limbR * 0.6 });
            [0, 1, 2].forEach((f) => digit(S, wrist, [0.9, -0.1 - f * 0.1, 0.25 * s], [0.008, 0.007], q.limbR * 0.4, { tag: 'hand', claw: 0.006, clawCurve: 1.2 }));
            const wf = [k0];
            [[-0.2, 0.38], [-0.45, 0.3], [-0.75, 0.32]].forEach(([bx, f]) => wf.push(add(wf[wf.length - 1], mul(norm([bx, 0, s]), q.wingFinger * f))));
            S.chain(wf, [q.limbR * 0.7, q.limbR * 0.55, q.limbR * 0.4, q.limbR * 0.2], { tag: 'wingbone', k: q.limbR * 0.3 });
            rig[s > 0 ? 'armR' : 'armL'] = { sh, elbow, wrist, hand: k0, wf, sgn: s };
            // hind legs trail under the tail
            const hp = add(hip0, [0, 0, q.hipR * 0.7 * s]);
            const knee = add(hp, mul(norm([-0.7, -0.3, 0.3 * s]), q.femur));
            const ankle = add(knee, mul(norm([-0.95, -0.1, 0.12 * s]), q.tibia));
            S.cone(hp, knee, q.limbR * 2.2, q.limbR * 1.3, { tag: 'thigh', k: q.limbR * 1.5 });
            S.cone(knee, ankle, q.limbR * 1.3, q.limbR * 0.8, { tag: 'shin', k: q.limbR });
            [-0.25, 0, 0.25].forEach((a) => digit(S, ankle, [-Math.cos(a), -0.1, Math.sin(a) * s], [q.footLen * 0.5, q.footLen * 0.4], q.limbR * 0.45, { tag: 'foot', claw: 0.004, clawCurve: 1 }));
            rig[s > 0 ? 'legR' : 'legL'] = { hip: hp, knee, ankle };
            return;
        }
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
        rig[s > 0 ? 'armR' : 'armL'] = { sh, elbow, wrist, hand, wf, sgn: s };
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
    const rise = q.pose === 'fly' ? 0.2 : q.neckRise;
    const n0 = add(sh0, [q.chestR * 0.6, q.chestR * 0.4, 0]);
    const n3 = add(n0, [Math.cos(rise) * q.neck, Math.sin(rise) * q.neck, 0]);
    const neckPts = bezier(n3, add(n3, [-q.neck * 0.15, -q.neck * 0.3, 0]), add(n0, [q.neck * 0.3, 0, 0]), n0, 5);
    S.chain(neckPts, ramp(5, (t) => lerp(q.headNeckR, q.neckR, t)), { tag: 'neck', k: q.neckR * 0.5 });
    const tilt = q.pose === 'fly' ? -0.15 : q.headTilt;
    const hdir = [Math.cos(tilt), Math.sin(tilt), 0];
    rig.head = head(S, add(n3, mul(norm(hdir), -q.headH * 0.2)), hdir, {
        len: q.head, h: q.headH, w: q.headW, tip: q.tip, squash: 0.55, jaw: 0.42, eyeAt: q.eyeAt, eyeUp: 0.18, eyeR: q.eyeR, brow: 0.15, drop: q.beakDrop || 0, gape: q.gape ?? false
    });
    rig.neck = neckPts;
    rig.sh = sh0;
    rig.hip = hip0;
    return rig;
}

// Edges of an open pterosaur wing: the leading edge runs out along the arm and wing
// finger; the trailing edge runs from the flank by the hips out to the wingtip
export const flightWingEdges = (rig, side) => {
    const arm = side > 0 ? rig.armR : rig.armL;
    const leg = side > 0 ? rig.legR : rig.legL;
    const tip = arm.wf[arm.wf.length - 1];
    const lead = [arm.sh, arm.elbow, arm.wrist, ...arm.wf];
    const mid = lerp3(leg.ankle, tip, 0.5);
    const trail = [add(rig.sh, [-0.002, 0, 0]), add(leg.hip, [0, 0, 0]), leg.ankle, add(mid, [-0.06 * len(sub(tip, leg.ankle)), 0, 0]), tip];
    return { lead, trail };
};

// ---------------------------------------------------------------------------------------
// Four-legged dinosaur: iguanodonts, sauropods, ankylosaurs
const legChain = (top, angs, lens) => {
    const pts = [top];
    angs.forEach((a, i) => pts.push(add(pts[i], mul(norm([Math.sin(a), -Math.cos(a), 0]), lens[i]))));
    return pts;
};
const chainDrop = (angs, lens) => angs.reduce((d, a, i) => d + Math.cos(a) * lens[i], 0);

export function quadruped(S, p) {
    const q = {
        femur: 1, tibia: 0.9, meta: 0.4, hindAng: [0.15, -0.2, 0.15], humerus: 0.8, forearm: 0.7, mc: 0.3, foreAng: [-0.1, 0.12, 0.05],
        hipW: 0.3, shW: 0.3, thighR: 0.3, kneeR: 0.15, shinR: 0.14, ankleR: 0.1, footR: 0.1, upperArmR: 0.16, elbowR: 0.1, wristR: 0.08, handR: 0.08,
        torso: 2, hipR: 0.4, bellyR: 0.55, chestR: 0.45, bodySquash: 0.8, bellyDrop: 0.1, backHump: 0,
        neck: 1, neckR: 0.25, headNeckR: 0.15, neckRise: 0.5, neckS: 0.4,
        head: 0.6, headH: 0.25, headW: 0.18, tip: 0.5, squash: 0.65, eyeR: 0.03, eyeAt: 0.25, eyeUp: 0.16, brow: 0.4, headTilt: -0.3, drop: 0, jaw: 0.5,
        tail: 3, tailR: 0.3, tailDroop: 0.1, tailSquash: 0.75,
        feet: 'hoof3', hands: 'hoof', toeLen: 0.15, toeR: 0.05, claw: 0.06,
        ...p
    };
    const rig = { q, plan: 'quadruped' };
    const hipY = chainDrop(q.hindAng, [q.femur, q.tibia, q.meta]) + q.footR * 0.6;
    const shY = chainDrop(q.foreAng, [q.humerus, q.forearm, q.mc]) + q.handR * 0.6;
    const hip = [0, hipY, 0], sh = [q.torso, shY, 0];
    rig.hip = hip;
    rig.sh = sh;

    // torso from shoulders to hips, the belly hanging between
    const mid = add(lerp3(sh, hip, 0.5), [0, -q.bellyDrop + q.backHump * 0.5, 0]);
    const torsoPts = bezier(add(sh, [q.chestR * 0.2, q.chestR * 0.1, 0]), add(lerp3(sh, mid, 0.5), [0, -q.bellyDrop * 0.3, 0]), add(lerp3(mid, hip, 0.5), [0, 0, 0]), add(hip, [0, q.hipR * 0.3, 0]), 6);
    const torsoR = ramp(6, (t) => (t < 0.5 ? lerp(q.chestR, q.bellyR, t * 2) : lerp(q.bellyR, q.hipR, (t - 0.5) * 2)));
    S.chain(torsoPts, torsoR, { tag: 'body', squash: [q.bodySquash, 1], k: q.hipR * 0.5 });
    rig.torso = torsoPts;
    rig.torsoR = torsoR;

    // hind legs
    const hind = (s) => {
        const [h, k, a, b] = legChain(add(hip, [0, 0, q.hipW * s]), q.hindAng, [q.femur, q.tibia, q.meta]);
        S.ellipsoid(add(lerp3(h, k, 0.35), [-q.thighR * 0.2, q.thighR * 0.2, 0]), [q.femur * 0.55, q.thighR * 1.15, q.thighR * 0.75], { dir: sub(k, h), tag: 'thigh', k: q.thighR * 0.6, flow: [0, -1, 0] });
        S.cone(h, k, q.thighR * 0.7, q.kneeR, { tag: 'thigh', k: q.thighR * 0.4 });
        S.cone(k, a, q.kneeR, q.ankleR, { tag: 'shin', k: q.kneeR * 0.5 });
        S.ellipsoid(add(lerp3(k, a, 0.3), [-q.shinR * 0.4, 0, 0]), [q.tibia * 0.3, q.shinR * 1.1, q.shinR * 0.9], { dir: sub(a, k), tag: 'shin', k: q.shinR * 0.5 });
        S.cone(a, b, q.ankleR, q.footR, { tag: 'foot', k: q.ankleR * 0.5, flow: [0, -1, 0] });
        foot(S, b, s, q.feet, q);
        return { hip: h, knee: k, ankle: a, ball: b };
    };
    // forelegs
    const fore = (s) => {
        const [h, e, w, m] = legChain(add(sh, [-q.upperArmR * 0.3, -q.chestR * 0.25, q.shW * s]), q.foreAng, [q.humerus, q.forearm, q.mc]);
        S.ellipsoid(lerp3(h, e, 0.4), [q.humerus * 0.55, q.upperArmR * 1.1, q.upperArmR * 0.85], { dir: sub(e, h), tag: 'arm', k: q.upperArmR * 0.6, flow: [0, -1, 0] });
        S.cone(e, w, q.elbowR, q.wristR, { tag: 'arm', k: q.elbowR * 0.5 });
        S.cone(w, m, q.wristR, q.handR, { tag: 'hand', k: q.wristR * 0.4, flow: [0, -1, 0] });
        hand(S, m, s, q.hands, q);
        return { sh: h, elbow: e, wrist: w, hand: m };
    };
    rig.legR = hind(1); rig.legL = hind(-1);
    rig.armR = fore(1); rig.armL = fore(-1);

    // tail
    const t0 = add(hip, [-q.hipR * 0.2, q.hipR * 0.25, 0]);
    const tEnd = add(t0, [-q.tail, -q.tailDroop * q.tail, 0]);
    const tailPts = bezier(t0, add(t0, [-q.tail * 0.35, 0, 0]), add(tEnd, [q.tail * 0.3, q.tailDroop * q.tail * 0.5, 0]), tEnd, 9);
    const tailRad = ramp(9, (t) => q.tailR * Math.pow(1 - t, 1.1) + q.tailR * 0.04);
    S.chain(tailPts, tailRad, { tag: 'tail', squash: [q.tailSquash, 1], k: q.tailR * 0.4 });
    rig.tail = tailPts;
    rig.tailRad = tailRad;

    // neck and head
    const n0 = add(sh, [q.chestR * 0.45, q.chestR * 0.2, 0]);
    const n3 = add(n0, [Math.cos(q.neckRise) * q.neck, Math.sin(q.neckRise) * q.neck, 0]);
    const neckPts = bezier(n3, add(n3, [-q.neck * 0.25 * q.neckS, -q.neck * 0.2 * q.neckS, 0]), add(n0, [q.neck * 0.35, q.neck * 0.05, 0]), n0, 8);
    S.chain(neckPts, ramp(8, (t) => lerp(q.headNeckR, q.neckR, Math.pow(t, 0.9))), { tag: 'neck', squash: [0.85, 1], k: q.neckR * 0.4 });
    rig.neck = neckPts;
    const hd = [Math.cos(q.headTilt), Math.sin(q.headTilt), 0];
    rig.head = head(S, add(n3, mul(norm(hd), -q.headNeckR * 0.3)), hd, {
        len: q.head, h: q.headH, w: q.headW, tip: q.tip, squash: q.squash, jaw: q.jaw, eyeAt: q.eyeAt, eyeUp: q.eyeUp, eyeR: q.eyeR, brow: q.brow, drop: q.drop
    });
    return rig;
}

function foot(S, b, s, kind, q) {
    if (kind === 'column') {
        // an elephant-like pad, with claws on the inner toes
        S.ellipsoid(add(b, [q.footR * 0.25, -q.footR * 0.35, 0]), [q.footR * 1.25, q.footR * 0.6, q.footR * 1.05], { tag: 'foot', k: q.footR * 0.4 });
        [0, 1, 2].forEach((i) => S.extra({ type: 'claw', at: add(b, [q.footR * 0.95, -q.footR * 0.35, (0.5 - i * 0.4) * q.footR * s]), dir: [0.6, -0.3, (0.6 - i * 0.3) * s], up: [0, 1, 0], length: q.claw, radius: q.claw * 0.35, curve: 0.6 }));
        return;
    }
    const spread = kind === 'broad' ? [-0.6, -0.2, 0.2, 0.6] : [-0.38, 0, 0.38];
    spread.forEach((a) => digit(S, b, [Math.cos(a), -0.35, Math.sin(a) * s], [q.toeLen * 0.5, q.toeLen * 0.5], q.toeR * (a === 0 ? 1 : 0.9), {
        tag: 'toe', down: 0.3, claw: q.claw, clawCurve: kind === 'hoof3' ? 0.25 : 0.5, k: q.toeR * 0.5
    }));
}

function hand(S, m, s, kind, q) {
    if (kind === 'column') {
        S.ellipsoid(add(m, [0, -q.handR * 0.35, 0]), [q.handR * 1.05, q.handR * 0.6, q.handR * 1.0], { tag: 'hand', k: q.handR * 0.4 });
        S.extra({ type: 'claw', at: add(m, [q.handR * 0.3, -q.handR * 0.2, -q.handR * 0.9 * s]), dir: [0.3, -0.4, -0.85 * s], up: [0, 1, 0], length: q.claw * 1.2, radius: q.claw * 0.35, curve: 0.8 });
        return;
    }
    if (kind === 'hoof') {
        // three middle fingers bound into a hoof-like hand, the thumb a spike, the fifth finger free
        digit(S, m, [0.9, -0.4, 0], [q.toeLen * 0.35, q.toeLen * 0.3], q.handR * 0.85, { tag: 'hand', claw: q.claw * 0.8, clawCurve: 0.2, k: q.handR * 0.5 });
        digit(S, add(m, [0, q.handR * 0.6, -q.handR * 0.5 * s]), [0.5, 0.45, -0.7 * s], [q.toeLen * 0.15], q.handR * 0.4, { tag: 'hand', claw: q.claw * 1.4, clawCurve: 0.15 });
        digit(S, add(m, [0, 0, q.handR * 0.6 * s]), [0.2, -0.6, 0.8 * s], [q.toeLen * 0.2, q.toeLen * 0.15], q.handR * 0.3, { tag: 'hand', claw: q.claw * 0.3, clawCurve: 0.4 });
        return;
    }
    [-0.6, -0.2, 0.2, 0.6].forEach((a) => digit(S, m, [Math.cos(a), -0.4, Math.sin(a) * s], [q.toeLen * 0.3, q.toeLen * 0.3], q.handR * 0.4, { tag: 'hand', claw: q.claw * 0.6, clawCurve: 0.5 }));
}

// ---------------------------------------------------------------------------------------
// Early mammal: a long, low body on semi-sprawling legs, with a furry tail
export function mammal(S, p) {
    const q = {
        torso: 0.3, hipR: 0.06, bellyR: 0.075, chestR: 0.07, bodySquash: 0.9, backHump: 0.02,
        upperLeg: 0.08, lowerLeg: 0.07, paw: 0.04, limbR: 0.02, spread: 0.45,
        neck: 0.06, neckR: 0.05, head: 0.13, headH: 0.06, headW: 0.06, tip: 0.6, squash: 0.6, eyeR: 0.008, eyeAt: 0.42, eyeUp: 0.2, ear: 0.02,
        tail: 0.15, tailR: 0.025, tailDroop: 0.25, headTilt: -0.15,
        ...p
    };
    const rig = { q, plan: 'mammal' };
    const legY = (q.upperLeg * 0.85 + q.lowerLeg * 0.95) * 0.95 + q.limbR * 0.5;
    const hip = [0, legY + q.hipR * 0.2, 0], sh = [q.torso, legY + q.chestR * 0.1, 0];
    const mid = add(lerp3(sh, hip, 0.5), [0, q.backHump, 0]);
    const torso = bezier(sh, lerp3(sh, mid, 0.6), lerp3(mid, hip, 0.4), hip, 6);
    S.chain(torso, ramp(6, (t) => (t < 0.5 ? lerp(q.chestR, q.bellyR, t * 2) : lerp(q.bellyR, q.hipR, (t - 0.5) * 2))), { tag: 'body', squash: [q.bodySquash, 1], k: q.hipR * 0.5 });
    rig.torso = torso;
    const leg = (top, s, front) => {
        const knee = add(top, [front ? -q.upperLeg * 0.3 : q.upperLeg * 0.35, -q.upperLeg * 0.85, q.upperLeg * q.spread * s]);
        const ankle = add(knee, [front ? q.lowerLeg * 0.15 : -q.lowerLeg * 0.25, -q.lowerLeg * 0.95, q.lowerLeg * 0.1 * s]);
        S.ellipsoid(lerp3(top, knee, 0.4), [q.upperLeg * 0.6, q.limbR * 1.7, q.limbR * 1.3], { dir: sub(knee, top), tag: front ? 'arm' : 'thigh', k: q.limbR, flow: [0, -1, 0] });
        S.cone(knee, ankle, q.limbR, q.limbR * 0.7, { tag: front ? 'arm' : 'shin', k: q.limbR * 0.6 });
        // a paw with five short toes
        const pawC = add(ankle, [q.paw * 0.35, -q.limbR * 0.3, 0.004 * s]);
        S.ellipsoid(pawC, [q.paw * 0.55, q.limbR * 0.55, q.limbR * 1.0], { tag: 'paw', k: q.limbR * 0.4 });
        [-0.6, -0.3, 0, 0.3, 0.6].forEach((a) => digit(S, add(pawC, [q.paw * 0.3, 0, 0]), [Math.cos(a), -0.3, Math.sin(a) * s], [q.paw * 0.25], q.limbR * 0.22, { tag: 'paw', claw: q.paw * 0.28, clawCurve: 0.9 }));
        return { top, knee, ankle };
    };
    [1, -1].forEach((s) => {
        rig[s > 0 ? 'legR' : 'legL'] = leg(add(hip, [0, -q.hipR * 0.3, q.hipR * 0.7 * s]), s, false);
        rig[s > 0 ? 'armR' : 'armL'] = leg(add(sh, [0, -q.chestR * 0.35, q.chestR * 0.65 * s]), s, true);
    });
    // tail
    const t0 = add(hip, [-q.hipR * 0.5, q.hipR * 0.1, 0]);
    const tEnd = add(t0, [-q.tail * 0.9, -q.tail * q.tailDroop, 0]);
    const tail = bezier(t0, add(t0, [-q.tail * 0.4, 0, 0]), add(tEnd, [q.tail * 0.3, q.tail * 0.1, 0]), tEnd, 6);
    S.chain(tail, ramp(6, (t) => q.tailR * (1 - t * 0.75)), { tag: 'tail', k: q.tailR * 0.5 });
    rig.tail = tail;
    rig.hip = hip;
    rig.sh = sh;
    // neck and head
    const n0 = add(sh, [q.chestR * 0.4, q.chestR * 0.15, 0]);
    const n1 = add(n0, [q.neck, q.neck * 0.25, 0]);
    rig.neckBase = n0;
    S.cone(n0, n1, q.neckR, q.neckR * 0.85, { tag: 'neck', k: q.neckR * 0.5, flow: [-1, 0, 0] });
    const hd = [Math.cos(q.headTilt), Math.sin(q.headTilt), 0];
    const H = head(S, add(n1, mul(norm(hd), -q.headH * 0.3)), hd, { len: q.head, h: q.headH, w: q.headW, tip: q.tip, squash: q.squash, jaw: 0.5, eyeAt: q.eyeAt, eyeUp: q.eyeUp, eyeR: q.eyeR, brow: 0.2, gape: false });
    // rounded ears and a bare nose pad
    [1, -1].forEach((s) => S.ellipsoid(H.at(0.12, 0.42, 0.42 * s), [q.ear * 0.5, q.ear, q.ear * 0.28], { dir: hd, up: [0.2, 1, 0.5 * s], tag: 'ear', k: q.ear * 0.3 }));
    S.ellipsoid(H.at(0.97, -0.05), [q.headH * 0.12, q.headH * 0.14, q.headW * 0.22], { dir: hd, tag: 'nose', k: q.headH * 0.05 });
    rig.head = H;
    return rig;
}

// ---------------------------------------------------------------------------------------
// Sprawling reptile: lizards, choristoderes, crocodile-like animals
export function sprawler(S, p) {
    const q = {
        torso: 0.2, bodyR: 0.04, hipR: 0.03, chestR: 0.035, bodySquash: 1.15,
        neck: 0.05, neckR: 0.025, headNeckR: 0.02, neckRise: 0.1, neckCurve: 0,
        head: 0.07, headH: 0.025, headW: 0.035, tip: 0.4, squash: 0.6, eyeR: 0.006, eyeAt: 0.3, eyeUp: 0.25, headTilt: -0.05, brow: 0.5,
        tail: 0.3, tailR: 0.03, tailSquash: 0.7, tailWave: 0.05,
        upper: 0.04, lower: 0.035, limbR: 0.008, footLen: 0.03, webbed: false, rise: 0.3,
        ...p
    };
    const rig = { q, plan: 'sprawler' };
    const y = q.lower * 0.9 + q.limbR;
    const hip = [0, y, 0], sh = [q.torso, y + q.chestR * 0.05, 0];
    const torso = bezier(sh, lerp3(sh, hip, 0.33), lerp3(sh, hip, 0.66), hip, 5);
    S.chain(torso, ramp(5, (t) => (t < 0.5 ? lerp(q.chestR, q.bodyR, t * 2) : lerp(q.bodyR, q.hipR, (t - 0.5) * 2))), { tag: 'body', squash: [q.bodySquash, 0.8], k: q.hipR * 0.5 });
    rig.torso = torso;
    const limb = (top, s, front) => {
        // upper limb sticks out sideways, the lower limb goes down to the ground
        const knee = add(top, [front ? -q.upper * 0.25 : q.upper * 0.2, q.upper * q.rise * 0.3, q.upper * s]);
        const foot = [knee[0] + (front ? q.lower * 0.15 : -q.lower * 0.2), q.limbR * 0.6, knee[2] + q.lower * 0.2 * s];
        S.cone(top, knee, q.limbR * 1.5, q.limbR, { tag: front ? 'arm' : 'thigh', k: q.limbR });
        S.cone(knee, foot, q.limbR, q.limbR * 0.75, { tag: front ? 'arm' : 'shin', k: q.limbR * 0.6 });
        const toes = [-0.9, -0.45, 0, 0.45, 0.9].map((a) => digit(S, foot, [Math.cos(a) * (front ? 1 : 0.8), -0.15, Math.sin(a) * 0.9 * s + (front ? 0.3 : 0.5) * s], [q.footLen * 0.5, q.footLen * 0.45], q.limbR * 0.35, { tag: 'foot', claw: q.footLen * 0.18, clawCurve: 0.8 }));
        return { top, knee, foot, toes };
    };
    [1, -1].forEach((s) => {
        rig[s > 0 ? 'legR' : 'legL'] = limb(add(hip, [0, 0, q.hipR * 0.8 * s]), s, false);
        rig[s > 0 ? 'armR' : 'armL'] = limb(add(sh, [-q.chestR * 0.2, -q.chestR * 0.1, q.chestR * 0.8 * s]), s, true);
    });
    // tail with a slight sideways sweep
    const t0 = add(hip, [-q.hipR * 0.4, 0, 0]);
    const tail = ramp(10, (t) => [t0[0] - t * q.tail, t0[1] - t * q.tail * 0.05 * (1 - t), Math.sin(t * Math.PI) * q.tailWave * q.tail]);
    S.chain(tail, ramp(10, (t) => q.tailR * Math.pow(1 - t, 1.2) + q.tailR * 0.05), { tag: 'tail', squash: [q.tailSquash, 1], k: q.tailR * 0.4 });
    rig.tail = tail;
    // neck and head
    const n0 = add(sh, [q.chestR * 0.5, q.chestR * 0.1, 0]);
    const n1 = add(n0, [Math.cos(q.neckRise) * q.neck, Math.sin(q.neckRise) * q.neck, 0]);
    const neck = bezier(n1, add(n1, [-q.neck * 0.3, -q.neck * q.neckCurve, q.neck * q.neckCurve * 0.4]), add(n0, [q.neck * 0.3, 0, 0]), n0, Math.max(3, Math.round(q.neck / q.neckR)));
    S.chain(neck, ramp(neck.length - 1, (t) => lerp(q.headNeckR, q.neckR, t)), { tag: 'neck', squash: [1, 0.9], k: q.neckR * 0.4 });
    rig.neck = neck;
    const hd = [Math.cos(q.headTilt), Math.sin(q.headTilt), 0];
    rig.head = head(S, add(n1, mul(norm(hd), -q.headH * 0.2)), hd, { len: q.head, h: q.headH, w: q.headW, tip: q.tip, squash: q.squash, jaw: 0.5, eyeAt: q.eyeAt, eyeUp: q.eyeUp, eyeR: q.eyeR, brow: q.brow });
    rig.hip = hip;
    rig.sh = sh;
    return rig;
}

// ---------------------------------------------------------------------------------------
// Turtle: domed shell, plastron, head on a retractable neck, four short legs
export function turtle(S, p) {
    const q = { shell: 0.25, shellH: 0.07, shellW: 0.2, head: 0.04, neck: 0.04, limb: 0.05, limbR: 0.012, tail: 0.04, eyeR: 0.004, ...p };
    const rig = { q, plan: 'turtle' };
    const c = [0, q.limb * 0.6 + q.shellH * 0.45, 0];
    S.ellipsoid(c, [q.shell * 0.5, q.shellH, q.shellW * 0.5], { tag: 'shell', k: 0.005 });
    // the flat plastron underneath and a rim around the carapace
    S.ellipsoid(add(c, [0, -q.shellH * 0.45, 0]), [q.shell * 0.46, q.shellH * 0.25, q.shellW * 0.44], { tag: 'plastron', k: q.shellH * 0.2 });
    S.torus(add(c, [0, -q.shellH * 0.15, 0]), [0, 1, 0], q.shellW * 0.47, q.shellH * 0.1, { tag: 'shell', k: q.shellH * 0.15 });
    rig.shell = c;
    const nb = add(c, [q.shell * 0.42, -q.shellH * 0.2, 0]);
    const n1 = add(nb, [q.neck, q.neck * 0.4, 0]);
    rig.neckBase = nb;
    rig.neckTop = n1;
    S.cone(nb, n1, q.head * 0.32, q.head * 0.28, { tag: 'neck', k: q.head * 0.15, flow: [-1, 0, 0] });
    rig.head = head(S, n1, [1, -0.15, 0], { len: q.head, h: q.head * 0.55, w: q.head * 0.6, tip: 0.8, squash: 0.75, jaw: 0.5, eyeAt: 0.4, eyeUp: 0.2, eyeR: q.eyeR, brow: 0.2, gape: true, tag: 'beakhead', jawTag: 'beakjaw' });
    [1, -1].forEach((s) => {
        [[q.shell * 0.3, true], [-q.shell * 0.3, false]].forEach(([x, front]) => {
            const top = add(c, [x, -q.shellH * 0.3, q.shellW * 0.36 * s]);
            const foot = [top[0] + (front ? q.limb * 0.5 : -q.limb * 0.35), q.limbR * 0.6, top[2] + q.limb * 0.8 * s];
            S.cone(top, foot, q.limbR * 1.2, q.limbR * 0.8, { tag: 'limb', squash: [1, 0.65], k: q.limbR });
            [-0.5, 0, 0.5].forEach((a) => digit(S, foot, [Math.cos(a), -0.2, (Math.sin(a) + 0.6) * s], [q.limb * 0.12], q.limbR * 0.35, { tag: 'limb', claw: q.limb * 0.12, clawCurve: 0.7 }));
        });
    });
    S.cone(add(c, [-q.shell * 0.45, -q.shellH * 0.2, 0]), add(c, [-q.shell * 0.45 - q.tail, -q.shellH * 0.5, 0]), q.limbR, q.limbR * 0.2, { tag: 'limb', k: q.limbR * 0.5 });
    return rig;
}

// ---------------------------------------------------------------------------------------
// Fish: a laterally flattened body with membrane fins (returned as fin outlines; the
// species turns them into membranes)
export function fish(S, p) {
    const q = { len: 0.1, depth: 0.025, width: 0.012, headLen: 0.025, snout: 0, eyeR: 0.003, tailFork: 0.6, tailH: 0.025, ...p };
    const rig = { q, plan: 'fish' };
    const y = q.depth;
    const pts = ramp(8, (t) => [q.len * (0.5 - t), y + Math.sin(t * Math.PI) * q.depth * 0.05, 0]);
    const rad = ramp(8, (t) => q.depth * 0.5 * Math.pow(Math.sin(Math.min(1, t * 1.15 + 0.08) * Math.PI), 0.7) + q.depth * 0.05);
    S.chain(pts, rad, { tag: 'body', squash: [q.width / q.depth, 1], k: q.depth * 0.1 });
    if (q.snout > 0) S.cone(pts[0], add(pts[0], [q.snout, -q.depth * 0.08, 0]), q.depth * 0.18, q.depth * 0.05, { tag: 'snout', squash: [0.8, 0.7], k: q.depth * 0.1 });
    const eyeC = add(pts[0], [-q.headLen * 0.35, q.depth * 0.12, q.width * 0.38]);
    [1, -1].forEach((s) => addEye(S, [eyeC[0], eyeC[1], eyeC[2] * s], [0.25, 0, s], q.eyeR, { brow: 0 }));
    // gill cover line
    [1, -1].forEach((s) => S.cone(add(pts[0], [-q.headLen, q.depth * 0.35, q.width * 0.45 * s]), add(pts[0], [-q.headLen * 0.95, -q.depth * 0.3, q.width * 0.45 * s]), q.depth * 0.025, q.depth * 0.025, { mode: 'cut', k: q.depth * 0.02 }));
    rig.pts = pts;
    rig.rad = rad;
    const tailBase = pts[pts.length - 1];
    rig.fins = {
        caudal: [[add(tailBase, [0, q.tailH * 0.15, 0]), add(tailBase, [0, -q.tailH * 0.15, 0])], [add(tailBase, [-q.tailH * 0.9, q.tailH, 0]), add(tailBase, [-q.tailH * (0.9 - q.tailFork * 0.6), 0, 0]), add(tailBase, [-q.tailH * 0.9, -q.tailH, 0])]]
    };
    return rig;
}
