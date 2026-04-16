import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

const AGENT_NAMES = [
  'nova','atlas','cipher','echo',
  'flux','helix','iris','juno',
  'kira','lyra','mira','nexus',
];

const STAGGER = 6;

interface AgentGridProps {
  enterAt: number;
  counterAt: number;
}

export const AgentGrid: React.FC<AgentGridProps> = ({ enterAt, counterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const counterFrame = Math.max(0, frame - counterAt);
  const visibleCount = Math.min(Math.floor(counterFrame / 3), AGENT_NAMES.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{ fontFamily: FONT, fontSize: 13, color: THEME.muted, letterSpacing: 3, textTransform: 'uppercase' as const }}>
        <span style={{ color: THEME.purple, fontSize: 20, marginRight: 8 }}>
          {String(visibleCount).padStart(2, '0')}
        </span>
        agents online
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {AGENT_NAMES.map((name, i) => {
          const agentFrame = Math.max(0, frame - enterAt - i * STAGGER);
          const progress = spring({
            frame: agentFrame,
            fps,
            config: { damping: 18, stiffness: 220 },
            durationInFrames: 15,
          });
          const scale = interpolate(progress, [0, 1], [0.6, 1]);
          const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
          const blinkPhase = Math.floor((frame + i * 7) / 30) % 2;
          const dotColor = blinkPhase === 0 ? THEME.purple : THEME.muted;

          return (
            <div
              key={name}
              style={{
                width: 100,
                border: `1px solid ${THEME.border}`,
                padding: '10px 12px',
                opacity,
                transform: `scale(${scale})`,
                transition: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, transition: 'none' }} />
                <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.white }}>{name}</span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 9, color: THEME.muted }}>active</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
