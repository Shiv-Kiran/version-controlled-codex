import fs from 'node:fs';
import type { LedgerPaths } from './paths';
import { resolveLedgerPaths } from './paths';
import type { TrackingPolicy } from '../core/tracking-policy';

export type SessionStatus = 'active' | 'closed' | 'archived' | 'reopened';

export type SessionStatusHistoryItem = {
  status: SessionStatus;
  at: string;
  reason?: string;
};

export type SessionRecord = {
  sessionId: string;
  branch: string;
  startedAt: string;
  updatedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  reopenedAt?: string;
  closeReason?: string;
  lastPromptSummary?: string;
  chatRefHash?: string;
  status?: SessionStatus;
  statusHistory?: SessionStatusHistoryItem[];
  trackingPolicy?: TrackingPolicy;
};

export type SessionsIndex = {
  version: 1;
  sessions: Record<string, SessionRecord>;
};

const EMPTY_INDEX: SessionsIndex = {
  version: 1,
  sessions: {},
};

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function ensureLedgerStore(cwd: string = process.cwd()): LedgerPaths {
  const paths = resolveLedgerPaths(cwd);
  fs.mkdirSync(paths.root, { recursive: true });
  fs.mkdirSync(paths.tracesDir, { recursive: true });
  fs.mkdirSync(paths.conflictsDir, { recursive: true });
  fs.mkdirSync(paths.reportsDir, { recursive: true });
  if (!fs.existsSync(paths.sessionsFile)) {
    writeJson(paths.sessionsFile, EMPTY_INDEX);
  }
  return paths;
}

export function readSessionsIndex(cwd?: string): SessionsIndex {
  const { sessionsFile } = ensureLedgerStore(cwd);
  const raw = fs.readFileSync(sessionsFile, 'utf8');
  return JSON.parse(raw) as SessionsIndex;
}

export function writeSessionsIndex(index: SessionsIndex, cwd?: string): void {
  const { sessionsFile } = ensureLedgerStore(cwd);
  writeJson(sessionsFile, index);
}

export function getSession(sessionId: string, cwd?: string): SessionRecord | undefined {
  const index = readSessionsIndex(cwd);
  return index.sessions[sessionId];
}

export function listSessions(cwd?: string): SessionRecord[] {
  const index = readSessionsIndex(cwd);
  return Object.values(index.sessions);
}

export function upsertSession(record: SessionRecord, cwd?: string): SessionRecord {
  const index = readSessionsIndex(cwd);
  const existing = index.sessions[record.sessionId];
  const now = new Date().toISOString();
  const incomingStatus = record.status ?? existing?.status;
  const shouldAppendStatus =
    incomingStatus && (!existing?.status || existing.status !== incomingStatus);

  const statusHistory = [
    ...(existing?.statusHistory ?? []),
    ...(shouldAppendStatus
      ? [
          {
            status: incomingStatus,
            at: now,
          } satisfies SessionStatusHistoryItem,
        ]
      : []),
  ];

  const merged: SessionRecord = {
    ...existing,
    ...record,
    startedAt: existing?.startedAt ?? record.startedAt ?? now,
    updatedAt: now,
    statusHistory,
  };

  index.sessions[record.sessionId] = merged;
  writeSessionsIndex(index, cwd);
  return merged;
}

export function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  options: {
    cwd?: string;
    reason?: string;
  } = {}
): SessionRecord {
  const index = readSessionsIndex(options.cwd);
  const existing = index.sessions[sessionId];
  if (!existing) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const now = new Date().toISOString();
  const historyItem: SessionStatusHistoryItem = {
    status,
    at: now,
    reason: options.reason,
  };

  const merged: SessionRecord = {
    ...existing,
    status,
    updatedAt: now,
    closeReason: status === 'closed' ? options.reason ?? existing.closeReason : existing.closeReason,
    closedAt: status === 'closed' ? now : existing.closedAt,
    archivedAt: status === 'archived' ? now : existing.archivedAt,
    reopenedAt: status === 'reopened' ? now : existing.reopenedAt,
    statusHistory: [...(existing.statusHistory ?? []), historyItem],
  };

  index.sessions[sessionId] = merged;
  writeSessionsIndex(index, options.cwd);
  return merged;
}

export function getSessionByBranch(branch: string, cwd?: string): SessionRecord | undefined {
  const sessions = listSessions(cwd);
  return sessions.find((session) => session.branch === branch);
}

export function updateSessionTrackingPolicy(
  sessionId: string,
  trackingPolicy: TrackingPolicy,
  cwd?: string
): SessionRecord {
  const session = getSession(sessionId, cwd);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return upsertSession(
    {
      ...session,
      trackingPolicy,
    },
    cwd
  );
}
