import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { StoreSchema, Profile, Group, Tag } from '../shared/types'

// Generate UUID without external dependency
function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function nextProfileId(profiles: Profile[]): string {
  const maxId = profiles.reduce((max, profile) => {
    if (!/^\d+$/.test(profile.id)) return max
    return Math.max(max, Number(profile.id))
  }, 1000)

  return String(maxId + 1)
}

function getDbPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'zenvy-data.json')
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
    name,
    createdAt: typeof group?.createdAt === 'number' ? group.createdAt : Date.now()
  }
}

function normalizeProfile(profile: any): Profile {
  return {
    ...profile,
    id: String(profile?.id ?? ''),
    groupId: typeof profile?.groupId === 'string' ? profile.groupId : null,
    tags: Array.isArray(profile?.tags) ? profile.tags.filter((tag: unknown) => typeof tag === 'string') : []
  }
}

function read(): StoreSchema {
  const path = getDbPath()
  if (!existsSync(path)) return { profiles: [], groups: [], tags: [] }
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return {
      profiles: Array.isArray(data.profiles) ? data.profiles.map(normalizeProfile) : [],
      groups: Array.isArray(data.groups) ? data.groups.map(normalizeGroup) : [],
      tags: Array.isArray(data.tags) ? data.tags : []
    }
  } catch {
    return { profiles: [], groups: [], tags: [] }
  }
}

function write(data: StoreSchema): void {
  writeFileSync(getDbPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Groups ──────────────────────────────────────────────────────────────────

export function getGroups(): Group[] {
  return read().groups
}

export function createGroup(name: string): Group {
  const data = read()
  const group: Group = { id: uuidv4(), name, createdAt: Date.now() }
  data.groups.push(group)
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

export function getProfiles(): Profile[] {
  return read().profiles
}

export function createProfile(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Profile {
  const db = read()
  const profile: Profile = { ...data, id: nextProfileId(db.profiles), createdAt: Date.now(), updatedAt: Date.now() }
  db.profiles.push(profile)
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
    id: nextProfileId(db.profiles),
    name: `${original.name} Copy`,
    status: 'closed',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  db.profiles.push(duplicate)
  write(db)
  return duplicate
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export function getTags(): Tag[] {
  return read().tags
}

export function createTag(name: string, color: string): Tag {
  const data = read()
  const tag: Tag = { id: uuidv4(), name, color, createdAt: Date.now() }
  data.tags.push(tag)
  write(data)
  return tag
}

export function deleteTag(id: string): void {
  const data = read()
  data.tags = data.tags.filter((t) => t.id !== id)
  data.profiles = data.profiles.map((p) => ({
    ...p,
    tags: p.tags.filter((t) => t !== id)
  }))
  write(data)
}

// ── Import/Export ────────────────────────────────────────────────────────────

export function exportProfiles(ids: string[]): string {
  const db = read()
  const profiles = db.profiles.filter((p) => ids.includes(p.id))

  const exportData = {
    version: '1.0.0',
    exportDate: Date.now(),
    profiles
  }

  return JSON.stringify(exportData, null, 2)
}

export function importProfiles(jsonData: string): Profile[] {
  const db = read()
  const importData = JSON.parse(jsonData)

  if (!importData.profiles || !Array.isArray(importData.profiles)) {
    throw new Error('Invalid import data')
  }

  const imported: Profile[] = []

  for (const profile of importData.profiles) {
    const newProfile: Profile = {
      ...profile,
      id: nextProfileId(db.profiles),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'closed',
      tags: profile.tags || []
    }

    db.profiles.push(newProfile)
    imported.push(newProfile)
  }

  write(db)
  return imported
}
