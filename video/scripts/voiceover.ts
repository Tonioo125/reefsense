// The narration: one audio file per caption line, synthesised with Kokoro TTS (Apache-2.0) through
// sherpa-onnx, so the voice follows exactly the same timeline as the captions. Video.tsx places
// each file at its line's `at`, and ducks the music under it.
//
//   bun scripts/voiceover.ts           synthesise new or changed lines, then check the timing
//   bun scripts/voiceover.ts --check   only check: does every line finish before the next one starts?
//   bun scripts/voiceover.ts --asr     also transcribe every line with Whisper and flag mismatches
//   bun scripts/voiceover.ts --measure the files were re-recorded by hand: re-read their lengths
//
// Needs (all from GitHub releases, see README.md): SHERPA_ONNX_DIR, KOKORO_DIR, ffmpeg on PATH,
// and for --asr WHISPER_DIR.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SCENES, TOTAL, TRANSITION, type Line } from "../src/timeline";
import { FPS } from "../src/palette";

const ROOT = path.resolve(import.meta.dir, "..");
const OUT = path.join(ROOT, "public/voiceover");
const MANIFEST = path.join(OUT, "lines.json");

// af_heart: the highest-rated English Kokoro voice. Kokoro v1.0 speaker id 3.
const VOICE = { name: "af_heart", sid: 3, lengthScale: 1.0 };
const TARGET_LUFS = -16;
const GAP = 0.25; // seconds of quiet wanted between one line and the next

const SHERPA = process.env.SHERPA_ONNX_DIR ?? "";
const KOKORO = process.env.KOKORO_DIR ?? "";
const WHISPER = process.env.WHISPER_DIR ?? "";
const measure = process.argv.includes("--measure");
const check = process.argv.includes("--check") || measure;
const asr = process.argv.includes("--asr");

// --- Text as it should be spoken --------------------------------------------------------------
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + words(n % 100) : "");
  return words(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + words(n % 1000) : "");
}
const year = (y: number) => (y % 100 === 0 ? words(Math.floor(y / 100)) + " hundred" : words(Math.floor(y / 100)) + " " + (y % 100 < 10 ? "oh " + ONES[y % 100] : words(y % 100)));

/** Captions are written to be read; this is what Kokoro should say. Lines can override it with `say`. */
export function spoken(l: Line): string {
  let t = l.say ?? l.text;
  t = t.replace(/^\.\.\./, "").replace(/\.\.\.$/, ".");
  t = t.replace(/\bNOAA\b/g, "Noah").replace(/\bLightGBM\b/g, "Light G B M").replace(/\bReefSense\b/g, "Reef Sense")
    .replace(/\biNaturalist\b/g, "I Naturalist").replace(/\bDHW\b/g, "degree heating weeks").replace(/(\d)\s?km\b/g, "$1 kilometres")
    .replace(/reefsense\.online/g, "reef sense dot online").replace(/\bNusa Penida\b/g, "Noosa Peneeda");
  t = t.replace(/\b(19|20)(\d\d)\b(?!,\d)/g, (m) => year(+m));
  t = t.replace(/\d{1,3}(,\d{3})+|\d+/g, (m) => words(+m.replace(/,/g, "")));
  t = t.replace(/%/g, " percent").replace(/\s+/g, " ").trim();
  return t;
}

// --- Tools --------------------------------------------------------------------------------------
function run(cmd: string, args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr || r.stdout}`);
  return r.stdout + r.stderr;
}
const sherpaEnv = () => ({ LD_LIBRARY_PATH: path.join(SHERPA, "lib") + ":" + (process.env.LD_LIBRARY_PATH ?? "") });
const duration = (file: string) => +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim();

function synthesise(text: string, out: string) {
  const raw = out.replace(/\.mp3$/, ".raw.wav");
  run(path.join(SHERPA, "bin/sherpa-onnx-offline-tts"), [
    `--kokoro-model=${path.join(KOKORO, "model.onnx")}`, `--kokoro-voices=${path.join(KOKORO, "voices.bin")}`,
    `--kokoro-tokens=${path.join(KOKORO, "tokens.txt")}`, `--kokoro-data-dir=${path.join(KOKORO, "espeak-ng-data")}`,
    `--kokoro-lexicon=${path.join(KOKORO, "lexicon-us-en.txt")}`, `--kokoro-length-scale=${VOICE.lengthScale}`,
    `--sid=${VOICE.sid}`, "--num-threads=4", `--output-filename=${raw}`, text,
  ], sherpaEnv());
  // Trim the silence Kokoro leaves at both ends, then bring every line to the same loudness.
  const trim = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse";
  const meter = run("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", `${trim},ebur128=framelog=quiet`, "-f", "null", "-"]);
  const lufs = +(meter.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0] ?? TARGET_LUFS);
  run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af",
    `${trim},highpass=f=70,volume=${(TARGET_LUFS - lufs).toFixed(2)}dB,alimiter=limit=0.89:level=false,aresample=48000`,
    "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", out]);
  fs.rmSync(raw);
}

function transcribe(file: string): string {
  const wav = file.replace(/\.mp3$/, ".asr.wav");
  run("ffmpeg", ["-y", "-v", "error", "-i", file, "-ar", "16000", "-ac", "1", wav]);
  const outText = run(path.join(SHERPA, "bin/sherpa-onnx-offline"), [
    `--whisper-encoder=${path.join(WHISPER, "base.en-encoder.onnx")}`, `--whisper-decoder=${path.join(WHISPER, "base.en-decoder.onnx")}`,
    `--tokens=${path.join(WHISPER, "base.en-tokens.txt")}`, "--num-threads=4", wav,
  ], sherpaEnv());
  fs.rmSync(wav);
  return outText.match(/"text":\s*"([^"]*)"/)?.[1]?.trim() ?? "";
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
function wordErrors(ref: string, hyp: string) {
  const a = norm(ref), b = norm(hyp);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / Math.max(1, a.length);
}

// --- Main ---------------------------------------------------------------------------------------
type Entry = { file: string; seconds: number; hash: string };
const manifest: Record<string, Entry[]> = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
fs.mkdirSync(OUT, { recursive: true });

// --measure: the files were replaced (e.g. by a human recording); re-read their lengths.
if (measure) {
  for (const entries of Object.values(manifest))
    for (const e of entries) e.seconds = +duration(path.join(ROOT, "public", e.file)).toFixed(3);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

if (!check) {
  if (!SHERPA || !KOKORO) throw new Error("Set SHERPA_ONNX_DIR and KOKORO_DIR (see README.md).");
  const next: Record<string, Entry[]> = {};
  for (const s of SCENES) {
    next[s.id] = s.lines.map((l, i) => {
      const text = spoken(l);
      const hash = crypto.createHash("sha1").update(`${VOICE.name}|${VOICE.lengthScale}|${text}`).digest("hex").slice(0, 12);
      const file = `voiceover/${s.id}-${i + 1}.mp3`;
      const old = manifest[s.id]?.[i];
      if (old?.hash === hash && fs.existsSync(path.join(ROOT, "public", file))) return old;
      synthesise(text, path.join(ROOT, "public", file));
      const seconds = +duration(path.join(ROOT, "public", file)).toFixed(3);
      console.log(`synthesised ${file} (${seconds.toFixed(2)} s): ${text}`);
      return { file, seconds, hash };
    });
  }
  // Drop files of lines that no longer exist.
  const keep = new Set(Object.values(next).flat().map((e) => path.basename(e.file)));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".mp3") && !keep.has(f)) fs.rmSync(path.join(OUT, f));
  fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + "\n");
  Object.assign(manifest, next);
}

// Timing check: each line must end GAP before the next line (or the transition into the next scene).
let problems = 0, t = 0, speech = 0;
const fmt = (s: number) => {
  const d = Math.round(s * 10);
  return `${Math.floor(d / 600)}:${((d % 600) / 10).toFixed(1).padStart(4, "0")}`;
};
for (const s of SCENES) {
  const end = s.seconds - TRANSITION / FPS;
  s.lines.forEach((l, i) => {
    const e = manifest[s.id]?.[i];
    const until = i + 1 < s.lines.length ? s.lines[i + 1].at : end;
    if (!e) { console.log(`MISSING  ${s.id}#${i + 1}`); problems++; return; }
    const slack = until - l.at - e.seconds;
    speech += e.seconds;
    const flag = slack < GAP ? "TOO LONG" : "ok      ";
    if (slack < GAP) problems++;
    console.log(`${flag} ${fmt(t + l.at)} ${s.id}#${i + 1}  ${e.seconds.toFixed(2)} s of ${(until - l.at).toFixed(2)} s  (slack ${slack.toFixed(2)})`);
    if (asr && WHISPER) {
      const heard = transcribe(path.join(ROOT, "public", e.file));
      const wer = wordErrors(spoken(l), spoken({ at: 0, text: heard }));
      if (wer > 0.1) console.log(`         heard (${Math.round(wer * 100)}% off): ${heard}`);
    }
  });
  t += s.seconds - TRANSITION / FPS;
}
console.log(`\nTotal ${fmt(TOTAL / FPS)}, ${speech.toFixed(1)} s of speech, ${problems} problem(s).`);
if (problems) process.exitCode = 1;
