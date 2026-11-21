# Character animation step (opt-in)

Code-driven 2D cartoon dialogue renderer for **Raaz Explain Tv**. No per-frame
AI image generation: characters are parametric SVG rigs, rasterized with
`@resvg/resvg-js` and encoded with the repo's `ffmpeg-static`.

> Not wired into the daily pipeline. Enabled only via `ANIMATION_ENABLED=true`
> (API route) or by calling the module directly. Never touches MongoDB or uploads.

## Pieces

| File | Role |
|------|------|
| `characters.js` | Original cast bible: Raazu (detective/host), Golu (scared sidekick), optional Kissa Nani. Personality, speech style, catchphrases, Edge TTS voice (rate/pitch), palette, rig params. |
| `rig.js` | (flat style) Parametric SVG rig: legs, torso, 7 arm poses, head, eyes + blink, brows, 7 expressions, 5 visemes (X/A/B/C/O), props (magnifier, sweat drops). |
| `backgrounds.js` | Flat animated backgrounds (`haveli_night`, `plain`) + reveal light beam. |
| `script.js` | Dialogue-script format + validation (see header comment). |
| `audio.js` + `tts_line.py` | Per-line Edge TTS (free, cached), PCM decode, amplitude envelope → lip-sync, synth "boing", WAV mix. Falls back to silent placeholder audio + fake mouth flaps if TTS is unavailable. |
| `timeline.js` | Timing (intro / lines / humor reaction holds / outro), blinks, camera (wide / speaker / listener / reveal) with easing, shake on humor beats, flash on reveal. |
| `captions.js` | ASS subtitles: speaker-coloured Hindi lines, comic pop text, watermark (libass + bundled Mukta font). |
| `renderer.js` | Frame SVG → PNG → ffmpeg pipe (15 fps animation, 30 fps output, 44.1 kHz stereo AAC). |
| `index.js` | `renderCharacterAnimation()`, `renderDialogueScene()` (pipeline-shaped scene), `isAnimationEnabled()`. |

## Styles

`dialogue.style` picks the look (default `"classic"`; `"flat"` and `"anime"` remain as alternates):

- `"classic"` — `classic/`: round chibi kids-TV look (head ≈ half the height, stubby
  limbs), thick uniform dark outlines, flat bright colours, dot/oval eyes with a shine,
  big open mouths, rosy cheeks, bouncy squash-and-stretch, comedy reactions (jump-up
  shock with lines, sweat drop, gloom lines, swirly dizzy eyes + stars, tear fountains,
  `facefault` pose), sunburst gag backdrop on shocked close-ups, bright daytime Indian
  gali background (`gali_day`: sky, kites, clouds, rooftops with water tanks, colourful
  houses with balconies/laundry/toran, neem tree, lane with planter) as flat parallax
  layers, hard cuts, 24fps, rounded Baloo 2 captions (OFL, `assets/fonts/Baloo2-*`).
  Only the genre is inspired by classic Japanese kids' TV; the cast and every design
  here are original.
- `"anime"` — `anime/`: cel-shaded rig, 5-layer parallax, manga FX, 24fps.
- `"flat"` — the original rig (15fps → 30fps).

### Classic acting (`classic/acting.js`, `classic/visemes.js`, `classic/mouths.js`)

Every classic character is animated continuously as a pure function of time:
breathing, weight shifts, frequent (double) blinks, eye darts, idle glances and small
idle gestures, talk gestures + nods, head turns (front + slight ¾ only, `MAX_YAW`),
lip sync from the real audio (below), anticipation → overshoot → squash/stretch on every pose
change with eased in-betweens, and secondary motion (hair, scarf, gamchha, kurta hem,
coat tail) driven by velocity and wind.

Blocking is scripted per line:

```jsonc
"positions": { "raazu": "offL", "golu": "offR" },      // start marks (left|center|right|offL|offR|0..1)
"lines": [{
  "gesture": "explain" | "wave" | "fist" | "nod",
  "actions": [
    { "who": "raazu", "type": "walk", "to": "left", "delay": -0.6 },   // walk cycle with bob + arm swing
    { "who": "golu", "type": "run", "to": "offR", "at": "end" },       // fast planted-foot cycle + dust
    { "who": "golu", "type": "hide", "to": "raazu" },                  // scurry behind Raazu, peek + tremble
    { "who": "golu", "type": "hop", "to": 0.68 },                      // (out of hiding: passes behind)
    { "who": "golu", "type": "jump", "to": "raazu" },                  // into the other's arms (crude; avoid)
    { "who": "golu", "type": "doubletake", "at": "end" },
    { "who": "raazu", "type": "dramatic" }                             // zoom-punch → intense eye close-up → action pose
  ]
}]
```

**Lip sync.** `tts_line.py` asks Edge TTS for `WordBoundary` events and caches them
next to the mp3 (`line-<hash>.words.json`, old cache entries are re-synthesized);
`prepareLineAudio()` shifts them by the trimmed leading silence. `wordVisemes()` spreads
each word's Devanagari syllables (with Hindi schwa deletion, labial onsets/codas → M,
व/फ़ → F) over that word's own time span, keeps the mouth closed (X) between words and
in pauses, and holds every shape ≥ 3 frames. Loudness only scales how far the jaw
opens. Non-speakers never lip-flap (their mouth only follows their expression).

**Rig rules** (`classic/classicRig.js`, `classic/mouths.js`): one transform hierarchy
(feet → body → head → head-local features) with pivots from `classicGeometry()`;
eyes, brows, nose, cheeks and mouth are head-local and clipped to the face shape; every
mouth (visemes and expression rest mouths) is one parametric shape anchored at the
upper-lip centre with the same size envelope and outline width, and the per-actor
mouth track is cross-faded with a [1 2 1] kernel (no anchor jumps); brows ease
between expressions; ears always sit behind the face; hands never cover the face
(scratch = behind the head, think = under the chin, scared = cheek edges).

Smoothness rules baked into the rig: walk/run feet stay planted (stride = 4 × step
amplitude, so the stance foot moves at exactly the body speed); turns never squash
the body — yaw eases to the front view at the left/right flip; procedural trembles
are ≤ 3 Hz and talk bounce uses a low-passed loudness, so nothing aliases at 24fps;
mouth shapes are held ≥ 3 frames; eye-shape swaps are covered by a quick blink;
talk gestures fade in/out (no hand snap at a line's end);
z-order is stable (hiding actors behind, carried actors in front); the dramatic beat
eases its camera and FX back into the line's own shot.

`at` = `start` (default) | `end` | `after` (after the reaction), `delay` seconds,
optional `dur`. The dramatic beat adds a dark vignette, radial speed lines, wind,
letterbox on the eye shot (no ghost/motion trails). Vertical renders use a pushed-in
"Shorts" wide shot centred on the pair in the upper-middle safe area; it eases out a
little for a face-fault reaction, and a face-fault falls toward the side with room.

### Rig QA (`.scripts/animation/rig-qa.mjs`)

```bash
node .scripts/animation/rig-qa.mjs --out=/workspace/anim-demo/qa/v5            # 16:9
node .scripts/animation/rig-qa.mjs --vertical --out=/workspace/anim-demo/qa/v5-vertical --no-matrix
```

Writes contact sheets (needs python3 + Pillow, `qa_tile.py`): per character test
matrices (head angle × expression, head angle × mouth, expression × mouth,
blink/look × angle, pose × arm/leg state) and, from the exact render timeline, 24
consecutive frames per shot / action / overlay zoomed on each character's head and
full body — for spotting drifting features, mouth jumps, detached limbs, z-flicker.


`renderDialogueScene()` always outputs 30fps so pipeline scenes concat cleanly.
Same stack for all styles, no new runtime deps: SVG → `@resvg/resvg-js`
(rasterized in a `worker_threads` pool, `rasterWorker.js`) → ffmpeg-static.

## Audio

**Default is voices only** (Edge TTS): no background music and no SFX of any kind.
Both are opt-in per dialogue (`ANIMATION_AUDIO_DEFAULTS` in `constants/animation.js`):

- `"bgm": "<mood>"` (+ `"bgmVolume"`) — a `bgm.service` track, ducked under speech.
- `"sfx": true` — story-beat SFX only (reaction sound, default boing; reveal impact).
  Camera cuts and background changes never make a sound.

## Run

```bash
# classic sample (default): node .scripts/animation/render-demo.mjs src/lib/services/animation/samples/gali-ball-classic.json /workspace/anim-demo --name=classic-v5
# anime sample: node .scripts/animation/render-demo.mjs src/lib/services/animation/samples/haveli-mirror-anime.json /workspace/anim-demo --name=anime-v1
# demo MP4 + 3 stills → /workspace/anim-demo (needs python with edge-tts; PYTHON_PATH optional)
pnpm anim:demo
pnpm anim:demo -- --vertical          # 1080x1920 Shorts layout
pnpm anim:demo -- --no-tts            # silent placeholder audio, timed captions

# reference sheets → /workspace/anim-demo/refs
pnpm anim:refs
```

API (only when `ANIMATION_ENABLED=true`): `GET /api/animation` (roster),
`POST /api/animation` `{ dialogue, dimension?, tts?, socketId? }` → `/videos/animations/<file>.mp4`.

## Pipeline integration (opt-in)

Everything is off unless `ANIMATION_ENABLED=true`; with it off the daily
pipeline, prompts and `/api/animation` (404) behave exactly as before.

- **Per video:** POST `/api/generate` with `"characterAnimation": true`, or tick
  "Character dialogue scenes (beta)" in Studio settings on the Generate page.
  `ANIMATION_PIPELINE_DEFAULT=true` turns it on for every job (still needs the
  master flag). Resumed jobs keep the option they were created with.
- **analyzeScript:** when on, the prompt allows 1-2 `visualType: "character"`
  scenes with a `dialogue` script (Raazu/Golu/Kissa Nani, Sheru as stage dog).
  `normalizeAnalysis()` drops extra/invalid character scenes back to `video`.
- **createScene:** character scenes go through `pipeline.js`:
  `sanitizeCharacterDialogue()` (speaker aliases, cast of 2, safe actions only:
  no `jump`, no `catch` pose, max 2 actions per line, clamped moves, classic
  style, voices only) then `renderDialogueScene()`. Any error or a TTS
  placeholder line falls back to the normal stock `video` visual.
- **Encoding:** scenes are rendered at 25 fps / 44.1 kHz stereo / SAR 1 /
  1080x1920 or 1920x1080. 25 fps matches what the pipeline's own scenes really
  contain (scenes.js `fps=30,...,setpts=PTS-STARTPTS` comes out at 25 fps with
  the bundled ffmpeg 7.0.2), so `combineScenes()` concats with no resampling.
- **Isolated test:** `.scripts/animation/seed-pipeline-test.mjs --user=<id>`
  seeds a resumable job (only into a DB whose name contains `anim`/`test`),
  then POST `/api/generate` with that `jobId` runs the real pipeline path
  without an AI call.
