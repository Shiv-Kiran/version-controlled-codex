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

  const slug = slugifyTask(intent.task);
  const sessionId = intent.sessionIdOverride ?? `${formatDate(date)}-${slug}`;
  const isAiBranch = intent.currentBranch.startsWith(AI_PREFIX);

  if (isAiBranch && !intent.explore) {
    return {
      action: 'reuse',
      branchName: intent.currentBranch,
      baseBranch,
      sessionId: intent.sessionIdOverride ?? intent.currentBranch.replace(AI_PREFIX, ''),
      reason: 'already on ai/* branch',
    };
  }

  if (isAiBranch && intent.explore) {
    return {
      action: 'create',
      branchName: `${intent.currentBranch}/explore-${slug}`,
      baseBranch,
      sessionId,
      reason: 'explore requested from ai/* branch',
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
