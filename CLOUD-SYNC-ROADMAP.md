# Cloud Sync Implementation Roadmap

## Overview
Implement Supabase-based cloud sync for Zenvy Browser to sync profiles, groups, and scripts across devices.

---

## Phase 1: Setup & Dependencies (30 min)

### 1.1 Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 1.2 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Run `supabase-schema.sql` in SQL Editor
4. Get API keys from Settings > API

### 1.3 Environment Variables
Create `.env` file:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Phase 2: Update Local Database (1-2 hours)

### 2.1 Migrate from JSON to SQLite
**Current:** `zenvy-data.json`
**Target:** `zenvy-data.db` (SQLite)

**Why:** Better performance, transactions, sync tracking

### 2.2 Add Sync Fields
Add to each table:
- `user_id` (nullable, for local-only mode)
- `is_dirty` (boolean, tracks unsaved changes)
- `last_synced_at` (timestamp)
- `deleted_at` (soft delete)

### 2.3 Migration Script
Create `src/main/migrate-to-sqlite.ts` to:
1. Read existing JSON data
2. Create SQLite database
3. Insert all records
4. Backup JSON file

---

## Phase 3: Auth Module (2-3 hours)

### 3.1 Create `src/main/auth.ts`
Functions:
- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`
- `getCurrentUser()`
- `onAuthStateChange(callback)`

### 3.2 Session Management
- Store session in secure storage
- Auto-refresh tokens
- Handle session expiry

### 3.3 Auth UI Components
- `LoginPage.tsx`
- `RegisterPage.tsx`
- Auth state in Zustand store

---

## Phase 4: Sync Engine (4-6 hours)

### 4.1 Create `src/main/sync/engine.ts`

**Core Functions:**

```typescript
class SyncEngine {
  // Pull changes from Supabase
  async pullChanges(lastSyncTime: number): Promise<void>
  
  // Push local changes to Supabase
  async pushChanges(): Promise<void>
  
  // Full sync (pull then push)
  async sync(): Promise<SyncResult>
  
  // Conflict resolution
  resolveConflict(local, remote): Record
}
```

### 4.2 Sync Logic

**Pull Flow:**
1. Fetch records where `updated_at > last_sync_time`
2. For each record:
   - If not exists locally → INSERT
   - If exists → Compare `updated_at`, keep newer
   - If `deleted_at` set → Soft delete locally
3. Update `last_synced_at`

**Push Flow:**
1. Find records where `is_dirty = true`
2. Upsert to Supabase
3. On success:
   - Set `is_dirty = false`
   - Update `last_synced_at`

### 4.3 Sync Triggers
- On app start
- On login
- Every 60 seconds (interval)
- Manual sync button
- Before app quit

---

## Phase 5: Integration (2-3 hours)

### 5.1 Update IPC Handlers
Modify `src/main/index.ts`:
- All write operations mark records as dirty
- Add sync IPC handlers

### 5.2 Update UI
- Add sync status indicator
- Add login/logout buttons
- Show sync errors
- Manual sync button

### 5.3 Offline Support
- Queue changes when offline
- Sync when connection restored
- Show offline indicator

---

## Phase 6: Testing (2-3 hours)

### 6.1 Test Scenarios
- [ ] Login on Device A
- [ ] Create profiles on Device A
- [ ] Login on Device B → profiles appear
- [ ] Edit profile on Device B
- [ ] Check Device A → changes synced
- [ ] Delete profile on Device A
- [ ] Check Device B → profile deleted
- [ ] Offline mode → changes queued
- [ ] Go online → changes synced

### 6.2 Edge Cases
- [ ] Conflict resolution
- [ ] Network errors
- [ ] Token expiry
- [ ] Large data sync
- [ ] Concurrent edits

---

## Phase 7: Polish (1-2 hours)

### 7.1 UX Improvements
- Loading states
- Error messages
- Sync progress indicator
- Success notifications

### 7.2 Performance
- Batch operations
- Debounce sync triggers
- Optimize queries

---

## Total Estimated Time: 12-18 hours (1.5-2 days)

---

## File Structure

```
src/
├── main/
│   ├── auth.ts              # NEW: Auth module
│   ├── db.ts                # UPDATE: Add sync fields
│   ├── migrate-to-sqlite.ts # NEW: Migration script
│   └── sync/
│       ├── engine.ts        # NEW: Sync engine
│       ├── supabase.ts      # NEW: Supabase client
│       └── types.ts         # NEW: Sync types
├── renderer/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.tsx    # NEW
│       │   └── RegisterPage.tsx # NEW
│       └── store/
│           └── useAuth.ts       # NEW: Auth store
└── shared/
    └── types.ts             # UPDATE: Add sync types
```

---

## Next Steps

**Option 1: Full Implementation (Recommended)**
- I implement everything step by step
- Takes 1-2 days
- Complete cloud sync system

**Option 2: MVP First**
- Skip SQLite migration (keep JSON)
- Basic auth + manual sync only
- Takes 4-6 hours
- Can upgrade later

**Option 3: Guided Implementation**
- I create all files with detailed comments
- You review and test each phase
- More control, same timeline

Which approach do you prefer?
