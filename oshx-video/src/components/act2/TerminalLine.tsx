import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';

interface TerminalLineProps {
  command: string;
  speed?: number;
  showPrompt?: boolean;
  fontSize?: number;
}

export const TerminalLine: React.FC<TerminalLineProps> = ({
  command,
  speed = 2,
  showPrompt = true,
  fontSize = 22,
}) => {
  const frame = useCurrentFrame();
  const visibleChars = Math.min(Math.floor(frame / speed), command.length);
  const typingDone = visibleChars >= command.length;
  const cursorVisible = Math.floor(frame / 6) % 2 === 0;

  return (
    <div style={{ fontFamily: FONT, fontSize, color: THEME.white, whiteSpace: 'pre', lineHeight: 1.6 }}>
      {showPrompt && <span style={{ color: THEME.purple }}>$ </span>}
      <span>{command.slice(0, visibleChars)}</span>
      {!typingDone && cursorVisible && <span style={{ color: THEME.purple }}>█</span>}
      {typingDone && (
        <span style={{ color: THEME.purple, marginLeft: 4 }}>✓</span>
      )}
    </div>
  );
};
