import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { HUB_CARDS } from '../../data';
import { LogoTypewriter } from './LogoTypewriter';
import { HubCard } from './HubCard';
import { ConnectionLines } from './ConnectionLines';
import { AgentGrid } from './AgentGrid';
import { AgentChat } from './AgentChat';

// Scene timing (relative to Act1 start, in frames)
const LOGO_END      = 220;   // logo types + flash, then fades
const TAGLINE_START = 160;   // tagline slams in while logo still visible
const CARDS_START   = 260;   // 4 hub cards fly in
const LINES_START   = 500;   // SVG connection lines draw
const GRID_START    = 720;   // agent grid appears
const COUNTER_START = 760;
const CHAT_START    = 980;   // chat scene

// Card layout centres (1920x1080) — spread wide
const CARD_CENTRES = [
  { x: 440,  y: 280 },
  { x: 1480, y: 280 },
  { x: 440,  y: 800 },
  { x: 1480, y: 800 },
] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];

const corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
const cardPositions = [
  { top: 160, left: 240 },
  { top: 160, right: 240 },
  { top: 660, left: 240 },
  { top: 660, right: 240 },
];

export const Act1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo fades out after cards arrive
  const logoOpacity = frame < CARDS_START - 20
    ? 1
    : Math.max(0, 1 - (frame - (CARDS_START - 20)) / 20);

  // Tagline slams in after logo is readable
  const taglineProgress = spring({
    frame: Math.max(0, frame - TAGLINE_START),
    fps,
    config: { damping: 10, stiffness: 300, mass: 0.6 },
    durationInFrames: 20,
  });
  const taglineScale = interpolate(taglineProgress, [0, 1], [3, 1]);
  const taglineOpacity = interpolate(taglineProgress, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' });
  const taglineFadeOut = frame > CARDS_START - 10
    ? Math.max(0, 1 - (frame - (CARDS_START - 10)) / 10)
    : 1;

  // "80 tools · 40 channels · 1 hub" counter badge
  const badgeProgress = spring({
    frame: Math.max(0, frame - (CARDS_START + 20)),
    fps,
    config: { damping: 16, stiffness: 200 },
    durationInFrames: 20,
  });
  const badgeOpacity = interpolate(badgeProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  // Chat scene transition: fade cards/grid out, chat slides in
  const chatProgress = spring({
    frame: Math.max(0, frame - CHAT_START),
    fps,
    config: { damping: 18, stiffness: 160 },
    durationInFrames: 25,
  });
  const chatOpacity = interpolate(chatProgress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const chatTx = interpolate(chatProgress, [0, 1], [80, 0]);
  const prevOpacity = frame < CHAT_START ? 1 : Math.max(0, 1 - (frame - CHAT_START) / 20);

  const showCards = frame >= CARDS_START;
  const showLines = frame >= LINES_START;
  const showGrid = frame >= GRID_START;
  const showChat = frame >= CHAT_START;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>

      {/* ── INTRO PHASE: Logo + tagline ── */}
      {frame < LOGO_END + 30 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: logoOpacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <LogoTypewriter />

          {/* Tagline kinetic slam */}
          {frame >= TAGLINE_START && (
            <div
              style={{
                fontFamily: FONT,
                fontSize: 18,
                color: THEME.muted,
                letterSpacing: 6,
                textTransform: 'uppercase' as const,
                transform: `scale(${taglineScale})`,
                opacity: taglineOpacity * taglineFadeOut,
                transition: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Social Agentic OS
            </div>
          )}
        </div>
      )}

      {/* ── CARDS PHASE ── */}
      {showCards && frame < CHAT_START + 20 && (
        <div style={{ opacity: prevOpacity, transition: 'none' }}>
          {HUB_CARDS.map((card, i) => (
            <div key={card.label} style={{ position: 'absolute', ...(cardPositions[i] as React.CSSProperties) }}>
              <HubCard
                label={card.label}
                lines={card.lines}
                enterAt={CARDS_START + i * 16}
                corner={corners[i]}
              />
            </div>
          ))}

          {/* Stat badge — centred bottom */}
          {frame >= CARDS_START + 20 && (
            <div
              style={{
                position: 'absolute',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: badgeOpacity,
                display: 'flex',
                gap: 40,
                border: `1px solid ${THEME.border}`,
                padding: '14px 40px',
                backgroundColor: THEME.bg,
              }}
            >
              {['80 tools', '40 canais', '1 hub'].map((s) => (
                <span key={s} style={{ fontFamily: FONT, fontSize: 14, color: THEME.purple, letterSpacing: 3 }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SVG lines */}
      {showLines && frame < CHAT_START + 20 && (
        <div style={{ opacity: prevOpacity, transition: 'none' }}>
          <ConnectionLines centres={CARD_CENTRES} drawAt={LINES_START} drawDuration={120} />
        </div>
      )}

      {/* Agent grid + counter */}
      {showGrid && frame < CHAT_START + 20 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: prevOpacity,
            transition: 'none',
          }}
        >
          <AgentGrid enterAt={GRID_START} counterAt={COUNTER_START} />
        </div>
      )}

      {/* ── CHAT SCENE ── */}
      {showChat && (
        <Sequence from={CHAT_START}>
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {/* Section label */}
            <div
              style={{
                position: 'absolute',
                top: 60,
                left: 80,
                fontFamily: FONT,
                fontSize: 11,
                color: THEME.muted,
                letterSpacing: 4,
                opacity: chatOpacity,
                transform: `translateX(${chatTx}px)`,
                transition: 'none',
              }}
            >
              AGENTES EM AÇÃO
            </div>

            <div
              style={{
                opacity: chatOpacity,
                transform: `translateX(${chatTx}px)`,
                transition: 'none',
              }}
            >
              <AgentChat />
            </div>
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
