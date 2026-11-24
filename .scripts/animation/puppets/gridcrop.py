"""gridcrop.py img x0 y0 x1 y1 out [step] -- crop with labelled coordinate grid (real coords) at 2x for landmark picking"""
import sys, cv2, numpy as np
im = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED); x0,y0,x1,y1 = map(int, sys.argv[2:6]); step = int(sys.argv[7]) if len(sys.argv) > 7 else 20
c = im[y0:y1, x0:x1]
if c.shape[2] == 4:
    a = c[..., 3:4] / 255.; c = (c[..., :3] * a + 200 * (1 - a)).astype(np.uint8)
s = 2; c = cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // step + 1) * step, x1, step):
    cv2.line(c, ((x - x0) * s, 0), ((x - x0) * s, c.shape[0]), (0, 255, 0) if x % 100 else (0, 0, 255), 1)
    if x % (step*2) == 0: cv2.putText(c, str(x), ((x - x0) * s + 2, 14), 0, 0.4, (0, 0, 255), 1)
for y in range((y0 // step + 1) * step, y1, step):
    cv2.line(c, (0, (y - y0) * s), (c.shape[1], (y - y0) * s), (0, 255, 0) if y % 100 else (0, 0, 255), 1)
    if y % (step*2) == 0: cv2.putText(c, str(y), (2, (y - y0) * s - 2), 0, 0.4, (0, 0, 255), 1)
cv2.imwrite(sys.argv[6], c)
