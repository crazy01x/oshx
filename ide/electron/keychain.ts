import keytar from 'keytar'

const SERVICE = 'oshx-ide'
const ACCOUNT = 'github-token'
const USER_KEY = 'github-user'

export interface StoredAuth {
  access_token: string
  login: string
  avatar_url: string
}

export async function saveAuth(auth: StoredAuth): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, auth.access_token)
  await keytar.setPassword(SERVICE, USER_KEY, JSON.stringify({ login: auth.login, avatar_url: auth.avatar_url }))
}

export async function loadAuth(): Promise<StoredAuth | null> {
  const token = await keytar.getPassword(SERVICE, ACCOUNT)
  const userJson = await keytar.getPassword(SERVICE, USER_KEY)
  if (!token || !userJson) return null
  try {
    const { login, avatar_url } = JSON.parse(userJson)
    return { access_token: token, login, avatar_url }
  } catch {
    return null
  }
}

export async function clearAuth(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT)
  await keytar.deletePassword(SERVICE, USER_KEY)
}
