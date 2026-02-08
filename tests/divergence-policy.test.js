const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const core = require('../dist/core');

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
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-divergence-test-'));
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

function cleanupRepo(repoDir) {
  fs.rmSync(repoDir, { recursive: true, force: true });
}

test('detectBranchDivergence returns ahead_human when mirror branch is missing', () => {
  const repoDir = initRepo();
  try {
    const result = core.detectBranchDivergence({ cwd: repoDir, humanBranch: 'main' });
    assert.equal(result.status, 'ahead_human');
    assert.equal(result.aiBranch, 'ai/main');
    assert.equal(result.recommendation, 'mirror_human_to_ai');
  } finally {
    cleanupRepo(repoDir);
  }
});

test('detectBranchDivergence returns in_sync when branches match', () => {
  const repoDir = initRepo();
  try {
    run('git', ['branch', 'ai/main'], { cwd: repoDir });
    const result = core.detectBranchDivergence({ cwd: repoDir, humanBranch: 'main' });
    assert.equal(result.status, 'in_sync');
    assert.equal(result.aheadHuman, 0);
    assert.equal(result.aheadAi, 0);
  } finally {
    cleanupRepo(repoDir);
  }
});

test('detectBranchDivergence returns ahead_ai when ai branch has unique commits', () => {
  const repoDir = initRepo();
  try {
    run('git', ['checkout', '-b', 'ai/main'], { cwd: repoDir });
    fs.writeFileSync(path.join(repoDir, 'ai.txt'), 'ai-only\n', 'utf8');
    run('git', ['add', 'ai.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'feat: ai-only change'], { cwd: repoDir });
    run('git', ['checkout', 'main'], { cwd: repoDir });

    const result = core.detectBranchDivergence({ cwd: repoDir, humanBranch: 'main' });
    assert.equal(result.status, 'ahead_ai');
    assert.equal(result.aheadHuman, 0);
    assert.equal(result.aheadAi > 0, true);
  } finally {
    cleanupRepo(repoDir);
  }
});

test('detectBranchDivergence ignores ledger-only commits on ai mirror branch', () => {
  const repoDir = initRepo();
  try {
    run('git', ['checkout', '-b', 'ai/main'], { cwd: repoDir });
    run(
      'git',
      [
        'commit',
        '--allow-empty',
        '-m',
        'chore(ledger): capture trace for deadbee\n\nsource-branch: main\nsource-commit: deadbeef',
      ],
      { cwd: repoDir }
    );
    run('git', ['checkout', 'main'], { cwd: repoDir });

    const result = core.detectBranchDivergence({ cwd: repoDir, humanBranch: 'main' });
    assert.equal(result.status, 'in_sync');
    assert.equal(result.aheadHuman, 0);
    assert.equal(result.aheadAi, 0);
  } finally {
    cleanupRepo(repoDir);
  }
});

test('detectBranchDivergence returns diverged when both branches changed', () => {
  const repoDir = initRepo();
  try {
    run('git', ['branch', 'ai/main'], { cwd: repoDir });

    fs.writeFileSync(path.join(repoDir, 'human.txt'), 'human\n', 'utf8');
    run('git', ['add', 'human.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'feat: human change'], { cwd: repoDir });

    run('git', ['checkout', 'ai/main'], { cwd: repoDir });
    fs.writeFileSync(path.join(repoDir, 'ai.txt'), 'ai\n', 'utf8');
    run('git', ['add', 'ai.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'feat: ai change'], { cwd: repoDir });
    run('git', ['checkout', 'main'], { cwd: repoDir });

    const result = core.detectBranchDivergence({ cwd: repoDir, humanBranch: 'main' });
    assert.equal(result.status, 'diverged');
    assert.equal(result.aheadHuman > 0, true);
    assert.equal(result.aheadAi > 0, true);
    assert.equal(result.recommendation, 'reconcile_histories');
  } finally {
    cleanupRepo(repoDir);
  }
});

test('inferHumanBranchFromAiBranch handles mirror and session branches', () => {
  assert.equal(core.inferHumanBranchFromAiBranch('ai/main'), 'main');
  assert.equal(core.inferHumanBranchFromAiBranch('ai/feature/login'), 'feature/login');
  assert.equal(
    core.inferHumanBranchFromAiBranch('ai/feature/login/2026-02-05-deadbeef'),
    'feature/login'
  );
  assert.equal(core.inferHumanBranchFromAiBranch('ai/main/explore-2026-02-05-deadbeef'), 'main');
});

test('resolveTrackingPolicyAction maps policy to expected action', () => {
  const mirrorAction = core.resolveTrackingPolicyAction({
    policy: 'mirror-only',
    divergenceStatus: 'ahead_human',
  });
  assert.equal(mirrorAction.action, 'fast_forward_ai');

  const manualAction = core.resolveTrackingPolicyAction({
    policy: 'manual',
    divergenceStatus: 'ahead_ai',
  });
  assert.equal(manualAction.action, 'pause_for_manual');

  const rebaseAction = core.resolveTrackingPolicyAction({
    policy: 'rebase-ai',
    divergenceStatus: 'diverged',
  });
  assert.equal(rebaseAction.action, 'rebase_ai_on_human');

  const mergeAction = core.resolveTrackingPolicyAction({
    policy: 'merge-ai',
    divergenceStatus: 'diverged',
  });
  assert.equal(mergeAction.action, 'merge_human_into_ai');
});

test('parseTrackingPolicy validates values', () => {
  assert.equal(core.parseTrackingPolicy(undefined), 'mirror-only');
  assert.equal(core.parseTrackingPolicy('manual'), 'manual');
  assert.throws(() => core.parseTrackingPolicy('bad-value'));
});
