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
    config: { damping: 14, stiffness: 180, mass: 0.8 },
    durationInFrames: 25,
  });

  const dx = corner.includes('l') ? -80 : 80;
  const dy = corner.includes('t') ? -80 : 80;
  const translateX = interpolate(progress, [0, 1], [dx, 0]);
  const translateY = interpolate(progress, [0, 1], [dy, 0]);
  const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  const lineRevealStart = 20;

  return (
    <div
      style={{
        transform: `translate(${translateX}px, ${translateY}px)`,
        opacity,
        border: `1px solid ${THEME.purple}`,
        padding: '20px 24px',
        width: 320,
        backgroundColor: THEME.bg,
        transition: 'none',
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          color: THEME.purple,
          letterSpacing: 4,
          marginBottom: 14,
          textTransform: 'uppercase' as const,
        }}
      >
        {label}
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 14 }} />
      {lines.map((line, i) => {
        const lineFrame = relFrame - lineRevealStart - i * 8;
        const lineProgress = spring({
          frame: Math.max(0, lineFrame),
          fps,
          config: { damping: 20, stiffness: 260 },
          durationInFrames: 12,
        });
        const lineX = interpolate(lineProgress, [0, 1], [-20, 0]);
        const lineOpacity = interpolate(lineProgress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontSize: 13,
              color: THEME.white,
              marginBottom: 8,
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
