"""build_mouths_v6.py kit... -- add a full painted viseme set to a v5 Kabir pose kit.

Each mouth shape is an edit of a square head crop of the pose itself (_gen/mouths/<kit>.src.png, see mouth_src.py), so it is
painted on that pose's own head angle. Per edit: chroma key -> SIFT similarity registration on the UPPER face only (glasses, eyes,
hair, ear; the mouth is excluded so it can't bias the fit) -> diff vs the source inside a lower-face zone -> soft replace-mask ->
ring colour-gain match -> patch written at HD pose resolution + mask; pose.json gets the shapes and a fine viseme map."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from key import key as chroma_key
ROOT = '/workspace/anim-demo/puppets'; MD = f'{ROOT}/_gen/mouths'
SHAPES = ['aa', 'MBP', 'E', 'I', 'O', 'U', 'FV', 'L', 'smile']
# fine viseme letters (visemes_fine.py) -> shape names. 'base' = the pose's own painted mouth (smile-open; keyup: closed smile)
FINE_MAP = {'X': 'closed', 'M': 'MBP', 'F': 'FV', 'L': 'L', 'C': 'aa', 'B': 'smile', 'A': 'smile', 'E': 'E', 'I': 'I', 'O': 'O', 'U': 'U'}

def sift_reg(src, dst, mask_src, mask_dst):
    s = cv2.SIFT_create(4000)
    k1, d1 = s.detectAndCompute(cv2.cvtColor(src, cv2.COLOR_RGB2GRAY), mask_src); k2, d2 = s.detectAndCompute(cv2.cvtColor(dst, cv2.COLOR_RGB2GRAY), mask_dst)
    mt = cv2.BFMatcher().knnMatch(d1, d2, k=2); good = [m for m, n in mt if m.distance < 0.75 * n.distance]
    p1 = np.float32([k1[m.queryIdx].pt for m in good]); p2 = np.float32([k2[m.trainIdx].pt for m in good])
    M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=5000)
    return M, int(inl.sum()) if inl is not None else 0

def build(kit):
    d = f'{ROOT}/poses/{kit}'; meta = json.load(open(f'{d}/pose.json')); box = json.load(open(f'{MD}/{kit}.box.json'))
    x0, y0, S = box['x0'], box['y0'], box['S']; body = cv2.cvtColor(cv2.imread(f'{d}/body.png', -1), cv2.COLOR_BGRA2RGBA).astype(np.float32)
    srcH = body[y0:y0 + S, x0:x0 + S]                                         # HD pose-space crop (RGBA)
    src_rgb = cv2.cvtColor(cv2.imread(f'{MD}/{kit}.src.png'), cv2.COLOR_BGR2RGB)
    sc = 1024 / S; (ex, ey), (mx, my) = meta['eyes'], meta['mouth']
    ex, ey, mx, my = (ex - x0) * sc, (ey - y0) * sc, (mx - x0) * sc, (my - y0) * sc; dist = np.hypot(mx - ex, my - ey)
    yy, xx = np.mgrid[0:1024, 0:1024].astype(np.float32)
    upper = ((yy < my - 0.45 * dist)).astype(np.uint8) * 255                  # registration features: above the nose tip
    # lower-face zone where a mouth edit may change pixels (lips, teeth, jaw/chin), soft-edged
    zx = (xx - mx) / (0.95 * dist); zy = np.where(yy < my, (yy - my) / (0.42 * dist), (yy - my) / (1.05 * dist))
    zone = np.clip(1.6 - 1.6 * np.sqrt(zx ** 2 + zy ** 2), 0, 1)
    report = {}
    for shp in SHAPES:
        f = f'{MD}/{kit}-m-{shp}.jpg'
        if not os.path.exists(f): continue
        ed = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2RGB); ed = cv2.resize(ed, (1024, 1024), interpolation=cv2.INTER_AREA)
        edk, _, _ = chroma_key(ed)
        M, n = sift_reg(ed, src_rgb, upper, upper)
        sc_fit = float(np.hypot(M[0, 0], M[1, 0])); ang = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
        W = cv2.warpAffine(edk.astype(np.float32), M, (1024, 1024), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        # pose crop at 1024 for the diff / colour match
        P = cv2.resize(srcH, (1024, 1024), interpolation=cv2.INTER_CUBIC)
        dif = np.abs(W[..., :3] - P[..., :3]).max(-1) * (np.maximum(W[..., 3], P[..., 3]) > 100) + np.abs(W[..., 3] - P[..., 3])
        ch = ((dif > 34) & (zone > 0.02)).astype(np.uint8)
        ch = cv2.morphologyEx(ch, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        nl, lab, st, cen = cv2.connectedComponentsWithStats(ch)
        keep = np.zeros_like(ch)
        for i in range(1, nl):                                                # blobs near the mouth only
            if st[i, 4] >= 40 and np.hypot(cen[i, 0] - mx, cen[i, 1] - my) < 0.95 * dist: keep[lab == i] = 1
        keep = cv2.dilate(cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)), np.ones((21, 21), np.uint8))
        mk = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 7) * np.clip(zone * 2.5, 0, 1)
        # colour match on the feather ring (edits drift a little in tone)
        ring = ((mk > 0.05) & (mk < 0.7) & (P[..., 3] > 200) & (W[..., 3] > 200)).astype(np.float32)[..., None]
        rgb = W[..., :3]
        if ring.sum() > 50:
            num = cv2.GaussianBlur(P[..., :3] * ring, (0, 0), 22); den = cv2.GaussianBlur(rgb * ring, (0, 0), 22)
            G = np.clip(num / np.maximum(den, 1e-3), 0.85, 1.18); G[den[..., 0] < 1e-2] = 1; rgb = rgb * G
        out = np.dstack([np.clip(rgb, 0, 255), np.clip(W[..., 3], 0, 255)])
        # back to HD pose resolution, only the mask's bounding box
        outH = cv2.resize(out, (S, S), interpolation=cv2.INTER_AREA); mkH = cv2.resize(mk, (S, S), interpolation=cv2.INTER_AREA)
        ys, xs = np.where(mkH > 0.01); bx0, by0, bx1, by1 = max(0, xs.min() - 4), max(0, ys.min() - 4), min(S, xs.max() + 5), min(S, ys.max() + 5)
        os.makedirs(f'{d}/face/mouth', exist_ok=True)
        cv2.imwrite(f'{d}/face/mouth/{shp}.png', cv2.cvtColor(outH[by0:by1, bx0:bx1].astype(np.uint8), cv2.COLOR_RGBA2BGRA))
        cv2.imwrite(f'{d}/face/mouth/{shp}.mask.png', np.clip(mkH[by0:by1, bx0:bx1] * 255, 0, 255).astype(np.uint8))
        meta['face']['mouth'][shp] = dict(file=f'face/mouth/{shp}.png', mask=f'face/mouth/{shp}.mask.png', x=int(x0 + bx0), y=int(y0 + by0))
        report[shp] = dict(inliers=n, scale=round(sc_fit, 3), rot=round(ang, 2), mask_px=int((mkH > 0.5).sum()))
        print(kit, shp, report[shp], flush=True)
    vm = {k: v for k, v in FINE_MAP.items()}
    for k, v in vm.items():
        if v not in meta['face']['mouth'] and v != 'closed': vm[k] = 'aa' if k in 'CO' else 'base'
    if 'smile' not in meta['face']['mouth']: vm['B'] = vm['A'] = 'base'          # the pose's own painted mouth is the smile-open
    meta['viseme_map_fine'] = vm; meta['mouth_reg'] = report; meta['version'] = 'v6'
    json.dump(meta, open(f'{d}/pose.json', 'w'), indent=1)

if __name__ == '__main__':
    for k in sys.argv[1:]: build(k)
