import path from 'node:path';

export type LedgerPaths = {
  root: string;
  sessionsFile: string;
  tracesDir: string;
  conflictsDir: string;
  reportsDir: string;
  annotationsDir: string;
  annotationsConsumedDir: string;
  annotationsPendingFile: string;
};

export function resolveLedgerPaths(cwd: string = process.cwd()): LedgerPaths {
  const root = path.join(cwd, '.codex-ledger');
  const annotationsDir = path.join(root, 'annotations');
  const conflictsDir = path.join(root, 'conflicts');
  const reportsDir = path.join(root, 'reports');
  return {
    root,
    sessionsFile: path.join(root, 'sessions.json'),
    tracesDir: path.join(root, 'traces'),
    conflictsDir,
    reportsDir,
    annotationsDir,
    annotationsConsumedDir: path.join(annotationsDir, 'consumed'),
    annotationsPendingFile: path.join(annotationsDir, 'pending.json'),
  };
}

export function resolveTraceMarkdownPath(commitHash: string, cwd?: string): string {
  const { tracesDir } = resolveLedgerPaths(cwd);
  return path.join(tracesDir, `${commitHash}.md`);
}

export function resolveTraceMetaPath(commitHash: string, cwd?: string): string {
  const { tracesDir } = resolveLedgerPaths(cwd);
  return path.join(tracesDir, `${commitHash}.json`);
}

export function resolveAnnotationPendingPath(cwd?: string): string {
  const { annotationsPendingFile } = resolveLedgerPaths(cwd);
  return annotationsPendingFile;
}

export function resolveAnnotationConsumedPath(commitHash: string, cwd?: string): string {
  const { annotationsConsumedDir } = resolveLedgerPaths(cwd);
  return path.join(annotationsConsumedDir, `${commitHash}.json`);
}

export function resolveConflictPath(sessionId: string, cwd?: string): string {
  const { conflictsDir } = resolveLedgerPaths(cwd);
  return path.join(conflictsDir, `${sessionId}.json`);
}

export function resolveReportPath(
  sessionId: string,
  reportKind: 'timeline' | 'diff-report' | 'explain',
  cwd?: string
): string {
  const { reportsDir } = resolveLedgerPaths(cwd);
  return path.join(reportsDir, `${sessionId}-${reportKind}.md`);
}
