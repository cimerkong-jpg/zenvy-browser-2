import { useEffect } from 'react'

interface ShortcutHandlers {
  onNew?: () => void
  onOpen?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onSearch?: () => void
  onSelectAll?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + N - New profile
      if (modifier && e.key === 'n' && handlers.onNew) {
        e.preventDefault()
        handlers.onNew()
      }

      // Cmd/Ctrl + O - Open profile
      if (modifier && e.key === 'o' && handlers.onOpen) {
        e.preventDefault()
        handlers.onOpen()
      }

      // Cmd/Ctrl + E - Edit profile
      if (modifier && e.key === 'e' && handlers.onEdit) {
        e.preventDefault()
        handlers.onEdit()
      }

      // Cmd/Ctrl + D - Duplicate profile
      if (modifier && e.key === 'd' && handlers.onDuplicate) {
        e.preventDefault()
        handlers.onDuplicate()
      }

      // Cmd/Ctrl + Delete - Delete profile
      if (modifier && (e.key === 'Delete' || e.key === 'Backspace') && handlers.onDelete) {
        e.preventDefault()
        handlers.onDelete()
      }

      // Cmd/Ctrl + F - Focus search
      if (modifier && e.key === 'f' && handlers.onSearch) {
        e.preventDefault()
        handlers.onSearch()
      }

      // Cmd/Ctrl + A - Select all
      if (modifier && e.key === 'a' && handlers.onSelectAll) {
        e.preventDefault()
        handlers.onSelectAll()
      }

      // Escape - Close modals
      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

export const SHORTCUTS = {
  NEW: 'Cmd/Ctrl + N',
  OPEN: 'Cmd/Ctrl + O',
  EDIT: 'Cmd/Ctrl + E',
  DUPLICATE: 'Cmd/Ctrl + D',
  DELETE: 'Cmd/Ctrl + Del',
  SEARCH: 'Cmd/Ctrl + F',
  SELECT_ALL: 'Cmd/Ctrl + A',
  ESCAPE: 'Esc'
}
