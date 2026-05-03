# Platform Support - Zenvy Browser

## Targets
- Primary: macOS.
- Secondary: Windows.
- Linux packaging exists through Electron Forge makers but is not the main product target yet.

## Chrome Paths
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\Program Files\Google Chrome\Application\chrome.exe`

## Build Commands
- Development: `npm start`.
- Package current platform: `npm run package` or `npm run build`.
- Make distributables: `npm run make`.

## Platform Notes
- Use `path.join()` for profile/user data paths.
- Chrome launch paths and process behavior differ between macOS and Windows.
- On Windows, prefer `npm.cmd` if PowerShell blocks npm scripts.
- macOS package should be tested on Apple Silicon first.
