import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface AchievementBannerProps {
  title: string;
  label: string;
}

export const AchievementBanner: React.FC<AchievementBannerProps> = ({ title, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerProgress = spring({ frame, fps, config: { damping: 12, stiffness: 260 }, durationInFrames: 20 });
  const scale = interpolate(containerProgress, [0, 1], [0.5, 1]);
  const opacity = interpolate(containerProgress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  const borderColor = frame < 4 ? THEME.white : THEME.purple;

  const titleStart = 18;
  const titleChars = Math.max(0, Math.floor((frame - titleStart) * 3));
  const visibleTitle = title.slice(0, Math.min(titleChars, title.length));

  return (
    <div style={{ border: `2px solid ${borderColor}`, padding: '20px 32px', width: 460, transform: `scale(${scale})`, opacity, transition: 'none', textAlign: 'center' as const }}>
      <div style={{ fontFamily: FONT, fontSize: 9, color: THEME.purple, letterSpacing: 5, textTransform: 'uppercase' as const, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 10 }} />
      <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.white, letterSpacing: 1, minHeight: 28 }}>
        {visibleTitle}
        {titleChars < title.length && <span style={{ opacity: Math.floor(frame / 5) % 2, color: THEME.purple }}>█</span>}
      </div>
    </div>
  );
};
