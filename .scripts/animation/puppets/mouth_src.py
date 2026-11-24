"""mouth_src.py pose-dir... -- square head crops (HD body over the key colour) used as references for per-shape mouth edits.
Writes _gen/mouths/<kit>.src.png and _gen/mouths/<kit>.box.json (crop box in HD pose space)."""
import sys, os, json, numpy as np, cv2
ROOT = '/workspace/anim-demo/puppets'; KEY = np.float32([53, 0, 194])   # BGR of the magenta screen
for kit in sys.argv[1:]:
    d = f'{ROOT}/poses/{kit}'; m = json.load(open(f'{d}/pose.json')); b = cv2.imread(f'{d}/body.png', -1).astype(np.float32)
    (ex, ey), (mx, my) = m['eyes'], m['mouth']; dist = np.hypot(mx - ex, my - ey)
    S = int(round(4.6 * dist / 2) * 2); cx, cy = mx, (ey + my) / 2 + 0.2 * dist
    x0, y0 = int(cx - S / 2), int(cy - S / 2); x0 = max(0, min(b.shape[1] - S, x0)); y0 = max(0, min(b.shape[0] - S, y0))
    c = b[y0:y0 + S, x0:x0 + S]; a = c[..., 3:] / 255; rgb = c[..., :3] * a + KEY * (1 - a)
    out = f'{ROOT}/_gen/mouths/{kit}.src.png'; cv2.imwrite(out, cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_CUBIC).clip(0, 255).astype(np.uint8))
    json.dump(dict(x0=x0, y0=y0, S=S), open(f'{ROOT}/_gen/mouths/{kit}.box.json', 'w')); print(kit, x0, y0, S)
