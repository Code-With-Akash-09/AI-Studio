# v6 notes — Kabir full viseme set (started 2026-11-24 18:59 IST)
Goal: >= 9 mouth shapes per Kabir v5 pose (rest, MBP, aa, E, I, O, U, FV, L/TH, smile-open), painted on each pose's own head angle,
soft replace-masks + colour match, finer Hindi viseme mapping with eased transitions, fix beckon chest opening to camera.
Plan: head-crop edits (HD body crop over the key colour -> 1:1 edit -> SIFT register -> mouth-zone diff mask -> ring colour gain).
- 19:00 beckon fix: 2 repaints; (a) still chest-open 3/4 -> rejected; (b) true side profile facing Dadi, offers key + palm-up beckon -> kabir-v5-beckon2
- 19:13 mouth sets: mouth_src.py makes a square head crop of each kit (HD body over the key colour, 1024px); 7-8 edits per pose
  (MBP, E, I, O, U, FV, L, + aa redone for wave/beckon2 because the v5 aa smeared the chin, + smile-open for keyup whose base is a closed smile)
  = 31 edits; 1 rejected (beckon2 L added a finger to the lips -> regenerated). build_mouths_v6.py: key -> SIFT similarity fit on the upper face only
  (27-148 inliers, scale 0.993-1.004, rot < 0.5 deg) -> diff blobs near the mouth inside a soft lower-face zone -> dilated/feathered replace-mask ->
  ring colour-gain match -> HD patch + mask. Each pose now has 10 shapes (keyup 11): base, closed(rest), MBP, aa, E, I, O, U, FV, L (+smile).
  Sheet: stills/puppet-v6/mouths.jpg (100% HD pose pixels, renderer's own compositing).
- visemes_fine.py: Python port of wordVisemes() with finer letters (I split from E, L for t/d/n/l/retroflex onsets); Dadi keeps the JS visemes.
- talk_test_v6.py: Kabir mouth = fine viseme while speaking, pose's own mouth otherwise; every shape change is cross-dissolved (55% on the change
  frame, 100% next) so nothing pops; beckon2 replaces beckon in the last shot (gem 528,547). warpcheck TT=talk_test_v6: all det min >= 0.638.
- 19:31 first full render died silently at ~frame 230 (source cache of 60 full-res float RGBA images ~ out of memory) -> cache capped at 16; re-render OK.
- render: kabir-talk-test-v6.mp4 (1920x1080 h264 + aac, 15.72 s). stills/puppet-v6/: mouths.jpg (every shape x every pose, 100% HD pose pixels),
  mouths-in-video.jpg (first held frame of each shape run per shot, 100% video pixels), eyeline-check.jpg, contact.jpg, per-shot full frames + arm crops.
  Eyelines: Kabir pupils screen-right on Dadi in every Kabir-visible frame, Dadi screen-left on Kabir; no glasses doubling (mouth masks stay below the nose).
  Last shot: Kabir in true side profile, offering the key + palm-up beckon to Dadi; chest no longer opens to camera.
- remaining: the 1-frame cross-dissolve shows soft double lips if you step frame-by-frame (reads as motion at 25 fps); MBP/FV/U are painted but
  Kabir's visible lines rarely hit them (wordVisemes drops short onsets; the 'ढूँढी' U falls in the key insert); FV on show/wave reads as a tight
  upper-teeth smile; L on beckon2 shows the tongue only faintly; MBP edits are a touch softer than the base painting.
