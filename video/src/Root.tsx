import React from "react";
import { Composition, Still } from "remotion";
import { ReefSenseDemo, type DemoProps } from "./Video";
import { Hook } from "./scenes";
import { SCENES, TOTAL } from "./timeline";
import { FPS, H, W } from "./palette";

export const Root: React.FC = () => (
  <>
    <Composition
      id="ReefSenseDemo"
      component={ReefSenseDemo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ voiceover: true, music: true } satisfies DemoProps}
    />
    {/* YouTube thumbnail: the hook frame, rendered at 1920x1080 (YouTube accepts it). */}
    <Still id="Thumbnail" component={() => <Hook scene={{ ...SCENES[0], lines: [] }} />} width={W} height={H} defaultProps={{}} />
  </>
);
