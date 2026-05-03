# Code Review Skill

Use when reviewing code, diffs, pull requests, or risk before release.

## Use With
- `roles/reviewer.md`
- `workflows/review.md`
- `rules/security.md`
- `rules/data-safety.md`
- `rules/dependencies.md`

## Procedure
1. Review the diff or requested files.
2. Prioritize correctness, regressions, security, data safety, and missing tests.
3. Check maintainability, complexity, and dependency impact.
4. Report findings by severity with evidence.

## Output
- Findings first, ordered by severity.
- File and line references when possible.
- Suggested fixes.
- Test gaps and residual risk.

