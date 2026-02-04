import { ensureLedgerStore, writeTraceMarkdown, writeTraceMeta } from '../ledger';
import { hashPrompt } from '../ledger';
import {
  getCommitDiffStat,
  getCommitMessage,
  getCurrentBranch,
  getHeadCommitHash,
  getRepoRoot,
  updateRef,
} from '../infra';

type HookOptions = {
  cwd?: string;
};

const AI_PREFIX = 'ai/';

function buildSummary(message: string, diffStat: string): string {
  const trimmed = message.split('\n').find((line) => line.trim().length > 0) ?? 'Human commit';
  if (!diffStat) {
    return trimmed;
  }
  return `${trimmed} (${diffStat})`;
}

export function runPostCommit(options: HookOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  ensureLedgerStore(cwd);

  const currentBranch = getCurrentBranch({ cwd });
  if (currentBranch.startsWith(AI_PREFIX)) {
    return;
  }

  const commitHash = getHeadCommitHash({ cwd });
  const commitMessage = getCommitMessage(commitHash, { cwd });
  const diffStat = getCommitDiffStat(`${commitHash}~1`, commitHash, { cwd });
  const summary = buildSummary(commitMessage, diffStat);

  const promptHash = hashPrompt(commitMessage);
  writeTraceMarkdown(
    commitHash,
    {
      summary,
      risk: 'Low',
      details: `Human commit mirrored from branch ${currentBranch}.`,
    },
    cwd
  );
  writeTraceMeta(
    {
      commitHash,
      sourceCommit: commitHash,
      sourceBranch: currentBranch,
      sessionId: `${currentBranch}-human`,
      promptHash,
      createdAt: new Date().toISOString(),
    },
    cwd
  );

  const mirrorBranch = `${AI_PREFIX}${currentBranch}`;
  updateRef(`refs/heads/${mirrorBranch}`, commitHash, { cwd });
}

if (require.main === module) {
  const root = getRepoRoot();
  runPostCommit({ cwd: root });
}
