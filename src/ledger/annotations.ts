import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  resolveAnnotationConsumedPath,
  resolveAnnotationPendingPath,
  resolveLedgerPaths,
} from './paths';
import { hashPrompt } from './traces';

export type AnnotationRecord = {
  id: string;
  prompt: string;
  promptHash: string;
  model?: string;
  sessionId?: string;
  createdAt: string;
  source: 'manual';
};

export type ConsumedAnnotationRecord = AnnotationRecord & {
  commitHash: string;
  consumedAt: string;
};

function ensureAnnotationDirs(cwd?: string): void {
  const { annotationsDir, annotationsConsumedDir } = resolveLedgerPaths(cwd);
  fs.mkdirSync(annotationsDir, { recursive: true });
  fs.mkdirSync(annotationsConsumedDir, { recursive: true });
}

export function createAnnotationId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function writePendingAnnotation(
  record: Omit<AnnotationRecord, 'id' | 'promptHash' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  },
  cwd?: string
): AnnotationRecord {
  ensureAnnotationDirs(cwd);
  const annotation: AnnotationRecord = {
    id: record.id ?? createAnnotationId(),
    prompt: record.prompt,
    promptHash: hashPrompt(record.prompt),
    model: record.model,
    sessionId: record.sessionId,
    createdAt: record.createdAt ?? new Date().toISOString(),
    source: 'manual',
  };
  const pendingPath = resolveAnnotationPendingPath(cwd);
  fs.writeFileSync(pendingPath, `${JSON.stringify(annotation, null, 2)}\n`, 'utf8');
  return annotation;
}

export function readPendingAnnotation(cwd?: string): AnnotationRecord | null {
  const pendingPath = resolveAnnotationPendingPath(cwd);
  if (!fs.existsSync(pendingPath)) {
    return null;
  }
  const raw = fs.readFileSync(pendingPath, 'utf8');
  return JSON.parse(raw) as AnnotationRecord;
}

export function consumePendingAnnotation(
  commitHash: string,
  cwd?: string
): ConsumedAnnotationRecord | null {
  const pending = readPendingAnnotation(cwd);
  if (!pending) {
    return null;
  }
  ensureAnnotationDirs(cwd);
  const consumed: ConsumedAnnotationRecord = {
    ...pending,
    commitHash,
    consumedAt: new Date().toISOString(),
  };
  const consumedPath = resolveAnnotationConsumedPath(commitHash, cwd);
  fs.writeFileSync(consumedPath, `${JSON.stringify(consumed, null, 2)}\n`, 'utf8');
  fs.unlinkSync(resolveAnnotationPendingPath(cwd));
  return consumed;
}
