import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import voiceoverLines from "../public/voiceover/lines.json";
import { FPS } from "./palette";
import { Clip, Close, Hook, How, Problem, Results, Solution } from "./scenes";
import { SCENES, SCENE_START, TOTAL, TRANSITION, sceneFrames } from "./timeline";

export type DemoProps = { voiceover: boolean; music: boolean };

// --- Sound -------------------------------------------------------------------------------------
// Narration: one file per caption line (scripts/voiceover.ts), started on the caption's own frame.
// Music: public/music.mp3 (scripts/music.ts), ducked under the voice and faded at both ends.
const VO: Record<string, { file: string; seconds: number }[]> = voiceoverLines;
const SPEECH = SCENES.flatMap((s) =>
  s.lines.flatMap((l, i) => {
    const e = VO[s.id]?.[i];
    if (!e) return [];
    const from = SCENE_START[s.id] + Math.round(l.at * FPS);
    return [{ key: `${s.id}-${i}`, file: e.file, from, to: from + Math.ceil(e.seconds * FPS) }];
  }),
);

const MUSIC = { full: 0.75, under: 0.28, attack: 8, release: 24, bridge: 1.4 * FPS };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Lines less than `bridge` apart count as one passage, so the music does not pump between them.
const PASSAGES = SPEECH.reduce<{ from: number; to: number }[]>((out, s) => {
  const last = out[out.length - 1];
  if (last && s.from - last.to < MUSIC.bridge) last.to = Math.max(last.to, s.to);
  else out.push({ from: s.from, to: s.to });
  return out;
}, []);

const musicVolume = (f: number) => {
  let duck = 0;
  for (const p of PASSAGES) {
    const d = f < p.from ? (p.from - f) / MUSIC.attack : f > p.to ? (f - p.to) / MUSIC.release : 0;
    duck = Math.max(duck, 1 - Math.min(1, d));
  }
  const level = MUSIC.full + (MUSIC.under - MUSIC.full) * duck;
  const edges = Math.min(interpolate(f, [0, FPS], [0, 1], clamp), interpolate(f, [TOTAL - 4 * FPS, TOTAL - 1], [1, 0], clamp));
  return level * edges;
};

export const ReefSenseDemo: React.FC<DemoProps> = ({ voiceover, music }) => {
  let clipIndex = 0;
  return (
    <AbsoluteFill style={{ background: "#03121F" }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const body =
            s.kind === "hook" ? <Hook scene={s} /> :
            s.kind === "problem" ? <Problem scene={s} /> :
            s.kind === "solution" ? <Solution scene={s} /> :
            s.kind === "clip" ? <Clip scene={s} index={++clipIndex} /> :
            s.kind === "how" ? <How scene={s} /> :
            s.kind === "results" ? <Results scene={s} /> : <Close scene={s} />;
          const seq = <TransitionSeries.Sequence key={s.id} durationInFrames={sceneFrames(s)}>{body}</TransitionSeries.Sequence>;
          return i === 0 ? [seq] : [
            <TransitionSeries.Transition key={s.id + "-t"} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />,
            seq,
          ];
        })}
      </TransitionSeries>
      {voiceover &&
        SPEECH.map((s) => (
          <Sequence key={s.key} from={s.from} durationInFrames={s.to - s.from + FPS} layout="none">
            <Audio src={staticFile(s.file)} />
          </Sequence>
        ))}
      {music && <Audio src={staticFile("music.mp3")} volume={musicVolume} />}
    </AbsoluteFill>
  );
};
