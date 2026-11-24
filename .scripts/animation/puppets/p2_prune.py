"""p2_prune.py name SHAPE=REPL[,SHAPE=REPL...] -- drop bad mouth shapes from a phase-2 kit and remap the viseme map.
REPL is another shape name or 'base'. Used when a grid cell does not fit the pose (huge laugh mouth, hand on chin)."""
import sys, json
ROOT = '/workspace/anim-demo/puppets/poses/p2'
name, rules = sys.argv[1], dict(r.split('=') for r in sys.argv[2].split(','))
p = f'{ROOT}/{name}/pose.json'; m = json.load(open(p))
for s in rules: m['face']['mouth'].pop(s, None)
for key in ('viseme_map', 'viseme_map_fine'):
    for k, v in m[key].items():
        while v in rules: v = rules[v]
        m[key][k] = v
m['pruned'] = rules; json.dump(m, open(p, 'w'), indent=1); print(name, m['viseme_map_fine'])
