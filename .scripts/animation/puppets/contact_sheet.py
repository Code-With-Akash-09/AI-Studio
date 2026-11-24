"""Contact sheet from a video: python contact_sheet.py video.mp4 out.jpg [every_s] [cols]"""
import sys, subprocess, json, os, tempfile, glob
from PIL import Image, ImageDraw, ImageFont
vid, out = sys.argv[1], sys.argv[2]; every = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
d = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-i', vid, '-vf', f'fps=1/{every},scale=480:270', f'{d}/f%04d.png'], check=True)
fs = sorted(glob.glob(f'{d}/*.png')); rows = (len(fs) + cols - 1) // cols
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
sh = Image.new('RGB', (cols * 484, rows * 274), (20, 20, 20)); dr = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    x, y = (i % cols) * 484 + 2, (i // cols) * 274 + 2; sh.paste(Image.open(f), (x, y))
    t = i * every + every / 2; dr.rectangle((x, y, x + 74, y + 24), fill=(0, 0, 0)); dr.text((x + 4, y + 2), f'{t:5.1f}s', fill=(255, 230, 0), font=F)
sh.save(out, quality=90); print(out, len(fs), 'frames')
