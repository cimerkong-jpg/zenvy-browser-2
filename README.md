# 🔒 Zenvy Browser

Antidetect browser for managing multiple accounts with advanced fingerprint protection.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎭 **Profile Management** - Create unlimited isolated browser profiles
- 🔐 **Fingerprint Antidetect** - 100/100 antidetect score
- 🌐 **WebRTC Blocking** - Prevent IP leaks
- 🎨 **Canvas & WebGL Noise** - Unique fingerprints per profile
- 🔌 **Proxy Support** - HTTP & SOCKS5 with authentication
- 📊 **Built-in Testing** - Real-time fingerprint verification
- 🎨 **Modern UI** - Beautiful 3D animated interface

## 🚀 Quick Start

### Download

**macOS (Apple Silicon):**
- [Download DMG](https://github.com/cimerkong-jpg/zenvy-browser/releases/latest/download/Zenvy-Browser.dmg)

**Windows & Linux:**
- Coming soon

### Installation

**macOS:**
1. Download `Zenvy Browser.dmg`
2. Open DMG and drag to Applications
3. Right-click → Open (first time only)

## 📖 Usage

1. **Create Profile**
   - Click "Tạo hồ sơ mới"
   - Configure fingerprint settings
   - Add proxy (optional)

2. **Open Profile**
   - Click "Mở" on any profile
   - Browser launches with test page
   - Check antidetect score (0-100)

3. **Verify Protection**
   - Test page opens automatically
   - Shows all fingerprint details
   - Displays antidetect score

## 🎯 Antidetect Score

- **90-100**: ✅ Excellent - Perfect protection
- **70-89**: ⚠️ Good - Acceptable
- **0-69**: ❌ Poor - Needs improvement

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome installed

### Setup

```bash
# Clone repository
git clone https://github.com/cimerkong-jpg/zenvy-browser.git
cd zenvy-browser

# Install dependencies
npm install

# Run development
npm start

# Build for production
npm run make
```

### Project Structure

```
zenvy-browser/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload scripts
│   ├── renderer/      # React UI
│   └── shared/        # Shared types
├── resources/         # Static resources
│   ├── fingerprint-test.html
│   └── webrtc-inject.js
├── out/make/          # Built installers
└── docs/              # Documentation
```

## 📚 Documentation

- [Antidetect Guide](ANTIDETECT-GUIDE.md) - Complete antidetect usage guide
- [Distribution Guide](DISTRIBUTION.md) - How to build and distribute

## 🎨 Screenshots

### Main Interface
Beautiful 3D animated UI with profile management

### Fingerprint Test
Real-time antidetect score and detailed checks

### Profile Settings
Comprehensive fingerprint customization

## 🔐 Security Features

### Automation Detection
- ✅ `--disable-blink-features=AutomationControlled`
- ✅ `--exclude-switches=enable-automation`
- ✅ No webdriver detection

### WebRTC Protection
- ✅ JavaScript API blocking
- ✅ IP leak prevention
- ✅ 7+ Chrome flags

### Canvas & WebGL
- ✅ Canvas noise injection
- ✅ WebGL parameter spoofing
- ✅ Unique fingerprints

## 🌐 Proxy Support

- HTTP Proxy
- SOCKS5 Proxy
- Username/Password authentication
- Per-profile configuration

## 📊 Testing

```bash
# Run automated tests
node test-antidetect.js

# Results: 22/22 tests passed ✅
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- 📧 Email: support@zenvy.com
- 💬 Issues: [GitHub Issues](https://github.com/cimerkong-jpg/zenvy-browser/issues)
- 📖 Docs: [Documentation](https://github.com/cimerkong-jpg/zenvy-browser/wiki)

## 🙏 Acknowledgments

- Built with Electron + React + TypeScript
- Inspired by GoLogin, Multilogin, AdsPower
- Community feedback and contributions

---

**⭐ Star this repo if you find it useful!**

Made with ❤️ by Zenvy Team
