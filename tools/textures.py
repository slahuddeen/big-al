# ==================== PROCEDURAL TEXTURES FOR THE GODOT PORT ====================
# The painted textures of the Godot Spino, drawn here with no source images (the ground and the
# ground clutter are photo scans instead: tools/fetch_polyhaven.py):
#   foliage_atlas.png   4x4 atlas of leaf cards (conifer sprays, araucaria tufts, broadleaf
#                       sprigs, ginkgo fans, fern and cycad fronds, grasses, reeds, horsetail
#                       whorls, flowers, lily pads, hanging moss, litter, shrub leaves)
#   bark_*.png          tiling bark albedo (+ height in alpha) and normal maps
#   skin_*.png          the shared reptile skin detail: scale normal map and mottling
#   water_n.png         tiling ripples for the water shader
# All tiling maps come from FFT-filtered noise and wrapped Voronoi, so they repeat seamlessly.
# Run: python3 tools/textures.py
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'godot', 'textures')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- tiling noise
def fnoise(n, scale, power=2.0, seed=0, aniso=(1.0, 1.0)):
    """Periodic fractal noise in [0, 1]: white noise shaped in the frequency domain."""
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f * aniso[0], f * aniso[1])
    k = np.sqrt(fx * fx + fy * fy) * n / scale
    amp = 1.0 / (1.0 + k ** power)
    amp[0, 0] = 0
    spec = (r.normal(size=(n, n)) + 1j * r.normal(size=(n, n))) * amp
    v = np.real(np.fft.ifft2(spec))
    v = (v - v.min()) / (v.max() - v.min() + 1e-9)
    return v


def voronoi(n, cells, seed=0, jitter=1.0, hexy=False):
    """Wrapped Voronoi: distance to nearest and second nearest feature point, and cell id."""
    r = np.random.default_rng(seed)
    g = int(math.sqrt(cells))
    pts = []
    for j in range(g):
        for i in range(g):
            ox = 0.5 * (j % 2) if hexy else 0.0
            pts.append(((i + ox + 0.5 + (r.random() - 0.5) * jitter) / g, (j + 0.5 + (r.random() - 0.5) * jitter) / g))
    pts = np.array(pts) % 1.0
    ys, xs = np.mgrid[0:n, 0:n] / n
    d1 = np.full((n, n), 9.0)
    d2 = np.full((n, n), 9.0)
    idx = np.zeros((n, n), np.int32)
    for k, (px, py) in enumerate(pts):
        dx = np.abs(xs - px)
        dx = np.minimum(dx, 1 - dx)
        dy = np.abs(ys - py)
        dy = np.minimum(dy, 1 - dy)
        d = np.sqrt(dx * dx + dy * dy) * g
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        idx = np.where(closer, k, idx)
        d1 = np.where(closer, d, d1)
    return d1, d2, idx


def normal_from_height(h, strength):
    """Tangent-space normal map (OpenGL convention, +y up) from a periodic height field."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nz = np.ones_like(h)
    l = np.sqrt(dx * dx + dy * dy + nz * nz)
    nx, ny, nz = -dx / l, dy / l, nz / l
    return np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5], -1)


def save_rgb(name, arr):
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, name))


def save_rgba(name, rgb, a):
    Image.fromarray((np.clip(np.dstack([rgb, a]), 0, 1) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name))


def lerp(a, b, t):
    t = t[..., None] if np.ndim(t) == 2 else t
    return np.asarray(a) * (1 - t) + np.asarray(b) * t


def hexc(h):
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]) / 255.0


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- bark
def bark():
    n = 512
    # conifer: deep vertical furrows and plates
    fur = fnoise(n, 30, 1.4, 21, aniso=(1.0, 0.08))
    plates = fnoise(n, 14, 1.8, 22, aniso=(1.0, 0.3))
    h = smooth(0.25, 0.75, 0.65 * fur + 0.35 * plates)
    col = lerp(hexc('#3a2618'), hexc('#8a5c38'), h) * (0.85 + 0.3 * fnoise(n, 120, 1, 23))[..., None]
    save_rgba('bark_conifer.png', col, h)
    save_rgb('bark_conifer_n.png', normal_from_height(h, 8))
    # smooth broadleaf bark: grey-brown with lenticels and lichen
    base = fnoise(n, 8, 2, 24)
    len_ = smooth(0.8, 0.86, fnoise(n, 90, 1.2, 25, aniso=(0.3, 1.0)))
    col = lerp(hexc('#5e5244'), hexc('#8e8270'), base)
    col = lerp(col, hexc('#b8b48a'), smooth(0.72, 0.8, fnoise(n, 16, 1.6, 26)) * 0.5)
    col = lerp(col, hexc('#3a3026'), len_ * 0.8)
    h = 0.6 * base + 0.4 * (1 - len_)
    save_rgba('bark_smooth.png', col, h)
    save_rgb('bark_smooth_n.png', normal_from_height(h, 4))
    # cycad: diamond pattern of old leaf bases
    ys, xs = np.mgrid[0:n, 0:n] / n
    u, v = xs * 8 + ys * 8, xs * 8 - ys * 8
    du = np.abs((u % 1) - 0.5)
    dv = np.abs((v % 1) - 0.5)
    diamond = 1 - smooth(0.32, 0.5, np.maximum(du, dv))
    col = lerp(hexc('#4a3420'), hexc('#9a7444'), diamond * (0.7 + 0.3 * fnoise(n, 40, 1.5, 27)))
    h = diamond
    save_rgba('bark_cycad.png', col, h)
    save_rgb('bark_cycad_n.png', normal_from_height(h, 10))
    # tree fern: dark fibrous mat of roots
    fib = fnoise(n, 160, 0.9, 28, aniso=(1.0, 0.05))
    col = lerp(hexc('#1e160e'), hexc('#5a4228'), fib) * (0.8 + 0.4 * fnoise(n, 10, 2, 29))[..., None]
    save_rgba('bark_fern.png', col, fib)
    save_rgb('bark_fern_n.png', normal_from_height(fib, 6))


# ---------------------------------------------------------------- skin
def skin():
    n = 1024
    # reptile scales: a hexagonal pavement of small domed scales, larger ones in rows,
    # and creases running across them
    d1, d2, idx = voronoi(n, 6400, 31, 0.55, hexy=True)
    dome = np.sqrt(np.clip(1 - (d1 / 0.62) ** 2, 0, 1))
    edge = smooth(0.0, 0.12, d2 - d1)
    h = dome * 0.6 + edge * 0.4
    big1, big2, _ = voronoi(n, 900, 32, 0.7, hexy=True)
    bigdome = np.sqrt(np.clip(1 - (big1 / 0.7) ** 2, 0, 1)) * smooth(0.0, 0.08, big2 - big1)
    rows = smooth(0.55, 0.7, fnoise(n, 6, 2.2, 33))
    h = np.maximum(h * 0.8, bigdome * rows)
    wrinkle = fnoise(n, 40, 1.4, 34, aniso=(0.15, 1.0))
    h = h * 0.85 + smooth(0.6, 0.9, wrinkle) * 0.15
    save_rgb('skin_scales_n.png', normal_from_height(h, 7))
    # mottling for the hide: blotches, speckles and a little hue shift (r, g, b used separately)
    m1 = fnoise(n, 5, 2.2, 35)
    m2 = fnoise(n, 40, 1.6, 36)
    m3 = smooth(0.0, 0.2, d2 - d1) * (0.5 + 0.5 * np.random.default_rng(37).random(6400)[idx])
    save_rgb('skin_mottle.png', np.dstack([m1, m2, m3]))


def fish_scales():
    """Imbricate scales: rows of round scales, each overlapping the one behind it, so only
    its rear crescent shows. Cosmoid (coelacanth) scales carry rows of little tubercles."""
    n = 512
    rows, cols = 8, 8
    ys, xs = np.mgrid[0:n, 0:n] / n
    best = np.full((n, n), -1e9)
    h = np.zeros((n, n))
    r = 0.62 / cols
    for j in range(rows + 1):
        for i in range(-1, cols + 1):
            cx = (i + 0.5 * (j % 2)) / cols
            cy = j / rows
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    dx = xs - (cx + ox)
                    dy = ys - (cy + oy)
                    d = np.sqrt(dx * dx + dy * dy) / r
                    inside = d < 1.0
                    # the scale further forward (smaller x) lies on top
                    pri = -(cx + ox) * 10
                    take = inside & (pri > best)
                    best = np.where(take, pri, best)
                    dome = np.clip(1 - d, 0, 1) ** 0.5 * 0.6 + np.clip(dx / r, 0, 1) * 0.5
                    h = np.where(take, dome, h)
    tub = fnoise(n, 90, 1.0, 61)
    h = h * 0.85 + smooth(0.6, 0.8, tub) * 0.12 * (h > 0.2)
    Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8), 'L').save(os.path.join(OUT, 'fish_scales_h.png'))
    # ganoid: rhombic plates in diagonal rows, each with a raised enamel face
    u = (xs + ys) * 7
    v = (xs - ys) * 7
    fu = np.abs((u % 1) - 0.5)
    fv = np.abs((v % 1) - 0.5)
    e = np.maximum(fu, fv)
    g = smooth(0.5, 0.36, e) * (0.8 + 0.2 * fnoise(n, 40, 1.4, 62))
    Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8), 'L').save(os.path.join(OUT, 'ganoid_scales_h.png'))


def water():
    n = 512
    h = 0.6 * fnoise(n, 10, 2.4, 41) + 0.4 * fnoise(n, 32, 2.0, 42)
    save_rgb('water_n.png', normal_from_height(h, 5))
    h2 = 0.5 * fnoise(n, 6, 2.6, 43) + 0.5 * fnoise(n, 20, 2.2, 44)
    save_rgb('water_n2.png', normal_from_height(h2, 4))


# ---------------------------------------------------------------- foliage atlas
CELL = 512
S = 2  # supersampling


def cell_canvas():
    return Image.new('RGBA', (CELL * S, CELL * S), (0, 0, 0, 0))


def leaf_poly(L, W, kind='ovate', n=24):
    right = []
    for i in range(n + 1):
        t = i / n
        if kind == 'lance':
            w = math.sin(math.pi * t ** 0.62) ** 1.1
        elif kind == 'needle':
            w = 1.0 if t < 0.85 else (1 - (t - 0.85) / 0.15)
        elif kind == 'fan':
            w = t ** 0.6
        else:
            w = math.sin(math.pi * t ** 0.72) ** 0.85
        right.append((w * W, t * L))
    left = [(-x, y) for x, y in reversed(right)]
    return right + left


def place(poly, x, y, ang, sx=1.0):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(x + (px * sx) * ca - py * sa, y + (px * sx) * sa + py * ca) for px, py in poly]


def col255(h, k=1.0, a=255):
    c = hexc(h) * k
    return tuple(int(v) for v in np.clip(c * 255, 0, 255)) + (a,)


def draw_conifer(d, r):
    # a podocarp spray: a woody twig up the middle, side shoots, and flat needles in two
    # ranks along all of them, dense enough to read as a fluffy mass of foliage
    cx, base, top = CELL * S / 2, CELL * S * 0.98, CELL * S * 0.03
    shoots = [(cx, base, cx, top, 1.0)]
    for k in range(9):
        y0 = base - (base - top) * (0.08 + k * 0.1)
        ang = (-1) ** k * (0.62 + r.random() * 0.25)
        L = (base - top) * (0.5 - k * 0.04)
        shoots.append((cx, y0, cx + math.sin(ang) * L, y0 - math.cos(ang) * L, 0.75))
    for (x0, y0, x1, y1, w) in shoots:
        d.line([(x0, y0), (x1, y1)], fill=col255('#5a3e26'), width=int(7 * w))
    for (x0, y0, x1, y1, w) in shoots:
        ang = math.atan2(x1 - x0, -(y1 - y0))
        n = 34
        for k in range(n):
            t = k / n
            px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for sd in (-1, 1):
                a = math.pi + ang + sd * (1.25 - t * 0.35) + r.normal() * 0.08
                needle = leaf_poly(84 * w * (1 - t * 0.45) * (0.8 + 0.4 * r.random()), 5, 'needle')
                d.polygon(place(needle, px, py, a), fill=col255('#2f6a2c', 0.72 + 0.5 * r.random()))


def draw_araucaria(d, r):
    # araucaria branchlets: thick ropes of overlapping spiky scale leaves
    cx = CELL * S / 2
    for strand in range(4):
        x0 = cx + (strand - 1.5) * 150
        pts = [(x0 + math.sin(t * 2.5 + strand) * 50, CELL * S * (0.98 - t * 0.94)) for t in np.linspace(0, 1, 70)]
        for i, (px, py) in enumerate(pts):
            t = i / 70
            w = 80 * (1 - t * 0.5)
            for k in range(7):
                a = math.pi + (k - 3) * 0.42 + r.normal() * 0.1
                scale = leaf_poly(w * 1.2, w * 0.3, 'lance')
                d.polygon(place(scale, px, py, a), fill=col255('#2c6430', 0.65 + 0.55 * r.random()))


def draw_broadleaf(d, r, base_col='#3f7c34'):
    cx = CELL * S / 2
    d.line([(cx, CELL * S), (cx, CELL * S * 0.1)], fill=col255('#4a3622'), width=7)
    for k in range(9):
        t = k / 9
        py = CELL * S * (0.92 - t * 0.78)
        sd = (-1) ** k
        a = math.pi + sd * (0.8 - t * 0.4)
        L = CELL * S * (0.36 - t * 0.12)
        leaf = leaf_poly(L, L * 0.32, 'ovate')
        c = col255(base_col, 0.75 + 0.5 * r.random())
        d.polygon(place(leaf, cx, py, a), fill=c)
        # midrib
        e = place([(0, 0), (0, L * 0.9)], cx, py, a)
        d.line(e, fill=col255(base_col, 1.35), width=3)
    leaf = leaf_poly(CELL * S * 0.3, CELL * S * 0.1)
    d.polygon(place(leaf, cx, CELL * S * 0.14, math.pi), fill=col255(base_col, 1.1))


def draw_ginkgo(d, r):
    cx = CELL * S / 2
    for k in range(11):
        a = math.pi + (k - 5) * 0.3 + r.normal() * 0.08
        L = CELL * S * (0.3 + r.random() * 0.12)
        x0 = cx + (k - 5) * 14
        y0 = CELL * S * 0.98
        tip = place([(0, L * 0.55)], x0, y0, a)[0]
        d.line([(x0, y0), tip], fill=col255('#6a8a2a'), width=4)
        fan = []
        for t in np.linspace(-0.75, 0.75, 20):
            rr = L * 0.48 * (0.92 + 0.08 * math.cos(t * 9)) * (0.85 if abs(t) < 0.06 else 1)
            fan.append((math.sin(t) * rr, L * 0.5 + math.cos(t) * rr))
        poly = [(0, L * 0.5)] + fan
        d.polygon(place(poly, x0, y0, a), fill=col255('#7dbb44', 0.75 + 0.5 * r.random()))


def draw_frond(d, r, color='#4f9e38', pinna=36, cycad=False):
    # a pinnate frond: rachis up the middle, leaflets either side shortening to the tip
    cx = CELL * S / 2
    y0, y1 = CELL * S * 0.99, CELL * S * 0.02
    d.line([(cx, y0), (cx, y1)], fill=col255('#4e6a26'), width=6)
    for k in range(pinna):
        t = k / pinna
        py = y0 + (y1 - y0) * (0.04 + t * 0.94)
        env = math.sin(math.pi * min(1, 0.15 + t * 0.95)) ** (0.9 if not cycad else 0.5)
        L = CELL * S * 0.46 * env
        for sd in (-1, 1):
            a = math.pi + sd * (1.15 if cycad else 1.0) - sd * t * 0.3
            if cycad:
                leaf = leaf_poly(L, 7, 'needle')
            else:
                leaf = []
                for i in range(15):  # lobed pinnae
                    tt = i / 14
                    w = (11 + 6 * abs(math.sin(tt * 18))) * (1 - tt * 0.7)
                    leaf.append((w, tt * L))
                leaf = leaf + [(-x, y) for x, y in reversed(leaf)]
            d.polygon(place(leaf, cx, py, a), fill=col255(color, 0.72 + 0.5 * r.random()))


def draw_grass(d, r, color='#8fb84a', blades=26, reed=False):
    for k in range(blades):
        x0 = CELL * S * (0.3 + r.random() * 0.4)
        lean = (r.random() - 0.5) * 0.9
        L = CELL * S * (0.55 + r.random() * 0.43)
        W = 9 + r.random() * 8 if not reed else 14 + r.random() * 8
        pts = []
        for t in np.linspace(0, 1, 18):
            bend = lean * t * t * L * 0.6
            pts.append((x0 + bend + W * (1 - t), CELL * S - t * L))
        for t in np.linspace(1, 0, 18):
            bend = lean * t * t * L * 0.6
            pts.append((x0 + bend - W * (1 - t), CELL * S - t * L))
        d.polygon(pts, fill=col255(color, 0.65 + 0.6 * r.random()))
    if reed:
        for k in range(4):  # seed heads
            x = CELL * S * (0.35 + r.random() * 0.3)
            y = CELL * S * (0.06 + r.random() * 0.1)
            d.ellipse([x - 12, y, x + 12, y + 110], fill=col255('#7a5a32', 0.8 + 0.3 * r.random()))


def draw_horsetail(d, r):
    cx = CELL * S / 2
    d.line([(cx, CELL * S), (cx, 0)], fill=col255('#5e8a2e'), width=16)
    for k in range(9):
        y = CELL * S * (0.95 - k * 0.11)
        d.line([(cx - 10, y), (cx + 10, y)], fill=col255('#2e4a1a'), width=6)
        for j in range(16):
            a = math.pi + (j - 7.5) / 7.5 * 1.3
            L = 150 * (1 - k * 0.07)
            p = place([(0, 0), (0, L)], cx, y, a)
            d.line(p, fill=col255('#6f9a36', 0.8 + 0.3 * r.random()), width=4)


def draw_flowers(d, r):
    # early flowering plants: little magnolia-like cups on thin stems with a few leaves
    for k in range(7):
        x0 = CELL * S * (0.2 + r.random() * 0.6)
        y = CELL * S * (0.12 + r.random() * 0.3)
        d.line([(x0, CELL * S), (x0 + (r.random() - 0.5) * 60, y)], fill=col255('#5a7a2a'), width=6)
        for j in range(2):
            leaf = leaf_poly(90, 26)
            d.polygon(place(leaf, x0, CELL * S * (0.7 - j * 0.15), math.pi + (-1) ** j * 0.9), fill=col255('#5a8a34', 0.8 + 0.3 * r.random()))
    for k in range(7):
        x = CELL * S * (0.2 + r.random() * 0.6)
        y = CELL * S * (0.12 + r.random() * 0.3)
        for p in range(7):
            a = p / 7 * math.tau
            petal = leaf_poly(58, 22)
            d.polygon(place(petal, x, y, a), fill=(250, 248, 240, 255))
        d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=col255('#e8c040'))


def draw_lily(d, r):
    c = CELL * S / 2
    R = CELL * S * 0.47
    pts = []
    for a in np.linspace(0.18, math.tau - 0.18, 64):
        pts.append((c + math.cos(a) * R, c + math.sin(a) * R))
    pts.append((c, c))
    d.polygon(pts, fill=col255('#4e8a3a'))
    for a in np.linspace(0.3, math.tau - 0.3, 14):
        d.line([(c, c), (c + math.cos(a) * R * 0.95, c + math.sin(a) * R * 0.95)], fill=col255('#6aa04a'), width=5)
    d.ellipse([c - R * 0.98, c - R * 0.98, c + R * 0.98, c + R * 0.98], outline=col255('#3a6a2a'), width=10)


def draw_moss(d, r):
    for k in range(40):
        x = CELL * S * (0.05 + r.random() * 0.9)
        L = CELL * S * (0.4 + r.random() * 0.58)
        pts = [(x + math.sin(t * 7 + k) * 10, t * L) for t in np.linspace(0, 1, 30)]
        d.line(pts, fill=col255('#8a9a6a', 0.7 + 0.5 * r.random()), width=int(5 + r.random() * 8))


def draw_litter(d, r):
    for k in range(14):
        x, y = CELL * S * (0.15 + r.random() * 0.7), CELL * S * (0.15 + r.random() * 0.7)
        leaf = leaf_poly(170, 52)
        d.polygon(place(leaf, x, y, r.random() * math.tau), fill=col255(['#8a6232', '#a07a3c', '#6a4a26'][k % 3], 0.8 + 0.4 * r.random()))


def draw_shrub(d, r):
    for k in range(70):
        x, y = CELL * S * (0.08 + r.random() * 0.84), CELL * S * (0.08 + r.random() * 0.84)
        leaf = leaf_poly(80 + r.random() * 50, 28)
        d.polygon(place(leaf, x, y, r.random() * math.tau), fill=col255('#4f8a34', 0.65 + 0.55 * r.random()))


def draw_treefern(d, r):
    draw_frond(d, r, '#3e8a2c', pinna=30)


def atlas():
    r = np.random.default_rng(51)
    cells = [
        lambda d: draw_conifer(d, r), lambda d: draw_araucaria(d, r), lambda d: draw_broadleaf(d, r), lambda d: draw_ginkgo(d, r),
        lambda d: draw_frond(d, r), lambda d: draw_frond(d, r, '#3f7a2c', 26, cycad=True), lambda d: draw_grass(d, r), lambda d: draw_grass(d, r, '#9aa858', 12, reed=True),
        lambda d: draw_horsetail(d, r), lambda d: draw_flowers(d, r), lambda d: draw_lily(d, r), lambda d: draw_moss(d, r),
        lambda d: draw_litter(d, r), lambda d: draw_shrub(d, r), lambda d: draw_treefern(d, r), lambda d: draw_broadleaf(d, r, '#2f6a2e'),
    ]
    A = Image.new('RGBA', (CELL * 4, CELL * 4), (0, 0, 0, 0))
    for i, fn in enumerate(cells):
        im = cell_canvas()
        fn(ImageDraw.Draw(im))
        im = im.resize((CELL, CELL), Image.LANCZOS)
        A.paste(im, ((i % 4) * CELL, (i // 4) * CELL))
    # bleed the colours under transparent texels so mipmaps don't fringe
    arr = np.asarray(A).astype(np.float32) / 255
    rgb, a = arr[..., :3], arr[..., 3:]
    acc, wacc = rgb * a, a.copy()
    blur = Image.fromarray((np.clip(np.dstack([acc, wacc]), 0, 1) * 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(6))
    b = np.asarray(blur).astype(np.float32) / 255
    fill = b[..., :3] / np.maximum(b[..., 3:], 1e-3)
    out = np.where(a > 0.5, rgb, fill)
    Image.fromarray((np.clip(np.dstack([out, a]), 0, 1) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'foliage_atlas.png'))


if __name__ == '__main__':
    import sys
    if 'atlas' in sys.argv:
        atlas()
        sys.exit()
    if 'fish' in sys.argv:
        fish_scales()
        sys.exit()
    bark()
    skin()
    water()
    fish_scales()
    atlas()
    print('textures written to', OUT)
