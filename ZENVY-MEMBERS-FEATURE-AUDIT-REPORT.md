# ZENVY MEMBERS FEATURE AUDIT REPORT

**Ngày audit:** 14/05/2026  
**Phương pháp:** Code inspection toàn diện từ UI đến Database  
**Mục tiêu:** Rà soát chức năng Members/Workspace Members - KHÔNG sửa code

## 4. STATE & DATA FLOW

### 4.1 Zustand Store (useWorkspace.ts)

**State Shape:**
```typescript
{
  workspaces: WorkspaceWithStats[]
  currentWorkspace: WorkspaceWithStats | null
  currentWorkspaceId: string | null
  currentRole: WorkspaceRole | null
  members: WorkspaceMember[]              // ✅ Loaded
  invitations: WorkspaceInvitation[]      // ✅ Loaded
  userGroups: WorkspaceUserGroup[]        // ✅ Loaded
  permissions: RolePermissionMap          // ✅ Current user permissions
  rolePermissions: Record<WorkspaceRole, RolePermissionMap>  // ✅ Templates
  loading: boolean
  membersLoading: boolean
  invitationsLoading: boolean
  groupsLoading: boolean
  error: string | null
}
```

**Actions:**
- ✅ `loadWorkspaces()` - Load all workspaces
- ✅ `loadMembers()` - Load members for current workspace
- ✅ `loadInvitations()` - Load invitations
- ✅ `loadUserGroups()` - Load user groups
- ✅ `inviteMember(input)` - Create invitation
- ✅ `updateMember(memberId, input)` - Update member
- ✅ `updateMemberRole(memberId, role)` - Change role
- ✅ `removeMember(memberId)` - Remove member
- ✅ `revokeInvitation(id)` - Revoke invitation
- ✅ `resendInvitation(id)` - Resend invitation
- ✅ `createUserGroup(name, description)` - Create group
- ✅ `updateUserGroup(id, name, description)` - Update group
- ✅ `deleteUserGroup(id)` - Delete group
- ✅ `updateRolePermissions(role, permissions)` - Update permission template
- ✅ `getMyPermissions()` - Get current user permissions
- ✅ `hasPermission(key)` - Check permission

**Data Flow:**
```
UI Action
  ↓
Store Action (e.g., inviteMember)
  ↓
window.api.workspaces.inviteMember (IPC)
  ↓
Main Process Handler
  ↓
workspaces.inviteMember()
  ↓
Supabase Insert
  ↓
Response
  ↓
Store.loadInvitations() (refresh)
  ↓
UI Update
```

### 4.2 Special Member Handling

**Accepted Invitations as Members:**
- `getWorkspaceMembers()` có fallback logic
- Nếu invitation đã accepted nhưng chưa có member record
- Tạo fake member với `id: 'invitation:{invitationId}'`
- Cho phép UI hiển thị và manage accepted invitations
- `removeMember()` và `updateMember()` detect prefix và xử lý đặc biệt

**Code:**
```typescript
// src/main/workspaces.ts line 450-480
if (memberId.startsWith('invitation:')) {
  const invitationId = memberId.slice('invitation:'.length)
  // Handle via invitation table
}
```

## 6. MAIN LOGIC MAP

### 6.1 Key Functions in workspaces.ts

| Function | Purpose | Source | Permission Check | Status | Issues |
|----------|---------|--------|------------------|--------|--------|
| `inviteMember()` | Create invitation | Supabase | ✅ `member.invite` | Working | No email sending |
| `getWorkspaceMembers()` | Get members | Supabase | ✅ Active member | Working | Has fallback for accepted invitations |
| `getWorkspaceInvitations()` | Get invitations | Supabase | ✅ `member.invite` | Working | - |
| `updateMember()` | Update member info | Supabase | ✅ `member.edit_role` | Working | Handles invitation: prefix |
| `updateMemberRole()` | Change role | Supabase | ✅ `member.edit_role` | Working | Blocks owner role |
| `removeMember()` | Remove member | Supabase | ✅ `member.remove` | Working | Blocks owner, handles invitation: |
| `revokeInvitation()` | Revoke invitation | Supabase | ✅ `member.invite` or `member.remove` | Working | - |
| `resendInvitation()` | Resend invitation | Supabase | ✅ `member.invite` | Working | No actual email |
| `createUserGroup()` | Create user group | Supabase | ✅ `member.edit_role` | Working | - |
| `updateUserGroup()` | Update user group | Supabase | ✅ `member.edit_role` | Working | - |
| `deleteUserGroup()` | Delete user group | Supabase | ✅ `member.edit_role` | Working | - |
| `getMyPermissions()` | Get current permissions | Supabase | ✅ Active member | Working | Checks user_group_id |
| `updateRolePermissions()` | Update permission template | Supabase | ✅ `workspace.settings` | Working | - |
| `hasPermission()` | Check permission | Supabase | ✅ Active member | Working | - |

### 6.2 Permission Check Pattern

**Standard Pattern:**
```typescript
async function inviteMember(input: InviteMemberInput) {
  requireConfigured()  // ✅ Check Supabase configured
  const user = await requireUser()  // ✅ Check authenticated
  
  const hasInvitePermission = await hasPermission('member.invite', input.workspaceId)
  if (!hasInvitePermission) {
    throw new Error('Permission denied: member.invite')  // ✅ Block unauthorized
  }
  
  // Proceed with operation
}
```

**Protection:**
- ✅ All member operations check permissions
- ✅ Owner role cannot be assigned/removed
- ✅ Cannot remove self (for non-owner)
- ✅ RLS at database level as backup

### 6.3 Invitation Token

**Generation:**
```typescript
function token(): string {
  return randomBytes(24).toString('hex')  // 48 character hex string
}
```

**Usage:**
- ✅ Stored in `workspace_invitations.token`
- ✅ Unique constraint
- ❌ NOT used for accept flow (no link/email)
- ⚠️ Token exists but unused

### 6.4 Accept Invitation Flow

**Function:** `acceptPendingInvitations()`
- Called when user logs in
- Finds all pending invitations matching user's email
- Creates `workspace_members` records
- Updates invitation status to 'accepted'
- Returns first accepted workspace_id

**Automatic:**
- ✅ Runs on login via RPC `accept_pending_invitations`
- ✅ Database function handles the logic
- ✅ No manual accept needed if email matches

---

## 7. DATABASE/SUPABASE MAP

### 7.1 Tables

#### workspaces
| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | uuid | Primary key | - |
| name | text | Workspace name | - |
| owner_id | uuid | Owner user ID | FK to auth.users |
| settings | jsonb | Settings (permissionMode, etc) | - |
| created_at | timestamptz | Creation time | - |
| updated_at | timestamptz | Last update | Auto-updated |

#### workspace_members
| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | uuid | Primary key | - |
| workspace_id | uuid | Workspace | FK, cascade delete |
| user_id | uuid | User | FK to auth.users |
| email | text | User email | For lookup |
| role | workspace_role | Role | owner/admin/member/viewer |
| status | workspace_member_status | Status | active/removed/suspended |
| user_group_id | uuid | User group | FK, nullable, set null on delete |
| profile_limit | integer | Profile limit | Nullable |
| note | text | Notes | Default '' |
| invited_by | uuid | Who invited | FK to auth.users, nullable |
| joined_at | timestamptz | Join time | Default now() |
| updated_at | timestamptz | Last update | Auto-updated |

**Constraints:**
- ✅ Unique (workspace_id, user_id)
- ✅ Check: owner must be active
- ✅ Trigger: protect owner from update/delete

#### workspace_invitations
| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | uuid | Primary key | - |
| workspace_id | uuid | Workspace | FK, cascade delete |
| email | text | Invitee email | - |
| role | workspace_role | Role | Cannot be 'owner' |
| user_group_id | uuid | User group | FK, nullable |
| profile_limit | integer | Profile limit | Nullable |
| note | text | Notes | Default '' |
| invited_by | uuid | Inviter | FK to auth.users |
| status | workspace_invitation_status | Status | pending/accepted/expired/revoked |
| token | text | Invitation token | Unique, unused |
| expires_at | timestamptz | Expiration | - |
| accepted_at | timestamptz | Accept time | Nullable |
| revoked_at | timestamptz | Revoke time | Nullable |
| created_at | timestamptz | Creation time | - |
| updated_at | timestamptz | Last update | Auto-updated |

**Constraints:**
- ✅ Unique (workspace_id, lower(email)) WHERE status = 'pending'
- ✅ Check: role <> 'owner'

#### workspace_user_groups
| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | uuid | Primary key | - |
| workspace_id | uuid | Workspace | FK, cascade delete |
| name | text | Group name | - |
| description | text | Description/permissions | JSON serialized with prefix |
| created_by | uuid | Creator | FK to auth.users, nullable |
| created_at | timestamptz | Creation time | - |
| updated_at | timestamptz | Last update | Auto-updated |

**Constraints:**
- ✅ Unique (workspace_id, name)

**Permission Storage:**
- Permissions stored in `description` field
- Format: `__ZENVY_GROUP_META__:{"note":"...","permissions":{...}}`
- Parsed by `parseGroupPermissions()` function

#### workspace_role_permissions
| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | uuid | Primary key | - |
| workspace_id | uuid | Workspace | FK, cascade delete |
| role | workspace_role | Role | Cannot be 'owner' |
| permissions | jsonb | Permission map | JSON object |
| created_at | timestamptz | Creation time | - |
| updated_at | timestamptz | Last update | Auto-updated |

**Constraints:**
- ✅ Unique (workspace_id, role)
- ✅ Check: role <> 'owner'

### 7.2 RLS Policies

#### workspaces
- ✅ **Read:** User is active member OR owner
- ✅ **Insert:** Authenticated users can create
- ✅ **Update:** Owner or admin with `workspace.settings`
- ✅ **Delete:** Owner only

#### workspace_members
- ✅ **Read:** User is active member of workspace
- ✅ **Insert:** User has `member.invite` permission
- ✅ **Update:** User has `member.remove` OR `member.edit_role`
- ✅ **Delete:** User has `member.remove`
- ✅ **Trigger:** Protect owner from update/delete

#### workspace_invitations
- ✅ **Read:** User has `member.invite` permission
- ✅ **Insert:** User has `member.invite` permission
- ✅ **Update:** User has `member.invite` permission
- ❌ **Delete:** No policy (should have for cleanup)

#### workspace_user_groups
- ✅ **Read:** User is active member
- ✅ **Insert:** User has `member.edit_role`
- ✅ **Update:** User has `member.edit_role`
- ✅ **Delete:** User has `member.edit_role`

### 7.3 RLS Issues

⚠️ **workspace_invitations DELETE:**
- Không có DELETE policy
- Nên có để cho phép cleanup expired invitations
- Hiện tại chỉ UPDATE status thành 'revoked'

✅ **RLS Functions:**
- `user_is_active_workspace_member()` - Check membership
- `user_has_workspace_permission()` - Check permission
- Functions are SECURITY DEFINER để tránh recursive RLS

✅ **Trigger Protection:**
- `protect_owner_member()` - Prevent owner role changes
- Blocks UPDATE/DELETE on owner members

---

## 5. IPC/API MAP

### 5.1 Workspace APIs

| Channel | Preload | Renderer | Main Handler | Status | Notes |
|---------|---------|----------|--------------|--------|-------|
| `workspaces:getWorkspaces` | ✅ | ✅ | ✅ | Working | Get all workspaces |
| `workspaces:getCurrent` | ✅ | ✅ | ✅ | Working | Get current workspace |
| `workspaces:switchWorkspace` | ✅ | ✅ | ✅ | Working | Switch workspace |
| `workspaces:createWorkspace` | ✅ | ✅ | ✅ | Working | Create new workspace |
| `workspaces:updateWorkspace` | ✅ | ✅ | ✅ | Working | Update workspace info |
| `workspaces:deleteWorkspace` | ✅ | ✅ | ✅ | Working | Delete workspace |
| `workspaces:ensureDefaultWorkspace` | ✅ | ✅ | ✅ | Working | Create default workspace |
| `workspaces:acceptInvitations` | ✅ | ✅ | ✅ | Working | Accept pending invitations |

### 5.2 Member Management APIs

| Channel | Preload | Renderer | Main Handler | Status | Notes |
|---------|---------|----------|--------------|--------|-------|
| `workspaces:getMembers` | ✅ | ✅ | ✅ | Working | Get workspace members |
| `workspaces:inviteMember` | ✅ | ✅ | ✅ | Working | Create invitation |
| `workspaces:updateMember` | ✅ | ✅ | ✅ | Working | Update member info |
| `workspaces:updateMemberRole` | ✅ | ✅ | ✅ | Working | Change member role |
| `workspaces:removeMember` | ✅ | ✅ | ✅ | Working | Remove member |

### 5.3 Invitation APIs

| Channel | Preload | Renderer | Main Handler | Status | Notes |
|---------|---------|----------|--------------|--------|-------|
| `workspaces:getInvitations` | ✅ | ✅ | ✅ | Working | Get invitations |
| `workspaces:revokeInvitation` | ✅ | ✅ | ✅ | Working | Revoke invitation |
| `workspaces:resendInvitation` | ✅ | ✅ | ✅ | Working | Resend invitation |

### 5.4 User Group APIs

| Channel | Preload | Renderer | Main Handler | Status | Notes |
|---------|---------|----------|--------------|--------|-------|
| `workspaces:getUserGroups` | ✅ | ✅ | ✅ | Working | Get user groups |
| `workspaces:createUserGroup` | ✅ | ✅ | ✅ | Working | Create group |
| `workspaces:updateUserGroup` | ✅ | ✅ | ✅ | Working | Update group |
| `workspaces:deleteUserGroup` | ✅ | ✅ | ✅ | Working | Delete group |

### 5.5 Permission APIs

| Channel | Preload | Renderer | Main Handler | Status | Notes |
|---------|---------|----------|--------------|--------|-------|
| `workspaces:getPermissions` | ✅ | ✅ | ✅ | Working | Get current user permissions |
| `workspaces:getRolePermissions` | ✅ | ✅ | ✅ | Working | Get role permission templates |
| `workspaces:updateRolePermissions` | ✅ | ✅ | ✅ | Working | Update permission template |
| `workspaces:hasPermission` | ✅ | ✅ | ✅ | Working | Check specific permission |
| `workspaces:updateWorkspaceSettings` | ✅ | ✅ | ✅ | Working | Update permission mode |

### 5.6 IPC Error Handling

**Pattern:**
```typescript
// src/main/index.ts
ipcMain.handle('workspaces:inviteMember', async (_, input) => {
  try {
    return await workspaces.inviteMember(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[IPC:inviteMember] Error:', message)
    throw new Error(message)  // ✅ Propagate to renderer
  }
})
```

**Validation:**
- ✅ Input validation ở main process
- ✅ Permission check trước khi execute
- ✅ Error messages rõ ràng
- ✅ Try-catch wrapper cho tất cả handlers

---

## 1. EXECUTIVE SUMMARY

### Trạng thái tổng quan
- **Hoàn thành:** ~85%
- **Hoạt động:** Phần lớn features đã implement và hoạt động
- **Vấn đề chính:** 
  - UI có nhiều features nhưng một số chưa được wire up đầy đủ
  - Authorization picker (profile/group delegation) chưa được sử dụng
  - Email invitation thực tế chưa có (chỉ tạo pending record)
  - Permission enforcement chưa đầy đủ ở profile operations

### Đánh giá nhanh

| Component | Status | Notes |
|-----------|--------|-------|
| UI/Pages | ✅ 90% | MembersPage hoàn chỉnh, đẹp |
| State Management | ✅ 95% | Zustand store đầy đủ |
| IPC/Preload | ✅ 100% | Tất cả channels đã expose |
| Main Logic | ✅ 85% | Core functions hoạt động |
| Database Schema | ✅ 95% | Schema đầy đủ, RLS tốt |
| Permission Model | ⚠️ 70% | Có model nhưng chưa enforce hết |
| User Flows | ⚠️ 75% | Invite flow thiếu email sending |

---

## 2. FILES & COMPONENTS FOUND

### 2.1 UI/Renderer Files

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `src/renderer/src/pages/MembersPage.tsx` | Main members management page | ✅ Complete | 1277 lines, feature-rich |
| `src/renderer/src/pages/WorkspaceSettingsPage.tsx` | Workspace settings | ✅ Complete | Permission mode settings |
| `src/renderer/src/components/Sidebar.tsx` | Navigation with member count | ✅ Working | Shows member count |
| `src/renderer/src/components/WorkspaceSwitcher.tsx` | Workspace dropdown | ✅ Working | Shows member stats |
| `src/renderer/src/components/Topbar.tsx` | Top navigation bar | ✅ Working | - |

### 2.2 State Management

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `src/renderer/src/store/useWorkspace.ts` | Workspace Zustand store | ✅ Complete | All member actions |
| `src/renderer/src/store/useAuth.ts` | Auth store | ✅ Working | User context |
| `src/renderer/src/store/useStore.ts` | Main app store | ✅ Working | Profiles/groups |

### 2.3 IPC/Preload

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `src/preload/index.ts` | contextBridge API | ✅ Complete | All workspace APIs exposed |

### 2.4 Main Process

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `src/main/workspaces.ts` | Workspace logic | ✅ Complete | 1128 lines, comprehensive |
| `src/main/index.ts` | IPC handlers | ✅ Complete | All handlers registered |
| `src/main/auth.ts` | Authentication | ✅ Working | Supabase auth |

### 2.5 Shared Types

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `src/shared/workspace-types.ts` | TypeScript types | ✅ Complete | Comprehensive types |

### 2.6 Database Schema

| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `WORKSPACE-SCHEMA.sql` | Main schema | ✅ Complete | 490 lines |
| `WORKSPACE-RLS-CANONICAL.sql` | RLS policies | ✅ Complete | Canonical version |
| `WORKSPACE-DEFAULT-MIGRATION.sql` | Default workspace | ✅ Complete | Migration script |
| `WORKSPACE-MIGRATION-ENHANCED.sql` | Enhanced features | ⚠️ Partial | Some unused columns |

---

## 3. UI CURRENT STATE

### 3.1 MembersPage.tsx - Tổng quan

**File:** `src/renderer/src/pages/MembersPage.tsx` (1277 lines)

**Layout:**
- Left sidebar: User Groups list với create/edit/delete
- Main area: 3 tabs (Members, Invited, Permissions)
- Search bar và action buttons

**Tabs:**

#### Tab 1: Members (Thành viên)
- ✅ **Hoạt động:** Table hiển thị members
- ✅ **Columns:** Tên, Email, Quyền hạn (role badge), Ghi chú, Hành động
- ✅ **Actions:** Edit, Remove
- ✅ **Permissions:** Check `canEditRole`, `canRemove`
- ✅ **UI State:** Loading skeleton, empty state

#### Tab 2: Invited (Đã mời)
- ✅ **Hoạt động:** Table hiển thị invitations
- ✅ **Columns:** Email, Role, Nhóm người dùng, Status, Invited by, Expires at, Actions
- ✅ **Actions:** Gửi lại (resend), Xóa (revoke)
- ✅ **Status badges:** pending, accepted, expired, revoked
- ✅ **Permissions:** Check `canInvite`, `canRevoke`

#### Tab 3: Permissions (Quyền truy cập)
- ✅ **Hoạt động:** Permission template editor
- ✅ **Role selector:** Owner, Admin, Member, Viewer
- ✅ **Permission groups:** 
  - Quản lý hồ sơ (8 permissions)
  - Quản lý nhóm hồ sơ (3 permissions)
  - Automation (4 permissions)
  - Thành viên (3 permissions)
  - Workspace (3 permissions)
- ✅ **Save:** Update role permissions
- ✅ **Owner:** Read-only, always full permissions

### 3.2 Modals

#### InviteMemberModal
- ✅ **Fields:** Tên nhóm, Tên, Email, Vai trò, Ủy quyền, Giới hạn hồ sơ, Ghi chú
- ⚠️ **Authorization Picker:** UI có nhưng `authorizationIds` không được gửi đến backend
- ✅ **Validation:** Email format check
- ✅ **Roles:** Admin, Manager (member), Member (viewer)

#### EditMemberModal
- ✅ **Fields:** Giống InviteMemberModal nhưng email read-only
- ⚠️ **Authorization Picker:** Cũng không được sử dụng
- ✅ **Update:** Gọi `updateMember` API

#### GroupModal (User Groups)
- ✅ **Fields:** Tên, Ghi chú, Cấp phép
- ✅ **Permission UI:** 3 categories (profiles, profileGroups, automation)
- ✅ **Permission storage:** Serialize vào `description` field với prefix `__ZENVY_GROUP_META__:`
- ✅ **Create/Edit:** Hoạt động tốt

### 3.3 User Groups Sidebar

- ✅ **List:** Hiển thị tất cả user groups
- ✅ **Filter:** Click group để filter members
- ✅ **Actions:** Edit (pencil icon), Delete (trash icon)
- ✅ **Create:** "+ Mới" button
- ✅ **Count:** Show member count per group

### 3.4 UI Features Chưa Hoạt Động

❌ **Authorization Picker:**
- UI có component `AuthorizationPicker`
- Cho phép chọn profiles hoặc profile groups
- State `authorizationIds` được set nhưng KHÔNG được gửi đến backend
- Backend không có field để lưu authorization list

❌ **Email Sending:**
- Invite modal không có UI để gửi email thật
- Chỉ tạo pending invitation record
- Member phải accept manually (không có link/token flow)

✅ **Permission Mode Toggle:**
- Có trong WorkspaceSettingsPage
- Cho phép chọn 'group' hoặc 'profile' mode
- Được lưu vào `workspace.settings.permissionMode`

---

## 8. PERMISSION MODEL CURRENT STATE

### 8.1 Roles

**Defined Roles:**
- `owner` - Full access, cannot be changed/removed
- `admin` - Manage members, data, settings (except billing/delete)
- `member` - Create and edit data within permissions
- `viewer` - Read-only access

**Role Assignment:**
- Owner: Automatically assigned to workspace creator
- Others: Assigned via invitation or update

### 8.2 Permission Keys

**Total:** 21 permissions across 5 categories

**Profile Management (8):**
- `profile.open` - Open browser
- `profile.create` - Create profile
- `profile.edit` - Edit profile
- `profile.delete` - Delete profile
- `profile.import` - Import profiles
- `profile.export` - Export profiles
- `profile.clone` - Clone profile
- `profile.transfer` - Transfer to another group

**Profile Group Management (3):**
- `group.create` - Create group
- `group.edit` - Edit group
- `group.delete` - Delete group

**Automation (4):**
- `automation.create` - Create script
- `automation.edit` - Edit script
- `automation.run` - Run script
- `automation.delete` - Delete script

**Member Management (3):**
- `member.invite` - Invite members
- `member.remove` - Remove members
- `member.edit_role` - Edit member roles

**Workspace (3):**
- `workspace.settings` - Edit workspace settings
- `workspace.billing` - Manage billing
- `workspace.delete` - Delete workspace

### 8.3 Permission Sources

**Priority Order:**
1. **Owner:** Always full permissions (hardcoded)
2. **User Group Permissions:** If member has `user_group_id`
3. **Role Permissions:** From `workspace_role_permissions` table
4. **Default Permissions:** Hardcoded defaults

**Code:**
```typescript
// src/main/workspaces.ts - getMyPermissions()
if (member?.role === 'owner') return DefaultRolePermissionMap.owner

if (member?.user_group_id) {
  const group = await getSupabase()
    .from('workspace_user_groups')
    .select('description')
    .eq('id', member.user_group_id)
    .single()
  
  const permissions = parseGroupPermissions(group.data?.description)
  if (permissions) return permissions
}

// Fallback to role permissions or defaults
```

### 8.4 Permission Enforcement

**Where Checked:**
- ✅ **Main Process:** All workspace operations check permissions
- ✅ **UI:** Buttons disabled based on `hasPermission()`
- ✅ **Database:** RLS policies as backup
- ❌ **Profile Operations:** NOT fully enforced yet

**Example - Member Operations:**
```typescript
// ✅ ENFORCED
await inviteMember(...)  // Checks member.invite
await removeMember(...)  // Checks member.remove
await updateMemberRole(...)  // Checks member.edit_role
```

**Example - Profile Operations:**
```typescript
// ❌ NOT ENFORCED
await createProfile(...)  // No permission check
await deleteProfile(...)  // No permission check
await launchBrowser(...)  // No permission check
```

### 8.5 Permission Gaps

⚠️ **Profile Operations:**
- `src/main/db.ts` functions không check permissions
- `createProfile()`, `deleteProfile()`, `updateProfile()` không verify quyền
- Browser launch không check `profile.open`
- Automation run không check `automation.run`

⚠️ **Authorization List:**
- UI có picker để chọn profiles/groups member được access
- Backend không có field để lưu
- Không có logic để enforce

✅ **Workspace Operations:**
- Tất cả workspace/member operations đều check permissions
- RLS policies backup tốt

---

## 9. USER FLOWS

### Flow A: Owner mời member

**Steps:**
1. Owner click "Mời thành viên" button
2. Modal mở với form
3. Owner nhập: email, role, user group, note
4. Owner click "OK"
5. `inviteMember()` được gọi
6. Permission check: `member.invite` ✅
7. Insert vào `workspace_invitations` table
8. Token generated (unused)
9. `expires_at` set to 7 days from now
10. UI refresh, invitation xuất hiện trong "Đã mời" tab

**Issues:**
- ❌ Không có email được gửi
- ❌ Member không nhận được notification
- ⚠️ Token generated nhưng không dùng

**Workaround:**
- Owner phải manually thông báo member
- Member phải đăng ký với đúng email
- Auto-accept khi login

### Flow B: Member accept invitation

**Current Flow (Automatic):**
1. Member đăng ký account với email được invite
2. Member login
3. `acceptPendingInvitations()` RPC tự động chạy
4. Database function tìm pending invitations matching email
5. Tạo `workspace_members` record
6. Update invitation status = 'accepted'
7. Member thấy workspace trong list

**Issues:**
- ✅ Hoạt động tốt nếu email match
- ❌ Không có manual accept flow
- ❌ Không có invitation link/token flow

### Flow C: Owner đổi role member

**Steps:**
1. Owner click "Edit" trên member row
2. Modal mở với member info
3. Owner chọn role mới (admin/member/viewer)
4. Owner click "OK"
5. `updateMember()` được gọi
6. Permission check: `member.edit_role` ✅
7. Update `workspace_members.role`
8. UI refresh

**Protection:**
- ✅ Cannot change owner role
- ✅ Permission checked
- ✅ RLS backup

### Flow D: Owner remove member

**Steps:**
1. Owner click "Remove" trên member row
2. Confirm dialog
3. Owner confirm
4. `removeMember()` được gọi
5. Permission check: `member.remove` ✅
6. Update `workspace_members.status` = 'removed'
7. UI refresh, member biến mất

**Protection:**
- ✅ Cannot remove owner
- ✅ Cannot remove self (unless owner)
- ✅ Permission checked

### Flow E: Gán member vào group

**Steps:**
1. Owner/Admin edit member
2. Chọn "Tên nhóm" dropdown
3. Chọn user group
4. Save
5. `updateMember()` với `userGroupId`
6. Update `workspace_members.user_group_id`
7. Member permissions now từ group

**Status:**
- ✅ UI hoạt động
- ✅ Backend lưu
- ✅ Permissions được apply từ group

### Flow F: Member đăng nhập và dùng app

**Login:**
1. Member login
2. Auto-accept pending invitations
3. Load workspaces (RLS filter by membership)
4. Switch to workspace

**View Profiles:**
1. Member vào ProfilesPage
2. Load profiles từ current workspace
3. ❌ Không filter theo authorization list
4. ❌ Member thấy tất cả profiles trong workspace

**Open Browser:**
1. Member click "Open" trên profile
2. `launchProfile()` được gọi
3. ❌ Không check `profile.open` permission
4. Browser mở

**Run Automation:**
1. Member vào AutomationPage
2. Click "Run" trên script
3. ❌ Không check `automation.run` permission
4. Script chạy

**Issues:**
- ⚠️ Permission model có nhưng không enforce đầy đủ
- ⚠️ Member có thể access tất cả profiles
- ⚠️ Authorization picker không được sử dụng

---

## 10. BUGS & GAPS

### 10.1 CRITICAL

❌ **No Email Sending**
- **Issue:** Invitation không gửi email
- **Impact:** Owner phải manually notify member
- **Location:** `inviteMember()` function
- **Fix:** Integrate email service (SendGrid, AWS SES, Supabase Auth)

❌ **Profile Permission Not Enforced**
- **Issue:** Member có thể open/edit/delete bất kỳ profile nào
- **Impact:** Security risk, member bypass permissions
- **Location:** `src/main/db.ts`, `src/main/browser.ts`
- **Fix:** Add permission checks to profile operations

### 10.2 HIGH

⚠️ **Authorization Picker Unused**
- **Issue:** UI có picker nhưng backend không lưu/sử dụng
- **Impact:** Feature không hoạt động, confusing UX
- **Location:** `MembersPage.tsx` line 697, 723
- **Fix:** Either implement backend support hoặc remove UI

⚠️ **Invitation Token Unused**
- **Issue:** Token generated nhưng không có accept-by-link flow
- **Impact:** Wasted field, confusion
- **Location:** `workspace_invitations.token`
- **Fix:** Implement link-based invitation hoặc remove token

⚠️ **No DELETE Policy for Invitations**
- **Issue:** RLS không có DELETE policy
- **Impact:** Cannot cleanup old invitations
- **Location:** `WORKSPACE-SCHEMA.sql`
- **Fix:** Add DELETE policy

### 10.3 MEDIUM

⚠️ **Accepted Invitation Fallback**
- **Issue:** Hack để show accepted invitations as members
- **Impact:** Code complexity, potential bugs
- **Location:** `getWorkspaceMembers()` line 450-480
- **Fix:** Ensure `accept_pending_invitations` RPC creates member records properly

⚠️ **Permission Mode Not Fully Implemented**
- **Issue:** UI toggle 'group' vs 'profile' mode nhưng không affect behavior
- **Impact:** Misleading setting
- **Location:** `WorkspaceSettingsPage.tsx`
- **Fix:** Implement profile-level authorization

⚠️ **User Group Permissions in Description**
- **Issue:** Permissions stored as JSON string in `description` field
- **Impact:** Hard to query, not normalized
- **Location:** `workspace_user_groups.description`
- **Fix:** Consider separate `permissions` jsonb column

### 10.4 LOW

⚠️ **Mixed Language**
- **Issue:** UI mix English/Vietnamese
- **Impact:** Inconsistent UX
- **Location:** Throughout UI
- **Fix:** Standardize to Vietnamese

⚠️ **No Bulk Member Operations**
- **Issue:** Cannot bulk invite/remove members
- **Impact:** Tedious for large teams
- **Location:** UI
- **Fix:** Add bulk operations

⚠️ **No Member Activity Log**
- **Issue:** Cannot see member activity history
- **Impact:** No audit trail
- **Location:** Missing feature
- **Fix:** Add activity logging

---

## 11. RECOMMENDED MINIMAL SCOPE FOR V1.0.0

### Keep (Essential)

✅ **Core Member Management:**
- Invite member (without email)
- View members list
- Edit member role
- Remove member
- User groups with permissions

✅ **Permission System:**
- Role-based permissions (owner/admin/member/viewer)
- User group permissions
- Permission templates
- UI permission checks

✅ **Database & RLS:**
- Current schema
- RLS policies
- Triggers

### Remove/Postpone (Non-Essential)

❌ **Authorization Picker:**
- Remove from UI hoặc disable
- Không implement backend
- Defer to v1.1.0

❌ **Email Invitations:**
- Keep auto-accept flow
- Document manual notification process
- Defer email integration to v1.1.0

❌ **Invitation Links:**
- Remove token usage
- Keep simple email-match flow
- Defer to v1.1.0

### Fix Before v1.0.0

🔧 **MUST FIX:**
1. **Enforce Profile Permissions**
   - Add checks to `createProfile()`, `deleteProfile()`, `launchProfile()`
   - Check `profile.open`, `profile.create`, `profile.delete`
   - Estimated: 4-6 hours

2. **Enforce Automation Permissions**
   - Add checks to script run operations
   - Check `automation.run`, `automation.create`, `automation.delete`
   - Estimated: 2-3 hours

3. **Remove/Disable Authorization Picker**
   - Comment out UI hoặc hide
   - Remove confusing non-functional feature
   - Estimated: 30 minutes

4. **Add RLS DELETE Policy for Invitations**
   - Allow cleanup of old invitations
   - Estimated: 15 minutes

5. **Document Manual Invitation Process**
   - Add help text in UI
   - Explain owner must notify member manually
   - Estimated: 1 hour

**Total Estimated Time:** 8-11 hours

### Defer to v1.1.0

- Email invitation system
- Invitation links with tokens
- Profile/Group authorization lists
- Bulk member operations
- Activity logging
- Full i18n

---

## 12. QUESTIONS / UNKNOWNS

### For Product Owner

1. **Email Invitations:**
   - Có cần email service cho v1.0.0 không?
   - Nếu có, dùng service nào? (SendGrid, AWS SES, Supabase Auth)
   - Budget cho email service?

2. **Authorization Lists:**
   - Feature "Ủy quyền hồ sơ/nhóm" có quan trọng cho v1.0.0 không?
   - Nếu không, có thể remove UI không?
   - Hoặc implement backend support?

3. **Permission Mode:**
   - 'group' vs 'profile' mode có cần implement đầy đủ không?
   - Hiện tại chỉ là placeholder
   - Scope cho v1.0.0?

4. **Member Limit:**
   - Có giới hạn số members per workspace không?
   - Có cần billing integration không?

### For Technical Team

1. **Profile Permission Enforcement:**
   - Implement ở đâu? `db.ts` hay `browser.ts`?
   - Pattern nào? Middleware hay direct check?

2. **Accepted Invitation Fallback:**
   - Có cần fix hack `invitation:` prefix không?
   - Hoặc accept as-is?

3. **User Group Permissions Storage:**
   - Keep in `description` field?
   - Hoặc migrate to separate `permissions` column?

4. **Testing:**
   - Có cần automated tests cho permission system không?
   - Manual QA checklist?

---

## 13. SUMMARY & NEXT STEPS

### Current State
- ✅ **85% Complete** - Core features working
- ✅ **UI Excellent** - Beautiful, feature-rich
- ✅ **Backend Solid** - Good architecture, RLS
- ⚠️ **Permission Gaps** - Not fully enforced
- ❌ **Email Missing** - No invitation emails

### Recommended Actions

**Immediate (Before v1.0.0):**
1. Enforce profile permissions (4-6h)
2. Enforce automation permissions (2-3h)
3. Remove/disable authorization picker (30m)
4. Add RLS DELETE policy (15m)
5. Document manual invitation (1h)

**Short-term (v1.1.0):**
1. Email invitation system
2. Invitation link flow
3. Profile authorization lists
4. Bulk operations

**Long-term (v1.2.0+):**
1. Activity logging
2. Advanced permissions
3. Team analytics
4. Mobile support

### Conclusion

Members feature đã được implement rất tốt với UI đẹp và backend solid. Vấn đề chính là một số features chưa được wire up đầy đủ (authorization picker) và permission enforcement chưa complete (profile operations). 

Với 8-11 giờ công việc, có thể đưa feature này lên production-ready cho v1.0.0 với scope minimal nhưng functional.

---

**End of Report**


