"""mouths_video_v6.py OUT.jpg -- 100% crops (video pixels) of Kabir's mouth from the rendered talk6 frames: the first frame of every
distinct (shot, shape) run while he speaks, labelled with the fine viseme, the painted shape, and whether it is a cross-dissolve frame."""
import sys, os, cv2, numpy as np
out = sys.argv[1]; sys.argv = [sys.argv[0]]; os.environ.setdefault('FRAMES', '')
import talk_test_v6 as tt
FR = f'{tt.ROOT}/talk6/frames'; tiles = []; seen = set()
for f in range(tt.N):
    t = f / tt.FPS; s = tt.shot_at(t)
    if s['name'] == 'key-cu' or not tt.speaking('kabir', t): continue
    kn = tt.CASTING[s['name']][0]; kit = tt.KITS[kn]; shp = tt.kabir_mouth(f, kit)
    if (s['name'], shp) in seen: continue
    f2 = min(tt.N - 1, f + 1)                                       # the held (non-dissolve) frame of that run
    seen.add((s['name'], shp)); win = tt.window(f2 / tt.FPS); c = tt.CAST['kabir']
    gx, gy, sc = tt.to_screen(win, c['feet']); Hs = c['H'] * sc; k = Hs / kit.H
    mx = gx - (kit.m['mouth'][0] - kit.ground[0]) * k; my = gy + (kit.m['mouth'][1] - kit.ground[1]) * k
    r = max(40, int(0.05 * Hs)); img = cv2.imread(f'{FR}/f{f2:03d}.png')
    x0, y0 = int(mx - r), int(my - 0.8 * r); crop = img[max(0, y0):y0 + int(1.6 * r), max(0, x0):x0 + 2 * r]
    if crop.size == 0: continue
    crop = cv2.copyMakeBorder(crop, 20, 0, 0, 0, cv2.BORDER_CONSTANT, value=(30, 30, 30))
    cv2.putText(crop, f'{s["name"][:9]} f{f2} {tt.VISF[f2]}->{shp}', (2, 14), 0, 0.38, (255, 255, 255), 1); tiles.append(crop)
h = max(t.shape[0] for t in tiles); w = max(t.shape[1] for t in tiles)
tiles = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, w - t.shape[1], cv2.BORDER_CONSTANT, value=(30, 30, 30)) for t in tiles]
cols = 6; tiles += [np.full_like(tiles[0], 30)] * (-len(tiles) % cols)
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out, len(seen))
