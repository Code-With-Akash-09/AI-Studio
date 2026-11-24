"""plate_v4.py -- v4 plate: remove the hanging lamp beside Dadi's head (Poisson clone of plain wall), re-hang it over the main door at world x~530 (out of every close shot).
in: scenes/courtyard-v2-x4.png  out: scenes/courtyard-v4-x4.png, scenes/prop-lamp-x4.png"""
import cv2, numpy as np, os
R = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets') + '/scenes'
im = cv2.imread(f'{R}/courtyard-v2-x4.png')
bx0, by0, bx1, by1 = 3380, 0, 3655, 460
box = im[by0:by1, bx0:bx1].astype(np.int32)
m = ((box[..., 2] - box[..., 0]) > 18).astype(np.uint8) * 255
n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
for i in range(1, n):
    if st[i, 4] > 40: keep[lab == i] = 255
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
alpha = cv2.GaussianBlur(cv2.dilate(keep, np.ones((3, 3), np.uint8)), (3, 3), 0)
core = cv2.erode(keep, np.ones((3, 3), np.uint8))                 # decontaminate: edge colours come from the lamp, not the blue wall
rgb = cv2.inpaint(im[by0:by1, bx0:bx1].copy(), (255 - core).astype(np.uint8), 4, cv2.INPAINT_TELEA)
alpha = cv2.GaussianBlur(keep, (3, 3), 0)
lamp = np.dstack([rgb, alpha]); cv2.imwrite(f'{R}/prop-lamp-x4.png', lamp)
dx = 340; rx0, rx1, ry1 = 3354, 3690, 528; pad = 24
src = np.roll(im, -dx, axis=1); base = im.copy(); base[:pad + 4, rx0 - 6:rx1 + 6] = src[:pad + 4, rx0 - 6:rx1 + 6]  # clean top boundary
srcp = cv2.copyMakeBorder(src, pad, 0, 0, 0, cv2.BORDER_REFLECT); basep = cv2.copyMakeBorder(base, pad, 0, 0, 0, cv2.BORDER_REFLECT)
mask = np.zeros(basep.shape[:2], np.uint8); mask[pad // 2:pad + ry1, rx0:rx1] = 255
ys, xs = np.where(mask > 0); ctr = (int((xs.min() + xs.max() + 1) / 2), int((ys.min() + ys.max() + 1) / 2))
out = cv2.seamlessClone(srcp, basep, mask, ctr, cv2.NORMAL_CLONE)[pad:].astype(np.float32)
# top band (pre-filled rows) : carry the cloned shading of row T upward with src detail, feathered at the sides
T = pad + 10; sf = src.astype(np.float32); band = out[T:T + 1, rx0:rx1] + (sf[:T, rx0:rx1] - sf[T:T + 1, rx0:rx1])
w = np.clip(np.minimum(np.arange(rx1 - rx0), np.arange(rx1 - rx0)[::-1]) / 24., 0, 1)[None, :, None]
orig_top = im[:T, rx0:rx1].astype(np.float32); out[:T, rx0:rx1] = band * w + out[:T, rx0:rx1] * (1 - w)
H, W = alpha.shape; tx = 2120 - (3515 - bx0); a = alpha.astype(np.float32)[..., None] / 255
sh = np.zeros(out.shape[:2], np.float32); sx, sy = tx - 85, by0 + 70
sh[sy:sy + H, sx:sx + W] = (alpha.astype(np.float32) / 255)[: out.shape[0] - sy]
o = out.astype(np.float32) * (1 - 0.24 * cv2.GaussianBlur(sh, (0, 0), 10)[..., None])
reg = o[by0:by0 + H, tx:tx + W]; reg[:] = lamp[..., :3] * a + reg * (1 - a)
cv2.imwrite(f'{R}/courtyard-v4-x4.png', o.clip(0, 255).astype(np.uint8))
