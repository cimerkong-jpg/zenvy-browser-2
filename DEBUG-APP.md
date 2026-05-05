# Debug "Supabase not configured" trong App

## 🔍 Vấn Đề:

App báo "Supabase not configured" mặc dù test script chạy OK.

**Nguyên nhân:** Auth đang chạy trong **main process** (Node.js), không phải renderer process (browser).

---

## ✅ Architecture Hiện Tại (ĐÚNG):

```
Renderer (UI)
    ↓ IPC
Main Process (Auth)
    ↓
Supabase
```

Auth đã được implement đúng qua IPC. Không cần sửa gì!

---

## 🧪 Kiểm Tra Lỗi:

### Bước 1: Mở DevTools
Khi app chạy:
1. Nhấn **Cmd+Option+I** (Mac) hoặc **Ctrl+Shift+I** (Windows)
2. Xem tab **Console**
3. Tìm error messages màu đỏ

### Bước 2: Kiểm Tra Main Process Logs
Trong terminal nơi chạy `npm start`, xem output:
```
[Supabase] Configuration check:
  SUPABASE_URL: https://zomzbdwattwlxgwmedxd...
  SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiI...
```

Nếu thấy "NOT SET" → Vấn đề ở đây!

---

## 🔧 Các Trường Hợp:

### Case 1: Main Process Logs Show "NOT SET"

**Nguyên nhân:** dotenv không load trong main process

**Fix:**
File `src/main/supabase.ts` đã có `import 'dotenv/config'` ở đầu.

Nhưng có thể cần restart **hoàn toàn**:
1. Tắt terminal (Ctrl+C)
2. Đóng app
3. Chạy lại `npm start`

### Case 2: Renderer Shows Error

**Có thể thấy:**
- "Supabase not configured"
- "Failed to check authentication status"
- Network errors

**Debug:**
1. Mở DevTools Console
2. Chạy: `await window.api.auth.getCurrentUser()`
3. Xem kết quả

**Nếu thấy error** → Copy error message và cho tôi biết

### Case 3: IPC Not Working

**Triệu chứng:**
- `window.api.auth` is undefined
- Cannot read property 'getCurrentUser'

**Fix:** Restart app hoàn toàn

---

## 🎯 Checklist Debug:

- [ ] Restart app hoàn toàn (tắt terminal + đóng app)
- [ ] Chạy `npm start` lại
- [ ] Kiểm tra terminal logs (main process)
- [ ] Mở DevTools Console (renderer)
- [ ] Test: `window.api.auth.getCurrentUser()`
- [ ] Copy error message nếu có

---

## 📋 Thông Tin Cần:

Nếu vẫn lỗi, cho tôi biết:

1. **Terminal logs** (main process):
```
[Supabase] Configuration check:
  SUPABASE_URL: ???
  SUPABASE_ANON_KEY: ???
```

2. **DevTools Console** (renderer):
```
Error: ???
```

3. **Test command result**:
```javascript
await window.api.auth.getCurrentUser()
// Result: ???
```

---

## ✅ Expected Behavior:

**Terminal (Main Process):**
```
[Supabase] Configuration check:
  SUPABASE_URL: https://zomzbdwattwlxgwmedxd...
  SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiI...
```

**App:**
- Shows loading screen
- Then shows login page
- No errors in console

**DevTools Console:**
```javascript
await window.api.auth.getCurrentUser()
// Result: null (if not logged in)
```

---

## 🚀 Quick Fix:

1. **Tắt app hoàn toàn**
2. **Tắt terminal** (Ctrl+C)
3. **Chạy lại:**
```bash
npm start
```
4. **Kiểm tra terminal logs**
5. **Mở DevTools và xem console**

---

**Hãy làm theo và cho tôi biết kết quả!**
