# ==================== TWIG, BRANCHLET AND FROND CARDS ====================
# A tree drawn leaf by leaf would cost hundreds of thousands of quads; real-time forests draw
# whole twigs on one card instead. This composes those cards from the CC0 photo scans fetched by
# tools/fetch_flora.py: every scanned leaf, spray or frond is cut out of its atlas and laid along
# a little stem, rotated, scaled and shaded by its place on it, its normal map turned with it,
# so the card still lights like the leaves on it.
#   conifer_spray   branchlets of scale-leaf sprays (LeafSet019): the cheirolepid conifers
#   araucaria_twig  branchlets of needle sprigs (fir scan): the araucarias
#   broadleaf_twig  leafy twigs (island tree leaves): the early flowering trees
#   magnolia_twig   leafy twigs of broad leathery leaves (LeafSet022): gallery trees, ginkgo, shrubs
#   fern_frond      bipinnate fronds, each pinna a whole frond from the fern scan: tree ferns and ground ferns
#   cycad_leaf      stiff pinnate leaves of narrow leaflets (LeafSet013)
#   dead_frond      the brown skirt of old fronds a tree fern carries
#   horsetail       an Equisetum stem texture: ridges and dark joint sheaths (drawn, not composed)
# Each -> tools/.gen/cards/<name>_albedo.png (rgb + alpha) and <name>_normal.png, 2048 px,
# laid out in four cells (four twigs side by side, or four fronds standing in a row); the cells
# are listed in cards.json with each card's size in metres.
# Usage: python3 tools/compose_cards.py
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import binary_dilation, find_objects, label

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '.gen', 'flora_src')
OUT = os.path.join(HERE, '.gen', 'cards')  # tools/pack_flora.py packs them into the game
os.makedirs(OUT, exist_ok=True)
N = 2048


class Sprite:
    """One leaf, spray or frond cut from a scan, turned so its base is at the bottom and it points up."""

    def __init__(self, rgba, nrm):
        self.rgba, self.nrm = rgba, nrm
        self.h, self.w = rgba.shape[:2]


def sprites(name, base='bottom', min_area=0.004, max_fill=0.62):
    diff = np.asarray(Image.open(os.path.join(SRC, name, 'diff.jpg')).convert('RGB'), np.float32) / 255
    alpha = np.asarray(Image.open(os.path.join(SRC, name, 'alpha.jpg')).convert('L'), np.float32) / 255
    nor = np.asarray(Image.open(os.path.join(SRC, name, 'nor.jpg')).convert('RGB'), np.float32) / 255
    H = diff.shape[0]
    small = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((512, 512))) > 128
    lab, _ = label(binary_dilation(small, iterations=2))
    out = []
    for i, sl in enumerate(find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 512 * 512 * min_area:
            continue
        k = H / 512
        y0, y1, x0, x1 = int(sl[0].start * k), int(sl[0].stop * k), int(sl[1].start * k), int(sl[1].stop * k)
        m = (lab[sl] == i + 1)
        m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).resize((x1 - x0, y1 - y0), Image.NEAREST)) > 0
        a = alpha[y0:y1, x0:x1] * binary_dilation(m, iterations=3)
        rgba = np.dstack([diff[y0:y1, x0:x1], a])
        n = nor[y0:y1, x0:x1].copy()
        # principal axis of the cut-out, base end by the given rule, then stand it upright
        yy, xx = np.nonzero(a > 0.5)
        # skip solid pieces (bark strips and the like baked into the same atlas)
        if len(xx) < 50 or len(xx) > max_fill * a.size:
            continue
        c = np.array([xx.mean(), yy.mean()])
        cov = np.cov(np.vstack([xx - c[0], yy - c[1]]))
        ev, evec = np.linalg.eigh(cov)
        ax = evec[:, 1]  # (dx, dy) in image coordinates, y down
        proj = (xx - c[0]) * ax[0] + (yy - c[1]) * ax[1]
        lo, hi = c + ax * proj.min(), c + ax * proj.max()
        if base == 'bottom':
            b, t = (lo, hi) if lo[1] > hi[1] else (hi, lo)
        else:  # 'left'
            b, t = (lo, hi) if lo[0] < hi[0] else (hi, lo)
        ang = math.degrees(math.atan2(t[0] - b[0], -(t[1] - b[1])))  # clockwise from straight up
        out.append(_upright(rgba, n, ang))
    return out


def _upright(rgba, n, ang):
    """Rotate a cut-out by -ang degrees (so it points up), turning its normals with it, and trim it."""
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA').rotate(ang, Image.BICUBIC, expand=True)
    nm = Image.fromarray((np.clip(n, 0, 1) * 255).astype(np.uint8), 'RGB').rotate(ang, Image.BICUBIC, expand=True, fillcolor=(128, 128, 255))
    a = np.asarray(im, np.float32) / 255
    nv = np.asarray(nm, np.float32) / 255 * 2 - 1
    nv = _turn_normals(nv, math.radians(ang))
    ys, xs = np.nonzero(a[..., 3] > 0.05)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    return Sprite(a[sl], nv[sl])


def _turn_normals(nv, rad):
    """A picture turned anticlockwise by rad turns the tangent-space normals in it the same way
    (OpenGL convention: x right, y up)."""
    c, s = math.cos(rad), math.sin(rad)
    x, y = nv[..., 0].copy(), nv[..., 1].copy()
    nv[..., 0] = x * c - y * s
    nv[..., 1] = x * s + y * c
    return nv


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgba = np.zeros((h, w, 4), np.float32)
        self.nrm = np.zeros((h, w, 3), np.float32)
        self.nrm[..., 2] = 1

    def place(self, sp, base, ang, length, shade=1.0, tint=(1, 1, 1)):
        """Lay a sprite with its base at `base` (pixels), pointing `ang` degrees clockwise from up,
        `length` pixels long."""
        k = length / sp.h
        w, h = max(2, int(sp.w * k)), max(2, int(sp.h * k))
        im = Image.fromarray((sp.rgba * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)
        nm = Image.fromarray(((sp.nrm * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8), 'RGB').resize((w, h), Image.LANCZOS)
        # turn about the base point (bottom middle of the sprite)
        pad = Image.new('RGBA', (w, h * 2), (0, 0, 0, 0))
        pad.paste(im, (0, 0))
        padn = Image.new('RGB', (w, h * 2), (128, 128, 255))
        padn.paste(nm, (0, 0))
        im = pad.rotate(-ang, Image.BICUBIC, expand=True)
        nm = padn.rotate(-ang, Image.BICUBIC, expand=True, fillcolor=(128, 128, 255))
        a = np.asarray(im, np.float32) / 255
        nv = _turn_normals(np.asarray(nm, np.float32) / 255 * 2 - 1, math.radians(-ang))
        x0 = int(base[0] - a.shape[1] / 2)
        y0 = int(base[1] - a.shape[0] / 2)
        # clip to the canvas
        sx0, sy0 = max(0, -x0), max(0, -y0)
        dx0, dy0 = max(0, x0), max(0, y0)
        dx1, dy1 = min(self.w, x0 + a.shape[1]), min(self.h, y0 + a.shape[0])
        if dx1 <= dx0 or dy1 <= dy0:
            return
        src = a[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
        srcn = nv[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
        al = src[..., 3:4]
        dst = self.rgba[dy0:dy1, dx0:dx1]
        col = src[..., :3] * np.array(tint, np.float32) * shade
        dst[..., :3] = col * al + dst[..., :3] * (1 - al)
        dst[..., 3:4] = al + dst[..., 3:4] * (1 - al)
        dn = self.nrm[dy0:dy1, dx0:dx1]
        dn[:] = srcn * al + dn * (1 - al)

    def stem(self, pts, width, color):
        """A stem or rachis along a polyline, drawn under what is placed after it."""
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for i in range(len(pts) - 1):
            wd = max(1, int(width * (1 - 0.7 * i / len(pts))))
            d.line([tuple(pts[i]), tuple(pts[i + 1])], fill=tuple(int(c * 255) for c in color) + (255,), width=wd)
        a = np.asarray(im.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255
        al = a[..., 3:4]
        self.rgba[..., :3] = a[..., :3] * al + self.rgba[..., :3] * (1 - al)
        self.rgba[..., 3:4] = al + self.rgba[..., 3:4] * (1 - al)

    def blit(self, other, x, y):
        self.rgba[y:y + other.h, x:x + other.w] = other.rgba
        self.nrm[y:y + other.h, x:x + other.w] = other.nrm

    def save(self, name):
        # the colour is accumulated premultiplied; fill the see-through texels from their neighbours
        # so mipmaps don't fringe dark
        a = self.rgba[..., 3]
        prem = Image.fromarray((np.clip(self.rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')
        blur = np.asarray(prem.filter(ImageFilter.GaussianBlur(12)), np.float32) / 255
        fill = blur[..., :3] / np.maximum(blur[..., 3:], 1e-3)
        rgb = np.where(a[..., None] > 0.02, self.rgba[..., :3] / np.maximum(a[..., None], 1e-3), fill)
        out = np.dstack([np.clip(rgb, 0, 1), a])
        Image.fromarray((out * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '_albedo.png'))
        n = self.nrm / np.maximum(np.linalg.norm(self.nrm, axis=-1, keepdims=True), 1e-6)
        Image.fromarray(((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, name + '_normal.png'))


def curve(p0, ang, length, bend, n=24):
    """Points along a gently bending axis from p0, starting `ang` degrees clockwise from up."""
    pts, p, a = [], np.array(p0, np.float32), math.radians(ang)
    step = length / n
    for i in range(n + 1):
        pts.append(p.copy())
        p = p + step * np.array([math.sin(a), -math.cos(a)])
        a += math.radians(bend) / n
    return np.array(pts)


def at(pts, t):
    """Point and heading (degrees clockwise from up) at fraction t along a polyline."""
    i = min(int(t * (len(pts) - 1)), len(pts) - 2)
    f = t * (len(pts) - 1) - i
    p = pts[i] * (1 - f) + pts[i + 1] * f
    d = pts[i + 1] - pts[i]
    return p, math.degrees(math.atan2(d[0], -d[1]))


# ---------------------------------------------------------------------------------- twigs
def twig(cell, leaves, rng, n_leaves, angle, length_px, leaf_px, stem_col, droop=0.0, terminal=True, pair=False, tint=(1, 1, 1)):
    """A twig in one square cell: leaves along a bending stem, smaller toward the tip."""
    c = Canvas(cell, cell)
    axis = curve((cell * 0.5 + rng.uniform(-0.05, 0.05) * cell, cell * 0.98), rng.uniform(-8, 8), length_px, rng.uniform(-25, 25))
    c.stem(axis, max(2, cell * 0.006), stem_col)
    for i in range(n_leaves):
        t = 0.12 + 0.82 * (i / max(1, n_leaves - 1))
        p, head = at(axis, t)
        sides = (-1, 1) if pair else ((-1) ** i,)
        for side in sides:
            a = head + side * (angle + rng.uniform(-12, 12)) + droop * side
            ln = leaf_px * (1.0 - 0.35 * t) * rng.uniform(0.85, 1.15)
            c.place(leaves[rng.integers(len(leaves))], p, a, ln, shade=0.72 + 0.28 * t + rng.uniform(-0.06, 0.06), tint=tint)
    if terminal:
        p, head = at(axis, 1.0)
        c.place(leaves[rng.integers(len(leaves))], p - 2, head + rng.uniform(-10, 10), leaf_px * 0.8, shade=1.0, tint=tint)
    return c


def twig_atlas(name, leaves, seed, **kw):
    rng = np.random.default_rng(seed)
    atlas = Canvas(N, N)
    half = N // 2
    for k in range(4):
        atlas.blit(twig(half, leaves, rng, **kw), (k % 2) * half, (k // 2) * half)
    atlas.save(name)


# ---------------------------------------------------------------------------------- fronds
def frond(w, h, pinnae, rng, n, angle, width_px, rachis_col, profile, curl=0.0, gap=0.0, tint=(1, 1, 1), keep=1.0):
    """A pinnate frond standing in a w x h cell: pinnae in pairs along a rachis from the base."""
    c = Canvas(w, h)
    axis = curve((w * 0.5, h * 0.995), rng.uniform(-3, 3), h * 0.97, rng.uniform(-10, 10))
    c.stem(axis, max(2, w * 0.018), rachis_col)
    for i in range(n):
        t = 0.04 + 0.93 * i / (n - 1)
        p, head = at(axis, t)
        size = profile(t)
        for side in (-1, 1):
            if rng.random() > keep:
                continue
            a = head + side * (angle - curl * t + rng.uniform(-5, 5))
            ln = width_px * size * rng.uniform(0.9, 1.1)
            if ln < 4:
                continue
            c.place(pinnae[rng.integers(len(pinnae))], p + np.array([0, gap]), a, ln, shade=0.75 + 0.25 * t, tint=tint)
    return c


def frond_atlas(name, pinnae, seed, **kw):
    rng = np.random.default_rng(seed)
    atlas = Canvas(N, N)
    w = N // 4
    for k in range(4):
        atlas.blit(frond(w, N, pinnae, rng, **kw), k * w, 0)
    atlas.save(name)


def lanceolate(t):
    """Pinna length along a fern frond: short at the base, widest a third of the way up, to a tip."""
    return max(0.0, math.sin(math.pi * min(1.0, t ** 0.75)) ** 0.8) * (1 - 0.25 * t)


def cycad_profile(t):
    return 0.55 + 0.45 * math.sin(math.pi * min(1.0, t * 0.9 + 0.1)) if t < 0.96 else 0.3


def horsetail():
    """An Equisetum stem, unrolled: fine green ridges, a dark sheath at every joint."""
    h, w = 1024, 256
    y = np.arange(h)[:, None] / h
    x = np.arange(w)[None, :] / w
    rng = np.random.default_rng(9)
    ridges = 0.5 + 0.5 * np.sin(x * 2 * np.pi * 14)
    seg = (y * 4) % 1.0  # four joints per repeat
    sheath = np.clip(1 - seg / 0.06, 0, 1) + np.clip((seg - 0.97) / 0.03, 0, 1)
    base = np.array([0.33, 0.45, 0.18])
    col = base[None, None] * (0.78 + 0.22 * ridges[..., None]) * (0.9 + 0.1 * rng.random((h, w, 1)))
    col = col * (1 - sheath[..., None] * 0.65) + np.array([0.12, 0.1, 0.06]) * sheath[..., None] * 0.65
    Image.fromarray((np.clip(np.broadcast_to(col, (h, w, 3)), 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'horsetail_albedo.png'))
    nx = np.cos(x * 2 * np.pi * 14) * 0.35
    n = np.dstack([np.broadcast_to(nx, (h, w)), -np.broadcast_to(np.gradient(sheath, axis=0) * 8, (h, w)), np.ones((h, w))])
    n = n / np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(os.path.join(OUT, 'horsetail_normal.png'))


def main():
    horsetail()
    sprays = sprites('LeafSet019', base='left')
    firs = [s for s in sprites('fir_tree_01_twig') if s.h > 150][:5]
    island = sprites('island_tree_01_leaves')
    magnolia = sprites('LeafSet022')
    fern = sprites('fern_02')
    leaflets = sprites('LeafSet013')
    print('sprites', len(sprays), len(firs), len(island), len(magnolia), len(fern), len(leaflets))
    brown = (0.27, 0.2, 0.13)
    twig_atlas('conifer_spray', sprays, 1, n_leaves=11, angle=48, length_px=N * 0.42, leaf_px=N * 0.2, stem_col=brown, droop=10)
    twig_atlas('araucaria_twig', firs, 2, n_leaves=12, angle=55, length_px=N * 0.44, leaf_px=N * 0.15, stem_col=brown, pair=True)
    twig_atlas('broadleaf_twig', island, 3, n_leaves=9, angle=50, length_px=N * 0.38, leaf_px=N * 0.13, stem_col=(0.3, 0.24, 0.15),
               tint=(0.82, 0.98, 0.72))
    twig_atlas('magnolia_twig', magnolia, 4, n_leaves=7, angle=55, length_px=N * 0.36, leaf_px=N * 0.15, stem_col=(0.3, 0.24, 0.15))
    frond_atlas('fern_frond', fern, 5, n=38, angle=78, width_px=N * 0.12, rachis_col=(0.24, 0.2, 0.1),
                profile=lanceolate, curl=18)
    frond_atlas('cycad_leaf', leaflets, 6, n=40, angle=62, width_px=N * 0.1, rachis_col=(0.3, 0.3, 0.14), profile=cycad_profile, curl=8,
                tint=(0.5, 0.72, 0.42))
    frond_atlas('dead_frond', fern, 7, n=30, angle=40, width_px=N * 0.1, rachis_col=(0.2, 0.14, 0.08), profile=lanceolate,
                curl=-10, tint=(0.62, 0.45, 0.26), keep=0.7)
    cards = {
        'conifer_spray': {'cells': 'twig4', 'size': 1.6}, 'araucaria_twig': {'cells': 'twig4', 'size': 1.4},
        'broadleaf_twig': {'cells': 'twig4', 'size': 1.1}, 'magnolia_twig': {'cells': 'twig4', 'size': 1.2},
        'fern_frond': {'cells': 'frond4', 'size': 1.0}, 'cycad_leaf': {'cells': 'frond4', 'size': 1.0},
        'dead_frond': {'cells': 'frond4', 'size': 1.0},
    }
    json.dump(cards, open(os.path.join(OUT, 'cards.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
