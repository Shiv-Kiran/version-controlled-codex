const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  renderDiffReport,
  renderExplainReport,
  renderTimelineReport,
} = require('../dist/core');

test('renderTimelineReport matches golden output', () => {
  const output = renderTimelineReport({
    humanBranch: 'main',
    aiBranch: 'ai/main/2026-02-05-deadbeef',
    entries: [
      {
        commitHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        branch: 'ai/main/2026-02-05-deadbeef',
        stream: 'ai',
        subject: 'chore(ledger): capture trace',
        timestamp: '2026-02-05T12:00:00.000Z',
      },
      {
        commitHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        branch: 'main',
        stream: 'human',
        subject: 'feat: add login endpoint',
        timestamp: '2026-02-05T11:00:00.000Z',
      },
    ],
  });

  const expected = [
    '# Timeline (main vs ai/main/2026-02-05-deadbeef)',
    '',
    '## Entries',
    '- [ai] 2026-02-05T12:00:00.000Z bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb chore(ledger): capture trace',
    '- [human] 2026-02-05T11:00:00.000Z aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa feat: add login endpoint',
    '',
  ].join('\n');
  assert.equal(output, `${expected}\n`);
});

test('renderExplainReport matches golden output', () => {
  const output = renderExplainReport({
    commitHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    subject: 'feat: add login endpoint',
    message: 'feat: add login endpoint\n\nIncludes JWT wiring.',
    files: ['src/login.ts', 'src/auth.ts'],
    diffStat: '2 files changed, 20 insertions(+)',
    traceMeta: {
      commitHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sessionId: '2026-02-05-deadbeef',
      createdAt: '2026-02-05T11:00:00.000Z',
    },
  });

  const expected = [
    '# Explain aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '',
    '## Subject',
    'feat: add login endpoint',
    '',
    '## Message',
    'feat: add login endpoint',
    '',
    'Includes JWT wiring.',
    '',
    '## Files',
    '- src/login.ts',
    '- src/auth.ts',
    '',
    '## Diff Stat',
    '2 files changed, 20 insertions(+)',
    '',
    '## Trace',
    '{',
    '  "commitHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",',
    '  "sessionId": "2026-02-05-deadbeef",',
    '  "createdAt": "2026-02-05T11:00:00.000Z"',
    '}',
    '',
  ].join('\n');
  assert.equal(output, `${expected}\n`);
});

test('renderDiffReport matches golden output', () => {
  const output = renderDiffReport({
    humanBranch: 'main',
    aiBranch: 'ai/main/2026-02-05-deadbeef',
    divergenceStatus: 'diverged',
    aheadHuman: 2,
    aheadAi: 1,
    humanOnlyCommits: ['1111111111111111111111111111111111111111'],
    aiOnlyCommits: ['2222222222222222222222222222222222222222'],
  });

  const expected = [
    '# Diff Report (main vs ai/main/2026-02-05-deadbeef)',
    '',
    '## Divergence',
    '- Status: diverged',
    '- Human Ahead: 2',
    '- AI Ahead: 1',
    '',
    '## Human-only Commits',
    '- 1111111111111111111111111111111111111111',
    '',
    '## AI-only Commits',
    '- 2222222222222222222222222222222222222222',
    '',
  ].join('\n');
  assert.equal(output, `${expected}\n`);
});
