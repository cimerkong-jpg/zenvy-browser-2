import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'

interface Group {
  id: string
  name: string
}

interface GroupPanelProps {
  groups: Group[]
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  width: number
  onWidthChange: (width: number) => void
  onCreateGroup: () => void
  onEditGroup: (group: { id: string; name: string }) => void
  onDeleteGroup: (group: { id: string; name: string }) => void
}

export function GroupPanel({
  groups,
  selectedGroupId,
  setSelectedGroupId,
  collapsed,
  setCollapsed,
  width,
  onWidthChange,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}: GroupPanelProps) {
  const { profiles } = useStore()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(200, Math.min(400, startW + ev.clientX - startX))
      onWidthChange(next)
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Count profiles per group
  const allCount = profiles.length
  const noGroupCount = profiles.filter(p => !p.groupId).length
  const groupCounts = groups.reduce((acc, g) => {
    acc[g.id] = profiles.filter(p => p.groupId === g.id).length
    return acc
  }, {} as Record<string, number>)

  if (collapsed) {
    return (
      <aside className="group-panel no-drag flex w-12 flex-shrink-0 flex-col items-center border-r border-[#1F2230] bg-[#0B0B0F] pb-4">
        <div className="drag-region h-8 w-full flex-shrink-0" />
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#111218] border border-[#1F2230] text-[#9CA3AF] hover:bg-[#1A1D24] hover:text-[#E5E7EB] transition-all"
          title="Mở nhóm hồ sơ"
        >
          ›
        </button>
        <div className="mt-4 writing-mode-vertical text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
          Nhóm
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="group-panel no-drag relative flex flex-shrink-0 flex-col border-r border-[#1F2230] bg-[#0B0B0F] px-3 pb-4"
      style={{ width }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#7C3AED]/40 transition-colors z-20"
        title="Kéo để thay đổi chiều rộng"
      />

      <div className="drag-region h-8 flex-shrink-0" />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#E5E7EB]">Nhóm hồ sơ</h2>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">{groups.length + 2} nhóm</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateGroup}
            className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#8B5CF6] transition-all"
          >
            + Mới
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111218] border border-[#1F2230] text-[#6B7280] hover:bg-[#1A1D24] hover:text-[#9CA3AF] transition-all"
            title="Thu gọn"
          >
            ‹
          </button>
        </div>
      </div>

      {/* Default Groups */}
      <div className="mb-3 space-y-1">
        <GroupButton
          label="Tất cả"
          count={allCount}
          isActive={selectedGroupId === null}
          onClick={() => setSelectedGroupId(null)}
        />
        <GroupButton
          label="Không nhóm"
          count={noGroupCount}
          isActive={selectedGroupId === 'no-group'}
          onClick={() => setSelectedGroupId('no-group')}
        />
      </div>

      {/* Custom Groups */}
      <div className="space-y-1 overflow-y-auto">
        {groups.map((group) => {
          const isMenuOpen = openMenuId === group.id
          
          return (
            <GroupItem
              key={group.id}
              group={group}
              count={groupCounts[group.id] || 0}
              isSelected={selectedGroupId === group.id}
              isMenuOpen={isMenuOpen}
              onSelect={() => setSelectedGroupId(group.id)}
              onToggleMenu={(e) => {
                e.stopPropagation()
                setOpenMenuId(isMenuOpen ? null : group.id)
              }}
              onEdit={() => {
                setOpenMenuId(null)
                onEditGroup({ id: group.id, name: group.name })
              }}
              onDelete={() => {
                setOpenMenuId(null)
                onDeleteGroup({ id: group.id, name: group.name })
              }}
              onCloseMenu={() => setOpenMenuId(null)}
            />
          )
        })}
      </div>
    </aside>
  )
}

function GroupButton({
  label,
  count,
  isActive,
  onClick
}: {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
        isActive
          ? 'bg-white/10 text-[#E5E7EB]'
          : 'text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]'
      }`}
    >
      <span>{label}</span>
      <span className={`text-[11px] ${isActive ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}>
        {count}
      </span>
    </button>
  )
}

function GroupItem({
  group,
  count,
  isSelected,
  isMenuOpen,
  onSelect,
  onToggleMenu,
  onEdit,
  onDelete,
  onCloseMenu
}: {
  group: Group
  count: number
  isSelected: boolean
  isMenuOpen: boolean
  onSelect: () => void
  onToggleMenu: (e: React.MouseEvent) => void
  onEdit: () => void
  onDelete: () => void
  onCloseMenu: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onSelect}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
          isSelected
            ? 'bg-white/10 text-[#E5E7EB]'
            : 'text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]'
        }`}
      >
        <span className="truncate">{group.name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] ${isSelected ? 'text-[#7C3AED]' : 'text-[#6B7280]'}`}>
            {count}
          </span>
          {(isHovered || isMenuOpen) && (
            <button
              onClick={onToggleMenu}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 transition-all"
            >
              <span className="text-[#9CA3AF]">⋯</span>
            </button>
          )}
        </div>
      </button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onCloseMenu}
          />
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg bg-[#111218] border border-[#1F2230] shadow-lg overflow-hidden"
          >
            <button
              onClick={onEdit}
              className="w-full px-3 py-2 text-left text-[12px] text-[#E5E7EB] hover:bg-white/5 transition-all"
            >
              Đổi tên
            </button>
            <button
              onClick={onDelete}
              className="w-full px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-all"
            >
              Xóa
            </button>
          </div>
        </>
      )}
    </div>
  )
}
