import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  onQuickEdit?: (profile: Profile, field: 'name' | 'notes') => void
}

export default function ProfileRow({
  profile,
  groups,
  isRunning,
  isSelected,
  onEdit,
  onQuickEdit,
}: Props) {
  const { toggleSelect, loadAll } = useStore()
  const [showCookies, setShowCookies] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const moreRef = useRef<HTMLButtonElement>(null)

  const group = groups.find((item) => item.id === profile.groupId)

  const handleLaunch = async () => {
    setIsLaunching(true)
    try {
      if (isRunning) {
        await window.api.browser.close(profile.id)
      } else {
        await window.api.browser.launch(profile)
      }
      useStore.getState().setRunningIds(await window.api.browser.running())
    } finally {
      setIsLaunching(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Xóa profile "${profile.name}"?`)) return
    await window.api.profiles.delete(profile.id)
    await loadAll()
  }

  const handleDuplicate = async () => {
    await window.api.profiles.duplicate(profile.id)
    await loadAll()
  }

  const openMoreMenu = () => {
    if (moreRef.current) {
      const rect = moreRef.current.getBoundingClientRect()
      setContextMenu({ x: rect.left - 160, y: rect.bottom + 4 })
    }
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

  // Format proxy for display
  const proxyDisplay = profile.proxy.type !== 'none' && profile.proxy.host
    ? `${profile.proxy.host}:${profile.proxy.port}`
    : null

  return (
    <>
      <tr
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
        className={`group/row border-b border-[#1F2230] transition-colors hover:bg-[#171923] ${
          isSelected ? 'bg-purple-500/5' : ''
        }`}
      >
        {/* Checkbox */}
        <td className="w-10 px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(profile.id)}
            className="h-4 w-4 rounded border-[#1F2230] bg-[#111218] text-purple-500 focus:ring-purple-500/20"
          />
        </td>

        {/* ID */}
        <td className="px-4 py-3">
          <span 
            className="font-mono text-xs text-[#9CA3AF] select-text cursor-text"
            title={profile.id}
          >
            {profile.id}
          </span>
        </td>

        {/* Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#E5E7EB] select-text cursor-text">
              {profile.name}
            </span>
            {onQuickEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickEdit(profile, 'name')
                }}
                className="opacity-0 group-hover/row:opacity-100 flex h-5 w-5 items-center justify-center rounded text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#1F2230] transition-all"
                title="Quick edit name"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </td>

        {/* Group */}
        <td className="px-4 py-3">
          {group ? (
            <span className="inline-flex items-center rounded-full bg-[#1F2230] px-2 py-0.5 text-xs text-[#9CA3AF]">
              {group.name}
            </span>
          ) : (
            <span className="text-xs text-[#6B7280]">—</span>
          )}
        </td>

        {/* Notes */}
        <td className="max-w-[200px] px-4 py-3">
          <div className="flex items-center gap-2">
            {profile.notes ? (
              <span 
                className="block truncate text-xs text-[#9CA3AF] select-text cursor-text flex-1 min-w-0"
                title={profile.notes}
              >
                {profile.notes}
              </span>
            ) : (
              <span className="text-xs text-[#6B7280] flex-1">—</span>
            )}
            {onQuickEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickEdit(profile, 'notes')
                }}
                className="opacity-0 group-hover/row:opacity-100 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#1F2230] transition-all"
                title="Quick edit notes"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              Mở
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6B7280]/10 px-2 py-0.5 text-xs font-medium text-[#6B7280]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6B7280]" />
              Đóng
            </span>
          )}
        </td>

        {/* Proxy */}
        <td className="px-4 py-3">
          {proxyDisplay ? (
            <span 
              className="font-mono text-xs text-[#9CA3AF] select-text cursor-text"
              title={`${profile.proxy.type.toUpperCase()} - ${proxyDisplay}`}
            >
              {proxyDisplay}
            </span>
          ) : (
            <span className="text-xs text-[#6B7280]">None</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {isRunning ? (
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLaunching ? 'Closing...' : 'Close'}
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={isLaunching}
                className="rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#8B5CF6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLaunching ? 'Opening...' : 'Open'}
              </button>
            )}
            <button
              ref={moreRef}
              onClick={openMoreMenu}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#1F2230] hover:text-[#E5E7EB] transition-colors"
              title="More actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {showCookies && <CookieManager profileId={profile.id} onClose={() => setShowCookies(false)} />}
      {contextMenu && createPortal(
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />,
        document.body
      )}
    </>
  )
}
