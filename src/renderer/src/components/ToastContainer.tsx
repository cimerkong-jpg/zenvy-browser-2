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
  const { toasts, removeToast, dialog, closeDialog } = useToast()

  return createPortal(
    <>
      {/* Toasts — bottom-right, ngoài mọi parent container */}
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
      </div>

      {/* Confirm Dialog — trung tâm màn hình, nổi trên tất cả */}
      {dialog && dialog.open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { dialog.onCancel(); closeDialog() } }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-purple-500/20 bg-[#13111F] p-6 shadow-2xl mx-4">
            <h3 className="mb-2 text-base font-semibold text-white">{dialog.title}</h3>
            <p className="mb-6 text-sm text-slate-400">{dialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { dialog.onCancel(); closeDialog() }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
              >
                {dialog.cancelLabel}
              </button>
              <button
                onClick={() => { dialog.onConfirm(); closeDialog() }}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all"
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
