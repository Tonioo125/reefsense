// The soundtrack: an original ambient piece synthesised from scratch (no samples, nothing to
// license), written to public/music.mp3. D major, 84 BPM: a warm pad over Dmaj9 – Bm9 – Gmaj9 –
// Asus, with layers that follow the video's sections (read from src/timeline.ts):
//   hook + problem   pad (filter closed) and a slow ocean wash
//   solution         bass and bells come in, the pad opens
//   live demo        a soft kalimba arpeggio and shaker carry the screen recordings
//   how + results    the shaker drops out, the arpeggio thins
//   close            the arpeggio leaves; Asus resolves to Dmaj9 on "ReefSense. See the risk..."
// Video.tsx ducks it under the narration.
//
//   bun scripts/music.ts        (needs ffmpeg on PATH)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FPS } from "../src/palette";
import { SCENES, SCENE_START, TOTAL } from "../src/timeline";

const ROOT = path.resolve(import.meta.dir, "..");
const SR = 48000;
const SECONDS = TOTAL / FPS + 3;
const N = Math.ceil(SECONDS * SR);
const BEAT = 60 / 84, BAR = 4 * BEAT, EIGHTH = BEAT / 2;

// --- Where the sections fall --------------------------------------------------------------------
const at = (id: string) => SCENE_START[id] / FPS;
const close = SCENES.find((s) => s.id === "close")!;
const T = {
  solution: at("solution"), demo: at("hero"), how: at("how"), close: at("close"),
  resolve: at("close") + close.lines[1].at, end: TOTAL / FPS,
};
const barOf = (t: number) => Math.round(t / BAR);

// --- Harmony --------------------------------------------------------------------------------------
type Chord = { bass: number; pad: number[]; arp: number[] };
const CHORDS: Record<string, Chord> = {
  Dmaj9: { bass: 38, pad: [50, 54, 57, 61, 64], arp: [62, 66, 69, 73, 76, 78] },
  Bm9: { bass: 35, pad: [50, 54, 57, 59, 61], arp: [59, 62, 66, 69, 73, 74] },
  Gmaj9: { bass: 43, pad: [50, 54, 57, 59, 62], arp: [59, 62, 66, 67, 69, 74] },
  Asus: { bass: 45, pad: [50, 52, 57, 59, 64], arp: [57, 62, 64, 69, 71, 76] },
};
const LOOP = ["Dmaj9", "Bm9", "Gmaj9", "Asus"];
const resolveBar = barOf(T.resolve);
/** Chord name for a bar: the loop changes every 2 bars; it lands on Asus, then holds Dmaj9 at the end. */
function chordAt(bar: number): string {
  if (bar >= resolveBar) return "Dmaj9";
  if (bar >= resolveBar - 2) return "Asus";
  return LOOP[Math.floor(bar / 2) % LOOP.length];
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// --- Buffers --------------------------------------------------------------------------------------
const L = new Float32Array(N), R = new Float32Array(N);       // dry mix
const VL = new Float32Array(N), VR = new Float32Array(N);     // reverb send
const DL = new Float32Array(N);                               // delay send (arpeggio)

let seed = 1234567;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** A level that ramps from a to b over [t0, t1] (seconds). */
const ramp = (t: number, t0: number, t1: number, a: number, b: number) => a + (b - a) * smooth((t - t0) / (t1 - t0));

// Section levels over time (0..1), crossfaded over a couple of bars.
const lv = {
  bass: (t: number) => ramp(t, T.solution - 0.5, T.solution + BAR, 0, 1) * ramp(t, T.end - 3, T.end + 1, 1, 0),
  bells: (t: number) => ramp(t, T.solution, T.solution + 2 * BAR, 0, 1) * ramp(t, T.resolve + 2, T.end, 1, 0.6),
  arp: (t: number) => ramp(t, T.demo - 0.5, T.demo + 2 * BAR, 0, 1) * ramp(t, T.how, T.how + 2 * BAR, 1, 0.65) * ramp(t, T.close - BAR, T.close + 2 * BAR, 1, 0),
  shaker: (t: number) => ramp(t, T.demo + 2 * BAR, T.demo + 4 * BAR, 0, 1) * ramp(t, T.how - BAR, T.how + BAR, 1, 0),
  ocean: (t: number) => ramp(t, 0, 3, 0.4, 1) * ramp(t, T.solution, T.solution + 3 * BAR, 1, 0.25) * ramp(t, T.close - BAR, T.close + 2 * BAR, 1, 3.2),
  padCutoff: (t: number) => ramp(t, 0, T.solution, 520, 900) + ramp(t, T.solution, T.demo + 2 * BAR, 0, 700) - ramp(t, T.how, T.how + 4 * BAR, 0, 250) + ramp(t, T.close, T.resolve, 0, 450),
  pad: (t: number) => ramp(t, 0, 4, 0, 1) * ramp(t, T.end - 6, T.end + 0.5, 1, 0),
};

// --- Pad: detuned PolyBLEP saws per note, a slow attack, crossfading between chords ---------------
function polyblep(t: number, dt: number) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
const padL = new Float32Array(N), padR = new Float32Array(N);
function renderPad() {
  const bars = Math.ceil(SECONDS / BAR);
  // Group consecutive bars with the same chord into one segment.
  const segs: { chord: string; t0: number; t1: number }[] = [];
  for (let b = 0; b < bars; b++) {
    const c = chordAt(b), last = segs[segs.length - 1];
    if (last && last.chord === c) last.t1 = (b + 1) * BAR;
    else segs.push({ chord: c, t0: b * BAR, t1: (b + 1) * BAR });
  }
  const ATT = 1.6, REL = 2.2, DET = [-0.11, 0, 0.12]; // detune in semitones
  for (const sg of segs) {
    const notes = CHORDS[sg.chord].pad;
    notes.forEach((m, vi) => {
      const pan = (vi / (notes.length - 1)) * 1.2 - 0.6;
      DET.forEach((d, oi) => {
        const f = hz(m + d);
        const p = Math.min(1, Math.max(-1, pan + (oi - 1) * 0.35));
        const gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4);
        let ph = rand();
        const i0 = Math.floor(Math.max(0, sg.t0 - 0.3) * SR), i1 = Math.min(N, Math.floor((sg.t1 + REL * 2) * SR));
        for (let i = i0; i < i1; i++) {
          const t = i / SR;
          const vib = 1 + 0.0009 * Math.sin(2 * Math.PI * (0.13 + vi * 0.03) * t + oi);
          const dt = (f * vib) / SR;
          ph += dt; if (ph >= 1) ph -= 1;
          const saw = 2 * ph - 1 - polyblep(ph, dt);
          const env = smooth((t - sg.t0 + 0.3) / ATT) * (t < sg.t1 ? 1 : Math.exp(-(t - sg.t1) / (REL / 3)));
          const s = saw * env * 0.022 * (m < 52 ? 0.8 : 1);
          padL[i] += s * gl; padR[i] += s * gr;
        }
      });
    });
  }
  // Two-pole low-pass that opens with the sections, then into the mix and the reverb.
  let l1 = 0, l2 = 0, r1 = 0, r2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fc = lv.padCutoff(t) * (1 + 0.12 * Math.sin(2 * Math.PI * t / 23));
    const g = 1 - Math.exp(-2 * Math.PI * fc / SR);
    l1 += g * (padL[i] - l1); l2 += g * (l1 - l2);
    r1 += g * (padR[i] - r1); r2 += g * (r1 - r2);
    const a = lv.pad(t);
    L[i] += l2 * a; R[i] += r2 * a;
    VL[i] += l2 * a * 0.55; VR[i] += r2 * a * 0.55;
  }
}

// --- Bass: a round sine on the root, following the chord ------------------------------------------
function renderBass() {
  let ph = 0, f = hz(38), env = 0, lastChord = "";
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const c = chordAt(Math.floor(t / BAR));
    if (c !== lastChord) { lastChord = c; env = Math.min(env, 0.35); }
    const target = hz(CHORDS[c].bass);
    f += (target - f) * 0.0008; // a slow glide between roots
    env += (1 - env) * (1 / (0.5 * SR));
    ph += f / SR; if (ph >= 1) ph -= 1;
    const s = (Math.sin(2 * Math.PI * ph) + 0.22 * Math.sin(4 * Math.PI * ph)) * 0.032 * env * lv.bass(t);
    L[i] += s; R[i] += s;
  }
}

// --- Arpeggio: a soft kalimba pluck on 8th notes, into a ping-pong delay ---------------------------
function pluck(t0: number, m: number, vel: number, pan: number, bright: number) {
  const f = hz(m), i0 = Math.floor(t0 * SR), len = Math.floor(1.6 * SR);
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let k = 0; k < len && i0 + k < N; k++) {
    const t = k / SR;
    const att = Math.min(1, t / 0.004);
    const s = att * vel * (
      Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.55) +
      0.28 * bright * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t / 0.18) +
      0.1 * bright * Math.sin(2 * Math.PI * 4.07 * f * t) * Math.exp(-t / 0.05));
    const i = i0 + k;
    L[i] += s * gl; R[i] += s * gr;
    DL[i] += s * 0.5;
    VL[i] += s * gl * 0.35; VR[i] += s * gr * 0.35;
  }
}
function renderArp() {
  const PATTERN = [0, 2, 4, 1, 3, 2, 5, 1, 0, 3, 4, 2, 5, 3, 1, 4];
  const steps = Math.floor(SECONDS / EIGHTH);
  for (let n = 0; n < steps; n++) {
    const t = n * EIGHTH;
    const level = lv.arp(t);
    if (level < 0.01) continue;
    const bar = Math.floor(t / BAR);
    // Thinner when the arpeggio is pulled back (how + results): drop some off-beats.
    if (level < 0.8 && n % 2 === 1 && PATTERN[n % 16] % 2 === 1) continue;
    const arp = CHORDS[chordAt(bar)].arp;
    const m = arp[PATTERN[(n + bar * 3) % 16] % arp.length];
    const accent = n % 8 === 0 ? 1 : n % 2 === 0 ? 0.78 : 0.62;
    const humanise = (rand() - 0.5) * 0.008;
    pluck(t + humanise, m, 0.075 * level * accent * (0.9 + 0.2 * rand()), n % 2 ? 0.35 : -0.35, 0.8 + 0.4 * rand());
  }
}

// --- Bells: a soft FM bell on chord changes -------------------------------------------------------
function renderBells() {
  const bars = Math.ceil(SECONDS / BAR);
  for (let b = 0; b < bars; b += 2) {
    const t0 = b * BAR + BEAT * 0.02;
    const level = lv.bells(t0);
    if (level < 0.01) continue;
    const arp = CHORDS[chordAt(b)].arp;
    const m = arp[(b / 2 * 2 + 3) % arp.length] + 12;
    const f = hz(m), i0 = Math.floor(t0 * SR), len = Math.floor(5 * SR);
    const pan = ((b / 2) % 3 - 1) * 0.5;
    const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    for (let k = 0; k < len && i0 + k < N; k++) {
      const t = k / SR;
      const idx = 1.6 * Math.exp(-t / 0.9);
      const s = Math.min(1, t / 0.006) * Math.exp(-t / 1.8) * Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * 3.5 * f * t)) * 0.045 * level;
      L[i0 + k] += s * gl; R[i0 + k] += s * gr;
      VL[i0 + k] += s * gl * 1.1; VR[i0 + k] += s * gr * 1.1;
    }
  }
}

// --- Ocean wash and shaker: filtered noise ---------------------------------------------------------
function renderNoise() {
  let al = 0, bl = 0, ar = 0, br = 0, hl = 0, hr = 0, pl = 0, pr = 0, hp = 0, hpPrev = 0;
  const hpA = Math.exp(-2 * Math.PI * 120 / SR);
  let shakerEnv = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // Noise band-passed (120 Hz to a cutoff that rises with each swell), swelling like slow waves
    // (7.5 s), decorrelated left and right.
    const wave = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / 7.5 - Math.PI / 2), 1.6);
    const g = 1 - Math.exp(-2 * Math.PI * (320 + 900 * wave) / SR);
    const nl = rand() * 2 - 1, nr = rand() * 2 - 1;
    al += g * (nl - al); bl += g * (al - bl); ar += g * (nr - ar); br += g * (ar - br);
    hl = hpA * (hl + bl - pl); pl = bl; hr = hpA * (hr + br - pr); pr = br;
    const o = (0.2 + 0.8 * wave) * 0.28 * lv.ocean(t);
    L[i] += hl * o; R[i] += hr * o;
    VL[i] += hl * o * 0.3; VR[i] += hr * o * 0.3;
    // Shaker: short high-passed noise bursts on 8ths, accented off-beats.
    const sl = lv.shaker(t);
    if (sl > 0.001) {
      const pos = t / EIGHTH, n = Math.floor(pos), frac = (pos - n) * EIGHTH;
      shakerEnv = Math.exp(-frac / (n % 2 ? 0.035 : 0.022)) * (n % 2 ? 1 : 0.55);
      const w = rand() * 2 - 1;
      hp = 0.82 * (hp + w - hpPrev); hpPrev = w; // one-pole high-pass, ~1.7 kHz
      const s = hp * shakerEnv * 0.024 * sl;
      L[i] += s * 0.8; R[i] += s;
      VL[i] += s * 0.3; VR[i] += s * 0.3;
    }
  }
}

// --- Effects: ping-pong delay, then Freeverb ---------------------------------------------------------
function delay() {
  const d = Math.floor(BEAT * 0.75 * SR); // dotted 8th
  const bufL = new Float32Array(d), bufR = new Float32Array(d);
  let p = 0, lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const outL = bufL[p], outR = bufR[p];
    lpL += 0.35 * (outR - lpL); lpR += 0.35 * (outL - lpR); // darker repeats, crossed (ping-pong)
    bufL[p] = DL[i] + lpL * 0.38; bufR[p] = lpR * 0.38;
    L[i] += outL * 0.5; R[i] += outR * 0.5;
    VL[i] += outL * 0.3; VR[i] += outR * 0.3;
    p = (p + 1) % d;
  }
}
function freeverb() {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225], spread = 23;
  const room = 0.92, damp = 0.35, wet = 0.4;
  const run = (input: Float32Array, off: number) => {
    const out = new Float32Array(N);
    const cb = combs.map((c) => ({ buf: new Float32Array(Math.floor((c + off) * scale)), p: 0, store: 0 }));
    const ab = alls.map((a) => ({ buf: new Float32Array(Math.floor((a + off) * scale)), p: 0 }));
    for (let i = 0; i < N; i++) {
      const x = input[i] * 0.015;
      let s = 0;
      for (const c of cb) {
        const y = c.buf[c.p];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.p] = x + c.store * room;
        if (++c.p >= c.buf.length) c.p = 0;
        s += y;
      }
      for (const a of ab) {
        const b = a.buf[a.p];
        a.buf[a.p] = s + b * 0.5;
        s = b - s;
        if (++a.p >= a.buf.length) a.p = 0;
      }
      out[i] = s;
    }
    return out;
  };
  const wl = run(VL, 0), wr = run(VR, spread);
  for (let i = 0; i < N; i++) { L[i] += wl[i] * wet * 3; R[i] += wr[i] * wet * 3; }
}

// --- Render ------------------------------------------------------------------------------------------
const t0 = Date.now();
// Level of each layer in two windows (intro, live demo), so the balance can be checked without ears.
const windows = { intro: [2, T.solution - 1], demo: [T.demo + 15, T.demo + 45] } as const;
const energy = ([a, b]: readonly [number, number]) => {
  let e = 0;
  for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) e += L[i] * L[i] + R[i] * R[i];
  return e;
};
const balance: Record<string, string> = {};
for (const [name, step] of Object.entries({ pad: renderPad, bass: renderBass, arp: renderArp, bells: renderBells, noise: renderNoise, delay, reverb: freeverb })) {
  const before = Object.values(windows).map(energy);
  step();
  balance[name] = Object.values(windows).map((w, k) => {
    const rms = Math.sqrt(Math.max(0, energy(w) - before[k]) / ((w[1] - w[0]) * SR * 2));
    return rms > 0 ? `${(20 * Math.log10(rms)).toFixed(1)} dB` : "-";
  }).join(" / ");
}
console.log("layer RMS (intro / demo):", balance);
// DC blocker, then a 16-bit WAV.
let xl = 0, yl = 0, xr = 0, yr = 0, peak = 0;
for (let i = 0; i < N; i++) {
  yl = L[i] - xl + 0.9995 * yl; xl = L[i]; L[i] = yl;
  yr = R[i] - xr + 0.9995 * yr; xr = R[i]; R[i] = yr;
  peak = Math.max(peak, Math.abs(yl), Math.abs(yr));
}
const gain = 0.7 / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4);
}
const tmp = path.join(ROOT, "out/music.wav");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, wav);
console.log(`synthesised ${SECONDS.toFixed(1)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s`, T);

// Rumble filter, two-pass EBU R128 loudness to -20 LUFS (the narration sits at -16), then MP3.
const ff = (args: string[]) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
};
const m = JSON.parse(ff(["-i", tmp, "-af", "highpass=f=40:poles=2,loudnorm=I=-20:TP=-2:LRA=11:print_format=json", "-f", "null", "-"]).match(/\{[\s\S]*\}/)![0]);
ff(["-y", "-i", tmp, "-af",
  `highpass=f=40:poles=2,loudnorm=I=-20:TP=-2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
  "-c:a", "libmp3lame", "-b:a", "192k", path.join(ROOT, "public/music.mp3")]);
fs.rmSync(tmp);
console.log("wrote public/music.mp3", { measured: m.input_i, lra: m.input_lra });
