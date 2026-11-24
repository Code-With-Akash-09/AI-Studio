"""p2_eyefix.py name... -- bake an eyeline fix into a phase-2 pose. Input: _gen/p2heads/<name>.eyefix.jpg, an edit of the
pose's head crop (<name>.src.png) with only the pupils moved to look image-LEFT. SIFT-registers it to the crop, keeps the
changed pixels around the eyes (upper face only), colour-matches on a ring and pastes them into the HD body
(_keyed_hd/p2/<name>.png; the original is kept as <name>.orig.png). Re-run p2_prep.py <name> afterwards to refresh the crop."""
import sys, os, json, shutil, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from key import key as chroma_key
from p2_build import sift_reg, HEADS, ROOT
for name in sys.argv[1:]:
    hd = f'{ROOT}/_keyed_hd/p2/{name}.png'; orig = f'{ROOT}/_keyed_hd/p2/{name}.orig.png'
    if not os.path.exists(orig): shutil.copy(hd, orig)
    body = cv2.cvtColor(cv2.imread(orig, -1), cv2.COLOR_BGRA2RGBA).astype(np.float32)
    box = json.load(open(f'{HEADS}/{name}.box.json')); x0, y0, S = box['x0'], box['y0'], box['S']
    src = cv2.cvtColor(cv2.imread(f'{HEADS}/{name}.src.png'), cv2.COLOR_BGR2RGB)
    P = cv2.resize(body[y0:y0 + S, x0:x0 + S], (1024, 1024), interpolation=cv2.INTER_CUBIC)
    ed = cv2.cvtColor(cv2.imread(f'{HEADS}/{name}.eyefix.jpg'), cv2.COLOR_BGR2RGB)
    if ed.shape[0] != 1024: ed = cv2.resize(ed, (1024, 1024), interpolation=cv2.INTER_CUBIC)
    M, n = sift_reg(ed, src)
    ek, _, _ = chroma_key(ed)
    W = cv2.warpAffine(ek.astype(np.float32), M, (1024, 1024), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0, 0))
    W[..., :3] = cv2.warpAffine(ed.astype(np.float32), M, (1024, 1024), flags=cv2.INTER_CUBIC)   # paint from the edit itself
    W[..., 3] = cv2.dilate(cv2.warpAffine(ek[..., 3].astype(np.float32), M, (1024, 1024)), np.ones((1, 1)))
    W[..., 3] = np.maximum(W[..., 3], P[..., 3])                           # dark pupils can key as holes: trust the base silhouette
    d = np.abs(W[..., :3] - P[..., :3]).max(-1) * (np.minimum(W[..., 3], P[..., 3]) > 150)
    ys, xs = np.where(P[..., 3] > 128); fy0, fy1 = ys.min(), ys.max()
    ch = cv2.morphologyEx((d > 45).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); ch[int(fy0 + 0.72 * (fy1 - fy0)):] = 0
    k, lab, st, cen = cv2.connectedComponentsWithStats(ch); keep = np.zeros_like(ch)
    big = sorted(range(1, k), key=lambda i: -st[i, 4])[:2]                 # the two eyes
    if not big: print(name, 'no eye change'); continue
    for i in range(1, k):                                                  # every change blob in the eyes' band (old + new pupils)
        if st[i, 4] >= 40 and abs(cen[i][1] - np.mean([cen[j][1] for j in big])) < 90: keep[lab == i] = 1
    yb, xb = np.where(keep); pad = 40
    rect = np.zeros_like(keep); rect[max(0, yb.min() - pad):yb.max() + pad, max(0, xb.min() - pad):xb.max() + pad] = 1
    keep = cv2.dilate(cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8)), np.ones((21, 21), np.uint8)) & rect
    mk = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 6)
    ring = ((mk > 0.05) & (mk < 0.7) & (P[..., 3] > 200) & (W[..., 3] > 200)).astype(np.float32)[..., None]; rgb = W[..., :3]
    if ring.sum() > 50:
        num = cv2.GaussianBlur(P[..., :3] * ring, (0, 0), 22); den = cv2.GaussianBlur(rgb * ring, (0, 0), 22)
        G = np.clip(num / np.maximum(den, 1e-3), 0.8, 1.25); G[den[..., 0] < 1e-2] = 1; rgb = rgb * G
    mk = mk * (P[..., 3] > 200)
    mH = cv2.resize(mk, (S, S), interpolation=cv2.INTER_AREA)[..., None]; rH = cv2.resize(rgb, (S, S), interpolation=cv2.INTER_AREA)
    reg = body[y0:y0 + S, x0:x0 + S]; reg[..., :3] = rH * mH + reg[..., :3] * (1 - mH)
    cv2.imwrite(f'{ROOT}/_check/eyefix-{name}.png', (np.dstack([mk]*3) * 255 * 0.6 + P[..., :3] * 0.4)[..., ::-1].astype(np.uint8)); cv2.imwrite(hd, cv2.cvtColor(np.clip(body, 0, 255).astype(np.uint8), cv2.COLOR_RGBA2BGRA))
    print(name, 'eyefix inliers', n, 'scale', round(float(np.hypot(M[0, 0], M[1, 0])), 3), 'blobs', [int(st[i, 4]) for i in big], flush=True)
