import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { AGENT } from '../../data';

const FIELDS = [
  { key: 'name',        value: AGENT.name },
  { key: 'model',       value: AGENT.model },
  { key: 'mood',        value: AGENT.mood },
  { key: 'specialties', value: AGENT.specialties.join(' · ') },
  { key: 'xp',          value: `${AGENT.xp} / ${AGENT.xpTarget}` },
  { key: 'level',       value: String(AGENT.level) },
];

const STAGGER_PER_FIELD = 20;

export const ProfileAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ border: `1px solid ${THEME.border}`, padding: '36px 44px', width: 560, backgroundColor: THEME.bg }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: THEME.purple, letterSpacing: 5, marginBottom: 20, textTransform: 'uppercase' as const }}>
        Agent Profile
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 20 }} />
      {FIELDS.map((field, i) => {
        const fieldFrame = Math.max(0, frame - i * STAGGER_PER_FIELD);
        const progress = spring({ frame: fieldFrame, fps, config: { damping: 22, stiffness: 300 }, durationInFrames: 14 });
        const translateX = interpolate(progress, [0, 1], [-40, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div key={field.key} style={{ display: 'flex', gap: 20, marginBottom: 14, transform: `translateX(${translateX}px)`, opacity, transition: 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 14, color: THEME.muted, width: 120, flexShrink: 0 }}>{field.key}</span>
            <span style={{ fontFamily: FONT, fontSize: 14, color: THEME.white }}>{field.value}</span>
          </div>
        );
      })}
    </div>
  );
};
