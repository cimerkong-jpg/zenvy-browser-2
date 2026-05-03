# Scope - Zenvy Browser

## In Scope
- Manage multiple isolated browser profiles.
- Proxy per profile.
- Fingerprint spoofing and antidetect hardening.
- Cookie import/export/sync per profile.
- Profile templates.
- Profile groups/tags/search/bulk operations.
- Local-first desktop app.
- Cross-platform support with macOS primary and Windows secondary.
- Automation Scripts for local profile workflows in Level 2.

## Out of Scope
- Team collaboration with users/roles/permissions.
- Billing, subscription, licensing, payment.
- Cloud sync of profile data.
- Hosted account service.
- Marketplace/mini app launcher.
- Enterprise policy management.

## Product Constraints
- Prefer local data ownership.
- Avoid backend/cloud dependencies unless explicitly requested.
- Keep features useful for personal/small-team MMO/Ads workflows.
- Avoid scope creep beyond antidetect/profile management/automation.

## Safety Boundaries
- Do not add destructive file operations without confirmation.
- Do not expose Node APIs directly to renderer.
- Automation must include timeout/error handling before being considered production-ready.
