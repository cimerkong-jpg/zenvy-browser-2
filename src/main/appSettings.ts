import { app, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppSettings } from '../shared/types'

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'zenvy-settings.json')
}

/**
 * Auto-detect Chrome path on user's system
 * Tries multiple common locations and returns the first one that exists
 */
export function detectChromePath(): string {
  console.log('[Settings] Auto-detecting Chrome path...')
  
  let possiblePaths: string[] = []
  
  switch (process.platform) {
    case 'darwin':
      possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        join(process.env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      ]
      break
    case 'win32':
      possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      ]
      break
    default: // Linux
      possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ]
      break
  }
  
  // Find first path that exists
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log('[Settings] Chrome found at:', path)
      return path
    }
  }
  
  console.warn('[Settings] Chrome not found in common locations')
  // Return default path even if not exists (user can select manually)
  return possiblePaths[0]
}

const defaults: AppSettings = {
  chromePath: '',
  autoCloseOnExit: true,
  chromeRetries: 3,
}

export function getSettings(): AppSettings {
  const path = getSettingsPath()
  const detected = detectChromePath()
  if (!existsSync(path)) return { ...defaults, chromePath: detected }
  try {
    const saved = JSON.parse(readFileSync(path, 'utf-8'))
    return { ...defaults, chromePath: detected, ...saved }
  } catch {
    return { ...defaults, chromePath: detected }
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated = { ...current, ...partial }
  writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}

export function openDataDir(): void {
  shell.openPath(app.getPath('userData'))
}

export function getDataDir(): string {
  return app.getPath('userData')
}

export function backup(): Record<string, unknown> {
  const dir = app.getPath('userData')
  const files = [
    'zenvy-data.json',
    'zenvy-scripts.json',
    'zenvy-scheduler.json',
    'zenvy-history.json',
    'zenvy-settings.json',
    'zenvy-user.json',
  ]
  const result: Record<string, unknown> = { version: '1.0.0', backupDate: Date.now() }
  for (const file of files) {
    const p = join(dir, file)
    if (existsSync(p)) {
      try { result[file] = JSON.parse(readFileSync(p, 'utf-8')) } catch { /* skip */ }
    }
  }
  return result
}

export function restore(data: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  const files = [
    'zenvy-data.json',
    'zenvy-scripts.json',
    'zenvy-scheduler.json',
    'zenvy-history.json',
    'zenvy-settings.json',
    'zenvy-user.json',
  ]
  for (const file of files) {
    if (data[file]) {
      writeFileSync(join(dir, file), JSON.stringify(data[file], null, 2), 'utf-8')
    }
  }
}
