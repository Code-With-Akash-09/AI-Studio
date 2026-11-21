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
| `rig.js` | Parametric SVG rig: legs, torso, 7 arm poses, head, eyes + blink, brows, 7 expressions, 5 visemes (X/A/B/C/O), props (magnifier, sweat drops). |
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

### Classic acting (`classic/acting.js`, `classic/visemes.js`)

Every classic character is animated continuously as a pure function of time:
breathing, weight shifts, frequent (double) blinks, eye darts, idle glances and small
idle gestures, talk gestures + nods, head turns (front / ¾ / side via a spherical
yaw projection), text-driven mouth shapes (Devanagari syllables → visemes, shaped by
the TTS loudness envelope), anticipation → overshoot → squash/stretch on every pose
change with eased in-betweens, and secondary motion (hair, scarf, gamchha, kurta hem,
coat tail) driven by velocity and wind.

Blocking is scripted per line:

```jsonc
"positions": { "raazu": "offL", "golu": "offR" },      // start marks (left|center|right|offL|offR|0..1)
"lines": [{
  "gesture": "explain" | "wave" | "fist" | "nod",
  "actions": [
    { "who": "raazu", "type": "walk", "to": "left", "delay": -0.6 },   // walk cycle with bob + arm swing
    { "who": "golu", "type": "run", "to": "offR", "at": "end" },       // speed-blur legs + dust cloud
    { "who": "golu", "type": "hop", "to": 0.72 },
    { "who": "golu", "type": "jump", "to": "raazu" },                  // jump into the other's arms
    { "who": "golu", "type": "doubletake", "at": "end" },
    { "who": "raazu", "type": "dramatic" }                             // zoom-punch → intense eye close-up → action pose
  ]
}]
```

`at` = `start` (default) | `end` | `after` (after the reaction), `delay` seconds,
optional `dur`. The dramatic beat adds a dark vignette, radial speed lines, wind,
letterbox on the eye shot and motion trails on the action pose. Vertical renders use
a pushed-in "Shorts" wide shot that keeps the pair in the upper-middle safe area.


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
# classic sample (default): node .scripts/animation/render-demo.mjs src/lib/services/animation/samples/gali-ball-classic.json /workspace/anim-demo --name=classic-v3
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

## Pipeline plug-in point (future)

`video.service.js#createScene()` can branch on `scene.visualType === "character"`
and call `renderDialogueScene(scene.dialogue, { index, dimension })`. The result
has the same `{ path, duration, captions, ... }` shape and encoding (30 fps,
44.1 kHz stereo, 1920x1080 / 1080x1920) as other scenes, so `combineScenes()`
can concat it unchanged. `analyzeScript` would need a prompt that emits the
dialogue-script JSON for those scenes.
