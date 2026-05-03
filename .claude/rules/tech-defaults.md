# Tech Defaults - Zenvy Browser

## Runtime
- Node.js: target 20+.
- Package manager: npm.
- Electron: `^28.3.3`.
- React: `^18.3.1`.
- TypeScript: `^5.4.5`.
- Vite: `^5.2.11`.

## Core Dependencies
- `puppeteer`: browser automation/Chrome integration dependency.
- `puppeteer-extra`: stealth-capable Puppeteer wrapper.
- `puppeteer-extra-plugin-stealth`: stealth hardening.
- `zustand`: renderer state management.

## Build Tooling
- Electron Forge CLI.
- Electron Forge Vite Plugin.
- Makers:
  - DMG/ZIP for macOS.
  - Squirrel/ZIP for Windows.
  - DEB/RPM for Linux.

## Scripts
- `npm start`: run Electron Forge dev app.
- `npm run package`: package app.
- `npm run make`: build distributables.
- `npm run build`: alias for `electron-forge package`.
- `npm run typecheck`: TypeScript check.
- `npm test`: run antidetect test script.

## Verification Baseline
Before upload/commit:

```bash
npm run typecheck
npm run build
git diff --check
```

## Windows Notes
- If PowerShell blocks `npm.ps1`, use `npm.cmd`.
- If `.cmd` shims are missing in `node_modules/.bin`, run `npm install`.
- If Rollup optional native package is missing, run `npm install` to restore optional dependencies.
