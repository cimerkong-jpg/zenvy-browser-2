# Members Page - Frontend Rule

## Purpose
Define UI patterns and state management for the Members management page.

## Architecture

### Component Structure
```
MembersPage
├─> Sidebar (User Groups list)
├─> Tabs (Members / Invited / Permissions)
├─> MembersTab (filtered member list)
├─> InvitationsTab (pending invitations)
├─> PermissionsTab (role permissions)
└─> Modals (Invite / Edit / Group management)
```

### State Management
- **Zustand Store**: `useWorkspace` - workspace, members, invitations, groups
- **Local State**: selectedGroup, searchQuery, activeTab, modals
- **Computed**: manageableMembers, filteredMembers, groupCounts

## Critical Rules

### 1. Filter Out Owners from Manageable List
```typescript
// ✅ CORRECT: Owners are never "manageable"
const manageableMembers = useMemo(() => {
  return members.filter(m =>
    m.role !== 'owner' && m.status === 'active'
  )
}, [members])

// ❌ WRONG: Including owners
const manageableMembers = members.filter(m => m.status === 'active')
```

### 2. Reset selectedGroup on Workspace Change
```typescript
// ✅ CORRECT: Validate group belongs to current workspace
useEffect(() => {
  if (!currentWorkspace?.id) {
    setSelectedGroup(null)
    return
  }

  const groupBelongsToWorkspace = userGroups.some(
    g => g.id === selectedGroup
  )

  if (!selectedGroup || !groupBelongsToWorkspace) {
    setSelectedGroup(userGroups[0]?.id ?? null)
  }
}, [currentWorkspace?.id, userGroups, selectedGroup])
```

### 3. Reload All Data After Mutations
```typescript
// ✅ CORRECT: Comprehensive reload
const inviteMember = async (input) => {
  await api.inviteMember(input)

  // Reload everything that might have changed
  await Promise.all([
    loadMembers(),
    loadInvitations(),
    loadWorkspaces(),
    loadPermissions()
  ])
}

// ❌ WRONG: Partial reload
const inviteMember = async (input) => {
  await api.inviteMember(input)
  await loadInvitations() // Missing members reload!
}
```

### 4. Context-Aware Empty States
```typescript
// ✅ CORRECT: Different messages for different states
const getEmptyMessage = () => {
  if (userGroups.length === 0) {
    return {
      title: 'Chưa có nhóm người dùng',
      description: 'Tạo nhóm trước khi mời thành viên'
    }
  }
  if (selectedGroup) {
    const groupName = userGroups.find(g => g.id === selectedGroup)?.name
    return {
      title: 'Nhóm này chưa có thành viên',
      description: `Mời thành viên vào nhóm ${groupName}`
    }
  }
  return {
    title: 'Chưa có thành viên',
    description: 'Mời thành viên để cộng tác'
  }
}
```

## Data Flow

### Loading Members
```typescript
// 1. User opens Members page
useEffect(() => {
  refreshWorkspaceData()
}, [currentWorkspace?.id])

// 2. Store loads from backend
const loadMembers = async () => {
  const data = await window.api.workspaces.getMembers(workspaceId)
  setMembers(data)
}

// 3. Component filters for display
const manageableMembers = members.filter(m => m.role !== 'owner')
const filteredMembers = manageableMembers.filter(m =>
  m.userGroupId === selectedGroup
)
```

### Inviting Members
```typescript
// 1. User fills invite form
<InviteMemberModal
  userGroups={userGroups}
  initialGroupId={selectedGroup}
  onInvite={async (input) => {
    // 2. Call backend
    await inviteMember(input)

    // 3. Reload data
    await refreshWorkspaceData()

    // 4. Show success
    toast.success('Đã gửi lời mời')

    // 5. Switch to invitations tab
    setActiveTab('invited')
  }}
/>
```

### Invitation Actions
```typescript
// Show success only after the backend mutation and reload both complete.
await resendInvitation(invitation.id)
await refreshWorkspaceData()
toast.success('Da gui lai loi moi')

await revokeInvitation(invitation.id)
await refreshWorkspaceData()
toast.success('Da xoa loi moi')
```

Invitation delete/resend must never be optimistic. If the backend throws because the row was not updated/deleted or the user is outside the invitation's User Group, show the backend error and do not show success.

## UI Patterns

### Group Sidebar
```typescript
// Show all groups with member counts
{userGroups.map(group => (
  <GroupFilter
    key={group.id}
    label={group.name}
    count={groupCounts.get(group.id) ?? 0}
    active={selectedGroup === group.id}
    onClick={() => setSelectedGroup(group.id)}
  />
))}
```

### Member Actions
```typescript
// Only show actions user has permission for
<td className="px-4 py-4">
  <div className="flex gap-3">
    {canEditRole && !isOwner && (
      <button onClick={() => onEdit(member)}>Edit</button>
    )}
    {canRemove && !isOwner && !isSelf && (
      <button onClick={() => onRemove(member.id)}>Remove</button>
    )}
  </div>
</td>
```

### Role Badge Display
```typescript
// Map DB roles to UI labels
const RoleLabels: Record<WorkspaceRole, string> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  member: 'MANAGER', // ⚠️ UI label differs from DB
  viewer: 'MEMBER'   // ⚠️ UI label differs from DB
}

function RoleBadge({ role }: { role: WorkspaceRole }) {
  return <span>{RoleLabels[role]}</span>
}
```

## Forbidden Patterns

### ❌ Don't Filter by Role in UI
```typescript
// WRONG: This bypasses User Group scope
const visibleMembers = members.filter(m =>
  m.role === 'admin' || m.role === 'member'
)
```

### ❌ Don't Reuse Stale selectedGroup
```typescript
// WRONG: selectedGroup might belong to previous workspace
useEffect(() => {
  loadMembers(selectedGroup) // Dangerous!
}, [currentWorkspace])

// CORRECT: Validate first
useEffect(() => {
  const valid = userGroups.some(g => g.id === selectedGroup)
  if (valid) {
    loadMembers(selectedGroup)
  }
}, [currentWorkspace, userGroups, selectedGroup])
```

### ❌ Don't Show Owner in Manageable List
```typescript
// WRONG: Owner should never appear in member management
const allMembers = members // Includes owner!

// CORRECT: Filter out owner
const manageableMembers = members.filter(m => m.role !== 'owner')
```

## Testing Checklist
- [ ] Owner sees all members in all groups
- [ ] Member only sees members in their group
- [ ] selectedGroup resets when switching workspaces
- [ ] Empty states show correct messages
- [ ] Invite modal requires group selection
- [ ] Role badges show correct labels
- [ ] Actions respect permissions
- [ ] Data reloads after mutations

## Related Files
- `src/renderer/src/pages/MembersPage.tsx`
- `src/renderer/src/store/useWorkspace.ts`
- `src/shared/workspace-types.ts`
- `.codex/rules/authorization/user-group-scope.md`
