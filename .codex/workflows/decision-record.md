# Decision Record Workflow

Use for decisions that affect architecture, APIs, data models, dependencies, infrastructure, security boundaries, or long-term maintenance.

## When To Create
Create or propose a decision record when:
- There are two or more serious options.
- Reversal would be costly.
- The decision changes public contracts or data shape.
- The reasoning will matter to future maintainers.
- The user asks for a technical recommendation.

## Format
- Title
- Status: proposed, accepted, rejected, superseded
- Context
- Constraints
- Options considered
- Decision
- Consequences
- Risks
- Rollback or migration path
- References

## Rules
- Record one decision per document.
- Include rejected options and why they lost.
- Be honest about tradeoffs.
- Link superseded decisions instead of rewriting history.

