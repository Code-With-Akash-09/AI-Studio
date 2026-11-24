"""facecheck.py out.jpg char-pose ... -- head crop of each pose with every face patch composited (row per pose) at 100%"""
import sys, json, cv2, numpy as np, os
R = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets') + '/poses'
rows = []
for k in sys.argv[2:]:
    d = f'{R}/{k}'; m = json.load(open(f'{d}/pose.json')); body = cv2.imread(f'{d}/body.png', -1).astype(np.float32)
    cx, cy = map(int, m['head_centre']); x0, y0 = cx - 200, max(0, cy - 160)
    tiles = []
    items = [('base', None)] + [(f'{g}:{n}', v) for g in ('mouth', 'eyes', 'brows') for n, v in m['face'][g].items()]
    for nm, v in items:
        im = body.copy()
        if v:
            p = cv2.imread(f'{d}/{v["file"]}', -1).astype(np.float32); h, w = p.shape[:2]; a = p[..., 3:4] / 255
            reg = im[v['y']:v['y'] + h, v['x']:v['x'] + w]; reg[..., :3] = p[..., :3] * a + reg[..., :3] * (1 - a)
        c = im[y0:y0 + 380, x0:x0 + 400]; a = c[..., 3:4] / 255; c = (c[..., :3] * a + 200 * (1 - a)).astype(np.uint8)
        c = cv2.resize(c, (200, 190)); cv2.putText(c, nm, (3, 14), 0, 0.4, (0, 0, 255), 1); tiles.append(c)
    while len(tiles) < 13: tiles.append(np.full_like(tiles[0], 200))
    rows.append(np.hstack(tiles[:13]))
cv2.imwrite(sys.argv[1], np.vstack(rows))
