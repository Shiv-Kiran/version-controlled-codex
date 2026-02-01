import fs from 'node:fs';
import path from 'node:path';
import type { TraceContent, TraceMeta } from './traces';
import { resolveLedgerPaths } from './paths';

export type PrSection = {
  title: string;
  body: string[];
};

export type PrDescription = {
  title: string;
  sections: PrSection[];
};

export type PrBuildOptions = {
  cwd?: string;
  sessionId?: string;
  title?: string;
};

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function parseTraceSummary(markdown: string): string {
  const lines = markdown.split('\n');
  const summaryIndex = lines.findIndex((line) => line.startsWith('## Summary'));
  if (summaryIndex === -1) {
    return '';
  }
  const start = summaryIndex + 1;
  const summaryLines: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      break;
    }
    if (line.trim().length > 0) {
      summaryLines.push(line.trim());
    }
  }
  return summaryLines.join(' ');
}

export function buildPrDescription(options: PrBuildOptions = {}): PrDescription {
  const { tracesDir } = resolveLedgerPaths(options.cwd);
  if (!fs.existsSync(tracesDir)) {
    return {
      title: options.title ?? 'Codex-Ledger Session Summary',
      sections: [
        {
          title: 'Summary',
          body: ['No traces found.'],
        },
      ],
    };
  }

  const traceFiles = fs
    .readdirSync(tracesDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  const entries = traceFiles
    .map((file) => {
      const metaPath = path.join(tracesDir, file);
      const meta = readJson<TraceMeta>(metaPath);
      if (options.sessionId && meta.sessionId !== options.sessionId) {
        return undefined;
      }
      const mdPath = path.join(tracesDir, `${meta.commitHash}.md`);
      const summary = fs.existsSync(mdPath) ? parseTraceSummary(readText(mdPath)) : '';
      return {
        meta,
        summary,
      };
    })
    .filter((entry): entry is { meta: TraceMeta; summary: string } => Boolean(entry));

  if (entries.length === 0) {
    return {
      title: options.title ?? 'Codex-Ledger Session Summary',
      sections: [
        {
          title: 'Summary',
          body: ['No matching traces found.'],
        },
      ],
    };
  }

  const sections: PrSection[] = [
    {
      title: 'Summary',
      body: entries.map((entry) => `- ${entry.summary || 'No summary provided.'}`),
    },
    {
      title: 'Trace Links',
      body: entries.map((entry) => `- ${entry.meta.commitHash}: .codex-ledger/traces/${entry.meta.commitHash}.md`),
    },
  ];

  return {
    title: options.title ?? 'Codex-Ledger Session Summary',
    sections,
  };
}

export function renderPrDescription(description: PrDescription): string {
  const lines: string[] = [`# ${description.title}`, ''];
  for (const section of description.sections) {
    lines.push(`## ${section.title}`);
    lines.push(...section.body);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function writePrDescription(
  description: PrDescription,
  outputPath: string
): void {
  fs.writeFileSync(outputPath, renderPrDescription(description), 'utf8');
}

export function generatePrDescription(options: PrBuildOptions & { outputPath: string }): string {
  const description = buildPrDescription(options);
  writePrDescription(description, options.outputPath);
  return options.outputPath;
}
