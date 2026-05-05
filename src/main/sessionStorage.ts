import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

interface SessionData {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
    created_at: string
  }
}

// Simple encryption key (in production, use a better key management)
const ENCRYPTION_KEY = Buffer.from('zenvy-browser-2024-secure-key-32', 'utf-8').slice(0, 32)
const ALGORITHM = 'aes-256-cbc'

function getSessionFilePath(): string {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, 'zenvy-session.enc')
}

function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Save session to secure storage
 */
export function saveSession(session: SessionData): void {
  try {
    const sessionPath = getSessionFilePath()
    const jsonData = JSON.stringify(session)
    const encrypted = encrypt(jsonData)
    writeFileSync(sessionPath, encrypted, 'utf-8')
    console.log('[SessionStorage] Session saved')
  } catch (err) {
    console.error('[SessionStorage] Failed to save session:', err)
  }
}

/**
 * Get saved session
 */
export function getSession(): SessionData | null {
  try {
    const sessionPath = getSessionFilePath()
    
    if (!existsSync(sessionPath)) {
      console.log('[SessionStorage] No session file found')
      return null
    }

    const encrypted = readFileSync(sessionPath, 'utf-8')
    const decrypted = decrypt(encrypted)
    const session = JSON.parse(decrypted) as SessionData
    
    console.log('[SessionStorage] Session retrieved')
    return session
  } catch (err) {
    console.error('[SessionStorage] Failed to read session:', err)
    return null
  }
}

/**
 * Clear saved session
 */
export function clearSession(): void {
  try {
    const sessionPath = getSessionFilePath()
    
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath)
      console.log('[SessionStorage] Session cleared')
    }
  } catch (err) {
    console.error('[SessionStorage] Failed to clear session:', err)
  }
}

/**
 * Check if session exists
 */
export function hasSession(): boolean {
  const sessionPath = getSessionFilePath()
  return existsSync(sessionPath)
}
