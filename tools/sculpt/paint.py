# ==================== PAINT ====================
# Per-vertex paint for the sculpted animals, worked out in body space so the patterns sit on
# the animal the way real ones do: darker along the back and paler beneath (countershading),
# stripes and bands broken up with noise instead of ruled rings, rosettes and blotches from a
# Voronoi pattern, a streak along the sail, darker lower legs and claws, a pink wet mouth, and
# an all-over mottle. Also gives each vertex a roughness and a scale size for the bake shader.
import math
import numpy as np
from numba import njit, prange
from scipy.spatial import cKDTree
from sdf import SKIN, MOUTH, MEMBRANE, ARMOUR, KERATIN, GUM, LIMB


@njit(cache=True)
def _hash(i, j, k, s):
    h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffff) / 16777215.0


@njit(cache=True)
def _vnoise(x, y, z, s):
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz
    ux, uy, uz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    v = 0.0
    for a in range(2):
        for b in range(2):
            for c in range(2):
                w = (ux if a else 1 - ux) * (uy if b else 1 - uy) * (uz if c else 1 - uz)
                v += w * _hash(int(ix) + a, int(iy) + b, int(iz) + c, s)
    return v


@njit(parallel=True, cache=True)
def fbm(P, freq, octaves, seed):
    n = P.shape[0]
    out = np.empty(n)
    for i in prange(n):
        v, a, f, norm = 0.0, 0.5, freq, 0.0
        for o in range(octaves):
            v += a * _vnoise(P[i, 0] * f, P[i, 1] * f, P[i, 2] * f, seed + o)
            norm += a
            a *= 0.5
            f *= 2.03
        out[i] = v / norm
    return out


@njit(parallel=True, cache=True)
def voronoi(P, cell, seed):
    n = P.shape[0]
    d1 = np.empty(n)
    rid = np.empty(n)
    for i in prange(n):
        x, y, z = P[i, 0] / cell, P[i, 1] / cell, P[i, 2] / cell
        ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
        best, bid = 9.0, 0.0
        for a in range(-1, 2):
            for b in range(-1, 2):
                for c in range(-1, 2):
                    cx, cy, cz = int(ix) + a, int(iy) + b, int(iz) + c
                    px = cx + _hash(cx, cy, cz, seed)
                    py = cy + _hash(cx, cy, cz, seed + 1)
                    pz = cz + _hash(cx, cy, cz, seed + 2)
                    d = math.sqrt((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2)
                    if d < best:
                        best, bid = d, _hash(cx, cy, cz, seed + 3)
        d1[i] = best
        rid[i] = bid
    return d1, rid


def hexc(h):
    if isinstance(h, (int, float)):
        h = '#%06x' % int(h)
    h = h.lstrip('#')
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)]) / 255.0


def mix(a, b, t):
    t = np.clip(t, 0, 1)[:, None]
    return a * (1 - t) + b * t


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def realistic(c, sat=0.8, value=0.95):
    """Pull a comic palette colour towards a natural one: a little less saturated and bright."""
    c = np.asarray(c, float)
    g = c.mean()
    return np.clip((g + (c - g) * sat) * value, 0, 1)


def spine_frame(spine):
    pts = np.array([p for p, _ in spine])
    regions = [r for _, r in spine]
    dense, ts, reg = [], [], []
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    total = seg.sum()
    acc = 0.0
    for i in range(len(pts) - 1):
        for k in range(24):
            u = k / 24
            dense.append(pts[i] * (1 - u) + pts[i + 1] * u)
            ts.append((acc + seg[i] * u) / total)
            reg.append(regions[i + 1] if u > 0.5 else regions[i])
        acc += seg[i]
    dense.append(pts[-1])
    ts.append(1.0)
    reg.append(regions[-1])
    return np.array(dense), np.array(ts), np.array(reg), total


def paint(c, V, N, lab, scale_len=1.0):
    """Colour (linear 0..1 sRGB-encoded), roughness and scale size for each vertex."""
    P = c.paint
    C = {k: hexc(v) for k, v in P['colors'].items() if isinstance(v, (str, int))}
    body = realistic(C.get('body', hexc('#808070')))
    belly = realistic(C.get('belly', body * 1.25))
    back = realistic(C.get('back', body * 0.8))
    n = len(V)
    dense, ts, reg, total = spine_frame(c.spine)
    tree = cKDTree(dense)
    _, idx = tree.query(V)
    sp = dense[idx]
    t = ts[idx]
    region = reg[idx]
    off = V - sp
    relz = off[:, 2] / (np.linalg.norm(off, axis=1) + 1e-6)
    Vd = V.astype(np.float64)
    m1 = fbm(Vd, 9.0 / scale_len, 4, 11)
    m2 = fbm(Vd, 38.0 / scale_len, 3, 23)
    col = np.tile(body, (n, 1))
    # countershading: dark back, pale belly, with a soft wandering border
    border = (m1 - 0.5) * 0.5
    col = mix(col, np.tile(back, (n, 1)), ss(0.35, 0.95, relz + border * 0.6))
    col = mix(col, np.tile(belly, (n, 1)), ss(0.05, -0.6, relz + border))
    head = region == 'head'
    if 'head' in C:
        hc = realistic(C['head'])
        col[head] = mix(col[head], np.tile(hc, (head.sum(), 1)), np.full(head.sum(), 0.85))
        if 'headTop' in C:
            ht = realistic(C['headTop'])
            col[head] = mix(col[head], np.tile(ht, (head.sum(), 1)), ss(0.3, 0.85, relz[head] + border[head]))
        col[head] = mix(col[head], np.tile(belly, (head.sum(), 1)), ss(-0.1, -0.7, relz[head]))
    # limbs: the body colour, a little paler underneath and darker towards the feet
    limb = lab == LIMB
    if limb.any():
        lc = realistic(C.get('arm', C.get('body', body))) if False else body
        lcol = np.tile(lc, (limb.sum(), 1))
        lcol = mix(lcol, np.tile(back, (limb.sum(), 1)), ss(0.4, 0.95, N[limb, 2]) * 0.5)
        lcol = mix(lcol, np.tile(belly, (limb.sum(), 1)), ss(-0.3, -0.9, N[limb, 2]) * 0.45)
        zrel = V[limb, 2] / (c.bones['body'][0][2] + 1e-6)
        shin = realistic(C.get('shin', back * 0.8))
        lcol = mix(lcol, np.tile(shin, (limb.sum(), 1)), ss(0.55, 0.15, zrel) * 0.8)
        col[limb] = lcol
    # stripes and bands: across the body, broken and wavering, faded on the belly
    if P.get('stripes') or P.get('bands'):
        sc = realistic(C.get('stripe', hexc(P['bands']) if P.get('bands') else back * 0.6))
        along = t * total / scale_len
        freq = 16.0 if not P.get('fish') else 22.0
        w = np.sin(2 * np.pi * (along * freq + (m1 - 0.5) * 1.6 + (m2 - 0.5) * 0.25))
        stripe = ss(0.25, 0.55, w + (m2 - 0.5) * 0.5) * ss(-0.45, -0.05, relz) * (region != 'head')
        col = mix(col, np.tile(sc, (n, 1)), stripe * 0.92)
    if P.get('spots'):
        spc = realistic(hexc(P['spots']))
        cell = 0.022 * (1.5 if P.get('fish') else 1.0)
        warp = (fbm(Vd, 60.0 / scale_len, 3, 41) - 0.5) * 0.9
        d1, rid = voronoi(Vd + warp[:, None] * cell, cell, 7)
        keep = rid > (0.35 if P.get('fish') else 0.0)
        r = (0.18 + 0.3 * rid) * keep
        spot = ss(r + 0.05, r - 0.06, d1 + (m2 - 0.5) * 0.4) * ss(-0.6, -0.1, relz)
        col = mix(col, np.tile(spc, (n, 1)), spot * 0.9)
    # sails and fins
    mem = lab == MEMBRANE
    if mem.any():
        sail = realistic(C.get('sail', C.get('fin', back)))
        col[mem] = mix(col[mem], np.tile(sail, (mem.sum(), 1)), np.full(mem.sum(), 0.75))
        if P.get('sail') and P['sail'].get('streak'):
            stc = realistic(hexc(P['sail']['streak']), 0.85, 0.95)
            z = V[mem, 2]
            hip = c.bones['body'][0][2]
            hrel = (z - hip) / (np.max(V[:, 2]) - hip + 1e-6)
            wave = 0.5 + 0.1 * np.sin(V[mem, 0] / scale_len * 40)
            streak = ss(0.1, 0.0, np.abs(hrel - wave) - 0.06 + (m1[mem] - 0.5) * 0.06)
            col[mem] = mix(col[mem], np.tile(stc, (mem.sum(), 1)), streak)
    # spinosaur bands: the skin between the spines of the sail and tail crest glows orange,
    # the spines dark, and orange tiger bands run down the tail
    if P.get('spineBands'):
        orange = realistic(C.get('stripe', hexc('#c47a2c')), 0.9, 1.0)
        dark = realistic(C.get('back', back), 0.9, 0.8)
        gap = P.get('spineGap', 0.011) / scale_len
        ph = (V[:, 0] / gap + (m2 - 0.5) * 0.6) % 1.0
        between = ss(0.15, 0.45, np.abs(ph - 0.5) * -1 + 0.5)
        hip = c.bones['body'][0][2]
        hrel = np.clip((V[:, 2] - hip) / (np.max(V[:, 2]) - hip + 1e-6), 0, 1)
        if mem.any():
            k = between[mem] * (0.35 + 0.65 * ss(0.2, 0.8, hrel[mem] + (m1[mem] - 0.5) * 0.4))
            col[mem] = mix(col[mem], np.tile(dark, (mem.sum(), 1)), 1 - between[mem] * 0.9)
            col[mem] = mix(col[mem], np.tile(orange, (mem.sum(), 1)), k * 0.85)
        tl = (region == 'tail') & ~mem
        along = t[tl] * total / scale_len
        w = np.sin(2 * np.pi * (along * 11 + (m1[tl] - 0.5) * 1.4))
        band = ss(0.1, 0.6, w) * ss(-0.5, 0.2, relz[tl])
        col[tl] = mix(col[tl], np.tile(orange, (tl.sum(), 1)), band * 0.75)
        topw = ss(0.5, 0.9, relz) * (region != 'head') * (~mem)
        col = mix(col, np.tile(dark, (n, 1)), topw * 0.5)
    # the Navarro spinosaur: a pale spotted sail base, orange streaks between the spines in the
    # middle and a near-black upper edge; a red crest; a mottled, blotched tail
    if P.get('navarro'):
        orange = realistic(hexc('#d0652a'), 0.95, 1.0)
        black = realistic(hexc('#24222a'))
        tan = realistic(hexc('#c8a878'))
        gap = P.get('spineGap', 0.011) / scale_len
        ph = (V[:, 0] / gap + (m2 - 0.5) * 0.5) % 1.0
        between = ss(0.1, 0.4, 0.5 - np.abs(ph - 0.5))
        hip = c.bones['body'][0][2]
        hrel = np.clip((V[:, 2] - hip) / (np.max(V[:, 2]) - hip + 1e-6), 0, 1) + (m1 - 0.5) * 0.15
        if mem.any():
            hm = hrel[mem]
            base = mix(np.tile(body, (mem.sum(), 1)), np.tile(tan, (mem.sum(), 1)), np.full(mem.sum(), 0.4))
            mid = mix(np.tile(black * 1.4, (mem.sum(), 1)), np.tile(orange, (mem.sum(), 1)), between[mem] * 0.85)
            colm = mix(base, mid, ss(0.22, 0.4, hm))
            colm = mix(colm, np.tile(black, (mem.sum(), 1)), ss(0.72, 0.9, hm))
            col[mem] = colm
        cr = lab == 6
        col[cr] = mix(np.tile(orange * 0.95, (cr.sum(), 1)), np.tile(realistic(hexc('#e0a040')), (cr.sum(), 1)), ss(0.3, 1.0, m1[cr]))
        # tan leopard spots on the flanks and dark blotches down the tail
        warp = (fbm(Vd, 50.0 / scale_len, 3, 43) - 0.5) * 0.9
        d1, rid = voronoi(Vd + warp[:, None] * 0.018, 0.018, 9)
        ring = ss(0.42, 0.3, np.abs(d1 - 0.38)) * ss(-0.4, 0.1, relz) * ss(0.85, 0.5, relz)
        bodyish = (region == 'body') | (region == 'neck')
        col[bodyish & ~mem] = mix(col[bodyish & ~mem], np.tile(tan, ((bodyish & ~mem).sum(), 1)), ring[bodyish & ~mem] * 0.7)
        tl = (region == 'tail') & ~mem
        blot = ss(0.55, 0.62, fbm(Vd[tl], 30.0 / scale_len, 3, 47) + (m2[tl] - 0.5) * 0.2) * ss(-0.5, 0.3, relz[tl])
        col[tl] = mix(col[tl], np.tile(black * 1.3, (tl.sum(), 1)), blot * 0.85)
        # a red-orange streak down the top of the neck behind the crest
        nk = (region == 'neck') | (region == 'head')
        col[nk] = mix(col[nk], np.tile(orange * 0.85, (nk.sum(), 1)), ss(0.7, 0.95, relz[nk]) * 0.6)
    # mouth and tongue
    mo = lab == MOUTH
    if mo.any():
        # the lip margin stays skin coloured, the mouth lining is dark and only pinkish deep inside
        mc = realistic(mix(np.array([C.get('mouth', hexc('#9a3434'))]), np.array([hexc('#4a2a24')]), np.array([0.7]))[0], 0.8, 0.8)
        col[mo] = mix(col[mo], np.tile(mc, (mo.sum(), 1)), ss(0.2, -0.6, N[mo, 2]) * 0.9 + 0.1)
    gu = lab == GUM
    col[gu] = np.tile(realistic(hexc('#b8605c'), 0.8, 0.9), (gu.sum(), 1))
    arm = lab == ARMOUR
    col[arm] *= 0.82
    # lower legs and feet a little darker, as the browser's shins were
    # mottling: blotches, speckle and a little drift in hue
    col *= (0.84 + 0.3 * m1)[:, None] * (0.92 + 0.14 * m2)[:, None]
    hue = (fbm(Vd, 5.0 / scale_len, 2, 31) - 0.5) * 0.08
    col[:, 0] *= 1 + hue
    col[:, 2] *= 1 - hue
    col = np.clip(col, 0, 1)
    rough = np.full(n, 0.6) + (m2 - 0.5) * 0.15
    rough[relz < -0.4] += 0.08
    rough[mo | gu] = 0.3
    rough[mem] = 0.55
    rough[arm] = 0.72
    scale = np.ones(n)
    scale[relz > 0.5] = 1.35
    scale[relz < -0.5] = 0.75
    scale[head] *= 0.7
    scale[arm] = 1.8
    scale[mem] = 0.45
    scale[mo | gu] = 0.2
    return col.astype(np.float32), np.clip(rough, 0.05, 1).astype(np.float32), scale.astype(np.float32)
