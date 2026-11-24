"""Kabir + Kamla Dadi dialogue test v4: ONE continuous painted body per character.
Each shot uses a whole-body painted pose (no cut-out joints; the key is painted in the gripping hand); pose changes happen on cuts,
as in the reference TV anime. In-shot life comes from a smooth dense warp (LBS-style soft weights on a pixel grid, one remap):
body sway/breathing about the feet, head tilt/nod about the neck (head_mask weight), and in the wave pose a wrist/elbow wave.
Mouth / blink / brow patches are composited in pose space before the warp. The key shot is a full-frame painted insert.
python talk_test_v4.py [out.mp4]   (FRAMES=a,b,c renders only those frames as PNGs)"""
import sys, json, math, subprocess, wave, os
import numpy as np, cv2
from PIL import Image

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
TALK = f'{ROOT}/talk3'; FPS = 25; SW, SH = 1920, 1080
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/kabir-talk-test-v6.mp4'
HERE = os.path.dirname(os.path.abspath(__file__))
POSES = f'{ROOT}/poses'

# ---------------- scene geometry (measured on the 1280x720 plate) ----------------
HORIZON, CAM_H = 201.0, 0.79
def px_per_m(y): return (y - HORIZON) / CAM_H
CAST = {
    'kabir': dict(flip=True, feet=(705.0, 392.0), metres=1.55),
    'dadi': dict(flip=False, feet=(962.0, 397.0), metres=1.45),
}
for c in CAST.values(): c['H'] = c['metres'] * px_per_m(c['feet'][1])

# ---------------- audio: place the lines on one track ----------------
LINES = json.load(open(f'{TALK}/lines.json', encoding='utf-8'))
GAP = {'k1': 0.25, 'k2': 0.22, 'd1': 0.35, 'k3': 0.3}
t = 0.0; SR = 24000; track = []
for L in LINES:
    w = wave.open(f"{TALK}/{L['id']}.wav"); pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    words = json.load(open(f"{TALK}/{L['id']}.words.json", encoding='utf-8'))
    end = words[-1]['t'] + words[-1]['d'] + 0.12
    pcm = pcm[:int(end * SR)]
    # tighten long pauses inside a line (TTS punctuation pauses run ~1 s; anime delivery is snappier)
    for i in range(len(words) - 1, 0, -1):
        gap0 = words[i - 1]['t'] + words[i - 1]['d'] + 0.06; gap1 = words[i]['t'] - 0.04; keep = 0.32
        if gap1 - gap0 > keep + 0.05:
            cut = gap1 - gap0 - keep; a = int((gap0 + keep / 2) * SR); pcm = np.concatenate([pcm[:a], pcm[a + int(cut * SR):]])
            for w2 in words[i:]: w2['t'] -= cut
    json.dump(words, open(f"{TALK}/{L['id']}.tight.json", 'w', encoding='utf-8'), ensure_ascii=False); fade = int(0.03 * SR); pcm[-fade:] *= np.linspace(1, 0, fade)
    t += GAP[L['id']]; L['t0'] = t; L['dur'] = len(pcm) / SR; L['words'] = words; L['pcm'] = pcm
    t += L['dur']
TOTAL = t + 0.8; N = int(TOTAL * FPS)
mix = np.zeros(int(TOTAL * SR) + SR, np.float32)
for L in LINES: i = int(L['t0'] * SR); mix[i:i + len(L['pcm'])] += L['pcm']
with wave.open(f'{TALK}/mix.wav.tmp', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix[:int(TOTAL * SR)], -1, 1) * 32767).astype(np.int16).tobytes())
import filecmp   # replace mix.wav only when it changed (importing this module from check scripts must not touch a file ffmpeg may be reading)
if os.path.exists(f'{TALK}/mix.wav') and filecmp.cmp(f'{TALK}/mix.wav.tmp', f'{TALK}/mix.wav', shallow=False): os.remove(f'{TALK}/mix.wav.tmp')
else: os.replace(f'{TALK}/mix.wav.tmp', f'{TALK}/mix.wav')
T = {L['id']: L for L in LINES}
def word_t(lid, i): return T[lid]['t0'] + T[lid]['words'][i]['t']
def line_end(lid): return T[lid]['t0'] + T[lid]['dur']

# per-character visemes + loudness on the global frame grid
VIS = {k: ['X'] * N for k in CAST}; ENV = {k: np.zeros(N) for k in CAST}
for L in LINES:
    who = 'kabir' if L['who'] == 'kabir' else 'dadi'
    hop = SR // FPS; n = int(math.ceil(L['dur'] * FPS))
    env = np.array([np.sqrt(np.mean(L['pcm'][i * hop:(i + 1) * hop] ** 2)) if i * hop < len(L['pcm']) else 0 for i in range(n)])
    env = np.clip(env / (np.percentile(env[env > 0.01], 95) + 1e-6), 0, 1)
    json.dump(env.round(3).tolist(), open(f'{TALK}/{L["id"]}.env.json', 'w'))
    v = json.loads(subprocess.check_output(['node', os.path.join(HERE, 'visemes_cli.mjs'), L['text'], f"{TALK}/{L['id']}.tight.json", f"{TALK}/{L['id']}.env.json", str(FPS)]))
    f0 = int(round(L['t0'] * FPS))
    for i in range(min(n, N - f0)): VIS[who][f0 + i] = v[i]; ENV[who][f0 + i] = env[i]
for k in ENV: ENV[k] = np.convolve(ENV[k], np.ones(3) / 3, 'same')
import visemes_fine
VISF = ['X'] * N                                    # Kabir: finer alphabet (adds I, L/TH; same timing logic as wordVisemes)
for L in LINES:
    if L['who'] != 'kabir': continue
    words = json.load(open(f"{TALK}/{L['id']}.tight.json", encoding='utf-8')); env = json.load(open(f"{TALK}/{L['id']}.env.json"))
    v = visemes_fine.word_visemes(words, env, FPS); f0 = int(round(L['t0'] * FPS))
    for i in range(min(len(v), N - f0)): VISF[f0 + i] = v[i]

# ---------------- shots ----------------
c1 = word_t('k2', 0) - 0.12                 # cut to two-shot as he starts "आज ..."
c2 = word_t('k2', 4)                        # "एक जादुई चाबी" -> key insert close-up ... (cut on "एक")
c3 = T['d1']['t0'] - 0.15                   # Dadi OTS close-up
c3b = word_t('d1', 2) - 0.1                 # "अरे वाह!" -> reverse OTS on Kabir, proud with the key
c3c = word_t('d1', 4) - 0.12                # "ज़रा दिखाओ तो, बेटा" -> back on Dadi as she reaches out
c4 = T['k3']['t0'] - 0.12                   # back to the two-shot
SHOTS = [  # (start, end, window centre (x,y), window height, push-in %, DOF strength)
    dict(name='wide', t0=0, t1=c1, c=(822, 240), h=440, push=0.02, dof=300),
    dict(name='two-shot', t0=c1, t1=c2, c=(835, 150), h=300, push=0.025, dof=520),
    dict(name='key-cu', t0=c2, t1=c3, c=(784, 96), h=176, push=0.04, dof=900),
    dict(name='dadi-ots-cu', t0=c3, t1=c3b, c=(918, 112), h=196, push=0.03, dof=900),
    dict(name='kabir-cu', t0=c3b, t1=c3c, c=(745, 105), h=205, push=0.03, dof=900),
    dict(name='dadi-ots-cu-2', t0=c3c, t1=c4, c=(915, 128), h=230, push=0.03, dof=800),
    dict(name='two-shot-2', t0=c4, t1=TOTAL + 1, c=(818, 152), h=305, push=0.03, dof=520),
]
def shot_at(t): return next(s for s in SHOTS if s['t0'] <= t < s['t1'])

# ---------------- acting ----------------
def ease(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)
def blend(a, b, u):
    u = ease(u); out = dict(a)
    for k in set(a) | set(b):
        if isinstance(a.get(k, 0), (int, float)) and isinstance(b.get(k, 0), (int, float)): out[k] = a.get(k, 0) + (b.get(k, 0) - a.get(k, 0)) * u
        else: out[k] = b[k] if u > 0.5 else a.get(k, b.get(k))
    return out
def track(keys, t):
    """keys: [(time, pose)], eased between neighbours, holds after the last one."""
    if t <= keys[0][0]: return dict(keys[0][1])
    for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
        if t0 <= t < t1: return blend(p0, p1, (t - t0) / max(t1 - t0, 1e-3))
    return dict(keys[-1][1])

def blinks(seed, n):
    r = np.random.default_rng(seed); out = []; t = 0.6 + r.random()
    while t < n / FPS: out.append(t); t += 2.2 + 2.0 * r.random()
    return out
BLINK = {'kabir': blinks(3, N), 'dadi': blinks(7, N)}
def eyes_for(who, t, default='open'):
    for b in BLINK[who]:
        k = int(round((t - b) * FPS))
        if 0 <= k < 4: return ['half', 'closed', 'closed', 'half'][k]
    return default
# ---------------- camera / background ----------------
bg4 = np.array(Image.open(f'{ROOT}/scenes/courtyard-v4-x4.png').convert('RGB'))   # 4 px per world unit
def window(t):
    s = shot_at(t); u = (t - s['t0']) / max(s['t1'] - s['t0'], 0.1) if s['t1'] < TOTAL else (t - s['t0']) / (TOTAL - s['t0'])
    z = 1 + s['push'] * ease(u); h = s['h'] / z; w_ = h * 16 / 9
    cx = s['c'][0] + 2.0 * math.sin(2 * math.pi * t / 7.5) * s['h'] / 400
    cy = s['c'][1] + 1.0 * math.sin(2 * math.pi * t / 5.9 + 1) * s['h'] / 400
    y0 = max(0.0, cy - h / 2)
    return cx - w_ / 2, y0, w_, h, s
def to_screen(win, p):
    x0, y0, w_, h, _ = win; s = SH / h
    return (p[0] - x0) * s, (p[1] - y0) * s, s
def background(win):
    x0, y0, w_, h, shot = win; s = SH / h
    M = np.float32([[s / 4, 0, -x0 * s], [0, s / 4, -y0 * s]])
    img = cv2.warpAffine(bg4, M, (SW, SH), flags=cv2.INTER_AREA if s < 4 else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    focus = CAST['kabir']['feet'][1]
    rows = y0 + (np.arange(SH) + 0.5) / s
    sig = shot['dof'] * np.abs(1 / np.maximum(np.maximum(rows, 315) - HORIZON, 1) - 1 / (focus - HORIZON)) * s / 2.07
    levels = [0, 1.5, 3, 6, 10, 16]
    sig = np.clip(sig, 0, levels[-1])
    out = np.zeros_like(img); done = np.zeros(SH)
    blurred = {}
    for i in range(len(levels) - 1):
        a, b = levels[i], levels[i + 1]
        sel = (sig >= a) & (sig <= b)
        if not sel.any(): continue
        for lv in (a, b):
            if lv not in blurred: blurred[lv] = img if lv == 0 else cv2.GaussianBlur(img, (0, 0), lv)
        u = ((sig - a) / (b - a))[:, None, None]
        m = (sel & (done == 0))[:, None, None]
        out = np.where(m, blurred[a] * (1 - u) + blurred[b] * u, out); done[sel] = 1
    return out

# ---------------- characters ----------------
TINT = np.array([1.035, 0.975, 0.89], np.float32)
def grade(cimg, bgimg, gx, gy, Hs):
    a = cimg[..., 3:4] / 255; rgb = cimg[..., :3] * TINT
    X = (np.arange(SW)[None, :, None] - (gx - 0.35 * Hs)) / (0.7 * Hs)
    Y = (np.arange(SH)[:, None, None] - (gy - Hs)) / Hs
    rgb = rgb * (1.07 - 0.14 * np.clip(X, 0, 1))
    rgb = rgb * (1 - 0.16 * np.clip((Y - 0.9) / 0.1, 0, 1))
    rgb = rgb + np.array([22, 9, 0], np.float32) * np.clip((Y - 0.6) / 0.4, 0, 1) * a
    amb = cv2.GaussianBlur(cv2.resize(bgimg, (SW // 4, SH // 4)), (0, 0), 6); amb = cv2.resize(amb, (SW, SH))
    rgb = rgb * 0.96 + amb * a * 0.04
    edge = np.clip(a - cv2.erode(a[..., 0], np.ones((3, 3), np.uint8))[..., None], 0, 1)
    rgb = rgb + edge * (amb * a - rgb) * 0.2
    out = cimg.copy(); out[..., :3] = np.clip(rgb, 0, 255 * a); return out
def shadow_density(a, gx, gy, Hs):
    M = np.float32([[1, -0.55, 0.55 * gy], [0, 0.14, gy * 0.86]])
    small = 4
    cast = cv2.warpAffine(cv2.resize(a, (SW // small, SH // small)), np.float32([[1, -0.55, 0.55 * gy / small], [0, 0.14, gy * 0.86 / small]]), (SW // small, SH // small))
    cast = cv2.resize(cv2.GaussianBlur(cast, (0, 0), (0.012 * Hs + 2) / small), (SW, SH)) * 0.38
    cont = np.zeros((SH, SW), np.float32)
    cv2.ellipse(cont, (int(gx), int(gy - 2)), (max(1, int(0.17 * Hs)), max(1, int(0.022 * Hs))), 0, 0, 360, 1, -1)
    cont = cv2.GaussianBlur(cont, (0, 0), 0.02 * Hs + 0.5) * 0.65
    core = np.zeros((SH, SW), np.float32)
    cv2.ellipse(core, (int(gx), int(gy - 1)), (max(1, int(0.11 * Hs)), max(1, int(0.010 * Hs))), 0, 0, 360, 1, -1)
    core = cv2.GaussianBlur(core, (0, 0), 0.006 * Hs + 1) * 0.5
    return 1 - (1 - cast) * (1 - cont) * (1 - core)
SHADOW_RGB = np.array([0.42, 0.36, 0.40], np.float32)

def sparkle(img, x, y, r, strength):
    if strength <= 0: return img
    yy, xx = np.ogrid[:SH, :SW]; dx = np.abs(xx - x); dy = np.abs(yy - y)
    star = np.exp(-(dx / (r * 0.06 + 0.5)) ** 2) * np.exp(-(dy / r) ** 2) + np.exp(-(dy / (r * 0.06 + 0.5)) ** 2) * np.exp(-(dx / r) ** 2)
    glow = np.exp(-((dx ** 2 + dy ** 2) / (r * 0.35) ** 2))
    add = (star * 0.9 + glow * 0.6)[..., None] * np.array([200, 255, 235], np.float32) * strength
    return img + add

# ---------------- whole-body pose kits ----------------
def smooth(u): u = np.clip(u, 0, 1); return u * u * (3 - 2 * u)
class Kit:
    """One painted whole-body pose (poses/<char>-<pose>/ from build_pose.py)."""
    def __init__(self, char, pose):
        d = f'{POSES}/{char}-{pose}'; self.m = m = json.load(open(f'{d}/pose.json')); self.name = f'{char}-{pose}'
        b = cv2.imread(f'{d}/body.png', -1); self.body = cv2.cvtColor(b, cv2.COLOR_BGRA2RGBA)
        hm = cv2.imread(f'{d}/head_mask.png', -1); hm = hm[..., 3] if hm.ndim == 3 and hm.shape[2] == 4 else (hm if hm.ndim == 2 else hm[..., 0])
        self.H = m['height']; self.ground = np.array(m['ground'], np.float32); self.neck = np.array(m['neck'], np.float32)
        # low-res head weight: blurred so the neck bends smoothly instead of shearing at a seam
        q = 8; self.q = q; h, w = hm.shape
        self.w_head = cv2.GaussianBlur(cv2.resize(hm.astype(np.float32) / 255, (w // q, h // q), interpolation=cv2.INTER_AREA), (0, 0), 36 / q)
        self.patch = {}
        for g, items in m['face'].items():
            for nm, v in items.items():
                p = cv2.cvtColor(cv2.imread(f'{d}/{v["file"]}', -1), cv2.COLOR_BGRA2RGBA)
                mk = None
                if v.get('mask'):                                    # v5: explicit replace-mask (a moved jaw/lid replaces the base, never doubles)
                    mk = cv2.imread(f'{d}/{v["mask"]}', -1); mk = (mk[..., -1] if mk.ndim == 3 else mk).astype(np.float32)[..., None] / 255
                self.patch[(g, nm)] = (p, v['x'], v['y'], mk)
        self.vmap = m['viseme_map']; self.cache = {}
    def has(self, g, nm): return (g, nm) in self.patch
    def source(self, k, face):
        """premultiplied float32 RGBA of the pose at scale k with the face patches composited at full res.
        face['mouth'] may be (a, b, w): an eased cross-dissolve between two painted mouth shapes (no popping)."""
        key = (round(k, 3), tuple(sorted(face.items())))
        if key in self.cache: return self.cache[key]
        mo = face.get('mouth')
        if isinstance(mo, tuple):
            a, b, w = mo
            A = self.compose(dict(face, mouth=a)).astype(np.float32); B = self.compose(dict(face, mouth=b)).astype(np.float32)
            img = np.clip(A * (1 - w) + B * w, 0, 255).astype(np.uint8)
        else: img = self.compose(face)
        H, W = img.shape[:2]
        s = cv2.resize(img, (max(1, int(round(W * k))), max(1, int(round(H * k)))), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC).astype(np.float32)
        s = np.clip(s, 0, 255); s[..., :3] *= s[..., 3:] / 255
        if len(self.cache) > 16: self.cache.clear()                # big float sources: keep memory bounded
        self.cache[key] = s; return s
    def compose(self, face):
        img = self.body
        sel = [self.patch[(g, nm)] for g, nm in face.items() if nm and (g, nm) in self.patch]
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

def rot_disp(x, y, cx, cy, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a); dx, dy = x - cx, y - cy
    return c * dx - s * dy - dx, s * dx + c * dy - dy
def disp(kit, x, y, P):
    """forward displacement field in pose space (full-res px). P: root, breath, head, head_dy, elbow, wrist."""
    gx, gy = kit.ground; H = kit.H
    w_r = smooth((gy - y) / (0.55 * H))                         # feet stay planted, sway grows up the body
    dx, dy = rot_disp(x, y, gx, gy, P.get('root', 0)); dx = dx * w_r; dy = dy * w_r
    dy = dy - P.get('breath', 0) * (gy - y) * w_r               # breathing: upper body lifts a hair
    wh = kit.head_w(x, y)
    hx, hy = rot_disp(x, y, kit.neck[0], kit.neck[1], P.get('head', 0)); dx = dx + wh * hx; dy = dy + wh * (hy + P.get('head_dy', 0))
    if kit.name == 'kabir-v5wave':
        ex, ey, wx, wy = WAVE5['elbow'] + WAVE5['wrist']
        ux, uy = wx - ex, wy - ey; L = math.hypot(ux, uy); ux, uy = ux / L, uy / L
        tt = ((x - ex) * ux + (y - ey) * uy) / L                         # 0 at the elbow, 1 at the wrist, along the forearm
        # region: the raised hand is alone left of x~560; the forearm is alone left of the coat (x<660) and below the head (y>560)
        region = np.maximum(smooth((560 - x) / 50), smooth((WAVE5['gate_x'] - x) / 50) * smooth((y - 560) / 40))
        wf = np.maximum(smooth((tt - 0.12) / 0.3), smooth((560 - x) / 50)) * region
        fx, fy = rot_disp(x, y, ex, ey, P.get('elbow', 0)); dx = dx + wf * fx; dy = dy + wf * fy
        wwr = smooth((wy + 15 - y) / 50) * smooth((560 - x) / 50)          # hand above the cuff (ramp across the knuckle-free wrist)
        ax, ay = rot_disp(x + wf * fx, y + wf * fy, wx, wy, P.get('wrist', 0)); dx = dx + wwr * ax; dy = dy + wwr * ay
    if kit.name == 'kabir-wave':
        ex, ey, wx, wy = 1217, 800, 1217, 562                    # elbow, wrist of the raised (waving) hand, measured on gridcrop
        wf = smooth((ey - 10 - y) / 110) * smooth((x - 1095) / 100)
        fx, fy = rot_disp(x, y, ex, ey, P.get('elbow', 0)); dx = dx + wf * fx; dy = dy + wf * fy
        wwr = smooth((wy - y) / 40) * smooth((x - 1030) / 60) * (1 - smooth((y - 495) / 30) * smooth((1172 - x) / 30))   # ramps sit in empty gaps (ear|thumb, shoulder|cuff)
        ax, ay = rot_disp(x + wf * fx, y + wf * fy, wx + 0, wy + 0, P.get('wrist', 0)); dx = dx + wwr * ax; dy = dy + wwr * ay
    return dx, dy

def char_layer(win, who, kit, P, face, shot):
    c = CAST[who]; gx, gy, s = to_screen(win, c['feet']); Hs = c['H'] * s; sc = Hs / kit.H
    bx0 = max(0, int(gx - 0.9 * Hs)); by0 = max(0, int(gy - 1.15 * Hs)); bx1 = min(SW, int(gx + 0.9 * Hs)); by1 = min(SH, int(gy + 0.06 * Hs))
    if bx1 <= bx0 or by1 <= by0: return None
    ss = 2 if sc < 0.55 else 1
    # source scale fixed per shot (taken at the end of the push-in) so the cache works; remap absorbs the few % zoom
    sc_ref = sc * (1 + shot['push']) if shot.get('push') else sc
    k = round(sc_ref * ss, 3)
    src = kit.source(k, face)
    lw, lh = (bx1 - bx0) * ss, (by1 - by0) * ss; g = 4
    X = (bx0 + (np.arange(0, lw + g, g, dtype=np.float32) + 0.5) / ss)[None, :]; Y = (by0 + (np.arange(0, lh + g, g, dtype=np.float32) + 0.5) / ss)[:, None]
    X, Y = np.broadcast_arrays(X, Y)
    sgn = -1 if c['flip'] else 1
    px = kit.ground[0] + sgn * (X - gx) / sc; py = kit.ground[1] + (Y - gy) / sc
    qx, qy = px.copy(), py.copy()
    for _ in range(3):                                            # invert the forward field (fixed point, field is smooth & small)
        dx, dy = disp(kit, qx, qy, P); qx, qy = px - dx, py - dy
    # grid cell i was sampled at pixel i*g -> sample the grid at j/g for every output pixel j
    gxs = np.arange(lw, dtype=np.float32) / g; gys = np.arange(lh, dtype=np.float32) / g
    qxg = cv2.remap((qx * k).astype(np.float32), np.broadcast_to(gxs[None, :], (lh, lw)).copy(), np.broadcast_to(gys[:, None], (lh, lw)).copy(), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    qyg = cv2.remap((qy * k).astype(np.float32), np.broadcast_to(gxs[None, :], (lh, lw)).copy(), np.broadcast_to(gys[:, None], (lh, lw)).copy(), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    lay = cv2.remap(src, qxg, qyg, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    if ss > 1: lay = cv2.resize(lay, (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_AREA)
    full = np.zeros((SH, SW, 4), np.float32); full[by0:by1, bx0:bx1] = lay
    def fwd(pt):                                                  # pose-space point -> screen (with the deformation)
        dx, dy = disp(kit, np.float32([[pt[0]]]), np.float32([[pt[1]]]), P); x, y = pt[0] + float(dx[0, 0]), pt[1] + float(dy[0, 0])
        return gx + sgn * (x - kit.ground[0]) * sc, gy + (y - kit.ground[1]) * sc
    return full, (gx, gy, Hs, sc), fwd

WAVE5 = {'elbow': (590.0, 850.0), 'wrist': (458.0, 680.0), 'gate_x': 660.0}
# v5: every Kabir pose is a 3/4-profile painting turned to Dadi (no camera-facing pose / palm); Dadi's surprised pose repainted looking at him
KITS = {f'{c}-{p}': Kit(c, p) for c, p in [('kabir', 'v5wave'), ('kabir', 'v5show'), ('kabir', 'v5keyup'), ('kabir', 'v5beckon2'),
                                            ('dadi', 'calm'), ('dadi', 'v5-surprised'), ('dadi', 'reach')]}
# pose per shot: pose changes only on cuts (the reference anime's limited-animation grammar), so nothing is ever "between" drawings
CASTING = {'wide': ('kabir-v5wave', 'dadi-calm'), 'two-shot': ('kabir-v5show', 'dadi-calm'),
           'dadi-ots-cu': ('kabir-v5show', 'dadi-v5-surprised'), 'kabir-cu': ('kabir-v5keyup', 'dadi-v5-surprised'),
           'dadi-ots-cu-2': ('kabir-v5show', 'dadi-reach'), 'two-shot-2': ('kabir-v5beckon2', 'dadi-reach')}
GEM = json.load(open(f'{ROOT}/poses/gem_v5.json')) if os.path.exists(f'{ROOT}/poses/gem_v5.json') else {}
INSERT = cv2.cvtColor(cv2.imread(f'{ROOT}/_keyed_hd/kabir-v4-insert.png', -1), cv2.COLOR_BGRA2RGBA)
INSERT = cv2.copyMakeBorder(INSERT, 0, 120, 0, 0, cv2.BORDER_REPLICATE)   # the sleeve continues below frame (no gap when it sways)
INSERT_GEM = (1365, 320)

tk2 = T['k2']['t0']; tk3 = T['k3']['t0']; td1 = T['d1']['t0']
def speaking(who, t):
    ids = [L['id'] for L in LINES if (L['who'] == 'kabir') == (who == 'kabir')]
    return any(T[i]['t0'] - 0.05 < t < line_end(i) + 0.05 for i in ids)

def kabir_mouth(f, kit):
    """painted mouth shape for frame f: fine viseme while speaking, the pose's own mouth ('base') otherwise."""
    if not speaking('kabir', f / FPS): return 'base'
    vm = kit.m.get('viseme_map_fine')
    if vm is None: return kit.vmap[VIS['kabir'][f]]
    return vm.get(VISF[f], 'base')

def kabir_state(t, f, kit):
    lv = ENV['kabir'][f]; talking = VIS['kabir'][f] != 'X'
    P = dict(root=0.5 * math.sin(2 * math.pi * 0.3 * t + 0.4), breath=0.0035 * math.sin(2 * math.pi * 0.28 * t),
             head=1.4 * math.sin(2 * math.pi * 0.45 * t) + (2.4 * (lv - 0.4) if talking else 0))
    # accents: a little bounce on "दादी!", a nod on "चलो"
    for tt, amp in ((word_t('k1', 0), 1), (word_t('k1', 2), 0.8), (tk3, 1)):
        u = (t - tt) / 0.35
        if 0 < u < 1: P['head_dy'] = P.get('head_dy', 0) + 10 * amp * math.sin(math.pi * u); P['head'] += 2.5 * amp * math.sin(math.pi * u)
    if kit.name == 'kabir-v5wave':
        on = smooth((t - word_t('k1', 0) + 0.15) / 0.2) * (1 - smooth((t - (c1 - 0.25)) / 0.25))
        P['wrist'] = on * 10 * math.sin(2 * math.pi * 2.3 * t); P['elbow'] = on * 3 * math.sin(2 * math.pi * 2.3 * t - 0.7)
    face = {}
    cur = kabir_mouth(f, kit); prev = kabir_mouth(f - 1, kit) if f > 0 else cur
    if cur != prev: face['mouth'] = (prev, cur, 0.55)                 # eased in over 2 frames: 55% on the change frame, then full
    elif cur != 'base': face['mouth'] = cur
    if eyes_for('kabir', t) == 'closed' and kit.has('eyes', 'closed'): face['eyes'] = 'closed'
    return P, face

def dadi_state(t, f, kit):
    lv = ENV['dadi'][f]; talking = VIS['dadi'][f] != 'X'
    P = dict(root=0.45 * math.sin(2 * math.pi * 0.22 * t + 2), breath=0.003 * math.sin(2 * math.pi * 0.24 * t + 1),
             head=1.1 * math.sin(2 * math.pi * 0.35 * t + 1) + (2.0 * (lv - 0.4) if talking else 0))
    if line_end('k3') - 0.4 < t: P['head'] += 3 * math.sin(2 * math.pi * 1.4 * (t - line_end('k3') + 0.4))   # nod
    u = (t - word_t('d1', 2)) / 0.4
    if 0 < u < 1: P['head_dy'] = -8 * math.sin(math.pi * u)                                                     # "अरे वाह!" lift
    face = {}
    if speaking('dadi', t):
        face['mouth'] = kit.vmap[VIS['dadi'][f]]
        if word_t('d1', 3) + T['d1']['words'][3]['d'] + 0.1 < t < word_t('d1', 4) - 0.08 and kit.has('mouth', 'smile'): face['mouth'] = 'smile'
    if t > line_end('k3') + 0.1 and kit.has('mouth', 'smile'): face['mouth'] = 'smile'
    if eyes_for('dadi', t) == 'closed' and kit.has('eyes', 'closed'): face['eyes'] = 'closed'
    return P, face

def grade_insert(rgba, bgimg):
    a = rgba[..., 3:4] / 255; rgb = rgba[..., :3] * TINT
    X = np.arange(SW)[None, :, None] / SW; rgb = rgb * (1.06 - 0.12 * X)
    amb = cv2.resize(cv2.GaussianBlur(cv2.resize(bgimg, (SW // 4, SH // 4)), (0, 0), 6), (SW, SH))
    rgb = rgb * 0.96 + amb * a * 0.04
    edge = np.clip(a - cv2.erode(a[..., 0], np.ones((5, 5), np.uint8))[..., None], 0, 1)
    rgb = rgb + edge * (amb * a - rgb) * 0.25
    out = rgba.copy(); out[..., :3] = np.clip(rgb, 0, 255 * a); return out

def frame_insert(t, win):
    shot = win[4]; u = (t - shot['t0']) / (shot['t1'] - shot['t0'])
    bg = background(win); bg = cv2.GaussianBlur(bg, (0, 0), 22) * 0.9
    z0 = SW / 2560.0; zoom = 1.0 + 0.06 * ease(u); rot = 1.3 * math.sin(2 * math.pi * 0.55 * (t - shot['t0']) + 0.3)
    sp = (800.0 * z0, 1440.0 * z0)                                 # the sleeve's exit point at the frame bottom stays put
    R = np.vstack([cv2.getRotationMatrix2D(sp, rot, zoom), [0, 0, 1]]); A = np.float64([[z0, 0, 0], [0, z0, 0], [0, 0, 1]])
    M = (R @ A)[:2]; z = z0 * zoom
    src = INSERT.astype(np.float32); src[..., :3] *= src[..., 3:] / 255
    lay = cv2.warpAffine(src, M, (SW, SH), flags=cv2.INTER_CUBIC if z > 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    lay[..., 3] = np.clip(lay[..., 3], 0, 255); lay[..., :3] = np.clip(lay[..., :3], 0, lay[..., 3:])
    lay = grade_insert(lay, bg)
    a = lay[..., 3:4] / 255; img = lay[..., :3] + bg * (1 - a)
    gx, gy = M[:, :2] @ np.float32(INSERT_GEM) + M[:, 2]
    tw = 0.5 + 0.5 * math.sin(2 * math.pi * 1.3 * t)
    img = sparkle(img, gx, gy, 0.11 * SH, 0.85 * min(1, (t - shot['t0']) / 0.25) * (0.55 + 0.45 * tw))
    return np.clip(img, 0, 255).astype(np.uint8)

def frame_at(f):
    t = f / FPS; win = window(t); shot = win[4]
    if shot['name'] == 'key-cu': return frame_insert(t, win)
    bgimg = background(win); kname, dname = CASTING[shot['name']]
    layers = []
    for who, kn, fn in (('dadi', dname, dadi_state), ('kabir', kname, kabir_state)):
        kit = KITS[kn]; P, face = fn(t, f, kit)
        r = char_layer(win, who, kit, P, face, shot)
        if r is None: continue
        cimg, (gx, gy, Hs, sc), fwd = r
        layers.append((who, grade(cimg, bgimg, gx, gy, Hs), gx, gy, Hs, kn, fwd))
    dens = np.zeros((SH, SW), np.float32)
    for who, cimg, gx, gy, Hs, kn, fwd in layers:
        if gy < SH + 0.05 * Hs: dens = 1 - (1 - dens) * (1 - shadow_density(cimg[..., 3] / 255, gx, gy, Hs))
    img = bgimg * (1 - np.clip(dens, 0, 0.8)[..., None] * (1 - SHADOW_RGB))
    for who, cimg, gx, gy, Hs, kn, fwd in sorted(layers, key=lambda l: CAST[l[0]]['feet'][1]):
        a = cimg[..., 3:4] / 255; img = cimg[..., :3] + img * (1 - a)
    for who, cimg, gx, gy, Hs, kn, fwd in layers:
        if kn in GEM:
            px, py = fwd(GEM[kn]); tw = 0.5 + 0.5 * math.sin(2 * math.pi * 1.3 * t)
            img = sparkle(img, px, py, 0.05 * Hs, (0.4 if shot['name'] == 'kabir-cu' else 0.22) * tw)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    print('total', round(TOTAL, 2), 's', N, 'frames; shots', [(s['name'], round(s['t0'], 2)) for s in SHOTS])
    FR = f'{ROOT}/talk6/frames'; os.makedirs(FR, exist_ok=True)
    only = os.environ.get('FRAMES')
    if only:
        for f in map(int, only.split(',')): Image.fromarray(frame_at(f)).save(f'{FR}/f{f:03d}.png')
        sys.exit()
    tmp = OUT + '.part.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(FPS), '-i', '-',
                           '-i', f'{TALK}/mix.wav', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '16', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', tmp], stdin=subprocess.PIPE)
    for f in range(N):
        fr = frame_at(f); Image.fromarray(fr).save(f'{FR}/f{f:03d}.png', compress_level=1)
        ff.stdin.write(fr.tobytes())
        if f % 25 == 0: print('frame', f, flush=True)
    ff.stdin.close(); ff.wait(); os.replace(tmp, OUT); print('wrote', OUT)
