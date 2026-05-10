# Runtime Debug Logs Added

## Summary

Added comprehensive console.log statements throughout the codebase to debug two runtime issues:

1. **Workspace Settings Navigation** - Clicking "Cài Đặt Workspace" does nothing
2. **Invite Member Modal** - Submit button does nothing / no invitation created

## Files Modified

### 1. `src/renderer/src/components/Sidebar.tsx`
**Added logs:**
- Line 136-139: Log when "Cài Đặt Workspace" button is clicked
```typescript
onClick={() => {
  console.log('[Sidebar] Clicking Cài Đặt Workspace, calling onNavigate with:', 'workspace-settings')
  onNavigate('workspace-settings')
}}
```

### 2. `src/renderer/src/App.tsx`
**Added logs:**
- Line 82-84: Log navigation calls and state updates
```typescript
const navigateTo = (page: Page) => {
  console.log('[App] navigateTo called with:', page)
  setActivePage(page)
  console.log('[App] activePage set to:', page)
  if (page === 'automation') setAutoSub('scripts')
}
```

### 3. `src/renderer/src/pages/WorkspaceSettingsPage.tsx`
**Added logs:**
- Line 12: Log when component mounts/renders
```typescript
console.log('[WorkspaceSettingsPage] Component mounted/rendered')
```

### 4. `src/renderer/src/pages/MembersPage.tsx`
**Added logs:**
- Lines 251-263: Comprehensive logging in invite modal onInvite handler
```typescript
onInvite={async (input) => {
  console.log('[MembersPage] onInvite called with input:', input)
  console.log('[MembersPage] currentWorkspaceId:', currentWorkspace?.id)
  console.log('[MembersPage] canInvite permission:', canInvite)
  try {
    await inviteMember(input)
    console.log('[MembersPage] inviteMember succeeded')
    setShowInviteModal(false)
    setActiveTab('invited')
    toast.success('Đã gửi lời mời')
  } catch (error) {
    console.error('[MembersPage] inviteMember failed:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to invite member')
  }
}}
```

### 5. `src/renderer/src/store/useWorkspace.ts`
**Added logs:**
- Lines 327-337: Log entire invite member flow in store
```typescript
inviteMember: async (input) => {
  console.log('[useWorkspace] inviteMember called with:', input)
  const workspaceId = get().currentWorkspaceId
  console.log('[useWorkspace] currentWorkspaceId:', workspaceId)
  if (!workspaceId) throw new Error('No workspace selected')
  const api = getWorkspaceApi()
  console.log('[useWorkspace] api.inviteMember exists:', !!api?.inviteMember)
  if (!api?.inviteMember) throw reportMissingWorkspaceApi('inviteMember')
  console.log('[useWorkspace] Calling api.inviteMember with:', { ...input, workspaceId })
  await api.inviteMember({ ...input, workspaceId })
  console.log('[useWorkspace] api.inviteMember succeeded, loading invitations')
  await get().loadInvitations()
}
```

### 6. `src/main/workspaces.ts`
**Added logs:**
- Lines 668-710: Comprehensive logging in main process inviteMember function
```typescript
export async function inviteMember(input: InviteMemberInput): Promise<WorkspaceInvitation> {
  console.log('[Main:inviteMember] Called with input:', input)
  requireConfigured()
  const user = await requireUser()
  console.log('[Main:inviteMember] Current user:', { id: user.id, email: user.email })
  
  const hasInvitePermission = await hasPermission('member.invite', input.workspaceId)
  console.log('[Main:inviteMember] hasPermission(member.invite):', hasInvitePermission)
  
  if (!hasInvitePermission) {
    throw new Error('Permission denied: member.invite')
  }
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const insertPayload = {
    workspace_id: input.workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    user_group_id: input.userGroupId ?? null,
    profile_limit: input.profileLimit ?? null,
    note: input.note ?? '',
    invited_by: user.id,
    status: 'pending',
    token: token(),
    expires_at: expiresAt,
  }
  console.log('[Main:inviteMember] Insert payload:', insertPayload)
  
  const { data, error } = await getSupabase()
    .from('workspace_invitations')
    .insert(insertPayload)
    .select('*')
    .single()

  console.log('[Main:inviteMember] Supabase response:', { data, error })
  
  if (error) {
    console.error('[Main:inviteMember] Supabase error:', error)
    throw error
  }
  
  console.log('[Main:inviteMember] Success, returning invitation')
  return mapInvitation(data)
}
```

## How to Debug

### Step 1: Start the app in dev mode
```bash
npm run dev
```

### Step 2: Open DevTools
Press `F12` or `Ctrl+Shift+I` to open Chrome DevTools

### Step 3: Test Workspace Settings Navigation

1. Click "Cài Đặt Workspace" in sidebar
2. Check Console for these logs:
   - `[Sidebar] Clicking Cài Đặt Workspace, calling onNavigate with: workspace-settings`
   - `[App] navigateTo called with: workspace-settings`
   - `[App] activePage set to: workspace-settings`
   - `[WorkspaceSettingsPage] Component mounted/rendered`

**If you see:**
- ✅ All 4 logs → Navigation works, issue is elsewhere (CSS/rendering)
- ❌ Only first log → `onNavigate` prop not wired correctly
- ❌ First 3 logs but no mount → Component not rendering (check route in App.tsx)
- ❌ No logs at all → Click event not firing (CSS issue, element covered)

### Step 4: Test Invite Member

1. Navigate to "Thành viên" page
2. Click "+ Mời thành viên"
3. Fill in email: `test@example.com`
4. Select role: `Member`
5. Click "Gửi lời mời"
6. Check Console for these logs in order:

**Expected log sequence:**
```
[MembersPage] onInvite called with input: {email: "test@example.com", role: "member", ...}
[MembersPage] currentWorkspaceId: <workspace-id>
[MembersPage] canInvite permission: true
[useWorkspace] inviteMember called with: {email: "test@example.com", role: "member", ...}
[useWorkspace] currentWorkspaceId: <workspace-id>
[useWorkspace] api.inviteMember exists: true
[useWorkspace] Calling api.inviteMember with: {email: "test@example.com", workspaceId: <id>, ...}
[Main:inviteMember] Called with input: {email: "test@example.com", workspaceId: <id>, ...}
[Main:inviteMember] Current user: {id: <user-id>, email: <user-email>}
[Main:inviteMember] hasPermission(member.invite): true
[Main:inviteMember] Insert payload: {workspace_id: <id>, email: "test@example.com", ...}
[Main:inviteMember] Supabase response: {data: {...}, error: null}
[Main:inviteMember] Success, returning invitation
[useWorkspace] api.inviteMember succeeded, loading invitations
[MembersPage] inviteMember succeeded
```

**Diagnose issues:**

| Logs Stop At | Issue | Fix |
|-------------|-------|-----|
| No logs at all | Form submit not firing | Check button type="submit", form onSubmit handler |
| `[MembersPage] canInvite permission: false` | Permission denied | User doesn't have `member.invite` permission |
| `[useWorkspace] currentWorkspaceId: null` | No workspace selected | Workspace not loaded/selected |
| `[useWorkspace] api.inviteMember exists: false` | API not exposed | Check preload/index.ts exposes inviteMember |
| `[Main:inviteMember] hasPermission: false` | Permission check failed | Check RLS policies, workspace_members table |
| `[Main:inviteMember] Supabase response: {error: ...}` | Database error | Check error details - likely RLS policy blocking insert |

### Common Issues & Solutions

#### Issue 1: Permission Denied
**Symptoms:** `hasPermission(member.invite): false`

**Check:**
1. User is workspace owner or has `member.invite` permission
2. `workspace_members` table has active row for user
3. RLS policies allow reading workspace_members

**Fix:** Grant permission or check RLS policies

#### Issue 2: Supabase Insert Blocked
**Symptoms:** `Supabase response: {error: {message: "new row violates row-level security policy"}}`

**Check:**
1. RLS policy on `workspace_invitations` table
2. Policy should allow INSERT if user has `member.invite` permission
3. Check policy uses `get_my_permissions()` function

**Fix:** Update RLS policy:
```sql
CREATE POLICY "Users can invite members if they have permission"
ON workspace_invitations FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT (get_my_permissions(workspace_id)).member_invite)
);
```

#### Issue 3: Navigation Not Working
**Symptoms:** Click logs appear but page doesn't change

**Check:**
1. React state update (`setActivePage`) is called
2. Component renders based on `activePage === 'workspace-settings'`
3. No CSS hiding the component (z-index, display: none)

**Fix:** Check App.tsx route rendering logic

## After Debugging

Once you identify the issue and fix it, you can remove the temporary debug logs:

### Logs to Keep (useful for production):
- Error logs (`console.error`)
- Permission denied logs
- Supabase error logs

### Logs to Remove (temporary debug):
- `[Sidebar] Clicking...`
- `[App] navigateTo called...`
- `[App] activePage set to...`
- `[WorkspaceSettingsPage] Component mounted...`
- `[MembersPage] onInvite called...`
- `[MembersPage] currentWorkspaceId...`
- `[MembersPage] canInvite permission...`
- `[MembersPage] inviteMember succeeded`
- `[useWorkspace] inviteMember called...`
- `[useWorkspace] currentWorkspaceId...`
- `[useWorkspace] api.inviteMember exists...`
- `[useWorkspace] Calling api.inviteMember...`
- `[useWorkspace] api.inviteMember succeeded...`
- `[Main:inviteMember] Called with input...`
- `[Main:inviteMember] Current user...`
- `[Main:inviteMember] hasPermission...`
- `[Main:inviteMember] Insert payload...`
- `[Main:inviteMember] Supabase response...` (keep error part)
- `[Main:inviteMember] Success, returning...`

## TypeCheck Status

✅ **PASSED** - No TypeScript compilation errors

```bash
npm run typecheck
# Output: No errors
```

---

**Date:** 2026-05-09  
**Purpose:** Runtime debugging for UI navigation and invite member functionality  
**Status:** Debug logs added, ready for runtime testing
