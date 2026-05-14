import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { app, safeStorage } from 'electron'

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

// Legacy key kept only so older session files can be read and migrated.
const LEGACY_ENCRYPTION_KEY = Buffer.from('zenvy-browser-2024-secure-key-32', 'utf-8').slice(0, 32)
const ALGORITHM = 'aes-256-cbc'
const SAFE_STORAGE_PREFIX = 'safe:'

function getSessionFilePath(): string {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, 'zenvy-session.enc')
}

function encrypt(text: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return SAFE_STORAGE_PREFIX + safeStorage.encryptString(text).toString('base64')
  }

  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, LEGACY_ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  if (text.startsWith(SAFE_STORAGE_PREFIX)) {
    const encrypted = Buffer.from(text.slice(SAFE_STORAGE_PREFIX.length), 'base64')
    return safeStorage.decryptString(encrypted)
  }

  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = createDecipheriv(ALGORITHM, LEGACY_ENCRYPTION_KEY, iv)
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
    if (!encrypted.startsWith(SAFE_STORAGE_PREFIX) && safeStorage.isEncryptionAvailable()) {
      saveSession(session)
    }
    
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
