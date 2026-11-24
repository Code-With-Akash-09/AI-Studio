import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import *

def build_dog(name):
    cfg = DOG[name]; src = cfg['src']
    rig = dict(name=name, kind='dog', style='painted-cutout', views={})
    for view, vc in cfg['views'].items():
        print(name, view)
        body = load(f'{K}/{src}-{view}-body.png'); H, W = body.shape[:2]
        kit = Kit(name, view, W, H)
        G = load(f'{K}/{src}-{view}-face.png'); cells = [cell(G, r, c) for r in range(3) for c in range(3)]
        master = cells[0]; hh, hw = master.shape[:2]
        M, n = register(master, body, vc['roi']); assert M is not None
        mw = warp(master, M, (W, H))
        fur = (mw[..., 3] > 200) & (body[..., 3] > 200)
        g = colour_gain(mw, fur, body, fur)
        to_body = lambda im: warp(apply_gain(im, g), M, (W, H))
        # head mask: above the collar-bottom polyline, plus the bell
        poly = vc['cut'] + [(hw, vc['cut'][-1][1]), (hw, -5), (-5, -5), (-5, vc['cut'][0][1])]
        hm = soft(poly_mask(master.shape, poly), 1.5)
        bx0, by0, bx1, by1 = vc['bell']; hm = np.maximum(hm, rect_soft(master.shape, bx0, by0, bx1, by1, 3))
        # ears out of the head (inpaint the head under them)
        ear_masks = []
        for e in vc['ears']:
            em = poly_mask(master.shape, e['poly']) & (master[..., 3] > 10)
            ear_masks.append(em)
            kit.layers.append(kit.put(e['name'], to_body(with_alpha(master, soft(em, 0.8))), group='body', part='ear', name=e['name'],
                                      parent='head', pivot=apply_pt(M, e['pivot']), z=52 if e['z'] == 'front' else 48))
        anyear = np.any(ear_masks, 0)
        hbase = with_alpha(master, hm)
        interior = anyear & ndi.binary_closing((master[..., 3] > 200) & ~anyear, iterations=10)
        hbase[..., 3] = np.where(anyear & ~interior, 0, hbase[..., 3])
        hbase = inpaint_under(hbase, anyear & interior, 6)
        neck = apply_pt(M, ((vc['cut'][0][0] + vc['cut'][-1][0]) / 2 + 40, vc['cut'][1][1] - 30))
        kit.joints['neck'] = neck
        kit.layers.append(kit.put('head', to_body(hbase), part='head', parent='torso', pivot=neck, z=50))
        kit.face = {'mouth': {}, 'eyes': {}, 'expr': {}}
        mx, my, rx, ry = vc['mouth']; ex0, ey0, ex1, ey1 = vc['eyes']
        mm = ellipse_mask(master.shape, mx, my, rx, ry, 10); emk = rect_soft(master.shape, ex0, ey0, ex1, ey1, 12)
        kit.face['mouth']['closed'] = kit.put('closed', to_body(with_alpha(master, mm)), group='mouth')
        kit.face['eyes']['open'] = kit.put('open', to_body(with_alpha(master, emk)), group='eyes')
        for grp, items in vc['cells'].items():
            for i, nm in items.items():
                if i == 0: continue
                Mc, nc = register(cells[i], master)
                if Mc is None: print('  reject', grp, nm); continue
                wc = warp(cells[i], Mc, (hw, hh))
                if grp == 'expr':
                    e = kit.put(nm, to_body(with_alpha(wc, hm)), group='expr', inliers=nc, replaces='head+ears')
                else:
                    m = mm if grp == 'mouth' else emk
                    e = kit.put(nm, to_body(with_alpha(apply_gain(wc, local_gain(wc, master, m)), m * (wc[..., 3] > 128))), group=grp, inliers=nc)
                if e: kit.face[grp][nm] = e
        kit.face['viseme_map'] = {'X': 'closed', 'A': 'bark', 'B': 'bark', 'C': 'bark', 'E': 'smile', 'O': 'bark', 'U': 'bark', 'F': 'closed', 'M': 'closed'}
        # body: clear the original head above the collar line
        Minv = cv2.invertAffineTransform(M)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        xh = Minv[0, 0] * xx + Minv[0, 1] * yy + Minv[0, 2]; yh = Minv[1, 0] * xx + Minv[1, 1] * yy + Minv[1, 2]
        cut_y = np.interp(xh, [p[0] for p in vc['cut']], [p[1] for p in vc['cut']])
        torso = body.copy(); torso[..., 3] *= ~((yh < cut_y - 25) & (xh > -40) & (xh < hw + 40))
        # tail + legs
        t = vc['tail']; tm = poly_mask(body.shape, t['poly']) & (body[..., 3] > 10)
        kit.layers.append(kit.put('tail', with_alpha(body, soft(tm, 0.8)), group='body', part='tail', name='tail', parent='torso', pivot=t['pivot'], z=4))
        torso[..., 3] *= ~(tm & ~disk(body.shape, t['pivot'], 16))
        for lg in vc['legs']:
            lm = poly_mask(body.shape, lg['poly']) & (body[..., 3] > 10)
            kit.layers.append(kit.put(lg['name'], with_alpha(body, soft(lm, 0.8)), group='body', part='leg', name=lg['name'], parent='torso',
                                      pivot=[float(np.mean([p[0] for p in lg['poly'][:2]])), float(lg['top'] + 10)], z=3 if lg['z'] == 'back' else 6))
            torso[..., 3] *= ~(lm & (yy > lg['top'] + 26))
            kit.joints[lg['name']] = [float(np.mean([p[0] for p in lg['poly'][:2]])), float(lg['top'] + 10)]
        kit.layers.append(kit.put('torso', torso, group='body', part='torso', parent=None, pivot=neck, z=5))
        al = body[..., 3] > 30; ys, xs = np.where(al)
        rig['views'][view] = dict(canvas=[W, H], ground=[float(np.median(xs[ys > ys.max() - 40])), float(ys.max())], height=float(ys.max() - ys.min()),
                                  top=float(ys.min()), joints=kit.joints, layers=sorted([l for l in kit.layers if l], key=lambda l: l['z']), face=kit.face,
                                  head_meta=dict(registration_inliers=n, colour_gain=[round(float(v), 3) for v in g]))
    json.dump(rig, open(f'{ROOT}/{name}/rig.json', 'w'), indent=1)

if __name__ == '__main__':
    build_dog('bholu')
