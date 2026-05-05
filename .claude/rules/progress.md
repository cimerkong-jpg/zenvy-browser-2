# Progress - Zenvy Browser

## Current Status
- v1.0.0 — Release Readiness hoàn thành (P2 + P3 done 2026-05-05).
- `npm run typecheck` pass. `npm run build` pass.
- Sẵn sàng release.

## Completed

### Week 1-2: Cookie Management
- Cookie backend CRUD.
- Cookie UI.
- Import/export.
- Browser sync.

### Profile Templates
- Built-in templates.
- Custom templates.
- Template management UI.
- Import/export templates.

### Week 3: Advanced Fingerprinting
- Fonts spoofing.
- AudioContext spoofing.
- Screen spoofing.
- Geolocation spoofing.
- Battery spoofing.
- Browser script injection.
- Advanced fingerprint fields in profile modal.

### Week 4: Profile Management Enhancements
- Profile duplicate.
- Profile import/export.
- Bulk delete.
- Bulk move selected profiles to another group.
- Profile stats UI.
- Search and selection UI.

### Phase 1: Enhanced UI/UX
- Keyboard shortcut hook.
- Theme store with dark/light/auto mode.
- Context menu.

### Level 2: Automation Scripts (cơ bản)
- Script data model + shared types.
- Script storage and CRUD (zenvy-scripts.json).
- Script execution engine (AsyncFunction constructor, Puppeteer).
- Execution logs streamed real-time qua IPC.
- Multi-profile sequential execution.
- IPC handlers + preload API.
- AutomationPage + Monaco editor + ScriptEditor component.
- ExecutionLogs component with tab per profile.
- Toast/Dialog notification system (Zustand + createPortal).
- Multi-page navigation (profiles / automation).
- Browser status sync.

### Level 2+ Advanced Automation
- RPA Helper API mở rộng: scroll, hover, select, screenshot, getAttribute, getText, exists, waitForNavigation, keyboard, evaluate, vars.
- Action Snippet Panel — 6 nhóm snippet, chèn cursor Monaco.
- Script Library — 5 built-in templates.
- Scheduler — CRUD + setInterval/setTimeout, persist zenvy-scheduler.json.
- Task History — persist zenvy-history.json, max 500 records.
- Profile Variables — Record&lt;string, string&gt;, runtime override, `vars.key` trong script.

### P2: Polish Existing UI (done 2026-05-05)
- Sort profiles: Tên A→Z, Tên Z→A, Ngày tạo mới/cũ, Đang mở trước — dropdown có active state.
- Import Preview Modal: parse JSON client-side, hiển thị bảng preview, badge "Tên trùng", checkbox chọn profile, nhập chọn lọc.
- Removed: drag-and-drop (đã xóa theo yêu cầu 2026-05-05).
- Removed: Tags (toàn bộ Tag code đã xóa 2026-05-05).

### P3: Release Readiness (done 2026-05-05)
- Build verification: `npm run build` pass trên macOS arm64.
- Version bump: 0.0.1 → 1.0.0.
- README.md viết lại đúng tính năng thực tế.
- TESTING.md: QA checklist đầy đủ cho manual test + release criteria.
- progress.md và features.md cập nhật.

## Remaining Work

### Priority 1: Manual QA trước phát hành
Dùng checklist trong `TESTING.md`:
- Profile CRUD + launch/close.
- Cookie import/export/sync.
- Fingerprint test.
- Automation Scripts end-to-end.
- UI chung (resize, persist, console error).
- Build DMG và test packaged app.

### Priority 2: Future improvements (optional)
- Import profile: option "Ghi đè" (overwrite by name) thay vì chỉ "Nhập thêm".
- Kéo thả profile giữa các nhóm (nếu cần lại).
- E2E tests tự động.

## Verification Snapshot (2026-05-05)
- `npm run typecheck`: passed.
- `npm run build`: passed (arm64 macOS).
- Known npm audit: 32 vulnerabilities từ dependency tree — chưa fix (npm audit fix --force có thể breaking).
