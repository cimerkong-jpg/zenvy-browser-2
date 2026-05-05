# Features - Zenvy Browser

## Đã hoàn thành

### Profile Management
- CRUD profiles.
- Profile IDs là số tuần tự bắt đầu từ 1001.
- Group assignment.
- Multi-select profiles.
- Bulk move selected profiles to another group.
- Bulk delete.
- Duplicate profile.
- Search theo tên / ghi chú / proxy.
- Import profiles từ JSON với ImportPreviewModal: hiển thị danh sách, badge tên trùng, chọn lọc trước khi nhập.
- Export selected profiles as JSON.
- Profile stats dashboard.
- Sort profiles: Tên A→Z / Z→A, Ngày tạo mới nhất / cũ nhất, Đang mở trước — dropdown active state.

### Browser Isolation
- Launch Chrome với per-profile `user-data-dir`.
- Track running profile IDs.
- Close launched profile browser process.
- Proxy config per profile qua Chrome launch args.

### Cookie Management
- Cookie CRUD by profile.
- Import/export cookies (Netscape .txt).
- Sync cookies giữa browser và local storage.
- `CookieManager` UI.

### Profile Templates
- Built-in templates cho các site phổ biến.
- Lưu config hiện tại thành custom template.
- Template management UI.
- Import/export templates.

### Fingerprint Spoofing
- Base fingerprint: user agent, timezone, language, hardware, device name, MAC address.
- WebRTC blocking.
- Canvas/WebGL mode config.
- Advanced spoof scripts: fonts, audio context, screen resolution, geolocation, battery status.
- Fingerprint script injection từ `src/main/browser.ts`.

### Enhanced UI/UX
- Keyboard shortcuts hook.
- Theme store: dark/light/auto (auto dùng giờ desktop: 06:00-18:00 light, 18:00-06:00 dark).
- Context menu trên profile rows.
- Sidebar + Group panel đều resize được.
- Group panel collapse / expand.

### Automation Scripts
- Script data model + shared types.
- Script CRUD storage (zenvy-scripts.json).
- Execution engine (AsyncFunction + Puppeteer).
- RPA Helper API: click, type, goto, waitForSelector, scroll, hover, select, screenshot, getAttribute, getText, exists, waitForNavigation, keyboard.press/type, evaluate, vars.
- Multi-profile sequential execution.
- Execution logs streamed real-time qua IPC.
- ExecutionLogs tab per profile.
- Action Snippet Panel — 6 nhóm snippet, chèn đúng vị trí cursor Monaco.
- Script Library — 5 built-in templates.
- Scheduler: once / interval, toggle on/off, persist zenvy-scheduler.json.
- Task History: max 500 records, filter success/error, expand logs, xóa record, persist zenvy-history.json.
- Profile Variables: Record&lt;string, string&gt;, runtime override, `vars.key` trong script, nút "Lưu vào profile".
- AutomationQuickModal trong ProfilesPage: chạy script nhanh từ selected profiles.

## Đã xóa
- **Tags**: toàn bộ Tag code (TagInput, TagManager, getTags/createTag/deleteTag, Tag type, tags trong StoreSchema) đã xóa 2026-05-05.
- **Drag-and-drop**: useDragAndDrop hook và drag props trên ProfileRow đã xóa 2026-05-05.

## Chưa triển khai (optional / future)

### Import Enhancement
- Overwrite mode (ghi đè profile cùng tên thay vì nhập thêm).
- Conflict resolution per-profile (Skip / Overwrite / Rename).

### Automation Enhancement
- Parallel multi-profile execution (hiện tại sequential).
- Script version history.

### Infrastructure
- E2E automated tests.
- CI/CD pipeline.

## Định nghĩa "hoàn thành"
- `npm run typecheck` pass.
- `npm run build` pass.
- Docs trong `CLAUDE.md` và `.claude/rules/` được cập nhật.
