// Body-plan builders. Each one lays out a skeleton from a few measurements (metres, facing
// +x, y up, z to the animal's right) and adds the flesh as blended primitives to a Sculpt.
// They return a rig of named points that species use for eyes, claws and feathers.
import { vec } from './sculpt.js';

const { sub, norm, len, cross } = vec;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const mirror = (p) => [p[0], p[1], -p[2]];
const dirAngle = (a, side = 0) => norm([Math.sin(a), -Math.cos(a), side]);

// cubic Bezier sampled at n+1 points
export function bezier(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push([0, 1, 2].map((k) => a * p0[k] + b * p1[k] + c * p2[k] + d * p3[k]));
    }
    return out;
}

export const ramp = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// A toe or finger: a chain of phalanges ending in a claw
function digit(S, base, dir, lengths, radius, { tag = 'toe', down = 0, claw = 0.5, clawCurve = 0.9, splay = [0, 0, 1], k } = {}) {
    let p = base;
    let d = norm(dir);
    const pts = [p];
    lengths.forEach((l, i) => {
        // each joint bends a little down (or up for a raised digit)
        d = norm(add(d, [0, -down * (i + 1) * 0.15, 0]));
        p = add(p, mul(d, l));
        pts.push(p);
    });
    const radii = pts.map((_, i) => radius * (1 - (i / pts.length) * 0.45));
    S.chain(pts, radii, { tag, k: k ?? radius * 0.5, squash: [0.9, 0.85], side: splay });
    const tip = pts[pts.length - 1];
    S.extra({ type: 'claw', at: add(tip, mul(d, -radius * 0.3)), dir: d, up: [0, 1, 0], length: claw, radius: radius * 0.85, curve: clawCurve, tag });
    return { pts, tip, dir: d };
}

// Bipedal dinosaur: theropods, early birds' relatives, and bipedal ornithischians
export function biped(S, p) {
    const q = {
        femur: 1, tibia: 1.1, meta: 0.6, legAng: [0.42, -0.62, 0.32],
        hipW: 0.18, thighR: 0.28, kneeR: 0.12, shinR: 0.11, ankleR: 0.06, metaR: 0.06,
        toeLen: 0.32, toeR: 0.045, toes: 3, hallux: true, sickle: false, toeClaw: 0.09,
        torso: 1.4, hipR: 0.34, bellyR: 0.42, chestR: 0.36, bellyDrop: 0.1, chestRise: 0.12, bodySquash: 0.78,
        neck: 1.0, neckR: 0.2, headNeckR: 0.13, neckRise: 0.9, neckS: 0.5,
        head: 0.9, headH: 0.42, headW: 0.3, snoutTip: 0.32, snoutSquash: 0.72, headTilt: -0.15, jaw: 0.5,
        eyeR: 0.05, eyeAt: 0.25, eyeUp: 0.18, brow: 0.6,
        tail: 3.5, tailR: 0.3, tailDroop: 0.1, tailLift: 0.0, tailSquash: 0.72,
        humerus: 0.32, forearm: 0.26, hand: 0.24, armR: 0.06, fingers: 3, fingerR: 0.025, handClaw: 0.08, armSpread: 0.15, armDrop: 0.6,
        beak: 0, crest: null, lean: 0,
        ...p
    };
    const rig = { q, plan: 'biped' };

    // legs: hip joint, knee, ankle and the ball of the foot from three bone lengths and angles.
    // In flight they trail back under the tail.
    const [a1, a2, a3] = q.pose === 'fly' ? [-0.75, -1.3, -1.5] : q.legAng;
    const v1 = dirAngle(a1), v2 = dirAngle(a2), v3 = dirAngle(a3);
    const drop = -(v1[1] * q.femur + v2[1] * q.tibia + v3[1] * q.meta);
    const hipY = q.pose === 'fly' ? q.femur + q.tibia * 0.5 : drop + q.toeR * 0.9;
    rig.hipY = hipY;
    const leg = (sgn) => {
        const hip = [0, hipY, q.hipW * sgn];
        const knee = add(hip, add(mul(v1, q.femur), [0, 0, q.hipW * 0.15 * sgn]));
        const ankle = add(knee, mul(v2, q.tibia));
        const ball = add(ankle, mul(v3, q.meta));
        // thigh: the big hip muscles blend into the body
        S.cone(add(hip, [-q.thighR * 0.15, q.thighR * 0.25, 0]), knee, q.thighR * 0.7, q.kneeR, { tag: 'thigh', k: q.thighR * 0.5, squash: [0.75, 1] });
        // the drumstick: a broad mass of muscle over the upper femur, flaring back towards the tail
        S.ellipsoid(add(lerp3(hip, knee, 0.38), [-q.thighR * 0.25, 0, 0]), [q.femur * 0.5, q.thighR * 1.1, q.thighR * 0.72], { dir: sub(knee, add(hip, [q.thighR * 0.4, 0, 0])), tag: 'thigh', k: q.thighR * 0.6, flow: [0, -1, 0] });
        // shin, with the calf muscle behind the top of it
        S.cone(knee, ankle, q.kneeR * 0.95, q.ankleR, { tag: 'shin', k: q.kneeR * 0.5 });
        S.ellipsoid(add(lerp3(knee, ankle, 0.28), [-q.shinR * 0.45, 0, 0]), [q.tibia * 0.28, q.shinR * 1.15, q.shinR * 0.95], { dir: sub(ankle, knee), tag: 'shin', k: q.shinR * 0.6 });
        S.cone(ankle, ball, q.metaR, q.metaR * 0.8, { tag: 'foot', k: q.metaR * 0.4, flow: [0, -1, 0] });
        const toes = [];
        const n = q.toes;
        for (let t = 0; t < n; t++) {
            const f = n === 1 ? 0 : t / (n - 1) - 0.5; // -0.5 inner .. 0.5 outer
            const spread = f * 0.75;
            const isMid = Math.abs(f) < 0.01;
            const l = q.toeLen * (isMid ? 1 : 0.8);
            // dromaeosaurs and troodontids hold the inner (second) toe up off the ground
            const raised = q.sickle && t === 0;
            const dir = q.pose === 'fly' ? norm([-Math.cos(spread), -0.3, Math.sin(spread) * sgn]) : norm([Math.cos(spread), raised ? 0.5 : -0.12, Math.sin(spread) * sgn]);
            const segs = raised ? [l * 0.35, l * 0.3] : [l * 0.38, l * 0.32, l * 0.3];
            toes.push(digit(S, add(ball, [0, 0, f * q.metaR * 0.8 * sgn]), dir, segs, q.toeR * (isMid ? 1 : 0.92), {
                tag: 'toe', down: raised ? -0.2 : 0.6, claw: raised ? q.toeClaw * 2.4 : q.toeClaw, clawCurve: raised ? 1.6 : 0.6, k: q.toeR * 0.6
            }));
        }
        if (q.hallux) {
            const hb = lerp3(ankle, ball, 0.78);
            digit(S, add(hb, [0, 0, -q.metaR * 0.3 * sgn]), [-0.75, -0.45, -0.3 * sgn], [q.toeLen * 0.2, q.toeLen * 0.16], q.toeR * 0.7, { tag: 'toe', claw: q.toeClaw * 0.7 });
        }
        return { hip, knee, ankle, ball, toes };
    };
    rig.legR = leg(1);
    rig.legL = leg(-1);

    // torso centreline from the shoulders back to the hips
    const hipC = [0, hipY + q.hipR * 0.25, 0];
    const mid = [q.torso * 0.5, hipY + q.chestRise * 0.4 - q.bellyDrop, 0];
    const chest = [q.torso, hipY + q.chestRise, 0];
    const torsoPts = bezier(chest, add(chest, [-q.torso * 0.25, -q.bellyDrop, 0]), add(mid, [-q.torso * 0.2, 0, 0]), hipC, 5);
    const torsoR = ramp(5, (t) => (t < 0.5 ? lerp(q.chestR, q.bellyR, t * 2) : lerp(q.bellyR, q.hipR, (t - 0.5) * 2)));
    S.chain(torsoPts, torsoR, { tag: 'body', squash: [q.bodySquash, 1], k: q.hipR * 0.6 });
    // a low ridge over the hips so the back line doesn't sag between the legs
    S.ellipsoid([q.torso * 0.05, hipY + q.hipR * 0.55, 0], [q.hipR * 1.1, q.hipR * 0.5, q.hipR * 0.62], { tag: 'body', k: q.hipR * 0.5, flow: [-1, 0, 0] });
    rig.chest = chest;
    rig.hipC = hipC;

    // tail, from the hips back, carried straight out from the body
    const t0 = add(hipC, [-q.hipR * 0.1, 0, 0]);
    const tEnd = [-q.tail, hipY + q.hipR * 0.25 - q.tailDroop * q.tail + q.tailLift * q.tail, 0];
    const tailPts = bezier(t0, add(t0, [-q.tail * 0.35, q.hipR * 0.1, 0]), add(tEnd, [q.tail * 0.35, q.tailDroop * q.tail * 0.4, 0]), tEnd, 9);
    const tailRad = ramp(9, (t) => q.tailR * Math.pow(1 - t, 1.15) + q.tailR * 0.04);
    S.chain(tailPts, tailRad, { tag: 'tail', squash: (t) => [lerp(q.tailSquash, q.tailSquash * 0.85, t), 1], k: q.tailR * 0.4 });
    rig.tail = tailPts;
    rig.tailRad = tailRad;

    // neck: rises from the chest in a gentle S
    const n0 = add(chest, [q.chestR * 0.35, q.chestR * 0.35, 0]);
    const ang = q.neckRise;
    const n3 = add(n0, [Math.cos(ang) * q.neck, Math.sin(ang) * q.neck, 0]);
    const n1 = add(n0, [q.neck * 0.45, q.neck * 0.05 * q.neckS, 0]);
    const n2 = add(n3, [-q.neck * 0.12 * q.neckS, -q.neck * 0.32 * q.neckS, 0]);
    const neckPts = bezier(n3, n2, n1, n0, 6);
    S.chain(neckPts, ramp(6, (t) => lerp(q.headNeckR, q.neckR, Math.pow(t, 0.8))), { tag: 'neck', squash: [0.82, 1], k: q.neckR * 0.5 });
    rig.neck = neckPts;

    // head: a wedge-shaped skull, deep at the back and tapering to the snout, with the lower
    // jaw below it. The neck joins the back of the skull low down.
    const hd = norm([Math.cos(q.headTilt), Math.sin(q.headTilt), 0]);
    const hu = norm(cross([0, 0, 1], hd)); // up for the head
    const occ = n3;
    const back = add(occ, add(mul(hd, q.headH * 0.3), mul(hu, q.headH * 0.14)));
    const at = (f, up = 0, side = 0) => add(add(add(back, mul(hd, q.head * f)), mul(hu, q.headH * up)), [0, 0, q.headW * side]);
    const tipDrop = (1 - q.snoutTip) * 0.1;
    const skullF = [0, 0.3, 0.64, 0.95];
    const skullUp = [0.04, 0.02, -0.04 - tipDrop * 0.5, -0.1 - tipDrop];
    const skullR = [0.48, 0.42, 0.3 * (0.75 + q.snoutTip * 0.5), 0.15 * (0.6 + q.snoutTip * 0.8)];
    const sw = q.headW / q.headH;
    S.chain(skullF.map((f, i) => at(f, skullUp[i])), skullR.map((r) => r * q.headH), {
        tag: 'snout', squash: (t) => [lerp(sw, sw * q.snoutSquash, t), 1], k: q.headH * 0.12, flow: mul(hd, -1)
    });
    // the skull's top line, for crests and brows
    rig.skullTop = (f) => {
        let i = 0;
        while (i < skullF.length - 2 && f > skullF[i + 1]) i++;
        const t = Math.min(1, Math.max(0, (f - skullF[i]) / (skullF[i + 1] - skullF[i])));
        return at(f, lerp(skullUp[i], skullUp[i + 1], t) + lerp(skullR[i], skullR[i + 1], t));
    };
    // jaw muscles bulge behind the eyes
    S.ellipsoid(at(0.06, -0.02), [q.head * 0.16, q.headH * 0.42, q.headW * 0.56], { dir: hd, tag: 'head', k: q.headH * 0.2, flow: mul(hd, -1) });
    // lower jaw, from below the jaw joint to the chin
    const jaw0 = at(0.02, -0.34), jaw1 = at(0.93, -0.25 - tipDrop * 1.2);
    S.cone(jaw0, jaw1, q.headH * 0.2 * q.jaw * 2, q.headH * 0.07 * q.jaw * 2, { tag: 'jaw', squash: [sw * 0.95, 0.85], k: q.headH * 0.1, flow: mul(hd, -1) });
    // the gape: a shallow groove where the lips meet
    S.cone(at(0.12, -0.2), at(0.96, -0.2 - tipDrop * 1.1), q.headH * 0.03, q.headH * 0.018, { mode: 'cut', squash: [sw * 4, 1], k: q.headH * 0.03 });
    // nostrils
    [1, -1].forEach((s) => S.ellipsoid(at(0.88, -0.03 - tipDrop, 0.17 * s * q.snoutSquash), [q.head * 0.035, q.headH * 0.03, q.headW * 0.08], { dir: hd, mode: 'cut', k: q.headH * 0.02 }));
    // eyes: socket, eyeball and a brow ridge over it
    rig.eyes = [1, -1].map((s) => {
        const c = at(q.eyeAt, q.eyeUp, 0.36 * s);
        const out = norm(add([0, 0, s], mul(hd, 0.3)));
        const surf = add(c, [0, 0, 0]);
        S.push(sphereCut(surf, q.eyeR * 1.05), { mode: 'cut', k: q.eyeR * 0.25 });
        S.ellipsoid(add(surf, add(mul(hu, q.eyeR * 0.95), mul(out, -q.eyeR * 0.15))), [q.eyeR * 1.6, q.eyeR * 0.3 * q.brow + q.eyeR * 0.18, q.eyeR * 0.55], { dir: hd, tag: 'brow', k: q.eyeR * 0.45, flow: mul(hd, -1) });
        S.extra({ type: 'eye', at: add(surf, mul(out, -q.eyeR * 0.12)), dir: out, r: q.eyeR, side: s });
        return { c: surf, out };
    });
    rig.head = { occ, back, dir: hd, up: hu, at };
    rig.snoutTip = at(0.98, -0.1);
    // a hooked horny beak over the tip of the upper jaw, and a beak on the lower jaw
    if (q.beakHook > 0) {
        const hk = q.beakHook;
        S.chain([at(0.8, 0.1 - tipDrop * 0.6), at(0.95, 0.0 - tipDrop * 0.8), at(1.0 + hk * 0.03, -0.18 - hk * 0.18)], [q.headH * 0.15, q.headH * 0.12, q.headH * 0.04], { tag: 'beak', squash: [sw * q.snoutSquash * 0.95, 1], k: q.headH * 0.06, flow: mul(hd, -1) });
        S.cone(at(0.78, -0.3 - tipDrop * 0.8), at(0.95, -0.27 - tipDrop - hk * 0.05), q.headH * 0.12, q.headH * 0.05, { tag: 'beak', squash: [sw * q.snoutSquash * 0.9, 0.9], k: q.headH * 0.05, flow: mul(hd, -1) });
    }

    // arms. 'reach' holds them forward and down like a predator; 'fold' tucks them like a
    // bird's wing: upper arm back along the body, forearm forward, hand back again
    const arm = (sgn) => {
        const spread = q.pose === 'fly';
        const fold = q.armPose === 'fold' && !spread;
        const sh = add(chest, [q.chestR * 0.15, q.chestR * (fold || spread ? 0.05 : -0.3), q.chestR * 0.62 * sgn]);
        const e = spread ? norm([-0.15, 0.08, sgn]) : fold ? norm([-0.85, -0.3, 0.2 * sgn]) : norm([-0.5, -q.armDrop, q.armSpread * sgn]);
        const elbow = add(sh, mul(e, q.humerus));
        const fdir = spread ? norm([0.25, 0, sgn]) : fold ? norm([0.9, 0.22, 0.1 * sgn]) : norm([0.75, -0.35, 0.05 * sgn]);
        const wrist = add(elbow, mul(fdir, q.forearm));
        S.cone(sh, elbow, q.armR * 1.35, q.armR, { tag: 'arm', k: q.armR * 0.8 });
        S.cone(elbow, wrist, q.armR, q.armR * 0.75, { tag: 'arm', k: q.armR * 0.5 });
        const hdir = spread ? norm([0.05, 0, sgn]) : fold ? norm([-0.95, -0.02, 0.18 * sgn]) : norm([0.55, -0.6, 0.1 * sgn]);
        const fingers = [];
        for (let f = 0; f < q.fingers; f++) {
            const ff = q.fingers === 1 ? 0 : f / (q.fingers - 1) - 0.5;
            const l = q.hand * (f === 1 ? 1 : f === 0 ? 0.62 : 0.85);
            const fd = spread ? add(hdir, [0.3 - ff * 0.3, -0.1, 0]) : fold ? add(hdir, [0, -0.15 - ff * 0.2, 0.25 * sgn]) : add(hdir, [0, ff * 0.25, ff * 0.2 * sgn]);
            fingers.push(digit(S, add(wrist, [0, -ff * q.armR * 0.6, ff * q.armR * 1.2 * sgn * 0.4]), fd, [l * 0.5, l * 0.5], q.fingerR, {
                tag: 'hand', down: fold ? 0.1 : 0.5, claw: q.handClaw * (f === 0 ? 1.15 : 1), clawCurve: 1.1, splay: [0, 0, 1]
            }));
        }
        const handTip = add(wrist, mul(hdir, q.hand));
        return { sh, elbow, wrist, fingers, hdir, handTip, sgn };
    };
    rig.armR = arm(1);
    rig.armL = arm(-1);
    return rig;
}

// a sphere, used for cutting eye sockets
export function sphereCut(c, r) {
    const prim = { u: 0.5 };
    prim.dist = (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;
    prim.bbox = [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r];
    prim.axis = [1, 0, 0];
    return prim;
}

export { dirAngle, digit, len, norm, sub, cross };
