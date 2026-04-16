import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import type { ToolCategoryData } from '../../data';

interface ToolCategoryProps {
  category: ToolCategoryData;
}

const HEADER_DONE = 35; // frame when header finishes entering
const TOOLS_START = 42; // frame when first tool starts appearing
const STAGGER_PER_TOOL = 18; // frames between each tool

export const ToolCategory: React.FC<ToolCategoryProps> = ({ category }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header slams in
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 280, mass: 0.7 },
    durationInFrames: 20,
  });
  const headerScale = interpolate(headerProgress, [0, 1], [2.5, 1]);
  const headerOpacity = interpolate(headerProgress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  // Divider draws from left
  const dividerProgress = interpolate(frame, [20, HEADER_DONE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Use 2-column layout for large categories (>7 tools)
  const useTwoColumns = category.tools.length > 7;
  const colSize = useTwoColumns ? Math.ceil(category.tools.length / 2) : category.tools.length;
  const col1 = category.tools.slice(0, colSize);
  const col2 = useTwoColumns ? category.tools.slice(colSize) : [];

  const renderTool = (tool: { name: string; desc: string }, idx: number) => {
    const toolFrame = Math.max(0, frame - TOOLS_START - idx * STAGGER_PER_TOOL);
    const toolProgress = spring({
      frame: toolFrame,
      fps,
      config: { damping: 20, stiffness: 280 },
      durationInFrames: 14,
    });
    const tx = interpolate(toolProgress, [0, 1], [-24, 0]);
    const op = interpolate(toolProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
    const displayName = tool.name.replace('oshx_', '');

    return (
      <div
        key={tool.name}
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 12,
          transform: `translateX(${tx}px)`,
          opacity: op,
          transition: 'none',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 15, color: THEME.purple, minWidth: 220, flexShrink: 0, letterSpacing: 0.5 }}>
          {displayName}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
          {tool.desc}
        </span>
      </div>
    );
  };

  return (
    <div style={{ width: 1600, padding: '0 80px' }}>
      {/* Category header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 20,
          transform: `scale(${headerScale})`,
          transformOrigin: 'left center',
          opacity: headerOpacity,
          transition: 'none',
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 36, color: THEME.purple }}>{category.icon}</span>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 32,
            color: THEME.white,
            letterSpacing: 4,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
          }}
        >
          {category.label}
        </span>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 11,
            color: THEME.muted,
            letterSpacing: 3,
            marginLeft: 8,
            alignSelf: 'flex-end',
            paddingBottom: 6,
          }}
        >
          {category.tools.length} tools
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          backgroundColor: THEME.purple,
          width: `${dividerProgress * 100}%`,
          marginBottom: 32,
          transition: 'none',
          opacity: 0.6,
        }}
      />

      {/* Tools */}
      {useTwoColumns ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 60px' }}>
          <div>{col1.map((t, i) => renderTool(t, i))}</div>
          <div>{col2.map((t, i) => renderTool(t, col1.length + i))}</div>
        </div>
      ) : (
        <div>{col1.map((t, i) => renderTool(t, i))}</div>
      )}
    </div>
  );
};
