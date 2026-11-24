"""Old vs new talk-test stills: python compare_stills.py old.png new.png outdir old_center new_center"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
old, new, out = sys.argv[1:4]
oc = tuple(map(int, sys.argv[4].split(','))); nc = tuple(map(int, sys.argv[5].split(',')))
os.makedirs(out, exist_ok=True)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
def lab(im, t):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, d.textlength(t, font=F) + 20, 44), fill=(0, 0, 0)); d.text((10, 5), t, fill=(255, 255, 255), font=F); return im
A = Image.open(old).convert('RGB'); B = Image.open(new).convert('RGB')
# 1) full frames side by side, both shown at 1920x1080 (how a viewer sees them full-screen)
A1 = A.resize((1920, 1080), Image.LANCZOS)
s = Image.new('RGB', (3840 + 20, 1080), (255, 255, 255)); s.paste(lab(A1.copy(), 'v1 (720p, upscaled to 1080p for viewing)'), (0, 0)); s.paste(lab(B.copy(), 'v2 (native 1080p)'), (1940, 0))
s.save(f'{out}/frame-old-vs-new.jpg', quality=92)
s.resize((1930, 540), Image.LANCZOS).save(f'{out}/frame-old-vs-new-small.jpg', quality=92)
# 2) 100% crops of the same region of the character as seen on a 1080p screen (600x600)
def crop(im, c, size=600): return im.crop((c[0] - size // 2, c[1] - size // 2, c[0] + size // 2, c[1] + size // 2))
oc1 = (int(oc[0] * 1.5), int(oc[1] * 1.5))
s = Image.new('RGB', (1220, 600), (255, 255, 255)); s.paste(lab(crop(A1, oc1), 'v1 @100% of 1080p'), (0, 0)); s.paste(lab(crop(B, nc), 'v2 @100%'), (620, 0))
s.save(f'{out}/crop100-old-vs-new.png')
# 3) v1 at its own native 720p 100% (no upscale) for reference
s = Image.new('RGB', (820, 400), (255, 255, 255)); s.paste(lab(crop(A, oc, 400), 'v1 native 720p @100%'), (0, 0)); s.paste(lab(crop(B, nc, 400), 'v2 @100%'), (420, 0))
s.save(f'{out}/crop100-native-old-vs-new.png')
print('ok')
