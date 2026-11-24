"""p2_props.py -- key the painted prop paintings (props/_src/<id>.jpg, green screen) to props/<id>.png (RGBA, trimmed) + contact sheet."""
import sys, os, glob, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from key import key as chroma_key
R = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets') + '/props'
tiles = []
for p in sorted(glob.glob(f'{R}/_src/*.jpg')):
    pid = os.path.splitext(os.path.basename(p))[0]
    rgb = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB)
    out = chroma_key(rgb)
    rgba = out[0] if isinstance(out, tuple) else out
    a = rgba[..., 3]; ys, xs = np.where(a > 20); pad = 12
    rgba = rgba[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
    cv2.imwrite(f'{R}/{pid}.png', cv2.cvtColor(rgba.astype(np.uint8), cv2.COLOR_RGBA2BGRA))
    t = np.full((300, 300, 3), 70, np.uint8); s = min(280 / rgba.shape[0], 280 / rgba.shape[1]); r = cv2.resize(rgba.astype(np.float32), None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    y0, x0 = (300 - r.shape[0]) // 2, (300 - r.shape[1]) // 2; al = r[..., 3:] / 255
    t[y0:y0 + r.shape[0], x0:x0 + r.shape[1]] = (r[..., :3] * al + t[y0:y0 + r.shape[0], x0:x0 + r.shape[1]] * (1 - al)).astype(np.uint8)
    cv2.putText(t, pid, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1); tiles.append(t); print(pid, rgba.shape)
rows = [np.hstack(tiles[i:i + 5] + [np.full((300, 300, 3), 70, np.uint8)] * (5 - len(tiles[i:i + 5]))) for i in range(0, len(tiles), 5)]
cv2.imwrite(f'{R}/_props.jpg', cv2.cvtColor(np.vstack(rows), cv2.COLOR_RGB2BGR))
