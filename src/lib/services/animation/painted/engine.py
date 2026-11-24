"""Painted-puppet render engine (phase 2). Import-safe library, no side effects.

Generalised from .scripts/animation/puppets/talk_test_v6.py: one painted whole-body pose per character per shot
(poses change only on cuts), a smooth warp for in-shot life (sway, breath, head tilt/nod), mouth/blink patches
composited in pose space, a camera window over a painted plate with depth-of-field, warm grade, contact shadows.

World units = plate pixels of a 1280x720 plate (the plate image is stored at PLATE_SCALE x that, e.g. x4 or x2).
Kits: <PUPPET_ROOT>/poses/p2/<char>-<pose>/ (body.png, head_mask.png, face/, pose.json) from p2_build.py.
"""
import os, json, math
import numpy as np, cv2

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
POSES = f'{ROOT}/poses/p2'
FPS = 25
SW, SH = 1920, 1080
POSE_NAMES = ('idle', 'explain', 'surprised', 'laugh', 'think', 'offer', 'sit')


def ease(u): u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
def smooth(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)


# ------------------------------------------------------------------ stage (painted plate + perspective)
class Stage:
    """A painted background plate with its ground-plane calibration (world units = 1280x720 plate px)."""
    def __init__(self, spec):
        self.spec = spec; self.id = spec['id']
        self.horizon = float(spec['horizon']); self.cam_h = float(spec['cam_h'])
        self.floor = spec.get('floor', [340, 430])               # usable feet-row range (world y)
        self.xrange = spec.get('xrange', [420, 1100])             # usable feet x range
        self.scale = float(spec.get('scale', 4))
        self.path = spec['path']; self._img = None
        self.tint = TINT * np.array(spec.get('tint', [1, 1, 1]), np.float32) * float(spec.get('gain', 1.0))   # per-plate light on characters
    @property
    def img(self):
        if self._img is None:
            im = cv2.imread(self.path, cv2.IMREAD_COLOR)
            if im is None: raise FileNotFoundError(self.path)
            self._img = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
        return self._img
    def px_per_m(self, y): return (y - self.horizon) / self.cam_h

    def background(self, win, focus_y, dof):
        x0, y0, w_, h = win[:4]; s = SH / h; k = self.scale
        M = np.float32([[s / k, 0, -x0 * s], [0, s / k, -y0 * s]])
        img = cv2.warpAffine(self.img, M, (SW, SH), flags=cv2.INTER_AREA if s < k else cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        if dof <= 0: return img
        rows = y0 + (np.arange(SH) + 0.5) / s
        lo = self.horizon + 0.55 * (focus_y - self.horizon)       # walls / far things: treat as at least this far
        sig = dof * np.abs(1 / np.maximum(np.maximum(rows, lo) - self.horizon, 1) - 1 / max(focus_y - self.horizon, 1)) * s / 2.07
        levels = [0, 1.5, 3, 6, 10, 16]; sig = np.clip(sig, 0, levels[-1])
        out = np.zeros_like(img); done = np.zeros(SH, bool); blurred = {}
        for i in range(len(levels) - 1):
            a, b = levels[i], levels[i + 1]; sel = (sig >= a) & (sig <= b) & ~done
            if not sel.any(): continue
            for lv in (a, b):
                if lv not in blurred: blurred[lv] = img if lv == 0 else cv2.GaussianBlur(img, (0, 0), lv)
            u = ((sig - a) / (b - a))[:, None, None]
            out = np.where(sel[:, None, None], blurred[a] * (1 - u) + blurred[b] * u, out); done |= sel
        return out


def load_stages(path):
    data = json.load(open(path, encoding='utf-8'))
    base = os.path.dirname(os.path.abspath(path))
    out = {}
    for s in data['stages']:
        s = dict(s); s['path'] = s['path'] if os.path.isabs(s['path']) else os.path.join(base, s['path'])
        if not os.path.exists(s['path']): s['path'] = os.path.join(ROOT, 'scenes', os.path.basename(s['path']))
        out[s['id']] = s
    return out


# ------------------------------------------------------------------ camera
def window(shot, t):
    """Camera window (x0, y0, w, h, shot) in world units at time t (slow push-in + tiny drift)."""
    d = max(shot['t1'] - shot['t0'], 0.1); u = (t - shot['t0']) / d
    z = 1 + shot.get('push', 0) * ease(u); h = shot['h'] / z; w_ = h * SW / SH
    drift = 0 if shot.get('kind') == 'insert' else 1
    cx = shot['c'][0] + drift * 2.0 * math.sin(2 * math.pi * t / 7.5) * shot['h'] / 400
    cy = shot['c'][1] + drift * 1.0 * math.sin(2 * math.pi * t / 5.9 + 1) * shot['h'] / 400
    return cx - w_ / 2, cy - h / 2, w_, h, shot


def to_screen(win, p):
    x0, y0, w_, h = win[:4]; s = SH / h
    return (p[0] - x0) * s, (p[1] - y0) * s, s


# ------------------------------------------------------------------ grade / shadows
TINT = np.array([1.035, 0.975, 0.89], np.float32)
SHADOW_RGB = np.array([0.42, 0.36, 0.40], np.float32)

def grade(cimg, amb, gx, gy, Hs, tint=TINT, defocus=0.0):
    a = cimg[..., 3:4] / 255; rgb = cimg[..., :3] * tint
    X = (np.arange(SW, dtype=np.float32)[None, :, None] - (gx - 0.35 * Hs)) / (0.7 * Hs)
    Y = (np.arange(SH, dtype=np.float32)[:, None, None] - (gy - Hs)) / Hs
    rgb = rgb * (1.07 - 0.14 * np.clip(X, 0, 1))
    rgb = rgb * (1 - 0.16 * np.clip((Y - 0.9) / 0.1, 0, 1))
    rgb = rgb + np.array([22, 9, 0], np.float32) * np.clip((Y - 0.6) / 0.4, 0, 1) * a
    rgb = rgb * 0.96 + amb * a * 0.04
    edge = np.clip(a - cv2.erode(a[..., 0], np.ones((3, 3), np.uint8))[..., None], 0, 1)
    rgb = rgb + edge * (amb * a - rgb) * 0.2
    out = cimg.copy(); out[..., :3] = np.clip(rgb, 0, 255 * a)
    if defocus > 0.3:                                            # OTS foreground shoulder: out of focus (premultiplied blur)
        out = cv2.GaussianBlur(out, (0, 0), defocus)
    return out


def ambient(bgimg):
    return cv2.resize(cv2.GaussianBlur(cv2.resize(bgimg, (SW // 4, SH // 4)), (0, 0), 6), (SW, SH))


def shadow_density(a, gx, gy, Hs):
    small = 4
    cast = cv2.warpAffine(cv2.resize(a, (SW // small, SH // small)),
                          np.float32([[1, -0.55, 0.55 * gy / small], [0, 0.14, gy * 0.86 / small]]), (SW // small, SH // small))
    cast = cv2.resize(cv2.GaussianBlur(cast, (0, 0), (0.012 * Hs + 2) / small), (SW, SH)) * 0.38
    cont = np.zeros((SH, SW), np.float32)
    if -Hs < gx < SW + Hs and gy < SH + 0.1 * Hs:
        cv2.ellipse(cont, (int(gx), int(gy - 2)), (max(1, int(0.17 * Hs)), max(1, int(0.022 * Hs))), 0, 0, 360, 1, -1)
    cont = cv2.GaussianBlur(cont, (0, 0), 0.02 * Hs + 0.5) * 0.65
    return 1 - (1 - cast) * (1 - cont)


# ------------------------------------------------------------------ kits
class Kit:
    """One painted whole-body pose (poses/p2/<char>-<pose>/ from p2_build.py)."""
    MAX_CACHE = 3                                                # float sources are big (OOM before): keep few

    def __init__(self, char, pose):
        d = f'{POSES}/{char}-{pose}'; self.m = m = json.load(open(f'{d}/pose.json')); self.name = f'{char}-{pose}'
        self.char, self.pose = char, pose
        self.body = cv2.cvtColor(cv2.imread(f'{d}/body.png', -1), cv2.COLOR_BGRA2RGBA)
        hm = cv2.imread(f'{d}/head_mask.png', -1)
        hm = hm[..., 3] if hm.ndim == 3 and hm.shape[2] == 4 else (hm if hm.ndim == 2 else hm[..., 0])
        self.H = m['height']; self.ground = np.array(m['ground'], np.float32); self.neck = np.array(m['neck'], np.float32)
        self.head_top = float(m['head_top'])
        q = 8; self.q = q; h, w = hm.shape
        self.w_head = cv2.GaussianBlur(cv2.resize(hm.astype(np.float32) / 255, (w // q, h // q), interpolation=cv2.INTER_AREA), (0, 0), 36 / q)
        ys, xs = np.where(hm > 128)
        self.head_box = (float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())) if len(xs) else None
        a = self.body[..., 3]; ys2, xs2 = np.where(a > 40)
        self.body_box = (float(xs2.min()), float(ys2.min()), float(xs2.max()), float(ys2.max()))
        self.patch = {}
        for g, items in m['face'].items():
            for nm, v in items.items():
                p = cv2.cvtColor(cv2.imread(f'{d}/{v["file"]}', -1), cv2.COLOR_BGRA2RGBA); mk = None
                if v.get('mask'):
                    mk = cv2.imread(f'{d}/{v["mask"]}', -1); mk = (mk[..., -1] if mk.ndim == 3 else mk).astype(np.float32)[..., None] / 255
                self.patch[(g, nm)] = (p, v['x'], v['y'], mk)
        self.vmap = m.get('viseme_map_fine') or m['viseme_map']; self.cache = {}

    def has(self, g, nm): return (g, nm) in self.patch

    def source(self, k, face):
        key = (round(k, 3), tuple(sorted(face.items())))
        if key in self.cache: return self.cache[key]
        mo = face.get('mouth')
        if isinstance(mo, tuple):
            a, b, w = mo
            A = self.compose(dict(face, mouth=a)).astype(np.float32); B = self.compose(dict(face, mouth=b)).astype(np.float32)
            img = np.clip(A * (1 - w) + B * w, 0, 255).astype(np.uint8)
        else: img = self.compose(face)
        H, W = img.shape[:2]
        s = cv2.resize(img, (max(1, int(round(W * k))), max(1, int(round(H * k)))),
                       interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC).astype(np.float32)
        s = np.clip(s, 0, 255); s[..., :3] *= s[..., 3:] / 255
        if len(self.cache) >= self.MAX_CACHE: self.cache.clear()
        self.cache[key] = s; return s

    def compose(self, face):
        img = self.body
        sel = [self.patch[(g, nm)] for g, nm in face.items() if isinstance(nm, str) and (g, nm) in self.patch]
        if sel:
            img = img.copy().astype(np.float32)
            for p, x, y, mk in sel:
                h, w = p.shape[:2]; reg = img[y:y + h, x:x + w]
                if mk is not None: reg[:] = p.astype(np.float32) * mk + reg * (1 - mk)
                else:
                    a = p[..., 3:4].astype(np.float32) / 255
                    reg[..., :3] = p[..., :3] * a + reg[..., :3] * (1 - a); reg[..., 3:] = np.maximum(reg[..., 3:], p[..., 3:] * a)
            img = img.clip(0, 255).astype(np.uint8)
        return img

    def head_w(self, x, y):
        return cv2.remap(self.w_head, (x / self.q).astype(np.float32), (y / self.q).astype(np.float32), cv2.INTER_LINEAR, borderValue=0)


class KitBank:
    """Loads kits lazily; keeps at most `cap` kits in memory (LRU)."""
    def __init__(self, cap=8): self.cap = cap; self.kits = {}; self.order = []
    def get(self, char, pose):
        n = f'{char}-{pose}'
        if not os.path.exists(f'{POSES}/{n}/pose.json'): n = f'{char}-idle'; pose = 'idle'
        if n not in self.kits:
            if len(self.kits) >= self.cap:
                old = self.order.pop(0); self.kits.pop(old, None)
            self.kits[n] = Kit(char, pose)
        if n in self.order: self.order.remove(n)
        self.order.append(n); return self.kits[n]


def kit_meta(char, pose):
    """pose.json + head/body boxes without loading the images into the bank (planner use)."""
    d = f'{POSES}/{char}-{pose}'
    if not os.path.exists(f'{d}/pose.json'): d = f'{POSES}/{char}-idle'
    m = json.load(open(f'{d}/pose.json'))
    hm = cv2.imread(f'{d}/head_mask.png', -1); hm = hm[..., 3] if hm.ndim == 3 and hm.shape[2] == 4 else (hm if hm.ndim == 2 else hm[..., 0])
    ys, xs = np.where(hm > 128)
    m['_head_box'] = [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())] if len(xs) else None
    return m


# ------------------------------------------------------------------ deformation + layer
def rot_disp(x, y, cx, cy, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a); dx, dy = x - cx, y - cy
    return c * dx - s * dy - dx, s * dx + c * dy - dy


def disp(kit, x, y, P):
    """forward displacement field in pose space. P: root, breath, head, head_dy."""
    gx, gy = kit.ground; H = kit.H
    w_r = smooth((gy - y) / (0.55 * H))
    dx, dy = rot_disp(x, y, gx, gy, P.get('root', 0)); dx = dx * w_r; dy = dy * w_r
    dy = dy - P.get('breath', 0) * (gy - y) * w_r
    wh = kit.head_w(x, y)
    hx, hy = rot_disp(x, y, kit.neck[0], kit.neck[1], P.get('head', 0)); dx = dx + wh * hx; dy = dy + wh * (hy + P.get('head_dy', 0))
    return dx, dy


def char_layer(win, actor, kit, P, face, shot):
    """actor: dict(feet=(x,y) world, H=world px height, flip=bool). Returns (premult RGBA float SWxSH, (gx, gy, Hs, sc)) or None."""
    gx, gy, s = to_screen(win, actor['feet']); Hs = actor['H'] * s; sc = Hs / kit.H
    bx0 = max(0, int(gx - 0.9 * Hs)); by0 = max(0, int(gy - 1.15 * Hs)); bx1 = min(SW, int(gx + 0.9 * Hs)); by1 = min(SH, int(gy + 0.06 * Hs))
    if bx1 <= bx0 or by1 <= by0: return None
    ss = 2 if sc < 0.55 else 1
    sc_ref = sc * (1 + shot.get('push', 0))
    k = round(sc_ref * ss, 3)
    src = kit.source(k, face)
    lw, lh = (bx1 - bx0) * ss, (by1 - by0) * ss; g = 4
    X = (bx0 + (np.arange(0, lw + g, g, dtype=np.float32) + 0.5) / ss)[None, :]; Y = (by0 + (np.arange(0, lh + g, g, dtype=np.float32) + 0.5) / ss)[:, None]
    X, Y = np.broadcast_arrays(X, Y)
    sgn = -1 if actor['flip'] else 1
    px = kit.ground[0] + sgn * (X - gx) / sc; py = kit.ground[1] + (Y - gy) / sc
    qx, qy = px.copy(), py.copy()
    for _ in range(3):
        dx, dy = disp(kit, qx, qy, P); qx, qy = px - dx, py - dy
    gxs = np.arange(lw, dtype=np.float32) / g; gys = np.arange(lh, dtype=np.float32) / g
    mx = np.broadcast_to(gxs[None, :], (lh, lw)).copy(); my = np.broadcast_to(gys[:, None], (lh, lw)).copy()
    qxg = cv2.remap((qx * k).astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    qyg = cv2.remap((qy * k).astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    lay = cv2.remap(src, qxg, qyg, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    if ss > 1: lay = cv2.resize(lay, (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_AREA)
    full = np.zeros((SH, SW, 4), np.float32); full[by0:by1, bx0:bx1] = lay
    return full, (gx, gy, Hs, sc)


# ------------------------------------------------------------------ blinks
def blink_times(seed, dur):
    r = np.random.default_rng(seed); out = []; t = 0.6 + r.random()
    while t < dur: out.append(t); t += 2.2 + 2.0 * r.random()
    return out


def eyes_at(blinks, t):
    for b in blinks:
        k = int(round((t - b) * FPS))
        if 0 <= k < 4: return ['half', 'closed', 'closed', 'half'][k]
    return 'open'
