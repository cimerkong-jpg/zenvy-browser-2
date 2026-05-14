import { randomBytes } from 'crypto'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { getCurrentUser } from './auth'
import type {
  InviteMemberInput,
  PermissionKey,
  RolePermissionMap,
  CreateWorkspaceInput,
  CreateWorkspaceUserGroupInput,
  UpdateWorkspaceMemberInput,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceMemberAuthorizations,
  WorkspaceRole,
  WorkspaceUserGroup,
  WorkspaceWithStats,
} from '../shared/workspace-types'
import { DefaultRolePermissionMap, PermissionKeys } from '../shared/workspace-types'
import type { Group, Profile } from '../shared/types'

let currentWorkspaceId: string | null = null
const groupDescriptionMetaPrefix = '__ZENVY_GROUP_META__:'

export type SwitchWorkspaceResult = {
  success: true
  workspaceId: string | null
}

function toMs(value: string | null | undefined): number {
  if (!value) return Date.now()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function token(): string {
  return randomBytes(24).toString('hex')
}

function emptyPermissionMap(): RolePermissionMap {
  return Object.fromEntries(PermissionKeys.map((key) => [key, false])) as RolePermissionMap
}

function uniqueStrings(values: string[] | null | undefined): string[] {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))]
}

type AuthorizationMode = 'group' | 'profile'
type CurrentWorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  status: string
  user_group_id: string | null
}

function authorizationModeFromSettings(settings: any): AuthorizationMode {
  return settings?.permissionMode === 'group' ? 'group' : 'profile'
}

async function getWorkspaceAuthorizationMode(workspaceId: string): Promise<AuthorizationMode> {
  const { data, error } = await getSupabase()
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()
  if (error) throw toError(error, 'Failed to read workspace authorization mode')
  return authorizationModeFromSettings((data as any)?.settings)
}

function parseGroupPermissions(description: string | null | undefined): RolePermissionMap | null {
  if (!description?.startsWith(groupDescriptionMetaPrefix)) return null
  try {
    const parsed = JSON.parse(description.slice(groupDescriptionMetaPrefix.length)) as { permissions?: Partial<RolePermissionMap> }
    return { ...emptyPermissionMap(), ...(parsed.permissions ?? {}) }
  } catch {
    return null
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const details = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [
      typeof details.message === 'string' ? details.message : null,
      typeof details.details === 'string' ? details.details : null,
      typeof details.hint === 'string' ? `Hint: ${details.hint}` : null,
      typeof details.code === 'string' ? `Code: ${details.code}` : null,
    ].filter(Boolean)
    if (parts.length > 0) return parts.join(' | ')
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

function toError(error: unknown, fallback = 'Workspace operation failed'): Error {
  const message = describeError(error)
  return new Error(message && message !== 'undefined' ? message : fallback)
}

function isNoRowsError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'PGRST116'
  )
}

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured')
  }
}

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  if (!user.id) throw new Error('Authenticated user is missing id')
  if (!user.email) throw new Error('Authenticated user is missing email')
  return user
}

function mapWorkspace(row: any): WorkspaceWithStats {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    role: row.role,
    memberStatus: row.member_status ?? 'active',
    memberCount: Number(row.member_count ?? 0),
    profileCount: Number(row.profile_count ?? 0),
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
    settings: row.settings ?? {},
    isDefault: row.is_default ?? false,
  }
}

function mapMember(row: any): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    email: row.email ?? row.profile_email ?? '',
    displayName: row.display_name ?? null,
    role: row.role,
    status: row.status ?? 'active',
    userGroupId: row.user_group_id ?? null,
    profileLimit: row.profile_limit ?? null,
    note: row.note ?? '',
    invitedBy: row.invited_by ?? null,
    joinedAt: toMs(row.joined_at),
    updatedAt: toMs(row.updated_at),
  }
}

function mapInvitation(row: any): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    userGroupId: row.user_group_id ?? null,
    profileLimit: row.profile_limit ?? null,
    note: row.note ?? '',
    invitedBy: row.invited_by,
    invitedByEmail: row.invited_by_email ?? null,
    status: row.status,
    token: row.token,
    expiresAt: toMs(row.expires_at),
    acceptedAt: row.accepted_at ? toMs(row.accepted_at) : null,
    revokedAt: row.revoked_at ? toMs(row.revoked_at) : null,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

function mapGroup(row: any): WorkspaceUserGroup {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? '',
    createdBy: row.created_by ?? null,
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
  }
}

export function getCurrentWorkspaceId(): string | null {
  return currentWorkspaceId
}

export async function setCurrentWorkspace(workspaceId: string | null): Promise<SwitchWorkspaceResult> {
  if (workspaceId !== null && typeof workspaceId !== 'string') {
    throw new Error('switchWorkspace expects workspaceId string')
  }

  let user: Awaited<ReturnType<typeof requireUser>> | null = null
  if (workspaceId) {
    requireConfigured()
    user = await requireUser()

    const workspaceResult = await getSupabase()
      .from('workspaces')
      .select('id,owner_id,name')
      .eq('id', workspaceId)
      .maybeSingle()
    if (workspaceResult.error) throw toError(workspaceResult.error, 'Failed to read workspace')
    if (!workspaceResult.data) throw new Error('Workspace not found')

    let memberResult = await getSupabase()
      .from('workspace_members')
      .select('id,workspace_id,user_id,email,role,status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberResult.error) throw toError(memberResult.error, 'Failed to read workspace member')

    if (!memberResult.data && workspaceResult.data.owner_id === user.id) {
      await delay(250)
      memberResult = await getSupabase()
        .from('workspace_members')
        .select('id,workspace_id,user_id,email,role,status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (memberResult.error) throw toError(memberResult.error, 'Failed to read workspace member')
    }

    const isOwner = workspaceResult.data.owner_id === user.id
    const isActiveMember = memberResult.data?.user_id === user.id && memberResult.data.status === 'active'
    const allowed = isOwner || isActiveMember

    if (!allowed) throw new Error('Workspace access denied')

    const permissions = await getSupabase().rpc('get_my_permissions', { p_workspace_id: workspaceId })
    if (permissions.error) throw toError(permissions.error, 'Failed to check workspace permissions')
  }

  currentWorkspaceId = workspaceId
  return { success: true, workspaceId }
}

export async function ensureUserProfile(): Promise<void> {
  requireConfigured()
  const user = await requireUser()
  const { error } = await getSupabase()
    .from('user_profiles')
    .upsert({
      id: user.id,
      email: user.email.toLowerCase(),
      display_name: user.email.split('@')[0],
    }, { onConflict: 'id' })

  if (error) throw error
}

export async function acceptPendingInvitations(): Promise<string | null> {
  requireConfigured()
  await requireUser()
  const { data, error } = await getSupabase().rpc('accept_pending_invitations')
  if (error) throw toError(error, 'Failed to accept pending invitations')
  const acceptedWorkspaceId = Array.isArray(data) && data[0]?.workspace_id ? data[0].workspace_id as string : null
  if (acceptedWorkspaceId) currentWorkspaceId = acceptedWorkspaceId
  return acceptedWorkspaceId
}

export async function ensureDefaultWorkspace(): Promise<WorkspaceWithStats> {
  requireConfigured()
  const user = await requireUser()

  // Ensure user profile exists
  try {
    await ensureUserProfile()
  } catch (error) {
    console.error('[Workspace:ensureDefaultWorkspace] Failed to ensure user profile:', describeError(error))
    throw toError(error, 'Failed to ensure user profile')
  }

  // Find existing default workspace
  const { data: defaultWorkspace, error: findError } = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,is_default,settings,created_at,updated_at')
    .eq('owner_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  if (findError) throw toError(findError, 'Failed to find default workspace')

  if (defaultWorkspace) {
    // Default workspace exists, ensure owner membership
    const { error: memberError } = await getSupabase()
      .from('workspace_members')
      .upsert({
        workspace_id: defaultWorkspace.id,
        user_id: user.id,
        email: user.email,
        role: 'owner',
        status: 'active',
      }, { onConflict: 'workspace_id,user_id' })

    if (memberError) {
      console.warn('[Workspace:ensureDefaultWorkspace] Failed to ensure owner membership:', describeError(memberError))
      // Don't throw - membership might already exist or RLS might block, but workspace is valid
    }

    // Return minimal workspace info without calling getMyWorkspaces to avoid infinite loop
    return {
      id: defaultWorkspace.id,
      name: defaultWorkspace.name,
      ownerId: defaultWorkspace.owner_id,
      role: 'owner',
      memberStatus: 'active',
      memberCount: 1,
      profileCount: 0,
      createdAt: toMs(defaultWorkspace.created_at),
      updatedAt: toMs(defaultWorkspace.updated_at),
      settings: defaultWorkspace.settings ?? {},
      isDefault: true,
    }
  }

  // Check if user has "My Workspace" that's not marked as default
  const { data: myWorkspace, error: myWorkspaceError } = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,is_default,settings,created_at,updated_at')
    .eq('owner_id', user.id)
    .eq('name', 'My Workspace')
    .maybeSingle()

  if (myWorkspaceError) throw toError(myWorkspaceError, 'Failed to find My Workspace')

  if (myWorkspace) {
    // Update existing "My Workspace" to be default
    const { error: updateError } = await getSupabase()
      .from('workspaces')
      .update({ is_default: true })
      .eq('id', myWorkspace.id)

    if (updateError) throw toError(updateError, 'Failed to mark My Workspace as default')

    // Ensure owner membership
    await getSupabase()
      .from('workspace_members')
      .upsert({
        workspace_id: myWorkspace.id,
        user_id: user.id,
        email: user.email,
        role: 'owner',
        status: 'active',
      }, { onConflict: 'workspace_id,user_id' })

    // Return minimal workspace info without calling getMyWorkspaces to avoid infinite loop
    return {
      id: myWorkspace.id,
      name: myWorkspace.name,
      ownerId: myWorkspace.owner_id,
      role: 'owner',
      memberStatus: 'active',
      memberCount: 1,
      profileCount: 0,
      createdAt: toMs(myWorkspace.created_at),
      updatedAt: toMs(myWorkspace.updated_at),
      settings: myWorkspace.settings ?? {},
      isDefault: true,
    }
  }

  // Create new "My Workspace"
  const { data: newWorkspace, error: createError } = await getSupabase()
    .from('workspaces')
    .insert({
      name: 'My Workspace',
      owner_id: user.id,
      is_default: true,
      settings: {},
    })
    .select('id,name,owner_id,is_default,settings,created_at,updated_at')
    .single()

  if (createError) throw toError(createError, 'Failed to create default workspace')
  if (!newWorkspace) throw new Error('Failed to create default workspace: no data returned')

  // Ensure owner membership
  await getSupabase()
    .from('workspace_members')
    .upsert({
      workspace_id: newWorkspace.id,
      user_id: user.id,
      email: user.email,
      role: 'owner',
      status: 'active',
    }, { onConflict: 'workspace_id,user_id' })

  // Return minimal workspace info without calling getMyWorkspaces to avoid infinite loop
  return {
    id: newWorkspace.id,
    name: newWorkspace.name,
    ownerId: newWorkspace.owner_id,
    role: 'owner',
    memberStatus: 'active',
    memberCount: 1,
    profileCount: 0,
    createdAt: toMs(newWorkspace.created_at),
    updatedAt: toMs(newWorkspace.updated_at),
    settings: newWorkspace.settings ?? {},
    isDefault: true,
  }
}

async function getMyWorkspacesDirect(user: Awaited<ReturnType<typeof requireUser>>): Promise<WorkspaceWithStats[]> {
  const owned = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,settings,is_default,created_at,updated_at')
    .eq('owner_id', user.id)
  if (owned.error) throw toError(owned.error, 'Failed to read owned workspaces')

  const memberRows = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,user_id,role,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
  if (memberRows.error) throw toError(memberRows.error, 'Failed to read workspace memberships')

  const memberWorkspaceIds = [...new Set(((memberRows.data ?? []) as any[]).map((row) => row.workspace_id).filter(Boolean))]
  const ownedRows = (owned.data ?? []) as any[]
  const ownedIds = ownedRows.map((row) => row.id)
  const joinedIds = memberWorkspaceIds.filter((id) => !ownedIds.includes(id))

  let joinedRows: any[] = []
  if (joinedIds.length > 0) {
    const joined = await getSupabase()
      .from('workspaces')
      .select('id,name,owner_id,settings,is_default,created_at,updated_at')
      .in('id', joinedIds)
    if (joined.error) throw toError(joined.error, 'Failed to read joined workspaces')
    joinedRows = (joined.data ?? []) as any[]
  }

  const rows = [...ownedRows, ...joinedRows]
  const workspaceIds = rows.map((row) => row.id)
  const roleByWorkspace = new Map<string, any>()
  for (const row of (memberRows.data ?? []) as any[]) {
    roleByWorkspace.set(row.workspace_id, row)
  }

  let allMembers: any[] = []
  if (workspaceIds.length > 0) {
    const counts = await getSupabase()
      .from('workspace_members')
      .select('workspace_id,status')
      .in('workspace_id', workspaceIds)
      .eq('status', 'active')
    if (!counts.error) allMembers = (counts.data ?? []) as any[]
  }

  let allProfiles: any[] = []
  if (workspaceIds.length > 0) {
    const profiles = await getSupabase()
      .from('profiles')
      .select('workspace_id,deleted_at')
      .in('workspace_id', workspaceIds)
      .is('deleted_at', null)
    if (!profiles.error) allProfiles = (profiles.data ?? []) as any[]
  }

  return rows.map((row) => {
    const member = roleByWorkspace.get(row.id)
    return {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      role: row.owner_id === user.id ? 'owner' : member?.role ?? 'viewer',
      memberStatus: member?.status ?? (row.owner_id === user.id ? 'active' : 'active'),
      memberCount: allMembers.filter((member) => member.workspace_id === row.id).length,
      profileCount: allProfiles.filter((profile) => profile.workspace_id === row.id).length,
      settings: row.settings ?? {},
      isDefault: row.is_default ?? false,
      createdAt: toMs(row.created_at),
      updatedAt: toMs(row.updated_at),
    } as WorkspaceWithStats
  })
}

export async function getMyWorkspaces(): Promise<WorkspaceWithStats[]> {
  requireConfigured()
  const user = await requireUser()

  // Ensure default workspace exists first
  let defaultWorkspace: WorkspaceWithStats | null = null
  try {
    defaultWorkspace = await ensureDefaultWorkspace()
  } catch (error) {
    console.error('[Workspace:getWorkspaces] ensureDefaultWorkspace failed:', describeError(error))
    throw toError(error, 'Failed to ensure default workspace')
  }

  try {
    await acceptPendingInvitations()
  } catch (error) {
    console.warn('[Workspace:getWorkspaces] acceptPendingInvitations failed, continuing:', describeError(error))
  }

  let { data, error } = await getSupabase().rpc('get_my_workspaces')
  if (error) {
    console.warn('[Workspace:getWorkspaces] RPC failed, using direct fallback:', describeError(error))
    data = await getMyWorkspacesDirect(user) as any[]
  }

  const workspaces = ((data ?? []) as any[]).map((row) => {
    const workspace = 'ownerId' in row ? row as WorkspaceWithStats : mapWorkspace(row)
    return {
      ...workspace,
      isDefault: workspace.isDefault === true || workspace.id === defaultWorkspace?.id,
    }
  })

  // Sort: default workspace first, then by created_at
  workspaces.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return a.createdAt - b.createdAt
  })

  if (!currentWorkspaceId || !workspaces.some((workspace) => workspace.id === currentWorkspaceId)) {
    currentWorkspaceId = workspaces[0]?.id ?? null
  }
  return workspaces
}

export async function getCurrentWorkspace(): Promise<WorkspaceWithStats | null> {
  const workspaces = await getMyWorkspaces()
  return workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? workspaces[0] ?? null
}

export async function createWorkspace(input: string | CreateWorkspaceInput): Promise<Workspace> {
  requireConfigured()
  const user = await requireUser()
  const name = (typeof input === 'string' ? input : input.name).trim()
  const description = typeof input === 'string' ? '' : input.description?.trim() ?? ''
  if (!name) throw new Error('Workspace name is required')

  const payload = { name, owner_id: user.id, settings: description ? { description } : {} }

  const { data, error } = await getSupabase()
    .from('workspaces')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('[Workspace:createWorkspace] Supabase insert error:', describeError(error))
    throw toError(error, 'Failed to create workspace')
  }
  if (!data?.id) {
    console.error('[Workspace:createWorkspace] Insert returned no workspace row')
    throw new Error('Failed to create workspace: insert returned no workspace row')
  }

  currentWorkspaceId = data.id
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: toMs(data.created_at),
    updatedAt: toMs(data.updated_at),
    settings: data.settings ?? {},
  }
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string; description?: string; settings?: any }): Promise<void> {
  requireConfigured()
  const user = await requireUser()

  // Load workspace to check ownership
  const { data: workspace, error: fetchError } = await getSupabase()
    .from('workspaces')
    .select('owner_id, is_default, name, settings')
    .eq('id', workspaceId)
    .single()

  if (fetchError) throw toError(fetchError, 'Failed to load workspace')
  if (!workspace) throw new Error('Workspace not found')
  if (workspace.owner_id !== user.id) throw new Error('Permission denied: only owner can update workspace')

  const payload: any = { updated_at: new Date().toISOString() }

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim()
    if (!trimmedName) throw new Error('Workspace name cannot be empty')
    payload.name = trimmedName
  }

  // Support both description (legacy) and settings (new)
  if (updates.description !== undefined) {
    const currentSettings = (workspace.settings as any) ?? {}
    payload.settings = { ...currentSettings, description: updates.description.trim() }
  } else if (updates.settings !== undefined) {
    const currentSettings = (workspace.settings as any) ?? {}
    payload.settings = { ...currentSettings, ...updates.settings }
  }

  const { error } = await getSupabase()
    .from('workspaces')
    .update(payload)
    .eq('id', workspaceId)

  if (error) throw toError(error, 'Failed to update workspace')
}

export async function updateWorkspaceSettings(workspaceId: string, settings: { permissionMode?: 'group' | 'profile'; automationMode?: 'flowchart' | 'javascript' }): Promise<void> {
  requireConfigured()
  const user = await requireUser()

  // Load workspace to check ownership
  const { data: workspace, error: fetchError } = await getSupabase()
    .from('workspaces')
    .select('owner_id, settings')
    .eq('id', workspaceId)
    .single()

  if (fetchError) throw toError(fetchError, 'Failed to load workspace')
  if (!workspace) throw new Error('Workspace not found')
  if (workspace.owner_id !== user.id) throw new Error('Permission denied: only owner can update workspace settings')

  const currentSettings = workspace.settings ?? {}
  const newSettings = { ...currentSettings, ...settings }

  const { error } = await getSupabase()
    .from('workspaces')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', workspaceId)

  if (error) throw toError(error, 'Failed to update workspace settings')
}

export async function inviteMember(input: InviteMemberInput): Promise<WorkspaceInvitation> {
  requireConfigured()
  const user = await requireUser()
  const currentMember = await requireCurrentWorkspaceMember(input.workspaceId)

  const hasInvitePermission = await hasPermission('member.invite', input.workspaceId)

  if (!hasInvitePermission) {
    throw new Error('Permission denied: member.invite')
  }

  // ✅ Reject owner role invitations
  if (input.role === 'owner') {
    throw new Error('Cannot invite members as owner. Only admin, member, or viewer roles are allowed.')
  }

  // ✅ Require userGroupId for all invitations
  if (!input.userGroupId) {
    throw new Error('Vui lòng chọn nhóm người dùng cho thành viên')
  }
  if (!isWorkspaceOwner(currentMember)) {
    if (!currentMember.user_group_id) {
      throw new Error('Permission denied: user group scope is required')
    }
    if (input.userGroupId !== currentMember.user_group_id) {
      throw new Error('Permission denied: outside your user group')
    }
  }
  const authorizationMode = await getWorkspaceAuthorizationMode(input.workspaceId)

  // ✅ Validate userGroupId belongs to same workspace
  const { data: group, error: groupError } = await getSupabase()
    .from('workspace_user_groups')
    .select('id,workspace_id')
    .eq('id', input.userGroupId)
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (groupError) throw toError(groupError, 'Failed to validate user group')
  if (!group) throw new Error('Nhóm người dùng không tồn tại hoặc không thuộc workspace này')

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const insertPayload = {
    workspace_id: input.workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    user_group_id: input.userGroupId,
    profile_limit: input.profileLimit ?? null,
    note: input.note ?? '',
    authorization_group_ids: authorizationMode === 'group' ? uniqueStrings(input.groupIds) : [],
    authorization_profile_ids: authorizationMode === 'profile' ? uniqueStrings(input.profileIds) : [],
    invited_by: user.id,
    status: 'pending',
    token: token(),
    expires_at: expiresAt,
  }

  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) {
    const errorMessage = [
      error.message,
      error.details ? `Details: ${error.details}` : null,
      error.hint ? `Hint: ${error.hint}` : null,
      error.code ? `Code: ${error.code}` : null,
    ].filter(Boolean).join(' | ')
    throw new Error(errorMessage || 'Failed to create invitation')
  }

  return mapInvitation(data)
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  requireConfigured()
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)

  // ✅ Query ALL active members in workspace (RLS should allow this for owners/admins)
  const { data, error } = await getSupabase()
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) {
    console.error('[getWorkspaceMembers] Query error details:', JSON.stringify(error, null, 2))
    throw toError(error, 'Failed to read workspace members')
  }

  const rows = ((data ?? []) as any[]).filter((row) => {
    if (isWorkspaceOwner(currentMember)) return true
    return Boolean(currentMember.user_group_id) && row.user_group_id === currentMember.user_group_id
  })

  // Get user profiles for display names
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: profileData } = await getSupabase()
      .from('user_profiles')
      .select('id,display_name')
      .in('id', userIds)
    profiles = profileData ?? []
  }

  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]))

  const members = rows.map((row) => mapMember({
    ...row,
    display_name: profileById.get(row.user_id)?.display_name ?? null,
  }))

  return members.sort((a, b) => a.joinedAt - b.joinedAt)
}

async function readWorkspaceMember(memberId: string) {
  const { data, error } = await getSupabase()
    .from('workspace_members')
    .select('id,workspace_id,user_id,email,role,status,user_group_id')
    .eq('id', memberId)
    .single()
  if (error) throw toError(error, 'Failed to read workspace member')
  return data as any
}

export async function getMemberAuthorizations(memberId: string): Promise<WorkspaceMemberAuthorizations> {
  requireConfigured()
  const member = await readWorkspaceMember(memberId)
  await assertSameUserGroupOrOwner(member.workspace_id, member.user_group_id)
  if (!(await hasPermission('member.edit_role', member.workspace_id)) && member.user_id !== (await requireUser()).id) {
    throw new Error('Permission denied: member.edit_role')
  }

  const [groups, profiles] = await Promise.all([
    getSupabase()
      .from('workspace_member_profile_groups')
      .select('group_id')
      .eq('member_id', memberId),
    getSupabase()
      .from('workspace_member_profiles')
      .select('profile_id')
      .eq('member_id', memberId),
  ])

  if (groups.error) throw toError(groups.error, 'Failed to read member profile-group authorizations')
  if (profiles.error) throw toError(profiles.error, 'Failed to read member profile authorizations')

  return {
    groupIds: ((groups.data ?? []) as any[]).map((row) => String(row.group_id)),
    profileIds: ((profiles.data ?? []) as any[]).map((row) => String(row.profile_id)),
  }
}

export async function updateMemberAuthorizations(memberId: string, authorizations: WorkspaceMemberAuthorizations): Promise<WorkspaceMemberAuthorizations> {
  requireConfigured()
  const member = await readWorkspaceMember(memberId)
  if (member.role === 'owner') return { groupIds: [], profileIds: [] }
  await assertSameUserGroupOrOwner(member.workspace_id, member.user_group_id)
  if (!(await hasPermission('member.edit_role', member.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
  }

  const authorizationMode = await getWorkspaceAuthorizationMode(member.workspace_id)
  const groupIds = authorizationMode === 'group' ? uniqueStrings(authorizations.groupIds) : []
  const profileIds = authorizationMode === 'profile' ? uniqueStrings(authorizations.profileIds) : []

  const deleteGroups = await getSupabase()
    .from('workspace_member_profile_groups')
    .delete()
    .eq('member_id', memberId)
  if (deleteGroups.error) throw toError(deleteGroups.error, 'Failed to clear member profile-group authorizations')

  const deleteProfiles = await getSupabase()
    .from('workspace_member_profiles')
    .delete()
    .eq('member_id', memberId)
  if (deleteProfiles.error) throw toError(deleteProfiles.error, 'Failed to clear member profile authorizations')

  if (groupIds.length > 0) {
    const { error } = await getSupabase()
      .from('workspace_member_profile_groups')
      .insert(groupIds.map((groupId) => ({ workspace_id: member.workspace_id, member_id: memberId, group_id: groupId })))
    if (error) throw toError(error, 'Failed to save member profile-group authorizations')
  }

  if (profileIds.length > 0) {
    const { error } = await getSupabase()
      .from('workspace_member_profiles')
      .insert(profileIds.map((profileId) => ({ workspace_id: member.workspace_id, member_id: memberId, profile_id: profileId })))
    if (error) throw toError(error, 'Failed to save member profile authorizations')
  }

  return { groupIds, profileIds }
}

export async function getCurrentWorkspaceMember(workspaceId: string): Promise<CurrentWorkspaceMember | null> {
  const user = await requireUser()
  const { data, error } = await getSupabase()
    .from('workspace_members')
    .select('id,workspace_id,user_id,role,status,user_group_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw toError(error, 'Failed to read current workspace member')
  return data as CurrentWorkspaceMember | null
}

async function requireCurrentWorkspaceMember(workspaceId: string): Promise<CurrentWorkspaceMember> {
  const member = await getCurrentWorkspaceMember(workspaceId)
  if (!member) throw new Error('Permission denied: not an active workspace member')
  return member
}

function isWorkspaceOwner(member: CurrentWorkspaceMember | null): boolean {
  return member?.role === 'owner'
}

export async function assertSameUserGroupOrOwner(workspaceId: string, targetUserGroupId: string | null | undefined): Promise<void> {
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)
  if (isWorkspaceOwner(currentMember)) return
  if (!currentMember.user_group_id) {
    throw new Error('Permission denied: user group scope is required')
  }
  if (!targetUserGroupId || targetUserGroupId !== currentMember.user_group_id) {
    throw new Error('Permission denied: outside your user group')
  }
}

async function getAuthorizedIdsForCurrentUser(workspaceId: string): Promise<WorkspaceMemberAuthorizations | null> {
  const member = await getCurrentWorkspaceMember(workspaceId)
  if (!member) return { groupIds: [], profileIds: [] }
  if (member.role === 'owner') return null
  const authorizationMode = await getWorkspaceAuthorizationMode(workspaceId)
  const authorizations = await getMemberAuthorizations(member.id)
  return authorizationMode === 'group'
    ? { groupIds: authorizations.groupIds, profileIds: [] }
    : { groupIds: [], profileIds: authorizations.profileIds }
}

export async function filterAuthorizedProfiles(profiles: Profile[], groups: Group[] = []): Promise<Profile[]> {
  const workspaceId = currentWorkspaceId
  if (!workspaceId) return []
  const authorizations = await getAuthorizedIdsForCurrentUser(workspaceId)
  if (authorizations === null) return profiles

  const authorizationMode = await getWorkspaceAuthorizationMode(workspaceId)
  const allowedProfileIds = new Set(authorizations.profileIds)
  const allowedGroupIds = new Set(authorizations.groupIds)
  return profiles.filter((profile) => {
    if (authorizationMode === 'group') return Boolean(profile.groupId && allowedGroupIds.has(profile.groupId))
    return allowedProfileIds.has(profile.id)
  })
}

export async function filterAuthorizedGroups(groups: Group[], profiles: Profile[]): Promise<Group[]> {
  const workspaceId = currentWorkspaceId
  if (!workspaceId) return []
  const authorizations = await getAuthorizedIdsForCurrentUser(workspaceId)
  if (authorizations === null) return groups

  const authorizationMode = await getWorkspaceAuthorizationMode(workspaceId)
  const allowedGroupIds = new Set(authorizations.groupIds)
  const allowedProfileIds = new Set(authorizations.profileIds)
  if (authorizationMode === 'group') {
    return groups.filter((group) => allowedGroupIds.has(group.id))
  }

  const groupIdsWithAllowedProfiles = new Set(
    profiles
      .filter((profile) => allowedProfileIds.has(profile.id) && profile.groupId)
      .map((profile) => profile.groupId as string)
  )
  return groups.filter((group) => allowedGroupIds.has(group.id) || groupIdsWithAllowedProfiles.has(group.id))
}

export async function assertProfileAuthorized(profile: Profile): Promise<void> {
  const workspaceId = currentWorkspaceId
  if (!workspaceId) throw new Error('No active workspace')
  const allowed = await filterAuthorizedProfiles([profile])
  if (!allowed.some((item) => item.id === profile.id)) {
    throw new Error('Permission denied: profile authorization')
  }
}

export async function assertGroupAuthorized(group: Group, profiles: Profile[]): Promise<void> {
  const workspaceId = currentWorkspaceId
  if (!workspaceId) throw new Error('No active workspace')
  const allowed = await filterAuthorizedGroups([group], profiles)
  if (!allowed.some((item) => item.id === group.id)) {
    throw new Error('Permission denied: profile group authorization')
  }
}

export async function getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  requireConfigured()
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)
  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'expired'])
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = ((data ?? []) as any[]).filter((row) => {
    if (isWorkspaceOwner(currentMember)) return true
    return Boolean(currentMember.user_group_id) && row.user_group_id === currentMember.user_group_id
  })
  const userIds = [...new Set(rows.map((row) => row.invited_by).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await getSupabase().from('user_profiles').select('id,email').in('id', userIds)
    : { data: [] as any[] }
  const emailById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile.email]))
  return rows.map((row) => mapInvitation({ ...row, invited_by_email: emailById.get(row.invited_by) ?? null }))
}

export async function getWorkspaceUserGroups(workspaceId: string): Promise<WorkspaceUserGroup[]> {
  requireConfigured()
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)
  const { data, error } = await getSupabase()
    .from('workspace_user_groups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')

  if (error) throw error
  const rows = ((data ?? []) as any[]).filter((row) => {
    if (isWorkspaceOwner(currentMember)) return true
    return Boolean(currentMember.user_group_id) && row.id === currentMember.user_group_id
  })
  return rows.map(mapGroup)
}

export async function createWorkspaceUserGroup(inputOrWorkspaceId: string | CreateWorkspaceUserGroupInput, maybeName?: string): Promise<WorkspaceUserGroup> {
  requireConfigured()
  const user = await requireUser()
  const input = typeof inputOrWorkspaceId === 'string'
    ? { workspaceId: inputOrWorkspaceId, name: maybeName ?? '', description: '' }
    : inputOrWorkspaceId
  const currentMember = await requireCurrentWorkspaceMember(input.workspaceId)
  if (!isWorkspaceOwner(currentMember)) {
    throw new Error('Permission denied: only workspace owner can manage user groups')
  }
  const { data, error } = await getSupabase()
    .from('workspace_user_groups')
    .insert({ workspace_id: input.workspaceId, name: input.name, description: input.description ?? '', created_by: user.id })
    .select('*')
    .single()

  if (error) throw error
  return mapGroup(data)
}

export async function updateWorkspaceUserGroup(id: string, name: string, description?: string): Promise<WorkspaceUserGroup> {
  requireConfigured()
  const { data: existing, error: readError } = await getSupabase()
    .from('workspace_user_groups')
    .select('workspace_id')
    .eq('id', id)
    .single()
  if (readError) throw readError
  const currentMember = await requireCurrentWorkspaceMember(existing.workspace_id)
  if (!isWorkspaceOwner(currentMember)) {
    throw new Error('Permission denied: only workspace owner can manage user groups')
  }
  const patch: Record<string, string> = { name }
  if (description !== undefined) patch.description = description
  const { data, error } = await getSupabase()
    .from('workspace_user_groups')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return mapGroup(data)
}

export async function deleteWorkspaceUserGroup(id: string): Promise<{ removedMembersCount: number; revokedInvitationsCount: number }> {
  requireConfigured()

  // Read group with workspace_id
  const { data: group, error: readError } = await getSupabase()
    .from('workspace_user_groups')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (readError) throw toError(readError, 'Failed to read user group')

  // Check permission
  const currentMember = await requireCurrentWorkspaceMember(group.workspace_id)
  if (!isWorkspaceOwner(currentMember)) {
    throw new Error('Permission denied: only workspace owner can manage user groups')
  }

  // ✅ Step 1: Remove all active members in this group (except owner)
  const { data: removedMembers, error: removeMembersError } = await getSupabase()
    .from('workspace_members')
    .update({ status: 'removed' })
    .eq('workspace_id', group.workspace_id)
    .eq('user_group_id', id)
    .neq('role', 'owner')
    .eq('status', 'active')
    .select('id')

  if (removeMembersError) throw toError(removeMembersError, 'Failed to remove members from group')

  const removedMembersCount = (removedMembers ?? []).length

  // ✅ Step 2: Revoke all pending invitations in this group
  const { data: revokedInvitations, error: revokeInvitationsError } = await getSupabase()
    .from('workspace_invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('workspace_id', group.workspace_id)
    .eq('user_group_id', id)
    .eq('status', 'pending')
    .select('id')

  if (revokeInvitationsError) throw toError(revokeInvitationsError, 'Failed to revoke invitations from group')

  const revokedInvitationsCount = (revokedInvitations ?? []).length

  // ✅ Step 3: Delete the group
  const { error: deleteError } = await getSupabase()
    .from('workspace_user_groups')
    .delete()
    .eq('id', id)

  if (deleteError) throw toError(deleteError, 'Failed to delete user group')

  return { removedMembersCount, revokedInvitationsCount }
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  requireConfigured()
  const workspaceId = currentWorkspaceId
  if (!workspaceId) throw new Error('No active workspace')
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)
  const { data: invitation, error: readError } = await getSupabase()
    .from('workspace_invitations')
    .select('id,workspace_id,user_group_id,status,email')
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .single()
  if (readError) {
    console.error('[Workspace:revokeInvitation] Read failed:', {
      action: 'revoke',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      error: describeError(readError),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền xóa')
  }
  console.log('[Workspace:revokeInvitation] Target invitation:', {
    action: 'revoke',
    invitationId,
    workspaceId,
    currentMemberId: currentMember.id,
    currentMemberIsOwner: isWorkspaceOwner(currentMember),
    currentMemberUserGroupId: currentMember.user_group_id,
    targetInvitationUserGroupId: invitation.user_group_id,
  })
  try {
    await assertSameUserGroupOrOwner(invitation.workspace_id, invitation.user_group_id)
  } catch (error) {
    console.error('[Workspace:revokeInvitation] Scope denied:', {
      action: 'revoke',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      targetInvitationUserGroupId: invitation.user_group_id,
      error: describeError(error),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền xóa')
  }
  if (!(await hasPermission('member.invite', invitation.workspace_id)) && !(await hasPermission('member.remove', invitation.workspace_id))) {
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền xóa')
  }
  const { data: deletedInvitation, error } = await getSupabase()
    .from('workspace_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'expired'])
    .select('id,workspace_id,user_group_id,status,email')
    .single()

  if (error) {
    console.error('[Workspace:revokeInvitation] Delete failed:', {
      action: 'revoke',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      targetInvitationUserGroupId: invitation.user_group_id,
      error: describeError(error),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền xóa')
  }
  if (!deletedInvitation) throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền xóa')
  console.log('[Workspace:revokeInvitation] Deleted invitation row:', {
    action: 'revoke',
    invitationId,
    workspaceId,
    currentMemberId: currentMember.id,
    currentMemberIsOwner: isWorkspaceOwner(currentMember),
    currentMemberUserGroupId: currentMember.user_group_id,
    targetInvitationUserGroupId: deletedInvitation.user_group_id,
    deletedInvitation: deletedInvitation,
  })
}

export async function resendInvitation(invitationId: string): Promise<void> {
  requireConfigured()
  const workspaceId = currentWorkspaceId
  if (!workspaceId) throw new Error('No active workspace')
  const currentMember = await requireCurrentWorkspaceMember(workspaceId)
  const { data: invitation, error: readError } = await getSupabase()
    .from('workspace_invitations')
    .select('id,workspace_id,user_group_id,status,email')
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .single()
  if (readError) {
    console.error('[Workspace:resendInvitation] Read failed:', {
      action: 'resend',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      error: describeError(readError),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền gửi lại')
  }
  console.log('[Workspace:resendInvitation] Target invitation:', {
    action: 'resend',
    invitationId,
    workspaceId,
    currentMemberId: currentMember.id,
    currentMemberIsOwner: isWorkspaceOwner(currentMember),
    currentMemberUserGroupId: currentMember.user_group_id,
    targetInvitationUserGroupId: invitation.user_group_id,
  })
  try {
    await assertSameUserGroupOrOwner(invitation.workspace_id, invitation.user_group_id)
  } catch (error) {
    console.error('[Workspace:resendInvitation] Scope denied:', {
      action: 'resend',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      targetInvitationUserGroupId: invitation.user_group_id,
      error: describeError(error),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền gửi lại')
  }
  if (!(await hasPermission('member.invite', invitation.workspace_id))) {
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền gửi lại')
  }
  const { data: updatedInvitation, error } = await getSupabase()
    .from('workspace_invitations')
    .update({
      status: 'pending',
      token: token(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'expired'])
    .select('id,workspace_id,user_group_id,status,email,expires_at,updated_at')
    .single()

  if (error) {
    console.error('[Workspace:resendInvitation] Update failed:', {
      action: 'resend',
      invitationId,
      workspaceId,
      currentMemberId: currentMember.id,
      currentMemberIsOwner: isWorkspaceOwner(currentMember),
      currentMemberUserGroupId: currentMember.user_group_id,
      targetInvitationUserGroupId: invitation.user_group_id,
      error: describeError(error),
    })
    throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền gửi lại')
  }
  if (!updatedInvitation) throw new Error('Không tìm thấy lời mời hoặc bạn không có quyền gửi lại')
  console.log('[Workspace:resendInvitation] Updated invitation row:', {
    action: 'resend',
    invitationId,
    workspaceId,
    currentMemberId: currentMember.id,
    currentMemberIsOwner: isWorkspaceOwner(currentMember),
    currentMemberUserGroupId: currentMember.user_group_id,
    targetInvitationUserGroupId: updatedInvitation.user_group_id,
    updatedInvitation,
    tokenRotated: true,
  })
}

export async function removeMember(memberId: string): Promise<void> {
  requireConfigured()

  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role,user_group_id')
    .eq('id', memberId)
    .single()

  if (readError) throw toError(readError, 'Failed to read workspace member')
  if (member.role === 'owner') throw new Error('Cannot remove workspace owner')
  await assertSameUserGroupOrOwner(member.workspace_id, member.user_group_id)

  if (!(await hasPermission('member.remove', member.workspace_id))) {
    throw new Error('Permission denied: member.remove')
  }

  const { data: updatedMember, error } = await getSupabase()
    .from('workspace_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .neq('role', 'owner')
    .select('id,workspace_id,user_id,email,role,status,user_group_id,profile_limit,note,updated_at')
    .single()

  if (error) {
    console.error('[Workspace:removeMember] Update failed:', describeError(error))
    if (isNoRowsError(error)) throw new Error('Không thể xóa thành viên')
    throw toError(error, 'Failed to remove workspace member')
  }
  if (!updatedMember) throw new Error('Không thể xóa thành viên')
  console.log('[Workspace:removeMember] Updated member row:', updatedMember)
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole): Promise<void> {
  if (role === 'owner') throw new Error('Cannot assign owner role')
  requireConfigured()
  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role,user_group_id')
    .eq('id', memberId)
    .single()
  if (readError) throw toError(readError, 'Failed to read workspace member')
  if (member.role === 'owner') throw new Error('Cannot update workspace owner')
  await assertSameUserGroupOrOwner(member.workspace_id, member.user_group_id)
  if (!(await hasPermission('member.edit_role', member.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
  }
  const { data: updatedMember, error } = await getSupabase()
    .from('workspace_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .neq('role', 'owner')
    .select('id,workspace_id,user_id,email,role,status,user_group_id,profile_limit,note,updated_at')
    .single()

  if (error) {
    console.error('[Workspace:updateMemberRole] Update failed:', describeError(error))
    if (isNoRowsError(error)) throw new Error('Không thể cập nhật thành viên')
    throw toError(error, 'Failed to update member role')
  }
  if (!updatedMember) throw new Error('Không thể cập nhật thành viên')
  console.log('[Workspace:updateMemberRole] Updated member row:', updatedMember)
}

export async function updateMember(memberId: string, input: UpdateWorkspaceMemberInput): Promise<void> {
  requireConfigured()

  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role,user_group_id')
    .eq('id', memberId)
    .single()

  if (readError) throw toError(readError, 'Failed to read workspace member')
  if (member.role === 'owner') throw new Error('Cannot update workspace owner')
  await assertSameUserGroupOrOwner(member.workspace_id, member.user_group_id)

  if (!(await hasPermission('member.edit_role', member.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
  }
  if (!input.userGroupId) {
    throw new Error('Vui lòng chọn nhóm người dùng cho thành viên')
  }

  // ✅ Validate userGroupId if provided
  await assertSameUserGroupOrOwner(member.workspace_id, input.userGroupId)

  if ('userGroupId' in input && input.userGroupId) {
    const { data: group, error: groupError } = await getSupabase()
      .from('workspace_user_groups')
      .select('id,workspace_id')
      .eq('id', input.userGroupId)
      .eq('workspace_id', member.workspace_id)
      .maybeSingle()

    if (groupError) throw toError(groupError, 'Failed to validate user group')
    if (!group) throw new Error('Nhóm người dùng không tồn tại hoặc không thuộc workspace này')
  }

  const patch: Record<string, unknown> = {}
  if (input.role) {
    if (input.role === 'owner') throw new Error('Cannot assign owner role')
    patch.role = input.role
  }
  if ('userGroupId' in input) patch.user_group_id = input.userGroupId ?? null
  if ('profileLimit' in input) patch.profile_limit = input.profileLimit ?? null
  if ('note' in input) patch.note = input.note ?? ''
  if (Object.keys(patch).length === 0) return
  patch.updated_at = new Date().toISOString()

  const { data: updatedMember, error } = await getSupabase()
    .from('workspace_members')
    .update(patch)
    .eq('id', memberId)
    .neq('role', 'owner')
    .select('id,workspace_id,user_id,email,role,status,user_group_id,profile_limit,note,updated_at')
    .single()

  if (error) {
    console.error('[Workspace:updateMember] Update failed:', describeError(error))
    if (isNoRowsError(error)) throw new Error('Không thể cập nhật thành viên')
    throw toError(error, 'Failed to update workspace member')
  }
  if (!updatedMember) throw new Error('Không thể cập nhật thành viên')
  console.log('[Workspace:updateMember] Updated member row:', updatedMember)

  if ('profileIds' in input || 'groupIds' in input) {
    const authorizationMode = await getWorkspaceAuthorizationMode(member.workspace_id)
    await updateMemberAuthorizations(memberId, {
      profileIds: authorizationMode === 'profile' ? uniqueStrings(input.profileIds) : [],
      groupIds: authorizationMode === 'group' ? uniqueStrings(input.groupIds) : [],
    })
  }
}

export async function getMyPermissions(workspaceId = currentWorkspaceId): Promise<RolePermissionMap> {
  requireConfigured()
  if (!workspaceId) return DefaultRolePermissionMap.viewer

  const user = await requireUser()
  const { data: member, error: memberError } = await getSupabase()
    .from('workspace_members')
    .select('role,user_group_id,status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')  // ✅ Only active members
    .maybeSingle()

  if (memberError || !member) {
    // Not an active member - return empty permissions
    return emptyPermissionMap()
  }

  if (member.role === 'owner') return DefaultRolePermissionMap.owner
  if (member?.user_group_id) {
    const { data: group, error: groupError } = await getSupabase()
      .from('workspace_user_groups')
      .select('description')
      .eq('id', member.user_group_id)
      .single()

    if (groupError) throw groupError
    const groupPermissions = parseGroupPermissions(group?.description)
    if (groupPermissions) return groupPermissions
  }

  const { data, error } = await getSupabase().rpc('get_my_permissions', { p_workspace_id: workspaceId })
  if (error) throw error
  return { ...DefaultRolePermissionMap.viewer, ...((data ?? {}) as RolePermissionMap) }
}

export async function getWorkspaceRolePermissions(workspaceId = currentWorkspaceId): Promise<Record<WorkspaceRole, RolePermissionMap>> {
  requireConfigured()
  if (!workspaceId) return DefaultRolePermissionMap
  const { data, error } = await getSupabase()
    .from('workspace_role_permissions')
    .select('role,permissions')
    .eq('workspace_id', workspaceId)

  if (error) throw error
  const result: Record<WorkspaceRole, RolePermissionMap> = {
    owner: DefaultRolePermissionMap.owner,
    admin: DefaultRolePermissionMap.admin,
    member: DefaultRolePermissionMap.member,
    viewer: DefaultRolePermissionMap.viewer,
  }
  for (const row of (data ?? []) as any[]) {
    result[row.role as WorkspaceRole] = {
      ...DefaultRolePermissionMap[row.role as WorkspaceRole],
      ...(row.permissions ?? {}),
    }
  }
  return result
}

export async function hasPermission(permissionKey: PermissionKey, workspaceId = currentWorkspaceId): Promise<boolean> {
  const permissions = await getMyPermissions(workspaceId)
  return permissions[permissionKey] === true
}

export async function updateRolePermissions(workspaceId: string, role: WorkspaceRole, permissions: RolePermissionMap): Promise<RolePermissionMap> {
  if (role === 'owner') throw new Error('Owner permissions are fixed')
  requireConfigured()
  if (!(await hasPermission('workspace.settings', workspaceId))) {
    throw new Error('Permission denied: workspace.settings')
  }
  const { data, error } = await getSupabase()
    .from('workspace_role_permissions')
    .upsert({ workspace_id: workspaceId, role, permissions }, { onConflict: 'workspace_id,role' })
    .select('permissions')
    .single()

  if (error) throw error
  return { ...DefaultRolePermissionMap.viewer, ...((data?.permissions ?? {}) as RolePermissionMap) }
}

export async function deleteWorkspace(workspaceId: string): Promise<{ success: true; switchedToWorkspaceId: string | null }> {
  requireConfigured()
  const user = await requireUser()

  // Load workspace
  const { data: workspace, error: readError } = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,is_default')
    .eq('id', workspaceId)
    .maybeSingle()

  if (readError) throw toError(readError, 'Failed to read workspace')
  if (!workspace) throw new Error('Workspace not found')

  // Check ownership
  if (workspace.owner_id !== user.id) {
    throw new Error('Permission denied: only workspace owner can delete workspace')
  }

  // Check if it's default workspace
  if (workspace.is_default === true) {
    throw new Error('Cannot delete default workspace. Default workspace cannot be removed.')
  }

  // Delete workspace (triggers will handle cascading)
  const { error: deleteError } = await getSupabase()
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('owner_id', user.id)

  if (deleteError) throw toError(deleteError, 'Failed to delete workspace')

  // If deleted workspace was current, switch to default workspace
  let switchedToWorkspaceId: string | null = null
  if (currentWorkspaceId === workspaceId) {
    // Get default workspace
    const { data: defaultWorkspace } = await getSupabase()
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultWorkspace) {
      await setCurrentWorkspace(defaultWorkspace.id)
      switchedToWorkspaceId = defaultWorkspace.id
    } else {
      // Fallback: get any workspace
      const workspaces = await getMyWorkspaces()
      if (workspaces.length > 0) {
        await setCurrentWorkspace(workspaces[0].id)
        switchedToWorkspaceId = workspaces[0].id
      } else {
        await setCurrentWorkspace(null)
      }
    }
  }

  return { success: true, switchedToWorkspaceId }
}
