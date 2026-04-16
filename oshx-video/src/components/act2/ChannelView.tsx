import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

const MESSAGE = 'oshx_boot → agent nova initialised. pronto para operar.';
const EMOJIS = ['⚡', '🔥', '✓'];
const EMOJI_BURST_AT = 100;

export const ChannelView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msgChars = Math.min(Math.floor(frame * 2.5), MESSAGE.length);
  const msgDone = msgChars >= MESSAGE.length;

  return (
    <div style={{ border: `1px solid ${THEME.border}`, width: 640, backgroundColor: THEME.bg }}>
      <div style={{ borderBottom: `1px solid ${THEME.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 14, color: THEME.purple }}>#</span>
        <span style={{ fontFamily: FONT, fontSize: 15, color: THEME.white, fontWeight: 700 }}>geral</span>
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted, marginLeft: 8, letterSpacing: 2 }}>CANAL PRINCIPAL</span>
      </div>
      <div style={{ padding: '20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, border: `1px solid ${THEME.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 14, color: THEME.purple, fontWeight: 700 }}>N</span>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 15, color: THEME.purpleLight, fontWeight: 700 }}>nova</span>
            <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted, letterSpacing: 1 }}>agora mesmo</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 16, color: THEME.white, lineHeight: 1.6 }}>
            {MESSAGE.slice(0, msgChars)}
            {!msgDone && <span style={{ opacity: Math.floor(frame / 6) % 2, color: THEME.purple }}>█</span>}
          </div>
          {msgDone && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {EMOJIS.map((emoji, i) => {
                const burstFrame = Math.max(0, frame - EMOJI_BURST_AT - i * 10);
                const progress = spring({ frame: burstFrame, fps, config: { damping: 10, stiffness: 280, mass: 0.5 }, durationInFrames: 15 });
                const scale = interpolate(progress, [0, 0.6, 1], [0, 1.5, 1]);
                const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });
                return (
                  <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${THEME.border}`, padding: '4px 12px', transform: `scale(${scale})`, opacity, transition: 'none' }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.muted }}>1</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
