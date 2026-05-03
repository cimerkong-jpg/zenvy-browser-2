# 📦 Hướng dẫn Distribution - Zenvy Browser

## 🎯 Build đã hoàn thành!

### 📁 Files đã tạo

**Location:** `out/make/`

#### macOS (hiện tại)
- ✅ **Zenvy Browser.dmg** - Installer cho macOS
- ✅ **Zenvy Browser-darwin-arm64-0.0.1.zip** - Portable version

## 🚀 Cài đặt trên các thiết bị

### macOS (✅ Đã build)

**Option 1: DMG Installer (Khuyến nghị)**
1. Mở file `Zenvy Browser.dmg`
2. Kéo icon "Zenvy Browser" vào thư mục Applications
3. Mở Applications → Zenvy Browser
4. Nếu gặp cảnh báo "unidentified developer":
   - Right-click → Open
   - Hoặc: System Settings → Privacy & Security → Open Anyway

**Option 2: ZIP Portable**
1. Giải nén `Zenvy Browser-darwin-arm64-0.0.1.zip`
2. Chạy file `Zenvy Browser.app`

### Windows (Cần build)

**Để build cho Windows:**
```bash
# Trên máy Windows hoặc dùng CI/CD
npm run make -- --platform=win32
```

**Sẽ tạo:**
- `Zenvy Browser Setup.exe` - Installer
- `Zenvy Browser-win32-x64.zip` - Portable

**Cài đặt:**
1. Chạy `Zenvy Browser Setup.exe`
2. Follow wizard
3. Launch từ Start Menu

### Linux (Cần build)

**Để build cho Linux:**
```bash
# Trên máy Linux hoặc dùng CI/CD
npm run make -- --platform=linux
```

**Sẽ tạo:**
- `.deb` - Cho Ubuntu/Debian
- `.rpm` - Cho Fedora/RedHat
- `.AppImage` - Universal Linux

**Cài đặt:**
```bash
# Debian/Ubuntu
sudo dpkg -i zenvy-browser_0.0.1_amd64.deb

# Fedora/RedHat
sudo rpm -i zenvy-browser-0.0.1.x86_64.rpm

# AppImage (universal)
chmod +x Zenvy-Browser-0.0.1.AppImage
./Zenvy-Browser-0.0.1.AppImage
```

## 🔧 Build cho tất cả platforms

### Option 1: Build locally (cần máy tương ứng)

**macOS:**
```bash
npm run make -- --platform=darwin
```

**Windows:**
```bash
npm run make -- --platform=win32
```

**Linux:**
```bash
npm run make -- --platform=linux
```

### Option 2: GitHub Actions (Khuyến nghị)

Tạo file `.github/workflows/build.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm run make

      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: out/make/**/*
```

**Sử dụng:**
```bash
git tag v0.0.1
git push origin v0.0.1
```

## 📤 Distribution Methods

### 1. Direct Download
- Upload files lên Google Drive / Dropbox
- Share link với users
- Đơn giản nhưng không auto-update

### 2. GitHub Releases
```bash
# Tạo release
gh release create v0.0.1 \
  out/make/Zenvy\ Browser.dmg \
  out/make/zip/darwin/arm64/*.zip \
  --title "Zenvy Browser v0.0.1" \
  --notes "First release"
```

### 3. Website Download Page
```html
<a href="https://github.com/user/zenvy-browser/releases/latest/download/Zenvy-Browser.dmg">
  Download for macOS
</a>
```

### 4. Auto-Update (Nâng cao)

Thêm vào `forge.config.ts`:
```typescript
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'your-username',
        name: 'zenvy-browser'
      },
      prerelease: false
    }
  }
]
```

## 🔐 Code Signing (Production)

### macOS
```bash
# Cần Apple Developer Account ($99/year)
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
npm run make
```

### Windows
```bash
# Cần Code Signing Certificate
npm run make -- --platform=win32
```

## 📊 File Sizes

**macOS:**
- DMG: ~150-200 MB
- ZIP: ~150 MB

**Windows:**
- Setup.exe: ~120-150 MB
- ZIP: ~120 MB

**Linux:**
- .deb: ~120 MB
- .AppImage: ~130 MB

## 🎯 Checklist trước khi distribute

- [ ] Test installer trên máy sạch
- [ ] Verify tất cả features hoạt động
- [ ] Check không có hardcoded paths
- [ ] Test với Chrome chưa cài
- [ ] Verify database tạo đúng location
- [ ] Test proxy connections
- [ ] Verify fingerprint test page
- [ ] Check WebRTC blocker
- [ ] Test trên nhiều OS versions
- [ ] Prepare README và documentation

## 📝 Version Management

**Update version:**
```bash
# package.json
"version": "0.0.2"

# Build
npm run make

# Tag
git tag v0.0.2
git push origin v0.0.2
```

## 🆘 Troubleshooting

### "App can't be opened" (macOS)
```bash
xattr -cr "/Applications/Zenvy Browser.app"
```

### Missing dependencies
```bash
npm install
npm run make
```

### Build fails
```bash
rm -rf node_modules out
npm install
npm run make
```

## 🎉 Current Status

**✅ Đã build cho:**
- macOS (ARM64) - Apple Silicon

**⏳ Cần build cho:**
- macOS (x64) - Intel Macs
- Windows (x64)
- Linux (x64)

**📍 Files hiện tại:**
- `out/make/Zenvy Browser.dmg` - Ready to distribute!
- `out/make/zip/darwin/arm64/Zenvy Browser-darwin-arm64-0.0.1.zip`

## 🚀 Next Steps

1. **Test DMG** trên máy Mac khác
2. **Build cho Windows** (nếu có máy Windows)
3. **Build cho Linux** (nếu cần)
4. **Setup GitHub Releases** cho auto-distribution
5. **Create landing page** với download links
6. **Setup analytics** (optional)
7. **Implement auto-update** (optional)

---

**Zenvy Browser v0.0.1 sẵn sàng distribute!** 🎉
