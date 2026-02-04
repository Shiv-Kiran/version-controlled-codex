import crypto from 'node:crypto';

export type SessionIntent = {
  task: string;
  explore?: boolean;
  currentBranch: string;
  baseBranch?: string;
  branchOverride?: string;
  sessionIdOverride?: string;
  date?: Date;
};

export type SessionPlan = {
  action: 'reuse' | 'create';
  branchName: string;
  baseBranch: string;
  sessionId: string;
  reason: string;
};

const AI_PREFIX = 'ai/';

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function slugifyTask(task: string): string {
  return task
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48);
}

function createSessionId(date: Date): string {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${formatDate(date)}-${suffix}`;
}

export function resolveSessionPlan(intent: SessionIntent): SessionPlan {
  const date = intent.date ?? new Date();
  const baseBranch = intent.baseBranch ?? intent.currentBranch;

  if (intent.branchOverride) {
    return {
      action: intent.currentBranch === intent.branchOverride ? 'reuse' : 'create',
      branchName: intent.branchOverride,
      baseBranch,
      sessionId: intent.sessionIdOverride ?? intent.branchOverride,
      reason: 'branch override provided',
    };
  }

  const sessionId = intent.sessionIdOverride ?? createSessionId(date);
  const isAiBranch = intent.currentBranch.startsWith(AI_PREFIX);

  if (intent.explore) {
    const parentBranch = isAiBranch ? intent.currentBranch : `${AI_PREFIX}${intent.currentBranch}`;
    return {
      action: 'create',
      branchName: `${parentBranch}/explore-${sessionId}`,
      baseBranch,
      sessionId,
      reason: isAiBranch ? 'explore requested from ai/* branch' : 'explore requested from non-ai branch',
    };
  }

  if (isAiBranch) {
    return {
      action: 'reuse',
      branchName: intent.currentBranch,
      baseBranch,
      sessionId: intent.sessionIdOverride ?? intent.currentBranch.replace(AI_PREFIX, ''),
      reason: 'already on ai/* branch',
    };
  }

  return {
    action: 'create',
    branchName: `${AI_PREFIX}${sessionId}`,
    baseBranch,
    sessionId,
    reason: 'new ai/* branch from non-ai base',
  };
}
