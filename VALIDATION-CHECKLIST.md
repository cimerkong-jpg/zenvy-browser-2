# Validation Checklist - Before UI Implementation

## ✅ Completed:

### 1. IPC Contracts Defined
- **File:** `src/shared/ipc-contracts.ts`
- Type-safe contracts for auth and sync
- Input/output types clearly defined
- Ready for implementation

### 2. Auth Test Script Created
- **File:** `test-auth.js`
- Tests all auth flows
- Validates session management
- Ready to run

---

## 🔧 Setup Required (Before Testing):

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization
4. Set project name: `zenvy-browser`
5. Set database password (save it!)
6. Choose region (closest to you)
7. Wait for project to be ready (~2 minutes)

### Step 2: Deploy Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy content from `supabase-schema.sql`
4. Paste and click "Run"
5. Verify tables created: profiles, groups, scripts

### Step 3: Get API Keys
1. Go to **Settings** > **API**
2. Copy **Project URL** (looks like: `https://xxx.supabase.co`)
3. Copy **anon public** key (long string starting with `eyJ...`)

### Step 4: Create Environment File
Create `.env` in project root:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Disable Email Confirmation (For Testing)
1. Go to **Authentication** > **Providers**
2. Click **Email**
3. Toggle OFF "Confirm email"
4. Click "Save"

---

## 🧪 Run Tests:

### Test 1: Auth Flow
```bash
node test-auth.js
```

**Expected output:**
```
🧪 Starting Auth Flow Tests...

1️⃣  Checking Supabase configuration...
✅ Supabase configured

2️⃣  Testing sign up...
✅ Sign up successful

3️⃣  Testing sign in...
✅ Sign in successful

... (all 9 tests)

🎉 All tests passed!
```

### Test 2: Session Persistence
1. Run `node test-auth.js`
2. Sign in successful
3. **Don't sign out**
4. Run script again
5. Should retrieve existing session

### Test 3: RLS Verification
**Manual test in Supabase:**

1. Go to **SQL Editor**
2. Run this query:
```sql
-- Should return empty (no user_id context)
SELECT * FROM profiles;
```

3. Go to **Authentication** > **Users**
4. Find a test user
5. Copy their UUID
6. Run this query:
```sql
-- Set user context
SET request.jwt.claim.sub = 'user-uuid-here';

-- Should return only that user's profiles
SELECT * FROM profiles;
```

---

## ✅ Validation Checklist:

- [ ] Supabase project created
- [ ] Schema deployed successfully
- [ ] Environment variables set
- [ ] Email confirmation disabled (for testing)
- [ ] `test-auth.js` runs without errors
- [ ] Sign up works
- [ ] Sign in works
- [ ] Session persists
- [ ] Sign out works
- [ ] RLS prevents cross-user access
- [ ] Multiple users can sign up
- [ ] Each user sees only their data

---

## 🚨 Common Issues:

### Issue: "Supabase not configured"
**Fix:** Check `.env` file exists and has correct keys

### Issue: "Invalid API key"
**Fix:** Regenerate keys in Supabase dashboard

### Issue: "Email not confirmed"
**Fix:** Disable email confirmation in Auth settings

### Issue: "RLS policy error"
**Fix:** Re-run `supabase-schema.sql`

---

## ✅ After Validation Passes:

**You're ready for UI implementation!**

Next steps:
1. Update IPC handlers in `src/main/index.ts`
2. Update preload API in `src/preload/index.ts`
3. Create auth store `src/renderer/src/store/useAuth.ts`
4. Create Login page
5. Create Register page
6. Update App.tsx with auth routes

---

## 📊 Expected Test Results:

```
✅ Supabase configured
✅ Sign up successful
✅ Sign in successful
✅ Current user retrieved
✅ Current session retrieved
✅ User is authenticated
✅ Sign out successful
✅ User is signed out
✅ User is not authenticated

🎉 All tests passed!
```

---

## 🎯 Success Criteria:

- [x] IPC contracts defined
- [x] Auth module complete
- [x] Test script created
- [ ] Supabase project setup
- [ ] Schema deployed
- [ ] Tests pass
- [ ] RLS verified
- [ ] Ready for UI

**Status: Awaiting Supabase setup & testing**
