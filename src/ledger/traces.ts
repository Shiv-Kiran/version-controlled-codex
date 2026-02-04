import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  resolveLedgerPaths,
  resolveTraceMarkdownPath,
  resolveTraceMetaPath,
} from './paths';

export type LlmMetadata = {
  model?: string;
  usage?: unknown;
  requestId?: string;
  reasoningEffort?: string;
};

export type TraceMeta = {
  commitHash: string;
  sourceCommit?: string;
  sourceBranch?: string;
  sessionId: string;
  promptHash?: string;
  chatRefHash?: string;
  annotation?: AnnotationMeta;
  model?: string;
  tokens?: number;
  llm?: LlmMetadata;
  builderLlm?: LlmMetadata;
  scribeLlm?: LlmMetadata;
  createdAt: string;
};

export type AnnotationMeta = {
  id: string;
  prompt: string;
  promptHash: string;
  model?: string;
  sessionId?: string;
  createdAt: string;
};

export type TraceContent = {
  summary: string;
  risk: 'Low' | 'Med' | 'High';
  details?: string;
};

function ensureTraceDirs(cwd?: string): void {
  const paths = resolveLedgerPaths(cwd);
  fs.mkdirSync(paths.tracesDir, { recursive: true });
}

export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt, 'utf8').digest('hex');
}

export function writeTraceMarkdown(
  commitHash: string,
  content: TraceContent,
  cwd?: string
): string {
  ensureTraceDirs(cwd);
  const body = [
    `# Trace ${commitHash}`,
    '',
    `## Summary`,
    content.summary.trim(),
    '',
    `## Risk Assessment`,
    content.risk,
  ];

  if (content.details) {
    body.push('', '## Details', content.details.trim());
  }

  const output = `${body.join('\n')}\n`;
  const filePath = resolveTraceMarkdownPath(commitHash, cwd);
  fs.writeFileSync(filePath, output, 'utf8');
  return filePath;
}

export function writeTraceMeta(meta: TraceMeta, cwd?: string): string {
  ensureTraceDirs(cwd);
  const filePath = resolveTraceMetaPath(meta.commitHash, cwd);
  fs.writeFileSync(filePath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  return filePath;
}
