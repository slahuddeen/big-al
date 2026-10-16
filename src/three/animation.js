// ==================== PROCEDURAL CREATURE ANIMATION ====================
// motion: { phase, moving (0..1), attack (0..1), jaw (0..1), rear (0..1), look (-1..1),
//           graze (0..1 head to the ground), browse (0..1 neck up high), call (0..1 roar/bellow),
//           crouch (0..1 stalking), rest (0..1 lying down), sniff (0..1) }

// Rest pose of every animated part, captured the first time it is animated
const restPose = new WeakMap();
const rest = (obj) => {
    let r = restPose.get(obj);
    if (!r) {
        r = { rot: obj.rotation.clone(), pos: obj.position.clone() };
        restPose.set(obj, r);
    }
    return r;
};
const base = (obj) => rest(obj).rot;

const rot = (obj, x = 0, y = 0, z = 0) => {
    if (!obj) return;
    const b = base(obj);
    obj.rotation.set(b.x + x, b.y + y, b.z + z);
};

export const animateModel = (model, time, m) => {
    const P = model.parts;
    const mv = m.moving ?? 0;
    const ph = m.phase ?? 0;
    const atk = m.attack ?? 0;
    const jaw = m.jaw ?? 0;
    const rear = m.rear ?? 0;
    const look = m.look ?? 0;
    const graze = m.graze ?? 0;
    const browse = m.browse ?? 0;
    const call = m.call ?? 0;
    const crouch = m.crouch ?? 0;
    const restK = m.rest ?? 0;
    const sniff = m.sniff ?? 0;
    const seed = model.seed ?? 0;
    const breathe = Math.sin(time * 2.2 + seed) * 0.006;
    const body = model.body;

    switch (model.gait) {
        case 'biped': {
            const sniffBob = Math.sin(time * 15 + seed) * 0.06 * sniff;
            const stride = Math.sin(ph * 2) * 0.05 * mv;
            P.legs.forEach((l) => rot(l.pivot, 0, 0, Math.sin(ph + l.phase) * 0.6 * mv * (1 - restK) + rear * 0.25 + restK * 1.1 + crouch * 0.12));
            P.arms.forEach((a, i) => rot(a.pivot, 0, 0, Math.sin(ph + i * Math.PI) * 0.25 * mv - atk * 0.6 - call * 0.3 + restK * 0.4));
            body.position.y = Math.abs(Math.sin(ph)) * 0.02 * mv + breathe * (1 + restK) - restK * 0.2 - crouch * 0.05;
            body.position.x = atk * 0.12;
            rot(body, 0, 0, -atk * 0.18 + rear * 0.35 - graze * 0.12 - crouch * 0.1 + call * 0.12);
            P.tail.forEach((t, i) => rot(t, 0, Math.sin(time * 1.4 + i * 0.9 + seed) * (0.1 + 0.12 * mv) * (1 - restK * 0.7) + restK * (i ? 0.5 : 0.35), -rear * 0.2 + crouch * 0.08 - restK * 0.12));
            P.neck.forEach((n) => rot(n, 0, look * 0.4 + Math.sin(time * 0.5 + seed) * 0.08,
                -mv * 0.18 + atk * 0.1 + rear * 0.1 - graze * 0.9 - crouch * 0.35 + call * 0.55 - restK * 0.55 - sniff * 0.35 + stride));
            if (P.head) rot(P.head, 0, look * 0.2, Math.sin(time * 0.9 + seed) * 0.04 * (1 - restK) + rear * 0.25 - graze * 0.3 + call * 0.25 - restK * 0.2 + sniffBob - stride * 1.4);
            if (P.jaw) rot(P.jaw, 0, 0, -Math.max(jaw, call) * 0.75 - Math.max(0, Math.sin(time * 0.7 + seed) - 0.92) * 2 * (1 - restK) - graze * Math.max(0, Math.sin(time * 6 + seed)) * 0.25);
            break;
        }
        case 'quad': {
            P.legs.forEach((l) => rot(l.pivot, 0, 0, Math.sin(ph + l.phase) * 0.35 * mv * (1 - restK)));
            body.position.y = Math.abs(Math.sin(ph * 2)) * 0.008 * mv + breathe - restK * 0.1;
            body.position.x = atk * 0.08;
            rot(body, 0, 0, rear * 0.15 - atk * 0.05 - graze * 0.03);
            P.tail.forEach((t, i) => rot(t, 0, Math.sin(time * 0.9 + i * 0.7 + seed) * (0.08 + 0.06 * mv) + (atk + rear * 0.8) * Math.sin(time * 7 + i) * 0.35 * (i + 1) * 0.3, 0));
            P.neck.forEach((n, i) => rot(n, 0, look * 0.15 + Math.sin(time * 0.45 + i * 0.6 + seed) * 0.08 * (1 + browse),
                Math.sin(time * 0.6 + seed + i) * 0.03 + rear * 0.15 - graze * (i === 0 ? 0.5 : 0.18) + browse * (i === 0 ? 0.3 : 0.1) + call * (i === 0 ? 0.2 : 0.06) - restK * 0.12));
            if (P.head) rot(P.head, 0, look * 0.2, Math.sin(time * 1.1 + seed) * 0.05 - graze * 0.25 + Math.max(0, Math.sin(time * 5 + seed)) * 0.08 * (graze + browse) + call * 0.2);
            if (P.jaw) rot(P.jaw, 0, 0, -Math.max(jaw, call) * 0.6);
            break;
        }
        case 'sprawl': {
            P.legs.forEach((l) => rot(l.pivot, 0, Math.sin(ph + l.phase) * 0.55 * mv, 0));
            const wave = Math.sin(ph) * 0.18 * mv;
            rot(body, 0, wave * 0.5, rear * 0.2);
            body.position.x = atk * 0.1;
            body.position.y = breathe * 0.5;
            P.tail.forEach((t, i) => rot(t, 0, -Math.sin(ph - i * 0.9) * 0.25 * (0.3 + mv) + Math.sin(time + i + seed) * 0.08, 0));
            P.neck.forEach((n) => rot(n, 0, -wave + look * 0.3, rear * 0.2 + call * 0.3 - graze * 0.15));
            if (P.jaw) rot(P.jaw, 0, 0, -Math.max(jaw, call) * 0.6);
            break;
        }
        case 'fly': {
            const f = model.flapSpeed ?? 6;
            const flap = Math.sin(time * f + seed);
            P.wings.forEach((w) => rot(w.pivot, -w.side * (flap * 0.55 + 0.1), 0, 0));
            body.position.y = -flap * 0.02;
            rot(body, Math.sin(time * 0.8 + seed) * 0.08 * (m.bank ?? 1), 0, atk * -0.4);
            P.legs.forEach((l) => rot(l.pivot, 0, 0, -0.8));
            P.tail.forEach((t) => rot(t, 0, Math.sin(time * 2 + seed) * 0.15, 0));
            if (P.neck[0]) rot(P.neck[0], 0, look * 0.3, -0.3 + atk * 0.2);
            break;
        }
        case 'perched': {
            const twitch = Math.max(0, Math.sin(time * 1.3 + seed) - 0.85) * 3;
            P.wings.forEach((w, i) => rot(w.pivot, w.side * (0.5 + (i ? twitch * 0.4 : 0)), 0, -0.2));
            if (P.neck[0]) rot(P.neck[0], 0, Math.sin(time * 0.6) * 0.3, -0.4 + Math.sin(time * 0.8) * 0.15);
            body.position.y = -0.06 + breathe;
            break;
        }
        case 'flutter': {
            const f = model.flapSpeed ?? 40;
            P.wings.forEach((w, i) => rot(w.pivot, -w.side * Math.sin(time * f + i * 1.3) * 0.7, 0, 0));
            body.position.y = Math.sin(time * 3 + seed) * 0.03;
            break;
        }
        case 'crawl': {
            P.segs.forEach((s, i) => rot(s, 0, Math.sin(ph * 1.5 - i * 0.7) * 0.18 * (0.3 + mv), 0));
            P.tail.forEach((t, i) => rot(t, 0, Math.sin(time * 1.2 + i * 0.5) * 0.08, -atk * 0.3));
            P.arms.forEach((a) => rot(a.pivot, 0, a.side * (Math.sin(time * 1.5 + seed) * 0.12 + jaw * 0.3), 0));
            break;
        }
        case 'slither': {
            P.segs.forEach((s, i) => rot(s, 0, Math.sin(ph - i * 0.9) * (i === 0 ? 0.25 : 0.45), i === 0 ? rear * -0.6 : 0));
            if (P.segs[0]) P.segs[0].position.y = rest(P.segs[0]).pos.y + rear * 0.08;
            break;
        }
        case 'swim': {
            P.tail.forEach((t) => rot(t, 0, Math.sin(time * 9 + seed) * 0.5, 0));
            rot(body, 0, -Math.sin(time * 9 + seed) * 0.08, 0);
            break;
        }
        case 'hop': {
            body.position.y = breathe;
            break;
        }
        default:
            break;
    }
};
