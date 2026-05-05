# Lấy Đúng Supabase API Key 🔑

## ❌ Vấn Đề:

```
❌ Sign in failed: Invalid API key
```

**Nguyên nhân:** Key bạn cung cấp không đúng format. Key phải là JWT token dài, bắt đầu bằng `eyJ...`

---

## ✅ Cách Lấy Đúng Key:

### Bước 1: Vào Supabase Dashboard
1. Mở https://supabase.com
2. Chọn project: `zenvy-browser`

### Bước 2: Vào Settings > API
1. Click **"Settings"** (icon bánh răng) ở sidebar trái
2. Click **"API"** trong menu Settings

### Bước 3: Copy Đúng Key

Bạn sẽ thấy section **"Project API keys"**:

#### ✅ ĐÚNG - Copy key này:
```
anon public
────────────────────────────────────────────────────────
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvb
XpiZHdhdHR3bHhnd21lZHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTI0NzAsImV4cCI6
MjA2MjAyODQ3MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Đặc điểm:**
- ✅ Rất dài (200-300 ký tự)
- ✅ Bắt đầu bằng `eyJ`
- ✅ Có 2 dấu chấm `.` chia thành 3 phần
- ✅ Label là **"anon"** hoặc **"anon public"**

#### ❌ SAI - KHÔNG copy key này:
```
service_role secret
────────────────────────────────────────────────────────
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvb...
```
**Lý do:** Đây là secret key, không được dùng trong client app!

---

## 📋 Hướng Dẫn Chi Tiết:

### 1. Tìm Section "Project API keys"
Scroll xuống trong trang Settings > API, bạn sẽ thấy:

```
Project API keys
────────────────────────────────────────────────────────

Project URL
https://zomzbdwattwlxgwmedxd.supabase.co

anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
[Copy button]

service_role secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
[Copy button]
```

### 2. Click Copy Button
- Click nút **Copy** bên cạnh **"anon public"**
- KHÔNG click copy ở "service_role secret"

### 3. Paste Vào .env
Key sẽ trông như thế này:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvb
XpiZHdhdHR3bHhnd21lZHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTI0NzAsImV4cCI6
MjA2MjAyODQ3MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 Sau Khi Lấy Key:

### Cập nhật file .env:
```env
SUPABASE_URL=https://zomzbdwattwlxgwmedxd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvb...
```

### Test lại:
```bash
node test-auth-simple.js
```

### Kết quả mong đợi:
```
✅ Sign up successful
✅ Sign in successful!
✅ All auth tests passed!
```

---

## 📸 Screenshot Tham Khảo:

Trong Supabase dashboard, bạn sẽ thấy:

```
┌─────────────────────────────────────────┐
│ Project API keys                        │
├─────────────────────────────────────────┤
│                                         │
│ Project URL                             │
│ https://xxx.supabase.co      [Copy]    │
│                                         │
│ anon public                             │
│ eyJhbGciOiJIUzI1NiIsInR5...  [Copy] ← COPY CÁI NÀY
│                                         │
│ service_role secret                     │
│ eyJhbGciOiJIUzI1NiIsInR5...  [Copy] ← KHÔNG COPY
│                                         │
└─────────────────────────────────────────┘
```

---

## ⚠️ Lưu Ý Quan Trọng:

### ✅ anon public key:
- An toàn để dùng trong app
- Có thể public
- Dùng cho client-side auth

### ❌ service_role secret key:
- KHÔNG BAO GIỜ dùng trong app
- Chỉ dùng trong server
- Có quyền admin, rất nguy hiểm nếu lộ

---

## 🎯 Checklist:

- [ ] Vào Supabase dashboard
- [ ] Settings > API
- [ ] Tìm "anon public" key
- [ ] Click Copy
- [ ] Paste vào .env
- [ ] Key phải bắt đầu bằng `eyJ`
- [ ] Key phải rất dài (200+ ký tự)
- [ ] Lưu file .env
- [ ] Chạy `node test-auth-simple.js`
- [ ] Thấy "All tests passed"

---

**Hãy lấy lại key đúng và cho tôi biết!**
