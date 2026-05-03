# Architecture - Zenvy Browser

## Tech Stack
- Desktop shell: Electron.
- Renderer UI: React + Tailwind CSS.
- State management: Zustand.
- Data/storage layer: JSON file in Electron `userData` (`zenvy-data.json`). SQLite is a future migration option, not an active dependency.
- Browser launch: Chrome/Puppeteer-related integration from main process.
- Build: Electron Forge + Vite Plugin.
- Language: TypeScript.

## Process Model
- Main process owns filesystem/data/browser launch work.
- Renderer process owns UI only.
- Preload exposes a typed API through `contextBridge`.
- Renderer calls backend operations with `ipcRenderer.invoke()`.
- Do not expose raw Node APIs to renderer.

## Main Modules
- `src/main/index.ts`: Electron lifecycle and IPC registration.
- `src/main/db.ts`: profile/group/tag/profile import-export data operations.
- `src/main/browser.ts`: Chrome launch, close, running profile tracking, fingerprint script injection.
- `src/main/cookies.ts`: cookie operations.
- `src/main/templates.ts`: profile template operations.
- `src/main/fingerprints/`: generated fingerprint data helpers.

## Renderer Modules
- `src/renderer/src/pages/ProfilesPage.tsx`: main profile management page.
- `src/renderer/src/components/ProfileModal.tsx`: profile create/edit form and fingerprint settings.
- `src/renderer/src/components/ProfileRow.tsx`: profile row actions, selection, context menu, drag support.
- `src/renderer/src/components/CookieManager.tsx`: cookie management UI.
- `src/renderer/src/components/TemplateManager.tsx`: template management UI.
- `src/renderer/src/components/ContextMenu.tsx`: reusable context menu.
- `src/renderer/src/components/ProfileStats.tsx`: profile stats cards.
- `src/renderer/src/components/TagInput.tsx`: tag selection/creation UI.
- `src/renderer/src/store/useStore.ts`: app state.
- `src/renderer/src/store/useTheme.ts`: theme state.
- `src/renderer/src/hooks/`: keyboard shortcut and drag/drop hooks.

## Shared Types
- `src/shared/types.ts` is the contract between main, preload and renderer.
- Any IPC-facing shape must be represented here before being exposed.

## IPC API Groups
- `groups`: get/create/update/delete.
- `profiles`: get/create/update/delete/deleteMany/duplicate/export/import.
- `tags`: get/create/delete.
- `browser`: launch/close/running.
- `cookies`: get/set/delete/clear/import/export/sync.
- `templates`: get/getAll/save/delete/export/import.

## Fingerprint Script Flow
1. Profile stores fingerprint config in shared `Profile`.
2. Main process prepares spoof scripts based on profile settings.
3. Browser launch injects scripts before page usage.
4. Static spoof scripts live in `resources/`.

## Planned Architecture: Automation
- Add `src/main/automation/scripts.ts` for CRUD/storage.
- Add `src/main/automation/executor.ts` for browser-context execution.
- Add `src/main/automation/scheduler.ts` for cron/scheduled runs.
- Add renderer `AutomationPage`, `ScriptEditor`, `ScriptLibrary`, `ExecutionLogs`.
