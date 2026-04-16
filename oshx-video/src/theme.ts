export const THEME = {
  bg: '#0a0a0a',
  white: '#ffffff',
  purple: '#8b5cf6',
  purpleLight: '#c4b5fd',
  muted: '#3f3f46',
  border: '#27272a',
} as const;

export const FONT = '"JetBrains Mono", monospace';
export const FPS = 30;

// Act 1 — Intro + hub overview + agent chat (65s)
export const ACT1_FRAMES = 1950;
// Act 2 — Agent lifecycle + waiting room (65s)
export const ACT2_FRAMES = 1950;
// Act 3 — 13 tool categories (143s)
// Sum of all category durationInFrames from data.ts:
// 300+270+180+210+210+180+150+150+180+210+270+360+360 = 3030
export const ACT3_FRAMES = 3030;
// Outro (15s)
export const OUTRO_FRAMES = 450;
export const TOTAL_FRAMES = ACT1_FRAMES + ACT2_FRAMES + ACT3_FRAMES + OUTRO_FRAMES;
// = 1950 + 1950 + 3030 + 450 = 7380 ≈ 4m6s
