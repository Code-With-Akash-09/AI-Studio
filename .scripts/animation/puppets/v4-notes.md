# v4 progress notes (started 5:35 PM IST)
Goal: characters read as one continuous painted body (no visible cut parts), key hand correct, full-frame key insert, lamp moved.

## Approach chosen
- Whole-body painted pose images per shot (generated from the turnaround + body art + key as reference), so arms/hands/key are painted
  together. No rigid joints anywhere on screen. Pose changes happen across cuts (the reference anime does the same).
- Inside a shot, motion is a smooth dense warp (linear-blend skinning on a pixel grid with soft weights: body sway, breathing,
  head tilt about the neck, small arm wave about the shoulder). The warp is continuous, so it can't tear or open seams.
- Lip-sync and blinks: the existing 3/4 face grids are SIFT-registered onto each pose's head and blended in with soft masks (as in phase 1).
- Key insert: a dedicated painted close-up of the hand gripping the key, composited full frame over the blurred courtyard.
- Lamp: cut out of the plate, plate inpainted, lamp re-hung away from Dadi's head.

## Log
- 5:50 generated 4 Kabir whole-body poses (wave, show, keyup, point; the first wave/point had a huge key, regenerated small), 3 Dadi poses (calm, surprised, reach), and a key-in-hand insert. All in _gen/*-v4-*.jpg, keyed into _keyed/.
- 6:10 SR x2 of the pose art and face grids done (_keyed_hd/; tiled SR to avoid OOM).
- 17:56 wave/point face fix: old landmarks were mis-measured (master pts ~40px off). Added gridcrop.py, re-measured; wave/point now use FRONT grid + 3-pt affine, mouth-only (no blink/brow patches: glasses angle differs -> doubled frames). facecheck.py sheet _check/fc_wp.jpg OK.
- 17:58 plate: plate_v4.py -> scenes/courtyard-v4-x4.png (lamp Poisson-removed from beside Dadi, re-hung at world x~1065 with soft wall shadow).
- 18:04 lamp re-hung over the main door (world x~530) with decontaminated edges: out of every close shot. talk_test_v4.py written (pose kits + dense warp + full-frame insert); sample frames OK -> full render.
- 18:17 render 1 OK (393 fr). Fix: cross-view mouth patches on wave/point showed a darker oval at 100% -> smooth ring-interpolated gain map in build_pose (MOUTH_ONLY poses); rebuilt; re-render.
- 18:18 warpcheck.py: Jacobian fold test of the dense warp at extreme params. wave pose folded (det -0.78) at the wrist/elbow ramps -> moved ramps into empty gaps (ear|thumb, shoulder|cuff), wrist 10deg, elbow 3deg -> all poses det 0.50..1.46 (no folds/tears). mix.wav now only replaced when changed. Final render.
- 18:28 final render done: kabir-talk-test-v4.mp4 (1920x1080, 393 fr, 15.72 s, h264 crf16 + aac voices only); .part renamed away. Stills regenerated in stills/puppet-v4/ (contact-sheet.jpg, per-shot *-arms100.png first/mid/last, key-cu *-hand100.png, wave100, neck100, face100). Checked at 100%: no seams/gaps/doubled edges, hands correctly oriented (key gripped in painted fist, palm/thumb right), key insert full frame, lamp over the main door, away from Dadi in every shot.
- Remaining flaws: pose pops at cuts are deliberate (anime limited animation) but there is no in-shot arm acting beyond the wave; wave/point poses have no blinks/brow raises (mouth-only patches); faint smile-crease remnant next to the O mouth on kabir-point; slight neck stretch (Jacobian 0.67-1.3) at max head tilt; faint 4-level tone step at the very top of the wall where the lamp was removed; key bit sits just under the fingers in the insert.
