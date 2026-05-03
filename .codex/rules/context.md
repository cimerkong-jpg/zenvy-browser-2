# Context Rules

## Core Principle
Use the smallest context that can solve the task correctly. Expand only when evidence requires it.

## Context Gathering
- Start from the user request, active file, error message, diff, or failing command.
- Prefer entry points, call sites, tests, config, and nearby modules.
- Search before reading large files.
- Read full files only when structure, side effects, or exact wording matter.
- Summarize large files instead of copying long content.

## Fact Discipline
- Separate confirmed facts, inference, and assumptions.
- Do not present guesses as facts.
- If behavior is not visible in code, say it is inferred.
- If context is stale or incomplete, state what is missing.

## Context Hygiene
- Keep durable rules short and specific.
- Move topic rules into `.codex/rules/`.
- Move repeatable execution flows into `.codex/workflows/`.
- Do not store temporary task history in permanent instruction files.

