# Painted cutout puppets (phase 1)

Kits live in `$PUPPET_ROOT` (default `/workspace/anim-demo/puppets`): `kabir/`, `bittu/`, `kamla-dadi/`, `bholu/`.
Each has `rig.json` plus `<view>/{head.png, body/, hands/, mouth/, eyes/, brows/, expr/, acc/}` (views: `front`, `34`).

Pipeline (all local, no cloud):
1. Painted parts were generated with the approved turnaround as reference, on flat keyable backgrounds (`_gen/`).
2. `key.py _gen/*.jpg` -> `_keyed/` (colour-difference keyer, spill clamp, edge-band recolour = no halos).
3. `build.py kabir bittu kamla-dadi` / `build_dog.py` -> kits. Face grids are SIFT+RANSAC registered onto the body head,
   colour-matched to body skin, cut into soft-masked mouth/eye/brow patches or full expression heads.
   Limbs are cut along joint capsules with joint-disk overlap (shoulder/elbow/wrist/hip/knee) so rotations never open seams;
   torso holes under arms/accessories are inpainted.
4. `puppet.py` = forward-kinematics compositor (`render(puppet, view, pose, canvas, (x, y, scale))`).
5. `../puppet-preview.py` -> `preview-sheet.png`; `talk_test.py` -> `kabir-talk-test.mp4`
   (Edge TTS word boundaries -> `classic/visemes.js wordVisemes` via `visemes_cli.mjs` -> `face.viseme_map`).

## rig.json
```
views.<view>: canvas [w,h], ground [x,y] (feet centre on floor), height, top,
  joints {neck, shoulder_L/R, elbow_L/R, wrist_L/R, fingertip_L/R, hip_L/R, knee_L/R, ankle_L/R}   (dog: neck + leg tops)
  layers [{file, x, y, w, h, part, side, parent, pivot, z, pose}]  sorted by z
  face {mouth{name:layer}, eyes{}, brows{}, expr{}, viseme_map{X,A,B,C,E,O,U,F,M -> mouth name}}
rest_pose: A-pose; a bone rotation is (target angle - rest angle), positive = clockwise on screen.
```
Pose keys: `root, head, arm_upper_L/R, arm_lower_L/R, hand_L/R, leg_upper_L/R, leg_lower_L/R, acc_<name>`,
dog: `head, ear_*, tail, leg_*`; plus `face {eyes, brows, mouth, expr}`, `hands {L/R: relaxed|point|open_palm|fist|...}`.
