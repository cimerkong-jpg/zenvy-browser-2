export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export type WorkspaceMemberStatus = 'active' | 'removed' | 'suspended'
export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export type PermissionKey =
  | 'profile.open'
  | 'profile.create'
  | 'profile.edit'
  | 'profile.delete'
  | 'profile.import'
  | 'profile.export'
  | 'profile.clone'
  | 'profile.transfer'
  | 'group.create'
  | 'group.edit'
  | 'group.delete'
  | 'automation.create'
  | 'automation.edit'
  | 'automation.run'
  | 'automation.delete'
  | 'member.invite'
  | 'member.remove'
  | 'member.edit_role'
  | 'workspace.settings'
  | 'workspace.billing'
  | 'workspace.delete'

export interface UserProfile {
  id: string
  email: string
  displayName: string | null
  createdAt: number
  updatedAt: number
}

export interface Workspace {
  id: string
  name: string
  ownerId: string
  createdAt: number
  updatedAt: number
  settings: Record<string, any>
  isDefault?: boolean
}

export interface WorkspaceWithStats extends Workspace {
  role: WorkspaceRole
  memberStatus: WorkspaceMemberStatus
  memberCount: number
  profileCount: number
  isDefault: boolean
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  email: string
  displayName: string | null
  isInvitationFallback?: boolean
  role: WorkspaceRole
  status: WorkspaceMemberStatus
  userGroupId: string | null
  profileLimit: number | null
  note: string
  invitedBy: string | null
  joinedAt: number
  updatedAt: number
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  userGroupId: string | null
  profileLimit: number | null
  note: string
  invitedBy: string
  invitedByEmail?: string | null
  status: WorkspaceInvitationStatus
  token: string
  expiresAt: number
  acceptedAt: number | null
  revokedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface WorkspaceUserGroup {
  id: string
  workspaceId: string
  name: string
  description: string
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export type RolePermissionMap = Record<PermissionKey, boolean>

export interface WorkspaceRolePermission {
  id: string
  workspaceId: string
  role: WorkspaceRole
  permissions: RolePermissionMap
  createdAt: number
  updatedAt: number
}

export interface InviteMemberInput {
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  userGroupId?: string | null
  profileLimit?: number | null
  note?: string
}

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface CreateWorkspaceUserGroupInput {
  workspaceId: string
  name: string
  description?: string
}

export interface UpdateWorkspaceMemberInput {
  role?: Exclude<WorkspaceRole, 'owner'>
  userGroupId?: string | null
  profileLimit?: number | null
  note?: string
}

export const PermissionKeys: PermissionKey[] = [
  'profile.open',
  'profile.create',
  'profile.edit',
  'profile.delete',
  'profile.import',
  'profile.export',
  'profile.clone',
  'profile.transfer',
  'group.create',
  'group.edit',
  'group.delete',
  'automation.create',
  'automation.edit',
  'automation.run',
  'automation.delete',
  'member.invite',
  'member.remove',
  'member.edit_role',
  'workspace.settings',
  'workspace.billing',
  'workspace.delete',
]

export const DefaultRolePermissionMap: Record<WorkspaceRole, RolePermissionMap> = {
  owner: Object.fromEntries(PermissionKeys.map((key) => [key, true])) as RolePermissionMap,
  admin: {
    'profile.open': true,
    'profile.create': true,
    'profile.edit': true,
    'profile.delete': true,
    'profile.import': true,
    'profile.export': true,
    'profile.clone': true,
    'profile.transfer': true,
    'group.create': true,
    'group.edit': true,
    'group.delete': true,
    'automation.create': true,
    'automation.edit': true,
    'automation.run': true,
    'automation.delete': true,
    'member.invite': true,
    'member.remove': true,
    'member.edit_role': true,
    'workspace.settings': true,
    'workspace.billing': false,
    'workspace.delete': false,
  },
  member: {
    'profile.open': true,
    'profile.create': true,
    'profile.edit': true,
    'profile.delete': false,
    'profile.import': true,
    'profile.export': true,
    'profile.clone': true,
    'profile.transfer': false,
    'group.create': true,
    'group.edit': true,
    'group.delete': false,
    'automation.create': true,
    'automation.edit': true,
    'automation.run': true,
    'automation.delete': false,
    'member.invite': false,
    'member.remove': false,
    'member.edit_role': false,
    'workspace.settings': false,
    'workspace.billing': false,
    'workspace.delete': false,
  },
  viewer: {
    'profile.open': true,
    'profile.create': false,
    'profile.edit': false,
    'profile.delete': false,
    'profile.import': false,
    'profile.export': false,
    'profile.clone': false,
    'profile.transfer': false,
    'group.create': false,
    'group.edit': false,
    'group.delete': false,
    'automation.create': false,
    'automation.edit': false,
    'automation.run': false,
    'automation.delete': false,
    'member.invite': false,
    'member.remove': false,
    'member.edit_role': false,
    'workspace.settings': false,
    'workspace.billing': false,
    'workspace.delete': false,
  },
}

export const RoleLabels: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export const RoleDescriptions: Record<WorkspaceRole, string> = {
  owner: 'Full access. Cannot be downgraded or removed.',
  admin: 'Manage data, members, and workspace settings except billing/delete.',
  member: 'Create and edit workspace data, without destructive member access.',
  viewer: 'Read-only workspace access.',
}

export const PermissionLabels: Record<PermissionKey, string> = {
  'profile.open': 'Mở profile',
  'profile.create': 'Tạo profile',
  'profile.edit': 'Sửa profile',
  'profile.delete': 'Xóa profile',
  'profile.import': 'Nhập profile',
  'profile.export': 'Xuất profile',
  'profile.clone': 'Nhân bản profile',
  'profile.transfer': 'Chuyển profile',
  'group.create': 'Tạo nhóm',
  'group.edit': 'Sửa nhóm',
  'group.delete': 'Xóa nhóm',
  'automation.create': 'Tạo automation',
  'automation.edit': 'Sửa automation',
  'automation.run': 'Chạy automation',
  'automation.delete': 'Xóa automation',
  'member.invite': 'Mời thành viên',
  'member.remove': 'Xóa thành viên',
  'member.edit_role': 'Sửa vai trò',
  'workspace.settings': 'Cài đặt workspace',
  'workspace.billing': 'Thanh toán',
  'workspace.delete': 'Xóa workspace',
}

export const WorkspacePermissions = {
  has: (permissions: RolePermissionMap, key: PermissionKey) => permissions[key] === true,
  canManageMembers: (role: WorkspaceRole | null) => role === 'owner' || role === 'admin',
  canManageProfiles: (role: WorkspaceRole | null) => role === 'owner' || role === 'admin' || role === 'member',
  canDeleteProfiles: (role: WorkspaceRole | null) => role === 'owner' || role === 'admin',
}
