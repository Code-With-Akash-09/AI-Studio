"""p2_faces.py out.jpg name... -- eye-line check of raw generated poses: crop each head (top band of the keyed silhouette) at 2.5x."""
import sys, numpy as np, cv2
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from key import key as chroma_key
from PIL import Image
tiles = []
for n in sys.argv[2:]:
    rgb = np.array(Image.open(f'/workspace/anim-demo/puppets/_gen/p2/{n}.jpg').convert('RGB')); a = chroma_key(rgb)[0][..., 3]
    ys, xs = np.where(a > 128); top = ys.min(); H = ys.max() - top; band = a[top:int(top + 0.13 * H)] > 128
    cx = int(np.median(np.where(band.any(0))[0])); s = int(0.16 * H)
    c = rgb[max(0, top):top + s, max(0, cx - s // 2):cx + s // 2]; c = cv2.resize(c, (300, 300)); c = cv2.cvtColor(c, cv2.COLOR_RGB2BGR)
    cv2.putText(c, n, (4, 18), 0, 0.5, (0, 0, 255), 2); tiles.append(c)
tiles += [np.zeros_like(tiles[0])] * (-len(tiles) % 4)
cv2.imwrite(sys.argv[1], np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]))
