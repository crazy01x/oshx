import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import { randomUUID } from 'crypto'

interface Session {
  pty: pty.IPty
}

const sessions = new Map<string, Session>()

export function registerTerminalHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('terminal:create', (_, { cwd }: { cwd: string }) => {
    const id = randomUUID()
    const shell = process.platform === 'win32'
      ? 'powershell.exe'
      : (process.env.SHELL ?? '/bin/bash')
    const p = pty.spawn(shell, [], {
      cwd,
      cols: 80,
      rows: 24,
      env: process.env as Record<string, string>,
    })

    p.onData((data) => {
      mainWindow?.webContents.send('terminal:data', id, data)
    })

    p.onExit(() => {
      sessions.delete(id)
      mainWindow?.webContents.send('terminal:data', id, '\r\n[Process exited]\r\n')
    })

    sessions.set(id, { pty: p })
    return id
  })

  ipcMain.handle('terminal:input', (_, { id, data }: { id: string; data: string }) => {
    sessions.get(id)?.pty.write(data)
  })

  ipcMain.handle('terminal:resize', (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    sessions.get(id)?.pty.resize(cols, rows)
  })

  ipcMain.handle('terminal:kill', (_, { id }: { id: string }) => {
    sessions.get(id)?.pty.kill()
    sessions.delete(id)
  })
}
