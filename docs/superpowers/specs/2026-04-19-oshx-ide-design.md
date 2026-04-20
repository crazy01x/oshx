# OSHX IDE — Design Spec

**Date:** 2026-04-19
**Scope:** Phase 1 — IDE shell with Monaco editor, file tree, terminal, OAuth (GitHub)
**Phase 2 (separate spec):** Agent sidebar + MCP multi-agent coding integration

---

## Problem

OSHX agents operate through MCP tools but have no visual interface. Developers need a native IDE that:
1. Hosts the OSHX MCP server as a local process
2. Provides code editing, file navigation, and terminal
3. Authenticates users via OAuth (GitHub) to identify agents
4. Prepares the shell for Phase 2 agent integration

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Electron App                       │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │   Main Process  │    │   Renderer Process     │  │
│  │   (Node.js)     │◄──►│   (React + Monaco)     │  │
│  │                 │IPC │                        │  │
│  │  - Window mgmt  │    │  - Monaco Editor       │  │
│  │  - node-pty     │    │  - File tree sidebar   │  │
│  │  - OAuth flow   │    │  - Terminal panel      │  │
│  │  - Deeplinks    │    │  - User profile bar    │  │
│  │  - keytar       │    │                        │  │
│  └────────┬────────┘    └────────────────────────┘  │
│           │ JSON-RPC (stdin/stdout)                  │
│  ┌────────▼────────┐                                 │
│  │   Rust Sidecar  │                                 │
│  │   (Binary)      │                                 │
│  │                 │                                 │
│  │  - fs_watch     │                                 │
│  │  - LSP proxy    │                                 │
│  │  - git2-rs      │                                 │
│  └─────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
ide/
├── electron/                  # Electron main process
│   ├── main.ts                # App entry, window creation
│   ├── ipc-handlers.ts        # IPC bridge renderer ↔ main
│   ├── oauth.ts               # GitHub PKCE OAuth flow
│   ├── keychain.ts            # OS keychain via keytar
│   ├── sidecar.ts             # Rust sidecar spawn + JSON-RPC
│   └── terminal.ts            # node-pty terminal sessions
├── renderer/                  # React renderer
│   ├── src/
│   │   ├── App.tsx            # Root layout
│   │   ├── components/
│   │   │   ├── Editor.tsx     # Monaco Editor wrapper
│   │   │   ├── FileTree.tsx   # File explorer sidebar
│   │   │   ├── Terminal.tsx   # xterm.js terminal UI
│   │   │   ├── StatusBar.tsx  # Bottom status + user profile
│   │   │   └── LoginScreen.tsx # OAuth login gate
│   │   ├── hooks/
│   │   │   ├── useFiles.ts    # File tree state via IPC
│   │   │   ├── useEditor.ts   # Monaco state management
│   │   │   └── useAuth.ts     # Auth state + token refresh
│   │   └── store/
│   │       └── index.ts       # Zustand global store
│   └── index.html
├── rust-sidecar/              # Rust workspace
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs            # JSON-RPC server (stdin/stdout)
│       ├── fs_watch.rs        # File watching (notify crate)
│       ├── git.rs             # Git ops (git2 crate)
│       └── rpc.rs             # JSON-RPC dispatcher
├── shared/
│   └── types.ts               # Shared IPC + RPC type definitions
└── package.json               # Electron app package
```

---

## Components

### Electron Main Process

**`main.ts`**
- Creates BrowserWindow (1280×800, preload script)
- Registers deeplink protocol `oshx://`
- Spawns Rust sidecar on app ready
- Handles app lifecycle (quit, hide on close macOS)

**`oauth.ts`**
- PKCE flow: generates `code_verifier` + `code_challenge` (SHA-256)
- Opens `BrowserWindow` (popup, 600×700) to GitHub authorize URL
- Listens for `oshx://auth?code=XXX` deeplink
- Exchanges code for access token via GitHub API
- Saves token to OS keychain via `keytar`
- Emits `auth:complete` IPC event to renderer

**`sidecar.ts`**
- Spawns `rust-sidecar` binary on app ready
- Wraps stdin/stdout as JSON-RPC transport
- Pending requests stored in `Map<id, { resolve, reject, timeout }>`
- Timeout: 10s per request

**`terminal.ts`**
- Creates `node-pty` sessions keyed by `session_id`
- IPC: `terminal:create`, `terminal:input`, `terminal:resize`, `terminal:kill`
- Streams pty output via `terminal:data` IPC event

### Renderer

**`Editor.tsx`**
- Monaco Editor with TypeScript, Rust, and Python language support
- File open/save via IPC
- Dirty state tracking (unsaved changes indicator)
- Theme: dark (matches OSHX brand)

**`FileTree.tsx`**
- Receives file tree from IPC (Rust sidecar fs_watch)
- Context menu: new file, new folder, rename, delete
- Click to open file in editor

**`Terminal.tsx`**
- xterm.js component connected to node-pty session
- Supports multiple terminal tabs
- Fits on resize

**`LoginScreen.tsx`**
- Shown when no valid token in keychain
- "Login with GitHub" button → triggers OAuth flow
- Shows user avatar + name after login

**`StatusBar.tsx`**
- Bottom bar: file path, language mode, git branch, user avatar
- Click avatar → logout option

### Rust Sidecar

**JSON-RPC methods exposed:**
```
fs.readDir(path)          → FileNode[]
fs.readFile(path)         → string
fs.writeFile(path, text)  → void
fs.watch(path)            → streams FileChange events
git.status(repoPath)      → GitStatus
git.log(repoPath, n)      → Commit[]
git.diff(repoPath)        → string
lsp.initialize(langId)    → (Phase 2)
```

**FileChange event (stdout push):**
```json
{ "event": "fs.change", "data": { "path": "...", "kind": "modify|create|remove" } }
```

---

## OAuth Flow — GitHub PKCE

```
1. User clicks "Login with GitHub"
2. Main generates code_verifier (32 random bytes, base64url)
3. code_challenge = base64url(sha256(code_verifier))
4. Opens popup BrowserWindow to:
   https://github.com/login/oauth/authorize
     ?client_id=OSHX_GITHUB_CLIENT_ID
     &redirect_uri=oshx://auth
     &scope=read:user,repo
     &code_challenge=...
     &code_challenge_method=S256
5. GitHub redirects to oshx://auth?code=XXX
6. Electron deeplink handler catches it
7. POST https://github.com/login/oauth/access_token
     { client_id, code, code_verifier }
8. Store { access_token, login, avatar_url } in OS keychain
9. IPC → renderer: auth:complete { login, avatar_url }
```

**Environment variable:** `OSHX_GITHUB_CLIENT_ID` (set in `.env` at project root, loaded by Electron main)

---

## IPC Contract

All IPC uses Electron `ipcMain`/`ipcRenderer` with typed channels:

```typescript
// renderer → main (invoke/handle)
"fs:readDir"       args: { path: string }        → FileNode[]
"fs:readFile"      args: { path: string }         → string
"fs:writeFile"     args: { path: string, text: string } → void
"git:status"       args: { repoPath: string }     → GitStatus
"auth:login"       args: {}                       → void (triggers OAuth)
"auth:logout"      args: {}                       → void
"auth:getUser"     args: {}                       → User | null
"terminal:create"  args: { cwd: string }          → string (session_id)
"terminal:input"   args: { id: string, data: string } → void
"terminal:resize"  args: { id: string, cols: number, rows: number } → void
"terminal:kill"    args: { id: string }           → void

// main → renderer (send)
"terminal:data"    { id: string, data: string }
"fs:change"        { path: string, kind: string }
"auth:complete"    { login: string, avatar_url: string }
```

---

## Data Flow — Open File

```
User clicks file in FileTree
→ renderer: ipcRenderer.invoke("fs:readFile", { path })
→ main: ipcHandlers.ts reads file (or delegates to Rust for large files)
→ returns string
→ renderer: monaco.getModel(uri).setValue(content)
```

---

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Shell | Electron | 31+ |
| Renderer | React | 18 |
| Editor | Monaco Editor | 0.50+ |
| Terminal UI | xterm.js | 5+ |
| State | Zustand | 4+ |
| Styling | Tailwind CSS | 3+ |
| Build | Vite + electron-vite | latest |
| Rust runtime | Tokio | 1+ |
| File watch | notify (Rust) | 6+ |
| Git ops | git2 (Rust) | 0.19+ |
| JSON-RPC | serde_json (Rust) | 1+ |
| OS keychain | keytar (Node) | 7+ |
| PTY | node-pty | 1+ |

---

## Error Handling

- **OAuth failure**: Show error toast, allow retry. Never leave user in broken state.
- **Sidecar crash**: Main process detects exit, attempts restart (max 3 times), shows error banner.
- **File write fail**: Toast error, keep unsaved content in editor.
- **Terminal session die**: Show "[Process exited]" in terminal, allow respawn.

---

## Testing

- Rust sidecar: `cargo test` — unit tests per module (fs_watch, git, rpc)
- Electron main: Jest — mock IPC, test OAuth state machine
- Renderer: Vitest + React Testing Library — component tests

---

## Out of Scope (Phase 1)

- Agent sidebar (Phase 2)
- MCP server integration (Phase 2)
- Multi-user collaboration
- Extensions/plugins
- Google OAuth (can add later)
- LSP full implementation (Rust sidecar scaffolded, not wired)
