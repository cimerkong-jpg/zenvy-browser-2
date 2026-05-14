import { createPortal } from 'react-dom'
import { useToast } from '../store/useToast'

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠'
}

const colors: Record<string, string> = {
  success: 'border-emerald-500/40 bg-emerald-900/80 text-emerald-300',
  error: 'border-red-500/40 bg-red-900/80 text-red-300',
  info: 'border-purple-500/40 bg-purple-900/80 text-purple-300',
  warning: 'border-yellow-500/40 bg-yellow-900/80 text-yellow-300'
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return createPortal(
    <div
      style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 99999 }}
      className="flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${colors[t.type]}`}
        >
          <span className="text-base">{icons[t.type]}</span>
          <span className="max-w-xs">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-2 opacity-50 hover:opacity-100 transition-opacity text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
