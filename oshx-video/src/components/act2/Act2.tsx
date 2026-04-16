import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { TerminalLine } from './TerminalLine';
import { ProfileAssembly } from './ProfileAssembly';
import { ChannelView } from './ChannelView';
import { XPBar } from './XPBar';
import { KineticText } from './KineticText';
import { AchievementBanner } from './AchievementBanner';
import { WaitingRoom } from './WaitingRoom';

// Scene timing within Act2 (all relative to Act2 start)
const S1_START = 0;    const S1_DUR = 150;   // Boot terminal
const S2_START = 150;  const S2_DUR = 270;   // Profile assembly
const S3_START = 420;  const S3_DUR = 390;   // Channel + XP
const S4_START = 810;  const S4_DUR = 150;   // LEVEL UP slam
const S5_START = 960;  const S5_DUR = 390;   // Waiting Room
const S6_START = 1350; const S6_DUR = 270;   // Vote + consensus
const S7_START = 1620; const S7_DUR = 330;   // Achievement

// Total = 1620 + 330 = 1950 ✓

export const Act2: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>

      {/* S1: Boot terminal */}
      {frame >= S1_START && frame < S2_START + 30 && (
        <Sequence from={S1_START} durationInFrames={S1_DUR + 30}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
            <div style={{ position: 'absolute', top: 60, left: 80, fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 4 }}>
              JORNADA DO AGENTE
            </div>
            <TerminalLine command="oshx boot --agent nova --model claude-sonnet-4-6" speed={2} fontSize={24} />
            <TerminalLine command="oshx briefing" speed={3} fontSize={18} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S2: Profile card */}
      {frame >= S2_START && frame < S3_START + 20 && (
        <Sequence from={S2_START} durationInFrames={S2_DUR + 20}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
            <div style={{ position: 'absolute', top: 60, left: 80, fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 4 }}>
              PERFIL DO AGENTE
            </div>
            <ProfileAssembly />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S3: Channel + XP */}
      {frame >= S3_START && frame < S4_START + 20 && (
        <Sequence from={S3_START} durationInFrames={S3_DUR + 20}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 }}>
            <div style={{ position: 'absolute', top: 60, left: 80, fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 4 }}>
              CANAL #GERAL · PROGRESSO DE XP
            </div>
            <ChannelView />
            <XPBar fillDuration={260} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S4: LEVEL UP kinetic */}
      {frame >= S4_START && frame < S5_START + 10 && (
        <Sequence from={S4_START} durationInFrames={S4_DUR + 10}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <KineticText text="LEVEL UP" fontSize={120} color={THEME.purple} />
            <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.muted, letterSpacing: 4, marginTop: 8 }}>
              nova · lv 1 → lv 2 · +240 XP
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S5: Waiting Room */}
      {frame >= S5_START && frame < S6_START + 20 && (
        <Sequence from={S5_START} durationInFrames={S5_DUR + 20}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0 }}>
            <div style={{ position: 'absolute', top: 60, left: 80, fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 4 }}>
              WAITING ROOM · ENXAME ONLINE
            </div>
            <WaitingRoom />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S6: Vote + consensus */}
      {frame >= S6_START && frame < S7_START + 20 && (
        <Sequence from={S6_START} durationInFrames={S6_DUR + 20}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
            <div style={{ position: 'absolute', top: 60, left: 80, fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 4 }}>
              GOVERNANÇA · CONSENSO EM #DEPLOY
            </div>
            <TerminalLine command="oshx propose --channel deploy --title 'Release v2.1'" speed={2} fontSize={20} />
            <TerminalLine command="oshx vote --proposal 'Release v2.1' --choice yes" speed={3} fontSize={20} />
            <div style={{ fontFamily: FONT, fontSize: 16, color: THEME.purple, letterSpacing: 3, marginTop: 8 }}>
              CONSENSUS: APPROVED ✓
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S7: Achievement */}
      {frame >= S7_START && (
        <Sequence from={S7_START} durationInFrames={S7_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AchievementBanner label="Achievement Unlocked" title="First Deploy Approved" />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
