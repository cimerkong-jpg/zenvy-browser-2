# Workflow Rules - Zenvy Browser

## Git
- Keep commits small and focused.
- Commit message prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Do not push to remote without explicit user approval.
- Do not revert user changes unless explicitly requested.
- Keep `.husky/pre-commit` executable.

## Cleanup
- `.DS_Store`, build output, cache and local private Claude files must not be committed.
- `.gitignore` already ignores:
  - `node_modules/`
  - `out/`
  - `dist/`
  - `.vite/`
  - `.DS_Store`
  - `*.local`
  - `.claude/settings.local.json`
  - `.claude/CLAUDE.local.md`

## Code Standards
- Prefer existing project patterns.
- Keep main/preload/renderer responsibilities separated.
- Use shared types for IPC-facing data.
- Add comments only for non-obvious logic.
- Avoid unrelated refactors while implementing a feature.

## Documentation Rules
- `CLAUDE.md` is the project overview only.
- `.claude/rules/` contains detailed project knowledge.
- Root plan/implementation markdown files are phase logs.
- Update docs when changing features, architecture, scope, setup, workflow or tech defaults.

## Required Checks
Before reporting work as ready:

```bash
npm run typecheck
npm run build
git diff --check
git status --short
```

## Upload Flow
1. Audit working tree.
2. Clean ignored junk files.
3. Repair dependencies if local scripts fail due install issues.
4. Run checks.
5. Update docs.
6. Show final status to user.
7. Commit/push only after user confirms.
