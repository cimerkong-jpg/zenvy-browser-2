import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/useAuth'
import { useWorkspace } from '../store/useWorkspace'
import { toast } from '../store/useToast'
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

const permissionGroups: Array<{ title: string; keys: PermissionKey[] }> = [
  { title: 'Quản lý hồ sơ', keys: ['profile.open', 'profile.create', 'profile.edit', 'profile.delete', 'profile.import', 'profile.export', 'profile.clone', 'profile.transfer'] },
  { title: 'Quản lý nhóm hồ sơ', keys: ['group.create', 'group.edit', 'group.delete'] },
  { title: 'Automation', keys: ['automation.create', 'automation.edit', 'automation.run', 'automation.delete'] },
  { title: 'Thành viên', keys: ['member.invite', 'member.remove', 'member.edit_role'] },
  { title: 'Workspace', keys: ['workspace.settings', 'workspace.billing', 'workspace.delete'] },
]

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

  const canInvite = hasPermission('member.invite')
  const canRemove = hasPermission('member.remove')
  const canEditRole = hasPermission('member.edit_role')
  const canEditPermissions = hasPermission('workspace.settings')

  const groupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const member of members) {
      if (member.userGroupId) map.set(member.userGroupId, (map.get(member.userGroupId) ?? 0) + 1)
    }
    return map
  }, [members])

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return members.filter((member) => {
      const matchesGroup = !selectedGroup || member.userGroupId === selectedGroup
      const matchesSearch = !q || member.email.toLowerCase().includes(q) || (member.displayName ?? '').toLowerCase().includes(q)
      return matchesGroup && matchesSearch
    })
  }, [members, searchQuery, selectedGroup])

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
    <div className="flex h-full">
      <aside className="w-72 flex-shrink-0 border-r border-[#1F2230] bg-[#0B0B0F]">
        <div className="drag-region h-12" />
        <div className="no-drag p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Nhóm người dùng</h3>
              <p className="mt-1 text-xs text-slate-500">{members.length} thành viên</p>
            </div>
            {canEditRole && (
              <button onClick={() => setShowGroupModal(true)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-slate-200">
                + Tạo nhóm
              </button>
            )}
          </div>

          {groupsLoading ? (
            <SkeletonRows count={5} />
          ) : (
            <div className="space-y-1">
              <GroupFilter label="Tất cả" count={members.length} active={selectedGroup === null} onClick={() => setSelectedGroup(null)} />
              {userGroups.map((group) => (
                <div key={group.id} className="group flex items-center gap-1">
                  <GroupFilter label={group.name} count={groupCounts.get(group.id) ?? 0} active={selectedGroup === group.id} onClick={() => setSelectedGroup(group.id)} />
                  {canEditRole && (
                    <div className="hidden gap-1 group-hover:flex">
                      <button onClick={() => setEditingGroup(group)} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white">Sửa</button>
                      <button
                        onClick={() => {
                          const count = groupCounts.get(group.id) ?? 0
                          if (count > 0 && !confirm(`Nhóm "${group.name}" đang có ${count} thành viên. Vẫn xóa nhóm?`)) return
                          deleteUserGroup(group.id).catch((err) => toast.error(err instanceof Error ? err.message : 'Không thể xóa nhóm'))
                        }}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-white/5"
                      >
                        Xóa
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
        <div className="drag-region h-12 flex-shrink-0" />
        <div className="no-drag flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[#1F2230] px-6 py-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white">Thành viên</h1>
                <p className="mt-1 text-sm text-slate-500">{currentWorkspace?.name ?? 'Workspace'} · quản lý team và phân quyền truy cập</p>
              </div>
              <div className="flex-1" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm email hoặc tên..."
                className="h-10 w-72 rounded-lg border border-[#1F2230] bg-[#111218] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#7C3AED]"
              />
              <button onClick={() => refreshWorkspaceData()} className="h-10 rounded-lg border border-[#1F2230] px-4 text-sm text-slate-300 hover:bg-white/5">
                Làm mới
              </button>
              {canInvite ? (
                <button onClick={() => setShowInviteModal(true)} className="h-10 rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white hover:bg-[#8B5CF6]">
                  + Mời thành viên
                </button>
              ) : (
                <button disabled title="Bạn không có quyền mời thành viên" className="h-10 rounded-lg bg-[#1F2230] px-4 text-sm text-slate-500">
                  + Mời thành viên
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-[#1F2230] px-6">
            <div className="flex gap-6">
              <TabButton tab="members" active={activeTab === 'members'} onClick={setActiveTab}>Thành viên</TabButton>
              <TabButton tab="invited" active={activeTab === 'invited'} onClick={setActiveTab}>Đã mời</TabButton>
              <TabButton tab="permissions" active={activeTab === 'permissions'} onClick={setActiveTab}>Quyền truy cập</TabButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
            {error && <ErrorState message={error} onRetry={() => refreshWorkspaceData()} />}
            {!error && activeTab === 'members' && (
              <MembersTab
                members={filteredMembers}
                allMembers={members}
                userGroups={userGroups}
                currentUserId={user?.id ?? ''}
                loading={membersLoading || loading}
                canInvite={canInvite}
                canEditRole={canEditRole}
                canRemove={canRemove}
                onInvite={() => setShowInviteModal(true)}
                onEdit={setEditingMember}
                onRemove={removeMember}
              />
            )}
            {!error && activeTab === 'invited' && (
              <InvitationsTab
                invitations={invitations}
                userGroups={userGroups}
                loading={invitationsLoading || loading}
                canInvite={canInvite}
                canRevoke={canInvite || canRemove}
                onResend={resendInvitation}
                onRevoke={revokeInvitation}
              />
            )}
            {!error && activeTab === 'permissions' && (
              <PermissionsTab rolePermissions={rolePermissions} currentPermissions={permissions} canEdit={canEditPermissions} onSave={updateRolePermissions} />
            )}
          </div>
        </div>
      </section>

      {showInviteModal && (
        <InviteMemberModal
          userGroups={userGroups}
          onClose={() => setShowInviteModal(false)}
          onInvite={async (input) => {
            console.log('[MembersPage] onInvite called with input:', input)
            console.log('[MembersPage] currentWorkspaceId:', currentWorkspace?.id)
            console.log('[MembersPage] canInvite permission:', canInvite)
            try {
              await inviteMember(input)
              console.log('[MembersPage] inviteMember succeeded')
              setShowInviteModal(false)
              setActiveTab('invited')
              toast.success('Đã gửi lời mời')
            } catch (error) {
              console.error('[MembersPage] inviteMember failed:', error)
              toast.error(error instanceof Error ? error.message : 'Failed to invite member')
            }
          }}
        />
      )}
      {showGroupModal && (
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
      {editingGroup && (
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
          onClose={() => setEditingMember(null)}
          onSave={async (input) => {
            await updateMember(editingMember.id, input)
            setEditingMember(null)
            toast.success('Đã cập nhật thành viên')
          }}
        />
      )}
    </div>
  )
}

function TabButton({ tab, active, onClick, children }: { tab: Tab; active: boolean; onClick: (tab: Tab) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => onClick(tab)} className={`border-b-2 px-1 py-3 text-sm font-medium ${active ? 'border-[#7C3AED] text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
      {children}
    </button>
  )
}

function GroupFilter({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${active ? 'bg-[#7C3AED]/10 text-[#C4B5FD]' : 'text-slate-300 hover:bg-white/5'}`}>
      <span className="truncate">{label}</span>
      <span className="ml-2 rounded bg-white/5 px-2 py-0.5 text-[11px] text-slate-500">{count}</span>
    </button>
  )
}

function MembersTab({
  members,
  allMembers,
  userGroups,
  currentUserId,
  loading,
  canInvite,
  canEditRole,
  canRemove,
  onInvite,
  onEdit,
  onRemove,
}: {
  members: WorkspaceMember[]
  allMembers: WorkspaceMember[]
  userGroups: WorkspaceUserGroup[]
  currentUserId: string
  loading: boolean
  canInvite: boolean
  canEditRole: boolean
  canRemove: boolean
  onInvite: () => void
  onEdit: (member: WorkspaceMember) => void
  onRemove: (memberId: string) => Promise<void>
}) {
  if (loading) return <TableSkeleton columns={8} rows={6} />

  const onlyOwner = allMembers.length <= 1 && allMembers[0]?.role === 'owner'

  return (
    <div className="space-y-4">
      {onlyOwner && (
        <div className="rounded-xl border border-[#1F2230] bg-[#111218] p-6">
          <h3 className="text-lg font-semibold text-white">Mời thành viên đầu tiên vào workspace</h3>
          <p className="mt-2 max-w-xl text-sm text-slate-400">Cộng tác cùng team, phân quyền và quản lý hồ sơ an toàn.</p>
          {canInvite && <button onClick={onInvite} className="mt-4 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B5CF6]">+ Mời thành viên</button>}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-[#1F2230]">
        <table className="w-full min-w-[980px]">
          <thead className="bg-[#0B0B0F]">
            <tr>
              {['Avatar', 'Tên', 'Email', 'Quyền hạn', 'Nhóm người dùng', 'Trạng thái', 'Ghi chú', 'Hành động'].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isOwner = member.role === 'owner'
              const isSelf = member.userId === currentUserId
              const groupName = userGroups.find((group) => group.id === member.userGroupId)?.name ?? '-'
              return (
                <tr key={member.id} className="border-t border-[#1F2230] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED]/20 text-xs font-bold text-purple-200">{getInitials(member.email, member.displayName)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{member.displayName || member.email.split('@')[0]}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{member.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className="px-4 py-3 text-sm text-slate-400">{groupName}</td>
                  <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-sm text-slate-400" title={member.note}>{member.note || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      {canEditRole && !isOwner && <button onClick={() => onEdit(member)} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>}
                      {canRemove && !isOwner && !isSelf && (
                        <button
                          onClick={() => confirm(`Xóa ${member.email} khỏi workspace?`) && onRemove(member.id)}
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
    <div className="overflow-hidden rounded-xl border border-[#1F2230]">
      <table className="w-full min-w-[900px]">
        <thead className="bg-[#0B0B0F]">
          <tr>
            {['Email', 'Role', 'Nhóm người dùng', 'Status', 'Invited by', 'Expires at', 'Actions'].map((label) => (
              <th key={label} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => {
            const groupName = userGroups.find((group) => group.id === invitation.userGroupId)?.name ?? '-'
            return (
              <tr key={invitation.id} className="border-t border-[#1F2230] hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-sm text-white">{invitation.email}</td>
                <td className="px-4 py-3"><RoleBadge role={invitation.role} /></td>
                <td className="px-4 py-3 text-sm text-slate-400">{groupName}</td>
                <td className="px-4 py-3"><StatusBadge status={invitation.status} /></td>
                <td className="px-4 py-3 text-sm text-slate-400">{invitation.invitedByEmail ?? invitation.invitedBy.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{new Date(invitation.expiresAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    {canInvite && (invitation.status === 'pending' || invitation.status === 'expired') && <button onClick={() => onResend(invitation.id)} className="text-sm text-blue-400 hover:text-blue-300">Resend</button>}
                    {canRevoke && invitation.status === 'pending' && <button onClick={() => onRevoke(invitation.id)} className="text-sm text-red-400 hover:text-red-300">Revoke</button>}
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
      <div className="rounded-xl border border-[#1F2230] bg-[#111218] p-4">
        <div className="flex flex-wrap gap-2">
          {(['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[]).map((role) => (
            <button key={role} onClick={() => setSelectedRole(role)} className={`rounded-lg border px-4 py-2 text-sm ${selectedRole === role ? 'border-[#7C3AED] bg-[#7C3AED]/15 text-white' : 'border-[#1F2230] text-slate-400 hover:bg-white/5'}`}>
              {RoleLabels[role]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">{RoleDescriptions[selectedRole]}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {permissionGroups.map((group) => (
          <div key={group.title} className="rounded-xl border border-[#1F2230] bg-[#111218] p-5">
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

      <div className="flex items-center justify-between rounded-xl border border-[#1F2230] bg-[#0B0B0F] p-4">
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

function InviteMemberModal({ userGroups, onClose, onInvite }: {
  userGroups: WorkspaceUserGroup[]
  onClose: () => void
  onInvite: (input: { email: string; role: Exclude<WorkspaceRole, 'owner'>; userGroupId: string | null; profileLimit: number | null; note: string }) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>('member')
  const [userGroupId, setUserGroupId] = useState('')
  const [profileLimit, setProfileLimit] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <Modal title="Mời thành viên" onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!validEmail) return
          setLoading(true)
          try {
            await onInvite({ email: email.trim().toLowerCase(), role, userGroupId: userGroupId || null, profileLimit: profileLimit ? Number(profileLimit) : null, note })
          } finally {
            setLoading(false)
          }
        }}
        className="space-y-4"
      >
        <Field label="Email *"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="field" /></Field>
        <Field label="Vai trò *">
          <select value={role} onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, 'owner'>)} className="field">
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <Field label="Nhóm người dùng"><select value={userGroupId} onChange={(event) => setUserGroupId(event.target.value)} className="field"><option value="">Không chọn</option>{userGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field>
        <Field label="Giới hạn số profile"><input type="number" min="0" value={profileLimit} onChange={(event) => setProfileLimit(event.target.value)} className="field" /></Field>
        <Field label="Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="field resize-none" /></Field>
        <ModalActions onClose={onClose} submitLabel="Gửi lời mời" loading={loading} disabled={!validEmail} />
      </form>
    </Modal>
  )
}

function EditMemberModal({ member, userGroups, onClose, onSave }: {
  member: WorkspaceMember
  userGroups: WorkspaceUserGroup[]
  onClose: () => void
  onSave: (input: { role: Exclude<WorkspaceRole, 'owner'>; userGroupId: string | null; note: string }) => Promise<void>
}) {
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'owner'>>(member.role === 'owner' ? 'member' : member.role)
  const [userGroupId, setUserGroupId] = useState(member.userGroupId ?? '')
  const [note, setNote] = useState(member.note)
  const [loading, setLoading] = useState(false)

  return (
    <Modal title={`Chỉnh sửa ${member.email}`} onClose={onClose}>
      <form onSubmit={async (event) => { event.preventDefault(); setLoading(true); try { await onSave({ role, userGroupId: userGroupId || null, note }) } finally { setLoading(false) } }} className="space-y-4">
        <Field label="Vai trò"><select value={role} onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, 'owner'>)} className="field"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select></Field>
        <Field label="Nhóm người dùng"><select value={userGroupId} onChange={(event) => setUserGroupId(event.target.value)} className="field"><option value="">Không chọn</option>{userGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field>
        <Field label="Ghi chú"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="field resize-none" /></Field>
        <ModalActions onClose={onClose} submitLabel="Lưu" loading={loading} />
      </form>
    </Modal>
  )
}

function GroupModal({ group, onClose, onSave }: { group?: WorkspaceUserGroup; onClose: () => void; onSave: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [loading, setLoading] = useState(false)
  return (
    <Modal title={group ? 'Sửa nhóm người dùng' : 'Tạo nhóm người dùng'} onClose={onClose}>
      <form onSubmit={async (event) => { event.preventDefault(); if (!name.trim()) return; setLoading(true); try { await onSave(name.trim(), description.trim()) } finally { setLoading(false) } }} className="space-y-4">
        <Field label="Group name *"><input value={name} onChange={(event) => setName(event.target.value)} required className="field" /></Field>
        <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="field resize-none" /></Field>
        <Field label="Permission template"><select disabled className="field opacity-60"><option>Use member role permissions</option></select></Field>
        <ModalActions onClose={onClose} submitLabel={group ? 'Lưu' : 'Tạo nhóm'} loading={loading} disabled={!name.trim()} />
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] rounded-xl border border-white/10 bg-[#111218] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">X</button>
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
  return <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-[#1F2230] bg-[#111218] text-center"><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-2 max-w-md text-sm text-slate-500">{description}</p></div>
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
