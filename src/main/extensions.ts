import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, readdirSync, cpSync } from 'fs'
import { join } from 'path'
import type { ExtensionInfo } from '../shared/types'
import { getCurrentWorkspaceId } from './workspaces'

function getProfileUserDataDir(profileId: string): string {
  const workspaceId = getCurrentWorkspaceId()
  return workspaceId
    ? join(app.getPath('userData'), 'workspaces', workspaceId, 'profiles', profileId)
    : join(app.getPath('userData'), 'profiles', profileId)
}

function getExtDir(profileId: string): string {
  return join(getProfileUserDataDir(profileId), 'Default', 'Extensions')
}

function getPreferencesPath(profileId: string): string {
  return join(getProfileUserDataDir(profileId), 'Default', 'Preferences')
}

function readPreferences(profileId: string): Record<string, any> {
  const path = getPreferencesPath(profileId)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

// Chrome internal extension IDs to skip
const INTERNAL_EXT_IDS = new Set([
  'nmmhkkegccagdldgiimedpiccmgmieda', // Chrome Web Store
  'pkedcjkdefgpdelpbcmbmeomcjbeemfm', // Chrome Cast
  'mhjfbmdgcfjbbpaeojofohoefgiehjai', // Chrome PDF viewer
  'ghbmnnjooekpmoecnnnilnnbdlolhkhi', // Google Docs Offline
])

export function getExtensions(profileId: string): ExtensionInfo[] {
  const extDir = getExtDir(profileId)
  if (!existsSync(extDir)) return []

  const prefs = readPreferences(profileId)
  const extSettings: Record<string, any> = prefs?.extensions?.settings ?? {}
  const results: ExtensionInfo[] = []

  let extIds: string[] = []
  try {
    extIds = readdirSync(extDir)
  } catch {
    return []
  }

  for (const extId of extIds) {
    if (INTERNAL_EXT_IDS.has(extId)) continue

    const extPath = join(extDir, extId)
    let versions: string[] = []
    try {
      versions = readdirSync(extPath)
    } catch {
      continue
    }

    const versionDir = versions[0]
    if (!versionDir) continue

    const manifestPath = join(extPath, versionDir, 'manifest.json')
    if (!existsSync(manifestPath)) continue

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const state = extSettings[extId]?.state
      const enabled = state !== 0

      results.push({
        id: extId,
        name: typeof manifest.name === 'string' ? manifest.name : extId,
        version: typeof manifest.version === 'string' ? manifest.version : versionDir,
        description: typeof manifest.description === 'string' ? manifest.description : '',
        enabled,
      })
    } catch {
      continue
    }
  }

  return results
}

export function toggleExtension(profileId: string, extId: string, enabled: boolean): boolean {
  const path = getPreferencesPath(profileId)
  if (!existsSync(path)) return false

  try {
    const prefs = JSON.parse(readFileSync(path, 'utf-8'))
    if (!prefs.extensions) prefs.extensions = {}
    if (!prefs.extensions.settings) prefs.extensions.settings = {}
    if (!prefs.extensions.settings[extId]) prefs.extensions.settings[extId] = {}
    prefs.extensions.settings[extId].state = enabled ? 1 : 0
    writeFileSync(path, JSON.stringify(prefs), 'utf-8')
    return true
  } catch {
    return false
  }
}

export function copyExtensions(
  fromProfileId: string,
  toProfileIds: string[],
  extIds: string[]
): { success: number; failed: number } {
  const fromExtDir = getExtDir(fromProfileId)
  let success = 0
  let failed = 0

  for (const toProfileId of toProfileIds) {
    const toExtDir = getExtDir(toProfileId)
    for (const extId of extIds) {
      const src = join(fromExtDir, extId)
      const dest = join(toExtDir, extId)
      if (!existsSync(src)) { failed++; continue }
      try {
        cpSync(src, dest, { recursive: true })
        success++
      } catch {
        failed++
      }
    }
  }

  return { success, failed }
}
