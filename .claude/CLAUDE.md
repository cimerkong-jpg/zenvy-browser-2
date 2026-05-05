# Zenvy Browser - Project Brain

## Quy tắc bắt buộc

### UI / Design System (CRITICAL)

Tất cả UI phải tuân thủ tuyệt đối design system tại:
`.claude/rules/design.md`

Nguyên tắc bắt buộc:

- Luôn sử dụng đúng color system đã định nghĩa
- Không tự ý tạo màu mới
- Không dùng spacing ngoài hệ thống
- Không tạo component style mới nếu chưa có trong design.md
- Luôn giữ layout compact, ưu tiên hiệu suất thao tác
- Không biến UI thành landing page / marketing style

Khi viết hoặc refactor UI:
- Phải đọc design.md trước
- Phải áp dụng typography, spacing, component rules
- Ưu tiên consistency hơn sáng tạo

Nếu có xung đột giữa:
- "UI đẹp" và "design.md"

→ LUÔN chọn design.md

### Ngôn ngữ
Luôn trả lời bằng tiếng Việt, trừ khi user yêu cầu rõ ràng một ngôn ngữ khác.

### Quản lý file
Không tự ý xóa file nếu chưa được user đồng ý. Khi cần xóa file, phải hỏi rõ:

```text
Tôi cần xóa file [tên file]. Bạn có đồng ý không?
```

### Cập nhật tài liệu
Khi có thay đổi về scope, kiến trúc, tính năng, workflow, tech stack hoặc tiến độ, phải cập nhật tài liệu tương ứng:

- `CLAUDE.md`: chỉ lưu mô hình tổng quan của dự án.
- `.claude/rules/`: lưu chi tiết từng phần của dự án.
- Các file plan/implementation ở root: lưu nhật ký triển khai theo giai đoạn.

## Mục đích dự án
Zenvy Browser là desktop antidetect browser dùng cho quản lý nhiều tài khoản Facebook/MMO/Ads với profile isolation, proxy per profile, fingerprint spoofing, cookie management và profile management nâng cao.

## Mô hình tổng quan
- App desktop chạy bằng Electron.
- UI xây bằng React, Tailwind CSS và Zustand.
- Main process quản lý dữ liệu, browser launch, cookies, templates, fingerprint scripts và IPC.
- Renderer process chỉ xử lý UI, gọi backend qua preload/contextBridge.
- Mỗi profile có cấu hình proxy, fingerprint, cookies, tags và thư mục dữ liệu browser riêng.

## Tài liệu chi tiết
Chi tiết kỹ thuật nằm trong `.claude/rules/`:

- `architecture.md`: kiến trúc, cấu trúc thư mục, IPC, data flow.
- `features.md`: tính năng đã có, đang làm, chưa làm.
- `scope.md`: phạm vi sản phẩm và giới hạn.
- `platforms.md`: nền tảng hỗ trợ và lưu ý cross-platform.
- `design.md`: design system và UI conventions.
- `tech-defaults.md`: dependency, scripts, build defaults.
- `workflow.md`: Git workflow, kiểm thử, tiêu chuẩn trước khi upload.
- `setup.md`: setup, build, troubleshooting.
- `progress.md`: tiến độ hiện tại và next steps.

## Quick Reference
- Tech stack: Electron + React + Tailwind CSS + Zustand + JSON local storage + Puppeteer.
- Build tool: Electron Forge + Vite Plugin.
- Target: macOS primary, Windows secondary.
- Use case: cá nhân/nhóm nhỏ, không ưu tiên team collaboration/cloud billing.
- Level hiện tại: Level 2 gần hoàn thành.
- Phần tiếp theo: Automation Scripts.

## AI Agents
Agents nằm trong `.claude/agents/` và được dùng theo loại task:

- `researcher.md`: research.
- `reviewer.md`: code review.
- `debugger.md`: debug/fix bug.
- `documentation.md`: docs.
- `tester.md`: tests.
- `refactor.md`: refactor.
- `devops.md`: build/deploy.
- `performance.md`: performance.
- `integration.md`: integrations.
- `architect.md`: architecture.
- `uiux.md`: UI/UX.
- `security.md`: security.

Xem thêm: `.claude/AGENT_USAGE.md`.

## Trạng thái hiện tại
- Level 2 hoàn thành: Automation Scripts cơ bản, Tag Manager, Toast/Dialog, multi-page navigation.
- `npm run typecheck` pass. `npm run build` pass.
- Next: Advanced Automation (Level 2+) — checklist đã duyệt 2026-05-04, sẵn sàng triển khai.
