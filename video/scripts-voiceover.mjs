// Writes VOICEOVER.md from src/timeline.ts, so the narration and the captions never drift apart.
import fs from "node:fs";
import { build } from "esbuild";
const out = await build({ entryPoints: ["src/timeline.ts"], bundle: true, format: "esm", write: false, platform: "node",
  external: ["@remotion/*"], loader: { ".json": "json" }, plugins: [{ name: "stub", setup(b) {
    b.onResolve({ filter: /^\.\/(theme|motion)$/ }, (a) => ({ path: a.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const FPS=30; export const C={};", loader: "js" }));
  } }] });
const { SCENES, TRANSITION, TOTAL } = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
let t = 0, words = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let md = `# ReefSense demo: voiceover script\n\nGenerated from \`src/timeline.ts\` (the same text as the captions). Total length ${fmt(TOTAL / 30)}.\nRead at a calm pace; each line starts at its timestamp. Record as \`public/voiceover.mp3\`, then render with \`--props='{"voiceover":true}'\`.\n\n`;
for (const s of SCENES) {
  md += `## ${fmt(t)} · ${s.label ?? s.id[0].toUpperCase() + s.id.slice(1)}\n\n`;
  for (const l of s.lines) { md += `- **${fmt(t + l.at)}** ${l.text}\n`; words += l.text.split(/\s+/).length; }
  md += "\n";
  t += s.seconds - TRANSITION / 30;
}
md += `_${words} words._\n`;
fs.writeFileSync("VOICEOVER.md", md);
console.log(fmt(TOTAL / 30), words, "words");
