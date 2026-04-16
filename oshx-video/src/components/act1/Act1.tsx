import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';
import { HUB_CARDS } from '../../data';
import { LogoTypewriter } from './LogoTypewriter';
import { HubCard } from './HubCard';
import { ConnectionLines } from './ConnectionLines';
import { AgentGrid } from './AgentGrid';

const LOGO_DURATION = 180;
const CARDS_START = 160;
const LINES_START = 380;
const LINES_DURATION = 120;
const GRID_START = 600;
const COUNTER_START = 640;

const CARD_CENTRES = [
  { x: 480,  y: 300 },
  { x: 1440, y: 300 },
  { x: 480,  y: 780 },
  { x: 1440, y: 780 },
] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];

const corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
const cardPositions = [
  { top: 180, left: 320 },
  { top: 180, right: 320 },
  { top: 600, left: 320 },
  { top: 600, right: 320 },
];

export const Act1: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = frame < LOGO_DURATION - 10
    ? 1
    : Math.max(0, 1 - (frame - (LOGO_DURATION - 10)) / 10);

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      {frame < LOGO_DURATION + 20 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: logoOpacity }}>
          <LogoTypewriter />
        </div>
      )}

      {frame >= CARDS_START && HUB_CARDS.map((card, i) => (
        <div key={card.label} style={{ position: 'absolute', ...(cardPositions[i] as React.CSSProperties) }}>
          <HubCard
            label={card.label}
            lines={card.lines}
            enterAt={CARDS_START + i * 14}
            corner={corners[i]}
          />
        </div>
      ))}

      {frame >= LINES_START && (
        <ConnectionLines
          centres={CARD_CENTRES}
          drawAt={LINES_START}
          drawDuration={LINES_DURATION}
        />
      )}

      {frame >= GRID_START && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <AgentGrid enterAt={GRID_START} counterAt={COUNTER_START} />
        </div>
      )}
    </AbsoluteFill>
  );
};
