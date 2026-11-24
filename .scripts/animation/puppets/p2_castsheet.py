"""p2_castsheet.py out.jpg char... -- cast pose sheet: one row per character, the 7 p2 poses facing left (as painted), then the same
7 mirrored (facing right, as used for the other side of a two-shot). Per character standing height (seated = 74% of it); eye-mouth
distance was tried and is unreliable (open mouths move the mouth centre)."""
import sys, os, json, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
POSES = ['idle', 'explain', 'surprised', 'laugh', 'think', 'offer', 'sit']
CW, CH, LAB = 170, 250, 150
chars = sys.argv[2:]
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: F = f2 = ImageFont.load_default()
W = Image.new('RGB', (LAB + CW * 14 + 20, 40 + CH * len(chars)), (232, 228, 220)); d = ImageDraw.Draw(W)
for j, p in enumerate(POSES * 2):
    d.text((LAB + j * CW + 8, 12), p + (' (L)' if j < 7 else ' (R)'), fill=(60, 60, 60), font=f2)
for i, c in enumerate(chars):
    y0 = 40 + i * CH; d.text((10, y0 + CH // 2 - 10), c, fill=(30, 30, 30), font=F)
    def load(p):
        fn = f'{ROOT}/poses/p2/{c}-{p}/body.png'
        return cv2.cvtColor(cv2.imread(fn, -1), cv2.COLOR_BGRA2RGBA) if os.path.exists(fn) else None
    def hd(p):                                                   # head size = eye-mouth distance (each gen is framed differently)
        m = json.load(open(f'{ROOT}/poses/p2/{c}-{p}/pose.json')); return float(np.hypot(*(np.subtract(m['eyes'], m['mouth']))))
    idle = load('idle'); ys, xs = np.where(idle[..., 3] > 30); s0 = (CH - 16) / (ys.max() - ys.min() + 1); h0 = hd('idle')
    for j, p in enumerate(POSES):
        b = load(p)
        if b is None: continue
        ys, xs = np.where(b[..., 3] > 30); b = b[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        s = (CH - 16) * (0.74 if p == 'sit' else 1.0) / b.shape[0]   # standing poses share a height; seated ~74% of it
        k = min(s, (CW - 8) / b.shape[1], (CH - 10) / b.shape[0]); b = cv2.resize(b, (max(1, int(b.shape[1] * k)), max(1, int(b.shape[0] * k))), interpolation=cv2.INTER_AREA)
        for m, img in ((0, b), (7, b[:, ::-1])):
            im = Image.fromarray(np.ascontiguousarray(img), 'RGBA'); x = LAB + (j + m) * CW + (CW - im.size[0]) // 2; y = y0 + CH - 6 - im.size[1]
            W.paste(im, (x, y), im)
    d.line([(LAB, y0 + CH - 3), (W.size[0] - 20, y0 + CH - 3)], fill=(200, 195, 185))
d.line([(LAB + 7 * CW - 2, 30), (LAB + 7 * CW - 2, W.size[1])], fill=(150, 140, 130), width=2)
W.save(sys.argv[1], quality=90); print(sys.argv[1], W.size)
