const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

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
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-policy-test-'));
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

test('policy:get and policy:set round-trip session tracking policy', () => {
  const repoDir = initRepo();
  try {
    run('node', [CLI_ENTRY, 'session:open', 'policy test', '--json'], { cwd: repoDir });
    const getInitial = JSON.parse(run('node', [CLI_ENTRY, 'policy:get', '--json'], { cwd: repoDir }));
    assert.equal(getInitial.policy, 'mirror-only');

    const setManual = JSON.parse(
      run('node', [CLI_ENTRY, 'policy:set', 'manual', '--json'], { cwd: repoDir })
    );
    assert.equal(setManual.policy, 'manual');

    const getUpdated = JSON.parse(run('node', [CLI_ENTRY, 'policy:get', '--json'], { cwd: repoDir }));
    assert.equal(getUpdated.policy, 'manual');
    assert.equal(getUpdated.source, 'session');
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});
