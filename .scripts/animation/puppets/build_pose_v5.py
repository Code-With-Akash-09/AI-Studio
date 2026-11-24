"""build_pose_v5.py kabir-v5-wave ... -- pose kits for the v5 eyeline-correct poses.
Face shapes come from face-edits of the SAME painting (_keyed/<pose>-fx-closed.png: eyes+mouth closed, -fx-aa.png: open 'aa' mouth),
so blinks and mouths fit that exact head (no cross-view grid patches, no doubled glasses).
Each edit is SIFT-registered onto the base pose, the regions the edit changed are found by differencing (eyes = upper blobs,
mouth = lower blobs), and those regions are cut from the Real-ESRGAN x2 of the edit. Patches are stored with an explicit
replace-mask (patch RGBA replaces the base inside the mask, so a moved jaw line can't double up).
Output: poses/<char>-<short>/ (body.png, head_mask.png, face/<grp>/<name>.png + <name>.mask.png, pose.json)."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load, save, register, warp, ROOT
from fxdiff import fx_reg
import sr_kit
HD = f'{ROOT}/_keyed_hd'; OUT = f'{ROOT}/poses'

def blobs(d, thr=38, min_area=30):
    m = (d > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    return [(lab == i, cen[i], st[i, 4]) for i in range(1, n) if st[i, 4] >= min_area]

def build(pose):
    char = pose.split('-')[0]; short = pose.split('-', 1)[1].replace('-', '')
    B = load(f'{ROOT}/_keyed/{pose}.png'); BH = load(f'{HD}/{pose}.png'); h, w = B.shape[:2]
    ys, xs = np.where(B[..., 3] > 128); top, bot = int(ys.min()), int(ys.max()); Hh = bot - top
    face_roi = (0, top, w, int(top + 0.2 * Hh))
    x0, y0, x1, y1 = face_roi
    # only look inside the head's own silhouette (a key or hand held beside the face is a separate component in this band)
    band = (B[..., 3] > 128).astype(np.uint8); band[y1:] = 0
    nb, lab = cv2.connectedComponents(band)
    tops = np.where(band[top:top + 4].any(0))[0]; seed = lab[top + 2, int(np.median(tops))]
    headsel = (lab == seed) if seed else band.astype(bool)
    headsel = cv2.dilate(headsel.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    regions = {}
    for fx in ('fx-closed', 'fx-aa'):
        F = load(f'{ROOT}/_keyed/{pose}-{fx}.png'); M, n, _ = fx_reg(B, F); assert M is not None, (pose, fx, n)
        Fw = warp(F, M, (w, h))
        d = np.abs(Fw[..., :3] - B[..., :3]).max(-1) * (np.maximum(Fw[..., 3], B[..., 3]) > 100)
        d[:y0] = 0; d[y1:] = 0; d[~headsel] = 0
        bl = [b for b in blobs(d) if b[2] >= 60]
        regions[fx] = (F, M, bl, d)
    # eyes / mouth split from the closed edit: biggest upper blob(s) = eyes, lowest big blob = mouth
    _, _, bl, _ = regions['fx-closed']
    bl = sorted(bl, key=lambda b: -b[2])
    eye_c = bl[0][1]                                                       # closed eyes = biggest change
    low = [b for b in bl if b[1][1] > eye_c[1] + 0.025 * Hh]
    mouth_c = low[0][1]                                                    # biggest change below the eyes = mouth
    split = (eye_c[1] + mouth_c[1]) / 2
    print(pose, 'eyes at', eye_c.round(1), 'mouth at', mouth_c.round(1))
    d = f'{OUT}/{char}-{short}'; os.makedirs(f'{d}/face/eyes', exist_ok=True); os.makedirs(f'{d}/face/mouth', exist_ok=True)
    save(BH, f'{d}/body.png')
    face = {'eyes': {}, 'mouth': {}, 'brows': {}}
    def patch(fx, grp, name):
        F, M, bl, dd = regions[fx]
        sel = np.zeros((h, w), bool)
        for m, c, a in bl:
            near = np.hypot(*(c - (eye_c if grp == 'eyes' else mouth_c)))
            if (c[1] < split) == (grp == 'eyes') and near < 0.10 * Hh: sel |= m
        assert sel.any(), (pose, fx, grp, [(c.round(0).tolist(), a) for m, c, a in bl])
        if grp == 'mouth': sel[:int(split)] = False
        else: sel[int(split):] = False
        sel = cv2.dilate(sel.astype(np.uint8), np.ones((9, 9), np.uint8))
        mk = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), 2.5)
        if grp == 'mouth': mk[:int(split)] = 0
        else: mk[int(split):] = 0
        yy, xx = np.where(mk > 0.01); bx0, by0, bx1, by1 = max(0, xx.min() - 6), max(0, yy.min() - 6), min(w, xx.max() + 7), min(h, yy.max() + 7)
        # x2 SR of the registered edit, only over the patch box
        Fw = warp(F, M, (w, h))
        crop = Fw[by0:by1, bx0:bx1]
        rgb = sr_kit.sr_rgb(np.ascontiguousarray(crop[..., :3]).astype(np.uint8))
        al = cv2.resize(crop[..., 3], (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LANCZOS4)
        mk2 = cv2.resize(mk[by0:by1, bx0:bx1], (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LINEAR)
        X0, Y0 = bx0 * 2, by0 * 2; base = BH[Y0:Y0 + rgb.shape[0], X0:X0 + rgb.shape[1]]
        # smooth colour match to the HD base on the mask's feather ring (edits drift a little in tone)
        ring = ((mk2 > 0.05) & (mk2 < 0.6) & (base[..., 3] > 200) & (al > 200)).astype(np.float32)[..., None]
        if ring.sum() > 30:
            num = cv2.GaussianBlur(base[..., :3] * ring, (0, 0), 14); den = cv2.GaussianBlur(rgb * ring, (0, 0), 14)
            G = np.clip(num / np.maximum(den, 1e-3), 0.85, 1.18); G[den[..., 0] < 1e-2] = 1; rgb = rgb * G
        out = np.dstack([np.clip(rgb, 0, 255), np.clip(al, 0, 255)])
        save(out, f'{d}/face/{grp}/{name}.png')
        cv2.imwrite(f'{d}/face/{grp}/{name}.mask.png', np.clip(mk2 * 255, 0, 255).astype(np.uint8))
        face[grp][name] = dict(file=f'face/{grp}/{name}.png', mask=f'face/{grp}/{name}.mask.png', x=int(X0), y=int(Y0))
    patch('fx-closed', 'eyes', 'closed'); patch('fx-closed', 'mouth', 'closed'); patch('fx-aa', 'mouth', 'aa')
    # head mask: the alpha component above the chin that contains the eyes (hands / key held beside the face are separate)
    chin = int(mouth_c[1] + 0.35 * (mouth_c[1] - eye_c[1]))
    band = (B[..., 3] > 128).astype(np.uint8); band[chin:] = 0
    n, lab = cv2.connectedComponents(band); hid = lab[int(eye_c[1]), int(eye_c[0])]
    hm = (lab == hid).astype(np.float32) if hid else band.astype(np.float32)
    ramp = np.clip((chin - np.arange(h)) / max(1, 0.08 * Hh), 0, 1)[:, None]; hm = hm * ramp   # soft neck
    hm2 = cv2.resize(hm, (w * 2, h * 2), interpolation=cv2.INTER_LINEAR)
    save(np.dstack([np.full((h * 2, w * 2, 3), 255, np.float32), hm2 * 255]), f'{d}/head_mask.png')
    hy, hx = np.where(hm > 0.5)
    AH = BH[..., 3] > 30; ysH, xsH = np.where(AH); botH = int(ysH.max()); feet = np.where(AH[botH - 12:botH + 1])[1]
    meta = dict(char=char, pose=short, version='v5', size=[w * 2, h * 2], ground=[float(np.median(feet)), float(botH)], head_top=float(ysH.min()),
                height=float(botH - ysH.min()), neck=[float(hx.mean() * 2), float(chin * 2)], head_centre=[float(hx.mean() * 2), float(hy.mean() * 2)],
                eyes=[float(eye_c[0] * 2), float(eye_c[1] * 2)], mouth=[float(mouth_c[0] * 2), float(mouth_c[1] * 2)], face=face,
                viseme_map={'X': 'closed', 'M': 'closed', 'F': 'closed', 'A': 'base', 'E': 'base', 'O': 'base', 'U': 'base', 'B': 'aa', 'C': 'aa'})
    if short == 'v5keyup': meta['viseme_map'].update(A='aa', E='aa', O='aa', U='aa')   # base mouth is a closed smile
    json.dump(meta, open(f'{d}/pose.json', 'w'), indent=1)
    print(' ->', d, 'height', meta['height'])

if __name__ == '__main__':
    for p in sys.argv[1:]: build(p)
