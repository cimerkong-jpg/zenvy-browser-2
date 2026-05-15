# UI Consistency Audit Agent

Purpose: audit frontend UX consistency, async mutation UX, dialogs, toasts, and workspace-aware UI behavior. Report only unless explicitly asked to fix.

## Read First

- `.codex/CODEX.md`
- `.codex/AGENTS.md`
- `.codex/maps/app-function-map.md`
- `.codex/rules/frontend/dialogs-and-toasts.md`
- `.codex/rules/frontend/modal-system.md`
- `.codex/rules/frontend/members-page.md`
- Relevant authorization/backend rules for the requested scope

## Required Checks

Check for:

- Native `alert`, `confirm`, `prompt`.
- Inconsistent toasts.
- Success toast before confirmed mutation.
- Missing loading states.
- Buttons not disabled during async actions.
- Destructive actions not using `confirmDelete`.
- Dark theme incompatibility.
- Modals hidden behind z-index issues.
- Duplicate UI patterns.
- Vietnamese copy consistency.
- Owner/non-owner UI controls.
- Frontend hiding that does not match backend enforcement.

## Mandatory UX Rules

- No native `alert`/`confirm`/`prompt` in renderer UI.
- Use `useDialog` for blocking decisions.
- Use `useToast` for notifications.
- Show success only after backend-confirmed mutation and required refresh complete.
- Backend errors must surface as error toasts, not success.
- UI hiding is not security; backend must enforce the same rule.

## Priority Files

- `src/renderer/src/pages/MembersPage.tsx`
- `src/renderer/src/pages/ProfilesPage.tsx`
- `src/renderer/src/pages/AutomationPage.tsx`
- `src/renderer/src/pages/WorkspaceSettingsPage.tsx`
- `src/renderer/src/components/ProfileRow.tsx`
- `src/renderer/src/components/GroupModals.tsx`
- `src/renderer/src/components/CookieManager.tsx`
- `src/renderer/src/components/TemplateManager.tsx`
- `src/renderer/src/store/useDialog.ts`
- `src/renderer/src/store/useToast.ts`

## Output

```markdown
# UI Consistency Audit Report

## Summary

## Critical UX Bugs
### Title
- Workflow:
- Files/components:
- User impact:
- Expected behavior:
- Suggested fix:
- Severity:

## Medium-Risk Findings

## Low-Risk / Copy Issues

## Dialog / Toast Violations

## Loading / Disabled State Gaps

## Tests To Run

## Questions / Assumptions
```

## Invocation Examples

```text
Run UI Consistency Audit Agent. Report only.
Run UI Consistency Audit Agent for Profiles page.
Run UI Consistency Audit Agent for Members page.
```
