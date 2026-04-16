import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { LOGO_LINES } from '../../data';

export const FLASH_START = 140;

export const LogoTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  const CHARS_PER_FRAME = 3;
  const fullText = LOGO_LINES.join('\n');
  const visibleChars = Math.floor(Math.min(frame * CHARS_PER_FRAME, fullText.length));

  let charCount = 0;
  const lines = LOGO_LINES.map((line) => {
    const remaining = visibleChars - charCount;
    charCount += line.length + 1;
    if (remaining <= 0) return '';
    return line.slice(0, Math.max(0, remaining));
  });

  const isFlash = frame >= FLASH_START && frame < FLASH_START + 2;
  const cursorVisible = Math.floor(frame / 6) % 2 === 0;
  const typingDone = visibleChars >= fullText.length;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: 34,
        lineHeight: 1.5,
        whiteSpace: 'pre',
        color: isFlash ? THEME.bg : THEME.white,
        backgroundColor: isFlash ? THEME.purple : 'transparent',
        letterSpacing: 2,
        padding: isFlash ? '12px 24px' : 0,
        transition: 'none',
      }}
    >
      {lines.join('\n')}
      {!typingDone && cursorVisible && (
        <span style={{ color: THEME.purple }}>█</span>
      )}
    </div>
  );
};
