# Hướng Dẫn Setup Supabase Auth - Từ Đầu 🚀

## Bước 1: Tạo Supabase Project

### 1.1 Đăng ký/Đăng nhập Supabase
1. Mở trình duyệt, vào: **https://supabase.com**
2. Click **"Start your project"** hoặc **"Sign In"**
3. Đăng nhập bằng GitHub (khuyến nghị) hoặc email

### 1.2 Tạo Project Mới
1. Sau khi đăng nhập, click **"New Project"**
2. Chọn Organization (hoặc tạo mới nếu chưa có)
3. Điền thông tin:
   - **Name:** `zenvy-browser` (hoặc tên bạn thích)
   - **Database Password:** Tạo password mạnh (LƯU LẠI password này!)
   - **Region:** Chọn gần bạn nhất (ví dụ: Singapore)
   - **Pricing Plan:** Free (đủ cho development)
4. Click **"Create new project"**
5. Đợi 1-2 phút để Supabase setup database

---

## Bước 2: Lấy API Keys

### 2.1 Vào Settings
1. Trong project vừa tạo, click **"Settings"** (icon bánh răng) ở sidebar trái
2. Click **"API"** trong menu Settings

### 2.2 Copy Keys
Bạn sẽ thấy 2 thông tin quan trọng:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```
👉 Copy URL này

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```
👉 Copy key này (key rất dài, bắt đầu bằng `eyJ...`)

⚠️ **LƯU Ý:** 
- Copy **anon public** key (KHÔNG phải service_role key)
- anon public key an toàn để dùng trong app

---

## Bước 3: Tắt Email Confirmation (Để Test Nhanh)

### 3.1 Vào Authentication Settings
1. Click **"Authentication"** ở sidebar trái
2. Click **"Providers"**
3. Tìm **"Email"** trong danh sách providers

### 3.2 Tắt Confirm Email
1. Click vào **"Email"** để mở settings
2. Tìm toggle **"Confirm email"**
3. **TẮT** toggle này (OFF)
4. Click **"Save"**

✅ Bây giờ user có thể đăng ký và login ngay mà không cần xác nhận email!

---

## Bước 4: Cập Nhật File .env

### 4.1 Mở File .env
File `.env` đã có sẵn trong project root. Bạn cần cập nhật nó.

### 4.2 Thay Thế Nội Dung
Mở file `.env` và thay thế bằng:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

👉 Thay `xxxxxxxxxxxxx` bằng Project URL của bạn
👉 Thay `eyJ...` bằng anon public key của bạn

**Ví dụ thực tế:**
```env
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.3 Lưu File
- Nhấn **Cmd+S** (Mac) hoặc **Ctrl+S** (Windows) để lưu

---

## Bước 5: Test Kết Nối

### 5.1 Chạy Test Script
Mở Terminal trong VSCode và chạy:

```bash
node test-auth-simple.js
```

### 5.2 Kết Quả Mong Đợi
Bạn sẽ thấy:

```
🔍 Testing Supabase Auth...

1. Environment Variables:
   SUPABASE_URL: ✅ Set
   SUPABASE_ANON_KEY: ✅ Set

2. Creating Supabase client...
   ✅ Client created

3. Testing Sign Up...
   ✅ Sign up successful
   User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

4. Testing Sign In...
   ✅ Sign in successful!
   User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Email: test@zenvy.app
   Access Token: eyJhbGciOiJIUzI1NiI...

5. Testing Get Session...
   ✅ Session retrieved
   User: test@zenvy.app

6. Testing Sign Out...
   ✅ Sign out successful

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All auth tests passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

✅ Nếu thấy output như trên = **THÀNH CÔNG!**

❌ Nếu thấy lỗi:
- Kiểm tra lại URL và Key trong `.env`
- Đảm bảo đã tắt "Confirm email" trong Supabase
- Restart terminal và chạy lại

---

## Bước 6: Chạy App

### 6.1 Start App
```bash
npm start
```

### 6.2 Test Auth Flow

**Đăng Ký:**
1. App sẽ mở và hiện màn hình Login
2. Click **"Sign up"** ở dưới
3. Nhập email: `test@example.com`
4. Nhập password: `test123456`
5. Nhập confirm password: `test123456`
6. Click **"Sign Up"**
7. ✅ Sẽ tự động đăng nhập và vào dashboard

**Đăng Nhập:**
1. Nếu đã có account, ở màn hình Login:
2. Nhập email và password
3. Click **"Sign In"**
4. ✅ Vào dashboard

**Session Persistence:**
1. Đóng app (Cmd+Q hoặc Ctrl+Q)
2. Mở lại app (`npm start`)
3. ✅ Vẫn đăng nhập, không cần login lại

**Đăng Xuất:**
1. Trong app, tìm nút logout (sẽ thêm sau)
2. Click logout
3. ✅ Quay về màn hình login

---

## Bước 7: Kiểm Tra Users Trong Supabase

### 7.1 Xem Users
1. Vào Supabase dashboard
2. Click **"Authentication"** > **"Users"**
3. Bạn sẽ thấy danh sách users đã đăng ký

### 7.2 Quản Lý Users
- Xem email, ID, thời gian tạo
- Xóa users nếu cần
- Reset password
- Ban users

---

## ✅ Checklist Hoàn Thành

- [ ] Tạo Supabase project
- [ ] Lấy Project URL
- [ ] Lấy anon public key
- [ ] Tắt "Confirm email"
- [ ] Cập nhật file `.env`
- [ ] Chạy `node test-auth-simple.js` → Pass
- [ ] Chạy `npm start`
- [ ] Test đăng ký → Thành công
- [ ] Test đăng nhập → Thành công
- [ ] Test session persistence → Thành công

---

## 🚨 Troubleshooting

### Lỗi: "Supabase not configured"
**Nguyên nhân:** File `.env` chưa đúng
**Giải pháp:**
1. Kiểm tra file `.env` có đúng format không
2. Đảm bảo không có khoảng trắng thừa
3. Restart terminal và app

### Lỗi: "Email not confirmed"
**Nguyên nhân:** Chưa tắt email confirmation
**Giải pháp:**
1. Vào Supabase dashboard
2. Authentication > Providers > Email
3. Tắt "Confirm email"
4. Save
5. Xóa users cũ và tạo lại

### Lỗi: "Invalid API key"
**Nguyên nhân:** Copy sai key
**Giải pháp:**
1. Vào Supabase dashboard
2. Settings > API
3. Copy lại **anon public** key (KHÔNG phải service_role)
4. Cập nhật `.env`

### App không kết nối được
**Giải pháp:**
1. Kiểm tra internet
2. Kiểm tra Supabase project có đang chạy không
3. Restart app

---

## 📞 Cần Giúp Đỡ?

Nếu gặp vấn đề:
1. Chụp màn hình lỗi
2. Copy error message
3. Kiểm tra console log
4. Hỏi tôi với thông tin chi tiết

---

## 🎉 Xong!

Bây giờ app của bạn đã có:
- ✅ Đăng ký account
- ✅ Đăng nhập
- ✅ Session persistence
- ✅ Bảo mật với Supabase

**Bước tiếp theo:** Thêm nút logout và sync data!
