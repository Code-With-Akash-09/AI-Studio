"""p2_heads_sheet.py out.jpg name... -- row of eye-band crops from the head crops (_gen/p2heads/<name>.src.png) for the eyeline check."""
import sys
from PIL import Image, ImageDraw
H = '/workspace/anim-demo/puppets/_gen/p2heads'; names = sys.argv[2:]
W = Image.new('RGB', (len(names) * 360, 300), 'white'); d = ImageDraw.Draw(W)
for i, n in enumerate(names):
    W.paste(Image.open(f'{H}/{n}.src.png').convert('RGB').crop((100, 250, 900, 900)).resize((360, 292)), (i * 360, 8)); d.text((i * 360 + 4, 0), n, fill='black')
W.save(sys.argv[1])
