import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import ProfileModal from '../components/ProfileModal'
import ProfileRow from '../components/ProfileRow'
import type { Profile } from '../../../shared/types'

type StatusFilter = 'all' | 'open' | 'closed'

export default function ProfilesPage() {
  const {
    profiles,
    groups,
    runningIds,
    selectedGroupId,
    selectedIds,
    searchQuery,
    setSelectedGroupId,
    selectAll,
    clearSelection,
    setSearchQuery,
    loadAll
  } = useStore()

  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [moveTargetGroupId, setMoveTargetGroupId] = useState('')
  const [showMoveGroupModal, setShowMoveGroupModal] = useState(false)
  const [groupPanelCollapsed, setGroupPanelCollapsed] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return profiles.filter((profile) => {
      const matchGroup = 
        selectedGroupId === null || 
        (selectedGroupId === 'no-group' && !profile.groupId) ||
        profile.groupId === selectedGroupId
      const matchSearch =
        !q ||
        profile.name.toLowerCase().includes(q) ||
        profile.notes.toLowerCase().includes(q) ||
        profile.proxy.host.toLowerCase().includes(q)
      const isRunning = runningIds.includes(profile.id)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && isRunning) ||
        (statusFilter === 'closed' && !isRunning)

      return matchGroup && matchSearch && matchStatus
    })
  }, [profiles, runningIds, searchQuery, selectedGroupId, statusFilter])

  const selectedGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) : null
  const allSelected = filtered.length > 0 && filtered.every((profile) => selectedIds.includes(profile.id))
  const openCount = runningIds.length
  const closedCount = Math.max(profiles.length - openCount, 0)

  const createGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    await window.api.groups.create(name)
    setNewGroupName('')
    setShowGroupInput(false)
    await loadAll()
  }

  const deleteSelected = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Xóa ${selectedIds.length} hồ sơ đã chọn?`)) return
    await window.api.profiles.deleteMany(selectedIds)
    clearSelection()
    await loadAll()
  }

  const exportSelected = async () => {
    if (!selectedIds.length) return
    const json = await window.api.profiles.export(selectedIds)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profiles-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const moveSelectedToGroup = async () => {
    if (!selectedIds.length || !moveTargetGroupId) return

    const groupId = moveTargetGroupId === 'none' ? null : moveTargetGroupId
    await Promise.all(
      selectedIds.map((id) => window.api.profiles.update(id, { groupId }))
    )
    setMoveTargetGroupId('')
    setShowMoveGroupModal(false)
    clearSelection()
    await loadAll()
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Xóa nhóm này? Các hồ sơ trong nhóm sẽ chuyển về "Không có nhóm".')) return
    await window.api.groups.delete(groupId)
    if (selectedGroupId === groupId) setSelectedGroupId(null)
    await loadAll()
  }

  const updateGroup = async (groupId: string, newName: string) => {
    if (!newName.trim()) return
    await window.api.groups.update(groupId, { name: newName.trim() })
    setEditingGroupId(null)
    setEditingGroupName('')
    await loadAll()
  }

  const importProfiles = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const imported = await window.api.profiles.import(await file.text())
        await loadAll()
        alert(`Đã import ${imported.length} hồ sơ`)
      } catch (error) {
        alert('Lỗi import: ' + (error as Error).message)
      }
    }
    input.click()
  }

  return (
    <div className="flex h-full min-w-0">
      <GroupPanel
        groups={groups}
        profiles={profiles}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        showGroupInput={showGroupInput}
        setShowGroupInput={setShowGroupInput}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        createGroup={createGroup}
        collapsed={groupPanelCollapsed}
        setCollapsed={setGroupPanelCollapsed}
        deleteGroup={deleteGroup}
        updateGroup={updateGroup}
        editingGroupId={editingGroupId}
        setEditingGroupId={setEditingGroupId}
        editingGroupName={editingGroupName}
        setEditingGroupName={setEditingGroupName}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="drag-region h-8 flex-shrink-0" />

        <div className="no-drag flex items-center justify-between px-6 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Hồ sơ</h1>
            <p className="mt-1 text-xs text-slate-500">
              {selectedGroup?.name ?? 'Tất cả nhóm'} · {filtered.length} hồ sơ đang hiển thị
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
            >
              Làm mới
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.22)] hover:bg-emerald-400"
            >
              + Tạo hồ sơ
            </button>
          </div>
        </div>

        <div className="no-drag grid grid-cols-4 gap-3 px-6 pb-4">
          <CompactStat label="Tổng hồ sơ" value={profiles.length} />
          <CompactStat label="Đang mở" value={openCount} tone="green" />
          <CompactStat label="Đã đóng" value={closedCount} tone="orange" />
          <CompactStat label="Đã chọn" value={selectedIds.length} tone="purple" />
        </div>

        <div className="no-drag px-6 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <FieldShell label="Tìm kiếm" className="min-w-[320px] flex-1">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tên, ghi chú, proxy..."
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#111827]/70 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-purple-400/60"
                />
              </div>
            </FieldShell>

            <FieldShell label="Trạng thái hồ sơ" className="w-56">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#111827]/70 px-3 text-sm text-white outline-none focus:border-purple-400/60"
              >
                <option value="all">Tất cả</option>
                <option value="open">Đang mở</option>
                <option value="closed">Đã đóng</option>
              </select>
            </FieldShell>

            <FieldShell label="Chế độ hiển thị" className="w-52">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#111827]/70 px-3 text-sm text-slate-300">
                <span className="text-emerald-400">◉</span>
                Hồ sơ
              </div>
            </FieldShell>
          </div>
        </div>

        <div className="no-drag flex flex-wrap items-center justify-between gap-3 px-6 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <BulkButton disabled={!selectedIds.length}>Automation</BulkButton>
            <BulkButton disabled={!selectedIds.length}>Mở</BulkButton>
            <BulkButton disabled={!selectedIds.length}>Đóng</BulkButton>
            <BulkButton
              onClick={() => {
                setMoveTargetGroupId('')
                setShowMoveGroupModal(true)
              }}
              disabled={!selectedIds.length}
            >
              Chuyển nhóm
            </BulkButton>
            <BulkButton onClick={exportSelected} disabled={!selectedIds.length}>Xuất</BulkButton>
            <BulkButton onClick={deleteSelected} disabled={!selectedIds.length} danger>Xóa</BulkButton>
            {selectedIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-white/5 hover:text-white"
              >
                Bỏ chọn
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={importProfiles}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Nhập tài nguyên
            </button>
            <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]">
              Sắp xếp
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-6 pb-5">
          <div className="h-full overflow-hidden rounded-xl border border-purple-500/15 bg-[#111827]/70 shadow-[0_0_40px_rgba(0,0,0,0.18)]">
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="sticky top-0 z-10 bg-[#111827]">
                  <tr className="border-b border-white/6">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => (allSelected ? clearSelection() : selectAll(filtered.map((profile) => profile.id)))}
                        className="h-4 w-4 accent-emerald-500"
                      />
                    </th>
                    <HeaderCell>Profile ID</HeaderCell>
                    <HeaderCell>Nhóm</HeaderCell>
                    <HeaderCell>Tên</HeaderCell>
                    <HeaderCell>Ghi chú</HeaderCell>
                    <HeaderCell>Proxy</HeaderCell>
                    <HeaderCell>Thời hạn</HeaderCell>
                    <HeaderCell>Hành động</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-24 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-2xl text-purple-200">
                            ▣
                          </div>
                          <p className="text-sm font-medium text-white">Chưa có hồ sơ nào</p>
                          <p className="text-xs text-slate-500">Tạo hồ sơ đầu tiên để bắt đầu quản lý tài khoản.</p>
                          <button
                            onClick={() => setShowCreate(true)}
                            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
                          >
                            Tạo hồ sơ đầu tiên
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((profile) => (
                      <ProfileRow
                        key={profile.id}
                        profile={profile}
                        groups={groups}
                        isRunning={runningIds.includes(profile.id)}
                        isSelected={selectedIds.includes(profile.id)}
                        onEdit={setEditProfile}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 text-xs text-slate-500">
            1-{filtered.length} trên {filtered.length}
          </div>
        </div>

        {showCreate && <ProfileModal profile={null} onClose={() => setShowCreate(false)} />}
        {editProfile && <ProfileModal profile={editProfile} onClose={() => setEditProfile(null)} />}
        {showMoveGroupModal && (
          <MoveGroupModal
            selectedIds={selectedIds}
            groups={groups}
            moveTargetGroupId={moveTargetGroupId}
            setMoveTargetGroupId={setMoveTargetGroupId}
            onConfirm={moveSelectedToGroup}
            onClose={() => {
              setShowMoveGroupModal(false)
              setMoveTargetGroupId('')
            }}
          />
        )}
      </section>
    </div>
  )
}

function GroupPanel({
  groups,
  profiles,
  selectedGroupId,
  setSelectedGroupId,
  showGroupInput,
  setShowGroupInput,
  newGroupName,
  setNewGroupName,
  createGroup,
  collapsed,
  setCollapsed,
  deleteGroup,
  updateGroup,
  editingGroupId,
  setEditingGroupId,
  editingGroupName,
  setEditingGroupName
}: {
  groups: Array<{ id: string; name: string }>
  profiles: Profile[]
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  showGroupInput: boolean
  setShowGroupInput: (value: boolean) => void
  newGroupName: string
  setNewGroupName: (value: string) => void
  createGroup: () => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  deleteGroup: (groupId: string) => void
  updateGroup: (groupId: string, newName: string) => void
  editingGroupId: string | null
  setEditingGroupId: (id: string | null) => void
  editingGroupName: string
  setEditingGroupName: (name: string) => void
}) {
  const noGroupCount = profiles.filter((profile) => !profile.groupId).length

  if (collapsed) {
    return (
      <aside className="group-panel no-drag flex w-12 flex-shrink-0 flex-col items-center border-r border-purple-500/10 bg-[#0F1020]/70 pb-4">
        <div className="drag-region h-8 w-full flex-shrink-0" />
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          title="Mở nhóm hồ sơ"
        >
          ›
        </button>
        <div className="mt-4 writing-mode-vertical text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Nhóm
        </div>
      </aside>
    )
  }

  return (
    <aside className="group-panel no-drag flex w-64 flex-shrink-0 flex-col border-r border-purple-500/10 bg-[#0F1020]/70 px-4 pb-4">
      <div className="drag-region h-8 flex-shrink-0" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Nhóm hồ sơ</h2>
          <p className="mt-1 text-xs text-slate-500">{groups.length + 2} nhóm</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
            title="Thu gọn nhóm hồ sơ"
          >
            ‹
          </button>
          <button
            onClick={() => setShowGroupInput(true)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
          >
            + Mới
          </button>
        </div>
      </div>

      {showGroupInput && (
        <input
          autoFocus
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && createGroup()}
          onBlur={() => {
            setShowGroupInput(false)
            setNewGroupName('')
          }}
          placeholder="Tên nhóm..."
          className="mb-3 h-10 rounded-lg border border-purple-500/20 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400/60"
        />
      )}

      <div className="mb-3">
        <button
          onClick={() => setSelectedGroupId(null)}
          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all ${
            selectedGroupId === null ? 'bg-emerald-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button 
          onClick={() => setSelectedGroupId('no-group')}
          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all ${
            selectedGroupId === 'no-group' ? 'bg-purple-500/15 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Không có nhóm <span className="float-right text-xs text-slate-500">{noGroupCount}</span>
        </button>
      </div>

      <div className="space-y-1 overflow-y-auto">
        {groups.map((group) => {
          const count = profiles.filter((profile) => profile.groupId === group.id).length
          const isEditing = editingGroupId === group.id
          
          return (
            <div key={group.id} className="relative group/item">
              {isEditing ? (
                <input
                  autoFocus
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateGroup(group.id, editingGroupName)
                    if (e.key === 'Escape') {
                      setEditingGroupId(null)
                      setEditingGroupName('')
                    }
                  }}
                  onBlur={() => {
                    if (editingGroupName.trim()) {
                      updateGroup(group.id, editingGroupName)
                    } else {
                      setEditingGroupId(null)
                      setEditingGroupName('')
                    }
                  }}
                  className="w-full rounded-lg border border-purple-500/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/60"
                />
              ) : (
                <button
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-all ${
                    selectedGroupId === group.id ? 'bg-purple-500/15 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="float-right text-xs text-slate-500">{count}</span>
                </button>
              )}
              
              {!isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingGroupId(group.id)
                      setEditingGroupName(group.name)
                    }}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Chỉnh sửa tên nhóm"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteGroup(group.id)
                    }}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                    title="Xóa nhóm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function MoveGroupModal({
  selectedIds,
  groups,
  moveTargetGroupId,
  setMoveTargetGroupId,
  onConfirm,
  onClose
}: {
  selectedIds: string[]
  groups: Array<{ id: string; name: string }>
  moveTargetGroupId: string
  setMoveTargetGroupId: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A12]/78 backdrop-blur-[2px]">
      <div className="w-[600px] max-w-[calc(100vw-48px)] rounded-2xl border border-white/10 bg-[#1B2431] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <h3 className="text-lg font-bold text-white">Chuyển nhóm hồ sơ</h3>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-200">Các hồ sơ có ID sẽ bị chuyển đi:</p>
          <div className="mt-3 flex max-h-28 flex-wrap gap-3 overflow-auto pr-1">
            {selectedIds.map((id) => (
              <span
                key={id}
                className="rounded-md bg-emerald-500/16 px-4 py-2 font-mono text-sm font-bold text-emerald-300"
              >
                {id.slice(0, 6).toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <select
          value={moveTargetGroupId}
          onChange={(event) => setMoveTargetGroupId(event.target.value)}
          className="mt-6 h-14 w-full rounded-lg border border-slate-600/70 bg-[#202B38] px-4 text-sm text-white outline-none transition-colors focus:border-emerald-400"
        >
          <option value="">Chọn nhóm hồ sơ</option>
          <option value="none">Không có nhóm</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={!moveTargetGroupId}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Chuyển
          </button>
        </div>
      </div>
    </div>
  )
}

function CompactStat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'green' | 'orange' | 'purple' }) {
  const toneClass = {
    slate: 'text-slate-200',
    green: 'text-emerald-300',
    orange: 'text-orange-300',
    purple: 'text-purple-300'
  }[tone]

  return (
    <div className="rounded-xl border border-purple-500/15 bg-purple-500/[0.08] px-4 py-3">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function FieldShell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function BulkButton({
  children,
  disabled,
  danger = false,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20'
          : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
      }`}
    >
      {children}
    </button>
  )
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  )
}
