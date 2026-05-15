# Security Audit Agent

Purpose: security-focused repository audit for Electron, IPC, Supabase, local files, and authorization boundaries. Report only unless explicitly asked to fix.

## Read First

- `.codex/CODEX.md`
- `.codex/AGENTS.md`
- `.codex/maps/app-function-map.md`
- `.codex/rules/security.md`
- `.codex/rules/backend/ipc-security.md`
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/authorization/profile-authorization.md`
- `.codex/rules/database/rls-policies.md`

## Mandatory Security Model

- Frontend cannot be trusted.
- Backend + RLS are source of truth.
- Every IPC must answer:
  - What workspace does this belong to?
  - What user group scope is allowed?
  - Is this user owner or non-owner?
  - Is the target profile/member/group authorized?

## Required Checks

Check for:

- IPC trust boundary violations.
- Renderer-controlled `workspaceId`, `profileId`, `memberId`, `userGroupId` trusted without backend verification.
- Missing backend authorization checks.
- RLS policy gaps.
- Service role leaks.
- Secret leaks in code, logs, docs, local storage, or IPC returns.
- Token/cookie/proxy logging.
- Unsafe file paths and path traversal.
- Shell execution risk.
- Electron security settings.
- Browser launch authorization.
- ProfileId-based IPC authorization.
- Preload API exposure.
- Local storage secrets.
- SQL injection or raw SQL risks.
- XSS via `dangerouslySetInnerHTML`.

## High-Priority Files

- `src/main/index.ts`
- `src/preload/index.ts`
- `src/main/workspaces.ts`
- `src/main/cloudSync.ts`
- `src/main/auth.ts`
- `src/main/supabase.ts`
- `src/main/browser.ts`
- `src/main/cookies.ts`
- `src/main/extensions.ts`
- `src/main/automation/**`
- Root `*.sql`

## Output

```markdown
# Security Audit Report

## Summary

## Critical Findings
### Title
- Files/functions:
- Attack path:
- Impact:
- Recommended fix:
- Severity:

## Medium-Risk Findings

## Low-Risk Findings

## IPC Boundary Review

## RLS / Database Review

## Secret / Logging Review

## Tests To Run

## Questions / Assumptions
```

## Invocation Examples

```text
Run Security Audit Agent. Report only.
Run Security Audit Agent for IPC handlers.
Run Security Audit Agent for Electron settings.
```
