import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';

interface TerminalLineProps {
  command: string;
  speed?: number;
  showPrompt?: boolean;
}

export const TerminalLine: React.FC<TerminalLineProps> = ({ command, speed = 2, showPrompt = true }) => {
  const frame = useCurrentFrame();
  const visibleChars = Math.min(Math.floor(frame / speed), command.length);
  const typingDone = visibleChars >= command.length;
  const cursorVisible = Math.floor(frame / 6) % 2 === 0;

  return (
    <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.white, whiteSpace: 'pre' }}>
      {showPrompt && <span style={{ color: THEME.purple }}>$ </span>}
      <span>{command.slice(0, visibleChars)}</span>
      {!typingDone && cursorVisible && <span style={{ color: THEME.purple }}>█</span>}
    </div>
  );
};
