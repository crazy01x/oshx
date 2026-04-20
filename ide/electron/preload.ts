import { contextBridge, ipcRenderer } from 'electron'
import type { FileNode, GitStatus, GitCommit, User } from '../shared/types'

contextBridge.exposeInMainWorld('oshx', {
  readDir: (path: string): Promise<FileNode[]> =>
    ipcRenderer.invoke('fs:readDir', { path }),
  readFile: (path: string): Promise<string> =>
    ipcRenderer.invoke('fs:readFile', { path }),
  writeFile: (path: string, text: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', { path, text }),

  gitStatus: (path: string): Promise<GitStatus> =>
    ipcRenderer.invoke('git:status', { path }),
  gitLog: (path: string, n?: number): Promise<GitCommit[]> =>
    ipcRenderer.invoke('git:log', { path, n }),
  gitDiff: (path: string): Promise<string> =>
    ipcRenderer.invoke('git:diff', { path }),

  login: (): Promise<void> => ipcRenderer.invoke('auth:login'),
  logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
  getUser: (): Promise<User | null> => ipcRenderer.invoke('auth:getUser'),

  terminalCreate: (cwd: string): Promise<string> =>
    ipcRenderer.invoke('terminal:create', { cwd }),
  terminalInput: (id: string, data: string): Promise<void> =>
    ipcRenderer.invoke('terminal:input', { id, data }),
  terminalResize: (id: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
  terminalKill: (id: string): Promise<void> =>
    ipcRenderer.invoke('terminal:kill', { id }),

  onTerminalData: (cb: (id: string, data: string) => void) =>
    ipcRenderer.on('terminal:data', (_, id, data) => cb(id, data)),
  onFsChange: (cb: (path: string, kind: string) => void) =>
    ipcRenderer.on('fs:change', (_, path, kind) => cb(path, kind)),
  onAuthComplete: (cb: (user: User) => void) =>
    ipcRenderer.on('auth:complete', (_, user) => cb(user)),
  onAuthError: (cb: (msg: string) => void) =>
    ipcRenderer.on('auth:error', (_, msg) => cb(msg)),
})

export {}
