# Error Handling Rules

## Principles
- Handle expected errors explicitly.
- Let unexpected errors be logged or propagated through the established error boundary.
- Do not swallow errors with empty catch blocks.
- Do not remove validation to make errors disappear.
- Fail closed for security-sensitive paths.

## User-Facing Errors
- Show actionable messages.
- Do not expose stack traces, framework versions, SQL queries, filesystem paths, tokens, or internal implementation details.
- Preserve enough context for support/debugging through safe request IDs or error codes.

## Logging
- Log useful operational context.
- Sanitize untrusted log data.
- Never log passwords, tokens, cookies, private keys, session IDs, connection strings, or sensitive PII.
- Avoid logging full request or response bodies unless explicitly safe.

## Verification
- Test normal, invalid, unauthorized, not found, and unexpected failure cases when relevant.

