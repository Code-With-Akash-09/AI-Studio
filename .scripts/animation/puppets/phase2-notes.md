# Phase 2 notes (started 2026-11-24 20:15 IST)
Milestone 1: pose libraries for 9 cast members (kabir, bittu, meera-maa, ramesh-papa, anaya-didi, chiku, kamla-dadi, hariprasad-dadaji, bholu).
Poses (painted facing image-LEFT in 3/4; facing RIGHT = mirror at composite, flip flag): idle, explain, surprised, laugh, think, offer, sit.
Screen colours: magenta (kabir, ramesh, anaya), green (bittu, chiku, kamla-dadi [purple saree], dadaji, bholu), blue (meera-maa [maroon dupatta + green kurta]).
Mouth/blink plan to keep generations sane (9 x 7 poses): per pose 1 body painting + 1 head-crop 3x3 "mouth grid" edit
(cells: closed eyes+closed mouth | aa | MBP / E | I | O / U | FV | L) -> each cell SR x2, SIFT-registered to the pose head on the upper face,
mouth-zone replace-mask, colour matched (same method as v6 build_mouths_v6). Base painting = smile-open.
- 20:20 prototype bittu-idle: body gen #1 ambiguous pupils -> regenerated with 'pupils in the LEFT corners'. p2_prep.py (key, SR, head crop),
  3x3 mouth-grid edit of the head crop -> p2_build.py: all 9 cells registered (72-134 inliers, scale 1.46-1.48 = consistent), mouths blend cleanly.
  Grid prompt fixes for next poses: MBP must be pressed flat (came out puckered), L tongue tip behind teeth (came out tongue-out).
  Sit poses: figure scale must come from head size (eye-mouth distance), not kit height -> pose.json keeps eyes/mouth for that.

## Eyeline fix (Nov 24, ~9 PM IST)
New Bittu poses explain/think/offer/sit/surprised had pupils centred or looking image-right. Instead of regenerating bodies,
p2_eyefix.py: head-crop edit "change ONLY the eyes: pupils fully into the LEFT corners" -> SIFT reg (~300 inliers, scale 0.998)
-> change blobs in the eye band -> paste paint from the edit (key alpha not trusted: dark pupils keyed as holes) -> baked into
_keyed_hd/p2/<name>.png (original kept .orig.png) -> re-run p2_prep (no FORCE) to refresh src crop. 1 gen per failing pose.

## Grid prompt (3x3) used from now on
"3x3 grid of nine copies of this exact painted head image (same framing, head size, hair, eyes looking LEFT, colours, flat
<bg> background), identical except for the mouth. Row 1: (1) eyes CLOSED and mouth closed relaxed, (2) mouth wide open 'aa'
showing teeth and tongue, (3) lips pressed together flat in a straight line 'm/b/p', NOT puckered. Row 2: (4) 'ee' wide
smile-stretched mouth, teeth together, (5) 'ih' small relaxed half-open mouth, (6) 'oh' round open mouth. Row 3: (7) 'oo'
small tight rounded pucker, (8) 'f/v' upper teeth resting on lower lip, (9) 'L' mouth open, tongue tip just behind upper
teeth, NOT sticking out. Thin white gutters between cells."

## Progress log (IST)
- 20:30-20:55 Bittu 7 poses built (eyefix on explain/think/offer/sit/surprised). p2_build fixes: eye centre = centroid of 2 biggest upper blobs;
  mouth centre = blob nearest eye+(0,186) crop px; base-mouth footprint always replaced (no ghost); inside-silhouette pixels take the
  cell's own paint unless near the key colour (dark mouth interiors keyed semi-transparent -> see-through ghosts; key spill -> magenta smears).
  REG_TOP=<think poses> registers on hair+eyes only; NO_BLINK=<laugh>; MZ=<laugh>:1.5 bigger mouth zone; p2_prune.py drops bad cells
  (bittu-laugh MBP=closed,U=O; bittu-think aa=L,E=I,FV=I: grid mouths oversize next to the hand).
- 20:55-21:00 Kabir 7 bodies + grids, eyefix on surprised. Meera Maa, Ramesh Papa, Anaya Didi bodies generated (prep queued q1-q4).
- 21:03 interrupted during Chiku body gens (idle, explain saved). Resume: rebuild kabir+bittu (q3), commit per character.
- 21:15 Bittu DONE (rebuild with key-spill fix, prunes re-applied). Kits: poses/p2/bittu-{idle,explain,surprised,laugh,think,offer,sit}
  check: _check/bittu-mouths.jpg. Flaws: think mouths small set (base,closed,MBP,I,O,U,L); L tongue-out in idle/surprised/sit.
  Committed locally (scripts + notes; kit PNGs stay in /workspace/anim-demo, not in the repo, same as v4-v6).
- 21:20 p2_build: grid cells inset past the white gutters (gutter pixels broke the key's bg estimate -> NaN alpha, broken cells);
  outside the base silhouette only pixels far from BOTH screen colours (body key and the grid's own darker shade) are kept
  (the magenta/green cheek smears in the Kabir sheet came from the grid's darker screen shade).
- 21:31 Ramesh Papa DONE: eyefix on surprised; kits poses/p2/ramesh-papa-*; check _check/ramesh-papa-mouths.jpg.
  Prunes: think O=U (blank-glasses cell). Flaws: surprised blink cell is a one-eye wink; L tongue-out on explain; moustache hides MBP/U.
- 21:50 Kabir DONE (rebuilt with the gutter/key-shade fix: cheek smears gone). Kits poses/p2/kabir-*; check _check/kabir-mouths.jpg.
  Flaws: laugh base is a one-eye wink (painted that way); faint grey edge on sit closed/MBP chin; L tongue-out in a few cells.
- 21:54 interrupted again (Chiku grid gens laugh/offer/sit aborted). Queues q9 (Hariprasad prep), q11 (Bholu prep), q12 Meera build,
  q13 Anaya build, q14 Kamla build kept running. Chiku: eyefix surprised+think saved, idle/explain grids saved.
  Next: L tongue-out cells -> p2_prune L=I where the sheet shows the tongue out.
- 22:00 L tongue-out fix: grid prompt cell 9 now "tongue tip hidden just behind the upper teeth, tongue NOT visible outside the mouth"
  (Chiku grids came out clean with it); existing tongue-out L cells pruned L=I: bittu-idle/surprised/sit, ramesh-papa-explain/surprised
  (+ chiku-idle/explain/think after build). Rule from now: check every sheet's L column, prune L=I where the tongue shows.
- 22:05 Meera Maa DONE: eyefix on 6 poses (all but laugh); kits poses/p2/meera-maa-*; check _check/meera-maa-mouths.jpg (clean, no smears).
  Prunes: L=I on idle/explain/think/offer/sit (tongue out). Flaws: bindi missing on some poses (body gens), think mouths small.
- 22:30 Anaya Didi 7 poses built (eyefix on think). offer/sit grids v1 came out zoomed-out -> SIFT locked on the wrong
  features (12-17 inliers), mouth patches landed at eye level; regenerated both grids ("same crop, same zoom, NOT zoomed out")
  and rebuilt -> correct. sit blink cell misregistered (ghost eye) -> blink dropped for sit. Prunes: L=I on explain/surprised.
  New check tool p2_kitcomp.py (composites each patch WITH its mask on the body - the true render, unlike p2_mouthgrid's crops).
  check: _check/anaya-kit.jpg. Flaws: explain blink slightly warm; think mouths small near the hand.
- 22:32 Kamla Dadi 7 poses built (eyefix on surprised; stick in every body). Prunes: L=I on idle/think (tongue out).
  check: _check/kamla-dadi-kit.jpg, _check/kamla-dadi-mouths.jpg. Flaws: bindi inconsistent across poses; think mouths small.
  Earlier kits re-checked with p2_kitcomp (kabir/bittu/meera/ramesh): placement OK.
  Chiku kit check FAILED on idle/explain/offer (grids drew a frontal, zoomed-out head -> 6-10 SIFT inliers, patches misplaced)
  -> those grids are being regenerated.
- 22:47 Bholu 7 poses built: 2x2 grids (GRID=2x2 CELLS=closed,aa,O,I), pruned MBP=closed,E=I,U=I,FV=closed,L=I.
  Registration good (38-91 inliers). Blinks ghosted on idle/surprised/think/offer -> dropped (explain/sit keep blinks; laugh NO_BLINK).
  check: _check/bholu-kit.jpg. Flaws: idle 'aa' jaw slightly doubled; only 4 mouth shapes (dog).
- 22:50 Hariprasad Dadaji 7 poses built (eyefix on surprised/think). idle/explain/offer/sit grids v1 were zoomed-out frontal
  heads (7-16 inliers, misplaced patches) -> regenerated ("same crop, same zoom, glasses+moustache large, nose to LEFT edge")
  and rebuilt (40+ inliers). Prunes: laugh MBP=closed,U=O,I=E (white strips under moustache); L=I on idle/explain/surprised/think.
  check: _check/hariprasad-dadaji-kit.jpg. Flaws: mouth changes subtle under the big moustache on sit/offer.
