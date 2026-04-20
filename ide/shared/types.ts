// ── Rust Sidecar JSON-RPC ─────────────────────────────────────────────────────

export interface RpcRequest {
  id: string
  method: string
  params: unknown
}

export interface RpcResponse {
  id: string
  result?: unknown
  error?: string
}

export interface RpcEvent {
  event: string
  data: unknown
}

// ── File System ───────────────────────────────────────────────────────────────

export interface FileNode {
  name: string
  path: string
  kind: 'file' | 'dir'
  children?: FileNode[]
}

export interface FileChange {
  path: string
  kind: 'create' | 'modify' | 'remove'
}

// ── Git ───────────────────────────────────────────────────────────────────────

export interface GitStatusEntry {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'untracked'
}

export interface GitStatus {
  branch: string
  entries: GitStatusEntry[]
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  timestamp: number
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  login: string
  avatar_url: string
  access_token: string
}

// ── IPC Channels ─────────────────────────────────────────────────────────────

export type IpcChannel =
  | 'fs:readDir'
  | 'fs:readFile'
  | 'fs:writeFile'
  | 'git:status'
  | 'git:log'
  | 'git:diff'
  | 'auth:login'
  | 'auth:logout'
  | 'auth:getUser'
  | 'terminal:create'
  | 'terminal:input'
  | 'terminal:resize'
  | 'terminal:kill'

// Main → renderer push events
export type IpcEvent =
  | 'terminal:data'
  | 'fs:change'
  | 'auth:complete'
  | 'auth:error'
