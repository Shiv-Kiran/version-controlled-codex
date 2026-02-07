import { detectBranchDivergence } from './divergence';
import { getCommitDiffStat, getCommitFiles, getCommitMessage, getCommitSubject, runGit } from '../infra';
import type { TraceMeta } from '../ledger';

export type TimelineEntry = {
  commitHash: string;
  branch: string;
  stream: 'human' | 'ai';
  subject: string;
  timestamp: string;
};

export type TimelineReport = {
  humanBranch: string;
  aiBranch: string;
  entries: TimelineEntry[];
};

export type ExplainReport = {
  commitHash: string;
  subject: string;
  message: string;
  files: string[];
  diffStat?: string;
  traceMeta?: TraceMeta;
};

export type DiffReport = {
  humanBranch: string;
  aiBranch: string;
  divergenceStatus: string;
  aheadHuman: number;
  aheadAi: number;
  humanOnlyCommits: string[];
  aiOnlyCommits: string[];
};

function parseLogEntries(branch: string, stream: 'human' | 'ai', cwd?: string): TimelineEntry[] {
  const output = runGit(['log', '--pretty=%H|%ct|%s', branch], { cwd }).stdout.trim();
  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((line) => {
      const [commitHash, epoch, ...subjectParts] = line.split('|');
      return {
        commitHash,
        branch,
        stream,
        subject: subjectParts.join('|'),
        timestamp: new Date(Number(epoch) * 1000).toISOString(),
      };
    })
    .filter((entry) => entry.commitHash.length > 0);
}

function tryReadTraceMeta(commitHash: string, branch: string, cwd?: string): TraceMeta | undefined {
  const objectPath = `${branch}:.codex-ledger/traces/${commitHash}.json`;
  try {
    runGit(['cat-file', '-e', objectPath], { cwd });
    const raw = runGit(['show', objectPath], { cwd }).stdout;
    return JSON.parse(raw) as TraceMeta;
  } catch {
    return undefined;
  }
}

export function buildTimelineReport(input: {
  humanBranch: string;
  aiBranch: string;
  cwd?: string;
}): TimelineReport {
  const humanEntries = parseLogEntries(input.humanBranch, 'human', input.cwd);
  const aiEntries = parseLogEntries(input.aiBranch, 'ai', input.cwd);
  const entries = [...humanEntries, ...aiEntries].sort((a, b) => {
    const aTime = Date.parse(a.timestamp);
    const bTime = Date.parse(b.timestamp);
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return a.commitHash.localeCompare(b.commitHash);
  });

  return {
    humanBranch: input.humanBranch,
    aiBranch: input.aiBranch,
    entries,
  };
}

export function renderTimelineReport(report: TimelineReport): string {
  const lines = [
    `# Timeline (${report.humanBranch} vs ${report.aiBranch})`,
    '',
    '## Entries',
    ...report.entries.map(
      (entry) => `- [${entry.stream}] ${entry.timestamp} ${entry.commitHash} ${entry.subject}`
    ),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function buildExplainReport(input: {
  commitHash: string;
  humanBranch: string;
  aiBranch: string;
  cwd?: string;
}): ExplainReport {
  const message = getCommitMessage(input.commitHash, { cwd: input.cwd });
  const subject = getCommitSubject(input.commitHash, { cwd: input.cwd });
  const files = getCommitFiles(input.commitHash, { cwd: input.cwd });
  let diffStat: string | undefined;
  try {
    diffStat = getCommitDiffStat(`${input.commitHash}~1`, input.commitHash, { cwd: input.cwd });
  } catch {
    diffStat = undefined;
  }

  const traceMeta =
    tryReadTraceMeta(input.commitHash, input.aiBranch, input.cwd) ??
    tryReadTraceMeta(input.commitHash, input.humanBranch, input.cwd);

  return {
    commitHash: input.commitHash,
    subject,
    message,
    files,
    diffStat,
    traceMeta,
  };
}

export function renderExplainReport(report: ExplainReport): string {
  const lines = [
    `# Explain ${report.commitHash}`,
    '',
    '## Subject',
    report.subject,
    '',
    '## Message',
    report.message || '(empty)',
    '',
    '## Files',
    ...(report.files.length > 0 ? report.files.map((file) => `- ${file}`) : ['- None']),
    '',
    '## Diff Stat',
    report.diffStat || 'Unavailable',
    '',
    '## Trace',
    report.traceMeta ? JSON.stringify(report.traceMeta, null, 2) : 'No trace metadata found.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function listUniqueCommits(leftRef: string, rightRef: string, cwd?: string): string[] {
  const output = runGit(['rev-list', `${leftRef}`, `^${rightRef}`], { cwd }).stdout.trim();
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
}

export function buildDiffReport(input: {
  humanBranch: string;
  aiBranch: string;
  cwd?: string;
}): DiffReport {
  const divergence = detectBranchDivergence({
    cwd: input.cwd,
    humanBranch: input.humanBranch,
    aiBranch: input.aiBranch,
  });

  const humanOnlyCommits = listUniqueCommits(input.humanBranch, input.aiBranch, input.cwd);
  const aiOnlyCommits = listUniqueCommits(input.aiBranch, input.humanBranch, input.cwd);

  return {
    humanBranch: input.humanBranch,
    aiBranch: input.aiBranch,
    divergenceStatus: divergence.status,
    aheadHuman: divergence.aheadHuman,
    aheadAi: divergence.aheadAi,
    humanOnlyCommits,
    aiOnlyCommits,
  };
}

export function renderDiffReport(report: DiffReport): string {
  const lines = [
    `# Diff Report (${report.humanBranch} vs ${report.aiBranch})`,
    '',
    '## Divergence',
    `- Status: ${report.divergenceStatus}`,
    `- Human Ahead: ${report.aheadHuman}`,
    `- AI Ahead: ${report.aheadAi}`,
    '',
    '## Human-only Commits',
    ...(report.humanOnlyCommits.length > 0
      ? report.humanOnlyCommits.map((hash) => `- ${hash}`)
      : ['- None']),
    '',
    '## AI-only Commits',
    ...(report.aiOnlyCommits.length > 0
      ? report.aiOnlyCommits.map((hash) => `- ${hash}`)
      : ['- None']),
    '',
  ];
  return `${lines.join('\n')}\n`;
}
