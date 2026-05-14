import { createPortal } from 'react-dom'
import { useDialog } from '../store/useDialog'

export default function DialogContainer() {
  const { dialog, closeDialog } = useDialog()

  if (!dialog || !dialog.isOpen) return null

  const handleCancel = () => {
    dialog.onCancel()
    closeDialog()
  }

  const handleConfirm = () => {
    dialog.onConfirm()
    closeDialog()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-purple-500/20 bg-[#13111F] p-6 shadow-2xl mx-4">
        {/* Icon (optional) */}
        {dialog.icon && (
          <div className="mb-4 flex justify-center">
            {dialog.icon}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2 text-base font-semibold text-white">{dialog.title}</h3>

        {/* Message */}
        <p className="mb-6 text-sm text-slate-400">{dialog.message}</p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            {dialog.cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all ${
              dialog.variant === 'destructive'
                ? 'bg-gradient-to-r from-red-600 to-red-700'
                : 'bg-gradient-to-r from-violet-600 to-purple-600'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
