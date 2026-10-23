# ==================== SIGNED-DISTANCE SCULPTING ====================
# The animals are sculpted as signed distance fields, the way a digital sculptor blocks out
# forms: muscle masses, bones and fins as primitives melted together with smooth unions, and
# sockets, fenestrae, grooves and the mouth line carved with smooth subtractions. Every
# primitive carries an anatomy label (skin, mouth, membrane, armour...) that the paint uses.
# Evaluation is compiled with numba and done in a narrow band around the surface, then the
# zero level is meshed with marching cubes.
import math
import numpy as np
from numba import njit, prange
from skimage.measure import marching_cubes
from scipy.ndimage import zoom

# primitive kinds
ELLIPSOID, CONE, PLATE, BOX = 0, 1, 2, 3
# operations
UNION, SUBTRACT = 0, 1
# labels
SKIN, MOUTH, MEMBRANE, ARMOUR, KERATIN, GUM, CREST, LIMB = 0, 1, 2, 3, 4, 5, 6, 7
NP = 64  # floats per primitive


def frame(x_axis, up=(0, 0, 1)):
    """Rotation whose local x runs along x_axis (local z as close to `up` as possible)."""
    x = np.asarray(x_axis, float)
    x = x / (np.linalg.norm(x) + 1e-12)
    u = np.asarray(up, float)
    y = np.cross(u, x)
    if np.linalg.norm(y) < 1e-6:
        y = np.cross((0, 1, 0), x)
    y /= np.linalg.norm(y)
    z = np.cross(x, y)
    return np.stack([x, y, z])  # rows: world -> local


class Sculpt:
    def __init__(self):
        self.prims = []

    def _add(self, kind, op, k, label, center, rot, scale, params):
        a = np.zeros(NP)
        a[0], a[1], a[2], a[3] = kind, op, k, label
        a[4:7] = center
        R = np.asarray(rot, float)
        S = np.asarray(scale, float)
        M = (np.diag(1.0 / S) @ R)  # world offset -> local (scaled) coordinates
        a[7:16] = M.reshape(-1)
        a[16] = 1.0 / np.max(1.0 / S)  # local distance -> world (conservative)
        p = np.asarray(params, float)
        a[20:20 + len(p)] = p
        # a bounding radius for culling
        a[17] = self._bound(kind, p) * np.max(S)
        self.prims.append(a)

    @staticmethod
    def _bound(kind, p):
        if kind == ELLIPSOID:
            return max(p[0], p[1], p[2])
        if kind == CONE:
            return p[0] + max(p[1], p[2])
        if kind == PLATE:
            n = int(p[0])
            pts = p[3:3 + 2 * n].reshape(-1, 2)
            return float(np.max(np.linalg.norm(pts, axis=1))) + abs(p[1]) + abs(p[2]) + p[3] + 0.005
        if kind == BOX:
            return math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2) + p[3]
        return 1.0

    # an ellipsoid at c with radii r, its x axis along `axis`
    def ellipsoid(self, c, r, axis=(1, 0, 0), up=(0, 0, 1), k=0.02, label=SKIN, op=UNION):
        self._add(ELLIPSOID, op, k, label, c, frame(axis, up), (1, 1, 1), r)

    # a round cone from a (radius ra) to b (radius rb); `squash` = (lateral, vertical)
    # stretches the cross-section into an oval
    def cone(self, a, b, ra, rb, k=0.02, label=SKIN, op=UNION, squash=(1, 1), up=(0, 0, 1)):
        a = np.asarray(a, float)
        b = np.asarray(b, float)
        L = float(np.linalg.norm(b - a))
        if L < 1e-6:
            return self.ellipsoid(a, (ra, ra * squash[0], ra * squash[1]), k=k, label=label, op=op)
        self._add(CONE, op, k, label, a, frame(b - a, up), (1, squash[0], squash[1]), (L, ra, rb))

    # a chain of round cones through points with radii
    def chain(self, pts, radii, k=0.02, label=SKIN, op=UNION, squash=(1, 1), squashes=None, up=(0, 0, 1)):
        for i in range(len(pts) - 1):
            sq = squashes[i] if squashes is not None else squash
            self.cone(pts[i], pts[i + 1], radii[i], radii[i + 1], k, label, op, sq, up)

    # a plate: a 2D polygon (in the plane spanned by u_axis, v_axis through c), extruded to a
    # half-thickness t0 at v=0 tapering to t1 at the polygon's top, with rounded edges
    def plate(self, c, poly2d, u_axis, v_axis, t0, t1=None, round_=0.002, k=0.01, label=MEMBRANE, op=UNION, radial=False):
        u = np.asarray(u_axis, float)
        u /= np.linalg.norm(u)
        v = np.asarray(v_axis, float)
        v = v - u * np.dot(u, v)
        v /= np.linalg.norm(v)
        w = np.cross(u, v)
        R = np.stack([u, v, w])
        poly = np.asarray(poly2d, float)
        vmax = float(np.max(np.linalg.norm(poly, axis=1)) if radial else np.max(poly[:, 1])) or 1.0
        params = [len(poly), t0, (t1 if t1 is not None else t0), round_, vmax] + list(poly.reshape(-1))
        assert len(poly) <= 18
        self._add(PLATE, op, k, label, c, R, (1, 1, 1), params)
        self.prims[-1][18] = 1.0 if radial else 0.0

    def box(self, c, half, axis=(1, 0, 0), up=(0, 0, 1), round_=0.002, k=0.01, label=SKIN, op=UNION):
        self._add(BOX, op, k, label, c, frame(axis, up), (1, 1, 1), (half[0], half[1], half[2], round_))

    def array(self):
        return np.array(self.prims, dtype=np.float64)


# ---------------------------------------------------------------- compiled evaluation
@njit(cache=True, fastmath=True)
def _prim(P, px, py, pz):
    kind = int(P[0])
    dx, dy, dz = px - P[4], py - P[5], pz - P[6]
    x = P[7] * dx + P[8] * dy + P[9] * dz
    y = P[10] * dx + P[11] * dy + P[12] * dz
    z = P[13] * dx + P[14] * dy + P[15] * dz
    s = P[16]
    if kind == 0:
        rx, ry, rz = P[20], P[21], P[22]
        k0 = math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2)
        k1 = math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2)
        if k1 < 1e-12:
            return -min(rx, min(ry, rz))
        return k0 * (k0 - 1.0) / k1 * s
    if kind == 1:
        # round cone along x from 0 to L (Inigo Quilez)
        L, r1, r2 = P[20], P[21], P[22]
        q = math.sqrt(y * y + z * z)
        b = (r1 - r2) / L
        a = math.sqrt(max(0.0, 1.0 - b * b))
        k = q * (-b) + x * a  # dot((q, x), (-b, a))
        if k < 0.0:
            return (math.sqrt(q * q + x * x) - r1) * s
        if k > a * L:
            return (math.sqrt(q * q + (x - L) ** 2) - r2) * s
        return (q * a + x * b - r1) * s
    if kind == 2:
        n = int(P[20])
        t0, t1, rr, vmax = P[21], P[22], P[23], P[24]
        # 2D polygon distance in (x, y)
        d = 1e9
        sgn = 1.0
        j = n - 1
        for i in range(n):
            ax, ay = P[25 + 2 * i], P[26 + 2 * i]
            bx, by = P[25 + 2 * j], P[26 + 2 * j]
            ex, ey = bx - ax, by - ay
            wx, wy = x - ax, y - ay
            h = (wx * ex + wy * ey) / (ex * ex + ey * ey + 1e-12)
            h = min(1.0, max(0.0, h))
            qx, qy = wx - ex * h, wy - ey * h
            d = min(d, qx * qx + qy * qy)
            c1 = y >= ay
            c2 = y < by
            c3 = ex * wy > ey * wx
            if (c1 and c2 and c3) or ((not c1) and (not c2) and (not c3)):
                sgn = -sgn
            j = i
        d2 = sgn * math.sqrt(d)
        if P[18] > 0.5:
            t = t0 + (t1 - t0) * min(1.0, math.sqrt(x * x + y * y) / vmax)
        else:
            t = t0 + (t1 - t0) * min(1.0, max(0.0, y / vmax))
        wz = abs(z) - t
        ox, oz = max(d2, 0.0), max(wz, 0.0)
        return (min(max(d2, wz), 0.0) + math.sqrt(ox * ox + oz * oz) - rr) * s
    if kind == 3:
        hx, hy, hz, rr = P[20], P[21], P[22], P[23]
        qx, qy, qz = abs(x) - hx + rr, abs(y) - hy + rr, abs(z) - hz + rr
        ox, oy, oz = max(qx, 0.0), max(qy, 0.0), max(qz, 0.0)
        return (math.sqrt(ox * ox + oy * oy + oz * oz) + min(max(qx, max(qy, qz)), 0.0) - rr) * s
    return 1e9


@njit(cache=True, fastmath=True)
def _field(prims, px, py, pz):
    d = 1e9
    lab = 0.0
    for i in range(prims.shape[0]):
        P = prims[i]
        op = int(P[1])
        k = P[2]
        cx, cy, cz = px - P[4], py - P[5], pz - P[6]
        far = math.sqrt(cx * cx + cy * cy + cz * cz) - P[17]
        if op == 0:
            if far > d + k:
                continue
            e = _prim(P, px, py, pz)
            if e < d:
                lab = P[3]
            if k > 0:
                h = min(1.0, max(0.0, 0.5 + 0.5 * (d - e) / k))
                d = e * h + d * (1 - h) - k * h * (1 - h)
            else:
                d = min(d, e)
        else:
            if far > k:
                continue
            e = -_prim(P, px, py, pz)
            if e > d:
                lab = P[3]
            if k > 0:
                h = min(1.0, max(0.0, 0.5 - 0.5 * (e - d) / k))
                d = d * h + e * (1 - h) + k * h * (1 - h)
            else:
                d = max(d, e)
    return d, lab


@njit(parallel=True, cache=True)
def eval_points(prims, pts):
    n = pts.shape[0]
    out = np.empty(n)
    lab = np.empty(n)
    for i in prange(n):
        out[i], lab[i] = _field(prims, pts[i, 0], pts[i, 1], pts[i, 2])
    return out, lab


@njit(parallel=True, cache=True)
def eval_grid(prims, x0, y0, z0, h, nx, ny, nz):
    out = np.empty((nx, ny, nz), np.float32)
    for i in prange(nx):
        for j in range(ny):
            for k in range(nz):
                out[i, j, k] = _field(prims, x0 + i * h, y0 + j * h, z0 + k * h)[0]
    return out


@njit(parallel=True, cache=True)
def eval_band(prims, coarse_up, x0, y0, z0, h, band):
    nx, ny, nz = coarse_up.shape
    out = coarse_up.copy()
    for i in prange(nx):
        for j in range(ny):
            for k in range(nz):
                if abs(coarse_up[i, j, k]) < band:
                    out[i, j, k] = _field(prims, x0 + i * h, y0 + j * h, z0 + k * h)[0]
    return out


def mesh(sculpt, voxel, pad=0.03, bounds=None):
    """Mesh the zero level of a sculpt. Returns verts, faces, normals, labels."""
    prims = sculpt.array()
    if bounds is None:
        lo = np.min(prims[:, 4:7] - prims[:, 17:18], axis=0) - pad
        hi = np.max(prims[:, 4:7] + prims[:, 17:18], axis=0) + pad
    else:
        lo, hi = map(np.asarray, bounds)
    C = 4
    hc = voxel * C
    nc = np.ceil((hi - lo) / hc).astype(int) + 2
    coarse = eval_grid(prims, lo[0], lo[1], lo[2], hc, nc[0], nc[1], nc[2])
    nf = (nc - 1) * C + 1
    up = zoom(coarse, C, order=1)[:nf[0], :nf[1], :nf[2]].astype(np.float32)
    fine = eval_band(prims, up, lo[0], lo[1], lo[2], voxel, hc * 1.8)
    v, f, n, _ = marching_cubes(fine, 0.0, spacing=(voxel, voxel, voxel))
    v = v + lo
    # snap the vertices onto the true surface with a Newton step, and label them
    d, lab = eval_points(prims, v.astype(np.float64))
    g = np.zeros_like(v)
    e = voxel * 0.5
    for a in range(3):
        off = np.zeros(3)
        off[a] = e
        dp, _ = eval_points(prims, (v + off).astype(np.float64))
        dm, _ = eval_points(prims, (v - off).astype(np.float64))
        g[:, a] = (dp - dm) / (2 * e)
    gl = np.linalg.norm(g, axis=1, keepdims=True) + 1e-9
    nrm = g / gl
    v = v - nrm * np.clip(d, -voxel, voxel)[:, None]
    return v.astype(np.float32), f.astype(np.int32), nrm.astype(np.float32), lab.astype(np.int8)
