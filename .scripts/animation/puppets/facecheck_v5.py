"""facecheck_v5.py out.png kit... -- 100% head crops of each v5 kit: base, eyes closed, mouth closed, mouth aa (replace-mask compositing)."""
import sys, json, cv2, numpy as np, os
R = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets') + '/poses'
def apply(body, d, v):
    p = cv2.imread(f'{d}/{v["file"]}', -1).astype(np.float32); m = cv2.imread(f'{d}/{v["mask"]}', 0).astype(np.float32)[..., None] / 255
    h, w = p.shape[:2]; reg = body[v['y']:v['y'] + h, v['x']:v['x'] + w]; reg[:] = p * m + reg * (1 - m)
rows = []
for k in sys.argv[2:]:
    d = f'{R}/{k}'; mt = json.load(open(f'{d}/pose.json')); body = cv2.imread(f'{d}/body.png', -1).astype(np.float32)
    ex, ey = map(int, mt['eyes']); x0, y0 = max(0, ex - 230), max(0, ey - 170)
    tiles = []
    for nm in (None, ('eyes', 'closed'), ('mouth', 'closed'), ('mouth', 'aa')):
        im = body.copy()
        if nm: apply(im, d, mt['face'][nm[0]][nm[1]])
        c = im[y0:y0 + 360, x0:x0 + 400]; a = c[..., 3:4] / 255; c = (c[..., :3] * a + 200 * (1 - a)).astype(np.uint8).copy()
        cv2.putText(c, f'{k} {nm[1] if nm else "base"} {nm[0] if nm else ""}', (4, 16), 0, 0.45, (0, 0, 255), 1); tiles.append(c)
    rows.append(np.hstack(tiles))
cv2.imwrite(sys.argv[1], np.vstack(rows))
