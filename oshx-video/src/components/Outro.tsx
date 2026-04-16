import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../theme';
import { LOGO_LINES } from '../data';

const TAGLINE = 'Operational Social Hub eXecution';
const VERSION = 'v1.0.0 · 80 tools · MIT';
const LOGO_SPEED = 4;

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const fullLogoText = LOGO_LINES.join('\n');
  const logoChars = Math.min(Math.floor(frame * LOGO_SPEED), fullLogoText.length);

  let charCount = 0;
  const lines = LOGO_LINES.map((line) => {
    const remaining = logoChars - charCount;
    charCount += line.length + 1;
    if (remaining <= 0) return '';
    return line.slice(0, Math.max(0, remaining));
  });
  const logoDone = logoChars >= fullLogoText.length;

  const TAGLINE_START = 50;
  const taglineChars = Math.max(0, Math.floor((frame - TAGLINE_START) * 3));
  const visibleTagline = TAGLINE.slice(0, Math.min(taglineChars, TAGLINE.length));
  const taglineDone = taglineChars >= TAGLINE.length;

  const VERSION_START = TAGLINE_START + Math.ceil(TAGLINE.length / 3) + 10;
  const versionOpacity = interpolate(frame, [VERSION_START, VERSION_START + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const CURSOR_END = 240;
  const cursorVisible = frame < CURSOR_END && Math.floor(frame / 10) % 2 === 0;

  const fadeOpacity = interpolate(frame, [280, 300], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, opacity: fadeOpacity }}>
      <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.white, whiteSpace: 'pre', lineHeight: 1.5, letterSpacing: 1, textAlign: 'center' as const }}>
        {lines.join('\n')}
        {!logoDone && <span style={{ color: THEME.purple }}>█</span>}
      </div>

      {frame >= TAGLINE_START && (
        <div style={{ fontFamily: FONT, fontSize: 14, color: THEME.muted, letterSpacing: 3 }}>
          {visibleTagline}
          {!taglineDone && <span style={{ opacity: Math.floor(frame / 6) % 2, color: THEME.purple }}>█</span>}
        </div>
      )}

      {frame >= VERSION_START && (
        <div style={{ fontFamily: FONT, fontSize: 11, color: THEME.border, letterSpacing: 2, opacity: versionOpacity }}>
          {VERSION}
        </div>
      )}

      {cursorVisible && frame >= VERSION_START + 20 && (
        <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.purple }}>█</div>
      )}
    </AbsoluteFill>
  );
};
