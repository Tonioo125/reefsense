// Writes VOICEOVER.md (the narration script, with each line's start time and audio file) from
// src/timeline.ts, so the script, the captions and the voice never drift apart. Also warns when a
// narrated line runs into the next one. Runs with Node (bundling the timeline with esbuild, as in CI)
// or with Bun (which imports it directly).
import fs from "node:fs";
async function timeline() {
  if (typeof Bun !== "undefined") return import("./src/timeline.ts");
  const { build } = await import("esbuild");
  const out = await build({ entryPoints: ["src/timeline.ts"], bundle: true, format: "esm", write: false, platform: "node", loader: { ".json": "json" } });
  return import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
}
const { SCENES, TRANSITION, TOTAL } = await timeline();
const vo = fs.existsSync("public/voiceover/lines.json") ? JSON.parse(fs.readFileSync("public/voiceover/lines.json", "utf8")) : {};
let t = 0, words = 0, late = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let md = `# ReefSense demo: voiceover script

Generated from \`src/timeline.ts\` by \`node scripts-voiceover.mjs\` (the same text as the captions). Total length ${fmt(TOTAL / 30)}.
The narration is synthesised line by line with Kokoro TTS (\`bun scripts/voiceover.ts\`, voice af_heart) into the files below,
and each file starts on its caption. To use a human voice instead, record each line into the same file, then run
\`bun scripts/voiceover.ts --measure\`.

`;
for (const s of SCENES) {
  md += `## ${fmt(t)} · ${s.label ?? s.id[0].toUpperCase() + s.id.slice(1)}\n\n`;
  const end = s.seconds - TRANSITION / 30;
  s.lines.forEach((l, i) => {
    const e = vo[s.id]?.[i];
    md += `- **${fmt(t + l.at)}** ${l.text}${e ? ` <sub>\`${e.file}\`, ${e.seconds.toFixed(1)} s</sub>` : ""}\n`;
    words += l.text.split(/\s+/).length;
    const until = i + 1 < s.lines.length ? s.lines[i + 1].at : end;
    if (e && l.at + e.seconds > until) {
      late++;
      console.warn(`warning: ${s.id} line ${i + 1} runs ${(l.at + e.seconds - until).toFixed(2)} s into the next line`);
    }
  });
  md += "\n";
  t += s.seconds - TRANSITION / 30;
}
md += `_${words} words._\n`;
fs.writeFileSync("VOICEOVER.md", md);
console.log(fmt(TOTAL / 30), words, "words", late ? `, ${late} line(s) overlapping` : "");
