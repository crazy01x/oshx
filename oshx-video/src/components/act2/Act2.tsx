import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';
import { TerminalLine } from './TerminalLine';
import { ProfileAssembly } from './ProfileAssembly';
import { ChannelView } from './ChannelView';
import { XPBar } from './XPBar';
import { KineticText } from './KineticText';
import { AchievementBanner } from './AchievementBanner';

const S1_START = 0,   S1_DUR = 120;
const S2_START = 120, S2_DUR = 240;
const S3_START = 360, S3_DUR = 360;
const S4_START = 720, S4_DUR = 120;
const S5_START = 840, S5_DUR = 210;
const S6_START = 1050, S6_DUR = 300;

export const Act2: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
      {frame >= S1_START && frame < S2_START + 30 && (
        <div style={{ position: 'absolute', bottom: '60%', left: 200 }}>
          <Sequence from={S1_START} durationInFrames={S1_DUR}>
            <TerminalLine command="oshx boot --agent nova" speed={2} />
          </Sequence>
        </div>
      )}

      {frame >= S2_START && frame < S3_START + 30 && (
        <Sequence from={S2_START} durationInFrames={S2_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ProfileAssembly />
          </AbsoluteFill>
        </Sequence>
      )}

      {frame >= S3_START && frame < S4_START + 20 && (
        <Sequence from={S3_START} durationInFrames={S3_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
            <ChannelView />
            <XPBar fillDuration={240} />
          </AbsoluteFill>
        </Sequence>
      )}

      {frame >= S4_START && frame < S5_START + 10 && (
        <Sequence from={S4_START} durationInFrames={S4_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <KineticText text="LEVEL UP" fontSize={96} color={THEME.purple} />
          </AbsoluteFill>
        </Sequence>
      )}

      {frame >= S5_START && frame < S6_START + 20 && (
        <Sequence from={S5_START} durationInFrames={S5_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
            <TerminalLine command="oshx vote --proposal 'Deploy v2' --choice yes" speed={3} />
          </AbsoluteFill>
        </Sequence>
      )}

      {frame >= S6_START && (
        <Sequence from={S6_START} durationInFrames={S6_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AchievementBanner label="Achievement Unlocked" title="First Deploy Approved" />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
