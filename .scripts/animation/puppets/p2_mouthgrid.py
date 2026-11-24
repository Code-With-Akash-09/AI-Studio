"""p2_mouthgrid.py out.jpg kit... -- one row per kit: base + every mouth shape + blink (mouths_v6.py WIDE=1 strips, stacked, downscaled)."""
import sys, os, subprocess
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); rows = []
for k in sys.argv[2:]:
    t = f'/tmp/mg-{os.path.basename(k)}.jpg'
    subprocess.run([sys.executable, f'{D}/mouths_v6.py', t, k], env=dict(os.environ, WIDE='1'), capture_output=True)
    im = Image.open(t); im.thumbnail((2400, 200)); rows.append(im)
W = Image.new('RGB', (max(r.size[0] for r in rows), sum(r.size[1] for r in rows)), 'white'); y = 0
for r in rows: W.paste(r, (0, y)); y += r.size[1]
W.save(sys.argv[1]); print(sys.argv[1], W.size)
