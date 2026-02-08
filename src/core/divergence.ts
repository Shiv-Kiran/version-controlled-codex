import { getCurrentBranch, runGit } from '../infra';

const AI_PREFIX = 'ai/';
const SESSION_SUFFIX_PATTERN = /\/\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$/;
const EXPLORE_SUFFIX_PATTERN = /\/explore-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$/;
const LEDGER_COMMIT_PREFIX = 'chore(ledger): capture trace for';
const MAX_LEDGER_SKIP_DEPTH = 200;

export type DivergenceStatus = 'in_sync' | 'ahead_human' | 'ahead_ai' | 'diverged';

export type DivergenceRecommendation =
  | 'none'
  | 'mirror_human_to_ai'
  | 'review_ai_only_commits'
  | 'reconcile_histories';

export type DivergenceResult = {
  status: DivergenceStatus;
  humanBranch: string;
  aiBranch: string;
  mergeBase?: string;
  aheadHuman: number;
  aheadAi: number;
  recommendation: DivergenceRecommendation;
  reason: string;
};

export type DetectDivergenceOptions = {
  cwd?: string;
  humanBranch?: string;
  aiBranch?: string;
};

export function getMirrorBranchName(humanBranch: string): string {
  return `${AI_PREFIX}${humanBranch}`;
}

export function inferHumanBranchFromAiBranch(branch: string): string | undefined {
  if (!branch.startsWith(AI_PREFIX)) {
    return undefined;
  }

  const withoutPrefix = branch.slice(AI_PREFIX.length);
  const withoutSession = withoutPrefix
    .replace(EXPLORE_SUFFIX_PATTERN, '')
    .replace(SESSION_SUFFIX_PATTERN, '');

  return withoutSession.length > 0 ? withoutSession : undefined;
}

function refExists(refName: string, cwd?: string): boolean {
  try {
    runGit(['show-ref', '--verify', '--quiet', `refs/heads/${refName}`], { cwd });
    return true;
  } catch {
    return false;
  }
}

function getMergeBase(leftRef: string, rightRef: string, cwd?: string): string | undefined {
  try {
    return runGit(['merge-base', leftRef, rightRef], { cwd }).stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function getCommitSubject(refName: string, cwd?: string): string {
  return runGit(['log', '-1', '--pretty=%s', refName], { cwd }).stdout.trim();
}

function getParentCommit(refName: string, cwd?: string): string | undefined {
  try {
    return runGit(['rev-parse', `${refName}^`], { cwd }).stdout.trim();
  } catch {
    return undefined;
  }
}

function resolveComparableAiRef(aiBranch: string, cwd?: string): string {
  let currentRef = aiBranch;
  for (let i = 0; i < MAX_LEDGER_SKIP_DEPTH; i += 1) {
    const subject = getCommitSubject(currentRef, cwd);
    if (!subject.startsWith(LEDGER_COMMIT_PREFIX)) {
      return currentRef;
    }

    const parent = getParentCommit(currentRef, cwd);
    if (!parent) {
      return currentRef;
    }
    currentRef = parent;
  }
  return currentRef;
}

function parseAheadBehind(leftRef: string, rightRef: string, cwd?: string): {
  aheadLeft: number;
  aheadRight: number;
} {
  const output = runGit(['rev-list', '--left-right', '--count', `${leftRef}...${rightRef}`], {
    cwd,
  }).stdout.trim();
  const [leftRaw, rightRaw] = output.split(/\s+/);
  return {
    aheadLeft: Number(leftRaw ?? 0),
    aheadRight: Number(rightRaw ?? 0),
  };
}

function buildResult(input: {
  status: DivergenceStatus;
  humanBranch: string;
  aiBranch: string;
  mergeBase?: string;
  aheadHuman: number;
  aheadAi: number;
}): DivergenceResult {
  if (input.status === 'in_sync') {
    return {
      ...input,
      recommendation: 'none',
      reason: 'Human and AI branches are synchronized.',
    };
  }

  if (input.status === 'ahead_human') {
    return {
      ...input,
      recommendation: 'mirror_human_to_ai',
      reason: 'Human branch has commits not yet mirrored to AI branch.',
    };
  }

  if (input.status === 'ahead_ai') {
    return {
      ...input,
      recommendation: 'review_ai_only_commits',
      reason: 'AI branch has commits that do not exist on the human branch.',
    };
  }

  return {
    ...input,
    recommendation: 'reconcile_histories',
    reason: 'Human and AI branches both have unique commits and have diverged.',
  };
}

export function detectBranchDivergence(options: DetectDivergenceOptions = {}): DivergenceResult {
  const cwd = options.cwd;
  const currentBranch = getCurrentBranch({ cwd });

  const inferredHuman =
    options.humanBranch ??
    (currentBranch.startsWith(AI_PREFIX)
      ? inferHumanBranchFromAiBranch(currentBranch)
      : currentBranch);

  if (!inferredHuman) {
    throw new Error('Unable to determine human branch for divergence detection.');
  }

  const humanBranch = inferredHuman;
  const aiBranch = options.aiBranch ?? getMirrorBranchName(humanBranch);

  if (!refExists(humanBranch, cwd)) {
    throw new Error(`Human branch does not exist: ${humanBranch}`);
  }

  if (!refExists(aiBranch, cwd)) {
    return buildResult({
      status: 'ahead_human',
      humanBranch,
      aiBranch,
      mergeBase: undefined,
      aheadHuman: 1,
      aheadAi: 0,
    });
  }

  const comparableAiRef = resolveComparableAiRef(aiBranch, cwd);
  const mergeBase = getMergeBase(humanBranch, comparableAiRef, cwd);
  const counts = parseAheadBehind(humanBranch, comparableAiRef, cwd);

  let status: DivergenceStatus = 'in_sync';
  if (counts.aheadLeft > 0 && counts.aheadRight > 0) {
    status = 'diverged';
  } else if (counts.aheadLeft > 0) {
    status = 'ahead_human';
  } else if (counts.aheadRight > 0) {
    status = 'ahead_ai';
  }

  return buildResult({
    status,
    humanBranch,
    aiBranch,
    mergeBase,
    aheadHuman: counts.aheadLeft,
    aheadAi: counts.aheadRight,
  });
}
