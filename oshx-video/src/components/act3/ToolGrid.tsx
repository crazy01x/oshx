import React from 'react';
import { THEME, FONT } from '../../theme';
import { TOOLS } from '../../data';
import { ToolCell } from './ToolCell';

const STAGGER_PER_CELL = 10;
export const FLASH_FRAME = TOOLS.length * STAGGER_PER_CELL + 20;
export const COLLAPSE_FRAME = FLASH_FRAME + 40;

interface ToolGridProps {
  showFinalLine: boolean;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ showFinalLine }) => {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {!showFinalLine && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, width: 1400 }}>
          {TOOLS.map((tool, i) => (
            <ToolCell key={tool} name={tool} activateAt={i * STAGGER_PER_CELL} flashFrame={FLASH_FRAME} />
          ))}
        </div>
      )}
      {showFinalLine && (
        <div style={{ fontFamily: FONT, fontSize: 40, color: THEME.white, letterSpacing: 4, textTransform: 'uppercase' as const, textAlign: 'center' as const }}>
          {TOOLS.length} tools · 40 channels · 1 hub
        </div>
      )}
    </div>
  );
};
