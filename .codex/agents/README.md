# Zenvy QA / Audit Agents

Agents are repeatable AI workflows. They do not replace rules.

- Rules define durable invariants in `.codex/rules/**`.
- Maps describe the real app surface in `.codex/maps/**`.
- Agents execute audit, QA, security, and regression workflows.

Agents should report first. They must not modify app code unless the user explicitly asks for a fix.

## Required Starting Files

Before running an agent, read:
- `.codex/CODEX.md`
- `.codex/AGENTS.md`
- `.codex/maps/app-function-map.md`
- Relevant `.codex/rules/**`
- The requested agent file

## Available Agents

- `.codex/agents/tester-agent.md` - end-to-end QA tester using the app function map.
- `.codex/agents/bug-hunter.md` - repository bug audit and suspicious pattern scan.
- `.codex/agents/security-audit.md` - IPC, Electron, secrets, and authorization security audit.
- `.codex/agents/workspace-scope-audit.md` - workspace isolation and User Group boundary audit.
- `.codex/agents/rls-audit.md` - Supabase RLS and SQL migration audit.
- `.codex/agents/ui-consistency-audit.md` - dialogs, toasts, async UX, and UI consistency audit.
- `.codex/agents/regression-test-planner.md` - manual regression test plan generator.

## How To Invoke

Use plain commands such as:

```text
Run Tester Agent using app-function-map. Report only. Do not change code.
Run Tester Agent for Members + User Groups + Invitations. Report only.
Run Tester Agent for Profiles + Profile Groups + Browser Launch. Report only.
Run Tester Agent for workspace switching and stale state bugs. Report only.

Run Bug Hunter Agent. Report only. Do not change code.
Run Bug Hunter Agent for fake success bugs.
Run Bug Hunter Agent for delete/update flows.

Run Security Audit Agent for IPC handlers. Report only.
Run Workspace Scope Audit Agent for Members. Report only.
Run RLS Audit Agent for latest migrations. Report only.
Run UI Consistency Audit Agent for Profiles page. Report only.
Run Regression Test Planner Agent for full app.
```

## Standard Report Format

Every agent should include:

```markdown
# Summary

## Critical Findings

## Medium-Risk Findings

## Low-Risk Findings

## Files Involved

## Suggested Fixes

## Tests To Run

## .codex Rules To Update

## Questions / Assumptions
```

## Shared Safety Rules

- Report first unless explicitly asked to implement.
- Do not create parallel authorization systems.
- Do not rely on frontend-only hiding for security.
- Backend + RLS remain source of truth.
- Every query/action must answer workspace, user group scope, owner/non-owner status, and target authorization.
- Success toast is allowed only after backend-confirmed mutation and required refresh complete.
- Delete/update operations must verify affected rows using `.select().single()` or an equivalent affected-row check.
