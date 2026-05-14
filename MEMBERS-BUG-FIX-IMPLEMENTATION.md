# MEMBERS BUG FIX - IMPLEMENTATION GUIDE

**Status:** Ready to implement
**Files:** 2 files to change
**Estimated:** 2-3 hours

---

## CHANGES REQUIRED

### FILE 1: src/main/workspaces.ts

#### Change 1.1: Remove Accepted Invitation Fallback in getWorkspaceMembers()

**Location:** Around line 450-490

**REMOVE this entire block:**
```typescript
try {
  const accepted = await getSupabase()
    .from('workspace_invitations')
    .select('id,workspace_id,email,role,user_group_id,profile_limit,note,invited_by,accepted_at,updated_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'accepted')

  if (!accepted.error) {
    for (const invitation of (accepted.data ?? []) as any[]) {
      const email = String(invitation.email ?? '').trim().toLowerCase()
      if (!email || existingEmails.has(email)) continue
      existingEmails.add(email)
      members.push({
        id: `invitation:${invitation.id}`,
        workspaceId: invitation.workspace_id,
        userId: '',
        displayName: email.split('@')[0] || null,
        email,
        isInvitationFallback: true,
        role: invitation.role,
        status: 'active',
        userGroupId: invitation.user_group_id ?? null,
        profileLimit: invitation.profile_limit ?? null,
        note: invitation.note ?? '',
        invitedBy: invitation.invited_by ?? null,
        joinedAt: invitation.accepted_at ? toMs(invitation.accepted_at) : Date.now(),
        updatedAt: invitation.updated_at ? toMs(invitation.updated_at) : Date.now(),
      })
    }
  }
} catch (error) {
  console.warn('[Workspace:getWorkspaceMembers] Accepted invitation fallback failed:', describeError(error))
}
```

**KEEP only:**
```typescript
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  requireConfigured()

  const { data, error } = await getSupabase()
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')  // ✅ Only active members

  if (error) throw toError(error, 'Failed to read workspace members')

  const rows = (data ?? []) as any[]

  // Get user profiles for display names
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: profileData } = await getSupabase()
      .from('user_profiles')
      .select('id,display_name')
      .in('id', userIds)
    profiles = profileData ?? []
  }

  const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]))

  const members = rows.map((row) => mapMember({
    ...row,
    display_name: profileById.get(row.user_id)?.display_name ?? null,
  }))

  return members.sort((a, b) => a.joinedAt - b.joinedAt)
}
```

#### Change 1.2: Remove invitation: prefix handling in removeMember()

**Location:** Around line 450-500

**REMOVE this block:**
```typescript
if (memberId.startsWith('invitation:')) {
  const invitationId = memberId.slice('invitation:'.length)
  const { data: invitation, error: invitationError } = await getSupabase()
    .from('workspace_invitations')
    .select('id,workspace_id,email,role')
    .eq('id', invitationId)
    .eq('status', 'accepted')
    .single()

  if (invitationError) throw toError(invitationError, 'Failed to read accepted invitation')

  if (!(await hasPermission('member.remove', invitation.workspace_id))) {
    throw new Error('Permission denied: member.remove')
  }

  const email = String(invitation.email ?? '').trim().toLowerCase()
  const { error: memberError } = await getSupabase()
    .from('workspace_members')
    .update({ status: 'removed' })
    .eq('workspace_id', invitation.workspace_id)
    .eq('email', email)
    .neq('role', 'owner')

  if (memberError) throw toError(memberError, 'Failed to remove workspace member')

  const { error: inviteError } = await getSupabase()
    .from('workspace_invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (inviteError) throw toError(inviteError, 'Failed to update invitation')
  return
}
```

**KEEP only direct member removal:**
```typescript
export async function removeMember(memberId: string): Promise<void> {
  requireConfigured()

  const { data: member, error: readError } = await getSupabase()
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('id', memberId)
    .single()

  if (readError) throw toError(readError, 'Failed to read workspace member')
  if (member.role === 'owner') throw new Error('Cannot remove workspace owner')

  if (!(await hasPermission('member.remove', member.workspace_id))) {
    throw new Error('Permission denied: member.remove')
  }

  const { error } = await getSupabase()
    .from('workspace_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .neq('role', 'owner')

  if (error) throw toError(error, 'Failed to remove workspace member')
}
```

#### Change 1.3: Remove invitation: prefix handling in updateMember()

**Location:** Around line 550-600

**REMOVE similar invitation: handling block**

**KEEP only direct member update**

#### Change 1.4: Add status check in getMyPermissions()

**Location:** Around line 900-950

**CHANGE FROM:**
```typescript
const { data: member, error: memberError } = await getSupabase()
  .from('workspace_members')
  .select('role,user_group_id')
  .eq('workspace_id', workspaceId)
  .eq('user_id', user.id)
  .single()
```

**TO:**
```typescript
const { data: member, error: memberError} = await getSupabase()
  .from('workspace_members')
  .select('role,user_group_id,status')
  .eq('workspace_id', workspaceId)
  .eq('user_id', user.id)
  .eq('status', 'active')  // ✅ Only active members
  .single()

if (memberError || !member) {
  // Not an active member - return empty permissions
  return emptyPermissionMap()
}
```

---

### FILE 2: src/renderer/src/store/useWorkspace.ts

#### Change 2.1: Reload after updateMember

**Location:** updateMember action

**ADD after API call:**
```typescript
updateMember: async (memberId, input) => {
  const api = getWorkspaceApi()
  if (!api?.updateMember) throw reportMissingWorkspaceApi('updateMember')
  await api.updateMember(memberId, input)

  // ✅ Reload everything
  await get().loadMembers()
  await get().loadInvitations()
  await get().loadWorkspaces()
  await get().getMyPermissions()
}
```

#### Change 2.2: Reload after updateMemberRole

**Similar to 2.1**

#### Change 2.3: Reload after removeMember

**ADD:**
```typescript
removeMember: async (memberId) => {
  const api = getWorkspaceApi()
  if (!api?.removeMember) throw reportMissingWorkspaceApi('removeMember')
  await api.removeMember(memberId)

  // ✅ Reload everything
  await get().loadMembers()
  await get().loadInvitations()
  await get().loadWorkspaces()

  // ✅ Check if current workspace still valid
  const { workspaces, currentWorkspaceId } = get()
  if (currentWorkspaceId && !workspaces.find(w => w.id === currentWorkspaceId)) {
    // Current workspace no longer accessible
    set({
      currentWorkspace: null,
      currentWorkspaceId: null,
      currentRole: null,
      permissions: emptyPermissionMap()
    })

    // Switch to first available workspace
    if (workspaces.length > 0) {
      await get().switchWorkspace(workspaces[0].id)
    } else {
      await get().ensureDefaultWorkspace()
    }
  }
}
```

#### Change 2.4: Reload permissions in switchWorkspace

**ADD:**
```typescript
switchWorkspace: async (workspaceId) => {
  // ... existing switch logic ...

  // ✅ Always reload permissions from Supabase
  await get().getMyPermissions()
  await get().loadMembers()
  await get().loadUserGroups()
  if (get().permissions['member.invite']) {
    await get().loadInvitations()
  }
}
```

---

## TESTING

### Test A: Update Role
1. Account A (owner) invite B to workspace TEST
2. B login, select TEST
3. A change B role from member to admin
4. B reload app
5. **Expected:** B sees new permissions, can invite members

### Test B: Remove Member
1. A remove B from TEST
2. B reload app
3. **Expected:** B doesn't see TEST in workspace list
4. A reload Members tab
5. **Expected:** B not in member list

### Test C: No Resurrection
1. B had accepted invitation
2. A removed B
3. B reload/login
4. **Expected:** B doesn't see TEST (no fallback resurrection)

---

## COMMANDS

```bash
npm run typecheck
npm start
```

---

**Ready to implement these changes.**
