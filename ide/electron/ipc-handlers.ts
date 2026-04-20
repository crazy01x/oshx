import { ipcMain } from 'electron'
import { sidecar } from './sidecar'
import type { FileNode, GitStatus, GitCommit } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_, { path }: { path: string }) =>
    sidecar.call<FileNode[]>('fs.readDir', { path })
  )

  ipcMain.handle('fs:readFile', (_, { path }: { path: string }) =>
    sidecar.call<string>('fs.readFile', { path })
  )

  ipcMain.handle('fs:writeFile', (_, { path, text }: { path: string; text: string }) =>
    sidecar.call<{ written: boolean }>('fs.writeFile', { path, text })
  )

  ipcMain.handle('git:status', (_, { path }: { path: string }) =>
    sidecar.call<GitStatus>('git.status', { path })
  )

  ipcMain.handle('git:log', (_, { path, n }: { path: string; n?: number }) =>
    sidecar.call<GitCommit[]>('git.log', { path, n: n ?? 10 })
  )

  ipcMain.handle('git:diff', (_, { path }: { path: string }) =>
    sidecar.call<string>('git.diff', { path })
  )
}
