"""Whole-body pose kits (v4): one continuous painted figure per pose + registered face patches for lip-sync/blinks.
python build_pose.py            -> $PUPPET_ROOT/poses/<char>-<pose>/{body.png, face/<grp>/<name>.png, pose.json}
Inputs: _keyed_hd/<char>-v4-<pose>.png (Real-ESRGAN x2 of the keyed pose art), _keyed_hd/<src>-34-{visemes,eyes}.png (x2 grids)."""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from build import head_mask, local_gain, soft
from config import CHARS, VISEMES

HD = f'{ROOT}/_keyed_hd'; OUT = f'{ROOT}/poses'
CH = {'kabir': dict(src='raazu', cfg='kabir'), 'dadi': dict(src='nani', cfg='kamla-dadi')}
EYES_USE = {1: 'half', 2: 'closed'}
# hand-placed landmarks (pupil L, pupil R, mouth centre) for poses whose head angle is too far from the 3/4 grid master for SIFT;
# coordinates in the x2 master cell / x2 pose image
# landmarks measured on gridcrop.py sheets (pupil L, pupil R, mouth centre), x2 HD coords of grid cell 0
MASTER_LM = {('kabir', 'front'): [(325, 337), (442, 332), (385, 452)], ('kabir', '34'): [(300, 342), (412, 335), (357, 460)]}
POSE_LM = {('kabir', 'wave'): ('front', [(785, 331), (890, 312), (845, 420)]), ('kabir', 'point'): ('front', [(755, 332), (860, 316), (810, 425)])}
MOUTH_ONLY = {('kabir', 'wave'), ('kabir', 'point')}   # glasses differ in angle: blink/brow patches would double the frames; BROWS_USE = {3: 'raised'}

def scale_hd(hd, k=2):
    o = dict(hd); o['chin'] = hd['chin'] * k; o['neck'] = (hd['neck'][0] * k, hd['neck'][1] * k); o['ext'] = hd['ext'] * k
    o['mouth'] = tuple(v * k for v in hd['mouth']); o['eyes'] = tuple(v * k for v in hd['eyes']); o['brows'] = tuple(v * k for v in hd['brows'])
    return o

def crop_put(img, path):
    a = img[..., 3] > 2
    if not a.any(): return None
    ys, xs = np.where(a); x0, y0, x1, y1 = max(0, xs.min() - 2), max(0, ys.min() - 2), xs.max() + 3, ys.max() + 3
    save(img[y0:y1, x0:x1], path); return dict(x=int(x0), y=int(y0))

def build(char, pose, view=None):
    c = CH[char]
    if view is None and (char, pose) in POSE_LM: view = POSE_LM[(char, pose)][0]
    if view is None:   # pick the grid view (34 or front) whose master head registers best on this pose
        best = None
        b0 = load(f'{HD}/{char}-v4-{pose}.png'); ys0 = np.where(b0[..., 3] > 30)[0]
        roi0 = (0, max(0, ys0.min() - 20), b0.shape[1], int(ys0.min() + 0.30 * (ys0.max() - ys0.min())))
        for v in ('34', 'front'):
            if not os.path.exists(f'{HD}/{c["src"]}-{v}-visemes.png'): continue
            _, nn = register(cell(load(f'{HD}/{c["src"]}-{v}-visemes.png'), 0, 0), b0, roi0)
            print('   ', v, 'inliers', nn)
            if best is None or nn > best[1]: best = (v, nn)
        view = best[0]
    hd = scale_hd(CHARS[c['cfg']]['views'][view]['head'])
    body = load(f'{HD}/{char}-v4-{pose}.png'); H, W = body.shape[:2]
    al = body[..., 3] > 30; ys, xs = np.where(al)
    top, bot = ys.min(), ys.max()
    vis = load(f'{HD}/{c["src"]}-{view}-visemes.png'); master = cell(vis, 0, 0); hh, hw = master.shape[:2]
    roi = (0, max(0, top - 20), W, int(top + 0.30 * (bot - top)))
    if (char, pose) in POSE_LM:
        M = cv2.getAffineTransform(np.float32(MASTER_LM[(char, view)]), np.float32(POSE_LM[(char, pose)][1])); n = -3
    else: M, n = register(master, body, roi)
    if M is None: M, n = register(master, body, roi, ratio=0.85, min_inl=16)
    if M is None:   # head turned further: chain through another pose of the same character (same painted style)
        for other in sorted(glob.glob(f'{OUT}/{char}-*/pose.json')):
            om = json.load(open(other)); ob = load(os.path.join(os.path.dirname(other), 'body.png'))
            ot = int(om['head_top']); oroi = ob.copy(); oroi[..., 3] *= 0; y1 = int(om['neck'][1] + 40)
            oroi[max(0, ot - 30):y1] = ob[max(0, ot - 30):y1]
            M2, n2 = register(oroi, body, roi, ratio=0.8, min_inl=10)
            if M2 is not None:
                M1 = np.array(om['M']); M = (np.vstack([M2, [0, 0, 1]]) @ np.vstack([M1, [0, 0, 1]]))[:2]; n = n2
                print('   chained via', om['pose'], n2); break
    assert M is not None, f'{char}-{pose}: head registration failed ({n})'
    d = f'{OUT}/{char}-{pose}'; os.makedirs(d, exist_ok=True)
    save(body, f'{d}/body.png')
    mw = warp(master, M, (W, H)); sk = skin_mask(mw) & skin_mask(body)
    g = colour_gain(mw, sk, body, sk) if sk.sum() > 200 else np.ones(3)
    hm = head_mask(master.shape, hd)
    hmw = warp(np.dstack([np.full(master.shape[:2] + (3,), 255, np.float32), hm * 255]), M, (W, H))[..., 3] / 255
    save(np.dstack([np.full((H, W, 3), 255, np.float32), hmw * 255]), f'{d}/head_mask.png')
    face = {'mouth': {}, 'eyes': {}, 'brows': {}}
    mx, my, rx, ry = hd['mouth']; ex0, ey0, ex1, ey1 = hd['eyes']; bx0, by0, bx1, by1 = hd['brows']
    masks = {'mouth': ellipse_mask(master.shape, mx, my, rx, ry, 14), 'eyes': rect_soft(master.shape, ex0, ey0, ex1, ey1, 18),
             'brows': rect_soft(master.shape, bx0, by0, bx1, by1, 14)}
    # local colour match of each patch against the pose's own painted face (not the grid master)
    def put(grp, nm, src_cell):
        if src_cell is master: wc = master
        else:
            Mc, nc = register(src_cell, master)
            if Mc is None: print('   reject', grp, nm); return
            wc = warp(src_cell, Mc, (hw, hh))
        mk0 = masks[grp] if not (grp == 'mouth' and (char, pose) in MOUTH_ONLY) else ellipse_mask(master.shape, mx, my, rx * 1.05, ry * 0.9, 14)
        p = with_alpha(apply_gain(wc, g), mk0 * (wc[..., 3] / 255 > 0.5))
        pw = warp(p, M, (W, H))
        mk = pw[..., 3] / 255
        ring = (mk > 0.05) & (mk < 0.5) & (body[..., 3] > 200)
        if ring.sum() > 30: pw[..., :3] = np.clip(pw[..., :3] * np.clip(body[..., :3][ring].mean(0) / np.maximum(pw[..., :3][ring].mean(0), 1), 0.85, 1.18), 0, 255)
        if (char, pose) in MOUTH_ONLY and ring.sum() > 30:
            # cross-view patch (front grid on a turned head): match the pose's local shading with a smooth gain map
            # interpolated from the feather ring (normalised convolution), so no darker oval shows round the mouth
            r = ring.astype(np.float32)[..., None]; sg = 22
            num = cv2.GaussianBlur(body[..., :3] * r, (0, 0), sg); den = cv2.GaussianBlur(pw[..., :3] * r, (0, 0), sg)
            G = np.clip(num / np.maximum(den, 1e-3), 0.8, 1.25); G[den[..., 0] < 1e-2] = 1
            pw[..., :3] = np.clip(pw[..., :3] * G, 0, 255)
        e = crop_put(pw, f'{d}/face/{grp}/{nm}.png')
        if e: face[grp][nm] = dict(file=f'face/{grp}/{nm}.png', **e)
    vc = [cell(vis, r, cc) for r in range(3) for cc in range(3)]
    for i, nm in VISEMES.items(): put('mouth', nm, master if i == 0 else vc[i])
    ey = load(f'{HD}/{c["src"]}-{view}-eyes.png'); ec = [cell(ey, r, cc) for r in range(3) for cc in range(3)]
    if (char, pose) not in MOUTH_ONLY:
        for i, nm in EYES_USE.items(): put('eyes', nm, ec[i])
        for i, nm in BROWS_USE.items(): put('brows', nm, ec[i])
    head_top = float(np.where(hmw > 0.5)[0].min()) if (hmw > 0.5).any() else float(top)
    feet = al[bot - 12:bot + 1]; fx = np.where(feet)[1]
    meta = dict(char=char, pose=pose, grid_view=view, size=[W, H], ground=[float(np.median(fx)), float(bot)], head_top=head_top,
                height=float(bot - head_top), neck=apply_pt(M, ((hd['neck'][0] + hd['neck'][1]) / 2, hd['chin'])),
                head_centre=apply_pt(M, (hw / 2, hh * 0.45)), registration_inliers=n, M=np.asarray(M).tolist(), colour_gain=[round(float(v), 3) for v in g],
                face=face, viseme_map={'X': 'closed', 'A': 'U_half', 'B': 'A_open', 'C': 'shocked', 'E': 'E_wide', 'O': 'O_round', 'U': 'O_round', 'F': 'FV', 'M': 'MBP'})
    json.dump(meta, open(f'{d}/pose.json', 'w'), indent=1)
    print(char, pose, 'inliers', n, 'height', meta['height'], 'mouths', len(face['mouth']), 'eyes', list(face['eyes']), 'brows', list(face['brows']))

if __name__ == '__main__':
    todo = sys.argv[1:] or [os.path.basename(f)[:-4].replace('-v4-', ':') for f in sorted(glob.glob(f'{HD}/*-v4-*.png')) if 'insert' not in f]
    for t in todo: build(*t.split(':'))
