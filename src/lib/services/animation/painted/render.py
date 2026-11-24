"""Render a painted-puppet plan to MP4 (phase 2, M2/M3).

python render.py plan.json out.mp4 [--workers=3] [--frames=a,b,c --frames-dir=dir]
Each plan line needs "wav" (mono PCM WAV) and "words" ([{t, d, w}], seconds from the wav start).
Output: 1920x1080, 25 fps, SAR 1, H.264 yuv420p + 44.1 kHz stereo AAC (voices only), so the pipeline concats it as-is.
Chunks of frames render in parallel worker processes (bounded memory: each worker keeps <= 8 kits, 3 sources per kit).
"""
import sys, os, json, math, wave, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, cv2
import engine as E
FPS, SW, SH = E.FPS, E.SW, E.SH
SR = 24000
PUPPETS_SCRIPTS = os.environ.get('PUPPET_SCRIPTS', os.path.join(HERE, '..', '..', '..', '..', '..', '.scripts', 'animation', 'puppets'))
sys.path.insert(0, os.path.abspath(PUPPETS_SCRIPTS))
import visemes_fine


def read_wav(path):
    with wave.open(path) as w:
        sr = w.getframerate(); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    if sr != SR: x = np.interp(np.arange(0, len(x) * SR / sr) * sr / SR, np.arange(len(x)), x).astype(np.float32)
    return x


class Episode:
    def __init__(self, plan):
        self.p = plan; self.N = int(round(plan['duration'] * FPS)); self.actors = plan['actors']; self.lines = plan['lines']
        stages = E.load_stages(plan.get('stages') or os.path.join(HERE, 'stages.json'))
        self.stage = E.Stage(stages[plan['stage']])
        self.bank = E.KitBank(cap=8)
        self.VIS = {a: ['X'] * self.N for a in self.actors}; self.ENV = {a: np.zeros(self.N) for a in self.actors}
        self.speak = {a: [] for a in self.actors}
        for L in self.lines:
            pcm = read_wav(L['wav']); L['_pcm'] = pcm
            hop = SR // FPS; n = int(math.ceil(len(pcm) / hop))
            env = np.array([np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(pcm) else 0 for i in range(n)])
            env = np.clip(env / (np.percentile(env[env > 0.01], 95) + 1e-6 if (env > 0.01).any() else 1), 0, 1)
            v = visemes_fine.word_visemes(L['words'], env.round(3).tolist(), FPS) if L.get('words') else ['B' if e > 0.2 else 'X' for e in env]
            f0 = int(round(L['t0'] * FPS)); a = L['speaker']
            for i in range(min(len(v), self.N - f0)): self.VIS[a][f0 + i] = v[i]
            for i in range(min(n, self.N - f0)): self.ENV[a][f0 + i] = env[i]
            self.speak[a].append((L['t0'], L['t0'] + L['dur']))
        for a in self.ENV: self.ENV[a] = np.convolve(self.ENV[a], np.ones(3) / 3, 'same')
        self.BL = {a: E.blink_times(7 + 13 * i, plan['duration'] + 1) for i, a in enumerate(self.actors)}
        self.props = {}

    def mix(self, path):
        mix = np.zeros(int(self.p['duration'] * SR) + SR, np.float32)
        for L in self.lines:
            i = int(L['t0'] * SR); x = L['_pcm']; mix[i:i + len(x)] += x
        mix = mix[:int(self.p['duration'] * SR)]
        with wave.open(path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())

    def speaking(self, a, t): return any(t0 - 0.05 < t < t1 + 0.05 for t0, t1 in self.speak[a])

    def shot_at(self, t):
        for s in self.p['shots']:
            if s['t0'] <= t < s['t1']: return s
        return self.p['shots'][-1] if t >= self.p['shots'][-1]['t0'] else self.p['shots'][0]

    def state(self, a, t, f, kit, idx):
        ph = 0.7 * idx + 0.4; talking = self.speaking(a, t); lv = self.ENV[a][min(f, self.N - 1)] if talking else 0
        P = dict(root=0.5 * math.sin(2 * math.pi * 0.27 * t + ph), breath=0.0035 * math.sin(2 * math.pi * 0.26 * t + ph),
                 head=1.2 * math.sin(2 * math.pi * 0.4 * t + ph) + (2.2 * (lv - 0.4) if talking else 0))
        if kit.pose == 'laugh': P['head'] += 2.2 * math.sin(2 * math.pi * 2.6 * t); P['head_dy'] = 3 * abs(math.sin(2 * math.pi * 2.6 * t))
        if self.actors[a].get('dog'):
            P['head'] += 2.5 * math.sin(2 * math.pi * 0.9 * t + ph)                       # panting bob
            P['breath'] = 0.012 * math.sin(2 * math.pi * 2.2 * t)
        face = {}
        def mouth(ff):
            if not self.speaking(a, ff / FPS): return 'base'
            return kit.vmap.get(self.VIS[a][min(ff, self.N - 1)], 'base')
        cur = mouth(f); prev = mouth(f - 1) if f > 0 else cur
        if cur != prev: face['mouth'] = (prev, cur, 0.55)
        elif cur != 'base': face['mouth'] = cur
        if E.eyes_at(self.BL[a], t) == 'closed' and kit.has('eyes', 'closed'): face['eyes'] = 'closed'
        return P, face

    def prop_img(self, pid):
        if pid not in self.props:
            path = os.path.join(E.ROOT, 'props', f'{pid}.png')
            if not os.path.exists(path): self.props[pid] = None
            else:
                im = cv2.imread(path, -1); self.props[pid] = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA).astype(np.float32)
        return self.props[pid]

    def frame_insert(self, t, win, shot):
        bg = self.stage.background(win, shot['focus_y'], 0); bg = cv2.GaussianBlur(bg, (0, 0), 24) * 0.85
        P = self.prop_img(shot.get('prop'))
        if P is None: return bg
        u = (t - shot['t0']) / max(shot['t1'] - shot['t0'], 0.1)
        h, w = P.shape[:2]; base = min(0.78 * SH / h, 0.62 * SW / w); z = base * (1 + 0.07 * E.ease(u))
        rot = 1.2 * math.sin(2 * math.pi * 0.45 * (t - shot['t0']) + 0.3)
        M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, z); M[0, 2] += SW / 2 - w / 2; M[1, 2] += SH * 0.52 - h / 2
        src = P.copy(); src[..., :3] *= src[..., 3:] / 255
        lay = cv2.warpAffine(src, M, (SW, SH), flags=cv2.INTER_CUBIC if z > 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        lay[..., 3] = np.clip(lay[..., 3], 0, 255); lay[..., :3] = np.clip(lay[..., :3], 0, lay[..., 3:])
        a = lay[..., 3:4] / 255
        sh = cv2.GaussianBlur(a, (0, 0), 18)[..., None] if a.ndim == 3 else cv2.GaussianBlur(a, (0, 0), 18)
        sh = np.roll(np.roll(sh.reshape(SH, SW, 1), 18, 0), 10, 1)
        img = bg * (1 - 0.45 * sh)
        rgb = lay[..., :3] * self.stage.tint
        img = rgb + img * (1 - a)
        return img

    def frame(self, f):
        t = f / FPS; shot = self.shot_at(t); win = E.window(shot, t)
        if shot['kind'] == 'insert': return np.clip(self.frame_insert(t, win, shot), 0, 255).astype(np.uint8)
        bg = self.stage.background(win, shot['focus_y'], shot.get('dof', 300)); amb = E.ambient(bg)
        layers = []
        for i, (a, A) in enumerate(self.actors.items()):
            kit = self.bank.get(a, shot['poses'].get(a, 'idle'))
            P, face = self.state(a, t, f, kit, i)
            r = E.char_layer(win, A, kit, P, face, shot)
            if r is None: continue
            cimg, (gx, gy, Hs, sc) = r
            layers.append((A['feet'][1], E.grade(cimg, amb, gx, gy, Hs, tint=self.stage.tint, defocus=(shot.get('defocus') or {}).get(a, 0) * (SH / win[3]) / 4), gx, gy, Hs))
        dens = np.zeros((SH, SW), np.float32)
        for _, cimg, gx, gy, Hs in layers:
            if gy < SH + 0.05 * Hs: dens = 1 - (1 - dens) * (1 - E.shadow_density(cimg[..., 3] / 255, gx, gy, Hs))
        img = bg * (1 - np.clip(dens, 0, 0.8)[..., None] * (1 - E.SHADOW_RGB))
        for _, cimg, gx, gy, Hs in sorted(layers, key=lambda l: l[0]):
            a = cimg[..., 3:4] / 255; img = cimg[..., :3] + img * (1 - a)
        return np.clip(img, 0, 255).astype(np.uint8)


def enc_cmd(out, fps=FPS):
    return ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(fps), '-i', '-',
            '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '17', '-pix_fmt', 'yuv420p', '-vf', 'setsar=1', out]


def render_chunk(plan_path, a, b, out):
    ep = Episode(json.load(open(plan_path, encoding='utf-8')))
    ff = subprocess.Popen(enc_cmd(out), stdin=subprocess.PIPE)
    for f in range(a, b):
        ff.stdin.write(ep.frame(f).tobytes())
        if (f - a) % 50 == 0: print(f'chunk {a}-{b}: frame {f}', flush=True)
    ff.stdin.close(); ff.wait()
    if ff.returncode: raise RuntimeError(f'ffmpeg failed on chunk {a}-{b}')


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]; opt = dict(x[2:].split('=', 1) for x in sys.argv[1:] if x.startswith('--') and '=' in x)
    plan_path, out = args[0], args[1]
    plan = json.load(open(plan_path, encoding='utf-8')); N = int(round(plan['duration'] * FPS))
    if opt.get('frames'):
        ep = Episode(plan); d = opt.get('frames-dir', os.path.dirname(out)); os.makedirs(d, exist_ok=True)
        from PIL import Image
        for f in map(int, opt['frames'].split(',')): Image.fromarray(ep.frame(min(f, N - 1))).save(f'{d}/f{f:04d}.png')
        return
    workers = max(1, int(opt.get('workers', os.environ.get('PAINTED_WORKERS', 3))))
    tmp = tempfile.mkdtemp(prefix='painted-', dir=os.path.dirname(os.path.abspath(out)))
    ep = Episode(plan); ep.mix(f'{tmp}/voice.wav'); del ep
    bounds = [round(i * N / workers) for i in range(workers + 1)]
    procs = []
    for i in range(workers):
        procs.append(subprocess.Popen([sys.executable, os.path.abspath(__file__), '--chunk', plan_path, str(bounds[i]), str(bounds[i + 1]), f'{tmp}/part{i}.mp4']))
    rc = [p.wait() for p in procs]
    if any(rc): raise SystemExit(f'render chunk failed: {rc}')
    with open(f'{tmp}/list.txt', 'w') as fh:
        for i in range(workers): fh.write(f"file 'part{i}.mp4'\n")
    part = out + '.part.mp4'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{tmp}/list.txt', '-i', f'{tmp}/voice.wav',
                           '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2',
                           '-t', f'{N / FPS:.3f}', '-movflags', '+faststart', part])
    os.replace(part, out)
    for fn in os.listdir(tmp): os.remove(os.path.join(tmp, fn))
    os.rmdir(tmp)
    print(json.dumps({'out': out, 'duration': N / FPS, 'frames': N}))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--chunk':
        render_chunk(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
    else: main()
