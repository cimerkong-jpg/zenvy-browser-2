# Dependency Upgrade Skill

Use when adding, removing, upgrading, or auditing dependencies.

## Use With
- `rules/dependencies.md`
- `rules/security.md`
- `roles/reviewer.md`
- `roles/implementer.md`

## Procedure
1. Identify the package manager, lockfile, and existing alternatives.
2. Confirm the dependency change is necessary.
3. Check version impact, maintenance, security, license, and runtime/bundle cost when relevant.
4. Update the matching manifest and lockfile only.
5. Verify install/build/test commands appropriate to the change.

## Output
- Dependency change and reason.
- Lockfile impact.
- Verification result.
- Risks or rollback notes.

