"""Kabir Hindi talk test: Edge TTS + word-boundary visemes, composited into a painted scene."""
import sys, json, math, subprocess, wave, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from puppet import *
import numpy as np, cv2
from PIL import Image

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
TALK = f'{ROOT}/talk'; FPS = 25; Wc, Hc = 1280, 720
VIEW = sys.argv[1] if len(sys.argv) > 1 else '34'
OUT = sys.argv[2] if len(sys.argv) > 2 else f'{ROOT}/kabir-talk-test.mp4'
TEXT = open(f'{TALK}/text.txt', encoding='utf-8').read().strip()
REPO = os.environ.get('ANIM_REPO', '/workspace/ai-studio-anim')

# ---- audio envelope + visemes (reuse the pipeline's own visemes.js) ----
w = wave.open(f'{TALK}/line.wav'); sr = w.getframerate(); pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
dur = len(pcm) / sr; tail = 0.7; N = int((dur + tail) * FPS)
hop = sr // FPS
env = np.array([np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(pcm) else 0 for i in range(N)])
env = np.clip(env / (np.percentile(env[env > 0.01], 95) + 1e-6), 0, 1)
json.dump(env.round(3).tolist(), open(f'{TALK}/env.json', 'w'))
vis = json.loads(subprocess.check_output(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'visemes_cli.mjs'), TEXT, f'{TALK}/words.json', f'{TALK}/env.json', str(FPS)]))
pup = Puppet(ROOT, 'kabir'); V = pup.rig['views'][VIEW]; vmap = V['face']['viseme_map']
print('frames', N, 'visemes', ''.join(vis))

# ---- motion ----
def ease(a, b, u): u = min(1, max(0, u)); u = u * u * (3 - 2 * u); return a + (b - a) * u
REST = {'arm_upper_L': -28, 'arm_lower_L': -6, 'arm_upper_R': 28, 'arm_lower_R': 6}
EXPLAIN = {'arm_upper_L': -24, 'arm_lower_L': -10, 'arm_upper_R': 6, 'arm_lower_R': -52}
POINT = {'arm_upper_L': -26, 'arm_lower_L': -8, 'arm_upper_R': -34, 'arm_lower_R': -30}
KEYS = [(0, REST, None), (1.25, REST, None), (1.75, EXPLAIN, 'open_palm'), (4.6, EXPLAIN, 'open_palm'), (5.2, REST, None),
        (6.0, REST, None), (6.5, POINT, 'point'), (8.2, POINT, 'point'), (8.9, REST, None), (99, REST, None)]
def arms(t):
    for (t0, p0, h0), (t1, p1, h1) in zip(KEYS, KEYS[1:]):
        if t0 <= t < t1:
            u = (t - t0) / (t1 - t0); pose = {k: ease(p0[k], p1[k], u) for k in p0}
            hand = h1 if u > 0.5 else h0
            return pose, hand
    return dict(REST), None
BLINKS = [1.1, 3.35, 5.8, 8.05]
def eyes(t):
    for b in BLINKS:
        k = int(round((t - b) * FPS))
        if 0 <= k < 4: return ['half', 'closed', 'closed', 'half'][k]
    return 'open'
def brows(t): return 'raised' if (0.05 < t < 0.95 or 3.35 < t < 4.0) else 'neutral'
envs = np.convolve(env, np.ones(3) / 3, 'same')

# ---- scene integration ----
bg = np.array(Image.open(f'{ROOT}/scenes/courtyard.jpg').convert('RGB').resize((Wc, Hc))).astype(np.float32)
bg_blur = cv2.GaussianBlur(bg, (0, 0), 18)
GX, GY = 760, 655; S = 505 / V['height']
TINT = np.array([1.04, 0.965, 0.86], np.float32)
def grade(c):
    a = c[..., 3:4] / 255
    rgb = c[..., :3] * TINT
    ys, xs = np.where(a[..., 0] > 0.05)
    if len(xs):
        x0, x1 = xs.min(), xs.max(); y0, y1 = ys.min(), ys.max()
        gx = np.clip((np.arange(Wc) - x0) / max(1, x1 - x0), 0, 1)[None, :, None]      # key light from screen right
        gy = np.clip((np.arange(Hc)[:, None, None] - y0) / max(1, y1 - y0), 0, 1)
        rgb = rgb * (0.9 + 0.16 * gx) * (1.0 - 0.06 * gy)
        rgb = rgb + (np.array([30, 12, 0], np.float32) * np.clip(gy - 0.7, 0, 1) / 0.3) * a  # warm floor bounce on the feet/legs
    rgb = rgb * 0.93 + bg_blur * a * 0.07  # ambient scene colour
    # light wrap: scene light bleeding over the silhouette edge
    edge = np.clip(a - cv2.erode(a[..., 0], np.ones((5, 5)), iterations=1)[..., None], 0, 1)
    rgb = rgb + edge * (bg_blur - rgb / np.maximum(a, 1e-3)) * 0.25 * a
    c = c.copy(); c[..., :3] = np.clip(rgb, 0, 255 * a)
    return cv2.GaussianBlur(c, (0, 0), 0.6)
def shadows(a):
    # cast shadow (light front-right -> falls back-left) + soft contact shadow at the feet
    M = np.float32([[1, 0.42, -0.42 * GY], [0, 0.17, GY * 0.83]])
    cast = cv2.GaussianBlur(cv2.warpAffine(a, M, (Wc, Hc)), (0, 0), 4) * 0.42
    cont = np.zeros((Hc, Wc), np.float32)
    cv2.ellipse(cont, (GX, GY - 3), (int(0.36 * V['height'] * S * 0.5), 13), 0, 0, 360, 1, -1)
    cont = cv2.GaussianBlur(cont, (0, 0), 6) * 0.72
    return np.clip(np.maximum(cast, cont), 0, 0.75)[..., None]  # shadow density
SHADOW_COL = np.array([0.80, 0.70, 0.72], np.float32)  # shadows on terracotta are cooler

ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{Wc}x{Hc}', '-r', str(FPS), '-i', '-',
                       '-i', f'{TALK}/line.wav', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-b:a', '128k',
                       '-af', f'apad=pad_dur={tail}', '-shortest', OUT], stdin=subprocess.PIPE)
os.makedirs(f'{TALK}/frames', exist_ok=True)
for f in range(N):
    t = f / FPS
    pose, hand = arms(t)
    lv = envs[f]
    pose['head'] = 2.2 * math.sin(2 * math.pi * 0.42 * t) + 2.5 * (lv - 0.4) * (vis[f] != 'X')
    pose['root'] = 0.7 * math.sin(2 * math.pi * 0.27 * t + 0.6)
    pose['acc_scarf_end'] = -0.6 * pose['head'] + 1.5 * math.sin(2 * math.pi * 0.5 * t)
    pose['acc_satchel'] = -2.0 * pose['root'] + 0.08 * (pose['arm_upper_R'] - 28)
    face = {'eyes': eyes(t), 'brows': brows(t), 'mouth': vmap.get(vis[f], 'closed')}
    if t > dur + 0.1: face = {'expr': 'happy'}
    pose['face'] = face
    if hand: pose['hands'] = {'R': hand}
    c = render(pup, VIEW, pose, (Wc, Hc), (GX, GY, S))
    c = grade(c)
    frame = bg * (1 - shadows(c[..., 3] / 255) * (1 - 0.5 * SHADOW_COL))
    frame = over_bg(frame, c).astype(np.uint8)
    if f % 25 == 0 or f in (30, 45, 170, 200): Image.fromarray(frame).save(f'{TALK}/frames/f{f:03d}.png')
    ff.stdin.write(frame.tobytes())
ff.stdin.close(); ff.wait(); print('wrote', OUT)
