import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

export interface DialogState {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

interface ToastStore {
  toasts: Toast[]
  dialog: DialogState | null
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
  showDialog: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  closeDialog: () => void
}

let toastCounter = 0

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  dialog: null,

  addToast: (type, message) => {
    const id = String(++toastCounter)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  showDialog: ({ title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, onCancel }) => {
    set({
      dialog: {
        open: true,
        title,
        message,
        confirmLabel,
        cancelLabel,
        onConfirm,
        onCancel: onCancel ?? (() => {})
      }
    })
  },

  closeDialog: () => set({ dialog: null })
}))

// Convenience helpers
export const toast = {
  success: (msg: string) => useToast.getState().addToast('success', msg),
  error: (msg: string) => useToast.getState().addToast('error', msg),
  info: (msg: string) => useToast.getState().addToast('info', msg),
  warning: (msg: string) => useToast.getState().addToast('warning', msg)
}

export const dialog = {
  confirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) =>
    useToast.getState().showDialog({ title, message, onConfirm, onCancel })
}
