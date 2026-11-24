"""Make a 2x HD copy of a puppet kit with Real-ESRGAN (anime 6B, CPU):  python sr_kit.py kabir kabir-hd
RGB goes through the x4 model then INTER_AREA down to x2 (crisper than a native x2); alpha is Lanczos x2.
All rig.json coordinates are scaled by 2."""
import sys, os, json, shutil, numpy as np, cv2, torch
from PIL import Image
from spandrel import ModelLoader
ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')
MODEL = os.environ.get('SR_MODEL', '/workspace/tools/sr/anime6B.pth')
torch.set_num_threads(os.cpu_count())
model = ModelLoader().load_from_file(MODEL).model.eval()

def sr_rgb(rgb):
    h, w = rgb.shape[:2]; pad = 8
    x = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)), mode='edge')
    t = torch.from_numpy(x).permute(2, 0, 1)[None].float() / 255
    with torch.no_grad():
        y = model(t)[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255
    y = y[pad * 4:-pad * 4, pad * 4:-pad * 4]
    return cv2.resize(y, (w * 2, h * 2), interpolation=cv2.INTER_AREA)

def sr_png(src, dst):
    a = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    h, w = a.shape[:2]
    rgb = sr_rgb(a[..., :3].astype(np.uint8))
    al = cv2.resize(a[..., 3], (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(al, 0, 255)]).astype(np.uint8)
    Image.fromarray(out).save(dst)

SCALE_KEYS = {'x', 'y', 'w', 'h', 'pivot', 'ground', 'height', 'top', 'canvas'}
def scale(o, k=None):
    if isinstance(o, dict):
        return {kk: (scale(v, kk) if (kk in SCALE_KEYS or kk == 'joints' or isinstance(v, (dict, list))) else v) for kk, v in o.items()}
    if isinstance(o, list):
        if k in SCALE_KEYS or k == 'joints' or k == '_pt': return [scale(v, k) for v in o]
        return [scale(v, None) for v in o]
    if isinstance(o, (int, float)) and not isinstance(o, bool) and (k in SCALE_KEYS or k == 'joints'): return o * 2
    return o

def fix_joints(V):
    V['joints'] = {j: [p[0] * 2, p[1] * 2] for j, p in V['joints'].items()}

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    S, D = f'{ROOT}/{src}', f'{ROOT}/{dst}'
    rig = json.load(open(f'{S}/rig.json'))
    for dirpath, _, files in os.walk(S):
        for f in files:
            if not f.endswith('.png'): continue
            rel = os.path.relpath(os.path.join(dirpath, f), S); out = f'{D}/{rel}'
            if os.path.exists(out): continue
            os.makedirs(os.path.dirname(out), exist_ok=True); sr_png(f'{S}/{rel}', out); print(rel, flush=True)
    for v, V in rig['views'].items():
        joints = V.pop('joints'); V2 = scale(V); V2['joints'] = {j: [p[0] * 2, p[1] * 2] for j, p in joints.items()}
        rig['views'][v] = V2
    rig['hd'] = dict(source=src, factor=2, sr='RealESRGAN_x4plus_anime_6B -> INTER_AREA x2')
    json.dump(rig, open(f'{D}/rig.json', 'w'), indent=1)
