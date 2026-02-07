import fs from 'node:fs';
import { resolveLedgerPaths, resolveReportPath } from './paths';

export type ReportKind = 'timeline' | 'diff-report' | 'explain';

function ensureReportsDir(cwd?: string): void {
  const { reportsDir } = resolveLedgerPaths(cwd);
  fs.mkdirSync(reportsDir, { recursive: true });
}

export function writeSessionReport(
  sessionId: string,
  reportKind: ReportKind,
  content: string,
  cwd?: string
): string {
  ensureReportsDir(cwd);
  const filePath = resolveReportPath(sessionId, reportKind, cwd);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

export function readSessionReport(
  sessionId: string,
  reportKind: ReportKind,
  cwd?: string
): string | undefined {
  const filePath = resolveReportPath(sessionId, reportKind, cwd);
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return fs.readFileSync(filePath, 'utf8');
}
