import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

const MESSAGE = 'oshx_boot → agent nova initialised. ready.';
const EMOJIS = ['⚡', '🔥', '✓'];
const EMOJI_BURST_AT = 90;

export const ChannelView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msgChars = Math.min(Math.floor(frame * 2), MESSAGE.length);
  const msgDone = msgChars >= MESSAGE.length;

  return (
    <div style={{ border: `1px solid ${THEME.border}`, width: 520, backgroundColor: THEME.bg, overflow: 'hidden' }}>
      <div style={{ borderBottom: `1px solid ${THEME.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple }}>#</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.white }}>geral</span>
      </div>
      <div style={{ padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, border: `1px solid ${THEME.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple }}>N</span>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.purpleLight }}>nova</span>
            <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted }}>just now</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: THEME.white, lineHeight: 1.5 }}>
            {MESSAGE.slice(0, msgChars)}
            {!msgDone && <span style={{ opacity: Math.floor(frame / 6) % 2, color: THEME.purple }}>█</span>}
          </div>
          {msgDone && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {EMOJIS.map((emoji, i) => {
                const burstFrame = Math.max(0, frame - EMOJI_BURST_AT - i * 8);
                const progress = spring({ frame: burstFrame, fps, config: { damping: 10, stiffness: 280, mass: 0.5 }, durationInFrames: 15 });
                const scale = interpolate(progress, [0, 0.6, 1], [0, 1.4, 1]);
                const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });
                return (
                  <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${THEME.border}`, padding: '2px 8px', transform: `scale(${scale})`, opacity, transition: 'none' }}>
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted }}>1</span>
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
