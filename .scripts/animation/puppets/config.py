"""Per-character puppet cut specs (pixel coords of the keyed source images).
Body coords = the A-pose body image (864x1152, dog 3/4 is 1152x864). Head coords = viseme-grid cell 0 (341x341)."""
# cell indices of the 3x3 grids
VISEMES = {0: 'closed', 1: 'A_open', 2: 'E_wide', 3: 'O_round', 4: 'MBP', 5: 'smile', 6: 'shocked', 7: 'FV', 8: 'U_half'}
EYES = {0: 'open', 1: 'half', 2: 'closed', 6: 'look_left', 7: 'look_right', 8: 'squint'}
BROWS = {3: 'raised', 4: 'angry', 5: 'worried'}
EXPR = {0: 'happy', 1: 'scared', 2: 'surprised', 3: 'thinking', 4: 'laughing', 5: 'sad', 6: 'angry', 7: 'suspicious', 8: 'determined'}

def arm(side, cut, J, E, W, tip, r, z='front', hand_flip=False, real=False):
    return dict(side=side, cut=cut, J=J, E=E, W=W, tip=tip, r=r, z=z, hand_flip=hand_flip, real=real)

CHARS = {
  'kabir': dict(src='raazu', kind='human', views={
    'front': dict(
      head=dict(chin=256, neck=(150, 205), ext=22, mouth=(177, 222, 40, 24), eyes=(112, 138, 265, 202), brows=(118, 108, 258, 140)),
      arms=[arm('L', [(325, 250), (322, 425)], (330, 330), (243, 440), (158, 548), (95, 600), 48),
            arm('R', [(492, 255), (528, 430)], (505, 330), (600, 440), (690, 552), (745, 600), 48, hand_flip=True)],
      legs=dict(hem=708, split=428, items=[dict(side='L', hip=(376, 716), knee=(370, 860), ankle=(362, 1000)),
                                          dict(side='R', hip=(480, 716), knee=(490, 860), ankle=(500, 1000))]),
      acc=[dict(name='satchel', poly=[(472, 515), (565, 520), (584, 600), (582, 670), (495, 670), (474, 600)], pivot=(485, 528), colour='brown', z='front'),
           dict(name='scarf_end', poly=[(426, 300), (472, 300), (474, 442), (426, 442)], pivot=(450, 305), colour='mustard', z='front')]),
    '34': dict(
      head=dict(chin=258, neck=(165, 235), ext=22, mouth=(172, 230, 36, 24), eyes=(100, 138, 258, 202), brows=(118, 106, 246, 142)),
      arms=[arm('L', [(326, 285), (326, 446)], (345, 350), (275, 450), (205, 548), (155, 605), 46, z='back'),
            arm('R', [(552, 285), (528, 440)], (535, 345), (600, 450), (668, 552), (705, 612), 48, hand_flip=True)],
      legs=dict(hem=706, split=417, items=[dict(side='L', hip=(374, 716), knee=(381, 860), ankle=(372, 990), z='back'),
                                          dict(side='R', hip=(462, 716), knee=(485, 860), ankle=(492, 990))]),
      acc=[dict(name='satchel', poly=[(440, 505), (600, 505), (600, 700), (440, 700)], pivot=(462, 530), colour='brown', z='front'),
           dict(name='scarf_end', poly=[(385, 335), (500, 335), (500, 455), (385, 455)], pivot=(445, 338), colour='mustard', z='front')]),
  }, extras={'34': {0: ('expr', 'thinking')}}, hands='raazu-hands', hand_cells={0: 'relaxed', 1: 'point', 2: 'open_palm', 3: 'fist', 4: 'thumbs_up', 5: 'cupped'}),
  'bittu': dict(src='golu', kind='human', views={
    'front': dict(
      head=dict(chin=268, neck=(135, 210), ext=14, mouth=(170, 212, 42, 24), eyes=(102, 128, 242, 184), brows=(96, 96, 248, 136)),
      arms=[arm('L', [(275, 288), (280, 455)], (305, 355), (210, 460), (132, 528), (52, 582), 60),
            arm('R', [(588, 288), (580, 455)], (560, 355), (655, 460), (735, 528), (810, 582), 60, hand_flip=True)],
      legs=dict(hem=770, split=430, items=[dict(side='L', hip=(350, 785), knee=(345, 890), ankle=(335, 985)),
                                          dict(side='R', hip=(510, 785), knee=(515, 890), ankle=(525, 985))]),
      acc=[dict(name='gamchha_L', poly=[(292, 335), (373, 335), (374, 618), (288, 618)], pivot=(333, 340), colour='notkurta', z='front'),
           dict(name='gamchha_R', poly=[(482, 335), (562, 335), (572, 618), (478, 618)], pivot=(522, 340), colour='notkurta', z='front')]),
    '34': dict(
      head=dict(chin=272, neck=(140, 215), ext=14, mouth=(150, 225, 40, 24), eyes=(105, 136, 215, 198), brows=(92, 108, 228, 150)),
      arms=[arm('L', [(300, 295), (271, 512)], (285, 380), (225, 470), (165, 545), (118, 608), 56, z='back'),
            arm('R', [(578, 292), (566, 482)], (560, 360), (625, 470), (668, 560), (728, 630), 56, hand_flip=True)],
      legs=dict(hem=742, split=419, items=[dict(side='L', hip=(350, 760), knee=(350, 880), ankle=(345, 975), z='back'),
                                          dict(side='R', hip=(490, 760), knee=(495, 880), ankle=(505, 985))]),
      acc=[dict(name='gamchha', poly=[(430, 320), (575, 320), (575, 640), (430, 640)], pivot=(470, 330), colour='notkurta', z='front')]),
  }, extras={'front': {0: ('expr', 'thinking'), 2: ('brows', 'raised'), 3: ('brows', 'worried')},
             '34': {0: ('brows', 'raised'), 1: ('brows', 'worried'), 3: ('expr', 'surprised')}},
     skip={'front': [('expr', 3)], '34': [('brows', 3), ('brows', 5)]},
     expr_remap={'34': {0: None, 1: 'happy', 2: 'scared', 3: 'thinking', 4: 'laughing', 5: 'sad', 6: 'angry', 7: 'suspicious', 8: 'hungry'}},
     expr_names={'front': {8: 'hungry'}},
     hands='golu-hands', hand_cells={0: 'relaxed', 1: 'point', 2: 'open_palm', 3: 'fist', 5: 'cupped'}),
  'kamla-dadi': dict(src='nani', kind='human', views={
    'front': dict(
      head=dict(chin=254, neck=(140, 215), ext=16, mouth=(170, 218, 42, 22), eyes=(112, 136, 268, 198), brows=(118, 108, 252, 140)),
      arms=[arm('L', [(290, 330), (316, 455)], (300, 410), (268, 478), (240, 548), (188, 632), 32),
            arm('R', [(520, 330), (541, 548)], (522, 405), (540, 478), (575, 548), (600, 625), 28, hand_flip=True)],
      legs=None,
      acc=[dict(name='pallu', poly=[(495, 610), (562, 610), (562, 815), (495, 815)], pivot=(525, 612), colour='mustard', z='back'),
           dict(name='stick', poly=[(650, 430), (700, 430), (700, 1010), (650, 1010)], pivot=(673, 455), colour=None, z='front', detach=True)]),
    '34': dict(
      head=dict(chin=252, neck=(130, 200), ext=16, mouth=(118, 222, 36, 22), eyes=(58, 134, 205, 198), brows=(70, 100, 190, 140)),
      arms=[arm('L', [(318, 332), (323, 485)], (318, 410), (280, 485), (248, 545), (195, 615), 30, z='back'),
            arm('R', [(556, 330), (568, 542)], (545, 415), (575, 485), (598, 565), (645, 640), 30, hand_flip=True)],
      legs=None,
      acc=[dict(name='pallu', poly=[(520, 600), (595, 600), (595, 835), (520, 835)], pivot=(555, 602), colour='mustard', z='back')]),
  }, extras={'front': {0: ('expr', 'thinking')}, '34': {0: ('expr', 'thinking')}},
     expr_names={'front': {8: 'loving'}, '34': {8: 'loving'}},
     hands='nani-hands', hand_cells={0: 'relaxed', 1: 'point', 2: 'open_palm', 3: 'fist', 4: 'blessing', 5: 'cupped'}),
}

DOG = {
  'bholu': dict(src='sheru', views={
    '34': dict(roi=(260, 30, 620, 420), cut=[(0, 345), (205, 340), (330, 262), (341, 258)], bell=(232, 292, 290, 341),
               mouth=(135, 215, 66, 38), eyes=(98, 82, 242, 176),
               ears=[dict(name='ear_far', poly=[(108, 40), (178, 33), (202, 92), (160, 132), (108, 116)], pivot=(172, 58), z='back'),
                     dict(name='ear_near', poly=[(244, 52), (308, 42), (338, 110), (328, 204), (284, 198), (252, 126)], pivot=(262, 72), z='front')],
               tail=dict(poly=[(805, 420), (870, 420), (925, 470), (925, 580), (840, 590), (800, 520)], pivot=(812, 470)),
               legs=[dict(name='leg_front_far', poly=[(385, 515), (465, 515), (455, 800), (340, 800)], top=525, z='back'),
                     dict(name='leg_front_near', poly=[(478, 505), (565, 505), (560, 800), (440, 800)], top=515, z='front'),
                     dict(name='leg_hind_far', poly=[(620, 520), (705, 520), (715, 780), (630, 780)], top=530, z='back'),
                     dict(name='leg_hind_near', poly=[(715, 510), (828, 510), (840, 780), (750, 780)], top=520, z='front')],
               cells=dict(mouth={0: 'closed', 1: 'bark', 2: 'pant', 5: 'smile'}, eyes={3: 'half', 4: 'closed'},
                          expr={5: 'happy', 6: 'scared', 7: 'surprised', 8: 'angry'})),
    'front': dict(roi=(250, 60, 620, 560), cut=[(0, 300), (341, 300)], bell=(240, 286, 302, 341),
               mouth=(178, 220, 62, 32), eyes=(112, 72, 268, 166),
               ears=[dict(name='ear_L', poly=[(42, 55), (122, 34), (152, 82), (122, 152), (74, 152), (42, 102)], pivot=(118, 55), z='front'),
                     dict(name='ear_R', poly=[(218, 34), (302, 48), (328, 110), (306, 152), (254, 152), (222, 82)], pivot=(226, 55), z='front')],
               tail=dict(poly=[(568, 660), (655, 660), (655, 815), (575, 815)], pivot=(572, 700)),
               legs=[dict(name='leg_front_L', poly=[(300, 690), (425, 690), (420, 1045), (265, 1045)], top=700, z='front'),
                     dict(name='leg_front_R', poly=[(440, 690), (566, 690), (568, 1045), (452, 1045)], top=700, z='front')],
               cells=dict(mouth={0: 'closed', 1: 'bark', 2: 'pant', 5: 'smile'}, eyes={3: 'half', 4: 'closed'},
                          expr={5: 'happy', 6: 'scared', 7: 'surprised'})),
  }),
}

def _sp(p, k): return (round(p[0] * k), round(p[1] * k))
def scaled(vc):
    """apply the view's preview-read scale to every body-space coordinate."""
    import copy
    k = vc.get('scale', 1.0); v = copy.deepcopy(vc)
    if k == 1.0: return v
    for a in v.get('arms', []):
        if a.get('real'): continue
        a['cut'] = [_sp(p, k) for p in a['cut']]
        for q in ('J', 'E', 'W', 'tip'): a[q] = _sp(a[q], k)
        a['r'] = round(a['r'] * k)
    if v.get('legs'):
        L = v['legs']; L['hem'] = round(L['hem'] * k); L['split'] = round(L['split'] * k)
        for it in L['items']:
            for q in ('hip', 'knee', 'ankle'): it[q] = _sp(it[q], k)
    for ac in v.get('acc', []):
        ac['poly'] = [_sp(p, k) for p in ac['poly']]; ac['pivot'] = _sp(ac['pivot'], k)
    if 'roi' in v: v['roi'] = tuple(round(c * k) for c in v['roi'])
    if 'tail' in v:
        v['tail']['poly'] = [_sp(p, k) for p in v['tail']['poly']]; v['tail']['pivot'] = _sp(v['tail']['pivot'], k)
    for lg in v.get('legs_dog', []):
        pass
    if isinstance(v.get('legs'), list):
        for lg in v['legs']:
            lg['poly'] = [_sp(p, k) for p in lg['poly']]; lg['top'] = round(lg['top'] * k)
    return v
