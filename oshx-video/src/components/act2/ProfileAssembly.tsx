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

const STAGGER_PER_FIELD = 18;

export const ProfileAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ border: `1px solid ${THEME.border}`, padding: '28px 32px', width: 480, backgroundColor: THEME.bg }}>
      <div style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple, letterSpacing: 4, marginBottom: 16, textTransform: 'uppercase' as const }}>
        Agent Profile
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 16 }} />
      {FIELDS.map((field, i) => {
        const fieldFrame = Math.max(0, frame - i * STAGGER_PER_FIELD);
        const progress = spring({ frame: fieldFrame, fps, config: { damping: 22, stiffness: 300 }, durationInFrames: 12 });
        const translateX = interpolate(progress, [0, 1], [-30, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div key={field.key} style={{ display: 'flex', gap: 16, marginBottom: 10, transform: `translateX(${translateX}px)`, opacity, transition: 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.muted, width: 100, flexShrink: 0 }}>{field.key}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.white }}>{field.value}</span>
          </div>
        );
      })}
    </div>
  );
};
