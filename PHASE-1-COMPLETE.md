# Phase 1: Setup & Auth - COMPLETE ✅

## What's Done:

### 1. Dependencies Installed ✅
```bash
npm install @supabase/supabase-js better-sqlite3 @types/better-sqlite3
```

### 2. Supabase Schema Created ✅
- File: `supabase-schema.sql`
- Tables: profiles, groups, scripts
- RLS policies configured
- Ready to run in Supabase SQL Editor

### 3. Supabase Client ✅
- File: `src/main/supabase.ts`
- Singleton pattern
- Environment variable support
- Configuration check

### 4. Auth Module ✅
- File: `src/main/auth.ts`
- Functions:
  - `signUp(email, password)`
  - `signIn(email, password)`
  - `signOut()`
  - `getCurrentUser()`
  - `getCurrentSession()`
  - `isAuthenticated()`
  - `onAuthStateChange(callback)`

---

## Next Steps (Phase 2):

### A. Update IPC Handlers
Add to `src/main/index.ts`:
```typescript
ipcMain.handle('auth:signUp', async (_, email, password) => {
  return await signUp(email, password)
})

ipcMain.handle('auth:signIn', async (_, email, password) => {
  return await signIn(email, password)
})

ipcMain.handle('auth:signOut', async () => {
  return await signOut()
})

ipcMain.handle('auth:getCurrentUser', async () => {
  return await getCurrentUser()
})
```

### B. Update Preload API
Add to `src/preload/index.ts`:
```typescript
auth: {
  signUp: (email: string, password: string) => 
    ipcRenderer.invoke('auth:signUp', email, password),
  signIn: (email: string, password: string) => 
    ipcRenderer.invoke('auth:signIn', email, password),
  signOut: () => 
    ipcRenderer.invoke('auth:signOut'),
  getCurrentUser: () => 
    ipcRenderer.invoke('auth:getCurrentUser'),
}
```

### C. Create Auth Store
File: `src/renderer/src/store/useAuth.ts`
```typescript
import { create } from 'zustand'

interface AuthUser {
  id: string
  email: string
  createdAt: string
}

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  signIn: async (email, password) => {
    set({ isLoading: true })
    const { session, error } = await window.api.auth.signIn(email, password)
    if (session) {
      set({ user: session.user, isLoading: false })
    } else {
      set({ isLoading: false })
      throw new Error(error || 'Login failed')
    }
  },
  signOut: async () => {
    await window.api.auth.signOut()
    set({ user: null })
  },
}))
```

### D. Create Login Page
File: `src/renderer/src/pages/LoginPage.tsx`
- Email/password form
- Sign in button
- Link to register
- Error handling

### E. Create Register Page
File: `src/renderer/src/pages/RegisterPage.tsx`
- Email/password form
- Sign up button
- Link to login
- Email confirmation notice

### F. Update App.tsx
- Add auth routes
- Check auth state on mount
- Redirect logic

---

## Environment Setup Required:

Create `.env` file in project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from:
1. Go to https://supabase.com
2. Create project
3. Run `supabase-schema.sql` in SQL Editor
4. Get keys from Settings > API

---

## Testing Checklist:

- [ ] Supabase project created
- [ ] Schema deployed
- [ ] Environment variables set
- [ ] IPC handlers added
- [ ] Preload API updated
- [ ] Auth store created
- [ ] Login page created
- [ ] Register page created
- [ ] Can sign up
- [ ] Can sign in
- [ ] Can sign out
- [ ] Session persists on reload

---

## Estimated Time for Phase 2:
**2-3 hours** to complete UI integration

Ready to continue?
