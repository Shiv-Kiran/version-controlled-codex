import { inferHumanBranchFromAiBranch } from '../core';
import { getCurrentBranch } from '../infra';
import { getSession, getSessionByBranch, listSessions } from '../ledger';
import type { SessionRecord } from '../ledger';

export type SessionContext = {
  currentBranch: string;
  session: SessionRecord;
  sessionId: string;
  humanBranch: string;
  aiBranch: string;
};

function sortByMostRecentSession(a: SessionRecord, b: SessionRecord): number {
  const aTime = Date.parse(a.updatedAt ?? a.startedAt);
  const bTime = Date.parse(b.updatedAt ?? b.startedAt);
  return bTime - aTime;
}

function resolveLatestSessionForHumanBranch(humanBranch: string, cwd?: string): SessionRecord | undefined {
  const prefix = `ai/${humanBranch}/`;
  const sessions = listSessions(cwd)
    .filter((session) => session.branch.startsWith(prefix))
    .sort(sortByMostRecentSession);
  return sessions[0];
}

export function resolveSessionContext(options: { cwd?: string; sessionId?: string }): SessionContext {
  const cwd = options.cwd;
  const currentBranch = getCurrentBranch({ cwd });

  let session: SessionRecord | undefined;
  if (options.sessionId) {
    session = getSession(options.sessionId, cwd);
    if (!session) {
      throw new Error(`Session not found: ${options.sessionId}`);
    }
  } else if (currentBranch.startsWith('ai/')) {
    session = getSessionByBranch(currentBranch, cwd);
    if (!session) {
      const humanBranch = inferHumanBranchFromAiBranch(currentBranch);
      if (humanBranch) {
        session = resolveLatestSessionForHumanBranch(humanBranch, cwd);
      }
    }
  } else {
    session = resolveLatestSessionForHumanBranch(currentBranch, cwd);
  }

  if (!session) {
    throw new Error('No matching session found. Pass --session to specify one explicitly.');
  }

  const humanBranch = inferHumanBranchFromAiBranch(session.branch);
  if (!humanBranch) {
    throw new Error(`Unable to infer human branch from session branch: ${session.branch}`);
  }

  return {
    currentBranch,
    session,
    sessionId: session.sessionId,
    humanBranch,
    aiBranch: session.branch,
  };
}
