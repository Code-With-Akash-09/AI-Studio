"""Colour-difference chroma keyer for flat magenta / green / blue generated backgrounds.
alpha from the screen-colour signal, then colour un-mixing so edges carry no spill."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

def estimate_bg(rgb):
    b = np.concatenate([rgb[:6].reshape(-1,3), rgb[-6:].reshape(-1,3), rgb[:,:6].reshape(-1,3), rgb[:,-6:].reshape(-1,3)])
    return np.median(b, axis=0)

def signal(rgb, kind):
    R, G, B = rgb[...,0], rgb[...,1], rgb[...,2]
    if kind == 'green': return G - np.maximum(R, B)
    if kind == 'blue': return B - np.maximum(R, G)
    return np.minimum(R, B) - G  # magenta

def key(rgb, lo=0.14, hi=0.75):
    rgb = rgb.astype(np.float32)
    bg = estimate_bg(rgb)
    kind = 'green' if bg[1] == bg.max() else ('blue' if bg[2] == bg.max() and bg[0] < 80 else 'magenta')
    s = signal(rgb, kind); sb = float(signal(bg[None, None], kind)[0, 0])
    a = 1 - np.clip((s - lo * sb) / ((hi - lo) * sb), 0, 1)
    # only pixels connected to bg-like regions can be transparent-ish; interior keeps a=1 unless strongly bg
    am = np.maximum(a, 1e-3)[..., None]
    F = np.clip((rgb - (1 - a[..., None]) * bg) / am, 0, 255)
    # residual spill clamp
    if kind == 'green': F[...,1] = np.minimum(F[...,1], np.maximum(F[...,0], F[...,2]) + 6)
    elif kind == 'blue': F[...,2] = np.where(a < 1, np.minimum(F[...,2], np.maximum(F[...,0], F[...,1]) + 6), F[...,2])
    else:
        edge = a < 0.999
        m = np.minimum(F[...,0], F[...,2]) - F[...,1]
        bad = edge & (m > 0)
        F[...,0] = np.where(bad, F[...,0] - m, F[...,0]); F[...,2] = np.where(bad, F[...,2] - m, F[...,2])
    # JPEG chroma bleed tints 2-3px at every edge: recolour the edge band from the nearest clean interior pixel
    core = ndi.binary_erosion(a > 0.985, iterations=3)
    if core.any():
        dist, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
        band = ~core & (dist <= 10)
        F[band] = F[iy[band], ix[band]]
        # soften the outermost pixel ring a little
        a = np.where(band & (dist > 3), a * 0.7, a)
    F[a <= 0.0] = np.where((dist[a <= 0.0] <= 10)[:, None], F[a <= 0.0], 0)
    m = a > 0.5
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        a[np.isin(lab, np.where(sizes < 60)[0] + 1)] = 0
    a[a < 0.04] = 0
    return np.dstack([F, a * 255]).astype(np.uint8), bg, kind

if __name__ == "__main__":
    for src in sys.argv[1:]:
        dst = src.replace('_gen/', '_keyed/').rsplit('.', 1)[0] + '.png'
        out, bg, kind = key(np.array(Image.open(src).convert("RGB")))
        Image.fromarray(out, "RGBA").save(dst)
        print(dst, kind, bg)
