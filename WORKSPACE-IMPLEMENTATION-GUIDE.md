# WORKSPACE + TEAM MANAGEMENT - IMPLEMENTATION GUIDE

## ✅ Đã hoàn thành

1. **Database Schema** (`WORKSPACE-SCHEMA.sql`)
   - Tables: workspaces, workspace_members, workspace_invitations
   - RLS policies cho security
   - Functions và triggers
   - Indexes

2. **TypeScript Types** (`src/shared/workspace-types.ts`)
   - Workspace, WorkspaceMember, WorkspaceInvitation types
   - WorkspacePermissions helpers
   - Role labels và descriptions

3. **Workspace Store** (`src/renderer/src/store/useWorkspace.ts`)
   - State management với Zustand
   - Actions: loadWorkspaces, switchWorkspace, createWorkspace, etc.
   - Member management: inviteMember, updateMemberRole, removeMember

## 🔨 Cần làm tiếp

### 1. Fix TypeScript Config
```json
// tsconfig.web.json - Thêm vào compilerOptions
{
  "include": [
    "src/renderer/**/*",
    "src/shared/**/*"  // <-- Thêm dòng này
  ]
}
```

### 2. Tạo Workspace Dropdown trong Topbar

File: `src/renderer/src/components/WorkspaceDropdown.tsx`

```tsx
import { useState } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { createPortal } from 'react-dom'

export default function WorkspaceDropdown() {
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace()
  const [showMenu, setShowMenu] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5"
      >
        <span className="text-sm font-semibold text-[#E5E7EB]">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="fixed z-50 w-64 rounded-lg border border-[#1F2230] bg-[#1B2333] shadow-xl p-2"
            style={{ top: '52px', left: '140px' }}
          >
            {/* Workspace list */}
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                onClick={() => {
                  switchWorkspace(workspace.id)
                  setShowMenu(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  currentWorkspace?.id === workspace.id
                    ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                    : 'text-[#E5E7EB] hover:bg-white/5'
                }`}
              >
                {workspace.name}
              </button>
            ))}

            <div className="border-t border-[#1F2230] my-2" />

            <button
              onClick={() => {
                setShowMenu(false)
                setShowCreateModal(true)
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm text-[#E5E7EB] hover:bg-white/5"
            >
              + Create Workspace
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createWorkspace}
        />
      )}
    </div>
  )
}
```

### 3. Update Topbar để sử dụng WorkspaceDropdown

File: `src/renderer/src/pages/ProfilesPage.tsx`

```tsx
// Import
import WorkspaceDropdown from '../components/WorkspaceDropdown'

// Replace trong Topbar:
<div className="no-drag flex items-center gap-6">
  <WorkspaceDropdown />  {/* <-- Thay thế "My Workspace" */}
  <nav className="flex items-center gap-1">
    {/* ... các button khác */}
  </nav>
</div>
```

### 4. Tạo MembersPage

File: `src/renderer/src/pages/MembersPage.tsx`

```tsx
import { useEffect } from 'react'
import { useWorkspace } from '../store/useWorkspace'
import { WorkspacePermissions, RoleLabels } from '../../../shared/workspace-types'

export default function MembersPage() {
  const { currentWorkspace, currentRole, members, loadMembers, inviteMember, updateMemberRole, removeMember } = useWorkspace()

  useEffect(() => {
    loadMembers()
  }, [currentWorkspace])

  const canManage = currentRole && WorkspacePermissions.canManageMembers(currentRole)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-sm text-slate-400">
            {members.length} members in {currentWorkspace?.name}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {/* Show invite modal */}}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#8B5CF6]"
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Members table */}
      <div className="bg-[#111218] rounded-lg border border-[#1F2230]">
        <table className="w-full">
          <thead className="border-b border-[#1F2230]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280]">EMAIL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280]">ROLE</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280]">JOINED</th>
              {canManage && (
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280]">ACTIONS</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} className="border-b border-[#1F2230]">
                <td className="px-4 py-3 text-sm text-white">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                    {RoleLabels[member.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### 5. Update App.tsx để add MembersPage route

```tsx
// Add to Page type
type Page = 'profiles' | 'automation' | 'sync' | 'extensions' | 'members' | 'settings'

// Add to renderPage function
case 'members':
  return <MembersPage />
```

### 6. Update useStore để support workspace_id

File: `src/renderer/src/store/useStore.ts`

```tsx
// Add workspace filter to loadAll
loadAll: async () => {
  const { currentWorkspace } = useWorkspace.getState()
  if (!currentWorkspace) return

  // Load profiles for current workspace
  const profiles = await window.api.profiles.getAll(currentWorkspace.id)
  const groups = await window.api.groups.getAll(currentWorkspace.id)
  
  set({ profiles, groups })
}
```

### 7. Run Database Migration

```bash
# Connect to Supabase
supabase db push

# Or run SQL manually in Supabase Dashboard
# Copy content from WORKSPACE-SCHEMA.sql and execute
```

### 8. Test Flow

1. User signup → Auto create "My Workspace"
2. User can create more workspaces
3. User can switch between workspaces
4. Owner/Admin can invite members
5. Members see profiles in their workspace only
6. Permissions work correctly

## 📝 Notes

- API calls (window.api.workspaces.*) cần implement trong main process
- Supabase RLS policies đảm bảo security
- Mock data trong store để test UI trước
- Sau khi implement API, remove mock data

## 🎯 Priority

1. Fix tsconfig ✅
2. Tạo WorkspaceDropdown component
3. Update Topbar
4. Tạo MembersPage
5. Implement API calls
6. Run database migration
7. Test end-to-end
