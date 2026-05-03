import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: string
  onClick: () => void
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Add listeners after a small delay to prevent immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10
      }

      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10
      }

      menuRef.current.style.left = `${adjustedX}px`
      menuRef.current.style.top = `${adjustedY}px`
    }
  }, [x, y])

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return
    item.onClick()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] rounded-xl glass border border-purple-500/20 shadow-2xl py-1 animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              className="h-px bg-purple-500/10 my-1"
            />
          )
        }

        return (
          <button
            key={index}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
              item.disabled
                ? 'text-slate-600 cursor-not-allowed'
                : item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-purple-500/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon && <span className="text-base">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-slate-500">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
