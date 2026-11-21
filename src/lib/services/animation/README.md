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

`dialogue.style` picks the look (default `"flat"`, the original rig — kept as the fallback):

- `"anime"` — `anime/`: cel-shaded rig (`animeRig.js`: shadow + rim-highlight layers,
  anime eyes with iris gradient and two shines, swaying hair, glasses glint, emotion
  symbols: sweat drop, anger vein, blush hatching, shock lines, gloom), 5-layer parallax
  background (`animeBackgrounds.js`), screen-space FX (`fx.js`: focus lines, speed lines on
  cuts, 2-frame impact frame on reveal/shock, letterbox on close-ups, colour grade),
  hard cuts + slow camera drift, extra `"closeup"` camera, 24fps output.
  `renderDialogueScene()` still outputs 30fps so pipeline scenes concat cleanly.
- Same stack, no new deps: SVG → `@resvg/resvg-js` (rasterized in a `worker_threads`
  pool, `rasterWorker.js`) → ffmpeg-static.

## Audio

BGM comes from `bgm.service` (same tracks/moods as the pipeline, `dialogue.bgm`,
`dialogue.bgmVolume`) with smoothed ducking under speech; a whoosh plays on every screen
switch (camera cut or per-line `background` change), plus boing/riser/impact beats, with
priority de-stacking so cues never pile up.

## Run

```bash
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
