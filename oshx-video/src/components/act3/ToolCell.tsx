import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface ToolCellProps {
  name: string;
  activateAt: number;
  flashFrame: number;
}

export const ToolCell: React.FC<ToolCellProps> = ({ name, activateAt, flashFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - activateAt);
  const isActive = frame >= activateAt;

  const snapProgress = spring({ frame: relFrame, fps, config: { damping: 30, stiffness: 400 }, durationInFrames: 8 });
  const isFlash = frame >= flashFrame && frame < flashFrame + 2;

  const bgColor = isFlash ? THEME.white : isActive ? THEME.purple : THEME.bg;
  const textColor = isFlash ? THEME.bg : isActive ? THEME.bg : THEME.muted;
  const scale = isActive ? interpolate(snapProgress, [0, 1], [0.85, 1]) : 0.85;
  const opacity = isActive ? interpolate(snapProgress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' }) : 0.15;
  const displayName = name.replace('oshx_', '');

  return (
    <div style={{ backgroundColor: bgColor, padding: '6px 8px', transform: `scale(${scale})`, opacity, transition: 'none', border: `1px solid ${isActive ? THEME.purple : THEME.border}`, overflow: 'hidden' }}>
      <span style={{ fontFamily: FONT, fontSize: 9, color: textColor, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
        {displayName}
      </span>
    </div>
  );
};
