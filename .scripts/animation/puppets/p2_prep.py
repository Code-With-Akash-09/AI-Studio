"""p2_prep.py name... -- phase-2 pose prep: _gen/p2/<name>.jpg -> chroma key (_keyed/p2) -> interior hole kill -> Real-ESRGAN x2
(_keyed_hd/p2) -> square head crop over the screen colour for the mouth-grid edit (_gen/p2heads/<name>.src.png + .box.json).
Head box: the silhouette's top band (connected to the top of the head), widened to a square; coordinates are HD pose space."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from key import key as chroma_key
import sr_kit
ROOT = '/workspace/anim-demo/puppets'
def head_box(a, frac=0.2):
    ys, xs = np.where(a > 128); top, bot = ys.min(), ys.max(); H = bot - top
    band = (a > 128).astype(np.uint8); band[int(top + frac * H):] = 0
    n, lab = cv2.connectedComponents(band); tx = int(np.median(np.where(band[top:top + 3].any(0))[0]))
    seed = lab[top + 1, tx] or lab[top + 2, tx]; m = lab == seed if seed else band.astype(bool)
    yy, xx = np.where(m); x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
    S = int(max(x1 - x0, y1 - y0) * 1.18); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + 0.03 * S
    return int(cx - S / 2), int(cy - S / 2), S, H
for name in sys.argv[1:]:
    g = f'{ROOT}/_gen/p2/{name}.jpg'; k = f'{ROOT}/_keyed/p2/{name}.png'; hd = f'{ROOT}/_keyed_hd/p2/{name}.png'
    rgb = np.array(Image.open(g).convert('RGB')); out, bg, kind = chroma_key(rgb); Image.fromarray(out, 'RGBA').save(k)
    if not os.path.exists(hd) or os.environ.get('FORCE'): sr_kit.sr_png(k, hd)
    H = cv2.cvtColor(cv2.imread(hd, -1), cv2.COLOR_BGRA2RGBA).astype(np.float32)
    x0, y0, S, fh = head_box(H[..., 3]); x0 = max(0, min(H.shape[1] - S, x0)); y0 = max(0, min(H.shape[0] - S, y0))
    c = H[y0:y0 + S, x0:x0 + S]; al = c[..., 3:] / 255; src = c[..., :3] * al + np.float32(bg) * (1 - al)
    cv2.imwrite(f'{ROOT}/_gen/p2heads/{name}.src.png', cv2.cvtColor(cv2.resize(src, (1024, 1024), interpolation=cv2.INTER_CUBIC).clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    json.dump(dict(x0=x0, y0=y0, S=S, key=[float(v) for v in bg], kind=kind), open(f'{ROOT}/_gen/p2heads/{name}.box.json', 'w'))
    print(name, kind, 'head box', x0, y0, S, flush=True)
