"""Shot / pose planner for the painted-puppet mode (phase 2, M2).

python plan.py spec.json plan.json
spec: {"stage": id, "stages": path/to/stages.json, "cast": [ids], "seated": [ids],
       "lines": [{"id", "speaker", "listeners": [ids], "emotion", "props": [prop ids], "reaction": {"who", "emotion"}?,
                  "dur": s, "words": [{"t", "d", "w"}]}]}
plan: {"duration", "stage", "actors": {id: {feet, H, flip, side, metres, seated}}, "lines": [... + t0], "shots": [...], "issues": [...]}

Rules
- Blocking + 180-degree rule: the first speaker's side is screen-left (faces right), the first listener's side screen-right (faces
  left). Everyone keeps that side and screen direction for the whole scene, every shot is taken from the same side of the line.
- Poses change only on cuts; a seated character stays seated for the scene. Pose from the line's emotion (speaker), reactions for
  listeners (surprised -> surprised, joke -> laugh, long explanations -> think), "offer" after a prop insert.
- Shot sizes: wide (establish / re-establish / ending), two-shot, OTS (dirty single over the listener's defocused shoulder),
  close-up, reaction close-up (on reaction holds and to break long lines), prop insert (painted prop, the line continues V.O.).
  Cuts land just before a word, every 2-4 s (long shots split, very short ones merged).
- Staging guard (framing): subjects' heads fully in frame with headroom; any other head is either fully in or fully out
  (fixes the Bittu-CU half-head); wides keep every body + feet; windows stay inside the plate. Unfixable -> issue.
"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import engine as E

EMO_POSE = {'neutral': 'idle', 'idle': 'idle', 'calm': 'idle', 'explain': 'explain', 'tell': 'explain', 'story': 'explain',
            'question': 'think', 'think': 'think', 'curious': 'think', 'doubt': 'think', 'confused': 'think', 'suspicious': 'think',
            'surprised': 'surprised', 'shock': 'surprised', 'shocked': 'surprised', 'scared': 'surprised', 'fear': 'surprised',
            'afraid': 'surprised', 'excited': 'surprised', 'happy': 'laugh', 'laugh': 'laugh', 'joke': 'laugh', 'funny': 'laugh',
            'proud': 'offer', 'offer': 'offer', 'show': 'offer', 'give': 'offer', 'point': 'offer', 'reveal': 'offer', 'sit': 'sit'}
GAP, LEAD, TAIL, REACT_HOLD = 0.28, 0.45, 0.9, 0.95
MIN_SHOT, MAX_SHOT = 1.3, 4.0
DOF = {'wide': 300, 'two': 520, 'ots': 700, 'cu': 900, 'react': 900, 'insert': 0}
PLATE_W, PLATE_H = 1280.0, 720.0


def pose_for(emotion): return EMO_POSE.get(str(emotion or '').lower().strip(), 'explain')


# ------------------------------------------------------------------ blocking
def block(spec, stage, cast_db):
    cast = list(dict.fromkeys(spec['cast'])); lines = spec['lines']
    first = lines[0]['speaker'] if lines else cast[0]
    lst = next((l for L in lines for l in L.get('listeners', []) if l != first), None) or next((c for c in cast if c != first), first)
    side = {first: 'L', lst: 'R'}
    # who talks to whom most -> join the other side of that partner; the dog joins the kids' side
    talk = {}
    for L in lines:
        for l in L.get('listeners', []): talk[(L['speaker'], l)] = talk.get((L['speaker'], l), 0) + 1; talk[(l, L['speaker'])] = talk.get((l, L['speaker']), 0) + 1
    for c in cast:
        if c in side: continue
        if cast_db.get(c, {}).get('dog'): continue
        partners = sorted(((n, b) for (a, b), n in talk.items() if a == c and b in side), reverse=True)
        if partners: side[c] = 'R' if side[partners[0][1]] == 'L' else 'L'
        else: side[c] = 'L' if sum(v == 'L' for v in side.values()) <= sum(v == 'R' for v in side.values()) else 'R'
    for c in cast:
        if c not in side:                                        # dog: beside the youngest speaking human, outer edge
            kids = [k for k in side if cast_db.get(k, {}).get('age') in ('child', 'kid', 'teen')]
            side[c] = side[kids[0]] if kids else ('L' if sum(v == 'L' for v in side.values()) <= sum(v == 'R' for v in side.values()) else 'R')
    seated = set(spec.get('seated', []))
    y_front = stage.floor[0] + 0.72 * (stage.floor[1] - stage.floor[0])
    # headroom: the tallest standing actor's head must sit >= 7% below the plate top (a low camera puts heads near the top)
    k = max(cast_db.get(c, {}).get('metres', 1.5) for c in cast if c not in seated) / stage.cam_h if any(c not in seated for c in cast) else 1.5
    if k > 1: y_front = min(y_front, (k * stage.horizon - 0.07 * PLATE_H) / (k - 1))
    y_front = max(y_front, stage.horizon + 60)
    mid = 0.5 * (stage.xrange[0] + stage.xrange[1])
    actors = {}
    for sd, sgn in (('L', -1), ('R', 1)):
        group = [c for c in cast if side[c] == sd]
        group.sort(key=lambda c: (cast_db.get(c, {}).get('dog', False), 0 if c in (first, lst) else 1))   # main pair innermost, dog outermost
        x = mid; prev_half = None
        for i, c in enumerate(group):
            y = y_front - (10 * i if i else 0)
            m = cast_db.get(c, {}).get('metres', 1.5); H = m * stage.px_per_m(y)
            kit = E.kit_meta(c, 'sit' if c in seated else 'idle')
            Hk = H * (0.74 if c in seated and not cast_db.get(c, {}).get('dog') else 1.0)
            bw = (kit['_head_box'][2] - kit['_head_box'][0]) / kit['height'] * Hk if kit['_head_box'] else 0.3 * Hk
            half = max(0.2 * Hk, 0.75 * bw)                       # personal space ~ head width
            if i == 0: x = mid + sgn * max(0.21 * H, half + 0.06 * H)
            else: x = x + sgn * (prev_half + half + 0.05 * H)
            prev_half = half
            actors[c] = dict(feet=[round(x, 1), round(y, 1)], H=round(Hk, 1), metres=m, flip=(sd == 'L'), side=sd,
                             seated=c in seated, dog=bool(cast_db.get(c, {}).get('dog')))
    # keep everyone on the stage's usable x range (shift the whole group, keep spacing)
    xs = [a['feet'][0] for a in actors.values()]
    lo, hi = min(xs), max(xs); room = (stage.xrange[1] - stage.xrange[0]) - (hi - lo)
    shift = 0
    if lo < stage.xrange[0]: shift = stage.xrange[0] - lo
    if hi + shift > stage.xrange[1]: shift = stage.xrange[1] - hi if room >= 0 else (stage.xrange[0] + stage.xrange[1]) / 2 - (lo + hi) / 2
    for a in actors.values(): a['feet'][0] = round(a['feet'][0] + shift, 1)
    return actors


# ------------------------------------------------------------------ geometry helpers
def boxes(actor, char, pose):
    """world-space head box and body box of an actor in a pose."""
    m = E.kit_meta(char, pose); sc = actor['H'] / m['height']; gx, gy = m['ground']; fx, fy = actor['feet']
    def tr(x0, y0, x1, y1):
        a = fx + (-1 if actor['flip'] else 1) * (x0 - gx) * sc; b = fx + (-1 if actor['flip'] else 1) * (x1 - gx) * sc
        return [min(a, b), fy + (y0 - gy) * sc, max(a, b), fy + (y1 - gy) * sc]
    hb = m['_head_box'] or [gx - 0.1 * m['height'], m['head_top'], gx + 0.1 * m['height'], m['head_top'] + 0.2 * m['height']]
    top = m['head_top']; W = m['size'][0]
    body = tr(gx - 0.25 * m['height'], top, gx + 0.25 * m['height'], gy)
    return dict(head=tr(*hb), body=body)


def win_box(c, h): w = h * E.SW / E.SH; return [c[0] - w / 2, c[1] - h / 2, c[0] + w / 2, c[1] + h / 2]
def inside(b, W, mx=0.0, my=0.0): return b[0] >= W[0] + mx and b[2] <= W[2] - mx and b[1] >= W[1] + my and b[3] <= W[3] - my
def outside(b, W): return b[2] <= W[0] or b[0] >= W[2] or b[3] <= W[1] or b[1] >= W[3]


def clamp_plate(c, h):
    h = min(h, PLATE_H); w = h * E.SW / E.SH
    if w > PLATE_W: w = PLATE_W; h = w * E.SH / E.SW
    x = min(max(c[0], w / 2), PLATE_W - w / 2); y = min(max(c[1], h / 2), PLATE_H - h / 2)
    return [x, y], h


def guard(shot, actors, B, subjects, need_full=()):
    """Fix the framing of one shot; returns (shot, issues). B: {id: boxes in the shot's poses}."""
    c, h = list(shot['c']), shot['h']; issues = []; h0 = h
    for attempt in range(18):
        c, h = clamp_plate(c, h); W = win_box(c, h)
        bad = []
        for s in subjects:                                       # subject heads in, with headroom
            if not inside(B[s]['head'], W, 0.02 * h, 0.035 * h): bad.append(('subject', s))
        for s in need_full:
            if not inside(B[s]['body'], W, 0.0, 0.0): bad.append(('body', s))
        for a in actors:
            if a in subjects: continue
            hb = B[a]['head']
            if not inside(hb, W) and not outside(hb, W): bad.append(('half-head', a))
        if not bad: break
        kind, who = bad[0]; hb = B[who]['head'] if kind != 'body' else B[who]['body']
        if kind in ('subject', 'body'):
            # grow the window around the union of subjects first, then recentre
            U = [min(B[s]['head'][0] for s in subjects), min(B[s]['head'][1] for s in subjects),
                 max(B[s]['head'][2] for s in subjects), max(B[s]['head'][3] for s in subjects)]
            if kind == 'body': U = [min(U[0], hb[0]), min(U[1], hb[1]), max(U[2], hb[2]), max(U[3], hb[3])]
            need_h = max(h, (U[3] - U[1]) * 1.18, (U[2] - U[0]) * 1.12 * E.SH / E.SW)
            if need_h > h * 1.001: h = need_h
            cx = (U[0] + U[2]) / 2 if (U[2] - U[0]) * 1.06 > h * E.SW / E.SH * 0.8 else min(max(c[0], U[2] - h * E.SW / E.SH / 2 + 0.03 * h), U[0] + h * E.SW / E.SH / 2 - 0.03 * h)
            cy = min(max(c[1], U[3] - h / 2 + 0.02 * h), U[1] + h / 2 - 0.05 * h)
            c = [cx, cy]
        else:
            # a stray half head: push it fully out (move away) or, if cheaper, fully in; tighten as a last resort
            w = h * E.SW / E.SH
            out_l = hb[2] - W[0] + 2; out_r = W[2] - hb[0] + 2         # shift right / left to push it out
            in_l = W[0] - hb[0] + 0.02 * h; in_r = hb[2] - W[2] + 0.02 * h
            cand = [(out_l, +1), (out_r, -1), (in_l, -1), (in_r, +1)]
            ok = None
            for dist, sg in sorted(cand, key=lambda t: t[0]):
                if dist <= 0: continue
                W2 = win_box([c[0] + sg * dist, c[1]], h)
                if all(inside(B[s]['head'], W2, 0.02 * h, 0.035 * h) for s in subjects) and (inside(hb, W2) or outside(hb, W2)): ok = (dist, sg); break
            if ok: c = [c[0] + ok[1] * ok[0], c[1]]
            else:
                # push it out over the top edge (window down), or take it in (looser framing around both heads)
                alts = []
                dn = hb[3] - W[1] + 2
                if dn > 0: alts.append(([c[0], c[1] + dn], h))
                U = [min([B[s]['head'][0] for s in subjects] + [hb[0]]), min([B[s]['head'][1] for s in subjects] + [hb[1]]),
                     max([B[s]['head'][2] for s in subjects] + [hb[2]]), max([B[s]['head'][3] for s in subjects] + [hb[3]])]
                nh = max(h, (U[3] - U[1]) * 1.3, (U[2] - U[0]) * 1.15 * E.SH / E.SW)
                if nh <= h0 * 2.4: alts.append(([(U[0] + U[2]) / 2, U[1] - 0.06 * nh + nh / 2], nh))
                for c2, h2 in alts:
                    c2, h2 = clamp_plate(c2, h2); W2 = win_box(c2, h2)
                    if all(inside(B[s]['head'], W2, 0.02 * h2, 0.035 * h2) for s in subjects) and (inside(hb, W2) or outside(hb, W2)):
                        ok = (c2, h2); break
                if ok: c, h = list(ok[0]), ok[1]; continue
                # vertical: a head cut by the top edge -> drop the window or raise it
                if hb[1] < W[1] < hb[3]: c = [c[0], c[1] - (W[1] - hb[1]) - 0.03 * h]
                elif hb[1] < W[3] < hb[3]: c = [c[0], c[1] + (hb[3] - W[3]) + 2]
                else: h *= 0.9
    else:
        issues.append(f"{shot['name']} @{shot['t0']:.2f}: framing unresolved ({bad[0][0]} {bad[0][1]})")
    c, h = clamp_plate(c, h)
    shot = dict(shot, c=[round(c[0], 1), round(c[1], 1)], h=round(h, 1))
    return shot, issues


# ------------------------------------------------------------------ planning
def plan(spec, cast_db, stages):
    st = E.Stage(stages[spec['stage']])
    actors = block(spec, st, cast_db); ids = list(actors)
    lines = [dict(L) for L in spec['lines']]
    # timeline
    t = LEAD
    for i, L in enumerate(lines):
        L['t0'] = round(t, 3); t += L['dur']
        L['hold'] = REACT_HOLD if L.get('reaction') else 0
        t += L['hold'] + (GAP if i + 1 < len(lines) else 0)
    total = t + TAIL
    def word_cut(L, frac):
        ws = L.get('words') or []
        target = L['t0'] + frac * L['dur']
        best = min((L['t0'] + w['t'] - 0.08 for w in ws[1:]), key=lambda x: abs(x - target), default=target)
        return best
    shots = []
    def add(kind, t0, t1, subjects, line=None, prop=None, over=None):
        if t1 - t0 < 0.05: return
        shots.append(dict(kind=kind, t0=round(t0, 3), t1=round(t1, 3), subjects=list(subjects), line=line, prop=prop, over=over))
    seen = set(); last_kind = None; cu_flip = 0
    for i, L in enumerate(lines):
        sp = L['speaker']; ls = [l for l in L.get('listeners', []) if l in actors and l != sp] or [next(a for a in ids if a != sp)]
        a = L['t0'] if i == 0 else L['t0'] - min(GAP, 0.2)      # cut slightly before the line starts
        b = lines[i + 1]['t0'] - min(GAP, 0.2) if i + 1 < len(lines) else total
        endspeech = L['t0'] + L['dur']
        props = [p for p in (L.get('props') or []) if p]
        new = sp not in seen; seen.add(sp)
        if i == 0: kind = 'wide'
        elif i == len(lines) - 1: kind = 'wide'
        elif new and len(ids) > 2: kind = 'two'
        elif i % 5 == 0: kind = 'two'
        else:
            kind = ['cu', 'ots'][cu_flip % 2]; cu_flip += 1
        subj = ids if kind == 'wide' else ([sp] + ls[:1] if kind == 'two' else [sp])
        over = ls[0] if kind == 'ots' else None
        segs = []
        if props and L['dur'] > 2.2:
            p0 = word_cut(L, 0.3); p1 = min(word_cut(L, 0.75), p0 + 2.4)
            if p1 - p0 < 1.2: p1 = min(endspeech, p0 + 1.4)
            segs = [(kind, a, p0, subj, over), ('insert', p0, p1, [sp], None), ('cu' if kind == 'wide' else kind, p1, endspeech + 0.05, [sp], over)]
            L['after_insert'] = True
        else:
            segs = [(kind, a, endspeech + 0.05, subj, over)]
        if L['hold']:
            rx = L['reaction'].get('who') if L['reaction'].get('who') in actors else ls[0]
            segs.append(('react', endspeech + 0.05, b, [rx], None))
        else:
            k0, s0, _, sb0, ov0 = segs[-1]; segs[-1] = (k0, s0, b, sb0, ov0)
        for k, s0, s1, sb, ov in segs:
            add(k, s0, s1, sb, line=i, prop=(props[0] if k == 'insert' else None), over=ov)
    # split long shots (> MAX_SHOT) with a reaction / size change at a word boundary
    out = []
    for s in shots:
        if s['t1'] - s['t0'] <= MAX_SHOT or s['kind'] in ('insert',): out.append(s); continue
        L = lines[s['line']]; n = int(math.ceil((s['t1'] - s['t0']) / 3.2)); cur = s['t0']; parts = []
        for j in range(1, n):
            target = s['t0'] + j * (s['t1'] - s['t0']) / n
            ws = [L['t0'] + w['t'] - 0.08 for w in (L.get('words') or [])[1:]]
            cut = min(ws, key=lambda x: abs(x - target)) if ws else target
            if cut - cur < MIN_SHOT or s['t1'] - cut < MIN_SHOT: continue
            parts.append((cur, cut)); cur = cut
        parts.append((cur, s['t1']))
        sp = L['speaker']; ls = [l for l in L.get('listeners', []) if l in actors and l != sp] or [next(a for a in ids if a != sp)]
        alt = [s['kind'], 'react', 'cu' if s['kind'] != 'cu' else 'two']
        for j, (p0, p1) in enumerate(parts):
            k = alt[j % 3] if j else s['kind']
            if k == 'react': out.append(dict(s, kind='react', t0=round(p0, 3), t1=round(p1, 3), subjects=[ls[j % len(ls)]], over=None, split=True))
            elif k == 'two': out.append(dict(s, kind='two', t0=round(p0, 3), t1=round(p1, 3), subjects=[sp, ls[0]], over=None))
            else: out.append(dict(s, kind=k, t0=round(p0, 3), t1=round(p1, 3), subjects=[sp] if k != 'wide' else s['subjects']))
    # merge too-short shots into the previous one (inserts and reactions are kept if >= 0.8 s)
    merged = []
    for s in out:
        keep = s['kind'] in ('insert', 'react') and s['t1'] - s['t0'] >= 0.8
        if merged and s['t1'] - s['t0'] < MIN_SHOT and not keep and merged[-1]['kind'] != 'insert':
            merged[-1]['t1'] = s['t1']
        else: merged.append(s)
    shots = merged
    # poses per shot
    prev_pose = {}
    for s in shots:
        L = lines[s['line']]; sp = L['speaker']; poses = {}
        tmid = 0.5 * (s['t0'] + s['t1']); in_hold = s['kind'] == 'react' and tmid > L['t0'] + L['dur']
        for a in ids:
            A = actors[a]
            if A['seated']: poses[a] = 'sit'; continue
            if a == sp and not in_hold:
                p = pose_for(L.get('emotion'))
                if L.get('after_insert') and s['t0'] > L['t0'] + 0.3 * L['dur']: p = 'offer'
                if p == 'explain' and prev_pose.get(a) == 'explain' and s['kind'] in ('cu', 'ots', 'two') and len(shots) > 4 and (s['line'] % 2): p = 'offer'
                if A['dog']: p = 'idle'
            else:
                emo = pose_for(L.get('emotion'))
                if L.get('reaction') and (L['reaction'].get('who') in (a, None) or a in L.get('listeners', [])) and (in_hold or s['t0'] >= L['t0'] + L['dur'] - 0.1):
                    p = pose_for(L['reaction'].get('emotion', 'laugh'))
                elif emo in ('surprised', 'laugh'): p = emo if a in L.get('listeners', []) or A['dog'] else 'idle'
                elif emo == 'explain' and L['dur'] > 2.5 and a in L.get('listeners', []) and s['line'] % 2 == 1: p = 'think'
                else: p = 'idle'
                if A['dog'] and p == 'explain': p = 'idle'
            poses[a] = p
        s['poses'] = poses
        for a, p in poses.items():
            if a in s['subjects'] or s['kind'] == 'wide': prev_pose[a] = p
    # framing per shot + guard
    issues = []; final = []
    for i, s in enumerate(shots):
        s['name'] = f"{i + 1:02d}-{s['kind']}-{'+'.join(x.split('-')[0] for x in s['subjects'])}"
        B = {a: boxes(actors[a], a, s['poses'][a]) for a in ids}
        subj = s['subjects']
        if s['kind'] == 'insert':
            sp = subj[0]; hb = B[sp]['head']
            s.update(c=[(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2 + 40], h=300, push=0.05, dof=0, focus_y=actors[sp]['feet'][1])
            s['c'], s['h'] = clamp_plate(s['c'], s['h']); final.append(s); continue
        if s['kind'] == 'wide':
            U = [min(B[a]['body'][0] for a in ids), min(B[a]['head'][1] for a in ids), max(B[a]['body'][2] for a in ids), max(actors[a]['feet'][1] for a in ids)]
            h = max((U[3] - U[1]) * 1.35, (U[2] - U[0]) * 1.25 * E.SH / E.SW)
            c = [(U[0] + U[2]) / 2, (U[1] + U[3]) / 2 + 0.02 * h]; push = 0.02; need = ids
        elif s['kind'] == 'two':
            U = [min(B[a]['body'][0] for a in subj), min(B[a]['head'][1] for a in subj), max(B[a]['body'][2] for a in subj), max(B[a]['head'][3] for a in subj)]
            Hm = max(actors[a]['H'] for a in subj)
            h = max(0.95 * Hm, (U[2] - U[0]) * 1.2 * E.SH / E.SW)
            c = [(U[0] + U[2]) / 2, U[1] - 0.08 * h + h / 2]; push = 0.025; need = ()
        elif s['kind'] == 'ots':
            sp = subj[0]; ov = s['over']; hs, ho = B[sp]['head'], B[ov]['head']; Hs = actors[sp]['H']
            h = max(0.62 * Hs, 0.55 * actors[ov]['H'])
            cx = 0.62 * (hs[0] + hs[2]) / 2 + 0.38 * (ho[0] + ho[2]) / 2
            c = [cx, hs[1] - 0.1 * h + h / 2]; push = 0.03; need = ()
            subj = [sp, ov]
        else:   # cu / react
            sp = subj[0]; hs = B[sp]['head']; Hs = actors[sp]['H']; hh = hs[3] - hs[1]
            h = max(0.5 * Hs, 2.3 * hh) if not actors[sp]['dog'] else max(0.95 * Hs, 2.4 * hh)
            lead = (0.07 if actors[sp]['flip'] else -0.07) * h * E.SW / E.SH   # look room toward the facing direction
            c = [(hs[0] + hs[2]) / 2 + lead, hs[1] - 0.12 * h + h / 2]; push = 0.03; need = ()
        s.update(c=c, h=h, push=push, dof=DOF[s['kind']], focus_y=actors[subj[0]]['feet'][1])
        s2, iss = guard(s, ids, B, subj, need_full=need)
        if s['kind'] == 'ots': s2['defocus'] = {s['over']: 3.0}
        issues += iss; final.append(s2)
    # continuity checks (180 rule: screen sides never swap; every speaker seen at least once)
    for a in ids:
        if not any(a in s['subjects'] for s in final) and not any(s['kind'] == 'wide' for s in final): issues.append(f'{a} never on screen')
    return dict(duration=round(total, 3), stage=spec['stage'], actors=actors, lines=lines, shots=final, issues=issues)


def load_cast(path=os.path.join(HERE, 'cast.json')):
    return {c['id']: c for c in json.load(open(path, encoding='utf-8'))['cast']}


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1], encoding='utf-8'))
    stages = E.load_stages(spec.get('stages') or os.path.join(HERE, 'stages.json'))
    p = plan(spec, load_cast(), stages)
    json.dump(p, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in p['shots']:
        print(f"{s['t0']:6.2f}-{s['t1']:6.2f} {s['name']:28s} h={s['h']:6.1f} poses={s['poses']}")
    print('issues:', p['issues'] or 'none')
