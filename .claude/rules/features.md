# Features - Zenvy Browser

## Đã hoàn thành

### Profile Management
- CRUD profiles.
- Profile IDs are sequential numeric strings starting at `1001`.
- Group assignment.
- Multi-select profiles.
- Bulk move selected profiles to another group.
- Bulk delete.
- Duplicate profile.
- Search by name/notes.
- Import/export selected profiles as JSON.
- Profile stats dashboard.
- Tags backend and basic `TagInput` UI.

### Browser Isolation
- Launch Chrome with per-profile `user-data-dir`.
- Track running profile IDs.
- Close launched profile browser process.
- Proxy config per profile through Chrome launch args.

### Cookie Management
- Cookie CRUD by profile.
- Import/export cookies.
- Sync cookies between browser and local storage.
- `CookieManager` UI.

### Profile Templates
- Built-in templates for common sites.
- Save current config as custom template.
- Template management UI.
- Import/export templates.

### Fingerprint Spoofing
- Base fingerprint fields: user agent, timezone, language, hardware, device name, MAC address.
- WebRTC blocking.
- Canvas/WebGL mode config.
- Advanced spoof scripts:
  - fonts.
  - audio context.
  - screen resolution.
  - geolocation.
  - battery status.
- Fingerprint script injection from `src/main/browser.ts`.

### Enhanced UI/UX
- Keyboard shortcuts hook.
- Theme store with dark/light/auto mode; auto uses desktop time: 06:00-18:00 light, 18:00-06:00 dark.
- Context menu on profile rows.
- Drag-and-drop foundation for profile rows.
- Sidebar theme toggle cycles Light / Dark / Auto.

## Đang hoàn thiện
- Drag-and-drop mới có foundation, chưa hoàn chỉnh drop zones cho groups/sidebar.
- Tags UI mới ở mức chọn/tạo tag trong profile modal, chưa có Tag Manager đầy đủ.
- Import/export profiles hiện dùng file picker/download trực tiếp, chưa có preview/conflict resolution modal.
- Documentation đang được đồng bộ lại để khớp code hiện tại.

## Chưa triển khai

### Automation Scripts
- Script types/storage.
- Script CRUD backend.
- Script executor.
- Scheduler.
- IPC handlers for scripts.
- Automation page.
- Monaco script editor.
- Script library.
- Execution logs.
- Multi-profile script execution.

## Không coi là hoàn thành nếu thiếu
- `npm run typecheck` pass.
- `npm run build` pass.
- Documentation trong `CLAUDE.md` và `.claude/rules/` được cập nhật đúng mức chi tiết.
