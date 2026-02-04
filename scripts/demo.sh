#!/usr/bin/env bash
set -euo pipefail

echo "== Codex-Ledger demo (bash) =="

DEMO_ROOT="$(pwd)/codex-ledger-demo"
rm -rf "$DEMO_ROOT"
mkdir -p "$DEMO_ROOT"
cd "$DEMO_ROOT"

git init >/dev/null
echo "Hello" > README.md

git add README.md
git commit -m "chore: initial commit" >/dev/null

ledger hooks:install >/dev/null
ledger annotate "Add a hello script" --model gpt-4.1-mini >/dev/null

echo 'print("hello world")' > hello.py

git add hello.py
git commit -m "feat: add hello script" >/dev/null

echo "Commit complete. Trace files:"
ls -la .codex-ledger/traces