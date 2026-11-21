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

`renderDialogueScene()` always outputs 30fps so pipeline scenes concat cleanly.
Same stack for all styles, no new runtime deps: SVG → `@resvg/resvg-js`
(rasterized in a `worker_threads` pool, `rasterWorker.js`) → ffmpeg-static.

## Audio

BGM comes from `bgm.service` (same tracks/moods as the pipeline, `dialogue.bgm`,
`dialogue.bgmVolume`) with smoothed ducking under speech. There are **no screen-switch
sounds**: camera cuts and background changes are silent. SFX are story beats only —
the comedy reaction sound (`reaction.sfx`, default boing; `"none"` to mute) and the
reveal impact.

## Run

```bash
# classic sample (default): node .scripts/animation/render-demo.mjs src/lib/services/animation/samples/gali-ball-classic.json /workspace/anim-demo --name=classic-v1
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
