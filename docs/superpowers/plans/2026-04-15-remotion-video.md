# OSHX MCP Remotion Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2m20s Remotion video (3 acts + outro) showcasing oshx-mcp — black/white/purple, zero gradients, spring physics + kinetic typography + typewriter + stagger animations.

**Architecture:** Single Remotion composition (4200 frames @ 30fps) using `<Series>` to sequence Act1 → Act2 → Act3 → Outro. Each act is a self-contained React component. Shared `theme.ts` and `data.ts` feed all components.

**Tech Stack:** Remotion 4.x, React 18, TypeScript 5, Bun, `@remotion/google-fonts` (JetBrains Mono)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/Root.tsx` | Register `<Composition>` with Remotion |
| `src/Video.tsx` | Main composition — `<Series>` of 4 sections |
| `src/theme.ts` | Palette constants + font string |
| `src/data.ts` | 80 tools, 8 channels, agent profile fixture |
| `src/components/act1/Act1.tsx` | Sequence Act1 sub-scenes |
| `src/components/act1/LogoTypewriter.tsx` | ASCII logo types char-by-char + flash |
| `src/components/act1/HubCard.tsx` | Single spring-enter card with stagger line reveal |
| `src/components/act1/ConnectionLines.tsx` | SVG lines drawing between card centres |
| `src/components/act1/AgentGrid.tsx` | Grid of agent squares with blinking status + flip counter |
| `src/components/act2/Act2.tsx` | Sequence Act2 sub-scenes |
| `src/components/act2/TerminalLine.tsx` | CLI typewriter line (`$ command`) |
| `src/components/act2/ProfileAssembly.tsx` | Profile fields slide in one-by-one |
| `src/components/act2/ChannelView.tsx` | Channel + message + emoji particle burst |
| `src/components/act2/XPBar.tsx` | Mechanical stutter-fill XP bar |
| `src/components/act2/KineticText.tsx` | Slam text (scale 3→1 spring bounce) |
| `src/components/act2/AchievementBanner.tsx` | Border flash + icon slam + typewriter label |
| `src/components/act3/Act3.tsx` | Sequence Act3 sub-scenes |
| `src/components/act3/ToolGrid.tsx` | 80-cell grid rapid stagger snap-in |
| `src/components/act3/ToolCell.tsx` | Single tool cell — snaps purple on activation |
| `src/components/act3/ToolCounter.tsx` | Hard-cut monospace counter 01→80 |
| `src/components/Outro.tsx` | Logo redraw + tagline + cursor blink |

---

## Frame Budget (30 fps)

| Section | Start frame | End frame | Duration |
|---------|-------------|-----------|----------|
| Act 1 | 0 | 1350 | 45 s |
| Act 2 | 1350 | 2700 | 45 s |
| Act 3 | 2700 | 3900 | 40 s |
| Outro | 3900 | 4200 | 10 s |

---

## Task 1: Scaffold Remotion project

**Files:**
- Create: `oshx-video/` (project root, inside `G:/oshx-mcp/`)

- [ ] **Step 1: Scaffold with bun create video**

Run inside `G:/oshx-mcp/`:
```bash
bun create video oshx-video
```
When prompted, select: **Hello World** (blank template). Accept all defaults.

- [ ] **Step 2: Install google-fonts package**

```bash
cd oshx-video
bun add @remotion/google-fonts
```

- [ ] **Step 3: Verify dev server starts**

```bash
bun run dev
```
Expected: `Server running at http://localhost:3000` — open and see blank Hello World composition.

- [ ] **Step 4: Commit scaffold**

```bash
git add oshx-video/
git commit -m "chore: scaffold Remotion oshx-video project"
```

---

## Task 2: Theme, data, and font setup

**Files:**
- Create: `oshx-video/src/theme.ts`
- Create: `oshx-video/src/data.ts`
- Modify: `oshx-video/src/Root.tsx`

- [ ] **Step 1: Write theme.ts**

```ts
// oshx-video/src/theme.ts
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

// Frame budget
export const ACT1_FRAMES = 1350;
export const ACT2_FRAMES = 1350;
export const ACT3_FRAMES = 1200;
export const OUTRO_FRAMES = 300;
export const TOTAL_FRAMES = ACT1_FRAMES + ACT2_FRAMES + ACT3_FRAMES + OUTRO_FRAMES;
```

- [ ] **Step 2: Write data.ts**

```ts
// oshx-video/src/data.ts
export const TOOLS: string[] = [
  'oshx_archive_history','oshx_award','oshx_boot','oshx_branch',
  'oshx_briefing','oshx_broadcast_mode_continuo','oshx_catalog_systems',
  'oshx_chain','oshx_check_locks','oshx_commit','oshx_consciousness',
  'oshx_crawl','oshx_create_script','oshx_dep_check','oshx_devtools',
  'oshx_diff','oshx_dm','oshx_doc_sync','oshx_dynamic_pentest',
  'oshx_exec','oshx_export_system_prompt','oshx_get_agent_policy',
  'oshx_get_project_context','oshx_healthcheck','oshx_inbox',
  'oshx_inbox_ae','oshx_inbox_alertas','oshx_inbox_dono',
  'oshx_inbox_geral','oshx_inbox_mentions','oshx_init_project_system',
  'oshx_kickoff_continuous_cycle','oshx_kill_session','oshx_leaderboard',
  'oshx_list_channels','oshx_list_proposals','oshx_list_tools',
  'oshx_lockdown','oshx_manifesto','oshx_notifications','oshx_pentest',
  'oshx_pin','oshx_post','oshx_probe','oshx_profile_context',
  'oshx_profile_update','oshx_promote','oshx_propose','oshx_push',
  'oshx_react','oshx_read','oshx_read_dm','oshx_recall',
  'oshx_redirect','oshx_release_lock','oshx_research',
  'oshx_resilience_test','oshx_resolve','oshx_roadmap_update',
  'oshx_run_script','oshx_screenshot','oshx_send_input',
  'oshx_set_agent_policy','oshx_set_project_context','oshx_shadow_qa',
  'oshx_shutdown','oshx_status','oshx_summarize','oshx_tackle',
  'oshx_task_create','oshx_task_list','oshx_task_update',
  'oshx_token_report','oshx_tutorial','oshx_unblock',
  'oshx_update_mood','oshx_vault_read','oshx_vault_write',
  'oshx_vote','oshx_waiting_room',
];

export const CHANNELS = [
  '#geral','#dev','#alertas','#deploy','#bugs',
  '#roadmap','#vault','#consciousness',
];

export const AGENT = {
  name: 'nova',
  model: 'claude-sonnet-4-6',
  mood: 'Focado',
  specialties: ['reasoning','code','autonomy'],
  xp: 0,
  xpTarget: 240,
  level: 1,
};

export const LOGO_LINES = [
  '██████╗ ███████╗██╗  ██╗██╗  ██╗',
  '██╔═══██╗██╔════╝██║  ██║╚██╗██╔╝',
  '██║   ██║███████╗███████║ ╚███╔╝ ',
  '██║   ██║╚════██║██╔══██║ ██╔██╗ ',
  '╚██████╔╝███████║██║  ██║██╔╝ ██╗',
  ' ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝',
];

export const HUB_CARDS = [
  { label: 'CHANNELS', lines: ['40 active channels','#geral · #dev · #vault','real-time messaging'] },
  { label: 'PROFILES', lines: ['agent identities','XP · level · mood','achievements + credits'] },
  { label: 'VAULT', lines: ['encrypted secrets','key-value store','agent-only access'] },
  { label: 'CONSCIOUSNESS', lines: ['persistent memory','neural cache','cross-session recall'] },
];
```

- [ ] **Step 3: Load JetBrains Mono font in Root.tsx**

Replace the contents of `oshx-video/src/Root.tsx`:

```tsx
// oshx-video/src/Root.tsx
import { Composition } from 'remotion';
import { loadFont } from '@remotion/google-fonts/JetBrainsMono';
import { Video } from './Video';
import { TOTAL_FRAMES, FPS } from './theme';

loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="OshxVideo"
      component={Video}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
```

- [ ] **Step 4: Create stub Video.tsx**

```tsx
// oshx-video/src/Video.tsx
import { AbsoluteFill } from 'remotion';
import { THEME } from './theme';

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
  );
};
```

- [ ] **Step 5: Verify in browser**

Run `bun run dev`, open `http://localhost:3000`, select **OshxVideo** composition — should show a solid `#0a0a0a` black frame.

- [ ] **Step 6: Commit**

```bash
git add oshx-video/src/theme.ts oshx-video/src/data.ts oshx-video/src/Root.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): theme, data constants, font setup"
```

---

## Task 3: LogoTypewriter component

**Files:**
- Create: `oshx-video/src/components/act1/LogoTypewriter.tsx`

- [ ] **Step 1: Write component**

```tsx
// oshx-video/src/components/act1/LogoTypewriter.tsx
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { LOGO_LINES } from '../../data';

// After typing completes, frame when flash happens
export const FLASH_START = 130; // ~4.3s into act1

export const LogoTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  const CHARS_PER_FRAME = 2.5;
  const fullText = LOGO_LINES.join('\n');
  const visibleChars = Math.floor(Math.min(frame * CHARS_PER_FRAME, fullText.length));

  // Build visible lines char by char
  let charCount = 0;
  const lines = LOGO_LINES.map((line) => {
    const remaining = visibleChars - charCount;
    charCount += line.length + 1; // +1 for the '\n'
    if (remaining <= 0) return '';
    return line.slice(0, Math.max(0, remaining));
  });

  // Sharp flash: 2 frames white background, purple text
  const isFlash = frame >= FLASH_START && frame < FLASH_START + 2;
  // Cursor blinks every 6 frames
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
```

- [ ] **Step 2: Smoke-test in Video.tsx**

Temporarily replace Video.tsx body:

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { THEME } from './theme';
import { LogoTypewriter } from './components/act1/LogoTypewriter';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Sequence from={0} durationInFrames={300}>
      <LogoTypewriter />
    </Sequence>
  </AbsoluteFill>
);
```

Open browser, scrub to frame 0–150 — logo should type character by character, flash at frame 130.

- [ ] **Step 3: Revert Video.tsx to stub, commit**

Revert Video.tsx to the black stub from Task 2, then:

```bash
git add oshx-video/src/components/act1/LogoTypewriter.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): LogoTypewriter component"
```

---

## Task 4: HubCard + ConnectionLines components

**Files:**
- Create: `oshx-video/src/components/act1/HubCard.tsx`
- Create: `oshx-video/src/components/act1/ConnectionLines.tsx`

- [ ] **Step 1: Write HubCard.tsx**

```tsx
// oshx-video/src/components/act1/HubCard.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface HubCardProps {
  label: string;
  lines: string[];
  /** Frame (relative to this Sequence) when the card should enter */
  enterAt: number;
  /** Origin corner for entry direction: 'tl'|'tr'|'bl'|'br' */
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

export const HubCard: React.FC<HubCardProps> = ({ label, lines, enterAt, corner }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - enterAt);

  const progress = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.8 },
    durationInFrames: 25,
  });

  const dx = corner.includes('l') ? -80 : 80;
  const dy = corner.includes('t') ? -80 : 80;
  const translateX = interpolate(progress, [0, 1], [dx, 0]);
  const translateY = interpolate(progress, [0, 1], [dy, 0]);
  const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  // Stagger each line: line i reveals at relFrame >= lineRevealStart + i*8
  const lineRevealStart = 20;

  return (
    <div
      style={{
        transform: `translate(${translateX}px, ${translateY}px)`,
        opacity,
        border: `1px solid ${THEME.purple}`,
        padding: '20px 24px',
        width: 320,
        backgroundColor: THEME.bg,
        transition: 'none',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          color: THEME.purple,
          letterSpacing: 4,
          marginBottom: 14,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 14 }} />

      {/* Lines with stagger */}
      {lines.map((line, i) => {
        const lineFrame = relFrame - lineRevealStart - i * 8;
        const lineProgress = spring({
          frame: Math.max(0, lineFrame),
          fps,
          config: { damping: 20, stiffness: 260 },
          durationInFrames: 12,
        });
        const lineX = interpolate(lineProgress, [0, 1], [-20, 0]);
        const lineOpacity = interpolate(lineProgress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontSize: 13,
              color: THEME.white,
              marginBottom: 8,
              transform: `translateX(${lineX}px)`,
              opacity: lineOpacity,
              transition: 'none',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Write ConnectionLines.tsx**

```tsx
// oshx-video/src/components/act1/ConnectionLines.tsx
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME } from '../../theme';

interface Point { x: number; y: number }

interface ConnectionLinesProps {
  /** Absolute pixel centres of each card (in 1920x1080 space) */
  centres: [Point, Point, Point, Point];
  /** Frame when line drawing begins */
  drawAt: number;
  /** Duration in frames for all lines to complete */
  drawDuration: number;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  centres,
  drawAt,
  drawDuration,
}) => {
  const frame = useCurrentFrame();
  const relFrame = Math.max(0, frame - drawAt);

  // Draw 4 lines: each gets drawDuration/4 frames, staggered
  const pairs: [Point, Point][] = [
    [centres[0], centres[1]],
    [centres[1], centres[3]],
    [centres[3], centres[2]],
    [centres[2], centres[0]],
  ];

  const perLine = drawDuration / pairs.length;

  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {pairs.map(([a, b], i) => {
        const lineFrame = relFrame - i * perLine;
        const progress = interpolate(lineFrame, [0, perLine], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const dashOffset = interpolate(progress, [0, 1], [length, 0]);

        return (
          <line
            key={i}
            x1={a.x} y1={a.y}
            x2={b.x} y2={b.y}
            stroke={THEME.purple}
            strokeWidth={1}
            strokeDasharray={length}
            strokeDashoffset={dashOffset}
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add oshx-video/src/components/act1/HubCard.tsx oshx-video/src/components/act1/ConnectionLines.tsx
git commit -m "feat(video): HubCard and ConnectionLines components"
```

---

## Task 5: AgentGrid component

**Files:**
- Create: `oshx-video/src/components/act1/AgentGrid.tsx`

- [ ] **Step 1: Write AgentGrid.tsx**

```tsx
// oshx-video/src/components/act1/AgentGrid.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

const AGENT_NAMES = [
  'nova','atlas','cipher','echo',
  'flux','helix','iris','juno',
  'kira','lyra','mira','nexus',
];

const TOTAL_AGENTS = AGENT_NAMES.length;
const STAGGER = 6; // frames between each agent appearing

interface AgentGridProps {
  /** Frame when agents start appearing */
  enterAt: number;
  /** Frame when the counter starts */
  counterAt: number;
}

export const AgentGrid: React.FC<AgentGridProps> = ({ enterAt, counterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Number flip: hard-cut integer counting up from 0 to TOTAL_AGENTS
  const counterFrame = Math.max(0, frame - counterAt);
  const visibleCount = Math.min(
    Math.floor(counterFrame / 3),
    TOTAL_AGENTS,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* Counter */}
      <div
        style={{
          fontFamily: FONT,
          fontSize: 13,
          color: THEME.muted,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: THEME.purple, fontSize: 20, marginRight: 8 }}>
          {String(visibleCount).padStart(2, '0')}
        </span>
        agents online
      </div>

      {/* Grid 4×3 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {AGENT_NAMES.map((name, i) => {
          const agentFrame = Math.max(0, frame - enterAt - i * STAGGER);
          const progress = spring({
            frame: agentFrame,
            fps,
            config: { damping: 18, stiffness: 220 },
            durationInFrames: 15,
          });
          const scale = interpolate(progress, [0, 1], [0.6, 1]);
          const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

          // Status dot blinks every 30 frames, offset by index
          const blinkPhase = Math.floor((frame + i * 7) / 30) % 2;
          const dotColor = blinkPhase === 0 ? THEME.purple : THEME.muted;

          return (
            <div
              key={name}
              style={{
                width: 100,
                border: `1px solid ${THEME.border}`,
                padding: '10px 12px',
                opacity,
                transform: `scale(${scale})`,
                transition: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    transition: 'none',
                  }}
                />
                <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.white }}>
                  {name}
                </span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 9, color: THEME.muted }}>
                active
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add oshx-video/src/components/act1/AgentGrid.tsx
git commit -m "feat(video): AgentGrid component"
```

---

## Task 6: Wire up Act 1

**Files:**
- Create: `oshx-video/src/components/act1/Act1.tsx`
- Modify: `oshx-video/src/Video.tsx`

- [ ] **Step 1: Write Act1.tsx**

```tsx
// oshx-video/src/components/act1/Act1.tsx
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';
import { HUB_CARDS } from '../../data';
import { LogoTypewriter, FLASH_START } from './LogoTypewriter';
import { HubCard } from './HubCard';
import { ConnectionLines } from './ConnectionLines';
import { AgentGrid } from './AgentGrid';

// Scene timing (relative to Act1 start, in frames)
const LOGO_DURATION = 180;      // 0–180: logo types + flash
const CARDS_START = 160;        // cards fly in from frame 160
const LINES_START = 380;        // connection lines draw
const LINES_DURATION = 120;
const GRID_START = 600;         // agents appear
const COUNTER_START = 640;

// Card layout centres (1920x1080)
const CARD_CENTRES = [
  { x: 480,  y: 300  }, // top-left
  { x: 1440, y: 300  }, // top-right
  { x: 480,  y: 780  }, // bottom-left
  { x: 1440, y: 780  }, // bottom-right
] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];

export const Act1: React.FC = () => {
  const frame = useCurrentFrame();

  // After LOGO_DURATION, cards take over — fade logo out
  const logoOpacity = frame < LOGO_DURATION - 10 ? 1
    : Math.max(0, 1 - (frame - (LOGO_DURATION - 10)) / 10);

  const showCards = frame >= CARDS_START;
  const showLines = frame >= LINES_START;
  const showGrid = frame >= GRID_START;

  // Card corner map
  const corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
  const cardPositions = [
    { top: 180, left: 320  },
    { top: 180, right: 320 },
    { top: 600, left: 320  },
    { top: 600, right: 320 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>

      {/* Logo — centred, fades out before cards */}
      {frame < LOGO_DURATION + 20 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: logoOpacity,
          }}
        >
          <LogoTypewriter />
        </div>
      )}

      {/* Hub cards */}
      {showCards &&
        HUB_CARDS.map((card, i) => (
          <div
            key={card.label}
            style={{
              position: 'absolute',
              ...(cardPositions[i] as React.CSSProperties),
            }}
          >
            <HubCard
              label={card.label}
              lines={card.lines}
              enterAt={CARDS_START + i * 14}
              corner={corners[i]}
            />
          </div>
        ))}

      {/* SVG connection lines */}
      {showLines && (
        <ConnectionLines
          centres={CARD_CENTRES}
          drawAt={LINES_START}
          drawDuration={LINES_DURATION}
        />
      )}

      {/* Agent grid — centred */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AgentGrid enterAt={GRID_START} counterAt={COUNTER_START} />
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Wire into Video.tsx**

```tsx
// oshx-video/src/Video.tsx
import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { THEME, ACT1_FRAMES, ACT2_FRAMES, ACT3_FRAMES, OUTRO_FRAMES } from './theme';
import { Act1 } from './components/act1/Act1';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
    <Series>
      <Series.Sequence durationInFrames={ACT1_FRAMES}>
        <Act1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT2_FRAMES}>
        {/* Act2 placeholder */}
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT3_FRAMES}>
        {/* Act3 placeholder */}
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        {/* Outro placeholder */}
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Verify Act 1 in browser**

Scrub frames 0–1350. Verify:
- Frame 0–130: logo types char by char
- Frame 130: 2-frame white flash
- Frame 160+: 4 cards fly in from corners with spring
- Frame 380+: SVG lines draw between cards
- Frame 600+: agent grid assembles with stagger
- Frame 640+: counter flips 00→12

- [ ] **Step 4: Commit**

```bash
git add oshx-video/src/components/act1/Act1.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): Act 1 complete — social network reveal"
```

---

## Task 7: Act 2 utility components — TerminalLine + ProfileAssembly

**Files:**
- Create: `oshx-video/src/components/act2/TerminalLine.tsx`
- Create: `oshx-video/src/components/act2/ProfileAssembly.tsx`

- [ ] **Step 1: Write TerminalLine.tsx**

```tsx
// oshx-video/src/components/act2/TerminalLine.tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';

interface TerminalLineProps {
  command: string;
  /** frames per character */
  speed?: number;
  showPrompt?: boolean;
}

export const TerminalLine: React.FC<TerminalLineProps> = ({
  command,
  speed = 2,
  showPrompt = true,
}) => {
  const frame = useCurrentFrame();

  const visibleChars = Math.min(Math.floor(frame / speed), command.length);
  const typingDone = visibleChars >= command.length;
  const cursorVisible = Math.floor(frame / 6) % 2 === 0;

  return (
    <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.white, whiteSpace: 'pre' }}>
      {showPrompt && <span style={{ color: THEME.purple }}>$ </span>}
      <span>{command.slice(0, visibleChars)}</span>
      {!typingDone && cursorVisible && (
        <span style={{ color: THEME.purple }}>█</span>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Write ProfileAssembly.tsx**

```tsx
// oshx-video/src/components/act2/ProfileAssembly.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { AGENT } from '../../data';

const FIELDS = [
  { key: 'name',        value: AGENT.name },
  { key: 'model',       value: AGENT.model },
  { key: 'mood',        value: AGENT.mood },
  { key: 'specialties', value: AGENT.specialties.join(' · ') },
  { key: 'xp',          value: `${AGENT.xp} / ${AGENT.xpTarget}` },
  { key: 'level',       value: String(AGENT.level) },
];

const STAGGER_PER_FIELD = 18; // frames

export const ProfileAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        padding: '28px 32px',
        width: 480,
        backgroundColor: THEME.bg,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 10,
          color: THEME.purple,
          letterSpacing: 4,
          marginBottom: 16,
          textTransform: 'uppercase',
        }}
      >
        Agent Profile
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 16 }} />

      {FIELDS.map((field, i) => {
        const fieldFrame = Math.max(0, frame - i * STAGGER_PER_FIELD);
        const progress = spring({
          frame: fieldFrame,
          fps,
          config: { damping: 22, stiffness: 300 },
          durationInFrames: 12,
        });
        const translateX = interpolate(progress, [0, 1], [-30, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div
            key={field.key}
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 10,
              transform: `translateX(${translateX}px)`,
              opacity,
              transition: 'none',
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 12,
                color: THEME.muted,
                width: 100,
                flexShrink: 0,
              }}
            >
              {field.key}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.white }}>
              {field.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add oshx-video/src/components/act2/TerminalLine.tsx oshx-video/src/components/act2/ProfileAssembly.tsx
git commit -m "feat(video): TerminalLine and ProfileAssembly components"
```

---

## Task 8: Act 2 utility components — ChannelView + XPBar

**Files:**
- Create: `oshx-video/src/components/act2/ChannelView.tsx`
- Create: `oshx-video/src/components/act2/XPBar.tsx`

- [ ] **Step 1: Write ChannelView.tsx**

```tsx
// oshx-video/src/components/act2/ChannelView.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

const MESSAGE = 'oshx_boot → agent nova initialised. ready.';
const EMOJIS = ['⚡', '🔥', '✓'];
const EMOJI_BURST_AT = 90; // frame within this component when emoji bursts happen

export const ChannelView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Message types in
  const msgChars = Math.min(Math.floor(frame * 2), MESSAGE.length);
  const msgDone = msgChars >= MESSAGE.length;

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        width: 520,
        backgroundColor: THEME.bg,
        overflow: 'hidden',
      }}
    >
      {/* Channel header */}
      <div
        style={{
          borderBottom: `1px solid ${THEME.border}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple }}>#</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.white }}>geral</span>
      </div>

      {/* Message */}
      <div style={{ padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${THEME.purple}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.purple }}>N</span>
        </div>

        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: THEME.purpleLight }}>nova</span>
            <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted }}>just now</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: THEME.white, lineHeight: 1.5 }}>
            {MESSAGE.slice(0, msgChars)}
            {!msgDone && (
              <span style={{ opacity: Math.floor(frame / 6) % 2, color: THEME.purple }}>█</span>
            )}
          </div>

          {/* Emoji reactions — particle burst */}
          {msgDone && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {EMOJIS.map((emoji, i) => {
                const burstFrame = Math.max(0, frame - EMOJI_BURST_AT - i * 8);
                const progress = spring({
                  frame: burstFrame,
                  fps,
                  config: { damping: 10, stiffness: 280, mass: 0.5 },
                  durationInFrames: 15,
                });
                const scale = interpolate(progress, [0, 0.6, 1], [0, 1.4, 1]);
                const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

                return (
                  <div
                    key={emoji}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      border: `1px solid ${THEME.border}`,
                      padding: '2px 8px',
                      transform: `scale(${scale})`,
                      opacity,
                      transition: 'none',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: THEME.muted }}>1</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write XPBar.tsx**

```tsx
// oshx-video/src/components/act2/XPBar.tsx
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { AGENT } from '../../data';

interface XPBarProps {
  /** Frames over which the bar fills */
  fillDuration: number;
}

export const XPBar: React.FC<XPBarProps> = ({ fillDuration }) => {
  const frame = useCurrentFrame();

  // Stutter fill: bar jumps in discrete increments, not smooth
  const steps = 12;
  const stepSize = AGENT.xpTarget / steps;
  const rawProgress = interpolate(frame, [0, fillDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Snap to nearest step
  const steppedProgress = Math.floor(rawProgress * steps) / steps;
  const currentXP = Math.round(steppedProgress * AGENT.xpTarget);
  const fillPercent = steppedProgress * 100;

  return (
    <div style={{ width: 480 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.muted, letterSpacing: 2, textTransform: 'uppercase' }}>
          XP
        </span>
        <span style={{ fontFamily: FONT, fontSize: 11, color: THEME.purple }}>
          {currentXP} / {AGENT.xpTarget}
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 4,
          backgroundColor: THEME.border,
          position: 'relative',
        }}
      >
        {/* Fill — hard stepped, no CSS transition */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${fillPercent}%`,
            backgroundColor: THEME.purple,
            transition: 'none',
          }}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add oshx-video/src/components/act2/ChannelView.tsx oshx-video/src/components/act2/XPBar.tsx
git commit -m "feat(video): ChannelView and XPBar components"
```

---

## Task 9: Act 2 utility components — KineticText + AchievementBanner

**Files:**
- Create: `oshx-video/src/components/act2/KineticText.tsx`
- Create: `oshx-video/src/components/act2/AchievementBanner.tsx`

- [ ] **Step 1: Write KineticText.tsx**

```tsx
// oshx-video/src/components/act2/KineticText.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface KineticTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  fontSize = 72,
  color = THEME.white,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slam: springs from scale 3 down to 1 with high bounce
  const progress = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.6 },
    durationInFrames: 20,
  });

  const scale = interpolate(progress, [0, 1], [3, 1]);
  // Slight vertical slam (from above)
  const translateY = interpolate(progress, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize,
        color,
        fontWeight: 700,
        letterSpacing: -2,
        textTransform: 'uppercase',
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transformOrigin: 'center center',
        transition: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};
```

- [ ] **Step 2: Write AchievementBanner.tsx**

```tsx
// oshx-video/src/components/act2/AchievementBanner.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface AchievementBannerProps {
  title: string;
  label: string;
}

export const AchievementBanner: React.FC<AchievementBannerProps> = ({ title, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Container slams in
  const containerProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 260 },
    durationInFrames: 20,
  });
  const scale = interpolate(containerProgress, [0, 1], [0.5, 1]);
  const opacity = interpolate(containerProgress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  // Border flash: white for 3 frames, then back to purple
  const borderColor = frame < 4 ? THEME.white : THEME.purple;

  // Title types in after entry animation
  const titleStart = 18;
  const titleChars = Math.max(0, Math.floor((frame - titleStart) * 3));
  const visibleTitle = title.slice(0, Math.min(titleChars, title.length));

  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        padding: '20px 32px',
        width: 460,
        transform: `scale(${scale})`,
        opacity,
        transition: 'none',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 9,
          color: THEME.purple,
          letterSpacing: 5,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 10 }} />
      <div
        style={{
          fontFamily: FONT,
          fontSize: 18,
          color: THEME.white,
          letterSpacing: 1,
          minHeight: 28,
        }}
      >
        {visibleTitle}
        {titleChars < title.length && (
          <span style={{ opacity: Math.floor(frame / 5) % 2, color: THEME.purple }}>█</span>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add oshx-video/src/components/act2/KineticText.tsx oshx-video/src/components/act2/AchievementBanner.tsx
git commit -m "feat(video): KineticText and AchievementBanner components"
```

---

## Task 10: Wire up Act 2

**Files:**
- Create: `oshx-video/src/components/act2/Act2.tsx`
- Modify: `oshx-video/src/Video.tsx`

- [ ] **Step 1: Write Act2.tsx**

```tsx
// oshx-video/src/components/act2/Act2.tsx
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';
import { TerminalLine } from './TerminalLine';
import { ProfileAssembly } from './ProfileAssembly';
import { ChannelView } from './ChannelView';
import { XPBar } from './XPBar';
import { KineticText } from './KineticText';
import { AchievementBanner } from './AchievementBanner';

// Scene timing within Act2 (frames, all relative to Act2 start)
// Scene 1: Boot terminal line (0–120)
const S1_START = 0;
const S1_DUR   = 120;

// Scene 2: Profile assembly (120–360)
const S2_START = 120;
const S2_DUR   = 240;

// Scene 3: Channel view + XP bar (360–720)
const S3_START = 360;
const S3_DUR   = 360;

// Scene 4: Level up kinetic text (720–840)
const S4_START = 720;
const S4_DUR   = 120;

// Scene 5: Proposal vote + approval (840–1050)
const S5_START = 840;
const S5_DUR   = 210;

// Scene 6: Achievement (1050–1350)
const S6_START = 1050;
const S6_DUR   = 300;

export const Act2: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>

      {/* S1: Boot terminal */}
      {frame >= S1_START && frame < S2_START + 30 && (
        <div style={{ position: 'absolute', bottom: '60%', left: 200 }}>
          <Sequence from={S1_START} durationInFrames={S1_DUR}>
            <TerminalLine command="oshx boot --agent nova" speed={2} />
          </Sequence>
        </div>
      )}

      {/* S2: Profile card */}
      {frame >= S2_START && frame < S3_START + 30 && (
        <Sequence from={S2_START} durationInFrames={S2_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ProfileAssembly />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S3: Channel view + XP bar */}
      {frame >= S3_START && frame < S4_START + 20 && (
        <Sequence from={S3_START} durationInFrames={S3_DUR}>
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 32,
            }}
          >
            <ChannelView />
            <XPBar fillDuration={240} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S4: LEVEL UP slam */}
      {frame >= S4_START && frame < S5_START + 10 && (
        <Sequence from={S4_START} durationInFrames={S4_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <KineticText text="LEVEL UP" fontSize={96} color={THEME.purple} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S5: Proposal vote */}
      {frame >= S5_START && frame < S6_START + 20 && (
        <Sequence from={S5_START} durationInFrames={S5_DUR}>
          <AbsoluteFill
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <TerminalLine command="oshx vote --proposal 'Deploy v2' --choice yes" speed={3} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* S6: Achievement */}
      {frame >= S6_START && (
        <Sequence from={S6_START} durationInFrames={S6_DUR}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AchievementBanner
              label="Achievement Unlocked"
              title="First Deploy Approved"
            />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Update Video.tsx to include Act2**

```tsx
// oshx-video/src/Video.tsx
import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { THEME, ACT1_FRAMES, ACT2_FRAMES, ACT3_FRAMES, OUTRO_FRAMES } from './theme';
import { Act1 } from './components/act1/Act1';
import { Act2 } from './components/act2/Act2';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
    <Series>
      <Series.Sequence durationInFrames={ACT1_FRAMES}>
        <Act1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT2_FRAMES}>
        <Act2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT3_FRAMES}>
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Verify Act 2 in browser**

Scrub frames 1350–2700. Verify:
- 1350–1470: `$ oshx boot --agent nova` types in
- 1470–1710: Profile card assembles field by field
- 1710–2070: Channel view with message + emoji burst + XP stutter fill
- 2070–2190: "LEVEL UP" slams to screen, scale 3→1
- 2190–2400: vote terminal line types
- 2400–2700: Achievement banner slams in, border flashes, title types

- [ ] **Step 4: Commit**

```bash
git add oshx-video/src/components/act2/Act2.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): Act 2 complete — agent journey"
```

---

## Task 11: Act 3 components — ToolCell + ToolGrid + ToolCounter

**Files:**
- Create: `oshx-video/src/components/act3/ToolCell.tsx`
- Create: `oshx-video/src/components/act3/ToolGrid.tsx`
- Create: `oshx-video/src/components/act3/ToolCounter.tsx`

- [ ] **Step 1: Write ToolCell.tsx**

```tsx
// oshx-video/src/components/act3/ToolCell.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';

interface ToolCellProps {
  name: string;
  /** Frame when this cell activates (relative to its Sequence) */
  activateAt: number;
  /** True when the final simultaneous flash happens */
  flashFrame: number;
}

export const ToolCell: React.FC<ToolCellProps> = ({ name, activateAt, flashFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - activateAt);
  const isActive = frame >= activateAt;

  const snapProgress = spring({
    frame: relFrame,
    fps,
    config: { damping: 30, stiffness: 400 },
    durationInFrames: 8,
  });

  const isFlash = frame >= flashFrame && frame < flashFrame + 2;

  const bgColor = isFlash
    ? THEME.white
    : isActive
    ? THEME.purple
    : THEME.bg;

  const textColor = isFlash
    ? THEME.bg
    : isActive
    ? THEME.bg
    : THEME.muted;

  const scale = isActive ? interpolate(snapProgress, [0, 1], [0.85, 1]) : 0.85;
  const opacity = isActive ? interpolate(snapProgress, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' }) : 0.15;

  // Strip 'oshx_' prefix for display
  const displayName = name.replace('oshx_', '');

  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: '6px 8px',
        transform: `scale(${scale})`,
        opacity,
        transition: 'none',
        border: `1px solid ${isActive ? THEME.purple : THEME.border}`,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 9,
          color: textColor,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }}
      >
        {displayName}
      </span>
    </div>
  );
};
```

- [ ] **Step 2: Write ToolGrid.tsx**

```tsx
// oshx-video/src/components/act3/ToolGrid.tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { TOOLS } from '../../data';
import { ToolCell } from './ToolCell';

const STAGGER_PER_CELL = 10; // frames between cells
const FLASH_FRAME = TOOLS.length * STAGGER_PER_CELL + 20; // 2 frames after last cell lights up

// Frame when all cells collapse to centre text
export const COLLAPSE_FRAME = FLASH_FRAME + 40;

interface ToolGridProps {
  /** Frame when the final line should appear */
  showFinalLine: boolean;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ showFinalLine }) => {
  const frame = useCurrentFrame();

  const COLS = 10;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Grid */}
      {!showFinalLine && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 4,
            width: 1400,
          }}
        >
          {TOOLS.map((tool, i) => (
            <ToolCell
              key={tool}
              name={tool}
              activateAt={i * STAGGER_PER_CELL}
              flashFrame={FLASH_FRAME}
            />
          ))}
        </div>
      )}

      {/* Final line — appears after collapse */}
      {showFinalLine && (
        <div
          style={{
            fontFamily: FONT,
            fontSize: 40,
            color: THEME.white,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {TOOLS.length} tools · 40 channels · 1 hub
        </div>
      )}
    </div>
  );
};

export { FLASH_FRAME };
```

- [ ] **Step 3: Write ToolCounter.tsx**

```tsx
// oshx-video/src/components/act3/ToolCounter.tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { THEME, FONT } from '../../theme';
import { TOOLS } from '../../data';

const STAGGER_PER_CELL = 10;

export const ToolCounter: React.FC = () => {
  const frame = useCurrentFrame();

  // Hard-cut: advances by 1 for every STAGGER_PER_CELL frames
  const count = Math.min(
    Math.floor(frame / STAGGER_PER_CELL) + 1,
    TOOLS.length,
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 64,
        fontFamily: FONT,
        fontSize: 14,
        color: THEME.muted,
        letterSpacing: 3,
      }}
    >
      <span style={{ color: THEME.purple, fontSize: 28 }}>
        {String(count).padStart(2, '0')}
      </span>
      {' '}/ {TOOLS.length}
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add oshx-video/src/components/act3/ToolCell.tsx oshx-video/src/components/act3/ToolGrid.tsx oshx-video/src/components/act3/ToolCounter.tsx
git commit -m "feat(video): ToolCell, ToolGrid, ToolCounter components"
```

---

## Task 12: Wire up Act 3

**Files:**
- Create: `oshx-video/src/components/act3/Act3.tsx`
- Modify: `oshx-video/src/Video.tsx`

- [ ] **Step 1: Write Act3.tsx**

```tsx
// oshx-video/src/components/act3/Act3.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { THEME, FONT } from '../../theme';
import { ToolGrid, COLLAPSE_FRAME, FLASH_FRAME } from './ToolGrid';
import { ToolCounter } from './ToolCounter';

// After FLASH_FRAME, the grid "collapses" over 20 frames
const GRID_COLLAPSE_DUR = 20;

export const Act3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grid collapses out after flash
  const collapseFrame = Math.max(0, frame - FLASH_FRAME);
  const collapseProgress = spring({
    frame: collapseFrame,
    fps,
    config: { damping: 20, stiffness: 200 },
    durationInFrames: GRID_COLLAPSE_DUR,
  });
  const gridScale = interpolate(collapseProgress, [0, 1], [1, 0.1]);
  const gridOpacity = interpolate(collapseProgress, [0, 1], [1, 0], { extrapolateRight: 'clamp' });

  // Final line pulses once
  const showFinalLine = frame >= COLLAPSE_FRAME;
  const pulseFrame = Math.max(0, frame - COLLAPSE_FRAME);
  const pulseProgress = spring({
    frame: pulseFrame,
    fps,
    config: { damping: 20, stiffness: 200 },
    durationInFrames: 10,
  });
  const pulseScale = interpolate(pulseProgress, [0, 0.5, 1], [0.9, 1.05, 1]);

  // Title
  const TITLE = '80 tools · 40 channels · 1 hub';
  const titleChars = showFinalLine
    ? Math.min(Math.floor((frame - COLLAPSE_FRAME) * 4), TITLE.length)
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      {/* Counter (top-right, always visible until collapse) */}
      {!showFinalLine && <ToolCounter />}

      {/* Section label */}
      {!showFinalLine && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 64,
            fontFamily: FONT,
            fontSize: 10,
            color: THEME.muted,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          80 tools
        </div>
      )}

      {/* Grid */}
      {!showFinalLine && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${gridScale})`,
            opacity: gridOpacity,
            transition: 'none',
          }}
        >
          <ToolGrid showFinalLine={false} />
        </div>
      )}

      {/* Final line */}
      {showFinalLine && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              transform: `scale(${pulseScale})`,
              transition: 'none',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 40,
                color: THEME.white,
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              {TITLE.slice(0, titleChars)}
              {titleChars < TITLE.length && (
                <span style={{ opacity: Math.floor(frame / 5) % 2, color: THEME.purple }}>█</span>
              )}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Update Video.tsx to include Act3**

```tsx
// oshx-video/src/Video.tsx
import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { THEME, ACT1_FRAMES, ACT2_FRAMES, ACT3_FRAMES, OUTRO_FRAMES } from './theme';
import { Act1 } from './components/act1/Act1';
import { Act2 } from './components/act2/Act2';
import { Act3 } from './components/act3/Act3';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
    <Series>
      <Series.Sequence durationInFrames={ACT1_FRAMES}>
        <Act1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT2_FRAMES}>
        <Act2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT3_FRAMES}>
        <Act3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        <AbsoluteFill style={{ backgroundColor: THEME.bg }} />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Verify Act 3 in browser**

Scrub frames 2700–3900. Verify:
- 2700–3500: 80 cells snap in rapid stagger, counter hard-cuts 01→80
- ~3520: all cells flash white simultaneously for 2 frames
- ~3540: grid collapses/scales to centre
- ~3560: final line types: `80 tools · 40 channels · 1 hub`

- [ ] **Step 4: Commit**

```bash
git add oshx-video/src/components/act3/Act3.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): Act 3 complete — 80 tools showcase"
```

---

## Task 13: Build Outro + finalise Video.tsx

**Files:**
- Create: `oshx-video/src/components/Outro.tsx`
- Modify: `oshx-video/src/Video.tsx`

- [ ] **Step 1: Write Outro.tsx**

```tsx
// oshx-video/src/components/Outro.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { THEME, FONT } from '../theme';
import { LOGO_LINES } from '../data';

const TAGLINE = 'Operational Social Hub eXecution';
const VERSION = 'v1.0.0 · 80 tools · MIT';

// Fast typewriter: finish logo in ~45 frames
const LOGO_SPEED = 4; // chars per frame

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const fullLogoText = LOGO_LINES.join('\n');
  const logoChars = Math.min(Math.floor(frame * LOGO_SPEED), fullLogoText.length);

  let charCount = 0;
  const lines = LOGO_LINES.map((line) => {
    const remaining = logoChars - charCount;
    charCount += line.length + 1;
    if (remaining <= 0) return '';
    return line.slice(0, Math.max(0, remaining));
  });
  const logoDone = logoChars >= fullLogoText.length;

  // Tagline types after logo finishes
  const TAGLINE_START = 50;
  const taglineChars = Math.max(0, Math.floor((frame - TAGLINE_START) * 3));
  const visibleTagline = TAGLINE.slice(0, Math.min(taglineChars, TAGLINE.length));
  const taglineDone = taglineChars >= TAGLINE.length;

  // Version fades in after tagline
  const VERSION_START = TAGLINE_START + Math.ceil(TAGLINE.length / 3) + 10;
  const versionOpacity = interpolate(frame, [VERSION_START, VERSION_START + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor blinks 3 times then stops (after frame 240)
  const CURSOR_END = 240;
  const cursorVisible = frame < CURSOR_END && Math.floor(frame / 10) % 2 === 0;

  // Final fade to black (last 20 frames of 300)
  const fadeOpacity = interpolate(frame, [280, 300], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        opacity: fadeOpacity,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: FONT,
          fontSize: 18,
          color: THEME.white,
          whiteSpace: 'pre',
          lineHeight: 1.5,
          letterSpacing: 1,
          textAlign: 'center',
        }}
      >
        {lines.join('\n')}
        {!logoDone && (
          <span style={{ color: THEME.purple }}>█</span>
        )}
      </div>

      {/* Tagline */}
      {frame >= TAGLINE_START && (
        <div style={{ fontFamily: FONT, fontSize: 14, color: THEME.muted, letterSpacing: 3 }}>
          {visibleTagline}
          {!taglineDone && (
            <span style={{ opacity: Math.floor(frame / 6) % 2, color: THEME.purple }}>█</span>
          )}
        </div>
      )}

      {/* Version */}
      {frame >= VERSION_START && (
        <div
          style={{
            fontFamily: FONT,
            fontSize: 11,
            color: THEME.border,
            letterSpacing: 2,
            opacity: versionOpacity,
          }}
        >
          {VERSION}
        </div>
      )}

      {/* Final cursor */}
      {cursorVisible && frame >= VERSION_START + 20 && (
        <div style={{ fontFamily: FONT, fontSize: 18, color: THEME.purple }}>█</div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Finalise Video.tsx with all 4 acts**

```tsx
// oshx-video/src/Video.tsx
import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { THEME, ACT1_FRAMES, ACT2_FRAMES, ACT3_FRAMES, OUTRO_FRAMES } from './theme';
import { Act1 } from './components/act1/Act1';
import { Act2 } from './components/act2/Act2';
import { Act3 } from './components/act3/Act3';
import { Outro } from './components/Outro';

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
    <Series>
      <Series.Sequence durationInFrames={ACT1_FRAMES}>
        <Act1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT2_FRAMES}>
        <Act2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACT3_FRAMES}>
        <Act3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Full end-to-end scrub**

Open `http://localhost:3000`, select OshxVideo. Scrub the full 4200 frames and verify all 4 sections play in sequence without blank frames between them.

- [ ] **Step 4: Commit**

```bash
git add oshx-video/src/components/Outro.tsx oshx-video/src/Video.tsx
git commit -m "feat(video): Outro + final Video.tsx — all 4 acts wired"
```

---

## Task 14: Render the video

**Files:** No file changes — render output only.

- [ ] **Step 1: Render to MP4**

Run from `oshx-video/`:
```bash
bun run build
```
Or with explicit output:
```bash
npx remotion render OshxVideo out/oshx-video.mp4
```

Expected: progress bar 0→100%, final file `out/oshx-video.mp4` (~2m20s, ~150–300MB).

- [ ] **Step 2: Verify output**

Open `out/oshx-video.mp4` in any media player and check all 3 acts + outro play correctly.

- [ ] **Step 3: Commit**

```bash
echo "out/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore render output"
```
