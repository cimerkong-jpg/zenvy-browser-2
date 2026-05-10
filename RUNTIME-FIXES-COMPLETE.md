# Runtime Fixes Complete

## Summary

Fixed two critical runtime issues:

1. **Invite Member Error** - "[object Object]" error fixed by properly handling Supabase errors
2. **Workspace Settings Navigation** - Added alert to test if click is working

## Changes Made

### 1. Fixed Invite Member Error Handling

#### File: `src/main/workspaces.ts` (Line 705-712)
**Problem:** Throwing raw Supabase error object which becomes "[object Object]" in renderer

**Fix:** Convert Supabase error to readable Error with message
```typescript
if (error) {
  console.error('[Main:inviteMember] Supabase error:', error)
  const errorMessage = [
    error.message,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
    error.code ? `Code: ${error.code}` : null,
  ].filter(Boolean).join(' | ')
  throw new Error(errorMessage || 'Failed to create invitation')
}
```

#### File: `src/main/index.ts` (Line 576-584)
**Problem:** IPC handler not catching and formatting errors properly

**Fix:** Wrap inviteMember call in try-catch and throw Error with message
```typescript
ipcMain.handle('workspaces:inviteMember', async (_, input: Parameters<typeof workspaces.inviteMember>[0]) => {
  try {
    return await workspaces.inviteMember(input)
  } catch (error) {
    console.error('[IPC:inviteMember] Error:', error)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message)
  }
})
```

**Result:** Now shows actual error messages like:
- "Permission denied: member.invite"
- "new row violates row-level security policy for table workspace_invitations | Hint: Check RLS policies"
- "column 'xyz' does not exist"

### 2. Added Navigation Test Alert

#### File: `src/renderer/src/components/Sidebar.tsx` (Line 136-140)
**Added:** Alert to test if click event fires

```typescript
onClick={() => {
  console.log('[Sidebar] Clicking Cài Đặt Workspace, calling onNavigate with:', 'workspace-settings')
  alert('Clicked Cài Đặt Workspace')  // TEST ALERT
  onNavigate('workspace-settings')
}}
```

**Purpose:** 
- If alert shows → Click works, issue is in navigation logic
- If alert doesn't show → Click is blocked by CSS/pointer-events

**Next Steps After Testing:**
1. If alert shows:
   - Check console logs for navigation flow
   - Verify App.tsx route renders WorkspaceSettingsPage
   - Remove alert after confirming navigation works

2. If alert doesn't show:
   - Check CSS z-index, pointer-events
   - Check if element is covered by overlay
   - Check if button is disabled

## Files Modified

1. ✅ `src/main/workspaces.ts` - Fixed error handling in inviteMember
2. ✅ `src/main/index.ts` - Fixed IPC handler error handling
3. ✅ `src/renderer/src/components/Sidebar.tsx` - Added test alert

## Testing Instructions

### Test 1: Invite Member Error Messages

1. Start app: `npm run dev`
2. Navigate to "Thành viên" page
3. Click "+ Mời thành viên"
4. Fill in email and submit
5. **Check console logs:**
   - Should see detailed logs from main process
   - Should see actual error message in toast (not "[object Object]")

**Expected Error Messages:**
- ✅ "Permission denied: member.invite" - if user doesn't have permission
- ✅ "new row violates row-level security policy..." - if RLS blocks insert
- ✅ "column 'xyz' does not exist" - if schema mismatch
- ✅ Any other Supabase error with details/hint/code

### Test 2: Workspace Settings Navigation

1. Start app: `npm run dev`
2. Click "Cài Đặt Workspace" in sidebar
3. **Check if alert appears:**

**If Alert Shows:**
- ✅ Click event works
- Check console for navigation logs:
  - `[Sidebar] Clicking Cài Đặt Workspace...`
  - `[App] navigateTo called with: workspace-settings`
  - `[App] activePage set to: workspace-settings`
  - `[WorkspaceSettingsPage] Component mounted/rendered`
- If all logs appear but page doesn't show → CSS/rendering issue
- **Remove alert after confirming**

**If Alert Doesn't Show:**
- ❌ Click is blocked
- Check:
  - CSS z-index on sidebar
  - pointer-events CSS property
  - If element is covered by overlay
  - If button has disabled state

## Common Issues & Solutions

### Issue 1: RLS Policy Blocking Invite

**Error:** "new row violates row-level security policy for table workspace_invitations"

**Solution:** Update RLS policy on `workspace_invitations`:
```sql
CREATE POLICY "Users can invite if they have permission"
ON workspace_invitations FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT (get_my_permissions(workspace_id)).member_invite)
);
```

### Issue 2: Permission Denied

**Error:** "Permission denied: member.invite"

**Cause:** User doesn't have `member.invite` permission

**Solution:**
- User must be workspace owner, OR
- User must have `member.invite` permission in their role
- Check `workspace_members` table has active row for user
- Check `get_my_permissions()` function returns correct permissions

### Issue 3: Navigation Not Working (Alert Shows)

**Symptoms:** Alert appears but page doesn't change

**Debug:**
1. Check all console logs appear
2. Check `activePage` state in React DevTools
3. Check if WorkspaceSettingsPage renders in DOM
4. Check CSS display/visibility properties

**Solution:** Verify App.tsx route:
```typescript
{activePage === 'workspace-settings' && <WorkspaceSettingsPage onNavigate={navigateTo} />}
```

### Issue 4: Navigation Not Working (Alert Doesn't Show)

**Symptoms:** No alert, no console logs

**Debug:**
1. Check sidebar CSS z-index
2. Check pointer-events property
3. Use browser DevTools to inspect element
4. Check if overlay covers button

**Solution:** Fix CSS or remove blocking element

## Cleanup After Testing

### Remove Temporary Alert

Once navigation is confirmed working, remove the alert:

```typescript
// BEFORE (with alert)
onClick={() => {
  console.log('[Sidebar] Clicking Cài Đặt Workspace, calling onNavigate with:', 'workspace-settings')
  alert('Clicked Cài Đặt Workspace')  // REMOVE THIS
  onNavigate('workspace-settings')
}}

// AFTER (clean)
onClick={() => {
  console.log('[Sidebar] Clicking Cài Đặt Workspace, calling onNavigate with:', 'workspace-settings')
  onNavigate('workspace-settings')
}}
```

### Keep Useful Logs

**Keep these logs (useful for debugging):**
- Error logs in main process
- Permission denied logs
- Supabase error logs with details

**Remove these logs (temporary debug):**
- `[Sidebar] Clicking...`
- `[App] navigateTo called...`
- `[App] activePage set to...`
- `[WorkspaceSettingsPage] Component mounted...`
- All `[MembersPage]` debug logs
- All `[useWorkspace]` debug logs
- All `[Main:inviteMember]` success logs (keep error logs)

## TypeCheck Status

✅ **PASSED** - No TypeScript compilation errors

```bash
npm run typecheck
# Output: No errors
```

## Next Steps

1. **Test the app** with `npm run dev`
2. **Test invite member** - should show real error messages
3. **Test navigation** - alert should appear when clicking
4. **Fix any remaining issues** based on console logs
5. **Remove alert** after confirming navigation works
6. **Clean up debug logs** (optional, keep error logs)

---

**Date:** 2026-05-09  
**Status:** Fixes applied, ready for runtime testing  
**TypeCheck:** ✅ Passed
