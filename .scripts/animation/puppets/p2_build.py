"""p2_build.py name... -- phase-2 pose kit from a painted body (p2_prep.py) + a mouth/blink grid edit of its head crop.

Grid: _gen/p2heads/<name>.grid.jpg (default 3x3, GRID=rows x cols layout in CELLS order). Each cell: SR x2 -> chroma key ->
SIFT similarity fit to the pose's head crop (RANSAC over the whole head: the changed mouth/eyes fall out as outliers) ->
the 'closed' cell's diff gives the eye and mouth centres -> per shape a feathered replace-mask inside the mouth zone (eyes zone
for the blink), ring colour-gain match -> patch at HD pose resolution. Writes poses/p2/<name>/ (body.png, head_mask.png,
face/{eyes,mouth}/*.png + .mask.png, pose.json in the v5/v6 kit format with viseme_map_fine)."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from key import key as chroma_key
import sr_kit
ROOT = '/workspace/anim-demo/puppets'; HEADS = f'{ROOT}/_gen/p2heads'; OUT = f'{ROOT}/poses/p2'
CELLS = os.environ.get('CELLS', 'closed,aa,MBP,E,I,O,U,FV,L').split(',')
REG_TOP = set(os.environ.get('REG_TOP', '').split(','))
MZ = dict(kv.split(':') for kv in os.environ.get('MZ', '').split(',') if ':' in kv)   # name:zone scale
NO_BLINK = set(os.environ.get('NO_BLINK', '').split(','))                 # poses whose base eyes are already shut (laugh)
FINE_MAP = {'X': 'closed', 'M': 'MBP', 'F': 'FV', 'L': 'L', 'C': 'aa', 'B': 'base', 'A': 'base', 'E': 'E', 'I': 'I', 'O': 'O', 'U': 'U'}

def sift_reg(src, dst, dmask=None):
    s = cv2.SIFT_create(6000)
    k1, d1 = s.detectAndCompute(cv2.cvtColor(src, cv2.COLOR_RGB2GRAY), None); k2, d2 = s.detectAndCompute(cv2.cvtColor(dst, cv2.COLOR_RGB2GRAY), dmask)
    if d1 is None or d2 is None: return None, 0
    mt = cv2.BFMatcher().knnMatch(d1, d2, k=2); good = [m for m, n in mt if m.distance < 0.8 * n.distance]
    if len(good) < 8: return None, len(good)
    p1 = np.float32([k1[m.queryIdx].pt for m in good]); p2 = np.float32([k2[m.trainIdx].pt for m in good])
    M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=4.0, maxIters=8000, confidence=0.999)
    return M, int(inl.sum()) if inl is not None else 0

def blobs(d, thr):
    n, lab, st, cen = cv2.connectedComponentsWithStats((d > thr).astype(np.uint8))
    return [(lab == i, cen[i], st[i, 4]) for i in range(1, n) if st[i, 4] >= 60]

def build(name, base_open=True):
    box = json.load(open(f'{HEADS}/{name}.box.json')); x0, y0, S = box['x0'], box['y0'], box['S']
    body = cv2.cvtColor(cv2.imread(f'{ROOT}/_keyed_hd/p2/{name}.png', -1), cv2.COLOR_BGRA2RGBA).astype(np.float32); Hh_, Ww_ = body.shape[:2]
    src = cv2.cvtColor(cv2.imread(f'{HEADS}/{name}.src.png'), cv2.COLOR_BGR2RGB)          # 1024 head crop over the key colour
    P = cv2.resize(body[y0:y0 + S, x0:x0 + S], (1024, 1024), interpolation=cv2.INTER_CUBIC)
    grid = cv2.cvtColor(cv2.imread(f'{HEADS}/{name}.grid.jpg'), cv2.COLOR_BGR2RGB); gh, gw = grid.shape[:2]
    rows, cols = map(int, os.environ.get('GRID', '3x3').split('x'))
    cells = {}; dmask = None
    if name in REG_TOP:                                                  # hand near the mouth: register on hair + eyes only
        ysP = np.where(P[..., 3] > 128)[0]; dmask = np.zeros((1024, 1024), np.uint8); dmask[:int(ysP.min() + 0.55 * (ysP.max() - ysP.min()))] = 255
    for i, nm in enumerate(CELLS):
        r, c = divmod(i, cols); ins = max(4, gh // 120)                # inset past the white gutters (they broke the key's bg estimate)
        cell = grid[r * gh // rows + ins:(r + 1) * gh // rows - ins, c * gw // cols + ins:(c + 1) * gw // cols - ins]
        cell = np.clip(sr_kit.sr_rgb(np.ascontiguousarray(cell)), 0, 255).astype(np.uint8)
        M, n = sift_reg(cell, src, dmask)
        if M is None: print(name, nm, 'NO REGISTRATION', n); continue
        ck, cbg, _ = chroma_key(cell)
        W = cv2.warpAffine(ck.astype(np.float32), M, (1024, 1024), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        # inside the base silhouette trust the cell's own paint: dark/greenish mouth interiors can key as semi-transparent,
        # which showed up as see-through ghost outlines
        raw = cv2.warpAffine(cell.astype(np.float32), M, (1024, 1024), flags=cv2.INTER_CUBIC)
        far = (np.abs(raw - np.float32(box['key'])).max(-1) > 90) & (np.abs(raw - np.float32(cbg)).max(-1) > 90)  # not either screen colour
        # outside the base silhouette only keep clearly-painted pixels: the grid's own screen shade (often darker than the body's)
        # leaks through the key as semi-opaque pink/green smears beside the cheek
        W[(P[..., 3] <= 200) & ~far, 3] = 0
        inside = (P[..., 3] > 200) & far & (W[..., 3] > 20) & (cv2.warpAffine(np.ones(cell.shape[:2], np.float32), M, (1024, 1024)) > 0.99)
        W[inside, :3] = raw[inside]; W[inside, 3] = 255
        cells[nm] = (W, n, float(np.hypot(M[0, 0], M[1, 0])))
    W0 = cells['closed'][0]
    def diff(W): return np.abs(W[..., :3] - P[..., :3]).max(-1) * (np.minimum(W[..., 3], P[..., 3]) > 150)
    # eye / mouth centres from the closed cell: eyes = big change in the upper part of the face, mouth = big change below
    ys, xs = np.where(P[..., 3] > 128); fy0, fy1 = ys.min(), ys.max()
    d0 = cv2.morphologyEx((diff(W0) > 45).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    bl = sorted(blobs(d0.astype(np.float32), 0.5), key=lambda b: -b[2])
    ups = [(c, a) for m, c, a in bl if c[1] < fy0 + 0.62 * (fy1 - fy0)][:2]           # the two biggest upper blobs = the eyes
    eye_c = None if (name in NO_BLINK or not ups) else (sum(c * a for c, a in ups) / sum(a for c, a in ups) if len(ups) < 2 or abs(ups[0][0][1] - ups[1][0][1]) < 80 else ups[0][0])
    if eye_c is None:                                                    # eyes already closed in the base (laugh): mouth from aa, eyes above it
        da = cv2.morphologyEx((diff(cells['aa'][0]) > 45).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        mc = sorted(blobs(da.astype(np.float32), 0.5), key=lambda b: -b[2])[0][1]
        eye_c = np.array([mc[0], mc[1] - 186], np.float64); print(name, 'eye centre estimated from mouth', flush=True)
    lows = [c for m, c, a in bl if c[1] > eye_c[1] + 90]
    if not lows:                                                         # closed mouth barely changed: use the aa cell
        da = cv2.morphologyEx((diff(cells['aa'][0]) > 45).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        lows = [c for m, c, a in sorted(blobs(da.astype(np.float32), 0.5), key=lambda b: -b[2]) if c[1] > eye_c[1] + 90]
    exp_m = eye_c + np.array([0.0, 186.0])                             # typical 3/4 face: mouth below and toward the facing side
    lows = sorted(lows, key=lambda c: np.hypot(*(c - exp_m)))
    mouth_c = lows[0] if np.hypot(*(lows[0] - exp_m)) < 110 else exp_m; dist = float(np.hypot(*(mouth_c - eye_c)))
    dist *= float(MZ.get(name, 1.0)); print(name, 'crop eye', np.round(eye_c), 'mouth', np.round(mouth_c), 'lows', [np.round(c) for c in lows[:3]], flush=True)
    yy, xx = np.mgrid[0:1024, 0:1024].astype(np.float32)
    zx = (xx - mouth_c[0]) / (1.0 * dist); zy = np.where(yy < mouth_c[1], (yy - mouth_c[1]) / (0.42 * dist), (yy - mouth_c[1]) / (1.0 * dist))
    mzone = np.clip(1.6 - 1.6 * np.sqrt(zx ** 2 + zy ** 2), 0, 1)
    ezx = (xx - eye_c[0]) / (1.5 * dist); ezy = (yy - eye_c[1]) / (0.55 * dist)
    ezone = np.clip(1.6 - 1.6 * np.sqrt(ezx ** 2 + ezy ** 2), 0, 1) * (yy < (eye_c[1] + mouth_c[1]) / 2)
    # footprint of the base mouth (closed-cell change near the mouth): every mouth patch must fully cover it, or the base
    # mouth's outline ghosts through a smaller new mouth
    n_, lab_, st_, cen_ = cv2.connectedComponentsWithStats(d0); foot = np.zeros((1024, 1024), np.uint8)
    for i in range(1, n_):
        if st_[i, 4] >= 40 and np.hypot(*(cen_[i] - mouth_c)) < 0.8 * dist: foot[lab_ == i] = 1
    d = f'{OUT}/{name}'; os.makedirs(f'{d}/face/eyes', exist_ok=True); os.makedirs(f'{d}/face/mouth', exist_ok=True)
    face = {'eyes': {}, 'mouth': {}, 'brows': {}}; rep = {}
    def patch(W, zone, grp, nm, near):
        ch = cv2.morphologyEx(((diff(W) > 34) & (zone > 0.02)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        ch = ch | (((np.abs(W[..., 3] - P[..., 3]) > 60) & (zone > 0.02)).astype(np.uint8))       # silhouette changes (jaw drop)
        n, lab, st, cen = cv2.connectedComponentsWithStats(ch); keep = np.zeros_like(ch)
        for i in range(1, n):
            if st[i, 4] >= 40 and np.hypot(*(cen[i] - near)) < (1.6 if grp == 'eyes' else 0.95) * dist: keep[lab == i] = 1
        if keep.sum() < 30: keep = (zone > 0.5).astype(np.uint8)
        if grp == 'mouth': keep = keep | foot
        keep = cv2.dilate(cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)), np.ones((19, 19), np.uint8))
        mk = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 7) * np.clip(zone * 2.5, 0, 1)
        if grp == 'mouth': mk = np.maximum(mk, cv2.GaussianBlur(cv2.dilate(foot, np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 5))
        ring = ((mk > 0.05) & (mk < 0.7) & (P[..., 3] > 200) & (W[..., 3] > 200)).astype(np.float32)[..., None]; rgb = W[..., :3]
        if ring.sum() > 50:
            num = cv2.GaussianBlur(P[..., :3] * ring, (0, 0), 22); den = cv2.GaussianBlur(rgb * ring, (0, 0), 22)
            G = np.clip(num / np.maximum(den, 1e-3), 0.8, 1.25); G[den[..., 0] < 1e-2] = 1; rgb = rgb * G
        # where the edit has no paint (outside the cell), fall back to the base so the replace never punches a hole
        a = W[..., 3:] / 255; rgb = rgb * a + P[..., :3] * (1 - a); al = np.maximum(W[..., 3], P[..., 3] * (1 - (W[..., 3] > 0)))
        out = np.dstack([np.clip(rgb, 0, 255), np.clip(al, 0, 255)])
        oH = cv2.resize(out, (S, S), interpolation=cv2.INTER_AREA); mH = cv2.resize(mk, (S, S), interpolation=cv2.INTER_AREA)
        py, px = np.where(mH > 0.01)
        if len(px) == 0: return
        bx0, by0, bx1, by1 = max(0, px.min() - 4), max(0, py.min() - 4), min(S, px.max() + 5), min(S, py.max() + 5)
        cv2.imwrite(f'{d}/face/{grp}/{nm}.png', cv2.cvtColor(oH[by0:by1, bx0:bx1].astype(np.uint8), cv2.COLOR_RGBA2BGRA))
        cv2.imwrite(f'{d}/face/{grp}/{nm}.mask.png', np.clip(mH[by0:by1, bx0:bx1] * 255, 0, 255).astype(np.uint8))
        face[grp][nm] = dict(file=f'face/{grp}/{nm}.png', mask=f'face/{grp}/{nm}.mask.png', x=int(x0 + bx0), y=int(y0 + by0))
    if name not in NO_BLINK: patch(W0, ezone, 'eyes', 'closed', eye_c)
    for nm, (W, n, sc) in cells.items():
        patch(W, mzone, 'mouth', nm, mouth_c); rep[nm] = dict(inliers=n, scale=round(sc, 3))
    # kit geometry (HD pose space)
    f = S / 1024; E = (x0 + eye_c[0] * f, y0 + eye_c[1] * f); Mo = (x0 + mouth_c[0] * f, y0 + mouth_c[1] * f)
    A = body[..., 3]; ysH, xsH = np.where(A > 30); botH = int(ysH.max()); feet = np.where(A[botH - 12:botH + 1] > 30)[1]
    chin = int(Mo[1] + 0.45 * (Mo[1] - E[1]))
    band = (A > 128).astype(np.uint8); band[chin:] = 0; n, lab = cv2.connectedComponents(band); hid = lab[int(E[1]), int(E[0])]
    hm = (lab == hid).astype(np.float32) if hid else band.astype(np.float32)
    hm *= np.clip((chin - np.arange(Hh_)) / max(1, 0.04 * (botH - ysH.min())), 0, 1)[:, None]
    cv2.imwrite(f'{d}/head_mask.png', np.clip(hm * 255, 0, 255).astype(np.uint8))
    hy, hx = np.where(hm > 0.5)
    cv2.imwrite(f'{d}/body.png', cv2.cvtColor(body.astype(np.uint8), cv2.COLOR_RGBA2BGRA))
    vm = dict(FINE_MAP)
    if not base_open: vm['B'] = vm['A'] = 'I'
    for k, v in list(vm.items()):
        if v not in face['mouth'] and v != 'base': vm[k] = 'aa' if k in 'CO' else 'base'
    meta = dict(char=name.rsplit('-', 1)[0], pose=name.rsplit('-', 1)[1], version='p2', size=[Ww_, Hh_], ground=[float(np.median(feet)), float(botH)],
                head_top=float(ysH.min()), height=float(botH - ysH.min()), neck=[float(hx.mean()), float(chin)], head_centre=[float(hx.mean()), float(hy.mean())],
                eyes=[float(E[0]), float(E[1])], mouth=[float(Mo[0]), float(Mo[1])], face=face, viseme_map=vm, viseme_map_fine=vm, mouth_reg=rep, base_open=base_open)
    json.dump(meta, open(f'{d}/pose.json', 'w'), indent=1); print(name, 'eyes', np.round(E), 'mouth', np.round(Mo), rep, flush=True)

if __name__ == '__main__':
    closed = set(os.environ.get('BASE_CLOSED', '').split(','))
    for nm in sys.argv[1:]: build(nm, base_open=nm not in closed)
