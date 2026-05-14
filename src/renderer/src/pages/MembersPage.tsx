import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/useAuth'
import { useWorkspace } from '../store/useWorkspace'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import { dialog } from '../store/useDialog'
import type { Group, Profile } from '../../../shared/types'
import {
  DefaultRolePermissionMap,
  PermissionKeys,
  PermissionLabels,
  RoleDescriptions,
  RoleLabels,
  type PermissionKey,
  type RolePermissionMap,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceUserGroup,
} from '../../../shared/workspace-types'

type Tab = 'members' | 'invited' | 'permissions'
type GroupPermissionCategory = 'profiles' | 'profileGroups' | 'automation'
type AuthorizationMode = 'group' | 'profile'

const permissionGroups: Array<{ title: string; keys: PermissionKey[] }> = [
  { title: 'Quản lý hồ sơ', keys: ['profile.open', 'profile.create', 'profile.edit', 'profile.delete', 'profile.import', 'profile.export', 'profile.clone', 'profile.transfer'] },
  { title: 'Quản lý nhóm hồ sơ', keys: ['group.create', 'group.edit', 'group.delete'] },
  { title: 'Automation', keys: ['automation.create', 'automation.edit', 'automation.run', 'automation.delete'] },
  { title: 'Thành viên', keys: ['member.invite', 'member.remove', 'member.edit_role'] },
  { title: 'Workspace', keys: ['workspace.settings', 'workspace.billing', 'workspace.delete'] },
]

const groupPermissionCategories: Array<{ key: GroupPermissionCategory; label: string; permissions: PermissionKey[] }> = [
  { key: 'profiles', label: 'Quản lý hồ sơ', permissions: ['profile.open', 'profile.transfer', 'profile.create', 'profile.delete', 'profile.edit', 'profile.import', 'profile.export', 'profile.clone'] },
  { key: 'profileGroups', label: 'Quản lý nhóm hồ sơ', permissions: ['group.create', 'group.edit', 'group.delete'] },
  { key: 'automation', label: 'Quản lý quy trình tự động', permissions: ['automation.create', 'automation.edit', 'automation.delete', 'automation.run'] },
]

const groupPermissionLabels: Partial<Record<PermissionKey, string>> = {
  'profile.open': 'Mở',
  'profile.transfer': 'Chuyển nhóm hồ sơ',
  'profile.create': 'Tạo',
  'profile.delete': 'Xoá',
  'profile.edit': 'Chỉnh sửa ghi chú',
  'profile.import': 'Nhập hồ sơ',
  'profile.export': 'Xuất hồ sơ',
  'profile.clone': 'Nhân bản hồ sơ',
  'group.create': 'Tạo',
  'group.edit': 'Chỉnh sửa',
  'group.delete': 'Xoá',
  'automation.create': 'Tạo',
  'automation.edit': 'Chỉnh sửa',
  'automation.delete': 'Xóa',
  'automation.run': 'Chạy quy trình',
}

const groupDescriptionMetaPrefix = '__ZENVY_GROUP_META__:'

function emptyGroupPermissionMap(): RolePermissionMap {
  return Object.fromEntries(PermissionKeys.map((key) => [key, false])) as RolePermissionMap
}

function parseGroupDescription(raw: string) {
  if (!raw.startsWith(groupDescriptionMetaPrefix)) {
    return { note: raw, permissions: emptyGroupPermissionMap() }
  }

  try {
    const parsed = JSON.parse(raw.slice(groupDescriptionMetaPrefix.length)) as { note?: string; permissions?: Partial<RolePermissionMap> }
    return {
      note: parsed.note ?? '',
      permissions: { ...emptyGroupPermissionMap(), ...(parsed.permissions ?? {}) },
    }
  } catch {
    return { note: raw, permissions: emptyGroupPermissionMap() }
  }
}

function serializeGroupDescription(note: string, permissions: RolePermissionMap) {
  return `${groupDescriptionMetaPrefix}${JSON.stringify({ note, permissions })}`
}

function getInitials(email: string, name?: string | null): string {
  const value = name || email
  return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

function RoleBadge({ role }: { role: WorkspaceRole }) {
  const styles: Record<WorkspaceRole, string> = {
    owner: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    admin: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    member: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    viewer: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  }
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[role]}`}>{RoleLabels[role]}</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    pending: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    expired: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    revoked: 'border-red-500/30 bg-red-500/10 text-red-300',
  }
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[status] ?? 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>{status}</span>
}

export default function MembersPage() {
  const { user } = useAuth()
  const { profiles, groups: profileGroups, loadAll } = useStore()
  const {
    currentWorkspace,
    members,
    invitations,
    userGroups,
    permissions,
    rolePermissions,
    membersLoading,
    invitationsLoading,
    groupsLoading,
    loading,
    error,
    refreshWorkspaceData,
    inviteMember,
    updateMember,
    removeMember,
    revokeInvitation,
    resendInvitation,
    createUserGroup,
    updateUserGroup,
    deleteUserGroup,
    updateRolePermissions,
    getMemberAuthorizations,
    hasPermission,
  } = useWorkspace()

  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<WorkspaceUserGroup | null>(null)
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null)

  useEffect(() => {
    refreshWorkspaceData().catch(() => undefined)
  }, [currentWorkspace?.id, refreshWorkspaceData])

  // ✅ Reset selectedGroup when workspace changes
  useEffect(() => {
    loadAll().catch(() => undefined)
  }, [currentWorkspace?.id, loadAll])

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setSelectedGroup(null)
      return
    }

    if (groupsLoading) return

    if (userGroups.length === 0) {
      if (selectedGroup !== null) setSelectedGroup(null)
      return
    }

    // ✅ Check if selectedGroup belongs to current workspace
    const selectedGroupBelongsToWorkspace = userGroups.some((group) => group.id === selectedGroup)

    if (!selectedGroup || !selectedGroupBelongsToWorkspace) {
      setSelectedGroup(userGroups[0].id)
    }
  }, [currentWorkspace?.id, groupsLoading, selectedGroup, userGroups])

  const canInvite = hasPermission('member.invite')
  const canRemove = hasPermission('member.remove')
  const canEditRole = hasPermission('member.edit_role')
  const canEditPermissions = hasPermission('workspace.settings')
  const currentMember = members.find((member) => member.userId === user?.id) ?? null
  const isWorkspaceOwner = currentMember?.role === 'owner' || currentWorkspace?.ownerId === user?.id
  const canManageUserGroups = isWorkspaceOwner
  const authorizationMode: AuthorizationMode = currentWorkspace?.settings?.permissionMode === 'group' ? 'group' : 'profile'
  // ✅ Manageable members = active non-owner members only
  const manageableMembers = useMemo(() => {
    return members.filter((member) => member.role !== 'owner' && member.status === 'active')
  }, [members])

  // ✅ Group counts = only count manageable members
  const groupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const member of manageableMembers) {
      if (member.userGroupId) {
        map.set(member.userGroupId, (map.get(member.userGroupId) ?? 0) + 1)
      }
    }
    return map
  }, [manageableMembers])

  // ✅ Filtered members = manageable members filtered by selected group
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return manageableMembers.filter((member) => {
      // Filter by selected group - normalize both to strings for comparison
      const matchesGroup = selectedGroup
        ? String(member.userGroupId) === String(selectedGroup)
        : true
      // Filter by search query
      const matchesSearch = !q || member.email.toLowerCase().includes(q) || (member.displayName ?? '').toLowerCase().includes(q)
      return matchesGroup && matchesSearch
    })
  }, [manageableMembers, searchQuery, selectedGroup])

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return invitations.filter((invitation) => {
      const isOpenInvitation = invitation.status === 'pending' || invitation.status === 'expired'
      const matchesGroup = selectedGroup
        ? invitation.userGroupId === selectedGroup || (!invitation.userGroupId && userGroups.length === 1 && selectedGroup === userGroups[0].id)
        : false
      const matchesSearch = !q || invitation.email.toLowerCase().includes(q)
      return isOpenInvitation && matchesGroup && matchesSearch
    })
  }, [invitations, searchQuery, selectedGroup, userGroups])

  if (!currentWorkspace && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-[#1F2230] bg-[#111218] px-6 py-5 text-center">
          <h3 className="text-base font-semibold text-white">Select workspace</h3>
          <p className="mt-2 text-sm text-slate-500">Chọn hoặc tạo workspace trước khi quản lý thành viên.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0">
      <aside className="no-drag relative w-[304px] flex-shrink-0 bg-transparent px-4 py-5">
        <div className="mkt-panel absolute inset-x-4 bottom-5 top-5 z-0" />
        <div className="relative z-10 flex h-full min-h-0 flex-col px-3 py-3">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="whitespace-nowrap text-[17px] font-extrabold leading-tight text-white">Nhóm người dùng</h3>
              <p className="mt-1 text-xs font-medium text-[#8EA0B5]">{userGroups.length} nhóm</p>
            </div>
            {canManageUserGroups && (
              <button onClick={() => setShowGroupModal(true)} className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-[#111827] transition-colors hover:bg-[#E5E7EB]">
                <PlusIcon className="h-4 w-4" />
                Mới
              </button>
            )}
          </div>

          {groupsLoading ? (
            <SkeletonRows count={5} />
          ) : (
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {userGroups.map((group) => (
                <div key={group.id} className="group relative">
                  <GroupFilter label={group.name} active={selectedGroup === group.id} onClick={() => setSelectedGroup(group.id)} />
                  {canManageUserGroups && (
                    <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 gap-1 group-hover:flex">
                      <button onClick={() => setEditingGroup(group)} className="flex h-6 w-6 items-center justify-center rounded text-[#8EA0B5] hover:bg-white/10 hover:text-white" title="Sửa">
                        <EditMiniIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          const count = groupCounts.get(group.id) ?? 0
                          const message = count > 0
                            ? `Nhóm "${group.name}" đang có ${count} thành viên. Vẫn xóa nhóm?`
                            : `Xóa nhóm "${group.name}"?`

                          const confirmed = await dialog.confirmDelete('Xóa nhóm người dùng', message)
                          if (confirmed) {
                            deleteUserGroup(group.id).catch((err) =>
                              toast.error(err instanceof Error ? err.message : 'Không thể xóa nhóm')
                            )
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-500/10"
                        title="Xóa"
                      >
                        <TrashMiniIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="no-drag flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-6 border-b border-[#1F2230] px-6 py-4">
            <div className="relative">
              <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm..."
                className="mkt-input h-9 w-[660px] px-3 pr-10 text-sm placeholder:text-[#64748B]"
              />
            </div>
            <div className="flex-1" />
          </div>

          <div className="mkt-panel mx-6 mb-3 mt-6 min-h-0 flex-1 overflow-hidden p-6">
            <div className="mkt-divider-bottom mb-6 flex items-center">
              <TabButton tab="members" active={activeTab === 'members'} onClick={setActiveTab}>Thành viên</TabButton>
              <TabButton tab="invited" active={activeTab === 'invited'} onClick={setActiveTab}>Đã mời</TabButton>
              <TabButton tab="permissions" active={activeTab === 'permissions'} onClick={setActiveTab}>Quyền truy cập</TabButton>
              <div className="flex-1" />
              <div className="mb-2 flex gap-2">
                <button onClick={() => refreshWorkspaceData()} className="h-9 rounded-lg bg-white px-4 text-sm font-bold text-[#111827] transition-colors hover:bg-[#E5E7EB]">
                  ↻ Làm mới
                </button>
                {canInvite ? (
                  <button onClick={() => setShowInviteModal(true)} className="h-9 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3B82F6]">
                    + Mời thành viên
                  </button>
                ) : (
                  <button disabled title="Bạn không có quyền mời thành viên" className="h-9 rounded-lg bg-[#263241] px-4 text-sm text-[#7C8796]">
                    + Mời thành viên
                  </button>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
            {error && <ErrorState message={error} onRetry={() => refreshWorkspaceData()} />}
            {!error && activeTab === 'members' && (
              <MembersTab
                members={filteredMembers}
                currentUserId={user?.id ?? ''}
                loading={membersLoading || loading}
                canEditRole={canEditRole}
                canRemove={canRemove}
                selectedGroup={selectedGroup}
                userGroups={userGroups}
                onEdit={setEditingMember}
                onRemove={async (memberId) => {
                  try {
                    await removeMember(memberId)
                    await refreshWorkspaceData()
                    toast.success('Đã xóa thành viên')
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Không thể xóa thành viên')
                  }
                }}
              />
            )}
            {!error && activeTab === 'invited' && (
              <InvitationsTab
                invitations={filteredInvitations}
                userGroups={userGroups}
                loading={invitationsLoading || loading}
                canInvite={canInvite}
                canRevoke={canInvite || canRemove}
                onResend={async (invitationId) => {
                  try {
                    await resendInvitation(invitationId)
                    await refreshWorkspaceData()
                    toast.success('Đã gửi lại lời mời')
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Không thể gửi lại lời mời')
                  }
                }}
                onRevoke={async (invitationId) => {
                  try {
                    await revokeInvitation(invitationId)
                    await refreshWorkspaceData()
                    toast.success('Đã xóa lời mời')
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Không thể xóa lời mời')
                  }
                }}
              />
            )}
            {!error && activeTab === 'permissions' && (
              <PermissionsTab rolePermissions={rolePermissions} currentPermissions={permissions} canEdit={canEditPermissions} onSave={updateRolePermissions} />
            )}
            </div>
          </div>
        </div>
      </section>

      {showInviteModal && (
        <InviteMemberModal
          userGroups={userGroups}
          profiles={profiles}
          profileGroups={profileGroups}
          authorizationMode={authorizationMode}
          initialGroupId={selectedGroup}
          onClose={() => setShowInviteModal(false)}
          onInvite={async (input) => {
            try {
              await inviteMember(input)
              setShowInviteModal(false)
              setActiveTab('invited')
              toast.success('Đã gửi lời mời')
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to invite member')
            }
          }}
        />
      )}
      {showGroupModal && canManageUserGroups && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onSave={async (name, description) => {
            const group = await createUserGroup(name, description)
            setSelectedGroup(group.id)
            setShowGroupModal(false)
            toast.success('Đã tạo nhóm người dùng')
          }}
        />
      )}
      {editingGroup && canManageUserGroups && (
        <GroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSave={async (name, description) => {
            await updateUserGroup(editingGroup.id, name, description)
            setEditingGroup(null)
            toast.success('Đã cập nhật nhóm')
          }}
        />
      )}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          userGroups={userGroups}
          profiles={profiles}
          profileGroups={profileGroups}
          authorizationMode={authorizationMode}
          getMemberAuthorizations={getMemberAuthorizations}
          onClose={() => setEditingMember(null)}
          onSave={async (input) => {
            try {
              await updateMember(editingMember.id, input)
              await refreshWorkspaceData()
              setEditingMember(null)
              toast.success('Đã cập nhật thành viên')
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thành viên')
            }
          }}
        />
      )}
    </div>
  )
}

function TabButton({ tab, active, onClick, children }: { tab: Tab; active: boolean; onClick: (tab: Tab) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => onClick(tab)} className={`mr-10 border-b-2 px-0 pb-3 pt-2 text-base font-bold ${active ? 'border-white text-white' : 'border-transparent text-[#8EA0B5] hover:text-white'}`}>
      {children}
    </button>
  )
}

function GroupFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex h-10 w-full min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold transition-all ${active ? 'bg-[#243752] text-white' : 'text-[#D7DEE8] hover:bg-white/5 hover:text-white'}`}>
      <FolderIcon className={active ? 'h-4 w-4 shrink-0 text-[#60A5FA]' : 'h-4 w-4 shrink-0 text-[#8EA0B5]'} />
      <span className="min-w-0 flex-1 truncate pr-12">{label}</span>
    </button>
  )
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
    </svg>
  )
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h6l1.5 2h9v8.5a2 2 0 01-2 2H5.75a2 2 0 01-2-2V6.75z" />
    </svg>
  )
}

function EditMiniIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.86 4.49l2.65 2.65a1.67 1.67 0 010 2.36L10.1 18.91 5 20l1.09-5.1 9.41-9.41a1.67 1.67 0 012.36 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 6.85l2.65 2.65" />
    </svg>
  )
}

function TrashMiniIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7V5.75A1.75 1.75 0 0110.75 4h2.5A1.75 1.75 0 0115 5.75V7m-8 0h10m-9 0l.8 11.2A2 2 0 0010.8 20h2.4a2 2 0 002-1.8L16 7" />
    </svg>
  )
}

function CheckMiniIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronRightMiniIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 6l6 6-6 6" />
    </svg>
  )
}

function MembersTab({
  members,
  currentUserId,
  loading,
  canEditRole,
  canRemove,
  onEdit,
  onRemove,
  selectedGroup,
  userGroups,
}: {
  members: WorkspaceMember[]
  currentUserId: string
  loading: boolean
  canEditRole: boolean
  canRemove: boolean
  onEdit: (member: WorkspaceMember) => void
  onRemove: (memberId: string) => Promise<void>
  selectedGroup: string | null
  userGroups: WorkspaceUserGroup[]
}) {
  if (loading) return <TableSkeleton columns={8} rows={6} />

  // ✅ Better empty state messages
  const getEmptyMessage = () => {
    if (userGroups.length === 0) {
      return { title: 'Chưa có nhóm người dùng', description: 'Bạn cần tạo nhóm người dùng trước khi mời thành viên.' }
    }
    if (selectedGroup) {
      const groupName = userGroups.find(g => g.id === selectedGroup)?.name ?? 'này'
      return { title: 'Nhóm này chưa có thành viên', description: `Mời thành viên vào nhóm ${groupName} để bắt đầu.` }
    }
    return { title: 'Chưa có thành viên nào', description: 'Mời thành viên vào workspace để cộng tác.' }
  }

  if (members.length === 0) {
    const emptyMsg = getEmptyMessage()
    return <EmptyState title={emptyMsg.title} description={emptyMsg.description} />
  }

  return (
    <div className="flex min-h-[590px] flex-col">
      <div className="overflow-hidden rounded-xl">
        <table className="w-full min-w-[980px]">
          <thead className="mkt-table-head">
            <tr>
              {['Tên', 'Email', 'Quyền hạn', 'Ghi chú', 'Hành động'].map((label) => (
                <th key={label} className="px-4 py-4 text-left text-sm font-bold text-[#9AA8B8]">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isOwner = member.role === 'owner'
              const isSelf = member.userId === currentUserId
              return (
                <tr key={member.id} className="border-b border-dashed border-[#2D3A49] transition-colors hover:bg-white/[0.025]">
                  <td className="px-4 py-4 text-sm font-semibold text-white">{member.displayName || member.email.split('@')[0]}</td>
                  <td className="px-4 py-4 text-sm text-[#9AA8B8]">{member.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className="max-w-[260px] truncate px-4 py-4 text-sm text-[#9AA8B8]" title={member.note}>{member.note || '-'}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-3">
                      {canEditRole && !isOwner && <button onClick={() => onEdit(member)} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>}
                      {canRemove && !isOwner && !isSelf && (
                        <button
                          onClick={async () => {
                            const confirmed = await dialog.confirmDelete(
                              'Xóa thành viên',
                              `Xóa ${member.email} khỏi workspace?`
                            )
                            if (confirmed) {
                              onRemove(member.id)
                            }
                          }}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InvitationsTab({ invitations, userGroups, loading, canInvite, canRevoke, onResend, onRevoke }: {
  invitations: WorkspaceInvitation[]
  userGroups: WorkspaceUserGroup[]
  loading: boolean
  canInvite: boolean
  canRevoke: boolean
  onResend: (id: string) => Promise<void>
  onRevoke: (id: string) => Promise<void>
}) {
  if (loading) return <TableSkeleton columns={7} rows={5} />
  if (invitations.length === 0) return <EmptyState title="Chưa có lời mời nào" description="Các lời mời đang chờ, đã nhận hoặc bị thu hồi sẽ xuất hiện tại đây." />

  return (
    <div className="overflow-hidden rounded-xl">
      <table className="w-full min-w-[900px]">
        <thead className="mkt-table-head">
          <tr>
            {['Email', 'Role', 'Nhóm người dùng', 'Status', 'Invited by', 'Expires at', 'Actions'].map((label) => (
              <th key={label} className="px-4 py-4 text-left text-sm font-bold text-[#9AA8B8]">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => {
            const groupName = userGroups.find((group) => group.id === invitation.userGroupId)?.name ?? '-'
            return (
              <tr key={invitation.id} className="border-b border-dashed border-[#2D3A49] transition-colors hover:bg-white/[0.025]">
                <td className="px-4 py-3 text-sm text-white">{invitation.email}</td>
                <td className="px-4 py-3"><RoleBadge role={invitation.role} /></td>
                <td className="px-4 py-3 text-sm text-slate-400">{groupName}</td>
                <td className="px-4 py-3"><StatusBadge status={invitation.status} /></td>
                <td className="px-4 py-3 text-sm text-slate-400">{invitation.invitedByEmail ?? invitation.invitedBy.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{new Date(invitation.expiresAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    {canInvite && (invitation.status === 'pending' || invitation.status === 'expired') && <button onClick={() => onResend(invitation.id)} className="text-sm text-blue-400 hover:text-blue-300">Gửi lại</button>}
                    {canRevoke && (invitation.status === 'pending' || invitation.status === 'expired') && <button onClick={() => onRevoke(invitation.id)} className="text-sm text-red-400 hover:text-red-300">Xóa</button>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PermissionsTab({ rolePermissions, currentPermissions, canEdit, onSave }: { rolePermissions: Record<WorkspaceRole, RolePermissionMap>; currentPermissions: RolePermissionMap; canEdit: boolean; onSave: (role: WorkspaceRole, permissions: RolePermissionMap) => Promise<void> }) {
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('admin')
  const [drafts, setDrafts] = useState<Record<WorkspaceRole, RolePermissionMap>>({
    owner: rolePermissions.owner,
    admin: rolePermissions.admin,
    member: rolePermissions.member,
    viewer: rolePermissions.viewer,
  })
  const [saving, setSaving] = useState(false)
  const draft = selectedRole === 'owner' ? DefaultRolePermissionMap.owner : drafts[selectedRole]

  useEffect(() => {
    setDrafts({
      owner: rolePermissions.owner,
      admin: rolePermissions.admin,
      member: rolePermissions.member,
      viewer: rolePermissions.viewer,
    })
  }, [rolePermissions, currentPermissions])

  const toggle = (key: PermissionKey) => {
    if (!canEdit || selectedRole === 'owner') return
    setDrafts((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[selectedRole], [key]: !prev[selectedRole][key] },
    }))
  }

  return (
    <div className="space-y-5">
      <div className="mkt-panel-soft p-4">
        <div className="flex flex-wrap gap-2">
          {(['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[]).map((role) => (
            <button key={role} onClick={() => setSelectedRole(role)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${selectedRole === role ? 'border-[#3B82F6] bg-[#1E3350] text-white' : 'border-[#2F3B4B] text-[#8EA0B5] hover:bg-white/5'}`}>
              {RoleLabels[role]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">{RoleDescriptions[selectedRole]}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {permissionGroups.map((group) => (
          <div key={group.title} className="mkt-panel-soft p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">{group.title}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.keys.map((key) => (
                <label key={key} className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" checked={draft[key]} disabled={!canEdit || selectedRole === 'owner'} onChange={() => toggle(key)} className="h-4 w-4 rounded border-[#1F2230] bg-[#0B0B0F]" />
                  <span>{PermissionLabels[key]}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mkt-panel-soft flex items-center justify-between p-4">
        <p className="text-sm text-slate-500">{selectedRole === 'owner' ? 'Owner luôn full quyền và không chỉnh được.' : canEdit ? 'Lưu thay đổi để cập nhật permission template.' : 'Bạn không có quyền chỉnh permission template.'}</p>
        {selectedRole !== 'owner' && (
          <button
            disabled={!canEdit || saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave(selectedRole, drafts[selectedRole])
                toast.success('Đã lưu quyền truy cập')
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Không thể lưu quyền')
              } finally {
                setSaving(false)
              }
            }}
            className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B5CF6] disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        )}
      </div>
    </div>
  )
}

function InviteMemberModal({ userGroups, profiles, profileGroups, authorizationMode, initialGroupId, onClose, onInvite }: {
  userGroups: WorkspaceUserGroup[]
  profiles: Profile[]
  profileGroups: Group[]
  authorizationMode: AuthorizationMode
  initialGroupId: string | null
  onClose: () => void
  onInvite: (input: { email: string; role: Exclude<WorkspaceRole, 'owner'>; userGroupId: string | null; profileLimit: number | null; note: string; profileIds: string[]; groupIds: string[] }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>('member')
  const [userGroupId, setUserGroupId] = useState(initialGroupId ?? '')
  const [profileIds, setProfileIds] = useState<string[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [profileLimit, setProfileLimit] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  // ✅ Check if no user groups exist
  const hasNoGroups = userGroups.length === 0
  const canSubmit = validEmail && userGroupId && !hasNoGroups
  const validationMessage = hasNoGroups
    ? 'Bạn cần tạo Nhóm người dùng trước khi mời thành viên.'
    : !userGroupId
      ? 'Vui lòng chọn nhóm người dùng cho thành viên'
      : null

  return (
    <MemberFormModal
      title="Mời thành viên"
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      emailReadOnly={false}
      role={role}
      setRole={setRole}
      userGroupId={userGroupId}
      setUserGroupId={setUserGroupId}
      profileLimit={profileLimit}
      setProfileLimit={setProfileLimit}
      note={note}
      setNote={setNote}
      userGroups={userGroups}
      profiles={profiles}
      profileGroups={profileGroups}
      authorizationMode={authorizationMode}
      profileIds={profileIds}
      setProfileIds={setProfileIds}
      groupIds={groupIds}
      setGroupIds={setGroupIds}
      loading={loading}
      submitDisabled={!canSubmit}
      submitLabel="OK"
      noGroupsWarning={hasNoGroups}
      validationMessage={validationMessage}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSubmit) return
        setLoading(true)
        try {
          await onInvite({
            email: email.trim().toLowerCase(),
            role,
            userGroupId,
            profileLimit: profileLimit ? Number(profileLimit) : null,
            note: note.trim(),
            profileIds: authorizationMode === 'profile' ? profileIds : [],
            groupIds: authorizationMode === 'group' ? groupIds : [],
          })
        } finally {
          setLoading(false)
        }
      }}
    />
  )
}

function EditMemberModal({ member, userGroups, profiles, profileGroups, authorizationMode, getMemberAuthorizations, onClose, onSave }: {
  member: WorkspaceMember
  userGroups: WorkspaceUserGroup[]
  profiles: Profile[]
  profileGroups: Group[]
  authorizationMode: AuthorizationMode
  getMemberAuthorizations: (memberId: string) => Promise<{ profileIds: string[]; groupIds: string[] }>
  onClose: () => void
  onSave: (input: { role: Exclude<WorkspaceRole, 'owner'>; userGroupId: string | null; profileLimit: number | null; note: string; profileIds: string[]; groupIds: string[] }) => Promise<void>
}) {
  const [name, setName] = useState(member.displayName || member.email.split('@')[0])
  const [email, setEmail] = useState(member.email)
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>(member.role === 'owner' ? 'member' : member.role)
  const [userGroupId, setUserGroupId] = useState(member.userGroupId ?? '')
  const [profileIds, setProfileIds] = useState<string[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [profileLimit, setProfileLimit] = useState(member.profileLimit?.toString() ?? '')
  const [note, setNote] = useState(member.note)
  const [loading, setLoading] = useState(false)
  const validationMessage = !userGroupId ? 'Vui lòng chọn nhóm người dùng cho thành viên' : null

  useEffect(() => {
    let cancelled = false
    getMemberAuthorizations(member.id)
      .then((auth) => {
        if (cancelled) return
        setProfileIds(auth.profileIds)
        setGroupIds(auth.groupIds)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Không thể tải quyền hồ sơ'))
    return () => {
      cancelled = true
    }
  }, [getMemberAuthorizations, member.id])

  return (
    <MemberFormModal
      title="Cập nhật thông tin thành viên"
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      emailReadOnly
      role={role}
      setRole={setRole}
      userGroupId={userGroupId}
      setUserGroupId={setUserGroupId}
      profileLimit={profileLimit}
      setProfileLimit={setProfileLimit}
      note={note}
      setNote={setNote}
      userGroups={userGroups}
      profiles={profiles}
      profileGroups={profileGroups}
      authorizationMode={authorizationMode}
      profileIds={profileIds}
      setProfileIds={setProfileIds}
      groupIds={groupIds}
      setGroupIds={setGroupIds}
      loading={loading}
      submitLabel="OK"
      submitDisabled={!userGroupId}
      validationMessage={validationMessage}
      onClose={onClose}
      onSubmit={async () => {
        setLoading(true)
        try {
          await onSave({
            role,
            userGroupId,
            profileLimit: profileLimit ? Number(profileLimit) : null,
            note: note.trim(),
            profileIds: authorizationMode === 'profile' ? profileIds : [],
            groupIds: authorizationMode === 'group' ? groupIds : [],
          })
        } finally {
          setLoading(false)
        }
      }}
    />
  )
}

function MemberFormModal({
  title,
  name,
  setName,
  email,
  setEmail,
  emailReadOnly,
  role,
  setRole,
  userGroupId,
  setUserGroupId,
  profileLimit,
  setProfileLimit,
  note,
  setNote,
  userGroups,
  profiles,
  profileGroups,
  authorizationMode,
  profileIds,
  setProfileIds,
  groupIds,
  setGroupIds,
  loading,
  submitDisabled,
  submitLabel,
  noGroupsWarning,
  validationMessage,
  onClose,
  onSubmit,
}: {
  title: string
  name: string
  setName: (value: string) => void
  email: string
  setEmail: (value: string) => void
  emailReadOnly: boolean
  role: Exclude<WorkspaceRole, 'owner'>
  setRole: (value: Exclude<WorkspaceRole, 'owner'>) => void
  userGroupId: string
  setUserGroupId: (value: string) => void
  profileLimit: string
  setProfileLimit: (value: string) => void
  note: string
  setNote: (value: string) => void
  userGroups: WorkspaceUserGroup[]
  profiles: Profile[]
  profileGroups: Group[]
  authorizationMode: AuthorizationMode
  profileIds: string[]
  setProfileIds: (value: string[]) => void
  groupIds: string[]
  setGroupIds: (value: string[]) => void
  loading: boolean
  submitDisabled?: boolean
  submitLabel: string
  noGroupsWarning?: boolean
  validationMessage?: string | null
  onClose: () => void
  onSubmit: () => Promise<void>
}) {
  return (
    <Modal title={title} onClose={onClose} size="member">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          await onSubmit()
        }}
        className="space-y-6"
      >
        {noGroupsWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-200">
              ⚠️ Bạn cần tạo Nhóm người dùng trước khi mời thành viên.
            </p>
            <p className="mt-2 text-sm text-amber-300/80">
              Mỗi thành viên phải thuộc một nhóm người dùng để quản lý quyền truy cập.
            </p>
          </div>
        )}
        {validationMessage && !noGroupsWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-200">{validationMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-6 gap-y-5">
          <label className="pt-2 text-sm font-bold text-white">Tên nhóm</label>
          <UserGroupSelect userGroups={userGroups} value={userGroupId} onChange={setUserGroupId} />

          <label className="pt-2 text-sm font-bold text-white">Tên</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập tên thành viên" className="mkt-input h-10 px-3 text-sm placeholder:text-[#64748B]" />

          <label className="pt-2 text-sm font-bold text-white">Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={emailReadOnly} required className="mkt-input h-10 px-3 text-sm placeholder:text-[#64748B] read-only:opacity-80" placeholder="Nhập email thành viên" />

          <div className="pt-1 text-sm font-bold text-white">Vai trò</div>
          <div>
            <div className="flex flex-wrap items-center gap-8">
              <RoleRadio label="Administrator" value="admin" role={role} onChange={setRole} />
              <RoleRadio label="Manager" value="member" role={role} onChange={setRole} />
              <RoleRadio label="Member" value="viewer" role={role} onChange={setRole} />
            </div>
            <p className="mt-3 text-sm text-[#64748B]">
              {role === 'admin'
                ? 'Có thể chỉnh sửa tất cả chức năng của người dùng và truy cập vào các nhóm hồ sơ'
                : role === 'member'
                  ? 'Có thể thao tác theo quyền được cấp trong nhóm người dùng'
                  : 'Chỉ có quyền truy cập cơ bản theo nhóm người dùng'}
            </p>
          </div>

          {authorizationMode === 'group' && (
          <>
          <label className="pt-2 text-sm font-bold text-white">Nhóm hồ sơ được phép</label>
          <AuthorizationPicker
            items={profileGroups.map((group) => ({ id: group.id, label: group.name }))}
            selectedIds={groupIds}
            onChange={setGroupIds}
            emptyText="Chưa có nhóm hồ sơ"
            placeholder="+ nhóm hồ sơ"
          />
          </>
          )}

          {authorizationMode === 'profile' && (
          <>
          <label className="pt-2 text-sm font-bold text-white">Hồ sơ được phép</label>
          <AuthorizationPicker
            items={profiles.map((profile) => ({ id: profile.id, label: profile.name }))}
            selectedIds={profileIds}
            onChange={setProfileIds}
            emptyText="Chưa có hồ sơ"
            placeholder="+ hồ sơ"
          />
          </>
          )}

          <label className="pt-2 text-sm font-bold text-white">Giới hạn nhập hồ sơ</label>
          <input type="number" min="0" value={profileLimit} onChange={(event) => setProfileLimit(event.target.value)} placeholder="Nếu để trống sẽ không giới hạn số hồ sơ mà thành viên sử dụng" className="mkt-input h-10 px-3 text-sm placeholder:text-[#64748B]" />

          <label className="pt-2 text-sm font-bold text-white">Ghi chú</label>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="Không bắt buộc" className="mkt-input resize-none px-3 py-3 text-sm placeholder:text-[#64748B]" />
        </div>

        <div className="flex justify-end gap-4 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#344153] px-5 py-2 text-sm font-bold text-white hover:bg-white/5">Hủy</button>
          <button disabled={loading || submitDisabled} className="rounded-lg bg-[#2563EB] px-6 py-2 text-sm font-bold text-white hover:bg-[#3B82F6] disabled:opacity-50">{loading ? 'Đang xử lý...' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

function UserGroupSelect({
  userGroups,
  value,
  onChange,
}: {
  userGroups: WorkspaceUserGroup[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = userGroups.find((group) => group.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-[#111A24] px-3 text-left text-sm font-semibold outline-none transition-colors ${
          open ? 'border-[#2F80ED] text-white' : 'border-[#344153] text-white hover:border-[#64748B]'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-white' : 'text-[#64748B]'}`}>
          {selected?.name ?? 'Không chọn'}
        </span>
        <svg className={`ml-3 h-4 w-4 shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[44px] z-50 max-h-60 overflow-y-auto rounded-b-lg border border-t-0 border-[#263241] bg-[#1B2532] py-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
            className={`flex h-9 w-full items-center px-3 text-left text-sm font-bold hover:bg-white/5 ${!value ? 'bg-white/10 text-white' : 'text-[#D7DEE8]'}`}
          >
            Không chọn
          </button>
          {userGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                onChange(group.id)
                setOpen(false)
              }}
              className={`flex h-9 w-full items-center px-3 text-left text-sm font-bold hover:bg-white/5 ${
                value === group.id ? 'bg-white/10 text-white' : 'text-[#D7DEE8]'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{group.name}</span>
              {value === group.id && <CheckMiniIcon className="h-4 w-4 text-[#60A5FA]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AuthorizationPicker({
  items,
  selectedIds,
  onChange,
  emptyText,
  placeholder,
}: {
  items: Array<{ id: string; label: string }>
  selectedIds: string[]
  onChange: (value: string[]) => void
  emptyText: string
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const selectedItems = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is { id: string; label: string } => Boolean(item))
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])
  }
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id))
  const visibleSelectedItems = allSelected ? [{ id: '__all__', label: 'Tất cả' }] : selectedItems

  if (items.length === 0) {
    return (
      <div className="flex min-h-10 items-center rounded-lg border border-[#344153] bg-[#111A24] px-3 text-sm text-[#64748B]">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-[#111A24] px-2 py-1 text-left text-sm font-semibold outline-none transition-colors ${
          open ? 'border-white text-white' : 'border-[#344153] text-[#64748B] hover:border-[#64748B]'
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {visibleSelectedItems.length === 0 ? (
            <span className="px-1 text-[#64748B]">{placeholder}</span>
          ) : (
            visibleSelectedItems.map((item) => (
              <span key={item.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-md bg-[#28496E] px-2 py-1 text-xs font-bold text-[#A7D1FF]">
                <span className="truncate">{item.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onChange(item.id === '__all__' ? [] : selectedIds.filter((id) => id !== item.id))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onChange(item.id === '__all__' ? [] : selectedIds.filter((id) => id !== item.id))
                    }
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-[#315B89] text-[#BFDFFF] hover:bg-[#3B6EA6]"
                >
                  ×
                </span>
              </span>
            ))
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedItems.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onChange([])
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onChange([])
                }
              }}
              className="text-lg leading-none text-[#8EA0B5] hover:text-white"
            >
              ×
            </span>
          )}
          <svg className={`h-4 w-4 text-[#8EA0B5] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[44px] z-50 max-h-60 overflow-y-auto rounded-b-lg border border-t-0 border-[#263241] bg-[#1B2532] py-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              onChange(allSelected ? [] : items.map((item) => item.id))
            }}
            className={`flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-bold hover:bg-white/5 ${
              allSelected ? 'bg-white/10 text-white' : 'text-white'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">Tất cả</span>
            {allSelected && <CheckMiniIcon className="h-4 w-4 text-[#60A5FA]" />}
          </button>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              toggle(item.id)
            }}
            className={`flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-bold hover:bg-white/5 ${
              selectedIds.includes(item.id) ? 'bg-white/10 text-white' : 'text-[#D7DEE8]'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {selectedIds.includes(item.id) && <CheckMiniIcon className="h-4 w-4 text-[#60A5FA]" />}
          </button>
        ))}
        </div>
      )}
    </div>
  )
}

function RoleRadio({ label, value, role, onChange }: { label: string; value: Exclude<WorkspaceRole, 'owner'>; role: Exclude<WorkspaceRole, 'owner'>; onChange: (value: Exclude<WorkspaceRole, 'owner'>) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-white">
      <input type="radio" checked={role === value} onChange={() => onChange(value)} className="h-4 w-4 accent-[#2F80ED]" />
      <span>{label}</span>
    </label>
  )
}

function GroupModal({ group, onClose, onSave }: { group?: WorkspaceUserGroup; onClose: () => void; onSave: (name: string, description: string) => Promise<void> }) {
  const initial = parseGroupDescription(group?.description ?? '')
  const [name, setName] = useState(group?.name ?? '')
  const [note, setNote] = useState(initial.note)
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionMap>(initial.permissions)
  const [selectedCategory, setSelectedCategory] = useState<GroupPermissionCategory>('profiles')
  const [loading, setLoading] = useState(false)
  const activeCategory = groupPermissionCategories.find((item) => item.key === selectedCategory) ?? groupPermissionCategories[0]

  const toggleCategory = (category: (typeof groupPermissionCategories)[number]) => {
    const enabled = !category.permissions.every((key) => draftPermissions[key])
    setDraftPermissions((current) => ({
      ...current,
      ...Object.fromEntries(category.permissions.map((key) => [key, enabled])),
    }))
    setSelectedCategory(category.key)
  }

  const togglePermission = (key: PermissionKey) => {
    setDraftPermissions((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <Modal title={group ? 'Sửa nhóm người dùng' : 'Thêm nhóm người dùng'} onClose={onClose} size="group">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          setLoading(true)
          try {
            await onSave(name.trim(), serializeGroupDescription(note.trim(), draftPermissions))
          } finally {
            setLoading(false)
          }
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-6 gap-y-6">
          <label className="pt-2 text-sm font-bold text-white">Tên</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập tên nhóm" required className="mkt-input h-10 px-3 text-sm placeholder:text-[#64748B]" />

          <label className="pt-2 text-sm font-bold text-white">Ghi chú</label>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Giới thiệu nhóm" rows={5} className="mkt-input resize-none px-3 py-3 text-sm placeholder:text-[#64748B]" />

          <div className="pt-1 text-sm font-bold text-white">Cấp phép</div>
          <div>
            <p className="mb-4 max-w-[720px] text-sm font-semibold leading-6 text-white">
              Vui lòng cấp quyền cho các chức năng cho nhóm người dùng. Người dùng cùng một nhóm có quyền truy cập vào các chức năng giống nhau.
            </p>
            <div className="min-h-[218px] rounded-lg border border-[#1F6FEB] bg-[#1B2532] p-3">
              <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-6">
                <div className="space-y-1">
                  {groupPermissionCategories.map((category) => {
                    const checked = category.permissions.every((key) => draftPermissions[key])
                    const active = selectedCategory === category.key
                    return (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category.key)
                          if (active) toggleCategory(category)
                        }}
                        className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-bold transition-colors ${active ? 'bg-[#243752] text-white' : 'text-white hover:bg-white/5'}`}
                      >
                        <span
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleCategory(category)
                          }}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-[#2F80ED] bg-[#2F80ED] text-white' : 'border-[#8EA0B5] text-transparent'}`}
                        >
                          <CheckMiniIcon className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{category.label}</span>
                        <ChevronRightMiniIcon className="h-4 w-4 text-white" />
                      </button>
                    )
                  })}
                </div>

                <div className="grid content-start gap-4 pt-1">
                  {activeCategory.permissions.map((key) => (
                    <label key={key} className="flex h-8 items-center gap-3 text-sm font-bold text-white">
                      <input type="checkbox" checked={draftPermissions[key]} onChange={() => togglePermission(key)} className="h-4 w-4 rounded border-[#8EA0B5] bg-transparent accent-[#2F80ED]" />
                      <span>{groupPermissionLabels[key] ?? PermissionLabels[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ModalActions onClose={onClose} submitLabel="OK" loading={loading} disabled={!name.trim()} />
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children, size = 'default' }: { title: string; onClose: () => void; children: React.ReactNode; size?: 'default' | 'group' | 'member' }) {
  const isGroup = size === 'group'
  const isMember = size === 'member'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`${isGroup ? 'w-[900px]' : isMember ? 'w-[900px]' : 'w-[520px]'} ${isGroup || isMember ? 'bg-[#202B38]' : 'bg-[#111218]'} max-w-[calc(100vw-48px)] rounded-xl border border-white/10 p-6 shadow-2xl`}>
        <div className={`mb-5 flex items-center justify-between ${(isGroup || isMember) ? 'border-b border-[#344153] pb-4' : ''}`}>
          <h3 className={`${(isGroup || isMember) ? 'text-2xl font-extrabold' : 'text-lg font-semibold'} text-white`}>{title}</h3>
          <button onClick={onClose} className={`${(isGroup || isMember) ? 'text-2xl' : ''} leading-none text-[#9AA8B8] hover:text-white`}>{(isGroup || isMember) ? '×' : 'X'}</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>{children}</label>
}

function ModalActions({ onClose, submitLabel, loading, disabled }: { onClose: () => void; submitLabel: string; loading: boolean; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="rounded-lg border border-[#1F2230] px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Hủy</button>
      <button disabled={loading || disabled} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B5CF6] disabled:opacity-50">{loading ? 'Đang xử lý...' : submitLabel}</button>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mkt-panel-soft flex min-h-[520px] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-[68px] w-[88px] items-center justify-center rounded-lg bg-[#657282]/70 text-[#303946]">
        <svg className="h-11 w-14" viewBox="0 0 80 56" fill="none">
          <rect x="6" y="8" width="68" height="42" rx="7" fill="currentColor" opacity="0.35" />
          <rect x="17" y="20" width="26" height="4" rx="2" fill="#8996A6" />
          <rect x="17" y="30" width="30" height="4" rx="2" fill="#8996A6" />
          <rect x="17" y="40" width="22" height="4" rx="2" fill="#8996A6" />
          <rect x="50" y="20" width="16" height="24" rx="3" fill="#8996A6" opacity="0.55" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#7C8796]">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-[#7C8796]">{description}</p>}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"><span>{message}</span><button onClick={onRetry} className="rounded border border-red-400/30 px-3 py-1 text-red-100 hover:bg-red-500/10">Retry</button></div>
}

function SkeletonRows({ count }: { count: number }) {
  return <div className="space-y-2">{Array.from({ length: count }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-white/5" />)}</div>
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return <div className="rounded-xl border border-[#1F2230] p-4"><div className="space-y-3">{Array.from({ length: rows }).map((_, row) => <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }).map((__, col) => <div key={col} className="h-8 animate-pulse rounded bg-white/5" />)}</div>)}</div></div>
}
