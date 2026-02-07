const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const { runPostCommit } = require('../dist/hooks/post-commit.js');
const { writePendingAnnotation } = require('../dist/ledger/annotations.js');

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
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ledger-test-'));

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

test('post-commit mirrors human commit to ai/<branch> and commits ledger artifacts there', async () => {
  const repoDir = initRepo();
  const previousUseLlm = process.env.CODEX_LEDGER_USE_LLM_SUMMARY;
  process.env.CODEX_LEDGER_USE_LLM_SUMMARY = '0';

  try {
    fs.writeFileSync(path.join(repoDir, 'app.txt'), 'v1\n', 'utf8');
    run('git', ['add', 'app.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'feat: add app file'], { cwd: repoDir });
    const sourceCommit = run('git', ['rev-parse', 'HEAD'], { cwd: repoDir });

    await runPostCommit({ cwd: repoDir });

    const currentBranch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    assert.equal(currentBranch, 'main');

    run('git', ['show-ref', '--verify', 'refs/heads/ai/main'], { cwd: repoDir });
    const ledgerCommitMessage = run('git', ['log', '-1', '--pretty=%B', 'ai/main'], { cwd: repoDir });
    assert.match(ledgerCommitMessage, /^chore\(ledger\): capture trace for [a-f0-9]{7}/);
    assert.match(ledgerCommitMessage, new RegExp(`source-commit: ${sourceCommit}`));

    const traceMetaText = run('git', ['show', `ai/main:.codex-ledger/traces/${sourceCommit}.json`], {
      cwd: repoDir,
    });
    const traceMeta = JSON.parse(traceMetaText);
    assert.equal(traceMeta.sourceCommit, sourceCommit);
    assert.equal(traceMeta.sourceBranch, 'main');

    const mainTree = run('git', ['ls-tree', '-r', '--name-only', 'main'], { cwd: repoDir });
    assert.equal(mainTree.includes('.codex-ledger/'), false);

    const status = run('git', ['status', '--porcelain'], { cwd: repoDir });
    assert.equal(status, '');
  } finally {
    process.env.CODEX_LEDGER_USE_LLM_SUMMARY = previousUseLlm;
    cleanupRepo(repoDir);
  }
});

test('post-commit consumes pending annotation and links it in trace metadata', async () => {
  const repoDir = initRepo();
  const previousUseLlm = process.env.CODEX_LEDGER_USE_LLM_SUMMARY;
  process.env.CODEX_LEDGER_USE_LLM_SUMMARY = '0';

  try {
    const prompt = 'Refactor login flow';
    writePendingAnnotation(
      {
        prompt,
        model: 'gpt-4.1-mini',
        sessionId: 'session-test',
      },
      repoDir
    );

    fs.writeFileSync(path.join(repoDir, 'login.txt'), 'updated\n', 'utf8');
    run('git', ['add', 'login.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'refactor: update login file'], { cwd: repoDir });
    const sourceCommit = run('git', ['rev-parse', 'HEAD'], { cwd: repoDir });

    await runPostCommit({ cwd: repoDir });

    const traceMetaText = run('git', ['show', `ai/main:.codex-ledger/traces/${sourceCommit}.json`], {
      cwd: repoDir,
    });
    const traceMeta = JSON.parse(traceMetaText);
    assert.equal(traceMeta.annotation.prompt, prompt);
    assert.equal(traceMeta.annotation.model, 'gpt-4.1-mini');
    assert.equal(traceMeta.annotation.sessionId, 'session-test');

    const consumed = run('git', ['show', `ai/main:.codex-ledger/annotations/consumed/${sourceCommit}.json`], {
      cwd: repoDir,
    });
    const consumedMeta = JSON.parse(consumed);
    assert.equal(consumedMeta.commitHash, sourceCommit);

    const pendingInAi = runMayFail(
      'git',
      ['cat-file', '-e', `ai/main:.codex-ledger/annotations/pending.json`],
      { cwd: repoDir }
    );
    assert.notEqual(pendingInAi.status, 0);
  } finally {
    process.env.CODEX_LEDGER_USE_LLM_SUMMARY = previousUseLlm;
    cleanupRepo(repoDir);
  }
});

test('post-commit is a no-op when already on ai/* branch', async () => {
  const repoDir = initRepo();
  const previousUseLlm = process.env.CODEX_LEDGER_USE_LLM_SUMMARY;
  process.env.CODEX_LEDGER_USE_LLM_SUMMARY = '0';

  try {
    run('git', ['checkout', '-b', 'ai/main'], { cwd: repoDir });
    fs.writeFileSync(path.join(repoDir, 'ai-note.txt'), 'internal\n', 'utf8');
    run('git', ['add', 'ai-note.txt'], { cwd: repoDir });
    run('git', ['commit', '-m', 'chore: ai branch commit'], { cwd: repoDir });
    const headBefore = run('git', ['rev-parse', 'HEAD'], { cwd: repoDir });

    await runPostCommit({ cwd: repoDir });

    const headAfter = run('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
    assert.equal(headAfter, headBefore);
    const currentBranch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    assert.equal(currentBranch, 'ai/main');
  } finally {
    process.env.CODEX_LEDGER_USE_LLM_SUMMARY = previousUseLlm;
    cleanupRepo(repoDir);
  }
});
