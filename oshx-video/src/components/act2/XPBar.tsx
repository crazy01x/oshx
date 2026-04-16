import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { AGENT } from '../../data';

interface XPBarProps {
  fillDuration: number;
}

export const XPBar: React.FC<XPBarProps> = ({ fillDuration }) => {
  const frame = useCurrentFrame();

  const steps = 12;
  const rawProgress = interpolate(frame, [0, fillDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const steppedProgress = Math.floor(rawProgress * steps) / steps;
  const currentXP = Math.round(steppedProgress * AGENT.xpTarget);
  const fillPercent = steppedProgress * 100;

  return (
    <div style={{ width: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 2, textTransform: 'uppercase' as const }}>XP</span>
        <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.purple }}>{currentXP} / {AGENT.xpTarget}</span>
      </div>
      <div style={{ height: 4, backgroundColor: THEME.border, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${fillPercent}%`, backgroundColor: THEME.purple, transition: 'none' }} />
      </div>
    </div>
  );
};
