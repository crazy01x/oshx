import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface HubCardProps {
  label: string;
  lines: string[];
  enterAt: number;
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

export const HubCard: React.FC<HubCardProps> = ({ label, lines, enterAt, corner }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - enterAt);

  const progress = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.9 },
    durationInFrames: 28,
  });

  const dx = corner.includes('l') ? -120 : 120;
  const dy = corner.includes('t') ? -120 : 120;
  const translateX = interpolate(progress, [0, 1], [dx, 0]);
  const translateY = interpolate(progress, [0, 1], [dy, 0]);
  const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  const lineRevealStart = 22;

  return (
    <div
      style={{
        transform: `translate(${translateX}px, ${translateY}px)`,
        opacity,
        border: `1px solid ${THEME.purple}`,
        padding: '28px 32px',
        width: 400,
        backgroundColor: THEME.bg,
        transition: 'none',
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 13,
          color: THEME.purple,
          letterSpacing: 5,
          marginBottom: 16,
          textTransform: 'uppercase' as const,
        }}
      >
        {label}
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 16 }} />
      {lines.map((line, i) => {
        const lineFrame = relFrame - lineRevealStart - i * 10;
        const lineProgress = spring({
          frame: Math.max(0, lineFrame),
          fps,
          config: { damping: 20, stiffness: 260 },
          durationInFrames: 14,
        });
        const lineX = interpolate(lineProgress, [0, 1], [-28, 0]);
        const lineOpacity = interpolate(lineProgress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontSize: 16,
              color: THEME.white,
              marginBottom: 10,
              transform: `translateX(${lineX}px)`,
              opacity: lineOpacity,
              transition: 'none',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
