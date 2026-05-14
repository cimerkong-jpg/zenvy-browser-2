# MEMBERS SYNC BUG FIX

**Ngày:** 14/05/2026
**Bugs:** Member role/permissions cache, Removed member vẫn hiển thị

---

## ROOT CAUSE ANALYSIS

### BUG 1: Role/Permission Cache
**Triệu chứng:** Member reload vẫn giữ quyền cũ sau khi Owner update role

**Root Causes:**
1. ✅ `updateMember()` và `updateMemberRole()` update đúng Supabase
2. ❌ Store không reload `permissions` sau khi update
3. ❌ `getMyPermissions()` có thể cache ở client
4. ❌ Accepted invitation fallback có thể trả role cũ

### BUG 2: Removed Member Resurrection
**Triệu chứng:** Member bị remove vẫn thấy workspace

**Root Causes:**
1. ✅ `removeMember()` set status = 'removed' đúng
2. ❌ `getWorkspaceMembers()` có accepted invitation fallback - tạo fake member
3. ❌ `getMyWorkspaces()` không filter status = 'active' đủ chặt
4. ❌ Accepted invitation fallback làm removed member quay lại
5. ❌ Store không reload workspaces sau remove

---

## FIXES NEEDED

### Fix 1: Remove Accepted Invitation Fallback
**File:** `src/main/workspaces.ts`
**Function:** `getWorkspaceMembers()`
**Lines:** ~450-480

**Current:** Có fallback tạo fake member từ accepted invitations
**Fix:** Remove fallback hoặc check workspace_members.status trước

### Fix 2: Filter Active Members Strictly
**File:** `src/main/workspaces.ts`
**Function:** `getMyWorkspacesDirect()`

**Current:** Query workspace_members với status = 'active'
**Issue:** Có thể có edge case
**Fix:** Đảm bảo filter chặt chẽ

### Fix 3: Reload After Mutations
**File:** `src/renderer/src/store/useWorkspace.ts`

**Current:** Chỉ reload members/invitations
**Fix:** Reload cả workspaces và permissions

### Fix 4: Check Status in getMyPermissions
**File:** `src/main/workspaces.ts`
**Function:** `getMyPermissions()`

**Current:** Query workspace_members
**Fix:** Thêm check status = 'active'

### Fix 5: Defensive Workspace Switch
**File:** `src/renderer/src/store/useWorkspace.ts`

**Current:** Switch workspace không validate
**Fix:** Check workspace còn trong list trước khi switch

---

## IMPLEMENTATION

Bắt đầu fix từ backend...
