"""Puppet-kit building helpers: grid cells, registration, masks, joint cuts."""
import numpy as np, cv2, json, os
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.environ.get('PUPPET_ROOT', '/workspace/anim-demo/puppets')

def load(path):
    return np.array(Image.open(path).convert('RGBA')).astype(np.float32)

def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').save(path, optimize=True)

def cell(img, r, c, n=3):
    h, w = img.shape[:2]
    y0, y1 = round(r * h / n), round((r + 1) * h / n)
    x0, x1 = round(c * w / n), round((c + 1) * w / n)
    return img[y0:y1, x0:x1].copy()

def gray(img):
    rgb = img[..., :3] * (img[..., 3:4] / 255.0) + 90 * (1 - img[..., 3:4] / 255.0)
    return cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)

_sift = None
def register(src, dst, roi_dst=None, model='similarity', ratio=0.75, min_inl=12):
    """2x3 matrix mapping src pixel coords -> dst pixel coords."""
    global _sift
    if _sift is None: _sift = cv2.SIFT_create(nfeatures=4000)
    g1, g2 = gray(src), gray(dst)
    m2 = None
    if roi_dst is not None:
        m2 = np.zeros(g2.shape, np.uint8); x0, y0, x1, y1 = roi_dst; m2[y0:y1, x0:x1] = 255
    m1 = (src[..., 3] > 128).astype(np.uint8) * 255
    k1, d1 = _sift.detectAndCompute(g1, m1)
    k2, d2 = _sift.detectAndCompute(g2, m2)
    if d1 is None or d2 is None: return None, 0
    bf = cv2.BFMatcher()
    good = []
    for pair in bf.knnMatch(d1, d2, k=2):
        if len(pair) == 2 and pair[0].distance < ratio * pair[1].distance: good.append(pair[0])
    if len(good) < 6: return None, len(good)
    p1 = np.float32([k1[m.queryIdx].pt for m in good]); p2 = np.float32([k2[m.trainIdx].pt for m in good])
    if model == 'affine': M, inl = cv2.estimateAffine2D(p1, p2, ransacReprojThreshold=3, maxIters=5000)
    else: M, inl = cv2.estimateAffinePartial2D(p1, p2, ransacReprojThreshold=3, maxIters=5000)
    n = int(inl.sum()) if inl is not None else 0
    return (M if n >= min_inl else None), n

def warp(img, M, size):
    w, h = size
    # premultiply to avoid colour bleed from transparent pixels
    pm = img.copy(); pm[..., :3] *= pm[..., 3:4] / 255.0
    out = cv2.warpAffine(pm, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    out = np.clip(out, 0, 255)
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 0.5, out[..., :3] * 255.0 / np.maximum(a, 1e-3), 0)
    return np.clip(out, 0, 255)

def apply_pt(M, p):
    return [float(M[0, 0] * p[0] + M[0, 1] * p[1] + M[0, 2]), float(M[1, 0] * p[0] + M[1, 1] * p[1] + M[1, 2])]

def compose(A, B):
    """A after B (both 2x3)."""
    A3 = np.vstack([A, [0, 0, 1]]); B3 = np.vstack([B, [0, 0, 1]])
    return (A3 @ B3)[:2]

def poly_mask(shape, pts):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.int32(np.round(pts))], 255)
    return m > 0

def ellipse_mask(shape, cx, cy, rx, ry, feather=6):
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)  # 1 at edge
    f = feather / max(min(rx, ry), 1)
    return np.clip((1 + f / 2 - d) / f, 0, 1)

def rect_soft(shape, x0, y0, x1, y1, feather=6):
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    fx = np.clip(np.minimum(xx - x0, x1 - xx) / feather + 0.5, 0, 1)
    fy = np.clip(np.minimum(yy - y0, y1 - yy) / feather + 0.5, 0, 1)
    return fx * fy

def side_of(shape, p1, p2):
    """signed distance of each pixel to the line p1->p2 (positive on the left of the direction)."""
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.array(p2, np.float32) - np.array(p1, np.float32); n = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-6)
    return (xx - p1[0]) * n[0] + (yy - p1[1]) * n[1]

def perp_dist(shape, P, axis_from, axis_to):
    """signed distance along the axis direction from point P (positive towards axis_to)."""
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.array(axis_to, np.float32) - np.array(axis_from, np.float32); d /= (np.linalg.norm(d) + 1e-6)
    return (xx - P[0]) * d[0] + (yy - P[1]) * d[1]

def disk(shape, c, r):
    h, w = shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return ((xx - c[0]) ** 2 + (yy - c[1]) ** 2) <= r * r

def with_alpha(img, mask):
    out = img.copy(); out[..., 3] = out[..., 3] * (mask.astype(np.float32) if mask.dtype != bool else mask)
    return out

def crop_layer(img, pad=2):
    a = img[..., 3] > 2
    if not a.any(): return None, (0, 0)
    ys, xs = np.where(a)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, img.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, img.shape[1])
    return img[y0:y1, x0:x1], (int(x0), int(y0))

def hsv(img):
    return cv2.cvtColor(img[..., :3].astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)

def skin_mask(img):
    h = hsv(img); H, S, V = h[..., 0] * 2, h[..., 1] / 255, h[..., 2] / 255
    return (img[..., 3] > 200) & (H >= 8) & (H <= 38) & (S > 0.3) & (S < 0.85) & (V > 0.45)

def colour_gain(src, src_mask, ref, ref_mask):
    a = src[..., :3][src_mask].reshape(-1, 3).mean(0); b = ref[..., :3][ref_mask].reshape(-1, 3).mean(0)
    return np.clip(b / np.maximum(a, 1), 0.8, 1.25)

def apply_gain(img, g):
    out = img.copy(); out[..., :3] = np.clip(out[..., :3] * g, 0, 255); return out

def inpaint_under(img, mask, radius=6):
    """fill pixels of img (RGB) under mask from surroundings (torso behind a removed accessory)."""
    rgb = img[..., :3].astype(np.uint8)
    m = (ndi.binary_dilation(mask, iterations=2) & (img[..., 3] > 128)).astype(np.uint8) * 255
    out = img.copy(); out[..., :3] = cv2.inpaint(rgb, m, radius, cv2.INPAINT_TELEA)
    return out

def over(dst, src, x=0, y=0):
    """alpha-over src onto dst at offset (in place-safe copy)."""
    out = dst.copy(); h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0: return out
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; d = out[y0:y1, x0:x1]
    sa = s[..., 3:4] / 255; da = d[..., 3:4] / 255
    oa = sa + da * (1 - sa)
    rgb = (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    out[y0:y1, x0:x1, :3] = rgb; out[y0:y1, x0:x1, 3:4] = oa * 255
    return out
