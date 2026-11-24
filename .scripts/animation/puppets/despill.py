"""Remove residual magenta key spill from a kit, only near alpha edges:  python despill.py kabir-hd/**/*.png"""
import sys, numpy as np, cv2
from PIL import Image
for f in sys.argv[1:]:
    a = np.array(Image.open(f)).astype(np.int16)
    edge = cv2.dilate((a[..., 3] < 250).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=8) > 0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    ex = np.minimum(r, b) - g; m = (ex > 4) & edge
    if m.any():
        a[..., 0] = np.where(m, r - ex, r); a[..., 2] = np.where(m, b - ex, b)
        Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f)
