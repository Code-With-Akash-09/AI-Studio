import sys; from PIL import Image; import numpy as np
f=sys.argv[1]; a=np.array(Image.open(f))[...,3]>20
ys=np.where(a.any(1))[0]; print('rows',ys.min(),ys.max(), 'size', a.shape)
for y in range(int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])):
  xs=np.where(a[y])[0]
  if not len(xs): continue
  runs=[]; s=xs[0]; p=xs[0]
  for x in xs[1:]:
    if x!=p+1: runs.append((int(s),int(p))); s=x
    p=x
  runs.append((int(s),int(p))); runs=[r for r in runs if r[1]-r[0]>2]; print(y,runs)
