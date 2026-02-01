import path from 'node:path';

export type LedgerPaths = {
  root: string;
  sessionsFile: string;
  tracesDir: string;
};

export function resolveLedgerPaths(cwd: string = process.cwd()): LedgerPaths {
  const root = path.join(cwd, '.codex-ledger');
  return {
    root,
    sessionsFile: path.join(root, 'sessions.json'),
    tracesDir: path.join(root, 'traces'),
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
