import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Clip, Close, Hook, How, Problem, Results, Solution } from "./scenes";
import { SCENES, TRANSITION, sceneFrames } from "./timeline";

export type DemoProps = { voiceover: boolean; music: boolean };

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
      {/* Optional: put a recorded narration at public/voiceover.mp3 and render with --props='{"voiceover":true}'. */}
      {voiceover && <Audio src={staticFile("voiceover.mp3")} />}
      {music && <Audio src={staticFile("music.mp3")} volume={0.12} />}
    </AbsoluteFill>
  );
};
