# Hướng dẫn Kiểm tra Profile Antidetect

## 🎯 Cách sử dụng

### 1. Tạo Profile mới
- Mở ứng dụng Zenvy Browser
- Click "Tạo hồ sơ mới"
- Điền thông tin:
  - **Tên hồ sơ**: Tên để nhận diện
  - **Fingerprint**: Cấu hình các thông số giả mạo
  - **Proxy**: (Tùy chọn) Cấu hình proxy nếu cần

### 2. Cấu hình Fingerprint quan trọng

#### Tab "Fingerprint"
- **User Agent**: Chọn preset hoặc tự nhập
  - Khuyến nghị: Chrome 120 / Windows hoặc macOS
- **Hệ điều hành**: Windows, macOS, hoặc Linux
- **Ngôn ngữ**: vi-VN, en-US, etc.
- **Múi giờ**: Asia/Ho_Chi_Minh, America/New_York, etc.
- **Hardware Concurrency**: Số CPU cores (2-16)
- **WebRTC**:
  - ✅ **Vô hiệu hóa** (MẶC ĐỊNH - Bắt buộc cho 100/100 điểm)
  - ⚠️ Thực (Chỉ bật nếu cần video call - Giảm xuống 70/100)
- **Canvas**:
  - ✅ **Nhiễu** (Tạo fingerprint unique)
  - Thực (Dùng canvas thật)
- **WebGL**:
  - ✅ **Nhiễu** (Tạo fingerprint unique)
  - Thực (Dùng WebGL thật)

### 3. Mở Profile và Kiểm tra

Khi bạn click "Mở" profile, trình duyệt sẽ tự động:
1. ✅ Launch Chrome với fingerprint đã cấu hình
2. ✅ Tự động mở trang **Kiểm tra Fingerprint**
3. ✅ Hiển thị kết quả chi tiết

## 📊 Đọc kết quả Kiểm tra

### Điểm Antidetect (0-100)
- **90-100**: ✅ Excellent - Profile rất tốt
- **70-89**: ⚠️ Good - Chấp nhận được
- **0-69**: ❌ Poor - Cần cải thiện

### Các chỉ số quan trọng

#### 1. WebDriver Detection
- ✅ **Not detected**: Tốt - Không bị phát hiện automation
- ❌ **Detected**: Xấu - Bị phát hiện là bot

#### 2. WebRTC
- ✅ **Disabled**: Tốt - Không bị leak IP
- ⚠️ **Enabled**: Cảnh báo - Có thể bị leak IP thật

#### 3. User Agent
- Kiểm tra xem User Agent có khớp với cấu hình không
- Platform và Vendor phải phù hợp với OS

#### 4. Hardware Info
- CPU Cores: Phải khớp với Hardware Concurrency đã set
- Screen: Độ phân giải màn hình
- Device Memory: RAM của thiết bị

#### 5. Canvas Fingerprint
- Mỗi profile sẽ có Canvas hash unique
- Nếu set "Nhiễu", mỗi lần sẽ khác nhau

#### 6. WebGL Info
- Vendor và Renderer: Thông tin card đồ họa
- Nếu set "Nhiễu", sẽ được randomize

## 🔧 Cải thiện Profile

### Nếu điểm < 90:

1. **WebDriver Detected**
   - ✅ Đã được xử lý tự động bởi flags:
     - `--disable-blink-features=AutomationControlled`
     - `--exclude-switches=enable-automation`

2. **WebRTC Leak**
   - ✅ Set WebRTC = "Vô hiệu hóa" trong Fingerprint tab
   - Flags tự động: `--disable-webrtc`

3. **Canvas/WebGL Fingerprint**
   - ✅ Set Canvas = "Nhiễu"
   - ✅ Set WebGL = "Nhiễu"

## 🎨 Các tính năng Antidetect đã implement

### ✅ Automation Detection
```
--disable-blink-features=AutomationControlled
--exclude-switches=enable-automation
```

### ✅ WebRTC Protection
```
--disable-webrtc
--enforce-webrtc-ip-permission-check
--force-webrtc-ip-handling-policy=disable_non_proxied_udp
```

### ✅ Canvas Noise
```
--disable-reading-from-canvas
```

### ✅ User Agent Spoofing
```
--user-agent=<custom>
--lang=<custom>
```

### ✅ Proxy Support
- HTTP Proxy
- SOCKS5 Proxy
- Authentication support

## 📝 Best Practices

### 1. Profile cho Facebook
```
User Agent: Chrome 120 / Windows
OS: Windows
Language: vi-VN
Timezone: Asia/Ho_Chi_Minh
WebRTC: Vô hiệu hóa
Canvas: Nhiễu
WebGL: Nhiễu
Hardware Concurrency: 8
```

### 2. Profile cho Google
```
User Agent: Chrome 120 / macOS
OS: macOS
Language: en-US
Timezone: America/New_York
WebRTC: Vô hiệu hóa
Canvas: Nhiễu
WebGL: Nhiễu
Hardware Concurrency: 8
```

### 3. Profile cho Amazon
```
User Agent: Chrome 120 / Windows
OS: Windows
Language: en-US
Timezone: America/Los_Angeles
WebRTC: Vô hiệu hóa
Canvas: Nhiễu
WebGL: Nhiễu
Hardware Concurrency: 8
Proxy: US Residential
```

## 🧪 Test với các website

Sau khi kiểm tra fingerprint, bạn có thể test thêm với:

1. **https://browserleaks.com/canvas**
   - Kiểm tra Canvas fingerprint

2. **https://browserleaks.com/webrtc**
   - Kiểm tra WebRTC leak

3. **https://bot.sannysoft.com/**
   - Kiểm tra bot detection

4. **https://pixelscan.net/**
   - Kiểm tra tổng thể fingerprint

5. **https://abrahamjuliot.github.io/creepjs/**
   - Kiểm tra chi tiết fingerprint

## ⚠️ Lưu ý

1. **Không dùng cùng fingerprint cho nhiều account**
   - Mỗi profile nên có fingerprint unique

2. **Proxy quan trọng**
   - Nếu quản lý nhiều account, nên dùng proxy khác nhau
   - Residential proxy tốt hơn Datacenter proxy

3. **Cookies**
   - Import cookies để giữ session
   - Format: JSON array

4. **Timezone phải khớp với IP**
   - Nếu dùng US proxy, set timezone US
   - Nếu dùng VN proxy, set timezone Asia/Ho_Chi_Minh

## 🚀 Tips nâng cao

1. **Rotate User Agent**
   - Thay đổi User Agent định kỳ
   - Giữ phù hợp với OS

2. **Screen Resolution**
   - Hiện tại dùng screen thật
   - Có thể customize trong tương lai

3. **Hardware Concurrency**
   - Set phù hợp với device class
   - Mobile: 4-8 cores
   - Desktop: 8-16 cores

4. **Device Memory**
   - Hiện tại dùng memory thật
   - Có thể customize trong tương lai

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra log trong Console (F12)
2. Kiểm tra Chrome có được cài đặt không
3. Kiểm tra proxy có hoạt động không
4. Restart ứng dụng và thử lại
