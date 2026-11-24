"""keyhole.py keyed.png... -- kill enclosed background holes the edge keyer can't reach (e.g. magenta between fingers):
pixels whose colour is the screen colour (red-magenta: R high, G ~0, B well below R) get alpha 0, with a 1px soft edge."""
import sys, numpy as np, cv2
from PIL import Image
for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert('RGBA')).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hole = (r > 140) & (g < 45) & (r - b > 80) & (b > 20)
    hole = cv2.morphologyEx(hole.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n = int(hole.sum())
    if n:
        soft = cv2.GaussianBlur(cv2.dilate(hole, np.ones((3, 3), np.uint8)).astype(np.float32), (3, 3), 0)
        a[..., 3] = (a[..., 3] * (1 - soft)).astype(np.int16)
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f)
    print(f, 'hole px', n)
