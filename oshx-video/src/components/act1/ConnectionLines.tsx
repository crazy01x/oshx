import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME } from '../../theme';

interface Point { x: number; y: number }

interface ConnectionLinesProps {
  centres: [Point, Point, Point, Point];
  drawAt: number;
  drawDuration: number;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({ centres, drawAt, drawDuration }) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame - drawAt);

  const pairs: [Point, Point][] = [
    [centres[0], centres[1]],
    [centres[1], centres[3]],
    [centres[3], centres[2]],
    [centres[2], centres[0]],
  ];

  const perLine = drawDuration / pairs.length;

  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {pairs.map(([a, b], i) => {
        const lineFrame = relFrame - i * perLine;
        const progress = interpolate(lineFrame, [0, perLine], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const dashOffset = interpolate(progress, [0, 1], [length, 0]);

        return (
          <line
            key={i}
            x1={a.x} y1={a.y}
            x2={b.x} y2={b.y}
            stroke={THEME.purple}
            strokeWidth={1}
            strokeDasharray={length}
            strokeDashoffset={dashOffset}
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
};
