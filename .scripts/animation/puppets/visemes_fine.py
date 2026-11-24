"""visemes_fine.py -- Python port of wordVisemes() (src/lib/services/animation/classic/visemes.js) with a finer alphabet for
painted kits that have a full mouth set. Same syllable split, schwa deletion, per-word timing, >=3-frame holds and gap bridging;
differences: i/ii -> I (was E), dental/retroflex/l onsets -> L (tongue tip), ai -> E.
Letters: X rest, M m/b/p, F f/v, L l/t/d/n, C aa, B a (mid), E e/ai, I i, O o, U u."""
def _cons(c): return 0x0915 <= c <= 0x0939 or 0x0958 <= c <= 0x095f
def _indep(c): return 0x0904 <= c <= 0x0914
def _matra(c): return 0x093e <= c <= 0x094c
VIRAMA = 0x094d
def _vowel(c):
    if c in (0x093e, 0x0906): return 'aa'
    if c in (0x093f, 0x0940, 0x0907, 0x0908, 0x0943, 0x090b): return 'i'
    if c in (0x0941, 0x0942, 0x0909, 0x090a): return 'u'
    if c in (0x0947, 0x090f, 0x0946): return 'e'
    if c in (0x0948, 0x0910, 0x0945): return 'ai'
    if c in (0x094b, 0x094c, 0x0913, 0x0914, 0x0949, 0x094a, 0x0911, 0x0912): return 'o'
    return 'a'
def _onset(c):
    if 0x092a <= c <= 0x092e: return 'M'
    if c in (0x0935, 0x095e): return 'F'
    if 0x091f <= c <= 0x0928 or c in (0x0932, 0x095c, 0x095d): return 'L'
    return None
VV = {'a': 'B', 'aa': 'C', 'i': 'I', 'u': 'U', 'e': 'E', 'ai': 'E', 'o': 'O'}
def syllables(text):
    out = []; prev = 0
    for ch in text or '':
        c = ord(ch)
        if _cons(c):
            if not (prev == VIRAMA and out): out.append(dict(onset=_onset(c), vowel='a', inherent=True))
        elif _matra(c) and out: out[-1]['vowel'] = _vowel(c); out[-1]['inherent'] = False
        elif _indep(c): out.append(dict(onset=None, vowel=_vowel(c)))
        prev = c
    if len(out) > 1 and out[-1]['vowel'] == 'a' and out[-1].get('inherent'):
        last = out.pop()
        if last['onset']: out[-1]['coda'] = last['onset']
    return [dict(onset=s['onset'], viseme=VV.get(s['vowel'], 'B'), coda=s.get('coda')) for s in out]
def hold_min(fr, mn=3):
    out = list(fr); i = 0
    while i < len(out):
        j = i
        while j < len(out) and out[j] == out[i]: j += 1
        if j - i < mn and i > 0:
            prev = out[i - 1]
            for k in range(i, j): out[k] = prev
            s = i - 1
            while s > 0 and out[s - 1] == prev: s -= 1
            i = j if j - s >= mn else s
            continue
        i = j
    return out
OPEN = 'CBAEIOULFMX'
def word_visemes(words, env, fps):
    n = len(env); out = ['X'] * n
    for w in words:
        f0 = max(0, round(w['t'] * fps)); f1 = min(n, max(f0 + 3, round((w['t'] + w['d']) * fps))); span = f1 - f0
        if span <= 0: continue
        syl = syllables(w.get('w', '')) or [dict(onset=None, viseme='B', coda=None)]
        slots = max(1, span // 3); seq = []
        for s in syl:
            if s['onset']: seq.append((s['onset'], True))
            seq.append((s['viseme'], False))
            if s['coda']: seq.append((s['coda'], True))
        while len(seq) > slots and any(o for _, o in seq):
            k = next((q for q in range(len(seq) - 1, 0, -1) if seq[q][1]), 0); seq.pop(k)
        while len(seq) > slots:
            best = 1
            for q in range(1, len(seq)):
                if OPEN.index(seq[q][0]) > OPEN.index(seq[best][0]): best = q
            seq.pop(best)
        seq = [x for q, x in enumerate(seq) if q == 0 or x[0] != seq[q - 1][0]]
        for f in range(f0, f1): out[f] = seq[min(len(seq) - 1, int((f - f0) / span * len(seq)))][0]
    i = 0
    while i < n:
        if out[i] != 'X': i += 1; continue
        j = i
        while j < n and out[j] == 'X': j += 1
        silent = all(v < 0.05 for v in env[i:j])
        if j - i < 3 and i > 0 and j < n and not silent:
            for k in range(i, j): out[k] = out[i - 1]
        i = j
    return hold_min(out, 3)
