import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

let toastCounter = 0

export const useToast = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = String(++toastCounter)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

// Convenience helpers
export const toast = {
  success: (msg: string) => useToast.getState().addToast('success', msg),
  error: (msg: string) => useToast.getState().addToast('error', msg),
  info: (msg: string) => useToast.getState().addToast('info', msg),
  warning: (msg: string) => useToast.getState().addToast('warning', msg)
}
