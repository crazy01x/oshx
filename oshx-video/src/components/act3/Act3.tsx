import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { TOOL_CATEGORIES } from '../../data';
import { ToolCategory } from './ToolCategory';

// Build cumulative start frames for each category
const categoryStarts: number[] = [];
let acc = 0;
for (const cat of TOOL_CATEGORIES) {
  categoryStarts.push(acc);
  acc += cat.durationInFrames;
}
// acc === ACT3_FRAMES (3030)

// Progress bar total
const TOTAL_TOOLS = TOOL_CATEGORIES.reduce((s, c) => s + c.tools.length, 0);

export const Act3: React.FC = () => {
  const frame = useCurrentFrame();

  // Which category is active
  let activeCatIdx = 0;
  for (let i = TOOL_CATEGORIES.length - 1; i >= 0; i--) {
    if (frame >= categoryStarts[i]) { activeCatIdx = i; break; }
  }
  const activeCat = TOOL_CATEGORIES[activeCatIdx];
  const localFrame = frame - categoryStarts[activeCatIdx];

  // Tools revealed so far (for global counter)
  let toolsSoFar = 0;
  for (let i = 0; i < activeCatIdx; i++) toolsSoFar += TOOL_CATEGORIES[i].tools.length;
  const staggerPerTool = 18;
  const toolsInCurrent = Math.min(Math.floor(Math.max(0, localFrame - 42) / staggerPerTool) + 1, activeCat.tools.length);
  const totalVisible = Math.min(toolsSoFar + toolsInCurrent, TOTAL_TOOLS);

  // Progress bar fill
  const progressPercent = (totalVisible / TOTAL_TOOLS) * 100;

  // Category transition: brief flash between categories
  const isTransitionIn = localFrame < 8;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>

      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 64px',
          gap: 32,
          backgroundColor: THEME.bg,
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple, letterSpacing: 4 }}>
          80 TOOLS
        </span>
        <div style={{ flex: 1, height: 2, backgroundColor: THEME.border, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: THEME.purple,
              transition: 'none',
            }}
          />
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, color: THEME.purple, letterSpacing: 2 }}>
          {String(totalVisible).padStart(2, '0')}{' '}
          <span style={{ color: THEME.muted }}>/ {TOTAL_TOOLS}</span>
        </span>

        {/* Category index */}
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted, letterSpacing: 2 }}>
          {activeCatIdx + 1} / {TOOL_CATEGORIES.length}
        </span>
      </div>

      {/* Flash on category transition */}
      {isTransitionIn && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: THEME.purple,
            opacity: interpolate(localFrame, [0, 8], [0.15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main content area */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {TOOL_CATEGORIES.map((cat, i) => {
          const start = categoryStarts[i];
          if (frame < start || frame >= start + cat.durationInFrames) return null;
          return (
            <Sequence key={cat.id} from={start} durationInFrames={cat.durationInFrames}>
              <AbsoluteFill
                style={{
                  top: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ToolCategory category={cat} />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
