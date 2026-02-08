# Changelog

## v0.2.0 - 2026-02-08

### Shipped
- Added session lifecycle commands:
  - `session:open`
  - `session:close`
  - `session:archive`
  - `session:reopen`
- Extended session metadata in `.codex-ledger/sessions.json`:
  - `statusHistory`
  - `closedAt`
  - `archivedAt`
  - `reopenedAt`
  - `closeReason`
  - `trackingPolicy`
- Added tracking policy commands:
  - `policy:get`
  - `policy:set`
- Added conflict workflow commands and state store:
  - `conflict:status`
  - `conflict:resume`
  - `.codex-ledger/conflicts/<session>.json`
- Added audit report commands:
  - `timeline`
  - `explain <commit>`
  - `diff-report`
  - report output in `.codex-ledger/reports/`
- Improved divergence detection to ignore ledger-only mirror commits.
- Added migration notes: `MIGRATION_0_2_0.md`.
- Added automated coverage for:
  - divergence + policy logic
  - conflict flow integration
  - timeline/explain/diff-report golden outputs

### Known Limits
- Conflict handling supports state tracking and manual resume, but no full auto-resolution engine yet.
- VS Code telemetry capture is not implemented in this release (CLI/hook-first model).
- Multi-provider AI integration is not included yet (OpenAI-focused flow).
