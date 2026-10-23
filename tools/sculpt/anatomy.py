# ==================== ANATOMY ====================
# Sculpts each animal from its anatomy instead of from the browser's cartoon lofts. The
# proportions and colour schemes still come from the game's species specs (exported by
# tools/export_creatures.mjs), but the forms are built the way the animals were made:
#   theropods   pelvis and ilium, deep ribcage, pectoral girdle, S-curved muscular neck, skulls
#               with jaw muscles, brow ridges, eye sockets, antorbital fossae, nostrils and a
#               separate lower jaw; thighs with caudofemoralis, calves, slim metatarsi, three
#               jointed toes, a dewclaw and curved claws; arms with biceps and clawed fingers
#   spinosaurs  long low snout with a rosette and a notch, retracted nostrils, conical teeth,
#               a sail of neural spines under skin and a paddle tail
#   fish        fusiform bodies, gill covers, and fins as rayed membranes (or fleshy lobes with
#               a fan of rays, as in the coelacanth Mawsonia and the lungfish)
# Each builder returns a Creature: the body and jaw sculpts, keratin accessories (teeth,
# claws), eyes, a rig, the spine line the paint follows and the paint scheme.
import math
import numpy as np
from sdf import Sculpt, SKIN, MOUTH, MEMBRANE, ARMOUR, KERATIN, GUM, CREST, LIMB, UNION, SUBTRACT

V = lambda *a: np.array(a, float)


def nrm(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) + 1e-12)


def lerp(a, b, t):
    return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


class Creature:
    def __init__(self, name, gait):
        self.name = name
        self.gait = gait
        self.body = Sculpt()
        self.jaw = Sculpt()
        self.teeth = []  # (points, radii, bone, colour)
        self.eyes = []  # (centre, radius, bone, iris, look direction)
        self.bones = {}  # name -> (head, tail, parent)
        self.order = []
        self.meta = {'legs': [], 'arms': [], 'tail': [], 'neck': [], 'fins': [], 'wings': [], 'spine': []}
        self.spine = []  # [(point, region)] from the tail tip to the snout
        self.paint = {}

    def bone(self, name, head, tail, parent=None):
        self.bones[name] = (np.asarray(head, float), np.asarray(tail, float), parent)
        self.order.append(name)

    def tooth(self, root, tip, r, bone, colour='#efe6cc', curve=None):
        root, tip = np.asarray(root, float), np.asarray(tip, float)
        mid = lerp(root, tip, 0.55) + (curve if curve is not None else 0)
        self.teeth.append(([root, mid, tip], [r, r * 0.62, r * 0.08], bone, colour))

    def claw(self, base, direction, length, r, bone, colour='#2a2420', curl=0.6, down=(0, 0, -1)):
        d = nrm(direction)
        dn = nrm(down)
        pts, rad = [], []
        for i in range(5):
            t = i / 4
            ang = curl * t
            p = np.asarray(base, float) + (d * math.cos(ang) * 0.9 + dn * math.sin(ang)) * length * t
            pts.append(p)
            rad.append(r * (1 - t) ** 0.9 + r * 0.04)
        self.teeth.append((pts, rad, bone, colour))


# ---------------------------------------------------------------- theropods
def torso_keys(p):
    """The browser's torso sections (so the sail sits where it did), resampled to 9."""
    H, L, R, BH, BW, CD, cd, nR = p['hipH'], p['bodyLen'], p['bodyR'], p['bodyH'], p['bodyWidth'], p['chestDepth'], p['chestDrop'], p['neckR']
    keys = [
        (-0.07, H + 0.012, R * 0.72 * BW, BH * 0.72, 0),
        (0.0, H + 0.02, R * 0.95 * BW, BH * 0.95, 0),
        (L * 0.4, H + 0.004 + cd * 0.4, R * BW, BH * 1.08 * CD, -BH * 0.1 * CD),
        (L * 0.75, H - 0.004 + cd * 0.75, R * 0.9 * BW, BH * 0.98 * CD, -BH * 0.12 * CD),
        (L, H + 0.012 + cd, nR * 1.35, nR * 1.45, 0),
    ]
    out = []
    for i in range(9):
        t = i / 8 * 4
        a = min(3, int(t))
        f = t - a
        A, B = keys[a], keys[a + 1]
        out.append(tuple(A[k] + (B[k] - A[k]) * f for k in range(5)))
    return out


def theropod(name, p, colors):
    c = Creature(name, 'biped')
    s = c.body
    H, L, R, BH, BW, CD, cd = p['hipH'], p['bodyLen'], p['bodyR'], p['bodyH'], p['bodyWidth'], p['chestDepth'], p['chestDrop']
    spino = bool(p.get('spinoSkull'))
    # ---------- torso ----------
    tk = torso_keys(p)
    s.ellipsoid(V(0.0, 0, H + 0.004), (0.085, R * 0.8 * BW, BH * 0.8), k=0.03)  # pelvis and hips
    s.ellipsoid(V(0.005, 0, H + BH * 0.5), (0.075, R * 0.42 * BW, BH * 0.32), k=0.03)  # ilium blades
    rib_c = V(L * 0.46, 0, H - BH * 0.2 * CD + cd * 0.46)
    s.ellipsoid(rib_c, (L * 0.5 + 0.025, R * BW, BH * 1.04 * CD), axis=(L, 0, cd), k=0.04)  # ribcage
    s.ellipsoid(V(L * 0.22, 0, H - BH * 0.38), (L * 0.36, R * 0.9 * BW, BH * 0.72), k=0.04)  # gut
    s.ellipsoid(V(L * 0.86, 0, H - BH * 0.32 * CD + cd * 0.86), (L * 0.17 + 0.012, R * 0.74 * BW, BH * 0.84 * CD), k=0.035)  # chest
    s.cone(V(-0.06, 0, H + 0.03), V(L, 0, H + cd + 0.012), BH * 0.46, p['neckR'] * 1.22, k=0.04, squash=(0.88, 1))  # dorsal line
    for sd in (-1, 1):
        s.ellipsoid(V(L * 0.84, sd * R * 0.6 * BW, H - BH * 0.05 + cd * 0.84), (0.05, 0.016, 0.06), axis=(0.3, 0, -1), k=0.025)  # scapula
        s.ellipsoid(V(L * 0.5, sd * R * 0.75 * BW, H - BH * 0.55 * CD + cd * 0.5), (L * 0.32, R * 0.28, BH * 0.3), k=0.03)  # flank muscle
    # ---------- tail ----------
    T, TD = p['tailLen'], p['tailDepth']
    nT = 12
    tail_pts, tail_rh, tail_rw = [], [], []
    for i in range(nT):
        t = i / (nT - 1)
        x = -0.05 - T * t
        z = H + 0.016 + (p['tailLift'] - 0.032) * t - 0.012 * math.sin(math.pi * t)
        rh = BH * 0.74 * max(1, TD * 0.85) * (1 - t) ** 1.15 * (1 - 0.2 * t) + 0.004
        rw = R * 0.74 * BW * p['tailBase'] * (1 - t) ** 1.05 / (1 + (math.sqrt(TD) - 1) * t) + 0.003
        tail_pts.append(V(x, 0, z))
        tail_rh.append(rh)
        tail_rw.append(rw)
    for i in range(nT - 1):
        s.cone(tail_pts[i], tail_pts[i + 1], tail_rh[i], tail_rh[i + 1], k=0.02, squash=(tail_rw[i] / tail_rh[i], 1))
    for sd in (-1, 1):  # caudofemoralis: the great tail muscle that pulls the thigh back
        s.ellipsoid(V(-0.11, sd * R * 0.42 * BW, H - 0.012), (0.12, R * 0.4, BH * 0.52), axis=(1, 0, 0.25), k=0.035)
    s.ellipsoid(V(-0.16, 0, H - BH * 0.45), (0.1, R * 0.35, BH * 0.25), k=0.03)  # chevrons
    if p.get('tailFin'):
        # tall neural spines and chevrons make a paddle of the tail
        top, bot = [], []
        for i in range(1, nT - 1):
            t = i / (nT - 1)
            scale = math.sin(math.pi * min(1.0, t ** 0.8 * 1.05)) ** 0.6 * (0.45 + 0.9 * t)
            hf = (BH * 0.74) * p['tailFin']['h'] * max(0.0, scale) * 0.85
            top.append((tail_pts[i][0], tail_pts[i][2] + tail_rh[i] * 0.6, hf))
            bot.append((tail_pts[i][0], tail_pts[i][2] - tail_rh[i] * 0.6, hf * 0.4))
        for rows, sgn in ((top, 1), (bot, -1)):
            poly = [(x, z) for x, z, h in rows] + [(x - 0.008, z + sgn * h) for x, z, h in reversed(rows)]
            if sgn < 0:
                poly = poly[::-1]
            if True:
                # split long polygons into overlapping pieces (the plate primitive holds 18 points)
                n = len(rows)
                for a in range(0, n - 1, 7):
                    b = min(n, a + 8)
                    seg = rows[a:b]
                    pp = [(x, z) for x, z, h in seg] + [(x - 0.008, z + sgn * h) for x, z, h in reversed(seg)]
                    s.plate(V(0, 0, 0), pp, (1, 0, 0), (0, 0, 1), 0.0045, 0.0045, round_=0.0015, k=0.01, label=MEMBRANE)
        for i in range(1, nT - 2, 1):  # the spines show through the skin as ridges
            x, z, h = top[i - 1]
            s.cone(V(x, 0, z), V(x - 0.008, 0, z + h * 0.97), 0.0042, 0.0022, k=0.006, label=MEMBRANE)
    # ---------- sail and crest ----------
    if p.get('sail'):
        # one ragged crest of neural spines from the shoulders, tallest over the back, running
        # on down the tail; each spine stands proud of the skin stretched between them
        sail = p['sail']
        sh = lambda t: sail['h'] * math.pow(math.sin(math.pi * min(1, 0.06 + t * 0.94)), 0.8) * (1 - 0.1 * math.exp(-(((t - 0.52) / 0.12) ** 2)))
        line = []
        for i in reversed(range(9)):
            x, y, rw, rh, yo = tk[i]
            line.append((x, y + yo + rh * 0.78, sh(i / 8)))
        crest = p.get('tailCrest', 0.0)
        for i in range(1, nT - 1):
            t = i / (nT - 1)
            h = crest * (1 - t) ** 1.1 + 0.004 if crest else sail['h'] * 0.16 * max(0.0, 1 - t * 2.5)
            line.append((tail_pts[i][0], tail_pts[i][2] + tail_rh[i] * 0.7, h))
        xz = np.array([(x, z) for x, z, h in line])
        hs = np.array([h for x, z, h in line])
        sl = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(xz, axis=0), axis=1))])
        gap = p.get('spineGap', 0.011)
        spines = []
        for d in np.arange(0.004, sl[-1], gap):
            x = np.interp(d, sl, xz[:, 0])
            z = np.interp(d, sl, xz[:, 1])
            h = np.interp(d, sl, hs) * (1.0 + 0.07 * math.sin(d * 977.0) + 0.05 * math.sin(d * 3131.0))
            if h > 0.004:
                spines.append((x, z, h))
        th = sail.get('thick', 0.012) * 0.45
        lean = p.get('spineLean', 0.25)
        tip = lambda x, z, h, f=1.0: (x - h * lean * f, z + h * f)
        for i0 in range(0, len(spines) - 1, 5):
            ch = spines[i0:i0 + 6]
            if len(ch) < 2:
                continue
            poly = [(ch[0][0], ch[0][1] - 0.014)]
            for j, (x, z, h) in enumerate(ch):
                poly.append(tip(x, z, h, 0.93))
                if j < len(ch) - 1:
                    x2, z2, h2 = ch[j + 1]
                    vx, vz = tip((x + x2) / 2, (z + z2) / 2, (h + h2) / 2, 0.8)
                    poly.append((vx, vz))
            poly += [(x, z - 0.014) for x, z, h in reversed(ch)]
            s.plate(V(0, 0, 0), poly, (1, 0, 0), (0, 0, 1), th, th * 0.35, round_=0.0012, k=0.012, label=MEMBRANE)
        for (x, z, h) in spines:  # the spines themselves, breaking through the edge
            tx, tz = tip(x, z, h, 1.035 + 0.03 * math.sin(x * 2711.0))
            s.cone(V(x, 0, z - 0.012), V(tx, 0, tz), th * 1.5, th * 0.45, k=0.005, label=MEMBRANE)
        c.spine_gap = gap
    if p.get('osteoderms') or p.get('backRidge'):
        for i in range(1, 8):
            x, y, rw, rh, yo = tk[i]
            s.ellipsoid(V(x, 0, y + yo + rh * 0.9), (0.012, 0.006, 0.012), k=0.006, label=ARMOUR)
    if p.get('featureScales'):
        # abelisaur skin: rows of big conical feature scales along the flanks
        for row in range(3):
            for i in range(1, 8):
                x, y, rw, rh, yo = tk[i]
                for sd in (-1, 1):
                    a = 0.5 + row * 0.42
                    s.ellipsoid(V(x + (row % 2) * 0.012, sd * math.cos(a) * rw * 0.96, y + yo + math.sin(a) * rh * 0.92), (0.007, 0.006, 0.007), k=0.004, label=ARMOUR)
    # ---------- neck ----------
    nR = p['neckR']
    nb = V(L - 0.02, 0, H + 0.008 + cd)
    nx, ny = math.cos(p['neckUp']) * p['neckLen'], math.sin(p['neckUp']) * p['neckLen']
    # the neck as a smooth S: it leaves the shoulders rising steeply and arrives at the skull
    # nearly level, so the head is carried out in front rather than perched on top
    ang_head = -p['neckUp'] * 0.85 + p.get('headTilt', 0)
    a0 = p['neckUp'] + 0.35 * p['neckS']
    a1 = ang_head * 0.5 + 0.1
    P0, P3 = nb, nb + V(nx, 0, ny)
    P1 = P0 + V(math.cos(a0), 0, math.sin(a0)) * p['neckLen'] * 0.45
    P2 = P3 - V(math.cos(a1), 0, math.sin(a1)) * p['neckLen'] * 0.4
    bez = lambda t: P0 * (1 - t) ** 3 + P1 * 3 * t * (1 - t) ** 2 + P2 * 3 * t * t * (1 - t) + P3 * t ** 3
    neck = [bez(t) for t in (0.0, 0.33, 0.66, 1.0)]
    dense = [bez(t) for t in np.linspace(0, 1, 9)]
    nr = [nR * (1.32 - 0.42 * t) for t in np.linspace(0, 1, 9)]
    s.chain(dense, nr, k=0.03, squash=(0.8, 1))
    s.ellipsoid(lerp(dense[1], dense[3], 0.5) + V(0, 0, nR * 0.5), (p['neckLen'] * 0.22, nR * 0.5, nR * 0.5), axis=dense[3] - dense[1], k=0.03)  # dorsal neck muscle
    s.ellipsoid(lerp(dense[4], dense[7], 0.5) - V(0, 0, nR * 0.35), (p['neckLen'] * 0.22, nR * 0.55, nR * 0.5), axis=dense[7] - dense[4], k=0.03)  # throat
    # ---------- head ----------
    hl, hh, hw = p['headLen'], p['headH'], p['headW']
    sk0, sk1, sk2 = p['skull']
    sw0, sw1 = p['skullWidth']
    ang = -p['neckUp'] * 0.85 + p.get('headTilt', 0)
    f = V(math.cos(ang), 0, math.sin(ang))
    up = V(-math.sin(ang), 0, math.cos(ang))
    O = neck[3] + f * hl * 0.06 + up * hh * 0.3
    side = V(0, 1, 0)
    hp = lambda u, v, w=0.0: O + f * u + up * v + side * w
    lip = -0.4 * hh
    if spino:
        s.ellipsoid(hp(0.06 * hl, 0.04 * hh), (0.16 * hl, hw * 0.92 * sw0, hh * 0.88 * sk0), axis=f, up=up, k=0.02)
        for sd in (-1, 1):
            s.ellipsoid(hp(0.03 * hl, -0.08 * hh, sd * hw * 0.42), (0.11 * hl, hw * 0.4, hh * 0.46), axis=f, up=up, k=0.02)
        s.cone(hp(0.16 * hl, 0.04 * hh), hp(0.78 * hl, -0.16 * hh), hh * 0.5, hh * 0.27, k=0.025, squash=(hw * 0.62 / (hh * 0.5), 1), up=up)
        s.ellipsoid(hp(0.9 * hl, -0.15 * hh), (0.1 * hl, hw * 0.6, hh * 0.33), axis=f, up=up, k=0.02)  # rosette
        s.ellipsoid(hp(0.78 * hl, -0.52 * hh), (0.06 * hl, hw * 1.2, hh * 0.18), axis=f, up=up, k=0.008, op=SUBTRACT)  # notch
        s.cone(hp(0.2 * hl, 0.44 * hh), hp(0.55 * hl, 0.14 * hh), hh * 0.1, hh * 0.05, k=0.012, up=up)  # nasal ridge
        if p.get('headCrest'):
            # the tall, backswept display crest over the eyes (Navarro's reconstruction)
            ch = p['headCrest']
            pts = [(0.34 * hl, 0.26 * hh), (0.22 * hl, 0.42 * hh), (0.14 * hl, 0.52 * hh), (0.12 * hl, 0.5 * hh + ch * 0.45), (0.08 * hl, 0.5 * hh + ch * 0.85),
                   (0.01 * hl, 0.5 * hh + ch * 1.05), (-0.04 * hl, 0.5 * hh + ch * 1.08), (0.0, 0.5 * hh + ch * 0.8), (0.03 * hl, 0.5 * hh + ch * 0.4), (0.02 * hl, 0.42 * hh), (0.14 * hl, 0.28 * hh)]
            s.plate(hp(0, 0), pts, f, up, hw * 0.16, hw * 0.07, round_=0.002, k=0.01, label=CREST)
        elif p.get('crest'):
            s.plate(hp(0, 0), [(0.18 * hl, 0.42 * hh), (0.44 * hl, 0.22 * hh), (0.38 * hl, 0.22 * hh + p['crest']['h'] * 0.7), (0.24 * hl, 0.42 * hh + p['crest']['h'])], f, up, hw * 0.12, hw * 0.05, round_=0.001, k=0.008, label=SKIN)
        for sd in (-1, 1):
            s.ellipsoid(hp(0.37 * hl, 0.22 * hh, sd * hw * 0.3), (0.035 * hl, hw * 0.12, hh * 0.07), axis=f, up=up, k=0.004, op=SUBTRACT)  # nostrils, far back
        eye_u, eye_v, eye_w = 0.12 * hl, 0.32 * hh, hw * 0.76
        lip = -0.36 * hh
        jaw_tip = 0.93
    else:
        s.ellipsoid(hp(0.1 * hl, 0.06 * hh), (0.2 * hl, hw * 0.9 * sw0, hh * 0.82 * sk0), axis=f, up=up, k=0.025)
        for sd in (-1, 1):
            s.ellipsoid(hp(0.05 * hl, -0.06 * hh, sd * hw * 0.48), (0.14 * hl, hw * 0.42, hh * 0.5), axis=f, up=up, k=0.025)  # jaw muscles
        snw = hw * (0.5 + p['snout'] * 0.5) * sw1 / 0.75
        s.cone(hp(0.22 * hl, 0.04 * hh), hp(0.86 * hl, -0.12 * hh), hh * 0.62 * sk1, hh * 0.34 * sk2, k=0.03, squash=(min(1.3, snw / (hh * 0.62 * sk1)), 1), up=up)
        s.ellipsoid(hp(0.88 * hl, -0.14 * hh), (0.09 * hl, hw * p['snout'] * 0.78, hh * 0.33 * sk2), axis=f, up=up, k=0.025)
        s.cone(hp(0.3 * hl, 0.4 * hh * sk1), hp(0.86 * hl, 0.1 * hh), hh * 0.13, hh * 0.07, k=0.015, up=up)  # nasal ridge
        for sd in (-1, 1):
            s.ellipsoid(hp(0.44 * hl, 0.06 * hh, sd * snw * 0.95), (0.13 * hl, snw * 0.2, hh * 0.22), axis=f, up=up, k=0.016, op=SUBTRACT)  # antorbital fossa
            s.ellipsoid(hp(0.85 * hl, 0.0, sd * hw * p['snout'] * 0.6), (0.03 * hl, hw * 0.14, hh * 0.06), axis=f, up=up, k=0.004, op=SUBTRACT)  # nostril
        eye_u, eye_v, eye_w = 0.2 * hl, 0.3 * hh * sk0, hw * 0.8 * sw0
        jaw_tip = 0.86
        if p.get('jowl'):
            s.ellipsoid(hp(0.12 * hl, -0.5 * hh), (0.16 * hl, hw * 0.5, hh * 0.45 * p['jowl']), axis=f, up=up, k=0.03)
        if p.get('nasalBumps'):
            for i in range(7):
                for sd in (-1, 1):
                    s.ellipsoid(hp((0.3 + i * 0.085) * hl, (0.5 - i * 0.06) * hh * sk1, sd * hw * 0.26), (0.03 * hl, hw * 0.12, hh * (0.08 + (i % 2) * 0.03)), axis=f, up=up, k=0.006, label=ARMOUR)
        if p.get('dome'):
            s.ellipsoid(hp(0.14 * hl, 0.62 * hh), (0.15 * hl, hw * 0.55, hh * 0.32), axis=f, up=up, k=0.02, label=ARMOUR)
        if p.get('horn'):
            s.cone(hp(0.6 * hl, 0.3 * hh), hp(0.64 * hl, 0.3 * hh + p['horn']['h']), p['horn']['r'], p['horn']['r'] * 0.3, k=0.01, label=ARMOUR, squash=(0.5, 1), up=up)
        if p.get('lacrimal'):
            for sd in (-1, 1):
                s.cone(hp(0.22 * hl, 0.5 * hh, sd * hw * 0.5), hp(0.18 * hl, 0.5 * hh + p['lacrimal']['h'], sd * hw * 0.56), p['lacrimal']['r'], p['lacrimal']['r'] * 0.25, k=0.008, label=ARMOUR, up=up)
        if p.get('headFeathers'):
            for i in range(4):
                x = -0.05 * hl - i * 0.06 * hl
                s.plate(hp(0, 0), [(x, 0.5 * hh), (x + 0.06 * hl, 0.55 * hh), (x - 0.15 * hl, (0.95 + i * 0.12) * hh)], f, up, hw * 0.08, hw * 0.03, round_=0.001, k=0.006, label=MEMBRANE)
    # brow ridges and sockets for the eyes
    for sd in (-1, 1):
        s.ellipsoid(hp(eye_u - 0.01 * hl, eye_v + 0.16 * hh, sd * eye_w * 0.82), (0.075 * hl, hw * 0.26, hh * 0.13), axis=f, up=up, k=0.012)
        s.ellipsoid(hp(eye_u, eye_v, sd * eye_w * 1.02), (0.055 * hl, hw * 0.3, hh * 0.14), axis=f, up=up, k=0.008, op=SUBTRACT)
    # the mouth: cut flat along the lip line so the lower jaw can close against it
    # (only in front of the jaw hinge, so the cheeks behind it stay whole)
    s.box(hp(0.6 * hl, lip - 0.2 * hh), (0.52 * hl, hw * 2.5, 0.2 * hh), axis=f, up=up, round_=0.0, k=0.006, label=MOUTH, op=SUBTRACT)
    eye_r = hh * 0.12 * max(0.85, min(1.5, p.get('eyeScale', 1) ** 0.5))
    for sd in (-1, 1):
        c.eyes.append((hp(eye_u + 0.004, eye_v, sd * (eye_w * 1.02 - eye_r * 0.35)), eye_r, 'head', colors.get('eye', '#f2c230'), sd))
    # ---------- lower jaw ----------
    jp = hp(0.01 * hl, lip - 0.03 * hh)
    jlen = jaw_tip * hl
    jaw_end = hp(jlen, lip - 0.02 * hh)
    jw_r = hh * (0.22 if spino else 0.28)
    jaw = c.jaw
    jaw.cone(jp, jaw_end, jw_r, hh * 0.12, k=0.02, squash=(min(1.4, hw * (0.6 if spino else 0.72) / jw_r), 1), up=up)
    for sd in (-1, 1):
        jaw.ellipsoid(hp(0.05 * hl, lip - 0.1 * hh, sd * hw * 0.45), (0.07 * hl, hw * 0.18, hh * 0.16), axis=f, up=up, k=0.02)  # articulation
    if spino:
        jaw.ellipsoid(hp(0.88 * hl, lip - 0.08 * hh), (0.08 * hl, hw * 0.5, hh * 0.16), axis=f, up=up, k=0.02)
    jaw.box(hp(0.5 * hl, lip + 0.2 * hh), (0.8 * hl, hw * 2.5, 0.2 * hh), axis=f, up=up, round_=0.0, k=0.006, label=MOUTH, op=SUBTRACT)
    jaw.ellipsoid(hp(0.4 * hl, lip - 0.02 * hh), (0.3 * hl, hw * 0.3, hh * 0.06), axis=f, up=up, k=0.01, label=GUM)  # tongue
    # ---------- teeth ----------
    ts = p.get('teethSize', 1)
    if p.get('teeth', True):
        n = 11 if spino else 9
        for i in range(n):
            t = i / (n - 1)
            u = (0.3 + t * 0.6) * hl if spino else (0.28 + t * 0.56) * hl
            big = spino and u > 0.82 * hl
            w = (hw * 0.5 if spino else hw * 0.5 * (1 - t * 0.35)) * (1.05 if big else 1)
            size = hh * (0.24 if big else 0.13) * ts * (1.0 if spino else (1.2 - t * 0.4))
            for sd in (-1, 1):
                notch = spino and 0.74 * hl < u < 0.82 * hl
                if notch:
                    continue
                c.tooth(hp(u, lip + size * 0.35, sd * w * 0.92), hp(u + size * 0.15, lip - size, sd * w * 0.98), size * 0.32, 'head', curve=-f * size * 0.08)
                if spino or ts >= 0.8:
                    lu = u - 0.02 * hl
                    c.tooth(hp(lu, lip - size * 0.3, sd * w * 0.84), hp(lu + size * 0.1, lip + size * 0.85, sd * w * 0.88), size * 0.28, 'jaw')
    # ---------- legs ----------
    legH = H - 0.02
    tR = p['thighR']
    crouch = p.get('crouch', 0)
    for li, sd in enumerate((1, -1)):
        hipj = V(0.01, sd * R * 0.72 * BW, legH)
        knee = hipj + V(tR * (1.2 + crouch * 2), sd * 0.006, -legH * (0.45 - crouch * 0.08))
        ankle = hipj + V(-tR * (0.9 + crouch * 1.5), sd * 0.01, -legH * 0.82)
        pad = V(hipj[0] - tR * 0.3, hipj[1] + sd * 0.012, 0.014)
        thigh_c = lerp(hipj, knee, 0.5) + V(-tR * 0.25, sd * tR * 0.1, tR * 0.1)
        s.ellipsoid(thigh_c + V(0, 0, tR * 0.15), (np.linalg.norm(knee - hipj) * 0.58, tR * 0.72, tR * 1.02), axis=knee - hipj, up=(-1, 0, 0.3), k=0.035, label=LIMB)
        s.cone(hipj, knee, tR * 0.7, tR * 0.44, k=0.025, label=LIMB)
        s.ellipsoid(knee, (tR * 0.42, tR * 0.4, tR * 0.4), k=0.02, label=LIMB)
        s.cone(knee, ankle, tR * 0.42, tR * 0.24, k=0.02, label=LIMB)
        calf = lerp(knee, ankle, 0.35) + V(-tR * 0.22, 0, 0)
        s.ellipsoid(calf, (np.linalg.norm(ankle - knee) * 0.36, tR * 0.38, tR * 0.44), axis=ankle - knee, k=0.025, label=LIMB)
        s.ellipsoid(ankle, (tR * 0.27, tR * 0.24, tR * 0.24), k=0.015, label=LIMB)
        s.cone(ankle, pad + V(0, 0, 0.004), tR * 0.24, tR * 0.2, k=0.015, squash=(0.85, 1))
        s.ellipsoid(pad + V(0, 0, -0.002), (tR * 0.32, tR * 0.3, tR * 0.14), k=0.012, label=LIMB)
        tips = []
        webbed = p.get('webbed')
        for ti, a in enumerate((-0.42, 0.0, 0.42)):
            tl = tR * (1.9 if webbed else 1.6) * (1.15 if a == 0 else 0.92)
            d = V(math.cos(a), sd * math.sin(a), 0)
            pts = [pad + V(0, 0, 0.0), pad + d * tl * 0.36 + V(0, 0, -0.004), pad + d * tl * 0.7 + V(0, 0, -0.006), pad + d * tl + V(0, 0, -0.007)]
            s.chain(pts, [tR * 0.2, tR * 0.15, tR * 0.12, tR * 0.09], k=0.01, squash=(1, 0.82), label=LIMB)
            for kk in (1, 2):
                s.ellipsoid(pts[kk] + V(0, 0, -tR * 0.06), (tR * 0.1, tR * 0.1, tR * 0.05), k=0.006, label=LIMB)  # toe pads
            tips.append(pts[-1])
            flat = p.get('flatClaws')
            c.claw(pts[-1] + V(0, 0, 0.002), d + V(0, 0, -0.1), tR * (0.44 if flat else 0.52), tR * (0.11 if flat else 0.09), 'toe_' + 'LR'[li], colors.get('claw', '#2a2420'), curl=0.5 if flat else 0.8)
        if webbed:
            for k in range(2):
                a0 = tips[k] - pad
                b0 = tips[k + 1] - pad
                poly = [(0.0, 0.0), (a0[0] * 0.9, a0[1] * 0.9), (b0[0] * 0.9, b0[1] * 0.9)]
                s.plate(pad + V(0, 0, -0.003), poly, (1, 0, 0), (0, 1, 0), 0.0018, 0.0018, round_=0.001, k=0.006, label=MEMBRANE)
        hal = lerp(ankle, pad, 0.72)
        s.chain([hal, hal + V(-tR * 0.3, -sd * tR * 0.25, -0.006), hal + V(-tR * 0.45, -sd * tR * 0.3, -0.01)], [tR * 0.12, tR * 0.09, tR * 0.07], k=0.008, label=LIMB)
        c.claw(hal + V(-tR * 0.45, -sd * tR * 0.3, -0.01), V(-1, 0, -0.6), tR * 0.25, tR * 0.06, 'foot_' + 'LR'[li], colors.get('claw', '#2a2420'))
        if p.get('sickle'):
            sp = pad + V(tR * 0.3, -sd * tR * 0.12, 0.02)
            c.claw(sp, V(0.5, 0, 1), tR * 1.0, tR * 0.14, 'toe_' + 'LR'[li], '#1a1a1a', curl=-1.2, down=(1, 0, 0))
        side_s = 'LR'[li]
        c.bone('thigh_' + side_s, hipj, knee, 'body')
        c.bone('shin_' + side_s, knee, ankle, 'thigh_' + side_s)
        c.bone('foot_' + side_s, ankle, pad, 'shin_' + side_s)
        c.bone('toe_' + side_s, pad, pad + V(tR * 1.6, 0, 0), 'foot_' + side_s)
        c.meta['legs'].append({'thigh': 'thigh_' + side_s, 'shin': 'shin_' + side_s, 'foot': 'foot_' + side_s, 'toe': 'toe_' + side_s,
                               'side': sd, 'phase': 0.0 if sd > 0 else math.pi, 'front': False})
    # ---------- arms ----------
    A, aR = p['armLen'], p['armR']
    for li, sd in enumerate((1, -1)):
        S = V(L * 0.86, sd * R * 0.62 * BW, H - BH * 0.45 + cd * 0.86)
        if p.get('handsDown'):
            elbow, wrist = S + V(A * 0.05, sd * 0.014, -A * 0.48), S + V(A * 0.12, sd * 0.016, -A * 0.96)
        else:
            elbow, wrist = S + V(A * 0.15, sd * 0.01, -A * 0.5), S + V(A * 0.55, sd * 0.012, -A * 0.72)
        s.cone(S, elbow, aR * 1.45, aR * 1.05, k=0.02, label=LIMB)
        s.ellipsoid(lerp(S, elbow, 0.45) + V(aR * 0.3, 0, 0), (np.linalg.norm(elbow - S) * 0.38, aR * 0.9, aR * 0.9), axis=elbow - S, k=0.015, label=LIMB)
        s.cone(elbow, wrist, aR * 1.1, aR * 0.82, k=0.015, label=LIMB)
        fwd = nrm(wrist - elbow)
        s.ellipsoid(wrist + fwd * aR * 0.5, (aR * 1.0, aR * 0.7, aR * 0.55), axis=fwd, k=0.01, label=LIMB)
        if p.get('handsDown'):
            s.ellipsoid(wrist + V(A * 0.03, 0, -aR * 0.4), (aR * 1.3, aR * 1.0, aR * 0.6), k=0.01, label=KERATIN)
            if p.get('thumbSpike'):
                c.teeth.append(([wrist, wrist + V(A * 0.04, sd * A * 0.08, A * 0.06), wrist + V(A * 0.05, sd * A * 0.13, A * 0.1)], [aR * 0.6, aR * 0.35, aR * 0.05], 'hand_' + 'LR'[li], p['thumbSpike']))
        else:
            for fi, a in enumerate((-0.35, 0.0, 0.35)):
                fl = A * (0.16 if fi == 0 else 0.24 if fi == 1 else 0.2)
                d = nrm(fwd + V(0, sd * a * 0.5, a * 0.3))
                b0 = wrist + fwd * aR * 0.9
                pts = [b0, b0 + d * fl * 0.5, b0 + d * fl]
                s.chain(pts, [aR * 0.42, aR * 0.34, aR * 0.27], k=0.008, label=LIMB)
                cs = p.get('clawScale', 1) if fi == 0 else 1
                c.claw(pts[-1], d + V(0, 0, -0.3), A * 0.17 * cs, aR * 0.34 * math.sqrt(cs), 'hand_' + 'LR'[li], colors.get('claw', '#2a2420'), curl=0.9)
        if p.get('wingFeathers'):
            wf = p['wingFeathers']
            poly = [(0.0, 0.0), (np.linalg.norm(elbow - S), 0.0), (np.linalg.norm(wrist - S) * 1.05, -0.01), (np.linalg.norm(wrist - S) * 0.9, -A * 0.55), (0.0, -A * 0.4)]
            s.plate(S + V(0, sd * 0.004, 0), poly, wrist - S, (0, 0, 1), 0.003, 0.0015, round_=0.001, k=0.006, label=MEMBRANE)
        side_s = 'LR'[li]
        c.bone('arm_' + side_s, S, elbow, 'chest')
        c.bone('forearm_' + side_s, elbow, wrist, 'arm_' + side_s)
        c.bone('hand_' + side_s, wrist, wrist + fwd * A * 0.2, 'forearm_' + side_s)
        c.meta['arms'].append({'upper': 'arm_' + side_s, 'fore': 'forearm_' + side_s, 'hand': 'hand_' + side_s, 'side': sd})
    if p.get('tailFan'):
        tp = tail_pts[-4]
        poly = [(0.0, -0.012), (-T * 0.3, -p['tailFan']['w']), (-T * 0.42, -p['tailFan']['w'] * 0.4), (-T * 0.44, 0.0), (-T * 0.42, p['tailFan']['w'] * 0.4), (-T * 0.3, p['tailFan']['w']), (0.0, 0.012)]
        s.plate(tp, poly, (1, 0, 0), (0, 1, 0), 0.003, 0.003, round_=0.001, k=0.006, label=MEMBRANE)
    # ---------- rig ----------
    c.bone('body', V(0, 0, H), V(L * 0.5, 0, H + cd * 0.5))
    c.bone('chest', V(L * 0.5, 0, H + cd * 0.5), nb, 'body')
    for i in range(3):
        c.bone(f'neck{i}', neck[i], neck[i + 1], 'chest' if i == 0 else f'neck{i - 1}')
    c.bone('head', O, hp(0.85 * hl, 0), 'neck2')
    c.bone('jaw', jp, hp(jlen, lip), 'head')
    tb = [0, 2, 4, 6, 8, 10, 11]
    for i in range(6):
        c.bone(f'tail{i}', tail_pts[tb[i]], tail_pts[tb[i + 1]], 'body' if i == 0 else f'tail{i - 1}')
    # the rig order must have parents first
    order = ['body', 'chest', 'neck0', 'neck1', 'neck2', 'head', 'jaw'] + [f'tail{i}' for i in range(6)]
    for sd in 'LR':
        order += [f'thigh_{sd}', f'shin_{sd}', f'foot_{sd}', f'toe_{sd}', f'arm_{sd}', f'forearm_{sd}', f'hand_{sd}']
    c.order = order
    c.meta.update(tail=[f'tail{i}' for i in range(6)], neck=['neck0', 'neck1', 'neck2'], spine=['body', 'chest'], head='head', jaw='jaw')
    # the line the paint follows: tail tip to snout
    c.spine = [(tp, 'tail') for tp in reversed(tail_pts)] + [(V(L * 0.5, 0, H), 'body'), (nb, 'body')] + [(n_, 'neck') for n_ in neck[1:]] + [(hp(u * hl, 0), 'head') for u in (0.2, 0.5, 0.8, 1.0)]
    c.head_frame = (O, f, up, hl, hh, hw, lip)
    c.paint = dict(colors=colors, stripes=p.get('stripes'), spots=p.get('spots'), sail=p.get('sail'), stripeEvery=p.get('stripeEvery', 2),
                   spineBands=p.get('spinoBands'), navarro=p.get('navarro'), spineGap=getattr(c, 'spine_gap', 0.011))
    return c


# ---------------------------------------------------------------- fins
def fin(s, origin, u, v, base_len, rays, thick=0.0025, edge=0.35, scallop=0.03, label=MEMBRANE, k=0.008, ray_k=0.003):
    """A rayed fin. Rays start along a base line (origin + v * base_len * t) and run out at an
    angle from u towards v; the membrane between them is scalloped a little back from the ray
    tips and thins towards the edge, and the rays stand out of it as fine ridges.
    rays: [(t along the base, angle, length)]."""
    origin = np.asarray(origin, float)
    u = nrm(u)
    v = nrm(np.asarray(v, float) - u * np.dot(u, v))
    S = [np.array([0.0, base_len * t]) for t, a, L in rays]
    T = [S[i] + np.array([math.cos(a), math.sin(a)]) * L for i, (t, a, L) in enumerate(rays)]
    # the membrane in pieces of up to eight rays (a plate holds 18 outline points)
    i0 = 0
    while i0 < len(rays) - 1:
        i1 = min(len(rays) - 1, i0 + 7)
        poly = [S[i0], T[i0]]
        for i in range(i0, i1):
            m = (T[i] + T[i + 1]) / 2
            bb = (S[i] + S[i + 1]) / 2
            poly.append(m * (1 - scallop) + bb * scallop)
            poly.append(T[i + 1])
        poly.append(S[i1])
        if base_len > 0 or i0 > 0:
            poly.append((S[i0] + S[i1]) / 2 - np.array([0.002, 0.0]))
        s.plate(origin, [tuple(q) for q in poly], u, v, thick, thick * edge, round_=thick * 0.5, k=k, label=label, radial=True)
        i0 = i1
    for i in range(len(rays)):
        a = origin + u * S[i][0] + v * S[i][1]
        b = origin + u * T[i][0] * 0.985 + v * T[i][1] * 0.985
        s.cone(a, b, thick * 1.3, thick * 0.6, k=ray_k, label=label)


def fan(n, a0, a1, L, profile=lambda t: 1.0, t0=0.0, t1=0.0):
    """Rays spread from a0 to a1 with lengths shaped by `profile`."""
    out = []
    for i in range(n):
        t = i / max(1, n - 1)
        out.append((t0 + (t1 - t0) * t, a0 + (a1 - a0) * t, L * profile(t)))
    return out


# ---------------------------------------------------------------- fish
def fish(name, p, colors):
    """A fish sculpted one unit long, snout towards +x."""
    c = Creature(name, 'swim')
    s, jaw = c.body, c.jaw
    tail = p.get('tail', 'fork')
    coel = name == 'Mawsonia'
    lung = name == 'Lungfish'
    gar = name == 'Obaichthys'
    bichir = name == 'Bawitius'
    shark = name == 'Tribodus'
    saw = name == 'Onchopristis'
    bowfin = name == 'Calamopleurus'
    D = p.get('depth', 0.07) / p.get('len', 0.36) * (1.08 if coel else 1)
    W = p.get('width', 0.045) / p.get('len', 0.36)
    if saw:
        D *= 0.55
    beak = p.get('beakLen', 0) / p.get('len', 0.36)
    nose, tailx = 0.5, -0.32
    if coel:
        # Mawsonia: an elongate body, a wedge of a head a quarter of the length, and a deep
        # caudal peduncle carrying the tail lobes far back
        D, W, tailx = 0.215, 0.105, -0.42
    xs = np.linspace(nose, tailx, 22 if coel else 18)
    sec = []
    for x in xs:
        t = (nose - x) / (nose - tailx)
        if coel:
            prof = float(np.interp(t, [0, 0.04, 0.12, 0.22, 0.34, 0.5, 0.7, 0.85, 1.0], [0.05, 0.3, 0.55, 0.78, 0.95, 1.0, 0.84, 0.66, 0.52]))
            dep, wid_ = D * prof, W * float(np.interp(t, [0, 0.06, 0.25, 0.5, 0.8, 1.0], [0.12, 0.5, 0.9, 1.0, 0.6, 0.35]))
            sec.append((V(x, 0, -0.03 * D * t), dep / 2, wid_ / 2))
            continue
        prof = math.sin(math.pi * min(1.0, 0.08 + t * 0.95)) ** 0.75
        dep = D * (0.3 + 0.7 * prof) * (1 - 0.6 * smoothstep(0.72, 1.0, t))
        wid = W * (0.42 + 0.58 * prof) * (1 - 0.62 * smoothstep(0.7, 1.0, t))
        if saw:
            wid *= 1.0 + 1.5 * (1 - smoothstep(0.0, 0.6, t))
        z = 0.06 * D * math.sin(math.pi * t) - (0.04 * D * t if coel else 0)
        sec.append((V(x, 0, z), dep / 2, wid / 2))
    for i in range(len(sec) - 1):
        a, b = sec[i], sec[i + 1]
        s.cone(a[0], b[0], a[1], b[1], k=0.025, squash=(max(0.2, a[2] / a[1]), 1))
    top = lambda x: float(np.interp(-x, -xs, [q[0][2] + q[1] for q in sec]))
    bot = lambda x: float(np.interp(-x, -xs, [q[0][2] - q[1] for q in sec]))
    wid = lambda x: float(np.interp(-x, -xs, [q[2] for q in sec]))
    mid = lambda x: float(np.interp(-x, -xs, [q[0][2] for q in sec]))
    # ---------- head ----------
    if not coel:
        hx = nose - 0.17  # back edge of the gill cover
    if not coel:
        s.ellipsoid(V(nose - 0.06, 0, mid(nose - 0.06) + D * 0.0), (0.09, wid(nose - 0.06) * 0.92, D * 0.4), k=0.035)
    else:
        hx = nose - 0.235
    for sd in (-1, 1):
        # gill cover: a raised plate, its free edge undercut by a deep slit
        if coel:
            # the big rounded gill cover of a coelacanth
            s.ellipsoid(V(hx + 0.05, sd * wid(hx + 0.05) * 0.68, mid(hx) - D * 0.06), (0.06, wid(hx) * 0.36, D * 0.3), axis=(1, 0, 0.1), k=0.015, label=ARMOUR)
        else:
            s.ellipsoid(V(hx + 0.045, sd * wid(hx) * 0.72, mid(hx) - D * 0.04), (0.062, wid(hx) * 0.34, D * 0.33), axis=(1, 0, 0.15), k=0.015, label=SKIN)
        s.cone(V(hx + 0.005, sd * wid(hx) * 1.02, mid(hx) + D * 0.3), V(hx - 0.004, sd * wid(hx) * 1.02, mid(hx) - D * 0.32), 0.005, 0.004, k=0.004, op=SUBTRACT)
        if coel:
            # the cheek and skull roof of a coelacanth: a mosaic of bony plates with sutures
            for (u0, v0, u1, v1) in ((0.44, 0.1, 0.38, -0.12), (0.37, 0.16, 0.31, 0.0), (0.4, 0.26, 0.3, 0.24)):
                s.cone(V(u0, sd * wid(u0) * 0.96, D * v0), V(u1, sd * wid(u1) * 0.98, D * v1), 0.0025, 0.0025, k=0.003, op=SUBTRACT)
            s.ellipsoid(V(nose - 0.12, sd * wid(nose - 0.12) * 0.7, mid(nose - 0.12) - D * 0.14), (0.05, wid(nose - 0.12) * 0.35, D * 0.18), k=0.012, label=ARMOUR)
    lip = mid(nose) - D * (0.06 if coel else 0.14)
    gape = V(1, 0, -0.18 if coel else -0.3)
    jaw_pivot = V(nose - (0.15 if coel else 0.11), 0, lip - D * 0.02)
    jaw_tip = V(nose + beak * 0.9 + 0.004, 0, lip - D * 0.04)
    corner = V(nose - (0.17 if coel else 0.09), 0, lip - (D * 0.12 if coel else -D * 0.02))
    for sd in (-1, 1):  # the mouth line: a groove from the corner of the mouth round the snout
        pts = [corner + V(0, sd * wid(corner[0]) * 0.92, 0), V(nose - 0.04, sd * wid(nose - 0.04) * 0.9, lip), V(nose + 0.005, sd * wid(nose) * 0.4, lip - D * 0.01), V(nose + 0.012, 0, lip - D * 0.01)]
        s.chain(pts, [0.0035, 0.0035, 0.003, 0.003], k=0.003, op=SUBTRACT, label=MOUTH)
    s.ellipsoid(lerp(jaw_pivot, jaw_tip, 0.45) - V(0, 0, D * 0.12), (0.08, wid(nose - 0.08) * 0.75, D * 0.14), k=0.025)  # lower jaw
    if beak > 0:  # gar: a long, narrow toothed beak, upper and lower
        s.cone(V(nose - 0.03, 0, lip + D * 0.08), V(nose + beak, 0, lip + D * 0.02), D * 0.13, D * 0.035, k=0.02, squash=(1.1, 1))
        s.cone(V(nose - 0.03, 0, lip - D * 0.05), V(nose + beak * 0.97, 0, lip - D * 0.03), D * 0.1, D * 0.03, k=0.02, squash=(1.1, 1))
    if saw:  # sclerorhynchid rostrum lined with barbed denticles
        sl = p['saw']['len'] / p.get('len', 0.36)
        s.plate(V(nose - 0.03, 0, mid(nose)), [(0, -W * 0.36), (sl, -W * 0.1), (sl + 0.01, 0), (sl, W * 0.1), (0, W * 0.36)], (1, 0, 0), (0, 1, 0), 0.007, 0.004, round_=0.003, k=0.02, label=SKIN)
        for i in range(1, 18):
            x = nose - 0.03 + sl * i / 18.5
            zw = W * (0.36 - 0.26 * i / 18)
            for sd in (-1, 1):
                c.teeth.append(([V(x, sd * zw, mid(nose)), V(x - 0.004, sd * (zw + 0.014), mid(nose)), V(x - 0.011, sd * (zw + 0.026), mid(nose))], [0.0035, 0.0022, 0.0004], 'head', '#efe6cc'))
    eye_r = D * (0.055 if coel else 0.085)
    ex = nose - (0.1 if coel else 0.06)
    for sd in (-1, 1):
        s.ellipsoid(V(ex, sd * wid(ex) * 0.95, mid(ex) + D * 0.13), (eye_r * 1.25, wid(ex) * 0.4, eye_r * 1.15), k=0.006, op=SUBTRACT)
        c.eyes.append((V(ex, sd * (wid(ex) * 0.95 - eye_r * 0.55), mid(ex) + D * 0.13), eye_r, 'head', colors.get('eye', '#e8d060'), sd))
    if p.get('teeth') or coel or bowfin:
        for i in range(9):
            x = nose - 0.1 + i * 0.012 + (beak * i / 9 if beak else 0)
            for sd in (-1, 1):
                c.tooth(V(x, sd * wid(min(x, nose)) * 0.55, lip + 0.003), V(x + 0.002, sd * wid(min(x, nose)) * 0.58, lip - 0.009), 0.0028, 'head')
    # ---------- fins ----------
    up, dn = V(0, 0, 1), V(0, 0, -1)
    back = V(-1, 0, 0)
    pi = math.pi
    if coel:
        lobe = lambda base, d, L0, r0: (s.cone(base, base + d * L0, r0, r0 * 0.6, k=0.02, squash=(0.55, 1)), base + d * L0)[1]
        # first dorsal: a fan of stiff rays swept back
        fin(s, V(0.12, 0, top(0.12) - 0.006), up, back, 0.06, [(t, 0.3 + 0.65 * t, 0.15 * (1 - 0.55 * t)) for t in np.linspace(0, 1, 11)], 0.0032, scallop=0.06)
        # second dorsal and anal fins on fleshy, scaled lobes, swept back
        for zsgn, x in ((1, -0.12), (-1, -0.15)):
            base = V(x, 0, (top(x) if zsgn > 0 else bot(x)) - zsgn * 0.006)
            d = nrm(V(-0.8, 0, 0.6 * zsgn))
            tip = lobe(base, d, 0.06, D * 0.1)
            fin(s, tip, d, V(0, 0, zsgn), 0.0, fan(13, -0.55, 0.45, 0.095, lambda t: 0.75 + 0.3 * math.sin(math.pi * t)), 0.0024)
        for sd in (-1, 1):
            # pectorals: long lobed paddles low behind the gill cover; pelvics on the belly
            for (x, zf, L0, Lf, dv) in ((0.24, -0.33, 0.065, 0.14, V(-0.9, sd * 0.25, -0.3)), (-0.03, -0.44, 0.05, 0.09, V(-0.85, sd * 0.25, -0.4))):
                base = V(x, sd * wid(x) * 0.78, mid(x) + D * zf)
                d = nrm(dv)
                tip = lobe(base, d, L0, D * 0.085)
                fin(s, tip, d, nrm(np.cross(d, V(0, sd, 0))), 0.0, fan(13, -0.45, 0.45, Lf, lambda t: 0.75 + 0.3 * math.sin(math.pi * t)), 0.0022)
        # the diphycercal tail: upper and lower lobes of rays running along the deep peduncle,
        # and the little central tassel at the end
        for zsgn in (1, -1):
            x0 = -0.25
            base = V(x0, 0, (top(x0) if zsgn > 0 else bot(x0)) - zsgn * 0.004)
            L = x0 - tailx
            rays = [(t, 0.75 + 0.55 * t, 0.03 + 0.055 * math.sin(math.pi * min(1, 0.1 + t * 0.95)) ** 0.7) for t in np.linspace(0, 1, 16)]
            fin(s, base, V(0, 0, zsgn), back, L * 1.02, rays, 0.003)
        tb = V(tailx + 0.005, 0, mid(tailx))
        s.cone(tb, V(tailx - 0.07, 0, mid(tailx)), sec[-1][1] * 0.55, D * 0.05, k=0.02, squash=(0.55, 1))
        fin(s, V(tailx - 0.07, 0, mid(tailx)), back, up, 0.0, fan(11, -1.0, 1.0, 0.045, lambda t: 0.75 + 0.35 * math.sin(math.pi * t)), 0.0018)
        c.paint_extra = 'coelacanth'
    else:
        dorsal = p.get('dorsal', 'single')
        if shark:
            for (x, h) in ((0.12, 0.14), (-0.12, 0.09)):
                b = V(x, 0, top(x) - 0.004)
                fin(s, b, up, back, 0.08, [(0, 0.55, h), (0.35, 0.75, h), (0.7, 1.1, h * 0.6), (1.0, 1.4, h * 0.25)], 0.006, edge=0.3, scallop=0.0, ray_k=0.0, label=SKIN)
                c.teeth.append(([b + V(0.03, 0, 0), b + V(0.012, 0, h * 0.6), b + V(-0.005, 0, h * 0.92)], [0.006, 0.004, 0.0008], 'body', '#d8d0b8'))
        elif bichir:
            for i in range(11):
                x = 0.17 - i * 0.045
                fin(s, V(x, 0, top(x) - 0.004), back, up, 0.0, [(0, 1.45, 0.045), (0, 1.0, 0.05), (0, 0.65, 0.045), (0, 0.35, 0.035)], 0.0018, scallop=0.15)
        elif lung:
            n = 10
            fin(s, V(-0.05, 0, top(-0.05) - 0.004), back, up, 0.0, [(0, 0.6 - 0.06 * i, 0.03 + 0.25 * i / n) for i in range(n)], 0.0018, scallop=0.05)
        elif dorsal != 'none':
            x0, x1 = (0.16, -0.2) if bowfin else (0.06, -0.05) if gar else (0.06, -0.07)
            rays = []
            n = 12 if bowfin else 8
            for i in range(n):
                t = i / (n - 1)
                rays.append((t, 1.1 - 0.5 * t, (0.06 if bowfin else 0.1) * (0.75 + 0.3 * math.sin(pi * (0.2 + t * 0.7)))))
            # the base runs back along the spine: build it in the plane of x and z
            fin(s, V(x0, 0, top(x0) - 0.005), up, V(-1, 0, 0), x0 - x1, [(t, 0.2 + 0.45 * t, L) for t, a, L in rays], 0.0022, scallop=0.12)
        # anal fin
        if not saw:
            xa = -0.17 if not gar else -0.1
            fin(s, V(xa, 0, bot(xa) + 0.004), dn, V(-1, 0, 0), 0.05, [(t, 0.3 + 0.4 * t, 0.07 * (0.8 + 0.3 * math.sin(pi * t))) for t in np.linspace(0, 1, 7)], 0.002, scallop=0.12)
        for sd in (-1, 1):  # paired fins
            if saw:
                s.plate(V(0.14, sd * W * 0.25, mid(0.14)), [(0.18, 0), (-0.08, 0), (-0.2, sd * W * 3.0), (-0.05, sd * W * 3.4), (0.1, sd * W * 2.4)], (1, 0, 0), (0, 1, 0), 0.008, 0.002, round_=0.002, k=0.03, label=SKIN)
                s.plate(V(-0.08, sd * W * 0.2, mid(-0.08)), [(0.05, 0), (-0.06, 0), (-0.12, sd * W * 1.6), (0.0, sd * W * 1.5)], (1, 0, 0), (0, 1, 0), 0.006, 0.002, round_=0.002, k=0.02, label=SKIN)
            elif lung:
                for (x, z, L) in ((0.22, -0.3, 0.14), (-0.06, -0.4, 0.11)):
                    b = V(x, sd * wid(x) * 0.8, mid(x) + D * z)
                    s.chain([b, b + V(-L * 0.4, sd * L * 0.25, -L * 0.2), b + V(-L * 0.8, sd * L * 0.35, -L * 0.3), b + V(-L, sd * L * 0.38, -L * 0.32)], [D * 0.07, D * 0.05, D * 0.03, D * 0.008], k=0.01)
            else:
                b = V(0.25, sd * wid(0.25) * 0.85, mid(0.25) - D * 0.22)
                fin(s, b, nrm(V(-0.7, sd * 0.45, -0.35)), nrm(V(0.2, 0, -1)), 0.0, fan(7, -0.7, 0.7, 0.075, lambda t: 0.8 + 0.25 * math.sin(pi * t)), 0.002, scallop=0.1)
                b = V(0.0, sd * wid(0.0) * 0.6, bot(0.0) + 0.006)
                fin(s, b, nrm(V(-0.7, sd * 0.4, -0.5)), nrm(V(0.3, 0, -1)), 0.0, fan(6, -0.6, 0.6, 0.06, lambda t: 0.8 + 0.25 * math.sin(pi * t)), 0.0018, scallop=0.1)
        tb = V(tailx + 0.01, 0, mid(tailx))
        if tail == 'shark':  # heterocercal: the spine runs up into the long upper lobe
            s.cone(tb, V(tailx - 0.17, 0, mid(tailx) + 0.08), D * 0.1, D * 0.025, k=0.02, squash=(0.5, 1))
            fin(s, tb, nrm(V(-1, 0, 0.45)), V(0, 0, -1), 0.0, [(0, a, L) for a, L in ((0.0, 0.19), (0.25, 0.15), (0.55, 0.08), (0.9, 0.08), (1.25, 0.12), (1.5, 0.1))], 0.003, edge=0.4, scallop=0.15)
        elif tail in ('round', 'eel', 'diphycercal'):
            Lt = 0.12 if tail == 'eel' else 0.16
            fin(s, tb, back, up, 0.0, fan(11, -1.3, 1.3, Lt, lambda t: 0.75 + 0.3 * math.sin(pi * t)), 0.0025, scallop=0.08)
        else:  # forked
            fin(s, tb, back, up, 0.0, [(0, a, L) for a, L in ((-1.05, 0.16), (-0.8, 0.15), (-0.5, 0.1), (-0.25, 0.07), (0.0, 0.06), (0.25, 0.07), (0.5, 0.1), (0.8, 0.15), (1.05, 0.16))], 0.0025, scallop=0.1)
    # ---------- rig ----------
    c.bone('body', V(0.12, 0, mid(0.12)), V(-0.05, 0, mid(-0.05)))
    c.bone('head', V(0.12, 0, mid(0.12)), V(nose, 0, mid(nose)), 'body')
    c.bone('jaw', jaw_pivot, jaw_tip, 'head')
    tpts = [V(x, 0, mid(x)) for x in (-0.05, -0.14, -0.23, tailx)] + [V(tailx - (0.08 if coel else 0.18), 0, mid(tailx))]
    for i in range(4):
        c.bone(f'tail{i}', tpts[i], tpts[i + 1], 'body' if i == 0 else f'tail{i - 1}')
    c.order = ['body', 'head', 'jaw', 'tail0', 'tail1', 'tail2', 'tail3']
    c.meta.update(tail=[f'tail{i}' for i in range(4)], neck=[], spine=['body'], head='head', jaw='jaw')
    c.spine = [(V(tailx - 0.2, 0, mid(tailx)), 'tail'), (V(tailx, 0, mid(tailx)), 'tail'), (V(0.0, 0, mid(0.0)), 'body'), (V(0.3, 0, mid(0.3)), 'head'), (V(nose + beak, 0, mid(nose)), 'head')]
    c.paint = dict(colors=colors, stripes=bool(p.get('bands')), bands=p.get('bands'), spots=p.get('spots'), fish=True,
                   scales='cosmoid' if coel else 'ganoid' if (gar or bichir) else 'denticle' if (shark or saw) else 'cycloid')
    return c
