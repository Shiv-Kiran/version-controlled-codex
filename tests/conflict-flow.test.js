const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const { upsertSession } = require('../dist/ledger');

const CLI_ENTRY = path.resolve(__dirname, '..', 'bin', 'ledger');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const detail = [
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout?.trim() ? `stdout: ${result.stdout.trim()}` : '',
      result.stderr?.trim() ? `stderr: ${result.stderr.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    throw new Error(detail);
  }
  return (result.stdout ?? '').trim();
}

function runMayFail(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  });
}

function initRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-conflict-test-'));
  const init = runMayFail('git', ['init', '-b', 'main'], { cwd: repoDir });
  if (init.status !== 0) {
    run('git', ['init'], { cwd: repoDir });
    run('git', ['checkout', '-b', 'main'], { cwd: repoDir });
  }
  run('git', ['config', 'user.name', 'Test User'], { cwd: repoDir });
  run('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  fs.writeFileSync(path.join(repoDir, 'README.md'), 'base\n', 'utf8');
  run('git', ['add', 'README.md'], { cwd: repoDir });
  run('git', ['commit', '-m', 'chore: base'], { cwd: repoDir });
  return repoDir;
}

test('conflict status/resume workflow persists state to ledger', () => {
  const repoDir = initRepo();
  try {
    upsertSession(
      {
        sessionId: 'session-a',
        branch: 'ai/main/2026-02-05-deadbeef',
        startedAt: new Date().toISOString(),
        status: 'active',
      },
      repoDir
    );

    const idleRaw = run('node', [CLI_ENTRY, 'conflict:status', '--session', 'session-a', '--json'], {
      cwd: repoDir,
    });
    const idle = JSON.parse(idleRaw);
    assert.equal(idle.status, 'idle');

    const resumedRaw = run(
      'node',
      [CLI_ENTRY, 'conflict:resume', '--session', 'session-a', '--reason', 'Manual resolution complete', '--json'],
      { cwd: repoDir }
    );
    const resumed = JSON.parse(resumedRaw);
    assert.equal(resumed.status, 'resumed');
    assert.equal(resumed.reason, 'Manual resolution complete');

    const statePath = path.join(repoDir, '.codex-ledger', 'conflicts', 'session-a.json');
    const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(persisted.status, 'resumed');
    assert.equal(persisted.reason, 'Manual resolution complete');
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});
