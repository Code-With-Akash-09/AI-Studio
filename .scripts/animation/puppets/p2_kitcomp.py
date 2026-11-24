import sys, json, numpy as np
from PIL import Image
out_p, char, poses = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
V = ['base', 'closed', 'aa', 'MBP', 'E', 'O', 'U', 'FV', 'L', 'blink']
out = Image.new('RGB', (len(V) * 200, len(poses) * 200), 'white')
for j, p in enumerate(poses):
    d = f'poses/p2/{char}-{p}'; m = json.load(open(d + '/pose.json')); ex, ey = m['eyes']; mx, my = m['mouth']; r = int(1.6 * np.hypot(ex - mx, ey - my)) + 40
    B = Image.open(d + '/body.png').convert('RGBA')
    for i, v in enumerate(V):
        b = B.copy(); f = (m['face']['eyes'].get('closed') if v == 'blink' else m['face']['mouth'].get(v))
        if v != 'base' and f:
            pt = Image.open(d + '/' + f['file']).convert('RGBA'); mk = Image.open(d + '/' + f['mask']).convert('L')
            a = np.array(pt)[..., 3].astype(np.float32) * np.array(mk) / 255; pt.putalpha(Image.fromarray(a.astype(np.uint8)))
            lay = Image.new('RGBA', b.size, (0, 0, 0, 0)); lay.paste(pt, (f['x'], f['y'])); b.alpha_composite(lay)
        cx, cy = int((ex + mx) / 2), int((ey + my) / 2)
        c = b.crop((cx - r, cy - r, cx + r, cy + r)).resize((200, 200)); bg = Image.new('RGBA', c.size, (255, 255, 255, 255)); bg.alpha_composite(c)
        out.paste(bg.convert('RGB'), (i * 200, j * 200))
out.save(out_p); print(out_p)
