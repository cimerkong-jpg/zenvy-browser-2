import { create } from 'zustand'

export type DialogVariant = 'default' | 'destructive'

export interface DialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  icon?: React.ReactNode
}

interface DialogState {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: DialogVariant
  icon?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

interface DialogStore {
  dialog: DialogState | null
  showDialog: (options: DialogOptions & { onConfirm: () => void; onCancel: () => void }) => void
  closeDialog: () => void
}

export const useDialog = create<DialogStore>((set) => ({
  dialog: null,

  showDialog: ({ title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', variant = 'default', icon, onConfirm, onCancel }) => {
    set({
      dialog: {
        isOpen: true,
        title,
        message,
        confirmLabel,
        cancelLabel,
        variant,
        icon,
        onConfirm,
        onCancel
      }
    })
  },

  closeDialog: () => set({ dialog: null })
}))

// Promise-based API for async/await usage
export const dialog = {
  /**
   * Show a confirmation dialog and wait for user response
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  confirm: (title: string, message: string, options?: Partial<DialogOptions>): Promise<boolean> => {
    return new Promise((resolve) => {
      useDialog.getState().showDialog({
        title,
        message,
        confirmLabel: options?.confirmLabel,
        cancelLabel: options?.cancelLabel,
        variant: options?.variant,
        icon: options?.icon,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  },

  /**
   * Show a destructive confirmation dialog (for delete/remove actions)
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  confirmDelete: (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      useDialog.getState().showDialog({
        title,
        message,
        confirmLabel: 'Xóa',
        cancelLabel: 'Hủy',
        variant: 'destructive',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  },

  /**
   * Close any open dialog programmatically
   */
  close: () => {
    useDialog.getState().closeDialog()
  }
}
