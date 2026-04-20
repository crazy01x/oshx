import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { sidecar } from './sidecar'
import { registerIpcHandlers } from './ipc-handlers'
import { registerAuthHandlers } from './oauth'
import { registerTerminalHandlers } from './terminal'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

if (process.defaultApp) {
  app.setAsDefaultProtocolClient('oshx', process.execPath, [join(__dirname, '../../')])
} else {
  app.setAsDefaultProtocolClient('oshx')
}

app.whenReady().then(() => {
  sidecar.start()
  registerIpcHandlers()
  registerAuthHandlers(mainWindow)
  registerTerminalHandlers(mainWindow)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    sidecar.stop()
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.on('second-instance', (_event, argv) => {
  const url = argv.find(a => a.startsWith('oshx://'))
  if (url) app.emit('open-url', null, url)
  if (mainWindow) { mainWindow.restore(); mainWindow.focus() }
})

app.on('open-url', (_event, url) => {
  app.emit('oshx-deeplink', url)
})
