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
  WorkspaceRole,
  WorkspaceUserGroup,
  WorkspaceWithStats,
} from '../shared/workspace-types'
import { DefaultRolePermissionMap } from '../shared/workspace-types'

let currentWorkspaceId: string | null = null

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
  console.log('[Workspace:switchWorkspace] Input workspaceId:', workspaceId)
  if (workspaceId !== null && typeof workspaceId !== 'string') {
    throw new Error('switchWorkspace expects workspaceId string')
  }

  let user: Awaited<ReturnType<typeof requireUser>> | null = null
  if (workspaceId) {
    requireConfigured()
    user = await requireUser()
    console.log('[Workspace:switchWorkspace] Current auth user:', { id: user.id, email: user.email })

    const workspaceResult = await getSupabase()
      .from('workspaces')
      .select('id,owner_id,name')
      .eq('id', workspaceId)
      .maybeSingle()
    console.log('[Workspace:switchWorkspace] Workspace row:', {
      data: workspaceResult.data,
      error: workspaceResult.error,
    })
    if (workspaceResult.error) throw toError(workspaceResult.error, 'Failed to read workspace')
    if (!workspaceResult.data) throw new Error('Workspace not found')

    let memberResult = await getSupabase()
      .from('workspace_members')
      .select('id,workspace_id,user_id,email,role,status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()
    console.log('[Workspace:switchWorkspace] Workspace member row:', {
      data: memberResult.data,
      error: memberResult.error,
    })
    if (memberResult.error) throw toError(memberResult.error, 'Failed to read workspace member')

    if (!memberResult.data && workspaceResult.data.owner_id === user.id) {
      console.warn('[Workspace:switchWorkspace] Owner membership row not visible yet, retrying once:', workspaceId)
      await delay(250)
      memberResult = await getSupabase()
        .from('workspace_members')
        .select('id,workspace_id,user_id,email,role,status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle()
      console.log('[Workspace:switchWorkspace] Workspace member retry row:', {
        data: memberResult.data,
        error: memberResult.error,
      })
      if (memberResult.error) throw toError(memberResult.error, 'Failed to read workspace member')
    }

    const isOwner = workspaceResult.data.owner_id === user.id
    const isActiveMember = memberResult.data?.user_id === user.id && memberResult.data.status === 'active'
    const allowed = isOwner || isActiveMember
    console.log('[Workspace:switchWorkspace] Access decision:', {
      workspaceOwnerId: workspaceResult.data.owner_id,
      currentUserId: user.id,
      isOwner,
      memberUserId: memberResult.data?.user_id ?? null,
      memberStatus: memberResult.data?.status ?? null,
      isActiveMember,
      allowed,
    })

    if (!allowed) throw new Error('Workspace access denied')

    const permissions = await getSupabase().rpc('get_my_permissions', { p_workspace_id: workspaceId })
    console.log('[Workspace:switchWorkspace] Permission query result:', permissions)
    if (permissions.error) throw toError(permissions.error, 'Failed to check workspace permissions')
  } else {
    console.log('[Workspace:switchWorkspace] Clearing current workspace')
  }

  currentWorkspaceId = workspaceId
  console.log('[Workspace:switchWorkspace] Local state write result:', { currentWorkspaceId })
  const result: SwitchWorkspaceResult = { success: true, workspaceId }
  console.log('[Workspace:switchWorkspace] Final return payload:', result)
  return result
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
  console.log('[Workspace:ensureDefaultWorkspace] Ensuring default workspace for user:', { id: user.id, email: user.email })

  // Ensure user profile exists
  try {
    await ensureUserProfile()
  } catch (error) {
    console.error('[Workspace:ensureDefaultWorkspace] Failed to ensure user profile:', error)
    throw toError(error, 'Failed to ensure user profile')
  }

  // Find existing default workspace
  const { data: defaultWorkspace, error: findError } = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,is_default,settings,created_at,updated_at')
    .eq('owner_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  console.log('[Workspace:ensureDefaultWorkspace] Existing default workspace:', { data: defaultWorkspace, error: findError })

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
      console.warn('[Workspace:ensureDefaultWorkspace] Failed to ensure owner membership:', memberError)
      // Don't throw - membership might already exist or RLS might block, but workspace is valid
    }

    console.log('[Workspace:ensureDefaultWorkspace] Returning existing default workspace')
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

  console.log('[Workspace:ensureDefaultWorkspace] Existing "My Workspace":', { data: myWorkspace, error: myWorkspaceError })

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

    console.log('[Workspace:ensureDefaultWorkspace] Updated existing My Workspace to default')

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
  console.log('[Workspace:ensureDefaultWorkspace] Creating new My Workspace')
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

  console.log('[Workspace:ensureDefaultWorkspace] Created new default workspace:', newWorkspace)

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
  console.log('[Workspace:getWorkspaces] Running direct fallback query for user:', { id: user.id, email: user.email })

  const owned = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,settings,created_at,updated_at')
    .eq('owner_id', user.id)
  console.log('[Workspace:getWorkspaces] Fallback owned workspaces response:', {
    data: owned.data,
    error: owned.error,
  })
  if (owned.error) throw toError(owned.error, 'Failed to read owned workspaces')

  const memberRows = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,user_id,role,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
  console.log('[Workspace:getWorkspaces] Fallback membership response:', {
    data: memberRows.data,
    error: memberRows.error,
  })
  if (memberRows.error) throw toError(memberRows.error, 'Failed to read workspace memberships')

  const memberWorkspaceIds = [...new Set(((memberRows.data ?? []) as any[]).map((row) => row.workspace_id).filter(Boolean))]
  const ownedRows = (owned.data ?? []) as any[]
  const ownedIds = ownedRows.map((row) => row.id)
  const joinedIds = memberWorkspaceIds.filter((id) => !ownedIds.includes(id))

  let joinedRows: any[] = []
  if (joinedIds.length > 0) {
    const joined = await getSupabase()
      .from('workspaces')
      .select('id,name,owner_id,settings,created_at,updated_at')
      .in('id', joinedIds)
    console.log('[Workspace:getWorkspaces] Fallback joined workspaces response:', {
      data: joined.data,
      error: joined.error,
    })
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
    console.log('[Workspace:getWorkspaces] Fallback member count response:', {
      data: counts.data,
      error: counts.error,
    })
    if (!counts.error) allMembers = (counts.data ?? []) as any[]
  }

  let allProfiles: any[] = []
  if (workspaceIds.length > 0) {
    const profiles = await getSupabase()
      .from('profiles')
      .select('workspace_id,deleted_at')
      .in('workspace_id', workspaceIds)
      .is('deleted_at', null)
    console.log('[Workspace:getWorkspaces] Fallback profile count response:', {
      data: profiles.data,
      error: profiles.error,
    })
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
      createdAt: toMs(row.created_at),
      updatedAt: toMs(row.updated_at),
    } as WorkspaceWithStats
  })
}

export async function getMyWorkspaces(): Promise<WorkspaceWithStats[]> {
  requireConfigured()
  const user = await requireUser()
  console.log('[Workspace:getWorkspaces] Current auth user:', { id: user.id, email: user.email })
  
  // Ensure default workspace exists first
  try {
    await ensureDefaultWorkspace()
  } catch (error) {
    console.error('[Workspace:getWorkspaces] ensureDefaultWorkspace failed:', error)
    throw toError(error, 'Failed to ensure default workspace')
  }
  
  try {
    await acceptPendingInvitations()
  } catch (error) {
    console.warn('[Workspace:getWorkspaces] acceptPendingInvitations failed, continuing:', error)
  }

  console.log('[Workspace:getWorkspaces] Calling RPC get_my_workspaces')
  let { data, error } = await getSupabase().rpc('get_my_workspaces')
  console.log('[Workspace:getWorkspaces] RPC get_my_workspaces response:', { data, error })
  if (error) {
    console.warn('[Workspace:getWorkspaces] RPC failed, using direct fallback:', describeError(error))
    data = await getMyWorkspacesDirect(user) as any[]
  }

  const workspaces = ((data ?? []) as any[]).map((row) => 'ownerId' in row ? row as WorkspaceWithStats : mapWorkspace(row))
  
  // Sort: default workspace first, then by created_at
  workspaces.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return a.createdAt - b.createdAt
  })
  
  console.log('[Workspace:getWorkspaces] Final workspace list:', workspaces)
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
  console.log('[Workspace:createWorkspace] Payload received:', input)
  console.log('[Workspace:createWorkspace] Current auth user:', { id: user.id, email: user.email })
  console.log('[Workspace:createWorkspace] Insert payload:', payload)

  const { data, error } = await getSupabase()
    .from('workspaces')
    .insert(payload)
    .select('*')
    .single()

  console.log('[Workspace:createWorkspace] Supabase insert response:', { data, error })

  if (error) {
    console.error('[Workspace:createWorkspace] Supabase insert error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw toError(error, 'Failed to create workspace')
  }
  if (!data?.id) {
    console.error('[Workspace:createWorkspace] Insert returned no workspace row:', data)
    throw new Error('Failed to create workspace: insert returned no workspace row')
  }

  console.log('[Workspace:createWorkspace] Returned workspace row:', data)
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

export async function updateWorkspace(workspaceId: string, updates: { name?: string; description?: string }): Promise<void> {
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
  
  if (updates.description !== undefined) {
    const currentSettings = (workspace.settings as any) ?? {}
    payload.settings = { ...currentSettings, description: updates.description.trim() }
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
  console.log('[Main:inviteMember] Called with input:', input)
  requireConfigured()
  const user = await requireUser()
  console.log('[Main:inviteMember] Current user:', { id: user.id, email: user.email })
  
  const hasInvitePermission = await hasPermission('member.invite', input.workspaceId)
  console.log('[Main:inviteMember] hasPermission(member.invite):', hasInvitePermission)
  
  if (!hasInvitePermission) {
    throw new Error('Permission denied: member.invite')
  }
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const insertPayload = {
    workspace_id: input.workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    user_group_id: input.userGroupId ?? null,
    profile_limit: input.profileLimit ?? null,
    note: input.note ?? '',
    invited_by: user.id,
    status: 'pending',
    token: token(),
    expires_at: expiresAt,
  }
  console.log('[Main:inviteMember] Insert payload:', insertPayload)
  
  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .insert(insertPayload)
    .select('*')
    .single()

  console.log('[Main:inviteMember] Supabase response:', { data, error })
  
  if (error) {
    console.error('[Main:inviteMember] Supabase error:', error)
    const errorMessage = [
      error.message,
      error.details ? `Details: ${error.details}` : null,
      error.hint ? `Hint: ${error.hint}` : null,
      error.code ? `Code: ${error.code}` : null,
    ].filter(Boolean).join(' | ')
    throw new Error(errorMessage || 'Failed to create invitation')
  }
  
  console.log('[Main:inviteMember] Success, returning invitation')
  return mapInvitation(data)
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  requireConfigured()
  const { data, error } = await getSupabase()
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as any[]
  const userIds = rows.map((row) => row.user_id).filter(Boolean)
  const { data: profiles } = userIds.length
    ? await getSupabase().from('user_profiles').select('id,email,display_name').in('id', userIds)
    : { data: [] as any[] }
  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]))
  return rows.map((row) => mapMember({
    ...row,
    profile_email: profileById.get(row.user_id)?.email,
    display_name: profileById.get(row.user_id)?.display_name,
  }))
}

export async function getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  requireConfigured()
  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as any[]
  const userIds = [...new Set(rows.map((row) => row.invited_by).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await getSupabase().from('user_profiles').select('id,email').in('id', userIds)
    : { data: [] as any[] }
  const emailById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile.email]))
  return rows.map((row) => mapInvitation({ ...row, invited_by_email: emailById.get(row.invited_by) ?? null }))
}

export async function getWorkspaceUserGroups(workspaceId: string): Promise<WorkspaceUserGroup[]> {
  requireConfigured()
  const { data, error } = await getSupabase()
    .from('workspace_user_groups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')

  if (error) throw error
  return ((data ?? []) as any[]).map(mapGroup)
}

export async function createWorkspaceUserGroup(inputOrWorkspaceId: string | CreateWorkspaceUserGroupInput, maybeName?: string): Promise<WorkspaceUserGroup> {
  requireConfigured()
  const user = await requireUser()
  const input = typeof inputOrWorkspaceId === 'string'
    ? { workspaceId: inputOrWorkspaceId, name: maybeName ?? '', description: '' }
    : inputOrWorkspaceId
  if (!(await hasPermission('member.edit_role', input.workspaceId))) {
    throw new Error('Permission denied: member.edit_role')
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
  if (!(await hasPermission('member.edit_role', existing.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
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

export async function deleteWorkspaceUserGroup(id: string): Promise<void> {
  requireConfigured()
  const { data: existing, error: readError } = await getSupabase()
    .from('workspace_user_groups')
    .select('workspace_id')
    .eq('id', id)
    .single()
  if (readError) throw readError
  if (!(await hasPermission('member.edit_role', existing.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
  }
  const { error } = await getSupabase().from('workspace_user_groups').delete().eq('id', id)
  if (error) throw error
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  requireConfigured()
  const { data: invitation, error: readError } = await getSupabase()
    .from('workspace_invitations')
    .select('workspace_id')
    .eq('id', invitationId)
    .single()
  if (readError) throw readError
  if (!(await hasPermission('member.invite', invitation.workspace_id)) && !(await hasPermission('member.remove', invitation.workspace_id))) {
    throw new Error('Permission denied: member.invite')
  }
  const { error } = await getSupabase()
    .from('workspace_invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('status', 'pending')

  if (error) throw error
}

export async function resendInvitation(invitationId: string): Promise<void> {
  requireConfigured()
  const { data: invitation, error: readError } = await getSupabase()
    .from('workspace_invitations')
    .select('workspace_id')
    .eq('id', invitationId)
    .single()
  if (readError) throw readError
  if (!(await hasPermission('member.invite', invitation.workspace_id))) {
    throw new Error('Permission denied: member.invite')
  }
  const { error } = await getSupabase()
    .from('workspace_invitations')
    .update({
      status: 'pending',
      token: token(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
    })
    .eq('id', invitationId)

  if (error) throw error
}

export async function removeMember(memberId: string): Promise<void> {
  requireConfigured()
  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('id', memberId)
    .single()
  if (readError) throw readError
  if (member.role === 'owner') throw new Error('Cannot remove workspace owner')
  if (!(await hasPermission('member.remove', member.workspace_id))) {
    throw new Error('Permission denied: member.remove')
  }
  const { error } = await getSupabase()
    .from('workspace_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .neq('role', 'owner')

  if (error) throw error
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole): Promise<void> {
  if (role === 'owner') throw new Error('Cannot assign owner role')
  requireConfigured()
  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('id', memberId)
    .single()
  if (readError) throw readError
  if (member.role === 'owner') throw new Error('Cannot update workspace owner')
  if (!(await hasPermission('member.edit_role', member.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
  }
  const { error } = await getSupabase()
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .neq('role', 'owner')

  if (error) throw error
}

export async function updateMember(memberId: string, input: UpdateWorkspaceMemberInput): Promise<void> {
  requireConfigured()
  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('id', memberId)
    .single()
  if (readError) throw readError
  if (member.role === 'owner') throw new Error('Cannot update workspace owner')
  if (!(await hasPermission('member.edit_role', member.workspace_id))) {
    throw new Error('Permission denied: member.edit_role')
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

  const { error } = await getSupabase()
    .from('workspace_members')
    .update(patch)
    .eq('id', memberId)
    .neq('role', 'owner')

  if (error) throw error
}

export async function getMyPermissions(workspaceId = currentWorkspaceId): Promise<RolePermissionMap> {
  requireConfigured()
  if (!workspaceId) return DefaultRolePermissionMap.viewer

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
  console.log('[Workspace:deleteWorkspace] Deleting workspace:', workspaceId)

  // Load workspace
  const { data: workspace, error: readError } = await getSupabase()
    .from('workspaces')
    .select('id,name,owner_id,is_default')
    .eq('id', workspaceId)
    .maybeSingle()

  console.log('[Workspace:deleteWorkspace] Workspace data:', { data: workspace, error: readError })

  if (readError) throw toError(readError, 'Failed to read workspace')
  if (!workspace) throw new Error('Workspace not found')

  // Check ownership
  if (workspace.owner_id !== user.id) {
    throw new Error('Permission denied: only workspace owner can delete workspace')
  }

  // Check if it's default workspace
  if (workspace.is_default === true || workspace.name === 'My Workspace') {
    throw new Error('Cannot delete default workspace. Default workspace cannot be removed.')
  }

  // Delete workspace (triggers will handle cascading)
  const { error: deleteError } = await getSupabase()
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('owner_id', user.id)

  if (deleteError) throw toError(deleteError, 'Failed to delete workspace')

  console.log('[Workspace:deleteWorkspace] Workspace deleted successfully')

  // If deleted workspace was current, switch to default workspace
  let switchedToWorkspaceId: string | null = null
  if (currentWorkspaceId === workspaceId) {
    console.log('[Workspace:deleteWorkspace] Deleted workspace was current, switching to default')
    
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
      console.log('[Workspace:deleteWorkspace] Switched to default workspace:', switchedToWorkspaceId)
    } else {
      // Fallback: get any workspace
      const workspaces = await getMyWorkspaces()
      if (workspaces.length > 0) {
        await setCurrentWorkspace(workspaces[0].id)
        switchedToWorkspaceId = workspaces[0].id
        console.log('[Workspace:deleteWorkspace] Switched to first available workspace:', switchedToWorkspaceId)
      } else {
        await setCurrentWorkspace(null)
        console.log('[Workspace:deleteWorkspace] No workspaces available, cleared current workspace')
      }
    }
  }

  return { success: true, switchedToWorkspaceId }
}
