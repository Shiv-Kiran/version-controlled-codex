import fs from 'node:fs';
import path from 'node:path';
import type { TraceMeta } from './traces';
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

export type TraceSummary = {
  summary: string;
  risk?: string;
};

type TraceEntry = {
  meta: TraceMeta;
  summary: string;
  risk: string | undefined;
};

const MAX_SUMMARY_LENGTH = 200;

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const needle = `## ${heading}`;
  const sectionIndex = lines.findIndex((line) => line.trim() === needle);
  if (sectionIndex === -1) {
    return '';
  }
  const start = sectionIndex + 1;
  const sectionLines: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('## ')) {
      break;
    }
    if (line.trim().length > 0) {
      sectionLines.push(line.trim());
    }
  }
  return normalizeWhitespace(sectionLines.join(' '));
}

function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split('\n');
  const paragraph: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      started = true;
      paragraph.push(trimmed);
      continue;
    }

    if (!trimmed || trimmed.startsWith('## ')) {
      break;
    }
    paragraph.push(trimmed);
  }
  return normalizeWhitespace(paragraph.join(' '));
}

function clampSummary(summary: string): string {
  if (summary.length <= MAX_SUMMARY_LENGTH) {
    return summary;
  }
  return `${summary.slice(0, MAX_SUMMARY_LENGTH - 3)}...`;
}

export function extractTraceSummary(markdown: string): TraceSummary {
  const summary = extractSection(markdown, 'Summary') || extractFirstParagraph(markdown);
  const risk = extractSection(markdown, 'Risk Assessment') || extractSection(markdown, 'Risk');
  return {
    summary: clampSummary(summary),
    risk: risk || undefined,
  };
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
      const traceSummary = fs.existsSync(mdPath)
        ? extractTraceSummary(readText(mdPath))
        : { summary: '' };
      return {
        meta,
        summary: traceSummary.summary,
        risk: traceSummary.risk ?? undefined,
      };
    })
    .filter((entry): entry is TraceEntry => entry !== undefined)
    .sort((a, b) => {
      const aTime = a.meta.createdAt ? Date.parse(a.meta.createdAt) : 0;
      const bTime = b.meta.createdAt ? Date.parse(b.meta.createdAt) : 0;
      return aTime - bTime;
    });

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
      body: entries.map((entry) => {
        const summary = entry.summary || 'No summary provided.';
        if (entry.risk) {
          return `- ${summary} (Risk: ${entry.risk})`;
        }
        return `- ${summary}`;
      }),
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
