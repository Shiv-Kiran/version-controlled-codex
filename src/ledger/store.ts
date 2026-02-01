import fs from 'node:fs';
import type { LedgerPaths } from './paths';
import { resolveLedgerPaths } from './paths';

export type SessionStatus = 'active' | 'closed' | 'archived';

export type SessionRecord = {
  sessionId: string;
  branch: string;
  startedAt: string;
  updatedAt?: string;
  lastPromptSummary?: string;
  chatRefHash?: string;
  status?: SessionStatus;
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
  const merged: SessionRecord = {
    ...existing,
    ...record,
    startedAt: existing?.startedAt ?? record.startedAt ?? now,
    updatedAt: now,
  };

  index.sessions[record.sessionId] = merged;
  writeSessionsIndex(index, cwd);
  return merged;
}
