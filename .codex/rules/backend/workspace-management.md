# Workspace Management - Backend Rule

## Purpose
Define backend patterns for workspace operations, member management, and authorization checks.

## Architecture

### Core Modules
- `src/main/workspaces.ts`: Workspace and member operations
- `src/main/index.ts`: IPC handlers
- `src/main/auth.ts`: Authentication
- `src/main/supabase.ts`: Database client

### Data Flow
```
Frontend (Zustand)
  → IPC call
  → Backend handler
  → workspaces.ts function
  → Supabase (with RLS)
  → Response
```

## Mandatory Patterns

### 1. Always Use workspace_id (UUID)
```typescript
// ✅ CORRECT
const profiles = await getProfiles(currentWorkspaceId)

// ❌ WRONG: Never use workspace name
const profiles = await getProfiles('My Workspace')
```

### 2. Validate User Group for Non-Owners
```typescript
// ✅ CORRECT
export async function assertSameUserGroupOrOwner(
  workspaceId: string,
  targetUserGroupId: string | null
) {
  const member = await getCurrentWorkspaceMember(workspaceId)
  if (isWorkspaceOwner(member)) return

  if (member.userGroupId !== targetUserGroupId) {
    throw new Error('Access denied: different User Group')
  }
}

// Use before operations
await assertSameUserGroupOrOwner(workspaceId, profile.userGroupId)
await deleteProfile(profileId)
```

### 3. Filter by Authorization
```typescript
// ✅ CORRECT: Filter profiles by User Group
export async function filterAuthorizedProfiles(
  profiles: Profile[]
): Promise<Profile[]> {
  const workspaceId = getCurrentWorkspaceId()
  if (!workspaceId) return []

  const member = await getCurrentWorkspaceMember(workspaceId)
  if (isWorkspaceOwner(member)) return profiles

  return profiles.filter(p =>
    p.userGroupId === member.userGroupId
  )
}
```

### 4. Require userGroupId for Invitations
```typescript
// ✅ CORRECT
export async function inviteMember(input: InviteMemberInput) {
  // Reject owner role
  if (input.role === 'owner') {
    throw new Error('Cannot invite as owner')
  }

  // Require userGroupId
  if (!input.userGroupId) {
    throw new Error('userGroupId is required')
  }

  // Validate userGroupId belongs to workspace
  const group = await getSupabase()
    .from('workspace_user_groups')
    .select('id')
    .eq('id', input.userGroupId)
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (!group.data) {
    throw new Error('Invalid userGroupId')
  }

  // Create invitation
  // ...
}
```

## IPC Security

### Pattern: Require Authorization
```typescript
// In src/main/index.ts
ipcMain.handle('profiles:delete', async (_, profileId: string) => {
  const workspaceId = requireCurrentWorkspaceId()
  const profile = requireProfileInCurrentWorkspace(profileId)

  // ✅ Check authorization
  await requireAuthorizedProfileInCurrentWorkspace(profileId)

  // Perform operation
  db.deleteProfile(profileId)
  await cloudSync.deleteProfile(profileId)
})
```

### Pattern: Validate Workspace Scope
```typescript
function requireProfileInCurrentWorkspace(profileId: string): Profile {
  const workspaceId = requireCurrentWorkspaceId()
  const profile = db.getProfiles(workspaceId).find(p => p.id === profileId)

  if (!profile) {
    throw new Error('Profile not found in current workspace')
  }

  return profile
}
```

## Error Handling

### Sanitize Errors
```typescript
function toError(error: unknown, fallback: string): Error {
  const message = describeError(error)
  // Don't expose internal details
  return new Error(message || fallback)
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  // Don't expose raw objects
  return 'Operation failed'
}
```

### Never Log Secrets
```typescript
// ❌ WRONG
console.log('User session:', session)
console.log('API key:', apiKey)

// ✅ CORRECT
console.log('User authenticated:', !!session)
console.log('API configured:', !!apiKey)
```

## Workspace Context

### Current Workspace ID
```typescript
let currentWorkspaceId: string | null = null

export function getCurrentWorkspaceId(): string | null {
  return currentWorkspaceId
}

export async function setCurrentWorkspace(
  workspaceId: string | null
): Promise<void> {
  // Validate access
  if (workspaceId) {
    const member = await getWorkspaceMember(workspaceId, userId)
    if (!member || member.status !== 'active') {
      throw new Error('Access denied')
    }
  }

  currentWorkspaceId = workspaceId
}
```

### Switching Workspaces
```typescript
// When switching, reload all workspace-scoped data
export async function setCurrentWorkspace(workspaceId: string | null) {
  currentWorkspaceId = workspaceId

  // Trigger reload in frontend
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('workspace:changed', workspaceId)
  })
}
```

## Database Queries

### Always Scope by workspace_id
```typescript
// ✅ CORRECT
const { data } = await getSupabase()
  .from('profiles')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('status', 'active')

// ❌ WRONG: Missing workspace_id
const { data } = await getSupabase()
  .from('profiles')
  .select('*')
  .eq('status', 'active')
```

### Trust RLS, Don't Double-Filter
```typescript
// ✅ CORRECT: Let RLS handle filtering
const { data } = await getSupabase()
  .from('profiles')
  .select('*')
  .eq('workspace_id', workspaceId)

// RLS will automatically filter by User Group

// ❌ WRONG: Don't add application-level filtering
// This duplicates RLS logic and can get out of sync
```

## Forbidden Patterns

### ❌ Never Bypass User Group
```typescript
// WRONG
if (member.role === 'admin') {
  return allProfiles // Bypasses User Group!
}
```

### ❌ Never Use Workspace Name
```typescript
// WRONG
const workspace = workspaces.find(w => w.name === 'My Workspace')
```

### ❌ Never Allow NULL userGroupId for Non-Owners
```typescript
// WRONG
if (!input.userGroupId && input.role !== 'owner') {
  // Should throw error, not allow
}
```

## Testing Checklist
- [ ] Operations scoped by workspace_id
- [ ] Authorization checks before mutations
- [ ] User Group validation for non-owners
- [ ] Errors don't leak sensitive data
- [ ] No secrets in logs
- [ ] RLS policies tested
- [ ] IPC handlers validate input

## Related Files
- `src/main/workspaces.ts`
- `src/main/index.ts`
- `src/main/db.ts`
- `src/main/cloudSync.ts`
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/backend/ipc-security.md`
