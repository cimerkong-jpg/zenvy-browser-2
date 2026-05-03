# Release Readiness Skill

Use before shipping, packaging, deploying, tagging, or handing off completed work.

## Use With
- `workflows/release.md`
- `checklists/pre-final.md`
- `checklists/security.md`
- `roles/tester.md`
- `roles/reviewer.md`

## Procedure
1. Review changed files and intended behavior.
2. Run relevant checks: typecheck, tests, lint, build, package, or smoke test.
3. Check for secrets, debug logs, temp files, generated noise, and machine-specific paths.
4. Confirm docs, setup notes, or changelog updates when needed.
5. Report readiness and blockers.

## Output
- Checks run and result.
- Release blockers.
- Files/docs updated.
- Final readiness status.

