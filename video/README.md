# ReefSense demo video (Remotion)

A 3:27, 1920×1080 demo for the ForgeHacks submission: the problem, the live app, how the AI works and how it was tested. Every product shot is a real recording of https://www.reefsense.online. Remotion adds the titles, captions, the browser frame, the 3D entrance, camera zooms and the callout cards.

```
capture/record.mjs   Playwright: records 7 shots of the live site → public/clips/*.webm + clips.json (trim points)
src/timeline.ts      every scene's length, captions, camera keyframes and callouts (edit here to re-time)
src/scenes.tsx       hook, problem, solution, demo clips, how it works, results, close
src/motion.tsx       camera zoom, callout cards, 3D stage, hero chips
VOICEOVER.md         narration script, generated from the timeline (node scripts-voiceover.mjs)
```

## Make it

```bash
cd video && npm install
cd capture && npm install && npx playwright install chromium && node record.mjs && cd ..
# Remotion seeks MP4 much faster than WebM:
for f in public/clips/0*.webm; do ffmpeg -y -i "$f" -c:v libx264 -crf 18 -g 15 -pix_fmt yuv420p -r 30 -an "${f%.webm}.mp4"; done
npm run studio      # preview in the browser
npm run render      # → out/reefsense-demo.mp4
npm run thumbnail   # → out/thumbnail.png
```

Remotion's compositor needs glibc 2.35 or newer (Ubuntu 22.04+ is fine). The clips are git-ignored (about 200 MB); run `record.mjs` to recreate them.

## Add your voice

1. Read `VOICEOVER.md` and record it as `public/voiceover.mp3`. Each line has its start time.
2. If your pace differs, change the `at:` times (or scene `seconds`) in `src/timeline.ts`, then run `node scripts-voiceover.mjs`.
3. `npx remotion render src/index.ts ReefSenseDemo out/reefsense-demo.mp4 --props='{"voiceover":true}'`

Optional background music: put a royalty-free track at `public/music.mp3` and add `"music":true` to the props.
