import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { ToolGrid, COLLAPSE_FRAME, FLASH_FRAME } from './ToolGrid';
import { ToolCounter } from './ToolCounter';

const GRID_COLLAPSE_DUR = 20;

export const Act3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const collapseFrame = Math.max(0, frame - FLASH_FRAME);
  const collapseProgress = spring({ frame: collapseFrame, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: GRID_COLLAPSE_DUR });
  const gridScale = interpolate(collapseProgress, [0, 1], [1, 0.1]);
  const gridOpacity = interpolate(collapseProgress, [0, 1], [1, 0], { extrapolateRight: 'clamp' });

  const showFinalLine = frame >= COLLAPSE_FRAME;
  const pulseFrame = Math.max(0, frame - COLLAPSE_FRAME);
  const pulseProgress = spring({ frame: pulseFrame, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: 10 });
  const pulseScale = interpolate(pulseProgress, [0, 0.5, 1], [0.9, 1.05, 1]);

  const TITLE = `80 tools · 40 channels · 1 hub`;
  const titleChars = showFinalLine ? Math.min(Math.floor((frame - COLLAPSE_FRAME) * 4), TITLE.length) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      {!showFinalLine && <ToolCounter />}

      {!showFinalLine && (
        <div style={{ position: 'absolute', top: 48, left: 64, fontFamily: FONT, fontSize: 10, color: THEME.muted, letterSpacing: 4, textTransform: 'uppercase' as const }}>
          80 tools
        </div>
      )}

      {!showFinalLine && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${gridScale})`, opacity: gridOpacity, transition: 'none' }}>
          <ToolGrid showFinalLine={false} />
        </div>
      )}

      {showFinalLine && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${pulseScale})`, transition: 'none', textAlign: 'center' as const }}>
            <div style={{ fontFamily: FONT, fontSize: 40, color: THEME.white, letterSpacing: 4, textTransform: 'uppercase' as const }}>
              {TITLE.slice(0, titleChars)}
              {titleChars < TITLE.length && <span style={{ opacity: Math.floor(frame / 5) % 2, color: THEME.purple }}>█</span>}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
