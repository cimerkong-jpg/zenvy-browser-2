import { useState, ReactNode } from 'react'

interface CollapsibleProps {
  title: string
  badge?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function Collapsible({
  title,
  badge,
  defaultOpen = false,
  children
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{title}</span>
          {badge && (
            <span className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 border-t border-white/10 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
