"""stills_v5.py OUTDIR -- v5 check stills from the rendered talk5 frames:
  * eyeline sheet: for every shot (first / mid / last frame) a crop of each visible head, labelled with who must be looked at and
    which screen direction that is (Kabir left of frame looks RIGHT at Dadi, Dadi looks LEFT at Kabir; 180-degree rule)
  * one full frame per shot, 100% arm/hand crops (as v4), and a contact sheet."""
import sys, os, cv2, numpy as np
OUTD = sys.argv[1]; os.makedirs(OUTD, exist_ok=True); sys.argv = [sys.argv[0]]
os.environ.setdefault('FRAMES', '')
import talk_test_v5 as tt
FR = f'{tt.ROOT}/talk5/frames'
LOOK = {'kabir': ('-> Dadi (screen RIGHT)', 1), 'dadi': ('<- Kabir (screen LEFT)', -1)}
rows, contact = [], []
for si, s in enumerate(tt.SHOTS):
    f0 = int(np.ceil(s['t0'] * tt.FPS)); f1 = min(tt.N - 1, int(s['t1'] * tt.FPS) - 1)
    row = []
    for tag, f in (('first', f0), ('mid', (f0 + f1) // 2), ('last', f1)):
        img = cv2.imread(f'{FR}/f{f:03d}.png')
        if tag == 'mid':
            cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-full.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
            th = cv2.resize(img, (480, 270)); cv2.putText(th, f'{si} {s["name"]} f{f}', (8, 22), 0, 0.6, (0, 0, 255), 2); contact.append(th)
        if s['name'] == 'key-cu':
            cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-{tag}-hand100.png', img[300:1080, 380:1300]); continue
        win = tt.window(f / tt.FPS); kn = dict(zip(('kabir', 'dadi'), tt.CASTING[s['name']]))
        for who in ('kabir', 'dadi'):
            c = tt.CAST[who]; kit = tt.KITS[kn[who]]; gx, gy, sc = tt.to_screen(win, c['feet']); Hs = c['H'] * sc; k = Hs / kit.H
            sgn = -1 if c['flip'] else 1
            if 'eyes' in kit.m: e0, e1 = kit.m['eyes']
            else:                                                     # grid kits: centre of the eye patch
                v = kit.m['face']['eyes']['closed']; pp = kit.patch[('eyes', 'closed')][0]; e0, e1 = v['x'] + pp.shape[1] / 2, v['y'] + pp.shape[0] / 2
            ex = gx + sgn * (e0 - kit.ground[0]) * k; ey = gy + (e1 - kit.ground[1]) * k
            r = 0.11 * Hs; x0, x1, y0, y1 = int(ex - r), int(ex + r), int(ey - 0.8 * r), int(ey + 0.8 * r)
            if x1 < 0 or x0 > tt.SW or y1 < 0 or y0 > tt.SH or r < 12: continue
            cr = img[max(0, y0):min(tt.SH, y1), max(0, x0):min(tt.SW, x1)]
            if cr.size == 0 or min(cr.shape[:2]) < 20: continue
            cr = cv2.resize(cr, (300, int(300 * cr.shape[0] / cr.shape[1])))
            cr = cv2.copyMakeBorder(cr, 0, max(0, 240 - cr.shape[0]), 0, 0, cv2.BORDER_CONSTANT, value=(40, 40, 40))[:240]
            lab, d = LOOK[who]; cv2.rectangle(cr, (0, 0), (300, 22), (0, 0, 0), -1)
            cv2.putText(cr, f'{who} f{f} {lab}', (4, 16), 0, 0.45, (255, 255, 255), 1)
            cv2.arrowedLine(cr, (150 - 40 * d, 228), (150 + 40 * d, 228), (0, 255, 255), 3, tipLength=0.4)
            row.append(cr)
        if tag == 'mid':
            for who in ('kabir', 'dadi'):
                gx, gy, sc = tt.to_screen(win, tt.CAST[who]['feet']); Hs = tt.CAST[who]['H'] * sc
                x0, x1 = int(max(0, gx - 0.45 * Hs)), int(min(tt.SW, gx + 0.45 * Hs)); y0, y1 = int(max(0, gy - 0.86 * Hs)), int(min(tt.SH, gy - 0.38 * Hs))
                if x1 - x0 > 60 and y1 - y0 > 60: cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-{who}-arms100.png', img[y0:y1, x0:x1])
    if row:
        row = row + [np.full_like(row[0], 40)] * (6 - len(row)); rows.append(np.hstack(row[:6]))
cv2.imwrite(f'{OUTD}/eyeline-check.jpg', np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
contact += [np.zeros_like(contact[0])] * (-len(contact) % 3)
cv2.imwrite(f'{OUTD}/contact.jpg', np.vstack([np.hstack(contact[i:i + 3]) for i in range(0, len(contact), 3)]), [cv2.IMWRITE_JPEG_QUALITY, 90])
print('ok', len(rows), 'eyeline rows')
