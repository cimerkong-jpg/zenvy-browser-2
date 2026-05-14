# MEMBERS V1.0.0 IMPLEMENTATION PLAN

**Ngày:** 14/05/2026
**Mục tiêu:** Implement Members logic theo SPEC chuẩn cho v1.0.0

---

## AUDIT SO VỚI SPEC

### ✅ ĐÃ ĐÚNG

1. **Workspace Ownership**
   - ✅ User có workspace mặc định
   - ✅ Owner tạo được nhiều workspace
   - ✅ Workspace mặc định là workspace bình thường

2. **Invite Member - Structure**
   - ✅ Owner/Admin có thể invite
   - ✅ Lưu đầy đủ thông tin vào Supabase
   - ✅ Không gửi email tự động
   - ✅ Không cần token/link

3. **Auto-accept Pending Invitations**
   - ✅ `acceptPendingInvitations()` RPC hoạt động
   - ✅ Tự động chạy khi login
   - ✅ Tạo workspace_members từ pending invitations

4. **Workspace Switching**
   - ✅ User thấy danh sách workspaces
   - ✅ Switch workspace hoạt động
   - ✅ Load data theo currentWorkspaceId

5. **Owner Quản Lý Member**
   - ✅ Edit role, user_group_id, profile_limit, note
   - ✅ Remove member (set status = removed)
   - ✅ Không cho remove/change owner

6. **Database & RLS**
   - ✅ Schema đầy đủ
   - ✅ RLS policies tốt
   - ✅ Triggers protect owner

### ❌ SAI / THIẾU

1. **Invite Existing User**
   - ❌ `inviteMember()` KHÔNG check email đã có account chưa
   - ❌ Luôn tạo workspace_invitations, không tạo workspace_members ngay
   - **Fix:** Check email trong auth.users, nếu có thì tạo workspace_members active ngay

2. **Accepted Invitation Fallback**
   - ❌ Có hack `invitation:` prefix để show accepted invitations as members
   - ❌ Code phức tạp, không cần thiết nếu flow đúng
   - **Fix:** Đảm bảo acceptPendingInvitations tạo workspace_members đúng

3. **Permission Enforcement**
   - ❌ Profile operations KHÔNG check permissions
   - ❌ `createProfile()`, `deleteProfile()`, `launchProfile()` không verify
   - ❌ Automation run không check permissions
   - **Fix:** Thêm permission checks vào tất cả operations

4. **UI Misleading**
   - ❌ "Resend" button gây hiểu nhầm (không gửi email thật)
   - ❌ Authorization picker không hoạt động nhưng vẫn hiển thị
   - **Fix:** Ẩn/đổi text các UI này

5. **Data Visibility**
   - ⚠️ Profile/group load theo workspace nhưng không enforce permissions
   - **Fix:** Thêm permission checks

---

## IMPLEMENTATION TASKS

### Task 1: Fix inviteMember() - Check Existing User
**File:** `src/main/workspaces.ts`
**Priority:** HIGH

**Current:**
```typescript
// Always creates workspace_invitations
await getSupabase().from('workspace_invitations').insert(...)
```

**Fix:**
```typescript
// Check if email exists in auth.users
const { data: existingUser } = await getSupabase()
  .from('auth.users')
  .select('id, email')
  .eq('email', input.email.toLowerCase())
  .single()

if (existingUser) {
  // Create workspace_members directly
  await getSupabase().from('workspace_members').insert({
    workspace_id: input.workspaceId,
    user_id: existingUser.id,
    email: input.email.toLowerCase(),
    role: input.role,
    status: 'active',
    user_group_id: input.userGroupId,
    profile_limit: input.profileLimit,
    note: input.note,
    invited_by: user.id
  })
} else {
  // Create workspace_invitations
  await getSupabase().from('workspace_invitations').insert(...)
}
```

### Task 2: Remove Accepted Invitation Fallback
**File:** `src/main/workspaces.ts`
**Priority:** MEDIUM

**Current:** Lines 450-480 có hack `invitation:` prefix

**Fix:** Remove fallback logic, rely on proper workspace_members records

### Task 3: Add Profile Permission Checks
**Files:** `src/main/db.ts`, `src/main/browser.ts`
**Priority:** CRITICAL

**Add checks to:**
- `createProfile()` - Check `profile.create`
- `updateProfile()` - Check `profile.edit`
- `deleteProfile()` - Check `profile.delete`
- `deleteProfiles()` - Check `profile.delete`
- `duplicateProfile()` - Check `profile.clone`
- `importProfiles()` - Check `profile.import`
- `exportProfiles()` - Check `profile.export`
- `launchProfile()` in browser.ts - Check `profile.open`

**Pattern:**
```typescript
import { hasPermission } from './workspaces'
import { getCurrentWorkspaceId } from './workspaces'

export async function createProfile(data, workspaceId) {
  const currentWs = workspaceId || getCurrentWorkspaceId()
  if (!currentWs) throw new Error('No workspace selected')

  const canCreate = await hasPermission('profile.create', currentWs)
  if (!canCreate) throw new Error('Permission denied: profile.create')

  // Proceed with creation
}
```

### Task 4: Add Automation Permission Checks
**Files:** `src/main/automation/executor.ts`, `src/main/automation/scripts.ts`
**Priority:** HIGH

**Add checks to:**
- Script create - Check `automation.create`
- Script update - Check `automation.edit`
- Script delete - Check `automation.delete`
- Script run - Check `automation.run`

### Task 5: Hide/Update Misleading UI
**File:** `src/renderer/src/pages/MembersPage.tsx`
**Priority:** MEDIUM

**Changes:**
1. **Resend button:** Change text to "Nhắc thủ công" or hide
2. **Authorization Picker:** Hide or disable with tooltip
3. **Add help text:** "Lưu ý: Bạn cần thông báo member thủ công qua email/chat"

### Task 6: Clean Up Invitation Token
**File:** `src/main/workspaces.ts`
**Priority:** LOW

**Option 1:** Keep generating token (for future use)
**Option 2:** Set token = email hash (simpler)

Recommend: Keep current, just document it's unused in v1.0.0

---

## FILES TO CHANGE

1. ✅ `src/main/workspaces.ts` - Fix inviteMember(), remove fallback
2. ✅ `src/main/db.ts` - Add profile permission checks
3. ✅ `src/main/browser.ts` - Add launchProfile permission check
4. ✅ `src/main/automation/scripts.ts` - Add script permission checks
5. ✅ `src/main/automation/executor.ts` - Add run permission check
6. ✅ `src/renderer/src/pages/MembersPage.tsx` - Update UI text/hide features
7. ⚠️ `src/main/index.ts` - May need to export getCurrentWorkspaceId

---

## IMPLEMENTATION ORDER

**Phase 1: Core Logic (4-5 hours)**
1. Fix inviteMember() to check existing user
2. Remove accepted invitation fallback
3. Test invite flow end-to-end

**Phase 2: Permission Enforcement (3-4 hours)**
4. Add profile permission checks
5. Add automation permission checks
6. Test permission denials

**Phase 3: UI Cleanup (1 hour)**
7. Update misleading UI elements
8. Add help text

**Total: 8-10 hours**

---

## NEXT STEPS

Bắt đầu implement từ Task 1...
