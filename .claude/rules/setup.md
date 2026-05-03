# Setup Guide - Zenvy Browser

## Prerequisites
- Node.js 20+ recommended.
- npm.
- Google Chrome installed.

## Install
```bash
npm install
```

## Development
```bash
npm start
```

## Typecheck
```bash
npm run typecheck
```

## Package
```bash
npm run build
```

This runs `electron-forge package`.

## Make Installers
```bash
npm run make
```

## Current Verification
After cleanup on 2026-05-01:

```bash
npm run typecheck
npm run build
```

Both passed.

## Windows Troubleshooting

### PowerShell blocks npm
Use:

```bash
npm.cmd run typecheck
npm.cmd run build
```

### Missing `.cmd` shims or Rollup optional dependency
Run:

```bash
npm install
```

This restores `node_modules/.bin/*.cmd` and platform optional packages such as Rollup native bindings.

## macOS Troubleshooting

### Electron quarantine issue
```bash
xattr -r -d com.apple.quarantine node_modules/electron/dist/Electron.app
codesign --force --deep --sign - node_modules/electron/dist/Electron.app
```

### Chrome path
Default expected path:

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

## Build Output
- Packaged app output: `out/`.
- Distributables: `out/make/`.
- These paths are ignored and should not be committed.
