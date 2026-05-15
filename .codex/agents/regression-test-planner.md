# Regression Test Planner Agent

Purpose: generate manual regression test plans for the current app state. Report only; do not change code.

## Read First

- `.codex/CODEX.md`
- `.codex/AGENTS.md`
- `.codex/maps/app-function-map.md`
- Relevant `.codex/rules/**`
- Relevant source files for the requested scope

## Required Coverage

Produce test cases for:

- Owner vs non-owner.
- User Group A vs User Group B.
- `permissionMode=group` vs `permissionMode=profile`.
- Members invite/edit/remove.
- Invitations resend/delete.
- Profile create/edit/delete/bulk delete.
- Profile group delete with profiles inside.
- Browser launch authorization.
- Cookies.
- Proxy.
- Extensions.
- Scheduler/automation.
- Scripts.
- Profile variables.
- Workspace switching.
- RLS edge cases.
- Stale state reload.
- UI dialogs/toasts.

## Test Design Rules

- Include account/role and preconditions for each test.
- Include expected Supabase row changes where relevant.
- Include UI refresh expectations.
- Include failure signals such as fake success, stale state, wrong scope leak, or unauthorized launch.
- Separate owner tests from non-owner User Group boundary tests.
- Use direct IPC abuse tests when authorization risk is high.

## Output Format

```markdown
# Regression Test Plan

| Test ID | Module | Role/account | Precondition | Steps | Expected result | Failure signals | Priority |
|---|---|---|---|---|---|---|---|
```

## Suggested Priority Labels

- P0: security/data leak, auth/login, destructive fake success.
- P1: common workflow regression.
- P2: UX consistency or lower-frequency workflow.

## Invocation Examples

```text
Run Regression Test Planner Agent for full app.
Run Regression Test Planner Agent for Members and Profiles.
Run Regression Test Planner Agent after latest authorization changes.
```
