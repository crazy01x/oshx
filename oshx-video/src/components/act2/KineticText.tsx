import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface KineticTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

export const KineticText: React.FC<KineticTextProps> = ({ text, fontSize = 72, color = THEME.white }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame, fps, config: { damping: 8, stiffness: 300, mass: 0.6 }, durationInFrames: 20 });
  const scale = interpolate(progress, [0, 1], [3, 1]);
  const translateY = interpolate(progress, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize,
        color,
        fontWeight: 700,
        letterSpacing: -2,
        textTransform: 'uppercase' as const,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transformOrigin: 'center center',
        transition: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};
