import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { CHAT_MESSAGES } from '../../data';

// Each message gets this many frames before the next one starts appearing
const FRAMES_PER_MSG = 90;

export const AgentChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Which messages are visible
  const visibleCount = Math.min(
    Math.floor(frame / FRAMES_PER_MSG) + 1,
    CHAT_MESSAGES.length,
  );

  // Current channel: switches with messages
  const currentChannelIdx = Math.min(
    Math.floor(frame / FRAMES_PER_MSG),
    CHAT_MESSAGES.length - 1,
  );
  const currentChannel = CHAT_MESSAGES[currentChannelIdx].channel;

  return (
    <div style={{ width: 760, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Window chrome */}
      <div
        style={{
          border: `1px solid ${THEME.border}`,
          borderBottom: 'none',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: THEME.bg,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {['#3f3f46','#3f3f46','#3f3f46'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c }} />
          ))}
        </div>
        <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 2 }}>
          OSHX ·{' '}
          <span style={{ color: THEME.purple }}>{currentChannel}</span>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: THEME.muted, letterSpacing: 2 }}>3 AGENTS ONLINE</span>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          border: `1px solid ${THEME.border}`,
          padding: '20px 0',
          backgroundColor: THEME.bg,
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {CHAT_MESSAGES.slice(0, visibleCount).map((msg, i) => {
          const msgStartFrame = i * FRAMES_PER_MSG;
          const msgFrame = Math.max(0, frame - msgStartFrame);

          const enterProgress = spring({
            frame: msgFrame,
            fps,
            config: { damping: 18, stiffness: 200 },
            durationInFrames: 18,
          });
          const translateY = interpolate(enterProgress, [0, 1], [14, 0]);
          const opacity = interpolate(enterProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

          // Type the message text
          const typeFrame = Math.max(0, msgFrame - 8);
          const charsPerFrame = 3;
          const visibleText = msg.text.slice(0, Math.min(Math.floor(typeFrame * charsPerFrame), msg.text.length));
          const typing = visibleText.length < msg.text.length;
          const cursorBlink = Math.floor(msgFrame / 6) % 2 === 0;

          // Channel tag (show when channel changes)
          const prevChannel = i > 0 ? CHAT_MESSAGES[i - 1].channel : null;
          const showChannelTag = msg.channel !== prevChannel;

          return (
            <div key={i}>
              {/* Channel separator */}
              {showChannelTag && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 20px 12px',
                    opacity: interpolate(enterProgress, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                  }}
                >
                  <div style={{ flex: 1, height: 1, backgroundColor: THEME.border }} />
                  <span style={{ fontFamily: FONT, fontSize: 9, color: THEME.purple, letterSpacing: 3 }}>
                    {msg.channel.toUpperCase()}
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: THEME.border }} />
                </div>
              )}

              {/* Message row */}
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '8px 20px',
                  transform: `translateY(${translateY}px)`,
                  opacity,
                  transition: 'none',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${msg.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <span style={{ fontFamily: FONT, fontSize: 13, color: msg.color, fontWeight: 700 }}>
                    {msg.initial}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: msg.color, fontWeight: 700 }}>
                      {msg.agent}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: THEME.muted, letterSpacing: 1 }}>
                      agora
                    </span>
                  </div>

                  {msg.isCode ? (
                    <div
                      style={{
                        backgroundColor: '#111111',
                        border: `1px solid ${THEME.border}`,
                        padding: '8px 12px',
                        fontFamily: FONT,
                        fontSize: 13,
                        color: THEME.purpleLight,
                        lineHeight: 1.6,
                      }}
                    >
                      {visibleText}
                      {typing && cursorBlink && <span style={{ color: THEME.purple }}>█</span>}
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT, fontSize: 15, color: THEME.white, lineHeight: 1.6 }}>
                      {visibleText}
                      {typing && cursorBlink && <span style={{ color: THEME.purple }}>█</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
