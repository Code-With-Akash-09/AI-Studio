"""stills_v4.py OUTDIR -- 100% crops of shoulders / elbows / hands for every shot (mid frame + cut-adjacent frames) from the rendered
PNG frames of talk_test_v4.py, plus one labelled frame per shot. Character boxes come from the same camera maths as the render."""
import sys, os, cv2, numpy as np
os.environ.setdefault('FRAMES', '')
sys.argv = [sys.argv[0]] + sys.argv[1:]
OUTD = sys.argv[1]; os.makedirs(OUTD, exist_ok=True)
sys.argv = [sys.argv[0]]
import talk_test_v4 as tt
FR = f'{tt.ROOT}/talk4/frames'
for si, s in enumerate(tt.SHOTS):
    f0 = int(np.ceil(s['t0'] * tt.FPS)); f1 = min(tt.N - 1, int(s['t1'] * tt.FPS) - 1)
    for tag, f in (('first', f0), ('mid', (f0 + f1) // 2), ('last', f1)):
        img = cv2.imread(f'{FR}/f{f:03d}.png')
        if tag == 'mid': cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-full.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if s['name'] == 'key-cu':
            cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-{tag}-hand100.png', img[300:1080, 380:1300]); continue
        win = tt.window(f / tt.FPS)
        for who in ('kabir', 'dadi'):
            gx, gy, sc = tt.to_screen(win, tt.CAST[who]['feet']); Hs = tt.CAST[who]['H'] * sc
            x0, x1 = int(max(0, gx - 0.45 * Hs)), int(min(tt.SW, gx + 0.45 * Hs)); y0, y1 = int(max(0, gy - 0.86 * Hs)), int(min(tt.SH, gy - 0.38 * Hs))
            if x1 - x0 < 60 or y1 - y0 < 60: continue
            crop = img[y0:y1, x0:x1]
            if tag != 'mid' and crop.shape[1] * crop.shape[0] > 900 * 900: crop = crop[:900, :900]
            cv2.imwrite(f'{OUTD}/{si}-{s["name"]}-f{f:03d}-{tag}-{who}-arms100.png', crop)
print('ok')
