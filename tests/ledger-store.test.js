const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const {
  ensureLedgerStore,
  getSession,
  listSessions,
  readSessionsIndex,
  upsertSession,
  writeSessionsIndex,
} = require('../dist/ledger');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('ensureLedgerStore bootstraps ledger directory and sessions index', () => {
  const cwd = makeTempDir('codex-ledger-store-test-');
  try {
    const paths = ensureLedgerStore(cwd);
    assert.equal(fs.existsSync(paths.root), true);
    assert.equal(fs.existsSync(paths.tracesDir), true);
    assert.equal(fs.existsSync(paths.sessionsFile), true);

    const index = readSessionsIndex(cwd);
    assert.equal(index.version, 1);
    assert.deepEqual(index.sessions, {});
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('upsertSession creates and updates session records', () => {
  const cwd = makeTempDir('codex-ledger-session-test-');
  try {
    const startedAt = '2026-02-05T00:00:00.000Z';
    const created = upsertSession(
      {
        sessionId: 'session-1',
        branch: 'ai/main/session-1',
        startedAt,
        status: 'active',
      },
      cwd
    );

    assert.equal(created.sessionId, 'session-1');
    assert.equal(created.startedAt, startedAt);
    assert.ok(created.updatedAt);

    const updated = upsertSession(
      {
        sessionId: 'session-1',
        branch: 'ai/main/session-1',
        startedAt: 'ignored',
        lastPromptSummary: 'Refactor login flow',
        status: 'closed',
      },
      cwd
    );

    assert.equal(updated.startedAt, startedAt);
    assert.equal(updated.lastPromptSummary, 'Refactor login flow');
    assert.equal(updated.status, 'closed');

    const fetched = getSession('session-1', cwd);
    assert.equal(fetched.sessionId, 'session-1');
    assert.equal(fetched.status, 'closed');

    const all = listSessions(cwd);
    assert.equal(all.length, 1);
    assert.equal(all[0].sessionId, 'session-1');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('writeSessionsIndex persists explicit index data', () => {
  const cwd = makeTempDir('codex-ledger-write-index-test-');
  try {
    const customIndex = {
      version: 1,
      sessions: {
        alpha: {
          sessionId: 'alpha',
          branch: 'ai/main/alpha',
          startedAt: '2026-02-05T00:00:00.000Z',
          status: 'archived',
        },
      },
    };

    writeSessionsIndex(customIndex, cwd);
    const loaded = readSessionsIndex(cwd);
    assert.deepEqual(loaded, customIndex);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
