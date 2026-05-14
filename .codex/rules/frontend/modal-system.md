# Modal System Architecture

## Purpose
Define the scalable modal/dialog architecture for Zenvy Browser to support future UI complexity growth.

## System Separation

### Toast System (`useToast.ts`)
**Purpose**: Non-blocking notifications
- Success/error/info/warning messages
- Auto-dismiss after 4 seconds
- Bottom-right corner
- No user interaction required
- Multiple toasts can stack

**Usage**:
```typescript
import { toast } from '../store/useToast'

toast.success('Operation completed')
toast.error('Failed to save')
toast.info('Processing...')
toast.warning('Low disk space')
```

### Dialog System (`useDialog.ts`)
**Purpose**: Blocking user decisions
- Confirmation dialogs
- Destructive action warnings
- User must respond (confirm/cancel)
- Promise-based async API
- Single dialog at a time

**Usage**:
```typescript
import { dialog } from '../store/useDialog'

// Standard confirmation
const confirmed = await dialog.confirm(
  'Save Changes',
  'Do you want to save your changes?'
)
if (confirmed) {
  await saveChanges()
}

// Destructive confirmation
const confirmed = await dialog.confirmDelete(
  'Delete Profile',
  'This action cannot be undone.'
)
if (confirmed) {
  await deleteProfile()
}
```

## Architecture Principles

### 1. Separation of Concerns
- **Toast state** and **dialog state** are completely separate
- Each system has its own Zustand store
- Each system has its own container component
- No shared state between systems

### 2. Z-Index Ownership
```
99999 - Toast notifications (always on top)
99998 - Dialog overlay (blocks interaction)
50    - Modals (custom modals like ProfileModal)
40    - Dropdowns/menus
30    - Sidebar resize handle
20    - Table sticky headers
10    - Default elevated content
```

### 3. Promise-Based Dialog API
Dialogs return Promises for clean async/await usage:

```typescript
// ✅ Clean async flow
const confirmed = await dialog.confirmDelete('Delete', 'Are you sure?')
if (confirmed) {
  await performDelete()
  toast.success('Deleted successfully')
}

// ❌ Old callback hell
dialog.confirmDelete('Delete', 'Are you sure?', async () => {
  await performDelete()
  toast.success('Deleted successfully')
})
```

### 4. Overlay Management
- Dialog system owns the backdrop overlay
- Clicking backdrop = cancel action
- ESC key closes dialog (future enhancement)
- Only one dialog visible at a time

### 5. Focus Management
- Dialog traps focus when open (future enhancement)
- First focusable element gets focus
- Tab cycles through dialog elements only
- Focus returns to trigger element on close

## File Structure

```
src/renderer/src/
├── store/
│   ├── useToast.ts          # Toast notification state
│   └── useDialog.ts         # Dialog confirmation state
├── components/
│   ├── ToastContainer.tsx   # Renders toast notifications
│   └── DialogContainer.tsx  # Renders confirmation dialogs
└── App.tsx                  # Mounts both containers
```

## Component Responsibilities

### ToastContainer
- Renders toast notifications
- Manages toast queue
- Auto-dismiss timers
- No user interaction blocking

### DialogContainer
- Renders single confirmation dialog
- Manages backdrop overlay
- Handles confirm/cancel actions
- Blocks user interaction until resolved

## Future Extensibility

### Modal Stack (Future)
When multiple modals are needed:
```typescript
// Future API
const modalStack = useModalStack()

modalStack.push(<ProfileModal />)
modalStack.push(<ConfirmDialog />)
modalStack.pop() // Close top modal
```

### Sheet/Drawer (Future)
For side panels:
```typescript
// Future API
const sheet = useSheet()

sheet.open(<ProfileDetails />, { side: 'right' })
```

### Form Dialogs (Future)
For complex input:
```typescript
// Future API
const result = await dialog.form({
  title: 'Create Profile',
  fields: [...]
})
```

## Rules

### ❌ Never Mix Systems
```typescript
// WRONG - mixing toast and dialog in same store
export const useToast = create((set) => ({
  toasts: [],
  dialog: null, // ❌ Don't do this
}))
```

### ✅ Keep Systems Separate
```typescript
// CORRECT - separate stores
export const useToast = create((set) => ({
  toasts: [],
  addToast: (type, message) => { ... }
}))

export const useDialog = create((set) => ({
  dialog: null,
  showDialog: (options) => { ... }
}))
```

### ❌ Never Use Native Dialogs
```typescript
// WRONG
if (confirm('Delete?')) {
  deleteItem()
}

// WRONG
alert('Saved!')
```

### ✅ Use App Dialogs
```typescript
// CORRECT
const confirmed = await dialog.confirmDelete('Delete Item', 'Are you sure?')
if (confirmed) {
  await deleteItem()
  toast.success('Deleted!')
}
```

## Testing Considerations

### Toast Testing
```typescript
// Test toast appears
toast.success('Test message')
expect(screen.getByText('Test message')).toBeInTheDocument()

// Test auto-dismiss
await waitFor(() => {
  expect(screen.queryByText('Test message')).not.toBeInTheDocument()
}, { timeout: 5000 })
```

### Dialog Testing
```typescript
// Test dialog appears and resolves
const promise = dialog.confirm('Title', 'Message')
expect(screen.getByText('Title')).toBeInTheDocument()

// User clicks confirm
fireEvent.click(screen.getByText('Confirm'))
expect(await promise).toBe(true)
```

## Migration Checklist

When adding new confirmation flows:
- [ ] Use `dialog.confirm()` or `dialog.confirmDelete()`
- [ ] Use `toast` for feedback messages
- [ ] Never use `window.confirm()` or `window.alert()`
- [ ] Await dialog response before proceeding
- [ ] Show success toast after action completes
- [ ] Handle errors with error toast

## Related Files
- `.codex/rules/frontend/dialogs-and-toasts.md` - Usage patterns
- `src/renderer/src/store/useDialog.ts` - Dialog state
- `src/renderer/src/store/useToast.ts` - Toast state
- `src/renderer/src/components/DialogContainer.tsx` - Dialog UI
- `src/renderer/src/components/ToastContainer.tsx` - Toast UI
