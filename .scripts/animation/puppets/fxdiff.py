"""fxdiff.py pose... -- register each face-edit (fx-*) of a v5 pose onto the base pose (SIFT similarity on the head) and save
a diff visualisation, to see which regions the edit really changed."""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load, register, warp, ROOT
def head_roi(b):
    ys, xs = np.where(b[..., 3] > 128); top, bot = ys.min(), ys.max(); H = bot - top
    return top, H
def fx_reg(base, fx):
    top, H = head_roi(base); roi = (0, max(0, top - 10), base.shape[1], int(top + 0.24 * H))
    M, n = register(fx, base, roi, ratio=0.8)
    return M, n, roi
if __name__ == '__main__':
    rows = []
    for p in sys.argv[1:]:
        B = load(f'{ROOT}/_keyed/{p}.png'); tiles = []
        for fx in ('fx-closed', 'fx-aa'):
            F = load(f'{ROOT}/_keyed/{p}-{fx}.png'); M, n, roi = fx_reg(B, F); print(p, fx, 'inliers', n, None if M is None else np.round(M, 3).tolist())
            Fw = warp(F, M, (B.shape[1], B.shape[0])); x0, y0, x1, y1 = roi
            d = np.abs(Fw[..., :3] - B[..., :3]).max(-1) * (np.minimum(Fw[..., 3], B[..., 3]) > 200)
            vis = np.dstack([B[..., :3].mean(-1) * 0.5] * 3); vis[..., 0] = np.maximum(vis[..., 0], np.clip(d * 3, 0, 255))
            tiles.append(cv2.cvtColor(vis[y0:y1, 150:650].astype(np.uint8), cv2.COLOR_RGB2BGR))
        rows.append(np.hstack(tiles))
    w = max(r.shape[1] for r in rows); cv2.imwrite(f'{ROOT}/_check/fxdiff.jpg', np.vstack([cv2.copyMakeBorder(r, 0, 0, 0, w - r.shape[1], cv2.BORDER_CONSTANT) for r in rows]))
