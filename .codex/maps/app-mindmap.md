# Zenvy Browser Mindmap - Hướng dẫn Test Thủ công

**Mục đích**: Bản đồ đơn giản cho người test thủ công, viết bằng tiếng Việt.

**Nguồn**: Dựa trên `.codex/maps/app-function-map.md`

---

## 1. Tổng quan App

**Zenvy Browser là gì?**
- Ứng dụng quản lý nhiều hồ sơ trình duyệt (browser profiles)
- Hỗ trợ làm việc nhóm qua Workspace
- Mỗi workspace có nhiều thành viên, mỗi thành viên thuộc 1 nhóm người dùng
- Có tính năng tự động hóa (automation)

**Khái niệm quan trọng:**
- **Workspace**: Không gian làm việc chung (như 1 công ty)
- **Owner**: Chủ workspace, thấy tất cả
- **Member**: Thành viên, chỉ thấy trong nhóm của mình
- **Nhóm người dùng (User Group)**: Nhóm A chỉ thấy hồ sơ nhóm A, nhóm B chỉ thấy nhóm B
- **Hồ sơ (Profile)**: 1 trình duyệt ảo với cookie/proxy riêng
- **Nhóm hồ sơ (Profile Group)**: Thư mục chứa nhiều hồ sơ

**Quy tắc vàng:**
- Owner thấy tất cả
- Member chỉ thấy trong nhóm của mình
- Role (Admin/Manager/Member) KHÔNG cho phép xem nhóm khác
- Chuyển workspace phải reload hết dữ liệu

---

## 2. Sơ đồ Chức năng Dạng Cây

```
Zenvy Browser
├── 1. Đăng nhập / Đăng ký
├── 2. Workspace
│   ├── Chọn workspace
│   ├── Chuyển workspace
│   └── Cài đặt workspace
├── 3. Thành viên (Members)
│   ├── Nhóm người dùng
│   ├── Danh sách thành viên
│   ├── Mời thành viên
│   └── Phân quyền hồ sơ
├── 4. Hồ sơ (Profiles)
│   ├── Danh sách hồ sơ
│   ├── Nhóm hồ sơ
│   ├── Tạo/sửa/xóa hồ sơ
│   ├── Mở browser
│   ├── Proxy
│   ├── Cookie
│   └── Import/Export
├── 5. Automation
│   ├── Script
│   ├── Chạy script
│   ├── Lịch tự động
│   └── Lịch sử chạy
└── 6. Settings
    ├── Cài đặt app
    └── Đồng bộ cloud
```

---

## 3. Workspace

### 3.1. Đăng nhập

**Chức năng**: Đăng nhập vào app

**Thao tác ở đâu**: Màn hình đăng nhập (LoginPage)

**Test bằng tay**:
- [ ] Đăng nhập với email/password đúng
- [ ] Đăng nhập với password sai → Hiện lỗi
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập sau khi được mời vào workspace

**Bug dễ gặp**:
- Đăng nhập thành công nhưng không load workspace
- Lỗi Supabase không hiện rõ ràng
- Lời mời pending không tự động accept

**Ai được quyền**: Tất cả người dùng

---

### 3.2. Chuyển Workspace

**Chức năng**: Chuyển giữa các workspace khác nhau

**Thao tác ở đâu**: Góc trên bên trái, dropdown chọn workspace

**Test bằng tay**:
- [ ] Chuyển từ workspace A sang B
- [ ] Kiểm tra hồ sơ workspace A không còn hiện
- [ ] Kiểm tra thành viên workspace A không còn hiện
- [ ] Chuyển lại workspace A và kiểm tra dữ liệu đúng

**Bug dễ gặp**:
- **CRITICAL**: Dữ liệu workspace cũ vẫn hiện (data leak!)
- Chuyển workspace nhưng UI không reload
- Số lượng hồ sơ/thành viên sai

**Ai được quyền**: Owner và member của workspace đó

---

### 3.3. Cài đặt Workspace

**Chức năng**: Đổi tên workspace, cài đặt phân quyền

**Thao tác ở đâu**: Settings → Workspace Settings

**Test bằng tay**:
- [ ] Owner đổi tên workspace
- [ ] Owner thay đổi Permission Mode (group/profile)
- [ ] Member không thấy nút Settings

**Bug dễ gặp**:
- Member vào được Settings
- Đổi tên không lưu vào database
- Permission Mode thay đổi nhưng không áp dụng

**Ai được quyền**: Chỉ Owner

---

## 4. Thành viên (Members)

### 4.1. Nhóm Người dùng (User Groups)

**Chức năng**: Tạo nhóm để phân chia thành viên

**Thao tác ở đâu**: Members → Sidebar bên trái "Nhóm người dùng"

**Test bằng tay**:
- [ ] Owner tạo nhóm A, nhóm B
- [ ] Owner sửa tên nhóm
- [ ] Owner xóa nhóm (kiểm tra thành viên trong nhóm)
- [ ] Member không thấy nút tạo/sửa/xóa nhóm

**Bug dễ gặp**:
- Admin/Manager tạo được nhóm (sai! chỉ Owner)
- Xóa nhóm nhưng thành viên vẫn còn
- Member thấy tên nhóm khác

**Ai được quyền**: Chỉ Owner

---

### 4.2. Danh sách Thành viên

**Chức năng**: Xem danh sách thành viên trong workspace

**Thao tác ở đâu**: Members → Tab "Thành viên"

**Test bằng tay**:
- [ ] Owner thấy tất cả thành viên
- [ ] Member nhóm A chỉ thấy thành viên nhóm A
- [ ] Member nhóm B chỉ thấy thành viên nhóm B
- [ ] Không ai thấy Owner trong danh sách quản lý

**Bug dễ gặp**:
- **CRITICAL**: Member thấy thành viên nhóm khác
- Admin thấy tất cả (sai! chỉ Owner)
- Owner hiện trong danh sách có thể xóa

**Ai được quyền**: 
- Owner: Thấy tất cả
- Member: Chỉ thấy nhóm mình

---

### 4.3. Mời Thành viên

**Chức năng**: Mời người khác vào workspace

**Thao tác ở đâu**: Members → Nút "Mời thành viên"

**Test bằng tay**:
- [ ] Owner mời vào nhóm A với role Admin
- [ ] Owner mời vào nhóm B với role Member
- [ ] Member nhóm A mời vào nhóm A (nếu có quyền)
- [ ] Member nhóm A KHÔNG mời được vào nhóm B
- [ ] Kiểm tra email nhận được lời mời
- [ ] Người được mời đăng nhập và tự động accept

**Bug dễ gặp**:
- Mời không chọn nhóm → Lưu null (sai!)
- Member mời vào nhóm khác được (sai!)
- Lời mời không có thông tin phân quyền hồ sơ
- Email không gửi nhưng UI báo thành công

**Ai được quyền**:
- Owner: Mời vào bất kỳ nhóm nào
- Member: Chỉ mời vào nhóm mình (nếu có quyền invite)

---

### 4.4. Sửa/Xóa Thành viên

**Chức năng**: Thay đổi role, nhóm, giới hạn hồ sơ của thành viên

**Thao tác ở đâu**: Members → Click "Sửa" hoặc "Xóa" trên hàng thành viên

**Test bằng tay**:
- [ ] Owner sửa role thành viên nhóm A
- [ ] Owner chuyển thành viên từ nhóm A sang nhóm B
- [ ] Owner xóa thành viên
- [ ] Member nhóm A sửa thành viên nhóm A (nếu có quyền)
- [ ] Member nhóm A KHÔNG sửa được thành viên nhóm B
- [ ] Không ai xóa được Owner

**Bug dễ gặp**:
- Sửa thành công nhưng không reload UI
- Member sửa được thành viên nhóm khác
- Xóa Owner được (sai!)
- Role hiển thị sai (member → MEMBER thay vì MANAGER)

**Ai được quyền**:
- Owner: Sửa/xóa tất cả (trừ Owner)
- Member: Chỉ sửa/xóa trong nhóm mình (nếu có quyền)

---

## 5. Hồ sơ (Profiles)

### 5.1. Danh sách Hồ sơ

**Chức năng**: Xem danh sách hồ sơ browser

**Thao tác ở đâu**: Profiles → Danh sách hồ sơ

**Test bằng tay**:
- [ ] Owner thấy tất cả hồ sơ
- [ ] Member nhóm A chỉ thấy hồ sơ được phân quyền cho nhóm A
- [ ] Member nhóm B chỉ thấy hồ sơ nhóm B
- [ ] Chuyển workspace → Danh sách thay đổi hoàn toàn

**Bug dễ gặp**:
- **CRITICAL**: Member thấy hồ sơ nhóm khác
- Chuyển workspace nhưng hồ sơ cũ vẫn hiện
- Số lượng hồ sơ không khớp với database

**Ai được quyền**:
- Owner: Thấy tất cả
- Member: Chỉ thấy hồ sơ được phân quyền

---

### 5.2. Tạo Hồ sơ

**Chức năng**: Tạo hồ sơ browser mới

**Thao tác ở đâu**: Profiles → Nút "Tạo hồ sơ"

**Test bằng tay**:
- [ ] Owner tạo hồ sơ
- [ ] Member tạo hồ sơ (nếu có quyền và chưa đạt giới hạn)
- [ ] Member đạt giới hạn → Không tạo được
- [ ] Viewer không thấy nút tạo
- [ ] Hồ sơ mới xuất hiện trong danh sách
- [ ] Hồ sơ lưu đúng workspace

**Bug dễ gặp**:
- Tạo thành công nhưng không reload danh sách
- Hồ sơ tạo ở workspace A nhưng hiện ở workspace B
- Member vượt giới hạn vẫn tạo được
- Toast "Thành công" hiện trước khi lưu xong

**Ai được quyền**:
- Owner: Không giới hạn
- Member: Theo giới hạn và quyền create

---

### 5.3. Sửa/Xóa Hồ sơ

**Chức năng**: Thay đổi thông tin hồ sơ hoặc xóa hồ sơ

**Thao tác ở đâu**: Profiles → Click "Sửa" hoặc "Xóa"

**Test bằng tay**:
- [ ] Owner sửa/xóa bất kỳ hồ sơ nào
- [ ] Member sửa hồ sơ được phân quyền (nếu có quyền)
- [ ] Member KHÔNG sửa được hồ sơ không được phân quyền
- [ ] Xóa hồ sơ → Hồ sơ biến mất khỏi danh sách
- [ ] Xóa hồ sơ → File local cũng bị xóa

**Bug dễ gặp**:
- Sửa/xóa thành công nhưng UI không cập nhật
- Member sửa được hồ sơ nhóm khác
- Xóa hồ sơ nhưng file local vẫn còn
- Xóa nhiều hồ sơ → Một số thất bại nhưng UI báo tất cả thành công

**Ai được quyền**:
- Owner: Sửa/xóa tất cả
- Member: Chỉ sửa/xóa hồ sơ được phân quyền

---

### 5.4. Mở Browser

**Chức năng**: Mở hồ sơ trong cửa sổ browser

**Thao tác ở đâu**: Profiles → Click "Mở" trên hồ sơ

**Test bằng tay**:
- [ ] Owner mở bất kỳ hồ sơ nào
- [ ] Member mở hồ sơ được phân quyền
- [ ] Member KHÔNG mở được hồ sơ không được phân quyền
- [ ] Browser mở với đúng proxy/cookie
- [ ] Đóng browser → Trạng thái chuyển về "Closed"

**Bug dễ gặp**:
- **CRITICAL**: Member mở được hồ sơ nhóm khác
- Browser mở nhưng không có proxy
- Cookie không load
- Trạng thái "Open" không cập nhật

**Ai được quyền**:
- Owner: Mở tất cả
- Member: Chỉ mở hồ sơ được phân quyền

---

## 6. Automation

### 6.1. Script

**Chức năng**: Viết script tự động hóa

**Thao tác ở đâu**: Automation → Tab "Scripts"

**Test bằng tay**:
- [ ] Tạo script mới
- [ ] Sửa script
- [ ] Xóa script
- [ ] Lưu script → Reload danh sách

**Bug dễ gặp**:
- Lưu script nhưng không reload
- Xóa script nhưng vẫn hiện trong danh sách
- Script không lưu vào database

**Ai được quyền**: Tất cả member có quyền automation

---

### 6.2. Chạy Script

**Chức năng**: Chạy script trên hồ sơ

**Thao tác ở đâu**: Automation → Chọn script → Chọn hồ sơ → Chạy

**Test bằng tay**:
- [ ] Owner chạy script trên bất kỳ hồ sơ nào
- [ ] Member chạy script trên hồ sơ được phân quyền
- [ ] Member KHÔNG chạy được trên hồ sơ nhóm khác
- [ ] Script chạy thành công → Hiện log
- [ ] Script lỗi → Hiện lỗi rõ ràng

**Bug dễ gặp**:
- **CRITICAL**: Member chạy script trên hồ sơ nhóm khác
- Script chạy nhưng không có log
- Script lỗi nhưng báo thành công

**Ai được quyền**:
- Owner: Chạy trên tất cả hồ sơ
- Member: Chỉ chạy trên hồ sơ được phân quyền

---

## 7. Bảng Test Tay Nhanh

| Khu vực | Test cần làm | Kết quả đúng | Dấu hiệu bug |
|---------|--------------|--------------|--------------|
| **Workspace** | Chuyển A → B | Không thấy dữ liệu A | Vẫn thấy hồ sơ/member A |
| **Members** | Member A xem danh sách | Chỉ thấy member A | Thấy member B |
| **Members** | Member A mời vào nhóm B | Bị chặn | Mời được |
| **Members** | Xóa Owner | Bị chặn | Xóa được |
| **Profiles** | Member A xem hồ sơ | Chỉ thấy hồ sơ A | Thấy hồ sơ B |
| **Profiles** | Member A mở hồ sơ B | Bị chặn | Mở được |
| **Profiles** | Tạo hồ sơ | Hiện trong danh sách | Không hiện |
| **Profiles** | Xóa hồ sơ | Biến mất | Vẫn còn |
| **Automation** | Member A chạy script hồ sơ B | Bị chặn | Chạy được |

---

## 8. Luồng Test Quan trọng Nhất

### Test 1: Phân quyền Nhóm người dùng

**Chuẩn bị**:
1. Owner tạo nhóm A, nhóm B
2. Mời user1 vào nhóm A (role: Admin)
3. Mời user2 vào nhóm B (role: Member)
4. Tạo hồ sơ P1, P2, P3
5. Phân quyền: P1 cho nhóm A, P2 cho nhóm B, P3 cho cả 2

**Test**:
- [ ] Đăng nhập user1 (nhóm A)
  - Thấy: user1, các member nhóm A
  - Không thấy: user2, các member nhóm B
  - Thấy hồ sơ: P1, P3
  - Không thấy: P2
- [ ] Đăng nhập user2 (nhóm B)
  - Thấy: user2, các member nhóm B
  - Không thấy: user1, các member nhóm A
  - Thấy hồ sơ: P2, P3
  - Không thấy: P1
- [ ] user1 cố mở hồ sơ P2 (qua API) → Bị chặn
- [ ] user2 cố sửa member nhóm A → Bị chặn

---

### Test 2: Chuyển Workspace Không Leak

**Chuẩn bị**:
1. Tạo workspace W1, W2
2. W1 có hồ sơ H1, H2
3. W2 có hồ sơ H3, H4

**Test**:
- [ ] Đăng nhập vào W1
- [ ] Xem danh sách hồ sơ → Thấy H1, H2
- [ ] Chuyển sang W2
- [ ] Xem danh sách hồ sơ → Thấy H3, H4
- [ ] **KHÔNG thấy H1, H2**
- [ ] Chuyển lại W1 → Thấy H1, H2
- [ ] **KHÔNG thấy H3, H4**

---

### Test 3: Xóa/Sửa Thật sự Thay đổi

**Test**:
- [ ] Tạo hồ sơ mới
- [ ] Reload app → Hồ sơ vẫn còn
- [ ] Sửa tên hồ sơ
- [ ] Reload app → Tên đã thay đổi
- [ ] Xóa hồ sơ
- [ ] Reload app → Hồ sơ đã mất
- [ ] Kiểm tra database → Hồ sơ đã bị xóa

---

### Test 4: Mất Quyền Thì Không Làm Được

**Chuẩn bị**:
1. Member A có quyền xem hồ sơ P1
2. Owner thu hồi quyền P1 của member A

**Test**:
- [ ] Member A reload app
- [ ] Không thấy P1 trong danh sách
- [ ] Cố mở P1 (qua API) → Bị chặn
- [ ] Cố chạy script trên P1 → Bị chặn

---

## 9. Ghi chú cho Tester

### Khi nào cần test lại?

- Sau khi thay đổi code phân quyền
- Sau khi thay đổi RLS policies
- Sau khi thay đổi workspace switching
- Trước mỗi lần release

### Bug nghiêm trọng nhất

1. **Data leak giữa workspace**: Member thấy dữ liệu workspace khác
2. **Data leak giữa nhóm**: Member nhóm A thấy dữ liệu nhóm B
3. **Fake success**: UI báo thành công nhưng database không thay đổi
4. **Stale data**: Chuyển workspace nhưng dữ liệu cũ vẫn hiện

### Công cụ hỗ trợ

- Xem database trực tiếp trên Supabase
- Xem file local: `zenvy-data.json`
- Xem console log trong DevTools
- Dùng nhiều tài khoản test đồng thời

---

**Cập nhật**: 2026-05-14
**Nguồn**: `.codex/maps/app-function-map.md`
