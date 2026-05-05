# Zenvy Browser

Antidetect browser dành cho quản lý nhiều tài khoản Facebook / MMO / Ads với profile isolation hoàn toàn, proxy per-profile và fingerprint spoofing.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-purple)

---

## Tính năng

### Profile Management
- Tạo, sửa, xóa, nhân bản profile không giới hạn
- Nhóm profile, tìm kiếm theo tên / ghi chú / proxy
- Bulk select, bulk delete, bulk chuyển nhóm
- Export / Import profiles (JSON) với preview và phát hiện tên trùng
- Sort theo tên, ngày tạo hoặc trạng thái

### Browser Isolation
- Mỗi profile có `user-data-dir` riêng biệt
- Proxy per-profile: HTTP, SOCKS5 (có username/password)
- Mở / đóng trực tiếp từ UI

### Fingerprint Antidetect
- User Agent, Timezone, Language, Screen Resolution
- Hardware Concurrency, Device Memory
- WebRTC blocking
- Canvas / WebGL noise
- Fonts spoofing
- AudioContext spoofing
- Geolocation spoofing
- Battery Status spoofing
- Device Name, MAC Address giả

### Cookie Management
- Xem, thêm, xóa cookie theo profile
- Import / export file `.txt` (Netscape format)
- Sync cookie từ browser đang chạy về local

### Profile Templates
- Templates có sẵn cho Facebook, Google, ...
- Lưu template tùy chỉnh từ cấu hình hiện tại
- Import / export templates

### Automation Scripts
- Viết script bằng JavaScript với Monaco Editor
- RPA API: `click`, `type`, `scroll`, `screenshot`, `evaluate`, `vars`, ...
- Chạy script trên 1 hoặc nhiều profile
- Execution logs real-time theo profile
- Snippet panel: 6 nhóm shortcut sẵn dùng
- Script library: 5 template mẫu (Login FB, Scroll Feed, ...)
- Lịch chạy: once hoặc interval
- Lịch sử thực thi: filter success/error, xem logs, xóa record
- Profile Variables: lưu biến per-profile, truy cập trong script qua `vars.key`

---

## Quick Start

### Yêu cầu
- Node.js 20+
- npm
- Google Chrome đã cài đặt

### Cài đặt & Chạy

```bash
npm install
npm start
```

### Build

```bash
# Package app
npm run build

# Tạo installer
npm run make
```

### Typecheck

```bash
npm run typecheck
```

---

## Cấu trúc dự án

```
src/
├── main/               # Electron main process
│   ├── index.ts        # IPC handlers, app lifecycle
│   ├── db.ts           # Data layer (zenvy-data.json)
│   ├── browser.ts      # Chrome launch / fingerprint injection
│   ├── cookies.ts      # Cookie CRUD
│   ├── templates.ts    # Profile templates
│   └── automation/
│       ├── scripts.ts  # Script CRUD
│       ├── executor.ts # Script execution engine
│       ├── scheduler.ts# Task scheduler
│       └── history.ts  # Execution history
├── preload/
│   └── index.ts        # contextBridge API
├── renderer/src/
│   ├── pages/
│   │   ├── ProfilesPage.tsx
│   │   └── AutomationPage.tsx
│   ├── components/     # ProfileRow, ProfileModal, CookieManager, ...
│   └── store/
│       └── useStore.ts
└── shared/
    └── types.ts        # Types dùng chung main ↔ renderer
```

---

## Nền tảng

| Nền tảng | Trạng thái |
|----------|------------|
| macOS (Apple Silicon) | Chính thức hỗ trợ |
| macOS (Intel) | Hỗ trợ |
| Windows | Hỗ trợ (thứ hai) |
| Linux | Build được, chưa kiểm tra đầy đủ |

---

## Dữ liệu cục bộ

Toàn bộ dữ liệu lưu trong `userData` của Electron (không có cloud):

- `zenvy-data.json` — profiles + groups
- `zenvy-scripts.json` — automation scripts
- `zenvy-scheduler.json` — scheduled tasks
- `zenvy-history.json` — execution history (tối đa 500 record)
- `profiles/<id>/` — user-data-dir của từng Chrome profile

---

## Tài liệu nội bộ

- `.claude/rules/architecture.md` — kiến trúc, IPC, data flow
- `.claude/rules/features.md` — tính năng đã làm / chưa làm
- `.claude/rules/setup.md` — setup, build, troubleshooting
- `TESTING.md` — quy trình kiểm thử trước release
