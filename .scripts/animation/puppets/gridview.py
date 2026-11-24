import sys
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 50
crop = tuple(map(int, sys.argv[4].split(','))) if len(sys.argv) > 4 else None
im = Image.open(src).convert('RGBA')
if crop: im = im.crop(crop)
ox, oy = (crop[0], crop[1]) if crop else (0, 0)
bg = Image.new('RGBA', im.size, (90, 90, 100, 255)); bg.alpha_composite(im)
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 1
if sc != 1: bg = bg.resize((int(bg.width*sc), int(bg.height*sc)), Image.LANCZOS)
d = ImageDraw.Draw(bg)
for x in range(((ox+step-1)//step)*step, ox+im.width, step):
    X=(x-ox)*sc; d.line([(X,0),(X,bg.height)], fill=(255,255,0,120) if x%(step*2)==0 else (0,255,255,90)); d.text((X+2,2), str(x), fill=(255,255,255,255))
for y in range(((oy+step-1)//step)*step, oy+im.height, step):
    Y=(y-oy)*sc; d.line([(0,Y),(bg.width,Y)], fill=(255,255,0,120) if y%(step*2)==0 else (0,255,255,90)); d.text((2,Y+2), str(y), fill=(255,255,255,255))
bg.convert('RGB').save(dst)
