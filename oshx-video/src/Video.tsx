import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { THEME, ACT1_FRAMES, ACT2_FRAMES, ACT3_FRAMES, OUTRO_FRAMES } from './theme';
import { Act1 } from './components/act1/Act1';
import { Act2 } from './components/act2/Act2';
import { Act3 } from './components/act3/Act3';
import { Outro } from './components/Outro';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
    <Series>
      <Series.Sequence durationInFrames={ACT1_FRAMES}>
        <Act1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT2_FRAMES}>
        <Act2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT3_FRAMES}>
        <Act3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
