"""Kabir Hindi talk test v2: 1080p native, HD kit, perspective-matched scene, depth layers.
python talk_test_v2.py [out.mp4]
World units = pixels of the 1280x720 background plate (horizon y=201 measured from the floor-tile vanishing point)."""
import sys, json, math, subprocess, wave, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from puppet import Puppet, render
import numpy as np, cv2
from PIL import Image

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
TALK = f'{ROOT}/talk'; FPS = 25; SW, SH = 1920, 1080
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/kabir-talk-test-v2.mp4'
KIT = os.environ.get('KIT', 'kabir-hd'); VIEW = '34'
TEXT = open(f'{TALK}/text.txt', encoding='utf-8').read().strip()
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------- scene geometry (measured) ----------------
HORIZON = 201.0          # vanishing point of floor tiles (634, 201)
CAM_H = 0.79             # camera height in metres (door 2.1 m tall = 305 px at wall base y=315)
KABIR_M = 1.55
FEET = (742.0, 361.0)    # where Kabir stands (world)
KH = (FEET[1] - HORIZON) * KABIR_M / CAM_H        # his height in world px (perspective-correct)
POT = dict(base=(624.0, 556.0), metres=0.70)       # foreground pot, nearer the camera than Kabir
def px_per_m(y): return (y - HORIZON) / CAM_H
WIN0 = (300.0, 6.0, 930.0, 523.125)                # initial camera window (x, y, w, h) in world

# ---------------- audio + visemes ----------------
w = wave.open(f'{TALK}/line.wav'); sr = w.getframerate(); pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
dur = len(pcm) / sr; tail = 0.7; N = int((dur + tail) * FPS); hop = sr // FPS
env = np.array([np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(pcm) else 0 for i in range(N)])
env = np.clip(env / (np.percentile(env[env > 0.01], 95) + 1e-6), 0, 1)
json.dump(env.round(3).tolist(), open(f'{TALK}/env.json', 'w'))
vis = json.loads(subprocess.check_output(['node', os.path.join(HERE, 'visemes_cli.mjs'), TEXT, f'{TALK}/words.json', f'{TALK}/env.json', str(FPS)]))
pup = Puppet(ROOT, KIT); V = pup.rig['views'][VIEW]; vmap = V['face']['viseme_map']
S_WORLD = KH / V['height']

# ---------------- motion (same performance as v1) ----------------
def ease(a, b, u): u = min(1, max(0, u)); u = u * u * (3 - 2 * u); return a + (b - a) * u
REST = {'arm_upper_L': -28, 'arm_lower_L': -6, 'arm_upper_R': 28, 'arm_lower_R': 6}
EXPLAIN = {'arm_upper_L': -24, 'arm_lower_L': -10, 'arm_upper_R': 6, 'arm_lower_R': -52}
POINT = {'arm_upper_L': -26, 'arm_lower_L': -8, 'arm_upper_R': -34, 'arm_lower_R': -30}
KEYS = [(0, REST, None), (1.25, REST, None), (1.75, EXPLAIN, 'open_palm'), (4.6, EXPLAIN, 'open_palm'), (5.2, REST, None),
        (6.0, REST, None), (6.5, POINT, 'point'), (8.2, POINT, 'point'), (8.9, REST, None), (99, REST, None)]
def arms(t):
    for (t0, p0, h0), (t1, p1, h1) in zip(KEYS, KEYS[1:]):
        if t0 <= t < t1:
            u = (t - t0) / (t1 - t0); return {k: ease(p0[k], p1[k], u) for k in p0}, (h1 if u > 0.5 else h0)
    return dict(REST), None
BLINKS = [1.1, 3.35, 5.8, 8.05]
def eyes(t):
    for b in BLINKS:
        k = int(round((t - b) * FPS))
        if 0 <= k < 4: return ['half', 'closed', 'closed', 'half'][k]
    return 'open'
def brows(t): return 'raised' if (0.05 < t < 0.95 or 3.35 < t < 4.0) else 'neutral'
envs = np.convolve(env, np.ones(3) / 3, 'same')

# ---------------- assets ----------------
bg4 = np.array(Image.open(f'{ROOT}/scenes/courtyard-v2-x4.png').convert('RGB'))
BG_PPU = 2.5  # bg working resolution: px per world unit (screen needs ~2.06-2.16)
bgw = cv2.resize(bg4, (int(1280 * BG_PPU), int(720 * BG_PPU)), interpolation=cv2.INTER_AREA).astype(np.float32)
pot = np.array(Image.open(f'{ROOT}/_keyed/fg-pot.png')).astype(np.float32)
ys, xs = np.where(pot[..., 3] > 30); pot = pot[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
pot[..., :3] *= pot[..., 3:4] / 255
POT_H = POT['metres'] * px_per_m(POT['base'][1])   # world px

def window(t):
    u = ease(0, 1, t / (N / FPS))
    z = 1 + 0.05 * u                                   # slow push-in
    cx = WIN0[0] + WIN0[2] / 2 + 30 * u + 3.0 * math.sin(2 * math.pi * t / 8.5)
    cy = WIN0[1] + WIN0[3] / 2 - 18 * u + 1.6 * math.sin(2 * math.pi * t / 6.3 + 1)
    h = WIN0[3] / z; w_ = h * 16 / 9
    return cx - w_ / 2, cy - h / 2, w_, h, z

def to_screen(win, p):
    x0, y0, w_, h, _ = win; s = SH / h
    return (p[0] - x0) * s, (p[1] - y0) * s, s

def depth_blur_sigma(y_world):
    if y_world < 315: y_world = 315          # back wall: constant depth
    return 420 * abs(1 / max(y_world - HORIZON, 1) - 1 / (FEET[1] - HORIZON))

def background(win):
    x0, y0, w_, h, _ = win; s = SH / h
    M = np.float32([[s / BG_PPU, 0, -x0 * s], [0, s / BG_PPU, -y0 * s]])
    img = cv2.warpAffine(bgw, M, (SW, SH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    # depth of field: per-row blend of blur levels by distance from the focus plane (Kabir's feet)
    levels = [0, 1.0, 2.0, 3.0]
    blurred = [img] + [cv2.GaussianBlur(img, (0, 0), sg * s / 2.07) for sg in levels[1:]]
    rows_w = y0 + (np.arange(SH) + 0.5) / s
    sig = np.array([depth_blur_sigma(y) for y in rows_w])
    out = np.zeros_like(img)
    for i in range(len(levels) - 1):
        a, b = levels[i], levels[i + 1]
        wgt = np.clip(1 - np.abs(sig - a) / (b - a), 0, 1)
        if i == len(levels) - 2: wgt = np.where(sig >= b, 0, wgt)
        out += blurred[i] * wgt[:, None, None]
    out += blurred[-1] * (np.clip((sig - levels[-2]) / (levels[-1] - levels[-2]), 0, 1) * (sig > levels[-2]))[:, None, None]
    return out, sig

def char_layer(win, pose):
    """Render Kabir supersampled 2x into a local box, then INTER_AREA down: crisp edges, no shimmer."""
    gx, gy, s = to_screen(win, FEET); sc = s * S_WORLD; Hs = KH * s
    lx0 = int(gx - 0.75 * Hs); ly0 = int(gy - 1.1 * Hs); lw = int(1.5 * Hs); lh = int(1.2 * Hs)
    c2 = render(pup, VIEW, pose, (lw * 2, lh * 2), (2 * (gx - lx0), 2 * (gy - ly0), 2 * sc))
    c = cv2.resize(c2, (lw, lh), interpolation=cv2.INTER_AREA)
    return c, (lx0, ly0), (gx, gy, Hs)

def paste(dst_pm_canvas_shape, layer, off):
    out = np.zeros(dst_pm_canvas_shape, np.float32)
    x0, y0 = off; h, w = layer.shape[:2]
    X0, Y0 = max(0, x0), max(0, y0); X1, Y1 = min(SW, x0 + w), min(SH, y0 + h)
    if X1 > X0 and Y1 > Y0: out[Y0:Y1, X0:X1] = layer[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
    return out

TINT = np.array([1.035, 0.975, 0.89], np.float32)
def grade(c, bgimg, gx, gy, Hs):
    a = c[..., 3:4] / 255; rgb = c[..., :3] * TINT
    X = (np.arange(SW)[None, :, None] - (gx - 0.35 * Hs)) / (0.7 * Hs)
    Y = (np.arange(SH)[:, None, None] - (gy - Hs)) / Hs
    rgb = rgb * (1.07 - 0.14 * np.clip(X, 0, 1))                      # key light from screen-left (sun side of the plate)
    rgb = rgb * (1 - 0.16 * np.clip((Y - 0.9) / 0.1, 0, 1))           # ambient occlusion at the boots
    rgb = rgb + np.array([22, 9, 0], np.float32) * np.clip((Y - 0.6) / 0.4, 0, 1) * a   # warm floor bounce
    amb = cv2.GaussianBlur(bgimg, (0, 0), 25)
    rgb = rgb * 0.96 + amb * a * 0.04                                  # ambient scene colour
    inner = cv2.erode(a[..., 0], np.ones((3, 3), np.uint8), iterations=1)[..., None]
    edge = np.clip(a - inner, 0, 1)                                    # 1px light wrap
    rgb = rgb + edge * (cv2.GaussianBlur(bgimg, (0, 0), 4) * a - rgb) * 0.22
    out = c.copy(); out[..., :3] = np.clip(rgb, 0, 255 * a)
    return out

def shadows(a, gx, gy, Hs, potbase, pot_w):
    # cast shadow: sun from upper-left behind the camera -> shadow falls right and slightly back
    M = np.float32([[1, -0.55, 0.55 * gy], [0, 0.14, gy * 0.86]])
    cast = cv2.GaussianBlur(cv2.warpAffine(a, M, (SW, SH)), (0, 0), 0.012 * Hs + 2) * 0.38
    cont = np.zeros((SH, SW), np.float32)
    cv2.ellipse(cont, (int(gx), int(gy - 2)), (int(0.17 * Hs), int(0.022 * Hs)), 0, 0, 360, 1, -1)
    cont = cv2.GaussianBlur(cont, (0, 0), 0.02 * Hs) * 0.65
    core = np.zeros((SH, SW), np.float32)
    cv2.ellipse(core, (int(gx), int(gy - 1)), (int(0.11 * Hs), int(0.010 * Hs)), 0, 0, 360, 1, -1)
    core = cv2.GaussianBlur(core, (0, 0), 0.006 * Hs + 1) * 0.5
    pc = np.zeros((SH, SW), np.float32)
    cv2.ellipse(pc, (int(potbase[0]), int(potbase[1] - 3)), (int(0.42 * pot_w), int(0.05 * pot_w)), 0, 0, 360, 1, -1)
    pc = cv2.GaussianBlur(pc, (0, 0), 0.05 * pot_w) * 0.6
    return np.clip(1 - (1 - cast) * (1 - cont) * (1 - core) * (1 - pc), 0, 0.8)[..., None]

def pot_layer(win, z):
    gx, gy, s = to_screen(win, POT['base'])
    par = 1 + 0.6 * (z - 1)                                            # nearer object: a little extra parallax on the push-in
    cx, cy = SW / 2, SH / 2; gx = cx + (gx - cx) * par; gy = cy + (gy - cy) * par
    ph = POT_H * s * par; sc = ph / pot.shape[0]
    M = np.float32([[sc, 0, gx - pot.shape[1] * sc / 2], [0, sc, gy - ph]])
    p = cv2.warpAffine(pot, M, (SW, SH), flags=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    p = np.clip(p, 0, None)
    p[..., :3] *= TINT * 0.97
    return cv2.GaussianBlur(p, (0, 0), 4.5), (gx, gy), pot.shape[1] * sc

SHADOW_RGB = np.array([0.42, 0.36, 0.40], np.float32)
def frame_at(f):
    t = f / FPS
    pose, hand = arms(t); lv = envs[f]
    pose['head'] = 2.2 * math.sin(2 * math.pi * 0.42 * t) + 2.5 * (lv - 0.4) * (vis[f] != 'X')
    pose['root'] = 0.7 * math.sin(2 * math.pi * 0.27 * t + 0.6)
    pose['acc_scarf_end'] = -0.6 * pose['head'] + 1.5 * math.sin(2 * math.pi * 0.5 * t)
    pose['acc_satchel'] = -2.0 * pose['root'] + 0.08 * (pose['arm_upper_R'] - 28)
    face = {'eyes': eyes(t), 'brows': brows(t), 'mouth': vmap.get(vis[f], 'closed')}
    if t > dur + 0.1: face = {'expr': 'happy'}
    pose['face'] = face
    if hand: pose['hands'] = {'R': hand}
    win = window(t)
    bgimg, _ = background(win)
    cl, off, (gx, gy, Hs) = char_layer(win, pose)
    c = paste((SH, SW, 4), cl, off)
    c = grade(c, bgimg, gx, gy, Hs)
    pl, pb, pw = pot_layer(win, win[4])
    sh = shadows(c[..., 3] / 255, gx, gy, Hs, pb, pw)
    img = bgimg * (1 - sh * (1 - SHADOW_RGB))
    a = c[..., 3:4] / 255; img = c[..., :3] + img * (1 - a)
    a = pl[..., 3:4] / 255; img = pl[..., :3] + img * (1 - a)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    only = os.environ.get('FRAMES')
    os.makedirs(f'{TALK}/frames-v2', exist_ok=True)
    if only:
        for f in map(int, only.split(',')): Image.fromarray(frame_at(f)).save(f'{TALK}/frames-v2/f{f:03d}.png')
        sys.exit()
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(FPS), '-i', '-',
                           '-i', f'{TALK}/line.wav', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '16', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '160k', '-af', f'apad=pad_dur={tail}', '-shortest', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    for f in range(N):
        fr = frame_at(f)
        if f % 25 == 0 or f in (30, 45, 170, 200): Image.fromarray(fr).save(f'{TALK}/frames-v2/f{f:03d}.png')
        ff.stdin.write(fr.tobytes())
    ff.stdin.close(); ff.wait(); print('wrote', OUT, N, 'frames')
