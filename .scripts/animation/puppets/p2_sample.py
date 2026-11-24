"""p2_sample.py [out.mp4] -- ~12 s phase-2 sample: Kabir, Kamla Dadi and Bittu from the p2 pose libraries (poses/p2/<char>-<pose>)
in the v4 courtyard, reusing the v6 renderer (camera, DOF, grade, shadows, deformation) and the talk3 Hindi lines k1, k2, d1.
Poses change only on cuts; every speaker uses the fine viseme alphabet; blinks from the kits' closed-eye patches."""
import os, sys, math, subprocess
sys.argv = sys.argv[:1] + ['/dev/null'] + sys.argv[1:]        # talk_test_v6 reads argv[1] as its own output path
import numpy as np, cv2
from PIL import Image
import talk_test_v6 as V
import visemes_fine, json
OUT = sys.argv[2] if len(sys.argv) > 2 else f'{V.ROOT}/p2sample/p2-sample.mp4'
FPS, SW, SH = V.FPS, V.SW, V.SH

# cast: Kabir faces right (flipped 3/4-left kit) toward Dadi; Bittu stands behind-left of Kabir, also facing right
V.CAST['bittu'] = dict(flip=True, feet=(585.0, 380.0), metres=1.32)
V.CAST['bittu']['H'] = V.CAST['bittu']['metres'] * V.px_per_m(V.CAST['bittu']['feet'][1])
V.CAST['dadi']['metres'] = 1.45; V.CAST['dadi']['H'] = 1.45 * V.px_per_m(V.CAST['dadi']['feet'][1])

class Kit(V.Kit):
    def source(self, k, face):
        if len(self.cache) > 3: self.cache.clear()             # 9 kits loaded: keep the float source cache small (OOM before)
        return super().source(k, face)
KITS = {}
def kit(char, pose):
    n = f'{char}-{pose}'
    if n not in KITS: KITS[n] = Kit(f'p2/{char}', pose)
    return KITS[n]

T, word_t, line_end = V.T, V.word_t, V.line_end
END = line_end('d1') + 1.3; N = int(END * FPS)
import wave
MIX = f'{V.ROOT}/p2sample/mix.wav'; os.makedirs(os.path.dirname(MIX), exist_ok=True)
mix = np.zeros(int(END * V.SR) + V.SR, np.float32)
for L in V.LINES:
    if L['id'] != 'k3': i = int(L['t0'] * V.SR); mix[i:i + len(L['pcm'])] += L['pcm']
with wave.open(MIX, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(V.SR); w.writeframes((np.clip(mix[:int(END * V.SR)], -1, 1) * 32767).astype(np.int16).tobytes())
VISF = {w: ['X'] * V.N for w in ('kabir', 'dadi')}
for L in V.LINES:
    if L['id'] == 'k3': continue
    who = 'kabir' if L['who'] == 'kabir' else 'dadi'
    words = json.load(open(f"{V.TALK}/{L['id']}.tight.json", encoding='utf-8')); env = json.load(open(f"{V.TALK}/{L['id']}.env.json"))
    v = visemes_fine.word_visemes(words, env, FPS); f0 = int(round(L['t0'] * FPS))
    for i in range(min(len(v), V.N - f0)): VISF[who][f0 + i] = v[i]
def speaking(who, t):
    ids = [i for i in ('k1', 'k2', 'd1') if (T[i]['who'] == 'kabir') == (who == 'kabir')]
    return any(T[i]['t0'] - 0.05 < t < line_end(i) + 0.05 for i in ids)
V.BLINK['bittu'] = V.blinks(11, V.N)

def head_c(who, up=0.82):
    c = V.CAST[who]; return c['feet'][0], c['feet'][1] - up * c['H']
c1 = word_t('k2', 0) - 0.12; c2 = T['d1']['t0'] - 0.15; c3 = word_t('d1', 2) - 0.1; c4 = word_t('d1', 4) - 0.12; c5 = line_end('d1') + 0.05
bx, by = head_c('bittu'); dx_, dy_ = head_c('dadi'); kx, ky = head_c('kabir')
SHOTS = [
    dict(name='wide', t0=0, t1=c1, c=(800, 250), h=440, push=0.02, dof=300),
    dict(name='two-shot', t0=c1, t1=c2, c=(820, 160), h=320, push=0.025, dof=520),
    dict(name='dadi-cu', t0=c2, t1=c3, c=(dx_ - 20, dy_ + 25), h=200, push=0.03, dof=900),
    dict(name='bittu-cu', t0=c3, t1=c4, c=(bx + 30, by + 30), h=190, push=0.03, dof=900),
    dict(name='dadi-cu-2', t0=c4, t1=c5, c=(dx_ - 30, dy_ + 40), h=235, push=0.03, dof=800),
    dict(name='wide-2', t0=c5, t1=END + 1, c=(800, 245), h=430, push=0.02, dof=320),
]
V.SHOTS[:] = SHOTS
CASTING = {  # (kabir, dadi, bittu) poses per shot
    'wide': ('explain', 'idle', 'idle'), 'two-shot': ('offer', 'idle', 'think'),
    'dadi-cu': ('offer', 'surprised', 'surprised'), 'bittu-cu': ('offer', 'surprised', 'surprised'),
    'dadi-cu-2': ('offer', 'explain', 'laugh'), 'wide-2': ('laugh', 'laugh', 'laugh'),
}
CHAR = {'kabir': 'kabir', 'dadi': 'kamla-dadi', 'bittu': 'bittu'}

def state(who, t, f, k):
    ph = {'kabir': 0.4, 'dadi': 2.0, 'bittu': 1.1}[who]
    talking = speaking(who, t) if who != 'bittu' else False
    lv = V.ENV['kabir' if who == 'kabir' else 'dadi'][f] if talking else 0
    P = dict(root=0.5 * math.sin(2 * math.pi * 0.27 * t + ph), breath=0.0035 * math.sin(2 * math.pi * 0.26 * t + ph),
             head=1.2 * math.sin(2 * math.pi * 0.4 * t + ph) + (2.2 * (lv - 0.4) if talking else 0))
    if who == 'kabir':
        for tt, amp in ((word_t('k1', 0), 1), (word_t('k1', 2), 0.8)):
            u = (t - tt) / 0.35
            if 0 < u < 1: P['head_dy'] = 10 * amp * math.sin(math.pi * u); P['head'] += 2.5 * amp * math.sin(math.pi * u)
    if who == 'dadi':
        u = (t - word_t('d1', 2)) / 0.4
        if 0 < u < 1: P['head_dy'] = -8 * math.sin(math.pi * u)
    if k.m['pose'] == 'laugh': P['head'] += 2.2 * math.sin(2 * math.pi * 2.6 * t); P['head_dy'] = P.get('head_dy', 0) + 3 * abs(math.sin(2 * math.pi * 2.6 * t))
    face = {}
    def mouth(ff):
        if who == 'bittu' or not speaking(who, ff / FPS): return 'base'
        return k.vmap.get(VISF[who][ff], 'base')
    cur = mouth(f); prev = mouth(f - 1) if f > 0 else cur
    if cur != prev: face['mouth'] = (prev, cur, 0.55)
    elif cur != 'base': face['mouth'] = cur
    if V.eyes_for(who, t) == 'closed' and k.has('eyes', 'closed'): face['eyes'] = 'closed'
    return P, face

def frame_at(f):
    t = f / FPS; win = V.window(t); shot = win[4]
    bgimg = V.background(win); poses = dict(zip(('kabir', 'dadi', 'bittu'), CASTING[shot['name']]))
    layers = []
    for who in ('dadi', 'bittu', 'kabir'):
        k = kit(CHAR[who], poses[who]); P, face = state(who, t, f, k)
        r = V.char_layer(win, who, k, P, face, shot)
        if r is None: continue
        cimg, (gx, gy, Hs, sc), fwd = r
        layers.append((who, V.grade(cimg, bgimg, gx, gy, Hs), gx, gy, Hs))
    dens = np.zeros((SH, SW), np.float32)
    for who, cimg, gx, gy, Hs in layers:
        if gy < SH + 0.05 * Hs: dens = 1 - (1 - dens) * (1 - V.shadow_density(cimg[..., 3] / 255, gx, gy, Hs))
    img = bgimg * (1 - np.clip(dens, 0, 0.8)[..., None] * (1 - V.SHADOW_RGB))
    for who, cimg, gx, gy, Hs in sorted(layers, key=lambda l: V.CAST[l[0]]['feet'][1]):
        a = cimg[..., 3:4] / 255; img = cimg[..., :3] + img * (1 - a)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    print('sample', round(END, 2), 's', N, 'frames; shots', [(s['name'], round(s['t0'], 2)) for s in SHOTS], flush=True)
    FR = f'{V.ROOT}/p2sample/frames'; os.makedirs(FR, exist_ok=True)
    only = os.environ.get('FRAMES')
    if only:
        for f in map(int, only.split(',')): Image.fromarray(frame_at(f)).save(f'{FR}/f{f:03d}.png')
        sys.exit()
    tmp = OUT + '.part.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(FPS), '-i', '-',
                           '-i', MIX, '-t', f'{N / FPS:.3f}', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '16',
                           '-pix_fmt', 'yuv420p', '-af', f'afade=t=out:st={N / FPS - 0.5:.2f}:d=0.5', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', tmp], stdin=subprocess.PIPE)
    for f in range(N):
        fr = frame_at(f); ff.stdin.write(fr.tobytes())
        if f % 25 == 0: print('frame', f, flush=True)
    ff.stdin.close(); ff.wait(); os.replace(tmp, OUT); print('wrote', OUT)
