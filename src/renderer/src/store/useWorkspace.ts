import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from './useToast'
import type {
  InviteMemberInput,
  PermissionKey,
  RolePermissionMap,
  UpdateWorkspaceMemberInput,
  Workspace,
  WorkspaceMemberAuthorizations,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceUserGroup,
  WorkspaceWithStats,
} from '../../../shared/workspace-types'
import { DefaultRolePermissionMap } from '../../../shared/workspace-types'

const reportedMissingWorkspaceApis = new Set<string>()

function getWorkspaceApi() {
  const api = window.api?.workspaces
  if (!api) {
    reportMissingWorkspaceApi('window.api.workspaces')
  }
  return api
}

function reportMissingWorkspaceApi(method: string) {
  const message = `Workspace API is not available: ${method}`
  if (!reportedMissingWorkspaceApis.has(method)) {
    reportedMissingWorkspaceApis.add(method)
    console.error(`[Workspace] ${message}`)
    toast.error(message)
  }
  return new Error(message)
}

function readableError(error: unknown, fallback = 'Workspace operation failed'): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [
      typeof value.message === 'string' ? value.message : null,
      typeof value.details === 'string' ? value.details : null,
      typeof value.hint === 'string' ? `Hint: ${value.hint}` : null,
      typeof value.code === 'string' ? `Code: ${value.code}` : null,
    ].filter(Boolean)
    if (parts.length > 0) return new Error(parts.join(' | '))
    try {
      return new Error(JSON.stringify(error))
    } catch {
      return new Error(String(error))
    }
  }
  return new Error(fallback)
}

interface WorkspaceState {
  currentWorkspaceId: string | null
  currentWorkspace: WorkspaceWithStats | null
  currentRole: WorkspaceRole | null
  workspaces: WorkspaceWithStats[]
  members: WorkspaceMember[]
  invitations: WorkspaceInvitation[]
  userGroups: WorkspaceUserGroup[]
  permissions: RolePermissionMap
  rolePermissions: Record<WorkspaceRole, RolePermissionMap>
  loading: boolean
  membersLoading: boolean
  invitationsLoading: boolean
  groupsLoading: boolean
  switching: boolean
  error: string | null

  setCurrentWorkspace: (workspaceId: string | null) => Promise<void>
  refreshWorkspaceData: () => Promise<void>
  loadWorkspaces: () => Promise<void>
  loadMembers: () => Promise<void>
  loadInvitations: () => Promise<void>
  loadUserGroups: () => Promise<void>
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  updateWorkspace: (workspaceId: string, updates: { name?: string; settings?: any }) => Promise<void>
  deleteWorkspace: (workspaceId: string) => Promise<void>
  ensureDefaultWorkspace: () => Promise<WorkspaceWithStats>
  inviteMember: (input: Omit<InviteMemberInput, 'workspaceId'>) => Promise<void>
  revokeInvitation: (invitationId: string) => Promise<void>
  resendInvitation: (invitationId: string) => Promise<void>
  updateMemberRole: (memberId: string, role: WorkspaceRole) => Promise<void>
  updateMember: (memberId: string, input: UpdateWorkspaceMemberInput) => Promise<void>
  getMemberAuthorizations: (memberId: string) => Promise<WorkspaceMemberAuthorizations>
  updateMemberAuthorizations: (memberId: string, input: WorkspaceMemberAuthorizations) => Promise<WorkspaceMemberAuthorizations>
  removeMember: (memberId: string) => Promise<void>
  getMyPermissions: () => Promise<RolePermissionMap>
  getRolePermissions: () => Promise<Record<WorkspaceRole, RolePermissionMap>>
  updateRolePermissions: (role: WorkspaceRole, permissions: RolePermissionMap) => Promise<void>
  hasPermission: (permissionKey: PermissionKey) => boolean
  createUserGroup: (name: string, description?: string, permissionOverrides?: RolePermissionMap | null) => Promise<WorkspaceUserGroup>
  updateUserGroup: (id: string, name: string, description?: string, permissionOverrides?: RolePermissionMap | null) => Promise<void>
  deleteUserGroup: (id: string) => Promise<void>
  reset: () => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      currentWorkspace: null,
      currentRole: null,
      workspaces: [],
      members: [],
      invitations: [],
      userGroups: [],
      permissions: DefaultRolePermissionMap.viewer,
      rolePermissions: DefaultRolePermissionMap,
      loading: false,
      membersLoading: false,
      invitationsLoading: false,
      groupsLoading: false,
      switching: false,
      error: null,

      setCurrentWorkspace: async (workspaceId) => {
        const workspace = get().workspaces.find((item) => item.id === workspaceId) ?? null
        set({
          switching: true,
          error: null,
          currentWorkspaceId: workspaceId,
          currentWorkspace: workspace,
          currentRole: workspace?.role ?? null,
          members: [],
          invitations: [],
          userGroups: [],
          permissions: DefaultRolePermissionMap.viewer,
          rolePermissions: DefaultRolePermissionMap,
        })
        try {
          const api = getWorkspaceApi()
          if (!api?.switchWorkspace) throw reportMissingWorkspaceApi('switchWorkspace')
          await api.switchWorkspace(workspaceId)

          // ✅ Always reload permissions from Supabase
          await get().getMyPermissions()
          await get().loadMembers()
          await get().loadUserGroups()
          if (get().permissions['member.invite']) {
            await get().loadInvitations()
          }
        } catch (error) {
          const normalized = readableError(error, 'Failed to switch workspace')
          set({ error: normalized.message })
          throw normalized
        } finally {
          set({ switching: false })
        }
      },

      refreshWorkspaceData: async () => {
        set({ error: null })
        try {
          await get().loadWorkspaces()
          await Promise.all([
            get().loadMembers(),
            get().loadInvitations(),
            get().loadUserGroups(),
            get().getMyPermissions(),
            get().getRolePermissions(),
          ])
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load workspace data' })
          throw error
        }
      },

      loadWorkspaces: async () => {
        set({ loading: true })
        try {
          const api = getWorkspaceApi()
          if (!api?.getWorkspaces) {
            reportMissingWorkspaceApi('getWorkspaces')
            set({ workspaces: [], currentWorkspaceId: null, currentWorkspace: null, currentRole: null })
            return
          }
          const workspaces = await api.getWorkspaces().catch((error: unknown) => {
            throw readableError(error, 'Failed to load workspaces')
          })
          const selectedId = get().currentWorkspaceId
          const currentWorkspace =
            workspaces.find((workspace) => workspace.id === selectedId) ??
            workspaces[0] ??
            null

          if (currentWorkspace?.id !== selectedId) {
            if (!api.switchWorkspace) throw reportMissingWorkspaceApi('switchWorkspace')
            await api.switchWorkspace(currentWorkspace?.id ?? null)
          }

          set({
            workspaces,
            currentWorkspaceId: currentWorkspace?.id ?? null,
            currentWorkspace,
            currentRole: currentWorkspace?.role ?? null,
          })
        } catch (error) {
          const normalized = readableError(error, 'Failed to load workspaces')
          set({ error: normalized.message })
          throw normalized
        } finally {
          set({ loading: false })
        }
      },

      loadMembers: async () => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) {
          set({ members: [] })
          return
        }
        set({ membersLoading: true })
        try {
          const api = getWorkspaceApi()
          if (!api?.getMembers) {
            reportMissingWorkspaceApi('getMembers')
            set({ members: [] })
            return
          }
          set({ members: await api.getMembers(workspaceId) })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load members' })
          throw error
        } finally {
          set({ membersLoading: false })
        }
      },

      loadInvitations: async () => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) {
          set({ invitations: [] })
          return
        }
        set({ invitationsLoading: true })
        try {
          const api = getWorkspaceApi()
          if (!api?.getInvitations) {
            reportMissingWorkspaceApi('getInvitations')
            set({ invitations: [] })
            return
          }
          set({ invitations: await api.getInvitations(workspaceId) })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load invitations' })
          throw error
        } finally {
          set({ invitationsLoading: false })
        }
      },

      loadUserGroups: async () => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) {
          set({ userGroups: [] })
          return
        }
        set({ groupsLoading: true })
        try {
          const api = getWorkspaceApi()
          if (!api?.getUserGroups) {
            reportMissingWorkspaceApi('getUserGroups')
            set({ userGroups: [] })
            return
          }
          set({ userGroups: await api.getUserGroups(workspaceId) })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load user groups' })
          throw error
        } finally {
          set({ groupsLoading: false })
        }
      },

      createWorkspace: async (name, description) => {
        try {
          const api = getWorkspaceApi()
          if (!api?.createWorkspace) throw reportMissingWorkspaceApi('createWorkspace')
          const workspace = await api.createWorkspace({ name, description })
          set({ currentWorkspaceId: workspace.id })
          await get().setCurrentWorkspace(workspace.id)
          return workspace
        } catch (error) {
          const normalized = readableError(error, 'Failed to create workspace')
          set({ error: normalized.message })
          throw normalized
        }
      },

      updateWorkspace: async (workspaceId, updates) => {
        try {
          const api = getWorkspaceApi()
          if (!api?.updateWorkspace) throw reportMissingWorkspaceApi('updateWorkspace')
          await api.updateWorkspace(workspaceId, updates)

          // Refresh workspace list to get updated data
          await get().loadWorkspaces()

        } catch (error) {
          const normalized = readableError(error, 'Failed to update workspace')
          set({ error: normalized.message })
          throw normalized
        }
      },

      deleteWorkspace: async (workspaceId) => {
        try {
          const api = getWorkspaceApi()
          if (!api?.deleteWorkspace) throw reportMissingWorkspaceApi('deleteWorkspace')
          const result = await api.deleteWorkspace(workspaceId)

          // Refresh workspace list
          await get().loadWorkspaces()

          // If we switched to a different workspace, update current workspace
          if (result.switchedToWorkspaceId) {
            const newWorkspace = get().workspaces.find((w) => w.id === result.switchedToWorkspaceId)
            if (newWorkspace) {
              set({
                currentWorkspaceId: newWorkspace.id,
                currentWorkspace: newWorkspace,
                currentRole: newWorkspace.role,
              })
            }
          }
        } catch (error) {
          const normalized = readableError(error, 'Failed to delete workspace')
          set({ error: normalized.message })
          throw normalized
        }
      },

      ensureDefaultWorkspace: async () => {
        try {
          const api = getWorkspaceApi()
          if (!api?.ensureDefaultWorkspace) throw reportMissingWorkspaceApi('ensureDefaultWorkspace')
          const defaultWorkspace = await api.ensureDefaultWorkspace()
          return defaultWorkspace
        } catch (error) {
          const normalized = readableError(error, 'Failed to ensure default workspace')
          set({ error: normalized.message })
          throw normalized
        }
      },

      inviteMember: async (input) => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) throw new Error('No workspace selected')
        const api = getWorkspaceApi()
        if (!api?.inviteMember) throw reportMissingWorkspaceApi('inviteMember')
        await api.inviteMember({ ...input, workspaceId })

        // ✅ Reload everything after invite
        await get().loadMembers()
        await get().loadInvitations()
        await get().loadWorkspaces()
        await get().getMyPermissions()
      },

      revokeInvitation: async (invitationId) => {
        const api = getWorkspaceApi()
        if (!api?.revokeInvitation) throw reportMissingWorkspaceApi('revokeInvitation')
        await api.revokeInvitation(invitationId)
        await get().loadInvitations()
      },

      resendInvitation: async (invitationId) => {
        const api = getWorkspaceApi()
        if (!api?.resendInvitation) throw reportMissingWorkspaceApi('resendInvitation')
        await api.resendInvitation(invitationId)
        await get().loadInvitations()
      },

      updateMemberRole: async (memberId, role) => {
        const api = getWorkspaceApi()
        if (!api?.updateMemberRole) throw reportMissingWorkspaceApi('updateMemberRole')
        await api.updateMemberRole(memberId, role)

        // ✅ Reload everything
        await get().loadMembers()
        await get().loadInvitations()
        await get().loadWorkspaces()
        await get().getMyPermissions()
      },

      updateMember: async (memberId, input) => {
        const api = getWorkspaceApi()
        if (!api?.updateMember) throw reportMissingWorkspaceApi('updateMember')
        await api.updateMember(memberId, input)

        // ✅ Reload everything
        await get().loadMembers()
        await get().loadInvitations()
        await get().loadWorkspaces()
        await get().getMyPermissions()
      },

      getMemberAuthorizations: async (memberId) => {
        const api = getWorkspaceApi()
        if (!api?.getMemberAuthorizations) throw reportMissingWorkspaceApi('getMemberAuthorizations')
        return api.getMemberAuthorizations(memberId)
      },

      updateMemberAuthorizations: async (memberId, input) => {
        const api = getWorkspaceApi()
        if (!api?.updateMemberAuthorizations) throw reportMissingWorkspaceApi('updateMemberAuthorizations')
        const result = await api.updateMemberAuthorizations(memberId, input)
        await get().loadMembers()
        return result
      },

      removeMember: async (memberId) => {
        const api = getWorkspaceApi()
        if (!api?.removeMember) throw reportMissingWorkspaceApi('removeMember')
        await api.removeMember(memberId)

        // ✅ Reload everything
        await get().loadMembers()
        await get().loadInvitations()
        await get().loadWorkspaces()
        await get().getMyPermissions()

        // ✅ Check if current workspace still valid
        const { workspaces, currentWorkspaceId } = get()
        if (currentWorkspaceId && !workspaces.find(w => w.id === currentWorkspaceId)) {
          // Current workspace no longer accessible
          set({
            currentWorkspace: null,
            currentWorkspaceId: null,
            currentRole: null,
            permissions: DefaultRolePermissionMap.viewer
          })

          // Switch to first available workspace
          if (workspaces.length > 0) {
            await get().setCurrentWorkspace(workspaces[0].id)
          } else {
            await get().ensureDefaultWorkspace()
          }
        }
      },

      getMyPermissions: async () => {
        const workspaceId = get().currentWorkspaceId ?? undefined
        const api = getWorkspaceApi()
        if (!api?.getPermissions) {
          reportMissingWorkspaceApi('getPermissions')
          const fallback = get().currentRole === 'owner' ? DefaultRolePermissionMap.owner : DefaultRolePermissionMap.viewer
          set({ permissions: fallback })
          return fallback
        }
        const permissions = await api.getPermissions(workspaceId)
        set({ permissions })
        return permissions
      },

      getRolePermissions: async () => {
        const workspaceId = get().currentWorkspaceId ?? undefined
        const api = getWorkspaceApi()
        if (!api?.getRolePermissions) {
          reportMissingWorkspaceApi('getRolePermissions')
          set({ rolePermissions: DefaultRolePermissionMap })
          return DefaultRolePermissionMap
        }
        const rolePermissions = await api.getRolePermissions(workspaceId)
        set({ rolePermissions })
        return rolePermissions
      },

      hasPermission: (permissionKey) => get().currentRole === 'owner' || get().permissions[permissionKey] === true,

      updateRolePermissions: async (role, permissions) => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) throw new Error('No workspace selected')
        const api = getWorkspaceApi()
        if (!api?.updateRolePermissions) throw reportMissingWorkspaceApi('updateRolePermissions')
        await api.updateRolePermissions(workspaceId, role, permissions)
        await Promise.all([get().getMyPermissions(), get().getRolePermissions()])
      },

      createUserGroup: async (name, description, permissionOverrides) => {
        const workspaceId = get().currentWorkspaceId
        if (!workspaceId) throw new Error('No workspace selected')
        const api = getWorkspaceApi()
        if (!api?.createUserGroup) throw reportMissingWorkspaceApi('createUserGroup')
        const group = await api.createUserGroup({ workspaceId, name, description, permissionOverrides })
        await get().loadUserGroups()
        return group
      },

      updateUserGroup: async (id, name, description, permissionOverrides) => {
        const api = getWorkspaceApi()
        if (!api?.updateUserGroup) throw reportMissingWorkspaceApi('updateUserGroup')
        await api.updateUserGroup(id, name, description, permissionOverrides)
        await get().loadUserGroups()
      },

      deleteUserGroup: async (id) => {
        const api = getWorkspaceApi()
        if (!api?.deleteUserGroup) throw reportMissingWorkspaceApi('deleteUserGroup')
        await api.deleteUserGroup(id)

        // ✅ Reload everything after deleting group
        await get().loadUserGroups()
        await get().loadMembers()
        await get().loadInvitations()
        await get().loadWorkspaces()
        await get().getMyPermissions()

        // ✅ Check if current workspace still valid
        const { workspaces, currentWorkspaceId } = get()
        if (currentWorkspaceId && !workspaces.find(w => w.id === currentWorkspaceId)) {
          // Current workspace no longer accessible
          set({
            currentWorkspace: null,
            currentWorkspaceId: null,
            currentRole: null,
            permissions: DefaultRolePermissionMap.viewer
          })

          // Switch to first available workspace
          if (workspaces.length > 0) {
            await get().setCurrentWorkspace(workspaces[0].id)
          } else {
            await get().ensureDefaultWorkspace()
          }
        }
      },

      reset: () => set({
        currentWorkspaceId: null,
        currentWorkspace: null,
        currentRole: null,
        workspaces: [],
        members: [],
        invitations: [],
        userGroups: [],
        permissions: DefaultRolePermissionMap.viewer,
        rolePermissions: DefaultRolePermissionMap,
        loading: false,
        membersLoading: false,
        invitationsLoading: false,
        groupsLoading: false,
        switching: false,
        error: null,
      }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ currentWorkspaceId: state.currentWorkspaceId }),
    }
  )
)
