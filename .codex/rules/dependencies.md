# Dependency Rules

## Default
- Prefer existing dependencies and platform APIs.
- Add a dependency only when it clearly reduces risk, complexity, or maintenance cost.
- Do not upgrade major versions unless the task requires it.

## Before Adding
Check:
- Existing package manager and lockfile.
- Bundle or runtime impact.
- Maintenance status.
- Security risk.
- License compatibility when relevant.
- Whether a small local helper is safer.

## Lockfiles
- Preserve the project package manager.
- If `package.json` changes, update the matching lockfile.
- Do not mix npm, yarn, pnpm, or bun lockfiles without a clear reason.
- Explain lockfile changes in the final response.

## Verification
- Run install, build, or test checks appropriate to the dependency change.
- If dependency verification cannot run, state the risk.

