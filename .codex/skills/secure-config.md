# Secure Config Skill

Use when touching auth, API keys, cookies, sessions, local config, environment variables, permissions, logs, or deployment settings.

## Use With
- `rules/security.md`
- `rules/data-safety.md`
- `rules/error-handling.md`
- `checklists/security.md`

## Procedure
1. Identify sensitive values and trust boundaries.
2. Check whether secrets are stored, printed, committed, logged, or sent to clients.
3. Prefer environment variables, secret managers, or local ignored files.
4. Use placeholders in examples.
5. Verify errors and logs do not reveal sensitive data.

## Output
- Sensitive surfaces reviewed.
- Risks found or avoided.
- Change made or recommendation.
- Remaining security concerns.

