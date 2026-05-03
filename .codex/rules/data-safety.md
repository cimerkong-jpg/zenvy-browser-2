# Data Safety Rules

## Sensitive Data
Treat these as sensitive:
- Credentials, tokens, cookies, sessions, private keys.
- Local databases and browser profiles.
- Logs, exports, backups, cache, and temp files with user data.
- Customer data, PII, payment, auth, and billing data.

## Destructive Changes
Ask before:
- Deleting data.
- Migrating schemas destructively.
- Clearing caches that may contain user state.
- Rewriting generated data stores.
- Running cleanup scripts over broad paths.

## Migration Safety
- Prefer reversible migrations.
- Preserve backups or rollback paths for risky data changes.
- Validate migration input and output.
- Do not silently drop unknown fields unless explicitly designed.

## Output Safety
- Use placeholders in examples.
- Do not paste real secrets or private data into chat.
- Mask sensitive values when reporting findings.

