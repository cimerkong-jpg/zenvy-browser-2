# AI Agent System - Repository Self-Auditing

## Overview

This directory contains specialized AI agents for automated repository auditing, bug detection, and quality assurance. Each agent is a self-contained instruction set that can be invoked with a single command.

## Purpose

Enable rapid, comprehensive audits of the codebase without manual checklist execution. Agents systematically scan for:
- Hidden bugs and logic errors
- Security vulnerabilities
- Authorization bypasses
- RLS policy gaps
- UI inconsistencies
- Stale state and fake success patterns
- Risky workflows

## How to Use

### Quick Invocation

Simply say:
```
"Run Bug Hunter Agent"
"Run Security Audit Agent"
"Run RLS Audit Agent"
```

The AI will:
1. Read the agent's instruction file
2. Execute the audit systematically
3. Report findings with severity levels
4. Suggest fixes with file references

### Agent List

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **Bug Hunter** | Find hidden bugs, logic errors, stale state | After feature implementation, before release |
| **Security Audit** | Scan for security vulnerabilities, secret leaks | Before deployment, after auth changes |
| **Workspace Scope Audit** | Verify workspace isolation, scope leaks | After workspace feature changes |
| **RLS Audit** | Check RLS policies, authorization gaps | After database migrations, permission changes |
| **UI Consistency Audit** | Find UI bugs, inconsistent patterns | After UI refactors, before release |
| **Regression Test Planner** | Generate test scenarios for critical flows | Before major releases, after bug fixes |

## Agent Files

- `bug-hunter.md` - Comprehensive bug detection
- `security-audit.md` - Security vulnerability scanning
- `workspace-scope-audit.md` - Workspace isolation verification
- `rls-audit.md` - RLS policy and authorization audit
- `ui-consistency-audit.md` - UI pattern and consistency checks
- `regression-test-planner.md` - Test scenario generation

## Agent Capabilities

### What Agents Can Do
- ✅ Read and analyze source code
- ✅ Search for patterns across files
- ✅ Cross-reference rules and invariants
- ✅ Identify violations and risks
- ✅ Suggest specific fixes with line numbers
- ✅ Generate reports with severity levels
- ✅ Create test scenarios

### What Agents Cannot Do
- ❌ Execute code or run tests
- ❌ Modify files without explicit permission
- ❌ Access runtime state or logs
- ❌ Make deployment decisions

## Output Format

All agents produce structured reports:

```markdown
# [Agent Name] Report

## Summary
- Total Issues: X
- Critical: X
- High: X
- Medium: X
- Low: X

## Critical Issues
### [Issue Title]
**Severity**: Critical
**Location**: `path/to/file.ts:123`
**Description**: [What's wrong]
**Impact**: [What could happen]
**Fix**: [How to fix it]

## Recommendations
1. [Priority action]
2. [Next steps]
```

## Integration with .codex

Agents leverage existing `.codex` knowledge:
- Read rules from `.codex/rules/`
- Reference invariants from `CODEX.md`
- Use patterns from `AGENTS.md`
- Cross-check with architecture docs

## Best Practices

### When to Run Agents

**Before Every Release:**
- Bug Hunter
- Security Audit
- UI Consistency Audit

**After Authorization Changes:**
- Security Audit
- Workspace Scope Audit
- RLS Audit

**After Database Migrations:**
- RLS Audit
- Workspace Scope Audit

**Before Major Features:**
- Regression Test Planner
- Bug Hunter

### Combining Agents

Run multiple agents for comprehensive coverage:
```
"Run Bug Hunter, Security Audit, and RLS Audit agents"
```

### Acting on Results

1. **Critical Issues**: Fix immediately before any deployment
2. **High Issues**: Fix before next release
3. **Medium Issues**: Schedule for upcoming sprint
4. **Low Issues**: Add to backlog

## Maintenance

### Updating Agents

When project patterns change:
1. Update relevant agent file
2. Add new detection patterns
3. Update severity classifications
4. Test with known issues

### Adding New Agents

To create a new agent:
1. Copy template structure from existing agent
2. Define clear scope and objectives
3. List specific patterns to detect
4. Specify output format
5. Add to this README

## Example Usage

### Scenario 1: Pre-Release Audit
```
User: "Run Bug Hunter and Security Audit agents before v2.0 release"

AI: [Executes both agents]
    [Generates combined report]
    [Highlights critical blockers]
```

### Scenario 2: Post-Migration Check
```
User: "Run RLS Audit after workspace_members migration"

AI: [Reads migration files]
    [Scans RLS policies]
    [Checks for recursion, gaps]
    [Reports findings]
```

### Scenario 3: Authorization Review
```
User: "Run Workspace Scope Audit and Security Audit for members feature"

AI: [Focuses on members-related code]
    [Checks scope isolation]
    [Verifies authorization]
    [Reports violations]
```

## Related Documentation

- `.codex/CODEX.md` - Project invariants and rules
- `.codex/AGENTS.md` - Quick reference for agents
- `.codex/rules/` - Domain-specific rules
- `.codex/skills/vibe-security-scan.md` - Security scanning skill

## Version History

- **2026-05-14**: Initial agent system created
  - 6 core agents implemented
  - Integrated with existing .codex structure
