import { useState } from 'react'
import type { Group, Profile } from '../../../shared/types'
import { useStore } from '../store/useStore'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import CookieManager from './CookieManager'

interface Props {
  profile: Profile
  groups: Group[]
  isRunning: boolean
  isSelected: boolean
  onEdit: (profile: Profile) => void
  onDragStart?: (profileId: string) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export default function ProfileRow({
  profile,
  groups,
  isRunning,
  isSelected,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging = false
}: Props) {
  const { toggleSelect, loadAll } = useStore()
  const [showCookies, setShowCookies] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const group = groups.find((item) => item.id === profile.groupId)
  const daysLeft = Math.max(Math.ceil((profile.updatedAt + 30 * 86400000 - Date.now()) / 86400000), 0)

  const handleLaunch = async () => {
    if (isRunning) await window.api.browser.close(profile.id)
    else await window.api.browser.launch(profile)

    useStore.getState().setRunningIds(await window.api.browser.running())
  }

  const handleDelete = async () => {
    if (!confirm(`Xóa hồ sơ "${profile.name}"?`)) return
    await window.api.profiles.delete(profile.id)
    await loadAll()
  }

  const handleDuplicate = async () => {
    await window.api.profiles.duplicate(profile.id)
    await loadAll()
  }

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: isRunning ? 'Đóng Profile' : 'Mở Profile',
      icon: isRunning ? '⏹' : '▶',
      onClick: handleLaunch,
      shortcut: 'Cmd+O'
    },
    {
      label: 'Sửa Profile',
      icon: '✎',
      onClick: () => onEdit(profile),
      shortcut: 'Cmd+E'
    },
    {
      label: 'Nhân bản',
      icon: '⧉',
      onClick: handleDuplicate,
      shortcut: 'Cmd+D'
    },
    {
      label: 'Quản lý Cookies',
      icon: '◍',
      onClick: () => setShowCookies(true)
    },
    { separator: true, label: '', onClick: () => {} },
    {
      label: 'Xóa Profile',
      icon: '×',
      onClick: handleDelete,
      shortcut: 'Cmd+Del',
      danger: true
    }
  ]

  return (
    <>
      <tr
        draggable
        onDragStart={() => onDragStart?.(profile.id)}
        onDragEnd={onDragEnd}
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
        className={`border-b border-white/[0.06] transition-colors hover:bg-white/[0.035] ${
          isSelected ? 'bg-purple-500/[0.08]' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
      >
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(profile.id)}
            className="h-4 w-4 accent-purple-500"
          />
        </td>

        <td className="px-4 py-4">
          <span className="font-mono text-sm font-semibold text-slate-200">
            {profile.id.slice(0, 6).toUpperCase()}
          </span>
        </td>

        <td className="px-4 py-4">
          {group ? (
            <span className="rounded-md bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-200">
              {group.name}
            </span>
          ) : (
            <span className="text-sm text-slate-600">-</span>
          )}
        </td>

        <td className="px-4 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{profile.name}</span>
            <span className="text-[11px] text-slate-600">{profile.fingerprint.os}</span>
          </div>
        </td>

        <td className="max-w-[320px] px-4 py-4">
          <span className="line-clamp-2 text-sm text-slate-300">
            {profile.notes || '-'}
          </span>
        </td>

        <td className="px-4 py-4">
          {profile.proxy.type !== 'none' && profile.proxy.host ? (
            <div className="flex flex-col">
              <span className="font-mono text-xs text-slate-200">{profile.proxy.host}:{profile.proxy.port}</span>
              <span className="text-[11px] uppercase text-slate-600">{profile.proxy.type}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-600">Không</span>
          )}
        </td>

        <td className="px-4 py-4">
          <span className="text-sm font-semibold text-slate-200">{daysLeft} ngày</span>
        </td>

        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunch}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all ${
                isRunning
                  ? 'bg-orange-500 hover:bg-orange-400'
                  : 'bg-purple-500 hover:bg-purple-400'
              }`}
            >
              {isRunning ? 'Đóng' : 'Mở'}
            </button>
            <button
              onClick={() => onEdit(profile)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              Sửa
            </button>
            <button
              onClick={() => setContextMenu({ x: window.innerWidth - 220, y: 320 })}
              className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 hover:bg-white/5 hover:text-white"
              title="Thêm hành động"
            >
              ⋮
            </button>
          </div>
        </td>
      </tr>

      {showCookies && <CookieManager profileId={profile.id} onClose={() => setShowCookies(false)} />}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
