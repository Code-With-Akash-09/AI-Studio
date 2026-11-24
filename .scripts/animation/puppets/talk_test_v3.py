"""Kabir + Kamla Dadi dialogue test v3: anime-style coverage (wide -> two-shot -> key insert CU -> OTS CU -> two-shot),
pose changes per line, hand-held magic key prop, 1080p, HD kits, perspective-matched scene.
python talk_test_v3.py [out.mp4]   (FRAMES=a,b,c renders only those frames as PNGs)"""
import sys, json, math, subprocess, wave, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from puppet import Puppet, render, prop_point
import numpy as np, cv2
from PIL import Image

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
TALK = f'{ROOT}/talk3'; FPS = 25; SW, SH = 1920, 1080
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/kabir-talk-test-v3.mp4'
HERE = os.path.dirname(os.path.abspath(__file__))
KEY = f'{ROOT}/scenes/prop-magic-key.png'; KEY_GRIP = (175, 472); KEY_GEM = (406.6, 156.8)

# ---------------- scene geometry (measured on the 1280x720 plate) ----------------
HORIZON, CAM_H = 201.0, 0.79
def px_per_m(y): return (y - HORIZON) / CAM_H
CAST = {
    'kabir': dict(kit='kabir-hd', view='34', flip=True, feet=(705.0, 392.0), metres=1.55),
    'dadi': dict(kit='kamla-dadi-hd', view='34', flip=False, feet=(962.0, 397.0), metres=1.45),
}
for c in CAST.values():
    c['pup'] = Puppet(ROOT, c['kit']); c['V'] = c['pup'].rig['views'][c['view']]
    c['H'] = c['metres'] * px_per_m(c['feet'][1]); c['S'] = c['H'] / c['V']['height']

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
with wave.open(f'{TALK}/mix.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix[:int(TOTAL * SR)], -1, 1) * 32767).astype(np.int16).tobytes())
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

K_REST = dict(arm_upper_L=-28, arm_lower_L=-6, arm_upper_R=28, arm_lower_R=6, root=0, head=0, key_tilt=0, key=0, hL='fist', hR='relaxed')
K_WAVE = dict(K_REST, arm_upper_R=-62, arm_lower_R=-48, hR='open_palm', head=-3)
K_LOW = dict(K_REST, arm_upper_L=-8, arm_lower_L=34, key=1, root=-4, head=-4, arm_upper_R=18, arm_lower_R=-22, hR='open_palm')
K_UP = dict(K_LOW, arm_upper_L=58, arm_lower_L=62, key_tilt=-6, root=-6, head=-6, arm_upper_R=24, arm_lower_R=-8, hR='relaxed')
K_OFFER = dict(K_UP, arm_upper_L=44, arm_lower_L=28, key_tilt=34, root=-3, head=-2)
K_POINT = dict(K_OFFER, arm_upper_L=8, arm_lower_L=72, key_tilt=0, arm_upper_R=-36, arm_lower_R=-30, hR='point', root=2, head=4)
K_END = dict(K_POINT, arm_upper_R=8, arm_lower_R=-10, hR='relaxed', root=-3, head=-3)
tk2 = T['k2']['t0']; tk3 = T['k3']['t0']; td1 = T['d1']['t0']
KABIR_KEYS = [(0, K_REST), (word_t('k1', 0) + 0.05, K_WAVE), (word_t('k1', 1) + 0.4, K_WAVE), (word_t('k1', 2), K_REST),
              (tk2, K_LOW), (word_t('k2', 3), K_LOW), (word_t('k2', 4) + 0.15, K_UP), (line_end('k2') + 0.3, K_UP),
              (td1 + 0.2, K_OFFER), (tk3 - 0.05, K_OFFER), (tk3 + 0.35, K_POINT), (line_end('k3') - 0.2, K_POINT), (line_end('k3') + 0.4, K_END)]
D_REST = dict(arm_upper_L=-27, arm_lower_L=-5, arm_upper_R=22, arm_lower_R=9, root=0, head=0, hL='relaxed', hR='relaxed')
D_LEAN = dict(D_REST, root=-2, head=-5, arm_upper_R=20, arm_lower_R=-16)
D_REACH = dict(D_REST, arm_upper_L=38, arm_lower_L=48, hL='open_palm', root=-3, head=-4)
D_BLESS = dict(D_REST, arm_upper_L=20, arm_lower_L=70, hL='blessing', head=3)
DADI_KEYS = [(0, D_REST), (word_t('k1', 0) + 0.3, D_REST), (word_t('k1', 1), dict(D_REST, head=-4)), (tk2 + 0.4, D_LEAN),
             (td1 + 0.1, D_LEAN), (word_t('d1', 4) - 0.1, D_LEAN), (word_t('d1', 4) + 0.35, D_REACH), (tk3 + 0.4, D_REACH),
             (line_end('k3') - 0.3, D_BLESS)]

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

def kabir_pose(t, f):
    p = track(KABIR_KEYS, t)
    # walk-in during the wide shot
    walk_u = min(1, t / 1.35)
    dx = -95 * (1 - ease(walk_u)); ph = 2 * math.pi * t * 1.6
    if walk_u < 1:
        amp = 13 * (1 - ease((t - 1.05) / 0.3)) if t > 1.05 else 13
        p['leg_upper_L'] = amp * math.sin(ph); p['leg_upper_R'] = -amp * math.sin(ph)
        p['leg_lower_L'] = max(0, amp * 0.9 * math.sin(ph + 1.2)); p['leg_lower_R'] = max(0, amp * 0.9 * math.sin(ph + 1.2 + math.pi))
        bob = -14 * abs(math.sin(ph)) * (1 - walk_u)
    else: bob = 0
    if p['hR'] == 'open_palm' and t < tk2: p['arm_lower_R'] += 12 * math.sin(2 * math.pi * 2.6 * t)  # the wave
    lv = ENV['kabir'][f]
    p['root'] += 0.6 * math.sin(2 * math.pi * 0.3 * t + 0.4)
    p['head'] += 1.6 * math.sin(2 * math.pi * 0.45 * t) + (2.2 * (lv - 0.4) if VIS['kabir'][f] != 'X' else 0)
    p['acc_scarf_end'] = -0.6 * p['head'] + 1.4 * math.sin(2 * math.pi * 0.5 * t)
    p['acc_satchel'] = -2.0 * p['root'] + 0.06 * (p['arm_upper_R'] - 28) + (3 * math.sin(ph) if walk_u < 1 else 0)
    p['offset'] = (0, bob)
    look = 'look_right' if tk3 + 0.1 < t < word_t('k3', 1) + 0.05 else 'open'   # glances at the door on "चलो", back to Dadi on "दादी"
    face = {'eyes': eyes_for('kabir', t, look), 'mouth': V_K[VIS['kabir'][f]]}
    face['brows'] = 'raised' if (word_t('k1', 0) < t < word_t('k1', 2) + 0.5 or word_t('k2', 4) < t < line_end('k2') + 0.2 or tk3 < t < tk3 + 0.6) else 'neutral'
    if line_end('k2') + 0.05 < t < td1 - 0.05 or t > line_end('k3') + 0.1: face = {'expr': 'happy'}
    if td1 < t < line_end('d1') and VIS['kabir'][f] == 'X': face['brows'] = 'neutral'
    p['face'] = face; p['hands'] = {'L': p.pop('hL'), 'R': p.pop('hR')}
    props = []
    if p.pop('key') > 0.5:
        chain = p['arm_upper_L'] + p['arm_lower_L']
        wob = 3 * math.sin(2 * math.pi * 0.9 * t) if c2 <= t < c3 else 0
        props.append(dict(img=KEY, side='L', grip=KEY_GRIP, at=(363, 1150), deg=-38 - chain + p.pop('key_tilt') + wob, scale=0.5, z=-0.1))
    else: p.pop('key_tilt')
    p['props'] = props
    return p, dx

def dadi_pose(t, f):
    p = track(DADI_KEYS, t); lv = ENV['dadi'][f]
    p['root'] += 0.5 * math.sin(2 * math.pi * 0.22 * t + 2)
    p['head'] += 1.2 * math.sin(2 * math.pi * 0.35 * t + 1) + (2.0 * (lv - 0.4) if VIS['dadi'][f] != 'X' else 0)
    if line_end('k3') - 0.4 < t: p['head'] += 3 * math.sin(2 * math.pi * 1.4 * (t - line_end('k3') + 0.4))   # nod
    p['acc_pallu'] = -1.5 * p['root'] + 0.8 * math.sin(2 * math.pi * 0.4 * t)
    face = {'eyes': eyes_for('dadi', t), 'mouth': V_D[VIS['dadi'][f]]}
    face['brows'] = 'raised' if (word_t('k1', 1) < t < tk2 + 0.6 or td1 - 0.1 < t < word_t('d1', 3) + 0.4) else 'neutral'
    if word_t('d1', 3) + T['d1']['words'][3]['d'] + 0.1 < t < word_t('d1', 4) - 0.08: face = {'expr': 'happy'}   # the "अरे वाह!" beat
    if t > line_end('k3') - 0.3: face = {'expr': 'happy'}
    p['face'] = face; p['hands'] = {'L': p.pop('hL'), 'R': p.pop('hR')}
    return p

V_K = CAST['kabir']['V']['face']['viseme_map']; V_D = CAST['dadi']['V']['face']['viseme_map']

# ---------------- camera / background ----------------
bg4 = np.array(Image.open(f'{ROOT}/scenes/courtyard-v2-x4.png').convert('RGB'))   # 4 px per world unit
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
def char_layer(win, who, pose, dx=0.0):
    c = CAST[who]; gx, gy, s = to_screen(win, (c['feet'][0] + dx, c['feet'][1])); sc = s * c['S']; Hs = c['H'] * s
    bx0 = max(-20, int(gx - 0.8 * Hs)); by0 = max(-20, int(gy - 1.12 * Hs))
    bx1 = min(SW + 20, int(gx + 0.8 * Hs)); by1 = min(SH + 20, int(gy + 0.08 * Hs))
    if bx1 <= bx0 or by1 <= by0: return None
    ss = 2 if sc < 0.55 else 1          # supersample when the kit is drawn smaller than ~half size
    lw, lh = bx1 - bx0, by1 - by0
    cimg = render(c['pup'], c['view'], pose, (lw * ss, lh * ss), (ss * (gx - bx0), ss * (gy - by0), ss * sc), flip=c['flip'])
    if ss > 1: cimg = cv2.resize(cimg, (lw, lh), interpolation=cv2.INTER_AREA)
    full = np.zeros((SH, SW, 4), np.float32)
    X0, Y0, X1, Y1 = max(0, bx0), max(0, by0), min(SW, bx1), min(SH, by1)
    full[Y0:Y1, X0:X1] = cimg[Y0 - by0:Y1 - by0, X0 - bx0:X1 - bx0]
    return full, (gx, gy, Hs, sc)
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

def frame_at(f):
    t = f / FPS
    win = window(t); shot = win[4]
    bgimg = background(win)
    kp, kdx = kabir_pose(t, f); dp = dadi_pose(t, f)
    layers = []
    for who, pose, dx in (('dadi', dp, 0.0), ('kabir', kp, kdx)):
        r = char_layer(win, who, pose, dx)
        if r is None: continue
        cimg, (gx, gy, Hs, sc) = r
        layers.append((who, grade(cimg, bgimg, gx, gy, Hs), gx, gy, Hs, sc, pose, dx))
    dens = np.zeros((SH, SW), np.float32)
    for who, cimg, gx, gy, Hs, sc, pose, dx in layers:
        if gy < SH + 0.05 * Hs: dens = 1 - (1 - dens) * (1 - shadow_density(cimg[..., 3] / 255, gx, gy, Hs))
    img = bgimg * (1 - np.clip(dens, 0, 0.8)[..., None] * (1 - SHADOW_RGB))
    # depth order: whoever is nearer the camera (larger feet y) is drawn last
    for who, cimg, gx, gy, Hs, sc, pose, dx in sorted(layers, key=lambda l: CAST[l[0]]['feet'][1]):
        a = cimg[..., 3:4] / 255; img = cimg[..., :3] + img * (1 - a)
    # glint on the key's gem in the close-ups
    for who, cimg, gx, gy, Hs, sc, pose, dx in layers:
        if who == 'kabir' and pose['props'] and shot['name'] in ('key-cu', 'dadi-ots-cu', 'two-shot', 'kabir-cu', 'dadi-ots-cu-2'):
            c = CAST['kabir']; bx, by, s = to_screen(win, (c['feet'][0] + dx, c['feet'][1]))
            px, py = prop_point(c['pup'], c['view'], pose, (bx, by, sc), pose['props'][0], KEY_GEM, flip=c['flip'])
            u = (t - shot['t0']); tw = 0.5 + 0.5 * math.sin(2 * math.pi * 1.3 * t)
            strength = (0.85 * min(1, u / 0.25) * (0.55 + 0.45 * tw)) if shot['name'] == 'key-cu' else 0.25 * tw
            img = sparkle(img, px, py, 0.05 * Hs, strength)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    print('total', round(TOTAL, 2), 's', N, 'frames; shots', [(s['name'], round(s['t0'], 2)) for s in SHOTS])
    os.makedirs(f'{TALK}/frames', exist_ok=True)
    only = os.environ.get('FRAMES')
    if only:
        for f in map(int, only.split(',')): Image.fromarray(frame_at(f)).save(f'{TALK}/frames/f{f:03d}.png')
        sys.exit()
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(FPS), '-i', '-',
                           '-i', f'{TALK}/mix.wav', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '16', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    for f in range(N):
        fr = frame_at(f)
        if f % 10 == 0: Image.fromarray(fr).save(f'{TALK}/frames/f{f:03d}.png')
        ff.stdin.write(fr.tobytes())
    ff.stdin.close(); ff.wait(); print('wrote', OUT)
