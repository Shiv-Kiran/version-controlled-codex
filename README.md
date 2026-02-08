# Codex-Ledger

Codex-Ledger is a Git-native audit layer for AI-assisted development.  
It mirrors work into `ai/*` branches and stores summaries in `.codex-ledger/`.

## Install
Requirements: Node.js 18+, Git 2.30+.

From npm:
```bash
npm i -g codex-ledger
ledger --help
```

Or without global install:
```bash
npx codex-ledger --help
```

## Config
In your target repo, create `.env`:
```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Optional:
```bash
CODEX_LEDGER_USE_LLM_SUMMARY=1
CODEX_LEDGER_TRACKING_POLICY=mirror-only
```

## Quickstart
```bash
ledger hooks:install
ledger annotate "Refactor login to use JWT" --model gpt-4.1-mini
git add .
git commit -m "feat: update login flow"
```

Then inspect:
- `.codex-ledger/traces/`
- `.codex-ledger/reports/`

## Core Commands
Session lifecycle:
```bash
ledger session:open "refactor auth"
ledger session:close
ledger session:archive
ledger session:reopen --session <session_id>
```

Policy:
```bash
ledger policy:get --json
ledger policy:set merge-ai --json
```

Conflict workflow:
```bash
ledger conflict:status --json
ledger conflict:resume --reason "resolved manually" --json
```

Audit reports:
```bash
ledger timeline --json
ledger explain <commit_hash> --json
ledger diff-report --json
```

Diagnostics:
```bash
ledger doctor --json
```
