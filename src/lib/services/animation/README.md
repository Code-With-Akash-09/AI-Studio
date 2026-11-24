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


### Staging guard (`staging.js`, `stagingQA.js`)

Every timeline (hand-written samples and AI-generated scripts alike) is auto-fixed
before rendering so nobody pops in, gets cut by the frame or vanishes behind a prop:

- **Safe area** — authored marks are fitted to the frame in both 16:9 and 9:16
  (`fitX`); `offL`/`offR` starts are pushed fully off-screen so no half-body peeks in,
  and a speaker who is off-stage at their line gets an automatic walk-in.
- **Hides** — the hide spot (`hideSpot`) is the holder's back side, or the front side
  when the back is outside the frame; the hider always keeps head + shoulders visible.
  A hide ends when either character moves; mutual/looping hides are skipped.
- **No overlaps** — `resolveRestingConflicts()` steps the later arrival aside; long hops
  take time proportional to distance (no cross-stage blink).
- **Sheru** (`classic/sheru.js`, `planSheru`) — the dog is now a real character, not
  scenery behind the planter: on a line with `stage.dog` he trots in from off-stage on the
  speaker's side, settles on a spot clear of everyone's head and torso (in front of the
  pair in 9:16, behind their plane in 16:9), trots aside if someone moves onto him and
  trots out if there is no room left. The 9:16 camera keeps him in frame.
- **Validator** — `validateStaging(timeline)` walks every frame and reports `edge`
  (core body cut by the frame in a wide shot), `subject` (framed character's head
  <90% visible), `occluded`, `peek` (hider >50% covered) and `pop` (sudden visibility
  jump on a still camera). `renderDialogueScene()` renders only with zero issues;
  otherwise the pipeline falls back to the scene's normal visual.

```bash
# samples + pipeline seed + 300 random AI-like scenes, both orientations
node .scripts/animation/rig-qa.mjs --staging --fuzz=300 --out=/workspace/anim-demo/qa/v6-staging
```

`renderDialogueScene()` outputs 25fps (the pipeline's frame rate) so scenes concat cleanly.
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
# classic sample (default): node .scripts/animation/render-demo.mjs src/lib/services/animation/samples/gali-ball-classic.json /workspace/anim-demo --name=classic-v6
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

- **Per video:** Generate page → Studio settings → **Video Mode**:
  *Stock visuals* / *Mix characters* / *Full cartoon* (remembered in the
  browser; hidden when `ANIMATION_ENABLED` is off — the page asks
  `GET /api/animation`). API: POST `/api/generate` with
  `"animationMode": "off" | "mix" | "full"`; the old `"characterAnimation": true`
  still means `mix`. Jobs that don't choose follow `ANIMATION_PIPELINE_DEFAULT`
  (`full` | `mix`/`true` | `off`). Resumed jobs keep their own mode.
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

## Full cartoon mode (`animationMode: "full"`)

The whole video is one classic-style cartoon episode written by the AI from the
user's script — any language in, Hindi dialogue out:

1. `episode.js` `writeEpisode()` asks the AI (selected provider via the Gemini
   rotator, then any other configured provider: OpenAI / Anthropic) for an
   episode: hook → Golu's funny guess → the fact explained conversationally →
   humor beats + one reveal → punchline + follow sign-off. Hosts Raazu + Golu
   (Nani / Sheru optional) plus 0-2 **script-specific guests**.
2. `sanitizeEpisode()` validates it (1-3 parts of exactly 2 speakers, 6-30
   lines, ≥70 % Devanagari, known speakers, safe actions, ≤3 moves in 9:16),
   then the **staging guard** runs on every part; a failing part is simplified
   (no movement / Sheru) and re-checked.
3. Invalid → **one repair round** (errors fed back to the AI) → otherwise a
   deterministic **template episode** built from the script's own sentences
   (`templateEpisode()`), so a job never fails silently. `job.episodeMeta` /
   `video.metadata.episode.source` say `ai`, `ai-repaired` or `template`.
4. Each part is one pipeline scene (`visualType: "character"`), rendered by
   `renderDialogueScene()` (25 fps, voices only); a part that still fails at
   render time retries simplified, then falls back to a stock visual. The
   result goes through the normal `combineScenes()` → `saveVideo()` flow.

Audio: voices only. The Background Audio dropdown is respected — pick a mood
to add music; *Auto* and *None* = no music in cartoon mode.

### Guest characters (`guests.js`)

The AI describes each guest (name, role, gender, body type, skin, hair,
headwear, outfit type + colours, glasses / beard / mustache, prop, voice base +
pitch + rate). `normalizeGuestSpec()` validates every field against the rig's
parts and fills gaps from a role preset (archaeologist, scientist, king,
queen, ghost, sage, villager, teacher, explorer); `buildGuestCharacter()` maps
it onto the classic rig (new parts: headwear pith_helmet / hat / turban /
crown / cap / headscarf, bald / long hair, beard + mustache that never cover
the mouth, robe body, cape, props lantern / scroll / staff / brush / jar /
book). Voices use the two Edge Hindi voices (Madhur / Swara) with pitch kept
audibly apart from the hosts. Guest ids are derived from the spec, so resumed
jobs re-create the same guest. Sheets: `node .scripts/animation/render-guests.mjs [out.png] [guests.json]`.

### Script-driven settings (`classic/settings.js`)

Backgrounds follow the script. Every episode part carries a `setting`: a preset
name (`siberian_forest`, `siberian_blast`, `egypt_desert`, `egypt_tomb`,
`rajasthan_fort_night`, `palace_hall`, `haunted_village`, `science_lab`,
`outer_space`, `moon_surface`, … 25 in total) or a small spec:

```json
{"location": "taiga", "era": "1908", "time": "dusk", "weather": "fireball",
 "props": ["fallen_trees", "stumps"], "palette": {"skyTop": "#3E2F73"}}
```

- `normalizeSetting()` validates it (unknown location → alias match → fallback,
  bad colours dropped, max 4 props, interiors get no weather) and gives it a
  stable id `set-<hash>`. Dialogues carry `settings: {id: spec}`, so a resumed /
  re-normalized render draws the same picture (like `guests`).
- Drawn from layered parametric SVG parts (sky with sun / moon / stars / clouds /
  sky event, far range, mid layer, ground + props, translucent weather in
  front) with parallax. 20 location types × 5 times × 9 weathers × 24 props;
  the seed comes from the spec, so different scripts and parts look different.
- No setting from the AI → keywords of the script pick a preset trio
  (`settingsForText`, Hindi + English); consecutive parts that would look the
  same get a new variant / time of day (`diversifySettings`). The template
  episode now splits into 2–3 parts so even the fallback changes scene.
- Mix mode: the AI may name a preset as a character scene's `background`; when
  it does not, one is picked from the scene's narration.
- Characters get the setting's rim-light colour (fireball orange, moonlight
  blue…). Legacy `gali_day` / `haveli_night` / `plain` still work.
- Contact sheet: `node .scripts/animation/render-settings.mjs out.png [vertical] [presets]`.

### Character look (v8 "toon") and thumbnails

The thumbnails came from an image model; the video is drawn by the code rig, so
they never matched. The rig now follows the thumbnail design (default
`ANIMATION_CLASSIC_LOOK=toon`, `flat` = old look): heavier ink lines (LW 9),
two-tone cel shading on face / body / sleeves (key light from camera-left in
world space), a rim light, bigger eyes with iris + pupil + two highlights,
thicker brows, hair shine. Raazu: neat dark-brown hair with one curl, round
thin glasses, closed teal coat with mustard buttons + patch pocket, a bit
taller. Golu: red-white checked gamchha with a knot, bigger top swirl. Mouth
anchor / lip-sync and staging are unchanged (rig-qa --staging: 0 violations).

Thumbnails now come from the SAME rig + setting:
`node .scripts/animation/render-thumbnail.mjs --setting=siberian_forest --title="आसमान में | धमाका!" --dim=16x9 --out=thumb.jpg --plate=plate.png`
(`|` = line break; libass shapes the Devanagari). If an image model is used
for polish, pass the plate (+ a rig reference sheet) as reference images with
`thumbnailPrompt()` from `thumbnail.js` — it tells the model to keep the exact
rig design instead of inventing characters.

### Edge TTS resilience

`synthesizeLine()` retries Edge TTS with a long backoff (0, 3, 8, 15, 30 s;
`ANIMATION_TTS_BACKOFF` overrides) before the offline pyttsx3 voice (needs
eSpeak on Linux), and only then a placeholder (which makes the scene fall
back). After one full backoff fails, later lines try Edge once for 5 minutes.

### Automated / scheduled generation

There was no scheduler in this repo; these are the automated entry points and
both pass **no** mode, so the server default applies:

- `POST /api/generate/auto { "topic": "..." }` → `202 { jobId }` (poll
  `GET /api/jobs/<jobId>`; `?wait=1` blocks). Auth: a user's Bearer token, or
  header `x-automation-key: $AUTOMATION_SECRET` (video owned by
  `AUTOMATION_USER_ID`).
- `node .scripts/animation/auto-episode.mjs --topic="..."` or
  `--topics-file=topics.txt` (uses the next unused line, tracks `topics.txt.done`).
  Cron, daily 09:00:
  `0 9 * * * cd /path/to/ai-studio && node .scripts/animation/auto-episode.mjs --topics-file=topics.txt >> logs/auto.log 2>&1`

Env lines to make every automated video a full cartoon (do not set these on a
live server until you want it):

```
ANIMATION_ENABLED=true
ANIMATION_PIPELINE_DEFAULT=full
# optional
AUTOMATION_SECRET=<long random string>
AUTOMATION_USER_ID=<mongo user id that owns automated videos>
AUTOMATION_DIMENSION=vertical
AUTOMATION_BGM=none
AUTOMATION_PROVIDER=gemini
ANIMATION_TTS_BACKOFF=0,3,8,15,30
```

QA: `node .scripts/animation/rig-qa.mjs --staging --fuzz=300 --episode=ep.json`
adds the honey template episode, any episode JSON, and guest fuzz cases
(random preset guests replacing a speaker) to the staging report.
