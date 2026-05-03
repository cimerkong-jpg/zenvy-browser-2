import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'auto'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  refreshTheme: () => void
}

const getAutoTheme = (): 'light' | 'dark' => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'light' : 'dark'
}

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'auto') return getAutoTheme()
  return theme
}

const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.setAttribute('data-theme', theme)
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => {
      if (typeof window !== 'undefined') {
        window.setInterval(() => {
          const { theme, resolvedTheme } = get()
          if (theme !== 'auto') return
          const nextTheme = resolveTheme(theme)
          if (nextTheme !== resolvedTheme) {
            set({ resolvedTheme: nextTheme })
            applyTheme(nextTheme)
          }
        }, 60_000)
      }

      return {
        theme: 'dark',
        resolvedTheme: 'dark',
        setTheme: (theme: Theme) => {
          const resolvedTheme = resolveTheme(theme)
          set({ theme, resolvedTheme })
          applyTheme(resolvedTheme)
        },
        refreshTheme: () => {
          const { theme } = get()
          const resolvedTheme = resolveTheme(theme)
          set({ resolvedTheme })
          applyTheme(resolvedTheme)
        }
      }
    },
    {
      name: 'zenvy-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if ((state.theme as string) === 'system') state.theme = 'auto'
        const resolvedTheme = resolveTheme(state.theme)
        state.resolvedTheme = resolvedTheme
        applyTheme(resolvedTheme)
      }
    }
  )
)

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('zenvy-theme')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const storedTheme = parsed?.state?.theme === 'system' ? 'auto' : parsed?.state?.theme
      applyTheme(resolveTheme(storedTheme ?? 'dark'))
    } catch {
      applyTheme('dark')
    }
  } else {
    applyTheme('dark')
  }
}
