# IPC Security - Backend Rule

## Purpose
Define security patterns for Electron IPC handlers to prevent unauthorized access and data leakage.

## Critical Principles

### 1. Always Validate Workspace Scope
Every IPC handler that touches workspace data MUST validate the resource belongs to the current workspace.

### 2. Always Check Authorization
Every mutation MUST check if the user has permission to perform the action.

### 3. Never Trust Frontend Input
Validate all input parameters. Frontend can be manipulated.

## Mandatory Patterns

### Pattern 1: Require Current Workspace
```typescript
function requireCurrentWorkspaceId(): string {
  const workspaceId = workspaces.getCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error('No workspace selected')
  }
  return workspaceId
}

// Use in every handler
ipcMain.handle('profiles:create', async (_, data) => {
  const workspaceId = requireCurrentWorkspaceId()
  return db.createProfile(data, workspaceId)
})
```

### Pattern 2: Require Resource in Workspace
```typescript
function requireProfileInCurrentWorkspace(profileId: string): Profile {
  const workspaceId = requireCurrentWorkspaceId()
  const profiles = db.getProfiles(workspaceId)
  const profile = profiles.find(p => p.id === profileId)

  if (!profile) {
    throw new Error('Profile not found in current workspace')
  }

  return profile
}

// Use before operations
ipcMain.handle('profiles:delete', async (_, profileId: string) => {
  const profile = requireProfileInCurrentWorkspace(profileId)
  // Now safe to delete
  db.deleteProfile(profileId)
})
```

### Pattern 3: Require Authorization
```typescript
async function requireAuthorizedProfileInCurrentWorkspace(
  profileId: string
): Promise<Profile> {
  const profile = requireProfileInCurrentWorkspace(profileId)

  // Check User Group authorization
  await workspaces.assertProfileAuthorized(profile)

  return profile
}

// Use for sensitive operations
ipcMain.handle('profiles:update', async (_, profileId, data) => {
  await requireAuthorizedProfileInCurrentWorkspace(profileId)
  return db.updateProfile(profileId, data)
})
```

## IPC Handler Template

```typescript
ipcMain.handle('resource:action', async (_, param1, param2) => {
  try {
    // 1. Validate workspace context
    const workspaceId = requireCurrentWorkspaceId()

    // 2. Validate resource belongs to workspace
    const resource = requireResourceInCurrentWorkspace(param1)

    // 3. Check authorization
    await requireAuthorizedResource(param1)

    // 4. Validate input
    if (!param2 || typeof param2 !== 'string') {
      throw new Error('Invalid input')
    }

    // 5. Perform operation
    const result = await performOperation(resource, param2)

    // 6. Return result
    return result

  } catch (error) {
    // 7. Sanitize error
    throw ipcError(error, 'Operation failed')
  }
})
```

## Error Handling

### Sanitize Errors
```typescript
function ipcError(error: unknown, fallback: string): Error {
  // Don't expose internal details
  if (error instanceof Error) {
    // Filter out sensitive info
    const message = error.message
      .replace(/\/Users\/[^\/]+/g, '/Users/***')
      .replace(/[a-f0-9-]{36}/g, '***')
    return new Error(message)
  }
  return new Error(fallback)
}
```

### Never Log Secrets
```typescript
// ❌ WRONG
console.log('[IPC] Session:', session)
console.log('[IPC] Cookie:', cookie)

// ✅ CORRECT
console.log('[IPC] Has session:', !!session)
console.log('[IPC] Cookie count:', cookies.length)
```

## Input Validation

### Validate Types
```typescript
ipcMain.handle('profiles:create', async (_, data: unknown) => {
  // Validate structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid profile data')
  }

  const profile = data as Partial<Profile>

  // Validate required fields
  if (!profile.name || typeof profile.name !== 'string') {
    throw new Error('Profile name is required')
  }

  // Sanitize input
  const sanitized = {
    name: profile.name.trim(),
    userAgent: profile.userAgent?.trim() || '',
    // ...
  }

  return db.createProfile(sanitized, workspaceId)
})
```

### Validate IDs
```typescript
function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

ipcMain.handle('profiles:get', async (_, profileId: string) => {
  if (!isValidUuid(profileId)) {
    throw new Error('Invalid profile ID')
  }
  // ...
})
```

## Workspace Operations

### Members
```typescript
// Get members - requires workspace context
ipcMain.handle('workspaces:getMembers', async (_, workspaceId: string) => {
  // Validate user has access to this workspace
  const member = await workspaces.getCurrentWorkspaceMember(workspaceId)
  if (!member || member.status !== 'active') {
    throw new Error('Access denied')
  }

  return workspaces.getWorkspaceMembers(workspaceId)
})

// Invite member - requires permission
ipcMain.handle('workspaces:inviteMember', async (_, input) => {
  const workspaceId = requireCurrentWorkspaceId()

  // Check permission
  const hasPermission = await workspaces.hasPermission('member.invite', workspaceId)
  if (!hasPermission) {
    throw new Error('Permission denied')
  }

  return workspaces.inviteMember(input)
})
```

### Profiles
```typescript
// Get profiles - filtered by authorization
ipcMain.handle('profiles:getAll', async () => {
  const workspaceId = requireCurrentWorkspaceId()
  const profiles = db.getProfiles(workspaceId)

  // Filter by User Group authorization
  return workspaces.filterAuthorizedProfiles(profiles)
})

// Delete profile - requires authorization
ipcMain.handle('profiles:delete', async (_, profileId: string) => {
  const workspaceId = requireCurrentWorkspaceId()
  const profile = requireProfileInCurrentWorkspace(profileId)

  // Check User Group authorization
  await workspaces.assertProfileAuthorized(profile)

  // Perform deletion
  db.deleteProfile(profileId)
  await cloudSync.deleteProfile(profileId)
})
```

### Runtime, History, and Scheduler State
Runtime state is workspace data. It must be filtered in the main process before it reaches the renderer.

Required:
- `browser:running` returns only running profile IDs that belong to the current workspace and are profile-authorized for the current member.
- `history:getAll`, `history:delete`, and `history:clear` are scoped by current workspace and authorized profile IDs.
- Scheduled task execution re-checks workspace membership, User Group scope, role permission, and profile authorization at execution time.

Forbidden:
- Returning global running profile IDs to the renderer.
- Returning automation history without `workspaceId` and profile authorization filtering.
- Running a scheduled task only because it was authorized when it was created.

## Forbidden Patterns

### ❌ Never Skip Workspace Validation
```typescript
// WRONG: No workspace check
ipcMain.handle('profiles:delete', async (_, profileId) => {
  db.deleteProfile(profileId) // Could delete from any workspace!
})
```

### ❌ Never Trust Frontend Authorization
```typescript
// WRONG: Frontend says user has permission
ipcMain.handle('members:remove', async (_, memberId, hasPermission) => {
  if (hasPermission) { // Frontend can lie!
    await removeMember(memberId)
  }
})

// CORRECT: Check permission in backend
ipcMain.handle('members:remove', async (_, memberId) => {
  const hasPermission = await workspaces.hasPermission('member.remove')
  if (!hasPermission) throw new Error('Permission denied')
  await removeMember(memberId)
})
```

### ❌ Never Expose Internal Paths
```typescript
// WRONG: Exposes file system structure
throw new Error(`File not found: /Users/john/app/data/profiles.json`)

// CORRECT: Sanitized error
throw new Error('Profile data not found')
```

## Testing Checklist
- [ ] All handlers validate workspace context
- [ ] All mutations check authorization
- [ ] All input is validated and sanitized
- [ ] Errors don't leak sensitive data
- [ ] No secrets in logs
- [ ] Resource IDs are validated
- [ ] Cross-workspace access is prevented

## Related Files
- `src/main/index.ts`
- `src/main/workspaces.ts`
- `src/preload/index.ts`
- `.codex/rules/backend/workspace-management.md`
- `.codex/rules/authorization/user-group-scope.md`
