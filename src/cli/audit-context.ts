import { getMirrorBranchName, inferHumanBranchFromAiBranch } from '../core';
import { getCurrentBranch, runGit } from '../infra';
import { listSessions } from '../ledger';
import { resolveSessionContext } from './session-utils';

export type AuditBranchContext = {
  sessionId: string;
  humanBranch: string;
  aiBranch: string;
};

function toSyntheticSessionId(humanBranch: string): string {
  return `branch-${humanBranch.replace(/[^\w/-]+/g, '-').replace(/\//g, '-')}`;
}

function branchExists(branch: string, cwd?: string): boolean {
  try {
    runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd });
    return true;
  } catch {
    return false;
  }
}

export function resolveAuditBranchContext(options: {
  cwd?: string;
  sessionId?: string;
}): AuditBranchContext {
  const cwd = options.cwd;
  if (options.sessionId) {
    const sessionContext = resolveSessionContext({ cwd, sessionId: options.sessionId });
    return {
      sessionId: sessionContext.sessionId,
      humanBranch: sessionContext.humanBranch,
      aiBranch: sessionContext.aiBranch,
    };
  }

  const currentBranch = getCurrentBranch({ cwd });
  if (currentBranch.startsWith('ai/')) {
    const humanBranch = inferHumanBranchFromAiBranch(currentBranch);
    if (!humanBranch) {
      throw new Error(`Unable to infer human branch from ${currentBranch}`);
    }
    const session = listSessions(cwd).find((item) => item.branch === currentBranch);
    return {
      sessionId: session?.sessionId ?? toSyntheticSessionId(humanBranch),
      humanBranch,
      aiBranch: currentBranch,
    };
  }

  const matchingSessions = listSessions(cwd)
    .filter((session) => session.branch.startsWith(`ai/${currentBranch}/`))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? a.startedAt);
      const bTime = Date.parse(b.updatedAt ?? b.startedAt);
      return bTime - aTime;
    });

  const preferredAiBranch = matchingSessions[0]?.branch ?? getMirrorBranchName(currentBranch);
  const aiBranch = branchExists(preferredAiBranch, cwd)
    ? preferredAiBranch
    : getMirrorBranchName(currentBranch);

  return {
    sessionId: matchingSessions[0]?.sessionId ?? toSyntheticSessionId(currentBranch),
    humanBranch: currentBranch,
    aiBranch,
  };
}
