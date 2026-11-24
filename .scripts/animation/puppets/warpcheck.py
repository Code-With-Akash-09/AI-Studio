"""warpcheck.py -- fold/tear check of the v4 dense warp: min Jacobian determinant of the forward field over each pose's opaque pixels
at the extreme parameters used in talk_test_v4 (det <= 0 would mean a fold = doubled edges; huge det = a tear/stretch)."""
import sys, os, numpy as np
import importlib
tt = importlib.import_module(os.environ.get('TT', 'talk_test_v4')); sys.argv = [sys.argv[0]]   # TT=talk_test_v5 for the v5 kits
EXT = [dict(root=0.6, breath=0.004, head=6.5, head_dy=10), dict(root=-0.6, breath=-0.004, head=-6.5, head_dy=-8)]
for kn, kit in tt.KITS.items():
    a = kit.body[..., 3] > 30; H, W = a.shape; s = 4
    ys, xs = np.mgrid[0:H:s, 0:W:s].astype(np.float32); m = a[::s, ::s]
    worst = (9, 0)
    for P in EXT + ([dict(EXT[0], wrist=10, elbow=3), dict(EXT[1], wrist=-10, elbow=-3), dict(wrist=10, elbow=-3), dict(wrist=-10, elbow=3)] if kn in ('kabir-wave', 'kabir-v5wave') else []):
        dx, dy = tt.disp(kit, xs, ys, P)
        jxx = 1 + np.gradient(dx, s, axis=1); jyy = 1 + np.gradient(dy, s, axis=0); jxy = np.gradient(dx, s, axis=0); jyx = np.gradient(dy, s, axis=1)
        det = (jxx * jyy - jxy * jyx)[m]; worst = (min(worst[0], det.min()), max(worst[1], det.max()))
    print(f'{kn:16s} det min {worst[0]:.3f} max {worst[1]:.3f}')
if os.environ.get('WHERE'):
    kit = tt.KITS[os.environ.get('WHERE')]; a = kit.body[..., 3] > 30; H, W = a.shape; s = 4
    ys, xs = np.mgrid[0:H:s, 0:W:s].astype(np.float32); m = a[::s, ::s]
    for P in [dict(wrist=10, elbow=-3), dict(wrist=-10, elbow=3), dict(wrist=10), dict(elbow=3)]:
        dx, dy = tt.disp(kit, xs, ys, P)
        det = (1 + np.gradient(dx, s, axis=1)) * (1 + np.gradient(dy, s, axis=0)) - np.gradient(dx, s, axis=0) * np.gradient(dy, s, axis=1)
        det[~m] = 9; i = np.unravel_index(det.argmin(), det.shape); print(P, 'min', det.min().round(3), 'at x,y', xs[i], ys[i], 'n<0.3:', (det < 0.3).sum())
