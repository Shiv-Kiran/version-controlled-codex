import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { buildDiffReport, renderDiffReport } from '../../core';
import { writeSessionReport } from '../../ledger';
import { resolveAuditBranchContext } from '../audit-context';

export default class DiffReportCommand extends BaseCommand {
  static summary = 'Generate discrepancy report between human and AI branches.';
  static description = 'Summarizes divergence and unique commits per branch for a session.';
  static examples = [
    '<%= config.bin %> diff-report',
    '<%= config.bin %> diff-report --session 2026-02-05-deadbeef --json',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      description: 'Session identifier',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
    write: Flags.boolean({
      default: true,
      description: 'Write markdown report under .codex-ledger/reports',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DiffReportCommand);
    this.loadContext(flags);
    const cwd = process.cwd();

    const context = resolveAuditBranchContext({
      cwd,
      sessionId: flags.session,
    });
    const report = buildDiffReport({
      humanBranch: context.humanBranch,
      aiBranch: context.aiBranch,
      cwd,
    });
    const markdown = renderDiffReport(report);
    const reportPath = flags.write
      ? writeSessionReport(context.sessionId, 'diff-report', markdown, cwd)
      : undefined;

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            sessionId: context.sessionId,
            ...report,
            reportPath,
          },
          null,
          2
        )
      );
      return;
    }

    this.log(markdown.trimEnd());
    if (reportPath) {
      this.log(`\nSaved report: ${reportPath}`);
    }
  }
}
