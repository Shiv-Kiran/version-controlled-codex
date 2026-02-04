# Codex-Ledger

Codex-Ledger keeps a Git-native audit trail of AI-assisted changes. It mirrors commits into dedicated ai/* branches, writes trace files, and can summarize diffs with an LLM so reviewers can understand what happened and why.

## Requirements
- Node.js 18+
- Git 2.30+
- OpenAI API key for LLM summaries (optional but recommended)

## Install (local dev)
```bash
npm install
npm run build
npm pack
```
Then test in another repo:
```bash
npx ..\version-controlled-codex\codex-ledger-0.1.0.tgz --help
```

## Config
Create a `.env` in the repo you want to run the tool on:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```
Optional:
```
CODEX_LEDGER_USE_LLM_SUMMARY=1
CODEX_LEDGER_LOG_LEVEL=info
CODEX_LEDGER_LOG_FORMAT=text
```

## Quickstart (hook-based)
1) Install the git hook:
```bash
ledger hooks:install
```
2) (Optional) Add prompt attribution for the next commit:
```bash
ledger annotate "Refactor login to use JWT" --model gpt-4.1-mini
```
3) Make changes and commit as usual.
4) Review `.codex-ledger/traces/<commit>.md` and `.json` in your repo.

## Quickstart (explicit AI run)
```bash
ledger do "Add a hello.py that prints hello world"
```
This creates an ai/* branch, applies the patch, commits, writes a trace, and returns you to your original branch.

## Diagnostics
```bash
ledger doctor
```
Use `--json` for machine-readable output.

## Demo scripts
See `scripts/demo.ps1` (Windows) and `scripts/demo.sh` (bash) for a full end-to-end flow.