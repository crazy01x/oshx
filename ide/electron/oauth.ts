import { BrowserWindow, ipcMain, app } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { saveAuth, loadAuth, clearAuth, type StoredAuth } from './keychain'

const CLIENT_ID = process.env.OSHX_GITHUB_CLIENT_ID ?? ''
const REDIRECT_URI = 'oshx://auth'
const SCOPE = 'read:user'

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

async function exchangeCode(code: string, verifier: string): Promise<StoredAuth> {
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, code, code_verifier: verifier }),
  })
  const data = await resp.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error ?? 'no token received')

  const userResp = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json' },
  })
  const user = await userResp.json() as { login: string; avatar_url: string }
  return { access_token: data.access_token, login: user.login, avatar_url: user.avatar_url }
}

export function registerAuthHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('auth:login', async () => {
    const { verifier, challenge } = generatePKCE()
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')

    const popup = new BrowserWindow({ width: 600, height: 700, parent: mainWindow ?? undefined })
    popup.loadURL(url.toString())

    return new Promise<void>((resolve, reject) => {
      const onDeeplink = async (_: unknown, rawUrl: string) => {
        if (!rawUrl.startsWith('oshx://auth')) return
        popup.destroy()
        try {
          const parsed = new URL(rawUrl)
          const code = parsed.searchParams.get('code')
          if (!code) throw new Error('no code in redirect')
          const auth = await exchangeCode(code, verifier)
          await saveAuth(auth)
          mainWindow?.webContents.send('auth:complete', { login: auth.login, avatar_url: auth.avatar_url })
          resolve()
        } catch (e) {
          mainWindow?.webContents.send('auth:error', (e as Error).message)
          reject(e)
        }
        app.removeListener('oshx-deeplink', onDeeplink)
      }
      app.on('oshx-deeplink', onDeeplink)
      popup.on('closed', () => {
        app.removeListener('oshx-deeplink', onDeeplink)
        resolve()
      })
    })
  })

  ipcMain.handle('auth:logout', async () => {
    await clearAuth()
  })

  ipcMain.handle('auth:getUser', async () => {
    return loadAuth()
  })
}
