# Codex-Ledger 0.2.0 Migration Notes

## Summary
Version `0.2.0` introduces lifecycle-aware sessions, conflict state storage, and audit report commands.

## Metadata Changes

### `sessions.json`
Session records now include lifecycle and policy fields:
- `closedAt`
- `archivedAt`
- `reopenedAt`
- `closeReason`
- `trackingPolicy`
- `statusHistory[]`

Existing `0.1.x` entries remain valid. Missing fields are populated on next session update.

### New Ledger Directories
- `.codex-ledger/conflicts/`
- `.codex-ledger/reports/`

No manual migration is required. Directories are created automatically when commands run.

## Command Additions
- `ledger session:open`
- `ledger session:close`
- `ledger session:archive`
- `ledger session:reopen`
- `ledger conflict:status`
- `ledger conflict:resume`
- `ledger timeline`
- `ledger explain <commit>`
- `ledger diff-report`

All new commands support `--json`.

## Operational Notes
- Session lifecycle transitions append entries to `statusHistory`.
- `timeline`, `explain`, and `diff-report` can write markdown reports to `.codex-ledger/reports`.
- Conflict workflow state is persisted per-session at `.codex-ledger/conflicts/<session>.json`.

## Backward Compatibility
- Existing commands remain supported.
- Existing traces are not modified.
- Re-running the tool on `0.1.x` repositories is safe.
