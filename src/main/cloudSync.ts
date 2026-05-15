import { getSupabase, isSupabaseConfigured } from './supabase'
import { getCurrentUser } from './auth'
import { getCurrentWorkspaceId } from './workspaces'
import * as db from './db'
import * as cookiesStore from './cookies'
import type { Group, Profile } from '../shared/types'
import type { Cookie } from './cookies'

type CloudGroup = {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type CloudProfile = {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  group_id: string | null
  notes: string
  proxy: Profile['proxy']
  fingerprint: Profile['fingerprint']
  variables: Record<string, string>
  status: Profile['status']
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type CloudProfileCookies = {
  profile_id: string
  user_id: string
  cookies: Cookie[]
  cookie_count: number
  byte_size: number
  encrypted: boolean
  created_at: string
  updated_at: string
}

let syncInFlight: { workspaceId: string; promise: Promise<void> } | null = null
const lastSyncAtByWorkspace = new Map<string, number>()

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function fromIso(value: string | null | undefined): number {
  if (!value) return Date.now()
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : Date.now()
}

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const user = await getCurrentUser()
  return user?.id ?? null
}

function toCloudGroup(group: Group, userId: string, workspaceId: string) {
  return {
    id: group.id,
    user_id: userId,
    workspace_id: workspaceId,
    created_by: userId,
    updated_by: userId,
    name: group.name,
    created_at: toIso(group.createdAt),
    deleted_at: null,
  }
}

function fromCloudGroup(row: CloudGroup): Group {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    createdAt: fromIso(row.created_at),
  }
}

function toCloudProfile(profile: Profile, userId: string, workspaceId: string) {
  return {
    id: profile.id,
    user_id: userId,
    workspace_id: workspaceId,
    created_by: userId,
    updated_by: userId,
    name: profile.name,
    group_id: profile.groupId,
    notes: profile.notes ?? '',
    proxy: profile.proxy,
    fingerprint: profile.fingerprint,
    variables: profile.variables ?? {},
    status: profile.status ?? 'closed',
    created_at: toIso(profile.createdAt),
    updated_at: toIso(profile.updatedAt),
    deleted_at: null,
  }
}

function fromCloudProfile(row: CloudProfile): Profile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    groupId: row.group_id,
    notes: row.notes ?? '',
    status: row.status ?? 'closed',
    proxy: row.proxy,
    fingerprint: row.fingerprint,
    cookies: '',
    variables: row.variables ?? {},
    createdAt: fromIso(row.created_at),
    updatedAt: fromIso(row.updated_at),
  }
}

function cookieByteSize(cookies: Cookie[]): number {
  return Buffer.byteLength(JSON.stringify(cookies), 'utf8')
}

function mergeGroups(localGroups: Group[], cloudGroups: Group[]): Group[] {
  const merged = new Map<string, Group>()
  for (const group of cloudGroups) merged.set(group.id, group)
  for (const group of localGroups) merged.set(group.id, group)
  return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt)
}

function mergeProfiles(localProfiles: Profile[], cloudProfiles: Profile[]): Profile[] {
  const merged = new Map<string, Profile>()

  for (const profile of cloudProfiles) {
    merged.set(profile.id, profile)
  }

  for (const profile of localProfiles) {
    const existing = merged.get(profile.id)
    if (!existing || profile.updatedAt >= existing.updatedAt) {
      merged.set(profile.id, profile)
    }
  }

  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

async function pushGroups(groups: Group[], userId: string, workspaceId: string): Promise<void> {
  const rows = groups
    .filter((group) => isUuid(group.id))
    .map((group) => toCloudGroup(group, userId, group.workspaceId ?? workspaceId))

  if (rows.length === 0) return

  const { error } = await getSupabase()
    .from('groups')
    .upsert(rows, { onConflict: 'id' })

  if (error) throw error
}

async function pushProfiles(profiles: Profile[], userId: string, workspaceId: string): Promise<void> {
  const rows = profiles
    .filter((profile) => isUuid(profile.id))
    .map((profile) => toCloudProfile(profile, userId, profile.workspaceId ?? workspaceId))

  if (rows.length === 0) return

  const { error } = await getSupabase()
    .from('profiles')
    .upsert(rows, { onConflict: 'id' })

  if (error) throw error
}

async function pullGroups(): Promise<Group[]> {
  const workspaceId = getCurrentWorkspaceId()
  if (!workspaceId) return []
  const { data, error } = await getSupabase()
    .from('groups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as CloudGroup[]).map(fromCloudGroup)
}

async function pullProfiles(): Promise<Profile[]> {
  const workspaceId = getCurrentWorkspaceId()
  if (!workspaceId) return []
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as CloudProfile[]).map(fromCloudProfile)
}

export async function syncGroupsAndProfiles(force = false): Promise<void> {
  const requestedWorkspaceId = getCurrentWorkspaceId()
  if (!requestedWorkspaceId) {
    console.log('[CloudSync] No workspace selected, skipping sync')
    return
  }
  if (syncInFlight?.workspaceId === requestedWorkspaceId) return syncInFlight.promise
  if (!force && Date.now() - (lastSyncAtByWorkspace.get(requestedWorkspaceId) ?? 0) < 5000) return

  const promise = (async () => {
    try {
      const userId = await getUserId()
      const workspaceId = requestedWorkspaceId
      if (!userId) {
        console.log('[CloudSync] No user ID, skipping sync')
        return
      }
      if (!workspaceId) {
        console.log('[CloudSync] No workspace selected, skipping sync')
        return
      }

      db.migrateForCloudSync()

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Cloud sync timeout')), 8000)
      })

      const syncPromise = (async () => {
        const [localGroups, localProfiles, cloudGroups, cloudProfiles] = await Promise.all([
          Promise.resolve(db.getGroups(workspaceId)),
          Promise.resolve(db.getProfiles(workspaceId)),
          pullGroups(),
          pullProfiles(),
        ])

        const groups = mergeGroups(localGroups, cloudGroups)
        const profiles = mergeProfiles(localProfiles, cloudProfiles)

        db.replaceGroupsAndProfiles(
          groups.map((group) => ({ ...group, workspaceId: group.workspaceId ?? workspaceId })),
          profiles.map((profile) => ({ ...profile, workspaceId: profile.workspaceId ?? workspaceId })),
          workspaceId
        )

        await pushGroups(groups, userId, workspaceId)
        await pushProfiles(profiles, userId, workspaceId)

        lastSyncAtByWorkspace.set(workspaceId, Date.now())
        console.log('[CloudSync] Sync completed successfully')
      })()

      await Promise.race([syncPromise, timeoutPromise])
    } catch (err) {
      console.warn('[CloudSync] Sync failed:', err)
      // Don't throw - allow app to continue with local data
    }
  })().finally(() => {
    if (syncInFlight?.workspaceId === requestedWorkspaceId) syncInFlight = null
  })

  syncInFlight = { workspaceId: requestedWorkspaceId, promise }
  return promise
}

export async function pushGroup(group: Group): Promise<void> {
  const userId = await getUserId()
  const workspaceId = getCurrentWorkspaceId()
  if (!userId || !workspaceId || !isUuid(group.id)) {
    throw new Error('Không thể đồng bộ nhóm hồ sơ lên Supabase')
  }

  const { error } = await getSupabase()
    .from('groups')
    .upsert(toCloudGroup(group, userId, group.workspaceId ?? workspaceId), { onConflict: 'id' })
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteGroup(groupId: string): Promise<CloudGroup> {
  const userId = await getUserId()
  const workspaceId = getCurrentWorkspaceId()
  if (!userId || !workspaceId || !isUuid(groupId) || !(await hasPermission('group.delete', workspaceId))) {
    throw new Error('Không tìm thấy nhóm hồ sơ hoặc bạn không có quyền xóa')
  }

  const { data, error } = await getSupabase()
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error || !data) throw new Error('Không tìm thấy nhóm hồ sơ hoặc bạn không có quyền xóa')
  return data as CloudGroup
}

export async function pushProfile(profile: Profile): Promise<void> {
  const userId = await getUserId()
  const workspaceId = getCurrentWorkspaceId()
  if (!userId || !workspaceId || !isUuid(profile.id)) {
    throw new Error('Không thể đồng bộ hồ sơ lên Supabase')
  }

  const { error } = await getSupabase()
    .from('profiles')
    .upsert(toCloudProfile(profile, userId, profile.workspaceId ?? workspaceId), { onConflict: 'id' })
    .select('id')
    .single()

  if (error) throw error
}

export async function deleteProfile(profileId: string): Promise<CloudProfile> {
  const userId = await getUserId()
  const workspaceId = getCurrentWorkspaceId()
  if (!userId || !workspaceId || !isUuid(profileId) || !(await hasPermission('profile.delete', workspaceId))) {
    throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền xóa')
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error || !data) throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền xóa')
  return data as CloudProfile
}

export async function deleteProfiles(profileIds: string[]): Promise<CloudProfile[]> {
  const userId = await getUserId()
  const workspaceId = getCurrentWorkspaceId()
  const ids = profileIds.filter(isUuid)
  if (!userId || !workspaceId || ids.length === 0 || !(await hasPermission('profile.delete', workspaceId))) {
    throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền xóa')
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .delete()
    .in('id', ids)
    .eq('workspace_id', workspaceId)
    .select('*')

  if (error) throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền xóa')
  const deletedRows = (data ?? []) as CloudProfile[]
  if (deletedRows.length !== ids.length) throw new Error('Không tìm thấy hồ sơ hoặc bạn không có quyền xóa')
  return deletedRows
}

export async function pullCookies(profileId: string): Promise<Cookie[]> {
  const userId = await getUserId()
  if (!userId || !isUuid(profileId)) return cookiesStore.getCookies(profileId)

  const { data, error } = await getSupabase()
    .from('profile_cookies')
    .select('*')
    .eq('profile_id', profileId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return cookiesStore.getCookies(profileId)

  const row = data as CloudProfileCookies
  const cookies = Array.isArray(row.cookies) ? row.cookies : []
  cookiesStore.replaceCookies(profileId, cookies)
  return cookies
}

export async function pushCookies(profileId: string, cookies: Cookie[]): Promise<void> {
  const userId = await getUserId()
  if (!userId || !isUuid(profileId)) {
    throw new Error('Không thể đồng bộ cookie lên Supabase')
  }

  const row = {
    profile_id: profileId,
    user_id: userId,
    cookies,
    cookie_count: cookies.length,
    byte_size: cookieByteSize(cookies),
    encrypted: false,
  }

  const { error } = await getSupabase()
    .from('profile_cookies')
    .upsert(row, { onConflict: 'profile_id' })

  if (error) throw error
}

export async function deleteCookies(profileId: string): Promise<void> {
  await pushCookies(profileId, [])
}
