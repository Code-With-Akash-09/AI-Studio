"""Painted cutout puppet compositor (forward kinematics over rig.json layers)."""
import json, math, os, numpy as np, cv2
from PIL import Image

class Puppet:
    def __init__(self, root, name):
        self.root = root; self.name = name
        self.rig = json.load(open(f'{root}/{name}/rig.json'))
        self.cache = {}

    def img(self, rel):
        if rel not in self.cache:
            a = np.array(Image.open(f'{self.root}/{self.name}/{rel}').convert('RGBA')).astype(np.float32)
            a[..., :3] *= a[..., 3:4] / 255.0  # premultiplied
            self.cache[rel] = a
        return self.cache[rel]

def rot_about(p, deg, s=1.0):
    M = cv2.getRotationMatrix2D((float(p[0]), float(p[1])), -deg, s)  # positive deg = clockwise on screen
    return np.vstack([M, [0, 0, 1]])

def T(x, y):
    return np.array([[1, 0, x], [0, 1, y], [0, 0, 1]], np.float64)

BONE_OF = {'torso': 'torso', 'head': 'head'}

def bone_chain(layer):
    part = layer.get('part'); s = layer.get('side')
    if part == 'torso': return ['root']
    if part in ('head',) or layer.get('group') in ('mouth', 'eyes', 'brows', 'expr'): return ['root', 'head']
    if part == 'arm_upper': return ['root', f'arm_upper_{s}']
    if part == 'arm_lower': return ['root', f'arm_upper_{s}', f'arm_lower_{s}']
    if part == 'hand': return ['root', f'arm_upper_{s}', f'arm_lower_{s}', f'hand_{s}']
    if part == 'leg_upper': return ['root', f'leg_upper_{s}']
    if part == 'leg_lower': return ['root', f'leg_upper_{s}', f'leg_lower_{s}']
    if part == 'accessory':
        return ['detached'] if layer.get('detachable') else ['root', layer['file'].split('/')[-1][:-4]]
    if part in ('ear', 'tail', 'leg'): return ['root', 'head', layer['name']] if part == 'ear' else ['root', layer['name']]
    return ['root']

PIVOT_OF = {}

def render(pup, view, pose, canvas_size, place, flip=False, tint=None):
    """pose: {bone: degrees, 'head': deg, 'root': deg, 'offset': (dx,dy) in rig px, 'face': {...}, 'hands': {'L': pose}}
    place: (x, y, scale) - rig ground point goes to canvas (x, y), scaled by scale."""
    V = pup.rig['views'][view]
    W, H = canvas_size
    gx, gy = V['ground']
    x, y, s = place
    base = T(x, y) @ np.diag([(-s if flip else s), s, 1]) @ T(-gx, -gy)
    off = pose.get('offset', (0, 0))
    base = base @ T(off[0], off[1])
    pivots = {}
    for l in V['layers']:
        b = l['file'].split('/')[-1][:-4]
        if l.get('part') in ('arm_upper', 'arm_lower', 'leg_upper', 'leg_lower'): pivots[b] = l['pivot']
        if l.get('part') == 'hand': pivots[f"hand_{l['side']}"] = l['pivot']
        if l.get('part') == 'head': pivots['head'] = l['pivot']
        if l.get('part') == 'accessory': pivots[b] = l['pivot']
        if l.get('part') in ('ear', 'tail', 'leg'): pivots[l['name']] = l['pivot']
    pivots['root'] = V['ground']
    face = pose.get('face', {})
    hands = pose.get('hands', {})
    canvas = np.zeros((H, W, 4), np.float32)
    expr = face.get('expr')
    layers = list(V['layers'])
    # face overlays sit right above the head layer
    head_z = next((l['z'] for l in layers if l.get('part') == 'head'), 50)
    fl = []
    if expr and expr in V['face'].get('expr', {}):
        fl.append(dict(V['face']['expr'][expr], group='expr', z=head_z + 0.01))
    else:
        for grp, default in (('eyes', 'open'), ('brows', 'neutral'), ('mouth', 'closed')):
            st = face.get(grp, default)
            e = V['face'].get(grp, {}).get(st) or V['face'].get(grp, {}).get(default)
            if e and not (grp == 'eyes' and st == 'open') and not (grp == 'brows' and st == 'neutral') and not (grp == 'mouth' and st == 'closed' and not face.get('force_mouth')):
                fl.append(dict(e, group=grp, z=head_z + {'eyes': 0.02, 'brows': 0.03, 'mouth': 0.04}[grp]))
    drawn = []
    for l in layers:
        if l.get('part') in ('head', 'ear') and expr and expr in V['face'].get('expr', {}): continue
        if l.get('part') == 'hand':
            want = hands.get(l['side'], 'relaxed')
            if l.get('pose') != want: continue
        if l.get('part') == 'accessory' and l.get('detachable') and not pose.get('show_' + l['file'].split('/')[-1][4:-4], True): continue
        drawn.append(l)
    drawn += fl
    drawn.sort(key=lambda l: l['z'])
    for l in drawn:
        M = base.copy()
        chain = bone_chain(l)
        if chain == ['detached']:
            d = pose.get('detached', {}).get(l['file'].split('/')[-1][:-4])
            if d: M = M @ T(*d.get('offset', (0, 0))) @ rot_about(l['pivot'], d.get('deg', 0))
        else:
            for b in chain:
                deg = pose.get(b, 0.0)
                if b == 'root': M = M @ rot_about(V['ground'], deg)
                elif deg: M = M @ rot_about(pivots[b], deg)
        img = pup.img(l['file'])
        M = M @ T(l['x'], l['y'])
        warped = cv2.warpAffine(img, M[:2], (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        a = warped[..., 3:4] / 255.0
        canvas = warped + canvas * (1 - a)
    if tint is not None:
        canvas[..., :3] = np.clip(canvas[..., :3] * np.array(tint[:3], np.float32), 0, 255 * canvas[..., 3:4] / 255.0)
    return canvas  # premultiplied RGBA

def over_bg(bg_rgb, fg_pm):
    a = fg_pm[..., 3:4] / 255.0
    return np.clip(fg_pm[..., :3] + bg_rgb.astype(np.float32) * (1 - a), 0, 255)
