# Dialogs and Toasts - Frontend UI Rule

## Purpose
Define consistent patterns for user confirmations, alerts, and notifications. Never use native browser dialogs for user-facing flows.

## INVARIANT - MUST ENFORCE

**🚨 CRITICAL: Native browser dialogs are FORBIDDEN in renderer code.**

This is a hard requirement that must be enforced during code review:

### Forbidden Patterns (Auto-Reject)
```typescript
// ❌ REJECT - Native dialogs
alert('message')
confirm('question')
prompt('input')
window.alert()
window.confirm()
window.prompt()
```

### Required Patterns (Enforce)
```typescript
// ✅ REQUIRED - Custom systems only
import { toast } from '../store/useToast'
import { dialog } from '../store/useDialog'

// For notifications
toast.success('message')
toast.error('error')

// For confirmations
const confirmed = await dialog.confirm('title', 'message')
const confirmed = await dialog.confirmDelete('title', 'message')
```

### Migration Status
✅ **COMPLETE** - All native dialogs have been migrated (as of 2026-05-14)

**Zero tolerance policy:**
- Any PR introducing native dialogs must be rejected
- All renderer UI must use useDialog + useToast
- No exceptions for "quick fixes" or "temporary code"
- Success toasts for delete/update mutations must only appear after backend confirmation and store/UI refresh.
- Do not show optimistic success for destructive actions.
- No mutation may report success unless the intended persistence layer confirmed the change.

## Why Native Dialogs Are Forbidden

Native browser dialogs (`window.confirm`, `window.alert`, `window.prompt`) are:
- Ugly and inconsistent with app design
- Cannot be styled to match dark theme
- Block the entire application
- Look unprofessional
- Break user experience

## Architecture

**Toast and Dialog systems are completely separate.**
- Toast: Non-blocking notifications (`useToast.ts`)
- Dialog: Blocking confirmations (`useDialog.ts`)
- See `.codex/rules/frontend/modal-system.md` for architecture details

## Use App-Styled Dialogs

### Toast System
For success/error/info messages:

```typescript
import { toast } from '../store/useToast'

// Success
toast.success('Đã lưu thành công')

// Error
toast.error('Không thể kết nối')

// Info
toast.info('Đang xử lý...')

// Warning
toast.warning('Cảnh báo: Dữ liệu sẽ bị xóa')
```

### Dialog System
For user confirmations (Promise-based):

```typescript
import { dialog } from '../store/useDialog'

// Standard confirmation (returns Promise<boolean>)
const confirmed = await dialog.confirm(
  'Xác nhận hành động',
  'Bạn có chắc chắn muốn tiếp tục?'
)
if (confirmed) {
  await performAction()
  toast.success('Đã hoàn thành')
}

// Destructive action (delete/remove)
const confirmed = await dialog.confirmDelete(
  'Xóa hồ sơ',
  'Xóa 5 hồ sơ đã chọn? Hành động này không thể hoàn tác.'
)
if (confirmed) {
  await deleteProfiles()
  toast.success('Đã xóa')
}
```

## Dialog Variants

### Default Variant
- Purple gradient button
- Used for: Save, Confirm, OK, Continue

### Destructive Variant
- Red gradient button
- Used for: Delete, Remove, Revoke
- Automatically applied by `dialog.confirmDelete()`

## UI Styling

### Toast
- Bottom-right corner
- Auto-dismiss after 4 seconds
- Color-coded by type:
  - Success: Green
  - Error: Red
  - Info: Purple
  - Warning: Yellow
- Rounded corners, backdrop blur
- Dark theme compatible

### Dialog
- Center of screen
- Backdrop blur overlay
- Dark theme (`bg-[#13111F]`)
- Rounded corners (`rounded-2xl`)
- Title + description
- Cancel + Confirm buttons
- Click outside to cancel

## Forbidden Patterns

### ❌ Never Use Native Dialogs
```typescript
// WRONG
if (confirm('Delete profile?')) {
  deleteProfile()
}

// WRONG
alert('Profile deleted')

// WRONG
const name = prompt('Enter name')
```

### ❌ Never Use Inline Confirm
```typescript
// WRONG
<button onClick={() => confirm('Delete?') && deleteProfile()}>
  Delete
</button>
```

## Correct Patterns

### ✅ Use Dialog for Confirmations
```typescript
// CORRECT - Promise-based
<button onClick={async () => {
  const confirmed = await dialog.confirmDelete(
    'Xóa profile',
    `Xóa profile "${profile.name}"?`
  )
  if (confirmed) {
    await deleteProfile(profile.id)
    toast.success('Đã xóa profile')
  }
}}>
  Delete
</button>
```

### ✅ Use Toast for Feedback
```typescript
// CORRECT
const handleSave = async () => {
  try {
    await saveProfile(data)
    toast.success('Đã lưu profile')
  } catch (error) {
    toast.error('Không thể lưu: ' + error.message)
  }
}
```

### ✅ Replace Alert with Toast
```typescript
// WRONG
alert('File không hợp lệ')

// CORRECT
toast.error('File không hợp lệ')
```

## Implementation Checklist

When adding user interactions:
- [ ] No `confirm()` calls
- [ ] No `alert()` calls
- [ ] No `prompt()` calls
- [ ] Use `dialog.confirm()` or `dialog.confirmDelete()` for confirmations
- [ ] Use `toast.success/error/info/warning()` for feedback
- [ ] Success toast only after backend-confirmed mutation
- [ ] Delete/update flows refresh data before success toast
- [ ] Cloud-backed mutations do not show normal success when Supabase persistence failed
- [ ] Local-first mutations return an explicit pending/failed sync state before any success copy
- [ ] Destructive actions use `confirmDelete()` variant
- [ ] Vietnamese copy for messages
- [ ] Error messages are user-friendly

## Common Use Cases

### Delete Confirmation
```typescript
const confirmed = await dialog.confirmDelete(
  'Xóa thành viên',
  `Xóa ${member.email} khỏi workspace?`
)
if (confirmed) {
  await removeMember(memberId)
  toast.success('Đã xóa thành viên')
}
```

### Bulk Delete
```typescript
const confirmed = await dialog.confirmDelete(
  'Xóa hồ sơ',
  `Xóa ${selectedIds.length} hồ sơ đã chọn?`
)
if (confirmed) {
  await deleteMany(selectedIds)
  toast.success(`Đã xóa ${selectedIds.length} hồ sơ`)
}
```

### Save Success
```typescript
try {
  await saveChanges()
  toast.success('Đã lưu thay đổi')
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Không thể lưu')
}
```

### Import/Export
```typescript
// Import error
try {
  const data = JSON.parse(fileContent)
  if (!data.profiles) {
    toast.error('File không hợp lệ')
    return
  }
} catch (error) {
  toast.error('Lỗi đọc file: ' + error.message)
}

// Import success
toast.success(`Đã import ${count} hồ sơ`)
```

## Related Files
- `src/renderer/src/store/useToast.ts` - Toast state (notifications only)
- `src/renderer/src/store/useDialog.ts` - Dialog state (confirmations only)
- `src/renderer/src/components/ToastContainer.tsx` - Toast UI
- `src/renderer/src/components/DialogContainer.tsx` - Dialog UI
- `src/renderer/src/pages/MembersPage.tsx` - Example usage
- `src/renderer/src/pages/ProfilesPage.tsx` - Example usage
- `.codex/rules/frontend/modal-system.md` - Architecture details

## Code Review Checklist

When reviewing PRs, verify:
- [ ] No `alert()` calls in renderer code
- [ ] No `confirm()` calls in renderer code
- [ ] No `prompt()` calls in renderer code
- [ ] No `window.alert/confirm/prompt` calls
- [ ] All confirmations use `dialog.confirm()` or `dialog.confirmDelete()`
- [ ] All notifications use `toast.success/error/info/warning()`
- [ ] Destructive actions use `confirmDelete()` variant
- [ ] Dialog responses use async/await pattern
- [ ] Success feedback shown after confirmed actions

## Migration Notes (Historical)

**Migration completed: 2026-05-14**

Files migrated:
- ProfileRow.tsx
- QuickEditProfileModal.tsx
- CookieManager.tsx
- ProfileModal.tsx
- TemplateManager.tsx
- AutomationPage.tsx
- ProfilesPage.tsx
- MembersPage.tsx

When replacing native dialogs (for future reference):
1. Import `toast` from `useToast` and `dialog` from `useDialog`
2. Replace `confirm()` with `await dialog.confirm()` or `await dialog.confirmDelete()`
3. Replace `alert()` with `toast.error()` or `toast.success()`
4. Remove `prompt()` - use proper modal forms instead
5. Use async/await pattern for dialog responses
6. Show success toast after backend-confirmed actions and refresh
7. Test that confirmations work correctly
8. Verify toast messages are visible and readable

## Changelog
- 2026-05-14: Added backend-confirmed success rule for delete/update mutations.
- 2026-05-15: Added persistence-confirmed mutation invariant for cloud-backed and local-first flows.
