import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { StoreSchema, Profile, Group } from '../shared/types'

function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function getDbPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'zenvy-data.json')
}

function getProfileDir(profileId: string): string {
  return join(app.getPath('userData'), 'profiles', profileId)
}

function normalizeGroup(group: any): Group {
  const rawName = group?.name
  const name =
    typeof rawName === 'string'
      ? rawName
      : typeof rawName?.name === 'string'
        ? rawName.name
        : 'Untitled Group'
  return {
    id: String(group?.id ?? uuidv4()),
    workspaceId: typeof group?.workspaceId === 'string' ? group.workspaceId : null,
    name,
    createdAt: typeof group?.createdAt === 'number' ? group.createdAt : Date.now()
  }
}

function normalizeProfile(profile: any): Profile {
  const { tags: _tags, ...rest } = profile ?? {}
  return {
    ...rest,
    id: String(profile?.id ?? ''),
    displayId: typeof profile?.displayId === 'string' ? profile.displayId : undefined,
    workspaceId: typeof profile?.workspaceId === 'string' ? profile.workspaceId : null,
    groupId: typeof profile?.groupId === 'string' ? profile.groupId : null,
  }
}

function getUsedDisplayIds(profiles: Profile[]): Set<number> {
  return new Set(
    profiles
      .map((profile) => Number(profile.displayId))
      .filter((value) => Number.isInteger(value) && value >= 1001)
  )
}

function nextAvailableDisplayId(used: Set<number>, start: number): number {
  let value = Math.max(1001, start)
  while (used.has(value)) value += 1
  return value
}

function ensureProfileDisplayIds(data: StoreSchema): { data: StoreSchema; changed: boolean } {
  let changed = false
  const used = getUsedDisplayIds(data.profiles)
  const seen = new Set<number>()
  let nextId = nextAvailableDisplayId(used, data.nextProfileDisplayId ?? 1001)

  const profiles = [...data.profiles]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((profile) => {
      const current = Number(profile.displayId)
      if (Number.isInteger(current) && current >= 1001 && !seen.has(current)) {
        seen.add(current)
        return profile
      }

      const displayId = nextId
      used.add(displayId)
      seen.add(displayId)
      nextId = nextAvailableDisplayId(used, displayId + 1)
      changed = true
      return { ...profile, displayId: String(displayId), updatedAt: profile.updatedAt ?? Date.now() }
    })

  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  const orderedProfiles = data.profiles.map((profile) => byId.get(profile.id) ?? profile)
  const storedNextId = data.nextProfileDisplayId ?? 1001
  if (nextId !== storedNextId) changed = true

  return {
    data: {
      ...data,
      profiles: orderedProfiles,
      nextProfileDisplayId: nextId,
    },
    changed,
  }
}

function reserveProfileDisplayId(data: StoreSchema): string {
  const used = getUsedDisplayIds(data.profiles)
  const displayId = nextAvailableDisplayId(used, data.nextProfileDisplayId ?? 1001)
  used.add(displayId)
  data.nextProfileDisplayId = nextAvailableDisplayId(used, displayId + 1)
  return String(displayId)
}

function read(): StoreSchema {
  const path = getDbPath()
  if (!existsSync(path)) return { profiles: [], groups: [], scripts: [] }
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    const normalized = {
      profiles: Array.isArray(data.profiles) ? data.profiles.map(normalizeProfile) : [],
      groups: Array.isArray(data.groups) ? data.groups.map(normalizeGroup) : [],
      scripts: Array.isArray(data.scripts) ? data.scripts : [],
      nextProfileDisplayId: typeof data.nextProfileDisplayId === 'number' ? data.nextProfileDisplayId : undefined,
    }
    const migrated = ensureProfileDisplayIds(normalized)
    if (migrated.changed) {
      writeFileSync(path, JSON.stringify(migrated.data, null, 2), 'utf-8')
    }
    return migrated.data
  } catch {
    return { profiles: [], groups: [], scripts: [] }
  }
}

function write(data: StoreSchema): void {
  writeFileSync(getDbPath(), JSON.stringify(data, null, 2), 'utf-8')
}

function migrateLegacyProfileIds(data: StoreSchema): StoreSchema {
  let changed = false

  const profiles = data.profiles.map((profile) => {
    if (isUuid(profile.id)) return profile

    const oldId = profile.id
    const newId = uuidv4()
    changed = true

    const oldDir = getProfileDir(oldId)
    const newDir = getProfileDir(newId)
    try {
      if (existsSync(oldDir) && !existsSync(newDir)) {
        renameSync(oldDir, newDir)
      }
    } catch (err) {
      console.warn('[DB] Failed to rename legacy profile folder:', err)
    }

    return { ...profile, id: newId, updatedAt: Date.now() }
  })

  if (!changed) return data

  return {
    ...data,
    profiles,
    scripts: data.scripts,
  }
}

export function migrateForCloudSync(): void {
  const data = migrateLegacyProfileIds(read())
  write(data)
}

// ── Groups ──────────────────────────────────────────────────────────────────

export function getGroups(workspaceId?: string | null): Group[] {
  const groups = read().groups
  return workspaceId ? groups.filter((group) => group.workspaceId === workspaceId) : groups
}

export function createGroup(name: string, workspaceId?: string | null): Group {
  const data = read()
  const group: Group = { id: uuidv4(), workspaceId: workspaceId ?? null, name, createdAt: Date.now() }
  data.groups.unshift(group)
  write(data)
  return group
}

export function updateGroup(id: string, name: string): Group | null {
  const data = read()
  const idx = data.groups.findIndex((g) => g.id === id)
  if (idx === -1) return null
  data.groups[idx] = { ...data.groups[idx], name }
  write(data)
  return data.groups[idx]
}

export function deleteGroup(id: string): void {
  const data = read()
  data.groups = data.groups.filter((g) => g.id !== id)
  data.profiles = data.profiles.map((p) => (p.groupId === id ? { ...p, groupId: null } : p))
  write(data)
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export function getProfiles(workspaceId?: string | null): Profile[] {
  const profiles = read().profiles
  return workspaceId ? profiles.filter((profile) => profile.workspaceId === workspaceId) : profiles
}

export function createProfile(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>, workspaceId?: string | null): Profile {
  const db = read()
  const profile: Profile = { ...data, workspaceId: data.workspaceId ?? workspaceId ?? null, id: uuidv4(), displayId: reserveProfileDisplayId(db), createdAt: Date.now(), updatedAt: Date.now() }
  db.profiles.unshift(profile)
  write(db)
  return profile
}

export function updateProfile(id: string, data: Partial<Omit<Profile, 'id' | 'createdAt'>>): Profile | null {
  const db = read()
  const idx = db.profiles.findIndex((p) => p.id === id)
  if (idx === -1) return null
  db.profiles[idx] = { ...db.profiles[idx], ...data, updatedAt: Date.now() }
  write(db)
  return db.profiles[idx]
}

export function deleteProfile(id: string): void {
  const db = read()
  db.profiles = db.profiles.filter((p) => p.id !== id)
  write(db)
}

export function deleteProfiles(ids: string[]): void {
  const db = read()
  db.profiles = db.profiles.filter((p) => !ids.includes(p.id))
  write(db)
}

export function duplicateProfile(id: string): Profile | null {
  const db = read()
  const original = db.profiles.find((p) => p.id === id)
  if (!original) return null
  const duplicate: Profile = {
    ...original,
    id: uuidv4(),
    displayId: reserveProfileDisplayId(db),
    name: `${original.name} Copy`,
    status: 'closed',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  db.profiles.unshift(duplicate)
  write(db)
  return duplicate
}

// ── Import/Export ────────────────────────────────────────────────────────────

export function exportProfiles(ids: string[]): string {
  const db = read()
  const profiles = db.profiles.filter((p) => ids.includes(p.id))
  return JSON.stringify({ version: '1.0.0', exportDate: Date.now(), profiles }, null, 2)
}

export function importProfiles(jsonData: string, workspaceId?: string | null): Profile[] {
  const db = read()
  const importData = JSON.parse(jsonData)
  if (!importData.profiles || !Array.isArray(importData.profiles)) {
    throw new Error('Invalid import data')
  }
  const imported: Profile[] = []
  for (let i = importData.profiles.length - 1; i >= 0; i--) {
    const { tags: _t, displayId: _displayId, ...profileData } = importData.profiles[i]
    const newProfile: Profile = {
      ...profileData,
      workspaceId: workspaceId ?? profileData.workspaceId ?? null,
      id: uuidv4(),
      displayId: reserveProfileDisplayId(db),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'closed',
    }
    db.profiles.unshift(newProfile)
    imported.unshift(newProfile)
  }
  write(db)
  return imported
}

export function replaceGroupsAndProfiles(groups: Group[], profiles: Profile[], workspaceId?: string | null): void {
  const db = read()
  if (workspaceId) {
    const nextData = ensureProfileDisplayIds({
      ...db,
      groups: [
        ...db.groups.filter((group) => group.workspaceId && group.workspaceId !== workspaceId),
        ...groups,
      ],
      profiles: [
        ...db.profiles.filter((profile) => profile.workspaceId && profile.workspaceId !== workspaceId),
        ...profiles,
      ],
    }).data
    write(nextData)
    return
  }
  const nextData = ensureProfileDisplayIds({
    ...db,
    groups,
    profiles,
  }).data
  write(nextData)
}
