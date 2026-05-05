import { useRef, useState } from 'react'
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
}

export default function ProfileRow({
  profile,
  groups,
  isRunning,
  isSelected,
  onEdit,
}: Props) {
  const { toggleSelect, loadAll } = useStore()
  const [showCookies, setShowCookies] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const moreRef = useRef<HTMLButtonElement>(null)

  const group = groups.find((item) => item.id === profile.groupId)

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

  return (
    <>
      <tr
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
        className={`group/row border-b border-purple-500/10 transition-colors hover:bg-white/5 ${
          isSelected ? 'bg-purple-500/10' : ''
        }`}
      >
        {/* Checkbox */}
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(profile.id)}
            className="h-4 w-4 rounded border-purple-500/30 bg-white/5 text-purple-500"
          />
        </td>

        {/* Profile ID */}
        <td className="px-3 py-2">
          <span className="select-text font-mono text-sm font-medium text-slate-300 cursor-text">
            {profile.id.slice(0, 6).toUpperCase()}
          </span>
        </td>

        {/* Group */}
        <td className="px-3 py-2">
          {group ? (
            <span className="select-text rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
              {group.name}
            </span>
          ) : (
            <span className="text-xs text-slate-500">—</span>
          )}
        </td>

        {/* Name */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5 group/name">
            <div className="flex flex-col select-text cursor-text">
              <span className="text-sm font-medium text-white">{profile.name}</span>
              <span className="text-xs text-slate-500">{profile.fingerprint.os}</span>
            </div>
            <button
              onClick={() => onEdit(profile)}
              className="shrink-0 opacity-0 group-hover/name:opacity-100 flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 text-slate-500 hover:text-purple-400 transition-all"
              title="Edit"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </td>

        {/* Notes */}
        <td className="max-w-[300px] px-3 py-2">
          <div className="flex items-start gap-1.5 group/notes">
            <span className="select-text cursor-text line-clamp-2 text-sm text-slate-400 flex-1">
              {profile.notes || <span className="text-slate-600">—</span>}
            </span>
            {profile.notes && (
              <button
                onClick={() => onEdit(profile)}
                className="shrink-0 mt-0.5 opacity-0 group-hover/notes:opacity-100 flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 text-slate-500 hover:text-purple-400 transition-all"
                title="Edit notes"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        </td>

        {/* Proxy */}
        <td className="px-3 py-2">
          {profile.proxy.type !== 'none' && profile.proxy.host ? (
            <div className="flex items-start gap-1.5 group/proxy">
              <div className="flex flex-col select-text cursor-text">
                <span className="font-mono text-xs text-slate-300">{profile.proxy.host}:{profile.proxy.port}</span>
                <span className="text-xs uppercase text-slate-500">{profile.proxy.type}</span>
              </div>
              <button
                onClick={() => onEdit(profile)}
                className="shrink-0 mt-0.5 opacity-0 group-hover/proxy:opacity-100 flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 text-slate-500 hover:text-purple-400 transition-all"
                title="Edit proxy"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500">None</span>
          )}
        </td>

        {/* Actions */}
        <td className="sticky right-0 z-10 bg-[#13111F] px-3 py-2 group-hover/row:bg-[#1a1825]">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Open
              </span>
            ) : (
              <button
                onClick={handleLaunch}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-1 text-xs font-medium text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all"
              >
                Open
              </button>
            )}
            {isRunning && (
              <button
                onClick={handleLaunch}
                className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Close
              </button>
            )}
            <button
              ref={moreRef}
              onClick={openMoreMenu}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
              title="More"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
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
