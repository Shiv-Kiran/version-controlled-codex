const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { hashPrompt, writeTraceMarkdown, writeTraceMeta } = require('../dist/ledger');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('hashPrompt returns stable SHA256 output', () => {
  const digest = hashPrompt('hello');
  assert.equal(digest, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('writeTraceMarkdown matches expected format (golden)', () => {
  const cwd = makeTempDir('codex-ledger-trace-md-test-');
  try {
    const commitHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const filePath = writeTraceMarkdown(
      commitHash,
      {
        summary: 'Refactor login flow',
        risk: 'Low',
        details: 'Moved token parsing into a shared helper.',
      },
      cwd
    );

    const actual = fs.readFileSync(filePath, 'utf8');
    const expected = [
      '# Trace aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '',
      '## Summary',
      'Refactor login flow',
      '',
      '## Risk Assessment',
      'Low',
      '',
      '## Details',
      'Moved token parsing into a shared helper.',
      '',
    ].join('\n');
    assert.equal(actual, expected);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('writeTraceMeta matches expected JSON layout (golden)', () => {
  const cwd = makeTempDir('codex-ledger-trace-meta-test-');
  try {
    const commitHash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const filePath = writeTraceMeta(
      {
        commitHash,
        sourceCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sourceBranch: 'main',
        sessionId: 'main-human',
        promptHash: 'prompt-hash',
        chatRefHash: 'chat-hash',
        annotation: {
          id: 'ann-1',
          prompt: 'Refactor login',
          promptHash: 'prompt-hash',
          model: 'gpt-4.1-mini',
          sessionId: 'session-1',
          createdAt: '2026-02-05T00:00:00.000Z',
        },
        model: 'gpt-4.1-mini',
        llm: {
          model: 'gpt-4.1-mini',
          requestId: 'req-1',
          reasoningEffort: 'medium',
        },
        createdAt: '2026-02-05T00:00:00.000Z',
      },
      cwd
    );

    const actual = fs.readFileSync(filePath, 'utf8');
    const expectedObject = {
      commitHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      sourceCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sourceBranch: 'main',
      sessionId: 'main-human',
      promptHash: 'prompt-hash',
      chatRefHash: 'chat-hash',
      annotation: {
        id: 'ann-1',
        prompt: 'Refactor login',
        promptHash: 'prompt-hash',
        model: 'gpt-4.1-mini',
        sessionId: 'session-1',
        createdAt: '2026-02-05T00:00:00.000Z',
      },
      model: 'gpt-4.1-mini',
      llm: {
        model: 'gpt-4.1-mini',
        requestId: 'req-1',
        reasoningEffort: 'medium',
      },
      createdAt: '2026-02-05T00:00:00.000Z',
    };
    const expected = `${JSON.stringify(expectedObject, null, 2)}\n`;
    assert.equal(actual, expected);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
