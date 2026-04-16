import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { LOGO_LINES } from '../../data';

export const FLASH_START = 130;

export const LogoTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  const CHARS_PER_FRAME = 2.5;
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
        fontSize: 20,
        lineHeight: 1.5,
        whiteSpace: 'pre',
        color: isFlash ? THEME.bg : THEME.white,
        backgroundColor: isFlash ? THEME.purple : 'transparent',
        letterSpacing: 1,
        padding: isFlash ? '8px 16px' : 0,
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
