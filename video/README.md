# ReefSense demo video (Remotion)

A 1920×1080 demo for the ForgeHacks submission, under 4 minutes: the problem, the live app (including a tour of the reef dashboard), how the AI works and how it was tested. Every product shot is a real recording of https://www.reefsense.online. Remotion adds the titles, captions, the browser frame, the 3D entrance, camera zooms, callout cards, the narration and the music.

```
capture/record.mjs     Playwright: records 8 shots of the live site → public/clips/*.webm + clips.json (trim points, beats)
src/timeline.ts        every scene's length, captions (= narration), camera keyframes and callouts
src/scenes.tsx         hook, problem, solution, demo clips, how it works, results, close
src/motion.tsx         camera zoom, callout cards, 3D stage, hero chips
src/Video.tsx          the scenes, plus the sound: one narration file per caption, music ducked under it
scripts/voiceover.ts   narration with Kokoro TTS → public/voiceover/*.mp3 + lines.json (lengths)
scripts/music.ts       the soundtrack, synthesised from scratch (no samples) → public/music.mp3
VOICEOVER.md           the narration script with timestamps (node scripts-voiceover.mjs)
```

## Make it

The easy way is CI: `.github/workflows/demo-video.yml` records the site and renders on a GitHub runner. Push to `demo/video` with `[render]` in the commit message (the video is uploaded as the `reefsense-demo` artifact), or `[publish]` to also commit it to `demo/`.

Locally:

```bash
cd video && npm install
cd capture && npm install && npx playwright install chromium && node record.mjs && cd ..
# Remotion seeks MP4 much faster than WebM:
for f in public/clips/0*.webm; do ffmpeg -y -i "$f" -c:v libx264 -crf 18 -g 15 -pix_fmt yuv420p -r 30 -an "${f%.webm}.mp4"; done
npm run studio      # preview in the browser
npm run render      # → out/reefsense-demo.mp4 (narration and music on by default)
npm run thumbnail   # → out/thumbnail.png
```

Remotion's compositor needs glibc 2.35 or newer (Ubuntu 22.04+ is fine). The clips are git-ignored (about 200 MB); run `record.mjs` to recreate them. The narration and music are committed, so a render needs no extra tools.

## Change the words

Captions and narration are the same text, in `src/timeline.ts`. After editing a line:

```bash
bun scripts/voiceover.ts          # re-synthesises changed lines, then checks every line ends before the next
bun scripts/voiceover.ts --asr    # optional: transcribes each line with Whisper to catch mispronunciations
node scripts-voiceover.mjs        # refresh VOICEOVER.md
```

`voiceover.ts` needs [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx/releases) (`linux-x64-shared`), the Kokoro v1.0 model (`kokoro-multi-lang-v1_0` from its `tts-models` release; voice af_heart) and ffmpeg on `PATH`: set `SHERPA_ONNX_DIR` and `KOKORO_DIR`, and `WHISPER_DIR` (`sherpa-onnx-whisper-base.en`, `asr-models` release) for `--asr`. A line can set `say` when it should be read differently from how it is written. Numbers, NOAA, LightGBM and place names are spelled out for the voice in `spoken()`.

Every shot paces itself to its narration: `record.mjs` waits for each line (lengths from `public/voiceover/lines.json`) before the next step and logs beats (line starts, clicks, scrolls), which `timeline.ts` uses for that scene's captions, voice, camera and callouts. So the video stays in sync on a slow machine, and after changing a line you re-record its shot (`ONLY=04-dashboard node record.mjs`).

To use a human voice, record each line into its file in `public/voiceover/` (names are in `VOICEOVER.md`), then `bun scripts/voiceover.ts --measure`.

## Music

`bun scripts/music.ts` writes `public/music.mp3` (-20 LUFS): an ambient piece in D major whose layers follow the video's sections (bass at the solution, an arpeggio under the live demo, a resolve on the closing line). It reads the section times from the timeline (which depend on the recording), so CI regenerates it after recording; locally, rerun it after `record.mjs`. `Video.tsx` ducks it under the narration.

Render without sound with `--props='{"voiceover":false,"music":false}'`.
