"""Painted cutout-puppet preview sheet.

Renders every puppet kit (rig.json + layer PNGs) in several poses for each view,
plus every mouth shape, eye/brow state and expression head, into one sheet:
  python .scripts/animation/puppet-preview.py [out.png]
Kits are read from $PUPPET_ROOT (default /workspace/anim-demo/puppets).
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'puppets'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from puppet import Puppet, render, over_bg

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/preview-sheet.png'
CAST = ['kabir', 'bittu', 'kamla-dadi', 'bholu']
BG = (226, 214, 196)
HUMAN_POSES = [
    ('rest', {}),
    ('arms down, talk', {'arm_upper_L': -30, 'arm_upper_R': 30, 'arm_lower_L': -8, 'arm_lower_R': 8, 'head': 4,
                         'face': {'mouth': 'A_open', 'eyes': 'half', 'brows': 'raised'}}),
    ('explain', {'arm_upper_L': -26, 'arm_lower_L': -8, 'arm_upper_R': 6, 'arm_lower_R': -52, 'hands': {'R': 'open_palm'},
                 'head': -3, 'face': {'mouth': 'E_wide', 'brows': 'worried'}}),
    ('point + happy', {'arm_upper_L': -25, 'arm_upper_R': -40, 'arm_lower_R': -32, 'hands': {'R': 'point'}, 'leg_upper_L': 6,
                       'leg_upper_R': -6, 'face': {'expr': 'happy'}, 'acc_scarf_end': 8, 'acc_satchel': 6, 'acc_gamchha': 6,
                       'acc_gamchha_L': 6, 'acc_gamchha_R': -6, 'acc_pallu': 6}),
]
DOG_POSES = [
    ('rest', {}),
    ('pant', {'head': -6, 'tail': -25, 'ear_near': 10, 'ear_far': -8, 'ear_L': -10, 'ear_R': 10, 'face': {'mouth': 'pant', 'eyes': 'half'}}),
    ('step', {'leg_front_near': 14, 'leg_hind_near': -12, 'leg_front_L': 8, 'leg_front_R': -8, 'tail': 18, 'face': {'mouth': 'bark'}}),
    ('happy', {'face': {'expr': 'happy'}, 'tail': 22}),
]
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except OSError:
    FONT = SMALL = ImageFont.load_default()

PW, PH = 270, 400  # pose cell
FW = 112           # face cell

def pose_cell(p, view, pose):
    V = p.rig['views'][view]; PW = cell_w(p)
    # one scale per character for every view (kits share rig units across views)
    s = (PH - 30) / max(v['height'] for v in p.rig['views'].values())
    c = render(p, view, pose, (PW, PH), (PW / 2, PH - 12, s))
    return over_bg(np.full((PH, PW, 3), BG, np.float32), c).astype(np.uint8)

def cell_w(p):
    s = (PH - 30) / max(v['height'] for v in p.rig['views'].values())
    return 270 if p.rig.get('kind') != 'dog' else int(max(v['canvas'][0] for v in p.rig['views'].values()) * s * 0.75)

def face_cell(p, view, face):
    V = p.rig['views'][view]
    head = next(l for l in V['layers'] if l.get('part') == 'head')
    W, H = V['canvas']
    c = render(p, view, {'face': face}, (W, H), (V['ground'][0], V['ground'][1], 1.0))
    x0, y0, w, h = head['x'], head['y'], head['w'], head['h']
    side = int(max(w, h) * 0.92); cx, cy = x0 + w / 2, y0 + h * 0.46
    box = [int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2)]
    rgb = over_bg(np.full((H, W, 3), BG, np.float32), c).astype(np.uint8)
    return np.array(Image.fromarray(rgb).crop(box).resize((FW, FW), Image.LANCZOS))

blocks = []
for name in CAST:
    if not os.path.exists(f'{ROOT}/{name}/rig.json'): continue
    p = Puppet(ROOT, name); dog = p.rig.get('kind') == 'dog'
    poses = DOG_POSES if dog else HUMAN_POSES
    row = []; labels = []
    for view in p.rig['views']:
        for lab, pose in poses:
            row.append(pose_cell(p, view, pose)); labels.append(f'{view} · {lab}')
    faces = []
    for view in p.rig['views']:
        F = p.rig['views'][view]['face']
        items = [('mouth', m) for m in F.get('mouth', {})] + [('eyes', e) for e in F.get('eyes', {}) if e != 'open'] + \
                [('brows', b) for b in F.get('brows', {}) if b != 'neutral'] + [('expr', e) for e in F.get('expr', {})]
        for grp, st in items:
            face = {grp: st, 'force_mouth': True} if grp != 'expr' else {'expr': st}
            faces.append((f'{view} {grp[:5]}:{st}', face_cell(p, view, face)))
    blocks.append((name, row, labels, faces))

W = max(len(b[1]) * b[1][0].shape[1] for b in blocks); W = max(W, 12 * FW)
per_row = W // FW
H = 0
for b in blocks: H += 34 + PH + 18 + ((len(b[3]) + per_row - 1) // per_row) * (FW + 16) + 20
sheet = Image.new('RGB', (W, H), (245, 240, 232)); d = ImageDraw.Draw(sheet); y = 0
for name, row, labels, faces in blocks:
    d.text((10, y + 8), name, fill=(40, 30, 20), font=FONT); y += 34
    for i, (im, lab) in enumerate(zip(row, labels)):
        cw = im.shape[1]; sheet.paste(Image.fromarray(im), (i * cw, y)); d.text((i * cw + 6, y + PH + 2), lab, fill=(60, 50, 40), font=SMALL)
    y += PH + 18
    for i, (lab, im) in enumerate(faces):
        x = (i % per_row) * FW; yy = y + (i // per_row) * (FW + 16)
        sheet.paste(Image.fromarray(im), (x, yy)); d.text((x + 2, yy + FW + 1), lab[:19], fill=(60, 50, 40), font=SMALL)
    y += ((len(faces) + per_row - 1) // per_row) * (FW + 16) + 20
sheet.save(OUT); print('wrote', OUT, sheet.size)
