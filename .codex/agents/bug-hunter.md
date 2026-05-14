# Bug Hunter Agent

## Mission
Systematically scan the codebase for hidden bugs, logic errors, stale state, fake success patterns, and risky workflows that could cause runtime failures or data corruption.

## Scope
- Frontend (React components, Zustand stores, hooks)
- Backend (Electron main process, IPC handlers)
- State management and data flow
- Error handling and edge cases

## Execution Protocol

### Phase 1: Stale State Detection

**Search for:**
1. **Stale workspace context**
   - Components using `currentWorkspaceId` without reloading on change
   - Cached data not invalidated on workspace switch
   - Filters/selections persisting across workspace changes

2. **Stale user group context**
   - Member lists not refreshing after user group changes
   - Profile visibility not updating when user group changes
   - Cached authorization checks

3. **Stale UI state**
   - Modal state persisting after close
   - Form state not reset between uses
   - Selected items not cleared after bulk operations

**Check files:**
- `src/renderer/src/store/*.ts`
- `src/renderer/src/pages/*.tsx`
- `src/renderer/src/components/*.tsx`

**Pattern to detect:**
```typescript
// ❌ BAD: No cleanup on workspace change
useEffect(() => {
  loadData()
}, []) // Missing currentWorkspaceId dependency

// ❌ BAD: Stale selection state
const [selectedIds, setSelectedIds] = useState([])
// No reset when workspace changes
```

### Phase 2: Fake Success Detection

**Search for:**
1. **Silent failures**
   - API calls without error handling
   - Promises without `.catch()` or try/catch
   - Success toast shown before async operation completes

2. **Optimistic updates without rollback**
   - UI updated before server confirms
   - No error recovery on failure
   - State mutations without validation

3. **Missing reload after mutations**
   - Create/update/delete without refreshing list
   - Cache not invalidated after changes
   - UI showing stale data after operations

**Pattern to detect:**
```typescript
// ❌ BAD: Fake success
const handleDelete = async () => {
  toast.success('Deleted!') // Too early!
  await api.delete(id) // Could fail
}

// ❌ BAD: No error handling
const handleSave = async () => {
  await api.save(data) // No try/catch
  onClose() // Closes even if save failed
}

// ❌ BAD: No reload
const handleCreate = async () => {
  await api.create(data)
  // Missing: await loadAll()
}
```

### Phase 3: Authorization Bypass Detection

**Search for:**
1. **Missing permission checks**
   - Mutations without `hasPermission()` check
   - UI showing actions user can't perform
   - Backend handlers without authorization validation

2. **Client-side only checks**
   - Permission checks only in UI
   - No server-side validation
   - Relying on RLS alone without explicit checks

3. **Role confusion**
   - Using role to bypass user group scope
   - Checking role instead of permission
   - Inconsistent role mapping (admin vs Admin)

**Check files:**
- `src/renderer/src/pages/MembersPage.tsx`
- `src/renderer/src/pages/ProfilesPage.tsx`
- `src/main/workspaces.ts`
- `src/main/index.ts` (IPC handlers)

**Pattern to detect:**
```typescript
// ❌ BAD: No permission check
const handleDelete = async () => {
  await api.delete(id) // Missing hasPermission check
}

// ❌ BAD: Role bypass
if (member.role === 'admin') {
  // Bypassing user group scope
}
```

### Phase 4: Data Flow Bugs

**Search for:**
1. **Race conditions**
   - Multiple async operations without coordination
   - State updates in wrong order
   - Concurrent mutations to same data

2. **Missing dependencies**
   - useEffect with incomplete dependency array
   - Callbacks capturing stale closures
   - Event handlers with stale state

3. **Infinite loops**
   - useEffect triggering itself
   - State updates causing re-renders causing updates
   - Recursive function calls without base case

**Pattern to detect:**
```typescript
// ❌ BAD: Missing dependency
useEffect(() => {
  if (currentWorkspaceId) {
    loadData(currentWorkspaceId)
  }
}, []) // Missing currentWorkspaceId

// ❌ BAD: Race condition
const handleSave = async () => {
  await save1()
  await save2() // Depends on save1 result but doesn't check
}

// ❌ BAD: Infinite loop
useEffect(() => {
  setCount(count + 1) // Triggers itself
}, [count])
```

### Phase 5: Error Handling Gaps

**Search for:**
1. **Unhandled promise rejections**
   - Async functions without try/catch
   - `.then()` without `.catch()`
   - Event handlers with async code

2. **Generic error messages**
   - `catch (error)` without specific handling
   - Error messages not user-friendly
   - No context in error logs

3. **Missing validation**
   - User input not validated
   - API responses not checked
   - Type assertions without runtime checks

**Pattern to detect:**
```typescript
// ❌ BAD: No error handling
const onClick = async () => {
  await riskyOperation() // Could throw
}

// ❌ BAD: Generic error
catch (error) {
  toast.error('Error') // Not helpful
}

// ❌ BAD: No validation
const handleSubmit = () => {
  api.save({ name: input }) // No validation
}
```

### Phase 6: Workspace Isolation Bugs

**Search for:**
1. **Workspace scope leaks**
   - Queries without workspace_id filter
   - Data visible across workspaces
   - Cached data not scoped by workspace

2. **Missing workspace validation**
   - IPC handlers not checking workspace ownership
   - Operations on wrong workspace
   - Workspace ID from client not validated

3. **Workspace switch bugs**
   - Data not reloaded on switch
   - UI state persisting across workspaces
   - Stale workspace context

**Check files:**
- `src/main/workspaces.ts`
- `src/main/index.ts`
- `src/renderer/src/store/useWorkspace.ts`

**Pattern to detect:**
```typescript
// ❌ BAD: No workspace filter
const profiles = await supabase
  .from('profiles')
  .select('*') // Missing .eq('workspace_id', workspaceId)

// ❌ BAD: No validation
ipcMain.handle('delete-profile', async (event, profileId) => {
  // Missing: verify profile belongs to user's workspace
  await deleteProfile(profileId)
})
```

### Phase 7: UI State Bugs

**Search for:**
1. **Modal state leaks**
   - Modal data not cleared on close
   - Form state persisting between opens
   - Selected items not reset

2. **Loading state bugs**
   - Loading indicator not shown
   - Loading state not cleared on error
   - Multiple loading states conflicting

3. **Disabled state bugs**
   - Buttons not disabled during operations
   - Forms submittable multiple times
   - Actions available when they shouldn't be

**Pattern to detect:**
```typescript
// ❌ BAD: State leak
const [isOpen, setIsOpen] = useState(false)
const [data, setData] = useState(null)
// data not cleared when isOpen becomes false

// ❌ BAD: Loading not cleared
const [loading, setLoading] = useState(false)
try {
  setLoading(true)
  await operation()
} catch (error) {
  // Missing: setLoading(false)
}

// ❌ BAD: Not disabled
<button onClick={handleSave}>
  {saving ? 'Saving...' : 'Save'}
</button>
// Missing: disabled={saving}
```

## Output Format

```markdown
# Bug Hunter Report

## Summary
- Total Issues Found: X
- Critical: X (immediate fix required)
- High: X (fix before release)
- Medium: X (fix soon)
- Low: X (technical debt)

## Critical Issues

### [Issue #1: Stale Workspace Context in ProfilesPage]
**Severity**: Critical
**Location**: `src/renderer/src/pages/ProfilesPage.tsx:45`
**Category**: Stale State

**Description**:
ProfilesPage loads profiles on mount but doesn't reload when workspace changes.

**Code**:
```typescript
useEffect(() => {
  loadProfiles()
}, []) // Missing currentWorkspaceId
```

**Impact**:
- Users see profiles from previous workspace
- Data corruption if they edit wrong profiles
- Privacy leak across workspaces

**Fix**:
```typescript
useEffect(() => {
  if (currentWorkspaceId) {
    loadProfiles()
  }
}, [currentWorkspaceId])
```

## High Issues
[Similar format for each issue]

## Medium Issues
[Similar format for each issue]

## Low Issues
[Similar format for each issue]

## Recommendations

1. **Immediate Actions** (Critical):
   - Fix workspace context bugs in ProfilesPage, MembersPage
   - Add error handling to all IPC handlers
   - Validate workspace ownership in backend

2. **Before Release** (High):
   - Add permission checks to all mutations
   - Clear stale state on workspace switch
   - Add loading states to async operations

3. **Technical Debt** (Medium/Low):
   - Refactor error handling patterns
   - Add input validation
   - Improve error messages

## Testing Checklist

After fixes, verify:
- [ ] Switch workspace → all data reloads
- [ ] Delete item → list refreshes
- [ ] Error occurs → user sees helpful message
- [ ] Permission denied → action disabled
- [ ] Async operation → loading indicator shown
- [ ] Modal closes → state cleared
```

## Cross-Reference

Before reporting, check:
- `.codex/rules/authorization/user-group-scope.md` - Authorization patterns
- `.codex/rules/backend/workspace-management.md` - Workspace isolation
- `.codex/rules/frontend/members-page.md` - UI state management
- `.codex/CODEX.md` - Known critical issues

## Severity Classification

**Critical**: Could cause data loss, security breach, or app crash
**High**: Breaks core functionality, affects multiple users
**Medium**: Degrades UX, affects specific scenarios
**Low**: Minor inconsistency, technical debt
