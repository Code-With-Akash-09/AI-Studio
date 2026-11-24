"""Build painted cutout-puppet kits: python build.py [name ...]"""
import sys, json, math, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from config import *

K = f'{ROOT}/_keyed'

def colour_mask(img, kind):
    h = hsv(img); H, S, V = h[..., 0] * 2, h[..., 1] / 255, h[..., 2] / 255
    if kind == 'brown': m = (H >= 5) & (H <= 40) & (S > 0.25) & (V < 0.62)
    elif kind == 'mustard': m = (H >= 28) & (H <= 55) & (S > 0.4) & (V > 0.35)
    elif kind == 'notkurta': m = ~((H >= 12) & (H <= 34) & (S > 0.62))
    else: m = np.ones(img.shape[:2], bool)
    m = ndi.binary_opening(m, iterations=1); m = ndi.binary_closing(m, iterations=2)
    return ndi.binary_dilation(m, iterations=1)

class Kit:
    def __init__(self, name, view, W, H):
        self.name, self.view = name, view
        self.dir = f'{ROOT}/{name}/{view}'
        os.makedirs(self.dir, exist_ok=True)
        self.layers, self.face, self.joints = [], {}, {}
        self.size = (W, H)

    def put(self, key, img, group=None, **meta):
        c, (x, y) = crop_layer(img)
        if c is None: return None
        rel = f'{group}/{key}.png' if group else f'{key}.png'
        save(c, f'{self.dir}/{rel}')
        entry = dict(file=f'{self.view}/{rel}', x=x, y=y, w=int(c.shape[1]), h=int(c.shape[0]), **meta)
        return entry

def soft(mask, r=1.2):
    return np.clip(cv2.GaussianBlur(mask.astype(np.float32), (0, 0), r), 0, 1)

def head_mask(shape, hd):
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    chin, (nx0, nx1), ext = hd['chin'], hd['neck'], hd['ext']
    top = np.clip((chin - yy) / 4 + 0.5, 0, 1)
    neck = ((xx >= nx0) & (xx <= nx1)).astype(np.float32) * np.clip((chin + ext - yy) / ext, 0, 1) * (yy >= chin)
    side = np.clip(np.minimum(xx - nx0, nx1 - xx) / 8, 0, 1)
    return np.maximum(top, neck * side)

def local_gain(patch, ref, mask):
    ring = (mask > 0.05) & (mask < 0.6) & (patch[..., 3] > 200) & (ref[..., 3] > 200)
    if ring.sum() < 30: return np.ones(3)
    return np.clip(ref[..., :3][ring].mean(0) / np.maximum(patch[..., :3][ring].mean(0), 1), 0.85, 1.18)

def build_head(kit, name, src, view, vcfg, cfg, body):
    hd = vcfg['head']
    vis = load(f'{K}/{src}-{view}-visemes.png'); master = cell(vis, 0, 0)
    roi = vcfg.get('roi', (200, 0, 660, 360))
    M, n = register(master, body, roi)
    assert M is not None, 'head registration failed'
    W, H = kit.size
    # colour-match head grids to body skin
    mw = warp(master, M, (W, H))
    sk = skin_mask(mw) & skin_mask(body)
    g = colour_gain(mw, sk, body, sk) if sk.sum() > 200 else np.ones(3)
    hm = head_mask(master.shape, hd)
    def to_body(img_head):  # img in master coords -> body coords, gain applied
        return warp(apply_gain(img_head, g), M, (W, H))
    meta = dict(registration_inliers=n, colour_gain=[round(float(v), 3) for v in g])
    neck_pt = apply_pt(M, ((hd['neck'][0] + hd['neck'][1]) / 2, hd['chin'] - 6))
    kit.joints['neck'] = neck_pt
    head = with_alpha(master, hm)
    kit.layers.append(kit.put('head', to_body(head), part='head', parent='torso', pivot=neck_pt, z=50))
    # body region to clear (body's own head above the chin line)
    hh, hw = master.shape[:2]
    Minv = cv2.invertAffineTransform(M)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    yh = Minv[1, 0] * xx + Minv[1, 1] * yy + Minv[1, 2]
    xh = Minv[0, 0] * xx + Minv[0, 1] * yy + Minv[0, 2]
    clear = (yh < hd['chin'] - 2) & (xh > -60) & (xh < hw + 60)
    # face patches
    def patch(src_cell, mask_fn, key, group):
        Mc, nc = register(src_cell, master)
        if Mc is None: print('   reject (no registration)', group, key); return None
        wc = warp(src_cell, Mc, (hw, hh))
        m = mask_fn(master.shape)
        lg = local_gain(wc, master, m)
        p = with_alpha(apply_gain(wc, lg), m * (wc[..., 3] / 255 > 0.5))
        e = kit.put(key, to_body(p), group=group, inliers=nc)
        return e
    mx, my, rx, ry = hd['mouth']
    mouth_m = lambda s: ellipse_mask(s, mx, my, rx, ry, 8)
    ex0, ey0, ex1, ey1 = hd['eyes']; eyes_m = lambda s: rect_soft(s, ex0, ey0, ex1, ey1, 10)
    bx0, by0, bx1, by1 = hd['brows']; brows_m = lambda s: rect_soft(s, bx0, by0, bx1, by1, 8)
    skip = set(tuple(x) for x in cfg.get('skip', {}).get(view, []))
    vc = [cell(vis, r, c) for r in range(3) for c in range(3)]
    kit.face['mouth'] = {}
    for i, nm in VISEMES.items():
        e = patch(vc[i], mouth_m, nm, 'mouth') if i else kit.put(nm, to_body(with_alpha(master, mouth_m(master.shape))), group='mouth')
        if e: kit.face['mouth'][nm] = e
    ey = load(f'{K}/{src}-{view}-eyes.png'); ec = [cell(ey, r, c) for r in range(3) for c in range(3)]
    kit.face['eyes'], kit.face['brows'] = {}, {}
    kit.face['eyes']['open'] = kit.put('open', to_body(with_alpha(master, eyes_m(master.shape))), group='eyes')
    kit.face['brows']['neutral'] = kit.put('neutral', to_body(with_alpha(master, brows_m(master.shape))), group='brows')
    for i, nm in EYES.items():
        if i == 0: continue
        e = patch(ec[i], eyes_m, nm, 'eyes')
        if e: kit.face['eyes'][nm] = e
    for i, nm in BROWS.items():
        if ('brows', i) in skip: continue
        e = patch(ec[i], brows_m, nm, 'brows')
        if e: kit.face['brows'][nm] = e
    ex = load(f'{K}/{src}-{view}-expr.png'); xc = [cell(ex, r, c) for r in range(3) for c in range(3)]
    names = dict(EXPR); names.update(cfg.get('expr_names', {}).get(view, {}))
    names = cfg.get('expr_remap', {}).get(view, names)
    kit.face['expr'] = {}
    def expr_head(src_cell, nm):
        Mc, nc = register(src_cell, master)
        if Mc is None: print('   reject expr', nm); return
        wc = warp(src_cell, Mc, (hw, hh))
        lg = colour_gain(wc, skin_mask(wc) & skin_mask(master), master, skin_mask(wc) & skin_mask(master))
        e = kit.put(nm, to_body(with_alpha(apply_gain(wc, lg), hm)), group='expr', inliers=nc, replaces='head')
        if e: kit.face['expr'][nm] = e
    for i, nm in names.items():
        if nm is None or ('expr', i) in skip: continue
        expr_head(xc[i], nm)
    ext = cfg.get('extras', {}).get(view)
    if ext:
        X = load(f'{K}/{src}-{view}-extra.png'); xs = [cell(X, r, c, 2) for r in range(2) for c in range(2)]
        for i, (grp, nm) in ext.items():
            if grp == 'expr': expr_head(xs[i], nm)
            else:
                e = patch(xs[i], brows_m if grp == 'brows' else eyes_m, nm, grp)
                if e: kit.face[grp][nm] = e
    # visemes the existing lip-sync emits (classic/visemes.js) -> mouth layer
    kit.face['viseme_map'] = {'X': 'closed', 'A': 'U_half', 'B': 'A_open', 'C': 'shocked', 'E': 'E_wide', 'O': 'O_round', 'U': 'O_round', 'F': 'FV', 'M': 'MBP'}
    return clear, g, meta

def unit(v):
    v = np.array(v, np.float32); return v / (np.linalg.norm(v) + 1e-6)

def build_arm(kit, body, a, torso_alpha):
    shape = body.shape
    alpha = body[..., 3] > 20
    cutside = side_of(shape, a['cut'][0], a['cut'][1])
    tipside = cutside[int(a['tip'][1]), int(a['tip'][0])]
    outer = (cutside * np.sign(tipside)) > 0
    # capsule around shoulder->tip
    J, E, Wr, T = [np.array(p, np.float32) for p in (a['J'], a['E'], a['W'], a['tip'])]
    h, w = shape[:2]; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    def seg_dist(P, Q):
        d = Q - P; t = np.clip(((xx - P[0]) * d[0] + (yy - P[1]) * d[1]) / (d @ d), 0, 1)
        return np.sqrt((xx - P[0] - t * d[0]) ** 2 + (yy - P[1] - t * d[1]) ** 2)
    cap = (seg_dist(J, E) < a['r'] * 1.35) | (seg_dist(E, Wr) < a['r']) | (seg_dist(Wr, T) < a['r'] * 1.25) | (np.sqrt((xx - T[0]) ** 2 + (yy - T[1]) ** 2) < a['r'])
    lab, _ = ndi.label(alpha & outer & cap)
    l = lab[int(T[1]), int(T[0])]
    if l == 0:
        ys, xs = np.where(lab > 0); k = np.argmin((xs - T[0]) ** 2 + (ys - T[1]) ** 2); l = lab[ys[k], xs[k]]
    arm = lab == l
    rS = a['r'] * 0.8
    shoulder_disk = disk(shape, J, rS) & alpha
    armfull = arm | shoulder_disk
    # segment by perpendicular lines at elbow / wrist
    dE = perp_dist(shape, E, J, E)       # >0 beyond elbow (towards forearm)
    dW = perp_dist(shape, Wr, E, Wr)     # >0 beyond wrist
    pad = 10
    upper = armfull & (dE < pad)
    lower = arm & (dE >= -2) & (dW < pad) | (disk(shape, E, a['r'] * 0.62) & arm)
    hand = arm & (dW >= -1) | (disk(shape, Wr, a['r'] * 0.42) & arm & (dW >= -8))
    s = a['side']; zb = 60 if a['z'] == 'front' else 5
    up = kit.put(f'arm_upper_{s}', with_alpha(body, upper), group='body', part='arm_upper', side=s, parent='torso', pivot=a['J'], z=zb)
    lo = kit.put(f'arm_lower_{s}', with_alpha(body, lower), group='body', part='arm_lower', side=s, parent=f'arm_upper_{s}', pivot=a['E'], z=zb + 1)
    ha = kit.put(f'hand_{s}_relaxed', with_alpha(body, hand), group='hands', part='hand', side=s, parent=f'arm_lower_{s}', pivot=a['W'], z=zb + 2, pose='relaxed')
    kit.layers += [up, lo, ha]
    kit.joints[f'shoulder_{s}'] = list(a['J']); kit.joints[f'elbow_{s}'] = list(a['E']); kit.joints[f'wrist_{s}'] = list(a['W'])
    kit.joints[f'fingertip_{s}'] = list(a['tip'])
    inner = (cutside * np.sign(tipside)) <= 0
    return arm | (shoulder_disk & ~inner), dict(hand_len=float(np.linalg.norm(T - Wr)), axis=unit(Wr - E).tolist())

def build_hands(kit, sheet, cells, arms_info, body, cfgarms):
    S = load(f'{K}/{sheet}.png'); h, w = S.shape[:2]
    for idx, pose in cells.items():
        if pose == 'relaxed': continue  # the body's own hand is the on-model relaxed hand
        r, c = divmod(idx, 3)
        C = S[round(r * h / 2):round((r + 1) * h / 2), round(c * w / 3):round((c + 1) * w / 3)]
        sk = skin_mask(C)
        lab, n = ndi.label(sk)
        if n == 0: continue
        sizes = ndi.sum(sk, lab, range(1, n + 1)); hm = lab == (np.argmax(sizes) + 1)
        hm = ndi.binary_fill_holes(ndi.binary_dilation(hm, iterations=3)) & (C[..., 3] > 20)
        # include bangles/gold right above the hand (kamla): gold pixels touching the hand top
        ys, xs = np.where(hm); top, bot = ys.min(), ys.max(); cx = xs.mean()
        Hc = C.copy(); Hc[..., 3] = Hc[..., 3] * hm
        # feather the wrist top so it blends over the forearm
        yy = np.arange(C.shape[0])[:, None].astype(np.float32)
        Hc[..., 3] *= np.clip((yy - top) / 10, 0, 1)
        Hc, (ox, oy) = crop_layer(Hc, 0)
        for a, info in zip(cfgarms, arms_info):
            s = a['side']
            img = Hc[:, ::-1].copy() if a['hand_flip'] else Hc
            hl = bot - top
            scale = info['hand_len'] / max(hl * 0.92, 1)
            ang = math.degrees(math.atan2(info['axis'][1], info['axis'][0])) - 90  # sheet hands point down (+y)
            # map sheet wrist top-centre -> body wrist slightly up the forearm
            wx = (img.shape[1] / 2) if True else 0
            Mr = cv2.getRotationMatrix2D((float(wx), 0.0), -ang, scale)
            back = np.array(info['axis']) * (-6)
            Mr[:, 2] += np.array(a['W'], np.float32) + back - np.array([wx, 0.0])
            out = warp(img, Mr, kit.size)
            g = colour_gain(out, skin_mask(out), body, skin_mask(body) & (disk(body.shape, a['W'], 90)))
            e = kit.put(f'hand_{s}_{pose}', apply_gain(out, g), group='hands', part='hand', side=s, parent=f'arm_lower_{s}', pivot=a['W'], z=(60 if a['z'] == 'front' else 5) + 2, pose=pose, alt=True)
            if e: kit.layers.append(e)

def build_legs(kit, body, lc, torso_mask):
    shape = body.shape; alpha = body[..., 3] > 20
    h, w = shape[:2]; yy, xx = np.mgrid[0:h, 0:w]
    below = alpha & (yy >= lc['hem'])
    # auto leg split: median midpoint of the background gap between the two legs
    mids = []
    cx0 = lc['split']
    for y in range(lc['hem'], h):
        row = alpha[y]
        xs = np.where(~row[int(cx0) - 90:int(cx0) + 90])[0]
        if len(xs) and row[int(cx0) - 90:int(cx0) + 90].any():
            xs = xs + int(cx0) - 90
            inner = xs[(xs > np.where(row)[0].min()) & (xs < np.where(row)[0].max())]
            if len(inner) > 2: mids.append(float(np.median(inner)))
    if len(mids) > 20:
        lc = dict(lc, split=float(np.median(mids)))
        print('   leg split', lc['split'])
    removed = np.zeros(shape[:2], bool)
    for it in lc['items']:
        s = it['side']
        sidem = (xx < lc['split']) if s == 'L' else (xx >= lc['split'])
        leg = below & sidem
        # extend upward under the hem by stretching the first rows (hidden behind the torso)
        L = with_alpha(body, leg)
        ext = 46
        r0 = lc['hem'] + 3
        rowpix = L[r0:r0 + 1].copy()
        for k in range(1, ext):
            yk = lc['hem'] - k
            if yk < 0: break
            m = rowpix[0, :, 3] > 0
            L[yk, m] = rowpix[0, m]
        hip, knee, ank = [np.array(p, np.float32) for p in (it['hip'], it['knee'], it['ankle'])]
        dK = perp_dist(shape, knee, hip, knee)
        upper = L.copy(); upper[..., 3] *= (dK < 10)
        lower = L.copy(); lower[..., 3] *= ((dK >= -2) | disk(shape, knee, 30))
        lower[..., 3] *= (yy >= lc['hem'])
        z = 2 if it.get('z') == 'back' else 3
        kit.layers.append(kit.put(f'leg_upper_{s}', upper, group='body', part='leg_upper', side=s, parent='torso', pivot=it['hip'], z=z))
        kit.layers.append(kit.put(f'leg_lower_{s}', lower, group='body', part='leg_lower', side=s, parent=f'leg_upper_{s}', pivot=it['knee'], z=z + 0.5))
        kit.joints[f'hip_{s}'] = list(it['hip']); kit.joints[f'knee_{s}'] = list(it['knee']); kit.joints[f'ankle_{s}'] = list(it['ankle'])
        removed |= leg
    return removed

def build_human(name):
    cfg = CHARS[name]; src = cfg['src']
    rig = dict(name=name, kind='human', style='painted-cutout', views={})
    for view, vc in cfg['views'].items():
        vc = scaled(vc)
        print(name, view)
        body = load(f'{K}/{src}-{view}-body.png'); H, W = body.shape[:2]
        kit = Kit(name, view, W, H)
        clear, g, hmeta = build_head(kit, name, src, view, vc, cfg, body)
        torso = body.copy(); torso[..., 3] *= ~clear
        arm_masks, infos = [], []
        for a in vc['arms']:
            am, info = build_arm(kit, body, a, torso[..., 3])
            arm_masks.append(am); infos.append(info)
        anyarm = np.any(arm_masks, 0)
        # torso: remove arms; fill pixels that were covered by an arm inside the torso silhouette
        tal = torso[..., 3] > 20
        hole = anyarm & ndi.binary_closing(tal & ~anyarm, iterations=3)
        torso[..., 3] = np.where(anyarm & ~hole, 0, torso[..., 3])
        if hole.any(): torso = inpaint_under(torso, hole, 7); torso[..., 3] = np.where(hole, 255, torso[..., 3])
        if vc.get('legs'):
            rem = build_legs(kit, body, vc['legs'], tal)
            torso[..., 3] = np.where(rem, 0, torso[..., 3])
        for ac in vc.get('acc', []):
            pm = poly_mask(body.shape, ac['poly']) & (body[..., 3] > 10)
            if ac.get('colour'): pm &= colour_mask(body, ac['colour'])
            pm &= ~anyarm
            A = with_alpha(body, soft(pm, 0.8))
            z = 70 if ac['z'] == 'front' else 1
            kit.layers.append(kit.put(f'acc_{ac["name"]}', A, group='acc', part='accessory', parent=None if ac.get('detach') else 'torso', pivot=ac['pivot'], z=z, detachable=bool(ac.get('detach'))))
            if ac.get('detach'):
                torso[..., 3] = np.where(pm, 0, torso[..., 3])
            else:
                inner = pm & ndi.binary_erosion(torso[..., 3] > 20, iterations=3) & ~ndi.binary_dilation(~(body[..., 3] > 200) , iterations=6)
                torso = inpaint_under(torso, pm, 6)
                # keep the accessory silhouette solid on the torso so swinging never shows holes
        # drop stray fragments (finger tips etc. left behind when the limbs were cut out)
        lab, n = ndi.label(torso[..., 3] > 20)
        if n > 1:
            sizes = ndi.sum(torso[..., 3] > 20, lab, range(1, n + 1))
            torso[..., 3] = np.where(np.isin(lab, np.where(sizes < sizes.max() * 0.02)[0] + 1), 0, torso[..., 3])
        kit.layers.append(kit.put('torso', torso, group='body', part='torso', parent=None, pivot=kit.joints['neck'], z=10))
        al = body[..., 3] > 30; ys, xs = np.where(al)
        ground = [float(np.median(xs[ys > ys.max() - 40])), float(ys.max())]
        rig['views'][view] = dict(canvas=[W, H], ground=ground, height=float(ys.max() - ys.min()), top=float(ys.min()),
                                  joints=kit.joints, layers=sorted([l for l in kit.layers if l], key=lambda l: l['z']),
                                  face=kit.face, head_meta=hmeta,
                                  rest_pose='A-pose: arms ~30-35deg out from body; rotate bones by (target - rest) about each pivot')
        if cfg.get('hands'): build_hands(kit, cfg['hands'], cfg['hand_cells'], infos, body, vc['arms'])
        rig['views'][view]['layers'] = sorted([l for l in kit.layers if l], key=lambda l: l['z'])
    with open(f'{ROOT}/{name}/rig.json', 'w') as f: json.dump(rig, f, indent=1)

if __name__ == '__main__':
    for n in sys.argv[1:]:
        build_human(n)
