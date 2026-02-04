$ErrorActionPreference = 'Stop'

Write-Host '== Codex-Ledger demo (PowerShell) =='

# Create temp repo
$demoRoot = Join-Path $pwd 'codex-ledger-demo'
if (Test-Path $demoRoot) { Remove-Item -Recurse -Force $demoRoot }
New-Item -ItemType Directory -Path $demoRoot | Out-Null
Set-Location $demoRoot

git init | Out-Null
'Hello' | Set-Content README.md

git add README.md | Out-Null
git commit -m 'chore: initial commit' | Out-Null

# Install hook
ledger hooks:install | Out-Null

# Optional prompt attribution
ledger annotate "Add a hello script" --model gpt-4.1-mini | Out-Null

# Make a change and commit
'print("hello world")' | Set-Content hello.py

git add hello.py | Out-Null
git commit -m 'feat: add hello script' | Out-Null

Write-Host 'Commit complete. Trace files:'
Get-ChildItem .codex-ledger\traces