import fs from 'node:fs';
import { resolveConflictPath, resolveLedgerPaths } from './paths';

export type ConflictStateStatus =
  | 'idle'
  | 'conflict_detected'
  | 'paused_for_human_resolution'
  | 'resumed'
  | 'resolved';

export type ConflictItem = {
  file: string;
  type: 'content' | 'add/add' | 'delete/modify' | 'rename' | 'unknown';
  detail?: string;
};

export type ConflictState = {
  sessionId: string;
  status: ConflictStateStatus;
  createdAt: string;
  updatedAt: string;
  sourceBranch?: string;
  aiBranch?: string;
  reason?: string;
  conflicts?: ConflictItem[];
};

function ensureConflictDir(cwd?: string): void {
  const { conflictsDir } = resolveLedgerPaths(cwd);
  fs.mkdirSync(conflictsDir, { recursive: true });
}

export function readConflictState(sessionId: string, cwd?: string): ConflictState | undefined {
  const filePath = resolveConflictPath(sessionId, cwd);
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ConflictState;
}

export function writeConflictState(state: ConflictState, cwd?: string): string {
  ensureConflictDir(cwd);
  const filePath = resolveConflictPath(state.sessionId, cwd);
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return filePath;
}

export function upsertConflictState(
  sessionId: string,
  input: Partial<ConflictState> & Pick<ConflictState, 'status'>,
  cwd?: string
): ConflictState {
  const existing = readConflictState(sessionId, cwd);
  const now = new Date().toISOString();
  const next: ConflictState = {
    sessionId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: input.status,
    sourceBranch: input.sourceBranch ?? existing?.sourceBranch,
    aiBranch: input.aiBranch ?? existing?.aiBranch,
    reason: input.reason ?? existing?.reason,
    conflicts: input.conflicts ?? existing?.conflicts,
  };
  writeConflictState(next, cwd);
  return next;
}
