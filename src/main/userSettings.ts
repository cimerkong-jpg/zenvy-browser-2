import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { UserProfile } from '../shared/types'

function getUserPath(): string {
  return join(app.getPath('userData'), 'zenvy-user.json')
}

const defaults: UserProfile = {
  displayName: 'Người dùng',
  email: '',
  avatarColor: '#7C3AED',
  plan: 'Personal',
  activatedAt: Date.now(),
}

export function getUser(): UserProfile {
  const path = getUserPath()
  if (!existsSync(path)) return { ...defaults }
  try {
    return { ...defaults, ...JSON.parse(readFileSync(path, 'utf-8')) }
  } catch {
    return { ...defaults }
  }
}

export function updateUser(partial: Partial<UserProfile>): UserProfile {
  const current = getUser()
  const updated = { ...current, ...partial }
  writeFileSync(getUserPath(), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
