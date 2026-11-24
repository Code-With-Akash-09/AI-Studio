"""mouths_v6.py out.jpg kit... -- 100% (HD pose pixels) mouth crops of every mouth shape of every kit, replace-mask composited
exactly like the renderer, over neutral grey; one row per kit. Plus a second, wider crop row option: WIDE=1 shows eyes+glasses too."""
import sys, os, json, numpy as np, cv2
ROOT = '/workspace/anim-demo/puppets'
ORDER = ['base', 'closed', 'MBP', 'aa', 'E', 'I', 'O', 'U', 'FV', 'L', 'smile']
out, kits = sys.argv[1], sys.argv[2:]; wide = os.environ.get('WIDE') == '1'
rows = []
for kit in kits:
    d = f'{ROOT}/poses/{kit}'; m = json.load(open(f'{d}/pose.json')); body = cv2.imread(f'{d}/body.png', -1).astype(np.float32)
    (ex, ey), (mx, my) = m['eyes'], m['mouth']; dist = np.hypot(mx - ex, my - ey)
    if wide: cx, cy, hw, hh = (ex + mx) / 2, (ey + my) / 2 + 0.2 * dist, 1.5 * dist, 1.35 * dist
    else: cx, cy, hw, hh = mx, my + 0.15 * dist, 1.05 * dist, 0.8 * dist
    x0, y0, x1, y1 = int(cx - hw), int(cy - hh), int(cx + hw), int(cy + hh)
    tiles = []
    for nm in ORDER:
        img = body.copy()
        if nm != 'base':
            v = m['face']['mouth'].get(nm)
            if v is None: continue
            p = cv2.imread(f'{d}/{v["file"]}', -1).astype(np.float32); mk = cv2.imread(f'{d}/{v["mask"]}', -1).astype(np.float32)[..., None] / 255
            h, w = p.shape[:2]; reg = img[v['y']:v['y'] + h, v['x']:v['x'] + w]; reg[:] = p * mk + reg * (1 - mk)
        c = img[y0:y1, x0:x1]; a = c[..., 3:] / 255; t = (c[..., :3] * a + 190 * (1 - a)).astype(np.uint8)
        t = cv2.copyMakeBorder(t, 22, 0, 0, 0, cv2.BORDER_CONSTANT, value=(30, 30, 30))
        cv2.putText(t, f'{kit[5:]} {nm}', (4, 16), 0, 0.5, (255, 255, 255), 1); tiles.append(t)
    rows.append(np.hstack(tiles + [np.full_like(tiles[0], 30)] * (len(ORDER) - len(tiles))))
W = max(r.shape[1] for r in rows)
sheet = np.vstack([cv2.copyMakeBorder(r, 0, 4, 0, W - r.shape[1], cv2.BORDER_CONSTANT, value=(30, 30, 30)) for r in rows])
os.makedirs(os.path.dirname(out), exist_ok=True); cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out, sheet.shape)
