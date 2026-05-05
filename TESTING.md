# Testing & QA Checklist — Zenvy Browser v1.0.0

## Automated checks (chạy trước mỗi commit)

```bash
npm run typecheck   # TypeScript — phải pass 0 error
npm run build       # Electron Forge package — phải build xong
```

---

## Manual QA — Profile Management

### Tạo profile
- [ ] Mở app, vào trang Hồ sơ
- [ ] Nhấn "Tạo hồ sơ" → modal mở
- [ ] Điền tên, ghi chú, chọn proxy type = none
- [ ] Lưu → profile xuất hiện trong bảng với ID đúng
- [ ] Tạo thêm profile với proxy HTTP (host:port)
- [ ] Tạo profile với proxy SOCKS5 có username/password

### Sửa profile
- [ ] Click icon bút chì trên tên → modal mở đúng profile
- [ ] Sửa tên → lưu → bảng cập nhật ngay
- [ ] Mở context menu (click ⋮ hoặc right-click) → chọn "Sửa Profile"

### Mở / đóng browser
- [ ] Nhấn "Mở" → Chrome mở với profile đó
- [ ] Nút chuyển sang "Đóng" (màu cam)
- [ ] Nhấn "Đóng" → Chrome đóng → nút trở về "Mở"
- [ ] Mở nhiều profile cùng lúc → mỗi cái độc lập

### Xóa profile
- [ ] Xóa 1 profile qua context menu → confirm dialog → profile mất
- [ ] Bulk select nhiều profile → nút "Xóa" trong toolbar → xóa đúng số lượng

### Nhân bản
- [ ] Context menu → Nhân bản → profile mới xuất hiện với tên "... Copy"

### Import / Export
- [ ] Chọn một số profile → "Xuất" → tải về file JSON
- [ ] Nhấn "Nhập tài nguyên" → chọn file JSON → modal preview mở
- [ ] Preview hiển thị đúng danh sách profile
- [ ] Profile có tên trùng với profile đã có → badge cam "Tên trùng"
- [ ] Bỏ chọn 1 profile trong preview → nhấn Nhập → chỉ import profile đã chọn
- [ ] Import file không hợp lệ → hiện thông báo lỗi, không crash

### Nhóm
- [ ] Tạo nhóm mới → xuất hiện trong panel trái
- [ ] Sửa tên nhóm → cập nhật ngay
- [ ] Xóa nhóm → profiles của nhóm đó về "Không có nhóm"
- [ ] Chuyển nhóm: chọn profiles → "Chuyển nhóm" → chọn nhóm → xác nhận

### Sort / Filter
- [ ] Nút "Sắp xếp" → dropdown mở đúng vị trí
- [ ] Chọn "Tên A→Z" → bảng sort lại, nút highlight tím
- [ ] Chọn "Đang mở trước" → profiles đang chạy lên đầu
- [ ] Chọn "Mặc định" → trở về thứ tự gốc, nút về màu trắng
- [ ] Filter trạng thái "Đang mở" → chỉ thấy profiles đang chạy
- [ ] Search text → filter realtime theo tên / ghi chú / proxy

---

## Manual QA — Cookies

- [ ] Mở context menu profile → "Quản lý Cookies" → modal mở
- [ ] Import file cookies .txt (Netscape format) → cookies hiện trong bảng
- [ ] Export cookies ra file → file mở được
- [ ] Xóa 1 cookie → biến mất khỏi danh sách
- [ ] Clear all → danh sách rỗng

---

## Manual QA — Fingerprint

- [ ] Tạo profile với fingerprint mặc định → Mở → không bị detect automation
- [ ] Vào `https://browserleaks.com` hoặc `https://pixelscan.net` → kiểm tra fingerprint
- [ ] Thay đổi canvas = noise → kết quả canvas leak khác profile khác
- [ ] WebRTC = disabled → không leak IP thật

---

## Manual QA — Automation Scripts

### Script CRUD
- [ ] Vào trang Automation → tab Scripts
- [ ] Tạo script mới → Monaco editor mở
- [ ] Viết script đơn giản: `await page.goto('https://google.com')`
- [ ] Lưu → script xuất hiện trong danh sách
- [ ] Sửa tên / code → lưu → cập nhật đúng
- [ ] Xóa script → biến mất

### Chạy script
- [ ] Chọn profile → chọn script → nhấn Chạy
- [ ] Execution logs hiện realtime theo tab từng profile
- [ ] Script chạy xong → status Success hoặc Error rõ ràng
- [ ] Script timeout hoặc lỗi → hiện error log, không crash app

### Snippet panel
- [ ] Click snippet → đoạn code chèn vào đúng vị trí cursor trong editor

### Scheduler
- [ ] Tab "Lịch chạy" → tạo task Once hoặc Interval
- [ ] Toggle on/off task
- [ ] Xóa task

### Lịch sử
- [ ] Tab "Lịch sử" → thấy danh sách execution records
- [ ] Filter Success / Error hoạt động
- [ ] Expand record → thấy logs
- [ ] Xóa record / xóa tất cả

---

## Manual QA — UI chung

- [ ] Sidebar resize (kéo handle) → co giãn đúng
- [ ] Group panel resize → co giãn đúng
- [ ] Group panel thu gọn / mở lại
- [ ] Mở app lại → dữ liệu vẫn còn (persist đúng)
- [ ] Console (F12) không có error đỏ khi dùng bình thường

---

## Build & Package

```bash
# macOS DMG
npm run make

# Kiểm tra output
ls out/make/
```

- [ ] File `.dmg` tạo thành công
- [ ] Drag vào Applications → mở được
- [ ] App packaged load đúng (không dùng dev server)
- [ ] Dữ liệu persist giữa các lần khởi động

---

## Trước khi release

```bash
npm run typecheck   # ✅ 0 error
npm run build       # ✅ build xong
git diff --check    # ✅ không có whitespace error
git status          # ✅ working tree clean
```

- [ ] `package.json` version đúng (hiện tại: 1.0.0)
- [ ] README.md phản ánh đúng tính năng
- [ ] Không có file nhạy cảm (`.env`, key, token) trong commit
