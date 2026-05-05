# Auth UI Implementation - In Progress

## ✅ Completed:

### 1. IPC Handlers (main process)
- File: `src/main/index.ts`
- Added auth import
- Registered 6 auth handlers:
  - `auth:signUp`
  - `auth:signIn`
  - `auth:signOut`
  - `auth:getCurrentUser`
  - `auth:getCurrentSession`
  - `auth:isAuthenticated`

### 2. Preload API
- File: `src/preload/index.ts`
- Added `auth` object to API
- All 6 methods exposed to renderer
- Type-safe communication ready

---

## 🔄 Next Steps:

### 3. Create Auth Store
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
  isAuthenticated: boolean
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: AuthUser | null) => void
}
```

### 4. Create Login Page
File: `src/renderer/src/pages/LoginPage.tsx`

Features:
- Email/password form
- Sign in button
- Link to register
- Error handling
- Loading state
- Clean design per design.md

### 5. Create Register Page
File: `src/renderer/src/pages/RegisterPage.tsx`

Features:
- Email/password form
- Password confirmation
- Sign up button
- Link to login
- Error handling
- Email confirmation notice

### 6. Update App.tsx
- Add auth routes
- Check session on mount
- Redirect logic
- Auth guard for protected routes

### 7. Update Sidebar
- Show user email when logged in
- Add sign out button
- Show login button when not authenticated

---

## 📋 Implementation Checklist:

- [x] Auth IPC handlers
- [x] Preload API
- [ ] Auth store (Zustand)
- [ ] Login page
- [ ] Register page
- [ ] App.tsx routing
- [ ] Sidebar integration
- [ ] Test auth flow
- [ ] Handle edge cases

---

## 🎯 Edge Cases to Handle:

1. **Expired Session**
   - Check on app start
   - Redirect to login
   - Show toast message

2. **Network Error**
   - Show error message
   - Retry option
   - Offline indicator

3. **Invalid Credentials**
   - Clear error message
   - Don't clear form
   - Focus on password field

4. **Session Persistence**
   - Auto-login on app restart
   - Remember user
   - Secure token storage

---

## 🚀 Ready to Continue

All backend infrastructure is ready. Next: Create UI components.

**Estimated time remaining:** 1-2 hours
