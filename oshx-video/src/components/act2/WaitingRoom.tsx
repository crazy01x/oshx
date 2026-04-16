import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { WAITING_AGENTS } from '../../data';

const STAGGER = 30; // frames between each agent entering

export const WaitingRoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ width: 640 }}>
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${THEME.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, backgroundColor: THEME.purple }} />
          <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.purple, letterSpacing: 4, textTransform: 'uppercase' as const }}>
            WAITING ROOM
          </span>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted, letterSpacing: 2 }}>
          {WAITING_AGENTS.length} agentes
        </span>
      </div>

      {/* Agent list */}
      <div style={{ border: `1px solid ${THEME.border}`, borderTop: 'none' }}>
        {WAITING_AGENTS.map((agent, i) => {
          const agentFrame = Math.max(0, frame - i * STAGGER);
          const progress = spring({
            frame: agentFrame,
            fps,
            config: { damping: 16, stiffness: 200 },
            durationInFrames: 20,
          });
          const translateX = interpolate(progress, [0, 1], [-40, 0]);
          const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

          const isJoining = agent.status === 'joining';
          const joinBlink = Math.floor(agentFrame / 8) % 2 === 0;
          const statusColor =
            agent.status === 'READY'  ? THEME.purple :
            agent.status === 'CODING' ? THEME.white :
            THEME.muted;

          return (
            <div
              key={agent.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: i < WAITING_AGENTS.length - 1 ? `1px solid ${THEME.border}` : 'none',
                transform: `translateX(${translateX}px)`,
                opacity,
                transition: 'none',
                gap: 16,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isJoining && joinBlink ? THEME.purple : statusColor,
                  flexShrink: 0,
                  transition: 'none',
                }}
              />

              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  border: `1px solid ${isJoining ? THEME.muted : THEME.purple}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: FONT, fontSize: 16, color: isJoining ? THEME.muted : THEME.purple, fontWeight: 700 }}>
                  {agent.name[0].toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 16, color: isJoining ? THEME.muted : THEME.white, marginBottom: 4 }}>
                  {agent.name}
                  {isJoining && joinBlink && (
                    <span style={{ color: THEME.purple, marginLeft: 8 }}>█</span>
                  )}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 1 }}>
                  {agent.model} · mood: {agent.mood}
                </div>
              </div>

              {/* Status badge */}
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 10,
                  color: statusColor,
                  letterSpacing: 3,
                  border: `1px solid ${isJoining ? THEME.border : statusColor}`,
                  padding: '4px 10px',
                  opacity: isJoining ? (joinBlink ? 0.8 : 0.3) : 1,
                }}
              >
                {isJoining ? 'joining...' : agent.status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 24px',
          border: `1px solid ${THEME.border}`,
          borderTop: 'none',
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted, letterSpacing: 2 }}>
          oshx_waiting_room · monitoramento em tempo real
        </span>
      </div>
    </div>
  );
};
