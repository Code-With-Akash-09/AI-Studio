import sys, glob, os; sys.argv = ['x']; sys.path.insert(0, '/workspace/ai-studio-anim/.scripts/animation/puppets')
import sr_kit
for f in ['_keyed/kabir-v5-wave.png', '_keyed/kabir-v5-show.png', '_keyed/kabir-v5-keyup.png', '_keyed/kabir-v5-beckon.png', '_keyed/dadi-v5-surprised.png']:
    out = '_keyed_hd/' + os.path.basename(f)
    if not os.path.exists(out): sr_kit.sr_png(f, out); print(out, flush=True)
print('END')
