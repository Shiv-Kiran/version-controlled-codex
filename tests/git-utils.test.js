const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const git = require('../dist/infra/git.js');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    input: options.input,
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
    input: options.input,
  });
}

function initRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-git-test-'));
  const init = runMayFail('git', ['init', '-b', 'main'], { cwd: repoDir });
  if (init.status !== 0) {
    run('git', ['init'], { cwd: repoDir });
    run('git', ['checkout', '-b', 'main'], { cwd: repoDir });
  }
  run('git', ['config', 'user.name', 'Test User'], { cwd: repoDir });
  run('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  fs.writeFileSync(path.join(repoDir, 'README.md'), 'hello\n', 'utf8');
  run('git', ['add', 'README.md'], { cwd: repoDir });
  run('git', ['commit', '-m', 'chore: initial commit'], { cwd: repoDir });
  return repoDir;
}

function cleanupRepo(repoDir) {
  fs.rmSync(repoDir, { recursive: true, force: true });
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

test('git wrappers expose status, branch, and commit metadata', () => {
  const repoDir = initRepo();
  try {
    assert.equal(git.isGitRepo({ cwd: repoDir }), true);
    assert.equal(git.getCurrentBranch({ cwd: repoDir }), 'main');
    assert.equal(normalizePath(git.getRepoRoot({ cwd: repoDir })), normalizePath(repoDir));

    fs.writeFileSync(path.join(repoDir, 'README.md'), 'hello\nworld\n', 'utf8');
    const dirtyStatus = git.getStatusSummary({ cwd: repoDir });
    assert.equal(dirtyStatus.isDirty, true);
    assert.equal(dirtyStatus.branch, 'main');

    git.addChanges({ cwd: repoDir, paths: ['README.md'] });
    const stagedDiff = git.getDiff({ cwd: repoDir, staged: true });
    assert.match(stagedDiff, /\+world/);

    git.commitChanges({ cwd: repoDir, message: 'feat: update readme' });
    const head = git.getHeadCommitHash({ cwd: repoDir });
    assert.equal(head.length, 40);

    assert.equal(git.getCommitSubject(head, { cwd: repoDir }), 'feat: update readme');
    assert.equal(git.getCommitMessage(head, { cwd: repoDir }), 'feat: update readme');
    assert.deepEqual(git.getCommitFiles(head, { cwd: repoDir }), ['README.md']);

    const parent = run('git', ['rev-parse', `${head}~1`], { cwd: repoDir });
    const diffStat = git.getCommitDiffStat(parent, head, { cwd: repoDir });
    assert.match(diffStat, /README\.md/);
    const diff = git.getCommitDiff(parent, head, { cwd: repoDir });
    assert.match(diff, /\+world/);
  } finally {
    cleanupRepo(repoDir);
  }
});

test('git wrappers support branch ops, update-ref, stash, and patch apply', () => {
  const repoDir = initRepo();
  try {
    git.createBranch('feature/test', { cwd: repoDir });
    git.checkoutBranch('feature/test', { cwd: repoDir });
    assert.equal(git.getCurrentBranch({ cwd: repoDir }), 'feature/test');

    fs.writeFileSync(path.join(repoDir, 'temp.txt'), 'draft\n', 'utf8');
    const stashMessage = git.stashPush({
      cwd: repoDir,
      includeUntracked: true,
      message: 'test stash',
    });
    assert.match(stashMessage, /Saved working directory|No local changes to save/);
    assert.equal(git.getStatusSummary({ cwd: repoDir }).isDirty, false);

    const popOutput = git.stashPop({ cwd: repoDir });
    assert.match(popOutput, /On branch|Dropped refs\/stash/);
    assert.equal(git.getStatusSummary({ cwd: repoDir }).isDirty, true);
    run('git', ['checkout', '--', '.'], { cwd: repoDir });
    run('git', ['clean', '-fd'], { cwd: repoDir });

    const original = path.join(repoDir, 'README.md');
    fs.writeFileSync(original, 'alpha\n', 'utf8');
    git.addChanges({ cwd: repoDir, paths: ['README.md'] });
    git.commitChanges({ cwd: repoDir, message: 'chore: reset readme' });

    const patch = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1,2 @@',
      ' alpha',
      '+beta',
      '',
    ].join('\n');
    git.applyPatch(patch, { cwd: repoDir });
    const normalized = fs.readFileSync(original, 'utf8').replace(/\r\n/g, '\n');
    assert.equal(normalized, 'alpha\nbeta\n');

    const head = git.getHeadCommitHash({ cwd: repoDir });
    git.updateRef('refs/heads/ai/feature-test', head, { cwd: repoDir });
    run('git', ['show-ref', '--verify', 'refs/heads/ai/feature-test'], { cwd: repoDir });
  } finally {
    cleanupRepo(repoDir);
  }
});

test('isGitRepo returns false outside git repos', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-no-repo-'));
  try {
    assert.equal(git.isGitRepo({ cwd: tempDir }), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
