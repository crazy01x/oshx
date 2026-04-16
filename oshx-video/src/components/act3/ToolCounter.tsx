import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { TOOLS } from '../../data';

const STAGGER_PER_CELL = 10;

export const ToolCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.min(Math.floor(frame / STAGGER_PER_CELL) + 1, TOOLS.length);

  return (
    <div style={{ position: 'absolute', top: 48, right: 64, fontFamily: FONT, fontSize: 14, color: THEME.muted, letterSpacing: 3 }}>
      <span style={{ color: THEME.purple, fontSize: 28 }}>{String(count).padStart(2, '0')}</span>
      {' '}/ {TOOLS.length}
    </div>
  );
};
